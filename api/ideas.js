const stripHtml = (text = "") => text.replace(/<[^>]*>/g, "").trim();

const cleanText = (text = "") =>
    stripHtml(text)
        .replace(/[|\-–—]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

const looksLikePlaceName = (text = "") => {
    if (!text) return false;
    return /(점|본점|직영점|분점|점$|카페|식당|맛집|술집|포차|바|펍|치킨|피자|버거|국밥|냉면|횟집|곱창|공방|스튜디오|갤러리|파크|랜드|월드)/.test(text);
};

const toMenuFromCategory = (category = "") => {
    const last = category.split(">").map((v) => cleanText(v)).filter(Boolean).pop();
    if (!last) return null;
    const map = {
        한식: "한식 메뉴",
        중식: "중식 메뉴",
        일식: "일식 메뉴",
        양식: "양식 메뉴",
        카페: "디저트",
        분식: "분식 메뉴",
    };
    return map[last] || `${last} 메뉴`;
};

const isFoodCategory = (category = "") => {
    const c = cleanText(category);
    return /(음식점|카페|제과|베이커리|치킨|피자|햄버거|분식|술집|포차|국밥|횟집|고기|식당)/.test(c);
};

const isDateFriendlyCategory = (category = "", name = "") => {
    const text = `${cleanText(category)} ${cleanText(name)}`;
    return /(공원|미술관|박물관|전시|갤러리|영화관|서점|공방|체험|테마파크|수족관|식물원|동물원|궁|한옥|전망대|산책|문화|공연|볼링|방탈출|클라이밍|VR|스파|찜질)/.test(text);
};

const AD_STOPWORDS = [
    "맛집", "추천", "핫플", "가성비", "인생", "유명", "best", "베스트", "후기", "리뷰", "광고", "협찬", "체험단",
    "재방문", "웨이팅", "오픈런", "필수", "성지", "필독", "완벽", "꿀팁", "TOP", "top"
];

const containsAdWord = (text = "") => {
    const t = cleanText(text).toLowerCase();
    return AD_STOPWORDS.some((w) => t.includes(String(w).toLowerCase()));
};

const pickUniqueKeywords = (items = [], fallback = []) => {
    const cleaned = items
        .map(cleanText)
        .filter((v) => v.length > 1)
        .filter((v) => !containsAdWord(v));

    const unique = [...new Set(cleaned)];
    return unique.length ? unique.slice(0, 20) : fallback;
};

const pickUniquePlaces = (items = [], fallback = []) => {
    const normalized = items
        .map((item) => ({
            name: cleanText(item.title || item.name || ""),
            category: cleanText(item.category || ""),
            roadAddress: cleanText(item.roadAddress || item.road_address || ""),
            description: cleanText(item.description || ""),
        }))
        .filter((p) => p.name.length > 1)
        .filter((p) => !containsAdWord(p.name) && !containsAdWord(p.description));

    const seen = new Set();
    const unique = [];
    for (const p of normalized) {
        if (seen.has(p.name)) continue;
        seen.add(p.name);
        unique.push(p);
    }

    return unique.length ? unique.slice(0, 20) : fallback;
};

module.exports = async (req, res) => {
    const regionParam = typeof req.query?.region === "string" ? req.query.region.trim() : "";
    const region = regionParam || "서울";
    const clientId = process.env.NAVER_CLIENT_ID;
    const clientSecret = process.env.NAVER_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        return res.status(200).json({
            source: "fallback",
            region,
            menus: ["파스타", "초밥", "국밥", "떡볶이", "삼겹살"],
            courses: ["카페 투어", "산책", "전시회 관람", "영화 보기", "보드게임 카페"],
            restaurantCandidates: [
                { name: `${region} 파스타하우스`, category: "양식", roadAddress: `${region} 중심가`, description: "" },
                { name: `${region} 스시바`, category: "일식", roadAddress: `${region} 메인거리`, description: "" },
            ],
            datePlaceCandidates: [
                { name: `${region} 아트갤러리`, category: "전시", roadAddress: `${region} 문화거리`, description: "전시 관람" },
                { name: `${region} 보드게임카페`, category: "카페", roadAddress: `${region} 번화가`, description: "보드게임" },
            ],
            message: "NAVER API 키 미설정 상태입니다. Vercel Environment Variables 설정 후 실데이터 조회가 가능합니다.",
        });
    }

    try {
        const menuQuery = encodeURIComponent(`${region} 음식`);
        const dateQuery = encodeURIComponent(`${region} 데이트`);

        const dateLocalQueries = [
            `${region} 데이트 장소`,
            `${region} 놀거리`,
            `${region} 전시`,
            `${region} 체험`,
            `${region} 공원`,
        ];

        const [menuResp, dateResp, ...dateLocalResps] = await Promise.all([
            fetch(`https://openapi.naver.com/v1/search/local.json?query=${menuQuery}&display=20&sort=random`, {
                headers: {
                    "X-Naver-Client-Id": clientId,
                    "X-Naver-Client-Secret": clientSecret,
                },
            }),
            fetch(`https://openapi.naver.com/v1/search/blog.json?query=${dateQuery}&display=20&sort=sim`, {
                headers: {
                    "X-Naver-Client-Id": clientId,
                    "X-Naver-Client-Secret": clientSecret,
                },
            }),
            ...dateLocalQueries.map((q) =>
                fetch(`https://openapi.naver.com/v1/search/local.json?query=${encodeURIComponent(q)}&display=10&sort=random`, {
                    headers: {
                        "X-Naver-Client-Id": clientId,
                        "X-Naver-Client-Secret": clientSecret,
                    },
                })
            ),
        ]);

        if (!menuResp.ok || !dateResp.ok || dateLocalResps.some((r) => !r.ok)) {
            const menuErr = await menuResp.text();
            const dateErr = await dateResp.text();
            const dateLocalErrs = await Promise.all(dateLocalResps.map(async (r) => (r.ok ? "" : await r.text())));
            return res.status(502).json({ error: "네이버 API 호출 실패", details: { menuErr, dateErr, dateLocalErrs } });
        }

        const menuData = await menuResp.json();
        const dateData = await dateResp.json();
        const dateLocalDataList = await Promise.all(dateLocalResps.map((r) => r.json()));
        const mergedDateLocalItems = dateLocalDataList.flatMap((d) => d.items || []);

        const menusFromTitle = pickUniqueKeywords((menuData.items || []).map((item) => item.title), []).filter((v) => !looksLikePlaceName(v));
        const menusFromCategory = (menuData.items || []).map((item) => toMenuFromCategory(item.category || "")).filter(Boolean);
        const menus = pickUniqueKeywords([...menusFromTitle, ...menusFromCategory], ["한식 메뉴", "중식 메뉴", "일식 메뉴", "양식 메뉴", "분식 메뉴"]);

        const courses = pickUniqueKeywords((dateData.items || []).flatMap((item) => [item.title, item.description]), ["영화 보기", "산책", "카페 가기", "전시회 관람", "드라이브"]).filter((v) => !looksLikePlaceName(v));

        const restaurantCandidates = pickUniquePlaces((menuData.items || []).filter((item) => isFoodCategory(item.category || "")), [
            { name: `${region} 맛집`, category: "음식점", roadAddress: region, description: "" },
        ]);

        let datePlaceRaw = mergedDateLocalItems.filter((item) => !isFoodCategory(item.category || "") && isDateFriendlyCategory(item.category || "", item.title || ""));
        if (datePlaceRaw.length < 5) datePlaceRaw = mergedDateLocalItems.filter((item) => !isFoodCategory(item.category || ""));
        if (datePlaceRaw.length < 3) {
            datePlaceRaw = mergedDateLocalItems.filter((item) =>
                /(공원|미술관|박물관|갤러리|영화관|서점|공방|체험|테마파크|수족관|식물원|동물원|궁|전망대|산책|공연|볼링|방탈출|클라이밍|VR)/.test(cleanText(item.title || ""))
            );
        }

        const datePlaceCandidates = pickUniquePlaces(datePlaceRaw, [
            { name: `${region} 데이트 스팟`, category: "데이트", roadAddress: region, description: "산책" },
        ]);

        return res.status(200).json({
            source: "naver",
            region,
            menus,
            courses,
            restaurantCandidates,
            datePlaceCandidates,
        });
    } catch (error) {
        return res.status(500).json({ error: "서버 내부 오류", message: error.message });
    }
};
