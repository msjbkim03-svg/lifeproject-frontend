// 추모관 공통 데이터·함수 (방 화면과 탭들이 같이 씀)

// 방명록 자주 쓰는 말 (누르면 입력칸에 들어감)
export const QUICK = ["편히 쉬세요", "수고 많으셨어요", "멋진 삶이었어요", "잊지 않을게요", "고마워요"];

// 탭 목록 (주소 끝 → 이름)  '' = /memorial/:lifeId (방)
export const TABS = [
  { path: "", label: "방" },
  { path: "video", label: "영상" },
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

// 받침 보고 '이' / '가' 고르기 (한글 아니면 영어 모음으로 끝날 때만 '가')
function iga(word) {
  const c = word.charAt(word.length - 1);
  if (c >= "가" && c <= "힣") return (c.charCodeAt(0) - 0xac00) % 28 === 0 ? "가" : "이";
  return /[aeiouy]/i.test(c) ? "가" : "이";
}

// 자녀·손주 수 말 (1 → 한 명, 그 밖 → N명)
const count = (n) => (n === 1 ? "한 명" : `${n}명`);

// 마지막 순간 탭 장례 문장 (원작처럼 누가 배웅했는지)
// family = 엔딩 영상 재료의 가족 줄 (film.film.life.family, 떠난 나이 기준)
// 예: "배우자 William, 자녀 한 명, 손주 4명, 형제자매들, 오랜 친구들이 마지막 길을 배웅했습니다."
export function funeralText(family) {
  const rows = family ?? [];
  const find = (role) => rows.find((r) => r.role === role);
  const who = [];

  // 부모님 (일찍 떠났다면 아직 살아 계신 분)
  const mom = find("어머니")?.alive;
  const dad = find("아버지")?.alive;
  if (mom && dad) who.push("부모님");
  else if (mom) who.push("어머니");
  else if (dad) who.push("아버지");

  const spouse = find("배우자");
  if (spouse) who.push(spouse.name ? `배우자 ${spouse.name}` : "배우자");

  const kids = rows.filter((r) => r.role === "아들" || r.role === "딸").length;
  if (kids > 0) who.push(`자녀 ${count(kids)}`);

  const grand = parseInt(/^(\d+)명/.exec(find("손주")?.info ?? "")?.[1], 10);
  if (grand > 0) who.push(`손주 ${count(grand)}`);

  // 형제자매: 줄이 있고(사이 말이 있으면 있다는 뜻) 95세 미만 한 명이라도 있으면
  const sib = find("형제자매");
  if (sib?.bond && sib.info && sib.info !== "없음") {
    const ages = (sib.info.match(/(\d+)세/g) ?? []).map((a) => parseInt(a, 10));
    if (ages.length === 0 || ages.some((a) => a < 95)) who.push("형제자매들");
  }

  // 친구: 곁에 남은 사람이 있을 때만
  const fr = find("친구");
  if (fr?.alive && fr.info) {
    const m = /^곁에 남은 오랜 친구 (한 명|\d+명)/.exec(fr.info);
    if (m) who.push(`오랜 친구 ${m[1]}`);
    else who.push(fr.info.includes(",") ? "오랜 친구들" : "오랜 친구 한 명");
  }

  if (who.length === 0) return { title: "쓸쓸한 장례였습니다.", people: "마지막 길을 배웅한 사람은 없었습니다." };
  const last = who[who.length - 1];
  return {
    title: "가족과 친구들이 모여 장례를 치렀습니다.",
    people: `${who.join(", ")}${iga(last)} 마지막 길을 배웅했습니다.`,
  };
}
