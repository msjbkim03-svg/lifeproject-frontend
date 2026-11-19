// C08 마을 이동 (인생 진행 화면 가운데 게임 화면)
// - 마을 장소가 한 화면씩 이어져 있어요: 우리 집 → 학교 → 마을회관 → 시장 → 일터 → 보건소 → 공원
// - 오른쪽 끝까지 걸어가면 화면이 넘어가며 다음 장소, 왼쪽 끝이면 이전 장소로 가요
// - 땅을 누르면 그 자리까지 걷고, ←·→ 방향키를 누르고 있으면 계속 걸어요. 양 끝 화살표(◀ 학교 / 마을회관 ▶)를 누르면 옆 장소로 가요
// - place 가 바뀌면 (학교 입학, 취업, 은퇴 …) 장소 화면을 하나씩 지나 그 장소 앞까지 알아서 걸어가요 (villageData.placeOf)
// - 권역(동·동남·남·중앙·서아시아)은 풍경·지붕 모양만 바꾸고, 라이트 테마는 노을 마을, 다크 테마는 밤 마을
// 사용법:
// <Village countryCode="IND" age={34} gender="M" place="work" urban
//    caption="인도 · 청년기 (34세, 공장 조장)"
//    myMessage="안녕하세요"                       ← 내가 보낸 채팅 (C15, 없으면 생략)
//    others={[{ id: 1, name: '라훌', age: 30, place: 'hall', x: 40, message: '반가워요' }]}  ← 같은 나라 접속자 (C15)
//    costume="#3a7d44" />                          ← 장착 코스튬 색 (C21, 없으면 기본 옷)
//    family={[{ id: 'mom', label: '엄마', gender: 'F', age: 58 }]}  ← 우리 집에 같이 사는 가족 (부모·형제자매·배우자·자녀)
// 가족: '우리 집' 화면에만 있고, 집 앞을 천천히 왔다 갔다 해요 (조작은 나만). 자녀가 생기면 늘어나요
import { useEffect, useRef, useState } from 'react';
import { COUNTRIES, THEMES, PLACES, MIN_X, MAX_X, EDGE, DOOR_X, GROUND_Y, SPEED, SKY_STARS } from './villageData';
import { useTheme } from '../../common/theme';
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

// 장소별 장면
function Scene({ place, c, t, urban }) {
  const roof = t.roof;
  const deco = t.deco;
  switch (place) {
    case 'home':
      return (
        <g>
          <Tree x={46} kind={deco} c={c} s={1.1} />
          <House x={126} y={roof === 'stilt' ? 52 : 58} w={70} c={c} roof={roof} />
          {roof === 'stilt' && <path d="M132 92 V86 M190 92 V86" stroke={c.trunk} strokeWidth="2" />}
          <path d="M210 92 V70 M262 92 V70 M210 72 Q236 78 262 72" stroke={c.trunk} strokeWidth="1.4" fill="none" />
          <rect x="222" y="74" width="7" height="9" fill="#ffffff" opacity="0.85" />
          <rect x="236" y="75" width="9" height="7" fill={c.leaf} opacity="0.8" />
          <path d="M90 92 V84 M98 92 V84 M106 92 V84 M114 92 V84 M86 86 H118" stroke={c.trunk} strokeWidth="1.3" />
          <Tree x={290} kind={deco} c={c} s={0.8} />
        </g>
      );
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
      return urban ? (
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
      ) : (
        <g>
          {[0, 1, 2, 3, 4, 5].map((r) => (
            <path key={r} d={`M20 ${80 + r * 2} Q160 ${76 + r * 2} 300 ${80 + r * 2}`} stroke={c.leaf} strokeWidth="1.6" fill="none" opacity={0.5 + r * 0.08} />
          ))}
          <House x={226} y={60} w={50} c={c} roof={roof} win={1} />
          <path d="M60 92 V70 M54 74 L66 74 M56 70 Q60 64 64 70" stroke={c.trunk} strokeWidth="1.6" fill="none" />
          <circle cx="60" cy="67" r="3.4" fill="#f2c9a0" />
        </g>
      );
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
  const size = m.age < 3 ? 'baby' : m.age < 13 ? 'kid' : m.age < 60 ? 'adult' : 'elder';
  const clothes = m.gender === 'F' ? '#e9a0b4' : m.gender === 'M' ? '#8fb0ec' : '#9cc9a0';
  return (
    <div className={'v-person fam ' + size} style={{ left: FAMILY_SLOTS[i % FAMILY_SLOTS.length] + '%', top: GROUND_Y + '%' }}>
      <div className="v-wander" style={{ animationDuration: 9 + (i % 4) * 2.5 + 's', animationDelay: -i * 1.7 + 's' }}>
        <div className="v-head" />
        <div className="v-body" style={{ background: clothes }} />
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

function Village({ countryCode, age, gender = 'M', place = 'home', urban = true, caption, myMessage, others = [], costume, family = [] }) {
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
  useEffect(() => {
    go(idxOf(place), DOOR_X + 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [place]);

  // 나라가 바뀌면 (이민) 새 마을 우리 집 앞에서 시작
  useEffect(() => {
    sceneRef.current = 0;
    setScene(0);
    pos.current = DOOR_X;
    setX(DOOR_X);
    target.current = { scene: 0, x: DOOR_X };
    setEnter('');
  }, [countryCode]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
  const clothes = costume || (gender === 'F' ? '#e98aa6' : '#6f95e8');
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
          <Scene place={here.id} c={c} t={t} urban={urban} />
        </svg>

        {/* 우리 집 가족 (우리 집 화면에만) */}
        {here.id === 'home' && family.map((m, i) => <FamilyPerson key={m.id} m={m} i={i} />)}

        {/* 같은 나라 접속자 (흐린 실루엣, C15) - 같은 장소에 있는 사람만 */}
        {others.filter((o) => (o.place || 'home') === here.id).map((o) => (
          <div key={o.id} className="v-person other" style={{ left: o.x + '%', top: GROUND_Y + '%' }}>
            {o.message && <div className="v-bubble">{o.message}</div>}
            <div className="v-head" />
            <div className="v-body" />
            <div className="v-name">{o.name}{o.age != null && ', ' + o.age + '세'}</div>
          </div>
        ))}
      </div>

      {/* 나 */}
      <div className={'v-person me ' + dir + (walking ? ' walking' : '')} style={{ left: x + '%', top: GROUND_Y + '%' }}>
        {myMessage && <div className="v-bubble mine">{myMessage}</div>}
        <div className="v-head" />
        <div className="v-body" style={{ background: clothes }} />
        <div className="v-name mine">나{age != null && ', ' + age + '세'}</div>
      </div>

      {/* 위: 지금 장소 + 상황 */}
      <div className="v-place-name" aria-live="polite">
        <b>{here.name}</b>
        <span>{atDoor && !walking ? here.desc : `${t.name} 마을`}</span>
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

export default Village;
