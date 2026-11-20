// 자동 결정 (원작 '결정을 자동으로 맡기기') - 결정 창이 뜨면 고를 것을 먼저 표시하고, 읽을 시간만큼 기다린 뒤 넘어감
//   기다리는 시간 = 창 글자 수(공백 빼고) ÷ 9 초, 5~14초 사이 (원작 공식), 16배속이면 절반
//   고를 것은 이벤트·나이로 정해지는 번호라서 화면을 다시 그려도 바뀌지 않음 (렌더 중에 Math.random 을 쓰지 않음)

export const autoWaitSec = (texts, speed = 1) => {
  const n = texts.filter(Boolean).join('').replace(/\s+/g, '').length;
  const sec = Math.min(14, Math.max(5, n / 9));
  return speed >= 16 ? sec / 2 : sec;
};

// 문자열 → 0 이상 정수 (같은 글자면 늘 같은 값)
const hashOf = (s) => {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
};

// 후보 가운데 하나 (seed 가 같으면 늘 같은 것)
export const autoPickOf = (list, seed) => (list && list.length ? list[hashOf(String(seed)) % list.length] : null);
