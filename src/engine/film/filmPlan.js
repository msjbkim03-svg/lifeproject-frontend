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
const MOMENTS = 7;           // 큰 사건 장면 최대 7개 (+ 첫 장면 제목). 입학 · 졸업 · 일 · 결혼은 꼭 넣고 나머지를 큰 일로 채움 (11/25 동현님)
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
const SKIP = [/^\d+세\. 같은 해/, /세계 인구가/, /남긴 재산은/, /^결혼 상대 /, /^만난 사람은 /, /유언장/, /^“/, /\?\s*$/, /기회가 생겼다/]; // 고르기 전 질문('어떻게 할까?') · 기회만 생긴 줄은 결과가 아니라서 뺌 (11/25)

// [문장 무늬, 점수, 마을 장소, 장면 그림(FilmScene, 원작 MO.*), 장면 인자]
const RULES = [
  [/결혼식을 올렸/, 10, 'home', 'wedding'],
  [/아이가 태어|아이가 생겼|막내가 태어|첫째|둘째|셋째|넷째/, 9, 'home', 'newborn'],
  [/피란|난민/, 9, null, 'flee'],
  [/이민|새 나라|정착|^\d{4}년, [^.]{1,30}(으로|로) 떠났다\.|나라로 건너갔/, 9, null, 'fly'], // 엔진 이민 문장: '2003년, ○○는 키르기스스탄으로 떠났다.' · '가족이 있는 나라로 건너갔다.' ('짐을 꾸려 도시로 떠났다'는 나라 안 이사라 뺌, 11/25)
  [/세상을 떠나|떠나보/, 7, 'home', 'loss'], // 떠나보내며 · 떠나보냈다
  [/교도소|체포|수감/, 7, null, 'prison'],
  [/이혼했|^(?![^.]*연인)[^.]*각자의 길을 가기로/, 7, null, 'rain'], // 이혼만: 부부의 '각자의 길' (연인과 헤어짐 '연인과 각자의 길'은 뺌, 11/25 동현님)
  [/대학교?에 (입학|합격)|대학원/, 7, 'univ', 'grad', 'uni'],
  [/입학했다/, 6, 'school', 'school'],
  [/대학교?를 졸업/, 6, 'univ', 'grad', 'uni'],
  [/졸업했다/, 6, 'school', 'grad'],
  [/일을 시작했다|취업했|첫 출근|일자리를 얻/, 6, 'work', null, 'cowork'],
  [/내 집|집을 (샀|마련)/, 6, 'home', 'home'],
  [/은퇴|정년/, 6, 'hall', 'party'],
  [/복권에 당첨|당첨되/, 6, null, 'award'],
  [/승진/, 5, 'work', null, 'cowork'],
  // 자격증 · 작은 상 · 단순 이사 · 가벼운 병은 장면으로 안 씀 (11/25 동현님: 사소한 것 빼기)
  [/진단을 받았|앓아누|입원|수술|다쳤|사고를 당|병원을 찾|쓰러졌/, 5, 'clinic', 'hosp'],
  [/일자리를 잃|해고|(가게|회사|공장|사업|일터)[^.]{0,10}문을 닫|직장을 그만두게/, 5, 'market', 'rain'], // '방문을 닫고' 는 아님
  [/청혼을 받았|청혼했/, 6, 'park', 'date'], // '마음이 통하는 사람을 만났다'는 뺌, 청혼만 (11/25 동현님)
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
  [/^LE_LOVE_PROPOSAL/, 6, 'park', 'date'],
];
const HIST_ID = /^[A-Z]{2,3}_\d{4}/; // 역사 사건 이벤트 (예: IN_1975_EMERGENCY)
// 이혼인 줄: '이혼했다' · 부부의 '각자의 길' · 부부 위기(LE_MARRIAGE_CRISIS) 끝에 '헤어졌다' (11/25 동현님: 이혼 장면 없이 청혼이 나오던 것)
//   연인과 헤어짐('연인과 각자의 길' · LE_LOVE_BREAKUP)은 이혼 아님
const isDivorce = (e) => {
  const t = e.logText || '';
  if (/연인/.test(t)) return false;
  if (/이혼했|각자의 길을 가기로/.test(t)) return true;
  return /^LE_MARRIAGE_/.test(e.eventId || '') && !/WIDOW/.test(e.eventId || '') && /헤어졌|갈라섰|헤어지기로/.test(t);
};
// 미루거나 거절한 청혼 (그해 같은 이벤트 줄에 '미루기로' 등) → 청혼 장면으로 안 씀. 받아들인 청혼은 그해 결혼식 장면으로 나옴
const PUT_OFF = /미루기로|천천히 생각|거절|받아들이지 않/;

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
  if (isDivorce(e) && best < 7) { best = 7; place = null; scene = 'rain'; arg = null; }
  if (scene === 'party' && /은퇴하지 않|더 일하기로|다시 고용|계약직으로/.test(t)) return { s: 0, place: null, scene: null }; // 은퇴를 미룬 줄 (자막 '손을 내려놓았다'와 어긋남)
  if (scene === 'fly' && HIST_ID.test(e.eventId || '')) scene = 'flee'; // 역사 사건(전쟁 · 분쟁)으로 나라를 떠남 = 피란
  // 역사 사건: 그해 집에서 소식을 듣는 장면 (원작처럼 내 큰일이 있으면 내 일이 먼저)
  if (e.eventId && HIST_ID.test(e.eventId) && best < 3.5) { best = 3.5; scene = 'news'; place = 'home'; }
  if (e.eventId) best += 2;
  // 병원: 누가 아팠는지 / 떠나보냄: 누구를
  if (scene === 'hosp' && (e.age ?? 0) < 18) return { s: 0, place: null, scene: null }; // 어린 시절 병(홍역 · 설사병 …)은 장면으로 안 씀 (11/25 동현님)
  if (scene === 'hosp' && !/암|뇌졸중|심장|수술|쓰러졌|사고를 당|다쳤|CANCER|STROKE|HEART|ACCIDENT/.test(t + (e.eventId || ''))) return { s: 0, place: null, scene: null }; // 어른도 큰 병 · 사고만 (폐렴 · 결핵 · 당뇨 같은 병은 뺌)
  if (scene === 'hosp') best -= 1; // 어른 병도 뒤로 (마지막 장면이 이미 병실일 때가 많음)
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
    s = s.replace(new RegExp('([,.!]?\\s)' + n + '(은|는|이|가)\\s+', 'g'), '$1'); // '떠나시자 정하이는 깊은 슬픔에' → '떠나시자 깊은 슬픔에'
  }
  if (s.length > 64) {
    const i = s.indexOf('. ');
    if (i > 10 && i < 96) s = s.slice(0, i + 1);
  }
  return s;
}

// 장면 자막 둘째 줄 (11/25 동현님: 자막이 부실함 → 오후: 숫자만 늘어놓지 말고 감성적으로)
//   사실(햇수 · 이름 · 나이)은 그대로 넣고, 그 사건이 마음에 남긴 것을 한마디로. 한 줄(30자 안팎)
const ORD = ['첫째', '둘째', '셋째', '넷째', '다섯째', '여섯째', '일곱째', '여덟째'];
const wa = (w) => w + (hasBatchim(w) ? '과' : '와');
const pick = (a, list) => list[Math.abs(a) % list.length]; // 같은 인생에서 같은 말이 겹치지 않게 나이로 고름
function subOf(ctx, r, m, raw) {
  const a = m.a;
  const D = ctx.D;
  const wedAts = ctx.marks.filter(([, v]) => v).map(([x]) => x);
  const endMark = (from) => ctx.marks.find(([x, v]) => !v && x > from); // 결혼이 끝난 때 (이혼 · 사별)
  const endOf = (from) => { const e = endMark(from); return e ? e[0] : D; }; // 없으면 떠난 나이
  const spName = (at = a) => { // at 나이에 결혼한 사람 (결혼 상대 소개 줄 → 없으면 가족 칸 배우자, 한 번 결혼했을 때만)
    const w = ctx.spAt.filter(([x]) => x <= at).pop();
    if (w) return w[1];
    const sp = ctx.row('배우자');
    return wedAts.length === 1 && sp && sp.name ? sp.name : null;
  };
  const kidsBy = ctx.kids.map((k, i) => ({ k, b: ctx.kidBorn[i] })).sort((x, y) => x.b - y.b);
  if (m.arg === 'cowork') {
    const job = jobAt(ctx, a, m.t);
    const n = Object.values(ctx.years).filter((y) => y.jobName === job && y.age >= a && y.age < ctx.retAt).length;
    if (!job || n < 2) return null;
    return pick(a, [`그 뒤로 ${n}년, 이 일이 우리 집을 먹여 살렸다.`, `그렇게 시작한 일이 ${n}년이 되었다.`, `${n}년 동안 매일 아침 이 길로 나섰다.`]);
  }
  switch (m.scene) {
    case 'wedding': {
      const n = endOf(a) - a;
      const nm = spName();
      if (n < 1) return null;
      const who = nm ? wa(nm) + ' ' : '';
      const div = (endMark(a) || [])[2] === 'div'; // 이혼으로 끝났으면 '평생'이라 하지 않음
      if (n >= 30 && !div) return nm ? `${who}${n}년, 평생을 함께 걸었다.` : `${n}년, 한 사람과 평생을 함께 걸었다.`;
      return `${who}함께한 ${n}년이 여기서 시작됐다.`;
    }
    case 'newborn': {
      const i = kidsBy.findIndex((x) => x.b === a);
      if (i < 0) return null;
      const nm = kidsBy[i].k.name ? kidsBy[i].k.name.split(' ')[0] : null;
      if (!nm) return null;
      const o = ORD[i] || i + 1 + '번째';
      if (i === 0) return `${o} ${nm}. 작은 손이 내 손가락을 꼭 쥐었다.`;
      if (i === 1) return `${o} ${nm}. 집이 한결 시끌벅적해졌다.`;
      return pick(a, [`${o} ${nm}. 밥상에 숟가락이 하나 늘었다.`, `${o} ${nm}. 웃음소리가 또 하나 늘었다.`]);
    }
    case 'loss': {
      if (m.arg === 'pt') {
        const st = wedAts.filter((x) => x <= a).pop();
        const nm = st != null ? spName(st) : null;
        if (st == null || a - st < 1) return '빈자리는 끝내 채워지지 않았다.';
        return `${nm ? wa(nm) + ' ' : '함께한 '}${a - st}년. 빈자리는 끝내 채워지지 않았다.`;
      }
      if (m.arg === 'par') {
        const who = /어머니/.test(m.t) && !/아버지/.test(m.t) ? ['어머니', ctx.momAt] : /아버지/.test(m.t) && !/어머니/.test(m.t) ? ['아버지', ctx.dadAt] : null;
        const last = /마저/.test(m.t); // 두 분 다 떠나심
        if (!who) return last ? '이제 돌아갈 집이 조용해졌다.' : null;
        const p = parentAt(ctx, who[0], who[1], a);
        if (a < 6) return `${who[0]}의 얼굴은 사진으로만 남았다.`;
        if (a < 13) return `${who[0]}의 얼굴은 흐릿하게만 남았다.`;
        const ages = p.age >= 25 && p.age <= 115 ? `${who[0]} ${p.age}세, 나는 ${a}세. ` : '';
        return ages + (last ? '이제 기댈 어른이 없었다.' : pick(a, ['그날 집이 유난히 넓었다.', '한동안 그 목소리가 귀에 남았다.']));
      }
      return null;
    }
    case 'fly':
      return r.currentCountry && r.currentCountry !== r.birthCountry ? `${r.countryName}의 하늘을 뒤로하고, ${r.currentCountryName}에서 다시 시작했다.` : null;
    case 'flee':
      return r.currentCountry && r.currentCountry !== r.birthCountry ? `살던 집을 두고 ${ro(r.currentCountryName)}. 다시 돌아가지 못했다.` : '살던 집을 두고 길을 떠났다.';
    case 'grad':
      if (m.arg === 'uni') return '배운 것이 평생의 밑천이 되었다.';
      return a <= 13 ? '책가방을 내려놓고 일할 나이가 되었다.' : '교복을 벗고 어른이 되었다.';
    case 'school':
      return '교실에 앉아 있던 날은 길지 않았다.';
    case 'rain': {
      if (!isDivorce({ logText: raw || m.t, eventId: m.id })) return null;
      const st = wedAts.filter((x) => x <= a).pop();
      return st != null && a - st >= 1 ? `${a - st}년의 약속이 여기서 끝났다.` : '같은 지붕 아래의 날들이 끝났다.';
    }
    case 'party': {
      const named = /^(.+?) 일을 마치고/.exec(m.t); // '소농 (자급 농사) 일을 마치고 은퇴했다' → 그 일로 셈 (가장 오래 한 일과 다를 때가 있음)
      if (named) {
        const nm = named[1].replace(/\s*\([^()]*\)\s*$/, '');
        const n = Object.values(ctx.years).filter((y) => y.age < a && (y.jobName || '').startsWith(nm)).length; // 은퇴한 뒤 해는 빼고
        if (n >= 2) return `${ro(nm)} ${n}년. 이제야 손을 내려놓았다.`;
      }
      const j = named ? null : topJob(Object.values(ctx.years), ctx.retAt);
      return j ? `${ro(j.name)} ${j.years}년. 이제야 손을 내려놓았다.` : '오래 쥐고 있던 손을 이제야 내려놓았다.';
    }
    case 'award': {
      const w = /\(\+([^)]*원)\)/.exec(raw || '');
      if (!w) return null;
      const eok = /([\d.]+)억/.exec(w[1]);
      const man = /([\d,]+)만/.exec(w[1]);
      const v = (eok ? parseFloat(eok[1]) * 10000 : 0) + (man ? parseInt(man[1].replace(/,/g, ''), 10) : 0); // 만 원 단위
      return `약 ${w[1]}. ` + (v >= 10000 ? '하루아침에 삶이 달라졌다.' : v >= 1000 ? '뜻밖의 행운에 한참을 웃었다.' : '작은 행운이 찾아왔다.');
    }
    case 'date': { const w = /([가-힣]+(?: [가-힣]+)?), (\d+)세 ([^.]*?(?:남성|여성))/.exec(raw || ''); return w ? `${w[1]}, ${w[2]}세 ${w[3]}. 마음이 크게 흔들렸다.` : null; }
    case 'home': return /실패|손해/.test(raw || '') ? null : '처음으로 내 집 문을 내 열쇠로 열었다.';
    default: return null;
  }
}

// 큰 사건만: 점수 높은 순으로 7개까지 (같은 나이는 하나, 같은 글은 한 번) → 나이순
//   나이대로 나눠 고르게 뽑지 않음 (11/23 동현님: 큰 사건 위주)
//   같은 장면 그림이 또 나오면 한 번마다 4점씩 깎음 (아이 넷이면 '아이가 태어났다'만 4장 나오던 것 막음)
//   이미 고른 장면과 4년 안쪽이면 하나마다 1점씩 깎음 (81세 인생의 장면 7개가 모두 22세 전에 몰리던 것 막음)
const REPEAT_COST = 4;
const NEAR_COST = 1;
function pickMoments(events, deathAge, name, years = [], retAt = 999) {
  const cands = [];
  const putOff = new Set(events.filter((e) => /^LE_LOVE_PROPOSAL/.test(e.eventId || '') && PUT_OFF.test(e.logText || '')).map((e) => e.age)); // 청혼을 미룬 나이
  events.forEach((e, idx) => {
    if (e.age < 1) return;
    const { s, place, scene, arg } = scoreOf(e);
    if (scene === 'date' && putOff.has(e.age)) return; // 미룬 · 거절한 청혼은 큰 사건 아님
    if (scene === 'date' && events.some((x) => x.age === e.age && /결혼식을 올렸/.test(x.logText || ''))) return; // 받아들인 청혼은 그해 결혼식 장면으로
    let t = cleanText(e.logText, name);
    if (scene === 'wedding' && events.some((x) => x.age < e.age && /결혼식을 올렸/.test(x.logText || ''))) t = '다시 한번, ' + t; // 재혼 (첫 결혼식과 글이 같아서 빠지던 것)
    if (s >= 5) cands.push({ a: e.age, t, s, place, scene, arg, idx, id: e.eventId });
  });
  const kindOf = (c) => (c.scene === 'loss' ? 'loss/' + c.arg : c.scene) || (c.arg === 'cowork' ? 'cowork' : c.place) || 'village'; // 부모님 · 배우자 떠나보냄은 다른 장면으로 셈

  // ① 꼭 넣는 장면 (11/25 동현님): 학교 하나 · 가장 오래 한 일 · 결혼식
  //   학교는 한 장면만: 졸업했으면 가장 높은 졸업, 졸업 못 했으면 입학, 학교를 못 갔으면 없음 (입학 7세 · 졸업 13세가 연달아 나오던 것)
  const must = [];
  const ev = (re) => events.map((e, idx) => ({ e, idx })).filter(({ e }) => e.age >= 1 && re.test(e.logText || ''));
  const asMoment = ({ e, idx }, scene, place, arg = null) => ({ a: e.age, t: cleanText(e.logText, name), s: 99, place, scene, arg, idx, id: e.eventId });
  const grads = ev(/(초등학교|중학교|고등학교|대학교|대학원)를 졸업했다/);
  const grad = grads[grads.length - 1]; // 가장 높은 학교 졸업
  const enter = ev(/학교에 입학했다/)[0];
  if (grad) { const uni = /대학/.test(grad.e.logText); must.push(asMoment(grad, 'grad', uni ? 'univ' : 'school', uni ? 'uni' : null)); }
  else if (enter) must.push(asMoment(enter, 'school', 'school'));
  const job = topJob(years, retAt);
  if (job && job.years >= 2) {
    const start = ev(/일을 시작했다/).find(({ e }) => (e.logText || '').includes(job.name)); // job.name 은 괄호를 뺀 이름 ('소농')
    if (start) must.push(asMoment(start, null, 'work', 'cowork'));
    else { // 시작 기록이 없으면 그 일을 처음 한 해
      const y0 = (years || []).filter((y) => (y.jobName || '').startsWith(job.name)).sort((x, y) => x.age - y.age)[0];
      const idx = events.findIndex((e) => e.age >= y0.age);
      must.push({ a: y0.age, t: `${job.name} 일을 하며 살았다.`, s: 99, place: 'work', scene: null, arg: 'cowork', idx: idx < 0 ? events.length : idx - 0.5 });
    }
  }
  const wed = ev(/결혼식을 올렸/)[0];
  if (wed) must.push(asMoment(wed, 'wedding', 'home'));

  // ② 나머지는 큰 사건 점수 순으로 채움 (같은 나이 · 같은 글은 한 번, 같은 장면 반복 · 가까운 나이는 깎음)
  //   같은 장면 그림이 또 나오면 한 번마다 4점씩 깎음 (아이 넷이면 '아이가 태어났다'만 4장 나오던 것 막음)
  //   이미 고른 장면과 4년 안쪽이면 하나마다 1점씩 깎음 (81세 인생의 장면이 모두 22세 전에 몰리던 것 막음)
  const used = {};
  const ages = new Set();
  const texts = new Set();
  const out = [];
  must.forEach((c) => { if (out.length < MOMENTS && !texts.has(c.t)) { out.push(c); ages.add(c.a); texts.add(c.t); used[kindOf(c)] = (used[kindOf(c)] || 0) + 1; } });
  const mustIdx = new Set(must.map((c) => c.idx));
  let left = cands.filter((c) => !mustIdx.has(c.idx) && !(c.scene === 'wedding' && wed && c.a === wed.e.age) && !(c.arg === 'cowork' && job) && !['school', 'grad'].includes(c.scene));
  while (out.length < MOMENTS) {
    left = left.filter((c) => !ages.has(c.a) && !texts.has(c.t));
    if (!left.length) break;
    const near = (c) => out.filter((o) => Math.abs(o.a - c.a) <= 4);
    const eff = (c) => c.s - REPEAT_COST * (used[kindOf(c)] || 0) - NEAR_COST * near(c).length
      - 3 * near(c).filter((o) => kindOf(o) === kindOf(c)).length; // 같은 장면이 4년 안에 또 (38세 · 39세 아이 장면 연달아) → 더 깎음
    left.sort((x, y) => eff(y) - eff(x) || x.idx - y.idx);
    const c = left[0];
    if (eff(c) < 4) break; // 겹치는 장면만 남았으면 그만
    ages.add(c.a);
    texts.add(c.t);
    used[kindOf(c)] = (used[kindOf(c)] || 0) + 1;
    out.push(c);
  }
  return out.sort((x, y) => x.a - y.a || x.idx - y.idx);
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
  const spAt = [];
  let momAt = null;
  let dadAt = null;
  (result.events || []).forEach((e) => {
    const t = e.logText || '';
    if (/결혼식을 올렸/.test(t)) marks.push([e.age, true]);
    if (isDivorce(e)) marks.push([e.age, false, 'div']);
    else if (/배우자를 (먼저 )?떠나보|사별/.test(t) || /^LE_MARRIAGE_WIDOW/.test(e.eventId || '')) marks.push([e.age, false, 'wid']);
    const sp = /^결혼 상대 ([^:]+):/.exec(t); // 그해 결혼한 사람 이름 (재혼 · 사별 뒤에도 이름을 알 수 있게)
    if (sp) spAt.push([e.age, sp[1].trim()]);
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

  return { life, D, by: result.birthYear, row, owns, years, married, marks, spAt, momAt, dadAt, industryAt, pet, kids, kidBorn };
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
// 그 해에 시작한 일 이름: 인생 기록 문장('노점상·소상인 일을 시작했다')에서, 없으면 그 뒤 몇 해의 직업 이름
//   (직업 · 산업 기록은 일을 시작한 해보다 한두 해 늦게 찍혀서 그 해만 보면 비어 있음)
function jobAt(ctx, a, t) {
  const m = /([^.]*?)\s*일을 시작/.exec(t || '');
  if (m && m[1].trim()) return m[1].trim();
  for (let d = 0; d <= 3; d++) { const y = ctx.years[a + d]; if (y && y.jobName) return y.jobName; }
  return null;
}
function industryNear(ctx, a) {
  for (let d = 0; d <= 3; d++) { const s = ctx.industryAt(a + d); if (s) return s; }
  return null;
}
function sceneAt(ctx, m) {
  const v = villageAt(ctx, m.a, m.place);
  if (m.arg === 'cowork') return { ...v, scene: 'work', text: m.t, year: ctx.by + m.a, job: jobAt(ctx, m.a, m.t), industry: v.industry || industryNear(ctx, m.a), extra: COWORK.map((p) => ({ ...p, age: Math.max(20, m.a + (p.age - 30)) })) };
  if (!m.scene) return { ...v, scene: 'village', text: m.t, year: ctx.by + m.a };
  let family = familyAt(ctx, m.a, { all: true }).list;
  if (m.scene === 'loss' && m.arg === 'par') {
    const goneMom = ctx.momAt === m.a;
    const goneDad = ctx.dadAt === m.a;
    family = family.filter((f) => !(f.id === 'mom' && goneMom) && !(f.id === 'dad' && goneDad));
  }
  return { ...v, scene: m.scene, arg: m.arg, family, text: m.t, year: ctx.by + m.a, married: ctx.married(m.a) };
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
  const kidRows = (ctx.life.family || []).filter((m) => (m.role === '아들' || m.role === '딸') && m.name);
  if (kidRows.length > 5) out.push(`자녀 ${kidRows.length}명`); // 아이가 많으면 이름 대신 수 (12명이면 크레딧이 너무 빨리 올라감)
  else [...new Set(kidRows.map((m) => m.name))].forEach((nm) => out.push('자녀 ' + nm));
  const g = ctx.row('손주');
  const gn = g && Number((/^(\d+)명/.exec(g.info || '') || [])[1]);
  if (gn) out.push(`손주 ${gn}명`);
  return out;
}

// 은퇴한 나이: 은퇴 기록이 있으면 그해, 없으면 55세 넘어 수입(연금)이 3년 넘게 그대로인 해 (그 뒤에도 직업 이름이 기록에 남아 있음)
function retireAge(events, years) {
  const e = (events || []).find((x) => /은퇴했|일을 마치고 은퇴|정년퇴직|은퇴하기로 했/.test(x.logText || '') && !/않고|않기로/.test(x.logText || ''));
  if (e) return e.age;
  const ys = [...(years || [])].sort((x, y) => x.age - y.age);
  for (let i = 0; i + 2 < ys.length; i++) {
    const y = ys[i];
    if (y.age >= 55 && y.jobName && y.income > 0 && ys[i + 1].income === y.income && ys[i + 2].income === y.income) return y.age;
  }
  return 999;
}

// 가장 오래 한 일 (은퇴 전까지만 셈 - '운전기사로 73년을 일했다'가 나오던 것, 11/25)
function topJob(years, retAt = 999) {
  const cnt = {};
  (years || []).forEach((y) => { if (y.jobName && y.age < retAt) cnt[y.jobName] = (cnt[y.jobName] || 0) + 1; });
  const best = Object.entries(cnt).sort((x, y) => y[1] - x[1])[0];
  return best ? { name: best[0].replace(/\s*\([^()]*\)\s*$/, ''), years: best[1] } : null; // '소농 (자급 농사)' → '소농'
}

function epitaph(r, ctx) {
  const D = ctx.D;
  const born = r.countryName;
  const last = r.currentCountryName || born;
  const out = [];
  if (r.currentCountry && r.currentCountry !== r.birthCountry) out.push(`${born}에서 태어나 ${last}에서 잠들었다.`);
  else if (D < 1) out.push(`${born}에서 태어나 첫돌을 맞지 못했다.`);
  else out.push(`${born}에서 태어나 ${D}년을 살았다.`);
  const job = topJob(r.years, ctx.retAt);
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
  const job = topJob(r.years, ctx.retAt);
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
    const pre = parts.slice(0, -1).join(', ');
    const head = parts.length > 1 ? pre + (hasBatchim(pre) ? '과 ' : '와 ') + parts[parts.length - 1] : parts[0]; // '자녀 3명과 손주 2명' ('명와' 고침)
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

  // 제목 장면: 태어난 집 소개 줄 ('아버지는 … 어머니는 …') - 장면이 태어난 방이라 병·역사 사건 줄은 쓰지 않음
  //   (11/24 동현님: 첫 장면 자막이 '홍역 진단을 받았다'인데 그림은 태어나는 장면)
  const first = events.find((e) => e.age === 0 && !e.eventId && /^(아버지|어머니)는|집이었다/.test(e.logText || ''));
  const titleF = { a: 0, t: first ? cleanText(first.logText, r.name) : `${r.countryName}에서 태어났다.`, place: 'home' };
  ctx.retAt = retireAge(events, r.years);
  const moms = pickMoments(events, D, r.name, r.years, ctx.retAt);
  moms.forEach((m) => { const e = events[Math.round(m.idx)]; m.sub = subOf(ctx, r, m, e && e.logText); });

  const cast = castOf(ctx);
  // 자료 이름: 괄호 속 설명은 빼고, 통계 보완 메모('48개국 확대 추정: WDI 빈칸을 Gapminder …')는 짧은 이름으로 (11/25)
  const src = [...new Set((data.sources || []).filter(Boolean).map((x) => (/빈칸을 Gapminder|Gapminder 비율/.test(x) ? 'Gapminder (빈 통계 보완)' : String(x).replace(/\s*\([^()]*\)\s*/g, ' ').trim())))].slice(0, 12);
  const creditsDur = Math.min(5600, 3800 + (cast.length + src.length) * 160);

  const seg = [];
  let n = 0;
  const add = (kind, dur, extra) => { seg.push({ kind, t0: n, t1: n + dur, ...extra }); n += dur; };

  add('map', 5200);
  add('title', 4200, { f: titleF, v: { ...villageAt(ctx, 0, 'home'), scene: 'born', family: familyAt(ctx, 0, { all: true }).list } });

  // 마지막: 사고 · 재해 · 폭력 등 갑작스러운 죽음이면 '빈자리' 장면, 그 밖에는 마지막 밤 장면 없이 장례로 바로 (11/25 동현님: 장례와 겹침)
  const cause = r.deathCause || '';
  const sudden = /사고|손상|재해|재난|피해|살해|폭력|전쟁|분쟁|익사|추락|화재|자살/.test(cause);
  const sick = !sudden && D >= 1 && /암|심장|뇌졸중|폐렴|결핵|말라리아|홍역|감염|질환|간염|당뇨|고혈압|병/.test(cause);
  const DEATH = sudden ? 3800 : 0;
  const FUNERAL = sudden ? 5400 : 7800; // 합친 장례: 처음 3초는 '○○년, ○○세 / ○○로 세상을 떠났다', 이어서 배웅 · '곁을 지켰다'가 3초 넘게 보이게 (11/25)
  const u = Math.max(0.7, Math.min(1, 5 / Math.max(1, moms.length))); // 장면이 7개면 하나를 조금 짧게 (화면 시간 85초 안팎)
  const fixed = 9400 + DEATH + FUNERAL + 6400 + creditsDur + 2600;
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

  // 마지막 장면: 사고면 '빈자리' (FilmScene last · sudden) 3.8초, 아니면 길이 0 (영상에는 안 나오고, 추모관 방 · 사진첩이 이 장면 데이터를 씀)
  add('death', DEATH, { v: { ...villageAt(ctx, D, 'home'), scene: 'last', arg: sudden ? 'sudden' : sick ? 'sick' : null, cause, family: familyAt(ctx, D, { all: true }).list } });
  add('funeral', FUNERAL, { merged: !sudden, v: { ...villageAt(ctx, D, 'home', { all: true }), pet: null, scene: 'funeral' } });
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
