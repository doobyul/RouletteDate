// Load settings from localStorage
const storedRegions = JSON.parse(localStorage.getItem("regions"));
const storedMenus = JSON.parse(localStorage.getItem("menus"));
const storedCourses = JSON.parse(localStorage.getItem("courses"));

const regions = storedRegions || ["서울", "부산", "제주", "대구", "광주"];

let menus = storedMenus || ["한식", "중식", "일식", "양식", "분식"];
let courses = storedCourses || ["영화 보기", "산책", "카페 가기", "전시회 관람", "놀이공원"];
let restaurantCandidates = [];
let datePlaceCandidates = [];

const resultElement = document.getElementById("result");
const spinButton = document.getElementById("spinButton");
const roulette = document.getElementById("roulette");
const locationStatus = document.getElementById("locationStatus");
const detectLocationButton = document.getElementById("detectLocationButton");
const manualRegionInput = document.getElementById("manualRegionInput");

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickRandomOrNull = (arr) => (Array.isArray(arr) && arr.length ? pickRandom(arr) : null);
const RECENT_HISTORY_KEY = "recentResults";
const RECENT_LIMIT = 8;

let detectedAddress = null;
let currentRotation = 0;

function loadRecentHistory() {
    try {
        const raw = JSON.parse(localStorage.getItem(RECENT_HISTORY_KEY));
        return Array.isArray(raw) ? raw : [];
    } catch {
        return [];
    }
}

function saveRecentHistory(history) {
    localStorage.setItem(RECENT_HISTORY_KEY, JSON.stringify(history.slice(-RECENT_LIMIT)));
}

function pickNotRecentlyUsed(candidates, usedNames) {
    if (!Array.isArray(candidates) || candidates.length === 0) return null;
    const filtered = candidates.filter((c) => c && c.name && !usedNames.has(c.name));
    return filtered.length ? pickRandom(filtered) : pickRandom(candidates);
}

function getSelectedScope() {
    const selected = document.querySelector('input[name="regionScope"]:checked');
    return selected ? selected.value : "dong";
}

function extractRegionByScope(address, scope) {
    if (!address) return null;

    const city = address.city || address.province || "";
    const district = address.district || "";
    const suburb = address.suburb || address.town || address.village || "";

    if (scope === "si") return city || null;
    if (scope === "gu") return district || city || null;
    return suburb || district || city || null; // dong 우선
}

async function reverseGeocode(lat, lon) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=ko`;
    const resp = await fetch(url);
    if (!resp.ok) throw new Error("역지오코딩 실패");
    return resp.json();
}

async function detectLocationByIP() {
    const resp = await fetch("https://ipapi.co/json/");
    if (!resp.ok) throw new Error("IP 위치 조회 실패");
    const data = await resp.json();

    // reverseGeocode에서 쓰는 형태와 유사하게 매핑
    return {
        city: data.city || "",
        province: data.region || "",
        district: data.region || "",
        suburb: "",
        town: "",
        village: "",
    };
}

function updateLocationStatus() {
    const manualRegion = (manualRegionInput?.value || "").trim();
    if (manualRegion) {
        locationStatus.textContent = `현재 지역: ${manualRegion} [직접입력]`;
        return;
    }

    const scope = getSelectedScope();
    const region = extractRegionByScope(detectedAddress, scope);
    locationStatus.textContent = `현재 지역: ${region || "(미설정)"} [${scope}]`;
}

async function detectCurrentLocation() {
    if (!window.isSecureContext) {
        locationStatus.textContent = "현재 지역: 보안 컨텍스트가 아닙니다(https 또는 localhost 필요)";
        return;
    }

    if (!navigator.geolocation) {
        locationStatus.textContent = "현재 지역: 위치 기능 미지원 브라우저";
        return;
    }

    if (navigator.permissions && navigator.permissions.query) {
        try {
            const permissionStatus = await navigator.permissions.query({ name: "geolocation" });
            if (permissionStatus.state === "denied") {
                locationStatus.textContent = "현재 지역: 브라우저 위치 권한이 차단됨(사이트 권한에서 허용 필요)";
                return;
            }
        } catch (error) {
            // 일부 브라우저는 permissions API 동작이 제한될 수 있어 무시하고 진행
        }
    }

    locationStatus.textContent = "현재 지역: 위치 확인 중...";

    await new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
            async (position) => {
                try {
                    const { latitude, longitude } = position.coords;
                    const geoData = await reverseGeocode(latitude, longitude);
                    detectedAddress = geoData.address || null;
                    updateLocationStatus();
                } catch (error) {
                    locationStatus.textContent = "현재 지역: 역지오코딩 실패";
                }
                resolve();
            },
            async (error) => {
                if (error && error.code === 1) {
                    locationStatus.textContent = "현재 지역: GPS 권한 거부됨 → 네트워크 위치로 재시도 중...";
                } else if (error && error.code === 2) {
                    locationStatus.textContent = "현재 지역: GPS 위치 불가 → 네트워크 위치로 재시도 중...";
                } else if (error && error.code === 3) {
                    locationStatus.textContent = "현재 지역: GPS 시간 초과 → 네트워크 위치로 재시도 중...";
                } else {
                    locationStatus.textContent = "현재 지역: GPS 실패(알 수 없는 오류) → 네트워크 위치로 재시도 중...";
                }

                try {
                    detectedAddress = await detectLocationByIP();
                    updateLocationStatus();
                    locationStatus.textContent += " (IP 기반)";
                } catch (ipError) {
                    const code = error && typeof error.code !== "undefined" ? error.code : "unknown";
                    const msg = error && error.message ? error.message : "unknown";
                    locationStatus.textContent = `현재 지역: GPS/IP 모두 실패 (gpsCode=${code}, gpsMsg=${msg})`;
                }
                resolve();
            },
            { enableHighAccuracy: true, timeout: 8000 }
        );
    });
}

async function fetchIdeasByRegion(region) {
    const resp = await fetch(`/api/ideas?region=${encodeURIComponent(region)}`);
    if (!resp.ok) {
        throw new Error("API 요청 실패");
    }
    return resp.json();
}

function spinRouletteWheel() {
    const extraSpins = 6 + Math.floor(Math.random() * 5); // 6~10바퀴
    const randomOffset = Math.random() * 360;
    const nextRotation = currentRotation + extraSpins * 360 + randomOffset;

    roulette.classList.remove("landed");
    roulette.classList.add("spinning");
    roulette.style.transition = "transform 3.2s cubic-bezier(0.12, 0.8, 0.18, 1)";
    roulette.style.transform = `rotate(${nextRotation}deg)`;
    currentRotation = nextRotation;

    return new Promise((resolve) => {
        const onEnd = () => {
            roulette.classList.remove("spinning");
            roulette.classList.add("landed");
            roulette.removeEventListener("transitionend", onEnd);
            resolve();
        };
        roulette.addEventListener("transitionend", onEnd, { once: true });
    });
}

spinButton.addEventListener("click", async () => {
    spinButton.disabled = true;

    try {
        const spinPromise = spinRouletteWheel();

        const manualRegion = (manualRegionInput?.value || "").trim();
        const scope = getSelectedScope();
        const scopedDetectedRegion = extractRegionByScope(detectedAddress, scope);
        const selectedRegion = manualRegion || scopedDetectedRegion || pickRandom(regions);

        const apiData = await fetchIdeasByRegion(selectedRegion);

        if (Array.isArray(apiData.menus) && apiData.menus.length > 0) {
            menus = apiData.menus;
        }
        if (Array.isArray(apiData.courses) && apiData.courses.length > 0) {
            courses = apiData.courses;
        }
        restaurantCandidates = Array.isArray(apiData.restaurantCandidates) ? apiData.restaurantCandidates : [];
        datePlaceCandidates = Array.isArray(apiData.datePlaceCandidates) ? apiData.datePlaceCandidates : [];

        const recentHistory = loadRecentHistory();
        const recentFoodNames = new Set(recentHistory.map((h) => h.food).filter(Boolean));
        const recentDateNames = new Set(recentHistory.map((h) => h.date).filter(Boolean));

        const foodPlace = pickNotRecentlyUsed(restaurantCandidates, recentFoodNames) || pickRandomOrNull(restaurantCandidates);
        const datePlace = pickNotRecentlyUsed(datePlaceCandidates, recentDateNames) || pickRandomOrNull(datePlaceCandidates);
        const randomCourse = pickRandom(courses);

        const foodText = foodPlace
            ? `${foodPlace.name}`
            : (Array.isArray(restaurantCandidates) && restaurantCandidates.length ? pickRandom(restaurantCandidates).name : "근처 음식점");

        const dateText = datePlace
            ? `${datePlace.name}`
            : randomCourse;

        await spinPromise;
        resultElement.textContent = `오늘은 ${selectedRegion}에서 ${foodText}에 가고 ${dateText}에 간다.`;

        saveRecentHistory([
            ...recentHistory,
            {
                food: foodPlace?.name || null,
                date: datePlace?.name || null,
                region: selectedRegion,
                ts: Date.now(),
            },
        ]);
    } catch (error) {
        const randomRegion = pickRandom(regions);
        const randomMenu = pickRandom(menus);
        const randomCourse = pickRandom(courses);
        resultElement.textContent = `API 연결 오류로 기본 추천 사용: ${randomRegion}에서 ${randomMenu}, ${randomCourse}`;
    } finally {
        spinButton.disabled = false;
    }
});

detectLocationButton.addEventListener("click", detectCurrentLocation);
document.querySelectorAll('input[name="regionScope"]').forEach((el) => {
    el.addEventListener("change", updateLocationStatus);
});
manualRegionInput.addEventListener("input", updateLocationStatus);