// C03 인생 진행 화면 (주소: /play) - 원작(1in8b) 진행 화면 구색을 따름
//   위: 진행 막대 (나이 · 연도 · 한 해 진행 막대 · 멈춤 · 배속 1~16× · 다음 결정까지 · 음악 · 나가기)
//   왼쪽: 신원 기록(여권 카드) · 상태(능력치) · 살림 (한국 체감 원, 소득 위치, 지난 1년 순자산 내역, 가진 것, 다니는 길)
//         + '돈 쓰기 · 투자' 단추 (C06-3 ShopSheet: 물건 사기 · 여행·용돈 같은 돈 쓰기 · 여유 자금 굴리기, 여는 동안 시간 멈춤)
//   가운데: 마을(게임 화면) · 올해의 초점(칩, 진행을 멈추지 않음) · 인생 기록
//   오른쪽: 가족과 삶 · 같은 1초에 태어난 사람들 · 인생 지도 · 생존 곡선 · 나라
// - 시간 흐름은 원작과 같아요: 1배속에서 한 해 = 3600 ÷ 기대수명 초 (12~120초, 기대수명까지 약 1시간)
//   배속 1·2·4·8·12·16×, '다음 결정까지'는 결정 창이 뜰 때까지 빠르게 감기
// - 한 해 막대가 30%쯤 찼을 때 서버에 그해를 요청(POST /api/engine/next)하고 (빠른 배속은 더 일찍),
//   그해 일어난 일을 남은 막대 동안 고르게 하나씩 보여 준 뒤, 막대가 다 차면 나이가 올라가요
//   → 그 전에 바꾼 '올해의 초점'은 그해 계산에 바로 들어가고, 그 뒤에 바꾸면 다음 해부터
// - 인생 지도 칸에 마우스를 올리거나 누르면 그해 행복·건강·순자산·큰 일 (원작 인생 지도 말풍선, GET /api/engine/years)
// - 나라 패널은 그해와 가장 가까운 연대의 나라·권역 통계 (원작 나라 패널, GET /api/engine/country)
// - 출생 화면에서 state.life 로 들어오거나, 새로고침·이어하기면 GET /api/engine/current 로 불러옴
// - 큰 결정(선택 이벤트 C09, 이민 목적지 C10, 직업 제안 C06)만 창으로 띄우고 진행을 멈춤
//   선택 이벤트는 '운에 맡기기'로 무작위 결정, '앞으로도 맡기기'를 켜면 알아서 골라요 (localStorage autoChoice)
// - 죽으면(status ENDED) 잠깐 보여 주고 /result/:lifeId 로 이동 (C18)
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import client from '../../api/api';
import EventChoiceModal from '../../common/ui/EventChoiceModal';
import DecisionModal from '../../common/ui/DecisionModal';
import EffectChips from '../../common/ui/EffectChips';
import Button from '../../common/ui/Button';
import Village from '../village/Village';
import { placeOf, THEMES, COUNTRIES } from '../village/villageData';
import { survivalCurve } from './lifeCurve';
import useBgm from './useBgm';
import ShopSheet from './ShopSheet';
import { won, ppp, rankStr, feedKind, belongings, commute } from './lifeText';
import './play.css';

// ───────── 시간 (원작과 같은 공식) ─────────
const PACE_MIN = 60;                         // 기대수명까지 약 60분 (원작 기본값)
const SPEEDS = [1, 2, 4, 8, 12, 16];         // 원작과 같은 배속
const FF_SEC = 0.6;                          // '다음 결정까지' 감을 때 한 해 길이 (초)
const yearSecOf = (le) => Math.min(120, Math.max(12, (PACE_MIN * 60) / Math.max(le || 70, 60)));
// 그해 요청 시점 (막대 비율): 한 해의 앞 30% 안에서 요청하고, 그해 일은 남은 70% 막대에 고르게 나눠 보여 줌
//   (예전 3/4 시점엔 기록이 막대 끝에 몰려 나왔음) · 빠른 배속은 남은 막대가 4초는 되게 더 일찍, 빨리 감기는 바로
//   그 전에 고른 초점은 올해 계산에 들어가고, 그 뒤에 고르면 다음 해부터 (기록 문구에 '다음 해'로 표시)
const fetchAtOf = (ys) => Math.min(0.3, Math.max(0, 1 - 4 / ys));
// '1년 ≈ n초' 표시 (10초 미만은 소수 한 자리)
const secText = (v) => (v >= 10 ? String(Math.round(v)) : (Math.round(v * 10) / 10).toFixed(1));
const RESULT_DELAY = 3500;                   // 죽은 뒤 결과 화면까지
const AUTO_MS = 1600;                        // '자동 결정'일 때 직업·이민 창을 보여 주는 시간
const MAX_FEED = 400;                        // 화면에 남겨 둘 기록 줄 수

// 집중 코드 → 화면 문구 (EngineService.applyFocus·knowEff 기준)
const FOCUS = {
  STUDY: { label: '공부', desc: '지식↑ 행복↓' },
  PLAY: { label: '친구·놀이', desc: '관계↑ 행복↑' },
  HOUSE: { label: '집안 돕기', desc: '관계↑' },
  SPORT: { label: '운동', desc: '건강↑ 행복↑' },
  HOBBY: { label: '취미', desc: '행복↑' },
  PARTTIME: { label: '아르바이트', desc: '돈↑' },
  JOB_PREP: { label: '취업 준비', desc: '좋은 일자리↑' },
  WORK: { label: '일에 몰두', desc: '소득↑ 건강↓' },
  BALANCE: { label: '균형', desc: '고르게' },
  FAMILY: { label: '가족·친구', desc: '관계↑ 행복↑' },
  HEALTH: { label: '건강 관리', desc: '건강↑' },
  SELF_DEV: { label: '자기계발', desc: '지식↑' },
  REST: { label: '쉬기', desc: '행복↑' },
  BRAIN: { label: '두뇌 활동', desc: '지식 유지' },
  LOVE: { label: '연애·만남', desc: '인연↑ 행복↑' },
  FAITH: { label: '종교·봉사', desc: '관계↑ 행복↑' },
};
// 학생 15세부터 '취업 준비'는 '진로 준비'로 보여 줌
const focusLabel = (f, life) => (f === 'JOB_PREP' && life.stageCode === 'STUDENT' ? '진로 준비' : FOCUS[f]?.label || f);

// 나이대별 고를 수 있는 집중 (EngineService.focusOptions 와 같은 규칙, 서버가 focusOptions 를 주면 그걸 씀)
const focusList = (life) => {
  if (life.focusOptions?.length) return life.focusOptions;
  const age = life.currentAge;
  const love = age >= 18 && age < 40 && life.marriedYn !== 'Y' ? ['LOVE'] : [];
  switch (life.stageCode) {
    case 'STUDENT': return age < 15 ? ['STUDY', 'PLAY', 'HOUSE', 'SPORT', 'HOBBY'] : ['STUDY', 'PLAY', 'SPORT', 'HOBBY', 'JOB_PREP'];
    case 'YOUTH': return ['HOUSE', 'PLAY', 'SPORT', 'HOBBY'];
    case 'UNIV': return ['STUDY', 'PLAY', 'PARTTIME', 'JOB_PREP', 'SPORT', 'HOBBY', ...love];
    case 'WORKER': return ['WORK', 'BALANCE', 'FAMILY', 'HEALTH', 'SELF_DEV', 'HOBBY', ...love];
    case 'JOBLESS': return ['FAMILY', 'HEALTH', 'SELF_DEV', 'HOBBY', 'REST', ...(age < 40 ? ['JOB_PREP'] : []), ...love];
    case 'SENIOR': return life.jobStatus === 'EMPLOYED'
      ? ['WORK', 'FAMILY', 'HEALTH', 'BRAIN', 'HOBBY', 'FAITH']
      : ['FAMILY', 'HEALTH', 'BRAIN', 'HOBBY', 'FAITH', 'REST'];
    default: return [];
  }
};

// 여유 자금 굴리기 이름 (ShopSheet 와 같은 코드)
const INV_NAME = { CASH: '집에 둔 현금', DEPOSIT: '예금', BOND: '채권', MIX: '반반 펀드', STOCK: '주식', WORLD: '해외 지수', PROPERTY: '부동산 펀드', TRADE: '종목 사고팔기' };

const STAGE = {
  STUDENT: '학창 시절', YOUTH: '어린 시절', UNIV: '대학 시절', WORKER: '직장 생활',
  JOBLESS: '일을 찾는 시기', SENIOR: '노년',
};
const SCHOOL = { ELEM: '초등학교', MIDDLE: '중학교', HIGH: '고등학교', UNI: '대학교', GRAD: '대학원' };
const EDU = { NONE: '학력 없음', ELEM: '초졸', MIDDLE: '중졸', HIGH: '고졸', UNI: '대졸', GRAD: '대학원졸' };
const EDU_REQ = { NONE: '학력 무관', ELEM: '초졸 이상', MIDDLE: '중졸 이상', HIGH: '고졸 이상', UNI: '대졸 이상', GRAD: '대학원졸 이상' };
const INDUSTRY = { AGRI: '농림어업', INDUSTRY: '제조·건설', SERVICE: '서비스' };

const STATS = [
  ['health', '건강', 'var(--stat-health)', '몸 상태. 낮으면 병에 걸리거나 일찍 세상을 떠날 확률이 올라가요.'],
  ['happiness', '행복', 'var(--stat-happiness)', '삶의 만족. 나라의 행복 수준에서 출발해 가족·일·건강에 따라 오르내려요.'],
  ['knowledge', '지식', 'var(--stat-knowledge)', '같은 나이 또래 가운데 위치. 진학과 좋은 일자리에 영향을 줘요.'],
  ['relation', '관계', 'var(--stat-relation)', '가족·친구와의 사이. 결혼과 행복에 영향을 줘요.'],
];

// 돈 표시 ($, 큰 수는 천 단위 쉼표)
const money = (v) => {
  if (v == null) return '—';
  const n = Math.round(v);
  return (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString();
};

// 큰 수 (원작 koBig): 1억 이상 "1.4억", 1만 이상 "5,170만", 그 아래 쉼표
const koBig = (v) => {
  if (v == null) return '—';
  const n = Math.abs(v);
  if (n >= 1e8) return (Math.round((v / 1e8) * 10) / 10).toLocaleString() + '억';
  if (n >= 1e4) return Math.round(v / 1e4).toLocaleString() + '만';
  return Math.round(v).toLocaleString();
};
const fix1 = (v) => (Math.round(v * 10) / 10).toLocaleString();

// 우리 집 마을 화면에 같이 사는 가족 (Village family)
//   부모님(살아 계시면) · 형제자매(내가 20살 전까지, 25살 아래만) · 배우자 · 자녀(서버 가족 줄 '아들'·'딸', 30살 아래만)
const SIB_RE = /(형|오빠|누나|언니|남동생|여동생) (\d+)세/g;
const SIB_LABEL = { 형: ['형', 'M'], 오빠: ['오빠', 'M'], 누나: ['누나', 'F'], 언니: ['언니', 'F'], 남동생: ['동생', 'M'], 여동생: ['동생', 'F'] };
const homeFamily = (life) => {
  const out = [];
  const age = life.currentAge;
  const fam = life.family || [];
  let kid = 0;
  fam.forEach((m) => {
    if (!m.alive) return;
    if (m.role === '어머니') out.push({ id: 'mom', label: '엄마', gender: 'F', age: m.age });
    else if (m.role === '아버지') out.push({ id: 'dad', label: '아빠', gender: 'M', age: m.age });
    else if (m.role === '형제자매' && age < 20 && m.job) {
      let k = 0;
      for (const [, w, n] of m.job.matchAll(SIB_RE)) {
        const sa = Number(n);
        if (sa < 25) out.push({ id: 'sib' + k, label: SIB_LABEL[w][0], gender: SIB_LABEL[w][1], age: sa });
        k += 1;
      }
    } else if (m.role === '배우자' && m.name) {
      out.push({ id: 'spouse', label: life.gender === 'M' ? '아내' : '남편', gender: life.gender === 'M' ? 'F' : 'M', age: m.age });
    } else if (m.role === '아들' || m.role === '딸') {
      if (m.age == null || m.age < 30) out.push({ id: 'kid' + kid, label: m.role, gender: m.role === '아들' ? 'M' : 'F', age: m.age ?? 5 });
      kid += 1;
    }
  });
  if (!fam.length && life.parentAlive !== 'N' && age < 40) {
    out.push({ id: 'mom', label: '엄마', gender: 'F' }, { id: 'dad', label: '아빠', gender: 'M' });
  }
  return out.slice(0, 10);
};

// 서버 오류 문구 꺼내기
const errText = (err) => {
  const msg = err.response?.data;
  if (typeof msg === 'string' && msg) return msg;
  return err.response ? '서버에서 오류가 났어요.' : '서버에 연결할 수 없어요.';
};

const schoolText = (life) => {
  if (life.schoolStatus === 'ENROLLED' && SCHOOL[life.eduLevel]) return SCHOOL[life.eduLevel] + ' 재학';
  if (life.currentAge < 6 && (!life.eduLevel || life.eduLevel === 'NONE')) return '취학 전';
  return (EDU[life.eduLevel] || '학력 없음') + (life.schoolStatus === 'DROPPED' ? ' (중퇴)' : '');
};
const jobText = (life) => {
  if (life.jobStatus === 'EMPLOYED') return life.jobName || '일하는 중';
  if (life.jobStatus === 'UNEMPLOYED') return '구직 중';
  if (life.jobStatus === 'RETIRED') return '은퇴';
  return life.currentAge < 15 ? '—' : '일 없음';
};

// 엔진 응답 events → 기록 줄 [{ age, text, big, fx, eventId }] (색은 feedKind)
const toLines = (age, events) => (events || [])
  .filter((e) => e && e.logText)
  .map((e) => ({ age, text: e.logText, big: !!e.eventId, fx: e, eventId: e.eventId }));

// 한 해를 마칠 때 덧붙이는 줄: 돈 줄(ledger)·죽음(death)
const yearEndLines = (d, age) => {
  const out = [];
  if (age >= 18 && d.moneyDelta) {
    out.push({ age, kind: 'ledger', text: `지난 1년 순자산 ${won(d.moneyDelta, d.krwPerUsd, true)} (한국 체감)` });
  }
  if (d.status === 'ENDED') {
    out.push({ age, kind: 'death', text: `${d.deathAge ?? age}세, ${d.deathCause ? d.deathCause + '(으)로 ' : ''}세상을 떠났다.` });
  }
  return out;
};

function PlayPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const bgm = useBgm();

  const [life, setLife] = useState(location.state?.life || null);
  const [feed, setFeed] = useState([]);               // 인생 기록 (최신이 앞)
  const [loading, setLoading] = useState(!location.state?.life);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');           // 잠깐 보여 주는 안내 (409 등)
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(() => Number(localStorage.getItem('playSpeed')) || 1);
  const [ff, setFf] = useState(false);                // 다음 결정까지 빨리 감기
  const [busy, setBusy] = useState(false);            // 결정 요청 중
  const [skipJobAge, setSkipJobAge] = useState(null); // 이 나이엔 직업 제안 건너뜀
  const [destPick, setDestPick] = useState(null);     // 이민 목적지: 한 번 누르면 표시, 한 번 더 누르면 결정
  const [hidden, setHidden] = useState(typeof document !== 'undefined' && document.hidden);
  const [years, setYears] = useState({});             // 인생 지도: 나이 → { h 행복, hl 건강, nw 순자산, flow 그해 돈 내역 }
  const [mapTip, setMapTip] = useState(null);         // 인생 지도 말풍선 { age, x, y }
  const [ctyView, setCtyView] = useState('cur');      // 나라 패널: cur 사는 나라 / born 태어난 나라 (이민했을 때)
  const [cty, setCty] = useState(null);               // 나라 패널 통계 (GET /api/engine/country)
  const [shopOpen, setShopOpen] = useState(false);    // 돈 쓰기 · 투자 창 (여는 동안 시간 멈춤)
  // 선택 이벤트를 운에 맡기기 (원작 '자동으로 맡기기', 이 브라우저에 기억)
  const [autoChoice, setAutoChoiceState] = useState(() => {
    try { return localStorage.getItem('autoChoice') === 'Y'; } catch { return false; }
  });
  const setAutoChoice = (on) => {
    setAutoChoiceState(on);
    try { localStorage.setItem('autoChoice', on ? 'Y' : 'N'); } catch { /* 무시 */ }
  };

  const guestToken = localStorage.getItem('token') ? null : localStorage.getItem('guestToken');

  // 한 해 진행 상태 (화면을 매 프레임 다시 그리지 않게 ref)
  const yr = useRef({ data: null, fetching: false, t: 0, t0: 0, shown: 0, focus: null, focusing: false });
  const busyRef = useRef(false);
  const lifeRef = useRef(life);
  useEffect(() => { lifeRef.current = life; }, [life]);
  // 진행 막대는 React 다시 그리기 없이 바로 칠함 (매 프레임 부드럽게)
  const progRef = useRef(null);
  const setProg = (v) => {
    const el = progRef.current;
    if (el) el.style.transform = `scaleX(${v})`;
  };

  // ───────── 기록 ─────────
  const lineSeq = useRef(0); // 기록 줄마다 고유 번호 (React key)
  const pushLines = useCallback((lines) => {
    if (!lines.length) return;
    const withId = lines.map((x) => ({ ...x, id: ++lineSeq.current }));
    setFeed((f) => [...withId.reverse(), ...f].slice(0, MAX_FEED));
  }, []);

  // 인생 지도: 방금 지나간 해의 상태 (서버 LIFE_YEAR_LOG 와 같은 값, 돈 내역은 진행 중에만)
  const remember = useCallback((l, age) => {
    if (!l) return;
    setYears((m) => ({
      ...m,
      [age]: { h: Math.round(l.happiness || 0), hl: Math.round(l.health || 0), nw: l.assets, flow: l.moneyFlow || [] },
    }));
  }, []);

  // 지금까지의 인생 기록 불러오기 (새로고침·이어하기해도 기록이 비지 않게)
  const loadLogs = useCallback(async (l) => {
    // 인생 지도: 연도 기록은 나이가 오른 뒤 상태로 저장돼요 (나이 n 기록 = n-1세 한 해를 보낸 결과)
    client.get('/api/engine/years', { params: { lifeId: l.lifeId, guestToken } })
      .then((res) => {
        const m = {};
        (res.data || []).forEach((g) => {
          if (g.age > 0) m[g.age - 1] = { h: g.happiness, hl: g.health, nw: g.assets, flow: [] };
        });
        setYears((old) => ({ ...m, ...old }));
      })
      .catch((err) => console.log('인생 지도 불러오기 실패', err.response?.data));
    try {
      const res = await client.get('/api/engine/logs', { params: { lifeId: l.lifeId, guestToken } });
      // 서버는 최근 나이부터, 같은 나이는 일어난 순서 → 화면은 최신이 맨 위
      const byAge = {};
      (res.data || []).forEach((g) => { (byAge[g.age] = byAge[g.age] || []).push(g); });
      const ages = Object.keys(byAge).map(Number).sort((a, b) => b - a);
      const out = [];
      ages.forEach((age) => {
        byAge[age].slice().reverse().forEach((g) => out.push({ id: ++lineSeq.current, age, text: g.logText, big: !!g.eventId, eventId: g.eventId }));
      });
      setFeed(out.slice(0, MAX_FEED));
    } catch (err) {
      console.log('인생 기록 불러오기 실패', err.response?.data);
    }
  }, [guestToken]);

  // ① 진행 중인 인생 불러오기 (새로고침, 이어하기, 409 뒤)
  const reload = useCallback(async () => {
    yr.current = { data: null, fetching: false, t: 0, t0: 0, shown: 0, focus: null, focusing: false };
    setProg(0);
    try {
      const res = await client.get('/api/engine/current', { params: { guestToken } });
      setLife(res.data);
      loadLogs(res.data);
      setError('');
    } catch (err) {
      if (err.response?.status === 404) setError('진행 중인 인생이 없어요. 메인에서 새로 태어나 주세요.');
      else setError(errText(err));
    } finally {
      setLoading(false);
    }
  }, [guestToken, loadLogs]);

  useEffect(() => {
    if (location.state?.life) {
      loadLogs(location.state.life);
      navigate('/play', { replace: true, state: null }); // 새로고침 대비로 state 지움
    } else {
      reload();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ───────── 결정 요청 (선택·직업·이민) ─────────
  const decide = useCallback(async (url, body) => {
    const l = lifeRef.current;
    if (busyRef.current || !l) return;
    busyRef.current = true;
    setBusy(true);
    try {
      const res = await client.post(url, { lifeId: l.lifeId, guestToken, ...body });
      setLife(res.data);
      pushLines(toLines(res.data.currentAge - 1, res.data.events));
    } catch (err) {
      setNotice(errText(err));
      if (err.response?.status === 409) await reload();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [guestToken, pushLines, reload]);

  // 올해의 초점 (진행을 멈추지 않음)
  //   그해를 아직 서버에 요청하기 전이면 올해 계산에 바로 들어가고, 이미 요청했으면 다음 해부터 적용돼요
  //   저장이 끝날 때까지는 그해를 요청하지 않아요 (요청이 겹치면 예전 초점으로 덮어써질 수 있어서)
  const chooseFocus = useCallback(async (focus) => {
    const l = lifeRef.current;
    if (!l) return;
    const y = yr.current;
    const late = !!(y.data || y.fetching);
    setLife((x) => ({ ...x, focusCode: focus, needFocus: false }));
    y.focus = focus;
    y.focusing = true;
    // 같은 해에 다시 고르면 앞서 고른 초점 기록은 줄을 그어 지움 (올해 몫·다음 해 몫 따로)
    const focusKey = `${l.currentAge}-${late ? 'next' : 'now'}`;
    setFeed((f) => f.map((x) => (x.focusKey === focusKey && !x.struck ? { ...x, struck: true } : x)));
    pushLines([{ age: l.currentAge, kind: 'dec', focusKey, text: `${late ? '다음 해' : '올해'}의 초점을 '${focusLabel(focus, l)}'(으)로 정했다.` }]);
    try {
      await client.post('/api/engine/focus', { lifeId: l.lifeId, guestToken, focus });
    } catch (err) {
      setNotice(errText(err));
    } finally {
      y.focusing = false;
    }
  }, [guestToken, pushLines]);

  const ended = life?.status === 'ENDED';
  const showDest = !!(life?.needDestination && life.destinations?.length);
  const showChoice = !showDest && !!(life?.needChoice && life.pendingEvent);
  const showJob = !showDest && !showChoice && !!(life?.needJob && life.jobOffers?.length) && skipJobAge !== life.currentAge;
  const waiting = showDest || showChoice || showJob;
  const yearSec = ff ? FF_SEC : yearSecOf(life?.lifeExpectancy) / speed;

  // 결정 창이 뜨면 빨리 감기 끝
  useEffect(() => { if (waiting) setFf(false); }, [waiting]);

  // 결정 운에 맡기기: 직업 제안·이민 목적지 (선택 이벤트는 EventChoiceModal 이 직접 처리)
  //   '자동 결정'이 켜져 있으면 창을 잠깐(AUTO_MS) 보여 준 뒤 무작위로 골라요
  const fateJob = useCallback(() => {
    const offers = lifeRef.current?.jobOffers || [];
    if (offers.length) decide('/api/engine/job', { jobId: offers[Math.floor(Math.random() * offers.length)].jobId });
  }, [decide]);
  const fateDest = useCallback(() => {
    const ds = lifeRef.current?.destinations || [];
    if (ds.length) decide('/api/engine/destination', { countryCode: ds[Math.floor(Math.random() * ds.length)].countryCode });
  }, [decide]);
  useEffect(() => {
    if (!autoChoice || busy || !(showDest || showJob)) return undefined;
    const t = setTimeout(() => (showDest ? fateDest() : fateJob()), AUTO_MS);
    return () => clearTimeout(t);
  }, [autoChoice, busy, showDest, showJob, fateDest, fateJob, life?.currentAge]);

  // ② 한 해 흐르기: 막대가 차는 동안 미리 받은 그해 일을 하나씩 보여 주고, 다 차면 나이 +1
  //    매 프레임 막대는 DOM 으로 바로 칠하고(React 다시 그리기 없음), 해가 바뀔 때만 화면을 새로 그려서 버벅임 없음
  //    다음 해는 막대가 끝나기 조금 전에 미리 요청해 두어 해 사이에 멈춤이 없게 함
  const running = !!life && !ended && !paused && !hidden && !waiting && !busy && !error && !shopOpen;
  const loopRef = useRef({});
  loopRef.current = { yearSec, guestToken, pushLines, remember, reload };
  useEffect(() => {
    if (!running) return undefined;
    let frame;
    let last = performance.now();
    let alive = true;
    const y = yr.current;
    y.hold = false; // 결정 창을 닫고 다시 돌기 시작

    const fetchYear = async () => {
      const l = lifeRef.current;
      y.fetching = true;
      try {
        const res = await client.post('/api/engine/next', { lifeId: l.lifeId, guestToken: loopRef.current.guestToken });
        y.data = res.data;
        y.t0 = y.t;      // 받은 때부터 남은 막대 동안 그해 일을 나눠 보여 줌
        y.shown = 0;
      } catch (err) {
        if (!alive) return;
        setNotice(errText(err));
        if (err.response?.status === 409) loopRef.current.reload();
        else setPaused(true); // 알 수 없는 오류면 멈춰서 계속 실패하지 않게
      } finally {
        y.fetching = false;
      }
    };

    const tick = (now) => {
      const dt = Math.min(0.5, (now - last) / 1000); // 프레임이 느려도 시간은 같게
      last = now;
      const { yearSec: ys, pushLines: push, remember: mem } = loopRef.current;
      if (y.hold) return; // 결정 창(직업·선택·이민)이나 사망: 화면이 멈출 때까지 다음 해를 요청하지 않음
      // 막대가 요청 시점을 넘으면 그해를 요청 (초점 저장 중이면 끝날 때까지 기다림)
      if (!y.data && !y.fetching && !y.focusing && y.t >= fetchAtOf(ys)) fetchYear();

      // 서버 응답 전에는 막대가 끝까지 차지 않게 (응답이 오면 바로 이어서 참)
      y.t = Math.min(y.data ? 1 : 0.985, y.t + dt / ys);
      setProg(y.t);

      if (y.data) {
        const d = y.data;
        const age = d.status === 'ENDED' ? d.currentAge : d.currentAge - 1;
        const lines = toLines(age, d.events);
        // 그해 일을 남은 막대 위에 고르게 나눠서 하나씩
        const part = y.t0 >= 1 ? 1 : (y.t - y.t0) / (1 - y.t0);
        const due = Math.min(lines.length, Math.floor(part * (lines.length + 1)));
        if (due > y.shown) {
          push(lines.slice(y.shown, due));
          y.shown = due;
        }
        if (y.t >= 1) {
          push([...lines.slice(y.shown), ...yearEndLines(d, age)]);
          const focus = y.focus;
          mem(d, age);
          y.data = null;
          y.t = 0;
          y.t0 = 0;
          y.shown = 0;
          y.focus = null;
          setProg(0);
          // 해가 끝난 뒤 고른 초점은 서버에 이미 반영돼 있으니 화면에서도 유지
          setLife(focus ? { ...d, focusCode: focus, needFocus: false } : d);
          // 결정 창·사망이면 running 이 꺼질 때까지 다음 해를 요청하지 않음
          // (예전엔 여기서 멈춰도 다음 프레임이 한 번 더 돌아 다음 해를 미리 요청해 버려서,
          //  서버 나이가 한 살 앞서 가고 직업 제안을 눌러도 '제안받은 직업이 아니에요'로 거절됐음)
          if (d.status === 'ENDED' || d.needChoice || d.needDestination || d.needJob) {
            y.hold = true;
            return;
          }
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      alive = false;
      cancelAnimationFrame(frame);
    };
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  // 돈 쓰기 · 투자 (C06-3): 그해 요청 중이면 끝날 때까지 기다렸다가 보냄, 사고 나면 돈·능력치만 바꾸고 기록 한 줄
  //   이미 받아 둔 그해 응답(y.data)이 있으면 거기에도 반영 (해가 끝날 때 예전 돈으로 되돌아가지 않게)
  const waitIdle = useCallback(async () => {
    while (yr.current.fetching) await new Promise((r) => setTimeout(r, 100));
  }, []);
  const onShopDone = useCallback((dto) => {
    const patch = {
      assets: dto.assets, health: dto.health, happiness: dto.happiness, knowledge: dto.knowledge,
      relation: dto.relation, investType: dto.investType, owns: dto.owns,
    };
    setLife((x) => ({ ...x, ...patch }));
    if (yr.current.data) yr.current.data = { ...yr.current.data, ...patch };
    if (dto.message) pushLines([{ age: lifeRef.current?.currentAge ?? dto.logAge, kind: 'dec', text: dto.message }]);
  }, [pushLines]);
  const closeShop = useCallback(() => setShopOpen(false), []);

  // 다른 탭으로 가면 멈췄다가(멈춤 버튼은 그대로), 돌아오면 다시 진행 (원작과 같음)
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  // ③ 죽으면 결과 화면으로 (신영님 C18)
  useEffect(() => {
    if (!ended) return undefined;
    const t = setTimeout(() => navigate(`/result/${life.lifeId}`), RESULT_DELAY);
    return () => clearTimeout(t);
  }, [ended, life, navigate]);

  // ④ 나라 패널: 사는 나라(또는 태어난 나라)·연대가 바뀔 때만 다시 불러옴
  const ctyCode = life ? (ctyView === 'born' ? life.birthCountry : life.currentCountry) : null;
  const ctyDecade = life ? Math.floor((life.birthYear + life.currentAge) / 10) * 10 : null;
  useEffect(() => {
    if (!life?.lifeId || !ctyCode) return undefined;
    let alive = true;
    client.get('/api/engine/country', { params: { lifeId: life.lifeId, guestToken, view: ctyView } })
      .then((res) => { if (alive) setCty(res.data); })
      .catch((err) => console.log('나라 통계 불러오기 실패', err.response?.data));
    return () => { alive = false; };
  }, [life?.lifeId, ctyCode, ctyDecade, ctyView, guestToken]); // eslint-disable-line react-hooks/exhaustive-deps
  // 이민 전이면 태어난 나라 보기 단추가 없으니 사는 나라로
  useEffect(() => { if (life && life.birthCountry === life.currentCountry) setCtyView('cur'); }, [life?.currentCountry]); // eslint-disable-line react-hooks/exhaustive-deps

  // 인생 지도 말풍선은 화면을 굴리면 닫힘 (원작과 같음)
  useEffect(() => {
    if (!mapTip) return undefined;
    const close = () => setMapTip(null);
    window.addEventListener('scroll', close, { passive: true });
    return () => window.removeEventListener('scroll', close);
  }, [mapTip]);

  // 안내 문구는 3초 뒤 사라짐
  useEffect(() => {
    if (!notice) return undefined;
    const t = setTimeout(() => setNotice(''), 3000);
    return () => clearTimeout(t);
  }, [notice]);

  useEffect(() => { setDestPick(null); }, [life?.needDestination]);

  // 스페이스바: 멈춤/계속 (입력칸·버튼에서는 무시)
  useEffect(() => {
    const onKey = (e) => {
      const tag = e.target.tagName;
      if (e.code !== 'Space' || tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'BUTTON') return;
      e.preventDefault();
      setPaused((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pickSpeed = (s) => {
    setSpeed(s);
    setFf(false);
    setPaused(false);
    try { localStorage.setItem('playSpeed', String(s)); } catch { /* 무시 */ }
  };

  // 생존 곡선 (같은 해 태어난 사람 중 생존 비율)
  const curve = useMemo(
    () => (life ? survivalCurve(life.lifeExpectancy || 70, life.infantMortality || 30) : null),
    [life?.lifeExpectancy, life?.infantMortality], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // ───────── 화면 ─────────
  if (loading) {
    return <div className="pp"><p className="pp-center pp-sub">인생을 불러오는 중이에요…</p></div>;
  }
  if (error && !life) {
    return (
      <div className="pp">
        <section className="pp-panel pp-center-card">
          <h3 className="pp-h">인생 진행</h3>
          <p>{error}</p>
          <Button type="primary" onClick={() => navigate('/')}>메인으로</Button>
        </section>
      </div>
    );
  }
  if (!life) return null;

  const year = life.birthYear + life.currentAge;
  const countryName = life.countryName || life.currentCountry;
  const countryText = life.histName && life.histName !== countryName ? `${countryName} (당시 ${life.histName})` : countryName;
  const stageText = STAGE[life.stageCode] || (life.currentAge < 6 ? '아기 시절' : '');
  const town = life.isUrban === 'Y' ? '도시' : '시골';
  const focusOpts = focusList(life);
  const deathAge = life.deathAge ?? life.currentAge;
  const lived = ended ? deathAge + 1 : life.currentAge;
  const le = life.lifeExpectancy || 70;
  const mapYears = Math.max(90, Math.ceil(Math.max(lived + 1, le + 1) / 10) * 10);
  const region = THEMES[(COUNTRIES[life.currentCountry] || [])[1]]?.name;
  const aliveNow = curve ? curve[Math.min(curve.length - 1, life.currentAge)] : null;
  const migrated = life.birthCountry !== life.currentCountry;

  return (
    <div className="pp">
      {/* ───── 진행 막대 (원작 topbar) ───── */}
      <header className="pp-top">
        <div className="pp-wrap pp-top-in">
          <div className="pp-agebox">
            <div className="pp-age">{ended ? deathAge : life.currentAge}<small>세</small></div>
            <div className="pp-yr">
              <span className="pp-yr-t">{year}년 · {life.name} · {ff ? '다음 결정까지 빨리 감는 중' : `1년 ≈ ${secText(yearSec)}초`}</span>
              <div className="pp-prog" aria-hidden="true">
                <i ref={progRef} style={{ transform: `scaleX(${ended ? 1 : yr.current.t})` }} />
              </div>
            </div>
          </div>

          <div className="pp-speed">
            <button type="button" className="pp-b" aria-pressed={paused} disabled={ended} onClick={() => setPaused(!paused)}>
              {paused ? '▶ 계속' : 'Ⅱ 멈춤'}
            </button>
            <span className="pp-sps" role="group" aria-label="진행 속도">
              {SPEEDS.map((s) => (
                <button key={s} type="button" aria-pressed={!ff && speed === s} onClick={() => pickSpeed(s)}>
                  {s}<span className="x">×</span>
                </button>
              ))}
            </span>
            <button type="button" className="pp-b" aria-pressed={ff} disabled={ended || waiting}
              onClick={() => { setFf(!ff); setPaused(false); }}>
              다음 결정까지 »
            </button>
            <button type="button" className="pp-b" aria-pressed={autoChoice} disabled={ended}
              title="결정 창(선택 이벤트·일자리·이민)이 뜨면 잠깐 보여 준 뒤 운에 맡겨 알아서 골라요"
              onClick={() => setAutoChoice(!autoChoice)}>
              자동 결정 {autoChoice ? '켬' : '끔'}
            </button>

            {/* BGM: ♪ 켜기/끄기 + 음량 (보사노바 해변을 브라우저가 만들어 냄, public/audio/bgm-play.mp3 넣으면 그 곡) */}
            <span className={'pp-bgm' + (bgm.on ? ' on' : '')} title="배경음악 · 보사노바 해변">
              <button type="button" aria-pressed={bgm.on} onClick={bgm.toggle}>
                <span aria-hidden="true">♪</span> {bgm.missing ? '음악 준비 중' : '음악'}
              </button>
              <input type="range" min="0" max="1" step="0.05" value={bgm.volume} aria-label="음량"
                disabled={!bgm.on || bgm.missing} onChange={(e) => bgm.setVolume(e.target.value)} />
            </span>

            <button type="button" className="pp-b ghost" onClick={() => navigate('/')}>나가기</button>
          </div>
        </div>
      </header>

      {notice && <div className="pp-notice" role="status">{notice}</div>}

      <div className="pp-wrap pp-life">
        {/* ───── 왼쪽: 나 ───── */}
        <div className="pp-col">
          <section className="pp-panel pp-id">
            <Guilloche />
            <div className="pp-id-top"><span>신원 기록 · {life.birthCountry}</span><span>{life.birthYear}</span></div>
            <div className="pp-id-in">
              <Portrait gender={life.gender} age={life.currentAge} />
              <div>
                <div className="pp-id-nm">{life.name}</div>
                <dl className="pp-id-dl">
                  <dt>성별</dt><dd>{life.gender === 'M' ? '남성' : '여성'}</dd>
                  <dt>출생</dt><dd>{countryText} · {life.birthYear}년</dd>
                  <dt>거주</dt><dd>{town}, {countryName}</dd>
                  <dt>출신 가정</dt>
                  <dd aria-label={`소득 ${life.wealthClass}분위`}>
                    {[1, 2, 3, 4, 5].map((n) => <i key={n} className={'pp-dot' + (n <= life.wealthClass ? ' on' : '')} />)}
                  </dd>
                  <dt>학력</dt><dd>{schoolText(life)}</dd>
                  <dt>직업</dt><dd>{jobText(life)}</dd>
                </dl>
              </div>
            </div>
          </section>

          <section className="pp-panel">
            <h3 className="pp-h"><span>상태</span><span className="pp-lbl">0–100</span></h3>
            {STATS.map(([key, label, color]) => {
              const v = Math.max(0, Math.min(100, Math.round(life[key] || 0)));
              return (
                <div key={key} className="pp-stat">
                  <span>{label}</span>
                  <span className="pp-bar" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
                    <i style={{ width: v + '%', background: color }} />
                  </span>
                  <span className="pp-v">{v}</span>
                </div>
              );
            })}
            <details className="pp-help">
              <summary>상태는 무엇을 뜻하나요?</summary>
              <ul>{STATS.map(([k, label, , desc]) => <li key={k}><b>{label}</b> {desc}</li>)}</ul>
              <p>높은 수치는 가능성을 높일 뿐, 결과를 정해 주지는 않아요.</p>
            </details>
            <MoneyPanel life={life} year={year} countryName={countryName} />
            {!ended && life.currentAge >= 15 && (
              <button type="button" className="shop-b ghost pp-shopbtn" disabled={waiting} title={waiting ? '결정 창을 먼저 골라 주세요' : undefined}
                onClick={() => setShopOpen(true)}>
                돈 쓰기 · 투자{life.investType ? ` (${INV_NAME[life.investType] || ''})` : ''}
              </button>
            )}
          </section>
        </div>

        {/* ───── 가운데: 마을 · 올해의 초점 · 인생 기록 ───── */}
        <div className="pp-col">
          <section className="pp-panel pp-scene">
            <Village countryCode={life.currentCountry} age={life.currentAge} gender={life.gender}
              place={placeOf(life)} urban={life.isUrban === 'Y'} family={homeFamily(life)} />
            <p className="pp-scenecap">{countryText} · {town} · {stageText}{life.jobStatus === 'EMPLOYED' && life.jobName ? ` · ${life.jobName}` : ''}</p>
          </section>

          {ended ? (
            <section className="pp-panel pp-end">
              <h3 className="pp-h"><span>삶을 마쳤어요</span></h3>
              <p>
                <b>{life.name}</b> 님은 {life.birthYear + deathAge}년, {deathAge}세에 세상을 떠났어요.
                {life.deathCause && <span className="pp-sub"> ({life.deathCause})</span>}
              </p>
              <p className="pp-sub">잠시 뒤 인생 결과로 넘어가요.</p>
              <Button type="primary" onClick={() => navigate(`/result/${life.lifeId}`)}>결과 바로 보기</Button>
            </section>
          ) : (
            <section className="pp-panel">
              <h3 className="pp-h"><span>올해의 초점</span>{focusOpts.length > 0 && <span className="pp-lbl">언제든 바꿀 수 있어요</span>}</h3>
              <div className="pp-status">{stageText || '아기'} · {town} · {countryName}</div>
              {focusOpts.length === 0 ? (
                <p className="pp-sub pp-baby">아직 어려서 부모님이 키우는 중이에요. 여섯 살이 되면 한 해를 어디에 쓸지 고를 수 있어요.</p>
              ) : (
                <>
                  {life.needFocus && <p className="pp-tip">새 시기가 시작됐어요. 올 한 해를 어디에 쓸지 골라 보세요. 고르지 않으면 알아서 정해져요.</p>}
                  <div className="pp-chips">
                    {focusOpts.map((f) => (
                      <button key={f} type="button" className="pp-chip" aria-pressed={life.focusCode === f}
                        onClick={() => chooseFocus(f)}>
                        <span>{focusLabel(f, life)}</span>
                        <small>{FOCUS[f]?.desc}</small>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </section>
          )}

          <section className="pp-panel pp-feedp">
            <h3 className="pp-h"><span>인생 기록</span><span className="pp-lbl">최근 순</span></h3>
            <p className="pp-tgline">{year}년 · {life.name}의 {lived}번째 해{aliveNow != null && !ended ? ` · 같은 해 태어난 또래 약 ${Math.round(aliveNow * 100)}%가 살아 있어요` : ''}</p>
            {feed.length === 0 ? (
              <p className="pp-sub">한 해가 지나면 여기에 기록이 쌓여요.</p>
            ) : (
              <ul className="pp-feed">
                {feed.map((e, i) => (
                  <li key={e.id ?? `k${i}`} className={[feedKind(e) ? 'fk-' + feedKind(e) : '', e.struck ? 'fk-struck' : ''].join(' ').trim() || undefined}>
                    <span className="a">{e.age}세</span>
                    <span className="x">
                      {e.text}
                      {e.fx && <EffectChips effect={e.fx} />}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ───── 오른쪽: 가족과 삶 · 인생 지도 · 생존 곡선 · 나라 ───── */}
        <div className="pp-col">
          <section className="pp-panel">
            <h3 className="pp-h"><span>가족과 삶</span></h3>
            <FamilyRows life={life} countryName={countryName} stageText={stageText} />
          </section>

          {life.peers?.length > 0 && (
            <section className="pp-panel">
              <h3 className="pp-h"><span>같은 1초에 태어난 사람들</span><span className="pp-lbl">{life.birthYear}년생</span></h3>
              <ul className="pp-peers">
                {life.peers.map((p, i) => (
                  <li key={i} className={p.alive ? '' : 'gone'}>
                    <b>{p.name}</b>
                    <small>{p.countryName || p.countryCode} · {p.gender === 'M' ? '남' : '여'}</small>
                    <span>{life.currentAge}세 · {p.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="pp-panel">
            <h3 className="pp-h"><span>인생 지도</span><span className="pp-lbl">한 칸 = 1년</span></h3>
            {/* 원작처럼 칸에 마우스를 올리면(터치는 누르면) 그해 말풍선 */}
            <div className="pp-grid10" aria-label={`인생 지도: 한 칸이 1년, ${lived}년을 살았어요. 칸을 누르면 그해 이야기가 보여요.`}
              onMouseLeave={() => setMapTip(null)}>
              {Array.from({ length: mapYears }, (_, i) => {
                const done = i < lived && !(ended && i === deathAge);
                const y = years[i];
                const lvl = y == null ? 2 : y.h >= 70 ? 3 : y.h >= 50 ? 2 : 1;
                const show = (e) => {
                  const r = e.currentTarget.getBoundingClientRect();
                  setMapTip({ age: i, x: Math.min(window.innerWidth - 260, r.left), y: r.bottom + 6 });
                };
                return (
                  <button key={i} type="button"
                    className={'c'
                      + (done ? ' lv' + lvl : '')
                      + (!ended && i === life.currentAge ? ' cur' : '')
                      + (ended && i === deathAge ? ' dead' : '')
                      + (i === Math.floor(le) ? ' le' : '')}
                    aria-label={`${i}세 (${life.birthYear + i}년)`}
                    onMouseEnter={show} onFocus={show} onBlur={() => setMapTip(null)}
                    onClick={(e) => (mapTip?.age === i ? setMapTip(null) : show(e))} />
                );
              })}
            </div>
            <div className="pp-gridkey">
              <span><i className="lv1" /><i className="lv2" /><i className="lv3" /> 색이 선명할수록 행복했던 해</span>
              <span><i className="le" /> 기대수명 {le.toFixed(1)}세</span>
            </div>
            {mapTip && (
              <div className="pp-maptip" role="status" style={{ left: mapTip.x, top: mapTip.y }}>
                <MapTipText age={mapTip.age} life={life} y={years[mapTip.age]} feed={feed} le={le} />
              </div>
            )}
          </section>

          {curve && (
            <section className="pp-panel">
              <h3 className="pp-h"><span>생존 곡선</span><span className="pp-lbl">같은 해 태어난 사람</span></h3>
              <SurvivalChart curve={curve} age={ended ? deathAge : life.currentAge} ended={ended} />
            </section>
          )}

          <section className="pp-panel pp-cty">
            <h3 className="pp-h">
              <span>{cty?.nameKo || countryName}{cty?.decade ? ` · ${cty.decade}년대` : ''}</span>
              {migrated && (
                <button type="button" className="pp-ctysw" onClick={() => setCtyView(ctyView === 'born' ? 'cur' : 'born')}>
                  {ctyView === 'born' ? '사는 나라 보기' : '태어난 나라 보기'}
                </button>
              )}
            </h3>
            <dl>
              {ctyView === 'cur' && life.histName && life.histName !== countryName && (<><dt>당시 국가명</dt><dd>{life.histName}</dd></>)}
              {countryRows(cty).map(([k, v]) => (<Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>))}
              {ctyView === 'cur' && (<><dt>사는 곳</dt><dd>{town}</dd></>)}
            </dl>
            {cty && (
              <p className="pp-src">
                {cty.sourceTitle ? `출처: ${cty.sourceTitle}` : '출처: 유엔·세계은행 공개 통계'}
                {cty.isEstimated === 'Y' ? ' (일부 추정값)' : ''}
                {cty.regionName || region ? ` · 진학률·종사 비율은 ${cty.regionName || region} 권역 값` : ''}
              </p>
            )}
          </section>
        </div>
      </div>

      {/* C10 이민 목적지 ('떠난다'를 고른 뒤) - 나라를 옮기는 큰 결정이라 두 번 눌러 결정 */}
      <DecisionModal open={showDest} label="이주 결정" meta={`${life.currentAge}세 · ${year}년`}
        title="어디로 떠날까요?"
        text="잘사는 나라일수록 행복은 오르지만, 이민자라 소득은 깎여요."
        options={(life.destinations || []).map((d) => ({
          key: d.countryCode, code: d.countryCode, title: d.nameKo || d.countryCode, tag: d.tierName,
          sub: d.gdpPerCapita ? `1인당 GDP ${money(d.gdpPerCapita)}` : undefined, armed: destPick === d.countryCode,
        }))}
        busy={busy}
        onPick={(o) => (destPick === o.code ? decide('/api/engine/destination', { countryCode: o.code }) : setDestPick(o.code))}
        hint={autoChoice ? '자동 결정이 켜져 있어요. 잠시 뒤 운이 골라요.' : undefined}
        footer={<FateFooter onFate={fateDest} busy={busy} auto={autoChoice} onAuto={setAutoChoice} />} />

      {/* C06-3 돈 쓰기 · 투자 */}
      <ShopSheet open={shopOpen} life={life} age={life.currentAge} guestToken={guestToken}
        waitIdle={waitIdle} onDone={onShopDone} onClose={closeShop} />

      {/* C09 선택 이벤트 */}
      <EventChoiceModal open={showChoice} event={life.pendingEvent} busy={busy} costs={life.choiceCosts} krw={life.krwPerUsd}
        age={life.currentAge - 1} year={year - 1}
        auto={autoChoice} onAutoChange={setAutoChoice}
        onChoose={(choiceId) => decide('/api/engine/choice', { choiceId })} />

      {/* C06 직업 제안 */}
      <DecisionModal open={showJob} label="일자리" meta={`${life.currentAge}세 · ${year}년`}
        title="일자리 제안이 들어왔어요"
        text={`할 수 있는 일 ${life.jobOffers?.length || 0}가지예요. 고르면 바로 그 일을 시작해요.`}
        options={(life.jobOffers || []).map((j) => ({
          key: j.jobId, jobId: j.jobId, title: j.jobName, tag: `소득 ×${j.incomeRate}`,
          sub: `${INDUSTRY[j.industry] || j.industry} · ${EDU_REQ[j.requiredEdu] || j.requiredEdu}`,
        }))}
        busy={busy}
        onPick={(o) => decide('/api/engine/job', { jobId: o.jobId })}
        hint={autoChoice ? '자동 결정이 켜져 있어요. 잠시 뒤 운이 골라요.' : undefined}
        footer={(
          <FateFooter onFate={fateJob} busy={busy} auto={autoChoice} onAuto={setAutoChoice}>
            <Button type="ghost" size="sm" disabled={busy} onClick={() => setSkipJobAge(life.currentAge)}>올해는 넘기기</Button>
          </FateFooter>
        )} />
    </div>
  );
}

// 결정 창 아래 '운에 맡기기' 단추 + '앞으로 나오는 결정도 맡기기' (직업·이민 창, 선택 이벤트 창과 같은 모양)
function FateFooter({ onFate, busy, auto, onAuto, children }) {
  return (
    <div className="dec-fate">
      {children}
      <button type="button" className="dec-fate-b" disabled={busy} onClick={onFate}>운에 맡기기</button>
      <label className="dec-fate-auto">
        <input type="checkbox" checked={auto} onChange={(e) => onAuto(e.target.checked)} />
        앞으로 나오는 결정도 맡기기
      </label>
    </div>
  );
}

// 인생 지도 말풍선 (원작과 같은 내용): 나이·연도 / 행복·건강·순자산(15세부터) / 그해 돈 내역 3개 / 그해 큰 일 한 줄
function MapTipText({ age, life, y, feed, le }) {
  const year = life.birthYear + age;
  if (!y) {
    return <><b>{age}세 ({year}년)</b>{age === Math.floor(le) ? ' · 기대수명' : ''}</>;
  }
  const k = life.krwPerUsd;
  const big = feed.find((e) => e.age === age && (e.big || e.kind === 'death'));
  const flow = (y.flow || []).slice(0, 3);
  return (
    <>
      <b>{age}세 · {year}년</b><br />
      행복 {y.h} · 건강 {y.hl}{age >= 15 && y.nw != null ? ` · 순자산 ${won(y.nw, k)}` : ''}
      {flow.length > 0 && (<><br />{flow.map((m) => `${m.label} ${won(m.amount, k, true)}`).join(' · ')}</>)}
      {big && (<><br />{big.text.slice(0, 90)}</>)}
    </>
  );
}

// 나라 패널 줄 (원작 countryRows 중 우리 DB에 있는 값만, 값이 없는 줄은 뺌)
function countryRows(c) {
  if (!c) return [];
  const rows = [
    ['연간 출생아', c.births != null ? koBig(c.births) + '명' : null],
    ['인구', c.population != null ? koBig(c.population) + '명' : null],
    ['기대수명', c.lifeExpectancy != null ? c.lifeExpectancy.toFixed(1) + '세' : null],
    ['영아 사망률', c.infantMortality != null ? `1,000명당 ${fix1(c.infantMortality)}` : null],
    ['5세 미만 사망률', c.u5Mortality != null ? `1,000명당 ${fix1(c.u5Mortality)}` : null],
    ['1인당 GDP', c.gdpPerCapita != null ? money(c.gdpPerCapita) : null],
    ['도시 거주', c.urbanRate != null ? fix1(c.urbanRate) + '%' : null],
    ['농업 종사', c.agriRate != null ? fix1(c.agriRate) + '%' : null],
    ['공업 종사', c.industryRate != null ? fix1(c.industryRate) + '%' : null],
    ['서비스업 종사', c.serviceRate != null ? fix1(c.serviceRate) + '%' : null],
    ['초등 진학률', c.enrollElem != null ? fix1(c.enrollElem) + '%' : null],
    ['중등 진학률', c.enrollMiddle != null ? fix1(c.enrollMiddle) + '%' : null],
    ['고등 진학률', c.enrollHigh != null ? fix1(c.enrollHigh) + '%' : null],
    ['대학 진학률', c.enrollUni != null ? fix1(c.enrollUni) + '%' : null],
    ['합계출산율', c.tfr != null ? `${fix1(c.tfr)}명` : null],
    ['출생 성비', c.sexRatioBirth != null ? `여아 100명당 남아 ${Math.round(c.sexRatioBirth * 100)}명` : null],
    ['실업률', c.unemploymentRate != null ? fix1(c.unemploymentRate) + '%' : null],
    ['순이민률', c.netMigrationRate != null ? `1,000명당 ${c.netMigrationRate > 0 ? '+' : ''}${fix1(c.netMigrationRate)}` : null],
  ];
  return rows.filter((r) => r[1] != null);
}

// 살림 (원작 살림 패널): 순자산 · 소득(한국 체감, $PPP, 월) · 배우자 소득 · 소득 위치 · 지난 1년 순자산 내역 · 가진 것 · 다니는 길
function MoneyPanel({ life, year, countryName }) {
  const k = life.krwPerUsd;
  const kid = life.currentAge < 18;
  const flow = life.moneyFlow || [];
  const cRank = rankStr(life.incomeRankCountry);
  const aRank = rankStr(life.incomeRankAsia);
  return (
    <div className="pp-money2">
      <div className="pp-mrow">
        <small>순자산 <em>한국 체감</em></small>
        <b className={life.assets < 0 ? 'neg' : ''}>{won(life.assets, k)}</b>
        <small>{ppp(life.assets, k)} · {kid ? '아직 부모님 집에서 지내요' : life.assets < 0 ? '빚이 있어요' : '모아 둔 돈'}</small>
      </div>
      {life.income > 0 && (
        <div className="pp-mrow">
          <small>{life.jobStatus === 'RETIRED' ? '연금' : '내 소득'} <em>한국 체감</em></small>
          <b>{won(life.income, k)}</b>
          <small>{ppp(life.income, k)} · 월 {won(life.income / 12, k)}</small>
        </div>
      )}
      {life.spouseIncome > 0 && (
        <div className="pp-mrow">
          <small>배우자 소득 <em>한국 체감</em></small>
          <b>{won(life.spouseIncome, k)}</b>
          <small>{ppp(life.spouseIncome, k)} · 월 {won(life.spouseIncome / 12, k)}</small>
        </div>
      )}
      {cRank && (
        <p className="pp-rank">소득 위치: {countryName} <b>{cRank}</b>{aRank && <> · 아시아 <b>{aRank}</b></>}</p>
      )}
      {!kid && life.moneyDelta != null && (
        <div className="pp-flow">
          <div className="hd">지난 1년 순자산 <b className={life.moneyDelta < 0 ? 'neg' : 'pos'}>{won(life.moneyDelta, k, true)}</b></div>
          <ul>
            {flow.slice(0, 8).map((m) => (
              <li key={m.label}><span>{m.label}</span><span className={m.amount < 0 ? 'neg' : 'pos'}>{won(m.amount, k, true)}</span></li>
            ))}
          </ul>
        </div>
      )}
      <dl className="pp-own">
        <dt>가진 것</dt><dd>{belongings(life, year)}</dd>
        <dt>다니는 길</dt><dd>{commute(life, year)}</dd>
      </dl>
    </div>
  );
}

// 가족과 삶 (원작: 어머니 | 이름 · 나이 <small>직업</small>)
function FamilyRows({ life, countryName, stageText }) {
  const fam = life.family;
  return (
    <div className="pp-fam">
      {fam?.length ? fam.map((m, i) => (
        <div key={m.role + i} className={'row' + (m.alive ? '' : ' gone')}>
          <span>{m.role}</span>
          <span>
            {m.name && <>{m.name}{m.alive && m.age != null ? ` · ${m.age}세` : ''} </>}
            {!m.name && m.age != null && m.alive ? `${m.age}세 ` : ''}
            <small className="pwork">{m.job}</small>
          </span>
        </div>
      )) : (
        <>
          <div className="row"><span>부모님</span><span>{life.parentAlive === 'N' ? '세상을 떠나심' : '살아 계심'}</span></div>
          <div className="row"><span>배우자</span><span>{life.marriedYn === 'Y' ? '있음' : '없음'}</span></div>
          <div className="row"><span>자녀</span><span>{life.childCount > 0 ? life.childCount + '명' : '없음'}</span></div>
        </>
      )}
      <div className="row"><span>사는 곳</span><span>{countryName}{life.birthCountry !== life.currentCountry ? ' (이민)' : ''}</span></div>
      <div className="row"><span>지금 시기</span><span>{stageText || '아기'}</span></div>
    </div>
  );
}

// 신원 기록 뒤 무늬 (여권처럼 겹친 물결선)
function Guilloche() {
  const paths = [];
  for (let i = 0; i < 12; i++) {
    const y = 20 + i * 14;
    const a = 10 + (i % 4) * 3;
    paths.push(<path key={i} d={`M0 ${y} C 60 ${y - a}, 120 ${y + a}, 180 ${y} S 300 ${y - a}, 360 ${y}`} />);
  }
  return <svg className="pp-guilloche" viewBox="0 0 360 200" preserveAspectRatio="none" aria-hidden="true">{paths}</svg>;
}

// 신원 기록 사진 자리: 픽셀 얼굴 (나이대에 따라 머리색, 성별에 따라 머리 길이)
function Portrait({ gender, age }) {
  const hair = age >= 60 ? '#b9b9b9' : age >= 45 ? '#5a4a42' : '#2b2420';
  const shirt = gender === 'F' ? 'var(--primary)' : 'var(--blue)';
  return (
    <svg className="pp-photo" viewBox="0 0 16 20" shapeRendering="crispEdges" aria-hidden="true">
      <rect width="16" height="20" style={{ fill: 'var(--panel-2)' }} />
      <rect x="4" y="4" width="8" height="8" fill="#f1c9a2" />
      <rect x="3" y="3" width="10" height="3" fill={hair} />
      {gender === 'F' && <><rect x="3" y="6" width="2" height="7" fill={hair} /><rect x="11" y="6" width="2" height="7" fill={hair} /></>}
      <rect x="6" y="8" width="1" height="1" fill="#13212A" />
      <rect x="9" y="8" width="1" height="1" fill="#13212A" />
      <rect x="7" y="10" width="2" height="1" fill="#c47a6a" />
      <rect x="3" y="13" width="10" height="7" style={{ fill: shirt }} />
    </svg>
  );
}

// 생존 곡선 그림 (원작 '생존 곡선' 패널)
function SurvivalChart({ curve, age, ended }) {
  const W = 300;
  const H = 150;
  const L = 30;
  const B = 130;
  const X = (a) => L + (a / 100) * (W - L - 6);
  const Y = (p) => B - p * (B - 10);
  let d = '';
  for (let a = 0; a <= 100; a++) d += (a ? 'L' : 'M') + X(a).toFixed(1) + ' ' + Y(curve[a]).toFixed(1);
  const cur = Math.min(100, age);
  const p = curve[cur];
  return (
    <div className="pp-chart">
      <svg viewBox={`0 0 ${W} ${H + 14}`} role="img" aria-label={`${cur}세까지 같은 해 태어난 사람의 약 ${Math.round(p * 100)}%가 살아 있어요`}>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - 6} y1={Y(v)} y2={Y(v)} className="gl" />
            <text x={L - 4} y={Y(v) + 3} textAnchor="end">{v * 100}%</text>
          </g>
        ))}
        {[0, 20, 40, 60, 80, 100].map((a) => <text key={a} x={X(a)} y={H + 2} textAnchor="middle">{a}</text>)}
        <path d={d} className="cv" />
        <line x1={X(cur)} x2={X(cur)} y1={Y(0)} y2={Y(p)} className="now" />
        <circle cx={X(cur)} cy={Y(p)} r="4" className={ended ? 'dot end' : 'dot'} />
        <text x={Math.min(W - 60, X(cur) + 6)} y={Math.max(14, Y(p) - 8)} className="lab">{Math.round(p * 100)}% 생존</text>
      </svg>
    </div>
  );
}

export default PlayPage;
