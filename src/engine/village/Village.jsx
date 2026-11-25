// C08 마을 이동 (인생 진행 화면 가운데 게임 화면)
// - 마을 장소가 한 화면씩 이어져 있어요: 우리 집 → 학교 → 대학교 → 일터 → 보건소 → 공원
// - 오른쪽 끝까지 걸어가면 화면이 넘어가며 다음 장소, 왼쪽 끝이면 이전 장소로 가요
// - 땅을 누르면 그 자리까지 걷고, ←·→ 방향키를 누르고 있으면 계속 걸어요. 양 끝 화살표(◀ 학교 / 일터 ▶)를 누르면 옆 장소로 가요
// - place 가 바뀌면 (학교 입학, 취업, 은퇴 …) 장소 화면을 하나씩 지나 그 장소 앞까지 알아서 걸어가요 (villageData.placeOf)
// - 권역(동·동남·남·중앙·서아시아)은 풍경·지붕 모양만 바꾸고, 라이트 테마는 노을 마을, 다크 테마는 밤 마을
// 사용법:
// <Village countryCode="IND" age={34} gender="M" place="work" urban
//    caption="인도 · 청년기 (34세, 공장 조장)"
//    myMessage="안녕하세요"                       ← 내가 보낸 채팅 (C15, 없으면 생략)
//    others={[{ id: 1, name: '라훌', age: 30, place: 'park', x: 40, message: '반가워요' }]}  ← 같은 나라 접속자 (C15)
//    costume={{ hair: 'HAIR_02', top: 'TOP_01', hat: null }}  ← 입은 착장 (C21, costumeData.js 코드, 없으면 기본 모습)
//    family={[{ id: 'mom', label: '엄마', gender: 'F', age: 58 }]}  ← 우리 집에 같이 사는 가족 (부모·형제자매·배우자·자녀)
//    house={{ tier: 4, kind: 'own' }}  ← 우리 집 모양 (villageData.houseOf, 없으면 3단계 부모님 집)
//    vehicle="CAR"                     ← 집 앞 탈것 CAR / MOTO / BIKE (villageData.vehicleOf, 없으면 null)
//    industry="SERVICE"                ← 직업 산업 AGRI / INDUSTRY / SERVICE (일터 그림, 없으면 도시·시골로만)
// 가족: '우리 집' 화면에만 있고, 집 앞을 천천히 왔다 갔다 해요 (조작은 나만). 자녀가 생기면 늘어나요
import { useEffect, useRef, useState } from 'react';
import { COUNTRIES, THEMES, PLACES, MIN_X, MAX_X, EDGE, DOOR_X, GROUND_Y, SPEED, SKY_STARS, HOUSE_KINDS, moodOf } from './villageData';
import { useTheme } from '../../common/theme';
import Figure from './Figure';
import Pet from './Pet';
import { lookOf, ageGroup } from './costumeData';
import { familyLook } from './familyLook';
import './village.css';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const idxOf = (id) => Math.max(0, PLACES.findIndex((p) => p.id === id));

// 교도소·군 부대에서는 입은 코스튬(C21) 대신 수형복·군복으로 덮어씀 (머리 모양은 그대로)
//   수형복: Figure 의 stripe 줄무늬 옷 / 군복: Figure 의 army 얼룩무늬 옷·전투모 + 바지·군화 색
const UNIFORM = {
  prison: { top: { style: 'stripe', color: '#7d8794' }, hat: null, pants: '#6b7380', shoe: '#3a3a3a' },
  barracks: { top: { style: 'army', color: '#5a6b3a' }, hat: { style: 'army', color: '#5a6b3a' }, pants: '#4e5f36', shoe: '#2b2a28' },
};
function myLook({ gender, age, costume, kind }) {
  const look = lookOf({ gender, age, costume });
  const u = UNIFORM[kind];
  return u ? { ...look, ...u } : look;
}

// ───────── 그림 부품 (SVG 320 × 130, 땅은 y 92 부터) ─────────

// ───────── 하늘 날씨 (행복에 따라, 원작 mood) ─────────
//   low: 구름이 몰려오고 비 (CSS v-rain) / mid: 구름 두어 점 / high: 흰 구름 · 해가 더 밝음
//   구름 한 조각 = 픽셀 3줄 (윗줄 · 몸통 · 그림자), [x, y, 크기 배율]
const CLOUD_AT = {
  low: [[14, 10, 1.6], [78, 6, 1.8], [150, 12, 1.7], [222, 5, 1.9], [286, 11, 1.5]],
  mid: [[52, 14, 1], [232, 22, 0.8]],
  high: [[36, 12, 1.1], [130, 6, 0.8], [196, 20, 0.9]],
};
const CLOUD_C = {
  light: { low: ['#a9b1b8', '#8a949c'], mid: ['#fff4ec', '#ffd6c4'], high: ['#ffffff', '#e3eef4'] },
  dark: { low: ['#3a4651', '#2c353e'], mid: ['#2a3462', '#222a52'], high: ['#3a4878', '#2c3866'] },
};
// 픽셀 달 (밤 마을): 지름 12칸 원, cut 이면 오른쪽 위를 깎아 초승달 → [x, y] 칸 목록
function moonCells(cut) {
  const out = [];
  for (let y = 0; y < 12; y++) {
    for (let x = 0; x < 12; x++) {
      const inMoon = (x - 5.5) ** 2 + (y - 5.5) ** 2 <= 36;
      const inCut = cut && (x - 9.5) ** 2 + (y - 4.5) ** 2 <= 30;
      if (inMoon && !inCut) out.push([x, y]);
    }
  }
  return out;
}
const MOON_FULL = moonCells(false); // 행복이 높을 때: 밝은 보름달
const MOON_THIN = moonCells(true);  // 보통일 때: 초승달 (낮을 때는 먹구름에 가려 안 보임)

function MoodSky({ mood, dark }) {
  const [fill, shade] = CLOUD_C[dark ? 'dark' : 'light'][mood];
  return (
    <svg className="v-clouds" viewBox="0 0 320 130" preserveAspectRatio="xMidYMax slice" shapeRendering="crispEdges" aria-hidden="true">
      {dark && mood !== 'low' && (
        <g transform="translate(244 10)">
          {mood === 'high' && <><circle cx="6" cy="6" r="22" fill="#fff6d8" opacity="0.07" /><circle cx="6" cy="6" r="13" fill="#fff6d8" opacity="0.14" /></>}
          {(mood === 'high' ? MOON_FULL : MOON_THIN).map(([x, y]) => (
            <rect key={x + '-' + y} x={x} y={y} width={1} height={1} fill={mood === 'high' ? '#fff6d8' : '#d9c88f'} />
          ))}
          {mood === 'high' && <><rect x="3" y="4" width="2" height="2" fill="#ecdcae" /><rect x="7" y="7" width="2" height="1" fill="#ecdcae" /></>}
        </g>
      )}
      {CLOUD_AT[mood].map(([x, y, k], i) => {
        const u = (n) => Math.round(n * k); // u: 크기 배율을 곱해 정수 칸으로
        return (
          <g key={i}>
            <rect x={x + u(3)} y={y} width={u(8)} height={u(2)} fill={fill} />
            <rect x={x} y={y + u(2)} width={u(16)} height={u(3)} fill={fill} />
            <rect x={x + u(1)} y={y + u(5)} width={u(14)} height={u(1)} fill={shade} />
          </g>
        );
      })}
    </svg>
  );
}

// ───────── 공원 · 분수 광장 (픽셀, 마을회관을 합침: 아이·어르신이 함께 쉬는 곳) ─────────
//   칸 하나 = 1 (viewBox 단위), 땅 y92 · 진한 테두리 1칸을 둘러서 캐릭터와 같은 픽셀 느낌
//   dark(밤 마을)면 가로등에 불이 켜지고 바닥에 불빛이 번짐
const PX_OUT = { light: '#3d3040', dark: '#0d1114' };

// 테두리 1칸을 두른 사각형 (x, y, 너비, 높이 = 안쪽 크기)
function PxBox({ x, y, w, h, fill, out }) {
  return (
    <>
      <rect x={x - 1} y={y - 1} width={w + 2} height={h + 2} fill={out} />
      <rect x={x} y={y} width={w} height={h} fill={fill} />
    </>
  );
}

// 벤치: 등받이 · 앉는 판 · 다리
function PxBench({ x, c, out }) {
  return (
    <g>
      <rect x={x + 2} y={80} width={2} height={12} fill={out} />
      <rect x={x + 20} y={80} width={2} height={12} fill={out} />
      <PxBox x={x} y={78} w={24} h={2} fill={c.trunk} out={out} />
      <PxBox x={x} y={84} w={24} h={2} fill={c.trunk} out={out} />
    </g>
  );
}

// 둥근 나무: 줄마다 잎 폭 (위에서 아래로)
const PX_TREE = [6, 10, 12, 14, 14, 14, 12, 10, 6];
function PxTree({ x, c, out }) {
  return (
    <g>
      <PxBox x={x - 1} y={76} w={3} h={16} fill={c.trunk} out={out} />
      {PX_TREE.map((w, i) => <rect key={'o' + i} x={x - w / 2 - 1} y={55 + i * 2} width={w + 2} height={4} fill={out} />)}
      {PX_TREE.map((w, i) => <rect key={i} x={x - w / 2} y={56 + i * 2} width={w} height={2} fill={c.leaf} />)}
      <rect x={x - 4} y={58} width={3} height={2} fill="#ffffff" opacity="0.3" />
    </g>
  );
}

// 가로등 (밤에는 불이 켜짐)
function PxLamp({ x, c, out, on }) {
  return (
    <g>
      {on && <path d={`M${x - 2} 62 L${x + 4} 62 L${x + 13} 92 L${x - 11} 92 Z`} fill="#ffe7a8" opacity="0.12" />}
      {on && <ellipse cx={x + 1} cy={94} rx={15} ry={3} fill="#ffe7a8" opacity="0.25" />}
      <rect x={x} y={60} width={2} height={32} fill={out} />
      <PxBox x={x - 2} y={57} w={6} h={2} fill={c.wall} out={out} />
      <rect x={x - 1} y={60} width={4} height={2} fill={on ? '#ffe7a8' : c.wall} />
    </g>
  );
}

// 분수 물줄기: 가운데에서 양옆으로 떨어지는 물방울 자리 [옆으로 거리, 높이]
//   Array.from: 0~8 번째 물방울마다 (옆으로 2칸씩, 아래로 점점 빠르게) 자리를 만듦
const SPRAY = Array.from({ length: 9 }, (_, i) => [3 + i * 3, 59 + Math.round(i * i * 0.3)]);

function PxFountain({ x, c, out, dark }) {
  const drop = dark ? '#8fc3e0' : '#ffffff';
  return (
    <g>
      <PxBox x={x - 32} y={84} w={64} h={8} fill={c.wall} out={out} />
      <rect x={x - 30} y={86} width={60} height={4} fill={c.water} />
      <rect x={x - 30} y={86} width={60} height={1} fill="#ffffff" opacity="0.5" />
      <PxBox x={x - 3} y={68} w={6} h={16} fill={c.wall} out={out} />
      <PxBox x={x - 10} y={65} w={20} h={3} fill={c.wall} out={out} />
      <rect x={x - 9} y={65} width={18} height={1} fill={c.water} />
      {/* 물줄기: 위로 솟는 줄기 + 양옆으로 떨어지는 물방울 (a·b 두 무리가 번갈아 반짝임, CSS v-spray) */}
      <g className="v-spray">
        <rect x={x - 1} y={53} width={2} height={12} fill={drop} opacity="0.9" />
        {SPRAY.map(([dx, y], i) => (
          <g key={i} className={i % 2 ? 'b' : 'a'}>
            <rect x={x - dx - 1} y={y} width={2} height={2} fill={drop} opacity="0.9" />
            <rect x={x + dx - 1} y={y} width={2} height={2} fill={drop} opacity="0.9" />
          </g>
        ))}
      </g>
    </g>
  );
}

function PlazaScene({ c, dark }) {
  const out = dark ? PX_OUT.dark : PX_OUT.light;
  return (
    <g shapeRendering="crispEdges">
      {/* 광장 바닥: 돌 타일 */}
      <rect x={16} y={92} width={288} height={12} fill={c.road} />
      {Array.from({ length: 36 }, (_, i) => <rect key={i} x={16 + i * 8} y={92} width={1} height={12} fill={out} opacity="0.15" />)}
      <rect x={16} y={98} width={288} height={1} fill={out} opacity="0.15" />
      <PxTree x={26} c={c} out={out} />
      <PxTree x={296} c={c} out={out} />
      <PxLamp x={96} c={c} out={out} on={dark} />
      <PxLamp x={222} c={c} out={out} on={dark} />
      <PxBench x={44} c={c} out={out} />
      <PxBench x={252} c={c} out={out} />
      <PxFountain x={160} c={c} out={out} dark={dark} />
    </g>
  );
}

// ───────── 집 대신 보이는 곳 (villageData.houseOf 의 kind) ─────────
//   prison 교도소 (수감 중) / apt 도시 셋집 아파트 (도시 + 셋집) / barracks 군 부대 (현역 복무 중)
//   분수 광장과 같은 픽셀 방식: 칸 하나 = 1, 진한 테두리 1칸 (PxBox), dark(밤)면 창문 몇 개에 불이 켜짐

// 쇠창살 창문: 창 + 2칸마다 세로 창살
function PxBarWin({ x, y, w, h, fill, out }) {
  return (
    <g>
      <PxBox x={x} y={y} w={w} h={h} fill={fill} out={out} />
      {Array.from({ length: Math.floor(w / 2) }, (_, i) => <rect key={i} x={x + 1 + i * 2} y={y} width={1} height={h} fill={out} />)}
    </g>
  );
}

// 교도소 (시안 7: 회색 콘크리트 + 줄무늬): 뒤에 화면 끝까지 이어진 담장, 앞에 수감동과 철문
const PRISON_C = {
  light: { wall: '#a9adb2', seam: '#9a9ea4', stripe: '#8a8e96', block: '#cfd2d6', tower: '#9aa0a8', cap: '#8a7e78', glass: '#2c3d47', win: '#3d4a56', lit: '#3d4a56', gate: '#8a8e96', gateTop: '#6a6e76' },
  dark: { wall: '#666b7c', seam: '#5b6171', stripe: '#555b6a', block: '#797e8d', tower: '#6c7180', cap: '#5c5665', glass: '#ffe7a8', win: '#1c2230', lit: '#ffd98a', gate: '#606777', gateTop: '#505664' },
};
const PRISON_ROWS = [36, 48, 60, 72];                                  // 수감동 창문 줄 (위 y)
const PRISON_COLS = Array.from({ length: 10 }, (_, k) => 96 + k * 14); // 수감동 창문 칸 (왼쪽 x)
const WIRE_X = Array.from({ length: 107 }, (_, i) => i * 3);           // 철조망 가시 (3칸마다)

function PrisonScene({ dark }) {
  const p = PRISON_C[dark ? 'dark' : 'light'];
  const out = dark ? PX_OUT.dark : PX_OUT.light;
  return (
    <g shapeRendering="crispEdges">
      {/* 감시탑 (담장 뒤 왼쪽) */}
      <PxBox x={8} y={26} w={14} h={66} fill={p.tower} out={out} />
      <PxBox x={4} y={20} w={22} h={6} fill={p.cap} out={out} />
      <PxBox x={11} y={30} w={8} h={5} fill={p.glass} out={out} />
      {/* 뒤 담장: 화면 끝까지 + 이음매 + 줄무늬 + 철조망 */}
      <PxBox x={0} y={50} w={320} h={42} fill={p.wall} out={out} />
      {Array.from({ length: 16 }, (_, i) => <rect key={'s' + i} x={i * 20} y={52} width={1} height={40} fill={p.seam} />)}
      <rect x={0} y={60} width={320} height={3} fill={p.stripe} />
      <rect x={0} y={49} width={320} height={1} fill={out} />
      {WIRE_X.map((x) => <rect key={'w' + x} x={x} y={46} width={1} height={3} fill={out} />)}
      {/* 수감동 (앞): 철문 둘레 아랫줄 창문은 비움 */}
      <PxBox x={90} y={30} w={150} h={62} fill={p.block} out={out} />
      {PRISON_ROWS.map((wy, r) => PRISON_COLS.map((wx, k) => (
        wy === 72 && wx + 7 > 149 && wx < 181 ? null : (
          <PxBarWin key={r + '-' + k} x={wx} y={wy} w={7} h={5} fill={dark && (r * 3 + k) % 5 === 0 ? p.lit : p.win} out={out} />
        )
      )))}
      {/* 철문 */}
      <PxBox x={153} y={70} w={24} h={22} fill={p.gate} out={out} />
      {Array.from({ length: 6 }, (_, i) => <rect key={'g' + i} x={155 + i * 4} y={70} width={1} height={22} fill={out} />)}
      <PxBox x={150} y={66} w={30} h={4} fill={p.gateTop} out={out} />
    </g>
  );
}

// 도시 셋집 (시안 6: 나무 · 벤치 쉼터): 아파트 2동 + 둥근 나무 + 작은 벤치
const APT_FLOORS = [26, 36, 46, 56, 66, 76]; // 층마다 창문 줄 (위 y)

function PxApt({ x, c, out, dark }) {
  const glass = dark ? '#2a3858' : '#7fb0d8';
  return (
    <g>
      <PxBox x={x} y={20} w={90} h={72} fill={c.wall} out={out} />
      <PxBox x={x - 2} y={16} w={94} h={4} fill={c.roofC} out={out} />
      {APT_FLOORS.map((fy, f) => [0, 1, 2, 3, 4, 5].map((k) => {
        const wx = x + 6 + k * 14;
        if (fy === 76 && wx + 8 > x + 37 && wx < x + 53) return null; // 1층 현관 자리는 비움
        return <PxBox key={f + '-' + k} x={wx} y={fy} w={8} h={6} fill={dark && (f * 2 + k + x) % 3 === 0 ? '#ffe7a8' : glass} out={out} />;
      }))}
      <PxBox x={x + 38} y={80} w={14} h={12} fill="#a8745a" out={out} />
    </g>
  );
}

function PxSeat({ x, c, out }) {
  return (
    <g>
      <rect x={x + 2} y={88} width={1} height={4} fill={out} />
      <rect x={x + 11} y={88} width={1} height={4} fill={out} />
      <PxBox x={x} y={86} w={14} h={2} fill={c.trunk} out={out} />
    </g>
  );
}

function AptScene({ c, dark }) {
  const out = dark ? PX_OUT.dark : PX_OUT.light;
  return (
    <g shapeRendering="crispEdges">
      <PxApt x={40} c={c} out={out} dark={dark} />
      <PxApt x={190} c={c} out={out} dark={dark} />
      <PxTree x={150} c={c} out={out} />
      <PxTree x={300} c={c} out={out} />
      <PxSeat x={130} c={c} out={out} />
      <PxSeat x={160} c={c} out={out} />
    </g>
  );
}

// 군 부대 (시안 8: 울타리 너머 전차): 전차 → 철조망 울타리 → 별 마크 위병소 · 차단기 · 보초병
const MIL_C = {
  light: { olive: '#5a6a3a', oliveD: '#4a5530', helm: '#4a5a30', fence: '#7a7e86', post: '#d8d2b0', roof: '#6a7a4a', door: '#e8e4cc', glass: '#7fb0d8', star: '#3d4a28', gold: '#f2c230', bar: '#e8584c', skin: '#f2c9a0' },
  dark: { olive: '#5a6d3e', oliveD: '#4e5f36', helm: '#546934', fence: '#6a707d', post: '#8d886a', roof: '#5e7043', door: '#99957e', glass: '#ffe7a8', star: '#465530', gold: '#e0b028', bar: '#a8443c', skin: '#c9a07e' },
};
// 별 마크 칸 [x, y] (12 × 9 판 안)
const STAR = [[5, 0], [5, 1], [4, 2], [5, 2], [6, 2], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3], [9, 3],
[3, 4], [4, 4], [5, 4], [6, 4], [7, 4], [3, 5], [4, 5], [6, 5], [7, 5], [2, 6], [8, 6]];
const FENCE_X = Array.from({ length: 54 }, (_, i) => i * 6);

// 철모 쓴 보초병 (서 있기만 함)
function PxSoldier({ x, m, out }) {
  return (
    <g>
      <PxBox x={x + 2} y={88} w={2} h={4} fill={m.oliveD} out={out} />
      <PxBox x={x + 6} y={88} w={2} h={4} fill={m.oliveD} out={out} />
      <PxBox x={x + 1} y={82} w={8} h={6} fill={m.olive} out={out} />
      <rect x={x + 1} y={86} width={8} height={1} fill={m.oliveD} />
      <PxBox x={x + 2} y={78} w={6} h={4} fill={m.skin} out={out} />
      <rect x={x + 3} y={80} width={1} height={1} fill={out} />
      <rect x={x + 6} y={80} width={1} height={1} fill={out} />
      <PxBox x={x + 1} y={76} w={8} h={2} fill={m.helm} out={out} />
    </g>
  );
}

function BarracksScene({ dark }) {
  const m = MIL_C[dark ? 'dark' : 'light'];
  const out = dark ? PX_OUT.dark : PX_OUT.light;
  return (
    <g shapeRendering="crispEdges">
      {/* 울타리 너머 전차 */}
      <PxBox x={30} y={78} w={44} h={10} fill={m.olive} out={out} />
      <PxBox x={42} y={70} w={20} h={8} fill={m.olive} out={out} />
      <rect x={62} y={73} width={22} height={2} fill={out} />
      {[0, 1, 2, 3, 4].map((k) => <rect key={'t' + k} x={33 + k * 8} y={88} width={6} height={3} fill={out} />)}
      {/* 철조망 울타리 */}
      {FENCE_X.map((x) => <rect key={'f' + x} x={x} y={64} width={1} height={28} fill={m.fence} />)}
      <rect x={0} y={64} width={320} height={1} fill={out} />
      {WIRE_X.map((x) => <rect key={'w' + x} x={x} y={61} width={1} height={3} fill={out} />)}
      {/* 위병소 + 별 마크 */}
      <PxBox x={130} y={48} w={60} h={44} fill={m.post} out={out} />
      <PxBox x={126} y={44} w={68} h={4} fill={m.roof} out={out} />
      <PxBox x={150} y={60} w={20} h={32} fill={m.door} out={out} />
      <PxBox x={138} y={56} w={10} h={8} fill={m.glass} out={out} />
      <PxBox x={172} y={56} w={10} h={8} fill={m.glass} out={out} />
      <PxBox x={154} y={49} w={12} h={9} fill={m.star} out={out} />
      {STAR.map(([i, j]) => <rect key={'s' + i + '-' + j} x={155 + i} y={50 + j} width={1} height={1} fill={m.gold} />)}
      {/* 차단기 */}
      <PxBox x={193} y={80} w={4} h={12} fill={m.roof} out={out} />
      <PxBox x={196} y={84} w={40} h={3} fill={m.bar} out={out} />
      {[0, 8, 16, 24, 32].map((k) => <rect key={'b' + k} x={196 + k} y={84} width={4} height={3} fill="#ffffff" />)}
      <PxSoldier x={112} m={m} out={out} />
    </g>
  );
}

// ───────── 우리 집 (가정형편 5단계, villageData.houseOf) ─────────
// tier 1 흙수저 판잣집 ~ 5 다이아수저 저택, 문은 모두 x 160 (DOOR_X 50%)
// 큰 집(4·5단계)은 높은 지붕(돔·유르트·다락)이 화면 위로 잘려서 평지붕으로 바꿈 (돔은 가운데 작은 돔 장식)
function bigRoof(roof) {
  return roof === 'dome' || roof === 'yurt' || roof === 'stilt' ? 'flat' : roof;
}

// ───── 픽셀 부품 (우리 집): 칸 하나 = 1, 진한 테두리 1칸 ─────
const WOOD = '#a8745a';
const GLASS = { light: '#7fb0d8', dark: '#2a3858', lit: '#ffe7a8' };

// 창문: 밤(dark)이면 lit 일 때 불 켜진 노란 창
function PxWin({ x, y, w, h, out, dark, lit }) {
  return <PxBox x={x} y={y} w={w} h={h} fill={dark ? (lit ? GLASS.lit : GLASS.dark) : GLASS.light} out={out} />;
}

// 나무 문 + 노란 손잡이 (바닥 y 까지)
function PxDoor({ x, y, w = 14, bottom = 92, fill = WOOD, out }) {
  return (
    <g>
      <PxBox x={x} y={y} w={w} h={bottom - y} fill={fill} out={out} />
      <rect x={x + w - 4} y={y + Math.floor((bottom - y) / 2)} width={2} height={2} fill="#f2c230" />
    </g>
  );
}

// 계단 지붕 (박공): 한 줄 올라갈 때마다 양옆이 step 칸씩 좁아짐, y = 처마 높이
function PxGable({ x, y, w, step = 2, fill, out }) {
  const rows = Array.from({ length: Math.floor(w / (2 * step)) }, (_, k) => k); // k: 아래에서 몇 번째 줄
  return (
    <g>
      {rows.map((k) => <rect key={'o' + k} x={x + step * k - 1} y={y - k - 1} width={w - 2 * step * k + 2} height={2} fill={out} />)}
      {rows.map((k) => <rect key={k} x={x + step * k} y={y - k} width={w - 2 * step * k} height={1} fill={fill} />)}
    </g>
  );
}

// 반원 (돔·유르트): 가운데 cx, 바닥 y, 반지름 rx(가로) · ry(세로)
function PxArc({ cx, y, rx, ry, fill, out }) {
  const rows = Array.from({ length: ry }, (_, k) => [k, Math.round(rx * Math.sqrt(1 - (k / ry) ** 2))]); // [줄, 반폭]
  return (
    <g>
      {rows.map(([k, h]) => <rect key={'o' + k} x={cx - h - 1} y={y - k - 2} width={h * 2 + 2} height={3} fill={out} />)}
      {rows.map(([k, h]) => <rect key={k} x={cx - h} y={y - k - 1} width={h * 2} height={1} fill={fill} />)}
    </g>
  );
}

// 권역 지붕 (x, 벽 위 y, 벽 너비 w): tile 박공 / stilt 가파른 박공 / flat 평지붕 / yurt 둥근 천막 / dome 평지붕 + 작은 돔
function PxRoof({ kind, x, y, w, fill, out }) {
  if (kind === 'flat' || kind === 'dome') {
    return (
      <g>
        <PxBox x={x - 3} y={y - 5} w={w + 6} h={5} fill={fill} out={out} />
        {kind === 'dome' && <PxArc cx={x + w / 2} y={y - 6} rx={Math.min(12, Math.floor(w / 5))} ry={Math.min(9, Math.floor(w / 7))} fill={fill} out={out} />}
      </g>
    );
  }
  if (kind === 'yurt') return <PxArc cx={x + w / 2} y={y} rx={Math.floor(w / 2) + 4} ry={Math.floor(w / 4)} fill={fill} out={out} />;
  return <PxGable x={x - 4} y={y - 1} w={w + 8} step={kind === 'stilt' && w < 60 ? 1 : 2} fill={fill} out={out} />; // 다락집은 작은 집만 가파르게 (큰 집은 화면 위로 잘림)
}

// 낮은 나무 울타리 (6칸마다 기둥)
function PxFence({ x, w, fill, out }) {
  const posts = Array.from({ length: Math.floor(w / 6) + 1 }, (_, i) => x + i * 6);
  return (
    <g>
      <rect x={x - 1} y={85} width={w + 2} height={3} fill={out} />
      <rect x={x} y={86} width={w} height={1} fill={fill} />
      {posts.map((px) => <PxBox key={px} x={px} y={83} w={2} h={9} fill={fill} out={out} />)}
    </g>
  );
}

// 빨랫줄: 두 기둥 사이로 줄이 살짝 처지고 빨래 두 장
const SAG = Array.from({ length: 52 }, (_, i) => Math.round(3 * Math.sin((Math.PI * i) / 52))); // 줄이 처지는 깊이
function PxLaundry({ x, c, out }) {
  return (
    <g>
      <rect x={x} y={70} width={1} height={22} fill={out} />
      <rect x={x + 52} y={70} width={1} height={22} fill={out} />
      {SAG.map((d, i) => <rect key={i} x={x + i} y={72 + d} width={1} height={1} fill={out} />)}
      <PxBox x={x + 12} y={75} w={7} h={9} fill="#ffffff" out={out} />
      <PxBox x={x + 27} y={76} w={9} h={7} fill={c.leaf} out={out} />
    </g>
  );
}

// 권역 나무 (픽셀): blossom·tree 둥근 나무 / palm 야자수 / grass 풀
const PALM_LEAF = [[-16, -2, 6], [-12, -4, 7], [-6, -5, 6], [-2, -6, 5], [3, -5, 6], [8, -4, 7], [12, -2, 6], [-18, 0, 3], [17, 0, 3]];
const GRASS = [[-7, -6, 1, 6], [-8, -10, 1, 4], [-9, -12, 1, 2], [0, -9, 1, 9], [1, -13, 1, 4], [2, -15, 1, 2], [6, -6, 1, 6], [7, -9, 1, 3], [8, -11, 1, 2]];
function PxDeco({ kind, x, c, out }) {
  if (kind === 'palm') {
    const top = 60;
    return (
      <g>
        {Array.from({ length: 32 }, (_, k) => <rect key={k} x={x - 1 + (k > 20 ? 1 : 0)} y={91 - k} width={3} height={1} fill={c.trunk} />)}
        {PALM_LEAF.map(([dx, dy, w], i) => <rect key={'o' + i} x={x + dx - 1} y={top + dy - 1} width={w + 2} height={4} fill={out} />)}
        {PALM_LEAF.map(([dx, dy, w], i) => <rect key={'l' + i} x={x + dx} y={top + dy} width={w} height={2} fill={c.leaf} />)}
      </g>
    );
  }
  if (kind === 'grass') return <g>{GRASS.map(([dx, dy, w, h], i) => <rect key={i} x={x + dx} y={92 + dy} width={w} height={h} fill={c.leaf} />)}</g>;
  return (
    <g>
      <PxTree x={x} c={c} out={out} />
      {kind === 'blossom' && <><rect x={x + 2} y={62} width={2} height={2} fill="#ffffff" opacity="0.8" /><rect x={x - 3} y={68} width={2} height={2} fill="#ffffff" opacity="0.8" /></>}
    </g>
  );
}

// 1단계 판잣집 색 (양철 지붕 · 덧댄 판자)
const SHACK_C = {
  light: { wall: '#c9b08a', plank: '#a88e6a', patchA: '#b89a72', patchB: '#d8c098', tin: '#9aa0a8', ridge: '#7a8088', door: '#7a5a44', soil: '#7a5a44', sprout: '#5a8a4a' },
  dark: { wall: '#7c6b63', plank: '#6c5e55', patchA: '#74635b', patchB: '#88786b', tin: '#6a6f7f', ridge: '#595f6e', door: '#5e4741', soil: '#5e4741', sprout: '#509250' },
};
const TIN = Array.from({ length: 56 }, (_, i) => [132 + i, 72 - Math.floor((i * 8) / 56)]); // 기운 양철 지붕 [x, 아래 y]

// 우리 집 (가정형편 5단계, 픽셀): 1 판잣집 + 텃밭 / 2 작은 단층집 / 3 보통 주택 + 우체통·화분 / 4 2층 양옥 + 차고 / 5 양 날개 저택
//   문은 모두 가운데(x 160 근처, DOOR_X 50%), roof 는 권역 지붕, dark(밤)면 창문 몇 개에 불이 켜짐
function HomeScene({ tier, c, roof, deco, dark }) {
  const out = dark ? PX_OUT.dark : PX_OUT.light;
  const lift = roof === 'stilt' ? 6 : 0; // 동남아 고상 가옥: 집을 6칸 띄우고 기둥

  if (tier <= 1) {
    const s = SHACK_C[dark ? 'dark' : 'light'];
    return (
      <g shapeRendering="crispEdges">
        <PxDeco kind={deco} x={52} c={c} out={out} />
        <PxBox x={136} y={70} w={48} h={22} fill={s.wall} out={out} />
        {[142, 148, 154, 160, 166, 172, 178].map((px) => <rect key={px} x={px} y={70} width={1} height={22} fill={s.plank} />)}
        <PxBox x={140} y={74} w={8} h={6} fill={s.patchA} out={out} />
        <PxBox x={172} y={78} w={8} h={7} fill={s.patchB} out={out} />
        {TIN.map(([x, y], i) => (
          <g key={x}>
            <rect x={x} y={y - 4} width={1} height={1} fill={out} />
            <rect x={x} y={y - 3} width={1} height={3} fill={i % 4 ? s.tin : s.ridge} />
            <rect x={x} y={y} width={1} height={1} fill={out} />
          </g>
        ))}
        <PxBox x={154} y={78} w={12} h={14} fill={s.door} out={out} />
        {/* 작은 텃밭 */}
        {[0, 1, 2, 3, 4].map((k) => (
          <g key={'g' + k}>
            <rect x={200 + k * 10} y={90} width={8} height={2} fill={s.soil} />
            <rect x={202 + k * 10} y={86} width={1} height={4} fill={s.sprout} />
            <rect x={205 + k * 10} y={85} width={1} height={5} fill={s.sprout} />
          </g>
        ))}
      </g>
    );
  }

  if (tier === 2) {
    const y = 64 - lift;
    return (
      <g shapeRendering="crispEdges">
        <PxDeco kind={deco} x={50} c={c} out={out} />
        <PxDeco kind={deco} x={292} c={c} out={out} />
        {lift > 0 && [138, 180].map((px) => <rect key={px} x={px} y={86} width={2} height={6} fill={out} />)}
        <PxBox x={134} y={y} w={52} h={28} fill={c.wall} out={out} />
        <PxRoof kind={roof} x={134} y={y} w={52} fill={c.roofC} out={out} />
        <PxWin x={139} y={y + 6} w={10} h={7} out={out} dark={dark} lit />
        <PxWin x={171} y={y + 6} w={10} h={7} out={out} dark={dark} />
        <PxDoor x={153} y={y + 12} bottom={92 - lift} out={out} />
        <PxFence x={96} w={24} fill={c.trunk} out={out} />
        <PxLaundry x={210} c={c} out={out} />
      </g>
    );
  }

  if (tier === 3) {
    const y = 58 - lift;
    return (
      <g shapeRendering="crispEdges">
        <PxDeco kind={deco} x={46} c={c} out={out} />
        <PxDeco kind={deco} x={290} c={c} out={out} />
        {lift > 0 && [124, 194].map((px) => <rect key={px} x={px} y={86} width={2} height={6} fill={out} />)}
        <PxBox x={120} y={y} w={80} h={34} fill={c.wall} out={out} />
        <PxRoof kind={roof} x={120} y={y} w={80} fill={c.roofC} out={out} />
        {[127, 141, 169, 183].map((wx, i) => <PxWin key={wx} x={wx} y={y + 8} w={10} h={9} out={out} dark={dark} lit={i % 2 === 0} />)}
        <PxDoor x={153} y={y + 12} bottom={92 - lift} out={out} />
        {lift === 0 && <PxBox x={148} y={90} w={24} h={2} fill="#b8aca4" out={out} />}
        <PxFence x={82} w={32} fill={c.trunk} out={out} />
        {/* 우체통 · 화분 */}
        <rect x={214} y={74} width={2} height={18} fill={out} />
        <PxBox x={210} y={68} w={10} h={6} fill="#e8584c" out={out} />
        {[0, 1, 2, 3].map((k) => (
          <g key={'p' + k}>
            <PxBox x={226 + k * 7} y={87} w={5} h={5} fill="#c97a5a" out={out} />
            <rect x={227 + k * 7} y={84} width={3} height={3} fill="#5a8a4a" />
          </g>
        ))}
      </g>
    );
  }

  const r = bigRoof(roof); // 큰 집은 높은 지붕이 화면 위로 잘려서 평지붕 (돔은 작은 돔 장식)

  if (tier === 4) {
    return (
      <g shapeRendering="crispEdges">
        <PxDeco kind={deco} x={58} c={c} out={out} />
        <PxDeco kind={deco} x={290} c={c} out={out} />
        <PxBox x={112} y={38} w={96} h={54} fill={c.wall} out={out} />
        {r === 'flat' ? <PxRoof kind={roof === 'dome' ? 'dome' : 'flat'} x={112} y={38} w={96} fill={c.roofC} out={out} />
          : <PxGable x={106} y={37} w={108} step={3} fill={c.roofC} out={out} />}
        <rect x={112} y={63} width={96} height={1} fill={out} />
        {[120, 142, 168, 190].map((wx, i) => <PxWin key={wx} x={wx} y={44} w={10} h={10} out={out} dark={dark} lit={i === 1 || i === 3} />)}
        <PxWin x={120} y={70} w={10} h={10} out={out} dark={dark} lit />
        <PxWin x={190} y={70} w={10} h={10} out={out} dark={dark} />
        <PxDoor x={152} y={72} w={16} out={out} />
        {/* 차고 */}
        <PxBox x={214} y={66} w={40} h={26} fill={c.wall} out={out} />
        <PxBox x={218} y={72} w={32} h={20} fill={dark ? '#6a6f7f' : '#9aa0a8'} out={out} />
        {[0, 1, 2, 3].map((k) => <rect key={'gl' + k} x={218} y={75 + k * 4} width={32} height={1} fill={dark ? '#595f6e' : '#7a8088'} />)}
        <PxBox x={212} y={62} w={44} h={4} fill={c.roofC} out={out} />
        <PxBox x={90} y={82} w={18} h={10} fill={c.leaf} out={out} />
      </g>
    );
  }

  // 5 다이아수저: 양 날개 저택 + 기둥 현관 + 담장 · 대문
  const stone = dark ? '#6a6489' : '#e8e0d8';
  return (
    <g shapeRendering="crispEdges">
      <PxDeco kind={deco} x={26} c={c} out={out} />
      <PxDeco kind={deco} x={296} c={c} out={out} />
      {/* 양 날개 */}
      {[60, 220].map((wx) => (
        <g key={wx}>
          <PxBox x={wx} y={52} w={40} h={40} fill={c.wall} out={out} />
          {r === 'flat' ? <PxRoof kind="flat" x={wx} y={52} w={40} fill={c.roofC} out={out} />
            : <PxGable x={wx - 4} y={51} w={48} fill={c.roofC} out={out} />}
        </g>
      ))}
      {[[70, 60], [84, 60], [228, 60], [242, 60], [70, 76], [242, 76]].map(([wx, wy], i) => (
        <PxWin key={wx + '-' + wy} x={wx} y={wy} w={8} h={10} out={out} dark={dark} lit={i % 3 === 0} />
      ))}
      {/* 본채 2층 */}
      <PxBox x={94} y={34} w={132} h={58} fill={c.wall} out={out} />
      <PxBox x={90} y={29} w={140} h={5} fill={c.roofC} out={out} />
      {roof === 'dome' && <PxArc cx={160} y={28} rx={12} ry={9} fill={c.roofC} out={out} />}
      {[102, 118, 134, 176, 192, 208].map((wx, i) => <PxWin key={'u' + wx} x={wx} y={40} w={10} h={10} out={out} dark={dark} lit={i % 2 === 1} />)}
      <rect x={94} y={62} width={132} height={1} fill={out} />
      {[104, 120, 190, 206].map((wx, i) => <PxWin key={'d' + wx} x={wx} y={68} w={10} h={12} out={out} dark={dark} lit={i % 2 === 0} />)}
      {/* 기둥 현관 */}
      <PxGable x={142} y={56} w={36} fill={c.roofC} out={out} />
      <PxBox x={142} y={56} w={36} h={3} fill={c.wall} out={out} />
      {[146, 158, 171].map((px) => <PxBox key={px} x={px} y={59} w={3} h={33} fill={c.wall} out={out} />)}
      <PxDoor x={154} y={74} w={12} fill="#7a4a3a" out={out} />
      {/* 담장 · 대문 기둥 · 문등 */}
      <PxBox x={20} y={85} w={118} h={7} fill={stone} out={out} />
      <PxBox x={182} y={85} w={118} h={7} fill={stone} out={out} />
      <PxBox x={136} y={76} w={6} h={16} fill={c.roofC} out={out} />
      <PxBox x={178} y={76} w={6} h={16} fill={c.roofC} out={out} />
      <PxBox x={137} y={72} w={4} h={3} fill="#ffe7a8" out={out} />
      <PxBox x={179} y={72} w={4} h={3} fill="#ffe7a8" out={out} />
    </g>
  );
}

// ───────── 학교 · 대학교 · 보건소 (픽셀, 우리 집 부품 PxWin · PxDoor · PxRoof · PxArc · PxDeco 를 같이 씀) ─────────
//   문은 모두 가운데 (x 160 근처, DOOR_X 50%), dark(밤)면 창문 몇 개에 불이 켜짐

// 하얀 시계 (가운데 x, y, 반지름 r)
function PxClock({ x, y, r = 5, out }) {
  return (
    <g>
      <PxBox x={x - r} y={y - r} w={r * 2} h={r * 2} fill="#ffffff" out={out} />
      <rect x={x} y={y - r + 1} width={1} height={r - 1} fill={out} />
      <rect x={x} y={y} width={r - 2} height={1} fill={out} />
    </g>
  );
}

// 깃대 + 깃발
function PxFlag({ x, fill, out }) {
  return (
    <g>
      <rect x={x} y={44} width={2} height={48} fill={out} />
      <PxBox x={x + 2} y={45} w={16} h={9} fill={fill} out={out} />
    </g>
  );
}

// 십자 간판 (가운데 x, y, 크기 n)
function PxCross({ x, y, n = 9, fill = '#e8584c', bg = '#ffffff', out }) {
  const h = Math.floor(n / 2);
  return (
    <g>
      <PxBox x={x - h} y={y - h} w={n} h={n} fill={bg} out={out} />
      <rect x={x - 1} y={y - h} width={3} height={n} fill={fill} />
      <rect x={x - h} y={y - 1} width={n} height={3} fill={fill} />
    </g>
  );
}

// 학교 (시안 5: 가운데 시계탑): 2층 교사 + 시계탑(권역 지붕) + 그네 + 국기 게양대
function SchoolScene({ c, roof, deco, dark }) {
  const out = dark ? PX_OUT.dark : PX_OUT.light;
  return (
    <g shapeRendering="crispEdges">
      {/* 그네 */}
      <rect x={30} y={64} width={2} height={28} fill={c.trunk} />
      <rect x={60} y={64} width={2} height={28} fill={c.trunk} />
      <rect x={30} y={64} width={32} height={2} fill={out} />
      <rect x={42} y={64} width={1} height={16} fill={out} />
      <rect x={52} y={64} width={1} height={14} fill={out} />
      <PxBox x={40} y={80} w={6} h={2} fill={c.roofC} out={out} />
      <PxBox x={50} y={78} w={6} h={2} fill={c.roofC} out={out} />
      {/* 시계탑 (교사 뒤) */}
      <PxBox x={150} y={24} w={20} h={16} fill={c.wall} out={out} />
      <PxRoof kind={roof === 'stilt' ? 'tile' : roof} x={150} y={24} w={20} fill={c.roofC} out={out} />
      <PxClock x={160} y={32} out={out} />
      {/* 2층 교사 */}
      <PxBox x={96} y={44} w={136} h={48} fill={c.wall} out={out} />
      <PxBox x={92} y={39} w={144} h={5} fill={c.roofC} out={out} />
      {[0, 1, 2, 3, 4, 5].map((i) => <PxWin key={'u' + i} x={104 + i * 21} y={52} w={11} h={9} out={out} dark={dark} lit={i % 3 === 1} />)}
      {[0, 1, 4, 5].map((i) => <PxWin key={'d' + i} x={104 + i * 21} y={68} w={11} h={9} out={out} dark={dark} lit={i === 4} />)}
      <PxDoor x={153} y={74} out={out} />
      <PxFlag x={256} fill="#f26b38" out={out} />
      <PxDeco kind={deco} x={292} c={c} out={out} />
    </g>
  );
}

// 대학교 (시안 6: 도서관 돔): 기둥 본관 + 돔 + 양 날개(권역 지붕) + 깃발
function UnivScene({ c, roof, deco, dark }) {
  const out = dark ? PX_OUT.dark : PX_OUT.light;
  const r = bigRoof(roof);
  const pillar = dark ? '#8a8aa8' : '#ffffff';
  return (
    <g shapeRendering="crispEdges">
      <PxDeco kind={deco} x={36} c={c} out={out} />
      {/* 양 날개 */}
      {[78, 196].map((wx) => (
        <g key={wx}>
          <PxBox x={wx} y={56} w={46} h={36} fill={c.wall} out={out} />
          <PxRoof kind={r === 'flat' ? 'flat' : r} x={wx} y={56} w={46} fill={c.roofC} out={out} />
          {[[8, 62], [28, 62], [8, 76], [28, 76]].map(([dx, dy], i) => (
            <PxWin key={dx + '-' + dy} x={wx + dx} y={dy} w={10} h={9} out={out} dark={dark} lit={(i + wx) % 3 === 0} />
          ))}
        </g>
      ))}
      {/* 본관 + 도서관 돔 */}
      <PxArc cx={160} y={40} rx={18} ry={10} fill={c.roofC} out={out} />
      <PxBox x={158} y={26} w={4} h={4} fill="#f2c230" out={out} />
      <PxBox x={122} y={40} w={76} h={52} fill={c.wall} out={out} />
      {[128, 140, 176, 188].map((px) => <PxBox key={px} x={px} y={46} w={4} h={46} fill={pillar} out={out} />)}
      <PxBox x={116} y={40} w={88} h={4} fill={c.roofC} out={out} />
      <PxDoor x={152} y={70} w={16} fill="#7a4a3a" out={out} />
      <PxFlag x={256} fill="#4a7bd0" out={out} />
      <PxDeco kind={deco} x={304} c={c} out={out} />
    </g>
  );
}

// 보건소 (시안 10: 2층 · 응급실 차양 · 구급차 · 화단)
const CLINIC_C = { light: { wall: '#ffffff', amb: '#ffffff' }, dark: { wall: '#848897', amb: '#c8ccd8' } };
const FLOWERS = ['#e8584c', '#f2c230', '#ffffff', '#e8584c'];

function ClinicScene({ c, roof, deco, dark }) {
  const out = dark ? PX_OUT.dark : PX_OUT.light;
  const k = CLINIC_C[dark ? 'dark' : 'light'];
  const r = bigRoof(roof);
  return (
    <g shapeRendering="crispEdges">
      <PxDeco kind={deco} x={60} c={c} out={out} />
      {/* 화단 */}
      {FLOWERS.map((f, i) => (
        <g key={'f' + i}>
          <rect x={94 + i * 4} y={88} width={1} height={4} fill="#5a8a4a" />
          <rect x={93 + i * 4} y={86} width={3} height={2} fill={f} />
        </g>
      ))}
      {/* 2층 건물 */}
      <PxBox x={116} y={34} w={88} h={58} fill={k.wall} out={out} />
      <PxRoof kind={r === 'flat' && roof === 'dome' ? 'dome' : r} x={116} y={34} w={88} fill={c.roofC} out={out} />
      <PxWin x={124} y={42} w={12} h={9} out={out} dark={dark} lit />
      <PxWin x={184} y={42} w={12} h={9} out={out} dark={dark} />
      <PxCross x={160} y={48} out={out} />
      <rect x={116} y={62} width={88} height={1} fill={out} />
      <PxWin x={124} y={72} w={12} h={9} out={out} dark={dark} />
      <PxWin x={184} y={72} w={12} h={9} out={out} dark={dark} lit />
      {/* 유리문 + 응급실 차양 */}
      <PxBox x={153} y={72} w={14} h={20} fill={dark ? GLASS.lit : GLASS.light} out={out} />
      <rect x={160} y={72} width={1} height={20} fill={out} />
      <PxBox x={144} y={66} w={32} h={4} fill="#e8584c" out={out} />
      {[0, 1, 2, 3, 4].map((i) => <rect key={'a' + i} x={146 + i * 6} y={66} width={3} height={4} fill="#ffffff" />)}
      {/* 구급차 */}
      <PxBox x={226} y={78} w={40} h={13} fill={k.amb} out={out} />
      <PxBox x={230} y={73} w={20} h={6} fill={k.amb} out={out} />
      <rect x={256} y={82} width={8} height={1} fill="#e8584c" />
      <PxCross x={242} y={84} n={7} bg={k.amb} out={out} />
      <PxWin x={256} y={74} w={6} h={4} out={out} dark={dark} lit />
      <PxBox x={230} y={90} w={6} h={3} fill={out} out={out} />
      <PxBox x={256} y={90} w={6} h={3} fill={out} out={out} />
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

// ───────── 일터 (직업 산업별, 픽셀) ─────────
// industry: AGRI 농업 → 농장 / INDUSTRY 공업 → 공장 / SERVICE 서비스 → 도시는 사무실, 시골은 가게
// industry 가 없으면 (일하지 않을 때) 도시는 사무 빌딩 + 공장, 시골은 농장
const WORK_C = {
  light: { barn: '#c9544a', barnD: '#8a3a32', crop: '#7bb35a', cow: '#ffffff', smoke: '#e8e0dc', steel: '#9aa0a8', steelD: '#7a8088', red: '#c9544a', blue: '#4a7bd0', orange: '#f2a23a', basket: '#c99a6a', stop: '#4a9a7a' },
  dark: { barn: '#925055', barnD: '#714046', crop: '#509250', cow: '#c8ccd8', smoke: '#767b8f', steel: '#6a6f7f', steelD: '#595f6e', red: '#a44e49', blue: '#3f65a6', orange: '#b78040', basket: '#906d57', stop: '#43836b' },
};

// 논밭 줄: 5줄, 4칸마다 싹 하나 (가운데 헛간 자리 120~200 은 비움) → [x, y]
const CROPS = Array.from({ length: 5 }, (_, r) => Array.from({ length: 75 }, (_, i) => [10 + i * 4, 82 + r * 2]))
  .flat().filter(([x]) => x <= 120 || x >= 200);

// 굴뚝 연기 두 덩이 (x, 굴뚝 위 y)
function PxSmoke({ x, y, fill, out }) {
  return (
    <g>
      <PxBox x={x} y={y} w={5} h={3} fill={fill} out={out} />
      <PxBox x={x + 3} y={y - 6} w={6} h={3} fill={fill} out={out} />
    </g>
  );
}

// 톱니 지붕: 왼쪽 x 부터 n 칸, 한 칸 너비 w (경사 w-1 칸 + 세로 벽)
function PxSaw({ x, n, w, fill, out }) {
  const teeth = Array.from({ length: n }, (_, k) => x + k * w);   // 톱니 시작 x
  const steps = Array.from({ length: w - 1 }, (_, i) => i);       // 경사 한 칸씩
  return (
    <g>
      {teeth.map((tx) => (
        <g key={tx}>
          {steps.map((i) => <rect key={'o' + i} x={tx + i} y={59 - i} width={1} height={1} fill={out} />)}
          {steps.map((i) => <rect key={i} x={tx + i} y={60 - i} width={1} height={i + 1} fill={fill} />)}
          <rect x={tx + w - 1} y={61 - w} width={1} height={w - 1} fill={out} />
        </g>
      ))}
    </g>
  );
}

// 셔터 문 (가로줄 n 개)
function PxShutter({ x, y, w, h, n, k, out }) {
  return (
    <g>
      <PxBox x={x} y={y} w={w} h={h} fill={k.steel} out={out} />
      {Array.from({ length: n }, (_, i) => <rect key={i} x={x} y={y + 3 + i * 4} width={w} height={1} fill={k.steelD} />)}
    </g>
  );
}

// 농장 (시안 5: 소 한 마리): 논밭 줄 + 빨간 헛간(권역 지붕) + 소
function FarmScene({ roof, dark }) {
  const out = dark ? PX_OUT.dark : PX_OUT.light;
  const k = WORK_C[dark ? 'dark' : 'light'];
  return (
    <g shapeRendering="crispEdges">
      {CROPS.map(([x, y]) => <rect key={x + '-' + y} x={x} y={y} width={2} height={1} fill={k.crop} />)}
      {/* 헛간 */}
      <PxBox x={136} y={62} w={48} h={30} fill={k.barn} out={out} />
      <PxRoof kind={roof === 'stilt' ? 'tile' : roof} x={136} y={62} w={48} fill={k.barnD} out={out} />
      <PxWin x={141} y={66} w={8} h={6} out={out} dark={dark} lit />
      <PxWin x={171} y={66} w={8} h={6} out={out} dark={dark} />
      <PxBox x={150} y={70} w={20} h={22} fill={k.barnD} out={out} />
      <rect x={159} y={70} width={1} height={22} fill="#ffffff" />
      {Array.from({ length: 20 }, (_, i) => <rect key={'x' + i} x={150 + i} y={70 + i} width={1} height={1} fill="#ffffff" />)}
      {/* 소 */}
      <PxBox x={226} y={78} w={22} h={9} fill={k.cow} out={out} />
      <rect x={229} y={80} width={6} height={4} fill={out} />
      <rect x={240} y={79} width={4} height={3} fill={out} />
      <PxBox x={246} y={74} w={7} h={7} fill={k.cow} out={out} />
      <rect x={250} y={76} width={1} height={1} fill={out} />
      {[228, 232, 242, 246].map((lx) => <rect key={lx} x={lx} y={87} width={2} height={5} fill={out} />)}
    </g>
  );
}

// 사무 빌딩 + 공장 (산업 모름 · 도시, 시안 1)
function MixedWorkScene({ c, deco, dark }) {
  const out = dark ? PX_OUT.dark : PX_OUT.light;
  const k = WORK_C[dark ? 'dark' : 'light'];
  return (
    <g shapeRendering="crispEdges">
      <PxDeco kind={deco} x={30} c={c} out={out} />
      {/* 사무 빌딩 */}
      <PxBox x={70} y={40} w={70} h={52} fill={c.wall} out={out} />
      <PxBox x={68} y={36} w={74} h={4} fill={c.roofC} out={out} />
      {[0, 1, 2].map((r) => [0, 1, 2, 3].map((i) => (
        <PxWin key={r + '-' + i} x={78 + i * 15} y={47 + r * 12} w={9} h={7} out={out} dark={dark} lit={(r + i) % 3 === 0} />
      )))}
      <PxBox x={98} y={78} w={14} h={14} fill={dark ? GLASS.lit : GLASS.light} out={out} />
      <rect x={105} y={78} width={1} height={14} fill={out} />
      {/* 공장 */}
      <PxBox x={246} y={30} w={8} h={30} fill={c.trunk} out={out} />
      <PxSmoke x={246} y={24} fill={k.smoke} out={out} />
      <PxBox x={166} y={60} w={96} h={32} fill={c.wall} out={out} />
      <PxSaw x={166} n={6} w={16} fill={c.roofC} out={out} />
      <PxWin x={174} y={66} w={10} h={5} out={out} dark={dark} lit />
      <PxWin x={224} y={66} w={10} h={5} out={out} dark={dark} />
      <PxShutter x={196} y={76} w={18} h={16} n={3} k={k} out={out} />
    </g>
  );
}

// 공장 (시안 1): 컨테이너 + 굴뚝 2 + 톱니 지붕 + 하역 셔터 문 (가운데 x 160)
function FactoryScene({ c, deco, dark }) {
  const out = dark ? PX_OUT.dark : PX_OUT.light;
  const k = WORK_C[dark ? 'dark' : 'light'];
  return (
    <g shapeRendering="crispEdges">
      {/* 컨테이너 */}
      <PxBox x={30} y={80} w={26} h={12} fill={k.red} out={out} />
      <PxBox x={58} y={80} w={26} h={12} fill={k.blue} out={out} />
      <PxBox x={40} y={68} w={26} h={12} fill={k.orange} out={out} />
      {[[37, 80], [46, 80], [65, 80], [74, 80], [47, 68], [56, 68]].map(([x, y]) => <rect key={x + '-' + y} x={x} y={y} width={1} height={12} fill={out} />)}
      {/* 굴뚝 · 연기 */}
      <PxBox x={226} y={24} w={8} h={40} fill={c.trunk} out={out} />
      <PxBox x={240} y={32} w={7} h={32} fill={c.trunk} out={out} />
      <PxSmoke x={226} y={18} fill={k.smoke} out={out} />
      <PxSmoke x={240} y={26} fill={k.smoke} out={out} />
      {/* 공장 건물 */}
      <PxBox x={100} y={60} w={140} h={32} fill={c.wall} out={out} />
      <PxSaw x={100} n={7} w={20} fill={c.roofC} out={out} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => <PxWin key={i} x={106 + i * 19} y={65} w={10} h={5} out={out} dark={dark} lit={i % 3 === 1} />)}
      <PxShutter x={150} y={74} w={20} h={18} n={4} k={k} out={out} />
      <PxDeco kind={deco} x={292} c={c} out={out} />
    </g>
  );
}

// 사무실 (도시 서비스업, 시안 1): 버스 정류장 + 유리 빌딩 + 낮은 빌딩
function OfficeScene({ c, deco, dark }) {
  const out = dark ? PX_OUT.dark : PX_OUT.light;
  const k = WORK_C[dark ? 'dark' : 'light'];
  return (
    <g shapeRendering="crispEdges">
      <PxDeco kind={deco} x={40} c={c} out={out} />
      <rect x={78} y={64} width={1} height={28} fill={out} />
      <PxBox x={72} y={58} w={12} h={7} fill={k.stop} out={out} />
      {/* 유리 빌딩 */}
      <PxBox x={128} y={24} w={64} h={68} fill={c.wall} out={out} />
      <PxBox x={126} y={20} w={68} h={4} fill={c.roofC} out={out} />
      {[32, 41, 50, 59, 68].map((wy, r) => [0, 1, 2, 3].map((i) => (
        <PxWin key={wy + '-' + i} x={134 + i * 14} y={wy} w={10} h={6} out={out} dark={dark} lit={(r * 2 + i) % 3 === 0} />
      )))}
      <PxBox x={152} y={76} w={16} h={16} fill={dark ? GLASS.lit : GLASS.light} out={out} />
      <rect x={160} y={76} width={1} height={16} fill={out} />
      {/* 낮은 빌딩 */}
      <PxBox x={206} y={48} w={44} h={44} fill={c.wall} out={out} />
      <PxBox x={206} y={45} w={44} h={3} fill={c.roofC} out={out} />
      {[0, 1, 2].map((r) => [0, 1, 2].map((i) => (
        <PxWin key={'b' + r + '-' + i} x={212 + i * 13} y={56 + r * 10} w={8} h={6} out={out} dark={dark} lit={(r + i) % 2 === 1} />
      )))}
      <PxDeco kind={deco} x={286} c={c} out={out} />
    </g>
  );
}

// 가게 (시골 서비스업, 시안 9: 채소 바구니): 간판 + 줄무늬 차양 + 진열창 + 바구니 3개
const SHOP_GOODS = ['#f2a23a', '#7bb35a', '#e8584c'];
const BASKETS = ['#7bb35a', '#e8584c', '#f2a23a'];

function ShopScene({ c, roof, deco, dark }) {
  const out = dark ? PX_OUT.dark : PX_OUT.light;
  const k = WORK_C[dark ? 'dark' : 'light'];
  const stripe = dark ? '#c8ccd8' : '#ffffff';
  return (
    <g shapeRendering="crispEdges">
      <PxDeco kind={deco} x={50} c={c} out={out} />
      <PxBox x={116} y={56} w={88} h={36} fill={c.wall} out={out} />
      <PxRoof kind={bigRoof(roof)} x={116} y={56} w={88} fill={c.roofC} out={out} />
      {/* 간판 (글자 대신 흰 줄) */}
      <PxBox x={132} y={58} w={56} h={10} fill={c.roofC} out={out} />
      {[0, 1, 2, 3].map((i) => <rect key={'s' + i} x={136 + i * 12} y={62} width={8} height={2} fill={stripe} />)}
      {/* 줄무늬 차양 */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <PxBox key={'a' + i} x={114 + i * 12} y={70} w={11} h={5} fill={i % 2 ? stripe : '#e8584c'} out={out} />)}
      <PxWin x={122} y={78} w={24} h={11} out={out} dark={dark} lit />
      <PxWin x={174} y={78} w={24} h={11} out={out} dark={dark} lit />
      {SHOP_GOODS.map((g, i) => <PxBox key={'g' + i} x={125 + i * 7} y={85} w={4} h={4} fill={g} out={out} />)}
      <PxDoor x={153} y={77} out={out} />
      {/* 채소 바구니 */}
      {BASKETS.map((v, i) => (
        <g key={'b' + i}>
          <PxBox x={214 + i * 14} y={84} w={11} h={8} fill={k.basket} out={out} />
          <rect x={216 + i * 14} y={82} width={7} height={2} fill={v} />
        </g>
      ))}
      <PxDeco kind={deco} x={290} c={c} out={out} />
    </g>
  );
}

function WorkScene({ industry, urban, c, roof, deco, dark }) {
  if (industry === 'AGRI') return <FarmScene roof={roof} dark={dark} />;
  if (industry === 'INDUSTRY') return <FactoryScene c={c} deco={deco} dark={dark} />;
  if (industry === 'SERVICE') return urban ? <OfficeScene c={c} deco={deco} dark={dark} /> : <ShopScene c={c} roof={roof} deco={deco} dark={dark} />;
  return urban ? <MixedWorkScene c={c} deco={deco} dark={dark} /> : <FarmScene roof={roof} dark={dark} />;
}

// 장소별 장면
function Scene({ place, c, t, urban, house, vehicle, industry, dark }) {
  const roof = t.roof;
  const deco = t.deco;
  switch (place) {
    case 'home':
      if (house.kind === 'prison') return <PrisonScene dark={dark} />;
      if (house.kind === 'barracks') return <BarracksScene dark={dark} />;
      return (
        <g>
          {house.kind === 'apt' ? <AptScene c={c} dark={dark} /> : <HomeScene tier={house.tier} c={c} roof={roof} deco={deco} dark={dark} />}
          {vehicle && <Vehicle kind={vehicle} x={232} />}
        </g>
      );
    case 'univ':
      return <UnivScene c={c} roof={roof} deco={deco} dark={dark} />;
    case 'school':
      return <SchoolScene c={c} roof={roof} deco={deco} dark={dark} />;
    case 'work':
      return <WorkScene industry={industry} urban={urban} c={c} roof={roof} deco={deco} dark={dark} />;
    case 'clinic':
      return <ClinicScene c={c} roof={roof} deco={deco} dark={dark} />;
    default: // park: 분수 광장 (마을회관을 합침)
      return <PlazaScene c={c} dark={dark} />;
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
        <Figure look={familyLook({ seed: m.seed ?? m.id, gender: m.gender, age: m.age })} />
        <div className="v-name">{m.label}{m.age != null ? ' ' + m.age + '세' : ''}</div>
      </div>
    </div>
  );
}

// 반려동물 (우리 집 화면에만): 마당을 천천히 오가고, 가는 방향을 바라봄 (CSS v-wander · v-pet-face)
const PET_X = 40;
function PetWalker({ pet }) {
  return (
    <div className="v-person pet" style={{ left: PET_X + '%', top: GROUND_Y + '%' }}>
      <div className="v-pet-walk">
        <Pet kind={pet.kind} name={pet.name} coat={pet.coat} />
        <div className="v-name">{pet.name}</div>
      </div>
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

function VillageScene({ countryCode, age, gender = 'M', place = 'home', urban = true, caption, myMessage, others = [], costume, family = [], house = { tier: 3, kind: 'parents' }, vehicle = null, industry = null, pet = null, happiness = null, onMove }) {
  const info = COUNTRIES[countryCode] || ['', 'EAST'];
  const flagCode = info[0];
  const t = THEMES[info[1]];
  const mode = useTheme(); // light = 노을 마을, dark = 밤 마을
  const mood = moodOf(happiness); // 하늘 날씨: low 흐림·비 / mid 보통 / high 맑음
  const away = house.kind === 'prison' || house.kind === 'barracks'; // 교도소·군 부대: 가족·반려동물 없이 나 혼자
  const c = t[mode];

  const start = idxOf(place);
  const [scene, setScene] = useState(start); // 지금 보이는 장소 화면
  const [enter, setEnter] = useState('');    // 넘어온 방향 (화면 전환 움직임)
  const [x, setX] = useState(DOOR_X);
  const [dir, setDir] = useState('right');
  const [walking, setWalking] = useState(false);
  const [walkId, setWalkId] = useState(0); // 걷기 명령 번호: 새로 걸으라고 할 때마다 +1 → 걷기 반복을 확실히 다시 시작
  const pos = useRef(DOOR_X);
  const sceneRef = useRef(start);
  const target = useRef({ scene: start, x: DOOR_X }); // 가려는 곳 (장소 화면, 그 안 위치)
  const boxRef = useRef(null);
  const awayRef = useRef(away); // 방향키 처리(처음 한 번만 등록)에서도 지금 값을 읽게 ref 로
  useEffect(() => {
    awayRef.current = away;
  }, [away]);

  const go = (sc, gx) => {
    // 교도소·군 부대에 있는 동안은 다른 장소로 못 감 (우리 집 화면 안에서만 걷기)
    const goal = awayRef.current ? idxOf('home') : clamp(sc, 0, PLACES.length - 1);
    target.current = { scene: goal, x: clamp(gx, MIN_X, MAX_X) };
    const right = target.current.scene > sceneRef.current
      || (target.current.scene === sceneRef.current && target.current.x > pos.current);
    setDir(right ? 'right' : 'left');
    setWalking(true);
    setWalkId((n) => n + 1); // 막 멈춘 순간에 다시 걸으라고 해도 effect 가 새로 돌게 함
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
  }, [walking, walkId]);

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

  // C15 채팅(김민승): 내 위치를 바깥(useChat)에 알려 줌 → 같은 나라 사람 화면에서 나도 같이 움직임 (onMove 없으면 아무 일 없음)
  useEffect(() => {
    if (onMove) onMove({ place: PLACES[scene].id, x, dir, walking });
  }, [onMove, scene, x, dir, walking]);

  const here = PLACES[scene];
  const prev = PLACES[scene - 1];
  const next = PLACES[scene + 1];
  const atDoor = Math.abs(x - DOOR_X) < 14;

  return (
    <div ref={boxRef} className={'village ' + mode + ' mood-' + mood} style={{ background: c.sky }}
      onPointerDown={onPointerDown} role="application"
      aria-label={`${t.name} 마을 ${here.name}. 땅을 누르거나 ←·→ 방향키로 걷고, 양 끝으로 가면 옆 장소로 넘어가요`}>
      {mode === 'dark'
        ? SKY_STARS.map(([sx, sy, s], i) => (
          <span key={i} className="v-star" style={{ left: sx + '%', top: sy + '%', width: s, height: s, animationDelay: (i % 5) * 0.6 + 's' }} />
        ))
        : <span className="v-sun" aria-hidden="true" />}
      <MoodSky mood={mood} dark={mode === 'dark'} />
      {mode === 'dark' && mood === 'high' && <span className="v-shoot" aria-hidden="true" />}

      {/* 장소 화면: 바뀔 때마다 옆에서 밀려 들어옴 */}
      <div key={scene + '-' + countryCode} className={'v-scene ' + enter}>
        <svg className="v-art" viewBox="0 0 320 130" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
          <Land kind={t.land} c={c} />
          <rect x="0" y="92" width="320" height="38" fill={c.ground} />
          <rect x="0" y="104" width="320" height="12" fill={c.road} />
          <path d="M0 110 H320" stroke="#ffffff" strokeOpacity={mode === 'dark' ? 0.25 : 0.6} strokeDasharray="8 7" strokeWidth="1" />
          <Scene place={here.id} c={c} t={t} urban={urban} house={house} vehicle={vehicle} industry={industry} dark={mode === 'dark'} />
        </svg>

        {/* 우리 집 가족 (우리 집 화면에만) */}
        {here.id === 'home' && !away && family.map((m, i) => <FamilyPerson key={m.id} m={m} i={i} />)}

        {/* 반려동물 (우리 집 화면에만, 강아지·고양이) */}
        {here.id === 'home' && !away && pet && <PetWalker pet={pet} />}

        {/* 같은 나라 접속자 (흐린 실루엣, C15) - 같은 장소에 있는 사람만, 우리 집은 가족만 있는 공간이라 안 보임 */}
        {here.id !== 'home' && others.filter((o) => (o.place || 'home') === here.id).map((o) => (
          <div key={o.id} className={'v-person other ' + ageGroup(o.age) + ' ' + (o.dir || 'right') + (o.walking ? ' walking' : '')}
            style={{ left: o.x + '%', top: GROUND_Y + '%' }}>
            {o.message && <div className="v-bubble">{o.message}</div>}
            <Figure look={lookOf({ gender: o.gender, age: o.age })} />
            <div className="v-name">{o.name}{o.age != null && ', ' + o.age + '세'}</div>
          </div>
        ))}
      </div>

      {/* 나 */}
      <div className={'v-person me ' + ageGroup(age) + ' ' + dir + (walking ? ' walking' : '')} style={{ left: x + '%', top: GROUND_Y + '%' }}>
        {myMessage && <div className="v-bubble mine">{myMessage}</div>}
        <Figure look={myLook({ gender, age, costume, kind: house.kind })} />
        <div className="v-name mine">나{age != null && ', ' + age + '세'}</div>
      </div>

      {/* 비 (행복이 낮을 때) */}
      {mood === 'low' && <div className="v-rain" aria-hidden="true" />}

      {/* 위: 지금 장소 + 상황 */}
      <div className="v-place-name" aria-live="polite">
        <b>{here.name}</b>
        <span>{here.id === 'home' && (away || (atDoor && !walking)) ? HOUSE_KINDS[house.kind]
          : atDoor && !walking ? here.desc : `${t.name} 마을`}</span>
      </div>
      {away && (
        <div className="v-lock">
          {house.kind === 'barracks' ? '군 복무 중엔 이동할 수 없습니다' : '수감 중엔 이동할 수 없습니다'}
        </div>
      )}
      {caption && (
        <div className="v-caption">
          {flagCode && <img src={`https://flagcdn.com/w20/${flagCode}.png`} alt="" />}
          {caption}
        </div>
      )}

      {/* 양 끝: 옆 장소로 */}
      {prev && !away && (
        <button type="button" className="v-edge left" onPointerDown={(e) => e.stopPropagation()}
          onClick={() => go(scene - 1, 82)} aria-label={prev.name + '(으)로 가기'}>◀ {prev.name}</button>
      )}
      {next && !away && (
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