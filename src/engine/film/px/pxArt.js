// C22 엔딩 크레딧 픽셀 장면 부품 - 방 · 침대 · 건물 · 바깥 · 소품 (pxScenes.js 가 씀)
// 모두 256 × 144 칸 기준, 한 칸씩 찍음. 색은 장면마다 마을 권역 색(c = THEMES light)에서 가져옴
import { W, H, mix, dk, lt, rng, wave } from './pxCore';
import { figure } from './pxFigure';

// ───────── 사람 (숨 쉬듯 들썩 · 가끔 눈 깜빡 · 걸음) ─────────
//   o: pose · face · gaze · walk(걷는 중) · bob(위아래 칸) · cry(눈물) · alpha · lie
export function actor(px, t, i, p, x, y, o = {}) {
  if (!p) return null;
  const blink = (t + i * 733) % 3400 < 130;
  const walking = o.walk;
  const pose = walking ? (Math.floor((t + i * 90) / 170) % 2 ? 'walk1' : 'walk2') : o.pose || 'stand';
  const breathe = !walking && !o.still && Math.floor((t + i * 400) / 700) % 2 === 0 ? 0 : 0; // 숨은 아래 bob 으로
  const f = figure({ look: p.look, gender: p.gender, age: p.age, costume: p.costume, soft: p.soft, pose, face: o.face || (blink ? 'closed' : 'open'), gaze: o.gaze || 0, back: !!o.back });
  const yy = Math.round(y + (o.bob || 0) + breathe + (walking && pose === 'walk1' ? -1 : 0));
  const xx = Math.round(x);
  const go = () => {
    if (!o.noShadow) px.alpha(0.25, () => { px.rect(xx - 5, Math.round(y) + 1, 11, 1, '#1c1426'); px.rect(xx - 3, Math.round(y) + 2, 7, 1, '#1c1426'); });
    px.blit(f.spr, xx - f.fx, yy - f.fy);
    if (o.cry) f.eyes.forEach(([ex, ey], k) => {
      const sx = xx - f.fx + ex;
      const sy = yy - f.fy + ey;
      px.px(sx, sy + 1, '#9fd6f6');
      const q = ((t + k * 300) % 900) / 900;
      px.rect(sx, sy + 2 + Math.floor(q * 7), 1, 2, q < 0.85 ? '#5fb4ee' : '#a8dcf8');
    });
  };
  if (o.alpha != null && o.alpha < 1) px.alpha(Math.max(0, o.alpha), go); else go();
  return { headY: yy - f.fy + f.head, x: xx, f };
}

// ───────── 방 ─────────
// 벽(무늬) · 징두리 판 · 걸레받이 · 마루(판자 이음 · 결 · 윤기) · 창(틀 · 커튼 · 창턱 · 하늘) · 창빛 · 구석 그늘
export function room(px, o) {
  const { wall = '#f6ebde', floor = '#d6bf9e', G = 112, night = false, paper = 'dot', win = [], sky = ['#ffb59a', '#ffeadf'], curtain = '#e8a8a0', t = 0 } = o;
  const w = night ? mix(wall, '#2a2a4a', 0.5) : wall;
  const fl = night ? mix(floor, '#2a2a4a', 0.5) : floor;
  px.rect(0, 0, W, G, w);
  // 벽지 무늬
  for (let y = 4; y < G - 26; y += 6) for (let x = (y / 6) % 2 ? 3 : 0; x < W; x += 6) {
    if (paper === 'dot') px.px(x, y, dk(w, 0.07));
    if (paper === 'flower') { px.px(x, y, dk(w, 0.09)); px.px(x - 1, y + 1, dk(w, 0.06)); px.px(x + 1, y + 1, dk(w, 0.06)); px.px(x, y + 2, dk(w, 0.09)); }
  }
  if (paper === 'stripe') for (let x = 0; x < W; x += 8) px.rect(x, 0, 3, G - 26, dk(w, 0.04));
  // 천장 몰딩 · 구석 그늘
  px.rect(0, 0, W, 2, lt(w, 0.3)); px.rect(0, 2, W, 1, dk(w, 0.12));
  px.alpha(0.14, () => { for (let i = 0; i < 14; i++) { px.rect(i, 0, 1, G, '#1c1426'); px.rect(W - 1 - i, 0, 1, G, '#1c1426'); } });
  // 징두리 판
  const wc = mix(w, '#c8a888', 0.35);
  px.rect(0, G - 26, W, 26, wc);
  px.rect(0, G - 28, W, 2, mix(w, '#8a6a4f', 0.45)); px.rect(0, G - 28, W, 1, lt(w, 0.25));
  for (let x = 3; x < W; x += 24) { px.rect(x, G - 23, 20, 1, dk(wc, 0.12)); px.rect(x, G - 23, 1, 17, dk(wc, 0.12)); px.rect(x + 1, G - 22, 19, 1, lt(wc, 0.2)); px.rect(x, G - 7, 20, 1, lt(wc, 0.2)); px.rect(x + 19, G - 22, 1, 16, lt(wc, 0.2)); }
  px.rect(0, G - 3, W, 3, mix(w, '#8a6a4f', 0.55)); px.rect(0, G - 3, W, 1, lt(mix(w, '#8a6a4f', 0.55), 0.25));
  // 마루
  for (let y = G; y < H; y++) px.rect(0, y, W, 1, mix(dk(fl, 0.1), lt(fl, 0.06), (y - G) / (H - G)));
  for (let j = 0; j * 5 < H - G; j++) {
    const y = G + 2 + j * 5;
    px.rect(0, y, W, 1, dk(fl, 0.16));
    for (let x = (j % 2) * 20; x < W; x += 40) px.rect(x, y + 1, 1, 4, dk(fl, 0.16));
    const R = rng('fl' + j);
    for (let i = 0; i < 10; i++) px.rect(Math.floor(R() * W), y + 2 + Math.floor(R() * 2), 4 + Math.floor(R() * 4), 1, dk(fl, 0.06));
  }
  px.alpha(0.2, () => px.rect(0, G, W, 2, '#1c1426'));
  // 창 + 창빛
  win.forEach(([x, y, ww = 34, hh = 28]) => {
    px.alpha(night ? 0.06 : 0.14, () => { for (let j = 0; j < H - y - hh; j++) px.rect(x + j * 0.7, y + hh + j, ww, 1, night ? '#a8b8f0' : '#fff6dc'); });
    px.alpha(night ? 0.05 : 0.12, () => px.disc(x + ww / 2, y + hh / 2, ww * 0.9, night ? '#a8b8f0' : '#fff6dc'));
    window2(px, x, y, ww, hh, sky, night, curtain, t);
  });
}
export function window2(px, x, y, w, h, sky, night, curtain, t = 0) {
  const fr = '#fdf8f0';
  px.rect(x - 2, y - 2, w + 4, h + 4, dk(fr, 0.18));
  px.rect(x - 1, y - 1, w + 2, h + 2, fr);
  px.bands(y, y + h, night ? ['#0d1330', '#1e2a5a', '#2a3466'] : [sky[0], mix(sky[0], sky[1], 0.5), sky[1]], x, w);
  if (night) { px.disc(x + w - 8, y + 7, 3, '#f4ecd0'); px.px(x + w - 9, y + 6, '#ddd2b0'); [[4, 5], [10, 12], [16, 4], [7, 18]].forEach(([a, b]) => px.px(x + a, y + b, (Math.floor(t / 400 + a) % 3) ? '#ffffff' : '#8890b0')); }
  else { px.disc(x + w - 9, y + h - 9, 3, '#fff6e0'); px.ridge([[x, y + h - 5], [x + w * 0.4, y + h - 9], [x + w * 0.7, y + h - 6], [x + w, y + h - 8]], mix(sky[0], '#c87a8a', 0.4), y + h); }
  px.line(x + 3, y + h - 3, x + 10, y + 3, lt(sky[1], 0.5)); px.line(x + 6, y + h - 3, x + 13, y + 5, lt(sky[1], 0.3));
  px.rect(x + w / 2 - 1, y, 2, h, fr); px.rect(x, y + h / 2 - 1, w, 2, fr);
  px.rect(x - 4, y + h + 2, w + 8, 2, fr); px.rect(x - 4, y + h + 4, w + 8, 1, dk(fr, 0.25));
  // 커튼봉 · 커튼 (주름 · 묶은 끈 · 살랑)
  px.rect(x - 9, y - 6, w + 18, 1, '#8a6a4f'); px.px(x - 10, y - 6, '#6a4a34'); px.px(x + w + 9, y - 6, '#6a4a34');
  const sw = Math.round(wave(t, 3000, 0.8));
  [-1, 1].forEach((sd) => {
    for (let j = 0; j < h + 8; j++) {
      const tied = j > h * 0.5 && j < h * 0.5 + 2;
      const ww = tied ? 4 : j < h * 0.5 ? 7 - Math.floor(j / 6) : 4 + Math.floor((j - h * 0.5) / 3);
      const xx = sd < 0 ? x - 8 + (j > h * 0.5 ? sw : 0) : x + w + 8 - ww - (j > h * 0.5 ? sw : 0);
      px.rect(xx, y - 5 + j, ww, 1, curtain);
      px.px(xx + 2, y - 5 + j, dk(curtain, 0.18)); if (ww > 5) px.px(xx + 4, y - 5 + j, dk(curtain, 0.12));
      if (tied) px.rect(xx, y - 5 + j, ww, 1, dk(curtain, 0.35));
    }
  });
}
export function frame(px, x, y, w = 12, h = 10, kind = 0) {
  px.rect(x + 1, y + 1, w, h, '#1c142633'.slice(0, 7));
  px.rect(x, y, w, h, '#a8805a'); px.rect(x, y, w, 1, '#c9a074');
  px.rect(x + 1, y + 1, w - 2, h - 2, ['#cfe3f0', '#f6e6c8', '#f6d0c0'][kind % 3]);
  if (kind % 3 === 0) { px.ridge([[x + 1, y + h - 3], [x + w * 0.4, y + 3], [x + w * 0.6, y + 5], [x + w - 1, y + 4]], '#7fa98a', y + h - 1); px.px(x + w - 3, y + 2, '#ffd37a'); }
  if (kind % 3 === 1) { px.rect(x + 3, y + 3, 2, 2, '#f2c9a0'); px.rect(x + 3, y + 5, 2, 3, '#e98aa6'); px.rect(x + 7, y + 3, 2, 2, '#f2c9a0'); px.rect(x + 7, y + 5, 2, 3, '#8fb0ec'); }
  if (kind % 3 === 2) { [3, 5, 7].forEach((d, i) => px.px(x + d, y + 4, ['#f05a7e', '#ffd37a', '#f6a5bd'][i])); px.rect(x + 5, y + 5, 1, 3, '#5f9a6a'); }
}
export function clock(px, x, y, t) {
  px.disc(x, y, 5, '#8a6a4f'); px.disc(x, y, 4, '#fffaf0');
  [0, 3, 6, 9].forEach((h) => px.px(x + Math.round(Math.sin(h * 0.5236) * 3), y - Math.round(Math.cos(h * 0.5236) * 3), '#5a4a3a'));
  px.line(x, y, x + Math.round(Math.sin(t / 3000) * 2), y - Math.round(Math.cos(t / 3000) * 2), '#2e2a33');
  px.line(x, y, x + Math.round(Math.sin(t / 250) * 3), y - Math.round(Math.cos(t / 250) * 3), '#c9544a');
}
export function plant(px, x, y, t, s = 1) {
  const sw = Math.round(wave(t, 2800, 1));
  px.rect(x - 4, y - 7, 8, 7, '#c9784e'); px.rect(x - 5, y - 8, 10, 2, '#d98c62'); px.rect(x - 3, y - 4, 6, 1, '#a85e3a'); px.rect(x + 2, y - 7, 1, 7, '#a85e3a');
  const L = ['#4e7a44', '#6e9a58', '#86b268'];
  [[-5, -18], [-2, -22], [2, -21], [5, -17], [0, -15], [-4, -13], [4, -13]].forEach(([dx, dy], i) => {
    px.line(x, y - 8, x + dx * s + (i % 2 ? sw : 0), y + dy * s, L[0]);
    px.rect(x + dx * s - 1 + (i % 2 ? sw : 0), y + dy * s, 3, 2, L[i % 3]);
  });
}
export function rug(px, cx, y, w, c) {
  for (let j = -4; j <= 4; j++) { const ww = Math.round(w * Math.sqrt(1 - (j * j) / 25)); px.rect(cx - ww, y + j, ww * 2, 1, c); }
  for (let j = -3; j <= 3; j++) { const ww = Math.round((w - 4) * Math.sqrt(1 - (j * j) / 16)); if (Math.abs(j) === 3) for (let x = -ww; x < ww; x += 2) px.px(cx + x, y + j, lt(c, 0.35)); px.px(cx - ww, y + j, lt(c, 0.35)); px.px(cx + ww - 1, y + j, lt(c, 0.35)); }
  px.rect(cx - w / 3, y - 1, (w / 3) * 2, 2, lt(c, 0.15));
}
export function shelf(px, x, y, t) {
  px.rect(x - 1, y - 1, 34, 50, '#6a4a34'); px.rect(x, y, 32, 48, '#4a3426');
  const B = ['#c9544a', '#5b86c9', '#e6c35c', '#4a9a7a', '#9b6fd0', '#d98c62', '#6a7a8a'];
  [0, 1, 2].forEach((r) => {
    px.rect(x, y + r * 16 + 14, 32, 2, '#8a6244');
    if (r < 2) for (let i = 0; i < 7; i++) { const h = 9 + ((i * 3 + r) % 4); px.rect(x + 2 + i * 4, y + r * 16 + 14 - h, 3, h, B[(i + r * 2) % 7]); px.px(x + 2 + i * 4, y + r * 16 + 14 - h + 2, lt(B[(i + r * 2) % 7], 0.4)); }
  });
  plant(px, x + 8, y + 46, t, 0.55); frame(px, x + 18, y + 36, 10, 10, 1);
}
export function lamp(px, x, y, on = true) {
  if (on) px.alpha(0.16, () => px.disc(x, y - 30, 16, '#ffe0a0'));
  px.rect(x - 3, y - 1, 7, 1, '#3a3440'); px.rect(x, y - 30, 1, 29, '#3a3440');
  for (let j = 0; j < 7; j++) px.rect(x - 3 - Math.floor(j / 2), y - 37 + j, 7 + Math.floor(j / 2) * 2, 1, on ? '#fbe8c0' : '#d8cfc0');
}

// ───────── 침대 · 이불 ─────────
// 나무 침대(머리판 나뭇결 · 기둥 꼭지) / 병원 침대(쇠틀 · 바퀴) · 매트리스 · 베개
export function bed(px, x, G, w = 56, hosp = false) {
  const L = x - w / 2;
  const wood = hosp ? '#b9c3cc' : '#9a7452';
  const sh = dk(wood, 0.25);
  px.alpha(0.2, () => px.rect(L - 2, G, w + 6, 2, '#1c1426'));
  if (hosp) { px.rect(L - 3, G - 26, 2, 26, wood); px.rect(L + 3, G - 26, 2, 18, wood); px.rect(L - 3, G - 26, 8, 2, wood); [0, 1, 2].forEach((i) => px.rect(L - 1, G - 22 + i * 5, 4, 1, sh)); }
  else {
    px.rect(L - 8, G - 28, 12, 20, wood); px.disc(L - 2, G - 28, 6, wood);
    [G - 26, G - 22, G - 17].forEach((y) => px.rect(L - 7, y, 9, 1, sh));
    px.rect(L - 10, G - 30, 2, 30, sh); px.rect(L + 4, G - 30, 2, 30, sh); px.disc(L - 9, G - 31, 1, wood); px.disc(L + 5, G - 31, 1, wood);
  }
  px.rect(L + w - 1, G - 18, 3, 18, hosp ? wood : sh); if (!hosp) px.disc(L + w, G - 19, 1, wood);
  px.rect(L - 1, G - 8, w + 1, 4, wood); px.rect(L - 1, G - 8, w + 1, 1, lt(wood, 0.25));
  px.rect(L, G - 4, 2, 4, sh); px.rect(L + w - 3, G - 4, 2, 4, sh);
  if (hosp) { px.rect(L - 1, G - 1, 3, 2, '#5a6470'); px.rect(L + w - 4, G - 1, 3, 2, '#5a6470'); }
  px.rect(L, G - 14, w, 6, '#fdfaf4'); px.rect(L, G - 10, w, 2, '#ebe3d6');
  for (let i = 1; i < w - 1; i += 2) px.px(L + i, G - 11, '#d8cfc0');
  // 베개
  px.rect(L + 1, G - 19, 14, 5, '#ffffff'); px.rect(L + 2, G - 20, 12, 1, '#ffffff'); px.rect(L + 1, G - 15, 14, 1, '#ddd4c6'); px.rect(L + 5, G - 18, 5, 1, '#e8e0d2');
}
// 누운 사람 + 퀼트 이불 (배 · 무릎 굴곡 · 체크/꽃 무늬 · 주름 · 접힌 홑청 · 숨 쉬기)
export function lieIn(px, t, p, x, G, w = 56, o = {}) {
  const L = x - w / 2;
  const k = (p.age ?? 30) < 3 ? 0.6 : (p.age ?? 30) < 11 ? 0.8 : 1;
  const f = figure({ look: p.look, gender: p.gender, age: p.age, costume: p.costume, soft: p.soft, pose: 'stand', face: o.face || 'closed' });
  // 머리가 베개 위 (발이 오른쪽) : 그림을 돌려 찍음
  const sp = f.spr;
  const headX = L + 3;
  const cy = G - 18;
  const a = headX + Math.max(10, f.eyes[0][1] - f.head + 4); // 이불(접은 홑청)이 시작하는 곳 = 턱 아래 (어른 13칸, 아이도 얼굴을 덮지 않게)
  for (let yy = 0; yy < sp.h; yy++) for (let xx = 0; xx < sp.w; xx++) {
    const col = sp.d[yy * sp.w + xx];
    if (!col) continue;
    const X = headX + (yy - f.head);
    if (X >= a) continue; // 이불 밑 몸은 찍지 않음 (어깨 · 팔 끝이 이불 위로 삐져나오던 것)
    const Y = cy + (xx - f.fx);
    px.px(X, Y, col);
  }
  if (o.cry) { const ex = headX + (f.eyes[0][1] - f.head); px.px(ex, cy + 2, '#5fb4ee'); }
  // 이불: 몸 모양을 따라 (가슴 · 배 · 무릎 · 발끝) 부드럽게 솟고, 침대 옆으로 자락이 늘어짐
  const breath = o.breath ?? (Math.sin(t / 650) + 1) / 2;
  const R2 = Math.round(L + w);
  const col = o.quilt || '#e9b8a8';
  const hi = lt(col, 0.32);
  const mid = lt(col, 0.12);
  const lo = dk(col, 0.1);
  const g2 = (q, m, s2) => Math.exp(-(((q - m) / s2) ** 2));
  const hem = G - 5; // 자락 끝 (매트리스 아래로 조금)
  const tops = [];
  for (let X = a; X <= R2; X++) {
    const q = (X - a) / Math.max(1, R2 - a);
    const h = (5 + 2.2 * g2(q, 0.12, 0.14) - 0.8 * g2(q, 0.4, 0.12) + 1.8 * g2(q, 0.64, 0.1) + 1.4 * g2(q, 0.92, 0.06)) * k;
    const fall = q > 0.95 ? (q - 0.95) * 60 : 0; // 발끝에서 둥글게 떨어짐
    const yTop = Math.round(G - 17 - h - (q < 0.4 ? breath * k : 0) + fall);
    tops.push(yTop);
    const yBot = hem + ((X >> 2) % 2); // 자락 끝 물결
    for (let Y = yTop; Y <= yBot; Y++) {
      const d = Y - yTop;
      let c = d === 0 ? hi : d < 3 ? mid : Y > G - 9 ? lo : col;
      if (o.pattern === 'flower' && d > 1 && Y < G - 9 && (X * 5 + Y * 3) % 11 === 0) c = '#ffffff';
      if (o.pattern === 'check' && d > 1 && ((X >> 2) + (Y >> 2)) % 2) c = mix(c, '#ffffff', 0.12);
      if (Y === yBot) c = dk(col, 0.28);
      px.px(X, Y, c);
    }
    px.px(X, yTop - 1, dk(col, 0.42)); // 윗선
  }
  // 무릎 · 배 주름 (비스듬히 몇 줄)
  [[0.5, 5], [0.58, 4], [0.76, 4]].forEach(([q, n]) => {
    const X0 = Math.round(a + q * (R2 - a));
    for (let j = 0; j < n; j++) px.px(X0 + j, (tops[X0 - a] ?? G - 20) + 3 + j, dk(col, 0.12));
  });
  // 발끝 · 머리맡 쪽 옆선
  px.vl(R2 + 1, (tops[tops.length - 1] ?? G - 18), hem, dk(col, 0.42));
  // 접어 내린 하얀 홑청 (가슴 위, 이불 윗선을 따라)
  for (let i = 0; i < 4; i++) {
    const X = a + i;
    const y0 = (tops[i] ?? G - 22) - 1;
    for (let Y = y0; Y <= G - 9; Y++) px.px(X, Y, i === 3 ? '#e6dccd' : Y === y0 ? '#ffffff' : '#fbf8f2');
  }
  px.vl(a - 1, (tops[0] ?? G - 22), G - 9, dk(col, 0.42));
}

// ───────── 바깥 ─────────
export function skyline(px, c, night, G = 108, seed = 'c', t = 0) {
  const R = rng(seed);
  const col = night ? '#262e5c' : mix(c.far, '#ffffff', 0.22);
  const col2 = night ? '#1c2450' : mix(c.far, '#ffffff', 0.4);
  [[col2, 1.3, 14], [col, 1, 0]].forEach(([cc, hk, off]) => {
    for (let x = -10 + off; x < W; x += 13 + Math.floor(R() * 6)) {
      const w = 10 + Math.floor(R() * 8);
      const h = Math.floor((14 + R() * 30) * hk);
      px.rect(x, G - h, w, h, cc); px.rect(x, G - h, w, 1, lt(cc, 0.2));
      if (R() < 0.3) px.rect(x + w - 4, G - h - 3, 3, 3, cc);
      for (let y = G - h + 3; y < G - 2; y += 4) for (let xx = x + 2; xx < x + w - 2; xx += 3) {
        const on = night ? R() < 0.42 : R() < 0.2;
        if (on) px.px(xx, y, night ? (Math.floor(t / 900 + xx) % 17 ? '#ffd37a' : '#ffefb0') : lt(cc, 0.35));
      }
    }
  });
}
export function hills(px, c, night, y = 96) {
  const sky = night ? '#2a3466' : (c.sky.match(/#[0-9a-f]{6}/gi) || []).slice(-1)[0];
  const far = night ? '#1e2850' : mix(c.far, sky, 0.35);
  const pts = [[0, y - 14], [24, y - 26], [46, y - 18], [70, y - 32], [96, y - 16], [126, y - 28], [158, y - 14], [186, y - 30], [214, y - 18], [240, y - 26], [256, y - 16]];
  px.ridge(pts, far, y + 10);
  pts.forEach(([x, yy], i) => { if (i && pts[i - 1][1] > yy) px.line(pts[i - 1][0], pts[i - 1][1], x, yy, lt(far, 0.3)); });
  px.ridge([[0, y - 4], [50, y - 12], [110, y - 6], [170, y - 14], [220, y - 6], [256, y - 10]], night ? '#253060' : c.far, y + 10);
  px.ridge([[0, y + 2], [70, y - 4], [140, y + 1], [210, y - 5], [256, y]], night ? '#283463' : c.near, y + 14);
}
export function ground(px, c, night, G, seed = 'gr', road = false) {
  const g = night ? '#1e2644' : mix(c.ground, c.leaf, 0.16);
  const R = rng(seed);
  for (let y = G; y < H; y++) px.rect(0, y, W, 1, mix(dk(g, 0.06), lt(g, 0.05), (y - G) / (H - G)));
  px.hl(0, W, G, dk(g, 0.15));
  for (let i = 0; i < (H - G) * 14; i++) {
    const x = Math.floor(R() * W);
    const y = G + 1 + Math.floor(R() * (H - G - 1));
    const r = R();
    if (r < 0.4) { px.px(x, y, dk(g, 0.12)); px.px(x, y - 1, dk(g, 0.08)); }
    else if (r < 0.75) px.px(x, y, lt(g, 0.15));
    else if (r < 0.8) px.px(x, y, ['#ffffff', '#f2c84a', '#f29ab0'][i % 3]);
    else if (r < 0.84) px.rect(x, y, 2, 1, dk(g, 0.2));
  }
  if (road) {
    const rc = night ? '#2a3150' : c.road;
    px.rect(0, G + 8, W, 12, rc); px.hl(0, W, G + 8, dk(rc, 0.15)); px.hl(0, W, G + 19, dk(rc, 0.15));
    for (let x = 0; x < W; x += 16) px.rect(x, G + 13, 8, 1, lt(rc, 0.4));
  }
}
export function cloudsRow(px, c, t, n = 3, night = false) {
  const R = rng('cl' + n);
  for (let i = 0; i < n; i++) {
    const w = 26 + Math.floor(R() * 22);
    const x = ((t * (0.002 + R() * 0.003) + R() * 300) % 320) - 50;
    const y = 6 + Math.floor(R() * 26);
    const base = night ? '#3a4478' : lt(c.far, 0.55);
    const hi = night ? '#4a5490' : '#fff8f0';
    const sh = night ? '#2a3466' : mix(c.far, '#ffffff', 0.25);
    const h = Math.round(w * 0.3);
    px.rect(x + 2, y + h - 2, w - 4, 3, sh);
    px.disc(x + w * 0.3, y + h * 0.5, Math.round(h * 0.55), base); px.disc(x + w * 0.56, y + h * 0.2, Math.round(h * 0.8), base); px.disc(x + w * 0.78, y + h * 0.55, Math.round(h * 0.5), base);
    px.rect(x + 3, y + h * 0.5, w - 6, Math.round(h * 0.5), base);
    px.hl(x + w * 0.44, x + w * 0.66, Math.round(y + h * 0.2 - h * 0.8), hi);
  }
}
// 건물: 벽돌 · 창(틀 · 반사 · 화분상자) · 지붕(기와 줄) · 문
export function bricks(px, x, y, w, h, c) {
  px.rect(x, y, w, h, c);
  for (let j = 0; j * 3 < h; j++) for (let i = -1; i * 8 < w; i++) { const bx = x + i * 8 + (j % 2) * 4; if (bx > x && bx < x + w) px.px(bx, y + j * 3 + 1, dk(c, 0.08)); px.hl(Math.max(x, bx), Math.min(x + w - 1, bx + 7), y + j * 3, dk(c, 0.05)); }
}
export function bwin(px, x, y, w = 10, h = 9, lit = false, box = false) {
  px.rect(x - 1, y - 1, w + 2, h + 2, '#fdf8f0');
  px.rect(x, y, w, h, lit ? '#ffe2a0' : '#b8d4ea'); px.line(x + 1, y + h - 2, x + 4, y + 1, '#ffffff');
  px.rect(x + w / 2, y, 1, h, '#fdf8f0'); px.rect(x, y + Math.floor(h / 2), w, 1, '#fdf8f0');
  px.rect(x - 2, y + h + 1, w + 4, 1, '#d8cfc2');
  if (box) { px.rect(x - 1, y + h + 2, w + 2, 2, '#a8653e'); for (let i = 0; i < w; i += 2) px.px(x + i, y + h + 1, ['#f05a7e', '#ffd37a', '#ffffff'][(i / 2) % 3]); }
}
export function roof(px, x1, x2, y, peak, c) {
  const mid = (x1 + x2) / 2;
  for (let yy = peak; yy <= y; yy++) {
    const k = (yy - peak) / (y - peak);
    const a = Math.round(mid - (mid - x1 + 4) * k);
    const b = Math.round(mid + (x2 + 4 - mid) * k);
    px.hl(a, b, yy, (yy - peak) % 3 === 0 ? dk(c, 0.18) : c);
    px.px(a, yy, dk(c, 0.35)); px.px(b, yy, dk(c, 0.35));
  }
  px.hl(x1 - 4, x2 + 4, y + 1, dk(c, 0.4));
}
export function door(px, x, G, w = 12, h = 20, c = '#8a5a3b', open = 0, inside = '#4a3a30') {
  px.rect(x - w / 2 - 1, G - h - 1, w + 2, h + 1, dk(c, 0.3));
  px.rect(x - w / 2, G - h, w, h, inside);
  const ow = Math.round(w * (1 - open * 0.85));
  px.rect(x - w / 2, G - h, ow, h, c);
  if (ow > 5) { px.rect(x - w / 2 + 2, G - h + 2, ow - 4, 6, dk(c, 0.15)); px.rect(x - w / 2 + 2, G - h + 10, ow - 4, h - 12, dk(c, 0.15)); px.px(x - w / 2 + ow - 2, G - h / 2, '#f2c230'); }
  if (open > 0) px.alpha(0.25 * open, () => px.rect(x - w / 2, G, w, 3, '#fff2c8'));
}
export function treeAt(px, x, y, c, s = 1, night = false, seed = 't') {
  const leaf = night ? '#22344a' : c.leaf;
  const R = rng(seed + x);
  px.alpha(0.22, () => px.rect(x - 8 * s, y, 16 * s, 2, '#1c1426'));
  px.rect(x - 1, y - 14 * s, 3, 14 * s, night ? '#3b2f3f' : c.trunk); px.px(x, y - 8 * s, dk(c.trunk, 0.3));
  const r = 8 * s;
  [[0, -18], [-6, -14], [6, -14], [-3, -22], [4, -21]].forEach(([dx, dy]) => px.disc(x + dx * s, y + dy * s + 1, Math.round(r * 0.7), dk(leaf, 0.22)));
  [[0, -18], [-6, -14], [6, -14], [-3, -22], [4, -21]].forEach(([dx, dy]) => px.disc(x + dx * s, y + dy * s, Math.round(r * 0.66), leaf));
  for (let i = 0; i < 14 * s; i++) { const a = R() * 6.28; const d = R() * r; px.px(x + Math.cos(a) * d, y - 18 * s + Math.sin(a) * d * 0.8, R() < 0.5 ? lt(leaf, 0.25) : dk(leaf, 0.15)); }
  px.disc(x - 3 * s, y - 23 * s, 2, lt(leaf, 0.3));
}
export function bush(px, x, y, c) {
  px.disc(x - 3, y - 3, 3, dk(c.leaf, 0.1)); px.disc(x + 2, y - 4, 4, c.leaf); px.disc(x + 5, y - 2, 3, dk(c.leaf, 0.1));
  px.px(x + 1, y - 7, lt(c.leaf, 0.3)); px.px(x - 2, y - 4, '#ffffff'); px.px(x + 4, y - 5, '#f29ab0');
}
export function bench(px, x, G) {
  px.alpha(0.2, () => px.rect(x - 13, G, 26, 2, '#1c1426'));
  [0, 1, 2].forEach((i) => { px.rect(x - 12, G - 16 + i * 2, 24, 1, '#a8774e'); });
  [0, 1].forEach((i) => px.rect(x - 13, G - 8 + i * 2, 26, 1, '#a8774e'));
  px.rect(x - 13, G - 8, 26, 1, '#c99a6e');
  [-10, 10].forEach((d) => { px.rect(x + d, G - 17, 1, 17, '#3a3440'); px.rect(x + d - 1, G - 1, 3, 1, '#3a3440'); });
}
export function lampPost(px, x, G, night, t = 0) {
  if (night) { px.alpha(0.12, () => px.disc(x, G - 40, 16, '#ffd37a')); px.alpha(0.08, () => { for (let j = 0; j < 38; j++) px.rect(x - 3 - j * 0.4, G - 38 + j, 6 + j * 0.8, 1, '#ffd37a'); }); }
  px.rect(x - 2, G - 3, 5, 3, '#3a3440'); px.rect(x, G - 38, 1, 35, '#3a3440');
  px.rect(x - 3, G - 42, 7, 4, night ? '#ffe9a8' : '#f4ecd0'); px.rect(x - 4, G - 43, 9, 1, '#3a3440'); px.rect(x - 2, G - 44, 5, 1, '#3a3440');
  if (night) [0, 1].forEach((i) => px.px(x + Math.round(wave(t + i * 300, 700, 5)), G - 44 + Math.round(wave(t + i * 500, 900, 3)), '#fff4b0'));
}
