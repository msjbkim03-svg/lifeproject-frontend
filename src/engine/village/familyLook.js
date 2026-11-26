// C23 가족 생김새 다양화: 같은 가족은 항상 같은 머리·옷, 인생마다 다르게
//   seed = `${인생 번호}|${가족 id}` (homeFamily 가 넣어 줌) → 해시로 머리 모양·머리색·옷 모양·옷 색을 고름
//   엔딩 크레딧(C22)도 같은 seed 로 familyLook 을 부르면 마을과 같은 모습
//   ※ 그림(Figure)·착장 데이터(costumeData)는 고치지 않고 lookOf 결과 위에 덮어씀
import { lookOf } from './costumeData';

const ELDER_HAIR = '#c9c9c9'; // costumeData 의 60세 흰머리와 같은 색
const HAIR_COLORS = ['#3a2c26', '#2b2230', '#1f1a1c', '#5a3a2a', '#7a4a2a'];
const HAIR_M = ['short', 'short', 'spiky'];
const HAIR_F = ['long', 'long', 'bun', 'ponytail', 'short'];
const TOP_COLORS = ['#8fb0ec', '#e9a0b4', '#9ccfb4', '#f2c48a', '#b8a4e0', '#a7b3c2', '#e8b0a0'];
const SUIT_COLORS = ['#4a5878', '#5a5a66', '#6b5a4a']; // 정장은 짙은 색
const TOPS = {
  baby: ['tee'],
  kid: ['tee', 'stripe', 'hoodie', 'school'],
  adultM: ['tee', 'stripe', 'hoodie', 'suit'],
  adultF: ['tee', 'stripe', 'hoodie', 'dress'],
  elderM: ['tee', 'suit', 'hanbok'],
  elderF: ['tee', 'dress', 'hanbok'], // 정장은 남자만
};

// 글자 → 숫자 (FNV-1a 해시): 같은 글자면 항상 같은 숫자
function hash(s) {
  let h = 2166136261;
  for (const ch of String(s)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// 목록에서 하나 고르기: salt 를 seed 앞에 붙여 해시를 새로 함 → 머리 모양·머리색·옷 모양·옷 색이 서로 따로 골라짐
const pick = (arr, seed, salt) => arr[hash(`${salt}#${seed}`) % arr.length]; // salt 를 앞에: 해시 전체가 달라져야 항목끼리 안 묶임

export function familyLook({ seed, gender, age }) {
  const look = lookOf({ gender, age, soft: true }); // 기본 모습 (나이 그룹·아기 머리 없음 등)
  const h = String(seed ?? ''); // pick 에 넘길 seed 글자
  const female = gender === 'F';

  if (look.hair) {
    look.hair = {
      style: pick(female ? HAIR_F : HAIR_M, h, 1),
      color: look.group === 'elder' ? ELDER_HAIR : pick(HAIR_COLORS, h, 2),
    };
  }

  const teen = look.group === 'adult' && age != null && age < 20; // 13~19세: 몸은 어른 크기, 옷은 아이 목록 (정장·원피스 X, 교복 O)
  const tops = teen ? TOPS.kid
    : look.group === 'adult' ? (female ? TOPS.adultF : TOPS.adultM)
      : look.group === 'elder' ? (female ? TOPS.elderF : TOPS.elderM)
        : TOPS[look.group];
  const style = pick(tops, h, 3);
  look.top = { style, color: pick(style === 'suit' ? SUIT_COLORS : TOP_COLORS, h, 4) };
  return look;
}