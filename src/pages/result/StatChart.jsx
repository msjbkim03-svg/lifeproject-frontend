// C18 능력치 변화 (11/25 다시 만듦)
//   능력치마다 한 줄씩 따로 그림(작은 그래프 4개) — 선 4개가 한 칸에 엉키지 않게
//   왼쪽: 상태창과 같은 아이콘 + 이름 + 값 + 최고·최저
//   오른쪽: 0~100 칸 안의 면 그래프. 가운데 점선 = 50
//   아래: 나이 눈금 (큰 장면 번호는 11/25 동현님: 빼기)
//   마우스를 올리거나(←→ 키) 하면 그 나이의 네 값이 왼쪽 숫자에 바로 나옴
//   예: <StatChart years={r.years} />
import { useMemo, useRef, useState } from 'react';
import StatIcon from '../../common/ui/StatIcon';
import styles from './StatChart.module.css';

const LINES = [
  { key: 'health', label: '건강', color: 'var(--stat-health)' },
  { key: 'happiness', label: '행복', color: 'var(--stat-happiness)' },
  { key: 'knowledge', label: '지식', color: 'var(--stat-knowledge)' },
  { key: 'relation', label: '관계', color: 'var(--stat-relation)' },
];

const VW = 1000; // 그림 안 좌표 너비 (화면에 맞게 늘어남)
const VH = 100;  // 값 0~100 그대로

const clamp = (v) => Math.max(0, Math.min(100, Math.round(v || 0)));

function StatChart({ years }) {
  const rows = useMemo(() => [...(years || [])].sort((a, b) => a.age - b.age), [years]);
  const [hover, setHover] = useState(null); // 보고 있는 줄 번호 (rows 안 순서)
  const plotRef = useRef(null);

  const info = useMemo(() => {
    if (rows.length < 2) return null;
    const a0 = rows[0].age;
    const a1 = Math.max(a0 + 1, rows[rows.length - 1].age);
    const px = (age) => ((age - a0) / (a1 - a0)) * 100; // % 위치
    const lines = LINES.map((l) => {
      let hi = rows[0], lo = rows[0];
      rows.forEach((y) => {
        if (clamp(y[l.key]) > clamp(hi[l.key])) hi = y;
        if (clamp(y[l.key]) < clamp(lo[l.key])) lo = y;
      });
      const pts = rows.map((y) => `${(px(y.age) / 100) * VW},${VH - clamp(y[l.key])}`);
      return {
        ...l,
        line: 'M' + pts.join('L'),
        area: `M0,${VH}L${pts.join('L')}L${VW},${VH}Z`,
        hi, lo,
      };
    });
    const ticks = [];
    for (let a = Math.ceil(a0 / 10) * 10; a <= a1; a += 10) ticks.push(a);
    return { a0, a1, px, lines, ticks };
  }, [rows]);

  if (!info) return <p className="sub">기록이 부족해서 그래프를 그릴 수 없어요.</p>;

  const last = rows.length - 1;
  const at = hover ?? last;
  const cur = rows[at];
  const prev = at > 0 ? rows[at - 1] : null;

  // 마우스 x → 가장 가까운 해
  const pick = (clientX) => {
    const box = plotRef.current?.getBoundingClientRect();
    if (!box) return;
    const age = info.a0 + ((clientX - box.left) / box.width) * (info.a1 - info.a0);
    let best = 0;
    rows.forEach((y, i) => { if (Math.abs(y.age - age) < Math.abs(rows[best].age - age)) best = i; });
    setHover(best);
  };
  const onKey = (e) => {
    if (e.key === 'ArrowLeft') { setHover(Math.max(0, at - 1)); e.preventDefault(); }
    if (e.key === 'ArrowRight') { setHover(Math.min(last, at + 1)); e.preventDefault(); }
    if (e.key === 'Escape') setHover(null);
  };

  const x = info.px(cur.age);

  return (
    <div
      className={styles.box}
      tabIndex={0}
      role="group"
      aria-label="나이별 능력치 변화. 왼쪽·오른쪽 화살표로 나이를 옮겨 볼 수 있어요."
      onKeyDown={onKey}
      onPointerLeave={() => setHover(null)}
    >
      <div className={styles.head}>
        <span className={styles.when}>
          {hover == null ? '세상을 떠난 해' : `${cur.age}세`}
          <small>{cur.yearNo ? `${cur.yearNo}년` : ''}</small>
        </span>
        <span className={styles.hint}>그래프 위에 올리면 그 나이의 값이 나와요</span>
      </div>

      {info.lines.map((l) => {
        const v = clamp(cur[l.key]);
        const d = prev ? v - clamp(prev[l.key]) : 0;
        return (
          <div key={l.key} className={styles.row}>
            <div className={styles.label}>
              <span className={styles.knob} style={{ borderColor: l.color }}><StatIcon name={l.key} color={l.color} size={14} /></span>
              <span className={styles.name}>{l.label}</span>
              <b className={styles.val}>{v}</b>
              <span className={styles.dv + (hover != null && d > 0 ? ' ' + styles.up : hover != null && d < 0 ? ' ' + styles.dn : '')}>
                {hover != null && d !== 0 ? (d > 0 ? `▲${d}` : `▼${-d}`) : ''}
              </span>
              <span className={styles.range}>
                최고 {clamp(l.hi[l.key])}<small>({l.hi.age}세)</small> · 최저 {clamp(l.lo[l.key])}<small>({l.lo.age}세)</small>
              </span>
            </div>
            <div
              className={styles.plot}
              ref={l.key === 'health' ? plotRef : undefined}
              onPointerMove={(e) => pick(e.clientX)}
              onPointerDown={(e) => pick(e.clientX)}
            >
              <svg viewBox={`0 0 ${VW} ${VH}`} preserveAspectRatio="none" aria-hidden="true">
                <line x1="0" x2={VW} y1="50" y2="50" className={styles.mid} vectorEffect="non-scaling-stroke" />
                <path d={l.area} fill={l.color} opacity="0.13" />
                <path d={l.line} fill="none" stroke={l.color} strokeWidth="2" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              </svg>
              <i className={styles.cross} style={{ left: x + '%', opacity: hover == null ? 0 : 1 }} />
              <i className={styles.dot} style={{ left: x + '%', top: 100 - v + '%', background: l.color }} />
            </div>
          </div>
        );
      })}

      {/* 나이 눈금 */}
      <div className={styles.row}>
        <div />
        <div className={styles.axis}>
          {info.ticks.map((a) => <span key={a} style={{ left: info.px(a) + '%' }}>{a}세</span>)}
        </div>
      </div>

    </div>
  );
}

export default StatChart;
