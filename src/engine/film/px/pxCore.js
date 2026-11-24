// C22 엔딩 크레딧 픽셀 그림 엔진 (원작 1in8b 처럼 낮은 해상도에 한 칸씩 찍는 픽셀 아트)
// - 화면 256 × 144 칸 → 캔버스를 키울 때 image-rendering: pixelated 로 또렷하게
// - Spr: 작은 칸 그림(스프라이트)에 도형을 칠한 뒤 outline() 으로 자동 외곽선 → 원작 같은 또렷한 테두리
// - 디더(체크 무늬 섞기)로 하늘 · 빛 번짐 · 그늘 경계를 부드럽게
export const W = 256;
export const H = 144;

// ───────── 색 ─────────
export function hex(c) {
  const h = c.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}
export const toHex = ([r, g, b]) => '#' + [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
export const mix = (a, b, k) => { const x = hex(a); const y = hex(b); return toHex(x.map((v, i) => v + (y[i] - v) * k)); };
export const dk = (c, k = 0.22) => mix(c, '#1c1426', k);
export const lt = (c, k = 0.25) => mix(c, '#fff8ec', k);
export function rng(seed) {
  let s = 0;
  for (const ch of String(seed)) s = (s * 31 + ch.charCodeAt(0)) >>> 0;
  s = s || 9;
  return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
}
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const seg = (t, a, b) => clamp((t - a) / (b - a));
export const ease = (x) => x * x * (3 - 2 * x);
export const lerp = (a, b, k) => a + (b - a) * k;
export const wave = (t, per, amp = 1, ph = 0) => Math.sin((t / per + ph) * Math.PI * 2) * amp;

// ───────── 화면에 바로 그리기 ─────────
export class Px {
  constructor(ctx) { this.g = ctx; this.ox = 0; this.oy = 0; }
  rect(x, y, w, h, c) { if (!c || w <= 0 || h <= 0) return; this.g.fillStyle = c; this.g.fillRect(Math.round(x + this.ox), Math.round(y + this.oy), Math.round(w), Math.round(h)); }
  px(x, y, c) { this.rect(x, y, 1, 1, c); }
  hl(x1, x2, y, c) { this.rect(Math.min(x1, x2), y, Math.abs(x2 - x1) + 1, 1, c); }
  vl(x, y1, y2, c) { this.rect(x, Math.min(y1, y2), 1, Math.abs(y2 - y1) + 1, c); }
  // 체크 무늬: 두 색을 번갈아 (k = 0~1 비율에 맞춰 4단계 무늬)
  dither(x, y, w, h, c1, c2, k = 0.5) {
    x = Math.round(x); y = Math.round(y);
    const M = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
      const th = (M[(y + j) & 3][(x + i) & 3] + 0.5) / 16;
      this.px(x + i, y + j, k > th ? c2 : c1);
    }
  }
  // 위→아래 띠 그라디언트 (띠 사이 경계는 디더)
  bands(y0, y1, cols, x = 0, w = W) {
    const n = cols.length - 1;
    for (let y = y0; y < y1; y++) {
      const q = ((y - y0) / Math.max(1, y1 - y0)) * n;
      const i = Math.min(n - 1, Math.floor(q));
      const f = q - i;
      if (f < 0.35) this.rect(x, y, w, 1, cols[i]);
      else if (f > 0.65) this.rect(x, y, w, 1, cols[i + 1]);
      else this.dither(x, y, w, 1, cols[i], cols[i + 1], (f - 0.35) / 0.3);
    }
  }
  disc(cx, cy, r, c) {
    for (let y = -r; y <= r; y++) {
      const w = Math.floor(Math.sqrt(r * r - y * y) + 0.35);
      this.rect(cx - w, cy + y, w * 2 + 1, 1, c);
    }
  }
  ring(cx, cy, r, c, step = 1) {
    for (let a = 0; a < 360; a += step) this.px(cx + Math.round(Math.cos((a * Math.PI) / 180) * r), cy + Math.round(Math.sin((a * Math.PI) / 180) * r), c);
  }
  // 산 · 언덕: 점 목록으로 윗선을 잇고 아래는 바닥까지 채움
  ridge(pts, c, bottom = H) {
    for (let k = 0; k < pts.length - 1; k++) {
      const [x1, y1] = pts[k];
      const [x2, y2] = pts[k + 1];
      for (let x = Math.round(x1); x < Math.round(x2); x++) {
        const y = Math.round(lerp(y1, y2, (x - x1) / Math.max(1, x2 - x1)));
        this.rect(x, y, 1, bottom - y, c);
      }
    }
  }
  // 반투명으로 그리기 (쉬폰 · 면사포 · 빛 번짐)
  alpha(a, fn) { const o = this.g.globalAlpha; this.g.globalAlpha = o * a; fn(); this.g.globalAlpha = o; }
  line(x1, y1, x2, y2, c) {
    const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
    for (let i = 0; i <= n; i++) this.px(Math.round(lerp(x1, x2, i / n)), Math.round(lerp(y1, y2, i / n)), c);
  }
  blit(spr, x, y, flip = false) {
    const g = this.g;
    for (let j = 0; j < spr.h; j++) for (let i = 0; i < spr.w; i++) {
      const c = spr.d[j * spr.w + i];
      if (!c) continue;
      g.fillStyle = c;
      g.fillRect(Math.round(x + this.ox) + (flip ? spr.w - 1 - i : i), Math.round(y + this.oy) + j, 1, 1);
    }
  }
}

// ───────── 스프라이트 (작은 칸 그림) ─────────
export class Spr {
  constructor(w, h) { this.w = w; this.h = h; this.d = new Array(w * h).fill(null); }
  get(x, y) { return x < 0 || y < 0 || x >= this.w || y >= this.h ? null : this.d[y * this.w + x]; }
  px(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.d[y * this.w + x] = c; }
  rect(x, y, w, h, c) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c); }
  disc(cx, cy, rx, ry, c) {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) this.px(x, y, c);
    }
  }
  line(x1, y1, x2, y2, c, w = 1) {
    const n = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
    for (let i = 0; i <= n; i++) this.rect(Math.round(lerp(x1, x2, i / n)), Math.round(lerp(y1, y2, i / n)), w, w, c);
  }
  // 빈 칸 중 그림과 맞닿은 칸에 외곽선 (맞닿은 색을 아주 어둡게)
  outline(col) {
    const add = [];
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y)) continue;
      const n = this.get(x - 1, y) || this.get(x + 1, y) || this.get(x, y - 1) || this.get(x, y + 1);
      if (n) add.push([x, y, col || mix(n, '#1c1426', 0.78)]);
    }
    add.forEach(([x, y, c]) => this.px(x, y, c));
    return this;
  }
  // 오른쪽 · 아래 가장자리 한 칸을 그늘색으로 (입체감)
  shade(fromCol, toCol) {
    for (let y = 0; y < this.h; y++) for (let x = 0; x < this.w; x++) {
      if (this.get(x, y) !== fromCol) continue;
      if (this.get(x + 1, y) !== fromCol || this.get(x, y + 1) !== fromCol) this.px(x, y, toCol);
    }
    return this;
  }
}
const CACHE = new Map();
export function cached(key, make) {
  if (!CACHE.has(key)) { CACHE.set(key, make()); if (CACHE.size > 600) CACHE.delete(CACHE.keys().next().value); }
  return CACHE.get(key);
}
