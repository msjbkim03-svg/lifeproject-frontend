// C08 마을 이동 (인생 진행 화면 가운데 게임 화면)
// - 마을 장소가 한 화면씩 이어져 있어요: 우리 집 → 학교 → 대학교 → 마을회관 → 시장 → 일터 → 보건소 → 공원
// - 오른쪽 끝까지 걸어가면 화면이 넘어가며 다음 장소, 왼쪽 끝이면 이전 장소로 가요
// - 땅을 누르면 그 자리까지 걷고, ←·→ 방향키를 누르고 있으면 계속 걸어요. 양 끝 화살표(◀ 학교 / 마을회관 ▶)를 누르면 옆 장소로 가요
// - place 가 바뀌면 (학교 입학, 취업, 은퇴 …) 장소 화면을 하나씩 지나 그 장소 앞까지 알아서 걸어가요 (villageData.placeOf)
// - 권역(동·동남·남·중앙·서아시아)은 풍경·지붕 모양만 바꾸고, 라이트 테마는 노을 마을, 다크 테마는 밤 마을
// 사용법:
// <Village countryCode="IND" age={34} gender="M" place="work" urban
//    caption="인도 · 청년기 (34세, 공장 조장)"
//    myMessage="안녕하세요"                       ← 내가 보낸 채팅 (C15, 없으면 생략)
//    others={[{ id: 1, name: '라훌', age: 30, place: 'hall', x: 40, message: '반가워요' }]}  ← 같은 나라 접속자 (C15)
//    costume={{ hair: 'HAIR_02', top: 'TOP_01', hat: null }}  ← 입은 착장 (C21, costumeData.js 코드, 없으면 기본 모습)
//    family={[{ id: 'mom', label: '엄마', gender: 'F', age: 58 }]}  ← 우리 집에 같이 사는 가족 (부모·형제자매·배우자·자녀)
//    house={{ tier: 4, kind: 'own' }}  ← 우리 집 모양 (villageData.houseOf, 없으면 3단계 부모님 집)
//    vehicle="CAR"                     ← 집 앞 탈것 CAR / MOTO / BIKE (villageData.vehicleOf, 없으면 null)
//    industry="SERVICE"                ← 직업 산업 AGRI / INDUSTRY / SERVICE (일터 그림, 없으면 도시·시골로만)
// 가족: '우리 집' 화면에만 있고, 집 앞을 천천히 왔다 갔다 해요 (조작은 나만). 자녀가 생기면 늘어나요
import { useEffect, useRef, useState } from 'react';
import { COUNTRIES, THEMES, PLACES, MIN_X, MAX_X, EDGE, DOOR_X, GROUND_Y, SPEED, SKY_STARS, HOUSE_KINDS } from './villageData';
import { useTheme } from '../../common/theme';
import Figure from './Figure';
import { lookOf, ageGroup } from './costumeData';
import './village.css';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const idxOf = (id) => Math.max(0, PLACES.findIndex((p) => p.id === id));

// ───────── 그림 부품 (SVG 320 × 130, 땅은 y 92 부터) ─────────

// 지붕 (권역마다 모양이 다름)
function Roof({ kind, x, y, w, c }) {
  if (kind === 'dome') return <path d={`M${x + 4} ${y} Q${x + w / 2} ${y - w * 0.45} ${x + w - 4} ${y} Z`} fill={c.roofC} />;
  if (kind === 'yurt') return <path d={`M${x - 2} ${y + 2} Q${x + w / 2} ${y - w * 0.5} ${x + w + 2} ${y + 2} Z`} fill={c.roofC} />;
  if (kind === 'flat') return <rect x={x - 3} y={y - 5} width={w + 6} height={6} rx="1" fill={c.roofC} />;
  if (kind === 'stilt') return <path d={`M${x - 6} ${y} L${x + w / 2} ${y - w * 0.35} L${x + w + 6} ${y} Z`} fill={c.roofC} />;
  return <path d={`M${x - 8} ${y + 1} Q${x - 2} ${y} ${x + 3} ${y - 9} L${x + w - 3} ${y - 9} Q${x + w + 2} ${y} ${x + w + 8} ${y + 1} Z`} fill={c.roofC} />;
}

// 건물 한 채: x, 위쪽 y, 너비 w (바닥은 92)
function House({ x, y, w, c, roof, door = true, win = 2 }) {
  const h = 92 - y;
  const ws = [];
  for (let i = 0; i < win; i++) {
    const wx = x + (w / (win + 1)) * (i + 1) - 4;
    ws.push(<rect key={i} x={wx} y={y + 7} width="8" height="7" rx="1" fill={c.roofC} opacity="0.3" />);
  }
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={c.wall} />
      <Roof kind={roof} x={x} y={y} w={w} c={c} />
      {ws}
      {door && <rect x={x + w / 2 - 5} y={92 - 15} width="10" height="15" rx="1" fill={c.roofC} opacity="0.75" />}
    </g>
  );
}

function Tree({ x, kind, c, s = 1 }) {
  if (kind === 'palm') {
    return (
      <g transform={`translate(${x} 92) scale(${s})`}>
        <path d="M0 0 C-1 -12 -2 -22 1 -32" stroke={c.trunk} strokeWidth="2.6" fill="none" />
        <path d="M1 -32 C-6 -38 -14 -36 -18 -30 M1 -32 C8 -38 16 -36 20 -30 M1 -32 C-3 -40 -9 -44 -15 -42 M1 -32 C5 -40 11 -44 17 -42" stroke={c.leaf} strokeWidth="3.4" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  if (kind === 'grass') {
    return (
      <g transform={`translate(${x} 92) scale(${s})`}>
        <path d="M-6 0 C-5 -7 -7 -11 -10 -14 M0 0 C0 -9 2 -14 5 -17 M6 0 C6 -6 8 -10 12 -12" stroke={c.leaf} strokeWidth="2" fill="none" strokeLinecap="round" />
      </g>
    );
  }
  return (
    <g transform={`translate(${x} 92) scale(${s})`}>
      <rect x="-1.5" y="-16" width="3" height="16" fill={c.trunk} />
      <circle cx="0" cy="-24" r="12" fill={c.leaf} />
      {kind === 'blossom' && <><circle cx="-5" cy="-27" r="1.6" fill="#fff" opacity="0.75" /><circle cx="4" cy="-22" r="1.6" fill="#fff" opacity="0.75" /></>}
    </g>
  );
}

function Bench({ x, c }) {
  return (
    <g>
      <rect x={x} y="84" width="22" height="3" rx="1" fill={c.trunk} />
      <rect x={x + 2} y="87" width="2" height="5" fill={c.trunk} />
      <rect x={x + 18} y="87" width="2" height="5" fill={c.trunk} />
      <rect x={x} y="78" width="22" height="2.5" rx="1" fill={c.trunk} opacity="0.8" />
    </g>
  );
}

// ───────── 우리 집 (가정형편 5단계, villageData.houseOf) ─────────
// tier 1 흙수저 판잣집 ~ 5 다이아수저 저택, 문은 모두 x 160 (DOOR_X 50%)
// 큰 집(4·5단계)은 높은 지붕(돔·유르트·다락)이 화면 위로 잘려서 평지붕으로 바꿈 (돔은 가운데 작은 돔 장식)
function bigRoof(roof) {
  return roof === 'dome' || roof === 'yurt' || roof === 'stilt' ? 'flat' : roof;
}

// 빨랫줄 (1~3단계 마당)
function Laundry({ x, c }) {
  return (
    <g>
      <path d={`M${x} 92 V70 M${x + 52} 92 V70 M${x} 72 Q${x + 26} 78 ${x + 52} 72`} stroke={c.trunk} strokeWidth="1.4" fill="none" />
      <rect x={x + 12} y="74" width="7" height="9" fill="#ffffff" opacity="0.85" />
      <rect x={x + 26} y="75" width="9" height="7" fill={c.leaf} opacity="0.8" />
    </g>
  );
}

// 낮은 나무 울타리
function Fence({ x, w, c }) {
  const posts = [];
  for (let px = x; px <= x + w; px += 8) posts.push(`M${px} 92 V84`);
  return <path d={posts.join(' ') + ` M${x - 4} 86 H${x + w + 4}`} stroke={c.trunk} strokeWidth="1.3" />;
}

// 둥근 정원수 (4·5단계), y = 윗변 높이
function Hedge({ x, w, c, y = 83 }) {
  return <rect x={x} y={y} width={w} height={92 - y} rx="4.5" fill={c.leaf} />;
}

function HomeScene({ tier, c, roof, deco }) {
  // 1 흙수저: 판잣집 (기운 양철 지붕, 덧댄 벽, 창문 없음)
  if (tier <= 1) {
    return (
      <g>
        <Tree x={52} kind={deco} c={c} s={0.8} />
        <rect x="138" y="70" width="44" height="22" fill={c.wall} />
        <rect x="140" y="74" width="10" height="7" fill={c.trunk} opacity="0.25" />
        <rect x="170" y="80" width="9" height="8" fill={c.trunk} opacity="0.2" />
        <path d="M134 72 L186 64 L186 68 L134 76 Z" fill={c.roofC} opacity="0.85" />
        <path d="M144 70 L144 66 M160 68 L160 64 M176 66 L176 62" stroke={c.trunk} strokeWidth="0.8" opacity="0.5" />
        <rect x="155" y="78" width="10" height="14" fill={c.trunk} opacity="0.8" />
        <rect x="196" y="84" width="12" height="8" fill={c.trunk} opacity="0.7" />
        <path d="M196 86 H208 M196 89 H208" stroke={c.wall} strokeWidth="0.6" opacity="0.6" />
        <ellipse cx="124" cy="90" rx="5" ry="2.5" fill={c.roofC} opacity="0.6" />
        <Laundry x={222} c={c} />
      </g>
    );
  }

  // 2 동수저: 작은 단층집
  if (tier === 2) {
    return (
      <g>
        <Tree x={50} kind={deco} c={c} s={1} />
        <House x={134} y={roof === 'stilt' ? 58 : 64} w={52} c={c} roof={roof} win={2} />
        {roof === 'stilt' && <path d="M138 92 V86 M182 92 V86" stroke={c.trunk} strokeWidth="2" />}
        <Fence x={96} w={24} c={c} />
        <Laundry x={210} c={c} />
        <Tree x={292} kind={deco} c={c} s={0.75} />
      </g>
    );
  }

  // 3 은수저: 보통 단층 주택 + 울타리 (원래 우리 집 그림)
  if (tier === 3) {
    return (
      <g>
        <Tree x={46} kind={deco} c={c} s={1.1} />
        <House x={125} y={roof === 'stilt' ? 52 : 58} w={70} c={c} roof={roof} />
        {roof === 'stilt' && <path d="M131 92 V86 M189 92 V86" stroke={c.trunk} strokeWidth="2" />}
        <Laundry x={210} c={c} />
        <Fence x={86} w={32} c={c} />
        <Tree x={290} kind={deco} c={c} s={0.8} />
      </g>
    );
  }

  // 4 금수저: 2층 양옥 + 정원
  if (tier === 4) {
    const r = bigRoof(roof);
    return (
      <g>
        <Tree x={58} kind={deco} c={c} s={1.15} />
        <Tree x={272} kind={deco} c={c} s={1.05} />
        <House x={116} y={38} w={88} c={c} roof={r} win={3} />
        {roof === 'dome' && <Roof kind="dome" x={148} y={34} w={24} c={c} />}
        <path d="M116 64 H204" stroke={c.roofC} strokeWidth="1" opacity="0.35" />
        <rect x="126" y="70" width="10" height="9" rx="1" fill={c.roofC} opacity="0.3" />
        <rect x="184" y="70" width="10" height="9" rx="1" fill={c.roofC} opacity="0.3" />
        <Hedge x={92} w={18} c={c} />
        <Hedge x={210} w={22} c={c} />
        {[96, 102, 214, 222].map((fx) => <circle key={fx} cx={fx} cy="83" r="1.8" fill="#f2a23a" />)}
      </g>
    );
  }

  // 5 다이아수저: 저택 (넓은 2층 + 기둥 현관 + 담장·대문 + 정원)
  const r = bigRoof(roof);
  return (
    <g>
      <Tree x={36} kind={deco} c={c} s={1.25} />
      <Tree x={286} kind={deco} c={c} s={1.25} />
      <House x={98} y={34} w={124} c={c} roof={r} win={5} door={false} />
      {roof === 'dome' && <Roof kind="dome" x={144} y={30} w={32} c={c} />}
      <path d="M98 62 H222" stroke={c.roofC} strokeWidth="1" opacity="0.35" />
      {[106, 122, 190, 206].map((wx) => <rect key={wx} x={wx} y="68" width="10" height="10" rx="1" fill={c.roofC} opacity="0.3" />)}
      <path d="M144 56 L160 47 L176 56 Z" fill={c.roofC} />
      <rect x="144" y="56" width="32" height="3" fill={c.wall} stroke={c.roofC} strokeWidth="0.6" />
      {[146, 158.5, 171].map((px) => <rect key={px} x={px} y="59" width="3" height="33" fill={c.wall} stroke={c.roofC} strokeWidth="0.5" />)}
      <rect x="154" y="74" width="12" height="18" rx="1" fill={c.roofC} opacity="0.8" />
      <Hedge x={60} w={26} c={c} y={76} />
      <Hedge x={236} w={26} c={c} y={76} />
      <rect x="24" y="85" width="118" height="7" fill={c.wall} stroke={c.roofC} strokeWidth="0.6" strokeOpacity="0.5" />
      <rect x="178" y="85" width="118" height="7" fill={c.wall} stroke={c.roofC} strokeWidth="0.6" strokeOpacity="0.5" />
      <rect x="138" y="78" width="6" height="14" fill={c.roofC} />
      <rect x="176" y="78" width="6" height="14" fill={c.roofC} />
      <circle cx="141" cy="77" r="2.4" fill="#ffe7a8" />
      <circle cx="179" cy="77" r="2.4" fill="#ffe7a8" />
    </g>
  );
}

// 집 앞 탈것 (C06-3 가진 물건 owns: CAR 자동차 / MOTO 오토바이 / BIKE 자전거, villageData.vehicleOf)
// x = 왼쪽 끝, 바퀴 아래가 땅과 길 사이 (y 103) / 바퀴는 밤에도 보이게 회색
function Vehicle({ kind, x }) {
  if (kind === 'CAR') {
    return (
      <g>
        <path d={`M${x + 7} 94 L${x + 11} 88 H${x + 22} L${x + 27} 94 Z`} fill="#5b86c9" />
        <path d={`M${x + 12.5} 89.5 H${x + 17} V93.5 H${x + 10} Z M${x + 18.5} 89.5 H${x + 21.5} L${x + 24.5} 93.5 H${x + 18.5} Z`} fill="#ffffff" opacity="0.75" />
        <rect x={x} y="93.5" width="34" height="7" rx="2.5" fill="#5b86c9" />
        <rect x={x + 30} y="95" width="3" height="2" rx="0.6" fill="#ffe7a8" />
        <circle cx={x + 8} cy="100.5" r="3" fill="#2f2f38" /><circle cx={x + 8} cy="100.5" r="1.2" fill="#cfd3da" />
        <circle cx={x + 26} cy="100.5" r="3" fill="#2f2f38" /><circle cx={x + 26} cy="100.5" r="1.2" fill="#cfd3da" />
      </g>
    );
  }
  if (kind === 'MOTO') {
    return (
      <g>
        <circle cx={x + 3.5} cy="100" r="3.2" fill="none" stroke="#7a7f8c" strokeWidth="1.6" />
        <circle cx={x + 19.5} cy="100" r="3.2" fill="none" stroke="#7a7f8c" strokeWidth="1.6" />
        <path d={`M${x + 3.5} 100 L${x + 8} 95 H${x + 15} L${x + 19.5} 100`} stroke="#d0563b" strokeWidth="2.2" fill="none" strokeLinejoin="round" />
        <rect x={x + 6} y="92.6" width="7" height="2.4" rx="1.2" fill="#7a7f8c" />
        <path d={`M${x + 16} 95 L${x + 17.5} 90.5 H${x + 20}`} stroke="#7a7f8c" strokeWidth="1.2" fill="none" />
      </g>
    );
  }
  // BIKE
  return (
    <g>
      <circle cx={x + 3.5} cy="100" r="3.4" fill="none" stroke="#7a7f8c" strokeWidth="1" />
      <circle cx={x + 17.5} cy="100" r="3.4" fill="none" stroke="#7a7f8c" strokeWidth="1" />
      <path d={`M${x + 3.5} 100 L${x + 8} 94.5 H${x + 14.5} L${x + 17.5} 100 M${x + 8} 94.5 L${x + 10.5} 100 L${x + 14.5} 94.5 M${x + 7} 93 H${x + 9.5} M${x + 14.5} 94.5 L${x + 15.5} 91.5 H${x + 17.5}`}
        stroke="#3f8f6a" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </g>
  );
}

// 대학교 (C08 장소 보강): 기둥 현관·시계가 있는 본관 + 양쪽 날개 건물(권역 지붕) + 깃발·가로등, 문은 x 160
function UnivScene({ c, roof, deco }) {
  const r = bigRoof(roof);
  return (
    <g>
      <Tree x={36} kind={deco} c={c} s={1.1} />
      <House x={80} y={56} w={46} c={c} roof={r} win={2} door={false} />
      <House x={194} y={56} w={46} c={c} roof={r} win={2} door={false} />
      <rect x="122" y="40" width="76" height="52" fill={c.wall} />
      <path d="M116 40 L160 22 L204 40 Z" fill={c.roofC} />
      <rect x="116" y="40" width="88" height="4" fill={c.roofC} opacity="0.85" />
      <circle cx="160" cy="33" r="4" fill="#ffffff" stroke={c.roofC} strokeWidth="1" />
      <path d="M160 33 V30.6 M160 33 H162" stroke={c.roofC} strokeWidth="0.8" />
      {[128, 140, 176, 188].map((px) => <rect key={px} x={px} y="44" width="4" height="45" fill={c.wall} stroke={c.roofC} strokeWidth="0.5" />)}
      {[128, 140, 176, 188].map((px) => <rect key={'w' + px} x={px - 1} y="44" width="6" height="2" fill={c.roofC} opacity="0.5" />)}
      <rect x="152" y="70" width="16" height="19" rx="1" fill={c.roofC} opacity="0.8" />
      <rect x="150" y="52" width="20" height="9" rx="1" fill={c.roofC} opacity="0.3" />
      <rect x="142" y="89" width="36" height="3" fill={c.road} />
      <path d="M256 92 V48" stroke={c.trunk} strokeWidth="1.4" />
      <path d="M256 49 h15 l-3 4 l3 4 h-15 Z" fill="#4a7bd0" />
      <path d="M276 92 V66 M272 66 h8" stroke={c.trunk} strokeWidth="1.4" />
      <circle cx="276" cy="64" r="3" fill="#ffe7a8" />
      <Tree x={300} kind={deco} c={c} s={0.9} />
    </g>
  );
}

// ───────── 일터 (직업 산업별, C08 장소 보강) ─────────
// industry: AGRI 농업 → 논밭 / INDUSTRY 공업 → 공장 / SERVICE 서비스 → 도시는 사무실, 시골은 가게
// industry 가 없으면(서버에 아직 없음) 예전처럼 도시는 사무실+공장, 시골은 논밭

// 논밭 (원래 시골 일터 그림)
function FarmScene({ c, roof }) {
  return (
    <g>
      {[0, 1, 2, 3, 4, 5].map((r) => (
        <path key={r} d={`M20 ${80 + r * 2} Q160 ${76 + r * 2} 300 ${80 + r * 2}`} stroke={c.leaf} strokeWidth="1.6" fill="none" opacity={0.5 + r * 0.08} />
      ))}
      <House x={226} y={60} w={50} c={c} roof={roof} win={1} />
      <path d="M60 92 V70 M54 74 L66 74 M56 70 Q60 64 64 70" stroke={c.trunk} strokeWidth="1.6" fill="none" />
      <circle cx="60" cy="67" r="3.4" fill="#f2c9a0" />
    </g>
  );
}

// 사무실 + 공장 (원래 도시 일터 그림)
function MixedWorkScene({ c }) {
  return (
    <g>
      <rect x="70" y="40" width="70" height="52" fill={c.wall} />
      {[0, 1, 2].map((r) => [0, 1, 2, 3].map((k) => <rect key={r + '-' + k} x={78 + k * 15} y={47 + r * 12} width="9" height="7" fill={c.roofC} opacity="0.3" />))}
      <rect x="98" y="78" width="14" height="14" fill={c.roofC} opacity="0.75" />
      <rect x="166" y="60" width="96" height="32" fill={c.wall} />
      <path d="M166 60 l16 -10 v10 l16 -10 v10 l16 -10 v10 l16 -10 v10 l16 -10 v10 Z" fill={c.roofC} />
      <rect x="246" y="30" width="8" height="30" fill={c.trunk} />
      <circle cx="252" cy="24" r="5" fill="#ffffff" opacity="0.6" /><circle cx="259" cy="17" r="6" fill="#ffffff" opacity="0.45" />
      <rect x="196" y="76" width="18" height="16" fill={c.roofC} opacity="0.75" />
    </g>
  );
}

// 공장: 톱니 지붕 + 굴뚝 2개 + 큰 하역 문(가운데 x 160) + 컨테이너
function FactoryScene({ c, deco }) {
  return (
    <g>
      <rect x="30" y="80" width="26" height="12" fill="#c9544a" opacity="0.75" />
      <rect x="58" y="80" width="26" height="12" fill="#4a7bd0" opacity="0.75" />
      <rect x="40" y="68" width="26" height="12" fill="#f2a23a" opacity="0.75" />
      <rect x="226" y="24" width="8" height="40" fill={c.trunk} />
      <rect x="240" y="32" width="7" height="32" fill={c.trunk} />
      <circle cx="232" cy="18" r="5" fill="#ffffff" opacity="0.6" /><circle cx="239" cy="11" r="6" fill="#ffffff" opacity="0.45" />
      <circle cx="245" cy="26" r="4" fill="#ffffff" opacity="0.5" />
      <rect x="100" y="60" width="140" height="32" fill={c.wall} />
      <path d="M100 60 l20 -12 v12 l20 -12 v12 l20 -12 v12 l20 -12 v12 l20 -12 v12 l20 -12 v12 l20 -12 v12 Z" fill={c.roofC} />
      {[0, 1, 2, 3, 4, 5, 6].map((k) => <rect key={k} x={106 + k * 19} y="65" width="10" height="5" fill={c.roofC} opacity="0.3" />)}
      <rect x="150" y="74" width="20" height="18" fill={c.roofC} opacity="0.75" />
      <path d="M150 78 H170 M150 82 H170 M150 86 H170" stroke={c.wall} strokeWidth="0.6" opacity="0.6" />
      <Tree x={292} kind={deco} c={c} s={0.9} />
    </g>
  );
}

// 사무실 (도시 서비스업): 유리 빌딩 + 낮은 빌딩 + 버스 정류장
function OfficeScene({ c, deco }) {
  return (
    <g>
      <Tree x={40} kind={deco} c={c} s={1} />
      <path d="M78 92 V64 M72 64 h12" stroke={c.trunk} strokeWidth="1.4" />
      <rect x="72" y="58" width="12" height="7" rx="1" fill="#4a9a7a" />
      <rect x="128" y="24" width="64" height="68" fill={c.wall} />
      <rect x="128" y="24" width="64" height="4" fill={c.roofC} />
      {[0, 1, 2, 3, 4].map((r) => [0, 1, 2, 3].map((k) => (
        <rect key={r + '-' + k} x={134 + k * 14} y={32 + r * 9} width="10" height="6" fill="#7fb0d8" opacity="0.55" />
      )))}
      <rect x="152" y="76" width="16" height="16" fill="#7fb0d8" opacity="0.8" />
      <path d="M160 76 V92" stroke={c.wall} strokeWidth="0.8" />
      <rect x="206" y="48" width="44" height="44" fill={c.wall} />
      <rect x="206" y="48" width="44" height="3" fill={c.roofC} />
      {[0, 1, 2].map((r) => [0, 1, 2].map((k) => (
        <rect key={'b' + r + '-' + k} x={212 + k * 13} y={56 + r * 10} width="8" height="6" fill={c.roofC} opacity="0.3" />
      )))}
      <Tree x={286} kind={deco} c={c} s={0.85} />
    </g>
  );
}

// 가게 (시골 서비스업): 줄무늬 차양 + 간판 + 진열창
function ShopScene({ c, roof, deco }) {
  return (
    <g>
      <Tree x={50} kind={deco} c={c} s={1} />
      <House x={116} y={56} w={88} c={c} roof={bigRoof(roof)} win={0} door={false} />
      <rect x="132" y="60" width="56" height="10" rx="2" fill={c.roofC} />
      <text x="160" y="67.5" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="#ffffff" fontFamily="sans-serif">가게</text>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((k) => (
        <path key={k} d={`M${114 + k * 11.5} 72 h11.5 v5 q-5.75 3 -11.5 0 Z`} fill={k % 2 ? '#ffffff' : '#e8584c'} opacity="0.9" />
      ))}
      <rect x="122" y="79" width="24" height="11" fill="#7fb0d8" opacity="0.5" />
      <rect x="174" y="79" width="24" height="11" fill="#7fb0d8" opacity="0.5" />
      {[0, 1, 2].map((k) => <circle key={k} cx={127 + k * 7} cy="87" r="2" fill={['#f2a23a', '#7bb35a', '#e8584c'][k]} />)}
      <rect x="153" y="77" width="14" height="15" fill={c.roofC} opacity="0.75" />
      <rect x="214" y="84" width="10" height="8" fill={c.trunk} opacity="0.7" />
      <rect x="228" y="86" width="8" height="6" fill={c.trunk} opacity="0.55" />
      <Tree x={290} kind={deco} c={c} s={0.85} />
    </g>
  );
}

function WorkScene({ industry, urban, c, roof, deco }) {
  if (industry === 'AGRI') return <FarmScene c={c} roof={roof} />;
  if (industry === 'INDUSTRY') return <FactoryScene c={c} deco={deco} />;
  if (industry === 'SERVICE') return urban ? <OfficeScene c={c} deco={deco} /> : <ShopScene c={c} roof={roof} deco={deco} />;
  return urban ? <MixedWorkScene c={c} /> : <FarmScene c={c} roof={roof} />;
}

// 장소별 장면
function Scene({ place, c, t, urban, house, vehicle, industry }) {
  const roof = t.roof;
  const deco = t.deco;
  switch (place) {
    case 'home':
      return (
        <g>
          <HomeScene tier={house.tier} c={c} roof={roof} deco={deco} />
          {vehicle && <Vehicle kind={vehicle} x={232} />}
        </g>
      );
    case 'univ':
      return <UnivScene c={c} roof={roof} deco={deco} />;
    case 'school':
      return (
        <g>
          <path d="M34 92 V64 M66 92 V64 M34 64 H66 M44 64 V80 M56 64 V78" stroke={c.trunk} strokeWidth="1.6" fill="none" />
          <rect x="40" y="80" width="8" height="2" fill={c.roofC} /><rect x="52" y="78" width="8" height="2" fill={c.roofC} />
          <rect x="96" y="44" width="136" height="48" fill={c.wall} />
          <Roof kind={roof === 'stilt' ? 'flat' : roof} x={96} y={44} w={136} c={c} />
          {[0, 1, 2, 3, 4, 5].map((i) => <rect key={'u' + i} x={104 + i * 21} y="52" width="11" height="9" rx="1" fill={c.roofC} opacity="0.3" />)}
          {[0, 1, 2, 4, 5].map((i) => <rect key={'d' + i} x={104 + i * 21} y="68" width="11" height="9" rx="1" fill={c.roofC} opacity="0.3" />)}
          <rect x="157" y="76" width="14" height="16" fill={c.roofC} opacity="0.75" />
          <circle cx="164" cy="36" r="6" fill="#ffffff" stroke={c.roofC} strokeWidth="1.4" />
          <path d="M164 36 V32.5 M164 36 H166.5" stroke={c.roofC} strokeWidth="1" />
          <path d="M256 92 V44" stroke={c.trunk} strokeWidth="1.4" />
          <path d="M256 45 h16 l-3 4 l3 4 h-16 Z" fill="#f26b38" />
          <Tree x={292} kind={deco} c={c} s={0.9} />
        </g>
      );
    case 'hall':
      return (
        <g>
          <Tree x={40} kind={deco} c={c} s={0.95} />
          <House x={110} y={50} w={100} c={c} roof={roof} win={3} />
          <rect x="132" y="56" width="56" height="13" rx="2" fill={c.roofC} />
          <text x="160" y="65.5" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#ffffff" fontFamily="sans-serif">마을회관</text>
          <rect x="226" y="66" width="26" height="18" rx="1" fill={c.trunk} />
          <rect x="228" y="68" width="22" height="14" fill="#ffffff" opacity="0.9" />
          <path d="M231 71 h14 M231 74 h10 M231 77 h12" stroke={c.roofC} strokeWidth="1" opacity="0.6" />
          <path d="M232 84 V92 M246 84 V92" stroke={c.trunk} strokeWidth="1.6" />
          <Bench x={64} c={c} />
          <Bench x={264} c={c} />
        </g>
      );
    case 'market':
      return (
        <g>
          {[0, 1, 2, 3].map((i) => {
            const x = 30 + i * 70;
            const cols = [c.roofC, '#f2a23a', '#4a9a7a', c.roofC];
            return (
              <g key={i}>
                <rect x={x} y="66" width="52" height="26" fill={c.wall} />
                <path d={`M${x - 4} 66 L${x + 56} 66 L${x + 52} 56 L${x} 56 Z`} fill={cols[i]} />
                {[0, 1, 2].map((k) => <rect key={k} x={x + 4 + k * 17} y="56" width="8" height="10" fill="#ffffff" opacity="0.45" />)}
                <rect x={x + 4} y="76" width="44" height="6" fill={c.trunk} opacity="0.75" />
                {[0, 1, 2, 3, 4].map((k) => <circle key={k} cx={x + 9 + k * 8.5} cy="74" r="3" fill={['#f26b38', '#f2c23a', '#7bb35a', '#e8584c', '#f2a23a'][k]} />)}
              </g>
            );
          })}
        </g>
      );
    case 'work':
      return <WorkScene industry={industry} urban={urban} c={c} roof={roof} deco={deco} />;
    case 'clinic':
      return (
        <g>
          <Tree x={60} kind={deco} c={c} s={0.9} />
          <House x={120} y={52} w={86} c={c} roof={roof === 'stilt' ? 'flat' : roof} win={3} />
          <circle cx="163" cy="43" r="9" fill="#ffffff" />
          <path d="M163 37.5 V48.5 M157.5 43 H168.5" stroke="#e8584c" strokeWidth="3.2" />
          <rect x="226" y="78" width="40" height="13" rx="3" fill="#ffffff" />
          <rect x="230" y="73" width="20" height="7" rx="2" fill="#ffffff" />
          <path d="M240 81 V88 M236.5 84.5 H243.5" stroke="#e8584c" strokeWidth="2" />
          <circle cx="234" cy="92" r="3" fill={c.trunk} /><circle cx="258" cy="92" r="3" fill={c.trunk} />
        </g>
      );
    default: // park
      return (
        <g>
          <Tree x={50} kind={deco} c={c} s={1.2} />
          <Tree x={110} kind={deco} c={c} s={0.9} />
          <ellipse cx="200" cy="99" rx="46" ry="5" fill={c.water} opacity="0.85" />
          <Bench x={150} c={c} />
          <path d="M262 92 V58" stroke={c.trunk} strokeWidth="1.6" />
          <circle cx="262" cy="56" r="3.4" fill="#ffe7a8" />
          <Tree x={296} kind={deco} c={c} s={1} />
        </g>
      );
  }
}

// 우리 집 가족이 서는 자리 (%, 집 문 앞 50 은 비워 둠)
const FAMILY_SLOTS = [36, 64, 28, 72, 43, 80, 22, 57, 86, 16];

// 가족 한 명: 나이에 따라 크기·머리색, 집 앞을 천천히 왔다 갔다 (CSS v-wander)
function FamilyPerson({ m, i }) {
  const size = ageGroup(m.age); // baby · kid · adult · elder
  return (
    <div className={'v-person fam ' + size} style={{ left: FAMILY_SLOTS[i % FAMILY_SLOTS.length] + '%', top: GROUND_Y + '%' }}>
      <div className="v-wander" style={{ animationDuration: 9 + (i % 4) * 2.5 + 's', animationDelay: -i * 1.7 + 's' }}>
        <Figure look={lookOf({ gender: m.gender, age: m.age, soft: true })} />
      </div>
      <div className="v-name">{m.label}{m.age != null ? ' ' + m.age + '세' : ''}</div>
    </div>
  );
}

// 먼 풍경 (권역)
function Land({ kind, c }) {
  if (kind === 'paddy') return <><path d="M0 70 L50 46 L110 58 L180 40 L250 56 L320 44 L320 100 L0 100 Z" fill={c.far} /><path d="M0 82 Q80 74 160 80 T320 78 L320 100 L0 100 Z" fill={c.near} /></>;
  if (kind === 'river') return <><path d="M0 64 Q70 52 140 60 T260 56 T320 58 L320 100 L0 100 Z" fill={c.far} /><path d="M0 84 Q100 78 180 84 T320 82 L320 92 L0 94 Z" fill={c.water} opacity="0.7" /></>;
  if (kind === 'steppe') return <><path d="M0 74 L40 40 L76 60 L124 26 L170 62 L212 38 L262 66 L300 46 L320 58 L320 100 L0 100 Z" fill={c.far} /><path d="M124 26 L136 38 L129 37 L124 43 L118 36 L113 37 Z M212 38 L222 48 L214 46 L206 49 Z" fill="#ffffff" opacity="0.6" /><path d="M0 84 Q80 78 160 82 T320 80 L320 100 L0 100 Z" fill={c.near} /></>;
  if (kind === 'dunes') return <><path d="M0 70 Q50 50 104 66 Q160 46 224 64 Q272 52 320 60 L320 100 L0 100 Z" fill={c.far} /><path d="M0 84 Q72 72 144 82 Q216 74 320 80 L320 100 L0 100 Z" fill={c.near} /></>;
  return <><path d="M0 66 Q40 44 80 58 Q128 34 176 56 Q232 40 272 54 Q296 48 320 52 L320 100 L0 100 Z" fill={c.far} /><path d="M0 80 Q64 68 128 78 Q192 66 256 76 Q288 72 320 74 L320 100 L0 100 Z" fill={c.near} /></>;
}

function VillageScene({ countryCode, age, gender = 'M', place = 'home', urban = true, caption, myMessage, others = [], costume, family = [], house = { tier: 3, kind: 'parents' }, vehicle = null, industry = null }) {
  const info = COUNTRIES[countryCode] || ['', 'EAST'];
  const flagCode = info[0];
  const t = THEMES[info[1]];
  const mode = useTheme(); // light = 노을 마을, dark = 밤 마을
  const c = t[mode];

  const start = idxOf(place);
  const [scene, setScene] = useState(start); // 지금 보이는 장소 화면
  const [enter, setEnter] = useState('');    // 넘어온 방향 (화면 전환 움직임)
  const [x, setX] = useState(DOOR_X);
  const [dir, setDir] = useState('right');
  const [walking, setWalking] = useState(false);
  const pos = useRef(DOOR_X);
  const sceneRef = useRef(start);
  const target = useRef({ scene: start, x: DOOR_X }); // 가려는 곳 (장소 화면, 그 안 위치)
  const boxRef = useRef(null);

  const go = (sc, gx) => {
    target.current = { scene: clamp(sc, 0, PLACES.length - 1), x: clamp(gx, MIN_X, MAX_X) };
    const right = target.current.scene > sceneRef.current
      || (target.current.scene === sceneRef.current && target.current.x > pos.current);
    setDir(right ? 'right' : 'left');
    setWalking(true);
  };

  // 인생 상황이 바뀌면 (입학·취업·은퇴 …) 그 장소 앞으로 걸어감
  //   나라가 바뀌면(이민) 맨 아래 Village 가 key 로 이 화면을 새로 만들어서, 새 마을 올해 장소에서 시작
  useEffect(() => {
    go(idxOf(place), DOOR_X + 6);
  }, [place]);

  // 걷기: 다른 장소로 가는 중이면 화면 끝까지 가서 넘어감
  useEffect(() => {
    if (!walking) return undefined;
    let frame;
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(0.25, (now - last) / 1000); // 프레임이 느려도 걷는 속도는 같게
      last = now;
      const tg = target.current;
      const sc = sceneRef.current;
      const goal = tg.scene > sc ? 100 : tg.scene < sc ? 0 : tg.x;
      const cur = pos.current;
      const move = SPEED * dt;
      let next = Math.abs(goal - cur) <= move ? goal : cur + Math.sign(goal - cur) * move;

      if (next >= 100 - EDGE && tg.scene > sc) {
        // 오른쪽 끝 → 다음 장소 화면 (왼쪽에서 들어옴)
        sceneRef.current = sc + 1;
        setScene(sc + 1);
        setEnter('from-right');
        next = EDGE + 1;
      } else if (next <= EDGE && tg.scene < sc) {
        sceneRef.current = sc - 1;
        setScene(sc - 1);
        setEnter('from-left');
        next = 100 - EDGE - 1;
      }
      pos.current = next;
      setX(next);
      if (sceneRef.current === tg.scene && Math.abs(next - tg.x) < 0.01) {
        setWalking(false);
        return;
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [walking]);

  // 방향키 (C08): ←·→ 누르고 있으면 계속 걷고, 화면 끝에서 옆 장소로 넘어감. 떼면 그 자리에 멈춤
  //   마을 밖으로는 못 나감 (첫 장소 왼쪽 끝·마지막 장소 오른쪽 끝에서 멈춤)
  useEffect(() => {
    const typing = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable);
    const held = { key: null };
    const down = (e) => {
      if ((e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') || typing(document.activeElement) || e.altKey || e.metaKey || e.ctrlKey) return;
      e.preventDefault();
      if (held.key === e.key) return; // 꾹 누르는 중 반복 입력은 무시
      held.key = e.key;
      if (e.key === 'ArrowRight') go(PLACES.length - 1, MAX_X);
      else go(0, MIN_X);
    };
    const up = (e) => {
      if (e.key !== held.key) return;
      held.key = null;
      target.current = { scene: sceneRef.current, x: pos.current }; // 지금 자리에서 멈춤
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  // 땅 누르기: 그 자리로. 양 끝 근처를 누르면 옆 장소로 넘어감
  const onPointerDown = (e) => {
    if (e.button !== 0 || !boxRef.current) return;
    const rect = boxRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const sc = sceneRef.current;
    if (px > 93 && sc < PLACES.length - 1) go(sc + 1, 18);
    else if (px < 7 && sc > 0) go(sc - 1, 82);
    else go(sc, px);
  };

  const here = PLACES[scene];
  const prev = PLACES[scene - 1];
  const next = PLACES[scene + 1];
  const atDoor = Math.abs(x - DOOR_X) < 14;

  return (
    <div ref={boxRef} className={'village ' + mode} style={{ background: c.sky }}
      onPointerDown={onPointerDown} role="application"
      aria-label={`${t.name} 마을 ${here.name}. 땅을 누르거나 ←·→ 방향키로 걷고, 양 끝으로 가면 옆 장소로 넘어가요`}>
      {mode === 'dark'
        ? SKY_STARS.map(([sx, sy, s], i) => (
          <span key={i} className="v-star" style={{ left: sx + '%', top: sy + '%', width: s, height: s, animationDelay: (i % 5) * 0.6 + 's' }} />
        ))
        : <span className="v-sun" aria-hidden="true" />}

      {/* 장소 화면: 바뀔 때마다 옆에서 밀려 들어옴 */}
      <div key={scene + '-' + countryCode} className={'v-scene ' + enter}>
        <svg className="v-art" viewBox="0 0 320 130" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <Land kind={t.land} c={c} />
          <rect x="0" y="92" width="320" height="38" fill={c.ground} />
          <rect x="0" y="104" width="320" height="12" fill={c.road} />
          <path d="M0 110 H320" stroke="#ffffff" strokeOpacity={mode === 'dark' ? 0.25 : 0.6} strokeDasharray="8 7" strokeWidth="1" />
          <Scene place={here.id} c={c} t={t} urban={urban} house={house} vehicle={vehicle} industry={industry} />
        </svg>

        {/* 우리 집 가족 (우리 집 화면에만) */}
        {here.id === 'home' && family.map((m, i) => <FamilyPerson key={m.id} m={m} i={i} />)}

        {/* 같은 나라 접속자 (흐린 실루엣, C15) - 같은 장소에 있는 사람만 */}
        {others.filter((o) => (o.place || 'home') === here.id).map((o) => (
          <div key={o.id} className="v-person other" style={{ left: o.x + '%', top: GROUND_Y + '%' }}>
            {o.message && <div className="v-bubble">{o.message}</div>}
            <Figure look={lookOf({ age: o.age })} />
            <div className="v-name">{o.name}{o.age != null && ', ' + o.age + '세'}</div>
          </div>
        ))}
      </div>

      {/* 나 */}
      <div className={'v-person me ' + ageGroup(age) + ' ' + dir + (walking ? ' walking' : '')} style={{ left: x + '%', top: GROUND_Y + '%' }}>
        {myMessage && <div className="v-bubble mine">{myMessage}</div>}
        <Figure look={lookOf({ gender, age, costume })} />
        <div className="v-name mine">나{age != null && ', ' + age + '세'}</div>
      </div>

      {/* 위: 지금 장소 + 상황 */}
      <div className="v-place-name" aria-live="polite">
        <b>{here.name}</b>
        <span>{atDoor && !walking ? (here.id === 'home' ? HOUSE_KINDS[house.kind] : here.desc) : `${t.name} 마을`}</span>
      </div>
      {caption && (
        <div className="v-caption">
          {flagCode && <img src={`https://flagcdn.com/w20/${flagCode}.png`} alt="" />}
          {caption}
        </div>
      )}

      {/* 양 끝: 옆 장소로 */}
      {prev && (
        <button type="button" className="v-edge left" onPointerDown={(e) => e.stopPropagation()}
          onClick={() => go(scene - 1, 82)} aria-label={prev.name + '(으)로 가기'}>◀ {prev.name}</button>
      )}
      {next && (
        <button type="button" className="v-edge right" onPointerDown={(e) => e.stopPropagation()}
          onClick={() => go(scene + 1, 18)} aria-label={next.name + '(으)로 가기'}>{next.name} ▶</button>
      )}

      {/* 마을 지도: 장소 점 + 지금 위치 */}
      <div className="v-mini" aria-hidden="true">
        {PLACES.map((p, i) => <i key={p.id} className={i === scene ? 'on' : ''} title={p.name} />)}
      </div>
    </div>
  );
}

// 나라가 바뀌면(이민) 마을을 처음부터 다시 그림
//   key 가 바뀌면 React 가 안쪽 상태(장소 화면·위치·걷기)를 새로 만들어서, effect 안에서 상태를 되돌리지 않아도 됨
function Village(props) {
  return <VillageScene key={props.countryCode} {...props} />;
}

export default Village;