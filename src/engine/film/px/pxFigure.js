// C22 엔딩 크레딧 사람 그림 = 마을 사람 그림(윤아님 Figure)을 그대로 픽셀 칸에 옮겨 찍은 것
// - Figure 를 import 해서 그린 결과(rect 들)를 읽어 18 × 27 칸에 그대로 찍음 → 생김새 · 착장(C21) · 윤아님이 고친 것까지 게임과 똑같음
//   (Figure 파일은 건드리지 않음, 읽어서 쓰기만)
// - 엔딩용으로 여기서만 더하는 것: 자세(팔 · 다리), 고개 숙임, 눈 감기 · 바라보는 쪽, 나이에 따라 키 줄이기, 눕기
// 사용: const f = figure({ look, age, pose, face, gaze })  →  px.blit(f.spr, x - f.fx, y - f.fy)  (발 가운데가 x, y)
//   pose: stand · walk1 · walk2 · up · wave1 · wave2 · clap1 · clap2 · hold · bow · sit
//   face: open · closed (눈 감음, 울 때도) / gaze: -1 왼쪽 · 0 앞 · 1 오른쪽 보기
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Figure from '../../village/Figure';
import { lookOf } from '../../village/costumeData';
import { Spr, cached } from './pxCore';

const OX = 2; // 칸 여백 (팔을 들면 위로, 옆으로 나감)
const OY = 6;
const GW = 18 + OX * 2;
const GH = 27 + OY + 1;
const OUT = '#2e2a33';

// Figure 그림 → [{ part, x, y, w, h, c }] (part: back · legA · legB · armA · armB · body · head · eye · hat)
function parse(look) {
  const svg = renderToStaticMarkup(createElement(Figure, { look }));
  const out = [];
  const stack = [];
  let afterBody = false;
  const re = /<g(?: class="([^"]*)")?>|<\/g>|<rect ([^>]*?)\/?>(?:<\/rect>)?/g;
  let m;
  while ((m = re.exec(svg))) {
    // 이름 없는 <g> 중 첫 번째만 몸(옷), 그 뒤(머리카락 · 모자)는 머리
    if (m[0].startsWith('<g')) { stack.push(m[1] || (afterBody || stack.includes('body') ? 'head' : 'body')); continue; }
    if (m[0] === '</g>') { if (stack.pop() === 'body') afterBody = true; continue; }
    const a = {};
    m[2].replace(/([a-z-]+)="([^"]*)"/g, (_, k, v) => { a[k] = v; });
    const r = { x: +a.x || 0, y: +a.y || 0, w: +(a.width || 1), h: +(a.height || 1), c: a.fill, o: a.opacity ? +a.opacity : 1 };
    const g = stack[stack.length - 1];
    let part;
    if (g === 'fa leg') part = 'legA';
    else if (g === 'fb leg') part = 'legB';
    else if (g === 'fa arm') part = 'armA';
    else if (g === 'fb arm') part = 'armB';
    else if (g === 'body') part = 'body';
    else if (g === 'head') part = 'head';
    else if (!afterBody && !g) part = 'back';           // 긴 머리 뒷부분
    else if (r.c === OUT && r.w === 1 && r.h === 2 && r.y === 7 && (r.x === 6 || r.x === 11)) part = 'eye';
    else part = 'head';
    out.push({ part, ...r });
  }
  return out;
}

// 칸 회전 (어깨를 축으로 팔 돌리기)
const rot180 = (r, px, py) => ({ ...r, x: 2 * px - r.x - r.w, y: 2 * py - r.y - r.h });
const rotIn = (r, px, py, side) => (side < 0
  ? { ...r, x: px + (r.y - py), y: py - (r.x + r.w - px), w: r.h, h: r.w }      // 왼팔 → 몸 앞(오른쪽)으로
  : { ...r, x: px - (r.y + r.h - py), y: py + (r.x - px), w: r.h, h: r.w });     // 오른팔 → 몸 앞(왼쪽)으로
const move = (r, dx, dy) => ({ ...r, x: r.x + dx, y: r.y + dy });

const SHOULDER_A = [3, 14];
const SHOULDER_B = [15, 14];

// 나이에 따라 빼는 줄 (Figure y 좌표) - 발은 그대로, 위쪽이 내려옴
const CUT = { baby: [15, 16, 17, 18, 21, 22], kid: [16, 17, 22], teen: [17], adult: [], elder: [] };

//   back: 뒷모습 (얼굴 칸을 머리색으로 덮음 - 장례식 조문객처럼 앞을 보고 선 사람)
export function figure({ look, gender = 'F', age = 30, costume, soft = false, pose = 'stand', face = 'open', gaze = 0, back = false }) {
  const lk = look || lookOf({ gender, age, costume, soft });
  const group = lk.group || 'adult';
  const key = JSON.stringify([lk, pose, face, gaze, back]);
  return cached('fig' + key, () => {
    let rs = parse(lk);
    const bow = pose === 'bow';
    rs = rs.map((r) => {
      let q = r;
      // 다리 · 팔 자세
      if (pose === 'walk1') { if (r.part === 'legA') q = move(r, 1, -1); if (r.part === 'armB') q = move(r, 0, -1); }
      if (pose === 'walk2') { if (r.part === 'legB') q = move(r, -1, -1); if (r.part === 'armA') q = move(r, 0, -1); }
      if (pose === 'up') { if (r.part === 'armA') q = rot180(r, ...SHOULDER_A); if (r.part === 'armB') q = rot180(r, ...SHOULDER_B); }
      if (pose === 'wave1' && r.part === 'armB') q = rot180(r, ...SHOULDER_B);
      if (pose === 'wave2' && r.part === 'armB') q = move(rot180(r, ...SHOULDER_B), 1, 1);
      if (pose === 'clap1') { if (r.part === 'armA') q = move(rotIn(r, ...SHOULDER_A, -1), 0, 2); if (r.part === 'armB') q = move(rotIn(r, ...SHOULDER_B, 1), 0, 2); }
      if (pose === 'hold') { if (r.part === 'armA') q = move(rotIn(r, ...SHOULDER_A, -1), 0, 4); if (r.part === 'armB') q = move(rotIn(r, ...SHOULDER_B, 1), 0, 4); }
      if (pose === 'sit' && (r.part === 'legA' || r.part === 'legB')) q = { ...r, h: Math.max(1, r.h - 2) };
      // 고개 숙임: 머리 전체가 한 칸 내려옴
      if (bow && (r.part === 'head' || r.part === 'eye' || r.part === 'back')) q = move(q, 0, 1);
      return q;
    });
    // 눈: 감기 / 바라보는 쪽
    rs = rs.flatMap((r) => {
      if (r.part !== 'eye') return [r];
      const dx = gaze;
      if (face === 'closed' || bow) return [{ ...r, x: r.x - 1 + dx, y: r.y + 1, w: 2, h: 1 }];
      return [move(r, dx, 0)];
    });
    if (back) {
      const hc = (lk.hair && lk.hair.color) || '#3a2c26';
      rs = rs.filter((r) => r.part !== 'eye').map((r) => (r.part === 'head' && r.c !== OUT ? { ...r, c: hc } : r));
    }
    // 칸에 찍기 (팔은 몸 뒤 · 앞 순서: Figure 순서 그대로, 앞으로 모은 팔은 몸 위에)
    const front = pose === 'clap1' || pose === 'hold';
    const order = (r) => (r.part === 'back' ? 0 : r.part.startsWith('leg') ? 1 : r.part.startsWith('arm') ? (front ? 3 : 2) : r.part === 'body' ? 2.5 : 4);
    rs.sort((a, b) => order(a) - order(b));
    let s = new Spr(GW, GH);
    rs.forEach((r) => { if (r.o >= 0.5) s.rect(r.x + OX, r.y + 2 + OY, r.w, r.h, r.c); });
    // 나이에 따라 줄 빼기
    const cut = (CUT[group] || []).map((y) => y + 2 + OY);
    if (cut.length) {
      const n = new Spr(GW, GH);
      for (let y = 0; y < GH; y++) {
        if (cut.includes(y)) continue;
        const ny = y + cut.filter((c) => c > y).length;
        for (let x = 0; x < GW; x++) n.d[ny * GW + x] = s.d[y * GW + x];
      }
      s = n;
    }
    const feet = 24 + 2 + OY + 1; // Figure 발 아래 + 1
    const top = (bow ? 1 : 0) + OY + cut.length;
    const eyeY = 7 + 2 + OY + cut.length + (bow ? 1 : 0);
    return { spr: s, fx: 9 + OX, fy: feet, head: top, eyes: [[6 + OX + gaze, eyeY], [11 + OX + gaze, eyeY]], group };
  });
}

// 누운 사람 (머리 왼쪽, 눈 감음)
export function lyingFig(opts) {
  const f = figure({ ...opts, pose: 'stand', face: 'closed' });
  return cached('lieF' + JSON.stringify(opts), () => {
    const a = f.spr;
    const s = new Spr(a.h, a.w);
    for (let y = 0; y < a.h; y++) for (let x = 0; x < a.w; x++) s.d[(a.w - 1 - x) * s.w + y] = a.d[y * a.w + x];
    return { spr: s, fx: f.fy, fy: a.w - 1 - f.fx }; // 발 = x, 몸 가운데 줄 = y
  });
}

export { lookOf };
