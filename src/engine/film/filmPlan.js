// C22 엔딩 크레딧 (원작 1in8b '주마등 필름') - 필름 재료 고르기 · 순서와 시간 계산
// 원작 filmPlan 순서·시간:
//   지도 5.2초 ('그해 지구에서는 약 1억 3천만 명의 아기가…' → '이것은 그중 한 사람의 이야기입니다.' ← 꼭 남길 것, 11/23 동현님)
//   → 제목 4.2초 → 큰 사건 장면 5개까지 (나이대로 나누지 않고 큰 일만 골라 나이순, '제N장' 카드 없음 - 11/23 동현님)
//   → 마지막 3.8초 → 장례 4.6초 → 묘비 6.4초 → 엔딩 크레딧 (함께한 사람들 · 이 이야기에 쓰인 자료) → 끝 2.6초
//   전체는 1분 안팎(62초)을 넘지 않게 장면 시간을 줄임 (11/24 동현님)
// 화면은 웹 크기 가로 16:9 (원작은 휴대폰 세로 9:16)
// 장면 그림은 마을(C08 Village)을 그 나이 모습으로 다시 세워서 씀 (나라 · 장소 · 같이 사는 가족 · 집 · 탈것 · 반려동물)
// 원작처럼 장면 글에 맞는 그림 (FilmScene.jsx, v.scene): 결혼식 · 아이 · 병원 · 떠나보냄 · 이민 · 입학 · 졸업 · 만남 · 상 · 내 집 · 은퇴 …
//   그때 같이 있던 사람(그 나이의 가족)을 같이 세움. 맞는 그림이 없으면 그 나이의 마을
// 사용: const film = buildFilm(result, data)   result = GET /api/result/{lifeId},  data = GET /api/engine/film + wear

export const FILM_W = 1280;  // 필름 크기 (가로 16:9), 글자 크기·자리는 이 크기 기준 px
export const FILM_H = 720;
const LEN_MAX = 62000;       // 1분 안팎 (11/24 동현님, 원작은 2분)
const RD_MAX = 5600;         // 장면 하나 최대 5.6초 (원작 9초)
const CPS = 12;              // 원작 FILM_CPS.ko: 한글 1초에 12자 읽는다고 봄
const MOMENTS = 5;           // 큰 사건 장면 최대 5개 (+ 첫 장면 제목) - 큼직한 것만 (11/24 동현님)
export const CAMS = ['track', 'push', 'tilt', 'track', 'pull'];

export const fa = (v, a, b) => Math.max(0, Math.min(1, (v - a) / (b - a)));
export const easeS = (x) => x * x * (3 - 2 * x);
const readMs = (t) => Math.round((1000 * [...String(t || '')].length) / CPS);

// 받침 있는 글자인지 (조사 고르기)
const hasBatchim = (w) => {
  const c = String(w || '').trim().slice(-1).charCodeAt(0);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
};
const isRieul = (w) => {
  const c = String(w || '').trim().slice(-1).charCodeAt(0);
  return c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 === 8;
};
export const ro = (w) => w + (hasBatchim(w) && !isRieul(w) ? '으로' : '로');
const iga = (w) => w + (hasBatchim(w) ? '이' : '가');

// 원작 albumStages: 어린 시절(0~12) · 10대(13~19) · 20대 · 30대 …
export function stagesOf(age) {
  const s = [[0, Math.min(12, age), '어린 시절']];
  if (age >= 13) s.push([13, Math.min(19, age), '10대']);
  for (let n = 20; n <= age; n += 10) s.push([n, Math.min(n + 9, age), `${n}대`]);
  return s;
}

// ───────── 장면 고르기 ─────────

// 장면으로 안 쓰는 줄 (통계·정보 줄)
const SKIP = [/^\d+세\. 같은 해/, /세계 인구가/, /남긴 재산은/, /^결혼 상대 /, /^만난 사람은 /, /유언장/, /^“/];

// [문장 무늬, 점수, 마을 장소, 장면 그림(FilmScene, 원작 MO.*), 장면 인자]
const RULES = [
  [/결혼식을 올렸/, 10, 'home', 'wedding'],
  [/아이가 태어|아이가 생겼|막내가 태어|첫째|둘째|셋째|넷째/, 9, 'home', 'newborn'],
  [/피란|난민/, 9, null, 'flee'],
  [/이민|새 나라|정착/, 9, null, 'fly'],
  [/세상을 떠나|떠나보/, 7, 'home', 'loss'], // 떠나보내며 · 떠나보냈다
  [/교도소|체포|수감/, 7, null, 'prison'],
  [/각자의 길을 가기로|이혼했/, 7, null, 'rain'],
  [/대학교?에 (입학|합격)|대학원/, 7, 'univ', 'grad', 'uni'],
  [/입학했다/, 6, 'school', 'school'],
  [/대학교?를 졸업/, 6, 'univ', 'grad', 'uni'],
  [/졸업했다/, 6, 'school', 'grad'],
  [/일을 시작했다|취업했|첫 출근|일자리를 얻/, 6, 'work', null, 'cowork'],
  [/내 집|집을 (샀|마련)|이사했/, 6, 'home', 'home'],
  [/은퇴|정년/, 6, 'hall', 'party'],
  [/복권에 당첨|당첨되/, 6, null, 'award'],
  [/승진/, 5, 'work', null, 'cowork'],
  [/자격증/, 5, 'home', 'cert'],
  [/진단을 받았|앓아누|입원|수술|다쳤|사고를 당|병원을 찾|쓰러졌/, 5, 'clinic', 'hosp'],
  [/일자리를 잃|해고|(가게|회사|공장|사업|일터)[^.]{0,10}문을 닫|직장을 그만두게/, 5, 'market', 'rain'], // '방문을 닫고' 는 아님
  [/마음이 통하는 사람|청혼/, 5, 'park', 'date'],
  [/장학금|상을 받|상장|대회에서/, 4, 'school', 'award'],
  [/첫걸음|첫 단어|첫 생일/, 3, 'home'],
  [/여행/, 3, 'park'],
  [/시장|장날/, 2, 'market'],
  [/잔치|명절|모여/, 2, 'hall'],
];
// 문장에 장면 말이 없어도 이벤트 코드로 알아봄 (예: 어머니 별세가 '장례를 치르는 데 …'로만 적힌 해, '뇌졸중으로 앓아누우며')
const ID_RULES = [
  [/^LE_PARENT_DEATH/, 7, 'home', 'loss'],
  [/^LE_MARRIAGE_WIDOW/, 7, 'home', 'loss'],
  [/^LE_DISEASE_/, 5, 'clinic', 'hosp'],
  [/^LE_SUCCESS_LOTTERY/, 6, null, 'award'],
];
const HIST_ID = /^[A-Z]{2,3}_\d{4}/; // 역사 사건 이벤트 (예: IN_1975_EMERGENCY)

function scoreOf(e) {
  const t = e.logText || '';
  if (SKIP.some((re) => re.test(t))) return { s: 0, place: null, scene: null };
  let best = 0;
  let place = null;
  let scene = null;
  let arg = null;
  for (const [re, s, p, sc, ar] of RULES) {
    if (re.test(t) && s > best) { best = s; place = p; scene = sc || null; arg = ar || null; }
  }
  for (const [re, s, p, sc, ar] of ID_RULES) {
    if (re.test(e.eventId || '') && s > best) { best = s; place = p; scene = sc || null; arg = ar || null; }
  }
  if (scene === 'newborn' && /첫째|첫 아이/.test(t)) best += 1; // 첫아이가 늦둥이보다 먼저
  // 역사 사건: 그해 집에서 소식을 듣는 장면 (원작처럼 내 큰일이 있으면 내 일이 먼저)
  if (e.eventId && HIST_ID.test(e.eventId) && best < 3.5) { best = 3.5; scene = 'news'; place = 'home'; }
  if (e.eventId) best += 2;
  // 병원: 누가 아팠는지 / 떠나보냄: 누구를
  if (scene === 'hosp') arg = /아이가|아이를/.test(t) ? 'kid' : /배우자/.test(t) ? 'pt' : /부모님|어머니|아버지/.test(t) ? 'par' : 'me';
  if (scene === 'loss') arg = /배우자/.test(t) || /WIDOW/.test(e.eventId || '') ? 'pt' : /친구/.test(t) ? 'fr' : 'par';
  return { s: best, place, scene, arg };
}

// 장면 글: 돈 괄호 · 맨 앞 '2002년, ' '28세, ' · 맨 앞 이름 빼고, 길면 첫 문장만
export function cleanText(t, name) {
  let s = String(t || '')
    .replace(/\s*\([^()]*원[^()]*\)/g, '')
    .replace(/^\d{4}년,\s*/, '')
    .replace(/^\d+세,\s*/, '')
    .trim();
  if (name) {
    const n = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    s = s.replace(new RegExp('^' + n + '(은|는|이|가|에게)\\s+'), '');
  }
  if (s.length > 64) {
    const i = s.indexOf('. ');
    if (i > 10 && i < 96) s = s.slice(0, i + 1);
  }
  return s;
}

// 큰 사건만: 점수 높은 순으로 7개까지 (같은 나이는 하나, 같은 글은 한 번) → 나이순
//   나이대로 나눠 고르게 뽑지 않음 (11/23 동현님: 큰 사건 위주)
//   같은 장면 그림이 또 나오면 한 번마다 4점씩 깎음 (아이 넷이면 '아이가 태어났다'만 4장 나오던 것 막음)
//   이미 고른 장면과 4년 안쪽이면 하나마다 1점씩 깎음 (81세 인생의 장면 7개가 모두 22세 전에 몰리던 것 막음)
const REPEAT_COST = 4;
const NEAR_COST = 1;
function pickMoments(events, deathAge, name) {
  const cands = [];
  events.forEach((e, idx) => {
    if (e.age < 1) return;
    const { s, place, scene, arg } = scoreOf(e);
    if (s >= 5) cands.push({ a: e.age, t: cleanText(e.logText, name), s, place, scene, arg, idx, id: e.eventId });
  });
  const kindOf = (c) => (c.scene === 'loss' ? 'loss/' + c.arg : c.scene) || (c.arg === 'cowork' ? 'cowork' : c.place) || 'village'; // 부모님 · 배우자 떠나보냄은 다른 장면으로 셈
  const used = {};
  const ages = new Set();
  const texts = new Set();
  const out = [];
  let left = cands;
  while (out.length < MOMENTS) {
    left = left.filter((c) => !ages.has(c.a) && !texts.has(c.t));
    if (!left.length) break;
    const near = (c) => out.filter((o) => Math.abs(o.a - c.a) <= 4);
    const eff = (c) => c.s - REPEAT_COST * (used[kindOf(c)] || 0) - NEAR_COST * near(c).length
      - 3 * near(c).filter((o) => kindOf(o) === kindOf(c)).length; // 같은 장면이 4년 안에 또 (38세 · 39세 아이 장면 연달아) → 더 깎음
    left.sort((x, y) => eff(y) - eff(x) || x.idx - y.idx);
    const c = left[0];
    if (eff(c) < 4) break; // 겹치는 장면만 남았으면 그만 (원래 5점 넘던 것만 들어오므로 4점 밑은 거의 같은 장면 반복)
    ages.add(c.a);
    texts.add(c.t);
    used[kindOf(c)] = (used[kindOf(c)] || 0) + 1;
    out.push(c);
  }
  return out.sort((x, y) => x.idx - y.idx);
}

// ───────── 그 나이의 마을 모습 ─────────

const SIB_RE = /(?:(큰|둘째|셋째|넷째|다섯째|막내)\s?)?(형|오빠|누나|언니|남동생|여동생) (\d+)세/g;
const SIB_SEX = { 형: 'M', 오빠: 'M', 누나: 'F', 언니: 'F', 남동생: 'M', 여동생: 'F' };
const VEHICLES = ['CAR', 'MOTO', 'BIKE'];

function lifeCtx(result, data) {
  const life = data.life || {};
  const D = result.deathAge ?? life.deathAge ?? life.currentAge ?? 0;
  const fam = life.family || [];
  const row = (role) => fam.find((m) => m.role === role);
  const owns = (life.owns || '').split(',').map((s) => s.trim()).filter(Boolean);
  const years = {};
  (result.years || []).forEach((y) => { years[y.age] = y; });

  // 결혼 · 이혼 · 사별 나이, 부모님이 떠나신 나이 (인생 기록 문장 · 이벤트 코드로)
  const marks = [];
  let momAt = null;
  let dadAt = null;
  (result.events || []).forEach((e) => {
    const t = e.logText || '';
    if (/결혼식을 올렸/.test(t)) marks.push([e.age, true]);
    if (/각자의 길을 가기로|이혼했|배우자를 (먼저 )?떠나보|사별/.test(t) || /^LE_MARRIAGE_WIDOW/.test(e.eventId || '')) marks.push([e.age, false]);
    const id = e.eventId || '';
    if (/PARENT_DEATH_MOTHER/.test(id) && momAt == null) momAt = e.age;
    if (/PARENT_DEATH_FATHER/.test(id) && dadAt == null) dadAt = e.age;
  });
  const married = (a) => {
    let m = false;
    marks.forEach(([age, v]) => { if (age <= a) m = v; });
    return m;
  };

  const ind = Object.entries(data.industry || {}).map(([k, v]) => [Number(k), v]).sort((x, y) => x[0] - y[0]);
  const industryAt = (a) => {
    let v = null;
    ind.forEach(([k, s]) => { if (k <= a) v = s; });
    return v;
  };

  const pet = (() => {
    const tok = owns.find((s) => s.startsWith('PET-'));
    if (!tok) return null;
    const [, kind, name, at, span] = tok.split('-');
    if (kind !== 'd' && kind !== 'c') return null;
    return { kind, name, from: Number(at) || 0, to: (Number(at) || 0) + (Number(span) || 12) };
  })();

  // 아이가 태어난 나이: 인생 기록의 출생 이벤트(LE_BIRTH_*)로 (떠난 해 family 의 아이 나이는 1년 덜 먹은 채 남아 있음)
  //   아이 수와 출생 기록 수가 같으면 나이 많은 아이부터 차례로 맞추고, 다르면 거꾸로 센 나이에서 ±1 안의 기록으로 맞춤
  const births = [];
  (result.events || []).forEach((e) => {
    if (/^LE_BIRTH/.test(e.eventId || '') && !births.includes(e.age)) births.push(e.age); // '태어났다' · '아이가 생겼다' 둘 다
  });
  births.sort((x, y) => x - y);
  const kids = fam.filter((m) => (m.role === '아들' || m.role === '딸') && m.age != null);
  const kidBorn = kids.map((m) => D - m.age);
  if (births.length === kids.length) births.forEach((b, i) => { kidBorn[i] = b; });
  else {
    kidBorn.forEach((g, i) => {
      const hit = births.find((b) => Math.abs(b - g) <= 1);
      if (hit != null) kidBorn[i] = hit;
    });
  }

  return { life, D, by: result.birthYear, row, owns, years, married, momAt, dadAt, industryAt, pet, kids, kidBorn };
}

// 부모님 나이 (그 나이 때): 살아 계시면 지금 나이에서 거꾸로, 떠나셨으면 떠나신 나이에서 거꾸로
function parentAt(ctx, role, at, a) {
  const m = ctx.row(role);
  if (!m) return { alive: a < 20, age: 27 + a };
  if (m.alive) return { alive: true, age: m.age != null ? m.age - (ctx.D - a) : 27 + a };
  const goneAt = at ?? (ctx.D >= 20 ? null : ctx.D);
  const alive = goneAt != null ? a < goneAt : a < 20;
  const age = m.age != null && goneAt != null ? m.age - (goneAt - a) : 27 + a;
  return { alive, age };
}

function familyAt(ctx, a, { all = false } = {}) {
  const out = [];
  const life = ctx.life;
  const wed = ctx.married(a);
  const mom = parentAt(ctx, '어머니', ctx.momAt, a);
  const dad = parentAt(ctx, '아버지', ctx.dadAt, a);
  const withParents = !wed && (mom.alive || dad.alive) && a < 30;
  if (withParents || all) {
    if (mom.alive) out.push({ id: 'mom', label: '엄마', gender: 'F', age: mom.age });
    if (dad.alive) out.push({ id: 'dad', label: '아빠', gender: 'M', age: dad.age });
  }
  const sib = ctx.row('형제자매');
  if (sib && (a < 20 || all)) {
    let k = 0;
    for (const [, , w, n] of String(sib.info || sib.job || '').matchAll(SIB_RE)) {
      const sa = Number(n) - (ctx.D - a);
      if (sa >= 0 && (sa < 25 || all)) out.push({ id: 'sib' + k, label: w, gender: SIB_SEX[w], age: sa });
      k += 1;
    }
  }
  if (wed) {
    const sp = ctx.row('배우자');
    out.push({ id: 'spouse', label: life.gender === 'M' ? '아내' : '남편', gender: life.gender === 'M' ? 'F' : 'M', age: sp?.age != null ? sp.age - (ctx.D - a) : a + 2 });
  }
  ctx.kids.forEach((m, kid) => {
    const ka = a - ctx.kidBorn[kid];
    if (ka >= 0 && (all || ka < 30)) out.push({ id: 'kid' + kid, label: m.role, gender: m.role === '아들' ? 'M' : 'F', age: ka });
  });
  return { list: out.slice(0, 10), withParents };
}

function houseAt(ctx, a, withParents) {
  const wc = Math.min(5, Math.max(1, Math.round(ctx.life.originClass || ctx.life.wealthClass || 3)));
  const now = Math.min(5, Math.max(1, Math.round(ctx.life.wealthClass || wc)));
  if (withParents) return { tier: wc, kind: 'parents' };
  if (ctx.owns.includes('HOUSE') && a >= 30) return { tier: Math.max(3, now), kind: 'own' };
  return { tier: Math.min(3, now), kind: 'rent' };
}

// 이 나이에 주로 있던 곳 (장면 글이 장소를 말해 주면 그곳)
function placeAt(ctx, a, hint) {
  const y = ctx.years[a] || {};
  if (hint === 'school' && a >= 19 && (y.eduLevel === 'UNI' || y.eduLevel === 'GRAD')) return 'univ';
  if (hint) return hint;
  if (a < 7) return 'home';
  if (a <= 18 && y.eduLevel && y.eduLevel !== 'NONE' && !y.jobName) return 'school';
  if (a <= 26 && (y.eduLevel === 'UNI' || y.eduLevel === 'GRAD') && !y.jobName) return 'univ';
  if (y.jobName && a < 60) return 'work';
  if (a >= 60) return 'hall';
  return 'home';
}

export function villageAt(ctx, a, hint, opts = {}) {
  const y = ctx.years[a] || ctx.years[a - 1] || {};
  const { list, withParents } = familyAt(ctx, a, opts);
  const place = placeAt(ctx, a, hint);
  const pet = ctx.pet && a >= ctx.pet.from && a < ctx.pet.to ? { kind: ctx.pet.kind, name: ctx.pet.name } : null;
  return {
    countryCode: y.countryCode || ctx.life.currentCountry || ctx.life.birthCountry,
    age: a,
    gender: ctx.life.gender,
    place,
    urban: ctx.life.isUrban === 'Y',
    family: list,
    house: houseAt(ctx, a, withParents),
    vehicle: a >= 30 ? VEHICLES.find((v) => ctx.owns.includes(v)) ?? null : null,
    industry: place === 'work' ? ctx.industryAt(a) : null,
    pet,
  };
}

// 장면 그림 (원작 pxMoment): 그 나이의 가족을 다 넘기고, 장면이 필요한 사람만 골라 세움
//   떠나보낸 해는 떠난 분을 빼고 / 일 시작 · 승진은 마을 일터 + 동료 두 명
const COWORK = [{ gender: 'M', age: 34 }, { gender: 'F', age: 29 }];
//   모든 장면을 장면 그림(FilmScene)으로: 일 시작 · 승진은 'work', 맞는 그림이 없으면 'village' (동네 산책)
function sceneAt(ctx, m) {
  const v = villageAt(ctx, m.a, m.place);
  if (m.arg === 'cowork') return { ...v, scene: 'work', text: m.t, year: ctx.by + m.a, extra: COWORK.map((p) => ({ ...p, age: Math.max(20, m.a + (p.age - 30)) })) };
  if (!m.scene) return { ...v, scene: 'village', text: m.t, year: ctx.by + m.a };
  let family = familyAt(ctx, m.a, { all: true }).list;
  if (m.scene === 'loss' && m.arg === 'par') {
    const goneMom = ctx.momAt === m.a;
    const goneDad = ctx.dadAt === m.a;
    family = family.filter((f) => !(f.id === 'mom' && goneMom) && !(f.id === 'dad' && goneDad));
  }
  return { ...v, scene: m.scene, arg: m.arg, family, text: m.t, year: ctx.by + m.a };
}

// 원작 filmTint: 그해 행복(0~100) → 차가운 파랑 ~ 따뜻한 호박색
export function tintOf(h) {
  const t = h == null ? 0.5 : Math.max(0, Math.min(1, h / 100));
  const a = [52, 96, 120];
  const b = [222, 160, 84];
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

// 원작 filmArch: 오래된 장면일수록 바랜 필름처럼
export const archOf = (D, a) => (D > 0 ? Math.max(0, Math.min(1, ((D - a) / D) * 1.35 - 0.3)) : 0);

// ───────── 글 ─────────

// 원작 filmCast: 함께한 사람들
function castOf(ctx) {
  const out = [];
  const name = (m) => (m && m.name ? ' ' + m.name : '');
  out.push('어머니' + name(ctx.row('어머니')));
  out.push('아버지' + name(ctx.row('아버지')));
  const sib = ctx.row('형제자매');
  if (sib && sib.info && sib.info !== '없음') {
    const words = [...String(sib.info).matchAll(SIB_RE)].map((m) => (m[1] ? m[1] + (m[1] === '큰' ? '' : ' ') : '') + m[2]);
    const n = words.length || Number((/(\d+)명/.exec(sib.info) || [])[1]) || 0;
    if (n) out.push(words.length && words.length <= 4 ? '형제자매 ' + words.join(' · ') : `형제자매 ${n}명`);
  }
  const sp = ctx.row('배우자');
  if (sp && sp.name) out.push('배우자 ' + sp.name);
  (ctx.life.family || []).filter((m) => (m.role === '아들' || m.role === '딸') && m.name).forEach((m) => out.push('자녀 ' + m.name));
  const g = ctx.row('손주');
  const gn = g && Number((/^(\d+)명/.exec(g.info || '') || [])[1]);
  if (gn) out.push(`손주 ${gn}명`);
  return out;
}

function topJob(years) {
  const cnt = {};
  (years || []).forEach((y) => { if (y.jobName) cnt[y.jobName] = (cnt[y.jobName] || 0) + 1; });
  const best = Object.entries(cnt).sort((x, y) => y[1] - x[1])[0];
  return best ? { name: best[0], years: best[1] } : null;
}

function epitaph(r, ctx) {
  const D = ctx.D;
  const born = r.countryName;
  const last = r.currentCountryName || born;
  const out = [];
  if (r.currentCountry && r.currentCountry !== r.birthCountry) out.push(`${born}에서 태어나 ${last}에서 잠들었다.`);
  else if (D < 1) out.push(`${born}에서 태어나 첫돌을 맞지 못했다.`);
  else out.push(`${born}에서 태어나 ${D}년을 살았다.`);
  const job = topJob(r.years);
  if (job) out.push(`${ro(job.name)} ${job.years}년을 일했다.`);
  const w = r.weddingCount || 0;
  const c = r.childCount || 0;
  if (w > 0 && c > 0) out.push(`결혼해 아이 ${c}명을 키웠다.`);
  else if (w > 0) out.push('한 사람과 결혼해 함께 살았다.');
  else if (c > 0) out.push(`아이 ${c}명을 키웠다.`);
  out.push(`날로 치면 약 ${Math.round((D + 0.5) * 365.25).toLocaleString('ko-KR')}일을 살았다.`);
  return out;
}

// 마지막으로 남긴 말 (묘비 '날로 치면' 아래)
//   1. 유언장 '남길 말' 칸에 적은 말 (인생 기록 '유언장 끝에 이렇게 적었다. “…”', 마지막 것)
//   2. 없으면 그 삶에 어울리는 한마디 (가족 · 일 · 이민 · 떠난 나이로 고름)
function lastWords(r, ctx) {
  let will = null;
  (r.events || []).forEach((e) => {
    const m = /유언장 끝에 이렇게 적었다\.\s*“([^”]+)”/.exec(e.logText || '');
    if (m) will = m[1].trim();
  });
  if (will) return { t: will, will: true };
  const D = ctx.D;
  const kids = r.childCount || 0;
  const wed = (r.weddingCount || 0) > 0;
  const job = topJob(r.years);
  const moved = r.currentCountry && r.currentCountry !== r.birthCountry;
  const prison = (r.events || []).some((e) => /교도소|출소/.test(e.logText || ''));
  const eul = (w) => w + (hasBatchim(w) ? '을' : '를');
  let t;
  if (D < 3) t = '잠깐이었지만, 많이 안겨 있었어요.';
  else if (D < 13) t = '조금만 더 놀고 싶었는데. 그래도 다들 고마웠어요.';
  else if (D < 30) t = '하고 싶은 게 아직 많았는데, 그래도 고마웠어요.';
  else if (prison) t = '늦었지만, 다시 살아 볼 수 있어서 다행이었다.';
  else if (moved) t = `떠나온 ${r.countryName}의 하늘도, ${r.currentCountryName}의 하늘도 다 내 하늘이었다.`;
  else if (kids >= 2) t = '아이들아, 너희 덕분에 참 따뜻한 삶이었다.';
  else if (kids === 1) t = '네가 태어난 날이 내 삶에서 가장 좋은 날이었다.';
  else if (wed) t = '당신과 함께여서, 긴 세월이 짧았어요.';
  else if (job && job.years >= 20) t = `평생 ${eul(job.name)} 했지만, 후회는 없다.`;
  else if (D >= 80) t = '오래 살았다. 다들 고마웠다.';
  else t = '평범했지만, 내 몫의 하루들을 잘 살았다.';
  return { t, will: false };
}

function funeralText(r, ctx) {
  const parts = [];
  if (r.marriedYn === 'Y') parts.push('배우자');
  const kids = (ctx.life.family || []).filter((m) => m.role === '아들' || m.role === '딸').length || r.childCount || 0;
  if (kids) parts.push(`자녀 ${kids}명`);
  const g = ctx.row('손주');
  const gn = g && Number((/^(\d+)명/.exec(g.info || '') || [])[1]);
  if (gn) parts.push(`손주 ${gn}명`);
  let attend = null;
  if (parts.length) {
    const head = parts.length > 1 ? parts.slice(0, -1).join(', ') + '와 ' + parts[parts.length - 1] : parts[0];
    attend = `${iga(head)} 곁을 지켰다.`;
  } else {
    const fr = ctx.row('친구');
    const par = ['어머니', '아버지'].some((x) => ctx.row(x)?.alive);
    if (ctx.D < 20 && par) attend = '부모님이 곁을 지켰다.';
    else if (fr && fr.alive) attend = '오랜 친구들이 곁을 지켰다.';
  }
  return { funeral: `가족과 이웃이 모여 ${r.name}의 마지막 길을 배웅했다.`, attend };
}

// ───────── 필름 만들기 ─────────

export function buildFilm(r, data) {
  const ctx = lifeCtx(r, data);
  const D = ctx.D;
  const by = r.birthYear;
  const events = r.events || [];

  // 제목 장면: 태어난 해 첫 줄
  const first = events.find((e) => e.age === 0 && !SKIP.some((re) => re.test(e.logText || '')));
  const titleF = { a: 0, t: first ? cleanText(first.logText, r.name) : `${r.countryName}에서 태어났다.`, place: 'home' };
  const moms = pickMoments(events, D, r.name);

  const cast = castOf(ctx);
  const src = (data.sources || []).filter(Boolean).slice(0, 12);
  const creditsDur = Math.min(5600, 3800 + (cast.length + src.length) * 160);

  const seg = [];
  let n = 0;
  const add = (kind, dur, extra) => { seg.push({ kind, t0: n, t1: n + dur, ...extra }); n += dur; };

  add('map', 5200);
  add('title', 4200, { f: titleF, v: { ...villageAt(ctx, 0, 'home'), scene: 'born', family: familyAt(ctx, 0, { all: true }).list } });

  const u = Math.max(0.78, Math.min(1, 7 / Math.max(1, moms.length)));
  const fixed = 9400 + 3800 + 4600 + 6400 + creditsDur + 2600;
  const F = moms.map((m) => {
    const s = Math.round((4200 + Math.min(800, m.t.length * 7)) * u);
    return [s, Math.max(s, Math.min(RD_MAX, 1850 + readMs(m.t)))];
  });
  const H = F.reduce((x, v) => x + v[0], 0);
  const X = F.reduce((x, v) => x + v[1], 0);
  const M = LEN_MAX - fixed;
  const B = X > M && X > H ? Math.max(0, (M - H) / (X - H)) : 1;
  moms.forEach((m, i) => {
    add('moment', Math.round(F[i][0] + (F[i][1] - F[i][0]) * B), {
      f: m,
      v: sceneAt(ctx, m),
      cam: CAMS[i % CAMS.length],
      dir: i % 2 ? 1 : -1,
    });
  });

  // 마지막 장면: 사고 · 재해 · 폭력 등 갑작스러운 죽음이면 침대 대신 '빈자리' (FilmScene last · sudden)
  const sudden = /사고|손상|재해|재난|살해|폭력|전쟁|분쟁|익사|추락|화재|자살/.test(r.deathCause || '');
  add('death', 3800, { v: { ...villageAt(ctx, D, 'home'), scene: 'last', arg: sudden ? 'sudden' : null, family: familyAt(ctx, D, { all: true }).list } });
  add('funeral', 4600, { v: { ...villageAt(ctx, D, 'home', { all: true }), pet: null, scene: 'funeral' } });
  add('epi', 6400); // 묘비 + 마지막으로 남긴 말
  add('credits', creditsDur, { cast, src });
  add('end', 2600);

  const hap = {};
  (r.years || []).forEach((y) => { hap[y.age] = y.happiness; });
  const { funeral, attend } = funeralText(r, ctx);

  return {
    seg,
    dur: n,
    name: r.name,
    by,
    age: D,
    birthCountry: r.birthCountry,
    countryName: r.countryName,
    histName: r.histName && r.histName !== r.countryName ? r.histName : null,
    head: `${by + D}년, ${D}세`,
    died: r.deathCause ? `${ro(r.deathCause)} 세상을 떠났다.` : '세상을 떠났다.',
    funeral,
    attend,
    epi: epitaph(r, ctx),
    quote: lastWords(r, ctx),
    hap,
    placeName: (code) => (code && code === r.currentCountry ? r.currentCountryName : r.countryName),
  };
}
