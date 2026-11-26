// C22 엔딩 크레딧 픽셀 장면들 (256 × 144) - 원작 MO.* 처럼 장면마다 손으로 찍은 배경 + 살아 움직이는 사람
// draw(px, t, v): px = Px(캔버스), t = 장면 시작부터 ms, v = 장면 정보 (filmPlan sceneAt: 나 · 가족 · 나라 · 나이 …)
import { W, H, Spr, cached, mix, dk, lt, rng, seg, ease, lerp, wave } from './pxCore';
import { figure, lookOf } from './pxFigure';
import { actor, room, frame, clock, plant, rug, shelf, lamp, bed, lieIn, skyline, hills, ground, cloudsRow, bricks, bwin, roof, door, treeAt, bush, bench, lampPost } from './pxArt';
import { COUNTRIES, THEMES } from '../../village/villageData';

// ───────── 공용 부품 ─────────
const HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
export function icon(px, rows, x, y, c, k = 1) {
  rows.forEach((r, j) => [...r].forEach((ch, i) => { if (ch === '#') px.rect(x + i * k, y + j * k, k, k, c); }));
}
// 말풍선 (하트 · ! · 음표 …)
const ICONS = {
  heart: [HEART, '#f0587a'],
  bang: [['.#.', '.#.', '.#.', '...', '.#.'], '#3a2a3a'],
  note: [['..##', '..#.', '..#.', '###.', '##..'], '#4a7ac0'],
  dots: [['.......', '#.#.#..'], '#3a2a3a'],
  sweat: [['.#', '##', '##'], '#6ab4e8'],
  star: [['..#..', '.###.', '#####', '.#.#.'], '#e8b030'],
};
export function bubble(px, kind, x, y, s = 1) {
  if (!kind || s <= 0.05) return;
  const [rows, c] = ICONS[kind];
  const w = rows[0].length + 4;
  const h = rows.length + 4;
  const sc = Math.max(0.4, Math.min(1, s));
  if (sc < 0.7) { px.rect(x - 2, y - 4, 4, 3, '#fffdf6'); return; }
  const bx = Math.round(x - w / 2);
  const by = Math.round(y - h - 3);
  px.rect(bx + 1, by - 1, w - 2, 1, '#3a2a3a'); px.rect(bx + 1, by + h, w - 2, 1, '#3a2a3a');
  px.rect(bx - 1, by + 1, 1, h - 2, '#3a2a3a'); px.rect(bx + w, by + 1, 1, h - 2, '#3a2a3a');
  px.px(bx, by, '#3a2a3a'); px.px(bx + w - 1, by, '#3a2a3a'); px.px(bx, by + h - 1, '#3a2a3a'); px.px(bx + w - 1, by + h - 1, '#3a2a3a');
  px.rect(bx, by + 1, w, h - 2, '#fffdf6'); px.rect(bx + 1, by, w - 2, h, '#fffdf6');
  px.rect(bx + 1, by + h - 2, w - 2, 1, '#ece2d4');
  px.px(x, by + h, '#fffdf6'); px.px(x - 1, by + h, '#fffdf6'); px.px(x, by + h + 1, '#3a2a3a'); px.px(x - 2, by + h, '#3a2a3a'); px.px(x + 1, by + h, '#3a2a3a');
  icon(px, rows, bx + 2, by + 2, c);
}

// 사람 그리기 (발 가운데 x, y) + 발밑 그림자
export function draw(px, p, x, y, flip = false, shadow = true) {
  if (shadow) px.alpha(0.28, () => { px.rect(Math.round(x) - 4, Math.round(y), 9, 1, '#1c1426'); px.rect(Math.round(x) - 2, Math.round(y) + 1, 5, 1, '#1c1426'); });
  px.blit(p.spr, Math.round(x) - (flip ? p.spr.w - 1 - p.fx : p.fx), Math.round(y) - p.fy, flip);
}
// 눈물 (눈 아래로 똑똑)
export function tears(px, p, x, y, t, flip = false) {
  p.eyes.forEach(([ex, ey], i) => {
    const sx = Math.round(x) + (flip ? p.spr.w - 1 - ex - (p.spr.w - 1 - p.fx) + p.fx - p.fx : ex - p.fx);
    const sy = Math.round(y) - p.fy + ey;
    px.px(sx, sy + 1, '#8fd0f6');
    const q = ((t + i * 270) % 900) / 900;
    px.px(sx + (i ? 0 : 0), sy + 2 + Math.floor(q * 6), q < 0.85 ? '#5fb4ee' : '#a8dcf8');
  });
}

// 하늘 (띠 + 디더) · 해 · 구름 · 새
export function skyBands(px, cols, y1 = 100) { px.bands(0, y1, cols); }
export function sun(px, x, y, r, col, halo) {
  [[r + 14, 0.12], [r + 9, 0.18], [r + 5, 0.28]].forEach(([rr, a]) => px.alpha(a, () => px.disc(x, y, rr, halo)));
  px.disc(x, y, r, col);
  px.disc(x - 2, y - 2, r - 3, lt(col, 0.45));
  px.alpha(0.5, () => { px.hl(x - r - 18, x + r + 18, y + 1, halo); px.hl(x - r - 10, x + r + 10, y + 4, halo); });
}
export function cloud(px, x, y, w, base, light, shade) {
  const h = Math.round(w * 0.3);
  px.rect(x + 2, y + h - 2, w - 4, 3, shade);
  px.disc(x + w * 0.3, y + h * 0.5, Math.round(h * 0.55), base);
  px.disc(x + w * 0.55, y + h * 0.2, Math.round(h * 0.8), base);
  px.disc(x + w * 0.78, y + h * 0.55, Math.round(h * 0.5), base);
  px.rect(x + 3, y + h * 0.5, w - 6, Math.round(h * 0.5), base);
  px.hl(x + w * 0.42, x + w * 0.66, Math.round(y + h * 0.2 - h * 0.8), light);
  px.hl(x + w * 0.22, x + w * 0.36, Math.round(y + h * 0.5 - h * 0.55), light);
  px.dither(x + 3, y + h - 1, w - 6, 2, null, shade, 0.5);
}
export function birds(px, t, n, col, y0 = 30) {
  for (let i = 0; i < n; i++) {
    const x = ((t * 0.018 + i * 37) % 300) - 20;
    const y = y0 + i * 6 + Math.round(wave(t, 2400, 2, i));
    const f = Math.floor(t / 160 + i) % 2;
    px.px(x, y, col); px.px(x - 1, y - f, col); px.px(x + 1, y - f, col); px.px(x - 2, y - 1 + f, col); px.px(x + 2, y - 1 + f, col);
  }
}
// 둥근 나무 (빛 쪽 · 그늘 쪽 3단) / 뾰족 나무
export function tree(px, x, y, s, pal, kind = 'round', light = 'left') {
  const key = ['tr', s, kind, light, ...pal].join();
  const spr = cached(key, () => {
    const w = 10 + s * 4;
    const h = 14 + s * 6;
    const sp = new Spr(w + 4, h + 4);
    const cx = (w + 4) / 2;
    sp.rect(cx - 1, h - 6, 2, 8, pal[3]);
    if (kind === 'pine') {
      for (let j = 0; j < h - 4; j++) { const ww = Math.max(1, Math.floor((j / (h - 4)) * (w / 2))); sp.rect(cx - ww, j + 1, ww * 2, 1, pal[1]); if (j % 3 === 2) sp.rect(cx - ww, j + 1, ww * 2, 1, pal[0]); }
    } else {
      const r = w / 2 - 1;
      sp.disc(cx, h / 2 - 1, r, r * 0.95, pal[1]);
      sp.disc(cx - r * 0.55, h / 2 + 1, r * 0.6, r * 0.55, pal[1]);
      sp.disc(cx + r * 0.55, h / 2 + 1, r * 0.6, r * 0.55, pal[1]);
      const R = rng(key);
      for (let i = 0; i < w * 2; i++) { const a = R() * 6.28; const d = R() * r; sp.px(cx + Math.cos(a) * d, h / 2 - 1 + Math.sin(a) * d * 0.9, R() < 0.5 ? pal[0] : pal[1]); }
      for (let i = 0; i < w; i++) { const a = R() * 3.14 + (light === 'left' ? 3.3 : 4.8); const d = r * (0.5 + R() * 0.45); sp.px(cx + Math.cos(a) * d, h / 2 - 1 + Math.sin(a) * d, pal[2]); }
    }
    sp.outline();
    return sp;
  });
  px.blit(spr, Math.round(x - spr.w / 2), Math.round(y - spr.h + 2));
}
// 풀밭 (풀포기 · 들꽃 · 자갈을 촘촘히)
export function grass(px, y0, y1, base, dark, light, seed = 'g', flowers = ['#f6f0e4', '#f2c84a', '#f29ab0']) {
  px.rect(0, y0, W, y1 - y0, base);
  const R = rng(seed);
  for (let i = 0; i < (y1 - y0) * 18; i++) {
    const x = Math.floor(R() * W);
    const y = y0 + Math.floor(R() * (y1 - y0));
    const r = R();
    if (r < 0.45) { px.px(x, y, dark); if (R() < 0.5) px.px(x, y - 1, dark); }
    else if (r < 0.8) px.px(x, y, light);
    else if (r < 0.86) { px.px(x, y, flowers[Math.floor(R() * flowers.length)]); }
  }
  px.hl(0, W, y0, dark);
}
// 꽃 송이 (2×2 + 가운데 · 잎)
export function bloom(px, x, y, c) {
  px.rect(x, y, 2, 2, c); px.px(x + 1, y, lt(c, 0.4)); px.px(x, y + 1, dk(c, 0.2));
}
// 걸려 있는 전구 줄 (반짝)
export function lights(px, x1, y1, x2, y2, sag, t, n = 10) {
  for (let i = 0; i <= 40; i++) {
    const q = i / 40;
    px.px(lerp(x1, x2, q), lerp(y1, y2, q) + Math.sin(q * Math.PI) * sag, '#5a4a4a');
  }
  for (let i = 1; i < n; i++) {
    const q = i / n;
    const x = Math.round(lerp(x1, x2, q));
    const y = Math.round(lerp(y1, y2, q) + Math.sin(q * Math.PI) * sag) + 1;
    const on = (Math.sin(t / 300 + i * 1.7) + 1) / 2;
    px.px(x, y, on > 0.3 ? '#fff2a8' : '#e8c060');
    if (on > 0.6) { px.px(x - 1, y, '#ffd87a'); px.px(x + 1, y, '#ffd87a'); px.px(x, y + 1, '#ffd87a'); }
  }
}
// 꽃잎 · 꽃가루가 흩날림
export function petals(px, t, n, cols, seed = 'p', start = 0) {
  if (t < start) return;
  const R = rng(seed);
  for (let i = 0; i < n; i++) {
    const x0 = R() * W;
    const sp = 0.012 + R() * 0.014;
    const y = ((t - start) * sp + R() * 160) % 170 - 14;
    const x = x0 + wave(t, 1600 + i * 37, 4, i);
    const c = cols[i % cols.length];
    const f = Math.floor((t + i * 90) / 220) % 3;
    if (f === 0) px.rect(x, y, 2, 1, c); else if (f === 1) px.px(x, y, c); else px.rect(x, y, 1, 2, c);
  }
}

// 하트가 톡 (픽셀 하트가 커지며 떠오름)
export function heartPop(px, x, y, t, a) {
  const q = seg(t, a, a + 500);
  if (q <= 0) return;
  const k = q < 0.6 ? 1 : 2;
  icon(px, HEART, Math.round(x - 3.5 * k), Math.round(y - 6 * k - q * 3), '#f0587a', k);
  if (k === 2) { px.px(Math.round(x - 4), Math.round(y - 11 - q * 3), '#ffd0dc'); px.px(Math.round(x - 3), Math.round(y - 11 - q * 3), '#ffd0dc'); }
}
export function floatHeart(px, x, y, t, a, c = '#f0587a') {
  const q = seg(t, a, a + 1800);
  if (q <= 0 || q >= 1) return;
  const rows = ['#.#', '###', '.#.'];
  icon(px, rows, Math.round(x + wave(t, 700, 2)), Math.round(y - q * 26), q > 0.75 && Math.floor(t / 80) % 2 ? lt(c, 0.5) : c);
}

// 사람 고르기 (장면 정보 v → 나 · 가족)
export function castOf(v) {
  const f = v.family || [];
  const me = { id: 'me', me: true, gender: v.gender || 'F', age: v.age ?? 30, costume: v.costume };
  const pick = (id) => f.find((m) => m.id === id);
  const fam = (m) => ({ ...m, soft: true });
  return {
    me,
    mom: pick('mom') && fam(pick('mom'), 1),
    dad: pick('dad') && fam(pick('dad'), 2),
    pt: pick('spouse') && fam(pick('spouse'), 3),
    kids: f.filter((m) => m.id.startsWith('kid') && (m.age ?? 5) >= 2).map((m, i) => fam(m, 10 + i)),
    baby: f.filter((m) => m.id.startsWith('kid') && (m.age ?? 5) < 2).map((m) => fam(m)),
    sib: f.filter((m) => m.id.startsWith('sib')).map((m, i) => fam(m, 20 + i)),
    par: f.filter((m) => m.id === 'mom' || m.id === 'dad').map((m, i) => fam(m, 1 + i)),
  };
}
// 하객 · 이웃 (마을 사람 그림에 머리 모양 · 옷 색만 바꿔 서로 다르게)
const EX_TOP = ['#8fb0ec', '#e9a0b4', '#9fd0b8', '#f2c27a', '#c4a8ec', '#f29a8a', '#a8d0e8', '#e8c0a0'];
const EX_HAIR_F = ['long', 'bun', 'ponytail', 'twinbun', 'long'];
const EX_HAIR_M = ['short', 'spiky', 'short', 'afro', 'short'];
const EX_HC = ['#3a2c26', '#5a3a2a', '#2a2230', '#7a4a2a', '#3a2c26'];
export const extra = (i, over = {}) => {
  const p = { gender: i % 2 ? 'M' : 'F', age: [34, 41, 27, 58, 9, 66, 30, 47, 6, 72][i % 10], ...over };
  const l = lookOf({ gender: p.gender, age: p.age, soft: true });
  const hair = l.hair && { style: (p.gender === 'F' ? EX_HAIR_F : EX_HAIR_M)[i % 5], color: l.group === 'elder' ? l.hair.color : EX_HC[(i * 3) % 5] };
  return { ...p, look: { ...l, hair, top: { style: 'tee', color: EX_TOP[i % EX_TOP.length] } } };
};
// 사람 → 그림 (가족은 마을처럼 옷 색을 조금 연하게, 나는 착장 그대로)
export const fig = (p, o = {}) => figure({ look: p.look, gender: p.gender, age: p.age, costume: p.costume, soft: p.soft, ...o });
// 장면 색 = 마을 권역 색 (THEMES light)
export function paletteOf(v) {
  const info = COUNTRIES[v.countryCode] || ['', 'EAST'];
  return (THEMES[info[1]] || THEMES.EAST).light;
}
export const skyCols = (c) => { const [a, b, d] = (c.sky.match(/#[0-9a-f]{6}/gi) || ['#ffb59a', '#ffd7c2', '#ffeadf']); return [mix(a, '#a8789a', 0.18), a, mix(a, b, 0.5), b, mix(b, d, 0.5), d]; };

// ───────── 장면: 결혼식 ─────────
// 노을 정원 (마을 권역 색). 하얀 나무 아치(덩굴 · 꽃 · 쉬폰) 아래 신랑 신부가 서로 바라봄 → 다가가 뽀뽀 → 하트 · 꽃잎 · 하객 박수 · 아이들 폴짝
export function wedding(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const pt = k.pt || { gender: k.me.gender === 'F' ? 'M' : 'F', age: (k.me.age || 30) + 1, soft: true };
  const bride = k.me.gender === 'F' ? k.me : pt;
  const groom = k.me.gender === 'F' ? pt : k.me;
  const G = 110;

  // 하늘 · 해 · 구름 · 새
  skyBands(px, skyCols(c), 96);
  sun(px, 202, 70 + Math.round(t * 0.001), 11, '#fff6e0', '#fff0d0');
  const cl = [lt(c.far, 0.55), '#fff8f0', mix(c.far, '#ffffff', 0.25)];
  cloud(px, ((t * 0.004) % 300) - 40, 14, 44, cl[0], cl[1], cl[2]);
  cloud(px, ((t * 0.003 + 150) % 300) - 40, 30, 32, cl[0], cl[1], cl[2]);
  cloud(px, ((t * 0.0025 + 230) % 300) - 40, 6, 26, cl[0], cl[1], cl[2]);
  birds(px, t, 3, dk(c.far, 0.35), 34);
  // 먼 산 · 언덕 (마을 먼 산 · 가까운 언덕 색)
  const sky = skyCols(c)[5];
  const far = [[0, 80], [22, 66], [40, 74], [66, 56], [92, 72], [118, 62], [150, 76], [176, 60], [204, 70], [230, 58], [256, 72]];
  px.ridge(far, mix(c.far, sky, 0.35), 100);
  far.forEach(([x, y], i) => { if (i && far[i - 1][1] > y) px.line(far[i - 1][0], far[i - 1][1], x, y, lt(c.far, 0.45)); });
  px.ridge([[0, 90], [40, 82], [90, 88], [140, 80], [190, 88], [256, 82]], c.far, 100);
  px.ridge([[0, 98], [60, 92], [128, 96], [200, 90], [256, 96]], c.near, 112);
  const tp = [dk(c.leaf, 0.2), c.leaf, lt(c.leaf, 0.3), c.trunk];
  [8, 26, 46, 214, 232, 250].forEach((x, i) => tree(px, x, 99 + (i % 2) * 2, 1 + (i % 2), tp, 'round', 'right'));
  // 정원 (마을 땅색에 풀빛을 살짝)
  const gr = mix(c.ground, c.leaf, 0.22);
  grass(px, G - 4, H, gr, dk(gr, 0.14), lt(gr, 0.2), 'wed', ['#ffffff', '#f2c84a', '#f29ab0', lt(c.leaf, 0.3)]);
  // 뒤 줄: 하얀 의자에 앉은 하객 (아치 쪽을 바라봄)
  const seat = [extra(0), extra(1), extra(3), extra(2), extra(5), extra(7)];
  [[30, 1], [50, 1], [70, 1], [186, -1], [206, -1], [226, -1]].forEach(([x, gz], i) => {
    // 의자 등받이 (사람 뒤)
    px.rect(x - 7, G - 20, 2, 18, '#f4efe6'); px.rect(x + 5, G - 20, 2, 18, '#f4efe6'); px.rect(x - 7, G - 20, 14, 2, '#f4efe6');
    px.px(x - 7, G - 20, '#ffffff'); px.rect(x - 2, G - 22, 4, 2, '#f29ab0'); px.px(x - 3, G - 21, '#e07a94'); px.px(x + 2, G - 21, '#e07a94');
    actor(px, t, 10 + i, seat[i], x, G - 3, { pose: 'sit', gaze: t > 1500 && i % 2 ? 0 : gz, noShadow: true, bob: t > 1700 ? -Math.max(0, Math.round(wave(t + i * 150, 600, 1))) : 0 });
    px.rect(x - 7, G - 5, 14, 2, '#f4efe6'); px.hl(x - 7, x + 6, G - 4, '#d8cfc2');
    [-7, 6].forEach((d) => px.rect(x + d, G - 3, 1, 3, '#d8cfc2'));
  });
  // 전구 줄
  lights(px, 0, 22, 256, 18, 12, t, 18);
  // 아치
  const ax = 128;
  const top = 46;
  const R = 26;
  for (let y = top; y < G; y++) { px.rect(ax - R - 2, y, 3, 1, '#f4efe6'); px.px(ax - R, y, '#d8cfc2'); px.rect(ax + R, y, 3, 1, '#f4efe6'); px.px(ax + R + 2, y, '#d8cfc2'); }
  for (let a = 180; a <= 360; a += 1) { const r = (a * Math.PI) / 180; for (let d = 0; d < 3; d++) px.px(ax + Math.round(Math.cos(r) * (R + d - 1)), top + Math.round(Math.sin(r) * (R + d - 1)), d === 2 ? '#d8cfc2' : '#f4efe6'); }
  px.rect(ax - R - 4, G - 1, 7, 2, '#d8cfc2'); px.rect(ax + R - 2, G - 1, 7, 2, '#d8cfc2');
  const sway = Math.round(wave(t, 2600, 1.4));
  px.alpha(0.55, () => {
    for (let j = 0; j < 50; j++) {
      const yy = top - 4 + j;
      const sx = Math.round(Math.sin(j / 9) * 2) + (j > 20 ? sway : 0);
      const w = 3 + Math.round(Math.min(3, j / 10));
      px.rect(ax - R - 3 - w + sx, yy, w, 1, '#fbf7f2'); px.rect(ax + R + 3 - sx, yy, w, 1, '#fbf7f2');
    }
    for (let i = -R; i <= R; i++) { const y = top - Math.round(Math.sqrt(Math.max(0, R * R - i * i))) + 4 + Math.round((1 - Math.abs(i) / R) * 3); px.rect(ax + i, y, 1, 3, '#fbf7f2'); }
  });
  const Rv = rng('vine');
  const pts = [];
  for (let y = G - 6; y > top; y -= 2) { pts.push([ax - R - 1, y]); pts.push([ax + R + 1, y]); }
  for (let a = 182; a < 360; a += 4) { const r = (a * Math.PI) / 180; pts.push([ax + Math.cos(r) * R, top + Math.sin(r) * R]); }
  const flw = ['#f29ab0', '#fbf3ea', '#f8c08a', '#e86a8a'];
  pts.forEach(([x, y], i) => {
    const lx = Math.round(x + (Rv() - 0.5) * 4);
    const ly = Math.round(y + (Rv() - 0.5) * 3);
    px.px(lx, ly, Rv() < 0.5 ? '#4e7a44' : '#6e9a58'); px.px(lx + 1, ly, '#86b268');
    if (i % 3 === 0) bloom(px, lx - 1 + Math.round(Rv() * 2), ly - 1, flw[i % 4]);
  });
  [[-7, -R - 1], [0, -R - 3], [7, -R - 1], [-3, -R - 4], [3, -R - 4]].forEach(([dx, dy], i) => { px.disc(ax + dx, top + dy + 2, 2, flw[(i + 1) % 4]); px.px(ax + dx - 1, top + dy + 1, '#ffffff'); });
  // 하얀 길 (꽃잎)
  for (let y = G; y < H; y++) { const w = lerp(20, 50, (y - G) / (H - G)); px.rect(ax - w / 2, y, w, 1, '#f8f2ec'); px.px(ax - w / 2, y, '#e8d6d2'); px.px(ax + w / 2 - 1, y, '#e8d6d2'); }
  const Rp = rng('aisle');
  for (let i = 0; i < 30; i++) px.px(ax + (Rp() - 0.5) * lerp(16, 44, Rp()), G + 2 + Rp() * (H - G - 3), flw[i % 4]);

  // 신랑 신부: 서로 바라봄 → 0.9초부터 다가감 → 1.5초 뽀뽀 (눈 감고 살짝 까치발) → 하트
  const near = ease(seg(t, 900, 1500));
  const kissing = t > 1500 && t < 3800;
  const gx = Math.round(ax - lerp(12, 8, near));
  const bx = Math.round(ax + lerp(12, 8, near));
  const up = kissing ? -1 : 0;
  // 가족(배우자)은 마을과 같은 머리 (familyLook → p.look), 옷만 예복으로
  const gLook = { ...(groom.look || lookOf({ gender: 'M', age: groom.age, costume: groom.costume, soft: groom.soft })), top: { style: 'suit', color: '#2f3b5c' } };
  const bLook = { ...(bride.look || lookOf({ gender: 'F', age: bride.age, costume: bride.costume, soft: bride.soft })), top: { style: 'dress', color: '#fbf7f2' } };
  const gF = figure({ look: gLook, gaze: 1, face: kissing ? 'closed' : 'open', pose: t > 900 && !kissing ? 'clap1' : 'stand' });
  const bF = figure({ look: bLook, gaze: -1, face: kissing ? 'closed' : 'open', pose: 'hold' });
  // 면사포 (신부 뒤 · 살랑)
  px.alpha(0.7, () => { for (let j = 0; j < 30; j++) { const w = 18 + Math.floor(j / 2.5); px.rect(bx - w / 2 + (j > 12 ? sway : 0), G - 34 + j, w, 1, '#ffffff'); if (j % 5 === 4) px.rect(bx - w / 2 + 2 + (j > 12 ? sway : 0), G - 34 + j, w - 4, 1, '#f4eef6'); } });
  draw(px, gF, gx, G + up);
  draw(px, bF, bx, G + up);
  // 웨딩드레스 긴 치마 (허리부터 바닥까지 퍼짐 · 주름 · 레이스 단)
  for (let j = 0; j < 9; j++) {
    const w = 10 + j;
    const yy = G - 9 + j + up;
    px.rect(bx - w / 2, yy, w, 1, '#fbf7f2');
    px.px(bx - w / 2 - 1, yy, '#2e2a33'); px.px(bx + w / 2, yy, '#2e2a33');
    if (j % 3 === 2) { px.px(bx - 2, yy, '#e6dcd2'); px.px(bx + 2, yy, '#e6dcd2'); }
  }
  px.hl(bx - 9, bx + 9, G + up, '#2e2a33'); px.hl(bx - 8, bx + 8, G - 1 + up, '#f0e2e8');
  // 화관 · 부케 · 신랑 꽃
  for (let i = -5; i <= 5; i += 2) bloom(px, bx + i - 1, G - 31 + up + (Math.abs(i) > 3 ? 1 : 0), i % 4 ? '#fbf3ea' : '#f29ab0');
  bloom(px, bx - 2, G - 13 + up, '#f29ab0'); bloom(px, bx, G - 14 + up, '#fbf3ea'); bloom(px, bx + 2, G - 13 + up, '#e86a8a'); px.px(bx, G - 11 + up, '#4e7a44');
  px.px(gx - 3, G - 12 + up, '#fbf3ea'); px.px(gx - 3, G - 11 + up, '#f29ab0');
  if (t > 1500) heartPop(px, ax, G - 32, t, 1550);
  if (t > 1900) [0, 1, 2, 3].forEach((i) => floatHeart(px, ax - 7 + i * 5, G - 38, t, 2000 + i * 420));

  // 비둘기 (뽀뽀하면 아치 뒤에서 날아오름)
  if (t > 1600) for (let d = 0; d < 4; d++) {
    const q = seg(t, 1600 + d * 120, 4200 + d * 120);
    const x = ax - 6 + d * 4 + q * (d % 2 ? 90 : -90);
    const y = top - 4 - q * 60 + wave(t, 300, 1, d);
    const f = Math.floor(t / 120 + d) % 2;
    px.rect(x - 1, y, 3, 2, '#ffffff'); px.px(x + 2, y, '#e6e0e8'); px.px(x - 2, y - f, '#ffffff'); px.px(x + 3, y - f, '#ffffff'); px.px(x - 3, y - 1 + f, '#f0ecf4'); px.px(x + 4, y - 1 + f, '#f0ecf4'); px.px(x + (d % 2 ? 2 : -1), y + 1, '#f2b05a');
  }
  // 사진사 (삼각대 카메라 옆에 서서 찰칵 · 뽀뽀 때 플래시)
  //   11/25 동현님: 카메라가 얼굴에 붙어 보임 → 얼굴 앞에 들지 않고 몸 앞 삼각대 위에
  const phx = 166;
  const cx = phx - 13; // 삼각대 가운데
  const cy = G - 9;    // 카메라 몸통 위 (사진사 가슴 높이)
  actor(px, t, 31, extra(5, { gender: 'M', age: 33 }), phx, G + 4, { gaze: -1, pose: 'stand' });
  // 삼각대 다리 3개
  for (let j = 0; j <= 12; j++) { const q = j / 12; px.px(Math.round(cx - q * 4), cy + 5 + j, '#5a5460'); px.px(Math.round(cx + q * 4), cy + 5 + j, '#5a5460'); px.px(cx, cy + 5 + Math.round(j * 0.9), '#4a4450'); }
  // 카메라 몸통 · 렌즈(커플 쪽) · 뷰파인더
  px.rect(cx - 4, cy, 8, 5, '#3a3440'); px.rect(cx - 3, cy + 1, 6, 1, '#4a4452');
  px.rect(cx - 7, cy + 1, 3, 3, '#5a5460'); px.px(cx - 7, cy + 2, '#9ab0d0');
  px.rect(cx - 1, cy - 1, 3, 1, '#3a3440');
  if ((t > 1550 && t < 1700) || (t > 2300 && t < 2400)) px.alpha(0.85, () => { px.disc(cx - 8, cy + 2, 3, '#ffffff'); px.rect(cx - 16, cy + 2, 16, 1, '#fff8e0'); px.rect(cx - 8, cy - 6, 1, 16, '#fff8e0'); });
  if (t > 1550 && t < 1660) px.alpha(0.18, () => px.rect(0, 0, W, H, '#ffffff'));

  // 앞 하객 (서서 박수 · 환호 · 아이는 폴짝 · 부모님은 눈물)
  const clap = t > 1600;
  const front = [
    [k.mom || extra(2, { age: 55, gender: 'F' }), 18], [k.dad || extra(3, { age: 58, gender: 'M' }), 38], [k.sib[0] || extra(4), 58], [extra(8, { age: 7 }), 76],
    [extra(6), 182], [extra(1), 200], [k.kids[0] || extra(4, { age: 6 }), 218], [extra(7), 238],
  ];
  front.forEach(([p, x], i) => {
    const f = Math.floor((t + i * 70) / 190) % 2;
    const kid = (p.age ?? 30) < 13;
    const pz = !clap ? 'stand' : i === 3 || i === 7 ? (f ? 'up' : 'wave1') : f ? 'clap1' : 'stand';
    const jump = clap && kid ? -Math.abs(Math.round(wave(t + i * 100, 520, 3))) : 0;
    const crying = clap && i < 2;
    actor(px, t, 20 + i, p, x, 138, { pose: pz, face: crying ? 'closed' : undefined, gaze: x < ax ? 1 : -1, bob: jump, cry: crying });
  });
  if (t > 2100) bubble(px, 'note', 200 + 5, 138 - 30, 1);
  if (t > 2500) bubble(px, 'heart', 38 + 5, 138 - 31, 1);
  petals(px, t, 46, ['#f29ab0', '#fbf3ea', '#f8c08a', '#e86a8a', '#ffd0dc'], 'wp', 1600);
  petals(px, t, 10, ['#fbe4ea'], 'wp2', 0);
}


// ───────── 장면 공용 ─────────
export const dressed = (p, top, extraLook = {}) => {
  const l = p.look || lookOf({ gender: p.gender, age: p.age, costume: p.costume, soft: p.soft });
  return { ...p, look: { ...l, top: { ...l.top, ...top }, ...extraLook } };
};
export const mourn = (p) => dressed(p, { style: 'tee', color: '#4c4858' });
export const other = (me) => ({ gender: me.gender === 'F' ? 'M' : 'F', age: Math.max(18, (me.age || 30) + 1), soft: true });
export const bub = (px, kind, r, s = 1) => r && bubble(px, kind, r.x + 3, r.headY, s);
export const sparkle = (px, x, y, t, col = '#fff4b0') => { const f = Math.floor(t / 120) % 4; if (f < 3) { px.px(x, y, col); if (f === 1) { px.px(x - 1, y, col); px.px(x + 1, y, col); px.px(x, y - 1, col); px.px(x, y + 1, col); } } };
export function smoke(px, x, y, t, n = 4, col = '#ffffff', a = 0.5) {
  for (let i = 0; i < n; i++) { const q = ((t * 0.0006 + i / n) % 1); px.alpha(a * (1 - q), () => px.disc(x + Math.round(wave(t + i * 400, 1800, 3)), y - q * 30, 2 + Math.round(q * 4), col)); }
}
export function bundleAt(px, x, y, col = '#f6a5bd', t = 0) {
  const b = y + Math.round(wave(t, 1400, 0.6));
  px.rect(x - 5, b - 2, 10, 5, '#fbf7f2'); px.rect(x - 4, b - 3, 8, 1, '#fbf7f2'); px.rect(x - 4, b + 3, 8, 1, '#fbf7f2');
  px.rect(x, b - 2, 4, 5, col); px.px(x + 1, b, lt(col, 0.4));
  px.rect(x - 5, b - 2, 4, 4, '#f2c9a0'); px.px(x - 4, b - 1, '#2e2a33'); px.px(x - 2, b - 1, '#2e2a33'); px.px(x - 5, b, '#f29a9a');
  px.hl(x - 6, x + 5, b - 4, '#2e2a33'); px.hl(x - 6, x + 5, b + 4, '#2e2a33'); px.vl(x - 7, b - 3, b + 3, '#2e2a33'); px.vl(x + 6, b - 3, b + 3, '#2e2a33');
}
export const roomSky = (c) => (c.sky.match(/#[0-9a-f]{6}/gi) || ['#ffb59a', '#ffeadf']).filter((_, i) => i !== 1);

// ───────── 태어남 (제목 장면) ─────────
// 엄마가 침대에서 진통(땀 · 몸 떨림) → 1.5초 의사(산파)가 아기를 받아 반짝 · 울음 → 2.1초 엄마 품에 → 아빠가 문을 열고 뛰어 들어와 만세 → 하트
export function born(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const hosp = !!v.urban;
  const G = 112;
  const mom = k.mom || { gender: 'F', age: 27, soft: true };
  room(px, { wall: hosp ? '#e8f0ee' : '#f6ebde', floor: hosp ? '#cfdad7' : '#d6bf9e', paper: hosp ? 'stripe' : 'flower', win: [[20, 22]], sky: roomSky(c), curtain: hosp ? '#bcd8d4' : '#e8a8a0', t, G });
  clock(px, 112, 22, t);
  if (hosp) {
    // 병실 커튼 · 링거대 · 모니터 · 의료 가스 판
    px.rect(198, 8, 40, 1, '#9aa6b2'); for (let x = 200; x < 236; x += 4) { px.rect(x, 9, 3, G - 22, '#bcd8d4'); px.vl(x + 1, 10, G - 14, '#a6c4c0'); }
    px.rect(76, 52, 30, 6, '#dfe8ee'); [0, 1, 2].forEach((i) => px.px(80 + i * 8, 55, ['#5aa06a', '#f2f2f2', '#e8c040'][i]));
    px.rect(150, 40, 22, 16, '#3a4450'); px.rect(151, 41, 20, 13, '#16202a');
    const bt = (t % 900) / 900; px.line(152, 48, 152 + bt * 6, 48, '#6ee0a0'); px.line(158, 48, 160, 43, '#6ee0a0'); px.line(160, 43, 162, 52, '#6ee0a0'); px.line(162, 52, 169, 48, '#6ee0a0');
    px.vl(160, 56, G, '#9aa6b2');
    px.vl(64, 40, G, '#9aa6b2'); px.hl(60, 68, 40, '#9aa6b2'); px.rect(61, 41, 6, 9, '#e6f4fb'); px.rect(62, 44, 4, 5, '#cfe9f6'); px.px(64, 52 + Math.floor((t / 120) % 4), '#5fb4ee');
  } else {
    frame(px, 120, 34, 12, 10, 0); frame(px, 136, 36, 10, 9, 1); shelf(px, 214, 46, t); plant(px, 70, G + 2, t);
  }
  door(px, 244, G, 18, 34, hosp ? '#c7d3d8' : '#8a6a4f', seg(t, 2000, 2300) > 0 ? 0.9 : 0);
  // 침대 + 엄마
  const bornT = t > 1500;
  bed(px, 112, G, 58, hosp);
  lieIn(px, t, mom, 112, G + (bornT ? 0 : Math.round(wave(t, 160, 0.6))), 58, { quilt: hosp ? '#cfe3f0' : '#f2b8a8', pattern: hosp ? 'plain' : 'flower', face: bornT ? 'closed' : 'closed', breath: bornT ? undefined : (Math.sin(t / 140) + 1) / 2 });
  if (!bornT && t > 300) bubble(px, 'sweat', 92, G - 22);
  if (bornT && t > 2700) bubble(px, 'heart', 92, G - 22);
  // 받아 주는 사람
  const mid = hosp ? dressed({ gender: 'F', age: 40, soft: true }, { style: 'tee', color: '#f4f8fa' }) : extra(9, { gender: 'F', age: 66 });
  const mr = actor(px, t, 3, mid, 156, G + 6, { pose: bornT && t < 2100 ? 'hold' : t < 1500 && t > 600 ? 'up' : 'stand', gaze: -1 });
  if (t > 700 && !bornT) bub(px, 'bang', mr);
  const bc = v.gender === 'M' ? '#9fc7e0' : '#f6a5bd';
  if (bornT && t < 2100) bundleAt(px, 156, G - 9, bc, t);
  if (t >= 2100) bundleAt(px, Math.round(lerp(156, 104, ease(seg(t, 2100, 2600)))), Math.round(lerp(G - 9, G - 22, ease(seg(t, 2100, 2600)))), bc, t);
  if (bornT && t < 2400) { const q = seg(t, 1500, 2300); for (let i = 0; i < 10; i++) px.px(156 + Math.cos(i * 0.63) * 18 * q, G - 12 + Math.sin(i * 0.63) * 12 * q, '#ffe08a'); }
  if (bornT && t < 3800) bubble(px, 'note', t < 2100 ? 162 : 112, t < 2100 ? G - 18 : G - 30);
  // 아빠 (문으로 뛰어 들어옴) · 형제
  const din = seg(t, 2100, 3100);
  if (k.dad && din > 0) {
    const r = actor(px, t, 4, k.dad, lerp(244, 180, ease(din)), G + 6, { walk: din < 1, pose: din >= 1 ? (Math.floor(t / 250) % 2 ? 'up' : 'wave1') : undefined, gaze: -1 });
    if (din >= 1) bub(px, t < 3500 ? 'bang' : 'heart', r);
  }
  k.sib.slice(0, 2).forEach((s2, i) => { const q = seg(t, 2700 + i * 300, 3600 + i * 300); if (q > 0) actor(px, t, 5 + i, s2, lerp(250, 200 + i * 14, ease(q)), G + 8, { walk: q < 1, gaze: -1, bob: q >= 1 ? -Math.abs(Math.round(wave(t + i * 200, 500, 2))) : 0 }); });
  if (t > 2700) [0, 1, 2].forEach((i) => floatHeart(px, 98 + i * 6, G - 28, t, 2800 + i * 600));
}

// ───────── 입학 ─────────
// 학교 앞. 가방 멘 아이가 엄마(아빠)에게 손 흔들고 → 쪼르르 걸어가 교문 지나 학교 문 안으로 쏙. 다른 아이들도 뛰어 들어감
export function school(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  const adult = (v.age ?? 7) >= 18;
  const kid = adult ? (k.kids.find((m) => m.age >= 5 && m.age <= 9) || k.kids[0] || extra(8, { age: 7 })) : k.me;
  const par = adult ? [k.me, k.pt].filter(Boolean) : k.par.slice(0, 1);
  skyBands(px, skyCols(c), 96);
  sun(px, 40, 30, 8, '#fff6e0', '#fff0d0');
  cloudsRow(px, c, t, 3);
  birds(px, t, 2, dk(c.far, 0.35), 20);
  hills(px, c, false, 92);
  skyline(px, c, false, 100, 'sch' + v.countryCode, t);
  ground(px, c, false, G - 8, 'sch');
  // 학교 건물 (벽돌 · 2층 창 · 지붕 · 시계 · 현관 계단)
  const X1 = 120;
  const X2 = 236;
  bricks(px, X1, 46, X2 - X1, G - 8 - 46, lt(c.wall, 0.05));
  px.rect(X1, 46, 3, G - 54, dk(c.wall, 0.06)); px.rect(X2 - 3, 46, 3, G - 54, dk(c.wall, 0.06)); px.rect(X1 - 2, 74, X2 - X1 + 4, 2, dk(c.wall, 0.1));
  roof(px, X1, X2, 46, 28, c.roofC);
  px.disc(178, 38, 5, '#fffaf0'); px.ring(178, 38, 5, '#5a4a3a', 8); px.line(178, 38, 178, 35, '#2e2a33'); px.line(178, 38, 178 + Math.round(Math.sin(t / 200) * 3), 38 - Math.round(Math.cos(t / 200) * 3), '#c9544a');
  [128, 146, 196, 214].forEach((x, i) => { bwin(px, x, 52, 10, 9, false, i % 2 === 0); bwin(px, x, 80, 10, 9, false, false); });
  door(px, 178, G - 10, 16, 20, '#8a6a4f', seg(t, 500, 1100), '#4a3a30');
  px.rect(166, G - 10, 24, 2, '#c8bcac'); px.rect(163, G - 8, 30, 2, '#b8ac9c');
  // 깃대 · 깃발 (펄럭)
  px.vl(244, 26, G - 8, '#5a5460'); px.px(244, 25, '#f2c230');
  for (let j = 0; j < 8; j++) { const wv = Math.round(wave(t + j * 60, 700, 1)); px.rect(245, 27 + j + wv * 0, 12 - Math.floor(j / 3), 1, j % 4 < 2 ? '#e8584c' : '#ffffff'); px.px(245 + 12 - Math.floor(j / 3), 27 + j + wv, j % 4 < 2 ? '#e8584c' : '#ffffff'); }
  // 교문 · 현수막 (꽃 장식)
  px.rect(138, G - 34, 5, 34, '#c8b8a8'); px.rect(213, G - 34, 5, 34, '#c8b8a8'); px.rect(137, G - 36, 7, 2, '#a89888'); px.rect(212, G - 36, 7, 2, '#a89888');
  px.rect(143, G - 33, 70, 7, c.roofC); px.rect(143, G - 33, 70, 1, lt(c.roofC, 0.3));
  for (let x = 147; x < 210; x += 5) px.rect(x, G - 30, 3, 1, '#ffffff');
  [140, 215].forEach((x) => [0, 1, 2].forEach((i) => bloom(px, x - 3 + i * 2, G - 39 + (i % 2), ['#f29ab0', '#ffd37a', '#ffffff'][i])));
  // 길
  for (let y = G - 8; y < H; y++) { const w = lerp(26, 70, (y - G + 8) / (H - G + 8)); px.rect(178 - w / 2, y, w, 1, mix(c.road, '#ffffff', 0.15)); }
  treeAt(px, 108, G - 6, c, 1.1, false, 'sa'); treeAt(px, 250, G - 4, c, 0.9, false, 'sb'); bush(px, 132, G - 6, c); bush(px, 224, G - 6, c);
  // 다른 아이들 (가방 메고 뛰어 들어감)
  [0, 1].forEach((i) => {
    const q = seg(t, 200 + i * 800, 2800 + i * 800);
    if (q <= 0 || q >= 1) return;
    const x = lerp(250 - i * 10, 178, ease(q));
    const y = lerp(G + 14, G - 10, ease(q));
    px.rect(x - 6, y - 14, 12, 7, ['#9b6fd0', '#4a9a7a'][i]);
    actor(px, t, 30 + i, extra(4 + i * 4, { age: 7 }), x, y, { walk: true, gaze: -1, alpha: 1 - seg(q, 0.85, 1) });
  });
  // 나 (또는 우리 아이)
  const go = seg(t, 1000, 4000);
  const kx = lerp(96, 178, ease(go));
  const ky = lerp(G + 16, G - 10, ease(go));
  const fade = 1 - seg(t, 3700, 4200);
  if (fade > 0) {
    const bagC = ['#e8584c', '#f2b22e', '#5b86c9', '#4a9a7a'][(v.year || 0) % 4];
    px.alpha(fade, () => { px.rect(kx - 7, ky - 15, 14, 8, dk(bagC, 0.4)); px.rect(kx - 6, ky - 14, 12, 6, bagC); px.rect(kx - 6, ky - 12, 12, 1, lt(bagC, 0.3)); });
    const r = actor(px, t, 1, kid, kx, ky, { walk: go > 0 && go < 1, pose: go <= 0 ? (Math.floor(t / 260) % 2 ? 'wave1' : 'wave2') : undefined, gaze: go > 0 ? 1 : -1, alpha: fade });
    if (go > 0.15 && go < 0.6) bub(px, 'note', r);
  }
  par.forEach((p, i) => { const r = actor(px, t, 2 + i, p, 66 - i * 20, G + 18, { pose: t > 800 ? (Math.floor((t + i * 130) / 260) % 2 ? 'wave1' : 'wave2') : 'stand', gaze: 1 }); if (i === 0 && t > 4200) bub(px, 'heart', r); });
  petals(px, t, 14, [lt(c.leaf, 0.3), '#ffffff'], 'sp', 0);
}

// ───────── 졸업 ─────────
// 학교(대학이면 기둥 건물) 앞 졸업생 줄. 2초 학사모를 하늘로 휙 → 빙글빙글 떨어짐 · 만세 → 가족 꽃다발 · 박수
export function grad(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  const uni = v.arg === 'uni';
  skyBands(px, skyCols(c), 96); sun(px, 220, 34, 9, '#fff6e0', '#fff0d0'); cloudsRow(px, c, t, 4);
  hills(px, c, false, 92);
  ground(px, c, false, G - 6, 'gr');
  if (uni) {
    const wc = lt(c.wall, 0.08);
    px.rect(70, 50, 116, 52, dk(wc, 0.12));
    for (let yy = 30; yy <= 46; yy++) { const k2 = (yy - 30) / 16; px.hl(128 - 62 * k2, 128 + 62 * k2, yy, yy % 3 ? wc : dk(wc, 0.05)); }
    px.disc(128, 40, 3, dk(wc, 0.2)); px.rect(64, 46, 128, 4, lt(wc, 0.1)); px.hl(64, 191, 49, dk(wc, 0.15));
    for (let i = 0; i < 7; i++) { const x = 74 + i * 17; px.rect(x, 50, 7, 50, wc); px.rect(x, 50, 2, 50, '#ffffff'); px.rect(x + 5, 50, 2, 50, dk(wc, 0.15)); px.rect(x - 1, 50, 9, 2, lt(wc, 0.2)); px.rect(x - 1, 98, 9, 2, lt(wc, 0.1)); }
    [0, 1, 2].forEach((i) => px.rect(62 - i * 3, 100 + i * 2, 132 + i * 6, 2, dk(wc, 0.03 * i)));
  } else {
    bricks(px, 70, 54, 116, 48, lt(c.wall, 0.05)); roof(px, 70, 186, 54, 36, c.roofC);
    [80, 104, 144, 168].forEach((x) => bwin(px, x, 62, 10, 9, false, true)); door(px, 128, 102, 14, 18, '#8a6a4f', 0.6);
  }
  px.rect(50, 86, 156, 7, c.roofC); px.rect(50, 86, 156, 1, lt(c.roofC, 0.3)); for (let x = 56; x < 200; x += 6) px.rect(x, 89, 3, 1, '#ffffff');
  treeAt(px, 30, G - 4, c, 1.1, false, 'g1'); treeAt(px, 232, G - 4, c, 1.1, false, 'g2');
  const toss = seg(t, 1800, 3400);
  const gownC = '#24304f';
  const mates = [extra(2, { age: v.age }), extra(1, { age: v.age }), k.me, extra(6, { age: v.age }), extra(5, { age: v.age })];
  const xs = [76, 102, 128, 154, 180];
  mates.forEach((p, i) => {
    const gp = dressed(p, { style: 'suit', color: gownC });
    const pose = toss > 0 && toss < 0.45 ? 'up' : t > 3400 ? (Math.floor((t + i * 90) / 220) % 2 ? 'up' : 'wave1') : 'stand';
    const r = actor(px, t, i, gp, xs[i], G + 2, { pose, bob: t > 3400 ? -Math.abs(Math.round(wave(t + i * 120, 560, 2))) : 0 });
    if (toss <= 0 || toss >= 1) { px.rect(xs[i] - 7, r.headY - 1, 14, 2, gownC); px.rect(xs[i] - 4, r.headY - 2, 8, 1, gownC); px.rect(xs[i] + 4, r.headY + 1, 1, 4, '#f2c230'); }
    if (p === k.me && t > 3600) bub(px, 'star', r);
  });
  if (toss > 0 && toss < 1) xs.forEach((x, i) => {
    const y = G - 34 - Math.sin(Math.PI * toss) * (40 + i * 6);
    const xx = x + (i - 2) * 8 * toss;
    const f = Math.floor(toss * 12 + i) % 3;
    if (f === 0) { px.rect(xx - 5, y, 10, 2, gownC); px.px(xx + 4, y + 2, '#f2c230'); }
    else if (f === 1) { px.rect(xx - 2, y - 3, 4, 6, gownC); }
    else { px.rect(xx - 4, y - 1, 8, 3, gownC); px.px(xx - 4, y + 2, '#f2c230'); }
  });
  const fam = [...k.par, k.pt].filter(Boolean).slice(0, 3);
  fam.forEach((p, i) => {
    const x = [28, 224, 244][i];
    const r = actor(px, t, 10 + i, p, x, 138, { pose: t > 900 ? (Math.floor((t + i * 100) / 200) % 2 ? 'clap1' : 'stand') : 'stand', gaze: x < 128 ? 1 : -1, cry: i === 0 && t > 2500 });
    if (i === 0) { [0, 1, 2, 3].forEach((q) => bloom(px, x + 6 + (q % 2) * 2, 138 - 16 - Math.floor(q / 2) * 2, ['#f29ab0', '#ffd37a', '#ffffff', '#e86a8a'][q])); px.vl(x + 7, 138 - 12, 138 - 8, '#4e7a44'); }
    if (i === 0 && t > 3500) bub(px, 'heart', r);
  });
  petals(px, t, 34, ['#f29ab0', '#ffd37a', '#9fc7e0', '#ffffff'], 'gc', 3300);
}

// ───────── 만남 · 청혼 ─────────
// 노을 공원. 양쪽에서 걸어와 마주침 → 눈이 마주쳐 하트 → (청혼이면 무릎 꿇고 반지 반짝) → 나란히 서서 하트가 떠오름
export function date(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  const pt = k.pt || other(k.me);
  const prop = /청혼/.test(v.text || '');
  skyBands(px, skyCols(c), 96); sun(px, 128, 84, 12, '#fff6e0', '#fff0d0'); cloudsRow(px, c, t, 3); birds(px, t, 3, dk(c.far, 0.35), 26);
  hills(px, c, false, 96);
  ground(px, c, false, G - 6, 'dt');
  // 연못 (노을 반짝)
  for (let j = 0; j < 8; j++) { const w = 60 - Math.abs(j - 4) * 6; px.rect(180 - w / 2, G - 4 + j, w, 1, mix(c.water, skyCols(c)[3], 0.3)); }
  for (let i = 0; i < 6; i++) px.hl(160 + i * 7, 163 + i * 7, G - 2 + (i % 3) * 2, (Math.floor(t / 300) + i) % 3 ? '#ffffff' : lt(c.water, 0.4));
  treeAt(px, 30, G - 4, c, 1.3, false, 'd1'); treeAt(px, 236, G - 4, c, 1.1, false, 'd2'); bush(px, 60, G - 4, c); bush(px, 210, G - 6, c);
  lampPost(px, 84, G - 4, false, t); bench(px, 112, G - 2);
  const meet = seg(t, 400, 2200);
  const mx = Math.round(lerp(20, 118, ease(meet)));
  const px2 = Math.round(lerp(240, 140, ease(meet)));
  const kneel = prop && t > 2600;
  const a = actor(px, t, 0, k.me, mx, G + 14, { walk: meet > 0 && meet < 1, gaze: 1, face: t > 2400 && t < 3600 && !prop ? 'closed' : undefined });
  const b = actor(px, t, 1, pt, px2, G + 14 + (kneel ? 4 : 0), { walk: meet > 0 && meet < 1, gaze: -1, pose: kneel ? 'hold' : undefined });
  if (kneel) { px.rect(px2 - 8, G + 11, 3, 3, '#f2c230'); px.px(px2 - 7, G + 10, '#bfe8ff'); sparkle(px, px2 - 7, G + 8, t); if (t > 3200) bub(px, 'bang', a); }
  if (meet >= 1 && t < 3200) heartPop(px, (mx + px2) / 2, Math.min(a.headY, b.headY) - 2, t, 2200);
  if (t > 2800) [0, 1, 2, 3].forEach((i) => floatHeart(px, (mx + px2) / 2 - 6 + i * 4, a.headY - 4, t, 2900 + i * 500));
  petals(px, t, 16, [lt(c.leaf, 0.3), '#ffffff', '#f6c0d0'], 'dp', 0);
}

// ───────── 아이가 태어남 ─────────
// 아기방. 내가 아기를 안고 살살 흔들고 → 배우자가 다가와 들여다봄 → 큰아이들이 폴짝 → 하트 · 모빌이 빙글
export function newborn(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  room(px, { wall: '#f7efe4', floor: '#d9c2a2', paper: 'dot', win: [[20, 22]], sky: roomSky(c), curtain: '#f2c6d0', t, G });
  clock(px, 92, 22, t); frame(px, 70, 34, 12, 10, 1); frame(px, 100, 38, 10, 9, 2);
  // 깃발 장식
  for (let i = 0; i < 9; i++) { const x = 140 + i * 12; const y = 12 + Math.round(Math.sin(i / 8 * Math.PI) * 4); px.rect(x, y, 6, 1, ['#f6a5bd', '#9fc7e0', '#ffd37a'][i % 3]); px.rect(x + 1, y + 1, 4, 2, ['#f6a5bd', '#9fc7e0', '#ffd37a'][i % 3]); px.rect(x + 2, y + 3, 2, 1, ['#f6a5bd', '#9fc7e0', '#ffd37a'][i % 3]); }
  rug(px, 112, G + 14, 50, '#e8b4b8');
  plant(px, 244, G + 2, t);
  // 아기 침대 + 모빌
  const cx = 200;
  const sw = Math.round(wave(t, 2400, 2));
  px.vl(cx, 30, 44, '#b89a7c'); px.hl(cx - 10 + sw, cx + 10 - sw, 44, '#b89a7c');
  [-10, -3, 4, 10].forEach((d, i) => { const dx = d + (i % 2 ? sw : -sw); px.vl(cx + dx, 45, 48 + (i % 2) * 2, '#b89a7c'); if (i % 2) px.disc(cx + dx, 50 + (i % 2) * 2, 2, ['#9fc7e0', '#ffd37a'][i % 2]); else { px.px(cx + dx, 49, '#ffd37a'); px.hl(cx + dx - 1, cx + dx + 1, 50, '#ffd37a'); px.px(cx + dx, 51, '#ffd37a'); } });
  px.rect(cx - 22, G - 30, 3, 30, '#f2e6d6'); px.rect(cx + 19, G - 26, 3, 26, '#f2e6d6'); px.rect(cx - 22, G - 30, 44, 2, '#fdf8f0');
  px.rect(cx - 20, G - 12, 40, 5, '#ffffff'); px.rect(cx - 8, G - 14, 16, 3, '#f6c6d6');
  px.rect(cx + 8, G - 17, 5, 5, '#c9905e'); px.px(cx + 8, G - 18, '#c9905e'); px.px(cx + 12, G - 18, '#c9905e'); px.px(cx + 9, G - 15, '#2e2a33'); px.px(cx + 11, G - 15, '#2e2a33');
  for (let x = cx - 19; x < cx + 19; x += 4) px.rect(x, G - 28, 2, 21, '#f6ecdf');
  px.rect(cx - 22, G - 7, 44, 3, '#e6d6c0'); px.rect(cx - 21, G - 4, 2, 4, '#d6c6b0'); px.rect(cx + 19, G - 4, 2, 4, '#d6c6b0');
  // 나 + 아기
  const baby = k.baby[0] || { gender: 'F' };
  const sway = Math.round(wave(t, 1600, 1));
  const me = actor(px, t, 0, k.me, 112 + sway, G + 12, { pose: 'hold', gaze: 0, face: t > 1800 && t < 2600 ? 'closed' : undefined });
  bundleAt(px, 112 + sway, G + 4, baby.gender === 'M' ? '#9fc7e0' : '#f6a5bd', t);
  if (t > 800) bub(px, 'heart', me);
  if (k.pt) { const q = seg(t, 400, 1300); const r = actor(px, t, 1, k.pt, lerp(170, 134, ease(q)), G + 12, { walk: q > 0 && q < 1, gaze: -1 }); if (t > 2000) bub(px, 'heart', r); }
  k.kids.filter((m) => m.age > 0).slice(0, 3).forEach((m, i) => { const r = actor(px, t, 2 + i, m, [86, 68, 50][i], G + 14, { pose: t > 1400 ? (Math.floor((t + i * 100) / 240) % 2 ? 'up' : 'wave1') : 'stand', gaze: 1, bob: t > 1400 ? -Math.abs(Math.round(wave(t + i * 150, 520, 3))) : 0 }); if (i === 0 && t > 2400) bub(px, 'note', r); });
  if (t > 1400 && t < 3200) bubble(px, 'note', 106, G - 12);
  [0, 1, 2].forEach((i) => floatHeart(px, 108 + i * 6, G - 30, t, 2600 + i * 600));
}

// ───────── 병원 ─────────
// 병실. 누운 사람(아픈 사람) · 삐삐 심장 모니터 · 똑똑 수액 · 곁을 지키는 가족은 걱정(땀) · 고개 숙임. 하트 없음
export function hosp(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  const who = v.arg === 'kid' ? (k.kids[0] || extra(4, { age: 6 })) : v.arg === 'pt' ? (k.pt || other(k.me)) : v.arg === 'par' ? (k.par[0] || extra(9, { age: 70 })) : k.me;
  const isMe = who === k.me;
  const vis = (isMe ? ((v.age ?? 30) < 18 ? k.par : [k.pt, ...k.kids.slice(0, 1)]) : [k.me]).filter(Boolean).slice(0, 2);
  room(px, { wall: '#e8f0ee', floor: '#cfdad7', paper: 'stripe', win: [[16, 22]], sky: roomSky(c), curtain: '#bcd8d4', t, G });
  clock(px, 72, 20, t);
  px.rect(228, 8, 28, 1, '#9aa6b2'); for (let x = 230; x < 256; x += 4) { px.rect(x, 9, 3, G - 22, '#bcd8d4'); px.vl(x + 1, 10, G - 14, '#a6c4c0'); }
  px.rect(76, 54, 34, 6, '#dfe8ee'); [0, 1, 2].forEach((i) => px.px(80 + i * 8, 57, ['#5aa06a', '#f2f2f2', '#e8c040'][i])); px.rect(114, 54, 5, 5, '#f2f2f2'); px.px(116, 56, '#e8584c');
  // 모니터
  px.rect(150, 40, 26, 18, '#3a4450'); px.rect(151, 41, 24, 15, '#16202a');
  const bt = (t % 1000) / 1000;
  const yb = 49;
  px.hl(152, 158, yb, '#6ee0a0'); px.line(158, yb, 160, yb - 5, '#6ee0a0'); px.line(160, yb - 5, 162, yb + 4, '#6ee0a0'); px.line(162, yb + 4, 164, yb, '#6ee0a0'); px.hl(164, 174, yb, '#6ee0a0');
  px.rect(152 + Math.floor(bt * 22), 42, 2, 13, '#16202a');
  px.px(170, 43, bt < 0.15 ? '#e8584c' : '#5a2a2a');
  px.vl(163, 58, G, '#9aa6b2');
  // 링거대
  px.vl(62, 40, G, '#9aa6b2'); px.hl(57, 67, 40, '#9aa6b2'); px.rect(58, 41, 7, 10, '#e6f4fb'); px.rect(59, 45, 5, 5, '#cfe9f6'); px.vl(61, 51, 56, '#9aa6b2'); px.px(61, 57 + Math.floor((t / 130) % 4), '#5fb4ee');
  px.line(61, 58, 88, 92, '#cfe3f0');
  bed(px, 112, G, 58, true);
  lieIn(px, t, who, 112, G, 58, { quilt: '#cfe3f0', pattern: 'plain', face: 'closed', breath: (Math.sin(t / 700) + 1) / 2 });
  if (t > 800) bubble(px, t > 2600 ? 'sweat' : 'dots', 92, G - 22);
  // 협탁 (꽃병 · 물컵)
  px.rect(186, G - 16, 16, 16, '#a07a58'); px.rect(186, G - 16, 16, 1, '#c49a74'); px.rect(188, G - 13, 12, 5, '#8a6444'); px.px(194, G - 11, '#f2c230');
  px.rect(189, G - 22, 4, 6, '#9fc7e0'); [[-1, -26, '#f05a7e'], [1, -28, '#ffd37a'], [3, -25, '#ffffff']].forEach(([dx, dy, cc]) => { px.vl(190 + dx, G + dy + 2, G - 22, '#4e7a44'); bloom(px, 189 + dx, G + dy, cc); });
  px.rect(196, G - 20, 3, 4, '#e6f4fb');
  vis.forEach((p, i) => { const r = actor(px, t, 1 + i, p, 214 + i * 18, G + 10, { gaze: -1, pose: i === 1 ? 'bow' : t > 2000 ? 'hold' : 'stand' }); if (i === 0 && t > 1400) bub(px, 'sweat', r); });
}

// ───────── 떠나보냄 ─────────
// 흐린 날 묘지. 상복을 입고 꽃을 들고 묘비 앞까지 걸어가 → 꽃을 내려놓고 고개 숙임 · 눈물. 새가 날아감
export function loss(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  const who = (v.arg === 'pt' ? [] : [k.pt]).concat(k.kids.slice(0, 2), k.par, k.sib.slice(0, 1)).filter(Boolean).slice(0, 3);
  px.bands(0, 96, ['#7a8294', '#9aa0ae', '#b8bcc8', '#cfd2da']);
  const gc = { ...c, far: '#8e97a8', near: '#a2aabb', leaf: '#6e8a74', trunk: '#5a4a44', ground: '#b9bfae', road: '#a8aca0', sky: 'linear-gradient(#9aa0ae, #cfd2da)' };
  cloudsRow(px, { ...gc, far: '#c0c4ce' }, t, 4);
  birds(px, t, 2, '#5a6070', 30);
  hills(px, gc, false, 94);
  ground(px, gc, false, G - 6, 'ls');
  // 먼 묘비 · 측백나무
  [[40, 0.6], [70, 0.5], [236, 0.6]].forEach(([x]) => { px.rect(x - 4, G - 18, 8, 12, '#c4c8d0'); px.disc(x, G - 18, 4, '#c4c8d0'); px.vl(x, G - 20, G - 14, '#9aa0aa'); });
  [24, 252].forEach((x) => { for (let j = 0; j < 40; j++) { const w = Math.round(Math.sin((j / 40) * Math.PI) * 5) + 1; px.rect(x - w, G - 46 + j, w * 2, 1, j % 3 ? '#4f6a58' : '#5f7a64'); } px.rect(x - 1, G - 6, 2, 4, '#5a4a44'); });
  // 묘비
  const gx = 184;
  px.alpha(0.2, () => px.rect(gx - 16, G, 32, 2, '#1c1426'));
  px.rect(gx - 16, G - 4, 32, 4, '#a6abb4'); px.hl(gx - 16, gx + 15, G - 4, '#c6cad2');
  px.rect(gx - 11, G - 30, 22, 26, '#d6d9e0'); px.disc(gx, G - 30, 11, '#d6d9e0'); px.rect(gx - 11, G - 30, 22, 1, '#d6d9e0');
  px.vl(gx - 11, G - 32, G - 5, '#eef0f4'); px.vl(gx + 10, G - 30, G - 5, '#b4b8c2');
  px.vl(gx, G - 36, G - 28, '#9aa0aa'); px.hl(gx - 3, gx + 3, G - 33, '#9aa0aa');
  [0, 1, 2].forEach((i) => px.hl(gx - 6, gx + 6 - i * 3, G - 22 + i * 4, '#a6abb4'));
  px.rect(gx - 11, G - 9, 5, 2, '#8fa88a'); px.rect(gx + 6, G - 6, 4, 2, '#8fa88a');
  const lay = seg(t, 800, 2400);
  if (lay >= 1) { px.hl(gx - 8, gx + 4, G - 2, '#4e7a44'); [0, 1, 2, 3, 4].forEach((i) => bloom(px, gx - 9 + i * 3, G - 4 - (i % 2), ['#ffffff', '#f2dc8a', '#ffffff', '#f6e6a8', '#ffffff'][i])); }
  const down = t > 2400;
  const meX = Math.round(lerp(130, gx - 20, ease(lay)));
  actor(px, t, 0, mourn(k.me), meX, G + 8, { walk: lay > 0 && lay < 1, pose: down ? 'bow' : lay < 1 ? 'hold' : 'stand', gaze: 1, cry: t > 1200 });
  if (lay < 1) { [0, 1, 2].forEach((i) => bloom(px, meX - 2 + i * 2, G - 8, ['#ffffff', '#f2dc8a', '#ffffff'][i])); }
  who.forEach((p, i) => actor(px, t, 1 + i, mourn(p), 120 - i * 20, G + 10, { gaze: 1, pose: t > 2600 ? 'bow' : 'stand', cry: i === 0 && t > 1800 }));
  petals(px, t, 8, ['#ffffff', '#e6e8ee'], 'lp', 0);
}

// ───────── 이민 ─────────
// 공항. 가방 끌고 걸어 들어감 · 남는 부모님은 손 흔들며 울고 → 비행기가 뜸
export function fly(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  skyBands(px, skyCols(c), 96); sun(px, 50, 30, 8, '#fff6e0', '#fff0d0'); cloudsRow(px, c, t, 4);
  const pl = seg(t, 2200, 5200);
  if (pl > 0 && pl < 1) {
    const x = lerp(150, 290, pl);
    const y = lerp(86, 12, pl);
    px.alpha(0.5, () => px.line(x - 50 * pl, y + 20 * pl, x - 12, y + 4, '#ffffff'));
    px.rect(x - 12, y - 2, 24, 4, '#ffffff'); px.rect(x + 10, y - 1, 3, 2, '#dfe7ee'); px.hl(x - 12, x + 11, y + 2, '#b8c4d0');
    px.rect(x - 10, y - 5, 4, 3, '#5b86c9'); px.rect(x - 2, y + 1, 8, 2, '#9fc7e0'); for (let i = 0; i < 5; i++) px.px(x - 6 + i * 3, y - 1, '#5b86c9');
  }
  hills(px, c, false, 96);
  ground(px, c, false, G - 6, 'fl', true);
  // 공항 건물 (유리 · 간판 · 관제탑)
  px.rect(140, 62, 116, 44, '#dfe7ee'); px.rect(140, 62, 116, 8, '#5b86c9'); px.rect(140, 70, 116, 1, '#3a5a8a');
  for (let x = 146; x < 252; x += 10) { px.rect(x, 74, 8, 18, '#9fc7e0'); px.line(x + 1, 90, x + 5, 76, '#cfe9f6'); }
  px.rect(184, 92, 24, 14, '#3a4a5e'); px.rect(195, 92, 1, 14, '#9fc7e0');
  [150, 158, 166, 174].forEach((x) => px.rect(x, 64, 5, 4, '#ffffff'));
  px.rect(236, 30, 6, 32, '#dfe7ee'); px.rect(232, 24, 14, 8, '#9fc7e0'); px.rect(232, 23, 14, 1, '#5a6070');
  const go = seg(t, 400, 2600);
  const fam = [k.pt, ...k.kids.slice(0, 2)].filter(Boolean);
  const stay = k.par.slice(0, 2);
  stay.forEach((p, i) => actor(px, t, 5 + i, p, 30 - i * 18, G + 16, { pose: t > 600 ? (Math.floor((t + i * 140) / 260) % 2 ? 'wave1' : 'wave2') : 'stand', gaze: 1, cry: t > 1400 }));
  const fade = 1 - seg(t, 2500, 2900);
  const mx = lerp(104, 200, ease(go));
  px.alpha(fade, () => { px.rect(mx + 7, G + 6, 6, 8, '#e8584c'); px.hl(mx + 8, mx + 11, G + 5, '#2e2a33'); px.vl(mx + 8, G + 2, G + 5, '#2e2a33'); px.px(mx + 8, G + 14, '#2e2a33'); px.px(mx + 12, G + 14, '#2e2a33'); });
  const r = actor(px, t, 0, k.me, mx, G + 14, { walk: go > 0 && go < 1, gaze: go < 0.15 ? -1 : 1, alpha: fade });
  if (go > 0.05 && go < 0.5) bub(px, 'heart', r);
  fam.forEach((p, i) => actor(px, t, 1 + i, p, lerp(104 - (i + 1) * 18, 200 - (i + 1) * 18, ease(go)), G + 14, { walk: go > 0 && go < 1, gaze: 1, alpha: fade }));
}

// ───────── 피란 ─────────
// 밤. 먼 곳에 불빛과 연기 · 사람들이 보따리를 메고 줄지어 걸어감
export function flee(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  px.bands(0, 96, ['#0d1330', '#1e2350', '#3a2a50', '#6a3a48']);
  for (let i = 0; i < 30; i++) px.px((i * 53) % 256, (i * 29) % 60, i % 4 ? '#8890b0' : '#ffffff');
  hills(px, c, true, 96);
  px.alpha(0.3 + 0.1 * Math.sin(t / 200), () => { px.rect(0, 88, W, 12, '#e8584c'); px.rect(0, 84, W, 4, '#c8483c'); });
  [60, 150, 220].forEach((x, i) => { const f = Math.floor(t / 120 + i) % 3; px.rect(x - 2, 90 - f, 5, 4 + f, '#ffb02e'); px.px(x, 88 - f, '#fff4b0'); });
  [40, 120, 200].forEach((x, i) => smoke(px, x, 92, t + i * 500, 5, '#6e625a', 0.55));
  ground(px, c, true, G - 6, 'fe', true);
  const people = [k.me, ...[k.pt, ...k.kids, ...k.par].filter(Boolean).slice(0, 3), extra(5), extra(0), extra(8, { age: 9 }), extra(3)];
  people.forEach((p, i) => {
    const x = ((i * 34 + t * 0.012) % 300) - 30;
    const y = G + 14 - (i % 2) * 4;
    const col = ['#8a6a4f', '#6a5a7a', '#7a6a4a'][i % 3];
    const f = fig(p);
    const sh = Math.round(y - f.fy + f.head) + 13; // 어깨 바로 위 (Figure 몸통은 머리 위에서 16칸 아래부터)
    const bw = f.group === 'kid' || f.group === 'baby' ? 6 : 8;
    const bx = Math.round(x) - 5 - bw;
    const by = sh + (Math.floor((t + i * 90) / 170) % 2); // 걸음에 맞춰 들썩
    px.rect(bx, by, bw, bw + 1, col); px.rect(bx + 1, by - 1, bw - 2, 1, col);
    px.rect(bx + 1, by, bw - 2, 1, lt(col, 0.25)); px.rect(bx, by + bw, bw, 1, dk(col, 0.3)); px.vl(bx + bw - 1, by + 1, by + bw, dk(col, 0.18));
    px.rect(bx + bw / 2 - 1, by - 2, 2, 2, dk(col, 0.25)); px.px(bx + bw / 2 - 2, by - 3, dk(col, 0.25)); px.px(bx + bw / 2 + 1, by - 3, dk(col, 0.25)); // 매듭
    px.hl(bx - 1, bx + bw, by - 1, '#2e2a33'); px.hl(bx, bx + bw - 1, by + bw + 1, '#2e2a33'); px.vl(bx - 1, by, by + bw, '#2e2a33');
    const r = actor(px, t, i, p, x, y, { walk: true, gaze: 1 });
    px.line(Math.round(x) - 5, by + 3, Math.round(x) + 2, by + 8, dk(col, 0.35)); // 어깨끈 (가슴을 비스듬히)
    if (p === k.me && t > 1500) bub(px, 'sweat', r);
  });
}

// ───────── 비 오는 날 (실직 · 이혼) ─────────
export function rain(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  px.bands(0, 100, ['#3a4252', '#4a5262', '#5c6474']);
  skyline(px, { ...c, far: '#3a4252' }, true, 104, 'rn', t);
  px.alpha(0.35, () => px.rect(0, 40, W, 66, '#4a5262')); // 빗속 안개 → 도시는 멀리
  ground(px, { ...c, ground: '#3e434e', leaf: '#3e434e', road: '#353a46' }, true, G - 6, 'rn', true);
  // 가로등 아래 둥근 빛 웅덩이 (사람이 빛 안에 → 눈에 띄게)
  const bx = 150;
  const B = G + 26; // 벤치 · 사람을 화면 앞쪽으로
  lampPost(px, bx - 30, B, true, t);
  px.alpha(0.16, () => { for (let j = -5; j <= 5; j++) { const w = Math.round(Math.sqrt(1 - (j / 6) ** 2) * 40); px.rect(bx - 22 - w, B + j, w * 2, 1, '#ffd37a'); } });
  px.alpha(0.2, () => px.rect(bx - 34, B + 2, 8, 6, '#ffd37a')); // 젖은 바닥에 비친 불빛
  bench(px, bx, B);
  const sit = seg(t, 400, 1600);
  const mx = Math.round(lerp(24, bx, ease(sit)));
  const y = sit >= 1 ? B - 4 : B + 2;
  // 우산 (크게)
  const ux = mx + 4;
  const uy = y - 38;
  px.vl(ux, uy, y - 12, '#2e2a33');
  for (let j = 0; j < 9; j++) px.hl(ux - 3 - j * 2, ux + 3 + j * 2, uy + j, j === 8 ? '#3a5a8a' : j % 2 ? '#5b86c9' : '#4f78b8');
  for (let k2 = -2; k2 <= 2; k2++) px.line(ux, uy, ux + k2 * 8, uy + 8, '#3a5a8a');
  px.px(ux, uy - 1, '#2e2a33'); px.px(ux, uy - 2, '#2e2a33');
  // 우산에 튀는 빗방울
  [0, 1, 2].forEach((i) => { const q = ((t + i * 260) % 780) / 780; if (q < 0.4) px.px(ux - 14 + i * 13 + Math.round(q * 4) * (i - 1), uy + 4 + i % 2 - Math.round(q * 5), '#c8d6e8'); });
  const r = actor(px, t, 0, k.me, mx, y, { walk: sit > 0 && sit < 1, pose: sit >= 1 ? 'bow' : undefined, gaze: 1 });
  if (t > 2000) bub(px, 'dots', r);
  // 비 · 웅덩이 물결
  for (let i = 0; i < 90; i++) { const x = (i * 37.3) % 280 - 10; const yy = ((t * (i % 3 ? 0.26 : 0.36) + i * 47) % 170) - 20; px.line(x, yy, x - 2, yy + (i % 3 ? 5 : 7), i % 3 ? '#8a98b0' : '#c8d6e8'); }
  for (let i = 0; i < 8; i++) { const q = ((t + i * 380) % 1400) / 1400; const x = 20 + i * 30; const w = Math.round(2 + q * 8); px.alpha(1 - q, () => { px.hl(x - w, x + w, G + 12 + (i % 3) * 3, '#c8d6e8'); }); }
}

// ───────── 역사 사건 뉴스 ─────────
export function news(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  room(px, { wall: '#e8dccb', floor: '#bfa88c', paper: 'stripe', night: true, win: [[16, 20]], sky: roomSky(c), curtain: '#a86a5a', t, G });
  clock(px, 70, 20, t); frame(px, 86, 30, 12, 10, 0); frame(px, 102, 32, 10, 9, 1);
  rug(px, 92, G + 16, 56, '#8a5a6a'); plant(px, 246, G + 2, t);
  // TV 장 · 브라운관 TV (뉴스 · 자막 띠 · 깜빡)
  px.rect(166, G - 12, 60, 12, '#8a6244'); px.rect(166, G - 12, 60, 1, '#a87a58'); [0, 1, 2].forEach((i) => { px.rect(168 + i * 19, G - 10, 17, 7, '#7a5638'); px.hl(174 + i * 19, 178 + i * 19, G - 7, '#f2c230'); });
  px.line(186, G - 48, 178, G - 58, '#3a3440'); px.line(204, G - 48, 212, G - 58, '#3a3440');
  px.rect(170, G - 48, 52, 36, '#3a3440'); px.rect(173, G - 45, 40, 28, '#16202a');
  const fl = Math.floor(t / 90) % 5 === 0;
  px.rect(173, G - 45, 40, 28, fl ? '#b8d4f0' : '#a8c8e8');
  px.rect(173, G - 45, 40, 8, '#6f86a6'); px.rect(180, G - 36, 10, 14, '#2f3b5c'); px.disc(185, G - 39, 3, '#f2c9a0'); px.rect(182, G - 43, 6, 2, '#3a2c26');
  px.rect(196, G - 42, 14, 10, '#e8eef6'); px.line(198, G - 34, 202, G - 39, '#d0383f'); px.line(202, G - 39, 205, G - 36, '#d0383f'); px.line(205, G - 36, 208, G - 41, '#d0383f');
  px.rect(173, G - 22, 40, 5, '#d0383f');
  for (let i = 0; i < 40; i++) if (((i + Math.floor(t / 60)) % 7) < 4) px.px(173 + i, G - 20, '#ffffff');
  px.rect(215, G - 44, 4, 2, '#5a5460'); px.disc(217, G - 36, 1, '#5a5460'); px.disc(217, G - 31, 1, '#5a5460');
  px.alpha(0.08, () => { for (let j = 0; j < 60; j++) px.rect(170 - j * 1.4, G - 40 + j * 0.8, 8 + j * 1.4, 1, '#a8c8e8'); });
  lamp(px, 140, G, true);
  // 소파 + 가족
  px.alpha(0.2, () => px.rect(30, G, 110, 2, '#1c1426'));
  px.rect(30, G - 28, 110, 16, '#9a5848'); for (let i = 0; i < 5; i++) px.rect(34 + i * 21, G - 26, 19, 12, '#a8604e');
  const fam = [k.me, ...k.par, k.pt, ...k.sib.slice(0, 1), ...k.kids.slice(0, 2)].filter(Boolean).slice(0, 5);
  fam.forEach((p, i) => { const r = actor(px, t, i, p, 44 + i * 21, G - 6, { pose: 'sit', gaze: 1, noShadow: true, bob: t > 1500 && i === 0 ? -1 : 0 }); if (i === 0 && t > 1300) bub(px, 'bang', r); if (i === 1 && t > 2200) bub(px, 'dots', r); });
  px.rect(26, G - 22, 8, 20, '#8a4c40'); px.rect(136, G - 22, 8, 20, '#8a4c40');
  px.rect(32, G - 10, 106, 6, '#b46a56'); px.hl(32, 137, G - 10, '#c98270'); px.rect(30, G - 4, 110, 3, '#7a4036'); px.rect(34, G - 1, 3, 1, '#4a3428'); px.rect(133, G - 1, 3, 1, '#4a3428');
  px.rect(36, G - 22, 8, 7, '#f2c94e'); px.rect(124, G - 22, 8, 7, '#9fc7e0');
}

// ───────── 내 집 마련 ─────────
export function home(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  skyBands(px, skyCols(c), 96); sun(px, 40, 28, 8, '#fff6e0', '#fff0d0'); cloudsRow(px, c, t, 4); birds(px, t, 2, dk(c.far, 0.35), 22);
  hills(px, c, false, 92);
  ground(px, c, false, G - 6, 'hm');
  // 집
  const X1 = 130;
  const X2 = 218;
  bricks(px, X1, 58, X2 - X1, G - 6 - 58, lt(c.wall, 0.06));
  px.rect(196, 30, 9, 22, '#a8653e'); px.rect(194, 28, 13, 3, '#8a4c30'); smoke(px, 200, 28, t, 4, '#ffffff', 0.55);
  roof(px, X1, X2, 58, 30, c.roofC);
  px.disc(174, 46, 4, '#cfe3f0'); px.ring(174, 46, 4, '#fdf8f0', 12); px.vl(174, 42, 50, '#fdf8f0'); px.hl(170, 178, 46, '#fdf8f0');
  bwin(px, 138, 68, 14, 12, false, true); bwin(px, 196, 68, 14, 12, false, true);
  door(px, 174, G - 6, 14, 22, '#8a5a3b', seg(t, 300, 800), '#f6d9a0');
  px.rect(164, G - 6, 20, 2, '#c8bcac'); px.rect(161, G - 4, 26, 2, '#b8ac9c');
  for (let x = 222; x < W; x += 5) { px.rect(x, G - 18, 3, 12, '#fdf8f0'); px.px(x + 1, G - 19, '#fdf8f0'); } px.hl(220, W, G - 15, '#fdf8f0'); px.hl(220, W, G - 10, '#fdf8f0');
  px.vl(116, G - 22, G - 6, '#6a5a4a'); px.rect(111, G - 28, 11, 7, '#c9544a'); px.rect(121, G - 28, 1, 4, '#f2c230');
  for (let i = 0; i < 10; i++) bloom(px, 134 + i * 8, G - 8, ['#f05a7e', '#ffd37a', '#ffffff', '#c4a8ec'][i % 4]);
  treeAt(px, 96, G - 4, c, 1, false, 'h1'); treeAt(px, 244, G - 2, c, 0.9, false, 'h2');
  // 상자 나르는 가족
  [k.pt, ...k.kids.slice(0, 3)].filter(Boolean).forEach((p, i) => {
    const q = ((t + i * 900) % 3000) / 3000;
    const x = lerp(30, 172, q);
    const a = q > 0.9 ? (1 - q) / 0.1 : 1;
    const r = actor(px, t, 1 + i, p, x, G + 10, { walk: true, gaze: 1, pose: 'hold', alpha: a });
    px.alpha(a, () => { px.rect(x - 5, r.headY + 14, 10, 7, '#c9a06a'); px.hl(x - 5, x + 4, r.headY + 16, '#a07a48'); px.vl(x - 5, r.headY + 14, r.headY + 20, '#8a6438'); });
  });
  const r = actor(px, t, 0, k.me, 104, G + 14, { pose: t > 800 ? (Math.floor(t / 300) % 2 ? 'up' : 'wave1') : 'stand', gaze: 1, bob: t > 800 ? -Math.abs(Math.round(wave(t, 600, 3))) : 0 });
  if (t > 800) { const kx = 112; const ky = r.headY - 4; px.ring(kx, ky, 2, '#f2c230', 20); px.hl(kx + 2, kx + 7, ky, '#f2c230'); px.vl(kx + 6, ky, ky + 2, '#f2c230'); sparkle(px, kx - 3, ky - 3, t); sparkle(px, kx + 8, ky - 2, t + 200); }
  if (t > 1600) bub(px, 'heart', r);
}

// ───────── 상 · 장학금 · 복권 (무대) ─────────
export function award(px, t, v) {
  const k = castOf(v);
  const G = 96;
  px.rect(0, 0, W, H, '#2e2a44');
  for (let i = 0; i < 40; i++) px.px((i * 37) % 256, 8 + ((i * 13) % 50), (Math.floor(t / 300) + i) % 3 ? ['#ffd37a', '#f6a5bd', '#9fc7e0'][i % 3] : '#2e2a44');
  // 막 · 위 가림막 · 금 술
  [-1, 1].forEach((sd) => { for (let x = 0; x < 40; x++) { const X = sd < 0 ? x : W - 1 - x; const h = G + 4 - Math.round((x / 40) * 10); px.vl(X, 0, h, x % 6 < 2 ? '#5e2235' : x % 6 < 4 ? '#7a2f45' : '#9a4a60'); } px.rect(sd < 0 ? 28 : W - 34, G - 10, 6, 2, '#f2c230'); px.rect(sd < 0 ? 30 : W - 32, G - 8, 2, 5, '#f2c230'); });
  for (let x = 0; x < W; x++) { const y = 10 + Math.round(Math.abs(Math.sin(x / 20)) * 4); px.vl(x, 0, y, x % 4 < 2 ? '#8a3650' : '#7a2f45'); px.px(x, y, '#f2c230'); }
  // 무대 바닥 · 객석
  px.rect(0, G, W, 12, '#6a4a3a'); for (let x = 0; x < W; x += 20) px.vl(x, G, G + 11, '#4a3428'); px.hl(0, W, G, '#ffd37a');
  px.rect(0, G + 12, W, H - G - 12, '#221f33');
  const up = seg(t, 300, 1500);
  const mx = Math.round(lerp(50, 128, ease(up)));
  px.alpha(0.16, () => { for (let j = 0; j < G; j++) { const w = 8 + j * 0.45; px.rect(mx - w, j, w * 2, 1, '#fff6df'); } });
  px.alpha(0.2, () => { for (let j = -3; j <= 3; j++) px.rect(mx - 22 + Math.abs(j) * 2, G - 1 + j * 0.5, 44 - Math.abs(j) * 4, 1, '#fff6df'); });
  // 마이크
  px.vl(160, G - 22, G, '#3a3440'); px.rect(158, G - 26, 3, 4, '#5a5460'); px.hl(156, 164, G, '#3a3440');
  const r = actor(px, t, 0, k.me, mx, G, { walk: up > 0 && up < 1, pose: up >= 1 ? 'up' : undefined, gaze: up >= 1 ? 0 : 1 });
  if (up >= 1) { const ty = r.headY - 6 + Math.round(wave(t, 700, 1)); px.rect(mx - 3, ty, 7, 5, '#f2c230'); px.rect(mx - 1, ty + 5, 3, 2, '#d8a020'); px.rect(mx - 3, ty + 7, 7, 1, '#b88a20'); px.px(mx - 4, ty + 1, '#f2c230'); px.px(mx + 4, ty + 1, '#f2c230'); px.px(mx - 1, ty + 1, '#fff4b0'); sparkle(px, mx + 6, ty - 2, t); sparkle(px, mx - 6, ty, t + 300); }
  if (t > 1800) bub(px, 'star', r);
  // 객석 (뒷모습 · 박수)
  const fam = ((v.age ?? 30) < 20 ? k.par : [k.pt, ...k.kids]).filter(Boolean);
  const crowd = [...fam, extra(0), extra(3), extra(5), extra(9), extra(1), extra(6)].slice(0, 7);
  crowd.forEach((p, i) => actor(px, t, 10 + i, p, 24 + i * 34, 141 - (i % 2), { back: true, pose: t > 1600 ? (Math.floor((t + i * 70) / 180) % 2 ? 'up' : 'clap1') : 'stand', noShadow: true }));
  // 의자 등받이 (몸 아래쪽을 가림 → 앉아 있는 객석)
  for (let i = 0; i < 8; i++) { const x = 7 + i * 34; px.rect(x, 137, 34 - 2, 7, '#6a2a3e'); px.rect(x, 137, 32, 1, '#8a3a52'); px.rect(x + 1, 139, 30, 1, '#5a2234'); px.vl(x + 31, 138, H - 1, '#4a1a2a'); }
  px.alpha(0.12, () => px.rect(0, 108, W, 29, '#fff6df')); // 무대 빛이 객석 머리에 살짝
  petals(px, t, 50, ['#f6a5bd', '#ffd37a', '#9fc7e0', '#ffffff', '#b7e0a0'], 'aw', 1600);
}

// ───────── 자격증 ─────────
export function cert(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  room(px, { wall: '#f2e8da', floor: '#c9ac88', paper: 'dot', win: [[18, 22]], sky: roomSky(c), t, G });
  clock(px, 230, 20, t); frame(px, 76, 34, 12, 10, 0); frame(px, 92, 36, 10, 9, 1); shelf(px, 214, 52, t); rug(px, 130, G + 14, 60, '#a86a5a');
  px.px(176, 28, '#6a5a4a');
  const show = seg(t, 500, 1000);
  const hang = seg(t, 2800, 3600);
  const me = actor(px, t, 0, k.me, 130, G + 12, { pose: hang > 0 && hang < 1 ? 'up' : 'hold', gaze: 0 });
  const cx = Math.round(lerp(130, 176, ease(hang)));
  const cy = Math.round(lerp(G - 6, 34, ease(hang)));
  if (show > 0) {
    if (hang >= 1) { px.rect(cx - 10, cy - 7, 20, 15, '#8a6244'); px.rect(cx - 9, cy - 6, 18, 13, '#c9a85a'); }
    px.rect(cx - 8, cy - 5, 16, 11, '#fffaf0'); px.rect(cx - 7, cy - 4, 14, 9, '#fffaf0');
    px.hl(cx - 7, cx + 6, cy - 5, '#c9a85a'); px.hl(cx - 7, cx + 6, cy + 5, '#c9a85a'); px.vl(cx - 8, cy - 4, cy + 4, '#c9a85a'); px.vl(cx + 7, cy - 4, cy + 4, '#c9a85a');
    px.hl(cx - 4, cx + 3, cy - 3, '#5a4a3a'); [0, 1].forEach((i) => px.hl(cx - 5, cx + 4 - i * 4, cy - 1 + i * 2, '#a89a88'));
    px.disc(cx + 4, cy + 3, 2, '#e0b040'); px.px(cx + 3, cy + 5, '#c9544a'); px.px(cx + 5, cy + 5, '#c9544a');
    if (hang >= 1) for (let i = 0; i < 6; i++) sparkle(px, cx + Math.round(Math.cos(i + t / 500) * 14), cy + Math.round(Math.sin(i + t / 500) * 10), t + i * 90);
  }
  if (t > 1100 && t < 2800) bub(px, 'star', me);
  const fam = ((v.age ?? 30) < 20 ? k.par : [k.pt, ...k.kids, ...k.par]).filter(Boolean).slice(0, 4);
  fam.forEach((p, i) => { const x = [96, 76, 166, 186][i]; const r = actor(px, t, 1 + i, p, x, G + 12, { pose: t > 1100 && t < 2800 ? (Math.floor((t + i * 80) / 190) % 2 ? 'clap1' : 'stand') : t >= 3600 ? 'up' : 'stand', gaze: x < 130 ? 1 : -1 }); if (i === 0 && t > 1300) bub(px, t < 3400 ? 'bang' : 'heart', r); });
  if (t > 1200) [0, 1, 2].forEach((i) => floatHeart(px, 116 + i * 14, G - 26, t, 1400 + i * 500, '#ffd37a'));
}

// ───────── 은퇴 ─────────
export function party(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  room(px, { wall: '#f2e6d6', floor: '#c9b090', paper: 'flower', win: [[14, 22], [208, 22]], sky: roomSky(c), t, G });
  for (let i = 0; i < 14; i++) { const x = 60 + i * 10; const y = 10 + Math.round(Math.sin((i / 13) * Math.PI) * 5); px.rect(x, y, 6, 1, ['#f6a5bd', '#ffd37a', '#9fc7e0', '#b7e0a0'][i % 4]); px.rect(x + 1, y + 1, 4, 2, ['#f6a5bd', '#ffd37a', '#9fc7e0', '#b7e0a0'][i % 4]); }
  px.rect(92, 24, 72, 10, '#c9544a'); px.rect(92, 24, 72, 1, '#e07a6a'); for (let x = 96; x < 160; x += 4) px.rect(x, 28, 2, 2, '#ffffff');
  // 식탁 (레이스 천 · 케이크 · 촛불 · 선물)
  px.alpha(0.2, () => px.rect(100, G, 56, 2, '#1c1426'));
  px.rect(102, G - 16, 3, 16, '#8a6a4f'); px.rect(151, G - 16, 3, 16, '#8a6a4f');
  px.rect(98, G - 20, 60, 6, '#ffffff'); for (let x = 98; x < 158; x += 4) px.px(x + 2, G - 14, '#ffffff'); px.hl(98, 157, G - 20, '#f6a5bd');
  px.rect(118, G - 30, 20, 10, '#fff4e8'); px.hl(118, 137, G - 27, '#f6a5bd'); [121, 126, 131, 135].forEach((x, i) => px.px(x, G - 24, ['#f05a7e', '#ffd37a', '#9fc7e0', '#b7e0a0'][i]));
  const blow = t > 2200;
  [121, 125, 129, 133].forEach((x, i) => { px.vl(x, G - 35, G - 31, ['#9fc7e0', '#f6a5bd', '#ffd37a', '#b7e0a0'][i]); if (!blow) { px.px(x, G - 37 + (Math.floor(t / 150 + i) % 2), '#ffb02e'); px.px(x, G - 36, '#fff4b0'); } else if (t < 3400) smoke(px, x, G - 36, t - 2200 + i * 200, 2, '#d8d8d8', 0.6); });
  [[106, '#9fc7e0'], [146, '#ffd37a']].forEach(([x, cc]) => { px.rect(x - 4, G - 27, 8, 7, cc); px.vl(x, G - 27, G - 21, '#f05a7e'); px.hl(x - 4, x + 3, G - 24, '#f05a7e'); px.px(x - 1, G - 28, '#f05a7e'); px.px(x + 1, G - 28, '#f05a7e'); });
  const r = actor(px, t, 0, k.me, 84, G + 12, { pose: t > 1600 && t < 2300 ? 'bow' : t > 2600 ? (Math.floor(t / 260) % 2 ? 'wave1' : 'wave2') : 'stand', gaze: 1 });
  if (t > 2700) bub(px, 'heart', r);
  const fam = [k.pt, ...k.kids.slice(0, 2)].filter(Boolean);
  fam.forEach((p, i) => actor(px, t, 1 + i, p, 176 + i * 18, G + 12, { pose: t > 2300 ? (Math.floor((t + i * 80) / 180) % 2 ? 'clap1' : 'stand') : 'stand', gaze: -1 }));
  [extra(1, { age: 45 }), extra(6, { age: 38 }), extra(5, { age: 52 })].forEach((p, i) => { const x = [60, 40, 232][i]; const rr = actor(px, t, 5 + i, p, x, G + 12, { pose: t > 2300 ? (Math.floor((t + i * 90) / 200) % 2 ? 'clap1' : 'up') : 'stand', gaze: x < 128 ? 1 : -1 }); if (i === 0 && t > 3000) bub(px, 'note', rr); });
  petals(px, t, 36, ['#f6a5bd', '#ffd37a', '#9fc7e0', '#ffffff'], 'pt', 2300);
}

// ───────── 수감 ─────────
export function prison(px, t, v) {
  const k = castOf(v);
  const G = 112;
  px.rect(0, 0, W, G, '#5a5c66');
  for (let y = 0; y < G; y += 6) for (let x = (y / 6) % 2 ? -6 : 0; x < W; x += 12) { px.hl(x, x + 11, y, '#4e505a'); px.vl(x, y, y + 5, '#4e505a'); }
  px.rect(0, G, W, H - G, '#43454e'); px.hl(0, W, G, '#34363e');
  px.rect(170, 24, 26, 18, '#a8c8e8'); [176, 183, 190].forEach((x) => px.vl(x, 24, 41, '#3a3c46'));
  const sh = Math.round(wave(t, 6000, 8));
  px.alpha(0.14, () => { for (let j = 0; j < G - 42; j++) px.rect(170 - j * 0.8 + sh * (j / 70), 42 + j, 26 + j * 0.3, 1, '#fff6df'); });
  px.rect(70, G - 12, 46, 5, '#6a6c76'); px.rect(72, G - 7, 3, 7, '#4a4c56'); px.rect(111, G - 7, 3, 7, '#4a4c56');
  const r = actor(px, t, 0, k.me, 92, G - 8, { pose: t > 1200 ? 'bow' : 'sit', noShadow: true, gaze: 1 });
  if (t > 1800) bub(px, 'dots', r);
  for (let x = 6; x < W; x += 22) { px.rect(x, 0, 4, H, '#2a2c34'); px.vl(x + 1, 0, H, '#4a4c56'); }
  px.rect(0, 20, W, 3, '#2a2c34');
}

// ───────── 일터 (일 시작 · 승진) ─────────
export function work(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  const ind = v.industry || 'SERVICE';
  const walk = seg(t, 300, 1800);
  skyBands(px, skyCols(c), 96); sun(px, 40, 28, 8, '#fff6e0', '#fff0d0'); cloudsRow(px, c, t, 3);
  if (ind === 'SERVICE') { hills(px, c, false, 92); skyline(px, c, false, 100, 'wk' + v.countryCode, t); } else hills(px, c, false, 96);
  ground(px, c, false, G - 6, 'wk', ind === 'SERVICE');
  const hat = ind === 'INDUSTRY' ? { style: 'cap', color: '#f2b22e' } : ind === 'AGRI' ? { style: 'straw', color: '#e2c27a' } : null;
  const wear = (p) => { const l = p.look || lookOf({ gender: p.gender, age: p.age, costume: p.costume, soft: p.soft }); return { ...p, look: { ...l, ...(hat ? { hat } : {}), ...(ind === 'SERVICE' && !p.me ? { top: { style: 'suit', color: '#3a4460' } } : {}) } }; };
  if (ind === 'AGRI') {
    for (let j = 0; j < 7; j++) for (let x = (j % 2) * 6; x < W; x += 12) { const y = G - 2 + j * 4; px.rect(x, y, 5, 2, c.leaf); px.px(x + 2, y - 1, lt(c.leaf, 0.3)); }
    px.rect(184, 62, 52, 44, '#b0704a'); for (let y = 66; y < 106; y += 4) px.hl(184, 235, y, '#9a5e3a');
    roof(px, 184, 236, 62, 42, '#8a4a32'); door(px, 210, 106, 16, 26, '#6a3a2a', 0.5, '#3a2a20'); px.line(202, 80, 218, 104, '#e8d8b8'); px.line(218, 80, 202, 104, '#e8d8b8');
    px.vl(160, 70, 106, '#8a6a4f'); px.rect(150, 70, 20, 2, '#8a6a4f');
  } else if (ind === 'INDUSTRY') {
    px.rect(130, 58, 126, 48, '#9aa3b5'); for (let i = 0; i < 4; i++) { const x = 130 + i * 32; for (let j = 0; j < 12; j++) px.hl(x + j, x + 32 - j * 0, 58 - j, j === 0 ? '#6a7384' : '#7a8394'); }
    px.rect(226, 20, 10, 38, '#7a8394'); px.rect(226, 24, 10, 2, '#e8584c'); smoke(px, 231, 20, t, 5, '#e6e8ee', 0.6);
    for (let x = 140; x < 220; x += 12) px.rect(x, 70, 8, 8, '#cfe3f0');
    const gr = Math.floor(t / 120) % 2; px.ring(160, 90, 7, '#5a6070', 30); px.ring(160, 90, gr ? 5 : 6, '#7a8394', 45);
    px.rect(0, G - 10, W, 4, '#4a4c56'); for (let i = 0; i < 9; i++) { const x = ((i * 30 + t * 0.03) % 290) - 20; px.rect(x, G - 16, 10, 6, '#c9a06a'); px.hl(x, x + 9, G - 13, '#a07a48'); }
  } else {
    const wc = lt(c.wall, 0.08);
    bricks(px, 130, 48, 116, G - 54, wc); px.rect(130, 48, 116, 6, c.roofC);
    for (let x = 136; x < 240; x += 18) bwin(px, x, 58, 12, 10, false, false);
    px.rect(136, 78, 66, 28, '#a8c8e8'); px.line(140, 104, 160, 80, '#cfe9f6');
    for (let x = 136; x < 202; x += 6) { px.rect(x, 74, 3, 4, '#e8584c'); px.rect(x + 3, 74, 3, 4, '#ffffff'); }
    door(px, 222, 106, 14, 22, '#8a6a4f', seg(t, 1400, 1800), '#f6d9a0');
    px.rect(150, 86, 8, 18, '#6a7a8a'); px.rect(170, 92, 20, 10, '#8a6244');
  }
  const mates = (v.extra || [{ gender: 'M', age: 34 }, { gender: 'F', age: 29 }]).map((p, i) => extra(i + 3, p));
  mates.forEach((p, i) => { const r = actor(px, t, 1 + i, wear(p), [196, 176][i], G + 10, { gaze: -1, pose: walk > 0.6 ? (i === 0 ? (Math.floor(t / 260) % 2 ? 'wave1' : 'wave2') : Math.floor(t / 190) % 2 ? 'clap1' : 'stand') : 'stand' }); if (i === 0 && walk >= 1) bub(px, 'bang', r); });
  const r = actor(px, t, 0, wear(k.me), lerp(20, 150, ease(walk)), G + 12, { walk: walk > 0 && walk < 1, gaze: 1, pose: walk >= 1 && t > 2200 ? (Math.floor(t / 260) % 2 ? 'wave1' : 'wave2') : undefined });
  if (walk >= 1 && t > 2400) bub(px, 'note', r);
  treeAt(px, 110, G - 4, c, 1, false, 'w1');
}

// ───────── 그 밖의 해 (동네 산책) ─────────
export function village(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  skyBands(px, skyCols(c), 96); sun(px, 210, 34, 9, '#fff6e0', '#fff0d0'); cloudsRow(px, c, t, 4); birds(px, t, 3, dk(c.far, 0.35), 24);
  hills(px, c, false, 92);
  ground(px, c, false, G - 6, 'vl', true);
  [[20, 60], [92, 64], [170, 58]].forEach(([x, w], i) => { bricks(px, x, 70, w, G - 76, lt(c.wall, 0.04 * i)); roof(px, x, x + w, 70, 52, c.roofC); bwin(px, x + 8, 80, 10, 9, false, true); door(px, x + w - 14, G - 6, 10, 16, '#8a5a3b'); });
  treeAt(px, 80, G - 4, c, 1, false, 'v1'); treeAt(px, 160, G - 4, c, 1.1, false, 'v2'); treeAt(px, 246, G - 4, c, 0.9, false, 'v3');
  const x = lerp(40, 190, seg(t, 0, 6000));
  const r = actor(px, t, 0, k.me, x, G + 12, { walk: true, gaze: 1 });
  if (t > 1800) bub(px, 'note', r);
  [...k.par, k.pt, ...k.kids].filter(Boolean).slice(0, 4).forEach((p, i) => actor(px, t, 1 + i, p, x - 18 - i * 16, G + 12, { walk: true, gaze: 1 }));
  petals(px, t, 12, [lt(c.leaf, 0.3), '#ffffff'], 'vp', 0);
}

// ───────── 마지막 ─────────
// 보통: 밤 방 · 침대에 누운 나 · 숨이 잦아들다 멎음 · 가족이 울며 곁을 지킴 · 작은 빛이 떠오름 (하트 없음)
// 갑작스러운 죽음 (v.arg === 'sudden'): 침대 대신 주인 없는 빈자리 - 걸린 겉옷 · 남은 찻잔 · 빈 의자 · 촛불 · 창가에서 우는 가족
export function last(px, t, v) {
  const c = paletteOf(v);
  const k = castOf(v);
  const G = 112;
  const fam = [k.pt, ...k.kids, ...k.par].filter(Boolean).slice(0, 5);
  const myLook = lookOf({ gender: v.gender, age: v.age, costume: v.costume });
  if (v.arg === 'sudden') {
    room(px, { wall: '#e8dcc8', floor: '#b89a78', paper: 'stripe', night: true, win: [[110, 20]], sky: roomSky(c), curtain: '#4a4a7a', t, G });
    clock(px, 216, 20, t); frame(px, 40, 30, 12, 10, 0); frame(px, 56, 32, 10, 9, 1); rug(px, 96, G + 16, 60, '#5a5a7a');
    // 옷걸이 · 내 겉옷 · 모자
    px.vl(24, G - 56, G, '#6a4a34'); px.hl(20, 28, G - 56, '#6a4a34'); px.hl(20, 28, G, '#6a4a34');
    const tc = myLook.top.color;
    for (let j = 0; j < 22; j++) px.rect(22 - Math.floor(j / 6), G - 54 + j, 6 + Math.floor(j / 6) * 2, 1, j % 5 ? tc : dk(tc, 0.2));
    px.rect(18, G - 60, 10, 3, '#5a4a3a'); px.rect(20, G - 63, 6, 3, '#5a4a3a');
    // 식탁 · 찻잔 · 빈 의자
    px.alpha(0.2, () => px.rect(64, G, 50, 2, '#1c1426'));
    px.rect(66, G - 20, 46, 3, '#9a7452'); px.rect(68, G - 17, 2, 17, '#7a5a40'); px.rect(108, G - 17, 2, 17, '#7a5a40');
    px.rect(98, G - 25, 5, 5, '#fffaf0'); px.px(103, G - 24, '#c8beb0'); px.px(103, G - 22, '#c8beb0'); px.hl(96, 104, G - 20, '#e6dccd');
    px.rect(76, G - 22, 10, 2, '#f6e6c8');
    px.rect(118, G - 32, 2, 32, '#8a6244'); px.rect(118, G - 32, 12, 2, '#8a6244'); px.rect(118, G - 12, 14, 3, '#9a7452'); px.rect(129, G - 9, 2, 9, '#7a5a40'); px.rect(119, G - 9, 2, 9, '#7a5a40');
    // 협탁 · 사진 · 촛불
    px.rect(232, G - 16, 16, 16, '#a07a58'); px.rect(236, G - 24, 7, 8, '#b08a64'); px.rect(237, G - 23, 5, 6, '#f6e6c8');
    px.rect(244, G - 22, 2, 6, '#f6f0dc'); px.px(244, G - 24 + (Math.floor(t / 160) % 2), '#ffb02e'); px.px(244, G - 23, '#fff4b0');
    px.alpha(0.1 + 0.03 * Math.sin(t / 150), () => px.disc(244, G - 23, 16, '#ffb02e'));
    fam.forEach((p, i) => actor(px, t, i, p, 150 + i * 17, G + 10, { gaze: i % 2 ? -1 : 1, pose: i % 2 ? 'bow' : 'stand', cry: t > 400 + i * 300 }));
    if (!fam.length) actor(px, t, 0, extra(3), 160, G + 10, { pose: 'bow', cry: true });
    return;
  }
  room(px, { wall: '#e8dcc8', floor: '#b89a78', paper: 'flower', night: true, win: [[18, 20]], sky: roomSky(c), curtain: '#4a4a7a', t, G });
  clock(px, 130, 20, t); frame(px, 94, 32, 12, 10, 0); frame(px, 110, 34, 10, 9, 1); shelf(px, 216, 54, t); rug(px, 104, G + 16, 56, '#6a5a8a');
  // 협탁 · 사진 · 촛불
  px.rect(52, G - 16, 16, 16, '#a07a58'); px.rect(56, G - 24, 7, 8, '#b08a64'); px.rect(57, G - 23, 5, 6, '#f6e6c8');
  px.rect(64, G - 22, 2, 6, '#f6f0dc'); px.px(64, G - 24 + (Math.floor(t / 160) % 2), '#ffb02e'); px.px(64, G - 23, '#fff4b0');
  px.alpha(0.1 + 0.03 * Math.sin(t / 150), () => px.disc(64, G - 23, 18, '#ffb02e'));
  bed(px, 104, G, 58, false);
  const fade = 1 - seg(t, 1800, 3400);
  lieIn(px, t, k.me, 104, G, 58, { quilt: '#9a8ec0', pattern: 'flower', face: 'closed', breath: fade * (Math.sin(t / 900) + 1) / 2 });
  fam.forEach((p, i) => actor(px, t, 1 + i, p, 158 + i * 17, G + 10, { gaze: -1, pose: t > 3400 ? 'bow' : i === 0 ? 'hold' : 'stand', cry: t > 500 + i * 300 }));
  if (t > 3400) for (let i = 0; i < 6; i++) { const q = seg(t, 3400 + i * 220, 5400 + i * 220); if (q > 0 && q < 1) px.alpha(1 - q, () => px.rect(82 + Math.round(wave(t, 1200, 6, i)), G - 24 - q * 70, 2, 2, '#fff4b0')); }
}

// ───────── 장례 ─────────
// 하얀 휘장 · 국화 단 · 영정(머리부터 어깨, 검은 리본) · 촛불 · 향 연기 · 근조 화환. 조문객은 영정을 보고 서서(뒷모습) 차례로 고개 숙임 · 앞줄 가족은 눈물
export function funeral(px, t, v) {
  const k = castOf(v);
  const G = 104;
  px.rect(0, 0, W, H, '#34313a');
  px.rect(36, 0, 184, G - 22, '#e9e6de'); for (let x = 40; x < 220; x += 8) { px.vl(x, 0, G - 23, '#d6d2c8'); px.vl(x + 1, 0, G - 23, '#f4f2ec'); }
  for (let x = 36; x < 220; x++) px.vl(x, 0, 4 + Math.round(Math.abs(Math.sin((x - 36) / 30)) * 5), '#2a2830');
  px.rect(0, G - 8, W, H - G + 8, '#2a2830');
  px.rect(0, G - 8, W, H - G + 8, '#4a4550'); px.rect(72, G - 8, 112, H - G + 8, '#6a4a52'); for (let y = G - 6; y < H; y += 4) px.hl(72, 183, y, '#7a5862');
  // 국화 단
  for (let r = 0; r < 5; r++) for (let i = 0; i < 18 - r * 2; i++) {
    const fx = 128 + (i - (17 - r * 2) / 2) * 7;
    const fy = G - 26 - r * 6;
    const yel = (i + r) % 4 === 0;
    px.disc(fx, fy, 3, yel ? '#d8bc68' : '#dcd8cc');
    px.px(fx - 1, fy - 1, yel ? '#f2dc8a' : '#f7f4ec'); px.px(fx + 1, fy - 2, yel ? '#f2dc8a' : '#ffffff'); px.px(fx, fy, yel ? '#c8a040' : '#e8e2d0');
  }
  px.rect(48, G - 24, 160, 14, '#4a4652'); px.hl(48, 207, G - 24, '#6a6672');
  // 영정
  const me = figure({ look: lookOf({ gender: v.gender, age: v.age, costume: v.costume }), face: 'open' });
  const fw = 24;
  const fh = 24;
  const fx0 = 128 - fw / 2;
  const fy0 = 12;
  px.rect(fx0 - 2, fy0 - 2, fw + 4, fh + 4, '#2a2228'); px.rect(fx0 - 1, fy0 - 1, fw + 2, fh + 2, '#c9a85a');
  px.bands(fy0, fy0 + fh, ['#e9e4d8', '#c8c2b6'], fx0, fw);
  const sp = me.spr;
  for (let yy = 0; yy < sp.h; yy++) for (let xx = 0; xx < sp.w; xx++) {
    const col = sp.d[yy * sp.w + xx];
    if (!col) continue;
    const X = fx0 + fw / 2 + (xx - me.fx);
    const Y = fy0 + 2 + (yy - me.head);
    if (X >= fx0 && X < fx0 + fw && Y >= fy0 && Y < fy0 + fh) px.px(X, Y, mix(col, '#d8cfc0', 0.25));
  }
  [-1, 1].forEach((sd) => { for (let i = 0; i < 8; i++) px.rect(128 + sd * (fw / 2 + 2) - sd * i - (sd > 0 ? 2 : 0), fy0 - 2 + i, 3, 1, '#141016'); });
  px.rect(124, fy0 - 4, 9, 3, '#141016'); px.rect(127, fy0 - 2, 3, 3, '#141016');
  // 촛불 · 향
  [84, 172].forEach((x) => { px.rect(x - 1, G - 34, 3, 10, '#f4ecd0'); px.rect(x - 3, G - 24, 7, 1, '#c9a040'); px.px(x, G - 36 + (Math.floor(t / 170) % 2), '#ffb02e'); px.px(x, G - 35, '#fff4b0'); px.alpha(0.12 + 0.03 * Math.sin(t / 140), () => px.disc(x, G - 35, 9, '#ffb02e')); });
  px.rect(126, G - 26, 5, 3, '#8a6a4f'); smoke(px, 128, G - 28, t, 4, '#d6d2cc', 0.5);
  // 근조 화환
  [18, 238].forEach((x) => {
    px.line(x - 6, G - 10, x, G - 34, '#5a5460'); px.line(x + 6, G - 10, x, G - 34, '#5a5460');
    px.disc(x, G - 50, 14, '#e9e6de');
    for (let i = 0; i < 18; i++) { const a = i * 0.35; px.disc(x + Math.round(Math.cos(a) * 11), G - 50 + Math.round(Math.sin(a) * 11), 3, i % 4 ? '#f7f4ec' : '#e8d48a'); }
    px.disc(x, G - 50, 6, '#5f7a64');
    px.rect(x - 3, G - 42, 2, 22, '#f7f4ec'); px.rect(x + 2, G - 42, 2, 22, '#f7f4ec');
  });
  // 조문객 (뒷모습 · 차례로 고개 숙임 · 가족은 눈물)
  const fam = [k.pt, ...k.kids, ...k.sib, ...k.par].filter(Boolean).slice(0, 4);
  const rows = [...fam, extra(3), extra(0), extra(5), extra(9), extra(1), extra(6)].slice(0, 8);
  rows.slice(0, 4).forEach((p, i) => { const bowing = Math.sin(((t - i * 700) / 2600) * Math.PI * 2) > 0.2 && t > i * 700; actor(px, t, i, mourn(p), 86 + i * 28, G + 22, { back: true, pose: bowing ? 'bow' : 'stand' }); });
  rows.slice(4, 8).forEach((p, i) => actor(px, t, 4 + i, mourn(p), 72 + i * 38, G + 44, { back: true, pose: 'stand' }));
  // 제단 촛불에서 내려오는 따뜻한 빛 (조문객 머리 · 어깨가 어둠에 묻히지 않게)
  px.alpha(0.13, () => { for (let j = 0; j < H - G + 8; j++) { const w = 70 + j * 1.1; px.rect(128 - w, G - 8 + j, w * 2, 1, '#ffe2b0'); } });
}

export const SCENES = { born, school, grad, date, wedding, newborn, hosp, loss, fly, flee, rain, news, home, award, cert, party, prison, work, cowork: work, village, last, funeral };
