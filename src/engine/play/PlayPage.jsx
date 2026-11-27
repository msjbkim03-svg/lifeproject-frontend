// C03 인생 진행 화면 (주소: /play) - 원작(1in8b) 진행 화면 구색을 따름
//   위: 진행 막대 (나이 · 연도 · 한 해 진행 막대 · 멈춤 · 배속 1~16× · 다음 결정까지 · 음악 · 나가기)
//   왼쪽: 신원 기록(여권 카드) · 상태(능력치) · 살림 (한국 체감 원, 소득 위치, 지난 1년 순자산 내역, 내 물건, 주로 다니는 곳)
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
//   선택 이벤트는 '자동으로 선택하기'로 무작위 결정, '앞으로도 맡기기'를 켜면 알아서 골라요 (localStorage autoChoice)
// - 죽으면(status ENDED) 잠깐 보여 주고 /result/:lifeId 로 이동 (C18)
import { Fragment, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import client from '../../api/api';
import EventChoiceModal from '../../common/ui/EventChoiceModal';
import { autoWaitSec, autoPickOf } from '../../common/ui/autoPick';
import DecisionModal from '../../common/ui/DecisionModal';
import EffectChips from '../../common/ui/EffectChips';
import Button from '../../common/ui/Button';
import Modal from '../../common/ui/Modal';
import Spoon from '../../common/ui/Spoon.jsx';
import { SPOONS } from '../../common/ui/spoon.js';
import ChatVillage from '../../pages/chat/ChatVillage';
import Figure from '../village/Figure';
import { lookOf } from '../village/costumeData';
import { placeOf, THEMES, COUNTRIES, houseOf, vehicleOf, homeFamily, petOf } from '../village/villageData';
import { survivalCurve } from './lifeCurve';
import useBgm from './useBgm';
import ShopSheet from './ShopSheet';
import CostumeSheet from '../../pages/costume/CostumeSheet';
import { won, ppp, PPP_TIP, rankStr, splitMoney, feedKind, belongings, commute, traitLine, ro, iga, ownNames, countryWithHist } from './lifeText';
import { TRAIT_VIEW } from '../../utils/traits';
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
const RESULT_DELAY = 3500;                   // 죽은 뒤 엔딩 크레딧(/result, C22)까지
const MAX_FEED = 1200;                       // 화면에 남겨 둘 기록 줄 수 (인생 지도 말풍선이 옛 해 이야기도 찾게, 100년 × 한 해 5~8줄)

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
    case 'STUDENT': return ['STUDY', 'PLAY', 'HOUSE', 'SPORT', 'HOBBY', ...(age >= 15 ? ['JOB_PREP'] : [])];
    case 'YOUTH': return ['HOUSE', 'PLAY', 'SPORT', 'HOBBY'];
    case 'UNIV': return ['STUDY', 'PLAY', 'PARTTIME', 'JOB_PREP', 'SPORT', 'HOBBY', ...love];
    case 'WORKER': return ['WORK', 'BALANCE', 'FAMILY', 'HEALTH', 'SELF_DEV', 'HOBBY', ...love];
    case 'JOBLESS': return ['FAMILY', 'HEALTH', 'SELF_DEV', 'HOBBY', 'REST', ...(age < 40 ? ['JOB_PREP'] : []), ...love];
    case 'SENIOR': return [...(life.jobStatus === 'EMPLOYED' ? ['WORK'] : []), 'FAMILY', 'HEALTH', 'BRAIN', 'HOBBY', 'REST', 'FAITH'];
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

// 서버 오류 문구 꺼내기
const errText = (err) => {
  const msg = err.response?.data;
  if (typeof msg === 'string' && msg) return msg;
  return err.response ? '서버에서 오류가 났어요.' : '서버에 연결할 수 없어요.';
};

const schoolText = (life) => {
  if (life.schoolStatus === 'ENROLLED' && SCHOOL[life.eduLevel]) return SCHOOL[life.eduLevel] + ' 재학';
  if (life.currentAge < 6 && (!life.eduLevel || life.eduLevel === 'NONE')) return '취학 전';
  // 중퇴는 그 학교 이름으로 ('중졸 (중퇴)'처럼 졸업한 것처럼 보였음, 11/26)
  if (life.schoolStatus === 'DROPPED' && SCHOOL[life.eduLevel]) return SCHOOL[life.eduLevel] + ' 중퇴';
  return EDU[life.eduLevel] || '학력 없음';
};
const jobText = (life) => {
  if (life.jobStatus === 'EMPLOYED') return life.jobName || '일하는 중';
  if (life.jobStatus === 'UNEMPLOYED') return '구직 중';
  if (life.jobStatus === 'RETIRED') return '은퇴';
  if (life.jobStatus === 'PRISON') return '수감 중';
  return life.currentAge < 15 ? '—' : '일 없음';
};

// 나라 국기 (마을과 같은 flagcdn 그림, 코드가 없으면 안 그림)
function Flag({ cc }) {
  const code = COUNTRIES[cc]?.[0];
  return code ? <img className="pp-flag" src={`https://flagcdn.com/w40/${code}.png`} alt="" width="18" height="12" /> : null;
}

// 엔진 응답 events → 기록 줄 [{ age, text, big, fx, eventId, alert }] (색은 feedKind)
//   alert: 서버가 고른 '큰 사건' 문장 (alerts) 에 들어 있으면 경고등
const toLines = (age, events, alerts) => (events || [])
  .filter((e) => e && e.logText)
  .map((e) => ({ age, text: e.logText, big: !!e.eventId, fx: e, eventId: e.eventId, alert: (alerts || []).includes(e.logText), ...(e.eventType === 'INHERIT' ? { kind: 'ledger' } : {}) }));
// 세상을 떠난 해의 상속 줄(INHERIT)은 사망 줄 뒤에 (원작 순서)
const isInherit = (l) => l.fx?.eventType === 'INHERIT';

const PET_WORD = { d: '강아지', c: '고양이', h: '햄스터', r: '토끼', b: '앵무새', f: '물고기' };

// 결정 줄 (원작 '결정: …' ▸): 고른 것의 이름을 결정 요청 전에 지금 상태에서 찾아 둠
//   선택지 끝의 괄호 설명은 뺌 (예: '고양이를 들인다 (12~18년 함께 …)' → '고양이를 들인다')
const decLabel = (l, url, body) => {
  if (!l) return null;
  if (url.endsWith('/job')) {
    const j = (l.jobOffers || []).find((x) => x.jobId === body.jobId);
    return j ? `${j.jobName} 일을 한다` : null;
  }
  if (url.endsWith('/destination')) {
    const d = (l.destinations || []).find((x) => x.countryCode === body.countryCode);
    return `${ro(d?.nameKo || body.countryCode)} 떠난다`;
  }
  const c = (l.pendingEvent?.choices || []).find((x) => x.choiceId === body.choiceId);
  return c?.choiceText ? c.choiceText.replace(/\s*\([^)]*\)\s*$/, '') : null;
};

// 한 해를 마칠 때 덧붙이는 줄: 돈 줄(ledger)·죽음(death)
const yearEndLines = (d, age) => {
  const out = [];
  if (age >= 18 && d.moneyDelta) {
    // 누르면 그해 돈 내역 (원작 ledger 펼치기)
    out.push({ age, kind: 'ledger', text: `지난 1년 순자산 ${won(d.moneyDelta, d.krwPerUsd, true)} (한국 체감)`, flow: d.moneyFlow || [], krw: d.krwPerUsd });
  }
  if (d.status === 'ENDED') {
    out.push({ age, kind: 'death', text: `${d.deathAge ?? age}세, ${d.deathCause ? ro(d.deathCause) + ' ' : ''}세상을 떠났다.` });
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
  const [openLedger, setOpenLedger] = useState(null);  // 펼친 '지난 1년 순자산' 줄 (돈 내역)
  const [busy, setBusy] = useState(false);            // 결정 요청 중
  const [skipJobAge, setSkipJobAge] = useState(null); // 이 나이엔 직업 제안 건너뜀
  // 잠시 멈춤 (원작 reflect): 5·15·30·50·70세에 한 번, 이미 본 나이는 이 브라우저에 기억 ('인생번호:나이')
  const [reflectOff, setReflectOff] = useState(() => { try { return localStorage.getItem('reflectOff') === 'Y'; } catch { return false; } });
  const [reflectDone, setReflectDone] = useState(() => { try { return JSON.parse(localStorage.getItem('reflectDone') || '[]'); } catch { return []; } });
  const [destPick, setDestPick] = useState(null);     // 이민 목적지: 한 번 누르면 표시, 한 번 더 누르면 결정
  const [hidden, setHidden] = useState(typeof document !== 'undefined' && document.hidden);
  const [years, setYears] = useState({});             // 인생 지도: 나이 → { h 행복, hl 건강, nw 순자산, flow 그해 돈 내역 }
  const [mapTip, setMapTip] = useState(null);         // 인생 지도 말풍선 { age, x, y }
  const [traits, setTraits] = useState(null);         // 특성 칸 { traits: [{ traitId, level, effect }], temper }
  const [ctyView, setCtyView] = useState('born');     // 나라 패널: born 태어난 나라 (기본, 11/25 동현님: 이민 가도 출생 나라 기준) / cur 사는 나라
  const [ctyEra, setCtyEra] = useState('cur');        // 나라 패널 시대: cur 현재 나이 연대 (기본, 11/27 동현님) / born 출생 시대(태어난 해 연대)
  const [cty, setCty] = useState(null);               // 나라 패널 통계 (GET /api/engine/country)
  const [shopOpen, setShopOpen] = useState(false);    // 돈 쓰기 · 투자 창 (여는 동안 시간 멈춤)
  const [costumeOpen, setCostumeOpen] = useState(false); // C21 옷 가게 창 (여는 동안 시간 멈춤)
  const [wear, setWear] = useState({});                 // C21 입은 착장 { hair, top, hat } (해마다 life 가 바뀌어도 유지)
  const [endOpen, setEndOpen] = useState(false);       // 삶을 마감 확인 창 (여는 동안 시간 멈춤, 11/25 동현님)
  const [endName, setEndName] = useState('');          // 확인용으로 입력한 이름
  const [endBusy, setEndBusy] = useState(false);
  const [endErr, setEndErr] = useState('');
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
        byAge[age].slice().reverse().forEach((g) => out.push({ id: ++lineSeq.current, age, text: g.logText, big: !!g.eventId, eventId: g.eventId, hist: g.eventType === 'HIST', alert: g.alert === 'Y' }));
      });
      setFeed(out.slice(0, MAX_FEED));
    } catch (err) {
      console.log('인생 기록 불러오기 실패', err.response?.data);
    }
  }, [guestToken]);

  // ① 진행 중인 인생 불러오기 (새로고침, 이어하기, 409 뒤)
  //    상태는 서버 응답이 온 뒤(then/catch 콜백)에서만 바꿔요 - 첫 화면 effect 에서 불러도 렌더가 겹치지 않게
  const reload = useCallback(() => {
    yr.current = { data: null, fetching: false, t: 0, t0: 0, shown: 0, focus: null, focusing: false };
    setProg(0);
    return client.get('/api/engine/current', { params: { guestToken } })
      .then((res) => {
        setLife(res.data);
        loadLogs(res.data);
        setError('');
      })
      .catch((err) => {
        if (err.response?.status === 404) setError('진행 중인 인생이 없어요. 메인에서 새로 태어나 주세요.');
        else setError(errText(err));
      })
      .finally(() => setLoading(false));
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
      const label = decLabel(l, url, body);
      // 원작처럼 따로 '결정:' 줄을 두지 않고, 결과 줄 위에 무엇을 물었는지 작게 (원작 log 의 q)
      const q = url.endsWith('/job') ? '일자리' : url.endsWith('/destination') ? '어디로 갈까?' : l.pendingEvent?.title;
      const res = await client.post(url, { lifeId: l.lifeId, guestToken, ...body });
      setLife(res.data);
      const lines = toLines(res.data.currentAge - 1, res.data.events, res.data.alerts);
      if (lines.length && q) lines[0] = { ...lines[0], q };
      else if (!lines.length && label) lines.push({ age: res.data.currentAge - 1, kind: 'dec', text: label, q });
      pushLines(lines);
    } catch (err) {
      setNotice(errText(err));
      // 409(먼저 할 일이 있음)·400(그 결정이 이미 없음)이면 서버 상태로 다시 맞춤
      //   예: 작은 선택 창이 떠 있는 동안 서버를 재시작하면 서버의 선택은 사라져서 400 → 예전 창이 계속 남던 것
      const st = err.response?.status;
      if (st === 409 || st === 400) await reload();
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [guestToken, pushLines, reload]);

  // 잠시 멈춤 닫기: 적은 글이 있으면 인생 기록에 남기고(POST /api/engine/note), 이 나이는 다시 묻지 않음
  const closeReflect = useCallback(async (text, off) => {
    const l = lifeRef.current;
    if (!l) return;
    const key = `${l.lifeId}:${l.currentAge}`;
    const next = [...reflectDone.filter((k) => k !== key), key].slice(-200);
    setReflectDone(next);
    try { localStorage.setItem('reflectDone', JSON.stringify(next)); } catch { /* 무시 */ }
    if (off) {
      setReflectOff(true);
      try { localStorage.setItem('reflectOff', 'Y'); } catch { /* 무시 */ }
    }
    const t = (text || '').trim();
    if (!t) return;
    try {
      const res = await client.post('/api/engine/note', { lifeId: l.lifeId, guestToken, text: t, atAge: l.currentAge });
      pushLines([{ age: l.currentAge, kind: 'note', text: res.data }]);
    } catch (err) {
      setNotice(errText(err));
    }
  }, [reflectDone, guestToken, pushLines]);

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
    pushLines([{ age: l.currentAge, kind: 'dec', focusKey, text: `${late ? '다음 해' : '올해'}의 초점을 ${ro(`'${focusLabel(focus, l)}'`)} 정했다.` }]);
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
  const reflectKey = life ? `${life.lifeId}:${life.currentAge}` : '';
  const showReflect = !!life && life.status === 'PLAYING' && !reflectOff && REFLECT_AGES.includes(life.currentAge)
    && !reflectDone.includes(reflectKey) && !showDest && !showChoice && !showJob;
  const waiting = showDest || showChoice || showJob || showReflect;
  const yearSec = ff ? FF_SEC : yearSecOf(life?.lifeExpectancy) / speed;

  // 결정 창이 뜨면 빨리 감기 끝 (waiting 이 바뀐 렌더에서 바로 끔 - React 권장 방식, effect 로 한 번 더 그리지 않음)
  // 상태창: 작년 값 기억 (나이마다 마지막으로 본 4가지 수치) → 막대 위 '작년' 눈금과 ▲▼ 변화량
  //   새로고침 직후엔 작년 값이 없어서 눈금·변화량을 안 그림. 다른 인생이 시작되면 비움
  const [statHist, setStatHist] = useState({ lifeId: null, rows: {} });
  if (life) {
    const cur = STATS.map(([k]) => Math.max(0, Math.min(100, Math.round(life[k] || 0)))).join(',');
    const base = statHist.lifeId === life.lifeId ? statHist.rows : {};
    if (statHist.lifeId !== life.lifeId || base[life.currentAge] !== cur) setStatHist({ lifeId: life.lifeId, rows: { ...base, [life.currentAge]: cur } });
  }
  const lastYear = life ? statHist.rows[life.currentAge - 1]?.split(',').map(Number) : null;

  // 신원 기록 등급: 18세까지 집안 수저, 19세부터 내 소득(나라 안 순위) 5구간 색. 은퇴하면 마지막 등급을 흐리게
  const [lastTier, setLastTier] = useState({ lifeId: null, t: null });
  const tier = life ? tierOf(life, lastTier.lifeId === life.lifeId ? lastTier.t : null) : null;
  if (life && tier.kind === 'income' && (lastTier.lifeId !== life.lifeId || lastTier.t?.key !== tier.key || lastTier.t?.title !== tier.title)) setLastTier({ lifeId: life.lifeId, t: tier });
  // 등급이 바뀐 해: 띠가 한 번 반짝이고 '▲ 상위 12%' 배지 (색 구간이 바뀔 때만)가 잠깐 뜸 (처음 불러올 때는 안 뜸)
  const [tierSeen, setTierSeen] = useState({ lifeId: null, key: null, n: 0, pop: null });
  if (life && (tierSeen.lifeId !== life.lifeId || tierSeen.key !== tier.key)) {
    const same = tierSeen.lifeId === life.lifeId && tierSeen.key != null;
    const pop = same && tier.n && tierSeen.n && tier.n !== tierSeen.n ? { k: (tierSeen.pop?.k || 0) + 1, dir: tier.n > tierSeen.n ? 'up' : 'dn' } : tierSeen.pop;
    setTierSeen({ lifeId: life.lifeId, key: tier.key, n: tier.n || 0, pop });
  }

  const [prevWaiting, setPrevWaiting] = useState(waiting);
  if (prevWaiting !== waiting) {
    setPrevWaiting(waiting);
    if (waiting) setFf(false);
  }

  // 결정 운에 맡기기: 직업 제안·이민 목적지 (선택 이벤트는 EventChoiceModal 이 직접 처리)
  //   '자동 결정'이 켜져 있으면 원작처럼 고를 것을 먼저 표시하고 글 길이만큼(5~14초) 기다린 뒤 넘어감
  //   창(버튼 밖)을 누르면 그 창은 자동 결정을 멈춤 (autoStopAt: 멈춘 창의 나이·종류)
  const fateJob = useCallback(() => {
    const offers = lifeRef.current?.jobOffers || [];
    if (offers.length) decide('/api/engine/job', { jobId: offers[Math.floor(Math.random() * offers.length)].jobId });
  }, [decide]);
  const fateDest = useCallback(() => {
    const ds = lifeRef.current?.destinations || [];
    if (ds.length) decide('/api/engine/destination', { countryCode: ds[Math.floor(Math.random() * ds.length)].countryCode });
  }, [decide]);
  const [autoStopAt, setAutoStopAt] = useState(null);
  const decKind = showDest ? 'dest' : showJob ? 'job' : null;
  const decStopKey = decKind ? `${decKind}|${life?.lifeId}|${life?.currentAge}` : null;
  const decAutoOn = !!(autoChoice && decKind && autoStopAt !== decStopKey);
  const decAutoKey = !decAutoOn ? null : decKind === 'dest'
    ? autoPickOf(life.destinations, decStopKey)?.countryCode
    : autoPickOf(life.jobOffers, decStopKey)?.jobId;
  const decAutoSec = !decAutoOn ? 0 : autoWaitSec(decKind === 'dest'
    ? ['이민 갈 나라를 골라요', ...(life.destinations || []).map((d) => d.nameKo || d.countryCode)]
    : ['일자리 제안이 들어왔어요', ...(life.jobOffers || []).map((j) => j.jobName)], speed);
  useEffect(() => {
    if (!decAutoOn || busy || decAutoKey == null) return undefined;
    const t = setTimeout(() => (decKind === 'dest'
      ? decide('/api/engine/destination', { countryCode: decAutoKey })
      : decide('/api/engine/job', { jobId: decAutoKey })), decAutoSec * 1000);
    return () => clearTimeout(t);
  }, [decAutoOn, busy, decAutoKey, decAutoSec, decKind, decide]);
  const decAuto = decAutoKey == null ? undefined
    : { key: decAutoKey, sec: decAutoSec, onStop: () => setAutoStopAt(decStopKey), onOff: () => setAutoChoice(false) };

  // ② 한 해 흐르기: 막대가 차는 동안 미리 받은 그해 일을 하나씩 보여 주고, 다 차면 나이 +1
  //    매 프레임 막대는 DOM 으로 바로 칠하고(React 다시 그리기 없음), 해가 바뀔 때만 화면을 새로 그려서 버벅임 없음
  //    다음 해는 막대가 끝나기 조금 전에 미리 요청해 두어 해 사이에 멈춤이 없게 함
  const running = !!life && !ended && !paused && !hidden && !waiting && !busy && !error && !shopOpen && !costumeOpen && !endOpen;
  // 화면을 다시 그린 뒤 진행 막대를 지금 위치로 맞춤 (막대가 새로 만들어져도 0으로 보이지 않게)
  useLayoutEffect(() => { if (!ended) setProg(yr.current.t); });
  const loopRef = useRef({ yearSec, guestToken, pushLines, remember, reload });
  useEffect(() => { loopRef.current = { yearSec, guestToken, pushLines, remember, reload }; });
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
        const all = toLines(age, d.events, d.alerts);
        const lines = all.filter((l) => !isInherit(l));
        // 그해 일을 남은 막대 위에 고르게 나눠서 하나씩
        const part = y.t0 >= 1 ? 1 : (y.t - y.t0) / (1 - y.t0);
        const due = Math.min(lines.length, Math.floor(part * (lines.length + 1)));
        if (due > y.shown) {
          push(lines.slice(y.shown, due));
          y.shown = due;
        }
        if (y.t >= 1) {
          push([...lines.slice(y.shown), ...yearEndLines(d, age), ...all.filter(isInherit)]);
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
  }, [running]);

  // 돈 쓰기 · 투자 (C06-3): 그해 요청 중이면 끝날 때까지 기다렸다가 보냄, 사고 나면 돈·능력치만 바꾸고 기록 한 줄
  //   이미 받아 둔 그해 응답(y.data)이 있으면 거기에도 반영 (해가 끝날 때 예전 돈으로 되돌아가지 않게)
  const waitIdle = useCallback(async () => {
    while (yr.current.fetching) await new Promise((r) => setTimeout(r, 100));
  }, []);
  const onShopDone = useCallback((dto) => {
    // 돈 쓰기로 바뀐 능력치를 기록 줄 아래 효과 칩으로 (11/23: 기록에 상태 변화가 안 보였음)
    const prev = lifeRef.current || {};
    const d = (k) => Math.round((dto[k] ?? prev[k] ?? 0) - (prev[k] ?? 0));
    const fx = { effHealth: d('health'), effHappiness: d('happiness'), effKnowledge: d('knowledge'), effRelation: d('relation') };
    const hasFx = Object.values(fx).some((v) => v !== 0);
    const patch = {
      assets: dto.assets, health: dto.health, happiness: dto.happiness, knowledge: dto.knowledge,
      relation: dto.relation, investType: dto.investType, owns: dto.owns,
      houseValue: dto.houseValue, carValue: dto.carValue,
    };
    setLife((x) => ({ ...x, ...patch }));
    if (yr.current.data) yr.current.data = { ...yr.current.data, ...patch };
    if (dto.message) pushLines([{ age: prev.currentAge ?? dto.logAge, kind: 'dec', text: dto.message, ...(hasFx ? { fx } : {}) }]);
  }, [pushLines]);
  const closeShop = useCallback(() => setShopOpen(false), []);
  // C21 옷 가게: 인생을 불러오면 입은 착장을 받아 두고, 사거나 갈아입으면 돈·착장만 바꿈
  const wearLifeId = life?.lifeId;
  useEffect(() => {
    if (!wearLifeId) return;
    client.get('/api/costumes', { params: { lifeId: wearLifeId, guestToken } })
      .then((res) => setWear(res.data.wear || {}))
      .catch(() => { });
  }, [wearLifeId, guestToken]);
  const onCostumeDone = useCallback((data) => {
    setWear(data.wear || {});
    setLife((x) => ({ ...x, assets: data.assets }));
    if (yr.current.data) yr.current.data = { ...yr.current.data, assets: data.assets };
  }, []);
  const closeCostume = useCallback(() => setCostumeOpen(false), []);

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
  //    이민 전(또는 태어난 나라로 돌아옴)이면 태어난 나라 보기 단추가 없으니 늘 사는 나라
  //    출생 시대와 현재 연대가 같으면 출생 시대 보기 단추가 없으니 늘 현재 시대 (11/27 동현님)
  const ctyMode = life && life.birthCountry !== life.currentCountry ? ctyView : 'cur';
  const ctyCode = life ? (ctyMode === 'born' ? life.birthCountry : life.currentCountry) : null;
  const bornDecade = life ? Math.floor(life.birthYear / 10) * 10 : null;
  const curDecade = life ? Math.floor((life.birthYear + life.currentAge) / 10) * 10 : null;
  const eraChanged = life ? bornDecade !== curDecade : false;
  const eraMode = eraChanged ? ctyEra : 'cur';
  const ctyDecade = eraMode === 'born' ? bornDecade : curDecade;
  useEffect(() => {
    if (!life?.lifeId || !ctyCode) return undefined;
    let alive = true;
    client.get('/api/engine/country', { params: { lifeId: life.lifeId, guestToken, view: ctyMode, era: eraMode } })
      .then((res) => { if (alive) setCty(res.data); })
      .catch((err) => console.log('나라 통계 불러오기 실패', err.response?.data));
    return () => { alive = false; };
  }, [life?.lifeId, ctyCode, ctyDecade, ctyMode, eraMode, guestToken]);

  // ⑤ 특성 칸 (C13): 인생마다 한 번 + 어릴 때 기질을 고른 뒤(5세까지 선택 창이 닫힐 때) 다시
  const traitKey = life ? (life.currentAge <= 5 ? `${life.currentAge}-${life.needChoice ? 1 : 0}` : 'grown') : null;
  useEffect(() => {
    if (!life?.lifeId) return undefined;
    let alive = true;
    client.get('/api/engine/traits', { params: { lifeId: life.lifeId, guestToken } })
      .then((res) => { if (alive) setTraits(res.data); })
      .catch((err) => console.log('특성 불러오기 실패', err.response?.data));
    return () => { alive = false; };
  }, [life?.lifeId, traitKey, guestToken]);

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

  // 이민 목적지 창이 새로 뜨거나 닫히면 한 번 누른 표시를 지움 (바뀐 렌더에서 바로)
  const needDest = life?.needDestination;
  const [prevNeedDest, setPrevNeedDest] = useState(needDest);
  if (prevNeedDest !== needDest) {
    setPrevNeedDest(needDest);
    setDestPick(null);
  }

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
  //   서버가 준 값(life.survival: 그해 통계로 한 해씩 계산, 인생 기록의 '15세. … 약 n%' 줄과 같은 값)을 쓰고, 없으면 화면 근사
  const curve = useMemo(
    () => (life ? (life.survival?.length ? life.survival : survivalCurve(life.lifeExpectancy || 70, life.infantMortality || 30)) : null),
    [life?.survival, life?.lifeExpectancy, life?.infantMortality], // eslint-disable-line react-hooks/exhaustive-deps
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
  const countryText = countryWithHist(countryName, life.histName);
  // 학교·일 없는 6~17세(YOUTH)는 13세부터 '청소년 시절'
  const stageText = (life.stageCode === 'YOUTH' && life.currentAge >= 13 ? '청소년 시절' : STAGE[life.stageCode])
    || (life.currentAge < 6 ? '아기 시절' : '');
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
                <i ref={progRef} style={{ transform: `scaleX(${ended ? 1 : 0})` }} />
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
              title="결정 창(선택 이벤트·일자리·이민)이 뜨면 잠깐 보여 준 뒤 자동으로 골라요"
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

            {!ended && (
              <button type="button" className="pp-b pp-quit" onClick={() => { setEndName(''); setEndErr(''); setEndOpen(true); }}>삶을 마감</button>
            )}
            <button type="button" className="pp-b ghost" onClick={() => navigate('/')}>나가기</button>
          </div>
        </div>
      </header>

      {notice && <div className="pp-notice" role="status">{notice}</div>}

      <div className="pp-wrap pp-life">
        {/* ───── 왼쪽: 나 ───── */}
        <div className="pp-col">
          <section className={'pp-panel pp-id' + (tier.dim ? ' dim' : '')}
            style={{ '--tier': tier.color, '--tier-edge': tier.edge }}>
            <Guilloche />
            {/* 진한 등급색 띠 + 오른쪽 흰 알약 칩(안에 등급색 점). 등급이 바뀐 해엔 한 번 반짝임 */}
            <div className="pp-id-top" key={tier.key}><span>신원 기록 · {life.birthCountry}</span><span className="pp-id-chip"><i className="pp-id-dot" aria-hidden="true" />{tier.title}</span></div>
            {tierSeen.pop && <span key={tierSeen.pop.k} className={'pp-tier-pop ' + tierSeen.pop.dir} role="status">{tierSeen.pop.dir === 'up' ? '▲' : '▼'} {tier.title}</span>}
            <div className="pp-id-in">
              <Portrait gender={life.gender} age={life.currentAge} costume={life.costume || wear} />
              <div>
                <div className="pp-id-nm">{life.name}</div>
                <dl className="pp-id-dl">
                  <dt>성별</dt><dd>{life.gender === 'M' ? '남성' : '여성'}</dd>
                  <dt>출생</dt><dd><Flag cc={life.birthCountry} />{countryText} · {life.birthYear}년</dd>
                  <dt>거주</dt><dd><Flag cc={life.currentCountry} />{countryName} · {town}</dd>
                  <dt>출신 가정</dt>
                  <dd><Spoon level={life.originClass ?? life.wealthClass} /></dd>{/* 태어난 집 형편만 (지금 형편 ▲▼ 표시는 뺌, 11/25 동현님) */}
                  <dt>학력</dt><dd>{schoolText(life)}</dd>
                  <dt>직업</dt><dd>{jobText(life)}</dd>
                  {tier.kind !== 'spoon' && <><dt>소득</dt><dd title="내 소득(연봉)을 사는 나라 사람들과 견준 위치예요">{tier.title}</dd></>}
                </dl>
              </div>
            </div>
          </section>

          <section className="pp-panel">
            <h3 className="pp-h"><span>상태</span><span className="pp-lbl">0–100</span></h3>
            {STATS.map(([key, label, color], si) => {
              const v = Math.max(0, Math.min(100, Math.round(life[key] || 0)));
              const before = lastYear ? lastYear[si] : null;
              const diff = before == null ? null : v - before;
              return (
                <div key={key} className="pp-stat">
                  <span>{label}</span>
                  <span className="pp-track" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={v}>
                    <span className="pp-bar"><i style={{ width: v + '%', background: color }} /></span>
                    <span className="pp-knob" style={{ left: v + '%', borderColor: color }}><StatIcon name={key} color={color} /></span>
                  </span>
                  <span className="pp-v">{v}</span>
                  <span className={'pp-dv' + (diff > 0 ? ' up' : diff < 0 ? ' dn' : '')}>
                    {diff == null ? '' : diff > 0 ? `▲${diff}` : diff < 0 ? `▼${-diff}` : '그대로'}
                  </span>
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
            {!ended && (
              <button type="button" className="shop-b ghost pp-shopbtn" disabled={waiting} title={waiting ? '결정 창을 먼저 골라 주세요' : undefined}
                onClick={() => setCostumeOpen(true)}>
                옷 가게
              </button>
            )}
          </section>

          {/* 내 퀘스트: 시작할 때 고른 것을 계속 보이게 (퀘스트를 안 고른 인생·비회원은 칸을 안 그림) */}
          {life.quests?.length > 0 && (
            <section className="pp-panel pp-quests">
              <h3 className="pp-h"><span>내 퀘스트</span><span className="pp-lbl">{life.quests.length}개</span></h3>
              <ul>
                {life.quests.map((q) => (
                  <li key={q.questId} className={q.achieved === 'Y' || q.live === 'Y' ? 'done' : q.live === 'NOW' ? 'now' : ''}>
                    <b>{q.questName}{(q.achieved === 'Y' || q.live === 'Y') && <em className="pp-qdone"> 달성</em>}
                      {q.achieved == null && q.live === 'NOW' && <em className="pp-qnow" title="끝날 때 상태로 판정해요. 지금은 조건을 채우고 있어요."> 지금 달성 중</em>}</b>
                    {q.description && <small>{q.description}</small>}
                    {/* 기대수명 퀘스트: 태어난 해 기대수명 기준이라 화면 오른쪽 나라 칸(지금 해 기대수명)과 헷갈리지 않게 목표 나이를 바로 보여 줌 (11/24) */}
                    {q.questType === 'AGE_EXP' && life.lifeExpectancy != null && Number.isFinite(Number(q.targetValue)) && (
                      <small className="pp-qgoal">
                        목표 {Math.ceil(life.lifeExpectancy + Number(q.targetValue))}세까지 (태어난 해 기대수명 {Math.round(life.lifeExpectancy)}세 + {Number(q.targetValue)}년)
                      </small>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 비회원 안내 (C03-8): 이어하기는 이 브라우저의 임시 토큰으로만 됨 */}
          {guestToken && (
            <section className="pp-panel pp-guest" role="note">
              <p>브라우저 기록을 지우면 이어하기가 사라져요. 회원가입하면 계속 보관돼요.</p>
              <div className="pp-guest-b">
                <button type="button" className="pp-b" onClick={() => navigate('/join')}>회원가입</button>
                <button type="button" className="pp-b" onClick={() => navigate('/login')}>로그인</button>
              </div>
            </section>
          )}
        </div>

        {/* ───── 가운데: 마을 · 올해의 초점 · 인생 기록 ───── */}
        <div className="pp-col">
          <section className="pp-panel pp-scene">
            <ChatVillage countryCode={life.currentCountry} age={life.currentAge} gender={life.gender}
              place={placeOf(life)} urban={life.isUrban === 'Y'} family={homeFamily(life)}
              house={houseOf(life)} vehicle={vehicleOf(life)} costume={life.costume || wear}
              industry={life.jobIndustry} pet={petOf(life)} happiness={life.happiness} />
            <p className="pp-scenecap"><Flag cc={life.currentCountry} />{countryText} · {town} · {stageText}{life.jobStatus === 'EMPLOYED' && life.jobName ? ` · ${life.jobName}` : ''}</p>
          </section>

          {ended ? (
            <section className="pp-panel pp-end">
              <h3 className="pp-h"><span>삶을 마쳤어요</span></h3>
              <p>
                <b>{life.name}</b> 님은 {life.birthYear + deathAge}년, {deathAge}세에 세상을 떠났어요.
                {life.deathCause && <span className="pp-sub"> ({life.deathCause})</span>}
              </p>
              <p className="pp-sub">잠시 뒤 엔딩 크레딧이 시작돼요.</p>
              <Button type="primary" onClick={() => navigate(`/result/${life.lifeId}`)}>엔딩 크레딧 바로 보기</Button>
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
                {feed.map((e, i) => {
                  const kind = feedKind(e);
                  return (
                    <li key={e.id ?? `k${i}`} className={[kind ? 'fk-' + kind : '', e.struck ? 'fk-struck' : ''].join(' ').trim() || undefined}>
                      <span className="a">{e.age}세</span>
                      <span className="x">
                        {e.q && <small className="pp-q">{e.q}</small>}
                        {e.flow?.length ? (
                          <button type="button" className="pp-ledger-b" aria-expanded={openLedger === e.id}
                            onClick={() => setOpenLedger((o) => (o === e.id ? null : e.id))}>
                            {splitMoney(e.text).map((p, j) => (p.k ? <span key={j} className={'fm-' + p.k}>{p.t}</span> : p.t))}
                            <i aria-hidden="true">{openLedger === e.id ? '▴' : '▾'}</i>
                          </button>
                        ) : splitMoney(e.text).map((p, j) => (p.k ? <span key={j} className={'fm-' + p.k}>{p.t}</span> : p.t))}
                        {e.flow?.length > 0 && openLedger === e.id && (
                          <ul className="pp-ledger-d">
                            {e.flow.map((m) => (
                              <li key={m.label}><span>{m.label}</span><span className={m.amount < 0 ? 'neg' : 'pos'}>{won(m.amount, e.krw, true)}</span></li>
                            ))}
                          </ul>
                        )}
                        {e.fx && <EffectChips effect={e.fx} />}
                        {/* 큰 역사 사건 경고등: 줄이 처음 생길 때 세 번 깜빡이고 켜진 채로 남음 */}
                        {kind === 'alert' && <span className="pp-alert" role="status"><i aria-hidden="true" />큰 사건</span>}
                      </span>
                    </li>
                  );
                })}
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
              <h3 className="pp-h"><span>같은 해에 태어난 사람들</span><span className="pp-lbl">{life.birthYear}년생 또래</span></h3>
              {/* 실제 플레이어의 인생이 먼저 (같은 연대 · 태어난 해가 가까운 순), 4명이 안 되면 만든 또래로 채움 (11/25 동현님) */}
              <ul className="pp-peers">
                {life.peers.map((p, i) => (
                  <li key={i} className={(p.alive ? '' : 'gone') + (p.real ? ' real' : '')}>
                    <b>{p.name}</b>
                    <small><Flag cc={p.countryCode} />{p.countryName || p.countryCode} · {p.gender === 'M' ? '남' : '여'}{p.real && p.birthYear && p.birthYear !== life.birthYear ? ` · ${p.birthYear}년생` : ''}</small>
                    {/* 세상을 떠난 또래는 나이를 붙이지 않음 (나이가 계속 오르던 것) · 실제 플레이어가 아직 내 나이까지 못 살았으면 그 사람 지금 나이 */}
                    <span>{p.alive ? `${p.age ?? life.currentAge}세 · ${p.status}` : p.status}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="pp-panel">
            <h3 className="pp-h"><span>특성</span><span className="pp-lbl">지금 적용 중</span></h3>
            <TraitRows data={traits} age={life.currentAge} />
          </section>

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
                  setMapTip({ age: i, x: Math.min(window.innerWidth - 290, r.left), y: r.bottom + 6 });
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
            {/* 말풍선은 body 에 붙임: 유리 카드(backdrop-filter)가 position: fixed 의 기준이 되어
                말풍선이 카드 밖 엉뚱한 곳(화면 밖)에 그려져 안 보이던 문제 */}
            {mapTip && createPortal(
              <div className="pp-maptip" role="status" style={{ left: mapTip.x, top: mapTip.y }}>
                <MapTipText age={mapTip.age} life={life} y={years[mapTip.age]} feed={feed} le={le} />
              </div>,
              document.body,
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
              <span>{cty?.nameKo || countryName}{cty?.decade ? ` · ${cty.decade}년대` : ''}{eraMode === 'born' ? ' (출생)' : ''}</span>
              {(eraChanged || migrated) && (
                <span className="pp-ctybtns">
                  {eraChanged && (
                    <button type="button" className="pp-ctysw" onClick={() => setCtyEra(eraMode === 'born' ? 'cur' : 'born')}>
                      {eraMode === 'born' ? '현재 시대 기준' : '출생 시대 기준'}
                    </button>
                  )}
                  {migrated && (
                    <button type="button" className="pp-ctysw" onClick={() => setCtyView(ctyMode === 'born' ? 'cur' : 'born')}>
                      {ctyMode === 'born' ? '사는 나라 보기' : '태어난 나라 보기'}
                    </button>
                  )}
                </span>
              )}
            </h3>
            <dl>
              {ctyMode === 'cur' && eraMode === 'cur' && life.histName && life.histName !== countryName && (<><dt>당시 국가명</dt><dd>{life.histName}</dd></>)}
              {countryRows(cty).map(([k, v]) => (<Fragment key={k}><dt>{k}</dt><dd>{v}</dd></Fragment>))}
              {ctyMode === 'cur' && (<><dt>사는 곳</dt><dd>{town}</dd></>)}
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
        auto={decKind === 'dest' ? decAuto : undefined}
        hint={autoChoice && !decAuto ? '이번 창은 자동 결정을 멈췄어요. 직접 골라 주세요.' : undefined}
        footer={<FateFooter onFate={fateDest} busy={busy} auto={autoChoice} onAuto={setAutoChoice} hideFate={!!decAuto} />} />

      {/* 삶을 마감 (11/25 동현님): 회원 탈퇴처럼 강한 경고 → 이름을 그대로 입력해야 지울 수 있음 */}
      <Modal open={endOpen} title="정말 삶을 마감할까요?" onClose={endBusy ? undefined : () => setEndOpen(false)}>
        <div className="pp-endbox">
          <p className="pp-endwarn"><b aria-hidden="true">!</b>이 인생은 <em>영구히 삭제</em>되고 되돌릴 수 없어요.</p>
          <ul className="pp-endlist">
            <li><b>{life.name}</b>({life.currentAge}세)의 인생 기록 · 인생 지도 · 경험이 모두 지워져요.</li>
            <li>엔딩 크레딧 · 결과 화면 · 추모관에도 남지 않아요.</li>
            <li>이 인생에서 고른 퀘스트와 산 옷도 함께 사라져요. 특성 포인트는 그대로 남아요.</li>
          </ul>
          <label className="pp-endlabel">
            확인을 위해 이름 <b>{life.name}</b>{eul(life.name)} 그대로 입력해 주세요.
            <input value={endName} onChange={(e) => setEndName(e.target.value)} placeholder={life.name} autoComplete="off" disabled={endBusy} />
          </label>
          {endErr && <p className="pp-enderr" role="alert">{endErr}</p>}
          <div className="pp-endacts">
            <Button onClick={() => setEndOpen(false)} disabled={endBusy}>계속 살기</Button>
            <Button type="danger" disabled={endBusy || endName.trim() !== life.name}
              onClick={() => {
                setEndBusy(true);
                setEndErr('');
                client.post('/api/engine/delete', { lifeId: life.lifeId, guestToken })
                  .then(() => navigate('/', { replace: true }))
                  .catch((err) => { setEndErr(typeof err.response?.data === 'string' ? err.response.data : '삶을 마감하지 못했어요. 잠시 뒤 다시 해 주세요.'); setEndBusy(false); });
              }}>
              {endBusy ? '지우는 중…' : '영구히 삭제하기'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* C06-3 돈 쓰기 · 투자 */}
      {shopOpen && (
        <ShopSheet life={life} age={life.currentAge} guestToken={guestToken}
          waitIdle={waitIdle} onDone={onShopDone} onClose={closeShop} />
      )}

      {/* C21 옷 가게 */}
      {costumeOpen && (
        <CostumeSheet life={life} guestToken={guestToken}
          waitIdle={waitIdle} onDone={onCostumeDone} onClose={closeCostume} />
      )}

      {/* 잠시 멈춤 (원작 reflect) */}
      {showReflect && (
        <ReflectModal key={reflectKey} life={life} aliveNow={aliveNow} countryName={countryName}
          auto={autoChoice} speed={ff ? 16 : speed} onClose={closeReflect} />
      )}

      {/* C09 선택 이벤트 */}
      <EventChoiceModal key={life.pendingEvent?.eventId || 'none'}
        open={showChoice} event={life.pendingEvent} busy={busy} costs={life.choiceCosts} krw={life.krwPerUsd}
        age={life.currentAge - 1} year={year - 1}
        auto={autoChoice} onAutoChange={setAutoChoice} speed={ff ? 16 : speed}
        onChoose={(choiceId, name) => decide('/api/engine/choice', name ? { choiceId, text: name } : { choiceId })} />

      {/* C06 직업 제안 */}
      <DecisionModal open={showJob} label="일자리" meta={`${life.currentAge}세 · ${year}년`}
        title="일자리 제안이 들어왔어요"
        text={`할 수 있는 일 ${life.jobOffers?.length || 0}가지예요. 고르면 바로 그 일을 시작해요.`}
        options={(life.jobOffers || []).map((j) => ({
          // 소득: 한국 체감 월급 + 국제 비교 연 $ (예전 '소득 ×0.6' 대신, 서버 yearIncome = 그해 1인당 GDP × 배율)
          key: j.jobId, jobId: j.jobId, title: j.jobName,
          tag: j.yearIncome != null ? `월 ${won(j.yearIncome / 12, life.krwPerUsd)}` : `소득 ×${j.incomeRate}`,
          sub: `${INDUSTRY[j.industry] || j.industry} · ${EDU_REQ[j.requiredEdu] || j.requiredEdu}`
            + (j.yearIncome != null ? ` · 연 ${ppp(j.yearIncome, life.krwPerUsd)} (국제 비교)` : ''),
        }))}
        busy={busy}
        onPick={(o) => decide('/api/engine/job', { jobId: o.jobId })}
        auto={decKind === 'job' ? decAuto : undefined}
        hint={autoChoice && !decAuto ? '이번 창은 자동 결정을 멈췄어요. 직접 골라 주세요.' : undefined}
        footer={(
          <FateFooter onFate={fateJob} busy={busy} auto={autoChoice} onAuto={setAutoChoice} hideFate={!!decAuto}>
            <Button type="ghost" size="sm" disabled={busy} onClick={() => setSkipJobAge(life.currentAge)}>올해는 넘기기</Button>
          </FateFooter>
        )} />
    </div>
  );
}

// ───────── 잠시 멈춤 (원작 reflect) ─────────
//   5·15·30·50·70세에 진행을 멈추고 질문 하나 + 한 줄 쓰는 칸
//   [적어 두고 계속 살기] 적은 글은 인생 기록에 따옴표로 남음 / [마음속에 담고 계속 살기]
//   자동 결정이 켜져 있으면 9초 뒤 계속 (글 칸을 누르면 다 적을 때까지 기다림, 원작과 같음)
//   [다음부터 이 창 띄우지 않기] → 이 브라우저에서 끔 (localStorage reflectOff)
const REFLECT_AGES = [5, 15, 30, 50, 70];
const REFLECT_Q = {
  5: [[() => '당신의 다섯 살은 어땠나요? 그때 당연하게 누렸던 것 하나를 떠올려 보세요.', (poor) => (poor ? '아플 때 데려가 주던 병원' : '매일 저녁 차려지던 밥상')],
  [(n) => `다섯 살 ${n}에게 지금 가장 필요한 것은 무엇일까요?`, (poor) => (poor ? '배불리 먹는 저녁' : '잠들기 전 읽어 주는 그림책')]],
  15: [[() => '열다섯 살의 당신에게 학교는 어떤 곳이었나요?', () => '친구들을 만나러 가던 곳'],
  [(n) => `${iga(n)} 꿈꿀 수 있는 미래와, 열다섯의 당신이 꿈꾸던 미래는 얼마나 달랐을까요?`, () => '꿈꾸는 마음은 비슷했을 것 같다']],
  30: [[(n) => `${n}의 삶과 당신의 삶은 무엇이 같고, 무엇이 다른가요?`, () => '일에 지친 건 같고, 사는 곳은 다르다'],
  [(n) => `${iga(n)} 오늘 가장 고마워할 일은 무엇일까요?`, () => '가족이 건강하다는 것']],
  50: [[(n) => `${iga(n)} 당신의 이웃이었다면, 어떤 이야기를 나누고 싶나요?`, () => '자식 키우는 이야기'],
  [() => '살면서 당신을 붙잡아 준 사람은 누구였나요?', () => '힘들 때 전화해 준 친구']],
  70: [[(n) => `한 번뿐인 삶에서, ${iga(n)} 가장 소중히 여긴 것은 무엇이었을까요?`, () => '가족과 함께한 저녁'],
  [() => '당신은 어떤 사람으로 기억되고 싶나요?', () => '곁에 있으면 편했던 사람']],
};

// 목적격 조사 (받침 있으면 '을', 없으면 '를')
function eul(w) {
  const ch = String(w || '').trim().slice(-1).charCodeAt(0);
  return ch >= 0xac00 && ch <= 0xd7a3 && (ch - 0xac00) % 28 !== 0 ? '을' : '를';
}

function ReflectModal({ life, aliveNow, countryName, auto, speed, onClose }) {
  const age = life.currentAge;
  const [text, setText] = useState('');
  const [hold, setHold] = useState(false); // 글 칸을 누르면 자동으로 넘어가지 않음
  const qs = REFLECT_Q[age] || REFLECT_Q[30];
  const [q, ex] = qs[life.lifeId % qs.length];
  const poor = life.wealthClass <= 2;
  // 거울 문장 (원작 reflectMirror): 5세 다섯 살 생일 · 15세 학교 · 30세 소득 · 50·70세 또래 생존
  const mirror = [];
  const pct = (v) => `${v < 1 ? v.toFixed(1) : Math.round(v)}%`;
  if (age === 5 && life.u5Mortality != null) mirror.push(`${countryName}에서는 아이 ${(life.u5Mortality / 10).toFixed(1)}%가 다섯 살 생일을 맞이하지 못합니다. 이 아이는 맞이했습니다.`);
  else if (age === 5 && aliveNow != null) mirror.push(`같은 해 ${countryName}에서 태어난 아이 중 ${pct((1 - aliveNow) * 100)}가 다섯 살 생일을 맞이하지 못했습니다. 이 아이는 맞이했습니다.`);
  if (age === 15) {
    mirror.push(life.schoolStatus === 'ENROLLED' ? '이 아이는 지금 학교에 다닙니다.'
      : life.marriedYn === 'Y' ? '이 아이는 이미 결혼했습니다.'
        : life.jobStatus === 'EMPLOYED' ? '이 아이는 학교 대신 일을 하고 있습니다.'
          : '이 아이는 학교에 다니지 않고 가족과 집에서 지냅니다.');
  }
  if (age === 30) mirror.push(life.income > 0 ? `이 사람의 한 해 소득은 ${countryName} 사람들 가운데 ${rankStr(life.incomeRankCountry)}에 듭니다.` : '이 사람은 지금 소득이 없습니다.');
  if (age === 50 && aliveNow != null) mirror.push(`같은 해 ${countryName}에서 태어난 사람 중 ${pct(aliveNow * 100)}가 쉰 살을 맞습니다.`);
  if (age === 70 && aliveNow != null) mirror.push(`같은 해 ${countryName}에서 태어난 사람 중 ${pct(aliveNow * 100)}만 일흔을 맞습니다.`);
  const sec = speed >= 16 ? 4.5 : 9;
  useEffect(() => {
    if (!auto || hold) return undefined;
    const t = setTimeout(() => onClose(''), sec * 1000);
    return () => clearTimeout(t);
  }, [auto, hold, sec, onClose]);
  return (
    <div className="dec-back">
      <div className="dec" role="dialog" aria-modal="true" aria-labelledby="refT">
        <div className="dec-hd"><span>잠시 멈춤</span><span>{age}세 · {life.birthYear + age}년</span></div>
        <div className="dec-bd">
          <h2 id="refT" className="dec-title">{life.name}, {age}세</h2>
          {mirror.length > 0 && <p className="dec-text">{mirror.join(' ')}</p>}
          <p className="dec-q">{q(life.name)}</p>
          <textarea className="dec-note-in" maxLength={200} rows={3} value={text}
            placeholder={`예: ${ex(poor)} (적지 않아도 괜찮아요)`}
            onFocus={() => setHold(true)} onChange={(e) => { setText(e.target.value); setHold(true); }} />
          <div className="dec-ch">
            <button type="button" className="dec-opt" onClick={() => onClose(text)}>
              <span className="dec-k">1</span><b>적어 두고 계속 살기</b><small>적은 글은 이 삶의 기록에 남아요</small>
            </button>
            <button type="button" className="dec-opt" onClick={() => onClose('')}>
              <span className="dec-k">2</span><b>마음속에 담고 계속 살기</b>
            </button>
          </div>
          {auto && !hold && (
            <>
              <div className="dec-autobar" aria-hidden="true"><i style={{ animationDuration: `${sec}s` }} /></div>
              <p className="dec-hint">잠시 후 계속 살아갑니다. 글 칸을 누르면 다 적을 때까지 기다려요.</p>
            </>
          )}
          <div className="dec-foot">
            <button type="button" className="dec-fate-b sm" onClick={() => onClose(text, true)}>다음부터 이 창 띄우지 않기</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 결정 창 아래 '자동으로 선택하기' 단추 + '앞으로 나오는 결정도 자동으로' (직업·이민 창, 선택 이벤트 창과 같은 모양)
function FateFooter({ onFate, busy, auto, onAuto, hideFate, children }) {
  return (
    <div className="dec-fate">
      {children}
      {!hideFate && <button type="button" className="dec-fate-b" disabled={busy} onClick={onFate}>자동으로 선택하기</button>}
      <label className="dec-fate-auto">
        <input type="checkbox" checked={auto} onChange={(e) => onAuto(e.target.checked)} />
        앞으로 나오는 결정도 자동으로
      </label>
    </div>
  );
}

// 특성 칸 (C13): 특성 4종 레벨과 지금 인생에 적용되는 효과 한 줄 + 2세에 고른 기질
//   효과 문장은 lifeText.traitLine (윤아님 이벤트 확률·엔진 공부 재능에 실제로 곱해지는 값)
function TraitRows({ data, age }) {
  const list = data?.traits || [];
  const any = list.some((t) => (t.effect || 0) !== 0);
  return (
    <ul className="pp-traits">
      <li>
        <span className="pp-tr-i" aria-hidden="true">🌱</span>
        <b>기질</b>
        <span>{data?.temper ? `${data.temper} 아이` : age < 3 ? '두 살 무렵 정해져요' : '정해지지 않음'}</span>
      </li>
      {list.map((t) => {
        const v = TRAIT_VIEW[t.traitId] || { label: t.traitId, icon: '•' };
        const line = traitLine(t);
        return (
          <li key={t.traitId} className={line.on ? 'on' : ''}>
            <span className="pp-tr-i" aria-hidden="true">{v.icon}</span>
            <b>{v.label} <small>Lv.{t.level}</small></b>
            <span>{line.text}</span>
          </li>
        );
      })}
      {list.length > 0 && !any && <li className="pp-tr-note">회원은 마이페이지에서 특성을 키우면 다음 인생부터 적용돼요.</li>}
    </ul>
  );
}

// 인생 지도 말풍선 (원작과 같은 내용): 나이·연도 / 행복·건강·순자산(15세부터) / 그해 돈 내역 3개 / 그해 이야기 두 줄
const TIP_RANK = ['death', 'alert', 'bad', 'ms', 'loss', 'big', 'gain', 'hist', 'woe', 'ms2', 'dec', 'warm', 'daily'];
function MapTipText({ age, life, y, feed, le }) {
  const year = life.birthYear + age;
  if (!y) {
    return <><b>{age}세 ({year}년)</b>{age === Math.floor(le) ? ' · 기대수명' : ''}</>;
  }
  const k = life.krwPerUsd;
  // 그해 이야기 두 줄 (원작은 큰 일 한 줄 → 우리는 기록 색 순서로 중요한 것 2개, 없으면 일상 한 줄이라도)
  //   11/23 동현님: 말풍선에 상태 지수만 나와 허전함
  const rank = (e) => TIP_RANK.indexOf(feedKind(e));
  const story = feed
    .filter((e) => e.age === age && e.text && e.kind !== 'ledger' && e.kind !== 'note')
    .map((e) => ({ e, r: rank(e) }))
    .sort((a, b) => (a.r < 0 ? 99 : a.r) - (b.r < 0 ? 99 : b.r))
    .slice(0, 2)
    .map((x) => x.e.text);
  const flow = (y.flow || []).slice(0, 3);
  return (
    <>
      <b>{age}세 · {year}년</b><br />
      행복 {y.h} · 건강 {y.hl}{age >= 15 && y.nw != null ? ` · 순자산 ${won(y.nw, k)}` : ''}
      {flow.length > 0 && (<><br />{flow.map((m) => `${m.label} ${won(m.amount, k, true)}`).join(' · ')}</>)}
      {story.map((t, i) => (<span key={i}><br />· {t.length > 90 ? t.slice(0, 90) + '…' : t}</span>))}
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

// 살림 (원작 살림 패널): 순자산 · 소득(한국 체감, 국제 비교 $(구매력 기준), 월) · 배우자 소득 · 소득 위치 · 지난 1년 순자산 내역 · 재산 합계 · 내 물건 · 주로 다니는 곳
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
        <small title={PPP_TIP}>국제 비교 {ppp(life.assets, k)} · {kid ? '아직 부모님 집에서 지내요' : life.assets < 0 ? '빚이 있어요' : life.houseValue ? '내 집 시세 포함' : '모아 둔 돈'}</small>
      </div>
      <WorthBox life={life} k={k} />
      {life.income > 0 && (
        <div className="pp-mrow">
          <small>{life.jobStatus === 'RETIRED' ? '연금 (한 해)' : '내 소득 (연봉)'} <em>한국 체감</em></small>
          <b>{won(life.income, k)}</b>
          <small title={PPP_TIP}>국제 비교 {ppp(life.income, k)} · 월 {won(life.income / 12, k)}</small>
        </div>
      )}
      {life.spouseIncome > 0 && (
        <div className="pp-mrow">
          <small>배우자 소득 <em>한국 체감</em></small>
          <b>{won(life.spouseIncome, k)}</b>
          <small title={PPP_TIP}>국제 비교 {ppp(life.spouseIncome, k)} · 월 {won(life.spouseIncome / 12, k)}</small>
        </div>
      )}
      {cRank && (
        <p className="pp-rank" title="내 소득(연봉)을 그 나라 사람들과 견준 위치예요">소득 위치: {countryName} <b>{cRank}</b>{aRank && <> · 아시아 <b>{aRank}</b></>}</p>
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
        <dt>내 물건</dt><dd>{belongings(life, year)}</dd>
        <dt>주로 다니는 곳</dt><dd>{commute(life, year)}</dd>
      </dl>
    </div>
  );
}

// 재산 합계 (11/20): 현금·투자 + 내 집 시세 + 탈것 중고 시세 = 총계
//   순자산(assets)에는 내 집 시세가 이미 들어 있고, 자동차·오토바이는 산 값을 써서 빠져 있어요
function WorthBox({ life, k }) {
  const house = life.houseValue || 0;
  const car = life.carValue || 0;
  if (!house && !car) return null;
  const money = (life.assets || 0) - house;
  const rate = life.houseRate;
  return (
    <div className="pp-worth">
      <div className="hd">재산 합계</div>
      <ul>
        <li><span>{money < 0 ? '빚 (집 대출 등)' : '현금·예금·투자'}</span><span className={money < 0 ? 'neg' : ''}>{won(money, k)}</span></li>
        {house > 0 && (
          <li>
            <span>내 집 시세{rate != null && <em className={rate < 0 ? 'neg' : 'pos'}> {rate < 0 ? '▼' : '▲'}{Math.abs(rate * 100).toFixed(1)}%</em>}</span>
            <span>{won(house, k)}</span>
          </li>
        )}
        {car > 0 && <li><span>탈것 (중고 시세)</span><span>{won(car, k)}</span></li>}
      </ul>
      <div className="tot"><span>총계</span><b className={money + house + car < 0 ? 'neg' : ''}>{won(money + house + car, k)}</b></div>
    </div>
  );
}

// 가족과 삶 (원작 famRows: 역할 | 이름 · 나이 · 덧붙임 <small>· 사이</small> <small>직업</small>)
//   어머니·아버지·형제자매·배우자·아들·딸·친구·손주 + 내 물건 · 사는 곳 · 지금 시기
// 취미 이름 (EngineChoice.HOBBIES 와 같은 코드) · 병역 종류
const HOBBY_NAME = {
  sport: '운동', music: '노래·악기 연주', dance: '춤', screen: '텔레비전·영화 보기', sns: '스마트폰·SNS', games: '비디오 게임',
  reading: '독서', fishing: '낚시', cooking: '요리', garden: '텃밭 가꾸기', hiking: '등산·산책', travel: '여행',
  art: '그림 그리기', karaoke: '노래방', calli: '서예', gym: '헬스',
};
const SVC_KIND = { A: '육군', N: '해군', F: '공군', S: '보충역' };

// 자녀가 많으면 (4명부터) 한 줄로 모음: '6명 · 아들 3 · 딸 3' + 아랫줄 '이름 나이 · …' (11/23 동현님: 줄줄이 나와 징그러움)
//   life.family 자체는 그대로 둠 (마을 그림 homeFamily 가 아들·딸 줄을 씀)
const KIDS_FOLD = 4;
const callOf = (full) => {
  if (!full) return '';
  if (full.includes(' ')) return full.split(' ')[0];
  return full.length >= 3 ? full.slice(1) : full; // 붙여 쓰는 한·중 이름은 성을 뺌
};
const foldKids = (fam) => {
  const kids = fam.filter((m) => m.role === '아들' || m.role === '딸');
  if (kids.length < KIDS_FOLD) return fam;
  const alive = kids.filter((m) => m.alive);
  const sons = kids.filter((m) => m.role === '아들').length;
  const gone = kids.length - alive.length;
  const row = {
    role: '자녀',
    alive: true,
    info: `${kids.length}명 · 아들 ${sons} · 딸 ${kids.length - sons}` + (gone ? ` · 먼저 떠난 아이 ${gone}명` : ''),
    job: alive.map((m) => `${callOf(m.name)}${m.age != null ? ' ' + m.age + '세' : ''}`).join(' · '),
  };
  const at = fam.indexOf(kids[0]);
  const rest = fam.filter((m) => m.role !== '아들' && m.role !== '딸');
  rest.splice(Math.min(at, rest.length), 0, row);
  return rest;
};

function FamilyRows({ life, countryName, stageText }) {
  const fam = life.family ? foldKids(life.family) : life.family;
  const owned = life.currentAge >= 6 ? ownNames(life) : [];
  // 반려동물 (엔진 OWNS 의 PET-종류-이름-들인나이-수명)
  const petTok = (life.owns || '').split(',').map((x) => x.trim().split('-')).find((p) => p.length === 5 && p[0] === 'PET');
  const pet = petTok ? { kind: petTok[1], name: petTok[2], at: Number(petTok[3]) } : null;
  // 취미 (HOB-코드) · 병역 (SVC-ON-전역나이-종류-개월 / SVC-DONE / SVC-EX)
  const toks = (life.owns || '').split(',').map((x) => x.trim());
  const hob = HOBBY_NAME[(toks.find((x) => x.startsWith('HOB-')) || '').slice(4)];
  const svc = toks.find((x) => x.startsWith('SVC-'));
  const svcP = svc ? svc.split('-') : null;
  const svcText = !svcP ? null : svcP[1] === 'ON'
    ? `복무 중 (${SVC_KIND[svcP[3]] || '현역'} · ${svcP[4]}개월)` : svcP[1] === 'DONE' ? '마침' : '면제';
  return (
    <div className="pp-fam">
      {fam?.length ? fam.map((m, i) => {
        const head = [m.name, m.alive && m.age != null ? `${m.age}세` : null, m.info].filter(Boolean).join(' · ');
        return (
          <div key={m.role + i} className={'row' + (m.alive ? '' : ' gone')}>
            <span>{m.role}</span>
            <span>
              {head}
              {m.alive && m.bond && <small className="bond"> · {m.bond}</small>}
              {m.job && <small className="pwork">{m.job}</small>}
            </span>
          </div>
        );
      }) : (
        <>
          <div className="row"><span>부모님</span><span>{life.parentAlive === 'N' ? '세상을 떠나심' : '살아 계심'}</span></div>
          <div className="row"><span>배우자</span><span>{life.marriedYn === 'Y' ? '있음' : '없음'}</span></div>
          <div className="row"><span>자녀</span><span>{life.childCount > 0 ? life.childCount + '명' : '없음'}</span></div>
        </>
      )}
      {pet && (
        <div className="row"><span>반려동물</span><span>{pet.name} · {PET_WORD[pet.kind] || '반려동물'} · 함께한 지 {Math.max(0, life.currentAge - pet.at)}년</span></div>
      )}
      {hob && <div className="row"><span>취미</span><span>{hob}</span></div>}
      {svcText && <div className="row"><span>병역</span><span>{svcText}</span></div>}
      {owned.length > 0 && <div className="row"><span>내 물건</span><span>{owned.join(', ')}</span></div>}
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
// 신원 기록 등급 (카드 테두리·띠 색): 수저와 같은 5단계 색
//   18세까지: 집안 형편(wealthClass) 수저 / 19세부터: '상위 N%' 글자, 색은 나라 안 순위 20%씩 → 흙·동·은·금·다이아 색
//   소득이 없으면 회색. 은퇴했으면 마지막으로 벌던 등급을 흐리게 (새로고침하면 기억이 없어 회색)
const NO_INCOME = { color: '#b8c0cc', edge: '#7d8796' };
function tierOf(life, last) {
  const sp = (n) => SPOONS[Math.max(1, Math.min(5, n))];
  if (life.currentAge <= 18) {
    const n = Math.round(life.wealthClass || 3);
    const s = sp(n);
    return { kind: 'spoon', key: 's' + n, n, title: s.name, sub: '', color: s.color, edge: s.edge };
  }
  if (life.income > 0 && life.incomeRankCountry != null) {
    const n = Math.max(1, Math.min(5, Math.floor(life.incomeRankCountry * 5) + 1));
    const s = sp(n);
    const top = Math.max(1, Math.round((1 - life.incomeRankCountry) * 100)); // 늘 '상위 N%'로 (하위 쪽도 상위 90% 처럼)
    return { kind: 'income', key: 'i' + n, n, title: `상위 ${top}%`, sub: '', color: s.color, edge: s.edge };
  }
  if (life.jobStatus === 'RETIRED' && last) {
    return { ...last, kind: 'retired', key: 'r' + last.n, title: '은퇴 전 ' + last.title, dim: true };
  }
  return { kind: 'none', key: 'none', n: 0, title: '소득 없음', sub: '', ...NO_INCOME };
}

// 상태창 아이콘 (선 그림, 상태 색)
const STAT_ICON = {
  health: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" />,
  happiness: <><circle cx="12" cy="12" r="8" /><path d="M9 14c1.5 1.6 4.5 1.6 6 0" /></>,
  knowledge: <><path d="M4 5c3-1 5-1 8 1 3-2 5-2 8-1v13c-3-1-5-1-8 1-3-2-5-2-8-1z" /><path d="M12 6v13" /></>,
  relation: <><circle cx="9" cy="9" r="3" /><path d="M3 19c0-3 3-5 6-5s6 2 6 5" /><circle cx="17" cy="9" r="2.5" /><path d="M17 14c2.5 0 4 1.6 4 4" /></>,
};
function StatIcon({ name, color }) {
  return (
    <svg className="pp-stat-i" viewBox="0 0 24 24" width="13" height="13" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {STAT_ICON[name]}
    </svg>
  );
}

// 신원 기록 사진(테이프로 붙인 폴라로이드): 마을 속 내 캐릭터(Figure)를 그대로 써서 옷·머리·모자까지 똑같이 (가슴 위만 보이게 자름, 탈것은 제외)
function Portrait({ gender, age, costume }) {
  const faceWear = costume && typeof costume === 'object' ? { ...costume, ride: null } : costume;
  return (
    <div className="pp-polaroid" aria-hidden="true">
      <span className="pp-tape" />
      <div className="pp-photo"><Figure look={lookOf({ gender, age, costume: faceWear })} /></div>
      <span className="pp-polaroid-cap">{age}세</span>
    </div>
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
