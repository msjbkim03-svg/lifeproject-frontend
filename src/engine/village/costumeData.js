// C21 착장 → 마을 사람 그림 (Village Figure)
// 상품 코드 → 부위(part)·모양(style)·색(color)
// ※ 지금 코드는 임시 (민승 상품 목록이 정해지면 코드·이름만 바꾸면 됨)
//   hair 모양: short 짧은 머리 / long 긴 머리 / bun 올림 머리
//   top  모양: tee 티셔츠 / stripe 줄무늬 / suit 정장 / dress 원피스
//   hat  모양: cap 야구 모자 / straw 밀짚모자 / beanie 털모자
export const COSTUMES = {
  HAIR_01: { part: 'hair', style: 'short', color: '#8a5a3b', name: '갈색 짧은 머리' },
  HAIR_02: { part: 'hair', style: 'long', color: '#2b2230', name: '검은 긴 머리' },
  HAIR_03: { part: 'hair', style: 'bun', color: '#d9a441', name: '금발 올림 머리' },
  HAIR_04: { part: 'hair', style: 'short', color: '#e98aa6', name: '분홍 짧은 머리' },
  TOP_01: { part: 'top', style: 'tee', color: '#4a9a7a', name: '초록 티셔츠' },
  TOP_02: { part: 'top', style: 'stripe', color: '#f2a23a', name: '줄무늬 티셔츠' },
  TOP_03: { part: 'top', style: 'suit', color: '#2f3b5c', name: '남색 정장' },
  TOP_04: { part: 'top', style: 'dress', color: '#9b6fd0', name: '보라 원피스' },
  HAT_01: { part: 'hat', style: 'cap', color: '#e8584c', name: '빨간 야구 모자' },
  HAT_02: { part: 'hat', style: 'straw', color: '#e2c27a', name: '밀짚모자' },
  HAT_03: { part: 'hat', style: 'beanie', color: '#5b86c9', name: '파란 털모자' },
};

// 나이 → 몸 크기 (아기 · 아이 · 어른 · 노인), 나이를 모르면 어른
export function ageGroup(age) {
  if (age == null) return 'adult';
  if (age < 3) return 'baby';
  if (age < 13) return 'kid';
  if (age < 60) return 'adult';
  return 'elder';
}

// 그릴 모습 = 기본 모습(성별·나이) 위에 입은 착장을 덮어씀
// costume: { hair: 'HAIR_02', top: 'TOP_01', hat: null } (서버 LifeDTO.costume 예정)
//          예전처럼 색 글자('#3a7d44')가 오면 옷 색으로만 씀
// soft: 가족은 옷 색을 조금 연하게 (나와 구분)
export function lookOf({ gender, age, costume, soft = false }) {
  const group = ageGroup(age);
  const female = gender === 'F';
  const look = {
    group,
    hair: group === 'baby' ? null : { style: female ? 'long' : 'short', color: group === 'elder' ? '#c9c9c9' : '#3a2c26' },
    top: { style: 'tee', color: female ? (soft ? '#e9a0b4' : '#e98aa6') : (soft ? '#8fb0ec' : '#6f95e8') },
    hat: null,
  };
  if (typeof costume === 'string') {
    look.top = { ...look.top, color: costume };
    return look;
  }
  if (!costume) return look;
  for (const part of ['hair', 'top', 'hat']) {
    const item = COSTUMES[costume[part]];
    if (item && item.part === part) look[part] = { style: item.style, color: item.color };
  }
  return look;
}