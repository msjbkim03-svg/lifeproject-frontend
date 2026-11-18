// 생존 곡선 (인생 진행 화면 오른쪽 '생존 곡선' 그림용) - 화면 표시용 근사
// 같은 해·같은 나라에서 태어난 사람 중 x세까지 살아 있는 비율을
// 기대수명(LE)·영아사망률(IMR, 1,000명당)에 맞춘 곰페르츠 사망률로 계산해요.
// (엔진의 실제 사망 판정은 백엔드 EngineService.baseDeathProb - 여기 값은 그림용)
const MAX_AGE = 110;
const C = 0.09;      // 나이가 들수록 사망률이 늘어나는 속도
const A = 0.0007;    // 나이와 상관없는 사고·질병

function curve(b, q0, q1to4) {
  const s = [1];
  let alive = 1;
  for (let x = 0; x < MAX_AGE; x++) {
    let q;
    if (x === 0) q = q0;
    else if (x < 5) q = q1to4;
    else q = 1 - Math.exp(-(A + b * Math.exp(C * x)));
    alive *= 1 - Math.min(1, q);
    s.push(alive);
  }
  return s;
}

// 기대수명 (각 나이 생존 비율의 합, 그해 중간에 죽는다고 보고 0.5년 보정)
const lifeExp = (s) => s.slice(1).reduce((a, v) => a + v, 0) + 0.5;

// 반환: [1, s1, s2, … s110]  (s[x] = x세까지 살아 있는 비율)
export function survivalCurve(le = 70, imr = 30, u5 = null) {
  const q0 = Math.min(0.5, Math.max(0.001, (imr || 30) / 1000));
  const rest = u5 != null ? Math.max(0, (u5 - (imr || 0)) / 1000) : q0 * 0.35;
  const q1to4 = Math.min(0.05, rest / 4);
  let lo = 1e-7;
  let hi = 0.2;
  for (let i = 0; i < 60; i++) {
    const mid = Math.sqrt(lo * hi);
    if (lifeExp(curve(mid, q0, q1to4)) > le) lo = mid; else hi = mid;
  }
  return curve(Math.sqrt(lo * hi), q0, q1to4);
}
