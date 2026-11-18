// C08 마을 이동 - 데이터
// 마을 장소(우리 집 · 학교 · 마을회관 · 시장 · 일터 · 보건소 · 공원)가 한 화면씩 이어져 있어요.
// 오른쪽 끝으로 걸어가면 다음 장소 화면으로, 왼쪽 끝으로 가면 이전 장소 화면으로 넘어가요.
// 권역(동·동남·남·중앙·서아시아)은 하늘·땅·지붕 모양·나무 같은 풍경만 바꿔요.

// 아시아 48개국(UN 기준) → [국기용 2자리 코드, 권역]
export const COUNTRIES = {
  // 동아시아 (EAST)
  CHN: ['cn', 'EAST'], JPN: ['jp', 'EAST'], KOR: ['kr', 'EAST'], PRK: ['kp', 'EAST'], MNG: ['mn', 'EAST'],
  // 동남아시아 (SOUTHEAST)
  BRN: ['bn', 'SOUTHEAST'], KHM: ['kh', 'SOUTHEAST'], IDN: ['id', 'SOUTHEAST'], LAO: ['la', 'SOUTHEAST'],
  MYS: ['my', 'SOUTHEAST'], MMR: ['mm', 'SOUTHEAST'], PHL: ['ph', 'SOUTHEAST'], SGP: ['sg', 'SOUTHEAST'],
  THA: ['th', 'SOUTHEAST'], TLS: ['tl', 'SOUTHEAST'], VNM: ['vn', 'SOUTHEAST'],
  // 남아시아 (SOUTH)
  AFG: ['af', 'SOUTH'], BGD: ['bd', 'SOUTH'], BTN: ['bt', 'SOUTH'], IND: ['in', 'SOUTH'], IRN: ['ir', 'SOUTH'],
  MDV: ['mv', 'SOUTH'], NPL: ['np', 'SOUTH'], PAK: ['pk', 'SOUTH'], LKA: ['lk', 'SOUTH'],
  // 중앙아시아 (CENTRAL)
  KAZ: ['kz', 'CENTRAL'], KGZ: ['kg', 'CENTRAL'], TJK: ['tj', 'CENTRAL'], TKM: ['tm', 'CENTRAL'], UZB: ['uz', 'CENTRAL'],
  // 서아시아 (WEST)
  ARM: ['am', 'WEST'], AZE: ['az', 'WEST'], BHR: ['bh', 'WEST'], CYP: ['cy', 'WEST'], GEO: ['ge', 'WEST'],
  IRQ: ['iq', 'WEST'], ISR: ['il', 'WEST'], JOR: ['jo', 'WEST'], KWT: ['kw', 'WEST'], LBN: ['lb', 'WEST'],
  OMN: ['om', 'WEST'], QAT: ['qa', 'WEST'], SAU: ['sa', 'WEST'], PSE: ['ps', 'WEST'], SYR: ['sy', 'WEST'],
  TUR: ['tr', 'WEST'], ARE: ['ae', 'WEST'], YEM: ['ye', 'WEST'],
};

// 권역별 마을 풍경
// light: 노을 마을 (라이트 테마) / dark: 밤 마을 (다크 테마)
// land: hills 언덕+산 / paddy 다랑논 / river 강 / steppe 설산+초원 / dunes 사막 모래언덕
// deco: blossom 벚나무 / palm 야자수 / tree 둥근 나무 / grass 풀
// roof: 지붕 모양 (tile 기와 / stilt 높은 다락집 / flat 평지붕 / yurt 둥근 천막 / dome 둥근 지붕)
export const THEMES = {
  EAST: {
    name: '동아시아', land: 'hills', deco: 'blossom', roof: 'tile',
    light: { sky: 'linear-gradient(180deg, #ffb59a 0%, #ffd7c2 55%, #ffeadf 100%)', far: '#f2a48f', near: '#e9927e', ground: '#f6d9c6', road: '#ecc4ad', wall: '#fff8f2', roofC: '#c9544a', trunk: '#8a5a4a', leaf: '#f39ab0', water: '#9fc7e0' },
    dark: { sky: 'linear-gradient(180deg, #0b1230 0%, #1b2a62 100%)', far: '#1d2a55', near: '#24305e', ground: '#141f38', road: '#222c4b', wall: '#2a3462', roofC: '#3d2f5f', trunk: '#3b2f3f', leaf: '#6b4a7a', water: '#2a3d70' },
  },
  SOUTHEAST: {
    name: '동남아시아', land: 'paddy', deco: 'palm', roof: 'stilt',
    light: { sky: 'linear-gradient(180deg, #ffad8a 0%, #ffd2b0 55%, #ffeedd 100%)', far: '#e6a07c', near: '#b9c78a', ground: '#e9dcb6', road: '#e2c7a0', wall: '#fff3e2', roofC: '#b8673e', trunk: '#8a6244', leaf: '#5f9a6a', water: '#8fc2c9' },
    dark: { sky: 'linear-gradient(180deg, #091530 0%, #183a5a 100%)', far: '#16344a', near: '#1b3d3a', ground: '#11292b', road: '#252f44', wall: '#243b4f', roofC: '#3a3a52', trunk: '#3b2f3f', leaf: '#1f3a3a', water: '#1f3b55' },
  },
  SOUTH: {
    name: '남아시아', land: 'river', deco: 'tree', roof: 'flat',
    light: { sky: 'linear-gradient(180deg, #ff9f8c 0%, #ffc9a8 55%, #ffe8d6 100%)', far: '#e59a86', near: '#d9a27e', ground: '#f2d7b8', road: '#e6c09e', wall: '#fff0e0', roofC: '#d07a52', trunk: '#80553f', leaf: '#6f9e5e', water: '#9cc0d6' },
    dark: { sky: 'linear-gradient(180deg, #110f30 0%, #3a2552 100%)', far: '#2c2148', near: '#2a3550', ground: '#241f33', road: '#352c45', wall: '#3a2f52', roofC: '#4a3560', trunk: '#3b2f3f', leaf: '#1f3a34', water: '#2c3460' },
  },
  CENTRAL: {
    name: '중앙아시아', land: 'steppe', deco: 'grass', roof: 'yurt',
    light: { sky: 'linear-gradient(180deg, #ffb39e 0%, #ffd9c4 55%, #fff0e6 100%)', far: '#d99b93', near: '#c9b083', ground: '#eee0c0', road: '#e2caa6', wall: '#fffaf0', roofC: '#c25b4e', trunk: '#7c5a44', leaf: '#8aa25a', water: '#a6c8db' },
    dark: { sky: 'linear-gradient(180deg, #0a1030 0%, #23306a 100%)', far: '#2c3560', near: '#22304a', ground: '#1b2638', road: '#2b3350', wall: '#2e3a60', roofC: '#3f3a66', trunk: '#3b2f3f', leaf: '#3f5a46', water: '#26386a' },
  },
  WEST: {
    name: '서아시아', land: 'dunes', deco: 'palm', roof: 'dome',
    light: { sky: 'linear-gradient(180deg, #ff9c84 0%, #ffc8a2 55%, #ffe9d2 100%)', far: '#eba783', near: '#f0bd8d', ground: '#f6dfbc', road: '#ebc89d', wall: '#fff3e0', roofC: '#3f8f95', trunk: '#8a6244', leaf: '#6c9a6a', water: '#9cc6cf' },
    dark: { sky: 'linear-gradient(180deg, #0e0f2e 0%, #3b2a55 100%)', far: '#3a2c4e', near: '#46364f', ground: '#2a2436', road: '#3a3147', wall: '#3e3352', roofC: '#2f4a60', trunk: '#3b2f3f', leaf: '#1f3a3a', water: '#2a3858' },
  },
};

// 마을 장소 (왼쪽 → 오른쪽 순서로 한 화면씩)
export const PLACES = [
  { id: 'home', name: '우리 집', desc: '식구들이 사는 집' },
  { id: 'school', name: '학교', desc: '아이들이 공부하는 곳' },
  { id: 'hall', name: '마을회관', desc: '마을 사람들이 모이는 곳' },
  { id: 'market', name: '시장', desc: '장을 보고 물건을 사고파는 곳' },
  { id: 'work', name: '일터', desc: '어른들이 일하는 곳' },
  { id: 'clinic', name: '보건소', desc: '아프면 찾아가는 곳' },
  { id: 'park', name: '공원', desc: '쉬어 가는 곳' },
];
export const MIN_X = 5;     // 한 화면에서 걸어 다닐 수 있는 범위 (%)
export const MAX_X = 95;
export const EDGE = 3;      // 이보다 끝에 닿으면 옆 장소로 넘어감
export const DOOR_X = 50;   // 장소 앞 (건물 문 앞)
export const GROUND_Y = 86; // 사람이 서는 높이 (화면 높이 %)
export const SPEED = 30;    // 걷는 속도 (화면 %/초)

// 인생 상황 → 올해 주로 있는 장소 (PlayPage 에서 place 로 넘김)
export function placeOf(life) {
  if (!life) return 'home';
  if (life.status === 'ENDED') return 'home';
  if (life.health != null && life.health < 30) return 'clinic';
  if (life.schoolStatus === 'ENROLLED') return 'school';
  if (life.jobStatus === 'EMPLOYED') return life.currentAge >= 60 ? 'hall' : 'work';
  if (life.jobStatus === 'UNEMPLOYED') return 'market';
  if (life.jobStatus === 'RETIRED' || life.currentAge >= 60) return 'hall';
  if (life.currentAge < 6) return 'park';
  return 'home';
}

// 하늘에 뿌릴 별 위치 (다크 테마, x %, y %, 크기 px) - 매번 같은 자리
export const SKY_STARS = [
  [6, 8, 1], [14, 22, 1.5], [22, 6, 1], [31, 16, 1], [39, 4, 2], [47, 20, 1], [55, 9, 1],
  [63, 25, 1.5], [70, 5, 1], [78, 17, 1], [86, 8, 1.5], [93, 24, 1], [10, 33, 1], [58, 34, 1],
  [35, 30, 1], [82, 32, 1],
];
