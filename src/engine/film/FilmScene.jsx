// C22 엔딩 크레딧 장면 그림 (원작 1in8b 주마등 필름의 MO.* 장면을 참고해 우리 마을 그림체로 새로 그림)
// - 원작처럼 4겹: 하늘(0.22) · 먼 배경(0.55) · 가운데(1) · 앞(1) → 카메라가 움직이면 겹마다 다른 속도로 움직여 깊이가 생김
// - 원작보다 살아 움직이게: 걸어 들어가기 · 손 흔들기 · 박수 · 뽀뽀 · 하트 말풍선 · 눈물 · 아기 안기 · 출산 …
// - 움직임은 모두 장면 시간 t(ms)로 계산 (CSS 애니메이션 아님) → 되감기 · 건너뛰기 · 캡처해도 같은 그림
// - 사람은 마을 사람 그림(Figure · lookOf, 윤아님 파일)을 import 해서 쓰기만 함. 가방 · 면사포 · 학사모 · 눈물 같은 건 여기서 덧그림
// 사용: <FilmScene v={장면 정보 (filmPlan sceneAt)} t={장면 시작부터 ms} cam={[가로 %, 세로 %, 확대]} />
import Figure from '../village/Figure';
import { lookOf } from '../village/costumeData';
import { COUNTRIES, THEMES } from '../village/villageData';
import { useContext, useId } from 'react';
import { useTheme } from '../../common/theme';
import { GY, OUT, IdCtx, hexes, mix, rnd, NIGHT, Shadow, Sky, Clouds, Hills, City, Ground, Tree, Bush, Room, Bed, lieAt, Cover, Bundle, Bunting, Door, Bricks, Roof, BWin, Plant, Frame, Confetti, Rain, Petals, dk, lt } from './filmArt';

export const SW = 320; // 장면 크기 (16:9)
export const SH = 180;
const FW = 25;         // Figure 그림 크기 (px = 장면 단위)
const FH = 37;

// ───────── 시간 도우미 ─────────
const cl = (x) => Math.max(0, Math.min(1, x));
const seg = (t, a, b) => cl((t - a) / (b - a));           // a~b ms 사이 0→1
const ez = (x) => x * x * (3 - 2 * x);
const lerp = (a, b, k) => a + (b - a) * k;
const pop = (t, a, d = 420) => {                            // 톡 튀어나옴 (조금 커졌다 제자리)
  const k = seg(t, a, a + d);
  return k <= 0 ? 0 : k < 0.6 ? ez(k / 0.6) * 1.18 : 1.18 - 0.18 * ez((k - 0.6) / 0.4);
};
const wob = (t, per, amp = 1, ph = 0) => Math.sin(((t / per) + ph) * Math.PI * 2) * amp;
// ───────── 사람 ─────────
const lookFor = (p, costume) => (p.me
  ? lookOf({ gender: p.gender, age: p.age, costume })
  : lookOf({ gender: p.gender, age: p.age ?? 40, soft: true }));
const sizeOf = (age) => (age == null ? 1 : age < 1 ? 0.5 : age < 3 ? 0.62 : age < 7 ? 0.74 : age < 13 ? 0.84 : age < 16 ? 0.94 : 1);

// 말풍선 아이콘 (8×8 칸)
const ICON = {
  heart: ['.HH.HH.', 'HHHHHHH', 'HHHHHHH', '.HHHHH.', '..HHH..', '...H...'],
  bang: ['..H..', '..H..', '..H..', '..H..', '.....', '..H..'],
  q: ['.HHH.', 'H...H', '...H.', '..H..', '.....', '..H..'],
  note: ['...HH', '...HH', '...H.', '...H.', 'HHHH.', 'HHH..'],
  dots: ['.......', '.......', 'H.H.H..', '.......'],
  sweat: ['..H', '.HH', 'HHH', '.H.'],
  star: ['...H...', '..HHH..', 'HHHHHHH', '.HHHHH.', '.HH.HH.'],
};
function Pix({ rows, x, y, c, k = 1 }) {
  const out = [];
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === 'H') out.push(<rect key={i + '-' + j} x={x + i * k} y={y + j * k} width={k} height={k} fill={c} />); }));
  return <g>{out}</g>;
}
function Bubble({ kind, x, y, s = 1, c }) {
  if (!kind || s <= 0) return null;
  const rows = ICON[kind];
  const w = rows[0].length + 4;
  const h = rows.length + 4;
  const col = c || (kind === 'heart' ? '#f05a7e' : kind === 'note' ? '#5b86c9' : kind === 'sweat' ? '#7cc4f0' : '#2e2a33');
  return (
    <g transform={`translate(${x} ${y}) scale(${s}) translate(${-w / 2} ${-h - 3})`}>
      <rect x={-0.6} y={-0.6} width={w + 1.2} height={h + 1.2} rx={2.6} fill={OUT} />
      <rect x={0} y={0} width={w} height={h} rx={2.2} fill="#fffdf8" />
      <path d={`M${w / 2 - 2} ${h} l2 3 l2 -3 Z`} fill="#fffdf8" stroke={OUT} strokeWidth="0.6" />
      <Pix rows={rows} x={2} y={2} c={col} />
    </g>
  );
}
// 떠오르는 하트 (말풍선 없이)
function FloatHeart({ x, y, t, a, c = '#f05a7e', k = 1 }) {
  const q = seg(t, a, a + 1800);
  if (q <= 0 || q >= 1) return null;
  return <g opacity={1 - q} transform={`translate(${x + wob(t, 700, 2)} ${y - q * 22}) scale(${k * (0.6 + 0.4 * ez(Math.min(1, q * 3)))})`}><Pix rows={ICON.heart} x={-3.5} y={-3} c={c} /></g>;
}

// 한 사람: 발 가운데가 (x, y)
//   step: 걷는 중(다리·팔 번갈아) / arm: 'wave' 'up' 'clap' 'cheer' 'hold' / lie: 누움(머리 왼쪽) / lean: 기울기(도)
//   cry: 눈물 / bubble: 말풍선 / bag · veil · cap · flower · umbrella · suitcase · baby: 덧그림
function Actor({ p, x, y = GY, t = 0, s, flip, step, arm, lie, lean = 0, bow = 0, bob = 0, cry, bubble, bubS = 1, op = 1,
  bag, veil, cap, flower, umbrella, suitcase, baby, black, look: lk, costume, dim }) {
  if (op <= 0 || !p) return null;
  const k = s ?? sizeOf(p.age);
  let look = lk || lookFor(p, costume);
  if (black) look = { ...look, top: { style: 'tee', color: '#2b2a33' } }; // 상복 (정장 그림은 빨간 넥타이가 있어서 안 씀)
  const cls = ['fs-a'];
  if (step) cls.push(Math.floor(t / 170) % 2 ? 's1' : 's2');
  if (arm === 'wave') cls.push('aw', Math.floor(t / 260) % 2 ? 'w1' : 'w2');
  if (arm === 'up') cls.push('au');
  if (arm === 'cheer') cls.push('au', Math.floor(t / 300) % 2 ? 'w1' : 'w2');
  if (arm === 'clap') cls.push('ac', Math.floor(t / 180) % 2 ? 'c1' : 'c2');
  if (arm === 'hold') cls.push('ah');
  if (dim) cls.push('dim');
  const hop = step ? (Math.floor(t / 170) % 2 ? -0.8 : 0) : 0;
  const rot = lie ? -90 : 0; // 옆으로 기울이지 않음 (11/24 동현님: 너무 기울어져 보임) - 고개 숙임은 bow
  // bow: 고개 숙임 (앞을 보고 있으니 옆으로 기울이지 않고 위에서 눌리듯 낮아짐)
  const tf = `translate(${x} ${y + bob + hop}) rotate(${rot}) scale(${(flip ? -1 : 1) * k} ${k * (1 - 0.1 * bow)}) translate(${-FW / 2} ${-FH})`;
  const eyes = [[8.3, 14], [15.3, 14]];
  return (
    <g className={cls.join(' ')} opacity={op}>
      {!lie && <Shadow x={x} y={y + bob} w={8 * k} o={0.18} />}
      <g transform={tf}>
        {veil && <path d="M5 4 Q12.5 -3 20 4 L23 30 Q12.5 33 2 30 Z" fill="#ffffff" opacity="0.78" stroke="#e6e0f0" strokeWidth="0.4" />}
        {bag && <><rect x={2.5} y={18} width={20} height={11} rx={2} fill={OUT} /><rect x={3.3} y={18.8} width={18.4} height={9.4} rx={1.6} fill={bag} /></>}
        {umbrella && (
          <g>
            <path d="M19 26 V-2" stroke={OUT} strokeWidth="0.9" />
            <path d="M3 -1 Q19 -16 35 -1 Q31 -3 27 -1 Q23 -3 19 -1 Q15 -3 11 -1 Q7 -3 3 -1 Z" fill={umbrella} stroke={OUT} strokeWidth="0.7" />
          </g>
        )}
        <Figure look={look} />
        {bag && <><rect x={7.5} y={19} width={1.4} height={7} fill={OUT} /><rect x={16} y={19} width={1.4} height={7} fill={OUT} /></>}
        {veil && <><rect x={9} y={0} width={7} height={1.6} fill="#f2c230" /><rect x={12} y={-1} width={1.2} height={1.2} fill="#f2c230" /></>}
        {cap && (
          <g>
            <path d="M2 2 L12.5 -2 L23 2 L12.5 6 Z" fill="#24304f" stroke={OUT} strokeWidth="0.5" />
            <rect x={8} y={3} width={9} height={3} fill="#24304f" />
            <path d={`M20 2 V${7 + wob(t, 900, 0.6)}`} stroke="#f2c230" strokeWidth="0.8" />
          </g>
        )}
        {flower && (
          <g transform="translate(18 20)">
            <path d="M0 0 L2 8" stroke="#5f9a6a" strokeWidth="0.9" />
            {[[0, -1, '#f05a7e'], [-2, 0, '#ffd37a'], [2, 0, '#f6a5bd'], [0, 1.5, '#ffffff']].map(([a, b, c], i) => <circle key={i} cx={a} cy={b} r="1.6" fill={c} stroke={OUT} strokeWidth="0.3" />)}
          </g>
        )}
        {suitcase && <g><rect x={20} y={23} width={8} height={9} rx={1} fill={suitcase} stroke={OUT} strokeWidth="0.7" /><rect x={22.5} y={21} width={3} height={2} fill="none" stroke={OUT} strokeWidth="0.6" /></g>}
        {baby && (
          <g>
            <ellipse cx={12.5} cy={25} rx={7} ry={4.2} fill="#fffaf2" stroke={OUT} strokeWidth="0.6" />
            <circle cx={9.5} cy={24.4} r={2.6} fill="#f2c9a0" stroke={OUT} strokeWidth="0.5" />
            <rect x={8.6} y={24} width={0.6} height={0.6} fill={OUT} /><rect x={10.2} y={24} width={0.6} height={0.6} fill={OUT} />
            <path d="M12 23 Q17 22 19 25" stroke={baby} strokeWidth="1.4" fill="none" />
          </g>
        )}
        {cry && eyes.map(([ex, ey], i) => (
          <g key={i}>
            {[0, 1, 2].map((j) => {
              const q = ((t + j * 330 + i * 160) % 1000) / 1000;
              return <rect key={j} x={ex - 0.8 + (i ? 0.6 : -0.6) * q} y={ey + 1.5 + q * 13} width={1.6} height={2.4} fill="#5fb4ee" opacity={1 - q * 0.8} />;
            })}
            <rect x={ex - 0.8} y={ey + 0.4} width={1.6} height={4} fill="#8fd0f6" />
          </g>
        ))}
      </g>
      {bubble && <Bubble kind={bubble} x={lie ? x - FH * k * 0.75 : x + (flip ? -4 : 4) * k} y={lie ? y - 10 : y - FH * k - 2} s={bubS * Math.max(0.8, k)} />}
    </g>
  );
}

// ───────── 가족 고르기 ─────────
function castOf(v) {
  const f = (v.family || []).map((m) => ({ ...m }));
  const me = { id: 'me', me: true, gender: v.gender, age: v.age };
  const pick = (id) => f.find((m) => m.id === id);
  return {
    me,
    mom: pick('mom'),
    dad: pick('dad'),
    par: f.filter((m) => m.id === 'mom' || m.id === 'dad'),
    sib: f.filter((m) => m.id.startsWith('sib')),
    pt: pick('spouse'),
    kids: f.filter((m) => m.id.startsWith('kid')),
    all: f,
  };
}
const GEN = [
  { gender: 'F', age: 52 }, { gender: 'M', age: 30 }, { gender: 'F', age: 27 }, { gender: 'M', age: 61 },
  { gender: 'F', age: 9 }, { gender: 'M', age: 44 }, { gender: 'F', age: 35 }, { gender: 'M', age: 70 },
  { gender: 'M', age: 8 }, { gender: 'F', age: 66 },
];
const gen = (i, over) => ({ id: 'g' + i, ...GEN[i % GEN.length], ...over });
const other = (p) => ({ id: 'pt', gender: p.gender === 'F' ? 'M' : 'F', age: Math.max(18, (p.age || 30) + 1) });
// 사람 여럿을 cx 가운데로 gap 간격 줄 세우기
const row = (n, cx, gap = 16) => Array.from({ length: n }, (_, i) => cx + (i - (n - 1) / 2) * gap);

// ───────── 장면 소품 ─────────
// 링거대: 바퀴 달린 기둥 · 수액 주머니 · 줄 · 똑똑 떨어지는 방울
const Drip = ({ x, t }) => (
  <g>
    <Shadow x={x} w={7} o={0.14} />
    <path d={`M${x - 5} ${GY} l5 -3 l5 3 M${x} ${GY - 3} V${GY - 62} M${x - 7} ${GY - 62} h14`} stroke="#9aa6b2" strokeWidth="1.2" fill="none" />
    <rect x={x - 5} y={GY - 61} width={8} height={13} rx={2} fill="#e6f4fb" stroke="#9aa6b2" strokeWidth="0.5" />
    <rect x={x - 4} y={GY - 55} width={6} height={6} rx={1.4} fill="#cfe9f6" />
    <path d={`M${x - 1} ${GY - 48} v4`} stroke="#9aa6b2" strokeWidth="0.6" /><rect x={x - 2} y={GY - 44} width={2} height={4} rx={0.6} fill="#e6f4fb" stroke="#9aa6b2" strokeWidth="0.3" />
    <rect x={x - 1.3} y={GY - 43 + ((t / 9) % 3)} width={0.7} height={0.9} fill="#7cc4f0" />
    <path d={`M${x - 1} ${GY - 40} Q${x - 4} ${GY - 22} ${x - 22} ${GY - 22}`} stroke="#cfe3f0" strokeWidth="0.6" fill="none" />
  </g>
);
// 병실 칸막이 커튼 (천장 레일 · 고리 · 주름)
const Curtain = ({ x1, x2, c = '#bcd8d4' }) => (
  <g>
    <rect x={x1 - 2} y={18} width={x2 - x1 + 4} height={1.6} fill="#9aa6b2" />
    <path d={`M${x1} 20 ${Array.from({ length: Math.floor((x2 - x1) / 6) }, (_, i) => `Q${x1 + i * 6 + 3} 23 ${x1 + i * 6 + 6} 20`).join(' ')} V${GY - 16} H${x1} Z`} fill={c} />
    {Array.from({ length: Math.floor((x2 - x1) / 6) }, (_, i) => <g key={i}><circle cx={x1 + i * 6 + 3} cy={19.4} r={0.9} fill="none" stroke="#7a8694" strokeWidth="0.4" /><path d={`M${x1 + i * 6 + 3} 22 V${GY - 17}`} stroke={dk(c, 0.15)} strokeWidth="0.6" /></g>)}
    <rect x={x1} y={GY - 18} width={x2 - x1} height={2} fill={dk(c, 0.1)} />
  </g>
);
// 협탁: 서랍 · 손잡이 + 위에 올릴 것 (꽃병 · 물컵 · 사진 · 촛불)
const Stand = ({ x, t, items = ['vase'], night }) => (
  <g>
    <Shadow x={x} w={10} o={0.16} />
    <rect x={x - 9} y={GY - 22} width={18} height={22} fill="#a07a58" /><rect x={x - 9} y={GY - 22} width={18} height={1.4} fill="#c49a74" />
    <rect x={x - 7} y={GY - 18} width={14} height={7} fill="none" stroke="#7a5a40" strokeWidth="0.5" /><rect x={x - 7} y={GY - 9} width={14} height={7} fill="none" stroke="#7a5a40" strokeWidth="0.5" />
    <circle cx={x} cy={GY - 14.5} r={0.8} fill="#f2c230" /><circle cx={x} cy={GY - 5.5} r={0.8} fill="#f2c230" />
    {items.includes('vase') && <g><path d={`M${x - 5} ${GY - 22} q-1 -4 1 -7 h3 q2 3 1 7 Z`} fill="#9fc7e0" stroke="#6f97b0" strokeWidth="0.4" />{[[-6, -36, '#f05a7e'], [-3, -38, '#ffd37a'], [-1, -35, '#ffffff'], [-4, -33, '#f6a5bd']].map(([a, b, cc], i) => <g key={i}><path d={`M${x - 3.5} ${GY - 29} L${x + a + 0.5} ${GY + b + 2}`} stroke="#5f9a6a" strokeWidth="0.5" /><circle cx={x + a + 0.5} cy={GY + b + 1} r={1.6} fill={cc} stroke={dk(cc, 0.2)} strokeWidth="0.3" /></g>)}</g>}
    {items.includes('cup') && <g><rect x={x + 2} y={GY - 27} width={4} height={5} fill="#e6f4fb" opacity="0.85" stroke="#9aa6b2" strokeWidth="0.3" /><rect x={x + 2.3} y={GY - 25} width={3.4} height={2.8} fill="#cfe9f6" /></g>}
    {items.includes('photo') && <g><rect x={x + 1} y={GY - 30} width={7} height={8} fill="#b08a64" /><rect x={x + 2} y={GY - 29} width={5} height={6} fill="#f6e6c8" /><circle cx={x + 3.6} cy={GY - 26.6} r={1} fill="#f2c9a0" /><circle cx={x + 5.4} cy={GY - 26.4} r={0.9} fill="#f2c9a0" /></g>}
    {items.includes('candle') && <g><rect x={x - 6} y={GY - 28} width={3} height={6} fill="#f6f0dc" /><ellipse cx={x - 4.5} cy={GY - 30 + wob(t, 260, 0.25)} rx={1} ry={1.9} fill="#ffb02e" /><ellipse cx={x - 4.5} cy={GY - 29.6} rx={0.4} ry={0.9} fill="#fff4b0" /><circle cx={x - 4.5} cy={GY - 30} r={night ? 16 : 8} fill="#ffb02e" opacity={0.1 + 0.03 * Math.sin(t / 170)} /></g>}
  </g>
);

// 공원 벤치 (나무 살 · 쇠 다리 · 그림자)
const ParkBench = ({ x }) => (
  <g>
    <ellipse cx={x} cy={GY + 0.6} rx={20} ry={2.2} fill="#1a1424" opacity="0.16" />
    {[0, 1, 2].map((i) => <g key={i}><rect x={x - 18} y={GY - 22 + i * 3.2} width={36} height={2.4} rx={0.6} fill="#a8774e" /><rect x={x - 18} y={GY - 22 + i * 3.2} width={36} height={0.6} fill="#c99a6e" /></g>)}
    {[0, 1].map((i) => <g key={'s' + i}><rect x={x - 19} y={GY - 11.5 + i * 2.8} width={38} height={2.4} rx={0.6} fill="#a8774e" /><rect x={x - 19} y={GY - 11.5 + i * 2.8} width={38} height={0.6} fill="#c99a6e" /></g>)}
    {[-15, 15].map((d) => <path key={d} d={`M${x + d} ${GY - 23} V${GY} M${x + d - 2} ${GY} h4 M${x + d} ${GY - 9} l${d < 0 ? -3 : 3} -4`} stroke="#3a3440" strokeWidth="1.4" fill="none" />)}
  </g>
);
// 가로등 (밤엔 빛 번짐 · 날벌레)
const LampPost = ({ x, night, t }) => (
  <g>
    <Shadow x={x} w={5} o={0.18} />
    {night && <circle cx={x} cy={GY - 54} r={26} fill="#ffd37a" opacity="0.12" />}
    {night && <path d={`M${x - 4} ${GY - 52} L${x - 18} ${GY} H${x + 18} L${x + 4} ${GY - 52} Z`} fill="#ffd37a" opacity="0.07" />}
    <rect x={x - 3} y={GY - 4} width={6} height={4} fill="#3a3440" /><rect x={x - 1} y={GY - 52} width={2} height={48} fill="#3a3440" /><rect x={x - 0.4} y={GY - 52} width={0.6} height={48} fill="#6a6470" />
    <path d={`M${x - 5} ${GY - 52} h10 l-2 -6 h-6 Z`} fill="#3a3440" /><rect x={x - 3} y={GY - 57} width={6} height={4} fill={night ? '#ffe9a8' : '#f4ecd0'} /><path d={`M${x - 4} ${GY - 58} h8 l-4 -3 Z`} fill="#3a3440" />
    {night && [0, 1, 2].map((i) => <rect key={i} x={x + wob(t + i * 300, 700, 6)} y={GY - 56 + wob(t + i * 500, 900, 4)} width={0.6} height={0.6} fill="#fff4b0" />)}
  </g>
);
// 하객 의자 (등받이 · 리본)
const Chair = ({ x, y = GY + 6, bow = '#f6a5bd' }) => (
  <g>
    <rect x={x - 5} y={y - 15} width={10} height={9} rx={1.4} fill="#fdfaf4" stroke="#d6ccbe" strokeWidth="0.5" />
    {[-2.4, 0, 2.4].map((d) => <rect key={d} x={x + d - 0.4} y={y - 14} width={0.8} height={7} fill="#e6dccd" />)}
    <rect x={x - 5.4} y={y - 6.4} width={10.8} height={2} fill="#fdfaf4" stroke="#d6ccbe" strokeWidth="0.4" />
    <path d={`M${x - 4.5} ${y - 4.4} v4.4 M${x + 4.5} ${y - 4.4} v4.4`} stroke="#d6ccbe" strokeWidth="0.8" />
    <path d={`M${x - 3} ${y - 12} l3 1.4 l3 -1.4 v2.8 l-3 -1.4 l-3 1.4 Z`} fill={bow} /><path d={`M${x} ${y - 10.6} l-1.4 4 M${x} ${y - 10.6} l1.4 4`} stroke={bow} strokeWidth="0.6" />
  </g>
);
// 꽃 아치: 나무 기둥에 잎 덩굴 + 장미 송이 (꽃잎 겹)
function FlowerArch({ cx = 160, top = 52, half = 36, t }) {
  const pts = Array.from({ length: 44 }, (_, i) => {
    const q = i / 43;
    if (q < 0.25) return [cx - half, GY - 4 - (q / 0.25) * (GY - 4 - top - half)];
    if (q > 0.75) return [cx + half, GY - 4 - ((1 - q) / 0.25) * (GY - 4 - top - half)];
    const a = Math.PI * ((q - 0.25) / 0.5);
    return [cx - Math.cos(a) * half, top + half - Math.sin(a) * half];
  });
  return (
    <g>
      <path d={`M${cx - half} ${GY} V${top + half} A${half} ${half} 0 0 1 ${cx + half} ${top + half} V${GY}`} stroke="#8a6a4f" strokeWidth="2.4" fill="none" />
      {pts.map(([x, y], i) => <ellipse key={'l' + i} cx={x + (i % 2 ? 3 : -3)} cy={y + wob(t, 2400, 0.4, i)} rx={3.4} ry={1.6} fill={i % 3 ? '#6f9e6a' : '#89b47e'} transform={`rotate(${i * 37} ${x} ${y})`} />)}
      {pts.filter((_, i) => i % 2 === 0).map(([x, y], i) => {
        const cc = ['#f6a5bd', '#ffffff', '#ffd37a', '#f07a98'][i % 4];
        return <g key={'r' + i}><circle cx={x} cy={y} r={3} fill={cc} stroke={dk(cc, 0.25)} strokeWidth="0.35" /><path d={`M${x - 1.4} ${y} a1.4 1.4 0 1 1 2.8 0`} stroke={dk(cc, 0.2)} strokeWidth="0.4" fill="none" /><circle cx={x} cy={y} r={0.8} fill={dk(cc, 0.15)} /></g>;
      })}
      {[-1, 1].map((sd) => <g key={sd}>{[0, 1, 2].map((i) => <circle key={i} cx={cx + sd * half + sd * (i - 1) * 3} cy={GY - 3} r={3} fill={['#f6a5bd', '#ffffff', '#ffd37a'][i]} stroke="#c8a8a8" strokeWidth="0.3" />)}</g>)}
    </g>
  );
}
// 아기 침대: 둥근 머리 · 살 · 매트 · 작은 이불 · 곰 인형 + 별 모빌
const Crib = ({ x, t }) => (
  <g>
    <ellipse cx={x} cy={GY + 0.8} rx={28} ry={2.4} fill="#1a1424" opacity="0.15" />
    <g transform={`rotate(${wob(t, 2600, 7)} ${x} ${GY - 76})`}>
      <path d={`M${x} ${GY - 92} V${GY - 76} M${x - 12} ${GY - 76} H${x + 12}`} stroke="#b89a7c" strokeWidth="0.8" />
      {[-12, -4, 4, 12].map((d, i) => <g key={d}><path d={`M${x + d} ${GY - 76} v${5 + (i % 2) * 3}`} stroke="#b89a7c" strokeWidth="0.4" />{i % 2 ? <circle cx={x + d} cy={GY - 69 + (i % 2) * 3} r={2.2} fill={['#9fc7e0', '#ffd37a'][i % 2]} /> : <path d={`M${x + d} ${GY - 73.5} l1 2 l2.2 0.3 l-1.6 1.5 l0.4 2.2 l-2 -1 l-2 1 l0.4 -2.2 l-1.6 -1.5 l2.2 -0.3 Z`} fill="#ffd37a" />}</g>)}
    </g>
    <path d={`M${x - 26} ${GY - 4} V${GY - 34} Q${x - 26} ${GY - 40} ${x - 20} ${GY - 40} Q${x - 14} ${GY - 40} ${x - 14} ${GY - 34}`} fill="none" stroke="#f2e6d6" strokeWidth="3" />
    <rect x={x - 27} y={GY - 34} width={3} height={34} fill="#f2e6d6" /><rect x={x + 24} y={GY - 30} width={3} height={30} fill="#f2e6d6" />
    <rect x={x - 25} y={GY - 32} width={50} height={2.4} fill="#fdf8f0" stroke="#d6ccbe" strokeWidth="0.4" />
    <rect x={x - 25} y={GY - 14} width={50} height={6} fill="#ffffff" /><path d={`M${x - 10} ${GY - 15} q8 -5 18 -1 v2 h-18 Z`} fill="#f6c6d6" /><path d={`M${x - 8} ${GY - 15.5} h14`} stroke="#ffffff" strokeWidth="0.6" strokeDasharray="1 1" />
    <g transform={`translate(${x + 14} ${GY - 18})`}><circle cx={0} cy={0} r={3} fill="#c9905e" /><circle cx={-2.2} cy={-2.4} r={1.2} fill="#c9905e" /><circle cx={2.2} cy={-2.4} r={1.2} fill="#c9905e" /><circle cx={0} cy={0.8} r={1.2} fill="#e8c09a" /><rect x={-1.2} y={-1} width={0.6} height={0.6} fill={OUT} /><rect x={0.6} y={-1} width={0.6} height={0.6} fill={OUT} /></g>
    {Array.from({ length: 9 }, (_, i) => <rect key={i} x={x - 22 + i * 5.4} y={GY - 30} width={1.6} height={22} rx={0.6} fill="#f6ecdf" stroke="#d6ccbe" strokeWidth="0.3" />)}
    <rect x={x - 27} y={GY - 8} width={54} height={3} fill="#e6d6c0" /><rect x={x - 26} y={GY - 5} width={2.4} height={5} fill="#d6c6b0" /><rect x={x + 23.6} y={GY - 5} width={2.4} height={5} fill="#d6c6b0" />
  </g>
);
// 묘비: 둥근 돌 · 새긴 글 · 받침 · 이끼 · 작은 화병
const Grave = ({ x, s = 1, far, flowers }) => (
  <g transform={`translate(${x} ${GY}) scale(${s})`} opacity={far ? 0.55 : 1}>
    <ellipse cx={0} cy={0.6} rx={18} ry={2.2} fill="#1a1424" opacity="0.15" />
    <rect x={-17} y={-4} width={34} height={4} fill="#a6abb4" /><rect x={-17} y={-4} width={34} height={0.8} fill="#c6cad2" />
    <path d="M-12 -4 V-30 Q-12 -40 0 -40 Q12 -40 12 -30 V-4 Z" fill="#d6d9e0" />
    <path d="M-12 -4 V-30 Q-12 -40 0 -40" stroke="#eef0f4" strokeWidth="1" fill="none" />
    <path d="M12 -30 V-4" stroke="#b4b8c2" strokeWidth="1.6" />
    <path d="M0 -34 v8 M-3.4 -31 h6.8" stroke="#9aa0aa" strokeWidth="0.9" />
    {[0, 1, 2].map((i) => <rect key={i} x={-7} y={-22 + i * 4} width={14 - i * 3} height={0.8} fill="#a6abb4" />)}
    <path d="M-12 -8 q3 -1 5 1 q-3 1 -5 0 Z M8 -5 q3 -2 4 0 Z" fill="#8fa88a" opacity="0.8" />
    {flowers && <g><rect x={-15} y={-10} width={4} height={6} fill="#a6abb4" />{[[-15, -13, '#ffffff'], [-13, -15, '#ffd37a'], [-11, -13, '#ffffff'], [-13, -12, '#f6e6a8']].map(([a, b, cc], i) => <circle key={i} cx={a} cy={b} r={1.6} fill={cc} stroke="#b8a888" strokeWidth="0.3" />)}</g>}
  </g>
);

// 영정 사진: 나무 액자(금테) 안에 가슴 위 반신 · 부드러운 사진 바탕 · 바랜 색 · 위 두 모서리 검은 리본
function Portrait({ x, y, look, w = 30, h = 38 }) {
  const u = useU();
  const L = x - w / 2;
  return (
    <g>
      <defs>
        <clipPath id={u + 'pt'}><rect x={L + 3} y={y + 3} width={w - 6} height={h - 6} /></clipPath>
        <radialGradient id={u + 'pbg'} cx="0.5" cy="0.35" r="0.8"><stop offset="0" stopColor="#e9e4d8" /><stop offset="1" stopColor="#a8a296" /></radialGradient>
        <filter id={u + 'pf'}><feColorMatrix type="saturate" values="0.35" /></filter>
      </defs>
      <rect x={L - 1.2} y={y - 1.2} width={w + 2.4} height={h + 2.4} fill="#1a1424" opacity="0.35" />
      <rect x={L} y={y} width={w} height={h} fill="#2a2228" />
      <rect x={L + 1.2} y={y + 1.2} width={w - 2.4} height={h - 2.4} fill="none" stroke="#c9a85a" strokeWidth="0.8" />
      <g clipPath={`url(#${u}pt)`}>
        <rect x={L + 3} y={y + 3} width={w - 6} height={h - 6} fill={`url(#${u}pbg)`} />
        {/* 머리부터 어깨까지 (아래는 액자에 잘림) */}
        <g filter={`url(#${u}pf)`} transform={`translate(${x - 12.5 * 1.15} ${y + 5}) scale(1.15)`}><Figure look={look} /></g>
        <rect x={L + 3} y={y + 3} width={w - 6} height={h - 6} fill="#f6e6c8" opacity="0.12" />
      </g>
      {/* 검은 리본: 위 두 모서리를 비스듬히 + 매듭 */}
      {[-1, 1].map((sd) => (
        <g key={sd}>
          <path d={`M${x + sd * (w / 2 + 1)} ${y + 9} L${x + sd * (w / 2 - 9)} ${y - 1} L${x + sd * (w / 2 - 5)} ${y - 1} L${x + sd * (w / 2 + 1)} ${y + 5} Z`} fill="#141016" />
        </g>
      ))}
      <g transform={`translate(${x} ${y - 1.4})`}><path d="M0 0 l-6 -3 v6 Z M0 0 l6 -3 v6 Z" fill="#141016" /><rect x={-1.4} y={-1.6} width={2.8} height={3.2} rx={0.8} fill="#141016" /><path d="M-1 1.4 l-2.4 5 M1 1.4 l2.4 5" stroke="#141016" strokeWidth="1.4" /></g>
    </g>
  );
}
// 책장: 책 (색 · 기울기 다르게) · 작은 화분 · 사진
const Shelf = ({ x, y, t = 0 }) => {
  const books = ['#c9544a', '#5b86c9', '#e6c35c', '#4a9a7a', '#9b6fd0', '#d98c62', '#6a7a8a'];
  return (
    <g>
      <rect x={x - 1} y={y + 1} width={44} height={60} fill="#1a1424" opacity="0.12" />
      <rect x={x - 2} y={y - 2} width={44} height={62} fill="#8a6244" />
      {[0, 1, 2].map((r) => <g key={r}><rect x={x} y={y + r * 20} width={40} height={18} fill="#5a3e2c" /><rect x={x} y={y + r * 20 + 18} width={40} height={2} fill="#a87a58" /></g>)}
      {[0, 1].map((r) => books.slice(r * 2, r * 2 + 6).map((cc, i) => <rect key={r + '-' + i} x={x + 2 + i * 5.4 + (r ? 3 : 0)} y={y + r * 20 + 4 + (i % 3)} width={4.4} height={14 - (i % 3)} fill={cc} stroke={dk(cc, 0.3)} strokeWidth="0.3" />))}
      <g transform={`rotate(-14 ${x + 34} ${y + 18})`}><rect x={x + 32} y={y + 5} width={4} height={13} fill="#e6c35c" /></g>
      <Plant x={x + 10} y={y + 58} t={t} s={0.6} />
      <Frame x={x + 22} y={y + 44} w={12} h={14} kind={1} />
    </g>
  );
};

// ───────── 장면들 ─────────
// 각 장면: (v, c, k, t, mode) → { sky, back, mid, front, night }
//   t = 장면 시작부터 ms. 처음 0.6초는 앞 장면과 겹쳐 지나가므로 중요한 움직임은 0.8초 뒤부터
const SCENES = {
  // 태어남: 엄마가 침대에서 진통 → 아기 울음 → 아빠가 뛰어 들어옴
  born(v, c, k, t) {
    const mom = k.mom || gen(2, { gender: 'F', age: 28 });
    const dad = k.dad;
    const hosp = v.urban;
    const born = t > 1500;
    const dadIn = seg(t, 2100, 3300);
    const baby = { gender: v.gender, age: 0 };
    return {
      back: (
        <>
          <Room wall={hosp ? '#e6f0ee' : '#f6ebde'} floor={hosp ? '#cfdad7' : '#d6bf9e'} paper={hosp ? 'stripe' : 'flower'} win={[[34, 30]]} skyCol={hexes(c.sky)} frames={hosp ? [] : [110, 128]} clock={[hosp ? 120 : 160, 40]} t={t} plant={hosp ? null : 92} />
          {hosp && <Curtain x1={234} x2={262} />}
          {hosp && <Drip x={88} t={t} />}
          <Door x={290} open={dadIn > 0 ? 0.85 : 0} c={hosp ? '#c7d3d8' : '#8a6a4f'} h={52} w={26} inside={hosp ? '#9fb2b8' : '#4a3a30'} />
        </>
      ),
      mid: (
        <>
          <Bed x={140} w={70} hosp={hosp} />
          {!hosp && <Stand x={92} t={t} items={['cup']} />}
          {/* 엄마: 진통 (땀 · 몸 떨림) → 아기를 품에 */}
          <Actor p={mom} x={lieAt(140).x} y={lieAt(140).y + (born ? 0 : wob(t, 180, 0.5))} lie t={t} bubble={born ? 'heart' : t > 300 ? 'sweat' : null} bubS={born ? pop(t, 2300) : 1} />
          <Cover x={140} w={70} col={hosp ? '#cfe3f0' : '#f2b8a8'} pat={hosp ? 'plain' : 'flower'} breath={born ? 0.5 + 0.5 * Math.sin(t / 500) : 0.5 + 0.5 * Math.sin(t / 160)} />
          {/* 받아 주는 사람 (병원이면 의사, 집이면 산파 할머니) */}
          <Actor p={hosp ? { gender: 'F', age: 40 } : { gender: 'F', age: 64 }} look={hosp ? { ...lookOf({ gender: 'F', age: 40, soft: true }), top: { style: 'tee', color: '#e9f3f7' } } : undefined}
            x={190} t={t} arm={born && t < 2100 ? 'hold' : t < 1500 ? 'up' : null} bubble={t > 700 && !born ? 'bang' : null} />
          {born && t < 2100 && <Bundle x={190} y={GY - 15} t={t} col={v.gender === 'M' ? '#9fc7e0' : '#f6a5bd'} />}
          {born && t >= 2100 && <Bundle t={t} x={lerp(190, 140, ez(seg(t, 2100, 2600)))} y={lerp(GY - 15, GY - 28, ez(seg(t, 2100, 2600)))} col={v.gender === 'M' ? '#9fc7e0' : '#f6a5bd'} />}
          {/* 아기 울음 · 반짝 */}
          {born && t < 3600 && <text x={lerp(176, 150, ez(seg(t, 2100, 2600)))} y={GY - 38 - seg(t, 1500, 3600) * 6} fontSize="6.5" fontWeight="800" fill="#f05a7e" opacity={1 - seg(t, 3100, 3600)}>응애!</text>}
          {born && <g opacity={1 - seg(t, 1500, 2300)}>{Array.from({ length: 12 }, (_, i) => <rect key={i} x={190 + Math.cos(i * 0.52) * 22 * seg(t, 1500, 2300)} y={GY - 18 + Math.sin(i * 0.52) * 16 * seg(t, 1500, 2300)} width="2" height="2" fill="#ffd37a" />)}</g>}
          {dad && <Actor p={dad} x={lerp(296, 206, ez(dadIn))} t={t} step={dadIn > 0 && dadIn < 1} arm={dadIn >= 1 ? 'cheer' : null} op={dadIn > 0 ? 1 : 0} bubble={dadIn >= 1 ? (t < 3800 ? 'bang' : 'heart') : null} bubS={pop(t, 3300)} />}
          {k.sib.slice(0, 2).map((s, i) => <Actor key={s.id} p={s} x={lerp(300, 226 + i * 14, ez(seg(t, 2800 + i * 300, 3800 + i * 300)))} t={t} step={t > 2800 && t < 3800 + i * 300} op={seg(t, 2800 + i * 300, 2900 + i * 300)} />)}
          {born && [0, 1, 2].map((i) => <FloatHeart key={i} x={136 + i * 6} y={GY - 42} t={t} a={2700 + i * 700} />)}
        </>
      ),
    };
  },

  // 학교 입학: 가방 메고 쪼르르 걸어가 교문 안으로 쏙 · 엄마(아빠)는 손 흔듦
  school(v, c, k, t, mode) {
    const adult = v.age >= 18;
    const kid = adult ? (k.kids.filter((m) => m.age >= 5 && m.age <= 9)[0] || k.kids[0] || gen(8, { age: 7 })) : { ...k.me, me: true };
    const par = adult ? [k.me, k.pt].filter(Boolean) : k.par.slice(0, 1);
    const go = seg(t, 1100, 4200);
    const kx = lerp(120, 205, ez(go));
    const ky = lerp(GY, GY - 18, ez(go));
    const ks = sizeOf(kid.age) * lerp(1, 0.72, ez(go));
    const inDoor = seg(t, 3900, 4500);
    const night = mode === 'dark';
    const bagCol = ['#e8584c', '#f2b22e', '#5b86c9', '#4a9a7a'][(v.year || 0) % 4];
    return {
      sky: <><Sky c={c} night={night} t={t} /><Clouds t={t} /></>,
      back: <><Hills c={c} y={104} night={night} /><City c={c} y={110} night={night} seed={'s' + v.countryCode} /></>,
      mid: (
        <>
          <Ground c={c} night={night} />
          {/* 학교 건물 */}
          <rect x={152} y={56} width={110} height={68} fill={lt(c.wall, 0.1)} />
          <Bricks x={152} y={56} w={110} h={68} c={lt(c.wall, 0.1)} />
          <rect x={152} y={56} width={4} height={68} fill={dk(c.wall, 0.06)} /><rect x={258} y={56} width={4} height={68} fill={dk(c.wall, 0.06)} />
          <rect x={150} y={88} width={114} height={2} fill={dk(c.wall, 0.1)} />
          <Roof x1={152} x2={262} y={56} peak={34} c={c.roofC} />
          <circle cx={207} cy={47} r={6} fill="#fffaf0" stroke={OUT} strokeWidth="0.6" />
          {Array.from({ length: 12 }, (_, i) => <rect key={i} x={206.7 + Math.sin(i * 0.5236) * 4.6} y={46.7 - Math.cos(i * 0.5236) * 4.6} width={0.6} height={0.6} fill={OUT} />)}
          <path d={`M207 47 L${207 + Math.sin(t / 2000) * 2.6} ${47 - Math.cos(t / 2000) * 2.6} M207 47 L${207 + Math.sin(t / 160) * 4} ${47 - Math.cos(t / 160) * 4}`} stroke={OUT} strokeWidth="0.6" />
          {[0, 1, 2, 3].map((i) => <g key={i}><BWin x={160 + i * 26} y={62} w={14} h={11} box={i % 2 === 0} /><BWin x={160 + i * 26} y={94} w={14} h={11} lit={night} /></g>)}
          <rect x={194} y={108} width={26} height={2} fill={dk(c.wall, 0.15)} />
          <Door x={207} y={124} w={20} h={22} c="#8a6a4f" open={seg(t, 600, 1200)} inside="#4a3a30" glass />
          <rect x={193} y={124} width={28} height={2} fill="#c8bcac" /><rect x={190} y={126} width={34} height={2} fill="#b8ac9c" />
          <path d={`M196 122 L170 ${GY} L242 ${GY} L216 122 Z`} fill={c.road} opacity="0.9" />
          {/* 교문 */}
          <rect x={160} y={GY - 34} width={6} height={34} fill="#b8a898" stroke={OUT} strokeWidth="0.5" /><rect x={246} y={GY - 34} width={6} height={34} fill="#b8a898" stroke={OUT} strokeWidth="0.5" />
          <rect x={166} y={GY - 35} width={80} height={6} rx={1} fill={c.roofC} /><rect x={166} y={GY - 35} width={80} height={1} fill={lt(c.roofC, 0.3)} /><text x={206} y={GY - 30.6} fontSize="3.8" textAnchor="middle" fill="#ffffff" fontWeight="700">입학을 축하합니다</text>{[164, 248].map((x) => <g key={x}>{[0, 1, 2].map((i) => <circle key={i} cx={x + (i - 1) * 2.4} cy={GY - 37} r={1.6} fill={['#f05a7e', '#ffd37a', '#ffffff'][i]} />)}</g>)}<Bush x={150} c={c} /><Bush x={262} c={c} s={0.9} />
          <rect x={268} y={62} width={1.2} height={78} fill={OUT} /><path d={`M269 62 h14 l-3 4 l3 4 h-14 Z`} fill="#f26b38" transform={`skewY(${wob(t, 1200, 4)})`} style={{ transformOrigin: '269px 62px' }} />
          <Tree x={128} c={c} s={1.1} night={night} /><Tree x={290} c={c} night={night} />
          {/* 다른 아이들도 들어감 */}
          {[0, 1].map((i) => {
            const q = seg(t, 300 + i * 900, 3000 + i * 900);
            return <Actor key={i} p={gen(4 + i * 4, { age: 7 })} x={lerp(240 + i * 30, 210, ez(q))} y={lerp(GY, GY - 18, ez(q))} s={0.8 * lerp(1, 0.72, ez(q))} t={t} step={q > 0 && q < 1} bag={['#9b6fd0', '#4a9a7a'][i]} op={1 - seg(t, 2700 + i * 900, 3200 + i * 900)} />;
          })}
          {/* 나 (또는 우리 아이) */}
          <Actor p={kid} x={kx} y={ky} s={ks} t={t} step={go > 0 && go < 1} bag={bagCol} op={1 - inDoor} costume={kid.me ? v.costume : undefined}
            arm={go <= 0 ? 'wave' : null} bubble={go > 0.2 && go < 0.7 ? 'note' : null} bubS={0.8} />
          {par.map((p, i) => <Actor key={p.id || i} p={p} x={96 - i * 18} t={t} arm={t > 900 ? 'wave' : null} costume={p.me ? v.costume : undefined} bubble={inDoor >= 1 && i === 0 ? 'heart' : null} bubS={pop(t, 4600)} />)}
        </>
      ),
      front: <Petals t={t} n={10} col={c.leaf} />,
      night,
    };
  },

  // 졸업: 학사모 던지기 · 가족은 박수와 꽃다발
  grad(v, c, k, t, mode) {
    const uni = v.arg === 'uni';
    const fam = [...k.par, ...(k.pt ? [k.pt] : [])].slice(0, 3);
    const toss = seg(t, 2000, 3400);
    const capY = (i) => (toss <= 0 ? 0 : -Math.sin(Math.PI * toss) * (46 + i * 6));
    const night = mode === 'dark';
    const gown = (p, me) => ({ ...(me ? lookOf({ gender: p.gender, age: p.age, costume: v.costume }) : lookOf({ gender: p.gender, age: p.age, soft: true })), top: { style: 'suit', color: '#24304f' } });
    const mates = [gen(2, { age: v.age }), gen(1, { age: v.age }), gen(6, { age: v.age }), gen(5, { age: v.age })];
    const xs = [70, 100, 160, 220, 250];
    return {
      sky: <><Sky c={c} night={night} t={t} /><Clouds t={t} n={5} /></>,
      back: (
        <>
          <Hills c={c} night={night} />
          {uni ? (
            <g>
              <rect x={100} y={72} width={120} height={50} fill={dk(c.wall, 0.12)} />
              <path d="M96 66 L160 40 L224 66 Z" fill={lt(c.wall, 0.1)} /><path d="M112 63 L160 46 L208 63 Z" fill={dk(c.wall, 0.06)} /><circle cx={160} cy={57} r={4} fill="none" stroke={dk(c.wall, 0.25)} strokeWidth="0.8" />
              <rect x={98} y={66} width={124} height={6} fill={lt(c.wall, 0.15)} /><rect x={98} y={70.5} width={124} height={1.5} fill={dk(c.wall, 0.15)} />
              {Array.from({ length: 7 }, (_, i) => <g key={i}><rect x={104 + i * 17} y={72} width={7} height={48} fill={lt(c.wall, 0.12)} /><rect x={104 + i * 17} y={72} width={2} height={48} fill="#ffffff" opacity="0.4" /><rect x={109 + i * 17} y={72} width={2} height={48} fill={dk(c.wall, 0.15)} /><rect x={103 + i * 17} y={72} width={9} height={2} fill={lt(c.wall, 0.2)} /></g>)}
              {[0, 1, 2].map((i) => <rect key={i} x={94 - i * 3} y={120 + i * 2} width={132 + i * 6} height={2} fill={dk(c.wall, 0.04 * i)} />)}
            </g>
          ) : (
            <g><rect x={100} y={64} width={120} height={58} fill={c.wall} stroke={OUT} strokeWidth="0.5" /><path d="M94 64 L160 46 L226 64 Z" fill={c.roofC} />{[0, 1, 2, 3, 4].map((i) => <rect key={i} x={108 + i * 21} y={76} width={11} height={10} fill="#cfe3f0" />)}</g>
          )}
        </>
      ),
      mid: (
        <>
          <Ground c={c} night={night} />
          <rect x={60} y={GY - 54} width={200} height={7} fill={c.roofC} /><text x={160} y={GY - 49} fontSize="4.4" textAnchor="middle" fill="#fff" fontWeight="700">졸업을 축하합니다</text>
          <Tree x={30} c={c} night={night} /><Tree x={292} c={c} night={night} />
          {mates.map((p, i) => <Actor key={i} p={p} x={xs[i < 2 ? i : i + 1]} y={GY - 4} t={t + i * 90} look={gown(p)} cap={toss <= 0 || toss >= 1} arm={toss > 0 && toss < 0.5 ? 'up' : t > 3400 ? 'cheer' : null} />)}
          <Actor p={k.me} x={160} y={GY - 4} t={t} look={gown(k.me, true)} cap={toss <= 0 || toss >= 1} arm={toss > 0 && toss < 0.5 ? 'up' : t > 3400 ? 'cheer' : null} bubble={t > 3600 ? 'star' : null} bubS={pop(t, 3600)} />
          {/* 던진 학사모 */}
          {toss > 0 && toss < 1 && [70, 100, 160, 220, 250].map((x, i) => (
            <g key={i} transform={`translate(${x + (i - 2) * 6 * toss} ${GY - 44 + capY(i)}) rotate(${toss * 360 * (i % 2 ? 1 : -1)})`}>
              <path d="M-6 0 L0 -2.4 L6 0 L0 2.4 Z" fill="#24304f" stroke={OUT} strokeWidth="0.4" /><path d="M3 0 v4" stroke="#f2c230" strokeWidth="0.6" />
            </g>
          ))}
        </>
      ),
      front: (
        <>
          {fam.map((p, i) => <Actor key={p.id} p={p} x={[48, 262, 282][i]} y={GY + 16} s={sizeOf(p.age) * 1.15} t={t + i * 120} arm={t > 1000 ? 'clap' : null} flower={i === 0} bubble={t > 3500 && i === 0 ? 'heart' : null} bubS={pop(t, 3500)} />)}
          <Confetti t={t} a={3200} n={30} />
        </>
      ),
      night,
    };
  },

  // 만남 · 청혼: 양쪽에서 걸어와 마주 섬 → 하트 → 손잡고 나란히
  date(v, c, k, t, mode) {
    const pt = k.pt || other(k.me);
    const meet = seg(t, 600, 2600);
    const night = mode === 'dark';
    const prop = /청혼/.test(v.text || '');
    return {
      sky: <><Sky c={c} night={night} t={t} /><Clouds t={t} n={3} o={0.5} /></>,
      back: <Hills c={c} night={night} y={110} />,
      mid: (
        <>
          <Ground c={c} night={night} />
          <rect x={-200} y={GY + 8} width={720} height={12} fill={night ? '#252d4c' : c.road} opacity="0.7" />
          <Tree x={70} c={c} s={1.25} night={night} /><Tree x={262} c={c} s={1.1} night={night} />
          {/* 벤치 · 가로등 */}
          <ParkBench x={213} />
          <LampPost x={111} night={night} t={t} />
          <Bush x={244} c={c} /><Bush x={90} c={c} s={0.8} />
          <Actor p={k.me} x={lerp(40, 148, ez(meet))} t={t} step={meet > 0 && meet < 1} costume={v.costume} flip={false} bubble={meet >= 1 && t < 4200 ? 'heart' : null} bubS={pop(t, 2700)} />
          <Actor p={pt} x={lerp(290, 170, ez(meet))} t={t} step={meet > 0 && meet < 1} flip flower={prop} />
          {meet >= 1 && [0, 1, 2, 3].map((i) => <FloatHeart key={i} x={159 + (i % 2 ? 4 : -4)} y={GY - 44} t={t} a={3000 + i * 600} />)}
        </>
      ),
      front: <Petals t={t} n={14} col={c.leaf} />,
      night,
    };
  },

  // 결혼식: 꽃 아치 · 하객 박수 → 서로 마주 보고 뽀뽀 → 머리 위 하트 말풍선 · 꽃가루
  wedding(v, c, k, t) {
    const pt = k.pt || other(k.me);
    const bride = k.me.gender === 'F' ? k.me : pt;
    const groom = k.me.gender === 'F' ? pt : k.me;
    const bLook = { ...lookOf({ gender: 'F', age: bride.age, costume: bride.me ? v.costume : undefined, soft: !bride.me }), top: { style: 'dress', color: '#ffffff' } };
    const gLook = { ...lookOf({ gender: 'M', age: groom.age, costume: groom.me ? v.costume : undefined, soft: !groom.me }), top: { style: 'suit', color: '#2f3b5c' } };
    const walk = seg(t, 300, 1700);
    const kiss = seg(t, 2300, 2700);
    const kissed = t > 2300;
    const bx = lerp(204, 168, ez(walk)) - 3.5 * kiss * (t < 3600 ? 1 : 0);
    const gx = lerp(116, 152, ez(walk)) + 3.5 * kiss * (t < 3600 ? 1 : 0);
    const guests = [...k.par, ...k.sib, ...k.kids].slice(0, 6);
    while (guests.length < 6) guests.push(gen(guests.length + 1));
    return {
      sky: <><Sky c={c} t={t} /><Clouds t={t} n={4} o={0.6} /></>,
      back: <><Hills c={c} /><Bunting y={18} t={t} /></>,
      mid: (
        <>
          <Ground c={c} />
          {/* 하얀 길 (꽃잎 흩어짐) */}
          <path d={`M132 ${GY - 2} L188 ${GY - 2} L232 ${GY + 40} L88 ${GY + 40} Z`} fill="#fbf3f4" />
          <path d={`M132 ${GY - 2} L88 ${GY + 40} M188 ${GY - 2} L232 ${GY + 40}`} stroke="#e8cdd4" strokeWidth="1" />
          {Array.from({ length: 22 }, (_, i) => <ellipse key={i} cx={110 + ((i * 37) % 100)} cy={GY + 2 + ((i * 13) % 30)} rx={1.2} ry={0.7} fill={i % 2 ? '#f6a5bd' : '#ffffff'} transform={`rotate(${i * 40} ${110 + ((i * 37) % 100)} ${GY + 2 + ((i * 13) % 30)})`} />)}
          {/* 양옆 하객 의자 줄 */}
          {[78, 96, 224, 242].map((x) => <Chair key={x} x={x} y={GY - 2} />)}
          <FlowerArch cx={160} top={56} half={36} t={t} />
          {[60, 260].map((x) => <Tree key={x} x={x} c={c} s={1.1} />)}
          <Actor p={groom} look={gLook} x={gx} t={t} step={walk > 0 && walk < 1} bob={kissed && t < 3600 ? -1.4 * kiss : 0} />
          <Actor p={bride} look={bLook} x={bx} t={t} step={walk > 0 && walk < 1} flip bob={kissed && t < 3600 ? -1.4 * kiss : 0} veil flower={!kissed} />
          {kissed && <Bubble kind="heart" x={160} y={GY - 42} s={pop(t, 2600) * 1.4} />}
          {kissed && t > 2600 && t < 3500 && <g><Pix rows={ICON.heart} x={157} y={GY - 41} c="#f05a7e" k={0.9} /></g>}
          {kissed && [0, 1, 2, 3, 4].map((i) => <FloatHeart key={i} x={150 + i * 5} y={GY - 50} t={t} a={3000 + i * 400} />)}
        </>
      ),
      front: (
        <>
          {guests.slice(0, 3).map((p, i) => <Actor key={'l' + i} p={p} x={42 + i * 24} y={GY + 18} s={sizeOf(p.age) * 1.12} t={t + i * 70} arm={t > 2400 ? 'clap' : null} bubble={t > 2900 && i === 1 ? 'heart' : null} bubS={pop(t, 2900)} />)}
          {guests.slice(3, 6).map((p, i) => <Actor key={'r' + i} p={p} x={230 + i * 24} y={GY + 18} s={sizeOf(p.age) * 1.12} t={t + i * 90} flip arm={t > 2400 ? 'clap' : null} bubble={t > 3100 && i === 1 ? 'note' : null} bubS={pop(t, 3100)} />)}
          <Confetti t={t} a={2500} n={60} />
        </>
      ),
    };
  },

  // 아이가 태어남: 내가 아기를 안고 → 배우자가 다가와 들여다봄 → 큰아이들 폴짝 · 하트
  newborn(v, c, k, t) {
    const baby = k.kids.find((m) => m.age === 0) || { gender: 'F', age: 0 };
    const kids = k.kids.filter((m) => m.age > 0).slice(0, 3);
    const lean = seg(t, 1200, 1900);
    const cols = { M: '#9fc7e0', F: '#f6a5bd' };
    return {
      back: (
        <>
          <Room wall="#f7efe4" floor="#d9c2a2" paper="dot" win={[[40, 30]]} skyCol={hexes(c.sky)} frames={[100, 120]} clock={[150, 40]} t={t} rug={[140, '#e8b4b8', 76]} plant={292} curtain="#f2c6d0" />
          <Bunting y={12} from={180} to={330} n={9} t={t} />
        </>
      ),
      mid: (
        <>
          {/* 아기 침대 · 모빌 */}
          <Crib x={232} t={t} />
          <Actor p={k.me} x={140} t={t} arm="hold" costume={v.costume} bob={wob(t, 1600, 0.8)} bubble={t > 900 ? 'heart' : null} bubS={pop(t, 900)} />
          <Bundle x={140} y={GY - 15 + wob(t, 1600, 0.8)} t={t} col={cols[baby.gender] || '#f6a5bd'} />
          {k.pt && <Actor p={k.pt} x={lerp(196, 162, ez(seg(t, 500, 1300)))} t={t} step={t > 500 && t < 1300} flip bubble={t > 2200 ? 'heart' : null} bubS={pop(t, 2200)} />}
          {kids.map((m, i) => <Actor key={m.id} p={m} x={[104, 84, 66][i]} t={t + i * 150} bob={t > 1500 ? -Math.abs(wob(t + i * 200, 700, 4)) : 0} arm={t > 1500 ? 'cheer' : null} bubble={t > 2600 && i === 0 ? 'note' : null} bubS={pop(t, 2600)} />)}
          {/* 응애 */}
          {t > 1600 && t < 3400 && <text x={128} y={GY - 32 - seg(t, 1600, 3400) * 8} fontSize="6" fontWeight="800" fill="#f05a7e" opacity={1 - seg(t, 2900, 3400)}>응애~</text>}
          {[0, 1, 2].map((i) => <FloatHeart key={i} x={136 + i * 5} y={GY - 40} t={t} a={2800 + i * 600} />)}
        </>
      ),
    };
  },

  // 병원: 누운 사람 · 삐삐 심장 모니터 · 곁을 지키는 사람
  hosp(v, c, k, t) {
    const who = v.arg === 'kid' ? (k.kids[0] || gen(4)) : v.arg === 'pt' ? (k.pt || other(k.me)) : v.arg === 'par' ? (k.par[0] || gen(7)) : k.me;
    const isMe = who === k.me;
    const vis = (isMe ? [...(v.age < 18 ? k.par : [k.pt, ...k.kids.slice(0, 1)])] : [k.me]).filter(Boolean).slice(0, 2);
    const beat = (t % 1100) / 1100;
    const better = t > 3200;
    return {
      back: (
        <>
          <Room wall="#e6f0ee" floor="#cfdad7" paper="stripe" win={[[38, 30]]} skyCol={hexes(c.sky)} clock={[130, 38]} t={t} curtain="#bcd8d4" />
          <Curtain x1={258} x2={300} />
          {/* 침대 머리 위 의료 가스 판 (산소 · 흡인) · 호출 버튼 · 독서등 */}
          <rect x={98} y={78} width={44} height={10} rx={1.4} fill="#dfe8ee" stroke="#aab4bf" strokeWidth="0.5" />
          {[0, 1, 2].map((i) => <g key={i}><circle cx={106 + i * 12} cy={83} r={2.2} fill={['#5aa06a', '#f2f2f2', '#e8c040'][i]} stroke="#7a8694" strokeWidth="0.4" /><circle cx={106 + i * 12} cy={83} r={0.7} fill="#3a4450" /></g>)}
          <rect x={146} y={80} width={6} height={6} rx={1} fill="#f2f2f2" stroke="#aab4bf" strokeWidth="0.4" /><circle cx={149} cy={83} r={1.6} fill="#e8584c" />
          <path d={`M104 70 h30`} stroke="#c9d2da" strokeWidth="2" /><rect x={112} y={70} width={14} height={2.6} fill="#fff6dc" />
          {/* 세면대 · 손 소독제 */}
          <g><rect x={296} y={100} width={22} height={4} rx={1} fill="#f6f8fa" stroke="#aab4bf" strokeWidth="0.4" /><path d={`M300 104 q7 7 14 0`} fill="#e6ecf0" stroke="#aab4bf" strokeWidth="0.4" /><path d={`M307 100 v-5 h4`} stroke="#9aa6b2" strokeWidth="1" fill="none" /><rect x={300} y={84} width={6} height={9} rx={1} fill="#cfe9f6" stroke="#9aa6b2" strokeWidth="0.4" /></g>
          {/* 심장 모니터: 화면 · 숫자 · 삐 소리 줄 */}
          <rect x={184} y={60} width={40} height={28} rx={2.4} fill="#3a4450" /><rect x={186} y={62} width={36} height={22} rx={1.4} fill="#16202a" />
          <path d={`M187 76 h${5 + beat * 8} l2 -8 l3 13 l2 -6 h${20 - beat * 8}`} stroke="#6ee0a0" strokeWidth="0.9" fill="none" />
          <text x={219} y={68} fontSize="4" fill="#6ee0a0" textAnchor="end" fontWeight="700">{72 + Math.round(wob(t, 3000, 3))}</text>
          <path d={`M188 81 h30`} stroke="#5b86c9" strokeWidth="0.6" strokeDasharray="1.4 1" />
          {beat < 0.12 && <circle cx={220} cy={84} r={1} fill="#e8584c" />}
          <rect x={202} y={88} width={3} height={52} fill="#9aa6b2" /><path d={`M196 ${GY} l7.5 -3 l7.5 3`} stroke="#9aa6b2" strokeWidth="1.2" fill="none" />
        </>
      ),
      mid: (
        <>
          <Drip x={86} t={t} />
          <Bed x={140} w={70} hosp />
          {/* 침대 발치 차트 */}
          <g><rect x={173} y={GY - 26} width={7} height={9} fill="#d6b88f" /><rect x={174} y={GY - 25} width={5} height={7} fill="#ffffff" />{[0, 1, 2].map((i) => <rect key={i} x={174.6} y={GY - 23.6 + i * 2} width={3.8} height={0.5} fill="#9aa6b2" />)}<rect x={175.4} y={GY - 26.6} width={2.4} height={1.4} fill="#8a8a8a" /></g>
          <Stand x={240} t={t} items={['vase', 'cup']} />
          <Actor p={who} x={lieAt(140, 70, GY, sizeOf(who.age)).x} y={lieAt(140, 70, GY, sizeOf(who.age)).y} lie t={t} costume={isMe ? v.costume : undefined} bubble={t > 800 ? (better ? 'sweat' : 'dots') : null} />
          <Cover x={140} w={70} col="#cfe3f0" pat="plain" k={sizeOf(who.age)} breath={0.5 + 0.5 * Math.sin(t / 600)} />
          {vis.map((p, i) => <Actor key={p.id || i} p={p} x={194 + i * 20} t={t} flip costume={p.me ? v.costume : undefined} bubble={i === 0 && t > 1400 ? 'sweat' : null} bow={i === 1 ? 1 : 0} />)}
        </>
      ),
    };
  },

  // 떠나보냄: 묘 앞 · 검은 옷 · 눈물 · 꽃을 내려놓음
  loss(v, c, k, t) {
    const who = (v.arg === 'pt' ? [] : [k.pt]).concat(k.kids.slice(0, 2), k.par, k.sib.slice(0, 1)).filter(Boolean).slice(0, 3);
    const lay = seg(t, 900, 2400);
    const down = t > 2400 && t < 3600;
    return {
      sky: <><Sky c={{ ...c, sky: 'linear-gradient(#7d8594, #c9ccd4)' }} t={t} sun={false} /><Clouds t={t} n={6} c="#e6e8ee" o={0.8} seed="l" /></>,
      back: <Hills c={{ ...c, far: '#8e97a8', near: '#a2aabb' }} />,
      mid: (
        <>
          <Ground c={{ ...c, ground: '#b9bfae' }} />
          {[[40, 0.5], [92, 0.45], [282, 0.5]].map(([x, s2]) => <g key={x} transform={`translate(0 ${-12})`}><Grave x={x} s={s2} far /></g>)}
          {[58, 262].map((x) => <g key={x}><Shadow x={x} w={8} o={0.16} /><path d={`M${x} ${GY} l-7 0 Q${x - 8} ${GY - 30} ${x} ${GY - 52} Q${x + 8} ${GY - 30} ${x + 7} ${GY} Z`} fill="#4f6a58" /><path d={`M${x} ${GY - 50} Q${x + 5} ${GY - 30} ${x + 5} ${GY - 4}`} stroke="#6e8a74" strokeWidth="1.4" fill="none" /></g>)}
          <Grave x={222} flowers={lay >= 1} />
          {lay >= 1 && <g transform={`translate(214 ${GY - 2})`}><path d="M0 0 l12 -1 l-1 2 Z" fill="#5f9a6a" />{['#ffffff', '#ffd37a', '#ffffff', '#f6e6a8', '#ffffff'].map((cc, i) => <g key={i}><circle cx={1 + i * 2.6} cy={-1.6 - (i % 2)} r={1.7} fill={cc} stroke="#b8a888" strokeWidth="0.3" /><circle cx={1 + i * 2.6} cy={-1.6 - (i % 2)} r={0.5} fill="#e8c060" /></g>)}</g>}
          {/* 날아가는 새 두 마리 */}
          {[0, 1].map((i) => { const bx = ((t * 0.02 + i * 30) % 380) - 30; return <path key={'b' + i} d={`M${bx} ${40 + i * 8} q2 ${-2 + wob(t, 400, 1.2, i)} 4 0 q2 ${-2 + wob(t, 400, 1.2, i)} 4 0`} stroke="#5a6070" strokeWidth="0.7" fill="none" />; })}
          <Actor p={k.me} x={lerp(150, 196, ez(lay))} t={t} black step={lay > 0 && lay < 1} flower={lay < 1} cry={t > 1200} bow={down ? 1 : 0} costume={v.costume} />
          {who.map((p, i) => <Actor key={p.id} p={p} x={150 - i * 22} t={t + i * 200} black cry={i === 0 && t > 1800} bow={t > 2600 ? 1 : 0} />)}
        </>
      ),
      front: <Petals t={t} n={8} col="#ffffff" />,
    };
  },

  // 이민: 가방 들고 공항으로 → 비행기가 하늘로
  fly(v, c, k, t, mode) {
    const go = seg(t, 600, 2800);
    const plane = seg(t, 2400, 5600);
    const fam = [k.pt, ...k.kids.slice(0, 2)].filter(Boolean);
    const stay = k.par.slice(0, 2);
    const night = mode === 'dark';
    return {
      sky: <><Sky c={c} night={night} t={t} /><Clouds t={t} n={5} /></>,
      back: (
        <>
          <Hills c={c} night={night} y={118} />
          {plane > 0 && plane < 1 && (
            <g transform={`translate(${lerp(170, 360, plane)} ${lerp(104, 10, plane)}) rotate(-18)`}>
              <rect x={-14} y={-2.5} width={28} height={5} rx={2.5} fill="#ffffff" stroke={OUT} strokeWidth="0.5" />
              <path d="M-2 0 L-8 9 L-4 9 L4 0 Z M-12 -2 L-15 -7 L-11 -7 L-8 -2 Z" fill="#9fc7e0" stroke={OUT} strokeWidth="0.4" />
              {[0, 1, 2, 3].map((i) => <rect key={i} x={-6 + i * 4} y={-1} width={1.6} height={1.2} fill="#5b86c9" />)}
              <path d={`M-14 0 h-${30 * plane}`} stroke="#ffffff" strokeWidth="1.4" opacity="0.6" />
            </g>
          )}
        </>
      ),
      mid: (
        <>
          <Ground c={c} night={night} road />
          {/* 공항 건물 */}
          <rect x={180} y={86} width={130} height={54} fill="#dfe7ee" stroke={OUT} strokeWidth="0.6" />
          <rect x={180} y={86} width={130} height={10} fill="#5b86c9" /><text x={245} y={93.6} fontSize="6" textAnchor="middle" fill="#fff" fontWeight="800">✈ AIRPORT</text>
          {Array.from({ length: 6 }, (_, i) => <rect key={i} x={188 + i * 20} y={102} width={14} height={20} fill="#9fc7e0" stroke={OUT} strokeWidth="0.3" />)}
          <rect x={232} y={118} width={26} height={22} fill="#3a4a5e" />
          <rect x={286} y={60} width={6} height={26} fill="#dfe7ee" stroke={OUT} strokeWidth="0.5" /><rect x={281} y={54} width={16} height={7} fill="#9fc7e0" stroke={OUT} strokeWidth="0.5" />
          {stay.map((p, i) => <Actor key={p.id} p={p} x={60 - i * 18} t={t + i * 100} arm={t > 900 ? 'wave' : null} cry={t > 1600} />)}
          <Actor p={k.me} x={lerp(110, 238, ez(go))} t={t} step={go > 0 && go < 1} suitcase="#e8584c" costume={v.costume} op={1 - seg(t, 2700, 3000)} bubble={go > 0.1 && go < 0.6 ? 'heart' : null} />
          {fam.map((p, i) => <Actor key={p.id} p={p} x={lerp(90 - i * 16, 222 - i * 12, ez(go))} t={t + i * 80} step={go > 0 && go < 1} op={1 - seg(t, 2700, 3000)} suitcase={i === 0 ? '#5b86c9' : null} />)}
        </>
      ),
      night,
    };
  },

  // 피란: 밤 · 연기 · 짐 보따리를 이고 줄지어 걸어감
  flee(v, c, k, t) {
    const people = [k.me, ...[k.pt, ...k.kids, ...k.par].filter(Boolean).slice(0, 3), gen(5), gen(0), gen(8, { age: 9 })];
    const off = (t * 0.012) % 400;
    return {
      sky: <Sky c={c} night t={t} stars={false} />,
      back: (
        <>
          <Hills c={c} night />
          {[60, 140, 230].map((x, i) => <g key={i} opacity="0.5">{[0, 1, 2].map((j) => <circle key={j} cx={x + wob(t + j * 300, 2000, 6)} cy={110 - ((t * 0.01 + j * 18) % 60)} r={10 + j * 4} fill="#6e625a" opacity={0.6 - j * 0.15} />)}</g>)}
          <rect x={-200} y={112} width={720} height={4} fill="#e8584c" opacity="0.25" />
        </>
      ),
      mid: (
        <>
          <Ground c={c} night road />
          {people.map((p, i) => {
            const x = ((i * 44 + off) % 400) - 40;
            return (
              <g key={i}>
                <Actor p={p} x={x} t={t + i * 90} step costume={p.me ? v.costume : undefined} flip={false} bag={i % 2 ? '#8a6a4f' : '#6a5a7a'} bubble={p.me && t > 1500 ? 'sweat' : null} />
                {!p.me && i % 3 === 0 && <rect x={x - 6} y={GY - 44} width={12} height={6} rx={2} fill="#b89a7c" stroke={OUT} strokeWidth="0.5" />}
              </g>
            );
          })}
        </>
      ),
      night: true,
    };
  },

  // 비 오는 날 (일자리를 잃음 · 이혼): 우산 쓰고 홀로 벤치에 · 웅덩이 물결
  rain(v, c, k, t) {
    const sit = seg(t, 600, 1800);
    return {
      sky: <rect x={-200} y={-120} width={720} height={420} fill="#5c6474" />,
      back: <City c={{ ...c, far: '#4a5262' }} night y={120} seed="rain" />,
      mid: (
        <>
          <Ground c={{ ...c, ground: '#3e434e', road: '#353a46' }} road />
          <rect x={-200} y={GY + 2} width={720} height={1} fill="#ffffff" opacity="0.1" />
          {/* 가로등 · 벤치 · 젖은 바닥에 비친 불빛 */}
          <LampPost x={99} night t={t} />
          <rect x={92} y={GY + 3} width={14} height={18} fill="#ffd37a" opacity={0.1 + 0.03 * Math.sin(t / 90)} />
          <ParkBench x={160} />
          <Actor p={k.me} x={lerp(40, 160, ez(sit))} y={GY - (sit >= 1 ? 9 : 0)} t={t} step={sit > 0 && sit < 1} umbrella="#2e3a5a" costume={v.costume} bow={sit >= 1 ? 1 : 0} bubble={t > 2200 ? 'dots' : null} />
          {Array.from({ length: 6 }, (_, i) => {
            const q = ((t + i * 380) % 1600) / 1600;
            return <ellipse key={i} cx={40 + i * 50} cy={GY + 14} rx={2 + q * 9} ry={0.6 + q * 2} fill="none" stroke="#cfe0f0" strokeWidth="0.4" opacity={1 - q} />;
          })}
        </>
      ),
      front: <Rain t={t} />,
      night: true,
    };
  },

  // 큰 소식 (역사 사건): 거실에 모여 TV 뉴스를 봄 · 걱정 말풍선
  news(v, c, k, t) {
    const fam = [k.me, ...k.par, k.pt, ...k.sib.slice(0, 1), ...k.kids.slice(0, 2)].filter(Boolean).slice(0, 5);
    const night = true;
    const flick = 0.85 + 0.15 * Math.abs(Math.sin(t / 90));
    return {
      back: (
        <>
          <Room wall="#e8dccb" floor="#bfa88c" paper="stripe" night={night} win={[[30, 30]]} frames={[100, 118]} clock={[150, 40]} t={t} rug={[110, '#8a5a6a', 90]} plant={290} curtain="#a86a5a" />
          {/* TV 장: 서랍 · 손잡이 / 브라운관 TV: 화면 · 뉴스 앵커 · 자막 띠 · 안테나 */}
          <rect x={200} y={GY - 14} width={66} height={14} fill="#8a6244" /><rect x={200} y={GY - 14} width={66} height={1.4} fill="#a87a58" />
          {[0, 1, 2].map((i) => <g key={i}><rect x={203 + i * 21} y={GY - 11} width={18} height={8} fill="none" stroke="#6a4a34" strokeWidth="0.5" /><rect x={210 + i * 21} y={GY - 7.6} width={4} height={1} fill="#f2c230" /></g>)}
          <path d={`M222 ${GY - 56} l-9 -12 M244 ${GY - 56} l8 -13`} stroke="#3a3440" strokeWidth="0.8" />
          <rect x={202} y={GY - 56} width={62} height={42} rx={4} fill="#3a3440" /><rect x={206} y={GY - 52} width={46} height={33} rx={3} fill="#a8c8e8" opacity={flick} />
          <rect x={255} y={GY - 50} width={6} height={3} fill="#5a5460" /><circle cx={258} cy={GY - 42} r={1.4} fill="#5a5460" /><circle cx={258} cy={GY - 37} r={1.4} fill="#5a5460" />
          <rect x={206} y={GY - 52} width={46} height={10} fill="#6f86a6" opacity={flick} /><rect x={214} y={GY - 45} width={12} height={14} fill="#2f3b5c" /><circle cx={220} cy={GY - 47} r={3.2} fill="#f2c9a0" /><rect x={217} y={GY - 51} width={6} height={2} fill="#3a2c26" />
          <rect x={232} y={GY - 49} width={16} height={10} fill="#e8eef6" opacity={flick} /><path d={`M234 ${GY - 41} l4 -5 l3 3 l5 -6`} stroke="#d0383f" strokeWidth="0.8" fill="none" />
          <rect x={206} y={GY - 27} width={46} height={6} fill="#d0383f" />
          <g><clipPath id={'tv' + v.year}><rect x={206} y={GY - 27} width={46} height={6} /></clipPath><text clipPath={`url(#tv${v.year})`} x={250 - ((t / 18) % 110)} y={GY - 22.6} fontSize="3.8" fill="#fff" fontWeight="700">속보 · {v.year}년 · {v.text || ''}</text></g>
          <path d={`M200 ${GY - 54} L120 ${GY} H${GY + 200} Z`} fill="#a8c8e8" opacity={0.06 * flick} />
        </>
      ),
      mid: (
        <>
          {/* 소파: 등받이 · 팔걸이 · 방석 · 쿠션 · 다리 */}
          <ellipse cx={106} cy={GY + 1} rx={60} ry={2.4} fill="#1a1424" opacity="0.16" />
          <rect x={50} y={GY - 32} width={112} height={18} rx={5} fill="#9a5848" />
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={56 + i * 21} y={GY - 30} width={19} height={14} rx={3} fill="#a8604e" />)}
          <rect x={46} y={GY - 22} width={10} height={20} rx={4} fill="#8a4c40" /><rect x={156} y={GY - 22} width={10} height={20} rx={4} fill="#8a4c40" />
          <rect x={54} y={GY - 14} width={104} height={8} rx={2.4} fill="#b46a56" /><rect x={54} y={GY - 14} width={104} height={1.4} fill="#c98270" />
          <rect x={52} y={GY - 6} width={108} height={4} fill="#7a4036" /><rect x={56} y={GY - 2} width={3} height={2} fill="#4a3428" /><rect x={153} y={GY - 2} width={3} height={2} fill="#4a3428" />
          <rect x={58} y={GY - 26} width={10} height={9} rx={2.4} fill="#f2c94e" transform={`rotate(-12 63 ${GY - 22})`} /><rect x={144} y={GY - 26} width={10} height={9} rx={2.4} fill="#9fc7e0" transform={`rotate(12 149 ${GY - 22})`} />
          {/* 스탠드 */}
          <g><rect x={176} y={GY - 2} width={8} height={2} fill="#3a3440" /><rect x={179.3} y={GY - 44} width={1.4} height={42} fill="#3a3440" /><path d={`M172 ${GY - 44} h16 l-3 -9 h-10 Z`} fill="#f6e6c8" /><circle cx={180} cy={GY - 44} r={18} fill="#ffd890" opacity="0.12" /></g>
          {fam.map((p, i) => <Actor key={p.id || i} p={p} x={70 + i * 20} y={GY - 10} t={t + i * 120} costume={p.me ? v.costume : undefined}
            bubble={i === 0 ? (t > 1300 ? 'bang' : null) : i === 1 && t > 2200 ? 'q' : null} bubS={pop(t, i === 0 ? 1300 : 2200)} />)}
        </>
      ),
      night,
    };
  },

  // 내 집 마련: 새 집 앞 · 상자 나르기 · 열쇠 반짝 · 폴짝
  home(v, c, k, t, mode) {
    const fam = [k.pt, ...k.kids.slice(0, 3)].filter(Boolean);
    const night = mode === 'dark';
    const key = pop(t, 900);
    return {
      sky: <><Sky c={c} night={night} t={t} /><Clouds t={t} /></>,
      back: <><Hills c={c} night={night} /></>,
      mid: (
        <>
          <Ground c={c} night={night} />
          {/* 집: 벽돌 · 기와 · 굴뚝 연기 · 창(화분 상자) · 계단 · 울타리 · 우편함 · 꽃밭 */}
          <rect x={150} y={70} width={110} height={70} fill={lt(c.wall, 0.08)} />
          <Bricks x={150} y={70} w={110} h={70} c={lt(c.wall, 0.08)} />
          <rect x={150} y={70} width={110} height={3} fill="#1a1424" opacity="0.12" />
          <rect x={230} y={36} width={11} height={24} fill="#a8653e" /><rect x={228} y={34} width={15} height={3} fill="#8a4c30" /><Bricks x={230} y={38} w={11} h={22} c="#a8653e" />
          {[0, 1, 2].map((i) => <circle key={i} cx={235 + wob(t + i * 400, 1800, 3)} cy={30 - ((t * 0.01 + i * 10) % 30)} r={3 + i * 1.2} fill="#ffffff" opacity={0.55 - i * 0.14} />)}
          <Roof x1={150} x2={260} y={72} peak={34} c={c.roofC} />
          <circle cx={205} cy={56} r={5} fill="#cfe3f0" stroke="#fdf8f0" strokeWidth="1.4" /><path d="M205 51 v10 M200 56 h10" stroke="#fdf8f0" strokeWidth="0.8" />
          <BWin x={162} y={86} w={22} h={18} box /><BWin x={228} y={86} w={22} h={18} box />
          <Door x={206} y={GY - 4} w={20} h={30} c="#8a5a3b" open={seg(t, 400, 900)} inside="#f6d9a0" glass />
          <rect x={194} y={GY - 4} width={24} height={2} fill="#c8bcac" /><rect x={191} y={GY - 2} width={30} height={2} fill="#b8ac9c" />
          <rect x={196} y={GY - 40} width={20} height={5} fill="#fdf8f0" /><text x={206} y={GY - 36.4} fontSize="3.2" textAnchor="middle" fill={OUT} fontWeight="700">우리 집</text>
          {Array.from({ length: 10 }, (_, i) => <g key={i}><rect x={262 + i * 6} y={GY - 12} width={3} height={12} fill="#fdf8f0" stroke="#d6ccbe" strokeWidth="0.3" /><path d={`M${262 + i * 6} ${GY - 12} l1.5 -2 l1.5 2`} fill="#fdf8f0" /></g>)}
          <rect x={260} y={GY - 9} width={62} height={1.6} fill="#fdf8f0" /><rect x={260} y={GY - 4} width={62} height={1.6} fill="#fdf8f0" />
          <g><rect x={136} y={GY - 22} width={1.6} height={22} fill="#6a5a4a" /><rect x={131} y={GY - 28} width={12} height={7} rx={3} fill="#c9544a" /><rect x={142} y={GY - 28} width={1} height={5} fill="#f2c230" /></g>
          {Array.from({ length: 8 }, (_, i) => <circle key={i} cx={156 + i * 4.6} cy={GY - 1.4} r={1.4} fill={['#f05a7e', '#ffd37a', '#ffffff', '#c9b8f0'][i % 4]} />)}
          <Tree x={110} c={c} night={night} /><Tree x={292} c={c} night={night} s={0.9} />
          {/* 상자 나르는 가족 */}
          {fam.map((p, i) => {
            const q = ((t + i * 900) % 3200) / 3200;
            const x = lerp(40, 196, q);
            return (
              <g key={p.id} opacity={q > 0.92 ? (1 - q) / 0.08 : 1}>
                <Actor p={p} x={x} t={t} step />
                <rect x={x - 6} y={GY - 30 * sizeOf(p.age) - 2} width={12} height={9} fill="#c9a06a" stroke={OUT} strokeWidth="0.5" /><rect x={x - 6} y={GY - 30 * sizeOf(p.age) + 1} width={12} height={1.2} fill="#a07a48" />
              </g>
            );
          })}
          <Actor p={k.me} x={120} t={t} bob={t > 900 ? -Math.abs(wob(t, 600, 4)) : 0} arm={t > 900 ? 'up' : null} costume={v.costume} bubble={t > 1600 ? 'heart' : null} bubS={pop(t, 1600)} />
          {key > 0 && <g transform={`translate(130 ${GY - 52}) scale(${key})`}><circle cx={0} cy={0} r={3} fill="none" stroke="#f2c230" strokeWidth="1.4" /><rect x={2.4} y={-0.7} width={7} height={1.4} fill="#f2c230" /><rect x={7} y={0.6} width={1.4} height={2} fill="#f2c230" />{[0, 1, 2, 3].map((i) => <rect key={i} x={-1 + Math.cos(i * 1.57 + t / 300) * 7} y={-1 + Math.sin(i * 1.57 + t / 300) * 7} width="1.6" height="1.6" fill="#fff4b0" />)}</g>}
        </>
      ),
      night,
    };
  },

  // 상 · 자격증 · 복권: 무대 위로 걸어 올라가 상장을 번쩍 · 객석 박수 · 꽃가루
  award(v, c, k, t) {
    const up = seg(t, 400, 1600);
    const fam = (v.age < 20 ? k.par : [k.pt, ...k.kids]).filter(Boolean).slice(0, 3);
    const crowd = [...fam, gen(0), gen(3), gen(5), gen(9)].slice(0, 6);
    return {
      back: (
        <>
          <rect x={-200} y={-120} width={720} height={420} fill="#2e2a44" />
          {Array.from({ length: 30 }, (_, i) => <circle key={i} cx={(i * 37) % 320} cy={10 + ((i * 13) % 60)} r="1" fill={['#ffd37a', '#f6a5bd', '#9fc7e0'][i % 3]} opacity={0.4 + 0.4 * Math.abs(Math.sin(t / 500 + i))} />)}
          {/* 무대 막: 주름 · 금색 술 · 위 가림막 */}
          {[-1, 1].map((sd) => (
            <g key={sd} transform={sd > 0 ? 'translate(320 0) scale(-1 1)' : undefined}>
              <path d="M-30 -20 H40 Q30 40 46 96 Q20 110 -30 120 Z" fill="#7a2f45" />
              {[0, 8, 16, 24, 32].map((d) => <path key={d} d={`M${-20 + d} -20 Q${-26 + d * 1.3} 50 ${-14 + d * 1.5} 116`} stroke="#5e2235" strokeWidth="1.2" fill="none" />)}
              {[4, 20].map((d) => <path key={'h' + d} d={`M${-16 + d} -20 Q${-20 + d * 1.3} 50 ${-10 + d * 1.5} 116`} stroke="#9a4a60" strokeWidth="0.8" fill="none" />)}
              <path d="M36 92 Q28 98 20 94" stroke="#f2c230" strokeWidth="1.4" fill="none" /><circle cx={38} cy={96} r={2} fill="#f2c230" /><path d="M37 98 l-1 5 M39 98 l1 5" stroke="#f2c230" strokeWidth="0.8" />
            </g>
          ))}
          <path d="M-40 -20 H360 V6 Q340 12 320 6 Q300 12 280 6 Q260 12 240 6 Q220 12 200 6 Q180 12 160 6 Q140 12 120 6 Q100 12 80 6 Q60 12 40 6 Q20 12 0 6 Q-20 12 -40 6 Z" fill="#8a3650" />
          <path d="M-40 4 H360" stroke="#f2c230" strokeWidth="0.8" />
          {/* 무대 바닥 (나무판) */}
          <rect x={-200} y={108} width={720} height={14} fill="#6a4a3a" />{Array.from({ length: 30 }, (_, i) => <rect key={i} x={-200 + i * 24} y={108} width={0.6} height={14} fill="#4a3428" />)}
          <rect x={-200} y={108} width={720} height={1.5} fill="#ffd37a" opacity="0.8" />
          {/* 마이크 */}
          <path d={`M200 108 v-30 l-4 -4`} stroke="#3a3440" strokeWidth="1" fill="none" /><rect x={194} y={72} width={3} height={4} rx={1.4} fill="#5a5460" /><path d="M196 108 h8" stroke="#3a3440" strokeWidth="1.4" />
          <rect x={-200} y={122} width={720} height={100} fill="#221f33" />
        </>
      ),
      mid: (
        <>
          <path d={`M${lerp(60, 160, ez(up)) - 18} 0 L${lerp(60, 160, ez(up)) + 18} 0 L${lerp(60, 160, ez(up)) + 40} 112 L${lerp(60, 160, ez(up)) - 40} 112 Z`} fill="#fff6df" opacity="0.14" />
          <Actor p={k.me} x={lerp(60, 160, ez(up))} y={112} t={t} step={up > 0 && up < 1} arm={up >= 1 ? 'up' : null} costume={v.costume} bubble={t > 1900 ? 'star' : null} bubS={pop(t, 1900)} />
          {up >= 1 && <g transform={`translate(${160 + 9} ${112 - 47 - Math.abs(wob(t, 800, 1.5))})`}><rect x={-5} y={-4} width={10} height={8} fill="#fff6df" stroke="#c9a040" strokeWidth="0.8" /><circle cx={0} cy={0} r={1.6} fill="#e8584c" /></g>}
          <Confetti t={t} a={1700} n={50} />
        </>
      ),
      front: (
        <>
          {crowd.map((p, i) => (
            <g key={i}>
              <Actor p={p} x={20 + i * 56} y={GY + 34} s={1.2 * sizeOf(p.age)} t={t + i * 60} arm={t > 1700 ? 'clap' : null} bubble={i < fam.length && t > 2300 && i === 0 ? 'heart' : null} bubS={pop(t, 2300)} dim />
            </g>
          ))}
        </>
      ),
      night: true,
    };
  },

  // 자격증: 집에 돌아와 봉투에서 자격증을 꺼내 가족에게 보여 줌 → 박수 → 벽에 액자로 걸고 반짝
  cert(v, c, k, t) {
    const fam = (v.age < 20 ? k.par : [k.pt, ...k.kids, ...k.par]).filter(Boolean).slice(0, 4);
    const show = seg(t, 600, 1200);   // 봉투에서 꺼냄
    const hang = seg(t, 3000, 3800);  // 벽으로 옮겨 걺
    const cx = lerp(150, 214, ez(hang));
    const cy = lerp(GY - 24, 62, ez(hang));
    return {
      back: (
        <>
          <Room wall="#f2e8da" floor="#c9ac88" paper="dot" win={[[30, 30]]} skyCol={hexes(c.sky)} frames={[100, 118]} clock={[250, 40]} t={t} rug={[160, '#a86a5a', 100]} plant={292} />
          <Shelf x={262} y={74} t={t} />
          {/* 걸 자리 (못) */}
          <circle cx={214} cy={56} r={0.8} fill="#6a5a4a" />
        </>
      ),
      mid: (
        <>
          <Actor p={k.me} x={150} t={t} costume={v.costume} arm={hang > 0 && hang < 1 ? 'up' : 'hold'} bubble={t > 1300 && t < 3000 ? 'star' : null} bubS={pop(t, 1300)} />
          {/* 자격증: 상장 종이 · 금박 인장 · 글 줄 → 걸면 나무 액자 */}
          <g transform={`translate(${cx} ${cy}) scale(${lerp(0.4, 1, show)})`} opacity={show}>
            {hang >= 1 && <><rect x={-12} y={-9} width={24} height={18} fill="#8a6244" /><rect x={-11} y={-8} width={22} height={16} fill="#c9a85a" opacity="0.5" /><path d={`M0 -9 l-6 -5 M0 -9 l6 -5`} stroke="#6a5a4a" strokeWidth="0.4" /></>}
            <rect x={-10} y={-7} width={20} height={14} fill="#fffaf0" stroke="#c9a85a" strokeWidth="0.6" />
            <rect x={-8.6} y={-5.6} width={17.2} height={11.2} fill="none" stroke="#e6d3a0" strokeWidth="0.4" />
            <rect x={-5} y={-4.6} width={10} height={1.2} fill="#5a4a3a" />
            {[0, 1, 2].map((i) => <rect key={i} x={-7} y={-2 + i * 2} width={i === 2 ? 8 : 14} height={0.6} fill="#a89a88" />)}
            <circle cx={5.4} cy={3.4} r={2.2} fill="#e0b040" stroke="#b88a20" strokeWidth="0.4" /><path d="M4.4 5.4 l-0.8 2.4 M6.4 5.4 l0.8 2.4" stroke="#c9544a" strokeWidth="0.8" />
          </g>
          {hang >= 1 && [0, 1, 2, 3, 4, 5].map((i) => { const a = i * 1.047 + t / 600; return <rect key={i} x={214 + Math.cos(a) * 16} y={62 + Math.sin(a) * 12} width={1.6} height={1.6} fill="#fff4b0" opacity={0.5 + 0.5 * Math.sin(t / 200 + i)} />; })}
          {fam.map((p, i) => <Actor key={p.id} p={p} x={[108, 86, 190, 64][i]} t={t + i * 120} flip={i === 2} arm={t > 1300 && t < 3000 ? 'clap' : t >= 3800 ? 'cheer' : null}
            bubble={i === 0 && t > 1600 ? (t < 3400 ? 'bang' : 'heart') : null} bubS={pop(t, i === 0 && t >= 3400 ? 3400 : 1600)} />)}
          {t > 1300 && [0, 1, 2].map((i) => <FloatHeart key={i} x={120 + i * 20} y={GY - 44} t={t} a={1500 + i * 500} c="#ffd37a" />)}
        </>
      ),
    };
  },

  // 은퇴: 케이크 촛불 · 현수막 · 동료들 박수 · 손 흔들기
  party(v, c, k, t) {
    const blow = t > 2200;
    const fam = [k.pt, ...k.kids.slice(0, 2)].filter(Boolean);
    const mates = [gen(1, { age: 45 }), gen(6, { age: 38 }), gen(5, { age: 52 })];
    return {
      back: (
        <>
          <Room wall="#f2e6d6" floor="#c9b090" paper="flower" win={[[24, 30], [262, 30]]} skyCol={hexes(c.sky)} clock={[226, 38]} t={t} />
          <Bunting y={22} />
          <rect x={110} y={40} width={100} height={14} fill="#c9544a" /><text x={160} y={49.6} fontSize="6" textAnchor="middle" fill="#fff" fontWeight="800">그동안 수고 많으셨습니다</text>
        </>
      ),
      mid: (
        <>
          <ellipse cx={160} cy={GY + 0.8} rx={30} ry={2.2} fill="#1a1424" opacity="0.15" /><rect x={140} y={GY - 18} width={3} height={18} fill="#8a6a4f" /><rect x={177} y={GY - 18} width={3} height={18} fill="#8a6a4f" /><path d={`M132 ${GY - 22} h56 v8 ${Array.from({ length: 8 }, (_, i) => `q-3.5 3 -7 0`).join(' ')} Z`} fill="#ffffff" stroke="#e0d6c8" strokeWidth="0.5" /><rect x={132} y={GY - 22} width={56} height={1.2} fill="#f6a5bd" />{[[184, '#9fc7e0'], [137, '#ffd37a']].map(([x, cc]) => <g key={x}><rect x={x - 4} y={GY - 29} width={8} height={7} fill={cc} /><rect x={x - 0.6} y={GY - 29} width={1.2} height={7} fill="#f05a7e" /><path d={`M${x} ${GY - 29} q-3 -3 -3 0 M${x} ${GY - 29} q3 -3 3 0`} stroke="#f05a7e" strokeWidth="0.8" fill="none" /></g>)}
          <ellipse cx={160} cy={GY - 22} rx={15} ry={1.6} fill="#e6dccd" /><rect x={147} y={GY - 34} width={26} height={12} rx={2} fill="#fff4e8" stroke="#d6c6b4" strokeWidth="0.5" /><path d={`M147 ${GY - 31} ${Array.from({ length: 6 }, () => 'q2.2 3 4.33 0').join(' ')}`} stroke="#f6a5bd" strokeWidth="1.4" fill="none" />{[150, 156, 164, 170].map((x, i) => <circle key={x} cx={x} cy={GY - 26} r={1} fill={['#f05a7e', '#ffd37a', '#9fc7e0', '#b7e0a0'][i]} />)}
          {[152, 158, 164, 170].map((x, i) => <g key={x}><rect x={x - 0.6} y={GY - 40} width={1.2} height={6} fill={['#9fc7e0', '#f6a5bd', '#ffd37a', '#b7e0a0'][i]} />{!blow && <ellipse cx={x} cy={GY - 42 + wob(t, 200, 0.3, i)} rx={0.9} ry={1.6} fill="#ffb02e" />}{blow && t < 3400 && <circle cx={x + (t - 2200) * 0.01} cy={GY - 44 - (t - 2200) * 0.012} r={1.4} fill="#ccc" opacity={1 - seg(t, 2200, 3400)} />}</g>)}
          <Actor p={k.me} x={120} t={t} costume={v.costume} bow={t > 1600 && t < 2300 ? 1 : 0} arm={t > 2600 ? 'wave' : null} bubble={t > 2700 ? 'heart' : null} bubS={pop(t, 2700)} />
          {fam.map((p, i) => <Actor key={p.id} p={p} x={200 + i * 18} t={t + i * 80} arm={t > 2300 ? 'clap' : null} />)}
          {mates.map((p, i) => <Actor key={i} p={p} x={[86, 64, 254][i]} t={t + i * 120} arm={t > 2300 ? 'clap' : null} flip={i === 2} bubble={i === 0 && t > 3000 ? 'note' : null} bubS={pop(t, 3000)} />)}
          <Confetti t={t} a={2300} n={36} />
        </>
      ),
    };
  },

  // 수감: 창살 · 작은 창으로 드는 빛 · 고개 숙임
  prison(v, c, k, t) {
    return {
      back: (
        <>
          <rect x={-200} y={-120} width={720} height={420} fill="#5a5c66" />
          {Array.from({ length: 12 }, (_, i) => <rect key={i} x={-40 + i * 34} y={-20} width={33} height={14} fill="none" stroke="#4a4c56" strokeWidth="0.6" />)}
          <rect x={220} y={40} width={26} height={18} fill="#a8c8e8" /><path d="M226 40 v18 M233 40 v18 M240 40 v18" stroke="#3a3c46" strokeWidth="1.6" />
          <path d={`M220 58 L246 58 L${210 + wob(t, 6000, 8)} ${GY} L${150 + wob(t, 6000, 8)} ${GY} Z`} fill="#fff6df" opacity="0.12" />
          <rect x={-200} y={GY} width={720} height={200} fill="#43454e" />
        </>
      ),
      mid: (
        <>
          <rect x={80} y={GY - 10} width={40} height={6} fill="#6a6c76" />
          <Actor p={k.me} x={100} y={GY - 6} t={t} costume={v.costume} bow={1} bubble={t > 1800 ? 'dots' : null} />
        </>
      ),
      front: <g>{Array.from({ length: 12 }, (_, i) => <rect key={i} x={-40 + i * 34} y={-40} width={5} height={260} fill="#2a2c34" />)}<rect x={-200} y={30} width={720} height={4} fill="#2a2c34" /></g>,
      night: true,
    };
  },

  // 일터 (일 시작 · 승진): 산업에 맞는 일터 · 걸어 들어오면 동료가 손 흔들며 반김
  work(v, c, k, t, mode) {
    const ind = v.industry || 'SERVICE';
    const walk = seg(t, 400, 2000);
    const mates = (v.extra || [{ gender: 'M', age: 34 }, { gender: 'F', age: 29 }]).map((p, i) => ({ id: 'w' + i, ...p }));
    const night = mode === 'dark';
    const hat = ind === 'INDUSTRY' ? { style: 'hardhat', color: '#f2b22e' } : ind === 'AGRI' ? { style: 'straw', color: '#e2c27a' } : null;
    const dress = (p, me) => {
      const l = lookOf({ gender: p.gender, age: p.age, costume: me ? v.costume : undefined, soft: !me });
      return hat ? { ...l, hat } : ind === 'SERVICE' ? { ...l, top: { ...l.top, style: me ? l.top.style : 'suit' } } : l;
    };
    let place;
    if (ind === 'AGRI') {
      place = (
        <>
          {Array.from({ length: 9 }, (_, i) => <g key={i}>{Array.from({ length: 12 }, (_, j) => <path key={j} d={`M${10 + j * 26 + (i % 2) * 13} ${GY + 2 + i * 4} l2 -${5 + (j % 3)} l2 ${5 + (j % 3)}`} fill={c.leaf} opacity="0.9" />)}</g>)}
          <rect x={236} y={92} width={56} height={48} fill="#b0704a" stroke={OUT} strokeWidth="0.5" /><path d="M230 94 L264 72 L298 94 Z" fill="#8a4a32" /><rect x={256} y={112} width={16} height={28} fill="#5a3a2a" />
        </>
      );
    } else if (ind === 'INDUSTRY') {
      place = (
        <>
          <rect x={150} y={70} width={150} height={70} fill="#9aa3b5" stroke={OUT} strokeWidth="0.6" />
          {[0, 1, 2].map((i) => <path key={i} d={`M${150 + i * 50} 70 l25 -16 l25 16 Z`} fill="#7a8394" stroke={OUT} strokeWidth="0.5" />)}
          <rect x={270} y={30} width={12} height={40} fill="#7a8394" />
          {[0, 1, 2].map((i) => <circle key={i} cx={276 + wob(t + i * 300, 1600, 3)} cy={24 - ((t * 0.012 + i * 9) % 28)} r={4 + i} fill="#d6d8de" opacity={0.6 - i * 0.15} />)}
          <g transform={`rotate(${t / 8} 190 105)`}><circle cx={190} cy={105} r={10} fill="none" stroke="#5a6070" strokeWidth="3" strokeDasharray="4 3" /></g>
          <rect x={212} y={112} width={30} height={28} fill="#5a6070" />
          <rect x={-200} y={GY - 8} width={720} height={4} fill="#4a4c56" />
          {Array.from({ length: 6 }, (_, i) => <rect key={i} x={((i * 40 + t * 0.03) % 360) - 20} y={GY - 14} width={10} height={6} fill="#c9a06a" stroke={OUT} strokeWidth="0.4" />)}
        </>
      );
    } else {
      place = (
        <>
          <rect x={150} y={58} width={140} height={82} fill={c.wall} stroke={OUT} strokeWidth="0.6" />
          <rect x={150} y={58} width={140} height={10} fill={c.roofC} />
          {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={158 + i * 26} y={74} width={18} height={14} fill="#cfe3f0" stroke={OUT} strokeWidth="0.3" />)}
          <rect x={160} y={96} width={70} height={44} fill="#a8c8e8" stroke={OUT} strokeWidth="0.5" opacity="0.85" />
          <Door x={258} w={20} h={30} c="#8a6a4f" open={seg(t, 1500, 2000)} />
          <path d={`M160 96 h70 l-6 -6 h-58 Z`} fill="#e8584c" />
        </>
      );
    }
    return {
      sky: <><Sky c={c} night={night} t={t} /><Clouds t={t} /></>,
      back: <>{ind === 'SERVICE' ? <City c={c} night={night} seed={'w' + v.countryCode} /> : <Hills c={c} night={night} />}</>,
      mid: (
        <>
          <Ground c={c} night={night} road={ind === 'SERVICE'} />
          {place}
          {mates.map((p, i) => <Actor key={p.id} p={p} x={[226, 200][i] ?? 180} t={t + i * 130} look={dress(p)} flip arm={walk > 0.6 ? (i === 0 ? 'wave' : 'clap') : null} bubble={walk >= 1 && i === 0 ? 'bang' : null} bubS={pop(t, 2000)} />)}
          <Actor p={k.me} x={lerp(30, 170, ez(walk))} t={t} step={walk > 0 && walk < 1} look={dress(k.me, true)} arm={walk >= 1 && t > 2300 ? 'wave' : null} bubble={walk >= 1 && t > 2600 ? 'note' : null} bubS={pop(t, 2600)} />
        </>
      ),
      night,
    };
  },

  // 마지막: 
  //   병 · 노환 (보통): 밤 방 · 침대에 누운 나 · 가족이 곁에서 울며 지킴 · 숨이 잦아들고 빛이 떠오름
  //   사고 · 재해 · 폭력 (v.arg === 'sudden'): 침대 없이 - 주인 없는 빈 의자 · 걸려 있는 내 겉옷 · 식탁에 남은 찻잔
  //     가족은 창가에 모여 울고, 촛불 하나 (갑자기 떠난 자리)
  last(v, c, k, t) {
    const fam = [k.pt, ...k.kids, ...k.par].filter(Boolean).slice(0, 5);
    const sudden = v.arg === 'sudden';
    const meLook = lookOf({ gender: v.gender, age: v.age, costume: v.costume });
    if (sudden) {
      return {
        back: (
          <>
            <Room wall="#e8dcc8" floor="#b89a78" paper="stripe" night win={[[150, 30]]} frames={[60, 78]} clock={[236, 40]} t={t} rug={[110, '#5a5a7a', 96]} />
            {/* 옷걸이에 걸린 내 겉옷 · 모자 */}
            <g>
              <rect x={40} y={GY - 66} width={2} height={66} fill="#6a4a34" /><path d={`M34 ${GY} l7 -4 l7 4`} stroke="#6a4a34" strokeWidth="1.4" fill="none" />
              <path d={`M36 ${GY - 64} h12`} stroke="#6a4a34" strokeWidth="1.2" />
              <path d={`M38 ${GY - 62} q3 -2 6 0 l3 26 h-12 Z`} fill={meLook.top.color} stroke={dk(meLook.top.color, 0.3)} strokeWidth="0.5" />
              <path d={`M41 ${GY - 60} v20`} stroke={dk(meLook.top.color, 0.25)} strokeWidth="0.5" />
              <ellipse cx={46} cy={GY - 66} rx={6} ry={2.2} fill="#5a4a3a" /><rect x={43} y={GY - 71} width={6} height={5} rx={1.4} fill="#5a4a3a" />
            </g>
          </>
        ),
        mid: (
          <>
            {/* 식탁 · 남은 찻잔 (김이 더는 나지 않음) · 빈 의자 */}
            <Shadow x={110} w={30} o={0.16} />
            <rect x={84} y={GY - 24} width={52} height={3} fill="#9a7452" /><rect x={84} y={GY - 24} width={52} height={0.8} fill="#c49a74" />
            <rect x={88} y={GY - 21} width={2.4} height={21} fill="#7a5a40" /><rect x={130} y={GY - 21} width={2.4} height={21} fill="#7a5a40" />
            <g><rect x={118} y={GY - 29} width={5} height={5} rx={1} fill="#fffaf0" stroke="#c8beb0" strokeWidth="0.4" /><path d={`M123 ${GY - 28} q2.4 1.4 0 3`} stroke="#c8beb0" strokeWidth="0.6" fill="none" /><ellipse cx={120.5} cy={GY - 24} rx={4.4} ry={0.8} fill="#e6dccd" /></g>
            <g><rect x={96} y={GY - 27} width={10} height={3} fill="#f6e6c8" /><rect x={97} y={GY - 27} width={8} height={0.6} fill="#c8a878" /></g>
            <g opacity="0.95"><rect x={140} y={GY - 36} width={2.4} height={36} fill="#8a6244" /><rect x={140} y={GY - 36} width={14} height={2.4} fill="#8a6244" /><rect x={140} y={GY - 14} width={16} height={3} fill="#9a7452" /><rect x={153} y={GY - 11} width={2.4} height={11} fill="#7a5a40" /><rect x={141} y={GY - 11} width={2.4} height={11} fill="#7a5a40" /><rect x={142} y={GY - 32} width={11} height={14} fill="#a8774e" opacity="0.5" /></g>
            <Stand x={268} t={t} items={['photo', 'candle']} night />
            {fam.length ? fam.map((p, i) => <Actor key={p.id} p={p} x={180 + i * 17} t={t + i * 230} flip cry={t > 500 + i * 300} bow={i % 2 ? 1 : 0} />)
              : <Actor p={gen(3)} x={196} t={t} flip cry={t > 700} bow={1} />}
          </>
        ),
        night: true,
      };
    }
    return {
      back: (
        <>
          <Room wall="#e8dcc8" floor="#b89a78" paper="flower" night win={[[34, 30]]} frames={[112, 130]} clock={[164, 38]} t={t} rug={[132, '#6a5a8a', 90]} />
          <Shelf x={262} y={60} t={t} />
        </>
      ),
      mid: (
        <>
          <Bed x={130} w={74} />
          <Stand x={82} t={t} items={['photo', 'candle']} night />
          <Actor p={k.me} x={lieAt(130, 74).x} y={lieAt(130, 74).y} lie t={t} costume={v.costume} />
          <Cover x={130} w={74} col="#9a8ec0" pat="flower" breath={t < 3600 ? 0.5 + 0.5 * Math.sin(t / 900) * (1 - seg(t, 2000, 3600)) : 0} />
          {fam.map((p, i) => <Actor key={p.id} p={p} x={196 + i * 18} t={t + i * 230} flip cry={t > 600 + i * 300} bow={t > 3600 ? 1 : 0} />)}
          {/* 숨이 멎고 난 뒤 떠오르는 작은 빛 */}
          {t > 3600 && [0, 1, 2, 3, 4, 5].map((i) => {
            const q = seg(t, 3600 + i * 250, 5600 + i * 250);
            return <rect key={i} x={lieAt(130, 74).x - 30 + wob(t, 1200, 6, i)} y={GY - 22 - q * 70} width="1.6" height="1.6" fill="#fff4b0" opacity={q > 0 && q < 1 ? 1 - q : 0} />;
          })}
        </>
      ),
      night: true,
    };
  },

  // 장례: 영정 · 국화 · 향 연기 · 검은 옷 조문객이 차례로 고개 숙이고 눈물
  funeral(v, c, k, t) {
    const fam = [k.pt, ...k.kids, ...k.sib, ...k.par].filter(Boolean).slice(0, 4);
    const rows = [...fam, gen(3), gen(0), gen(5), gen(9), gen(1), gen(6)].slice(0, 8);
    const meLook = lookOf({ gender: v.gender, age: v.age, costume: v.costume });
    return {
      back: (
        <>
          <rect x={-200} y={-120} width={720} height={420} fill="#34313a" />
          {/* 뒤 하얀 휘장 (주름) */}
          <path d={`M40 -10 H280 V${GY - 30} H40 Z`} fill="#e9e6de" />
          {Array.from({ length: 24 }, (_, i) => <path key={i} d={`M${44 + i * 10} -10 Q${46 + i * 10} 40 ${44 + i * 10} ${GY - 30}`} stroke="#cfcac0" strokeWidth="1.2" fill="none" />)}
          <path d={`M40 -10 Q100 14 160 -2 Q220 14 280 -10 V-20 H40 Z`} fill="#2a2830" /><path d="M40 -10 Q100 14 160 -2 Q220 14 280 -10" stroke="#1a1820" strokeWidth="1.4" fill="none" />
          <rect x={-200} y={GY - 10} width={720} height={200} fill="#2a2830" />
          <rect x={90} y={GY - 10} width={140} height={60} fill="#3a2f36" />{Array.from({ length: 10 }, (_, i) => <rect key={i} x={90} y={GY - 6 + i * 4} width={140} height={0.6} fill="#4a3c44" />)}
          {/* 국화 단: 송이마다 꽃잎 */}
          {Array.from({ length: 5 }, (_, r) => Array.from({ length: 18 - r * 2 }, (_, i) => {
            const fx = 160 + (i - (17 - r * 2) / 2) * 8;
            const fy = 98 - r * 8;
            const yel = (i + r) % 4 === 0;
            return (
              <g key={r + '-' + i}>
                <circle cx={fx} cy={fy} r={4} fill={yel ? '#d8bc68' : '#d6d2c6'} />
                {Array.from({ length: 8 }, (_, q) => <ellipse key={q} cx={fx + Math.cos(q * 0.785) * 2.2} cy={fy + Math.sin(q * 0.785) * 2.2} rx={1.6} ry={0.8} fill={yel ? '#f2dc8a' : '#f7f4ec'} transform={`rotate(${q * 45} ${fx + Math.cos(q * 0.785) * 2.2} ${fy + Math.sin(q * 0.785) * 2.2})`} />)}
                <circle cx={fx} cy={fy} r={1} fill={yel ? '#c8a040' : '#e8e2d0'} />
              </g>
            );
          }))}
          <rect x={56} y={98} width={208} height={20} fill="#4a4652" /><rect x={56} y={98} width={208} height={1.2} fill="#6a6672" />
          {/* 양옆 근조 화환 (받침대 · 둥근 꽃 · 리본) */}
          {[30, 290].map((x) => (
            <g key={x}>
              <path d={`M${x - 8} ${GY - 10} L${x} ${GY - 40} L${x + 8} ${GY - 10}`} stroke="#5a5460" strokeWidth="1.2" fill="none" />
              <circle cx={x} cy={GY - 62} r={16} fill="#e9e6de" />
              {Array.from({ length: 16 }, (_, i) => <circle key={i} cx={x + Math.cos(i * 0.39) * 13} cy={GY - 62 + Math.sin(i * 0.39) * 13} r={3.4} fill={i % 4 ? '#f7f4ec' : '#e8d48a'} stroke="#cfcac0" strokeWidth="0.3" />)}
              <circle cx={x} cy={GY - 62} r={8} fill="#5f7a64" />
              <path d={`M${x - 3} ${GY - 54} l-3 26 h4 Z M${x + 3} ${GY - 54} l3 26 h-4 Z`} fill="#f7f4ec" stroke="#cfcac0" strokeWidth="0.3" />
              <text x={x - 4.6} y={GY - 40} fontSize="3" fill="#2a2830" writingMode="tb">근조</text>
            </g>
          ))}
          <Portrait x={160} y={22} look={meLook} />
          {/* 향 */}
          <rect x={158} y={112} width={4} height={6} fill="#8a6a4f" />
          {[0, 1, 2].map((i) => <path key={i} d={`M${160 + wob(t + i * 500, 2400, 3)} ${110 - i * 12} q4 -6 0 -12`} stroke="#d6d2cc" strokeWidth="0.8" fill="none" opacity={0.5 - i * 0.12} />)}
          {[100, 220].map((x) => <g key={x}><rect x={x - 3} y={110} width={6} height={1.6} fill="#c9a040" /><rect x={x - 1.4} y={100} width={2.8} height={10} fill="#f4ecd0" /><ellipse cx={x} cy={97.6 + wob(t, 260, 0.25)} rx={1.2} ry={2.2} fill="#ffb02e" /><ellipse cx={x} cy={98} rx={0.5} ry={1} fill="#fff4b0" /><circle cx={x} cy={98} r={10} fill="#ffb02e" opacity={0.12 + 0.03 * Math.sin(t / 150)} /></g>)}
        </>
      ),
      mid: (
        <>
          {rows.slice(0, 4).map((p, i) => {
            const bow = Math.max(0, Math.sin(((t - i * 700) / 2600) * Math.PI * 2));
            return <Actor key={'a' + i} p={p} x={row(4, 160, 34)[i]} y={GY + 4} t={t + i * 200} black bow={t > i * 700 ? bow : 0} cry={i < fam.length && t > 800} />;
          })}
        </>
      ),
      front: (
        <>
          {rows.slice(4, 8).map((p, i) => <Actor key={'b' + i} p={p} x={row(4, 160, 50)[i]} y={GY + 34} s={1.25 * sizeOf(p.age)} t={t} black dim cry={t > 1800 && i === 1} />)}
        </>
      ),
      night: true,
    };
  },

  // 그 밖의 해: 동네 길에서 가족과 산책
  village(v, c, k, t, mode) {
    const fam = [...k.par, k.pt, ...k.kids].filter(Boolean).slice(0, 4);
    const night = mode === 'dark';
    const x = lerp(60, 200, ez(seg(t, 300, 6000)));
    return {
      sky: <><Sky c={c} night={night} t={t} /><Clouds t={t} n={5} /></>,
      back: <><Hills c={c} night={night} /><City c={c} night={night} seed={'v' + v.countryCode} y={124} /></>,
      mid: (
        <>
          <Ground c={c} night={night} road />
          <Tree x={40} c={c} night={night} /><Tree x={150} c={c} night={night} s={1.2} /><Tree x={280} c={c} night={night} />
          <Actor p={k.me} x={x} t={t} step costume={v.costume} bubble={t > 2000 ? 'note' : null} bubS={pop(t, 2000)} />
          {fam.map((p, i) => <Actor key={p.id} p={p} x={x - 18 - i * 16} t={t + i * 100} step />)}
        </>
      ),
      night,
    };
  },
};
const ALIAS = { cowork: 'work' };
const useU = () => useContext(IdCtx);

// 겹 (원작 filmLayered: 하늘 0.22 · 먼 배경 0.55 · 가운데 1 · 앞 1)
const DEPTH = { sky: 0.22, back: 0.55, mid: 1, front: 1.18 };
const Z0 = 1.15; // 기본으로 조금 다가가 사람을 크게
function layerTf([cx, cy, z], f) {
  const zz = (1 + (z - 1) * f) * (1 + (Z0 - 1) * Math.min(1, f));
  return `translate(${(cx * f * SW) / 100} ${(cy * f * SH) / 100}) translate(${SW / 2} ${SH * 0.62}) scale(${zz}) translate(${-SW / 2} ${-SH * 0.62})`;
}

function FilmScene({ v, t = 0, cam = [0, 0, 1] }) {
  const mode = useTheme();
  const info = COUNTRIES[v.countryCode] || ['', 'EAST'];
  const c = (THEMES[info[1]] || THEMES.EAST).light; // 필름은 언제나 노을빛 (화면 테마와 무관)
  const fn = SCENES[ALIAS[v.scene] || v.scene] || SCENES.village;
  const L = fn(v, c, castOf(v), t, mode === 'dark' && v.scene === 'village' ? 'dark' : 'light');
  return (
    <svg className="fs2" viewBox={`0 0 ${SW} ${SH}`} preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      {['sky', 'back', 'mid', 'front'].map((n) => (L[n] ? <g key={n} transform={layerTf(cam, DEPTH[n])}>{L[n]}</g> : null))}
    </svg>
  );
}

// 장면마다 그라디언트 · 무늬 id 를 따로 (앞 장면과 겹쳐 지나갈 때 색이 섞이지 않게)
function FilmSceneIds(props) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  return <IdCtx.Provider value={'f' + id}><FilmScene {...props} /></IdCtx.Provider>;
}

export default FilmSceneIds;
