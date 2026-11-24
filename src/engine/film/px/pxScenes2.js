// C22 엔딩 크레딧 장면 2차 (11/24 동현님: "결혼식급으로 디테일하게 전부 장면 바꿨으면")
// 결혼식(pxScenes.wedding)을 기준으로 장면마다
//   ① 그 장소다운 배경을 여러 겹 (먼 곳 · 건물 · 소품 · 바닥)
//   ② 사람을 앞뒤 두 줄로 두고, 서로 마주 보고 움직이게 (다가감 → 사건 → 반응)
//   ③ 꽃잎 · 색종이 · 김 · 빗방울 · 빛 같은 작은 움직임
// 시간 t(ms)는 0~8.5초쯤까지 (큰 사건 장면 5.6초 × 1.5), 4~5초 안에 이야기가 끝나고 그 뒤는 잔잔히 이어짐
// 장면 목록은 scenes.js 가 처음 장면(pxScenes) 위에 덮어씀
import { W, H, mix, dk, lt, rng, seg, ease, lerp, wave } from './pxCore';
import { figure, lookOf } from './pxFigure';
import { actor, room, frame, clock, plant, rug, shelf, lamp, bed, lieIn, hills, ground, bricks, bwin, roof, door, treeAt, bush, bench, lampPost } from './pxArt';
import {
  bubble, draw, skyBands, sun, cloud, birds, tree, grass, bloom, lights, heartPop, floatHeart,
  castOf, extra, paletteOf, dressed, mourn, other, bub, sparkle, roomSky, skyCols, bundleAt, smoke,
} from './pxScenes';

// ───────── 공용 소품 ─────────
const OUT = '#2e2a33';
// 부드러운 빛 (가운데일수록 진하게)
export function glow(px, x, y, r, col, a = 0.18) {
  for (let i = 3; i >= 1; i--) px.alpha(a / 2.2, () => px.disc(x, y, Math.max(1, Math.round((r * i) / 3)), col));
}
// 색종이 (start 부터 떨어짐)
export function confetti(px, t, start, n, seed, cols = ['#f6a5bd', '#ffd37a', '#9fc7e0', '#b7e0a0', '#c4a8ec', '#ffffff']) {
  if (t < start) return;
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const x0 = R() * W;
    const sp = 0.03 + R() * 0.035;
    const delay = R() * 900;
    const ph = R() * 1000;
    const tt = t - start - delay;
    if (tt < 0) continue;
    const y = -4 + ((tt * sp) % 152);
    const x = x0 + Math.sin((tt + ph) / 320) * 5;
    const f = Math.floor((tt + ph) / 110) % 3;
    const col = cols[i % cols.length];
    if (f === 0) px.rect(x, y, 2, 1, col); else if (f === 1) px.rect(x, y, 1, 2, col); else px.px(x, y, col);
  }
}
// 식탁 · 책상 (y = 상판 높이, G = 바닥)
export function table(px, x, y, w, G, c = '#a87650', cloth = null) {
  px.alpha(0.18, () => px.rect(x - 1, G, w + 2, 2, '#1c1426'));
  px.rect(x + 2, y + 2, 2, G - y - 2, dk(c, 0.25)); px.rect(x + w - 4, y + 2, 2, G - y - 2, dk(c, 0.25));
  px.rect(x, y, w, 3, c); px.hl(x, x + w - 1, y, lt(c, 0.28)); px.hl(x, x + w - 1, y + 3, dk(c, 0.35));
  if (cloth) {
    px.rect(x - 1, y - 1, w + 2, 2, cloth); px.rect(x - 1, y + 1, w + 2, 6, cloth);
    px.hl(x - 1, x + w, y + 6, dk(cloth, 0.18)); for (let i = x + 1; i < x + w; i += 4) px.vl(i, y + 2, y + 5, lt(cloth, 0.2));
  }
}
// 의자 (옆모습, dir 1 = 오른쪽을 봄 → 등받이가 왼쪽)
export function chair(px, x, G, c = '#8a5a3b', dir = 1) {
  px.rect(x - 4, G - 9, 9, 2, c); px.hl(x - 4, x + 4, G - 9, lt(c, 0.25));
  px.rect(x - 3, G - 7, 1, 7, dk(c, 0.2)); px.rect(x + 3, G - 7, 1, 7, dk(c, 0.2));
  const bx = dir > 0 ? x - 4 : x + 3;
  px.rect(bx, G - 20, 2, 12, c); px.rect(bx, G - 20, 2, 1, lt(c, 0.3));
}
// 피어오르는 김
export function steam(px, x, y, t, a = 0.55, n = 3) {
  for (let i = 0; i < n; i++) {
    const q = ((t * 0.0009 + i / n) % 1);
    px.alpha(a * (1 - q), () => px.px(x + Math.round(Math.sin(t / 280 + i * 2) * 1.5), y - Math.round(q * 9), '#ffffff'));
  }
}
// 꽃병
export function vase(px, x, y, cols = ['#f05a7e', '#ffd37a', '#ffffff']) {
  px.rect(x - 2, y - 6, 5, 6, '#9fc7e0'); px.px(x - 1, y - 5, '#d6ecf6'); px.hl(x - 2, x + 2, y, '#6a94b0');
  cols.forEach((cc, i) => { const dx = i * 2 - 2; px.vl(x + dx, y - 10, y - 7, '#4e7a44'); bloom(px, x + dx - 1, y - 12 + (i % 2), cc); });
}
// 사진 액자 (사람 얼굴 칸) - 가족사진
export function photo(px, x, y, w = 14, h = 11) {
  px.rect(x - 1, y - 1, w + 2, h + 2, '#6a4a32'); px.rect(x, y, w, h, '#f2e6d0');
  px.rect(x + 1, y + h - 4, w - 2, 3, '#c9a07a');
  for (let i = 0; i < 3; i++) { const cx = x + 3 + i * 4; px.disc(cx, y + 4, 1, '#3a2c26'); px.px(cx, y + 5, '#f2c9a0'); px.rect(cx - 1, y + 6, 3, 2, ['#8fb0ec', '#e9a0b4', '#9fd0b8'][i]); }
}
// 사람 (그림 위치만 계산, 걷기 · 멈추기)
const walkX = (t, a, b, x0, x1) => { const q = seg(t, a, b); return { x: Math.round(lerp(x0, x1, ease(q))), walk: q > 0 && q < 1 }; };
const clapPose = (t, i, on = true) => (!on ? 'stand' : Math.floor((t + i * 70) / 190) % 2 ? 'clap1' : 'stand');
const cheerPose = (t, i) => (Math.floor((t + i * 90) / 220) % 2 ? 'up' : 'wave1');
const hop = (t, i, amp = 3) => -Math.abs(Math.round(wave(t + i * 120, 520, amp)));
const cl3 = (c) => [lt(c.far, 0.55), '#fff8f0', mix(c.far, '#ffffff', 0.25)];
// 들고 있는 종이 (자격증 · 상장 · 편지)
function paperAt(px, x, y, gold = true) {
  px.rect(x - 4, y - 3, 9, 7, '#fffaf0'); px.hl(x - 4, x + 4, y - 3, gold ? '#c9a85a' : '#d8cfc2'); px.hl(x - 4, x + 4, y + 3, gold ? '#c9a85a' : '#d8cfc2');
  px.vl(x - 5, y - 2, y + 2, OUT); px.vl(x + 5, y - 2, y + 2, OUT); px.hl(x - 4, x + 4, y - 4, OUT); px.hl(x - 4, x + 4, y + 4, OUT);
  px.hl(x - 2, x + 2, y - 1, '#8a7a68'); px.hl(x - 3, x + 1, y + 1, '#c8baa8');
  if (gold) { px.px(x + 3, y + 1, '#e0b040'); px.px(x + 3, y + 2, '#c9544a'); }
}

// ───────── 자격증 ─────────
// 시험 본 곳 앞마당 '합격자 발표' 게시판. 걸어와 게시판 앞에 서서 이름을 찾음(뒷모습) → 이름을 찾아 반짝 →
// 돌아서서 폴짝 만세 · 색종이 · 주변 사람 박수 → 가족(친구)이 달려와 안아 줌 → 자격증을 받아 들고 반짝
// 옆 벤치에는 떨어진 사람이 고개를 숙이고 앉아 있음 (같은 날 다른 마음)
export function cert(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  skyBands(px, skyCols(c), 98);
  sun(px, 36, 26, 9, '#fff6e0', '#fff0d0');
  const cc = cl3(c);
  cloud(px, ((t * 0.004) % 300) - 40, 10, 40, cc[0], cc[1], cc[2]);
  cloud(px, ((t * 0.003 + 170) % 300) - 40, 28, 28, cc[0], cc[1], cc[2]);
  birds(px, t, 3, dk(c.far, 0.35), 30);
  hills(px, c, false, 90);
  // 시험장 건물 (유리문 · 창 두 줄 · 간판 · 세로 현수막)
  const bx0 = 122;
  const bx1 = 256;
  const by = 34;
  px.rect(bx0 - 3, by - 4, bx1 - bx0 + 6, 4, '#b8b2a8'); px.hl(bx0 - 3, bx1 + 2, by - 4, '#d8d2c8');
  px.rect(bx0, by, bx1 - bx0, G - by, '#ebe6dd');
  for (let y = by + 18; y < G; y += 18) px.hl(bx0, bx1, y, '#d8d2c8');
  for (let x = bx0 + 6; x < bx1 - 8; x += 16) { if (x > 166 && x < 206) continue; bwin(px, x, by + 4, 11, 10, false, true); bwin(px, x, by + 24, 11, 10, false, false); }
  px.rect(168, by + 2, 38, 9, '#3f6aa8'); px.rect(169, by + 3, 36, 7, '#4f7ab8');
  for (let i = 0; i < 7; i++) px.rect(172 + i * 4, by + 5, 2, 3, '#ffffff');
  px.rect(170, G - 30, 34, 30, '#5a6a7a');
  [172, 188].forEach((x) => { px.rect(x, G - 28, 14, 28, '#9fc7e0'); px.line(x + 2, G - 4, x + 9, G - 24, '#d6ecf6'); px.vl(x + 12, G - 18, G - 14, '#3a4450'); });
  px.rect(166, G - 2, 42, 2, '#cfc8bc'); px.rect(162, G, 50, 2, '#bfb8ac');
  const banY = by + 2;
  px.rect(bx0 + 4, banY, 8, 40, '#d84a4a'); for (let y = banY + 4; y < banY + 36; y += 5) px.rect(bx0 + 6, y, 4, 2, '#ffe6d6');
  px.rect(bx0 + 4, banY + 40, 2, 3, '#d84a4a'); px.rect(bx0 + 10, banY + 40, 2, 3, '#d84a4a');
  // 마당 (보도블록) · 나무 · 화단
  ground(px, c, false, G - 6, 'ce', false);
  for (let y = G - 4; y < H; y += 5) px.hl(0, W, y, dk(c.ground, 0.06));
  for (let y = G - 4; y < H; y += 5) for (let x = (y / 5) % 2 ? 0 : 6; x < W; x += 12) px.vl(x, y + 1, y + 4, dk(c.ground, 0.05));
  treeAt(px, 112, G - 4, c, 1, false, 'ct1'); treeAt(px, 14, G - 6, c, 1.2, false, 'ct2');
  [130, 146, 226, 242].forEach((x, i) => bush(px, x, G - 1, c));
  // 게시판 (다리 · 지붕 · 종이 석 장 · 이름 줄)
  const bx = 70;
  const top = G - 46;
  px.rect(bx - 30, top - 3, 60, 3, '#7a5a3e'); px.hl(bx - 30, bx + 29, top - 3, '#9a7452');
  px.rect(bx - 27, top, 54, 28, '#c79a6a'); px.rect(bx - 26, top + 1, 52, 26, '#d9b88a');
  px.rect(bx - 25, top + 2, 50, 4, '#c9544a'); for (let i = 0; i < 8; i++) px.rect(bx - 20 + i * 5, top + 3, 3, 2, '#ffe6d6');
  for (let s = 0; s < 3; s++) {
    const sx = bx - 24 + s * 17;
    px.rect(sx, top + 8, 14, 18, '#fffdf6'); px.px(sx + 6, top + 8, '#c9544a');
    for (let r = 0; r < 7; r++) px.hl(sx + 2, sx + 2 + 6 + ((r * 7 + s * 3) % 5), top + 11 + r * 2, '#8a8478');
  }
  px.rect(bx - 24, top + 28, 2, 18, '#7a5a3e'); px.rect(bx + 22, top + 28, 2, 18, '#7a5a3e');
  const found = t > 2000;
  if (t > 1800 && t < 2600 && Math.floor(t / 120) % 2) px.alpha(0.6, () => px.rect(bx + 10, top + 16, 10, 2, '#ffe14a'));
  if (found) { px.alpha(0.45, () => px.rect(bx + 10, top + 16, 10, 2, '#ffe14a')); sparkle(px, bx + 21, top + 15, t); }
  // 벤치: 떨어진 사람 (고개 숙임)
  bench(px, 238, G + 8);
  const sad = actor(px, t, 9, extra(3, { age: 24 }), 236, G + 2, { pose: 'sit', face: 'closed', noShadow: true });
  if (t > 2600) bub(px, 'dots', sad);
  // 게시판 앞 사람들 (뒷모습 → 내가 합격하자 돌아보며 박수)
  const turned = t > 2500;
  const crowd = [[extra(0, { age: 26 }), 34], [extra(7, { age: 31 }), 50], [extra(5, { age: 22 }), 108], [extra(1, { age: 28 }), 124]];
  crowd.forEach(([p, x], i) => actor(px, t, 3 + i, p, x, G + 12 + (i % 2) * 2, {
    back: !turned, gaze: x < bx ? 1 : -1, pose: turned ? clapPose(t, i) : 'stand',
  }));
  // 나: 걸어와 게시판 앞에 (뒷모습) → 찾음 → 폴짝 만세 → 안김 → 자격증 들고
  const w = walkX(t, 0, 1500, -14, 74);
  const atBoard = t > 1500 && t < 2300;
  const cheer = t > 2300 && t < 3400;
  const hugging = t > 3500 && t < 4600;
  const holding = t >= 4600;
  const me = actor(px, t, 0, k.me, w.x, G + 16, {
    walk: w.walk, back: atBoard, gaze: hugging ? 1 : 0,
    pose: cheer ? cheerPose(t, 0) : hugging || holding ? 'hold' : undefined,
    bob: cheer ? hop(t, 0, 4) : 0,
  });
  if (atBoard && t > 1700) bub(px, 'dots', me);
  if (t > 2300 && t < 3000) bub(px, 'bang', me);
  if (t > 3000) bub(px, 'star', me);
  // 가족(친구)이 오른쪽에서 달려와 안아 줌
  const mate = k.pt || k.par[0] || extra(6, { age: (v.age ?? 30) + 1 });
  const m = walkX(t, 2800, 3500, 200, 90);
  if (t > 2800) {
    const r = actor(px, t, 1, mate, m.x, G + 16, { walk: m.walk, gaze: -1, pose: hugging ? 'hold' : holding ? clapPose(t, 1) : undefined });
    if (t > 3600) bub(px, 'heart', r);
  }
  if (hugging) [0, 1, 2].forEach((i) => floatHeart(px, 76 + i * 5, G - 12, t, 3600 + i * 350));
  // 자격증 (안긴 뒤 두 손에 들고 · 반짝)
  if (holding) {
    paperAt(px, w.x, G + 4, true);
    for (let i = 0; i < 5; i++) sparkle(px, w.x + Math.round(Math.cos(i * 1.3 + t / 400) * 11), G + 2 + Math.round(Math.sin(i * 1.3 + t / 400) * 7), t + i * 90);
  }
  // 문 앞 감독관 (서류판 · 마지막에 손 흔듦)
  const off = actor(px, t, 8, dressed(extra(2, { gender: 'M', age: 50 }), { style: 'suit', color: '#3a4a64' }), 188, G + 2, { gaze: -1, pose: t > 4600 ? (Math.floor(t / 260) % 2 ? 'wave1' : 'wave2') : 'hold' });
  if (t < 4600) { px.rect(off.x - 3, G - 9, 6, 7, '#c9a07a'); px.rect(off.x - 2, G - 8, 4, 5, '#fffaf0'); }
  // 앞줄: 지나가던 사람 · 화분 (화면 아래 가까이)
  const pw = ((t * 0.035) % (W + 60)) - 30;
  actor(px, t, 12, extra(6, { age: 45 }), pw, 140, { walk: true, gaze: 1 });
  [[8, '#c9544a'], [24, '#e8a040'], [232, '#c9544a'], [248, '#9a6ac8']].forEach(([x, f]) => {
    px.rect(x - 5, 134, 11, 10, '#a86a4a'); px.hl(x - 5, x + 5, 134, '#c98a64');
    for (let i = -3; i <= 3; i += 2) { px.vl(x + i, 128, 133, '#4e7a44'); bloom(px, x + i - 1, 126 + (i % 3 ? 1 : 0), f); }
  });
  confetti(px, t, 2300, 60, 'cert');
}

// ───────── 마지막 밤 ─────────
// arg: null 집 침대 (노환 등) · 'sick' 병실 침대 (병) · 'sudden' 갑작스러운 죽음 (사고 등)
// 침대: 등불 아래 누워 있고, 배우자가 곁 의자에 앉아 손을 잡음 · 아이들·손주가 둘러섬 →
//   마주 보고 웃다가(하트) 눈을 감음 → 작은 빛이 침대에서 피어올라 창밖 별 쪽으로 → 가족은 고개 숙여 울고, 등불이 천천히 어두워짐
//   병실이면 모니터 선이 길게 이어지고, 간호사가 문가에서 고개를 숙임
// 갑작스러운 죽음: 저녁 식탁에 내 밥그릇 김이 오르는 빈 의자 → 전화가 울림 → 배우자가 받고 그대로 굳음 → 김이 사라지고 아이가 욺 · 창밖에 비
export function last(px, t, v) {
  if (v.arg === 'sudden') return lastSudden(px, t, v);
  const c = paletteOf(v);
  const k = castOf(v);
  const sick = v.arg === 'sick';
  const G = 112;
  const dim = seg(t, 3200, 6500);
  room(px, {
    wall: sick ? '#dfe8e6' : '#eadcc6', floor: sick ? '#c8d2ce' : '#b48e68', paper: sick ? 'stripe' : 'flower',
    win: [[168, 18]], night: true, sky: ['#1a1f48', '#33366a'], curtain: sick ? '#9cc4bc' : '#7a5a8a', t, G,
  });
  // 창밖 별 (반짝)
  for (let i = 0; i < 6; i++) { const on = (Math.floor(t / 300) + i) % 4; if (on) px.px(173 + ((i * 7) % 26), 22 + ((i * 5) % 14), on === 1 ? '#ffffff' : '#c8c8f0'); }
  clock(px, 142, 18, t);
  if (sick) {
    // 모니터: 뛰던 선이 3.6초부터 길게 이어짐
    px.rect(214, 38, 28, 19, '#3a4450'); px.rect(215, 39, 26, 16, '#16202a');
    const flat = t > 3600;
    const yb = 48;
    if (!flat) {
      const bt = (t % 900) / 900;
      px.hl(216, 222, yb, '#6ee0a0'); px.line(222, yb, 224, yb - 5, '#6ee0a0'); px.line(224, yb - 5, 226, yb + 4, '#6ee0a0'); px.line(226, yb + 4, 228, yb, '#6ee0a0'); px.hl(228, 240, yb, '#6ee0a0');
      px.rect(216 + Math.floor(bt * 24), 40, 2, 14, '#16202a');
    } else px.hl(216, 240, yb, '#6ee0a0');
    px.px(237, 41, flat ? '#e8584c' : Math.floor(t / 450) % 2 ? '#e8584c' : '#5a2a2a');
    px.vl(228, 57, G, '#9aa6b2');
    // 링거
    px.vl(82, 34, G, '#9aa6b2'); px.hl(77, 87, 34, '#9aa6b2'); px.rect(78, 35, 7, 10, '#e6f4fb'); px.rect(79, 39, 5, 5, '#cfe9f6');
    if (!flat) px.px(81, 47 + Math.floor((t / 140) % 4), '#5fb4ee');
    px.line(81, 50, 104, 94, '#cfe3f0');
  } else {
    // 벽: 가족사진 · 액자 · 옷걸이
    photo(px, 96, 30, 16, 12); frame(px, 118, 34, 10, 9, 1); frame(px, 74, 36, 10, 8, 0);
    shelf(px, 226, 46, t);
  }
  // 침대 · 누운 나 (눈을 뜨고 있다가 2.6초부터 감음)
  const bx = 120;
  bed(px, bx, G, 62, sick);
  const closed = t > 2600;
  lieIn(px, t, k.me, bx, G, 62, { quilt: sick ? '#cfe3f0' : '#b8a0c8', pattern: sick ? 'plain' : 'flower', face: closed ? 'closed' : 'open', breath: closed && t > 3600 ? 0 : undefined });
  // 협탁 · 등불 · 꽃병 · 물컵
  const nt = sick ? '#c8d0d6' : '#8a6444';
  px.rect(30, G - 16, 18, 16, nt); px.rect(30, G - 16, 18, 1, lt(nt, 0.3)); px.rect(32, G - 12, 14, 5, dk(nt, 0.15)); px.px(39, G - 10, '#e0b040');
  vase(px, 44, G - 16, ['#ffffff', '#f6c6d6', '#ffffff']);
  const lampOn = 1 - 0.75 * dim;
  if (!sick) { lamp(px, 35, G - 16, true); px.alpha(lampOn, () => glow(px, 35, G - 30, 30, '#ffd37a', 0.22)); }
  else px.alpha(lampOn, () => glow(px, 110, 0, 44, '#f6f2d8', 0.15));
  // 곁의 가족: 배우자는 의자에 앉아 손을 잡음, 아이들 · 손주는 침대 발치에 서서
  const pt = k.pt;
  const near = [pt, ...k.kids, ...k.sib].filter(Boolean).slice(0, 4);
  if (pt) {
    chair(px, 64, G + 4, '#7a5a3e', 1);
    actor(px, t, 1, pt, 66, G - 2, { pose: closed ? 'bow' : 'hold', gaze: 1, face: closed ? 'closed' : undefined, cry: t > 3400, noShadow: true });
    px.rect(72, G - 14, 18, 2, '#f2c9a0'); px.rect(88, G - 15, 3, 3, '#f2c9a0'); // 뻗어 잡은 손
  }
  const stand = near.filter((p) => p !== pt);
  const xs = [172, 190, 208, 226];
  stand.forEach((p, i) => {
    const r = actor(px, t, 2 + i, p, xs[i], G + 12 + (i % 2) * 2, {
      gaze: -1, pose: closed ? (i % 2 ? 'bow' : 'hold') : 'stand', face: closed && i % 2 ? 'closed' : undefined, cry: t > 3000 + i * 300,
    });
    if (i === 0 && t > 1000 && t < 2600) bub(px, 'heart', r);
  });
  if (!stand.length && !pt) {
    // 혼자 떠나는 밤: 고양이가 침대 끝에서 지켜봄
    const cx = 146;
    px.rect(cx - 4, G - 14, 8, 4, '#3a3440'); px.rect(cx + 2, G - 17, 4, 4, '#3a3440'); px.px(cx + 2, G - 18, '#3a3440'); px.px(cx + 5, G - 18, '#3a3440');
    px.px(cx + 4, G - 16, Math.floor(t / 900) % 5 ? '#ffd37a' : '#3a3440'); px.vl(cx - 5, G - 16 + Math.round(wave(t, 1200, 1)), G - 12, '#3a3440');
  }
  if (t > 600 && t < 2400) bubble(px, 'heart', bx - 24, G - 26);
  // 간호사 (병실 · 문가에서 고개 숙임)
  if (sick) actor(px, t, 9, dressed(extra(2, { gender: 'F', age: 32 }), { style: 'tee', color: '#ffffff' }), 246, G + 6, { gaze: -1, pose: t > 3800 ? 'bow' : 'hold' });
  // 작은 빛이 피어올라 창밖으로
  if (t > 3000) {
    for (let i = 0; i < 7; i++) {
      const q = seg(t, 3000 + i * 260, 6000 + i * 260);
      if (q <= 0 || q >= 1) continue;
      const x = lerp(bx - 22 + i * 4, 178 + (i % 3) * 6, ease(q)) + wave(t + i * 300, 900, 2);
      const y = lerp(G - 22, 30, ease(q));
      px.alpha(Math.sin(q * Math.PI), () => { px.px(x, y, '#fff6c8'); px.px(x + 1, y, '#ffe9a0'); px.px(x, y + 1, '#ffe9a0'); });
    }
  }
  // 등불이 꺼지며 방이 어두워짐
  px.alpha(0.42 * dim, () => px.rect(0, 0, W, H, '#141026'));
}

// 갑작스러운 죽음: 기다리던 저녁
//   식탁 뒤에 가족이 앉아 기다림 (식탁이 앞을 가림) · 오른쪽 끝 내 자리는 빈 의자, 내 그릇에서만 김이 오름
function lastSudden(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  room(px, { wall: '#efe0c8', floor: '#b8946e', paper: 'dot', win: [[24, 18]], night: true, sky: ['#2a2a52', '#5a4a6a'], curtain: '#c8885a', t, G });
  if (t > 3200) for (let i = 0; i < 12; i++) { const yy = ((t * 0.12 + i * 37) % 30); px.line(28 + ((i * 7) % 30), 22 + yy, 27 + ((i * 7) % 30), 24 + yy, '#8a98c8'); }
  clock(px, 122, 16, t);
  photo(px, 150, 30, 16, 12); frame(px, 174, 33, 10, 9, 0);
  // 전등 (식탁 위 · 따뜻한 빛 → 어두워짐)
  const dim = seg(t, 3400, 6500);
  px.vl(98, 0, 22, '#3a3440'); px.rect(92, 22, 13, 4, '#e8b04a'); px.rect(94, 26, 9, 1, '#fff2c0');
  px.alpha(1 - 0.6 * dim, () => glow(px, 98, 50, 42, '#ffd37a', 0.2));
  // 수납장 · 전화기 (1.3초 울림 → 2.3초 배우자가 받음)
  px.rect(200, G - 26, 34, 26, '#8a6444'); px.rect(200, G - 26, 34, 2, '#a87c58'); px.rect(203, G - 21, 13, 18, '#7a5638'); px.rect(218, G - 21, 13, 18, '#7a5638'); px.px(214, G - 12, '#e0b040'); px.px(220, G - 12, '#e0b040');
  plant(px, 244, G, t);
  const ring = t > 1300 && t < 2300;
  const pick = t >= 2300;
  const sh = ring ? (Math.floor(t / 60) % 2 ? 1 : -1) : 0;
  px.rect(209 + sh, G - 32, 12, 6, '#c9544a'); px.rect(212 + sh, G - 31, 6, 3, '#f2e6d0');
  if (!pick) px.rect(210 + sh, G - 34, 10, 2, '#a83a34');
  if (ring) [0, 1].forEach((i) => { px.line(223 + i * 3, G - 36 - i * 2, 226 + i * 3, G - 39 - i * 2, '#e8584c'); px.line(206 - i * 3, G - 36 - i * 2, 203 - i * 3, G - 39 - i * 2, '#e8584c'); });
  // 가족 자리 (의자 등받이 → 앉은 사람 → 식탁이 앞을 가림)
  const fam = [k.pt, ...k.kids, ...k.par].filter(Boolean).slice(0, 4);
  if (!fam.length) fam.push(extra(2, { age: (v.age ?? 40) + 25, gender: 'F' }));
  const seats = [58, 78, 98, 118];
  const mySeat = 144;
  const caller = fam[0];
  seats.forEach((x, i) => { if (i < fam.length) { px.rect(x - 5, G - 30, 11, 2, '#7a5a3e'); px.rect(x - 5, G - 30, 2, 14, '#7a5a3e'); px.rect(x + 4, G - 30, 2, 14, '#7a5a3e'); } });
  px.rect(mySeat - 5, G - 30, 11, 2, '#7a5a3e'); px.rect(mySeat - 5, G - 30, 2, 14, '#7a5a3e'); px.rect(mySeat + 4, G - 30, 2, 14, '#7a5a3e'); px.rect(mySeat - 3, G - 26, 7, 2, '#9a7452');
  fam.forEach((p, i) => {
    if (i === 0 && t > 1900) return; // 전화 받으러 일어남 (아래에서 그림)
    const kid = (p.age ?? 30) < 13;
    const r = actor(px, t, 2 + i, p, seats[i], G - 4, {
      pose: t > 3200 && !kid ? 'bow' : 'stand', gaze: t > 1300 ? 1 : 0, noShadow: true,
      face: t > 3200 && !kid ? 'closed' : undefined, cry: t > 3300 && kid, bob: t > 1300 && t < 1600 ? -1 : 0,
    });
    if (t > 1300 && t < 1900) bub(px, 'bang', r);
    if (t > 3600 && i === 1) bub(px, 'sweat', r);
  });
  // 식탁 (앞) · 그릇
  table(px, 46, G - 14, 112, G, '#9a6a44', '#f2e6d0');
  const steamA = 1 - seg(t, 3000, 5200);
  [...seats.slice(0, fam.length), mySeat].forEach((x, i, arr) => {
    const mine = i === arr.length - 1;
    px.rect(x - 3, G - 18, 7, 3, '#ffffff'); px.hl(x - 3, x + 3, G - 15, '#d8cfc2'); px.rect(x - 2, G - 19, 5, 1, mine ? '#f2d8a0' : '#e8e0d2');
    px.rect(x + 5, G - 17, 1, 3, '#c9a07a'); px.rect(x + 6, G - 17, 1, 3, '#c9a07a');
    if (mine) steam(px, x, G - 21, t, 0.7 * steamA);
    else steam(px, x, G - 21, t + i * 500, 0.3 * (1 - seg(t, 1000, 2600)));
  });
  px.rect(104, G - 20, 9, 3, '#e86a4a'); px.rect(105, G - 21, 7, 1, '#f29a7a'); px.rect(84, G - 20, 8, 3, '#7ab65a');
  // 전화 받으러 간 배우자 (받고 그대로 굳음)
  if (t > 1900) {
    const w = walkX(t, 1900, 2400, seats[0], 196);
    const r = actor(px, t, 1, caller, w.x, G + 6, { walk: w.walk, gaze: 1, pose: pick ? 'hold' : undefined, face: t > 3000 ? 'closed' : undefined, cry: t > 3600 });
    if (pick && t < 3000) bub(px, 'bang', r);
    if (t > 3000) bub(px, 'dots', r);
    if (pick) { px.rect(w.x + 3, G - 22, 3, 5, '#c9544a'); px.line(w.x + 4, G - 17, 214, G - 27, '#3a3440'); }
  }
  px.alpha(0.4 * dim, () => px.rect(0, 0, W, H, '#141026'));
}

// ───────── 그 밖의 해 (길을 걸음) ─────────
// 노을빛 마을 길을 따라 걸어감 (카메라가 따라감 → 집 · 가게 · 가로수 · 사람들이 뒤로 흘러감)
// 3.2초에 멈춰 서서 길 끝 해를 바라봄 (생각 말풍선) → 4.4초에 다시 걸음. 곁에는 가족, 길가에는 공 차는 아이들 · 강아지 · 자전거 · 장수레
export function village(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 114;
  // 걸은 거리 (멈춘 동안은 그대로)
  const walking = t < 3200 || t > 4400;
  const dist = Math.min(t, 3200) * 0.016 + Math.max(0, t - 4400) * 0.016;
  skyBands(px, skyCols(c), 100);
  sun(px, 212, 58 + Math.round(t * 0.0015), 12, '#fff2d6', '#ffe8c0');
  const cc = cl3(c);
  cloud(px, ((t * 0.004 - dist * 0.1) % 320 + 320) % 320 - 40, 12, 44, cc[0], cc[1], cc[2]);
  cloud(px, ((t * 0.003 + 150 - dist * 0.1) % 320 + 320) % 320 - 40, 30, 30, cc[0], cc[1], cc[2]);
  birds(px, t, 4, dk(c.far, 0.35), 28);
  // 먼 산 (아주 천천히)
  const o1 = -dist * 0.15;
  const ridge = [];
  for (let i = -1; i < 14; i++) ridge.push([i * 24 + (o1 % 24), 72 + ((i * 37 + Math.floor(-o1 / 24) * 37) % 3 === 0 ? -6 : (i % 2 ? 4 : -2))]);
  px.ridge(ridge, mix(c.far, skyCols(c)[5], 0.35), 100);
  hills(px, c, false, 92);
  // 집 · 가게 줄 (중간 속도) - 같은 무늬가 이어짐
  const o2 = -dist * 0.55;
  const SPAN = 66;
  const first = Math.floor(-o2 / SPAN) - 1;
  for (let n = first; n < first + 6; n++) {
    const x = n * SPAN + o2;
    const R = rng('house' + (n * 7919 + 13));
    R(); R();
    const kind = ((n % 3) + 3) % 3;
    const wall = ['#f4e4cc', '#efd8c0', '#e8e0d0'][kind];
    const top = 64 + Math.floor(R() * 8);
    const w = 48;
    px.rect(x, top, w, G - 6 - top, wall); px.vl(x + w - 1, top, G - 7, dk(wall, 0.12));
    roof(px, x - 4, x + w + 4, top, top - 12, ['#c8644a', '#8a5a7a', '#5a7a9a'][kind] || c.roofC);
    if (kind === 2) {
      // 가게: 줄무늬 차양 · 진열대 · 간판
      for (let i = 0; i < w; i += 4) px.rect(x + i, G - 30, 2, 6, i % 8 ? '#ffffff' : '#d84a4a');
      px.rect(x + 4, G - 24, w - 8, 12, '#7a5a3e'); px.rect(x + 6, G - 22, w - 12, 8, '#f6e6c8');
      for (let i = 0; i < 6; i++) px.disc(x + 9 + i * 6, G - 17, 2, ['#e8584c', '#f2c230', '#7ab65a'][i % 3]);
      px.rect(x + 12, top + 4, 24, 6, '#3f6aa8'); px.hl(x + 14, x + 33, top + 7, '#ffffff');
    } else {
      bwin(px, x + 6, top + 8, 11, 10, t > 2800, true); bwin(px, x + 30, top + 8, 11, 10, t > 3400, true);
      door(px, x + 20, G - 6, 10, 16, kind ? '#6a8aa8' : '#8a5a3b');
      // 빨랫줄
      if (R() < 0.5) { px.line(x + w, top + 18, x + w + 16, top + 16, '#5a5460'); [0, 1, 2].forEach((i) => px.rect(x + w + 3 + i * 5, top + 18 - i, 3, 4 + (i % 2), ['#f6a5bd', '#9fc7e0', '#ffffff'][i])); }
    }
  }
  // 길 · 보도
  const gr = mix(c.ground, c.leaf, 0.12);
  px.rect(0, G - 6, W, H - G + 6, gr);
  px.rect(0, G + 8, W, 10, mix(c.road || '#c8b89a', '#a89a88', 0.3));
  for (let x = ((-dist * 1) % 24 + 24) % 24 - 24; x < W; x += 24) px.rect(x, G + 12, 10, 1, '#f2ead8');
  for (let x = ((-dist) % 8 + 8) % 8 - 8; x < W; x += 8) px.vl(x, G - 5, G + 6, dk(gr, 0.07));
  // 가로수 · 가로등 · 벤치 (앞 · 빠르게)
  const o3 = -dist;
  for (let n = Math.floor(-o3 / 80) - 1; n < Math.floor(-o3 / 80) + 5; n++) {
    const x = n * 80 + o3;
    treeAt(px, x + 10, G - 4, c, 1.1, false, 'vt' + (n % 3));
    lampPost(px, x + 50, G - 2, false, t);
    if (n % 2) bench(px, x + 66, G + 2);
  }
  // 길가 아이들 (공놀이) · 강아지 (함께 흘러감)
  const kx = 200 + o3 + Math.floor(dist / 400) * 400;
  const ballX = kx + 10 + Math.round(wave(t, 1400, 12));
  const ballY = G + 2 - Math.abs(Math.round(wave(t, 700, 6)));
  actor(px, t, 6, extra(8, { age: 8 }), kx, G + 4, { pose: Math.floor(t / 350) % 2 ? 'walk1' : 'up', gaze: 1 });
  actor(px, t, 7, extra(4, { age: 9 }), kx + 22, G + 4, { pose: Math.floor(t / 350) % 2 ? 'up' : 'walk2', gaze: -1 });
  px.disc(ballX, ballY, 2, '#ffffff'); px.px(ballX - 1, ballY - 1, '#e8584c');
  // 맞은편에서 오는 사람 · 자전거
  const px1 = ((W + 40 - (t * 0.04 + dist)) % (W + 80)) - 20;
  actor(px, t, 8, extra(5, { age: 60 }), px1, G + 8, { walk: true, gaze: -1 });
  const bk = ((t * 0.07 - dist * 0.3) % (W + 120) + W + 120) % (W + 120) - 60;
  px.ring(bk - 6, G + 13, 3, '#3a3440'); px.ring(bk + 6, G + 13, 3, '#3a3440'); px.line(bk - 6, G + 13, bk, G + 7, '#d84a4a'); px.line(bk, G + 7, bk + 6, G + 13, '#d84a4a'); px.line(bk - 2, G + 7, bk + 4, G + 7, '#d84a4a');
  actor(px, t, 11, extra(1, { age: 30 }), bk, G + 7, { pose: 'sit', gaze: 1, noShadow: true });
  // 나와 가족 (화면 왼쪽 가운데에서 걸음 → 멈춰 해를 봄)
  const fam = [k.pt, ...k.kids].filter(Boolean).slice(0, 3);
  const row = [k.me, ...fam];
  const pace = walking;
  row.forEach((p, i) => {
    const x = 100 - i * 21 + (i ? Math.round(wave(t + i * 400, 2400, 1)) : 0);
    const r = actor(px, t, i, p, x, G + 26 + (i % 2) * 2, { walk: pace, gaze: 1, pose: !pace && i === 0 ? 'stand' : undefined });
    if (i === 0 && !pace) bub(px, 'dots', r);
    if (i === 1 && t > 4600) bub(px, 'heart', r);
  });
  // 강아지 (가족 곁에서 깡총)
  const dx = 122 + Math.round(wave(t, 1800, 6));
  const dy = G + 27 + hop(t, 3, 2);
  px.rect(dx - 4, dy - 5, 8, 4, '#c9905e'); px.rect(dx + 2, dy - 8, 4, 4, '#c9905e'); px.px(dx + 5, dy - 7, OUT); px.px(dx + 2, dy - 9, '#8a5a3b');
  px.vl(dx - 3, dy - 1, dy, '#8a5a3b'); px.vl(dx + 2, dy - 1, dy, '#8a5a3b'); px.px(dx - 5, dy - 6 + (Math.floor(t / 150) % 2), '#c9905e');
  // 노을빛 · 꽃잎
  px.alpha(0.08, () => px.rect(0, 0, W, H, '#ffb070'));
  for (let i = 0; i < 10; i++) { const R = rng('vp' + i); const x = (R() * W - t * 0.02 * (1 + R())) % W; px.px((x + W) % W, (R() * 120 + t * 0.015 * (1 + R())) % 140, ['#f6c6d6', '#fff2e0'][i % 2]); }
}


// ───────── 바깥 하늘 공용 ─────────
function outdoor(px, t, c, o = {}) {
  skyBands(px, skyCols(c), o.y1 || 98);
  sun(px, o.sunX ?? 206, o.sunY ?? 30, o.sunR || 10, '#fff6e0', '#fff0d0');
  const cc = cl3(c);
  cloud(px, ((t * 0.004) % 300) - 40, 10, 42, cc[0], cc[1], cc[2]);
  cloud(px, ((t * 0.003 + 160) % 300) - 40, 28, 30, cc[0], cc[1], cc[2]);
  cloud(px, ((t * 0.0025 + 240) % 300) - 40, 4, 24, cc[0], cc[1], cc[2]);
  birds(px, t, 3, dk(c.far, 0.35), 30);
  hills(px, c, false, o.hillY || 92);
}
// 꽃다발 (가슴 앞)
function bouquet(px, x, y) {
  px.line(x - 3, y + 6, x, y, '#4e7a44'); px.line(x + 3, y + 6, x, y, '#4e7a44');
  [[-3, -1, '#f05a7e'], [0, -3, '#ffd37a'], [3, -1, '#ffffff'], [-1, 1, '#f6a5bd'], [2, 1, '#e86a8a']].forEach(([dx, dy, cc]) => bloom(px, x + dx - 1, y + dy - 1, cc));
  px.rect(x - 2, y + 3, 5, 3, '#fbf3ea');
}
// 풍선 (줄 · 살랑)
function balloons(px, x, y, t, cols = ['#f05a7e', '#ffd37a', '#9fc7e0']) {
  cols.forEach((cc, i) => {
    const bx = x - 6 + i * 6 + Math.round(wave(t + i * 400, 1800, 1.5));
    const by = y - 16 - (i % 2) * 4;
    px.line(x, y, bx, by + 4, '#8a8478');
    px.disc(bx, by, 3, cc); px.px(bx - 1, by - 2, lt(cc, 0.6)); px.px(bx, by + 4, dk(cc, 0.2));
  });
}
// 사진사 (카메라 · 찰칵 플래시)
function photographer(px, t, i, x, G, flashAt, gaze = -1) {
  actor(px, t, i, extra(5, { gender: 'M', age: 40 }), x, G, { gaze, pose: 'clap1' });
  const cx = x + gaze * 5;
  px.rect(cx - 3, G - 15, 6, 4, '#3a3440'); px.rect(cx + gaze * 3 - 1, G - 14, 2, 2, '#5a5460');
  flashAt.forEach((ft) => {
    if (t > ft && t < ft + 140) { px.alpha(0.85, () => { px.disc(cx + gaze * 3, G - 13, 3, '#ffffff'); px.rect(cx - 8, G - 13, 16, 1, '#fff8e0'); }); px.alpha(0.15, () => px.rect(0, 0, W, H, '#ffffff')); }
  });
}
// 가운 · 학사모 입히기
const gown = (p) => dressed(p, { style: 'dress', color: '#2f3442' });
function cap(px, x, headY, tassel = '#f2c230') { px.rect(x - 6, headY - 2, 13, 2, '#2a2e3a'); px.rect(x - 3, headY, 7, 2, '#2a2e3a'); px.vl(x + 5, headY - 1, headY + 3, tassel); }

// ───────── 태어남 (제목 장면) ─────────
// 이른 아침 산실(도시는 병원, 시골은 집). 엄마가 침대에 기대 앉아 있고 산파가 아기를 안고 와 건넴 → 엄마 품에서 반짝 ·
// 문이 열리며 아빠가 뛰어 들어와 침대 곁에서 만세 → 할머니 · 형제자매가 꽃다발 들고 들어옴 · 풍선 · 창밖 해돋이
export function born(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const urban = !!v.urban;
  const G = 112;
  room(px, {
    wall: urban ? '#eef3f0' : '#f2e4cc', floor: urban ? '#d2dcd8' : '#c9a882', paper: urban ? 'stripe' : 'dot',
    win: [[18, 20]], sky: ['#ffb59a', '#ffe8c8'], curtain: urban ? '#bcd8d4' : '#e8a8a0', t, G,
  });
  // 창밖 해돋이 빛줄기
  px.alpha(0.12 + 0.04 * Math.sin(t / 500), () => { for (let j = 0; j < 70; j++) px.rect(30 + j * 1.2, 36 + j, 16 + j * 0.6, 1, '#fff2c8'); });
  clock(px, 120, 18, t);
  if (urban) { px.rect(150, 28, 26, 14, '#ffffff'); px.rect(152, 30, 22, 2, '#9fc7e0'); [0, 1].forEach((i) => px.hl(152, 166 - i * 6, 34 + i * 3, '#c8d0d6')); }
  else { photo(px, 150, 28, 16, 12); frame(px, 172, 32, 10, 9, 1); }
  // 문 (오른쪽, 1.4초에 열림)
  const open = seg(t, 1300, 1700);
  door(px, 226, G, 18, 34, urban ? '#a8b4bc' : '#8a5a3b', open, '#f6e6c8');
  // 침대 · 기대 앉은 엄마 · 이불
  const bx = 92;
  bed(px, bx, G, 64, urban);
  const mom = k.mom || extra(2, { gender: 'F', age: 28 });
  const got = t > 1200;
  actor(px, t, 1, mom, bx - 14, G - 9, { pose: got ? 'hold' : 'stand', gaze: got ? 0 : 1, face: t < 400 ? 'closed' : undefined, noShadow: true });
  px.rect(bx - 22, G - 15, 54, 7, urban ? '#cfe3f0' : '#f0b8b0'); px.hl(bx - 22, bx + 31, G - 15, lt(urban ? '#cfe3f0' : '#f0b8b0', 0.3));
  for (let x = bx - 20; x < bx + 30; x += 6) px.vl(x, G - 14, G - 10, dk(urban ? '#cfe3f0' : '#f0b8b0', 0.1));
  // 산파(간호사)가 아기를 안고 와 건넴
  const baby = k.me;
  const bcol = (v.gender || 'F') === 'M' ? '#9fc7e0' : '#f6a5bd';
  const nw = walkX(t, 0, 1000, 190, bx + 14);
  const nurse = dressed(extra(6, { gender: 'F', age: 40 }), { style: 'tee', color: urban ? '#ffffff' : '#c9a07a' });
  const nx = t < 1200 ? nw.x : Math.round(lerp(bx + 14, bx + 40, ease(seg(t, 1400, 2200))));
  actor(px, t, 2, nurse, nx, G + 6, { walk: nw.walk || (t > 1400 && t < 2200), gaze: -1, pose: t < 1200 ? 'hold' : t > 2400 ? 'clap1' : 'stand' });
  if (!got) bundleAt(px, nx - 1, G - 6, bcol, t);
  else bundleAt(px, bx - 14, G - 21, bcol, t);
  if (t > 1100 && t < 1700) for (let i = 0; i < 5; i++) sparkle(px, bx - 14 + Math.round(Math.cos(i * 1.3 + t / 300) * 9), G - 22 + Math.round(Math.sin(i * 1.3 + t / 300) * 6), t + i * 80);
  if (t > 1300 && t < 2300) bubble(px, 'note', bx - 6, G - 30);
  // 아빠가 뛰어 들어옴 → 침대 곁 만세
  const dad = k.dad || extra(3, { gender: 'M', age: 31 });
  if (t > 1600) {
    const d = walkX(t, 1600, 2300, 236, bx + 24);
    const r = actor(px, t, 3, dad, d.x, G + 10, { walk: d.walk, gaze: -1, pose: t > 2300 && t < 3600 ? cheerPose(t, 3) : t >= 3600 ? 'hold' : undefined, bob: t > 2300 && t < 3600 ? hop(t, 3, 2) : 0 });
    if (t > 2400) bub(px, 'heart', r);
  }
  // 할머니 · 형제자매가 꽃다발 들고 들어옴
  const late = [k.sib[0], extra(9, { gender: 'F', age: 58 })].filter(Boolean);
  late.forEach((p, i) => {
    if (t < 2800 + i * 400) return;
    const w = walkX(t, 2800 + i * 400, 3600 + i * 400, 240, 160 + i * 20);
    const kid = (p.age ?? 30) < 13;
    const r = actor(px, t, 4 + i, p, w.x, G + 12 + i * 2, { walk: w.walk, gaze: -1, pose: !w.walk ? (kid ? cheerPose(t, i) : 'hold') : undefined, bob: kid && !w.walk ? hop(t, i) : 0 });
    if (!kid && !w.walk) bouquet(px, w.x, G - 2);
    if (i === 0 && t > 4000) bub(px, 'heart', r);
  });
  // 풍선 · 꽃병 (침대 머리맡) · 떠오르는 하트
  balloons(px, bx + 34, G - 18, t);
  px.rect(34, G - 14, 14, 14, urban ? '#c8d0d6' : '#8a6444'); vase(px, 41, G - 14);
  if (t > 1500) [0, 1, 2].forEach((i) => floatHeart(px, bx - 20 + i * 6, G - 34, t, 1600 + i * 500));
}

// ───────── 입학 ─────────
// 벚꽃 날리는 학교 정문 (현수막 · 풍선 아치 · 화분). 부모님 손을 잡고 걸어옴 → 정문 팻말 앞에서 사진 (찰칵) →
// 선생님이 반겨 주고 손 흔들며 들어감, 부모님은 손 흔들어 배웅 · 다른 아이들도 가방 메고 뛰어감
export function school(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  outdoor(px, t, c, { sunX: 40 });
  // 학교 건물 (뒤)
  px.rect(120, 40, 136, G - 46, '#f2ece0'); px.rect(117, 36, 142, 4, '#c9544a'); px.hl(117, 258, 36, '#e07a6a');
  for (let x = 126; x < 252; x += 16) { bwin(px, x, 46, 11, 9, false, true); bwin(px, x, 62, 11, 9, false, false); }
  px.rect(176, 26, 24, 14, '#f2ece0'); px.disc(188, 32, 4, '#ffffff'); px.ring(188, 32, 4, '#5a5460'); px.line(188, 32, 188, 29, '#3a3440'); px.line(188, 32, 190, 32, '#3a3440');
  px.vl(240, 14, 40, '#8a8478'); px.rect(241, 15, 12, 8, '#ffffff'); px.disc(247, 19, 2, '#d84a4a');
  ground(px, c, false, G - 6, 'sc', false);
  px.rect(150, G - 6, 50, H - G + 6, mix(c.road, '#d8c8b0', 0.4));
  // 정문 (기둥 · 문패 · 풍선 아치 · 현수막)
  [140, 208].forEach((x) => { px.rect(x - 4, G - 40, 9, 40, '#c9bfae'); px.rect(x - 5, G - 42, 11, 3, '#b0a694'); px.hl(x - 4, x + 4, G - 40, '#ddd4c4'); });
  px.rect(139, G - 34, 4, 12, '#8a6a4f'); px.rect(136, G - 30, 10, 4, '#fffaf0');
  for (let a = 0; a <= 180; a += 9) { const r = (a * Math.PI) / 180; px.disc(174 + Math.round(Math.cos(r) * 34), G - 42 - Math.round(Math.sin(r) * 16), 3, ['#f05a7e', '#ffd37a', '#9fc7e0', '#b7e0a0'][(a / 9) % 4]); }
  px.line(144, G - 38, 204, G - 38, '#8a8478');
  px.rect(152, G - 37, 44, 7, '#fffaf0'); for (let i = 0; i < 8; i++) px.rect(155 + i * 5, G - 35, 3, 3, ['#d84a4a', '#3f6aa8'][i % 2]);
  // 벚나무 · 화단
  [[22, 1.3], [100, 1.1], [236, 1.2]].forEach(([x, sc], i) => tree(px, x, G - 2, Math.round(sc), [dk('#f39ab0', 0.15), '#f39ab0', lt('#f39ab0', 0.4), '#8a5a4a'], 'round', 'right'));
  [126, 222].forEach((x) => { px.rect(x - 8, G - 4, 16, 6, '#a86a4a'); for (let i = -6; i <= 6; i += 3) bloom(px, x + i, G - 7, ['#ffd37a', '#f05a7e', '#ffffff'][(i + 6) % 3]); });
  // 다른 아이들 (가방 메고 뛰어 들어감)
  for (let i = 0; i < 3; i++) {
    const w = walkX(t, 600 + i * 900, 2600 + i * 900, -20 - i * 10, 174);
    if (w.x >= 174) continue;
    const kid = extra(8 - i * 2, { age: (v.age ?? 7) + (i % 2) });
    const r = actor(px, t, 10 + i, kid, w.x, G + 4 - i, { walk: w.walk, gaze: 1 });
    px.rect(w.x - 7, r.headY + 10, 4, 6, ['#3f6aa8', '#d84a4a', '#7ab65a'][i]);
  }
  // 나 + 부모님: 걸어와 → 팻말 앞 사진 → 선생님께 인사하고 들어감, 부모님 배웅
  const par = k.par.length ? k.par : [extra(2, { gender: 'F', age: 35 })];
  const arrive = walkX(t, 0, 1600, 30, 122);
  const enter = walkX(t, 3200, 4400, 122, 176);
  const mx = t < 3200 ? arrive.x : enter.x;
  const me = actor(px, t, 0, k.me, mx, G + 14, {
    walk: arrive.walk || enter.walk, gaze: t > 1700 && t < 3000 ? 0 : 1,
    pose: t > 1700 && t < 2600 ? 'wave1' : t > 4400 ? (Math.floor(t / 260) % 2 ? 'wave1' : 'wave2') : undefined, alpha: 1 - seg(t, 4600, 5400),
  });
  px.alpha(1 - seg(t, 4600, 5400), () => { px.rect(mx - 7, me.headY + 10, 5, 7, '#f2c230'); px.hl(mx - 7, mx - 3, me.headY + 10, '#d8a020'); });
  if (t > 1700 && t < 2600) bub(px, 'heart', me);
  par.slice(0, 2).forEach((p, i) => {
    const w = walkX(t, 0, 1600, 12 - i * 16, 104 - i * 18);
    const r = actor(px, t, 1 + i, p, w.x, G + 16 + i, { walk: w.walk, gaze: 1, pose: t > 4000 ? (Math.floor((t + i * 100) / 260) % 2 ? 'wave1' : 'wave2') : undefined });
    if (i === 0 && t > 4200) bub(px, 'heart', r);
  });
  photographer(px, t, 5, 72, G + 18, [2000, 2400], 1);
  // 선생님 (정문 앞 · 반겨 줌)
  const tr = actor(px, t, 6, dressed(extra(1, { gender: 'F', age: 38 }), { style: 'tee', color: '#9fd0b8' }), 196, G + 8, { gaze: -1, pose: t > 3000 && t < 4400 ? (Math.floor(t / 260) % 2 ? 'wave1' : 'wave2') : 'hold' });
  if (t > 3300) bub(px, 'note', tr);
  // 벚꽃잎
  for (let i = 0; i < 26; i++) { const R = rng('sk' + i); const x = (R() * W + t * 0.012 * (0.5 + R())) % W; const y = (R() * 150 + t * (0.015 + R() * 0.015)) % 150 - 6; px.px(x, y, R() < 0.5 ? '#ffd0dc' : '#f6a5bd'); }
}

// ───────── 졸업 ─────────
// 강당 앞마당 (대학이면 기둥 건물 · 학사모, 아니면 학교 건물). 졸업생들이 줄지어 서 있다가 → 1.8초 모자(꽃)를 하늘로 던짐 →
// 가족이 꽃다발 들고 달려와 안아 줌 → 다 같이 사진 (찰칵) · 꽃잎 · 색종이
export function grad(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const uni = v.arg === 'uni';
  const G = 112;
  outdoor(px, t, c, { sunX: 220 });
  if (uni) {
    // 기둥 건물 (박공 · 기둥 6개 · 계단 · 현수막)
    px.rect(60, 40, 136, 8, '#efe8dc'); for (let i = 0; i < 16; i++) px.hl(60 + i * 4, 196 - i * 4, 40 - i, i ? '#e8e0d2' : '#c9bfae');
    px.rect(60, 48, 136, 4, '#d8d0c2');
    for (let i = 0; i < 6; i++) { const x = 70 + i * 23; px.rect(x, 52, 8, G - 60, '#f4efe6'); px.vl(x + 6, 52, G - 9, '#ddd4c4'); px.vl(x + 2, 52, G - 9, '#ffffff'); }
    px.rect(64, 52, 128, G - 60, '#d8cfc0'); for (let i = 0; i < 6; i++) { const x = 70 + i * 23; px.rect(x, 52, 8, G - 60, '#f4efe6'); px.vl(x + 6, 52, G - 9, '#ddd4c4'); }
    px.rect(56, G - 8, 144, 3, '#e0d8ca'); px.rect(52, G - 5, 152, 3, '#d4ccbe');
    px.rect(96, 26, 64, 2, '#8a8478'); px.rect(100, 28, 56, 7, '#3f6aa8'); for (let i = 0; i < 9; i++) px.rect(103 + i * 6, 30, 4, 3, '#ffffff');
  } else {
    px.rect(70, 44, 120, G - 50, '#f2ece0'); px.rect(67, 40, 126, 4, '#3f6aa8');
    for (let x = 76; x < 186; x += 16) { bwin(px, x, 50, 11, 9, false, true); bwin(px, x, 66, 11, 9, false, false); }
    px.rect(110, 26, 40, 8, '#d84a4a'); for (let i = 0; i < 6; i++) px.rect(113 + i * 6, 28, 4, 4, '#ffffff');
  }
  ground(px, c, false, G - 6, 'gd', false);
  [[20, 1.2], [236, 1.2]].forEach(([x, sc]) => tree(px, x, G - 2, Math.round(sc), [dk(c.leaf, 0.2), c.leaf, lt(c.leaf, 0.3), c.trunk], 'round', 'right'));
  // 졸업생 줄 (뒤) - 1.8초 모자 던지기
  const throwT = 1800;
  const mates = [extra(0, { age: v.age ?? 23 }), extra(1, { age: v.age ?? 23 }), extra(3, { age: v.age ?? 23 }), extra(5, { age: v.age ?? 23 }), extra(7, { age: v.age ?? 23 })];
  const mx = [70, 92, 160, 182, 204];
  mates.forEach((p, i) => {
    const up = t > throwT && t < throwT + 900;
    const r = actor(px, t, 10 + i, uni ? gown(p) : p, mx[i], G + 4 - (i % 2), { pose: up ? 'up' : t > throwT + 900 ? clapPose(t, i) : 'stand', gaze: i < 2 ? 1 : -1, bob: up ? hop(t, i, 2) : 0 });
    if (uni && t < throwT) cap(px, mx[i], r.headY);
    if (!uni && t < throwT) px.rect(mx[i] - 4, G - 8, 8, 3, '#f2e6d0');
  });
  // 던진 모자 (포물선 · 빙글)
  if (t > throwT) {
    const all = [...mx, 126];
    all.forEach((x0, i) => {
      const q = (t - throwT) / 2600;
      if (q > 1) return;
      const x = x0 + (i % 2 ? 1 : -1) * q * 30;
      const y = G - 28 - Math.sin(q * Math.PI) * 70 + q * 40;
      const f = Math.floor((t + i * 70) / 100) % 2;
      if (uni) { px.rect(x - 4, y, 9, f ? 2 : 1, '#2a2e3a'); px.rect(x - 2, y + 1, 5, 2, '#2a2e3a'); px.px(x + 4, y + 2, '#f2c230'); }
      else bloom(px, x, y, ['#f05a7e', '#ffd37a', '#ffffff'][i % 3]);
    });
  }
  // 나 (가운데) → 가족이 달려와 안음
  const me = actor(px, t, 0, uni ? gown(k.me) : k.me, 126, G + 12, { pose: t > throwT && t < throwT + 900 ? 'up' : t > 3000 ? 'hold' : 'stand', gaze: t > 2800 ? 1 : 0, bob: t > throwT && t < throwT + 900 ? hop(t, 0, 3) : 0 });
  if (uni && t < throwT) cap(px, 126, me.headY, '#f05a7e');
  if (t > 2000 && t < 2800) bub(px, 'star', me);
  const fam = [...k.par, k.pt].filter(Boolean).slice(0, 3);
  if (!fam.length) fam.push(extra(2, { gender: 'F', age: 50 }));
  fam.forEach((p, i) => {
    const w = walkX(t, 2400 + i * 200, 3200 + i * 200, -20 - i * 14, 110 - i * 18);
    const r = actor(px, t, 1 + i, p, w.x, G + 14 + (i % 2) * 2, { walk: w.walk, gaze: 1, pose: !w.walk && t > 3200 ? 'hold' : undefined, cry: i === 0 && t > 3400 });
    if (i === 0 && !w.walk && t > 3200) bouquet(px, w.x + 4, G - 2);
    if (i === 0 && t > 3600) bub(px, 'heart', r);
  });
  if (t > 3300) [0, 1, 2].forEach((i) => floatHeart(px, 112 + i * 6, G - 16, t, 3400 + i * 400));
  photographer(px, t, 7, 230, G + 16, [4200, 4600], -1);
  confetti(px, t, throwT, 40, 'grad');
}

// ───────── 만남 · 청혼 ─────────
// 노을 지는 호숫가 공원 (물빛 · 오리 · 가로등 · 벤치 · 벚나무). 두 사람이 양쪽에서 걸어와 마주 섬 → 쑥스러움(땀) → 하트
//   청혼이면: 한쪽 무릎을 꿇고 반지 상자를 엶(반짝) → 입을 가리다 고개 끄덕 → 일어나 안음 · 꽃잎 · 지나가던 사람들 박수
export function date(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const propose = /청혼/.test(v.text || '');
  const pt = k.pt || other(k.me);
  const G = 112;
  outdoor(px, t, c, { sunX: 128, sunY: 66, sunR: 13, hillY: 88 });
  // 호수 (해 그림자 · 물결)
  px.rect(0, 92, W, 14, mix(c.water || '#9fc7e0', skyCols(c)[3], 0.35));
  for (let y = 93; y < 106; y += 2) for (let x = (y * 7 + Math.floor(t / 200)) % 16; x < W; x += 16) px.hl(x, x + 4, y, lt(c.water || '#9fc7e0', 0.35));
  px.alpha(0.5, () => { for (let j = 0; j < 12; j++) px.rect(124 - (12 - j) / 2 + wave(t + j * 90, 700, 1), 93 + j, 8 + (12 - j) / 3, 1, '#fff2d0'); });
  // 오리 두 마리
  [0, 1].forEach((i) => { const x = ((t * 0.008 + i * 30) % 300) - 20; const y = 98 + i * 3; px.rect(x, y, 6, 3, '#ffffff'); px.rect(x + 4, y - 2, 3, 3, i ? '#4e7a44' : '#ffffff'); px.px(x + 7, y - 1, '#f2a030'); });
  // 산책로 · 잔디
  const gr = mix(c.ground, c.leaf, 0.22);
  grass(px, 106, H, gr, dk(gr, 0.14), lt(gr, 0.2), 'dt', ['#ffffff', '#f2c84a', '#f29ab0']);
  px.rect(0, G + 2, W, 12, mix(c.road, '#e8d8c0', 0.4)); px.hl(0, W, G + 2, dk(c.road, 0.1));
  // 벚나무 · 가로등 · 벤치
  tree(px, 24, 108, 1, [dk('#f39ab0', 0.15), '#f39ab0', lt('#f39ab0', 0.4), '#8a5a4a'], 'round', 'right');
  tree(px, 232, 108, 1, [dk('#f39ab0', 0.15), '#f39ab0', lt('#f39ab0', 0.4), '#8a5a4a'], 'round', 'left');
  lampPost(px, 60, G + 2, false, t); lampPost(px, 196, G + 2, false, t);
  bench(px, 214, G + 6);
  // 두 사람: 양쪽에서 걸어와 마주 섬
  const a = walkX(t, 0, 1500, 20, 116);
  const b = walkX(t, 0, 1500, 236, 140);
  const kneel = propose && t > 2200 && t < 4000;
  const yes = propose && t > 3300;
  const hug = (propose && t > 4000) || (!propose && t > 3200);
  const shy = t > 1500 && t < 2200;
  const me = actor(px, t, 0, k.me, a.x + (hug ? 6 : 0), G + 10 + (kneel ? 7 : 0), { walk: a.walk, gaze: 1, pose: kneel ? 'sit' : hug ? 'hold' : undefined, noShadow: kneel });
  const you = actor(px, t, 1, pt, b.x - (hug ? 6 : 0), G + 10, { walk: b.walk, gaze: -1, pose: yes && !hug ? 'clap1' : hug ? 'hold' : undefined, face: hug ? 'closed' : undefined });
  if (shy) { bub(px, 'sweat', me); }
  if (kneel) {
    // 반지 상자 (열리며 반짝)
    const rx = a.x + 8;
    const ry = G - 4;
    px.rect(rx - 3, ry, 7, 4, '#c9544a'); if (t > 2600) { px.rect(rx - 3, ry - 3, 7, 3, '#a83a34'); px.ring(rx, ry, 1, '#f2e6a0'); sparkle(px, rx + 1, ry - 5, t); sparkle(px, rx - 4, ry - 2, t + 200); }
  }
  if (propose && t > 2600 && t < 3300) bub(px, 'bang', you);
  if (yes) bub(px, 'heart', you);
  if (!propose && t > 2200) bub(px, 'heart', me);
  if (hug || (propose && t > 3300)) { heartPop(px, 128, G - 32, t, propose ? 3400 : 2300); [0, 1, 2].forEach((i) => floatHeart(px, 120 + i * 6, G - 36, t, (propose ? 3600 : 2600) + i * 450)); }
  // 지나가던 사람들 (청혼이면 멈춰서 박수)
  const pass = [[extra(3, { age: 60 }), 176], [extra(6, { age: 58, gender: 'F' }), 192]];
  pass.forEach(([p, x], i) => actor(px, t, 5 + i, p, x, G + 4, { gaze: -1, pose: propose && t > 3400 ? clapPose(t, i) : 'stand', walk: false }));
  // 꽃잎
  for (let i = 0; i < 24; i++) { const R = rng('dt' + i); const x = (R() * W + t * 0.01 * (0.5 + R())) % W; const y = (R() * 150 + t * (0.014 + R() * 0.012)) % 150 - 6; px.px(x, y, R() < 0.5 ? '#ffd0dc' : '#f6a5bd'); }
}

// ───────── 아이가 태어남 ─────────
// 아기 방 (모빌 · 아기 침대 · 깃발 장식 · 선물 상자). 아기를 안고 살살 흔듦 → 배우자가 다가와 들여다봄(하트) →
// 큰아이들이 까치발로 들여다보고 폴짝 · 할머니가 선물을 들고 옴 → 아기가 손을 내밀자 다 같이 하트 · 사진 찰칵
export function newborn(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  room(px, { wall: '#f7efe4', floor: '#d9c2a2', paper: 'dot', win: [[20, 22]], sky: roomSky(c), curtain: '#f2c6d0', t, G });
  clock(px, 92, 22, t); photo(px, 64, 32, 16, 12);
  for (let i = 0; i < 11; i++) { const x = 120 + i * 12; const y = 12 + Math.round(Math.sin((i / 10) * Math.PI) * 5); const col = ['#f6a5bd', '#9fc7e0', '#ffd37a', '#b7e0a0'][i % 4]; px.rect(x, y, 6, 1, col); px.rect(x + 1, y + 1, 4, 2, col); px.rect(x + 2, y + 3, 2, 1, col); }
  rug(px, 110, G + 14, 60, '#e8b4b8');
  // 아기 침대 · 모빌
  const cx = 212;
  const sw = Math.round(wave(t, 2400, 2));
  px.vl(cx, 26, 42, '#b89a7c'); px.hl(cx - 12 + sw, cx + 12 - sw, 42, '#b89a7c');
  [-12, -4, 4, 12].forEach((d, i) => { const dx = d + (i % 2 ? sw : -sw); px.vl(cx + dx, 43, 47 + (i % 2) * 2, '#b89a7c'); if (i % 2) px.disc(cx + dx, 49 + (i % 2) * 2, 2, ['#9fc7e0', '#ffd37a'][i % 2]); else { px.px(cx + dx, 48, '#ffd37a'); px.hl(cx + dx - 1, cx + dx + 1, 49, '#ffd37a'); px.px(cx + dx, 50, '#ffd37a'); } });
  px.rect(cx - 22, G - 30, 3, 30, '#f2e6d6'); px.rect(cx + 19, G - 26, 3, 26, '#f2e6d6'); px.rect(cx - 22, G - 30, 44, 2, '#fdf8f0');
  px.rect(cx - 20, G - 12, 40, 5, '#ffffff'); px.rect(cx - 8, G - 14, 16, 3, '#f6c6d6');
  px.rect(cx + 8, G - 17, 5, 5, '#c9905e'); px.px(cx + 9, G - 15, OUT); px.px(cx + 11, G - 15, OUT); px.px(cx + 8, G - 18, '#c9905e'); px.px(cx + 12, G - 18, '#c9905e');
  for (let x = cx - 19; x < cx + 19; x += 4) px.rect(x, G - 28, 2, 21, '#f6ecdf');
  px.rect(cx - 22, G - 7, 44, 3, '#e6d6c0');
  // 선물 상자 · 풍선
  [[168, '#9fc7e0'], [180, '#f6a5bd']].forEach(([x, col], i) => { px.rect(x - 5, G - 8 + i, 10, 8 - i, col); px.vl(x, G - 8 + i, G, '#ffffff'); px.hl(x - 5, x + 4, G - 5, '#ffffff'); px.px(x - 1, G - 9 + i, '#ffffff'); px.px(x + 1, G - 9 + i, '#ffffff'); });
  balloons(px, 160, G - 30, t, ['#f6a5bd', '#9fc7e0', '#ffd37a']);
  // 아기를 안은 나 (살살 흔듦)
  const baby = k.baby[0] || { gender: 'F' };
  const bcol = baby.gender === 'M' ? '#9fc7e0' : '#f6a5bd';
  const sway = Math.round(wave(t, 1600, 1));
  const mx = 108;
  const me = actor(px, t, 0, k.me, mx + sway, G + 12, { pose: 'hold', gaze: 0, face: t > 1800 && t < 2600 ? 'closed' : undefined });
  bundleAt(px, mx + sway, G + 4, bcol, t);
  if (t > 3200 && t < 3800) { px.px(mx + sway - 4, G + 1, '#f2c9a0'); px.px(mx + sway - 5, G, '#f2c9a0'); } // 아기 손
  if (t > 800) bub(px, 'heart', me);
  // 배우자: 다가와 어깨 너머로 들여다봄
  if (k.pt) { const w = walkX(t, 400, 1300, 170, 128); const r = actor(px, t, 1, k.pt, w.x, G + 12, { walk: w.walk, gaze: -1, pose: !w.walk && t > 1400 ? 'hold' : undefined }); if (t > 2000) bub(px, 'heart', r); }
  // 큰아이들: 까치발로 들여다보고 폴짝
  k.kids.filter((m) => m.age > 0).slice(0, 3).forEach((m, i) => {
    const x = [86, 68, 50][i];
    const peek = t > 1400 && t < 2800;
    const r = actor(px, t, 2 + i, m, x, G + 14, { gaze: 1, pose: t > 3200 ? cheerPose(t, i) : peek ? 'hold' : 'stand', bob: peek ? -1 : t > 3200 ? hop(t, i) : 0 });
    if (i === 0 && t > 2400) bub(px, 'note', r);
  });
  // 할머니가 선물을 들고 들어옴
  const gm = k.mom || extra(9, { gender: 'F', age: 62 });
  const gw = walkX(t, 2200, 3200, 250, 150);
  if (t > 2200) { actor(px, t, 6, gm, gw.x, G + 16, { walk: gw.walk, gaze: -1, pose: 'hold' }); px.rect(gw.x - 4, G + 4, 8, 6, '#ffd37a'); px.vl(gw.x, G + 4, G + 9, '#d84a4a'); }
  if (t > 3200) [0, 1, 2, 3].forEach((i) => floatHeart(px, mx - 8 + i * 6, G - 24, t, 3300 + i * 400));
  photographer(px, t, 8, 236, G + 18, [3800], -1);
}

// ───────── 병원 ─────────
// 낮 병실 (커튼 칸막이 · 옆 침대 · 휠체어 · 창밖 나무). 누운 사람에게 가족이 과일 바구니와 꽃을 들고 들어옴 →
// 의사가 차트를 들고 와 설명(말줄임) → 가족은 손을 꼭 잡고 걱정(땀) → 누운 사람이 웃어 보이자(하트) 조금 안심
export function hosp(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  const who = v.arg === 'kid' ? (k.kids[0] || extra(4, { age: 6 })) : v.arg === 'pt' ? (k.pt || other(k.me)) : v.arg === 'par' ? (k.par[0] || extra(9, { age: 70 })) : k.me;
  const isMe = who === k.me;
  const vis = (isMe ? ((v.age ?? 30) < 18 ? k.par : [k.pt, ...k.kids.slice(0, 1)]) : [k.me, k.pt]).filter((p) => p && p !== who).slice(0, 2);
  if (!vis.length) vis.push(extra(2, { gender: 'F', age: 40 }));
  room(px, { wall: '#e8f0ee', floor: '#cfdad7', paper: 'stripe', win: [[150, 20]], sky: ['#9fd0f0', '#e0f2fa'], curtain: '#bcd8d4', t, G });
  // 창밖 나무
  px.disc(160, 36, 6, '#7ab65a'); px.disc(170, 34, 5, '#8ac66a'); px.vl(165, 40, 42, '#8a5a4a');
  clock(px, 128, 18, t);
  // 커튼 칸막이 · 옆 침대 (왼쪽 끝)
  px.rect(0, 8, 40, 1, '#9aa6b2'); for (let x = 2; x < 40; x += 4) { px.rect(x, 9, 3, G - 20, '#d0e4e0'); px.vl(x + 1, 10, G - 12, '#b8d0cc'); }
  // 모니터 · 링거 · 침대
  px.rect(196, 36, 26, 18, '#3a4450'); px.rect(197, 37, 24, 15, '#16202a');
  const bt = (t % 1000) / 1000; const yb = 45;
  px.hl(198, 204, yb, '#6ee0a0'); px.line(204, yb, 206, yb - 5, '#6ee0a0'); px.line(206, yb - 5, 208, yb + 4, '#6ee0a0'); px.line(208, yb + 4, 210, yb, '#6ee0a0'); px.hl(210, 220, yb, '#6ee0a0');
  px.rect(198 + Math.floor(bt * 22), 38, 2, 13, '#16202a'); px.vl(209, 54, G, '#9aa6b2');
  px.vl(58, 34, G, '#9aa6b2'); px.hl(53, 63, 34, '#9aa6b2'); px.rect(54, 35, 7, 10, '#e6f4fb'); px.rect(55, 39, 5, 5, '#cfe9f6'); px.px(57, 47 + Math.floor((t / 130) % 4), '#5fb4ee'); px.line(57, 50, 82, 94, '#cfe3f0');
  const bx = 108;
  bed(px, bx, G, 60, true);
  const smile = t > 3600;
  lieIn(px, t, who, bx, G, 60, { quilt: '#cfe3f0', pattern: 'plain', face: smile || t < 600 ? 'open' : 'closed' });
  if (t > 600 && t < 2400) bubble(px, 'dots', bx - 24, G - 26);
  if (smile) bubble(px, 'heart', bx - 24, G - 26);
  // 협탁 (과일 바구니 · 꽃병 · 물컵)
  px.rect(146, G - 16, 18, 16, '#c8d0d6'); px.rect(146, G - 16, 18, 1, '#e0e6ea');
  if (t > 1400) { px.rect(148, G - 21, 10, 5, '#c9a06a'); px.disc(150, G - 22, 2, '#e8584c'); px.disc(154, G - 23, 2, '#f2c230'); px.disc(157, G - 22, 2, '#7ab65a'); }
  vase(px, 161, G - 16);
  // 휠체어
  px.ring(236, G - 5, 5, '#5a6470'); px.ring(236, G - 5, 3, '#9aa6b2'); px.rect(230, G - 14, 10, 2, '#3f6aa8'); px.rect(238, G - 24, 2, 12, '#5a6470');
  // 가족: 과일 바구니 · 꽃 들고 들어와 곁에 섬 → 손을 잡음
  vis.forEach((p, i) => {
    const w = walkX(t, 200 + i * 300, 1400 + i * 300, 250, 152 + i * 20);
    const r = actor(px, t, 1 + i, p, w.x, G + 10 + i * 2, { walk: w.walk, gaze: -1, pose: !w.walk ? (i === 0 && t > 2600 ? 'hold' : 'stand') : 'hold', face: t > 2600 && t < 3600 && i === 1 ? 'closed' : undefined });
    if (w.walk && i === 0) { px.rect(w.x - 6, G - 4, 8, 5, '#c9a06a'); px.disc(w.x - 4, G - 5, 2, '#e8584c'); }
    if (w.walk && i === 1) bouquet(px, w.x - 4, G - 2);
    if (i === 0 && t > 2400 && t < 3600) bub(px, 'sweat', r);
    if (i === 0 && t > 3800) bub(px, 'heart', r);
  });
  // 의사 (차트 · 설명)
  const dw = walkX(t, 1600, 2400, -10, 34);
  if (t > 1600) {
    const r = actor(px, t, 5, dressed(extra(3, { gender: 'M', age: 48 }), { style: 'tee', color: '#ffffff' }), dw.x, G + 12, { walk: dw.walk, gaze: 1, pose: 'hold' });
    px.rect(dw.x + 2, G - 6, 6, 8, '#c9a07a'); px.rect(dw.x + 3, G - 5, 4, 6, '#ffffff');
    if (t > 2500 && t < 3600) bub(px, 'dots', r);
    if (t > 3800) bub(px, 'note', r);
  }
}

// ───────── 떠나보냄 ─────────
// 흐린 날 언덕 위 묘지 (소나무 · 비석 여럿 · 향 연기). 상복을 입고 꽃을 들고 언덕길을 올라옴 → 비석 앞에 꽃을 내려놓음 →
// 고개 숙여 절 · 눈물 → 가랑비가 내리기 시작하고 곁의 사람이 우산을 씌워 줌 · 까마귀가 날아감
//   arg: par 부모님 (가족이 함께) · pt 배우자 (혼자, 자녀가 뒤에서) · fr 친구
export function loss(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  skyBands(px, ['#9aa0b4', '#b4b8c8', '#c8c8d2', '#d6d4da'], 98);
  const gc = ['#c8ccd8', '#e6e8ee', '#aab0c0'];
  cloud(px, ((t * 0.003) % 300) - 40, 10, 48, gc[0], gc[1], gc[2]); cloud(px, ((t * 0.0025 + 150) % 300) - 40, 26, 40, gc[0], gc[1], gc[2]);
  px.ridge([[0, 78], [40, 70], [90, 76], [140, 66], [200, 74], [256, 68]], '#9aa49a', 100);
  px.ridge([[0, 92], [60, 84], [130, 90], [200, 82], [256, 88]], '#8a9a86', 112);
  // 소나무
  [[18, 80], [240, 76], [212, 84]].forEach(([x, y]) => { px.rect(x, y, 2, 30, '#5a4a3a'); for (let j = 0; j < 4; j++) px.rect(x - 8 + j * 2, y - 2 + j * 6, 18 - j * 4, 4, j % 2 ? '#3e5a48' : '#4a6a52'); });
  grass(px, 96, H, '#9aaa8a', '#8a9a7a', '#aaba9a', 'ls', ['#ffffff', '#c8c8d0']);
  // 비석들 (뒤) · 내 가족의 비석 (가운데)
  [[52, 96], [84, 92], [196, 94], [228, 98]].forEach(([x, y]) => { px.rect(x - 4, y - 10, 9, 10, '#b8b8bc'); px.disc(x, y - 10, 4, '#b8b8bc'); px.rect(x - 5, y, 11, 2, '#9a9aa0'); });
  const sx = 140;
  px.rect(sx - 12, G - 6, 25, 6, '#8a8a90'); px.rect(sx - 8, G - 28, 17, 22, '#c8c8cc'); px.disc(sx, G - 28, 8, '#c8c8cc'); px.vl(sx + 7, G - 28, G - 7, '#b0b0b6');
  for (let i = 0; i < 4; i++) px.hl(sx - 5, sx + 4 - (i % 2) * 3, G - 24 + i * 4, '#8a8a90');
  // 향로 · 연기
  px.rect(sx - 2, G - 4, 5, 3, '#6a5a4a'); smoke(px, sx, G - 6, t, 4, '#e6e6ea', 0.5);
  // 내려놓은 꽃 (2.2초부터)
  if (t > 2200) [[-6, '#ffffff'], [-3, '#f2e6a0'], [0, '#ffffff'], [3, '#f2e6a0']].forEach(([dx, col]) => { px.hl(sx + dx - 2, sx + dx + 2, G - 2, '#4e7a44'); bloom(px, sx + dx - 1, G - 4, col); });
  // 사람들: 언덕길을 올라와 → 꽃 내려놓고 → 절 · 눈물
  const who = v.arg === 'pt' ? [k.me, ...k.kids.slice(0, 2)] : v.arg === 'fr' ? [k.me] : [k.me, k.pt, ...k.sib.slice(0, 1), ...k.kids.slice(0, 1)];
  const ppl = who.filter(Boolean).slice(0, 4);
  ppl.forEach((p, i) => {
    const w = walkX(t, i * 250, 2000 + i * 250, -20 - i * 18, 120 - i * 20);
    const bow = t > 2600 && t < 4600;
    const r = actor(px, t, i, mourn(p), w.x, G + 12 + (i % 2) * 2, { walk: w.walk, gaze: 1, pose: bow ? 'bow' : i === 0 && t < 2200 ? 'hold' : 'stand', face: bow ? 'closed' : undefined, cry: t > 2800 });
    if (i === 0 && t < 2200) bouquet(px, w.x + 3, G - 2);
    if (i === 0 && t > 3000) bub(px, 'dots', r);
  });
  // 가랑비 · 우산 (3.4초부터)
  const rainA = seg(t, 3200, 4200);
  if (rainA > 0) {
    px.alpha(0.6 * rainA, () => { for (let i = 0; i < 50; i++) { const x = (i * 37.3) % 270 - 8; const y = ((t * 0.22 + i * 47) % 160) - 16; px.line(x, y, x - 1, y + 4, '#d6dae6'); } });
    if (ppl.length > 1) {
      const ux = 104;
      for (let j = 0; j < 6; j++) px.hl(ux - 4 - j * 2, ux + 4 + j * 2, G - 36 + j, j === 5 ? '#2a2e3a' : '#3a3e4a');
      px.vl(ux, G - 36, G - 14, '#2a2e3a');
    }
  }
  // 까마귀 두 마리가 날아감
  [0, 1].forEach((d) => { const q = seg(t, 1200 + d * 300, 5000 + d * 300); if (q <= 0 || q >= 1) return; const x = 220 - q * 260; const y = 60 - q * 40 + wave(t, 260, 1, d); const f = Math.floor(t / 130 + d) % 2; px.rect(x, y, 3, 2, '#2a2830'); px.px(x - 1, y - f, '#2a2830'); px.px(x + 3, y - f, '#2a2830'); px.px(x - 2, y - 1 + f, '#2a2830'); px.px(x + 4, y - 1 + f, '#2a2830'); });
}

// ───────── 이민 ─────────
// 공항 출국장 안 (큰 유리벽 너머 활주로 · 출발 안내판 · 수속대 · 짐 수레). 남는 부모님과 껴안고 작별 → 부모님은 울며 손 흔듦 →
// 가방을 끌고 가족과 출국 문으로 걸어 들어감 → 유리벽 밖 비행기가 활주로를 달려 떠오름
export function fly(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 114;
  // 유리벽 밖 하늘 · 활주로
  skyBands(px, skyCols(c), 70); sun(px, 60, 30, 8, '#fff6e0', '#fff0d0');
  const cc = cl3(c); cloud(px, ((t * 0.004) % 300) - 40, 14, 36, cc[0], cc[1], cc[2]);
  px.rect(0, 70, W, 12, '#8a909a'); for (let x = (Math.floor(t / 40) % 20); x < W; x += 20) px.rect(x, 76, 8, 1, '#f2f2f2');
  // 비행기: 3.6초부터 활주 → 이륙
  const pq = seg(t, 3400, 7000);
  const plx = lerp(-40, 300, pq);
  const ply = 72 - Math.max(0, pq - 0.45) * 90;
  px.rect(plx - 20, ply - 4, 40, 6, '#ffffff'); px.rect(plx + 18, ply - 3, 4, 4, '#e6eef6'); px.rect(plx - 22, ply - 10, 5, 7, '#3f6aa8'); px.rect(plx - 4, ply - 1, 14, 2, '#c8d0dc');
  for (let i = 0; i < 6; i++) px.px(plx - 12 + i * 4, ply - 2, '#3f6aa8');
  // 유리벽 틀 · 천장
  for (let x = 0; x < W; x += 32) px.rect(x, 0, 3, 84, '#5a6470');
  px.rect(0, 0, W, 8, '#e6e8ee'); for (let x = 10; x < W; x += 40) { px.rect(x, 8, 16, 2, '#fff6d0'); }
  px.rect(0, 82, W, 3, '#5a6470');
  // 바닥 (반질반질 · 비친 빛)
  px.rect(0, 85, W, H - 85, '#d8dce4'); for (let y = 88; y < H; y += 6) px.hl(0, W, y, '#ccd0d8');
  px.alpha(0.25, () => { for (let x = 0; x < W; x += 32) px.rect(x + 8, 90, 16, 40, '#ffffff'); });
  // 출발 안내판 (깜빡이며 넘어가는 글자)
  px.rect(150, 14, 92, 30, '#1e2430'); px.rect(152, 16, 88, 4, '#f2c230');
  for (let r = 0; r < 5; r++) { const flip = Math.floor(t / 400 + r) % 7 === 0; for (let i = 0; i < 10; i++) px.rect(154 + i * 8, 22 + r * 4, 6, 2, flip && i > 6 ? '#5a6070' : ['#f2f2f2', '#9fd0b8', '#f2c230'][(i + r) % 3]); }
  // 출국 문 (오른쪽)
  px.rect(214, 52, 40, 33, '#3f6aa8'); px.rect(218, 58, 32, 27, '#1e2430'); px.rect(222, 46, 24, 6, '#f2c230'); px.hl(225, 243, 48, '#3a3440');
  // 수속대 · 짐 수레 (왼쪽 뒤)
  px.rect(10, 70, 60, 14, '#b8bec8'); px.rect(10, 70, 60, 2, '#d8dce4'); for (let i = 0; i < 3; i++) actor(px, t, 20 + i, extra(i * 2, { age: 30 + i * 5 }), 20 + i * 20, 86, { gaze: -1, back: true, noShadow: true });
  // 남는 부모님 (안고 → 울며 손 흔듦)
  const stay = k.par.length ? k.par.slice(0, 2) : [extra(9, { gender: 'F', age: 60 })];
  stay.forEach((p, i) => { const r = actor(px, t, 5 + i, p, 40 - i * 18, G + 16, { pose: t < 1400 ? 'hold' : Math.floor((t + i * 140) / 260) % 2 ? 'wave1' : 'wave2', gaze: 1, cry: t > 1000 }); if (i === 0 && t > 1600) bub(px, 'heart', r); });
  // 떠나는 나와 가족 (가방 끌고)
  const go = seg(t, 1400, 4200);
  const fade = 1 - seg(t, 4000, 4600);
  const fam = [k.me, k.pt, ...k.kids.slice(0, 2)].filter(Boolean);
  fam.forEach((p, i) => {
    const x0 = 64 + i * 0 - i * 18 + 18 * (fam.length - 1);
    const x = Math.round(lerp(64 - i * 18, 226 - i * 18, ease(go)));
    px.alpha(fade, () => {
      const r = actor(px, t, i, p, x, G + 18 - (i % 2) * 2, { walk: go > 0 && go < 1, gaze: go < 0.05 ? -1 : 1, pose: t < 1400 && i === 0 ? 'hold' : undefined });
      if ((p.age ?? 30) >= 13) { px.rect(x + 6, G + 8, 7, 9, ['#e8584c', '#3f6aa8', '#f2c230'][i % 3]); px.hl(x + 7, x + 11, G + 7, OUT); px.vl(x + 7, G + 2, G + 7, OUT); px.px(x + 7, G + 17, OUT); px.px(x + 12, G + 17, OUT); }
      if (i === 0 && go > 0.1 && go < 0.6) bub(px, 'dots', r);
    });
  });
}

// ───────── 피란 ─────────
// 밤 (먼 마을에 불길 · 연기 · 탐조등). 보따리를 등에 멘 사람들의 긴 줄 · 소달구지 · 아이를 업은 어머니 · 길잡이 군인이 손짓
export function flee(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  px.bands(0, 96, ['#0d1330', '#1e2350', '#3a2a50', '#6a3a48']);
  for (let i = 0; i < 30; i++) px.px((i * 53) % 256, (i * 29) % 60, i % 4 ? '#8890b0' : '#ffffff');
  // 탐조등
  [[60, 0.5], [190, -0.4]].forEach(([x, sp], i) => { const a = Math.sin(t / 1400 + i * 2) * 0.5 + sp * 0; px.alpha(0.08, () => { for (let j = 0; j < 80; j++) px.rect(x + Math.round(a * j * 1.4) - j * 0.15, 90 - j, 2 + j * 0.3, 1, '#e8e8ff'); }); });
  hills(px, c, true, 96);
  px.alpha(0.3 + 0.1 * Math.sin(t / 200), () => { px.rect(0, 86, W, 12, '#e8584c'); px.rect(0, 82, W, 4, '#c8483c'); });
  [60, 150, 220].forEach((x, i) => { const f = Math.floor(t / 120 + i) % 3; px.rect(x - 2, 88 - f, 5, 4 + f, '#ffb02e'); px.px(x, 86 - f, '#fff4b0'); px.rect(x - 8, 90, 16, 4, '#3a2a30'); });
  [40, 120, 200].forEach((x, i) => smoke(px, x, 90, t + i * 500, 5, '#6e625a', 0.55));
  ground(px, c, true, G - 6, 'fe', true);
  // 길가 (부서진 수레바퀴 · 버려진 짐)
  px.ring(236, G + 4, 5, '#5a4a3a'); px.line(231, G + 4, 241, G + 4, '#5a4a3a'); px.rect(20, G + 8, 9, 5, '#6a5a4a');
  // 사람들 (줄지어 오른쪽으로)
  const people = [k.me, ...[k.pt, ...k.kids, ...k.par].filter(Boolean).slice(0, 3), extra(5), extra(0), extra(8, { age: 9 }), extra(3)];
  const speed = 0.012;
  people.forEach((p, i) => {
    const x = ((i * 34 + t * speed) % 300) - 30;
    const y = G + 14 - (i % 2) * 4;
    const col = ['#8a6a4f', '#6a5a7a', '#7a6a4a'][i % 3];
    const f = figure({ look: p.look, gender: p.gender, age: p.age, costume: p.costume, soft: p.soft });
    const sh = Math.round(y - f.fy + f.head) + 13;
    const kid = f.group === 'kid' || f.group === 'baby';
    const bw = kid ? 6 : 8;
    const bx = Math.round(x) - 5 - bw;
    const by = sh + (Math.floor((t + i * 90) / 170) % 2);
    px.rect(bx, by, bw, bw + 1, col); px.rect(bx + 1, by - 1, bw - 2, 1, col); px.rect(bx + 1, by, bw - 2, 1, lt(col, 0.25)); px.rect(bx, by + bw, bw, 1, dk(col, 0.3));
    px.rect(bx + bw / 2 - 1, by - 2, 2, 2, dk(col, 0.25)); px.hl(bx - 1, bx + bw, by - 1, OUT); px.hl(bx, bx + bw - 1, by + bw + 1, OUT); px.vl(bx - 1, by, by + bw, OUT);
    const r = actor(px, t, i, p, x, y, { walk: true, gaze: 1 });
    px.line(Math.round(x) - 5, by + 3, Math.round(x) + 2, by + 8, dk(col, 0.35));
    if (p === k.me && t > 1500) bub(px, 'sweat', r);
  });
  // 소달구지 (천천히)
  const ox = ((t * 0.009 + 120) % 340) - 50;
  px.rect(ox - 26, G + 2, 22, 8, '#7a5a3e'); px.hl(ox - 26, ox - 5, G + 2, '#9a7452'); px.ring(ox - 15, G + 12, 4, '#5a4a3a');
  for (let i = 0; i < 4; i++) px.rect(ox - 24 + i * 5, G - 2, 4, 4, ['#8a6a4f', '#6a5a7a', '#c9a07a', '#7a6a4a'][i]);
  px.rect(ox, G - 2, 16, 8, '#5a4a40'); px.rect(ox + 14, G - 5, 6, 6, '#5a4a40'); px.px(ox + 18, G - 6, '#e8e0d0'); px.px(ox + 15, G - 6, '#e8e0d0');
  [0, 1].forEach((j) => px.vl(ox + 2 + j * 10, G + 6, G + 10 - ((Math.floor(t / 200) + j) % 2), '#4a3a30'));
  px.line(ox - 4, G + 4, ox, G + 2, '#3a2a20');
  // 길잡이 군인 (오른쪽에서 손짓)
  actor(px, t, 12, dressed(extra(3, { gender: 'M', age: 24 }), { style: 'suit', color: '#4a5a3a' }), 232, G + 6, { gaze: -1, pose: Math.floor(t / 300) % 2 ? 'wave1' : 'wave2' });
}

// ───────── 비 오는 날 (실직 · 이혼) ─────────
// 밤비 내리는 버스 정류장 (불 켜진 가게 창 · 젖은 길에 비친 불빛 · 지나가는 차 헤드라이트와 물보라). 우산을 쓰고 걸어와 정류장 의자에 앉아 고개 숙임 →
// 차가 지나가며 물을 튀김 → (실직이면) 가족이 우산을 들고 와 곁에 앉아 어깨를 기댐 · (이혼이면) 혼자 남아 버스 불빛만
export function rain(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const alone = /각자의 길|이혼/.test(v.text || '');
  const G = 108;
  px.bands(0, 100, ['#2e3646', '#3a4252', '#4a5262']);
  // 건물 · 불 켜진 가게
  px.rect(0, 30, 120, G - 30, '#3a3e4a'); for (let x = 6; x < 114; x += 14) for (let y = 36; y < 76; y += 14) px.rect(x, y, 8, 8, (x + y) % 3 ? '#f2d08a' : '#5a5e6a');
  px.rect(4, 80, 112, G - 80, '#4a3e3a'); px.rect(8, 84, 50, 22, '#f6d9a0'); px.rect(62, 84, 50, 22, '#f6d9a0');
  for (let i = 0; i < 4; i++) { px.rect(12 + i * 11, 96, 8, 10, ['#e8584c', '#3f6aa8', '#7ab65a', '#f2c230'][i]); }
  for (let x = 4; x < 116; x += 6) px.rect(x, 78, 3, 4, x % 12 ? '#ffffff' : '#3f6aa8');
  px.rect(140, 20, 116, G - 20, '#30343e'); for (let x = 146; x < 250; x += 12) for (let y = 26; y < 96; y += 12) px.rect(x, y, 6, 6, (x * y) % 5 ? '#5a5e6a' : '#f2d08a');
  // 젖은 길 · 비친 불빛
  px.rect(0, G, W, H - G, '#2a2e38'); px.rect(0, G + 14, W, 2, '#4a4e58');
  px.alpha(0.3, () => { px.rect(8, G + 2, 50, 10, '#f6d9a0'); px.rect(62, G + 2, 50, 10, '#f6d9a0'); for (let x = 146; x < 250; x += 24) px.rect(x, G + 4, 4, 16, '#f2d08a'); });
  // 정류장 (지붕 · 기둥 · 의자 · 노선도)
  const sx = 176;
  px.rect(sx - 34, 62, 70, 4, '#5a6470'); px.rect(sx - 34, 66, 70, 1, '#7a8490'); px.alpha(0.35, () => px.rect(sx - 34, 67, 70, G - 67, '#a8c8e8'));
  px.rect(sx - 33, 67, 2, G - 67, '#5a6470'); px.rect(sx + 33, 67, 2, G - 67, '#5a6470');
  px.rect(sx + 20, 72, 12, 18, '#f2f2f2'); for (let i = 0; i < 4; i++) px.hl(sx + 22, sx + 29, 75 + i * 4, ['#d84a4a', '#3f6aa8', '#7ab65a', '#f2c230'][i]);
  px.rect(sx - 26, G - 10, 40, 3, '#9aa6b2'); px.rect(sx - 24, G - 7, 2, 7, '#5a6470'); px.rect(sx + 10, G - 7, 2, 7, '#5a6470');
  lampPost(px, 130, G, true, t);
  // 고양이 (정류장 의자 밑)
  px.rect(sx - 4, G - 4, 7, 4, '#e8a050'); px.rect(sx + 2, G - 7, 4, 4, '#e8a050'); px.px(sx + 4, G - 6, OUT); px.vl(sx - 5, G - 6 + Math.round(wave(t, 1100, 1)), G - 3, '#e8a050');
  // 나: 우산 쓰고 걸어와 앉음 → 고개 숙임
  const w = walkX(t, 0, 1500, 40, sx - 14);
  const sit = t > 1500;
  const me = actor(px, t, 0, k.me, w.x, sit ? G - 4 : G + 6, { walk: w.walk, gaze: 1, pose: sit ? (t > 2000 ? 'bow' : 'sit') : 'hold', noShadow: sit });
  if (!sit) { const ux = w.x + 3; const uy = me.headY - 12; for (let j = 0; j < 7; j++) px.hl(ux - 3 - j * 2, ux + 3 + j * 2, uy + j, j === 6 ? '#3a5a8a' : j % 2 ? '#5b86c9' : '#4f78b8'); px.vl(ux, uy, uy + 18, OUT); }
  else { px.rect(sx - 30, G - 18, 3, 16, '#4f78b8'); px.px(sx - 29, G - 19, OUT); }
  if (t > 2200) bub(px, 'dots', me);
  // 차가 지나가며 물보라 (2.6초)
  const cq = seg(t, 2400, 3400);
  if (cq > 0 && cq < 1) {
    const cx = lerp(-50, 310, cq);
    px.rect(cx - 22, G + 4, 44, 10, '#c9544a'); px.rect(cx - 14, G - 2, 26, 7, '#a83a34'); px.rect(cx - 12, G - 1, 10, 5, '#a8c8e8'); px.rect(cx + 1, G - 1, 9, 5, '#a8c8e8');
    px.disc(cx - 12, G + 15, 3, '#1e2228'); px.disc(cx + 12, G + 15, 3, '#1e2228');
    px.alpha(0.35, () => { for (let j = 0; j < 30; j++) px.rect(cx + 22, G + 6 - j * 0.1, 30 + j, 1, '#fff6c8'); });
    for (let i = 0; i < 8; i++) px.px(cx - 20 - i * 3, G + 10 - Math.abs(Math.sin(i)) * 6, '#c8d6e8');
  }
  // 실직이면 가족이 우산 들고 와 곁에 앉음
  if (!alone && t > 3600) {
    const mate = k.pt || k.par[0] || extra(2, { gender: 'F', age: 50 });
    const m = walkX(t, 3600, 4600, 270, sx + 4);
    const sat = t > 4600;
    const r = actor(px, t, 1, mate, m.x, sat ? G - 4 : G + 6, { walk: m.walk, gaze: -1, pose: sat ? 'sit' : 'hold', noShadow: sat });
    if (!sat) { const ux = m.x - 3; const uy = r.headY - 12; for (let j = 0; j < 7; j++) px.hl(ux - 3 - j * 2, ux + 3 + j * 2, uy + j, j === 6 ? '#a83a34' : '#c9544a'); px.vl(ux, uy, uy + 18, OUT); }
    if (sat) { bub(px, 'heart', r); [0, 1].forEach((i) => floatHeart(px, sx - 6 + i * 6, G - 30, t, 4800 + i * 500, '#f6a5bd')); }
  }
  if (alone && t > 4000) { // 버스가 와서 불빛만 비추고 떠남
    const bq = seg(t, 4000, 6500); const bx = lerp(300, -100, bq);
    px.rect(bx - 40, G - 26, 80, 30, '#3f8a6a'); for (let i = 0; i < 6; i++) px.rect(bx - 36 + i * 12, G - 22, 9, 9, '#f6e8b0'); px.disc(bx - 26, G + 4, 4, '#1e2228'); px.disc(bx + 26, G + 4, 4, '#1e2228');
  }
  // 비 · 물결
  for (let i = 0; i < 90; i++) { const x = (i * 37.3) % 280 - 10; const yy = ((t * (i % 3 ? 0.26 : 0.36) + i * 47) % 170) - 20; px.line(x, yy, x - 2, yy + (i % 3 ? 5 : 7), i % 3 ? '#8a98b0' : '#c8d6e8'); }
  for (let i = 0; i < 8; i++) { const q = ((t + i * 380) % 1400) / 1400; const x = 20 + i * 30; const ww = Math.round(2 + q * 8); px.alpha(1 - q, () => px.hl(x - ww, x + ww, G + 8 + (i % 3) * 5, '#c8d6e8')); }
}

// ───────── 역사 사건 뉴스 ─────────
// 저녁 거실. 시대에 맞는 라디오(1960년 전) · 흑백 TV(1980년 전) · 컬러 TV 앞에 가족이 모여 앉음 → 1.4초 속보(빨간 띠 깜빡) →
// 어른들이 놀라 일어서고(!), 아이는 엄마 품으로 · 할아버지는 창가로 가 밖을 내다봄 (전쟁이면 창밖 멀리 섬광)
export function news(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  const yr = v.year || 2000;
  const war = /전쟁|공습|폭격|침공|분쟁/.test(v.text || '');
  room(px, { wall: '#e8dccb', floor: '#bfa88c', paper: 'stripe', night: true, win: [[18, 20]], sky: ['#1a1f48', '#3a3a6a'], curtain: '#a86a5a', t, G });
  if (war && t > 1800) { const f = Math.floor(t / 180) % 6; if (f < 2) px.alpha(0.6, () => px.disc(34 + f * 6, 40, 4, '#ffb02e')); }
  clock(px, 84, 18, t); photo(px, 96, 30, 16, 12); frame(px, 118, 33, 10, 9, 0);
  rug(px, 110, G + 16, 70, '#8a5a6a'); plant(px, 248, G + 2, t);
  // 장 · 라디오 / TV
  px.rect(176, G - 14, 64, 14, '#8a6244'); px.rect(176, G - 14, 64, 1, '#a87a58'); [0, 1, 2].forEach((i) => px.rect(178 + i * 21, G - 11, 19, 8, '#7a5638'));
  const alert = t > 1400;
  const blink = alert && Math.floor(t / 200) % 2;
  if (yr < 1960) {
    px.rect(190, G - 32, 36, 18, '#8a5a3b'); px.rect(192, G - 30, 20, 14, '#c9a07a'); for (let y = G - 29; y < G - 16; y += 2) px.hl(193, 211, y, '#a07a58');
    px.disc(218, G - 26, 3, '#3a3440'); px.disc(218, G - 19, 2, '#3a3440'); if (alert) for (let i = 0; i < 3; i++) px.alpha(0.5, () => px.ring(202, G - 23, 8 + i * 4 + ((t / 100) % 4), '#f2e6a0', 30));
  } else {
    const bw = yr < 1980;
    px.line(196, G - 48, 188, G - 58, '#3a3440'); px.line(214, G - 48, 222, G - 58, '#3a3440');
    px.rect(182, G - 48, 52, 34, bw ? '#5a4a3e' : '#3a3440'); px.rect(185, G - 45, 40, 28, '#16202a');
    const scr = bw ? (blink ? '#e8e8e8' : '#b8b8b8') : blink ? '#e86a6a' : '#a8c8e8';
    px.rect(185, G - 45, 40, 28, scr);
    px.rect(193, G - 36, 10, 14, bw ? '#4a4a4a' : '#2f3b5c'); px.disc(198, G - 39, 3, bw ? '#9a9a9a' : '#f2c9a0');
    px.rect(207, G - 42, 14, 10, bw ? '#d8d8d8' : '#e8eef6');
    if (alert) { px.rect(185, G - 22, 40, 5, bw ? '#3a3a3a' : '#d0383f'); for (let i = 0; i < 40; i++) if (((i + Math.floor(t / 60)) % 7) < 4) px.px(185 + i, G - 20, '#ffffff'); }
    px.alpha(0.1, () => { for (let j = 0; j < 60; j++) px.rect(182 - j * 1.4, G - 40 + j * 0.8, 8 + j * 1.4, 1, bw ? '#e8e8e8' : '#a8c8e8'); });
  }
  lamp(px, 150, G, true);
  // 소파 + 가족
  px.alpha(0.2, () => px.rect(40, G, 104, 2, '#1c1426'));
  px.rect(40, G - 28, 104, 16, '#9a5848'); for (let i = 0; i < 5; i++) px.rect(44 + i * 20, G - 26, 18, 12, '#a8604e');
  const fam = [k.me, ...k.par, k.pt, ...k.sib.slice(0, 1), ...k.kids.slice(0, 2)].filter(Boolean).slice(0, 5);
  const standing = (p, i) => alert && (p.age ?? 30) >= 13 && t > 1700 && i < 2;
  const drawOne = (p, i) => {
    const kid = (p.age ?? 30) < 13;
    const st = standing(p, i);
    let x = 54 + i * 20;
    // 두 번째 어른은 창가로 걸어가 밖을 내다봄
    const toWin = st && i === 1;
    if (toWin) x = Math.round(lerp(x, 30, ease(seg(t, 2600, 3600))));
    const r = actor(px, t, i, p, x, st ? G + 12 : G - 6, {
      pose: st ? (toWin && t > 3600 ? 'stand' : 'hold') : 'sit', gaze: toWin && t > 2600 ? -1 : 1, noShadow: !st,
      walk: toWin && t > 2600 && t < 3600, cry: kid && t > 2000, bob: kid && alert ? -1 : 0,
    });
    if (alert && i === 0 && t < 2600) bub(px, 'bang', r);
    if (alert && kid) bub(px, 'sweat', r);
    if (t > 3000 && i === 0) bub(px, 'dots', r);
  };
  fam.forEach((p, i) => { if (!standing(p, i)) drawOne(p, i); });
  px.rect(36, G - 22, 8, 20, '#8a4c40'); px.rect(140, G - 22, 8, 20, '#8a4c40');
  px.rect(42, G - 10, 100, 6, '#b46a56'); px.hl(42, 141, G - 10, '#c98270'); px.rect(40, G - 4, 104, 3, '#7a4036');
  fam.forEach((p, i) => { if (standing(p, i)) drawOne(p, i); });
  // 찻상 · 찻잔 김
  px.rect(76, G + 6, 36, 3, '#8a6244'); px.rect(78, G + 9, 2, 5, '#6a4a32'); px.rect(108, G + 9, 2, 5, '#6a4a32');
  [84, 96].forEach((x, i) => { px.rect(x, G + 3, 4, 3, '#ffffff'); steam(px, x + 2, G + 2, t + i * 400, 0.5 * (1 - seg(t, 1400, 2400))); });
}

// ───────── 내 집 마련 ─────────
// 새 집 앞 (마당 · 울타리 · 이삿짐 트럭 · 상자 더미). 중개인이 열쇠를 건넴(반짝) → 문을 엶 → 다 같이 만세 →
// 가족이 상자를 들어 나르고 아이들은 마당을 뛰어다님 · 강아지 · 옆집 이웃이 떡(화분)을 들고 인사 · 굴뚝 연기
export function home(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  outdoor(px, t, c, { sunX: 40 });
  // 집 (벽돌 · 지붕 · 창 · 굴뚝 · 문)
  const hx = 118;
  bricks(px, hx, 54, 76, G - 54, mix(c.wall || '#fff8f2', '#e8c8a8', 0.4));
  roof(px, hx - 8, hx + 84, 54, 32, c.roofC || '#c9544a');
  px.rect(hx + 60, 32, 8, 14, '#9a6a5a'); smoke(px, hx + 64, 30, t, 4, '#ffffff', 0.5);
  bwin(px, hx + 8, 66, 14, 12, t > 2400, true); bwin(px, hx + 54, 66, 14, 12, t > 2400, true);
  const open = seg(t, 1500, 2000);
  door(px, hx + 38, G, 14, 24, '#8a5a3b', open, '#f6d9a0');
  px.rect(hx + 32, G - 1, 26, 2, '#cfc8bc');
  px.rect(hx + 36, G - 30, 18, 4, '#ffffff'); px.hl(hx + 38, hx + 51, G - 28, '#3f6aa8');
  ground(px, c, false, G - 6, 'hm', false);
  // 울타리 · 화단 · 우편함
  for (let x = 92; x < 118; x += 4) { px.rect(x, G - 10, 2, 10, '#ffffff'); px.px(x, G - 11, '#ffffff'); }
  px.hl(92, 117, G - 7, '#e8e0d2'); px.hl(92, 117, G - 3, '#e8e0d2');
  for (let x = 120; x < 194; x += 6) bloom(px, x, G - 3, ['#f05a7e', '#ffd37a', '#ffffff'][(x / 6) % 3 | 0]);
  px.vl(206, G - 14, G, '#5a5460'); px.rect(202, G - 20, 9, 6, '#3f6aa8'); px.px(210, G - 21, '#d84a4a');
  treeAt(px, 232, G - 4, c, 1.2, false, 'hm1');
  // 이삿짐 트럭 (왼쪽) · 상자 더미
  px.rect(0, G - 26, 46, 22, '#f2f2f2'); px.rect(46, G - 18, 18, 14, '#3f8ad8'); px.rect(50, G - 15, 10, 6, '#a8c8e8');
  px.rect(6, G - 22, 32, 6, '#3f8ad8'); px.disc(14, G - 2, 4, '#2a2e3a'); px.disc(54, G - 2, 4, '#2a2e3a'); px.disc(14, G - 2, 1, '#9aa6b2'); px.disc(54, G - 2, 1, '#9aa6b2');
  const boxes = Math.max(0, 5 - Math.floor(seg(t, 2600, 5600) * 5));
  for (let i = 0; i < boxes; i++) { const bx = 66 + (i % 3) * 9; const by = G - 6 - Math.floor(i / 3) * 7; px.rect(bx, by, 8, 7, '#c9a06a'); px.hl(bx, bx + 7, by + 2, '#a8804a'); px.vl(bx + 4, by, by + 2, '#e8d0a0'); }
  // 중개인 (열쇠 건넴)
  const agent = dressed(extra(3, { gender: 'M', age: 45 }), { style: 'suit', color: '#3a4a64' });
  actor(px, t, 6, agent, 178, G + 10, { gaze: -1, pose: t < 1400 ? 'hold' : (Math.floor(t / 260) % 2 ? 'wave1' : 'wave2') });
  // 나: 열쇠 받고 → 문으로 → 만세 → 상자 나르기
  const w1 = walkX(t, 0, 1000, 100, 160);
  const w2 = walkX(t, 1500, 2000, 160, 156);
  const box = t > 3000;
  const carry = box ? walkX(((t - 3000) % 2400) + 3000, 3000, 4200, 84, 150) : null;
  const mx = box ? carry.x : t < 1500 ? w1.x : w2.x;
  const cheer = t > 2000 && t < 3000;
  const me = actor(px, t, 0, k.me, mx, G + 12, { walk: w1.walk || (box && carry.walk), gaze: box ? 1 : 1, pose: cheer ? cheerPose(t, 0) : box ? 'hold' : t > 1000 && t < 1500 ? 'hold' : undefined, bob: cheer ? hop(t, 0) : 0 });
  if (t > 1000 && t < 1600) { px.rect(mx + 3, G - 6, 3, 2, '#f2c230'); px.px(mx + 6, G - 6, '#f2c230'); sparkle(px, mx + 6, G - 9, t); }
  if (box) { px.rect(mx - 4, G - 10, 9, 7, '#c9a06a'); px.hl(mx - 4, mx + 4, G - 8, '#a8804a'); }
  if (cheer) bub(px, 'star', me);
  // 가족: 같이 만세 → 상자 · 아이들은 마당을 뛰어다님
  const fam = [k.pt, ...k.kids, ...k.par].filter(Boolean).slice(0, 4);
  fam.forEach((p, i) => {
    const kid = (p.age ?? 30) < 13;
    if (kid && t > 3000) {
      const x = 120 + Math.round(wave(t + i * 700, 2600, 30));
      const r = actor(px, t, 1 + i, p, x, G + 18 + i, { walk: true, gaze: Math.cos((t + i * 700) / 2600 * Math.PI * 2) > 0 ? 1 : -1, bob: hop(t, i, 2) });
      if (i === 1) bub(px, 'note', r);
      return;
    }
    const x0 = 136 - i * 18;
    const r = actor(px, t, 1 + i, p, x0, G + 14 + (i % 2) * 2, { gaze: 1, pose: cheer ? cheerPose(t, i + 1) : t > 3000 ? 'hold' : 'stand', bob: cheer ? hop(t, i + 1) : 0 });
    if (t > 3000) { px.rect(x0 - 4, G - 8 + (i % 2) * 2, 9, 7, '#c9a06a'); }
    if (i === 0 && t > 2200) bub(px, 'heart', r);
  });
  // 강아지 · 옆집 이웃 (화분 들고 인사)
  const dx = 200 + Math.round(wave(t, 1500, 14)); const dy = G + 22 + hop(t, 5, 2);
  px.rect(dx - 4, dy - 5, 8, 4, '#f2f2f2'); px.rect(dx + 2, dy - 8, 4, 4, '#f2f2f2'); px.px(dx + 5, dy - 7, OUT); px.px(dx + 2, dy - 9, '#c9905e'); px.vl(dx - 3, dy - 1, dy, '#c9905e'); px.vl(dx + 2, dy - 1, dy, '#c9905e');
  if (t > 3600) { const nw = walkX(t, 3600, 4600, 270, 222); actor(px, t, 7, extra(6, { gender: 'F', age: 55 }), nw.x, G + 16, { walk: nw.walk, gaze: -1, pose: 'hold' }); px.rect(nw.x - 4, G + 2, 8, 5, '#a86a4a'); bloom(px, nw.x - 1, G - 1, '#f05a7e'); }
  if (t > 2000) confetti(px, t, 2000, 20, 'home', ['#ffd37a', '#f6a5bd', '#ffffff']);
}

// ───────── 상 · 장학금 · 복권 ─────────
// 상: 무대 (막 · 조명 · 단상 · 꽃장식 · 사회자). 이름이 불리자 객석에서 일어나 무대로 → 상장(트로피)을 받고 고개 숙여 인사 →
//   번쩍 들어 올림 · 객석 박수(의자 등받이) · 색종이
// 복권: 동네 복권방 앞 (TV 추첨 화면 · 번호 공). 번호를 맞춰 보다 → 손이 떨림 → 폴짝 · 지폐가 흩날림 · 가족이 달려옴
export function award(px, t, v) {
  if (/복권|당첨/.test(v.text || '')) return lottery(px, t, v);
  const k = castOf(v);
  const G = 92;
  px.rect(0, 0, W, H, '#2e2a44');
  for (let i = 0; i < 40; i++) px.px((i * 37) % 256, 8 + ((i * 13) % 50), (Math.floor(t / 300) + i) % 3 ? ['#ffd37a', '#f6a5bd', '#9fc7e0'][i % 3] : '#2e2a44');
  // 뒤 현수막 · 막 · 금 술
  px.rect(60, 18, 136, 14, '#7a2f45'); px.rect(62, 20, 132, 10, '#9a4a60'); for (let i = 0; i < 12; i++) px.rect(68 + i * 10, 23, 6, 4, '#ffd37a');
  [-1, 1].forEach((sd) => { for (let x = 0; x < 44; x++) { const X = sd < 0 ? x : W - 1 - x; const h = G + 8 - Math.round((x / 44) * 12); px.vl(X, 0, h, x % 6 < 2 ? '#5e2235' : x % 6 < 4 ? '#7a2f45' : '#9a4a60'); } px.rect(sd < 0 ? 30 : W - 36, G - 8, 6, 2, '#f2c230'); px.rect(sd < 0 ? 32 : W - 34, G - 6, 2, 5, '#f2c230'); });
  for (let x = 0; x < W; x++) { const y = 8 + Math.round(Math.abs(Math.sin(x / 20)) * 4); px.vl(x, 0, y, x % 4 < 2 ? '#8a3650' : '#7a2f45'); px.px(x, y, '#f2c230'); }
  // 무대 바닥 · 꽃장식 · 단상
  px.rect(0, G, W, 12, '#6a4a3a'); for (let x = 0; x < W; x += 20) px.vl(x, G, G + 11, '#4a3428'); px.hl(0, W, G, '#ffd37a');
  [56, 200].forEach((x) => { for (let i = 0; i < 7; i++) bloom(px, x - 9 + i * 3, G - 3 - (i % 2) * 2, ['#ffffff', '#f6a5bd', '#ffd37a'][i % 3]); px.hl(x - 10, x + 10, G - 1, '#4e7a44'); });
  px.rect(176, G - 18, 14, 18, '#8a5a3b'); px.rect(174, G - 20, 18, 3, '#a87452'); px.disc(183, G - 11, 3, '#ffd37a'); px.vl(186, G - 26, G - 20, '#3a3440'); px.rect(185, G - 28, 3, 3, '#5a5460');
  // 사회자 (단상 뒤)
  const mc = actor(px, t, 9, dressed(extra(3, { gender: 'M', age: 45 }), { style: 'suit', color: '#2f3b5c' }), 183, G - 6, { gaze: -1, pose: t > 1800 && t < 2600 ? 'hold' : 'stand', noShadow: true });
  if (t < 1200) bub(px, 'note', mc);
  // 조명
  const up = seg(t, 900, 2000);
  const mx = Math.round(lerp(60, 120, ease(up)));
  px.alpha(0.16, () => { for (let j = 0; j < G; j++) { const w = 8 + j * 0.45; px.rect(mx - w, j, w * 2, 1, '#fff6df'); } });
  px.alpha(0.2, () => { for (let j = -3; j <= 3; j++) px.rect(mx - 22 + Math.abs(j) * 2, G - 1 + j * 0.5, 44 - Math.abs(j) * 4, 1, '#fff6df'); });
  // 나: 무대로 걸어 나옴 → 받음 → 고개 숙여 인사 → 번쩍 들어 올림
  const got = t > 2200;
  const bow = t > 2600 && t < 3300;
  const raise = t >= 3300;
  const r = actor(px, t, 0, k.me, mx, G, { walk: up > 0 && up < 1, pose: bow ? 'bow' : raise ? 'up' : got ? 'hold' : undefined, gaze: up >= 1 ? 0 : 1, bob: raise ? hop(t, 0, 2) : 0 });
  if (got && !raise) { px.rect(mx - 3, G - 13, 7, 5, '#f2c230'); px.rect(mx - 1, G - 8, 3, 2, '#d8a020'); }
  if (raise) { const ty = r.headY - 7 + Math.round(wave(t, 700, 1)); px.rect(mx - 3, ty, 7, 5, '#f2c230'); px.rect(mx - 1, ty + 5, 3, 2, '#d8a020'); px.rect(mx - 3, ty + 7, 7, 1, '#b88a20'); px.px(mx - 4, ty + 1, '#f2c230'); px.px(mx + 4, ty + 1, '#f2c230'); px.px(mx - 1, ty + 1, '#fff4b0'); sparkle(px, mx + 6, ty - 2, t); sparkle(px, mx - 6, ty, t + 300); }
  if (t > 3400) bub(px, 'star', r);
  // 객석 (앉은 뒷모습 · 박수 · 일어나 환호) + 의자 등받이
  const fam = ((v.age ?? 30) < 20 ? k.par : [k.pt, ...k.kids]).filter(Boolean);
  const crowd = [...fam, extra(0), extra(3), extra(5), extra(9), extra(1), extra(6), extra(2)].slice(0, 8);
  crowd.forEach((p, i) => actor(px, t, 10 + i, p, 16 + i * 32, 134 - (i % 2), { back: true, pose: t > 2200 ? (i < fam.length && raise ? 'up' : clapPose(t, i)) : 'stand', noShadow: true, bob: i < fam.length && raise ? hop(t, i, 2) : 0 }));
  for (let i = 0; i < 9; i++) { const x = -1 + i * 32; px.rect(x, 128, 30, 16, '#6a2a3e'); px.rect(x, 128, 30, 1, '#8a3a52'); px.rect(x + 1, 130, 28, 1, '#5a2234'); px.vl(x + 29, 129, H - 1, '#4a1a2a'); }
  px.alpha(0.12, () => px.rect(0, 104, W, 24, '#fff6df'));
  confetti(px, t, 3300, 50, 'aw');
}

function lottery(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  outdoor(px, t, c, { sunX: 220 });
  // 동네 가게 줄 · 복권방 (차양 · 'LOTTO' 간판 · 진열창 TV)
  px.rect(0, 46, 96, G - 46, '#e8dccb'); bwin(px, 10, 56, 14, 12, false, true); bwin(px, 60, 56, 14, 12, false, true); door(px, 40, G, 14, 24, '#6a8aa8');
  const sx = 110;
  px.rect(sx, 40, 120, G - 40, '#f2e6d0'); px.rect(sx - 2, 36, 124, 4, '#c9544a');
  px.rect(sx + 20, 42, 80, 12, '#d84a4a'); for (let i = 0; i < 5; i++) px.disc(sx + 34 + i * 13, 48, 4, ['#f2c230', '#3f6aa8', '#e8584c', '#7ab65a', '#ffffff'][i]);
  for (let i = 0; i < 120; i += 6) px.rect(sx + i, 56, 3, 6, i % 12 ? '#ffffff' : '#f2c230');
  // 진열창 TV (추첨 번호가 하나씩)
  px.rect(sx + 8, 66, 52, G - 70, '#a8c8e8'); px.rect(sx + 14, 70, 40, 26, '#1e2430');
  const shown = Math.min(6, Math.floor(seg(t, 400, 2600) * 6.99));
  for (let i = 0; i < shown; i++) { px.disc(sx + 19 + i * 6, 83, 2, ['#f2c230', '#3f6aa8', '#e8584c', '#7ab65a', '#c4a8ec', '#ffffff'][i]); }
  door(px, sx + 76, G, 16, 28, '#5a6a7a', 0.3, '#3a3440');
  ground(px, c, false, G - 6, 'lt', true);
  // 나: 진열창 앞에서 복권과 화면을 번갈아 봄 → 손이 떨림(!) → 폴짝 · 지폐
  const hit = t > 2700;
  const shake = t > 2400 && t < 2900 ? (Math.floor(t / 50) % 2 ? 1 : -1) : 0;
  const me = actor(px, t, 0, k.me, 124 + shake, G + 14, { gaze: hit ? 0 : t % 1000 < 500 ? -1 : 1, pose: hit ? cheerPose(t, 0) : 'hold', bob: hit ? hop(t, 0, 4) : 0 });
  if (!hit) { px.rect(124 + shake - 3, G - 4, 7, 5, '#fffaf0'); px.hl(124 + shake - 2, 124 + shake + 2, G - 2, '#e8584c'); }
  if (t > 2400 && t < 2900) bub(px, 'bang', me);
  if (hit) bub(px, 'star', me);
  // 가족 · 행인이 달려옴
  const fam = [k.pt, ...k.kids].filter(Boolean).slice(0, 2);
  [...fam, extra(5, { age: 50 })].forEach((p, i) => {
    const w = walkX(t, 3000 + i * 200, 3800 + i * 200, -20 - i * 16, 100 - i * 18);
    if (t < 3000 + i * 200) return;
    const r = actor(px, t, 1 + i, p, w.x, G + 14 + (i % 2) * 2, { walk: w.walk, gaze: 1, pose: !w.walk ? cheerPose(t, i + 1) : undefined, bob: !w.walk ? hop(t, i + 1) : 0 });
    if (i === 0 && t > 3900) bub(px, 'heart', r);
  });
  // 흩날리는 지폐
  if (hit) for (let i = 0; i < 26; i++) { const R = rng('bill' + i); const q = (t - 2700 - R() * 600) / 2600; if (q < 0) continue; const x = 124 + (R() - 0.5) * 220 * Math.min(1, q * 1.5) + Math.sin(t / 200 + i) * 3; const y = G - 20 - Math.sin(Math.min(1, q) * Math.PI) * 50 + Math.max(0, q - 0.5) * 60; const f = Math.floor((t + i * 60) / 120) % 2; px.rect(x, y, f ? 5 : 3, f ? 3 : 2, '#8ac66a'); px.px(x + 1, y + 1, '#5a9a4a'); }
}

// ───────── 은퇴 ─────────
// 회사 회의실 송별회 (현수막 · 풍선 · 케이크 촛불 · 꽃다발). 동료들이 박수 → 대표가 감사패를 건네고 악수 →
// 꽃다발을 받아 들고 손 흔듦 · 동료 몇은 눈물 → 창밖 노을, 케이크 촛불이 흔들림
export function party(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  room(px, { wall: '#eef0ea', floor: '#b8a890', paper: 'stripe', win: [[16, 20], [204, 20]], sky: roomSky(c), curtain: '#c8b8a0', t, G });
  // 현수막 · 깃발 · 풍선
  px.rect(76, 18, 104, 12, '#3f6aa8'); for (let i = 0; i < 14; i++) px.rect(81 + i * 7, 22, 5, 4, '#ffffff');
  for (let i = 0; i < 16; i++) { const x = 64 + i * 8; const y = 34 + Math.round(Math.sin((i / 15) * Math.PI) * 4); px.rect(x, y, 5, 1, ['#f6a5bd', '#9fc7e0', '#ffd37a'][i % 3]); px.rect(x + 1, y + 1, 3, 2, ['#f6a5bd', '#9fc7e0', '#ffd37a'][i % 3]); }
  balloons(px, 64, G - 30, t); balloons(px, 194, G - 30, t, ['#9fc7e0', '#ffd37a', '#b7e0a0']);
  // 탁자 · 케이크 (촛불) · 음료
  table(px, 100, G - 18, 56, G, '#a87650', '#ffffff');
  px.rect(118, G - 27, 20, 9, '#fbe8d8'); px.rect(118, G - 27, 20, 2, '#f6a5bd'); px.rect(121, G - 33, 14, 6, '#fbe8d8'); px.rect(121, G - 33, 14, 1, '#f6a5bd');
  for (let i = 0; i < 4; i++) { const x = 123 + i * 3; px.vl(x, G - 37, G - 34, ['#9fc7e0', '#f6a5bd', '#ffd37a', '#b7e0a0'][i]); px.px(x + (Math.floor(t / 150 + i) % 2), G - 38, '#ffb02e'); px.px(x, G - 39, '#fff4b0'); }
  [106, 146, 152].forEach((x, i) => { px.rect(x - 1, G - 23, 3, 5, ['#e8584c', '#f2c230', '#9fc7e0'][i]); px.hl(x - 1, x + 1, G - 23, '#ffffff'); });
  // 동료들 (양옆 · 박수 · 몇은 눈물)
  const mates = (v.extra && v.extra.length ? v.extra : []).map((p, i) => extra(i + 3, p));
  const crowd = [...mates, extra(0, { age: 40 }), extra(5, { age: 33 }), extra(2, { age: 51 }), extra(7, { age: 28 })].slice(0, 6);
  const cx = [22, 40, 58, 200, 218, 236];
  crowd.forEach((p, i) => { const r = actor(px, t, 10 + i, p, cx[i], G + 12 + (i % 2) * 2, { gaze: cx[i] < 128 ? 1 : -1, pose: t > 600 ? clapPose(t, i) : 'stand', cry: i === 2 && t > 3000 }); if (i === 4 && t > 1200) bub(px, 'note', r); });
  // 대표 (감사패 → 악수)
  const boss = dressed(extra(3, { gender: 'M', age: 58 }), { style: 'suit', color: '#2f3b5c' });
  const bw = walkX(t, 800, 1800, 236, 150);
  const br = actor(px, t, 9, boss, bw.x, G + 14, { walk: bw.walk, gaze: -1, pose: t > 1800 && t < 3000 ? 'hold' : 'stand' });
  if (t > 1800 && t < 2600) { px.rect(bw.x - 9, G - 6, 8, 6, '#8a5a3b'); px.rect(bw.x - 8, G - 5, 6, 4, '#f2c230'); }
  // 나 (가운데 · 감사패 · 꽃다발 → 손 흔듦)
  const got = t > 2600;
  const r = actor(px, t, 0, k.me, 128, G + 16, { gaze: t < 3000 ? 1 : 0, pose: t > 3800 ? (Math.floor(t / 260) % 2 ? 'wave1' : 'wave2') : got ? 'hold' : 'stand', face: t > 3000 && t < 3600 ? 'closed' : undefined });
  if (got && t <= 3800) { px.rect(124, G + 2, 8, 6, '#8a5a3b'); px.rect(125, G + 3, 6, 4, '#f2c230'); }
  if (t > 3800) bouquet(px, 134, G + 2);
  if (t > 2700) bub(px, 'heart', r);
  // 가족이 문으로 들어와 꽃다발 (3.2초)
  const fam = [k.pt, ...k.kids].filter(Boolean).slice(0, 2);
  fam.forEach((p, i) => { if (t < 3000) return; const w = walkX(t, 3000 + i * 200, 3800 + i * 200, -20, 86 - i * 18); actor(px, t, 1 + i, p, w.x, G + 18, { walk: w.walk, gaze: 1, pose: !w.walk ? clapPose(t, i) : 'hold' }); if (w.walk && i === 0) bouquet(px, w.x + 4, G + 4); });
  if (t > 2600) [0, 1, 2].forEach((i) => floatHeart(px, 120 + i * 6, G - 14, t, 2700 + i * 400));
  confetti(px, t, 600, 30, 'party');
}

// ───────── 수감 ─────────
// 교도소 방 (쇠창살 앞 · 높은 창으로 드는 빛이 하루 동안 옮겨 감 · 벽에 날짜 금이 늘어남). 침상에 앉아 고개 숙임 →
// 작은 책상에서 편지를 씀 → 창가 쇠창살에 작은 새가 앉았다 감 · 복도로 간수가 지나감
export function prison(px, t, v) {
  const k = castOf(v);
  const G = 112;
  px.rect(0, 0, W, G, '#5a5a62'); for (let y = 4; y < G; y += 8) for (let x = (y / 8) % 2 ? 0 : 10; x < W; x += 20) px.rect(x, y, 18, 6, '#62626a');
  px.rect(0, G, W, H - G, '#4a4a50'); for (let x = 0; x < W; x += 16) px.vl(x, G, H, '#424248');
  // 높은 창 · 빛줄기 (시간에 따라 옮겨 감)
  const wx = 150;
  px.rect(wx, 18, 24, 14, '#a8c8e8'); for (let i = 0; i < 4; i++) px.rect(wx + 3 + i * 6, 18, 2, 14, '#3a3a40');
  const sh = seg(t, 0, 7000);
  px.alpha(0.16, () => { for (let j = 0; j < 80; j++) px.rect(wx - 20 - j * (0.6 + sh) + j * 0.2, 32 + j, 24 + j * 0.3, 1, '#fff6d0'); });
  // 벽 날짜 금 (늘어남)
  const marks = 8 + Math.floor(seg(t, 500, 5500) * 14);
  for (let i = 0; i < marks; i++) { const gx = 30 + Math.floor(i / 5) * 9; const n = i % 5; if (n < 4) px.vl(gx + n * 2, 40, 47, '#2e2e34'); else px.line(gx - 1, 46, gx + 7, 41, '#2e2e34'); }
  // 침상 · 담요 · 책상 · 편지
  px.rect(20, G - 14, 60, 6, '#6a6a72'); px.rect(20, G - 14, 60, 1, '#8a8a92'); px.rect(22, G - 8, 2, 8, '#3a3a40'); px.rect(76, G - 8, 2, 8, '#3a3a40'); px.rect(22, G - 17, 44, 3, '#7a8a9a');
  table(px, 196, G - 16, 26, G, '#7a6a5a');
  const writing = t > 2400 && t < 5200;
  // 나: 침상에 앉아 고개 숙임 → 책상으로 가 편지 → 창의 새를 올려다봄
  const w = walkX(t, 2000, 2400, 50, 190);
  const me = actor(px, t, 0, k.me, t < 2000 ? 50 : w.x, t < 2000 ? G - 12 : G + 4, {
    pose: t < 2000 ? 'bow' : writing ? 'hold' : 'stand', walk: w.walk, gaze: writing ? 1 : t >= 5200 ? -1 : 1, face: t < 2000 ? 'closed' : undefined, noShadow: t < 2000,
  });
  if (t < 2000 && t > 600) bub(px, 'dots', me);
  if (writing || t >= 5200) { px.rect(200, G - 19, 8, 3, '#fffaf0'); px.hl(201, 206, G - 18, '#8a8478'); }
  if (writing) px.px(204 + Math.round(wave(t, 300, 2)), G - 20, '#3a3440');
  if (t > 5600) bub(px, 'heart', me);
  // 새 (창 쇠창살에 앉았다 감)
  const bq = seg(t, 4600, 7400);
  if (bq > 0 && bq < 1) { const sit = bq > 0.25 && bq < 0.7; const bx = sit ? wx + 12 : lerp(wx + 40, wx + 12, Math.min(1, bq * 4)) + (bq > 0.7 ? (bq - 0.7) * 120 : 0); const by = sit ? 16 : 10 - (bq > 0.7 ? (bq - 0.7) * 30 : 0); const f = Math.floor(t / 120) % 2; px.rect(bx, by, 3, 2, '#8a6a4f'); px.px(bx + 3, by, '#f2a030'); if (!sit) { px.px(bx - 1, by - f, '#8a6a4f'); px.px(bx + 2, by - f, '#8a6a4f'); } }
  // 간수 (복도를 지나감 · 창살 뒤)
  const gq = ((t * 0.03) % 360) - 50;
  actor(px, t, 5, dressed(extra(3, { gender: 'M', age: 40 }), { style: 'suit', color: '#3a4a5a' }), gq, G + 26, { walk: true, gaze: 1, back: false });
  // 쇠창살 (맨 앞)
  for (let x = 10; x < W; x += 26) { px.rect(x, 0, 2, H, '#2e2e34'); px.vl(x, 0, H, '#6a6a72'); }
  px.rect(0, 2, W, 3, '#2e2e34'); px.rect(0, H - 14, W, 3, '#2e2e34');
}

// ───────── 일터 (일 시작 · 승진) ─────────
// 산업에 따라: 사무실(서비스) · 공장(공업) · 논밭(농업). 첫 출근: 문으로 들어서자 동료들이 돌아보며 박수 →
// 팀장이 악수 · 자리 안내 → 일하는 모습 (자판 두드리기 / 컨베이어 · 불꽃 / 모내기) · 동료가 커피(새참)를 건넴
export function work(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const ind = v.industry || 'SERVICE';
  const G = 112;
  const hat = ind === 'INDUSTRY' ? { style: 'cap', color: '#f2b22e' } : ind === 'AGRI' ? { style: 'straw', color: '#e2c27a' } : null;
  const wear = (p) => { const l = p.look || lookOf({ gender: p.gender, age: p.age, costume: p.costume, soft: p.soft }); return { ...p, look: { ...l, ...(hat ? { hat } : {}), ...(ind === 'SERVICE' ? { top: { style: 'suit', color: p.gender === 'F' ? '#5a6a8a' : '#3a4a64' } } : {}) } }; };
  const mates = (v.extra && v.extra.length ? v.extra : [{ gender: 'M', age: 34 }, { gender: 'F', age: 29 }]).map((p, i) => wear(extra(i + 3, p)));
  const more = [wear(extra(0, { age: 41 })), wear(extra(7, { age: 26 }))];
  const in1 = walkX(t, 0, 1400, 236, 170);
  const greet = t > 1400 && t < 2600;
  const working = t > 3000;
  if (ind === 'SERVICE') {
    room(px, { wall: '#eef0f2', floor: '#a8b0b8', paper: 'stripe', win: [[16, 18], [60, 18]], sky: roomSky(c), curtain: '#c8d0d8', t, G });
    // 창밖 빌딩 · 화이트보드 · 시계 · 화분
    px.rect(118, 26, 40, 24, '#ffffff'); px.rect(117, 25, 42, 1, '#9aa6b2'); px.line(122, 44, 132, 34, '#e8584c'); px.line(132, 34, 140, 40, '#e8584c'); px.line(140, 40, 152, 30, '#e8584c'); for (let i = 0; i < 3; i++) px.hl(122, 136 - i * 4, 28 + i * 2, '#3f6aa8');
    clock(px, 176, 18, t); plant(px, 112, G, t);
    door(px, 232, G, 16, 30, '#8a9aa8', seg(t, 0, 400) - seg(t, 1400, 1800), '#e6e8ee');
    // 책상 줄 (모니터 · 자판 · 의자 · 커피)
    const desks = [[20, mates[0]], [56, mates[1] || more[0]], [92, more[1]]];
    desks.forEach(([x, p], i) => {
      chair(px, x + 6, G + 2, '#3a4450', -1);
      actor(px, t, 3 + i, p, x + 6, G - 4, { pose: greet ? clapPose(t, i) : 'sit', gaze: greet ? 1 : -1, noShadow: true });
      table(px, x - 10, G - 14, 26, G, '#d8dce4');
      px.rect(x - 6, G - 24, 12, 9, '#3a4450'); px.rect(x - 5, G - 23, 10, 7, (Math.floor(t / 500) + i) % 3 ? '#9fc7e0' : '#b8d8f0'); px.rect(x - 1, G - 15, 2, 1, '#3a4450');
      px.rect(x - 4, G - 15, 8, 1, '#5a6470'); px.rect(x + 7, G - 17, 3, 3, '#ffffff');
    });
    // 내 책상 (오른쪽, 꽃 화분 · 환영 쪽지)
    const myX = 150;
    table(px, myX - 13, G - 14, 30, G, '#d8dce4'); px.rect(myX - 8, G - 24, 12, 9, '#3a4450'); px.rect(myX - 7, G - 23, 10, 7, working ? '#9fc7e0' : '#5a6470');
    vase(px, myX + 12, G - 14, ['#ffd37a', '#f05a7e', '#ffffff']); px.rect(myX - 12, G - 16, 6, 2, '#ffe14a');
  } else if (ind === 'INDUSTRY') {
    px.rect(0, 0, W, G, '#8a929e'); for (let x = 0; x < W; x += 32) { px.rect(x, 0, 2, G, '#6a727e'); }
    px.rect(0, 0, W, 10, '#5a626e'); for (let x = 8; x < W; x += 40) { px.rect(x, 10, 12, 2, '#fff6d0'); px.alpha(0.1, () => px.rect(x - 6, 12, 24, G - 12, '#fff6d0')); }
    px.rect(0, G, W, H - G, '#6a6e76'); for (let x = 0; x < W; x += 24) px.hl(x, x + 12, G + 10, '#f2c230');
    // 큰 기계 · 톱니 · 컨베이어 · 불꽃
    px.rect(150, 40, 80, G - 40, '#5a7a9a'); px.rect(156, 46, 30, 20, '#3a4450'); px.rect(158, 48, 26, 16, (Math.floor(t / 300) % 2) ? '#6ee0a0' : '#3a8a5a');
    const gr = Math.floor(t / 120) % 2; px.ring(208, 60, 9, '#3a4450', 30); px.ring(208, 60, gr ? 6 : 7, '#8a929e', 45);
    px.rect(0, G - 14, 150, 4, '#3a3e46'); for (let i = 0; i < 8; i++) { const x = ((i * 26 + t * 0.03) % 170) - 20; px.rect(x, G - 20, 10, 6, '#c9a06a'); px.hl(x, x + 9, G - 17, '#a07a48'); }
    for (let i = 0; i < 6; i++) { const q = ((t + i * 150) % 600) / 600; px.px(140 + Math.round(q * 10 * (i % 2 ? 1 : -1)), G - 24 - Math.round(Math.sin(q * Math.PI) * 10), q < 0.5 ? '#fff4b0' : '#ffb02e'); }
    px.rect(236, 30, 18, 4, '#e8584c'); px.rect(240, 34, 2, G - 34, '#3a3e46');
    door(px, 236, G, 16, 30, '#7a8490', seg(t, 0, 400) - seg(t, 1400, 1800), '#e6e8ee');
    mates.slice(0, 2).concat(more).slice(0, 3).forEach((p, i) => actor(px, t, 3 + i, p, [30, 66, 102][i], G + 4, { pose: greet ? clapPose(t, i) : Math.floor((t + i * 200) / 400) % 2 ? 'hold' : 'stand', gaze: greet ? 1 : -1 }));
  } else {
    // 논밭: 하늘 · 산 · 물 댄 논 줄 · 초가 · 허수아비 · 물소
    outdoor(px, t, c, { sunX: 200, hillY: 86 });
    const paddy = mix(c.water || '#9fc7e0', '#9ac080', 0.35);
    px.rect(0, 96, W, H - 96, paddy);
    for (let j = 0; j < 9; j++) for (let x = (j % 2) * 6 - ((t * 0.002) % 12); x < W; x += 12) { const y = 100 + j * 5; px.rect(x, y, 2, 3, c.leaf); px.px(x + 1, y - 1, lt(c.leaf, 0.3)); }
    px.alpha(0.3, () => { for (let y = 98; y < H; y += 3) px.hl(0, W, y, '#ffffff'); });
    px.rect(200, 62, 44, 32, '#c9a07a'); roof(px, 196, 248, 62, 46, '#d8b870'); door(px, 216, 94, 12, 18, '#6a4a32', 0.4, '#3a2a20');
    px.vl(170, 72, 100, '#8a6a4f'); px.rect(162, 76, 17, 2, '#8a6a4f'); px.disc(170, 70, 3, '#e2c27a'); px.rect(166, 78, 8, 8, '#d84a4a');
    const bx = 30 + Math.round(wave(t, 4000, 6));
    px.rect(bx - 10, 96, 20, 9, '#5a5a62'); px.rect(bx + 8, 93, 6, 6, '#5a5a62'); px.line(bx + 9, 92, bx + 12, 89, '#e8e0d0'); px.line(bx + 13, 92, bx + 16, 89, '#e8e0d0'); [0, 1].forEach((j) => px.vl(bx - 8 + j * 14, 105, 108, '#4a4a52'));
    mates.slice(0, 2).concat(more).slice(0, 3).forEach((p, i) => actor(px, t, 3 + i, p, [62, 96, 130][i], G + 6, { pose: greet ? clapPose(t, i) : Math.floor((t + i * 300) / 500) % 2 ? 'bow' : 'stand', gaze: greet ? 1 : -1 }));
  }
  // 팀장 (악수)
  const lead = wear(extra(2, { gender: 'M', age: 48 }));
  const lr = actor(px, t, 8, lead, 192, G + 12, { gaze: 1, pose: greet ? 'hold' : 'stand' });
  if (greet) bub(px, 'note', lr);
  // 나: 문으로 들어와 → 인사 · 악수 → 자리에서 일함
  const sx = ind === 'SERVICE' ? 150 : ind === 'INDUSTRY' ? 130 : 160;
  const w2 = walkX(t, 2600, 3000, in1.x, sx);
  const mx = t < 2600 ? in1.x : w2.x;
  const me = actor(px, t, 0, wear(k.me), mx, working && ind === 'SERVICE' ? G - 4 : G + 14, {
    walk: in1.walk || w2.walk, gaze: t < 2600 ? -1 : -1, pose: greet ? 'hold' : working ? (ind === 'SERVICE' ? 'sit' : Math.floor(t / 400) % 2 ? 'hold' : ind === 'AGRI' ? 'bow' : 'stand') : undefined, noShadow: working && ind === 'SERVICE',
  });
  if (working && ind === 'SERVICE') { chair(px, mx, G + 2, '#3a4450', -1); px.px(mx - 6 + (Math.floor(t / 90) % 3), G - 15, '#ffffff'); }
  if (greet) bub(px, 'sweat', me);
  if (t > 3600) bub(px, 'star', me);
  // 동료가 커피(새참)를 건넴
  if (t > 4000) { const cw = walkX(t, 4000, 4800, 60, mx - 18); const p = more[0]; actor(px, t, 7, p, cw.x, G + 16, { walk: cw.walk, gaze: 1, pose: 'hold' }); px.rect(cw.x + 3, G + 2, 3, 4, ind === 'AGRI' ? '#c9a07a' : '#ffffff'); steam(px, cw.x + 4, G, t); if (!cw.walk) bubble(px, 'heart', cw.x + 3, G - 14); }
}

// ───────── 장례 ─────────
// 빈소 (영정 · 국화 단 · 촛불 · 향 연기 · 근조 화환 · 방명록 탁자). 조문객이 문으로 들어와 한 사람씩 앞으로 나와 절 →
// 가족은 맨 앞줄에서 맞절하며 울고 · 뒤에는 앉아서 기다리는 사람들 · 창밖에 가랑비
export function funeral(px, t, v) {
  const k = castOf(v);
  const G = 104;
  px.rect(0, 0, W, H, '#3a3640');
  // 창 (가랑비)
  px.rect(4, 14, 26, 30, '#2a3040'); px.rect(6, 16, 22, 26, '#3a4660'); for (let i = 0; i < 8; i++) { const yy = (t * 0.1 + i * 13) % 26; px.vl(8 + i * 3, 16 + yy, 18 + yy, '#8a98c8'); }
  px.rect(226, 14, 26, 30, '#2a3040'); px.rect(228, 16, 22, 26, '#3a4660'); for (let i = 0; i < 8; i++) { const yy = (t * 0.1 + i * 17) % 26; px.vl(230 + i * 3, 16 + yy, 18 + yy, '#8a98c8'); }
  // 휘장 · 제단
  px.rect(40, 0, 176, G - 22, '#e9e6de'); for (let x = 44; x < 216; x += 8) { px.vl(x, 0, G - 23, '#d6d2c8'); px.vl(x + 1, 0, G - 23, '#f4f2ec'); }
  for (let x = 40; x < 216; x++) px.vl(x, 0, 4 + Math.round(Math.abs(Math.sin((x - 40) / 30)) * 5), '#2a2830');
  px.rect(0, G - 8, W, H - G + 8, '#4a4550'); px.rect(72, G - 8, 112, H - G + 8, '#6a4a52'); for (let y = G - 6; y < H; y += 4) px.hl(72, 183, y, '#7a5862');
  for (let r = 0; r < 5; r++) for (let i = 0; i < 18 - r * 2; i++) {
    const fx = 128 + (i - (17 - r * 2) / 2) * 7; const fy = G - 26 - r * 6; const yel = (i + r) % 4 === 0;
    px.disc(fx, fy, 3, yel ? '#d8bc68' : '#dcd8cc'); px.px(fx - 1, fy - 1, yel ? '#f2dc8a' : '#f7f4ec'); px.px(fx + 1, fy - 2, yel ? '#f2dc8a' : '#ffffff'); px.px(fx, fy, yel ? '#c8a040' : '#e8e2d0');
  }
  px.rect(48, G - 24, 160, 14, '#4a4652'); px.hl(48, 207, G - 24, '#6a6672');
  // 영정 (검은 띠)
  const me = figure({ look: lookOf({ gender: v.gender, age: v.age, costume: v.costume }), face: 'open' });
  const fw = 24; const fh = 24; const fx0 = 128 - fw / 2; const fy0 = 12;
  px.rect(fx0 - 2, fy0 - 2, fw + 4, fh + 4, '#2a2228'); px.rect(fx0 - 1, fy0 - 1, fw + 2, fh + 2, '#c9a85a');
  px.bands(fy0, fy0 + fh, ['#e9e4d8', '#c8c2b6'], fx0, fw);
  const sp = me.spr;
  for (let yy = 0; yy < sp.h; yy++) for (let xx = 0; xx < sp.w; xx++) { const col = sp.d[yy * sp.w + xx]; if (!col) continue; const X = fx0 + fw / 2 + (xx - me.fx); const Y = fy0 + 2 + (yy - me.head); if (X >= fx0 && X < fx0 + fw && Y >= fy0 && Y < fy0 + fh) px.px(X, Y, mix(col, '#d8cfc0', 0.25)); }
  [-1, 1].forEach((sd) => { for (let i = 0; i < 8; i++) px.rect(128 + sd * (fw / 2 + 2) - sd * i - (sd > 0 ? 2 : 0), fy0 - 2 + i, 3, 1, '#141016'); });
  // 촛불 · 향
  [84, 172].forEach((x) => { px.rect(x - 1, G - 34, 3, 10, '#f4ecd0'); px.rect(x - 3, G - 24, 7, 1, '#c9a040'); px.px(x, G - 36 + (Math.floor(t / 170) % 2), '#ffb02e'); px.px(x, G - 35, '#fff4b0'); px.alpha(0.12 + 0.03 * Math.sin(t / 140), () => px.disc(x, G - 35, 9, '#ffb02e')); });
  px.rect(126, G - 26, 5, 3, '#8a6a4f'); smoke(px, 128, G - 28, t, 4, '#d6d2cc', 0.5);
  // 근조 화환
  [20, 236].forEach((x) => {
    px.line(x - 6, G - 2, x, G - 26, '#5a5460'); px.line(x + 6, G - 2, x, G - 26, '#5a5460');
    px.disc(x, G - 42, 13, '#e9e6de'); for (let i = 0; i < 18; i++) { const a = i * 0.35; px.disc(x + Math.round(Math.cos(a) * 10), G - 42 + Math.round(Math.sin(a) * 10), 3, i % 4 ? '#f7f4ec' : '#e8d48a'); }
    px.disc(x, G - 42, 5, '#5f7a64'); px.rect(x - 3, G - 34, 2, 20, '#f7f4ec'); px.rect(x + 2, G - 34, 2, 20, '#f7f4ec');
  });
  // 제단 앞 따뜻한 빛
  px.alpha(0.13, () => { for (let j = 0; j < H - G + 8; j++) { const w = 70 + j * 1.1; px.rect(128 - w, G - 8 + j, w * 2, 1, '#ffe2b0'); } });
  // 가족 (맨 앞줄 왼쪽 · 맞절 · 눈물)
  const fam = [k.pt, ...k.kids, ...k.sib, ...k.par].filter(Boolean).slice(0, 3);
  fam.forEach((p, i) => { const bowing = Math.sin((t - i * 300) / 900) > 0.4 && t > 1200; actor(px, t, i, mourn(p), 70 + i * 16, G + 18, { back: false, gaze: 1, pose: bowing ? 'bow' : 'hold', face: 'closed', cry: true }); });
  // 조문객: 오른쪽 문에서 한 사람씩 들어와 → 영정 앞에서 절 → 왼쪽 뒤로
  for (let i = 0; i < 4; i++) {
    const s0 = i * 1500;
    const q = (t - s0) / 1500;
    if (q < 0 || q > 2.2) continue;
    const g = mourn(extra([3, 0, 5, 9][i], { age: [52, 47, 66, 38][i] }));
    const x = q < 0.6 ? lerp(250, 140, q / 0.6) : q < 1.3 ? 140 : lerp(140, 200, (q - 1.3) / 0.9);
    const bow = q > 0.7 && q < 1.2;
    actor(px, t, 5 + i, g, x, G + 24, { back: q >= 0.6 && q < 1.3, walk: q < 0.6 || q > 1.3, gaze: q < 0.6 ? -1 : 1, pose: bow ? 'bow' : undefined });
  }
  // 뒤에 앉아 기다리는 사람들 · 방명록 탁자
  table(px, 206, G + 6, 34, G + 20, '#5a4a40', '#e9e6de'); px.rect(214, G + 3, 10, 3, '#fffaf0'); px.vl(226, G + 1, G + 5, '#3a3440');
  [extra(1, { age: 60 }), extra(6, { age: 44 }), extra(2, { age: 71 })].forEach((p, i) => actor(px, t, 12 + i, mourn(p), 30 + i * 0 + i * 14, G + 36, { back: true, pose: 'sit', noShadow: true }));
}

export const SCENES2 = { cert, last, village, born, school, grad, date, newborn, hosp, loss, fly, flee, rain, news, home, award, party, prison, work, cowork: work, funeral };
