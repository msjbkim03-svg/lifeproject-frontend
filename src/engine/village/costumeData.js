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
  HAIR_05: { part: 'hair', style: 'afro', color: '#3a2c26', name: '아프로' },
  HAIR_06: { part: 'hair', style: 'ponytail', color: '#7a4a2a', name: '포니테일' },
  HAIR_07: { part: 'hair', style: 'mohawk', color: '#e8584c', name: '빨간 모히칸' },
  HAIR_08: { part: 'hair', style: 'twinbun', color: '#5a3a2a', name: '양갈래 똥머리' },
  HAIR_09: { part: 'hair', style: 'spiky', color: '#e6c35c', name: '금발 삐죽 머리' },
  TOP_05: { part: 'top', style: 'hanbok', color: '#e86a8a', name: '분홍 한복' },
  TOP_06: { part: 'top', style: 'school', color: '#2f3b5c', name: '교복' },
  TOP_07: { part: 'top', style: 'hoodie', color: '#4a9a7a', name: '초록 후드티' },
  TOP_08: { part: 'top', style: 'hero', color: '#d0383f', name: '히어로 슈트' },
  TOP_09: { part: 'top', style: 'pajama', color: '#9ec5f0', name: '줄무늬 잠옷' },
  TOP_10: { part: 'top', style: 'space', color: '#e9ecf2', name: '우주복' },
  RIDE_01: { part: 'ride', style: 'bike', color: '#e8584c', name: '자전거', minAge: 7 },
  RIDE_02: { part: 'ride', style: 'moto', color: '#e02430', name: '오토바이', minAge: 18 },
  RIDE_03: { part: 'ride', style: 'horse', color: '#9c5a32', name: '말', minAge: 15 },
  RIDE_04: { part: 'ride', style: 'supercar', color: '#e02430', name: '슈퍼카', minAge: 19 },
  RIDE_05: { part: 'ride', style: 'ufo', color: '#7ef9ff', name: 'UFO', minAge: 20 },
  HAT_04: { part: 'hat', style: 'crown', color: '#f2c230', name: '황금 왕관' },
  HAT_05: { part: 'hat', style: 'tophat', color: '#2b2d33', name: '신사 모자' },
  HAT_06: { part: 'hat', style: 'beret', color: '#c9544a', name: '빨간 베레모' },
  HAT_07: { part: 'hat', style: 'ribbon', color: '#f07aa8', name: '분홍 리본' },
  HAT_08: { part: 'hat', style: 'bunny', color: '#ffffff', name: '토끼 머리띠' },
  HAT_09: { part: 'hat', style: 'hardhat', color: '#f2b22e', name: '노란 안전모' },
  HAT_10: { part: 'hat', style: 'alien', color: '#5effa3', name: '외계인 더듬이' },
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
const ELDER_HAIR = '#c9c9c9'; // 60세부터 흰머리 (기본 머리·산 머리 모두)
export function lookOf({ gender, age, costume, soft = false }) {
  const group = ageGroup(age);
  const female = gender === 'F';
  const look = {
    group,
    hair: group === 'baby' ? null : { style: female ? 'long' : 'short', color: group === 'elder' ? ELDER_HAIR : '#3a2c26' },
    top: { style: 'tee', color: female ? (soft ? '#e9a0b4' : '#e98aa6') : (soft ? '#8fb0ec' : '#6f95e8') },
    hat: null,
    ride: null,
  };
  if (typeof costume === 'string') {
    look.top = { ...look.top, color: costume };
    return look;
  }
  if (!costume) return look;
    for (const part of ['hair', 'top', 'hat', 'ride']) {
    const item = COSTUMES[costume[part]];
    if (item && item.part === part) look[part] = { style: item.style, color: item.color };
  }
  // 60세부터는 산 머리도 모양(아프로·포니테일 등)은 그대로, 색만 흰머리로
  if (group === 'elder' && look.hair) look.hair = { ...look.hair, color: ELDER_HAIR };
  return look;
}