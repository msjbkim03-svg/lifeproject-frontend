import { spoonOf } from './spoon';
import './ui.css';

// 수저 그림 + 이름 (예: 은수저). size: 그림 높이(px)
//   다이아수저는 반짝이는 결 두 줄을 더 그림
function Spoon({ level, size = 18, showName = true, className }) {
  const s = spoonOf(level);
  const n = Math.max(1, Math.min(5, Math.round(level || 3)));
  return (
    <span className={'spoon' + (className ? ' ' + className : '')} title={`출신 가정 ${s.name} (소득 ${n}분위)`}>
      <svg width={size * 0.55} height={size} viewBox="0 0 11 20" aria-hidden="true">
        <ellipse cx="5.5" cy="5" rx="4.3" ry="4.6" fill={s.color} stroke={s.edge} strokeWidth="1" />
        <rect x="4.4" y="9" width="2.2" height="10" rx="1.1" fill={s.color} stroke={s.edge} strokeWidth="1" />
        {n === 5 && <path d="M3 3.2l2.5 2.6M6.5 2.2l1.6 1.6" stroke="#fff" strokeWidth="1" strokeLinecap="round" />}
        {n >= 3 && n < 5 && <ellipse cx="4" cy="3.6" rx="1.2" ry="1.6" fill="#fff" opacity="0.55" />}
      </svg>
      {showName && <span className="spoon-n">{s.name}</span>}
    </span>
  );
}

export default Spoon;
