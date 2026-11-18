// 화면 테마 (라이트 = 노을 코랄, 다크 = 예전 밤하늘) - 동현님 관리
// - <html data-theme="dark"> 이면 다크, 속성이 없으면 라이트
// - 고른 값은 localStorage 'theme' 에 저장 (처음 열 때 깜빡임 없게 index.html 에서 먼저 붙임)
// 사용: const theme = useTheme();  →  'light' | 'dark'   (캔버스 그림처럼 CSS 변수를 못 쓰는 곳)
//       setTheme('dark')
import { useEffect, useState } from 'react';

const KEY = 'theme';

export const getTheme = () =>
  (typeof document !== 'undefined' && document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light');

export function setTheme(theme) {
  const root = document.documentElement;
  root.classList.add('theme-anim'); // 바꿀 때만 부드럽게
  if (theme === 'dark') root.dataset.theme = 'dark';
  else delete root.dataset.theme;
  try { localStorage.setItem(KEY, theme); } catch { /* 저장 못 해도 화면은 바뀜 */ }
  window.setTimeout(() => root.classList.remove('theme-anim'), 400);
}

// 지금 테마 (바뀌면 다시 그림)
export function useTheme() {
  const [theme, setT] = useState(getTheme);
  useEffect(() => {
    const ob = new MutationObserver(() => setT(getTheme()));
    ob.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => ob.disconnect();
  }, []);
  return theme;
}
