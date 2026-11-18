// C03 인생 진행 화면 (주소: /play) - 원작(1in8b) 진행 화면 구색을 따름
//   위: 진행 막대 (나이 · 연도 · 한 해 진행 막대 · 멈춤 · 배속 1~16× · 다음 결정까지 · 음악 · 나가기)
//   왼쪽: 신원 기록(여권 카드) · 상태(능력치) · 살림 (한국 체감 원, 소득 위치, 지난 1년 순자산 내역, 가진 것, 다니는 길)
//   가운데: 마을(게임 화면) · 올해의 초점(칩, 진행을 멈추지 않음) · 인생 기록
//   오른쪽: 가족과 삶 · 같은 1초에 태어난 사람들 · 인생 지도 · 생존 곡선 · 나라
// - 시간 흐름은 원작과 같아요: 1배속에서 한 해 = 3600 ÷ 기대수명 초 (12~120초, 기대수명까지 약 1시간)
//   배속 1·2·4·8·12·16×, '다음 결정까지'는 결정 창이 뜰 때까지 빠르게 감기
// - 한 해가 시작될 때 서버에 그해를 미리 요청(POST /api/engine/next)하고,
//   그해 일어난 일을 진행 막대가 차는 동안 하나씩 보여 준 뒤, 막대가 다 차면 나이가 올라가요
// - 출생 화면에서 state.life 로 들어오거나, 새로고침·이어하기면 GET /api/engine/current 로 불러옴
// - 큰 결정(선택 이벤트 C09, 이민 목적지 C10, 직업 제안 C06)만 창으로 띄우고 진행을 멈춤
// - 죽으면(status ENDED) 잠깐 보여 주고 /result/:lifeId 로 이동 (C18)
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { won, ppp, rankStr, feedKind, belongings, commute } from './lifeText';
import './play.css';

// ───────── 시간 (원작과 같은 공식) ─────────
const PACE_MIN = 60;                         // 기대수명까지 약 60분 (원작 기본값)
const SPEEDS = [1, 2, 4, 8, 12, 16];         // 원작과 같은 배속
const FF_SEC = 0.6;                          // '다음 결정까지' 감을 때 한 해 길이 (초)
const yearSecOf = (le) => Math.min(120, Math.max(12, (PACE_MIN * 60) / Math.max(le || 70, 60)));
const RESULT_DELAY = 3500;                   // 죽은 뒤 결과 화면까지
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

// 여권 아래 기계 판독 줄 (장식)
const mrz = (life) => {
  const name = (life.name || '').toUpperCase().replace(/[^A-Z]/g, '<');
  const l1 = ('I<' + (life.birthCountry || 'XXX') + name + '<'.repeat(44)).slice(0, 44);
  const l2 = (String(life.lifeId).padStart(9, '0') + (life.birthCountry || 'XXX') + life.birthYear
    + (life.gender || 'X') + '<'.repeat(44)).slice(0, 44);
  return [l1, l2];
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
  const [moodMap, setMoodMap] = useState({});         // 인생 지도: 나이 → 그해 행복

  const guestToken = localStorage.getItem('token') ? null : localStorage.getItem('guestToken');

  // 한 해 진행 상태 (화면을 매 프레임 다시 그리지 않게 ref)
  const yr = useRef({ data: null, fetching: false, t: 0, shown: 0, focus: null });
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
  const pushLines = useCallback((lines) => {
    if (!lines.length) return;
    setFeed((f) => [...lines.slice().reverse(), ...f].slice(0, MAX_FEED));
  }, []);

  // 인생 지도 색 (행복) - 새로고침해도 남게 sessionStorage
  const remember = useCallback((l, age) => {
    if (!l) return;
    setMoodMap((m) => {
      const next = { ...m, [age]: Math.round(l.happiness || 0) };
      try { sessionStorage.setItem('ppMood' + l.lifeId, JSON.stringify(next)); } catch { /* 무시 */ }
      return next;
    });
  }, []);

  // 지금까지의 인생 기록 불러오기 (새로고침·이어하기해도 기록이 비지 않게)
  const loadLogs = useCallback(async (l) => {
    try { setMoodMap(JSON.parse(sessionStorage.getItem('ppMood' + l.lifeId) || '{}')); } catch { setMoodMap({}); }
    try {
      const res = await client.get('/api/engine/logs', { params: { lifeId: l.lifeId, guestToken } });
      // 서버는 최근 나이부터, 같은 나이는 일어난 순서 → 화면은 최신이 맨 위
      const byAge = {};
      (res.data || []).forEach((g) => { (byAge[g.age] = byAge[g.age] || []).push(g); });
      const ages = Object.keys(byAge).map(Number).sort((a, b) => b - a);
      const out = [];
      ages.forEach((age) => {
        byAge[age].slice().reverse().forEach((g) => out.push({ age, text: g.logText, big: !!g.eventId, eventId: g.eventId }));
      });
      setFeed(out.slice(0, MAX_FEED));
    } catch (err) {
      console.log('인생 기록 불러오기 실패', err.response?.data);
    }
  }, [guestToken]);

  // ① 진행 중인 인생 불러오기 (새로고침, 이어하기, 409 뒤)
  const reload = useCallback(async () => {
    yr.current = { data: null, fetching: false, t: 0, shown: 0, focus: null };
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

  // 올해의 초점 (진행을 멈추지 않음): 미리 받아 둔 해가 있으면 그다음 해부터 적용돼요
  const chooseFocus = useCallback(async (focus) => {
    const l = lifeRef.current;
    if (!l) return;
    setLife((x) => ({ ...x, focusCode: focus, needFocus: false }));
    yr.current.focus = focus;
    pushLines([{ age: l.currentAge, kind: 'dec', text: `올해의 초점을 '${focusLabel(focus, l)}'(으)로 정했다.` }]);
    try {
      await client.post('/api/engine/focus', { lifeId: l.lifeId, guestToken, focus });
    } catch (err) {
      setNotice(errText(err));
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

  // ② 한 해 흐르기: 막대가 차는 동안 미리 받은 그해 일을 하나씩 보여 주고, 다 차면 나이 +1
  //    매 프레임 막대는 DOM 으로 바로 칠하고(React 다시 그리기 없음), 해가 바뀔 때만 화면을 새로 그려서 버벅임 없음
  //    다음 해는 막대가 끝나기 조금 전에 미리 요청해 두어 해 사이에 멈춤이 없게 함
  const running = !!life && !ended && !paused && !hidden && !waiting && !busy && !error;
  const loopRef = useRef({});
  loopRef.current = { yearSec, guestToken, pushLines, remember, reload };
  useEffect(() => {
    if (!running) return undefined;
    let frame;
    let last = performance.now();
    let alive = true;
    const y = yr.current;

    const fetchYear = async () => {
      const l = lifeRef.current;
      y.fetching = true;
      y.focus = null;
      try {
        const res = await client.post('/api/engine/next', { lifeId: l.lifeId, guestToken: loopRef.current.guestToken });
        y.data = res.data;
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
      if (!y.data && !y.fetching) fetchYear();

      // 서버 응답 전에는 막대가 끝까지 차지 않게 (응답이 오면 바로 이어서 참)
      y.t = Math.min(y.data ? 1 : 0.985, y.t + dt / ys);
      setProg(y.t);

      if (y.data) {
        const d = y.data;
        const age = d.status === 'ENDED' ? d.currentAge : d.currentAge - 1;
        const lines = toLines(age, d.events);
        // 그해 일을 막대 위에 고르게 나눠서 하나씩
        const due = Math.min(lines.length, Math.floor(y.t * (lines.length + 1)));
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
          y.shown = 0;
          setProg(0);
          // 해가 끝난 뒤 고른 초점은 서버에 이미 반영돼 있으니 화면에서도 유지
          setLife(focus ? { ...d, focusCode: focus, needFocus: false } : d);
          // 결정 창·사망이면 running 이 꺼지며 멈추고, 아니면 다음 해를 곧바로 요청
          if (d.status !== 'ENDED' && !d.needChoice && !d.needDestination && !d.needJob) fetchYear();
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
  const [mrz1, mrz2] = mrz(life);
  const deathAge = life.deathAge ?? life.currentAge;
  const lived = ended ? deathAge + 1 : life.currentAge;
  const le = life.lifeExpectancy || 70;
  const mapYears = Math.max(90, Math.ceil(Math.max(lived + 1, le + 1) / 10) * 10);
  const region = THEMES[(COUNTRIES[life.currentCountry] || [])[1]]?.name;
  const aliveNow = curve ? curve[Math.min(curve.length - 1, life.currentAge)] : null;
  const secPerYear = Math.round(yearSecOf(life.lifeExpectancy));

  return (
    <div className="pp">
      {/* ───── 진행 막대 (원작 topbar) ───── */}
      <header className="pp-top">
        <div className="pp-wrap pp-top-in">
          <div className="pp-agebox">
            <div className="pp-age">{ended ? deathAge : life.currentAge}<small>세</small></div>
            <div className="pp-yr">
              <span className="pp-yr-t">{year}년 · {life.name} · 1년 ≈ {secPerYear}초</span>
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

            {/* BGM: ♪ 켜기/끄기 + 음량 (노을빛 로파이 오르골을 브라우저가 만들어 냄, public/audio/bgm-play.mp3 넣으면 그 곡) */}
            <span className={'pp-bgm' + (bgm.on ? ' on' : '')} title="배경음악 · 노을빛 오르골">
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
            <div className="pp-mrz" aria-hidden="true">{mrz1}<br />{mrz2}</div>
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
          </section>
        </div>

        {/* ───── 가운데: 마을 · 올해의 초점 · 인생 기록 ───── */}
        <div className="pp-col">
          <section className="pp-panel pp-scene">
            <Village countryCode={life.currentCountry} age={life.currentAge} gender={life.gender}
              place={placeOf(life)} urban={life.isUrban === 'Y'} />
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
                  <li key={feed.length - i} className={feedKind(e)}>
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
            <div className="pp-grid10" aria-label={`${lived}년을 살았어요`}>
              {Array.from({ length: mapYears }, (_, i) => {
                const done = i < lived - (ended ? 0 : 0) && !(ended && i === deathAge);
                const mood = moodMap[i];
                const lvl = mood == null ? 2 : mood >= 70 ? 3 : mood >= 50 ? 2 : 1;
                return (
                  <span key={i}
                    className={'c'
                      + (done ? ' lv' + lvl : '')
                      + (!ended && i === life.currentAge ? ' cur' : '')
                      + (ended && i === deathAge ? ' dead' : '')
                      + (i === Math.round(le) ? ' le' : '')}
                    title={`${i}세 (${life.birthYear + i}년)${mood != null ? ' · 행복 ' + mood : ''}`} />
                );
              })}
            </div>
            <div className="pp-gridkey">
              <span><i className="lv1" /><i className="lv2" /><i className="lv3" /> 행복할수록 진하게</span>
              <span><i className="le" /> 기대수명 {le.toFixed(1)}세</span>
            </div>
          </section>

          {curve && (
            <section className="pp-panel">
              <h3 className="pp-h"><span>생존 곡선</span><span className="pp-lbl">같은 해 태어난 사람</span></h3>
              <SurvivalChart curve={curve} age={ended ? deathAge : life.currentAge} ended={ended} />
            </section>
          )}

          <section className="pp-panel pp-cty">
            <h3 className="pp-h"><span>{countryName}</span>{region && <span className="pp-lbl">{region}</span>}</h3>
            <dl>
              {life.histName && life.histName !== countryName && (<><dt>당시 국가명</dt><dd>{life.histName}</dd></>)}
              <dt>기대수명</dt><dd>{life.lifeExpectancy ? life.lifeExpectancy.toFixed(1) + '세' : '—'}</dd>
              <dt>영아 사망률</dt><dd>{life.infantMortality != null ? `1,000명당 ${life.infantMortality.toFixed(1)}` : '—'}</dd>
              <dt>1인당 GDP</dt><dd>{life.gdpPerCapita ? money(life.gdpPerCapita) : '—'}</dd>
              <dt>사는 곳</dt><dd>{town}</dd>
            </dl>
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
        onPick={(o) => (destPick === o.code ? decide('/api/engine/destination', { countryCode: o.code }) : setDestPick(o.code))} />

      {/* C09 선택 이벤트 */}
      <EventChoiceModal open={showChoice} event={life.pendingEvent} busy={busy} costs={life.choiceCosts} krw={life.krwPerUsd}
        age={life.currentAge - 1} year={year - 1}
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
        footer={<Button type="ghost" size="sm" disabled={busy} onClick={() => setSkipJobAge(life.currentAge)}>올해는 넘기기</Button>} />
    </div>
  );
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
      {fam?.length ? fam.map((m) => (
        <div key={m.role} className={'row' + (m.alive ? '' : ' gone')}>
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
