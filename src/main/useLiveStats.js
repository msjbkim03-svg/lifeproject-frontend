// 메인 화면 '지금 아시아' 숫자 (H01 실시간 출생·사망 카운터)
// - useAsiaCounter(): 아시아 실제 통계(유엔 세계인구전망 2024, 2026년 추정)로 오늘 태어난/떠난 사람 수를 실시간 계산
//   (접속자 수가 아니라 통계로 계산한 값. 실제 플레이어 목록은 useRealFeed.js)
// 11/26: 예전 예시 목록(useLiveFeed)은 실제 플레이어 목록으로 바뀌어 지움, 렌더 중 Date.now() · ref 읽기(lint 규칙 위반) 정리
import { useEffect, useState } from 'react';

// 유엔 세계인구전망 2024 (중위 추계) - 아시아 2026년
export const ASIA_BIRTHS_PER_YEAR = 64911065; // 연간 출생아 수
export const ASIA_DEATHS_PER_YEAR = 34879246; // 연간 사망자 수
const SEC_PER_YEAR = 365 * 24 * 60 * 60;
export const BIRTHS_PER_SEC = ASIA_BIRTHS_PER_YEAR / SEC_PER_YEAR; // 약 2.06명
export const DEATHS_PER_SEC = ASIA_DEATHS_PER_YEAR / SEC_PER_YEAR; // 약 1.11명

// 오늘 0시부터 지금까지 + 이 페이지를 연 뒤 늘어난 수 (0.15초마다 다시 계산)
export function useAsiaCounter() {
  const [openedAt] = useState(() => Date.now()); // 페이지를 연 시각 (처음 한 번만)
  const [now, setNow] = useState(openedAt);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 150);
    return () => clearInterval(id);
  }, []);

  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  const secToday = (now - midnight.getTime()) / 1000;
  const secPage = (now - openedAt) / 1000;

  return {
    bornToday: Math.floor(secToday * BIRTHS_PER_SEC),
    diedToday: Math.floor(secToday * DEATHS_PER_SEC),
    bornSincePage: Math.floor(secPage * BIRTHS_PER_SEC),
    diedSincePage: Math.floor(secPage * DEATHS_PER_SEC),
  };
}
