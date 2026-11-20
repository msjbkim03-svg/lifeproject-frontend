// C03 진행 화면 글자 도우미 - 원작(1in8b)과 같은 돈 표시·기록 색 나누기·가진 것·다니는 길
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

// 원작 rankStr: 0.5 이상 "상위 N%", 아래면 "하위 N%"
export const rankStr = (p) => {
  if (p == null) return null;
  if (p >= 0.5) return '상위 ' + Math.max(1, Math.round((1 - p) * 100)) + '%';
  return '하위 ' + Math.max(1, Math.round(p * 100)) + '%';
};

// ───────── 인생 기록 색 (원작 feed 클래스) ─────────
//   (화면 클래스는 앞에 fk- 를 붙여 씀: 메인 화면 .ms, 결정 창 .dec 와 이름이 겹쳐 줄이 화면 높이만큼 커졌었음)
//   big 굵게 · bad 빨강 · ms 초록 이정표 · hist 회색 왼쪽 줄 ◆ · note 청록 제목 글꼴 · dec 작은 회색 · death 큰 제목 글꼴 · ledger 작은 돈 줄
const BAD = /(세상을 떠|숨을 거|사망|잃었|잃은|다쳤|부상|사고|병에 걸|앓|입원|수술|실직|해고|그만두었|중퇴|빚|이혼|헤어졌|전쟁|피란|기근|굶|가뭄|홍수|지진|폭격|체포|감옥|파산|망했|사기|도둑|불이 나|아팠|열병|설사|폐렴|결핵|말라리아)/;
const MS = /(태어났|입학|진학|졸업|결혼|첫째|둘째|셋째|아이가 생|아이를 낳|일을 시작|이 되었다|취업|승진|은퇴|이사|이민|처음으로|첫 월급|집을 샀|문을 열)/;
const NOTE = /(같은 해 .*태어난 .*살아 있다|또래 가운데)/;
const HIST_ID = /^[A-Z]{2,3}_\d{4}/;

export const feedKind = (line) => {
  if (line.kind) return line.kind;
  const t = line.text || '';
  const fx = line.fx || {};
  if (fx.eventType === 'HIST' || HIST_ID.test(line.eventId || fx.eventId || '')) return 'hist';
  if (NOTE.test(t)) return 'note';
  const hurt = (fx.effHealth || 0) <= -8 || (fx.effWealthRate || 0) <= -0.2 || (fx.deathAdd || 0) > 0;
  if (hurt || BAD.test(t)) return 'bad';
  if (MS.test(t)) return 'ms';
  if (line.big) return 'big';
  return '';
};

// ───────── 가진 것 · 다니는 길 (원작 살림 패널 아랫줄, 시대·형편으로 짐작) ─────────
// 산 물건 (C06-3 LIFE.OWNS 코드 → 이름)
const OWN_NAME = { PHONE: '스마트폰', CELL: '휴대전화', BIKE: '자전거', MOTO: '오토바이', CAR: '자동차', TV: '텔레비전·냉장고', PC: '컴퓨터·노트북', HOUSE: '내 집' };
export const ownNames = (life) => (life.owns || '').split(',').map((x) => OWN_NAME[x.trim()]).filter(Boolean);

// 가진 것: 돈 쓰기로 산 물건 (C06-3, 원작처럼 산 것만)
//   서버가 owns 를 주지 않는 예전 응답일 때만 형편으로 짐작한 살림
export const belongings = (life, year) => {
  if (life.currentAge < 6) return '부모님 집의 살림';
  if (!('owns' in life)) return guessBelongings(life, year);
  const owned = ownNames(life);
  if ((life.assets || 0) < 0 && life.currentAge >= 18) owned.push('빚');
  return owned.length ? owned.join(' · ') : '아직 산 물건이 없어요';
};

const guessBelongings = (life, year) => {
  const age = life.currentAge;
  const rank = life.incomeRankCountry ?? (life.wealthClass - 0.5) / 5;
  const urban = life.isUrban === 'Y';
  const rich = rank >= 0.6;
  const out = [];
  if (age < 6) return '부모님 집의 살림';
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

export const commute = (life, year) => {
  const age = life.currentAge;
  const urban = life.isUrban === 'Y';
  const rank = life.incomeRankCountry ?? (life.wealthClass - 0.5) / 5;
  if (age < 6) return '집 근처';
  if (life.schoolStatus === 'ENROLLED') {
    if (!urban) return '걸어서 학교까지';
    return year >= 1970 ? '버스로 학교까지' : '걸어서 학교까지';
  }
  if (life.jobStatus === 'EMPLOYED') {
    if (rank >= 0.6 && year >= 1975) return '자가용으로 출근';
    if (urban) return year >= 1980 ? '버스·지하철로 출근' : '버스로 출근';
    return '걸어서 일터까지';
  }
  if (life.jobStatus === 'RETIRED' || age >= 65) return '동네 산책';
  return urban ? '동네와 시장' : '마을 안';
};

// 조사 '(으)로': 마지막 글자 받침이 없거나 ㄹ 받침이면 '로', 그 밖의 받침이면 '으로' (한글이 아니면 '로')
export const ro = (word) => {
  const w = String(word ?? '').replace(/[\s'"’)]+$/, '');
  const c = w.charCodeAt(w.length - 1);
  if (!(c >= 0xac00 && c <= 0xd7a3)) return word + '로';
  const jong = (c - 0xac00) % 28;
  return word + (jong === 0 || jong === 8 ? '로' : '으로');
};
