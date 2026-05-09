const storedMenus = JSON.parse(localStorage.getItem("menus"));

const baseMenuPool = [
    "피자", "파스타", "리조또", "스테이크", "햄버거", "핫도그", "샌드위치", "브런치 플래터", "라자냐", "오믈렛",
    "국밥", "돼지국밥", "순대국", "설렁탕", "갈비탕", "김치찌개", "된장찌개", "부대찌개", "청국장", "순두부찌개",
    "제육볶음", "불고기", "삼겹살", "보쌈", "족발", "닭갈비", "찜닭", "비빔밥", "돌솥비빔밥", "냉면",
    "칼국수", "수제비", "쫄면", "막국수", "회", "물회", "초밥", "사시미", "우동", "라멘",
    "돈카츠", "가츠동", "텐동", "오코노미야키", "타코야키", "짜장면", "짬뽕", "탕수육", "마라탕", "마라샹궈",
    "훠궈", "양꼬치", "딤섬", "쌀국수", "팟타이", "나시고렝", "카레", "버터치킨커리", "탄두리치킨", "케밥",
    "또띠아", "타코", "브리또", "포케", "샐러드", "그릭요거트볼", "떡볶이", "로제떡볶이", "순대", "튀김",
    "김밥", "라볶이", "어묵", "닭강정", "치킨", "양념치킨", "간장치킨", "파닭", "피쉬앤칩스", "팬케이크",
    "와플", "프렌치토스트", "크로플", "아이스크림", "빙수", "도넛", "케이크", "타르트", "마카롱", "츄러스"
];

const menuCategoryMap = {
    "한식": ["비빔밥", "불고기", "삼겹살", "김치찌개", "된장찌개", "국밥", "갈비탕", "순두부찌개", "닭갈비", "냉면"],
    "중식": ["짜장면", "짬뽕", "탕수육", "마라탕", "마라샹궈", "훠궈", "양꼬치", "딤섬"],
    "일식": ["초밥", "사시미", "우동", "라멘", "돈카츠", "가츠동", "텐동", "오코노미야키"],
    "양식": ["피자", "파스타", "리조또", "스테이크", "햄버거", "샌드위치", "라자냐", "오믈렛"],
    "분식": ["떡볶이", "라볶이", "김밥", "순대", "튀김", "어묵", "쫄면"],
    "카페": ["브런치 플래터", "팬케이크", "와플", "크로플", "케이크", "타르트", "마카롱", "빙수"]
};

function buildExpandedMenus(inputMenus) {
    if (!Array.isArray(inputMenus) || inputMenus.length === 0) return baseMenuPool;

    const expanded = [];
    for (const raw of inputMenus) {
        const item = String(raw || "").trim();
        if (!item) continue;

        if (menuCategoryMap[item]) {
            expanded.push(...menuCategoryMap[item]);
        } else {
            expanded.push(item);
        }
    }

    const unique = [...new Set(expanded)];
    return unique.length ? unique : baseMenuPool;
}

const menus = buildExpandedMenus(storedMenus);
const courses = [
    "영화 보기", "산책", "카페 가기", "전시회 관람", "놀이공원", "한강 피크닉", "야경 드라이브", "보드게임 카페", "방탈출",
    "공방 체험", "도자기 만들기", "베이킹 클래스", "쿠킹 클래스", "클라이밍", "볼링", "탁구", "배드민턴", "당구", "노래방",
    "코인노래방", "VR 체험", "사격 체험", "양궁 체험", "롤러스케이트", "아이스링크", "실내 스포츠", "러닝", "자전거 타기",
    "플리마켓 구경", "전통시장 투어", "야시장 투어", "서점 데이트", "독립서점 탐방", "북카페 데이트", "사진전 관람", "미술관 관람",
    "박물관 관람", "과학관 체험", "천문대 관람", "식물원 산책", "수목원 산책", "동물원 관람", "수족관 관람", "테마파크", "놀이기구 타기",
    "워터파크", "찜질방", "스파", "마사지", "풋살", "농구", "야구장 직관", "축구 경기 관람", "e스포츠 관람", "라이브 공연",
    "버스킹 구경", "연극 관람", "뮤지컬 관람", "오페라 관람", "클래식 공연", "재즈바", "루프탑 카페", "디저트 투어", "빙수 맛집 투어",
    "브런치 카페", "와인바", "칵테일바", "티하우스", "한옥마을 산책", "궁궐 데이트", "성곽길 걷기", "캠핑", "글램핑", "바다 산책",
    "해변 드라이브", "등산", "트레킹", "계곡 나들이", "벚꽃길 걷기", "단풍길 걷기", "야경 포인트 방문", "일몰 명소", "일출 명소",
    "포토부스 찍기", "인생네컷 찍기", "셀프사진관", "향수 만들기", "캔들 만들기", "비누 만들기", "원데이 클래스", "타로 카페",
    "보드카페", "퍼즐 카페", "디지털 디톡스 데이트", "스터디 카페 데이트", "랜덤 산책", "동네 탐방", "근교 나들이", "드라이브 스루 여행"
];

const resultElement = document.getElementById("simpleResult");
const spinButton = document.getElementById("simpleSpinButton");
const roulette = document.getElementById("roulette");

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

spinButton.addEventListener("click", () => {
    const randomMenu = pickRandom(menus);
    const randomCourse = pickRandom(courses);

    resultElement.textContent = `오늘은 ${randomMenu}을(를) 먹고 ${randomCourse}을(를) 한다.`;

    roulette.style.transition = "transform 2s ease-out";
    roulette.style.transform = `rotate(${Math.random() * 360}deg)`;
});
