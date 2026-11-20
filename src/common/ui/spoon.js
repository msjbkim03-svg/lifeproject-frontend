// 출신 가정 수저 (소득 1~5분위 → 흙·동·은·금·다이아수저)
//   PlayPage 신원 기록, 출생 화면에서 같이 씀 (그림은 Spoon.jsx)
export const SPOONS = [
  null,
  { name: '흙수저', color: '#8a5a3b', edge: '#5e3b25' },
  { name: '동수저', color: '#c47a45', edge: '#8d5128' },
  { name: '은수저', color: '#c3ccd6', edge: '#7d8896' },
  { name: '금수저', color: '#e8b52f', edge: '#a87a12' },
  { name: '다이아수저', color: '#8fdcf5', edge: '#3c9ec4' },
];

export const spoonOf = (wealthClass) => SPOONS[Math.max(1, Math.min(5, Math.round(wealthClass || 3)))];
