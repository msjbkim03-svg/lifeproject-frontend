// 테마 바꾸기 버튼 (모든 화면 오른쪽 아래, App.jsx에서 한 번만 붙음)
// 누르면 라이트(노을 코랄) ↔ 다크(예전 밤하늘)
import { setTheme, useTheme } from '../theme';
import './ui.css';

function ThemeToggle() {
  const theme = useTheme();
  const dark = theme === 'dark';
  return (
    <button type="button" className="theme-toggle" aria-pressed={dark}
      aria-label={dark ? '라이트 모드로 바꾸기' : '다크 모드로 바꾸기'}
      title={dark ? '라이트 모드 (노을)' : '다크 모드 (밤하늘)'}
      onClick={() => setTheme(dark ? 'light' : 'dark')}>
      <span className="theme-toggle-ic" aria-hidden="true">
        {dark ? (
          <svg viewBox="0 0 24 24" width="18" height="18"><circle cx="12" cy="12" r="4.5" fill="currentColor" /><g stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2.5v2.5M12 19v2.5M2.5 12H5M19 12h2.5M5.3 5.3l1.8 1.8M16.9 16.9l1.8 1.8M5.3 18.7l1.8-1.8M16.9 7.1l1.8-1.8" /></g></svg>
        ) : (
          <svg viewBox="0 0 24 24" width="18" height="18"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor" /></svg>
        )}
      </span>
      <span className="theme-toggle-tx">{dark ? '라이트' : '다크'}</span>
    </button>
  );
}

export default ThemeToggle;
