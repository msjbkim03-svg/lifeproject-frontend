// 추모관 공통 데이터·함수 (방 화면과 탭들이 같이 씀)

// 방명록 자주 쓰는 말 (누르면 입력칸에 들어감)
export const QUICK = ["편히 쉬세요", "수고 많으셨어요", "멋진 삶이었어요", "잊지 않을게요", "고마워요"];

// 탭 목록 (주소 끝 → 이름)  '' = /memorial/:lifeId (방)
export const TABS = [
  { path: "", label: "방" },
  { path: "video", label: "영상" },
  { path: "cookie", label: "쿠키 영상" },
  { path: "album", label: "사진첩" },
  { path: "guest", label: "방명록" },
  { path: "last", label: "마지막 순간" },
];

// 서버 응답에서 비어 있을 수 있는 목록은 빈 값으로 채우기 (.length · .map 에러 막기)
export function toRoom(d) {
  return {
    ...d,
    happiness: d.happiness ?? [],
    leftThings: d.leftThings ?? [],
    events: d.events ?? [],
    photos: d.photos ?? [],
    comments: d.comments ?? [],
    last: d.last ?? {},
  };
}

// 나이 → 사진첩 묶음 이름 (어린 시절 / 10대 / 20대 …)
export function groupName(age) {
  if (age < 13) return "어린 시절";
  if (age < 20) return "10대";
  return `${Math.floor(age / 10) * 10}대`;
}

// 묶음 이름 → 연도 범위 (예: 2026 – 2038)
export function groupRange(name, birthYear, deathYear) {
  let from, to;
  if (name === "어린 시절") { from = 0; to = 12; }
  else if (name === "10대") { from = 13; to = 19; }
  else { from = parseInt(name, 10); to = from + 9; }
  return `${birthYear + from} – ${Math.min(birthYear + to, deathYear)}`;
}
