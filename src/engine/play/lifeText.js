// C03 진행 화면 글자 도우미 - 원작(1in8b)과 같은 돈 표시·기록 색 나누기·내 물건·주로 다니는 곳
// 돈: 엔진은 달러로 계산하고 응답에 krwPerUsd(달러 → 한국 체감 원)를 같이 줘요
//   한국 체감 원 = 구매력(PPP) 달러 × 850원 (원작 KRW)

const KRW = 850;

// 원작 wonStr: 1억 이상 "1.2억 원", 1만 이상 "34만 원", 그 아래 "8,000원"
export const wonStr = (won) => {
  const v = Math.abs(won || 0);
  if (v >= 1e8) {
    const e = v / 1e8;
    return (e >= 10 ? Math.round(e).toLocaleString() : String(Math.round(e * 10) / 10)) + '억 원';
  }
  if (v >= 1e4) return Math.round(v / 1e4).toLocaleString() + '만 원';
  return (Math.round(v / 100) * 100).toLocaleString() + '원';
};

// 달러 → 한국 체감 ("34만 원"), sign 이면 +/− 붙임
export const won = (usd, k, sign = false) => {
  if (usd == null) return '—';
  const w = usd * (k || KRW);
  const s = wonStr(w);
  if (sign) return (w < 0 ? '−' : '+') + s;
  return w < 0 ? '−' + s : s;
};

// 달러 → 구매력 달러 ("$8,200"), 화면에는 '국제 비교 $8,200' 으로 씀
//   PPP(구매력 평가) 달러: 나라마다 다른 물가를 맞춰서 나라끼리 견줄 수 있게 한 달러 (원작과 같은 단위)
export const PPP_TIP = '구매력 기준 달러예요. 나라마다 물가가 달라서, 같은 물건을 살 수 있는 돈으로 맞춰 나라끼리 견줘요. 한국 체감 원은 이 값 × 850원이에요.';
export const ppp = (usd, k) => {
  if (usd == null) return '—';
  const p = Math.round((usd * (k || KRW)) / KRW);
  return (p < 0 ? '−' : '') + '$' + Math.abs(p).toLocaleString();
};

// 특성 칸 한 줄: 지금 인생에 실제로 곱해지는 효과 (효과값이 없으면 기본)
//   INVEST: 투자 성공 확률 50% × (1 + 효과값)   (윤아님 applyChoice)
//   DISEASE·LOVE: 그 이벤트가 일어날 확률 × (1 + 효과값)   (윤아님 occurTraitRate)
//   STUDY: 타고난 공부 재능 + 효과값 (효과 표에 없으면 (레벨-1) × 0.25, 엔진 studyEffect)
export const traitLine = (t) => {
  const e = t.effect ?? (t.traitId === 'STUDY' ? (t.level - 1) * 0.25 : 0);
  const pct = (v) => `${v > 0 ? '+' : '−'}${Math.round(Math.abs(v) * 100)}%`;
  if (!e) {
    const base = { INVEST: '투자 성공 확률 50% (기본)', DISEASE: '병에 걸릴 확률 기본', LOVE: '좋은 만남 확률 기본', STUDY: '공부 재능 기본' };
    return { on: false, text: base[t.traitId] || '효과 없음' };
  }
  switch (t.traitId) {
    case 'INVEST': return { on: true, text: `투자 성공 확률 ${Math.round(50 * (1 + e))}%` };
    case 'DISEASE': return { on: true, text: `병에 걸릴 확률 ${pct(e)}` };
    case 'LOVE': return { on: true, text: `좋은 만남 확률 ${pct(e)}` };
    case 'STUDY': return { on: true, text: `공부 재능 ${e > 0 ? '+' : ''}${e.toFixed(2)} (또래 대비)` };
    default: return { on: true, text: `효과 ${e}` };
  }
};

// 기록 줄 안의 돈 표시를 색으로 나누기: 들어온 돈(+) 초록 · 나간 돈(−)·대출·이자 빨강
//   [{ t: '글자', k: 'pos' | 'neg' | '' }] 로 돌려줌 (PlayPage 가 span 으로 그림)
const MONEY = /([+−-]\s?\d[\d.,]*(?:억|만)?\s?원)|((?:대출|이자 약)\s\d[\d.,]*(?:억|만)?\s?원)/g;
export const splitMoney = (text) => {
  const s = String(text ?? '');
  const out = [];
  let last = 0;
  for (const m of s.matchAll(MONEY)) {
    if (m.index > last) out.push({ t: s.slice(last, m.index), k: '' });
    out.push({ t: m[0], k: m[1] ? (m[1][0] === '+' ? 'pos' : 'neg') : 'neg' });
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push({ t: s.slice(last), k: '' });
  return out;
};

// 원작 rankStr: 0.5 이상 "상위 N%", 아래면 "하위 N%"
export const rankStr = (p) => {
  if (p == null) return null;
  if (p >= 0.5) return '상위 ' + Math.max(1, Math.round((1 - p) * 100)) + '%';
  return '하위 ' + Math.max(1, Math.round(p * 100)) + '%';
};

// ───────── 인생 기록 색 (원작 feed 클래스) ─────────
//   (화면 클래스는 앞에 fk- 를 붙여 씀: 메인 화면 .ms, 결정 창 .dec 와 이름이 겹쳐 줄이 화면 높이만큼 커졌었음)
//   big 굵게 · bad 빨강 · ms 청록 이정표 · hist 회색 왼쪽 줄 + 나이 옆 ◆ · warm 따뜻한 일(나이 옆 금색 점) · loss 가까운 사람을 잃음(굵게 ✿)
//   note 청록 제목 글꼴 · dec 작은 회색 ▸ · death 큰 제목 글꼴 · ledger 작은 돈 줄 (11/20 원작 .feed li.* 규칙과 같게)
//   alert 큰 역사 사건: 빨간 왼쪽 줄 + 아래 '큰 사건' 경고등 (11/20 동현님 요청, 원작에는 없음)
//     기준은 서버 한 곳 (EngineService.bigHist): 역사 사건 중 강도 2 이상 또는 전쟁·재난 유형, 끝난 소식은 빼고
//     진행 중엔 응답 alerts, 새로고침 땐 /api/engine/logs 의 alert='Y' 로 받아서 line.alert
const BAD = /(세상을 떠|숨을 거|사망|잃었|잃은|다쳤|부상|사고|병에 걸|앓|입원|수술|실직|해고|그만두었|중퇴|빚|이혼|헤어졌|전쟁|피란|기근|굶|가뭄|홍수|지진|폭격|체포|감옥|파산|망했|형편이 어려워졌|사업이 기울어|살림이 빠듯해졌|살림이 어려워졌|사기|도둑|불이 나|아팠|열병|설사|폐렴|결핵|말라리아)/;
const MS = /(태어났|입학|진학|졸업|결혼|첫째|둘째|셋째|아이가 생|아이를 낳|일을 시작|이 되었다|취업|승진|은퇴|이사|이민|처음으로|첫 월급|집을 샀|문을 열)/;
const NOTE = /(같은 해 .*태어난 .*살아 있다|또래 가운데|^“)/; // 마지막: 잠시 멈춤에 적은 한 줄 (따옴표)
// 원작 loss: 가까운 사람을 잃음 (굵게 + ✿)
const LOSS = /(아버지|어머니|부모님|아빠|엄마|남편|아내|배우자|아이|아들|딸|자녀|형|누나|언니|오빠|동생|형제|할머니|할아버지|친구|손주).{0,12}(세상을 떠|돌아가|잃었|떠나보냈|숨을 거)/;
// 원작 warm: 따뜻한 일 (나이 옆 금색 점)
const WARM = /(살림이 한결 펴졌|살림이 펴졌|형편이 넉넉해졌|기뻐|기쁨|웃었|웃음|따뜻|고마|화해|사랑|설레|위로|축하|안아|자랑스|행복했|이야기꽃|정을 나|함께 보냈|함께 웃|도와주었|나눴다)/;
// 엔진 전쟁 소식(eventId 없음)은 새로고침하면 서버 표시가 없어서 문장 모양으로 찾음 (warYear 의 시작·이어짐 문장)
const WAR_NEWS = /(전쟁|내전|전쟁터).*(시작되|일어났다|이어지고 있었|전쟁터가 되었|번졌)/;
const WAR_END = /(전쟁|내전|총성).*(끝났|멎었)/;

export const feedKind = (line) => {
  if (line.kind) return line.kind;
  const t = line.text || '';
  const fx = line.fx || {};
  if (line.alert) return 'alert';
  if (!line.fx && !line.eventId && WAR_END.test(t)) return 'hist';
  if (!line.fx && !line.eventId && WAR_NEWS.test(t)) return 'alert';
  if (line.hist || fx.eventType === 'HIST') return 'hist';
  if (NOTE.test(t)) return 'note';
  if (LOSS.test(t)) return 'loss';
  const hurt = (fx.effHealth || 0) <= -8 || (fx.effWealthRate || 0) <= -0.2 || (fx.deathAdd || 0) > 0;
  if (hurt || BAD.test(t)) return 'bad';
  if (MS.test(t)) return 'ms';
  if (WARM.test(t)) return 'warm';
  if (line.big) return 'big';
  return '';
};

// ───────── 내 물건 · 주로 다니는 곳 (원작 살림 패널 아랫줄) ─────────
// 산 물건 (C06-3 LIFE.OWNS 코드 → 이름)
const OWN_NAME = { PHONE: '스마트폰', CELL: '휴대전화', BIKE: '자전거', MOTO: '오토바이', CAR: '자동차', TV: '텔레비전·냉장고', PC: '컴퓨터·노트북', HOUSE: '내 집' };
export const ownNames = (life) => (life.owns || '').split(',').map((x) => OWN_NAME[x.trim()]).filter(Boolean);
const hasOwn = (life, code) => (life.owns || '').split(',').some((x) => x.trim() === code);

// 내 물건: 돈 쓰기로 산 물건 (C06-3, 원작처럼 산 것만)
//   서버가 owns 를 주지 않는 예전 응답일 때만 형편으로 짐작한 살림
export const belongings = (life, year) => {
  if (life.currentAge < 6) return '아직 없어요 (부모님 집에서 지내요)';
  if (!('owns' in life)) return guessBelongings(life, year);
  const owned = ownNames(life);
  if ((life.assets || 0) < 0 && life.currentAge >= 18) owned.push('빚');
  if (owned.length) return owned.join(' · ');
  return life.currentAge < 18 ? '아직 내 물건은 없어요' : '아직 산 물건이 없어요';
};

const guessBelongings = (life, year) => {
  const age = life.currentAge;
  const rank = life.incomeRankCountry ?? (life.wealthClass - 0.5) / 5;
  const urban = life.isUrban === 'Y';
  const rich = rank >= 0.6;
  const out = [];
  if (year >= 2012 && age >= 12) out.push('스마트폰');
  else if (year >= 1998 && age >= 15 && (urban || rich)) out.push('휴대폰');
  if (year >= 1975 && (urban || rich)) out.push(year >= 1990 ? '냉장고' : '텔레비전');
  else if (year >= 1950) out.push('라디오');
  if (age >= 18 && rich && year >= 1975) out.push('자동차');
  else if (age >= 12 && (year >= 1960 || !urban)) out.push(year >= 1980 && urban && rank >= 0.4 ? '오토바이' : '자전거');
  if (age >= 25 && (life.assets || 0) > 0 && rank >= 0.45) out.push(urban ? '내 집' : '집과 땅');
  if (age >= 18 && (life.assets || 0) < 0) out.push('빚');
  return out.length ? out.join(' · ') : '몸 하나';
};

// 주로 다니는 곳: '어디 · 어떻게' (산 탈것이 있으면 그걸로)
export const commute = (life, year) => {
  const age = life.currentAge;
  const urban = life.isUrban === 'Y';
  const rank = life.incomeRankCountry ?? (life.wealthClass - 0.5) / 5;
  const ride = hasOwn(life, 'CAR') ? '자가용으로' : hasOwn(life, 'MOTO') ? '오토바이로' : null;
  if (age < 6) return '집과 동네 · 부모님 손을 잡고';
  if (life.schoolStatus === 'ENROLLED') {
    if (age >= 18 && ride) return `학교 · ${ride}`;
    if (hasOwn(life, 'BIKE')) return '학교 · 자전거로';
    if (!urban || year < 1970) return '학교 · 걸어서';
    return '학교 · 버스로';
  }
  if (life.jobStatus === 'EMPLOYED') {
    if (ride) return `일터 · ${ride}`;
    if (!('owns' in life) && rank >= 0.6 && year >= 1975) return '일터 · 자가용으로';
    if (urban) return year >= 1980 ? '일터 · 버스·지하철로' : '일터 · 버스로';
    return hasOwn(life, 'BIKE') ? '일터 · 자전거로' : '일터 · 걸어서';
  }
  if (life.jobStatus === 'RETIRED' || age >= 65) return '동네 · 산책 삼아 걸어서';
  if (life.jobStatus === 'UNEMPLOYED') return urban ? '일자리 찾으러 시내로' : '마을 안 · 걸어서';
  return urban ? '동네와 시장 · 걸어서' : '마을 안 · 걸어서';
};

// 조사 '(으)로': 마지막 글자 받침이 없거나 ㄹ 받침이면 '로', 그 밖의 받침이면 '으로' (한글이 아니면 '로')
// 이/가 조사 (받침 있으면 '이')
export const iga = (word) => {
  const w = String(word ?? '');
  const c = w.charCodeAt(w.length - 1);
  if (!(c >= 0xac00 && c <= 0xd7a3)) return w + '이(가)';
  return w + ((c - 0xac00) % 28 ? '이' : '가');
};

export const ro = (word) => {
  const w = String(word ?? '').replace(/[\s'"’)]+$/, '');
  const c = w.charCodeAt(w.length - 1);
  if (!(c >= 0xac00 && c <= 0xd7a3)) return word + '로';
  const jong = (c - 0xac00) % 28;
  return word + (jong === 0 || jong === 8 ? '로' : '으로');
};
