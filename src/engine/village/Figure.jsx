// 마을 사람 그림 한 명 (나 · 가족 · 같은 나라 접속자 공용) - 동글동글 2.5등신 픽셀 그림
// 칸 18 × 27 (y -2 ~ 24, 위 2칸은 올림머리·모자 자리), 칸 하나 = 1 / look = costumeData.lookOf 결과
// 그리는 순서: 긴 머리 뒷부분 → 다리 → 팔 → 몸(옷) → 얼굴 → 머리카락 → 눈·볼 → 모자
// 걸을 때 왼팔+오른다리(fa) / 오른팔+왼다리(fb)가 번갈아 움직임 (village.css)
const OUT = '#2e2a33';   // 테두리
const SKIN = '#f2c9a0';
const PANTS = '#4a4458';
const SHOE = '#7a5440';
const CHEEK = '#f29a9a';

// 칸 하나 이상을 채우는 사각형 (x, y, 너비, 높이 = 칸 수)
function P({ x, y, w = 1, h = 1, c, o }) {
  return <rect x={x} y={y} width={w} height={h} fill={c} opacity={o} />;
}

// 줄 단위로 칠하기: rows = [[y, 시작 x, 끝 x], ...]  (끝 x 칸까지 포함)
function S({ rows, c, o }) {
  return rows.map(([y, a, b]) => <P key={y} x={a} y={y} w={b - a + 1} c={c} o={o} />);
}

// 동그란 얼굴: 테두리 줄과 피부 줄
const HEAD_OUT = [[0, 6, 11], [1, 5, 12], [2, 4, 13], [3, 3, 14], [4, 2, 15], [5, 2, 15], [6, 1, 16], [7, 1, 16], [8, 2, 15], [9, 2, 15], [10, 3, 14], [11, 4, 13], [12, 5, 12]];
const HEAD_SKIN = [[1, 6, 11], [2, 5, 12], [3, 4, 13], [4, 3, 14], [5, 3, 14], [6, 2, 15], [7, 2, 15], [8, 3, 14], [9, 3, 14], [10, 4, 13], [11, 5, 12], [12, 6, 11]];

// 옷 (몸통). dress 는 치마가 다리 위를 덮음
function Top({ style, color }) {
  return (
    <g>
      <P x={5} y={13} w={8} h={8} c={OUT} />
      <P x={4} y={14} w={10} h={5} c={OUT} />
      <P x={5} y={14} w={8} h={5} c={color} />
      <P x={6} y={19} w={6} c={color} />
      {style === 'stripe' && <><P x={5} y={15} w={8} c="#ffffff" o={0.55} /><P x={5} y={17} w={8} c="#ffffff" o={0.55} /></>}
      {style === 'suit' && <><P x={7} y={14} w={4} c="#ffffff" /><P x={8} y={15} w={2} h={3} c="#e8584c" /></>}
      {style === 'dress' && <><P x={4} y={19} w={10} h={3} c={OUT} /><P x={5} y={19} w={8} h={2} c={color} /></>}
    </g>
  );
}

// 머리카락 (긴 머리 뒷부분은 Figure 에서 맨 먼저 그림)
function Hair({ style, color }) {
  return (
    <g>
      <S rows={[[1, 6, 11], [2, 5, 12], [3, 4, 13], [4, 3, 14]]} c={color} />
      <P x={3} y={5} c={color} /><P x={14} y={5} c={color} />
      <P x={2} y={6} w={2} h={2} c={color} /><P x={14} y={6} w={2} h={2} c={color} />
      {style === 'long' && <><P x={3} y={8} h={2} c={color} /><P x={14} y={8} h={2} c={color} /></>}
      {style === 'bun' && <><P x={6} y={-2} w={6} h={3} c={OUT} /><P x={7} y={-1} w={4} h={2} c={color} /></>}
    </g>
  );
}

function Hat({ style, color }) {
  if (style === 'straw') {
    return (
      <g>
        <S rows={[[-2, 6, 11], [-1, 5, 12], [0, 5, 12], [1, 5, 12], [2, 0, 17], [3, 0, 17], [4, 1, 16]]} c={OUT} />
        <S rows={[[-1, 6, 11], [0, 6, 11]]} c={color} />
        <P x={6} y={1} w={6} c="#c9544a" />
        <P x={1} y={3} w={16} c={color} />
      </g>
    );
  }
  if (style === 'beanie') {
    return (
      <g>
        <S rows={[[-1, 5, 12], [0, 4, 13], [1, 3, 14], [2, 2, 15], [3, 2, 15], [4, 2, 15]]} c={OUT} />
        <S rows={[[0, 5, 12], [1, 4, 13], [2, 3, 14], [3, 3, 14]]} c={color} />
        <P x={3} y={3} w={12} c="#ffffff" o={0.35} />
        <P x={8} y={-2} w={2} h={2} c="#ffffff" />
      </g>
    );
  }
  // cap: 챙이 앞(오른쪽)으로
  return (
    <g>
      <S rows={[[-1, 6, 11], [0, 5, 12], [1, 4, 13], [2, 3, 14], [3, 2, 15], [4, 2, 17], [5, 13, 17]]} c={OUT} />
      <S rows={[[0, 6, 11], [1, 5, 12], [2, 4, 13], [3, 3, 14]]} c={color} />
      <P x={14} y={4} w={3} c={color} />
    </g>
  );
}

function Figure({ look }) {
  const top = look.top.color;
  const long = look.hair && look.hair.style === 'long';
  return (
    <svg className="v-fig" viewBox="0 -2 18 27" width="25" height="37" shapeRendering="crispEdges" aria-hidden="true">
      {/* 긴 머리 뒷부분 (얼굴·몸 뒤로 양옆만 보임) */}
      {long && <><P x={1} y={6} w={16} h={8} c={OUT} /><P x={2} y={7} w={14} h={6} c={look.hair.color} /></>}
      {/* 다리 (fb: 왼다리 / fa: 오른다리) - 바지 + 신발 */}
      <g className="fb"><P x={5} y={20} w={4} h={5} c={OUT} /><P x={6} y={21} w={2} h={2} c={PANTS} /><P x={6} y={23} w={2} c={SHOE} /></g>
      <g className="fa"><P x={9} y={20} w={4} h={5} c={OUT} /><P x={10} y={21} w={2} h={2} c={PANTS} /><P x={10} y={23} w={2} c={SHOE} /></g>
      {/* 팔 (fa: 왼팔 / fb: 오른팔) - 소매는 옷 색, 끝은 손 */}
      <g className="fa"><P x={2} y={13} w={2} h={7} c={OUT} /><P x={1} y={14} w={4} h={5} c={OUT} /><P x={2} y={14} w={2} h={3} c={top} /><P x={2} y={17} w={2} h={2} c={SKIN} /></g>
      <g className="fb"><P x={14} y={13} w={2} h={7} c={OUT} /><P x={13} y={14} w={4} h={5} c={OUT} /><P x={14} y={14} w={2} h={3} c={top} /><P x={14} y={17} w={2} h={2} c={SKIN} /></g>
      <Top {...look.top} />
      {/* 얼굴 */}
      <S rows={HEAD_OUT} c={OUT} />
      <S rows={HEAD_SKIN} c={SKIN} />
      {look.hair ? <Hair {...look.hair} /> : <P x={9} y={1} c="#3a2c26" />}
      {/* 눈 (세로 2칸) + 볼터치 */}
      <P x={6} y={7} h={2} c={OUT} /><P x={11} y={7} h={2} c={OUT} />
      <P x={4} y={9} c={CHEEK} /><P x={13} y={9} c={CHEEK} />
      {look.hat && <Hat {...look.hat} />}
    </svg>
  );
}

export default Figure;