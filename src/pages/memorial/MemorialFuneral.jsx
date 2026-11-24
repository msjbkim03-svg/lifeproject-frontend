import Figure from "../../engine/village/Figure";
import { lookOf } from "../../engine/village/costumeData";
import s from "./MemorialRoom.module.css";

// 마지막 순간 탭 그림: 빈소 (휘장 · 국화 단 · 영정 · 촛불 · 향 · 근조 화환 · 관)
// 영정 속 사람 = 마을 캐릭터 그림(Figure)을 세상을 떠난 나이의 모습 + 그 생에 입은 옷(C21)으로
// 그림 칸은 엔딩 영상과 같은 256 × 144 픽셀 (16:9), 촛불 · 향 연기만 CSS 로 움직임
// 예: <MemorialFuneral gender="F" age={82} costume={{ hair: "HAIR_02", top: null, hat: null }} />

// 칸 하나 이상을 채우는 사각형
function R({ x, y, w = 1, h = 1, c, className }) {
  return <rect x={x} y={y} width={w} height={h} fill={c} className={className} />;
}

// 국화 한 줄 (흰색 · 노란색 번갈아)
function Mums({ x1, x2, y }) {
  const list = [];
  for (let x = x1, i = 0; x <= x2; x += 4, i++) {
    list.push(<R key={x} x={x} y={y} w={3} h={3} c={i % 3 === 1 ? "#f2d24b" : "#ffffff"} />);
    list.push(<R key={x + "g"} x={x + 1} y={y + 1} c={i % 3 === 1 ? "#d9a520" : "#d8d8d0"} />);
  }
  return list;
}

// 근조 화환 (받침대 + 동그란 꽃 + 리본)
function Wreath({ x }) {
  const ring = [];
  for (let a = 0; a < 16; a++) {
    const rad = (a / 16) * Math.PI * 2;
    const cx = Math.round(x + 15 + Math.cos(rad) * 11);
    const cy = Math.round(52 + Math.sin(rad) * 11);
    ring.push(<R key={a} x={cx - 2} y={cy - 2} w={4} h={4} c={a % 4 === 0 ? "#f2d24b" : "#f7f4ec"} />);
  }
  return (
    <g>
      <R x={x + 6} y={62} w={2} h={50} c="#3b2d22" />
      <R x={x + 22} y={62} w={2} h={50} c="#3b2d22" />
      <R x={x + 4} y={110} w={22} h={2} c="#3b2d22" />
      {ring}
      <R x={x + 10} y={47} w={10} h={10} c="#2b2530" />
      <R x={x + 9} y={64} w={4} h={30} c="#f7f4ec" />
      <R x={x + 17} y={64} w={4} h={30} c="#f7f4ec" />
      <R x={x + 10} y={68} w={2} h={2} c="#3a3a3a" />
      <R x={x + 10} y={74} w={2} h={2} c="#3a3a3a" />
      <R x={x + 18} y={68} w={2} h={2} c="#3a3a3a" />
      <R x={x + 18} y={74} w={2} h={2} c="#3a3a3a" />
    </g>
  );
}

// 촛불 (초 + 흔들리는 불꽃)
function Candle({ x }) {
  return (
    <g>
      <R x={x} y={58} w={4} h={10} c="#f7f4ec" />
      <R x={x} y={66} w={4} h={2} c="#c9c2b2" />
      <R x={x + 1} y={57} w={2} h={1} c="#3a3a3a" />
      <g className={s.flame}>
        <R x={x + 1} y={52} w={2} h={5} c="#f29a2e" />
        <R x={x + 1} y={54} w={2} h={2} c="#ffe08a" />
      </g>
    </g>
  );
}

function MemorialFuneral({ gender, age, costume }) {
  return (
    <div className={`${s.scene} ${s.funeral}`} role="img" aria-label="빈소: 영정과 국화 단, 촛불, 그 앞에 놓인 관">
      <svg viewBox="0 0 256 144" shapeRendering="crispEdges" className={s.funeralArt} aria-hidden="true">
        {/* 벽 · 바닥 */}
        <R x={0} y={0} w={256} h={112} c="#2b2530" />
        <R x={0} y={112} w={256} h={32} c="#4a3a2c" />
        {[0, 1, 2, 3].map((i) => <R key={i} x={0} y={118 + i * 7} w={256} c="#3d2f23" />)}

        {/* 흰 휘장 (위 · 양옆) */}
        <R x={0} y={0} w={256} h={14} c="#efeae0" />
        {Array.from({ length: 16 }, (_, i) => <R key={i} x={i * 16 + 4} y={14} w={8} h={3} c="#efeae0" />)}
        <R x={0} y={0} w={8} h={112} c="#e4ded2" />
        <R x={248} y={0} w={8} h={112} c="#e4ded2" />

        {/* 근조 화환 양쪽 */}
        <Wreath x={14} />
        <Wreath x={212} />

        {/* 국화 단 (3층, 흰 천) */}
        <R x={68} y={70} w={120} h={8} c="#efeae0" />
        <R x={58} y={78} w={140} h={8} c="#e6e0d4" />
        <R x={48} y={86} w={160} h={10} c="#ddd6c8" />
        <Mums x1={70} x2={184} y={67} />
        <Mums x1={60} x2={194} y={75} />
        <Mums x1={50} x2={204} y={83} />

        {/* 영정 액자 (안쪽 사람은 아래 HTML 로 겹침) */}
        <R x={106} y={22} w={44} h={48} c="#2a1f14" />
        <R x={110} y={26} w={36} h={40} c="#d9cdb5" />
        {/* 검은 리본 (위 두 모서리) */}
        <R x={106} y={22} w={8} h={2} c="#111111" />
        <R x={106} y={22} w={2} h={8} c="#111111" />
        <R x={142} y={22} w={8} h={2} c="#111111" />
        <R x={148} y={22} w={2} h={8} c="#111111" />

        {/* 촛불 · 향로 */}
        <Candle x={94} />
        <Candle x={158} />
        {/* 향로 (맨 아래 단 가운데) + 향 두 개 + 올라가는 연기 */}
        <R x={122} y={87} w={12} h={6} c="#8a7a5a" />
        <R x={122} y={87} w={12} h={1} c="#a8966e" />
        <R x={126} y={80} w={1} h={7} c="#6b4226" />
        <R x={129} y={81} w={1} h={6} c="#6b4226" />
        <R x={126} y={80} c="#e8584c" />
        <R x={129} y={81} c="#e8584c" />
        <g className={s.smoke}>
          <R x={126} y={74} w={1} h={4} c="#cfcfd6" />
          <R x={127} y={69} w={1} h={4} c="#cfcfd6" />
          <R x={129} y={75} w={1} h={4} c="#cfcfd6" />
          <R x={128} y={71} w={1} h={3} c="#cfcfd6" />
        </g>

        {/* 관 (뚜껑 + 몸통 + 손잡이 + 흰 천 + 꽃 한 다발) */}
        <R x={72} y={95} w={112} h={6} c="#7d5030" />
        <R x={72} y={95} w={112} h={1} c="#9a6a42" />
        <R x={76} y={101} w={104} h={19} c="#6b4226" />
        <R x={76} y={119} w={104} h={2} c="#4a2c18" />
        <R x={76} y={101} w={2} h={19} c="#4a2c18" />
        <R x={178} y={101} w={2} h={19} c="#4a2c18" />
        {[88, 112, 140, 164].map((x) => <R key={x} x={x} y={109} w={6} h={2} c="#d9b24b" />)}
        <R x={110} y={94} w={36} h={2} c="#f7f4ec" />
        <R x={108} y={96} w={40} h={12} c="#f7f4ec" />
        <R x={108} y={107} w={40} h={1} c="#d8d2c4" />
        <Mums x1={118} x2={136} y={91} />
        <R x={126} y={94} w={4} h={2} c="#3f7a3a" />
      </svg>

      {/* 영정 속 사람 (세상을 떠난 나이의 모습 + 그 생에 입은 옷) */}
      <div className={s.funeralPortrait}>
        <Figure look={lookOf({ gender, age, costume })} />
      </div>
    </div>
  );
}

export default MemorialFuneral;
