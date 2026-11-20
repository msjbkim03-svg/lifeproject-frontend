// 지구본 + 시대 궤도 (메인 H01, 디자인 시안 '5-1 유리 구슬 변형' 3번 맑은 물방울 · 라이트 안개 회청 / 다크 저녁 남색)
// 출생 화면 ToonEarth(3D)도 같은 디자인
// 시대 고르는 방법
//   1) 궤도 위 점 누르기   2) 지구본·궤도를 좌우로 끌기   3) 지구본 왼쪽/오른쪽 누르기 (한 칸씩)
//   4) 키보드: 지구본을 선택(Tab)한 뒤 ← →
// 예: <OrbitGlobe value={decade} onChange={setDecade} />
//     <OrbitGlobe value={decade} onChange={setDecade} births={[{ lon: 90.4, lat: 23.8, at: Date.now() }]} deaths={[...]} />
// value: 고른 시대(1940 … 2020),  onChange(시대): 다른 시대로 바뀔 때
// births: 금색 별로 반짝일 출생 위치 [{ lon, lat, at }] (at = 태어난 시각 ms, 넣으면 막 태어난 별이 크게 퍼짐)
// deaths: 빈 원으로 표시할 사망 위치 [{ lon, lat }]
//
// 버벅임 방지: 지구본은 <canvas>에 직접 그리고(React 다시 그리기 없음), 궤도 점 위치도 ref로 바로 옮겨요.
import { useEffect, useRef } from 'react';
import { ASIA_LAND, OTHER_LAND } from './globeLand';
import { ASIA as ASIA_DOTS, OTHER as OTHER_DOTS } from './globeDots';
import { getTheme } from '../theme';
import './ui.css';

import { DECADES } from './decades'; // 시대 목록은 따로 (컴포넌트 파일은 컴포넌트만 export - Fast refresh 규칙)

// 예시 위치 (서버 데이터 오기 전)
const SAMPLE_BIRTHS = [
  { lon: 90.4, lat: 23.8 }, { lon: 105.8, lat: 21 }, { lon: 106.8, lat: -6.2 }, { lon: 121, lat: 14.6 },
  { lon: 77.2, lat: 28.6 }, { lon: 67, lat: 24.9 }, { lon: 104, lat: 30.6 }, { lon: 51.4, lat: 35.7 },
];
const SAMPLE_DEATHS = [
  { lon: 127, lat: 37.5 }, { lon: 139.7, lat: 35.7 }, { lon: 100.5, lat: 13.7 }, { lon: 46.7, lat: 24.7 },
];

// 그림 크기 (이 좌표로 그리고, 실제 크기에 맞춰 늘림)
const W = 692;
const H = 400;
const CX = 346;       // 지구본 중심
const CY = 190;
const R = 150;        // 지구본 반지름
const RX = 312;       // 궤도 가로 반지름
const RY = 58;        // 궤도 세로 반지름
const OY = CY + 36;   // 궤도 중심 높이
const TILT = (-7 * Math.PI) / 180; // 궤도 기울기
const GAP = 22;       // 궤도 위 시대 사이 각도
const LAT0 = (22 * Math.PI) / 180;  // 지구본이 바라보는 위도
const SIN0 = Math.sin(LAT0);
const COS0 = Math.cos(LAT0);
const DRAG_STEP = 0.13; // 끌기: 그림 너비의 13%를 끌면 한 시대

const rad = (d) => (d * Math.PI) / 180;
const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
const animTime = (dist) => 380 + Math.min(4, dist) * 80;

// 경도·위도 데이터를 미리 삼각함수 값으로 바꿔 둠 (매 프레임 계산 줄이기)
function prepare(list) {
  const n = list.length / 2;
  const lon = new Float32Array(n);
  const sinLat = new Float32Array(n);
  const cosLat = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    lon[i] = rad(list[i * 2]);
    sinLat[i] = Math.sin(rad(list[i * 2 + 1]));
    cosLat[i] = Math.cos(rad(list[i * 2 + 1]));
  }
  return { n, lon, sinLat, cosLat };
}
// 땅 덩어리마다 미리 계산 (예전 점 지도 대신 실제 지구본처럼 땅을 채워 그림)
const ASIA_P = ASIA_LAND.map(prepare);
// 라이트(메인 시안): 점으로 찍은 지도 - 아시아는 진한 밤색 점, 그 밖은 옅은 점
const ASIA_D = prepare(ASIA_DOTS);
const OTHER_D = prepare(OTHER_DOTS);
const OTHER_P = OTHER_LAND.map(prepare);

// 경도·위도 → 화면 좌표 (정사영). z > 0 이면 앞면(보임)
function project(lonDeg, latDeg, lon0) {
  const l = rad(lonDeg) - lon0;
  const p = rad(latDeg);
  const z = SIN0 * Math.sin(p) + COS0 * Math.cos(p) * Math.cos(l);
  return {
    x: CX + R * Math.cos(p) * Math.sin(l),
    y: CY - R * (COS0 * Math.sin(p) - SIN0 * Math.cos(p) * Math.cos(l)),
    z,
  };
}

// 궤도 위 각도(도) → 화면 좌표. front: 지구본 앞쪽 반
function orbitPoint(t) {
  const a = rad(t);
  const x = RX * Math.cos(a);
  const y = RY * Math.sin(a);
  return {
    x: CX + x * Math.cos(TILT) - y * Math.sin(TILT),
    y: OY + x * Math.sin(TILT) + y * Math.cos(TILT),
    front: Math.sin(a) > 0,
  };
}

function orbitPath(from, to) {
  const path = new Path2D();
  for (let t = from; t <= to; t += 3) {
    const p = orbitPoint(t);
    if (t === from) path.moveTo(p.x, p.y);
    else path.lineTo(p.x, p.y);
  }
  return path;
}

// 땅 채우기: 뒤쪽(안 보이는 쪽) 점은 지구본 테두리에 붙여서, 잘린 땅도 테두리를 따라 자연스럽게 닫힘
function drawLand(ctx, rings, lon0, fill, stroke) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 0.6;
  for (const P of rings) {
    let front = false;
    ctx.beginPath();
    for (let i = 0; i < P.n; i++) {
      const dl = P.lon[i] - lon0;
      const c = Math.cos(dl);
      const z = SIN0 * P.sinLat[i] + COS0 * P.cosLat[i] * c;
      let x = R * P.cosLat[i] * Math.sin(dl);
      let y = -R * (COS0 * P.sinLat[i] - SIN0 * P.cosLat[i] * c);
      if (z < 0) {
        const d = Math.hypot(x, y) || 1;
        x = (x / d) * R;
        y = (y / d) * R;
      } else {
        front = true;
      }
      if (i === 0) ctx.moveTo(CX + x, CY + y);
      else ctx.lineTo(CX + x, CY + y);
    }
    if (!front) continue; // 통째로 뒤쪽이면 안 그림
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
}

// 테마별 지구본 색 (디자인 시안 3번 맑은 물방울): 거의 투명한 물방울 안에 흰 땅이 떠 있고, 뒤 배경이 비침
//   유리 패널(design.css --glass)과 같은 언어: 옅은 바다 + 흰 땅, 아시아만 강조색 (라이트 주황 / 다크 금빛)
//   물방울 느낌: 오른쪽 아래 그늘 + 왼쪽 위 강한 빛 + 반사 띠 + 오른쪽 아래 굴절 빛줄기 + 흰 테두리 (paint 에서 한 번 만들어 둠)
//   궤도·별은 테마 색 (궤도 뒤 = 궤도 점 테두리 --orbit-ring, 앞 = --primary)
const PAL = {
  light: {
    grid: null, orbitBack: '#b9c3d3', orbitFront: '#c24d27',
    other: ['rgba(255, 255, 255, 0.55)', 'rgba(255, 255, 255, 0.95)'],
    asia: ['rgba(194, 77, 39, 0.55)', 'rgba(194, 77, 39, 0.9)'], death: '#566173',
    star: [194, 77, 39], atm: [255, 255, 255], atmA: 0.35,
    sea: ['rgba(220, 238, 250, 0.25)', 'rgba(120, 170, 215, 0.35)'], rim: 'rgba(255, 255, 255, 0.7)',
  },
  dark: {
    grid: null, orbitBack: '#7a88a4', orbitFront: '#f2c66d',
    other: ['rgba(238, 241, 247, 0.22)', 'rgba(238, 241, 247, 0.6)'],
    asia: ['rgba(242, 198, 109, 0.6)', 'rgba(242, 198, 109, 0.95)'], death: '#c3cbdb',
    star: [242, 198, 109], atm: [159, 184, 255], atmA: 0.35,
    sea: ['rgba(120, 170, 230, 0.12)', 'rgba(60, 100, 160, 0.35)'], rim: 'rgba(255, 255, 255, 0.55)',
  },
};

// 점 지도 (라이트): 앞면 점만, 테두리 쪽은 작고 흐리게
function drawDots(ctx, P, lon0, color, size) {
  ctx.fillStyle = color;
  for (let i = 0; i < P.n; i++) {
    const dl = P.lon[i] - lon0;
    const c = Math.cos(dl);
    const z = SIN0 * P.sinLat[i] + COS0 * P.cosLat[i] * c;
    if (z <= 0.02) continue;
    const x = CX + R * P.cosLat[i] * Math.sin(dl);
    const y = CY - R * (COS0 * P.sinLat[i] - SIN0 * P.cosLat[i] * c);
    ctx.globalAlpha = 0.35 + 0.65 * z;
    ctx.beginPath();
    ctx.arc(x, y, size * (0.55 + 0.45 * z), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

// 경선·위선 (30도 간격, 앞쪽만)
function drawGrid(ctx, lon0, pal) {
  ctx.strokeStyle = pal.grid;
  ctx.lineWidth = 0.7;
  const line = (pts) => {
    ctx.beginPath();
    let on = false;
    pts.forEach(([lo, la]) => {
      const p = project(lo, la, lon0);
      if (p.z <= 0) { on = false; return; }
      if (!on) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
      on = true;
    });
    ctx.stroke();
  };
  for (let lo = -180; lo < 180; lo += 30) {
    const pts = [];
    for (let la = -90; la <= 90; la += 5) pts.push([lo, la]);
    line(pts);
  }
  for (let la = -60; la <= 60; la += 30) {
    const pts = [];
    for (let lo = -180; lo <= 180; lo += 5) pts.push([lo, la]);
    line(pts);
  }
}

// 지구본 한 장 그리기
function draw(ctx, cur, now, births, deaths, paths) {
  const pal = paths.pal;
  const lon0 = rad(92 + (cur - 4) * 8); // 시대 한 칸마다 8도씩 돌아감
  ctx.clearRect(0, 0, W, H);

  // 궤도 뒤쪽 반
  ctx.lineWidth = 1.1;
  ctx.strokeStyle = pal.orbitBack;
  ctx.stroke(paths.back);

  // 대기 빛 + 바다
  ctx.fillStyle = paths.atm;
  ctx.beginPath(); ctx.arc(CX, CY, R * 1.16, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = paths.sea;
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.fill();

  if (pal.dots) {
    drawDots(ctx, OTHER_D, lon0, pal.other[0], 1.8);
    drawDots(ctx, ASIA_D, lon0, pal.asia[0], 2.3);
  } else {
    if (pal.grid) drawGrid(ctx, lon0, pal);
    drawLand(ctx, OTHER_P, lon0, pal.other[0], pal.other[1]);
    drawLand(ctx, ASIA_P, lon0, pal.asia[0], pal.asia[1]);
  }

  // 유리 구슬: 그늘 → 빛 → 반사 띠 (구 안쪽만) + 흰 테두리
  ctx.save();
  ctx.beginPath(); ctx.arc(CX, CY, R, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = paths.shade; ctx.fillRect(CX - R, CY - R, R * 2, R * 2);
  ctx.fillStyle = paths.hilite; ctx.fillRect(CX - R, CY - R, R * 2, R * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'; // 반사 띠 (왼쪽 위, 28도 기울인 타원)
  ctx.beginPath(); ctx.ellipse(CX - 62, CY - 92, 46, 22, rad(-28), 0, Math.PI * 2); ctx.fill();
  // 굴절 빛줄기 (오른쪽 아래 가장자리를 따라 짧은 흰 호)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(CX, CY, R - 10, rad(48.4), rad(13.7), true); ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = pal.rim;
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(CX, CY, R - 0.5, 0, Math.PI * 2); ctx.stroke();

  // 떠난 사람 (빈 원)
  ctx.strokeStyle = pal.death;
  ctx.lineWidth = 1.3;
  deaths.forEach((d) => {
    const p = project(d.lon, d.lat, lon0);
    if (p.z <= 0.05) return;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.stroke();
  });

  // 태어난 아기 (반짝이는 금색 별) - 막 태어난 별은 크게 퍼졌다가 줄어듦
  const wall = Date.now(); // b.at 은 Date.now() 기준 시각
  births.forEach((b, i) => {
    const p = project(b.lon, b.lat, lon0);
    if (p.z <= 0.05) return;
    const age = b.at ? Math.max(0, (wall - b.at) / 1000) : 99;
    const pop = age < 1.2 ? 1 + (1.2 - age) * 2.2 : 1;
    const tw = 0.65 + 0.35 * Math.sin(now / 450 + i * 1.7);
    const gl = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 10 * pop);
    const [sr, sg, sb] = pal.star;
    gl.addColorStop(0, `rgba(${sr},${sg},${sb},0.7)`);
    gl.addColorStop(1, `rgba(${sr},${sg},${sb},0)`);
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(p.x, p.y, 10 * pop, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = tw;
    ctx.fillStyle = `rgb(${sr},${sg},${sb})`;
    ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 1;
  });

  // 궤도 앞쪽 반
  ctx.lineWidth = 1.3;
  ctx.strokeStyle = pal.orbitFront;
  ctx.stroke(paths.front);
}

function OrbitGlobe({ value = 1980, onChange, births = SAMPLE_BIRTHS, deaths = SAMPLE_DEATHS, decades = DECADES, hint = true }) {
  const boxRef = useRef(null);
  const canvasRef = useRef(null);
  const markRefs = useRef([]);

  // 애니메이션 상태는 전부 ref (화면을 React로 다시 그리지 않음)
  const st = useRef(null);
  if (st.current === null) {
    const start = Math.max(0, decades.indexOf(value));
    st.current = { cur: start, target: start, anim: null, drag: null, lastSent: start };
  }
  const dataRef = useRef({ births, deaths, onChange, decades });
  useEffect(() => {
    dataRef.current = { births, deaths, onChange, decades };
  });

  // 바깥에서 value가 바뀌면 그 시대로 돌아가기
  useEffect(() => {
    const s = st.current;
    const to = Math.max(0, decades.indexOf(value));
    s.target = to;
    s.lastSent = to;
    if (s.drag || Math.abs(s.cur - to) < 0.001) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      s.cur = to;
      s.anim = null;
      return;
    }
    s.anim = { from: s.cur, to, start: performance.now(), dur: animTime(Math.abs(to - s.cur)) };
  }, [value, decades]);

  // 그리기 반복 (requestAnimationFrame)
  useEffect(() => {
    const canvas = canvasRef.current;
    const box = boxRef.current;
    const ctx = canvas.getContext('2d');

    // 매 프레임 새로 만들 필요 없는 것들
    // 테마마다 대기 빛·바다 색 (테마가 바뀌면 다시 만듦)
    const paths = { front: orbitPath(0, 180), back: orbitPath(180, 360), theme: null };
    const paint = (theme) => {
      const pal = PAL[theme];
      const [ar, ag, ab] = pal.atm;
      const atm = ctx.createRadialGradient(CX, CY, 0, CX, CY, R * 1.16);
      atm.addColorStop(0.84, `rgba(${ar},${ag},${ab},0)`);
      atm.addColorStop(0.92, `rgba(${ar},${ag},${ab},${pal.atmA ?? 0.3})`);
      atm.addColorStop(1, `rgba(${ar},${ag},${ab},0)`);
      const sea = ctx.createRadialGradient(CX - R * 0.2, CY - R * 0.3, 0, CX, CY, R);
      sea.addColorStop(0, pal.sea[0]);
      sea.addColorStop(1, pal.sea[1]);
      // 유리 구슬 그늘(오른쪽 아래)·빛(왼쪽 위)
      const shade = ctx.createRadialGradient(CX + R * 0.4, CY + R * 0.5, 0, CX + R * 0.4, CY + R * 0.5, R * 1.2);
      shade.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
      shade.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
      const hilite = ctx.createRadialGradient(CX - R * 0.36, CY - R * 0.5, 0, CX - R * 0.36, CY - R * 0.5, R * 0.9);
      hilite.addColorStop(0, 'rgba(255, 255, 255, 0.85)');
      hilite.addColorStop(1, 'rgba(255, 255, 255, 0)');
      Object.assign(paths, { theme, pal, atm, sea, shade, hilite });
    };

    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = box.clientWidth;
      const scale = w / W;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(((w * H) / W) * dpr);
      ctx.setTransform(dpr * scale, 0, 0, dpr * scale, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    let frame;
    const loop = (now) => {
      const s = st.current;
      const { births: b, deaths: d, decades: decs } = dataRef.current;

      if (s.anim) {
        if (s.anim.start == null) s.anim.start = now; // 누를 때 만든 움직임은 첫 프레임 시각부터 셈
        const k = Math.min(1, (now - s.anim.start) / s.anim.dur);
        s.cur = s.anim.from + (s.anim.to - s.anim.from) * easeInOut(k);
        if (k >= 1) s.anim = null;
      }

      const theme = getTheme();
      if (paths.theme !== theme) paint(theme);
      draw(ctx, s.cur, now, b, d, paths);

      // 궤도 점 옮기기 (DOM 직접)
      const onIdx = s.drag ? Math.round(s.cur) : s.target;
      for (let i = 0; i < decs.length; i++) {
        const el = markRefs.current[i];
        if (!el) continue;
        const p = orbitPoint(90 - (i - s.cur) * GAP);
        el.style.left = (p.x / W) * 100 + '%';
        el.style.top = (p.y / H) * 100 + '%';
        el.style.zIndex = p.front ? 3 : 1;
        el.classList.toggle('back', !p.front);
        el.classList.toggle('on', i === onIdx);
        el.setAttribute('aria-pressed', i === onIdx ? 'true' : 'false');
      }

      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  // 시대 고르기 (부모에 알림)
  const pick = (i) => {
    const { onChange: cb, decades: decs } = dataRef.current;
    const idx = Math.max(0, Math.min(decs.length - 1, i));
    const s = st.current;
    s.anim = { from: s.cur, to: idx, start: null, dur: animTime(Math.abs(idx - s.cur)) };
    if (idx === s.target) return;
    s.target = idx;
    s.lastSent = idx;
    if (cb) cb(decs[idx]);
  };

  // 끌기·누르기 (지구본 전체가 범위)
  const onPointerDown = (e) => {
    if (e.button !== 0) return;
    if (e.target.closest('.orbit-mark')) return; // 궤도 점 버튼은 onClick으로 따로 처리
    const s = st.current;
    s.anim = null;
    s.drag = { x: e.clientX, cur: s.cur, moved: 0 };

    const move = (ev) => {
      const w = boxRef.current.clientWidth;
      const dx = ev.clientX - s.drag.x;
      s.drag.moved = Math.max(s.drag.moved, Math.abs(dx));
      const n = dataRef.current.decades.length;
      // 오른쪽으로 끌면 이전 시대가 앞으로 옴 (궤도가 끄는 방향으로 돎)
      s.cur = Math.max(-0.3, Math.min(n - 0.7, s.drag.cur - dx / (w * DRAG_STEP)));
      const near = Math.max(0, Math.min(n - 1, Math.round(s.cur)));
      if (near !== s.lastSent) {
        s.lastSent = near;
        s.target = near;
        const { onChange: cb, decades: decs } = dataRef.current;
        if (cb) cb(decs[near]); // 끄는 동안에도 왼쪽 글자가 같이 바뀜
      }
    };
    const up = (ev) => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      const d = s.drag;
      s.drag = null;
      if (d.moved < 6) {
        // 그냥 누름: 지구본 중심보다 왼쪽이면 이전 시대, 오른쪽이면 다음 시대
        const rect = boxRef.current.getBoundingClientRect();
        const center = rect.left + rect.width * (CX / W);
        pick(s.target + (ev.clientX < center ? -1 : 1));
      } else {
        // 끌다 놓음: 가장 가까운 시대에 착 붙기
        const n = dataRef.current.decades.length;
        s.target = Math.max(0, Math.min(n - 1, Math.round(s.cur)));
        s.anim = { from: s.cur, to: s.target, start: performance.now(), dur: 280 };
      }
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); pick(st.current.target - 1); }
    if (e.key === 'ArrowRight') { e.preventDefault(); pick(st.current.target + 1); }
  };

  return (
    <div ref={boxRef} className="orbit" role="group" tabIndex={0}
      aria-label="태어날 시대 고르기. 좌우 방향키로도 바꿀 수 있어요"
      onPointerDown={onPointerDown} onKeyDown={onKeyDown}>
      <canvas ref={canvasRef} className="orbit-canvas" role="img"
        aria-label="아시아가 보이는 지구본. 금색 별은 방금 태어난 곳, 빈 원은 떠난 사람" />
      {decades.map((d, i) => (
        <button key={d} ref={(el) => { markRefs.current[i] = el; }} type="button" className="orbit-mark"
          aria-label={d + '년대'} tabIndex={-1} onClick={() => pick(i)}>
          <i /><b><span className="short">{String(d).slice(2)}</span><span className="long">{d}년대</span></b>
        </button>
      ))}
      {hint && <p className="orbit-hint">지구본을 좌우로 끌거나, 궤도 위 점이나 지구본 양쪽을 눌러 시대를 고르세요</p>}
    </div>
  );
}

export default OrbitGlobe;
