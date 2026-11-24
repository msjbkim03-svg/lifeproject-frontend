// C22 엔딩 크레딧 장면 그림 부품 (FilmScene.jsx 가 씀) - 손으로 그린 그림처럼 디테일을 살린 배경 · 가구 · 자연
// - 방: 벽지 무늬 · 징두리 판 · 걸레받이 · 마루 결 · 커튼 달린 창 · 창으로 드는 빛줄기 · 액자 · 벽시계 · 화분 · 깔개
// - 침대: 나뭇결 머리판 · 매트리스 솔기 · 주름진 베개 · 몸을 따라 부푼 퀼트 이불(무늬 · 주름 · 접힌 홑청)
// - 바깥: 해 둘레 빛 · 볼륨 있는 구름 · 세 겹 언덕(먼 산일수록 흐리게) · 풀 · 들꽃 · 자갈 · 잎이 겹친 나무 · 발밑 그림자
// - 그라디언트 · 무늬 id 는 장면마다 다르게 (앞 장면과 겹쳐 지나가도 색이 섞이지 않게) → IdCtx
import { createContext, useContext } from 'react';

export const GY = 140;
export const OUT = '#2e2a33';
export const IdCtx = createContext('s');
const useU = () => useContext(IdCtx);

export const hexes = (g) => (String(g).match(/#[0-9a-f]{6}/gi) || ['#ffb59a', '#ffeadf']);
export function mix(a, b, k) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const x = p(a);
  const y = p(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * k).toString(16).padStart(2, '0')).join('');
}
export const dk = (c, k = 0.18) => mix(c, '#1a1424', k);
export const lt = (c, k = 0.25) => mix(c, '#ffffff', k);
export function rnd(seed) {
  let s = 0;
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  s = s || 7;
  return () => {
    s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}
const wob = (t, per, amp = 1, ph = 0) => Math.sin(((t / per) + ph) * Math.PI * 2) * amp;
export const NIGHT = { sky: ['#0d1330', '#2a3466'], far: '#1e2850', mid: '#253060', near: '#283463', ground: '#1a2240' };

// 발밑 그림자
export const Shadow = ({ x, y = GY, w = 12, o = 0.2 }) => <ellipse cx={x} cy={y + 0.6} rx={w} ry={w * 0.22} fill="#1a1424" opacity={o} />;

// ───────── 하늘 · 구름 · 언덕 · 땅 ─────────
export function Sky({ c, night, stars, sun = true, t = 0, sunX = 238, sunY = 60 }) {
  const u = useU();
  const top = night ? NIGHT.sky[0] : hexes(c.sky)[0];
  const midC = night ? mix(NIGHT.sky[0], NIGHT.sky[1], 0.5) : hexes(c.sky)[1] || top;
  const bot = night ? NIGHT.sky[1] : hexes(c.sky).slice(-1)[0];
  return (
    <g>
      <defs>
        <linearGradient id={u + 'sky'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={top} /><stop offset="0.55" stopColor={midC} /><stop offset="1" stopColor={bot} />
        </linearGradient>
        <radialGradient id={u + 'glow'}>
          <stop offset="0" stopColor={night ? '#fff6d8' : '#fffbe8'} stopOpacity="0.9" /><stop offset="0.25" stopColor={night ? '#f4ecd0' : '#fff2cf'} stopOpacity="0.45" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect x={-200} y={-120} width={720} height={420} fill={`url(#${u}sky)`} />
      {night && (stars ?? true) && Array.from({ length: 60 }, (_, i) => {
        const tw = 0.3 + 0.5 * Math.abs(Math.sin(i * 1.7 + t / 700));
        const big = i % 9 === 0;
        return <g key={i} opacity={tw}><rect x={(i * 53.3) % 340 - 10} y={(i * 29.7) % 96} width={big ? 1.4 : 0.8} height={big ? 1.4 : 0.8} fill="#ffffff" />{big && <path d={`M${(i * 53.3) % 340 - 9.3} ${(i * 29.7) % 96 - 1.5} v4.4 M${(i * 53.3) % 340 - 11.5} ${(i * 29.7) % 96 + 0.7} h4.4`} stroke="#ffffff" strokeWidth="0.3" opacity="0.6" />}</g>;
      })}
      {(night || sun) && <circle cx={night ? 250 : sunX} cy={night ? 34 : sunY} r={night ? 34 : 46} fill={`url(#${u}glow)`} />}
      {night ? (
        <g><circle cx={250} cy={34} r={10} fill="#f4ecd0" /><circle cx={246} cy={31} r={2} fill="#ddd2b0" /><circle cx={253} cy={37} r={1.4} fill="#ddd2b0" /><circle cx={254} cy={30} r={1} fill="#ddd2b0" /></g>
      ) : sun && <circle cx={sunX} cy={sunY} r={13} fill="#fff6e0" />}
    </g>
  );
}

// 구름: 동그라미 여러 개 + 아래 그늘 + 위 빛
function Cloud({ x, y, w, c = '#ffffff', shade }) {
  const h = w * 0.32;
  return (
    <g>
      <ellipse cx={x + w * 0.5} cy={y + h * 0.75} rx={w * 0.52} ry={h * 0.42} fill={shade} />
      <circle cx={x + w * 0.28} cy={y + h * 0.45} r={h * 0.55} fill={c} />
      <circle cx={x + w * 0.52} cy={y + h * 0.2} r={h * 0.78} fill={c} />
      <circle cx={x + w * 0.76} cy={y + h * 0.48} r={h * 0.5} fill={c} />
      <rect x={x + w * 0.12} y={y + h * 0.45} width={w * 0.78} height={h * 0.45} rx={h * 0.22} fill={c} />
      <ellipse cx={x + w * 0.46} cy={y + h * 0.82} rx={w * 0.36} ry={h * 0.12} fill={shade} opacity="0.7" />
      <circle cx={x + w * 0.45} cy={y + h * 0.02} r={h * 0.3} fill="#ffffff" opacity="0.55" />
    </g>
  );
}
export function Clouds({ t = 0, n = 4, c = '#ffffff', o = 0.85, seed = 'c', shade }) {
  const r = rnd(seed);
  const sh = shade || mix(c, '#b89aa8', 0.35);
  return (
    <g opacity={o}>
      {Array.from({ length: n }, (_, i) => {
        const w = 26 + r() * 30;
        const x = ((r() * 380 + t * (0.003 + r() * 0.003)) % 440) - 60;
        const y = 12 + r() * 36;
        return <Cloud key={i} x={x} y={y} w={w} c={c} shade={sh} />;
      })}
    </g>
  );
}

// 세 겹 언덕: 먼 산은 하늘빛에 가깝게, 가까운 언덕엔 작은 나무 실루엣과 밭 줄무늬
export function Hills({ c, y = 112, night, seed = 'h' }) {
  const r = rnd(seed);
  const sky = night ? NIGHT.sky[1] : hexes(c.sky).slice(-1)[0];
  const far = night ? NIGHT.far : mix(c.far, sky, 0.45);
  const mid = night ? NIGHT.mid : c.far;
  const near = night ? NIGHT.near : c.near;
  return (
    <g>
      <path d={`M-200 ${y - 6} L-150 ${y - 30} L-110 ${y - 18} L-60 ${y - 42} L-10 ${y - 20} L40 ${y - 36} L90 ${y - 14} L150 ${y - 40} L210 ${y - 16} L270 ${y - 34} L330 ${y - 12} L400 ${y - 30} L520 ${y - 8} V300 H-200 Z`} fill={far} />
      <path d={`M-60 ${y - 42} L-48 ${y - 36} L-56 ${y - 34} Z M150 ${y - 40} L162 ${y - 33} L152 ${y - 32} Z M270 ${y - 34} L280 ${y - 29} L272 ${y - 28} Z`} fill={lt(far, 0.35)} />
      <path d={`M-200 ${y} Q-120 ${y - 30} -40 ${y - 6} T120 ${y - 16} T280 ${y - 4} T440 ${y - 22} T560 ${y} V300 H-200 Z`} fill={mid} />
      {Array.from({ length: 16 }, (_, i) => {
        const x = -180 + i * 44 + r() * 20;
        const yy = y - 6 + r() * 8;
        return <g key={i} fill={dk(mid, 0.18)}><rect x={x - 0.6} y={yy - 2} width={1.2} height={4} /><circle cx={x} cy={yy - 4} r={2.6 + r() * 1.4} /></g>;
      })}
      <path d={`M-200 ${y + 14} Q-80 ${y - 6} 40 ${y + 8} T260 ${y + 2} T520 ${y + 10} V300 H-200 Z`} fill={near} />
      {Array.from({ length: 6 }, (_, i) => <path key={i} d={`M${-160 + i * 120} ${y + 14} q40 -6 80 0`} stroke={dk(near, 0.08)} strokeWidth="1.2" fill="none" opacity="0.6" />)}
    </g>
  );
}

// 도시 실루엣: 건물마다 옥상 · 창 줄 · 물탱크
export function City({ c, y = 120, night, seed = 'city' }) {
  const r = rnd(seed);
  const sky = night ? NIGHT.sky[1] : hexes(c.sky).slice(-1)[0];
  const back = night ? '#1c2450' : mix(c.far, sky, 0.35);
  const front = night ? '#252e5a' : mix(c.far, '#ffffff', 0.08);
  const row = (col, off, hk, k) => Array.from({ length: 24 }, (_, i) => {
    const w = 14 + r() * 16;
    const h = (16 + r() * 44) * hk;
    const x = -110 + i * 25 + off;
    const lit = night ? '#ffd37a' : '#ffffff';
    return (
      <g key={k + i}>
        <rect x={x} y={y - h} width={w} height={h + 40} fill={col} />
        <rect x={x} y={y - h} width={w} height={1.4} fill={lt(col, 0.25)} />
        {r() < 0.3 && <rect x={x + w * 0.6} y={y - h - 5} width={4} height={5} fill={col} />}
        {r() < 0.2 && <path d={`M${x + 3} ${y - h} v-7`} stroke={col} strokeWidth="0.7" />}
        {Array.from({ length: Math.floor(h / 7) }, (_, j) => Array.from({ length: Math.floor((w - 4) / 4) }, (_, q) => (
          <rect key={j + '-' + q} x={x + 2.5 + q * 4} y={y - h + 4 + j * 7} width={2} height={2.6} fill={lit} opacity={night ? (r() < 0.45 ? 0.75 : 0.08) : 0.22} />
        )))}
      </g>
    );
  });
  return <g>{row(back, 12, 1.25, 'b')}{row(front, 0, 0.85, 'f')}</g>;
}

// 땅: 그라디언트 + 풀포기 + 들꽃 + 자갈 (+ 길)
export function Ground({ c, night, y = GY, road, grass = true, seed = 'g' }) {
  const u = useU();
  const r = rnd(seed);
  const g = night ? NIGHT.ground : c.ground;
  const leaf = night ? '#22344a' : c.leaf;
  return (
    <g>
      <defs><linearGradient id={u + 'gr'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={dk(g, 0.06)} /><stop offset="0.3" stopColor={g} /><stop offset="1" stopColor={lt(g, 0.08)} /></linearGradient></defs>
      <rect x={-200} y={y - 2} width={720} height={200} fill={`url(#${u}gr)`} />
      <rect x={-200} y={y - 2} width={720} height={1} fill="#1a1424" opacity="0.1" />
      {road && (
        <g>
          <rect x={-200} y={y + 9} width={720} height={16} fill={night ? '#252d4c' : c.road} />
          <rect x={-200} y={y + 9} width={720} height={1} fill={dk(night ? '#252d4c' : c.road, 0.15)} />
          {Array.from({ length: 30 }, (_, i) => <rect key={i} x={-200 + i * 26} y={y + 16.5} width={12} height={1} fill="#ffffff" opacity="0.35" />)}
        </g>
      )}
      {grass && Array.from({ length: 70 }, (_, i) => {
        const x = -180 + r() * 680;
        const yy = y + 1 + r() * (road ? 7 : 34);
        if (road && yy > y + 8) return null;
        const k = 0.6 + r() * 0.7;
        return (
          <g key={i}>
            <path d={`M${x} ${yy} l${-1.4 * k} ${-3.4 * k} M${x} ${yy} l0 ${-4.4 * k} M${x} ${yy} l${1.4 * k} ${-3.2 * k}`} stroke={i % 3 ? dk(leaf, 0.1) : lt(leaf, 0.15)} strokeWidth="0.7" />
            {i % 7 === 0 && <circle cx={x + 1.6} cy={yy - 3.8 * k} r={0.9} fill={['#ffffff', '#ffd37a', '#f6a5bd', '#c9b8f0'][i % 4]} />}
            {i % 11 === 0 && <ellipse cx={x + 4} cy={yy + 0.4} rx={1.4} ry={0.8} fill={dk(g, 0.22)} />}
          </g>
        );
      })}
    </g>
  );
}

// 나무: 줄기 결 + 가지 + 잎 덩어리 여러 개 (아래 그늘 · 위 빛) + 꽃/열매
export function Tree({ x, y = GY, c, s = 1, night, kind }) {
  const leaf = night ? '#22344a' : c.leaf;
  const trunk = night ? '#3b2f3f' : c.trunk;
  const blossom = !night && (kind === 'blossom' || (c.leaf || '').toLowerCase() === '#f39ab0');
  const blobs = [[0, -30, 11], [-9, -24, 8.5], [9, -24, 8.5], [-5, -36, 7], [6, -35, 7.5], [0, -20, 8]];
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <Shadow x={0} y={0} w={13} o={0.16} />
      <path d="M-2.2 0 Q-1.6 -10 -1.4 -22 L1.4 -22 Q1.6 -10 2.4 0 Z" fill={trunk} />
      <path d="M-1.2 -4 v-14 M0.6 -6 v-10" stroke={dk(trunk, 0.25)} strokeWidth="0.5" />
      <path d="M0 -16 l-6 -6 M0 -19 l5 -6" stroke={trunk} strokeWidth="1.3" />
      {blobs.map(([bx, by, r], i) => <circle key={'d' + i} cx={bx} cy={by + 1.5} r={r} fill={dk(leaf, 0.22)} />)}
      {blobs.map(([bx, by, r], i) => <circle key={'m' + i} cx={bx} cy={by} r={r * 0.94} fill={leaf} />)}
      {blobs.map(([bx, by, r], i) => <circle key={'l' + i} cx={bx - r * 0.3} cy={by - r * 0.35} r={r * 0.42} fill={lt(leaf, 0.22)} opacity="0.8" />)}
      {Array.from({ length: 9 }, (_, i) => <circle key={'f' + i} cx={Math.cos(i * 2.4) * 9} cy={-28 + Math.sin(i * 1.7) * 9} r={blossom ? 1.1 : 0.8} fill={blossom ? '#ffffff' : night ? '#33465e' : dk(leaf, 0.3)} opacity={blossom ? 0.9 : 0.6} />)}
    </g>
  );
}

// 덤불
export const Bush = ({ x, y = GY, c, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx={0} cy={0.5} rx={10} ry={2} fill="#1a1424" opacity="0.14" />
    {[[-5, -3, 4.5], [0, -5, 5.5], [5, -3, 4.5]].map(([a, b, r], i) => <circle key={i} cx={a} cy={b} r={r} fill={i === 1 ? c.leaf : dk(c.leaf, 0.1)} />)}
    <circle cx={-1.5} cy={-7} r={2} fill={lt(c.leaf, 0.25)} />
    {[[-4, -5], [3, -6], [6, -2]].map(([a, b], i) => <circle key={'f' + i} cx={a} cy={b} r={0.9} fill={['#ffffff', '#f6a5bd', '#ffd37a'][i]} />)}
  </g>
);

// ───────── 방 ─────────
// 창: 두꺼운 틀 · 창턱 · 유리 반사 · 커튼(주름) · 커튼봉 / 밤이면 달
export function Window({ x, y, w = 38, h = 32, skyCol = ['#ffd7c2', '#ffeadf'], night, curtain = '#e8a0a0', frame = '#fdf8f0' }) {
  const u = useU();
  const id = u + 'win' + Math.round(x);
  return (
    <g>
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={night ? NIGHT.sky[0] : skyCol[0]} /><stop offset="1" stopColor={night ? NIGHT.sky[1] : skyCol[1]} /></linearGradient></defs>
      <rect x={x - 2.5} y={y - 2.5} width={w + 5} height={h + 5} rx={1} fill={dk(frame, 0.12)} />
      <rect x={x - 1.5} y={y - 1.5} width={w + 3} height={h + 3} fill={frame} />
      <rect x={x} y={y} width={w} height={h} fill={`url(#${id})`} />
      {night ? <><circle cx={x + w * 0.72} cy={y + h * 0.3} r={3.6} fill="#f4ecd0" />{[0, 1, 2, 3].map((i) => <rect key={i} x={x + 4 + i * 8} y={y + 4 + (i % 2) * 6} width={0.8} height={0.8} fill="#fff" />)}</> : (
        <><circle cx={x + w * 0.7} cy={y + h * 0.65} r={4} fill="#fff6e0" opacity="0.9" /><path d={`M${x} ${y + h * 0.8} Q${x + w * 0.3} ${y + h * 0.62} ${x + w * 0.55} ${y + h * 0.78} T${x + w} ${y + h * 0.72} V${y + h} H${x} Z`} fill={skyCol[0]} opacity="0.55" /></>
      )}
      <path d={`M${x + 3} ${y + h - 3} L${x + 12} ${y + 3} M${x + 7} ${y + h - 3} L${x + 15} ${y + 5}`} stroke="#ffffff" strokeWidth="1.2" opacity="0.35" />
      <rect x={x + w / 2 - 1} y={y} width={2} height={h} fill={frame} />
      <rect x={x} y={y + h / 2 - 1} width={w} height={2} fill={frame} />
      {/* 창턱 */}
      <rect x={x - 5} y={y + h + 2} width={w + 10} height={3} fill={frame} /><rect x={x - 5} y={y + h + 5} width={w + 10} height={1.2} fill={dk(frame, 0.2)} />
      {/* 커튼봉 · 커튼 (주름 줄) */}
      <rect x={x - 10} y={y - 7} width={w + 20} height={1.6} rx={0.8} fill="#8a6a4f" /><circle cx={x - 10} cy={y - 6.2} r={1.6} fill="#8a6a4f" /><circle cx={x + w + 10} cy={y - 6.2} r={1.6} fill="#8a6a4f" />
      {[-1, 1].map((sd) => {
        const cx0 = sd < 0 ? x - 9 : x + w + 1;
        return (
          <g key={sd}>
            <path d={`M${cx0} ${y - 6} h8 Q${cx0 + (sd < 0 ? 10 : -2)} ${y + h * 0.55} ${cx0 + (sd < 0 ? 6 : 2)} ${y + h + 6} h-8 Q${cx0 + (sd < 0 ? 0 : 6)} ${y + h * 0.5} ${cx0} ${y - 6} Z`} fill={curtain} />
            {[2, 4.5, 7].map((d) => <path key={d} d={`M${cx0 + d} ${y - 5} Q${cx0 + d + (sd < 0 ? 2.5 : -1)} ${y + h * 0.5} ${cx0 + d - 1} ${y + h + 5}`} stroke={dk(curtain, 0.2)} strokeWidth="0.5" fill="none" />)}
            <rect x={cx0 - 0.5 + (sd < 0 ? 2 : 1)} y={y + h * 0.55} width={7} height={1.6} rx={0.8} fill={dk(curtain, 0.3)} />
          </g>
        );
      })}
    </g>
  );
}

// 액자 (작은 그림이 든)
export const Frame = ({ x, y, w = 15, h = 12, kind = 0 }) => (
  <g>
    <rect x={x + 0.8} y={y + 0.8} width={w} height={h} fill="#1a1424" opacity="0.12" />
    <rect x={x} y={y} width={w} height={h} fill="#b08a64" /><rect x={x + 0.5} y={y + 0.5} width={w - 1} height={0.6} fill="#d6b88f" />
    <rect x={x + 1.6} y={y + 1.6} width={w - 3.2} height={h - 3.2} fill={['#cfe3f0', '#f6e6c8', '#f6d0c0'][kind % 3]} />
    {kind % 3 === 0 && <><path d={`M${x + 1.6} ${y + h - 1.6} l${w * 0.3} ${-h * 0.4} l${w * 0.2} ${h * 0.2} l${w * 0.2} ${-h * 0.3} L${x + w - 1.6} ${y + h - 1.6} Z`} fill="#7fa98a" /><circle cx={x + w * 0.7} cy={y + h * 0.35} r={1.4} fill="#ffd37a" /></>}
    {kind % 3 === 1 && <><circle cx={x + w * 0.4} cy={y + h * 0.42} r={2} fill="#f2c9a0" /><rect x={x + w * 0.4 - 2.2} y={y + h * 0.58} width={4.4} height={3.4} fill="#e98aa6" /><circle cx={x + w * 0.66} cy={y + h * 0.46} r={1.6} fill="#f2c9a0" /><rect x={x + w * 0.66 - 1.8} y={y + h * 0.6} width={3.6} height={3} fill="#6f95e8" /></>}
    {kind % 3 === 2 && <>{[0, 1, 2].map((i) => <circle key={i} cx={x + w * (0.32 + i * 0.18)} cy={y + h * 0.5} r={1.6} fill={['#f05a7e', '#ffd37a', '#f6a5bd'][i]} />)}<path d={`M${x + w * 0.5} ${y + h * 0.6} v3`} stroke="#5f9a6a" strokeWidth="0.6" /></>}
  </g>
);

// 벽시계 (바늘이 실제로 돎)
export const Clock = ({ x, y, t = 0 }) => (
  <g>
    <circle cx={x + 0.6} cy={y + 0.6} r={6.2} fill="#1a1424" opacity="0.12" />
    <circle cx={x} cy={y} r={6.2} fill="#8a6a4f" /><circle cx={x} cy={y} r={5.2} fill="#fffaf0" />
    {Array.from({ length: 12 }, (_, i) => <rect key={i} x={x - 0.3 + Math.sin(i * 0.5236) * 4.2} y={y - 0.3 - Math.cos(i * 0.5236) * 4.2} width={0.6} height={0.6} fill={OUT} />)}
    <path d={`M${x} ${y} L${x + Math.sin(t / 4000) * 2.6} ${y - Math.cos(t / 4000) * 2.6}`} stroke={OUT} strokeWidth="0.8" />
    <path d={`M${x} ${y} L${x + Math.sin(t / 333) * 3.8} ${y - Math.cos(t / 333) * 3.8}`} stroke="#c9544a" strokeWidth="0.4" />
    <circle cx={x} cy={y} r={0.6} fill={OUT} />
  </g>
);

// 화분 (잎이 살짝 흔들림)
export const Plant = ({ x, y = GY, t = 0, s = 1, c = '#5f9a6a' }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <ellipse cx={0} cy={0.4} rx={6} ry={1.2} fill="#1a1424" opacity="0.16" />
    <path d="M-4.5 -9 L4.5 -9 L3.5 0 L-3.5 0 Z" fill="#c9784e" /><rect x={-5} y={-10} width={10} height={2} fill="#d98c62" /><path d="M-3 -6 h6" stroke="#a85e3a" strokeWidth="0.5" />
    <g transform={`rotate(${wob(t, 3000, 3)} 0 -10)`}>
      {[[-6, -20, -30], [0, -24, 0], [6, -19, 30], [-3, -16, -55], [4, -15, 55]].map(([a, b, r], i) => (
        <g key={i} transform={`rotate(${r} 0 -10)`}><path d={`M0 -10 Q${a * 0.3} ${b * 0.6} 0 ${b}`} stroke={dk(c, 0.2)} strokeWidth="0.6" fill="none" /><ellipse cx={0} cy={(b - 10) / 2 - 4} rx={2.6} ry={(10 - b) / 2.4} fill={i % 2 ? c : lt(c, 0.12)} /></g>
      ))}
    </g>
  </g>
);

// 둥근 깔개
export const Rug = ({ x, y = GY + 8, w = 60, c = '#c9785e' }) => (
  <g>
    <ellipse cx={x} cy={y} rx={w / 2} ry={7} fill={c} />
    <ellipse cx={x} cy={y} rx={w / 2 - 3} ry={5} fill="none" stroke={lt(c, 0.35)} strokeWidth="0.8" strokeDasharray="2 1.4" />
    <ellipse cx={x} cy={y} rx={w / 4} ry={2.6} fill={lt(c, 0.15)} />
  </g>
);

// 방: 벽(창 쪽이 밝음) · 벽지 무늬 · 징두리 판 · 걸레받이 · 마루 (판자 이음 · 결 · 창빛 반사)
export function Room({ wall = '#f4ece2', floor = '#d8c6ae', win = [[40, 30]], skyCol = ['#ffd7c2', '#ffeadf'], night, frames = [], y = GY,
  paper = 'dot', curtain, clock, t = 0, plant, rug, beam = true }) {
  const u = useU();
  const wainH = 26;
  const pid = u + 'pp';
  const w2 = night ? mix(wall, '#1a1a38', 0.5) : wall;
  const fl = night ? mix(floor, '#1a1a38', 0.5) : floor;
  return (
    <g>
      <defs>
        <pattern id={pid} width="10" height="10" patternUnits="userSpaceOnUse">
          {paper === 'dot' && <><circle cx="2.5" cy="2.5" r="0.7" fill={dk(w2, 0.1)} /><circle cx="7.5" cy="7.5" r="0.7" fill={dk(w2, 0.1)} /></>}
          {paper === 'stripe' && <rect x="0" y="0" width="3" height="10" fill={dk(w2, 0.05)} />}
          {paper === 'flower' && <><circle cx="5" cy="5" r="1.1" fill={dk(w2, 0.1)} /><circle cx="5" cy="3.6" r="0.6" fill={dk(w2, 0.08)} /><circle cx="6.3" cy="5.4" r="0.6" fill={dk(w2, 0.08)} /><circle cx="3.7" cy="5.4" r="0.6" fill={dk(w2, 0.08)} /></>}
        </pattern>
        <linearGradient id={u + 'wallsh'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#1a1424" stopOpacity="0.16" /><stop offset="0.25" stopColor="#1a1424" stopOpacity="0" /></linearGradient>
        <linearGradient id={u + 'flr'} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={dk(fl, 0.12)} /><stop offset="1" stopColor={lt(fl, 0.06)} /></linearGradient>
        <linearGradient id={u + 'cornL'} x1="0" x2="1"><stop offset="0.85" stopColor="#1a1424" stopOpacity="0.2" /><stop offset="1" stopColor="#1a1424" stopOpacity="0" /></linearGradient>
        <linearGradient id={u + 'cornR'} x1="1" x2="0"><stop offset="0.85" stopColor="#1a1424" stopOpacity="0.2" /><stop offset="1" stopColor="#1a1424" stopOpacity="0" /></linearGradient>
        <radialGradient id={u + 'sheen'}><stop offset="0" stopColor="#ffffff" stopOpacity="0.22" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" /></radialGradient>
        <radialGradient id={u + 'lamp'}><stop offset="0" stopColor="#ffd890" stopOpacity="0.45" /><stop offset="1" stopColor="#ffd890" stopOpacity="0" /></radialGradient>
      </defs>
      <rect x={-200} y={-120} width={720} height={y + 120} fill={w2} />
      <rect x={-200} y={-120} width={720} height={y + 120 - wainH} fill={`url(#${pid})`} />
      <rect x={-200} y={-120} width={720} height={y + 120} fill={`url(#${u}wallsh)`} />
      {/* 창빛이 벽에 번짐 · 양쪽 구석은 어둡게 · 천장 몰딩 */}
      {win.map(([wx, wy], i) => <ellipse key={'wl' + i} cx={wx + 19} cy={wy + 20} rx={62} ry={48} fill={night ? '#9fb2e8' : '#fff4dc'} opacity={night ? 0.06 : 0.22} />)}
      <rect x={-200} y={-120} width={210} height={y + 120} fill={`url(#${u}cornL)`} />
      <rect x={310} y={-120} width={210} height={y + 120} fill={`url(#${u}cornR)`} />
      <rect x={-200} y={2} width={720} height={3} fill={lt(w2, 0.35)} /><rect x={-200} y={5} width={720} height={1.2} fill={dk(w2, 0.12)} /><rect x={-200} y={6.2} width={720} height={3} fill="#1a1424" opacity="0.05" />
      {/* 콘센트 · 스위치 */}
      <g><rect x={238} y={y - wainH - 16} width={5} height={7} rx={0.8} fill={lt(w2, 0.4)} stroke={dk(w2, 0.18)} strokeWidth="0.4" /><rect x={239.9} y={y - wainH - 14} width={1.2} height={2.4} rx={0.4} fill={dk(w2, 0.3)} /></g>
      <g><rect x={16} y={y - 12} width={6} height={4} rx={0.8} fill={lt(w2, 0.4)} stroke={dk(w2, 0.18)} strokeWidth="0.4" /><circle cx={18} cy={y - 10} r={0.5} fill={dk(w2, 0.4)} /><circle cx={20} cy={y - 10} r={0.5} fill={dk(w2, 0.4)} /></g>
      {/* 징두리 판 */}
      <rect x={-200} y={y - wainH} width={720} height={wainH} fill={mix(w2, '#c8a888', 0.35)} />
      <rect x={-200} y={y - wainH - 2} width={720} height={2.4} fill={mix(w2, '#8a6a4f', 0.45)} />
      <rect x={-200} y={y - wainH - 2} width={720} height={0.6} fill={lt(w2, 0.3)} />
      {Array.from({ length: 28 }, (_, i) => <rect key={i} x={-196 + i * 26} y={y - wainH + 4} width={22} height={wainH - 9} fill="none" stroke={dk(mix(w2, '#c8a888', 0.35), 0.1)} strokeWidth="0.6" />)}
      <rect x={-200} y={y - 4} width={720} height={4} fill={mix(w2, '#8a6a4f', 0.55)} />
      {/* 마루 */}
      <rect x={-200} y={y} width={720} height={200} fill={`url(#${u}flr)`} />
      {Array.from({ length: 8 }, (_, j) => (
        <g key={j}>
          <rect x={-200} y={y + 2 + j * 6} width={720} height={0.5} fill={dk(fl, 0.2)} opacity="0.7" />
          {Array.from({ length: 16 }, (_, i) => <rect key={i} x={-200 + i * 46 + (j % 2) * 23} y={y + 2 + j * 6} width={0.5} height={6} fill={dk(fl, 0.22)} opacity="0.7" />)}
          {Array.from({ length: 10 }, (_, i) => <path key={'g' + i} d={`M${-190 + i * 72 + j * 13} ${y + 4.5 + j * 6} q6 -0.8 12 0`} stroke={dk(fl, 0.1)} strokeWidth="0.4" fill="none" />)}
        </g>
      ))}
      {/* 걸레받이 그늘 · 마루 윤기 */}
      <rect x={-200} y={y} width={720} height={3} fill="#1a1424" opacity="0.14" />
      <ellipse cx={170} cy={y + 18} rx={120} ry={10} fill={`url(#${u}sheen)`} opacity={night ? 0.4 : 1} />
      {/* 창으로 드는 빛 (바닥에 사다리꼴) */}
      {beam && win.map(([wx, wy], i) => (
        <g key={'b' + i} opacity={night ? 0.5 : 1}>
          <path d={`M${wx} ${wy + 32} L${wx + 38} ${wy + 32} L${wx + 78} ${y + 26} L${wx + 22} ${y + 26} Z`} fill={night ? '#9fb2e8' : '#fff6dc'} opacity={night ? 0.06 : 0.16} />
          <path d={`M${wx + 22} ${y + 2} L${wx + 62} ${y + 2} L${wx + 78} ${y + 26} L${wx + 22} ${y + 26} Z`} fill={night ? '#9fb2e8' : '#fff6dc'} opacity={night ? 0.08 : 0.22} />
        </g>
      ))}
      {win.map(([wx, wy], i) => <Window key={i} x={wx} y={wy} skyCol={skyCol} night={night} curtain={curtain || (night ? '#4a4a7a' : '#e8a8a0')} />)}
      {frames.map((fx, i) => <Frame key={i} x={fx} y={44 + (i % 2) * 4} kind={i} />)}
      {clock && <Clock x={clock[0]} y={clock[1]} t={t} />}
      {rug && <Rug x={rug[0]} c={rug[1]} w={rug[2] || 60} />}
      {plant && <Plant x={plant} y={y + 2} t={t} />}
    </g>
  );
}

// ───────── 침대 · 이불 ─────────
// 침대: 둥근 머리판(나뭇결 · 기둥 꼭지) · 발판 · 매트리스(솔기) · 베개(주름 · 그늘)
export function Bed({ x, y = GY, w = 70, hosp, wood: woodIn }) {
  const L = x - w / 2;
  const wood = hosp ? '#b9c3cc' : woodIn || '#9a7452';
  const sh = dk(wood, 0.25);
  return (
    <g>
      <ellipse cx={x} cy={y + 1} rx={w / 2 + 6} ry={2.4} fill="#1a1424" opacity="0.16" />
      {/* 머리판 */}
      {hosp ? (
        <g><rect x={L - 3} y={y - 32} width={2.4} height={32} fill={wood} /><rect x={L + 4} y={y - 32} width={2.4} height={24} fill={wood} /><rect x={L - 3} y={y - 32} width={9.4} height={2} fill={wood} />{[0, 1, 2].map((i) => <rect key={i} x={L - 1} y={y - 28 + i * 6} width={5.4} height={0.8} fill={sh} />)}</g>
      ) : (
        <g>
          <path d={`M${L - 3} ${y} V${y - 26} Q${L - 3} ${y - 34} ${L + 5} ${y - 34} Q${L + 13} ${y - 34} ${L + 13} ${y - 26} V${y - 12} H${L - 3} Z`} fill={wood} transform={`translate(-8 0)`} />
          <path d={`M${L - 8} ${y - 26} q4 -2 8 0 M${L - 9} ${y - 21} q5 -1.5 10 0 M${L - 9} ${y - 16} q5 1 10 0`} stroke={sh} strokeWidth="0.5" fill="none" />
          <rect x={L - 12} y={y - 30} width={2.6} height={30} fill={sh} /><circle cx={L - 10.7} cy={y - 31} r={1.8} fill={wood} />
          <rect x={L + 4} y={y - 30} width={2.6} height={30} fill={sh} /><circle cx={L + 5.3} cy={y - 31} r={1.8} fill={wood} />
        </g>
      )}
      {/* 발판 */}
      <rect x={L + w - 1} y={y - 20} width={3} height={20} rx={0.8} fill={hosp ? wood : sh} />
      <circle cx={L + w + 0.5} cy={y - 21} r={hosp ? 0 : 1.6} fill={wood} />
      {/* 틀 · 다리 */}
      <rect x={L - 2} y={y - 9} width={w + 2} height={4.4} fill={wood} /><rect x={L - 2} y={y - 9} width={w + 2} height={0.8} fill={lt(wood, 0.25)} />
      {[6, 26, 46].map((d) => <path key={d} d={`M${L + d} ${y - 7.2} q4 -0.6 8 0`} stroke={sh} strokeWidth="0.4" fill="none" />)}
      <rect x={L} y={y - 5} width={2.4} height={5} fill={sh} /><rect x={L + w - 4} y={y - 5} width={2.4} height={5} fill={sh} />
      {hosp && <><circle cx={L + 1.2} cy={y + 0.2} r={1.4} fill="#6a7480" /><circle cx={L + w - 2.8} cy={y + 0.2} r={1.4} fill="#6a7480" /></>}
      {/* 매트리스 */}
      <rect x={L} y={y - 16} width={w} height={7.4} rx={2} fill="#fdfaf4" />
      <rect x={L} y={y - 11.2} width={w} height={2.6} fill="#ebe3d6" />
      <path d={`M${L + 1} ${y - 12.2} h${w - 2}`} stroke="#d8cfc0" strokeWidth="0.4" strokeDasharray="1.2 1" />
      {/* 베개 */}
      <path d={`M${L + 1.5} ${y - 17} q0 -6 6 -6 h7 q6 0 6 6 q0 2 -3 2 h-13 q-3 0 -3 -2 Z`} fill="#ffffff" stroke="#d6ccbe" strokeWidth="0.5" />
      <path d={`M${L + 5} ${y - 20} q4 1.2 9 -0.6 M${L + 8} ${y - 17.2} q3 -1 6 0`} stroke="#d6ccbe" strokeWidth="0.5" fill="none" />
      <path d={`M${L + 3} ${y - 21.4} q3 -1.6 7 -1.6`} stroke="#ffffff" strokeWidth="0.9" fill="none" opacity="0.9" />
    </g>
  );
}

// 누운 사람 자리 (발 위치) : 몸 크기 k
export const lieAt = (x, w = 70, y = GY, k = 1) => ({ x: x - w / 2 + 4 + 37 * k, y: y - 14 - 5 * k });

// 퀼트 이불: 누운 사람 목 아래부터 발끝까지, 배 · 무릎 · 발 굴곡 + 침대 옆으로 늘어진 자락 + 접힌 하얀 홑청 + 무늬 + 주름
//   breath: 숨 쉬는 높이 (0~1) / k: 몸 크기
export function Cover({ x, y = GY, w = 70, col = '#cfe3f0', pat = 'check', breath = 0, k = 1 }) {
  const u = useU();
  const L = x - w / 2;
  const a = L + 4 + 37 * k - 37 * k + 17 * k + 4; // 목 아래 (머리 끝 + 17칸)
  const R = L + w + 1;
  const top = y - 24 - 3 * k - breath * 0.8;
  const pid = u + 'q' + col.slice(1);
  const d1 = dk(col, 0.14);
  const d2 = dk(col, 0.3);
  const body = `M${a} ${top + 2} Q${a + 8 * k} ${top - 2.5 - breath} ${a + 18 * k} ${top} Q${a + 24 * k} ${top + 1.6} ${a + 28 * k} ${top - 0.6} Q${a + 33 * k} ${top - 2.2} ${a + 36 * k} ${top + 0.6} L${R - 2} ${top + 3} Q${R + 1} ${top + 5} ${R} ${y - 10} L${R + 1} ${y - 3} Q${(a + R) / 2} ${y - 1} ${a - 1} ${y - 4} L${a - 1} ${top + 4} Z`;
  return (
    <g>
      <defs>
        <pattern id={pid} width="8" height="8" patternUnits="userSpaceOnUse">
          <rect width="8" height="8" fill={col} />
          {pat === 'check' && <><rect width="4" height="4" fill={lt(col, 0.14)} /><rect x="4" y="4" width="4" height="4" fill={lt(col, 0.14)} /><circle cx="2" cy="2" r="0.6" fill={d2} opacity="0.5" /><circle cx="6" cy="6" r="0.6" fill="#ffffff" opacity="0.7" /></>}
          {pat === 'flower' && <><circle cx="2" cy="2" r="1" fill="#ffffff" opacity="0.8" /><circle cx="2" cy="2" r="0.45" fill="#ffd37a" /><circle cx="6" cy="6" r="1" fill={lt(col, 0.4)} /><path d="M5 2 q1 -1 2 0" stroke={d1} strokeWidth="0.3" fill="none" /></>}
          {pat === 'plain' && <path d="M0 4 h8" stroke={d1} strokeWidth="0.25" opacity="0.6" />}
        </pattern>
      </defs>
      {/* 옆으로 늘어진 자락 */}
      <path d={`M${a - 1} ${y - 9} L${R + 1} ${y - 9} L${R + 2} ${y - 2} Q${R - 6} ${y + 0.5} ${R - 12} ${y - 1.5} Q${(a + R) / 2} ${y + 1.5} ${a + 6} ${y - 1.2} Q${a + 1} ${y} ${a - 1} ${y - 2} Z`} fill={d1} />
      {[0.25, 0.5, 0.75].map((q) => <path key={q} d={`M${a + (R - a) * q} ${y - 8.5} q-1 4 0.5 7.6`} stroke={d2} strokeWidth="0.5" fill="none" />)}
      {/* 윗면 */}
      <path d={body} fill={`url(#${pid})`} stroke={d2} strokeWidth="0.5" />
      {/* 퀼트 바느질 */}
      <path d={`M${a + 2} ${top + 6} Q${(a + R) / 2} ${top + 3} ${R - 3} ${top + 6.5}`} stroke={lt(col, 0.5)} strokeWidth="0.45" strokeDasharray="1.4 1.1" fill="none" />
      {/* 주름 · 그늘 */}
      <path d={`M${a + 10 * k} ${top + 1} q2 4 0 8 M${a + 22 * k} ${top + 2} q-2 3 1 7 M${a + 31 * k} ${top + 1} q2 4 -1 8`} stroke={d1} strokeWidth="0.6" fill="none" />
      <path d={`M${a + 4} ${top + 1} Q${a + 9 * k} ${top - 2 - breath} ${a + 16 * k} ${top}`} stroke="#ffffff" strokeWidth="0.9" fill="none" opacity="0.55" />
      {/* 접힌 하얀 홑청: 목 아래로 말려 내려온 띠 (위 가장자리를 따라) */}
      <path d={`M${a - 1.5} ${top + 3.5} Q${a + 8 * k} ${top - 3 - breath} ${a + 16 * k} ${top - 0.6} L${a + 16 * k} ${top + 3.4} Q${a + 8 * k} ${top + 1 - breath} ${a - 1.5} ${top + 7} Z`} fill="#fffdf8" stroke="#d6ccbe" strokeWidth="0.45" />
      <path d={`M${a} ${top + 5.2} Q${a + 8 * k} ${top - 0.6 - breath} ${a + 15 * k} ${top + 1.6}`} stroke="#e6dccd" strokeWidth="0.4" strokeDasharray="0.8 0.8" fill="none" />
    </g>
  );
}

// 강보에 싼 아기 (천 주름 · 리본 · 볼)
export const Bundle = ({ x, y, col = '#f6a5bd', s = 1, t = 0 }) => (
  <g transform={`translate(${x} ${y}) scale(${s}) rotate(${wob(t, 1600, 3)})`}>
    <ellipse cx={0.5} cy={1.2} rx={7.6} ry={4.6} fill="#1a1424" opacity="0.12" />
    <path d="M-7 0 Q-7 -4.6 -2 -4.6 L4 -4.4 Q7.6 -3 7.4 0.6 Q7 4.4 2 4.4 L-3 4.4 Q-7 4 -7 0 Z" fill="#fffaf2" stroke={OUT} strokeWidth="0.5" />
    <path d="M-1 -4.4 Q5.4 -4.6 7.2 0 Q5.4 4.2 -1 4.4 Q2 0 -1 -4.4 Z" fill={col} />
    <path d="M1 -3.4 q2.4 3.4 0 6.8 M3.6 -3 q1.8 3 0 6" stroke={dk(col, 0.2)} strokeWidth="0.4" fill="none" />
    <path d="M-1 -1.2 l1.6 1.2 l-1.6 1.2 Z M2.2 -1.2 l-1.6 1.2 l1.6 1.2 Z" fill="#ffffff" stroke={dk(col, 0.25)} strokeWidth="0.25" />
    <circle cx={-3.4} cy={-0.2} r={3} fill="#f2c9a0" stroke={OUT} strokeWidth="0.45" />
    <path d="M-5.8 -2.2 q2.4 -2.4 5 -0.4" stroke="#fffaf2" strokeWidth="1.3" fill="none" />
    <path d="M-4.8 -0.4 q0.4 0.4 0.8 0 M-2.8 -0.4 q0.4 0.4 0.8 0" stroke={OUT} strokeWidth="0.35" fill="none" />
    <rect x={-5.2} y={0.6} width={0.8} height={0.5} fill="#f29a9a" /><rect x={-2.2} y={0.6} width={0.8} height={0.5} fill="#f29a9a" />
    <path d="M-3.8 1.6 q0.4 0.3 0.8 0" stroke={OUT} strokeWidth="0.3" fill="none" />
  </g>
);

// ───────── 그 밖의 소품 ─────────
export function Bunting({ y = 14, from = -40, to = 360, n = 22, t = 0 }) {
  const cols = ['#f6a5bd', '#ffd37a', '#9fc7e0', '#b7e0a0', '#ffffff'];
  return (
    <g>
      <path d={`M${from} ${y} Q${(from + to) / 2} ${y + 10} ${to} ${y}`} stroke="#b89a7c" strokeWidth="0.6" fill="none" />
      {Array.from({ length: n }, (_, i) => {
        const x = from + ((to - from) * (i + 0.5)) / n;
        const q = (x - from) / (to - from);
        const yy = y + 20 * q * (1 - q);
        const sw = wob(t + i * 140, 1800, 0.8);
        return <g key={i}><path d={`M${x - 3} ${yy} h6 l${-3 + sw} 6.4 Z`} fill={cols[i % 5]} /><path d={`M${x - 3} ${yy} h6 l-1 1.2 h-4 Z`} fill="#1a1424" opacity="0.1" /></g>;
      })}
    </g>
  );
}

export const Door = ({ x, y = GY, w = 16, h = 26, c = '#8a6a4f', open = 0, inside = '#3a2f2a', glass }) => (
  <g>
    <rect x={x - w / 2 - 2} y={y - h - 2} width={w + 4} height={h + 2} fill={dk(c, 0.3)} />
    <rect x={x - w / 2} y={y - h} width={w} height={h} fill={inside} />
    {open > 0 && <path d={`M${x - w / 2} ${y} L${x - w / 2 + w * 0.7} ${y + 4} L${x - w / 2 + w} ${y} Z`} fill="#fff2c8" opacity={0.25 * open} />}
    <g>
      <rect x={x - w / 2} y={y - h} width={w * (1 - open * 0.85)} height={h} fill={c} />
      {w * (1 - open * 0.85) > 6 && (
        <>
          <rect x={x - w / 2 + 2} y={y - h + 2.4} width={w * (1 - open * 0.85) - 4} height={h * 0.38} fill="none" stroke={dk(c, 0.2)} strokeWidth="0.6" />
          <rect x={x - w / 2 + 2} y={y - h * 0.52} width={w * (1 - open * 0.85) - 4} height={h * 0.42} fill="none" stroke={dk(c, 0.2)} strokeWidth="0.6" />
          {glass && <rect x={x - w / 2 + 3} y={y - h + 3.4} width={w * (1 - open * 0.85) - 6} height={h * 0.32} fill="#cfe3f0" opacity="0.8" />}
          <circle cx={x - w / 2 + w * (1 - open * 0.85) - 2.6} cy={y - h / 2} r="1" fill="#f2c230" stroke={dk('#f2c230', 0.3)} strokeWidth="0.3" />
        </>
      )}
    </g>
    <rect x={x - w / 2 - 3} y={y - 0.6} width={w + 6} height={1.6} fill={dk(c, 0.4)} />
  </g>
);

// 벽돌 벽 무늬 (건물 정면에)
export function Bricks({ x, y, w, h, c }) {
  const out = [];
  for (let j = 0; j * 4 < h; j++) for (let i = -1; i * 9 < w; i++) {
    const bx = x + i * 9 + (j % 2) * 4.5;
    if (bx + 8 < x || bx > x + w) continue;
    out.push(<rect key={i + '-' + j} x={Math.max(x, bx)} y={y + j * 4} width={Math.min(8, x + w - Math.max(x, bx))} height={3.2} fill={(i + j) % 3 ? 'none' : dk(c, 0.05)} stroke={dk(c, 0.09)} strokeWidth="0.35" />);
  }
  return <g>{out}</g>;
}

// 기와 · 지붕 줄
export function Roof({ x1, x2, y, peak, c }) {
  const mid = (x1 + x2) / 2;
  return (
    <g>
      <path d={`M${x1 - 6} ${y} L${mid} ${peak} L${x2 + 6} ${y} Z`} fill={c} />
      {Array.from({ length: Math.floor((y - peak) / 3.4) }, (_, i) => {
        const yy = peak + 3 + i * 3.4;
        const k = (yy - peak) / (y - peak);
        return <path key={i} d={`M${mid - (mid - x1 + 6) * k} ${yy} H${mid + (x2 + 6 - mid) * k}`} stroke={dk(c, 0.2)} strokeWidth="0.6" />;
      })}
      <path d={`M${x1 - 6} ${y} L${mid} ${peak} L${x2 + 6} ${y}`} stroke={dk(c, 0.35)} strokeWidth="1.4" fill="none" />
      <rect x={x1 - 6} y={y} width={x2 - x1 + 12} height={1.6} fill="#1a1424" opacity="0.2" />
    </g>
  );
}

// 건물 창 (틀 · 창턱 · 반사 · 화분 상자)
export const BWin = ({ x, y, w = 14, h = 11, frame = '#fdf8f0', glass = '#b8d4ea', box, lit }) => (
  <g>
    <rect x={x - 1} y={y - 1} width={w + 2} height={h + 2} fill={frame} />
    <rect x={x} y={y} width={w} height={h} fill={lit ? '#ffe2a0' : glass} />
    <path d={`M${x + 1.5} ${y + h - 1} L${x + w * 0.45} ${y + 1}`} stroke="#ffffff" strokeWidth="0.9" opacity="0.5" />
    <rect x={x + w / 2 - 0.5} y={y} width={1} height={h} fill={frame} /><rect x={x} y={y + h / 2 - 0.5} width={w} height={1} fill={frame} />
    <rect x={x - 2} y={y + h + 1} width={w + 4} height={1.6} fill={dk(frame, 0.15)} />
    {box && <g><rect x={x - 1} y={y + h + 2.6} width={w + 2} height={2.6} fill="#a8653e" />{Array.from({ length: Math.floor(w / 3) }, (_, i) => <circle key={i} cx={x + 1 + i * 3} cy={y + h + 2} r={1.1} fill={['#f05a7e', '#ffd37a', '#ffffff'][i % 3]} />)}</g>}
  </g>
);

// 꽃가루 (뒤집히며 반짝 · 바람에 흔들림)
export function Confetti({ t, a = 0, n = 46, seed = 'cf', area = [0, 320] }) {
  if (t < a) return null;
  const r = rnd(seed);
  const cols = ['#f6a5bd', '#ffd37a', '#9fc7e0', '#ffffff', '#b7e0a0', '#f05a7e'];
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x0 = area[0] + r() * (area[1] - area[0]);
        const sp = 0.016 + r() * 0.02;
        const y = ((t - a) * sp + r() * 200) % 200 - 20;
        const flip = Math.abs(Math.cos((t + i * 97) / 180));
        const x = x0 + wob(t, 900 + i * 13, 5, i);
        return <rect key={i} x={x - 1.2} y={y - 0.8 * flip} width={2.4} height={Math.max(0.3, 1.6 * flip)} fill={cols[i % 6]} transform={`rotate(${(t / 7 + i * 40) % 360} ${x} ${y})`} />;
      })}
    </g>
  );
}

// 비: 기울어진 빗줄기 (가까운 것은 굵고 빠르게) + 바닥에 튀는 물방울
export function Rain({ t, n = 80, o = 0.55, y = GY }) {
  return (
    <g opacity={o}>
      {Array.from({ length: n }, (_, i) => {
        const near = i % 3 === 0;
        const x = (i * 37.3) % 360 - 20;
        const yy = ((t * (near ? 0.42 : 0.3) + i * 47) % 230) - 30;
        return <path key={i} d={`M${x} ${yy} l${near ? -3.6 : -2.4} ${near ? 11 : 7}`} stroke="#d8e6f4" strokeWidth={near ? 0.8 : 0.5} />;
      })}
      {Array.from({ length: 14 }, (_, i) => {
        const q = ((t + i * 230) % 500) / 500;
        const x = (i * 23.7) % 320;
        return <g key={'s' + i} opacity={1 - q}><path d={`M${x - 2 * q} ${y + 6 - q * 3} l-1 -1 M${x + 2 * q} ${y + 6 - q * 3} l1 -1`} stroke="#d8e6f4" strokeWidth="0.5" /></g>;
      })}
    </g>
  );
}

// 꽃잎 · 나뭇잎이 흩날림 (팔랑팔랑 뒤집힘)
export function Petals({ t, n = 18, col = '#f6a5bd' }) {
  return (
    <g>
      {Array.from({ length: n }, (_, i) => {
        const x = ((i * 53 + t * 0.012) % 360) - 20 + wob(t, 1400, 6, i);
        const y = ((t * (0.012 + (i % 4) * 0.003) + i * 31) % 200) - 20;
        const f = Math.abs(Math.sin((t + i * 300) / 400));
        return <ellipse key={i} cx={x} cy={y} rx={1.8 * f + 0.4} ry={1.1} fill={i % 3 ? col : '#ffffff'} opacity="0.9" transform={`rotate(${(t / 9 + i * 50) % 360} ${x} ${y})`} />;
      })}
    </g>
  );
}
