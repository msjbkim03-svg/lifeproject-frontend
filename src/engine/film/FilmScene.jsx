// C22 엔딩 크레딧 전용 장면 그림 - 원작 주마등 필름의 '그 순간 장면'(pxMoment · MO.*)처럼
//   장면 글에 맞는 배경 + 그때 같이 있던 사람들을 한 장에 그림 (그림은 우리 마을 그림체로 새로 그림)
// - 마을 그림과 같은 크기 규칙: SVG 320 × 130, 땅은 y 92 부터, 사람 발밑은 높이 86% (마을 GROUND_Y)
// - 사람은 마을 사람 그림(Figure · lookOf, 윤아님 파일)을 import 해서 쓰기만 함
// - 야외는 그 나라 권역 마을 색(villageData THEMES)을 따라감
// 장면 (v.scene): born 태어남 · school 입학 · grad 졸업 · date 만남·청혼 · wedding 결혼식 · newborn 아이 · hosp 병원
//   · loss 떠나보냄(묘) · funeral 장례식 · fly 이민 · flee 피란 · rain 일자리 잃음 · news 역사 사건 · home 내 집
//   · award 상 · party 은퇴·잔치 · prison 교도소 · last 마지막 밤
// 사용: <FilmScene v={{ scene, arg, countryCode, year, age, gender, costume, family, portrait }} />
//   family: [{ id: mom|dad|sib0|spouse|kid0…, gender, age }] (그 나이 때 가족)
import Figure from '../village/Figure';
import { lookOf } from '../village/costumeData';
import { COUNTRIES, THEMES } from '../village/villageData';
import { useTheme } from '../../common/theme';

const FOOT = 86; // 발밑 높이 %
const G = 92;    // 땅 y (SVG)

const SKY = {
  dusk: 'linear-gradient(180deg, #f39a7c 0%, #ffc9a4 60%, #ffe6cf 100%)',
  night: 'linear-gradient(180deg, #0c1230 0%, #24305e 100%)',
  cloud: 'linear-gradient(180deg, #7d8594 0%, #b9bec8 100%)',
  rain: 'linear-gradient(180deg, #4a5262 0%, #7d8594 100%)',
  smoke: 'linear-gradient(180deg, #6e625a 0%, #b49c86 100%)',
};

// 사람 한 명
function Person({ x, look, s = 1, y = FOOT, dim, flip }) {
  return (
    <div className={'fs-p' + (dim ? ' dim' : '') + (flip ? ' flip' : '')} style={{ left: x + '%', top: y + '%', '--s': s }}>
      <Figure look={look} />
    </div>
  );
}
const sizeOf = (age) => (age < 3 ? 0.66 : age < 13 ? 0.82 : 1);
// 가운데 cx 에서 gap 간격으로 n 명 자리
const row = (n, cx, gap = 7) => Array.from({ length: n }, (_, i) => cx + (i - (n - 1) / 2) * gap);

const GEN = [
  { gender: 'F', age: 52 }, { gender: 'M', age: 30 }, { gender: 'F', age: 27 }, { gender: 'M', age: 61 },
  { gender: 'F', age: 9 }, { gender: 'M', age: 44 }, { gender: 'F', age: 35 }, { gender: 'M', age: 70 },
];
const soft = (p) => lookOf({ gender: p.gender, age: p.age ?? 40, soft: true });
const dressed = (p, color, style = 'tee') => ({ ...lookOf({ gender: p.gender, age: p.age ?? 40 }), top: { style, color } });

// ───────── 그림 부품 ─────────
function Hills({ c, dim }) {
  return (
    <g opacity={dim ? 0.75 : 1}>
      <path d="M0 68 Q60 48 120 62 Q190 42 250 60 Q290 52 320 56 L320 100 L0 100 Z" fill={c.far} />
      <path d="M0 82 Q80 70 160 78 T320 76 L320 100 L0 100 Z" fill={c.near} />
      <rect x="0" y={G} width="320" height={130 - G} fill={c.ground} />
    </g>
  );
}
function Tree({ x, c, pine, s = 1 }) {
  if (pine) {
    return <g><rect x={x - 1.5} y={G - 10 * s} width="3" height={10 * s} fill={c.trunk} /><path d={`M${x} ${G - 46 * s} L${x + 13 * s} ${G - 10 * s} L${x - 13 * s} ${G - 10 * s} Z`} fill="#4f6b58" /></g>;
  }
  return <g><rect x={x - 2} y={G - 26 * s} width="4" height={26 * s} fill={c.trunk} /><circle cx={x} cy={G - 34 * s} r={15 * s} fill={c.leaf} /><circle cx={x - 9 * s} cy={G - 26 * s} r={9 * s} fill={c.leaf} /><circle cx={x + 9 * s} cy={G - 26 * s} r={9 * s} fill={c.leaf} /></g>;
}
// 방: 벽 · 걸레받이 · 바닥 · 창문(밖 하늘) · 액자
function Room({ wall = '#f4ece2', floor = '#d8c6ae', tile, win = [[40, 22]], sky = '#ffd7c2', night, frames = [] }) {
  return (
    <g>
      <rect x="0" y="0" width="320" height={G} fill={wall} />
      <rect x="0" y={G - 10} width="320" height="10" fill="#000" opacity="0.06" />
      <rect x="0" y={G} width="320" height={130 - G} fill={floor} />
      {tile && Array.from({ length: 16 }, (_, i) => <path key={i} d={`M${i * 22} ${G} L${i * 22 - 14} 130`} stroke="#000" strokeOpacity="0.07" />)}
      {win.map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="46" height="36" rx="2" fill={night ? '#1d2a55' : sky} stroke="#b89a7c" strokeWidth="2" />
          <path d={`M${x + 23} ${y} V${y + 36} M${x} ${y + 18} H${x + 46}`} stroke="#b89a7c" strokeWidth="1.4" />
          {night ? <circle cx={x + 34} cy={y + 9} r="4" fill="#fff6df" /> : <circle cx={x + 34} cy={y + 10} r="5" fill="#fff6df" opacity="0.8" />}
        </g>
      ))}
      {frames.map((x, i) => <g key={'f' + i}><rect x={x} y="26" width="16" height="12" fill="#b89a7c" /><rect x={x + 2} y="28" width="12" height="8" fill={['#9fc7e0', '#f6a5bd', '#c9d9a8'][i % 3]} /></g>)}
    </g>
  );
}
function Bunting({ y = 16, from = 0, to = 320, n = 16 }) {
  const step = (to - from) / n;
  return (
    <g>
      <path d={`M${from} ${y - 2} Q${(from + to) / 2} ${y + 8} ${to} ${y - 2}`} stroke="#ffffff" strokeOpacity="0.8" fill="none" strokeWidth="0.8" />
      {Array.from({ length: n }, (_, i) => {
        const x = from + step * (i + 0.5);
        const yy = y - 2 + Math.sin((i / (n - 1)) * Math.PI) * 6;
        return <path key={i} d={`M${x - 4} ${yy} L${x + 4} ${yy} L${x} ${yy + 7} Z`} fill={['#f6a5bd', '#ffffff', '#ffd37a', '#9fc7e0'][i % 4]} />;
      })}
    </g>
  );
}
// 침대 뒤판 · 매트 (누운 사람은 이불 앞판 BedFront 으로 덮음)
function Bed({ x, w = 64, hosp }) {
  return (
    <g>
      <rect x={x} y={G - 28} width="5" height="28" fill={hosp ? '#c8d2d8' : '#a87c5c'} />
      <rect x={x} y={G - 12} width={w} height="8" fill="#ffffff" stroke="#c8b8a4" strokeWidth="0.6" />
      <rect x={x + w - 4} y={G - 14} width="4" height="14" fill={hosp ? '#c8d2d8' : '#a87c5c'} />
      <rect x={x + 6} y={G - 18} width="14" height="6" rx="2" fill="#ffffff" stroke="#d6cbbd" strokeWidth="0.5" />
    </g>
  );
}
function BedFront({ x, w = 64, color = '#9fc7e0' }) {
  return <g><rect x={x + 4} y={G - 16} width={w - 8} height="10" rx="2" fill={color} /><rect x={x + 4} y={G - 16} width={w - 8} height="2" fill="#ffffff" opacity="0.5" /></g>;
}
function Confetti() {
  return <div className="fs-confetti" aria-hidden="true">{Array.from({ length: 18 }, (_, i) => <i key={i} style={{ left: (i * 5.7 + 2) % 100 + '%', animationDelay: -(i * 0.53) + 's', animationDuration: 3.5 + (i % 5) * 0.6 + 's', background: ['#f6a5bd', '#ffd37a', '#9fc7e0', '#ffffff', '#b7e0a0'][i % 5] }} />)}</div>;
}

// ───────── 가족 고르기 ─────────
function castOf(v) {
  const f = v.family || [];
  const me = { gender: v.gender, age: v.age, me: true };
  return {
    me,
    meLook: lookOf({ gender: v.gender, age: v.age, costume: v.costume }),
    par: f.filter((m) => m.id === 'mom' || m.id === 'dad'),
    mom: f.find((m) => m.id === 'mom'),
    dad: f.find((m) => m.id === 'dad'),
    sib: f.filter((m) => m.id.startsWith('sib')),
    pt: f.find((m) => m.id === 'spouse'),
    kids: f.filter((m) => m.id.startsWith('kid')),
    all: f,
  };
}
const gen = (i, over) => ({ ...GEN[i % GEN.length], ...over });

// ───────── 장면들 ─────────
// 반환: { bg: 배경색, back: 뒤 SVG, people: [{x, look, s, y}], front: 앞 SVG, fx }
const SCENES = {
  born(v, c, k) {
    const mom = k.mom || gen(2, { gender: 'F', age: 28 });
    const hosp = v.urban;
    const ppl = [
      { x: 44, look: soft(mom), y: 66 },
      { x: 49, look: lookOf({ gender: v.gender, age: 0 }), s: 0.55, y: 64 },
    ];
    if (k.dad) ppl.push({ x: 64, look: soft(k.dad) });
    k.sib.slice(0, 2).forEach((s, i) => ppl.push({ x: 72 + i * 7, look: soft(s), s: sizeOf(s.age) }));
    return {
      bg: hosp ? '#e6f0ee' : '#f4ece2',
      back: <><Room wall={hosp ? '#e6f0ee' : '#f4ece2'} floor={hosp ? '#cfdad8' : '#d8c6ae'} tile={hosp} win={[[230, 22]]} sky={(/#[0-9a-f]{6}/i.exec(c.sky) || ['#ffd7c2'])[0]} frames={hosp ? [] : [24, 44]} /><Bed x={120} w={70} hosp={hosp} /></>,
      people: ppl,
      front: <BedFront x={120} w={70} color={hosp ? '#cfe3f0' : '#f2c6b4'} />,
    };
  },
  school(v, c, k) {
    const adult = v.age >= 18;
    const kid = adult ? (k.kids.filter((m) => m.age >= 5 && m.age <= 9)[0] || k.kids[0] || gen(4, { age: 7 })) : k.me;
    const with1 = adult ? [k.me, k.pt].filter(Boolean) : k.par.slice(0, 1);
    const ppl = [{ x: 47, look: adult ? soft(kid) : k.meLook, s: 0.82 }];
    with1.forEach((p, i) => ppl.push({ x: 56 + i * 7, look: p.me ? k.meLook : soft(p) }));
    ppl.push({ x: 30, look: soft(gen(4, { age: kid.age ?? 7 })), s: 0.82 }, { x: 24, look: soft(gen(0, { age: 38 })) });
    return {
      bg: c.sky,
      back: (
        <>
          <Hills c={c} />
          <rect x="90" y="40" width="140" height={G - 40} fill={c.wall} />
          <path d="M84 40 L160 22 L236 40 Z" fill={c.roofC} />
          {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={98 + i * 21} y="50" width="11" height="10" fill={c.roofC} opacity="0.3" />)}
          <rect x="150" y="70" width="20" height={G - 70} fill={c.roofC} opacity="0.7" />
          <circle cx="160" cy="31" r="5" fill="#fff" stroke={c.roofC} />
          <rect x="60" y={G - 30} width="5" height="30" fill={c.wall} /><rect x="255" y={G - 30} width="5" height="30" fill={c.wall} />
          <path d="M66 52 h20 l-3 4 l3 4 h-20 Z" fill="#f26b38" /><path d="M66 50 V92" stroke={c.trunk} />
          <Tree x={30} c={c} /><Tree x={292} c={c} />
          <Bunting y={14} />
        </>
      ),
      people: ppl,
    };
  },
  grad(v, c, k) {
    const uni = v.arg === 'uni';
    const gown = { ...k.meLook, top: { style: 'suit', color: '#24304f' } };
    const fam = [...k.par, ...(k.pt ? [k.pt] : [])].slice(0, 3);
    const ppl = [{ x: 50, look: gown }];
    fam.forEach((p, i) => ppl.push({ x: [38, 62, 70][i], look: soft(p) }));
    ppl.push({ x: 26, look: { ...soft(gen(2, { age: v.age })), top: { style: 'suit', color: '#24304f' } } }, { x: 80, look: { ...soft(gen(1, { age: v.age })), top: { style: 'suit', color: '#24304f' } } });
    return {
      bg: c.sky,
      back: (
        <>
          <Hills c={c} />
          {uni ? (
            <g>
              <path d="M96 42 L160 20 L224 42 Z" fill={c.wall} stroke="#00000022" />
              <rect x="100" y="42" width="120" height="6" fill={c.wall} />
              {Array.from({ length: 7 }, (_, i) => <rect key={i} x={104 + i * 17} y="48" width="6" height={G - 52} fill={c.wall} />)}
              <rect x="94" y={G - 4} width="132" height="4" fill={c.wall} />
            </g>
          ) : (
            <g><rect x="100" y="40" width="120" height={G - 40} fill={c.wall} /><path d="M94 40 L160 24 L226 40 Z" fill={c.roofC} />{[0, 1, 2, 3, 4].map((i) => <rect key={i} x={108 + i * 21} y="52" width="11" height="10" fill={c.roofC} opacity="0.3" />)}</g>
          )}
          <Tree x={34} c={c} /><Tree x={286} c={c} />
          {[0, 1, 2, 3, 4].map((i) => <rect key={'h' + i} className="fs-cap" x={120 + i * 18} y={12 + (i % 2) * 6} width="7" height="3" fill="#24304f" style={{ animationDelay: -i * 0.4 + 's' }} />)}
        </>
      ),
      people: ppl,
      fx: <Confetti />,
    };
  },
  date(v, c, k) {
    const pt = k.pt || { gender: v.gender === 'M' ? 'F' : 'M', age: v.age + 1 };
    return {
      bg: SKY.dusk,
      back: (
        <>
          <Hills c={c} />
          <Tree x={60} c={c} s={1.1} /><Tree x={262} c={c} />
          <path d="M210 92 V54" stroke="#3e3a44" strokeWidth="1.6" /><path d="M206 54 h8" stroke="#3e3a44" strokeWidth="2" /><circle cx="210" cy="57" r="3" fill="#ffe7a8" />
          <circle cx="210" cy="57" r="12" fill="#ffe7a8" opacity="0.2" />
          <rect x="132" y={G - 22} width="56" height="3" fill={c.trunk} />
        </>
      ),
      people: [{ x: 46, look: k.meLook, y: 84 }, { x: 54, look: soft(pt), y: 84 }],
      front: (
        <g>
          <rect x="130" y={G - 12} width="60" height="3" fill={c.trunk} />
          <rect x="133" y={G - 9} width="2" height="9" fill="#3e3a44" /><rect x="185" y={G - 9} width="2" height="9" fill="#3e3a44" />
          <path className="fs-heart" d="M160 44 c-3 -4 -8 0 0 6 c8 -6 3 -10 0 -6 Z" fill="#f26b7f" />
        </g>
      ),
    };
  },
  hosp(v, c, k) {
    const who = v.arg || 'me';
    const patient = who === 'kid' ? (k.kids[k.kids.length - 1] || gen(4)) : who === 'par' ? (k.mom || k.dad || gen(3)) : who === 'pt' ? (k.pt || gen(1)) : k.me;
    const pLook = { ...(patient.me ? k.meLook : soft(patient)), top: { style: 'pajama', color: '#9fc7e0' } };
    const vis = (patient.me ? [k.pt, ...k.kids, ...k.par] : [k.me, k.pt, ...k.kids]).filter((p) => p && p !== patient).slice(0, 3);
    const ppl = [{ x: 42, look: pLook, s: sizeOf(patient.age), y: 66 }];
    vis.forEach((p, i) => ppl.push({ x: 60 + i * 7, look: p.me ? k.meLook : soft(p), s: sizeOf(p.age) }));
    return {
      bg: '#e6f0ee',
      back: (
        <>
          <Room wall="#e6f0ee" floor="#cfdad8" tile win={[[30, 22]]} sky={(/#[0-9a-f]{6}/i.exec(c.sky) || ['#ffd7c2'])[0]} />
          <rect x="196" y="20" width="24" height="16" fill="#2e3a3a" /><path className="fs-pulse" d="M198 30 h5 l2 -6 l3 10 l2 -4 h8" stroke="#7be0a0" fill="none" strokeWidth="1" />
          <path d="M226 92 V30 M222 30 h8" stroke="#b9c4c8" strokeWidth="1.2" /><rect x="223" y="32" width="6" height="9" rx="1" fill="#dfeef5" stroke="#b9c4c8" strokeWidth="0.5" />
          <Bed x={108} w={70} hosp />
          <rect x="94" y={G - 18} width="10" height="18" fill="#d6dee0" /><path d="M99 74 q-3 -6 0 -9 q3 3 0 9" fill="#f6a5bd" />
        </>
      ),
      people: ppl,
      front: <BedFront x={108} w={70} color="#cfe3f0" />,
    };
  },
  loss(v, c, k) {
    const mourn = [k.me, k.pt, ...k.kids.filter((m) => m.age >= 4), ...k.sib].filter(Boolean).slice(0, 4);
    const xs = row(mourn.length, 40, 7.5);
    return {
      bg: SKY.cloud,
      back: (
        <>
          <Hills c={c} dim />
          <rect x="0" y="0" width="320" height="130" fill="#3a4050" opacity="0.18" />
          <Tree x={30} c={c} pine /><Tree x={58} c={c} pine s={0.8} /><Tree x={284} c={c} pine /><Tree x={304} c={c} pine s={0.7} />
          <rect x="196" y={G - 26} width="22" height="26" rx="6" fill="#c9c6c0" /><rect x="214" y={G - 22} width="4" height="22" fill="#a9a6a0" />
          <rect x="190" y={G - 2} width="34" height="3" fill="#8f8a82" />
          {[192, 198, 216, 222].map((x, i) => <circle key={i} cx={x} cy={G - 3} r="2.2" fill={i % 2 ? '#f4f1e6' : '#f2d36b'} />)}
          <path d="M120 14 l3 2 l3 -2 M136 20 l3 2 l3 -2" stroke="#3a3f4a" fill="none" strokeWidth="0.8" />
        </>
      ),
      people: mourn.map((p, i) => ({ x: xs[i], look: dressed(p, p.age < 13 ? '#3e3e48' : '#26252c'), s: sizeOf(p.age) })),
    };
  },
  fly(v, c, k) {
    const go = [k.me, k.pt, ...k.kids.filter((m) => m.age < 18)].filter(Boolean).slice(0, 4);
    const xs = row(go.length, 52, 7);
    const skyTop = (/#[0-9a-f]{6}/i.exec(c.sky) || ['#ffd7c2'])[0];
    return {
      bg: '#e9e6ea',
      back: (
        <>
          <Room wall="#e9e6ea" floor="#c9c6cc" tile win={[]} />
          <rect x="10" y="10" width="300" height="56" fill={skyTop} />
          {Array.from({ length: 11 }, (_, i) => <rect key={i} x={10 + i * 30} y="10" width="2" height="56" fill="#b9b6bc" />)}
          <rect x="10" y="62" width="300" height="4" fill="#b9b6bc" />
          <g className="fs-plane"><path d="M200 34 l30 -4 l6 -6 l3 0 l-3 7 l12 -1 l2 -3 l2 0 l-1 4 l-1 4 l-2 0 l-2 -3 l-12 -1 l3 7 l-3 0 l-6 -6 l-30 -2 Z" fill="#ffffff" stroke="#8a8f9a" strokeWidth="0.5" /></g>
          <rect x="24" y="70" width="44" height="12" fill="#2a2730" />
          {Array.from({ length: 3 }, (_, i) => <rect key={i} x="27" y={72 + i * 3.5} width={30 + (i % 2) * 8} height="1.6" fill="#ffd37a" />)}
        </>
      ),
      people: go.map((p, i) => ({ x: xs[i], look: p.me ? k.meLook : soft(p), s: sizeOf(p.age) })),
      front: <g><rect x={xs[0] * 3.2 - 22} y={G - 14} width="10" height="13" rx="1.5" fill="#d0583f" /><rect x={xs[0] * 3.2 - 19} y={G - 16} width="4" height="2" fill="#3e3a44" /></g>,
    };
  },
  flee(v, c, k) {
    const go = [k.me, k.pt, ...k.kids, ...k.par, ...k.sib].filter(Boolean).slice(0, 5);
    const xs = row(go.length, 54, 8);
    return {
      bg: SKY.smoke,
      back: (
        <>
          <Hills c={c} dim />
          {[[40, 50], [70, 40], [260, 46]].map(([x, y], i) => <g key={i} className="fs-smokecol" style={{ animationDelay: -i + 's' }}><circle cx={x} cy={y} r="10" fill="#7a706a" opacity="0.6" /><circle cx={x + 6} cy={y - 12} r="8" fill="#8a807a" opacity="0.5" /><circle cx={x + 2} cy={y - 24} r="6" fill="#9a908a" opacity="0.4" /></g>)}
          <path d="M110 130 L150 92 L176 92 L230 130 Z" fill="#c9b49c" />
        </>
      ),
      people: go.map((p, i) => ({ x: xs[i], look: p.me ? k.meLook : soft(p), s: sizeOf(p.age) })),
      front: <g>{xs.slice(0, 3).map((x, i) => <rect key={i} x={x * 3.2 + 3} y={G - 30} width="8" height="6" rx="1" fill={['#c9a27a', '#9fb0c0', '#b7a0c0'][i]} />)}</g>,
    };
  },
  rain(v, c, k) {
    return {
      bg: SKY.rain,
      back: (
        <>
          <rect x="0" y="40" width="320" height="52" fill="#5a6070" />
          {[[20, 30, 40], [70, 20, 52], [130, 36, 36], [190, 24, 48], [250, 34, 40]].map(([x, y, w], i) => <g key={i}><rect x={x} y={y} width={w} height={G - y} fill={['#4a505e', '#555b6a', '#4e5462'][i % 3]} />{Array.from({ length: 6 }, (_, j) => <rect key={j} x={x + 5 + (j % 3) * 12} y={y + 8 + Math.floor(j / 3) * 14} width="6" height="7" fill={j % 4 ? '#ffd37a' : '#6a7080'} opacity="0.7" />)}</g>)}
          <rect x="0" y={G} width="320" height={130 - G} fill="#3e434e" />
          <rect x="0" y={G + 4} width="320" height="2" fill="#ffffff" opacity="0.08" />
          <rect x="140" y={G - 13} width="40" height="3" fill="#6a5a4a" /><rect x="142" y={G - 10} width="2" height="10" fill="#2a2730" /><rect x="176" y={G - 10} width="2" height="10" fill="#2a2730" />
        </>
      ),
      people: [{ x: 50, look: k.meLook, y: 84 }],
      front: <g><path d="M145 97 Q160 83 175 97 Z" fill="#2e3a5a" /><path d="M160 97 V108" stroke="#2a2730" strokeWidth="0.8" /></g>,
      fx: <div className="fs-rain" aria-hidden="true">{Array.from({ length: 40 }, (_, i) => <i key={i} style={{ left: (i * 2.53) % 100 + '%', animationDelay: -(i * 0.11) % 0.9 + 's' }} />)}</div>,
    };
  },
  news(v, c, k) {
    const ppl0 = (k.par.length && v.age < 25 ? [...k.par, k.me, ...k.sib.slice(0, 1)] : [k.me, k.pt, ...k.kids.slice(0, 2)]).filter(Boolean).slice(0, 4);
    const xs = row(ppl0.length, 56, 7.5);
    const tv = (v.year || 2000) >= 1970;
    return {
      bg: '#efe2d0',
      back: (
        <>
          <Room wall="#efe2d0" floor="#c9b49c" win={[[250, 22]]} night frames={[40]} />
          <rect x="88" y={G - 22} width="34" height="22" fill="#8a6244" />
          {tv ? <g><rect x="90" y={G - 44} width="30" height="22" rx="2" fill="#2e2a33" /><rect className="fs-tv" x="93" y={G - 41} width="24" height="16" fill="#9fc7e0" /></g>
            : <g><rect x="92" y={G - 34} width="26" height="12" rx="3" fill="#b0784a" /><circle cx="100" cy={G - 28} r="4" fill="#5a3a2a" /><rect x="108" y={G - 31} width="7" height="2" fill="#5a3a2a" /><rect x="108" y={G - 27} width="7" height="2" fill="#5a3a2a" /></g>}
          <rect x="0" y="0" width="320" height="130" fill="#1a2040" opacity="0.12" />
        </>
      ),
      people: ppl0.map((p, i) => ({ x: xs[i], look: p.me ? k.meLook : soft(p), s: sizeOf(p.age) })),
    };
  },
  home(v, c, k) {
    const fam = [k.me, k.pt, ...k.kids].filter(Boolean).slice(0, 5);
    const xs = row(fam.length, 44, 7);
    return {
      bg: c.sky,
      back: (
        <>
          <Hills c={c} />
          <rect x="170" y="44" width="96" height={G - 44} fill={c.wall} />
          <path d="M162 46 L218 20 L274 46 Z" fill={c.roofC} />
          <rect x="210" y="66" width="16" height={G - 66} fill={c.trunk} />
          <rect x="182" y="56" width="18" height="14" fill="#9fc7e0" /><rect x="236" y="56" width="18" height="14" fill="#9fc7e0" />
          <Tree x={30} c={c} /><Tree x={296} c={c} s={0.9} />
        </>
      ),
      people: fam.map((p, i) => ({ x: xs[i], look: p.me ? k.meLook : soft(p), s: sizeOf(p.age) })),
      front: <g>{[[96, 0, 12], [108, 0, 10], [100, -7, 10]].map(([x, y, w], i) => <g key={i}><rect x={x} y={G - 8 + y} width={w} height="8" fill="#d9b98a" /><rect x={x + w / 2} y={G - 8 + y} width="1" height="8" fill="#f2e2c0" /></g>)}</g>,
      fx: <Confetti />,
    };
  },
  award(v, c, k) {
    const fam = (v.age < 20 ? k.par : [k.pt, ...k.kids]).filter(Boolean).slice(0, 3);
    return {
      bg: '#3a3550',
      back: (
        <>
          <rect x="0" y="0" width="320" height={G} fill="#3a3550" />
          {Array.from({ length: 30 }, (_, i) => <circle key={i} cx={(i * 37) % 320} cy={10 + ((i * 13) % 60)} r="1.2" fill={['#ffd37a', '#f6a5bd', '#9fc7e0'][i % 3]} opacity="0.6" />)}
          <path d="M120 0 L160 0 L210 92 L70 92 Z" fill="#fff6df" opacity="0.12" />
          <rect x="0" y={G} width="320" height={130 - G} fill="#2a2638" />
          <rect x="130" y={G - 8} width="60" height="8" fill="#6a5a8a" /><rect x="130" y={G - 8} width="60" height="1.5" fill="#ffd37a" />
        </>
      ),
      people: [{ x: 50, look: k.meLook, y: 80 }, ...fam.map((p, i) => ({ x: [30, 70, 22][i], look: soft(p), s: sizeOf(p.age) }))],
      front: <g><rect x="162" y={G - 30} width="9" height="7" fill="#fff6df" stroke="#ffd37a" strokeWidth="0.8" /><circle cx="166.5" cy={G - 26.5} r="1.5" fill="#e8584c" /></g>,
      fx: <Confetti />,
    };
  },
  party(v, c, k) {
    const fam = [k.pt, ...k.kids, ...k.sib].filter(Boolean).slice(0, 4);
    const xs = [34, 66, 26, 74];
    return {
      bg: '#f3e6d4',
      back: (
        <>
          <Room wall="#f3e6d4" floor="#cfb99a" win={[[248, 24]]} sky="#ffc9a4" frames={[30, 50]} />
          <Bunting y={14} from={20} to={300} n={14} />
          {[[88, 30], [232, 26]].map(([x, y], i) => <g key={i}><path d={`M${x} ${y + 8} V${y + 26}`} stroke="#b89a7c" strokeWidth="0.5" /><ellipse cx={x} cy={y} rx="5" ry="6" fill={['#f6a5bd', '#9fc7e0'][i]} /></g>)}
        </>
      ),
      people: [{ x: 50, look: k.meLook }, ...fam.map((p, i) => ({ x: xs[i], look: soft(p), s: sizeOf(p.age) }))],
      front: (
        <g>
          <rect x="122" y={G - 12} width="76" height="4" fill="#ffffff" /><rect x="126" y={G - 8} width="3" height="8" fill="#a87c5c" /><rect x="191" y={G - 8} width="3" height="8" fill="#a87c5c" />
          <rect x="150" y={G - 22} width="20" height="10" fill="#f6d2c4" /><rect x="150" y={G - 22} width="20" height="3" fill="#ffffff" />
          {[154, 160, 166].map((x) => <g key={x}><rect x={x - 0.5} y={G - 27} width="1" height="5" fill="#9fc7e0" /><ellipse className="fs-flame" cx={x} cy={G - 28.5} rx="1" ry="1.6" fill="#ffd27a" /></g>)}
        </g>
      ),
    };
  },
  prison(v, c, k) {
    return {
      bg: '#4a4a52',
      back: (
        <>
          <rect x="0" y="0" width="320" height={G} fill="#55555e" />
          {Array.from({ length: 40 }, (_, i) => <rect key={i} x={(i % 10) * 32 + ((Math.floor(i / 10) % 2) * 16)} y={Math.floor(i / 10) * 22} width="31" height="21" fill="none" stroke="#4a4a52" strokeWidth="0.8" />)}
          <rect x="140" y="18" width="40" height="18" fill="#9fb0c8" /><path d="M150 18 V36 M160 18 V36 M170 18 V36" stroke="#3a3a42" strokeWidth="1.6" />
          <rect x="0" y={G} width="320" height={130 - G} fill="#3a3a42" />
          <rect x="200" y={G - 14} width="60" height="6" fill="#7a7a84" />
        </>
      ),
      people: [{ x: 50, look: { ...k.meLook, top: { style: 'stripe', color: '#8a8f9a' } } }],
      front: <g>{Array.from({ length: 13 }, (_, i) => <rect key={i} x={6 + i * 24} y="0" width="3" height="130" fill="#2a2a30" />)}<rect x="0" y="0" width="320" height="4" fill="#2a2a30" /></g>,
    };
  },
  last(v, c, k) {
    const near = (v.age < 25 ? [...k.par, ...k.sib] : [k.pt, ...k.kids]).filter(Boolean).slice(0, 3);
    return {
      bg: '#566089',
      back: (
        <>
          <Room wall="#566089" floor="#3c4160" win={[[34, 22]]} night frames={[230]} />
          <ellipse cx="208" cy="58" rx="26" ry="20" fill="#ffe2a6" opacity="0.18" />
          <rect x="204" y={G - 20} width="10" height="20" fill="#5a4a5a" /><path d="M202 62 h14 l-3 -8 h-8 Z" fill="#ffe2a6" /><rect x="208" y="62" width="2" height="10" fill="#5a4a5a" />
          <Bed x={110} w={74} />
        </>
      ),
      people: [{ x: 44, look: { ...k.meLook, top: { style: 'pajama', color: '#b8b4d8' } }, y: 66, s: sizeOf(v.age) }, ...near.map((p, i) => ({ x: 61 + i * 7, look: soft(p), s: sizeOf(p.age) }))],
      front: <BedFront x={110} w={74} color="#8f88b8" />,
    };
  },
};

// ───────── 원래 있던 큰 장면 3개 ─────────
function Wedding({ v, c }) {
  const k = castOf(v);
  const me = v.gender;
  const bride = { group: 'adult', hair: { style: 'long', color: '#3a2c26' }, top: { style: 'dress', color: '#ffffff' }, hat: null };
  const groom = { group: 'adult', hair: { style: 'short', color: '#3a2c26' }, top: { style: 'suit', color: '#3a3f55' }, hat: null };
  const guests = [...k.par, ...k.sib, ...k.kids].concat(GEN).slice(0, 8);
  const slots = [36, 64, 28, 72, 20, 80, 12, 88];
  const flowers = [];
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI - (Math.PI * i) / 12;
    flowers.push([160 + Math.cos(a) * 24, 52 - Math.sin(a) * 24, i % 3]);
  }
  for (let y = 56; y <= 108; y += 8) { flowers.push([136, y, (y / 8) % 3]); flowers.push([184, y, (y / 8 + 1) % 3]); }
  const fc = ['#ffffff', '#f6a5bd', '#ffd37a'];
  return (
    <>
      <svg className="fs-art" viewBox="0 0 320 130" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <Hills c={c} />
        <Bunting y={16} />
        <Tree x={22} c={c} /><Tree x={298} c={c} />
        <path d="M150 92 L170 92 L196 130 L124 130 Z" fill="#fbf7f2" />
        <path d="M150 92 L124 130 M170 92 L196 130" stroke="#e8584c" strokeWidth="1.2" />
        {[0, 1, 2].map((r) => [0, 1].map((q) => (
          <g key={`${r}${q}`}>
            <rect x={(q ? 196 : 64) + r * 18} y={100 + r * 3} width="40" height="2" fill="#ffffff" opacity="0.9" />
            <rect x={(q ? 196 : 64) + r * 18} y={94 + r * 3} width="2" height="8" fill="#ffffff" opacity="0.9" />
          </g>
        )))}
        <path d="M136 112 V52 A24 24 0 0 1 184 52 V112" stroke="#ffffff" strokeWidth="3" fill="none" />
        {flowers.map(([x, y, q], i) => <circle key={i} cx={x} cy={y} r="3.2" fill={fc[q]} stroke="#e98aa6" strokeWidth="0.4" />)}
      </svg>
      {guests.map((g, i) => <Person key={i} x={slots[i]} s={sizeOf(g.age ?? 40)} look={soft(g)} />)}
      <Person x={46} look={me === 'F' ? bride : groom} />
      <Person x={54} look={me === 'F' ? groom : bride} />
      <div className="fs-petals" aria-hidden="true">{Array.from({ length: 14 }, (_, i) => <i key={i} style={{ left: (i * 7.3 + 3) % 100 + '%', animationDelay: -(i * 0.83) + 's', animationDuration: 5 + (i % 4) + 's' }} />)}</div>
    </>
  );
}

function Newborn({ v, c }) {
  const k = castOf(v);
  const skyTop = (/#[0-9a-f]{6}/i.exec(c.sky) || ['#ffd7c2'])[0];
  const kids = k.kids.filter((m) => m.age > 0);
  const baby = k.kids.find((m) => m.age === 0) || { gender: 'F', age: 0 };
  return (
    <>
      <svg className="fs-art" viewBox="0 0 320 130" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <Room win={[[36, 20]]} sky={skyTop} />
        {Array.from({ length: 9 }, (_, i) => <circle key={i} cx={196 + i * 13} cy={22 + Math.sin(i) * 2} r="4" fill={['#f6a5bd', '#9fc7e0', '#ffd37a'][i % 3]} />)}
        <path d="M190 20 Q250 30 310 20" stroke="#b89a7c" strokeWidth="0.6" fill="none" />
        <path d="M160 0 V30 M146 30 H174" stroke="#b89a7c" strokeWidth="0.8" />
        <g className="fs-mobile"><circle cx="146" cy="36" r="3" fill="#ffd37a" /><circle cx="160" cy="38" r="3" fill="#9fc7e0" /><circle cx="174" cy="36" r="3" fill="#f6a5bd" /></g>
        <rect x="136" y="70" width="48" height="30" fill="#ffffff" stroke="#c8a888" strokeWidth="1.2" />
        <rect x="138" y="88" width="44" height="8" fill="#cfe3f0" />
      </svg>
      {kids.slice(0, 3).map((m, i) => <Person key={m.id} x={[24, 76, 16][i]} s={sizeOf(m.age)} look={soft(m)} />)}
      <Person x={36} look={k.meLook} />
      {k.pt && <Person x={64} look={soft(k.pt)} />}
      <Person x={50} y={72} s={0.66} look={lookOf({ gender: baby.gender, age: 0 })} />
      <svg className="fs-art top" viewBox="0 0 320 130" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => <rect key={i} x={137 + i * 5.6} y="80" width="1.6" height="20" fill="#ffffff" stroke="#c8a888" strokeWidth="0.4" />)}
        <rect x="134" y="78" width="52" height="3" fill="#ffffff" stroke="#c8a888" strokeWidth="0.6" />
        <rect x="134" y="99" width="52" height="3" fill="#e9d6c0" />
      </svg>
    </>
  );
}

function Funeral({ v }) {
  const k = castOf(v);
  const p = v.portrait || { gender: v.gender, age: v.age, costume: v.costume };
  const mourners = [...k.all].concat(GEN).slice(0, 8);
  const slots = [36, 64, 28, 72, 20, 80, 12, 88];
  const mums = [];
  for (let r = 0; r < 6; r++) {
    const w = 44 + r * 10;
    for (let x = 160 - w; x <= 160 + w; x += 7) mums.push([x + (r % 2) * 3, 28 + r * 7, (x + r) % 5 === 0]);
  }
  return (
    <>
      <svg className="fs-art" viewBox="0 0 320 130" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
        <defs><radialGradient id="fsGlow" cx="50%" cy="40%" r="50%"><stop offset="0%" stopColor="#fff3dc" stopOpacity="0.35" /><stop offset="100%" stopColor="#fff3dc" stopOpacity="0" /></radialGradient></defs>
        <rect x="0" y="0" width="320" height="92" fill="#34313a" />
        <rect x="0" y="0" width="320" height="92" fill="url(#fsGlow)" />
        <rect x="0" y="80" width="320" height="12" fill="#2a2730" />
        <rect x="0" y="92" width="320" height="38" fill="#1f1d23" />
        {mums.map(([x, y, g], i) => <circle key={i} cx={x} cy={y} r="3.4" fill={g ? '#f2d36b' : '#f4f1e6'} stroke="#d8d2c2" strokeWidth="0.4" />)}
        <rect x="104" y="72" width="112" height="20" fill="#4a4350" />
        <rect x="100" y="70" width="120" height="4" fill="#f4f1e6" />
        <rect x="157" y="64" width="6" height="6" fill="#8a7a62" />
        <path className="fs-smoke" d="M160 64 q-4 -8 0 -14 q4 -6 0 -14" stroke="#e8e4da" strokeWidth="0.8" fill="none" opacity="0.5" />
        {[124, 196].map((x) => <g key={x}><rect x={x - 2} y="58" width="4" height="12" fill="#f4f1e6" /><ellipse className="fs-flame" cx={x} cy="55" rx="1.6" ry="3" fill="#ffd27a" /></g>)}
        <rect x="144" y="30" width="32" height="34" fill="#141316" />
        <rect x="147" y="33" width="26" height="28" fill="#e8e4da" />
        <path d="M144 30 L152 30 L144 38 Z M176 30 L168 30 L176 38 Z" fill="#000000" />
      </svg>
      <div className="fs-portrait"><Figure look={lookOf({ gender: p.gender, age: p.age, costume: p.costume })} /></div>
      {mourners.map((m, i) => <Person key={i} x={slots[i]} s={sizeOf(m.age ?? 40)} look={dressed(m, (m.age ?? 40) < 13 ? '#3e3e48' : '#26252c')} dim={i >= 6} />)}
    </>
  );
}

function FilmScene({ v }) {
  const mode = useTheme();
  const info = COUNTRIES[v.countryCode] || ['', 'EAST'];
  const c = (THEMES[info[1]] || THEMES.EAST)[mode];
  if (v.scene === 'wedding') return <div className="fs" style={{ background: c.sky }}><Wedding v={v} c={c} /></div>;
  if (v.scene === 'newborn') return <div className="fs" style={{ background: '#f4ece2' }}><Newborn v={v} c={c} /></div>;
  if (v.scene === 'funeral') return <div className="fs" style={{ background: '#34313a' }}><Funeral v={v} /></div>;
  const make = SCENES[v.scene];
  if (!make) return null;
  const s = make(v, c, castOf(v));
  return (
    <div className={'fs fs-' + v.scene} style={{ background: s.bg }}>
      <svg className="fs-art" viewBox="0 0 320 130" preserveAspectRatio="xMidYMax slice" aria-hidden="true">{s.back}</svg>
      {s.people.map((p, i) => <Person key={i} {...p} />)}
      {s.front && <svg className="fs-art top" viewBox="0 0 320 130" preserveAspectRatio="xMidYMax slice" aria-hidden="true">{s.front}</svg>}
      {s.fx}
    </div>
  );
}

// 마을 그림 위에 사람만 더 세울 때 (일 시작 · 승진: 동료) - 나는 마을 56% 자리라 양옆에
export function Crowd({ people }) {
  const xs = [40, 70, 30, 78];
  return (
    <div className="fs-crowd">
      {people.slice(0, 4).map((p, i) => <Person key={i} x={xs[i]} look={soft(p)} s={sizeOf(p.age)} />)}
    </div>
  );
}

export default FilmScene;
