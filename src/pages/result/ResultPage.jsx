// C18 인생 결과 화면 (주소: /result/:lifeId)
// GET /api/result/{lifeId}?guestToken=...  → 요약 + 연도별 기록 + 인생 기록 + 퀘스트를 한 번에 받음
// 회원은 api.js 가 로그인 토큰을 자동으로 붙이고, 비회원은 localStorage 의 guestToken 을 같이 보냄
// C22 (11/23 동현님): 이 주소는 엔딩 크레딧(EndingFilm)이 바로 틀어짐. 인생 기록 화면은 ?detail=1 (엔딩이 끝난 뒤 '인생 기록 보기', 전생 기록의 '결과 보기')
//   비회원 인생을 다른 브라우저에서 볼 땐 &guest=토큰
// /result/test = 엔딩 크레딧 테스트 화면 (FilmTest, 작업용)
//
// 인생 기록 화면 (11/25 동현님: 싹 바꿈) - 진행 화면처럼 넓은 두 단
//   ① 머리: 마지막 모습(마을 캐릭터, 입은 옷) · 이름 · 국기+나라(당시 국명) · 생몰년 · 이민 · 사망 원인 · 엔딩 다시 보기 · 추모관 · 다시 태어나기
//   ② 숫자 4칸: 수명(기대수명과 비교) · 가장 행복했던 때(가장 힘들었던 때) · 평균 소득 위치(아시아 상위/하위 %) · 태어난 집
//   ③ 탭: 인생 기록 / 이야기(C19, AI 회고록) / 묻기(C20, 그 사람에게 직접)
//   ④ 인생 기록 탭: 인생 지도(한 해 한 칸 행복 막대 + 일 · 나라 띠, 마우스 말풍선) · 인생의 큰 장면(누르면 장면 사진) · 능력치 변화 · 인생 기록(나이대별)
//   ⑤ 오른쪽: 삶의 요약(학력 · 일한 직업들 · 평균 소득(한국 체감 원) · 결혼 · 자녀 · 살았던 나라 · 사망 원인) · 퀘스트
import { Fragment, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import client from '../../api/api';
import Panel from '../../common/ui/Panel';
import Button from '../../common/ui/Button';
import Modal from '../../common/ui/Modal';
import Spoon from '../../common/ui/Spoon.jsx';
import { SPOONS } from '../../common/ui/spoon.js';
import Figure from '../../engine/village/Figure';
import { lookOf } from '../../engine/village/costumeData';
import { COUNTRIES } from '../../engine/village/villageData';
import { won, ro, histNote } from '../../engine/play/lifeText';
import { bigMoments, buildFilm, retireAge, stagesOf } from '../../engine/film/filmPlan';
import StatChart from './StatChart';
import MomentPhoto from './MomentPhoto';
import StoryPanel from './StoryPanel';
import QnaPanel from './QnaPanel';
import EndingFilm from '../../engine/film/EndingFilm';
import FilmTest from '../../engine/film/FilmTest';
import styles from './ResultPage.module.css';

// 학력 코드 → 화면 글자
const EDU_NAME = { NONE: '학교 안 다님', ELEM: '초등학교', MIDDLE: '중학교', HIGH: '고등학교', UNI: '대학교', GRAD: '대학원' };

function eduText(r) {
  if (!r.eduLevel || r.eduLevel === 'NONE') return EDU_NAME.NONE;
  if (r.schoolStatus === 'DROPPED') return EDU_NAME[r.eduLevel] + ' 중퇴';
  if (r.schoolStatus === 'GRADUATED') return EDU_NAME[r.eduLevel] + ' 졸업';
  if (r.schoolStatus === 'ENROLLED') return EDU_NAME[r.eduLevel] + ' 다니던 중';
  return EDU_NAME[r.eduLevel];
}

// 결혼: 지금 상태 + 이력 (이혼·사별하면 마지막엔 미혼이라 '안 함'으로 나오던 것)
//   예: 결혼함 · 재혼 (결혼 2번) · 결혼 후 사별 · 결혼 2번 · 이혼 · 안 함
function marriedText(r) {
  const w = r.weddingCount || 0;
  const d = r.divorceCount || 0;
  const x = r.widowCount || 0;
  if (r.marriedYn === 'Y') return w > 1 ? `재혼 (결혼 ${w}번)` : '결혼함';
  if (w === 0) return '안 함';
  const end = d > 0 && x > 0 ? '이혼 · 사별' : x > 0 ? '사별' : '이혼';
  return w > 1 ? `결혼 ${w}번 · ${end}` : `결혼 후 ${end}`;
}

// 사망 원인 분류 이름 → 문장에 넣을 말 ('기타 질환으로 세상을 떠났어요' → '병으로 …', 백엔드 LifeEvidence.causeText 와 같게)
const causeText = (c) => (!c || c === '기타 질환' || c === '질병' ? '병' : c === '기타 사고·손상' ? '사고' : c);

// 카카오톡 공유용 JavaScript 키 (환경변수 VITE_KAKAO_JS_KEY 가 있으면 카카오톡 카드 공유, 없으면 모바일 공유창 / 링크 복사로 동작)
const KAKAO_JS_KEY = import.meta.env.VITE_KAKAO_JS_KEY || '';
// 카카오 제품 링크 관리에는 localhost 를 등록할 수 없어서, 로컬 테스트 중일 땐 VITE_SHARE_ORIGIN(배포 주소)을 링크 기준으로 씀
const SHARE_ORIGIN = import.meta.env.VITE_SHARE_ORIGIN || '';

// 사망 원인을 카톡 공유 카드용 짧은 감성 문구로
function poeticEnd(cause, age) {
  const c = String(cause || '');
  if (/노환|자연사/.test(c)) return '평온히 잠듦';
  if (/전쟁|내전|폭격|분쟁/.test(c)) return '거친 시대 속에서';
  if (/지진|홍수|재난|기근|가뭄|화재/.test(c)) return '거친 바람 속에서';
  if (/사고|손상|추락|익사|교통/.test(c)) return '갑작스러운 이별';
  if (age != null && age < 5) return '짧은 숨을 남기고';
  if (/암|종양|심장|뇌|호흡|폐렴|결핵|감염|질환|병|말라리아/.test(c)) return '긴 투병 끝에';
  return '조용히 눈을 감음';
}

// 어른(19세 이상)은 본인 평균 소득 위치(상위/하위 N%), 18세 이하는 태어난 집 수저 (여권 카드 규칙과 같게)
function shareTierText(r) {
  if ((r.deathAge ?? 0) <= 18) {
    return SPOONS[Math.max(1, Math.min(5, r.originClass || 3))]?.name || '보통 집안';
  }
  if (r.avgIncome && r.incomeTopPct != null) {
    const p = r.incomeTopPct;
    return p > 50 ? `소득 하위 ${Math.round((100 - p) * 10) / 10}%` : `소득 상위 ${p}%`;
  }
  return '소박한 살림';
}

// 카카오톡 공유용 대표 배너 이미지를 카카오 CDN 에 올려서 URL 을 받아 둠 (로컬 테스트 중에도 이미지가 깨지지 않음)
const BANNER_CACHE_KEY = 'kakaoShareBannerUrl_v1';
let bannerUploadPromise = null;
async function getKakaoBannerUrl(kakao, fallbackUrl) {
  try {
    const cached = localStorage.getItem(BANNER_CACHE_KEY);
    if (cached) return cached;
  } catch { /* 무시 */ }
  if (!kakao?.Share?.uploadImage) return fallbackUrl;
  if (!bannerUploadPromise) {
    bannerUploadPromise = fetch('/share-banner.jpg')
      .then((res) => (res.ok ? res.blob() : null))
      .then((blob) => {
        if (!blob) return null;
        const file = new File([blob], 'share-banner.jpg', { type: 'image/jpeg' });
        return kakao.Share.uploadImage({ file: [file] });
      })
      .then((res) => {
        const url = res?.infos?.original?.url || null;
        if (url) {
          try { localStorage.setItem(BANNER_CACHE_KEY, url); } catch { /* 무시 */ }
        }
        return url;
      })
      .catch(() => null)
      .finally(() => { bannerUploadPromise = null; });
  }
  return (await bannerUploadPromise) || fallbackUrl;
}

function loadKakaoSdk() {
  if (typeof window === 'undefined' || !KAKAO_JS_KEY) return Promise.resolve(null);
  if (window.Kakao) {
    if (!window.Kakao.isInitialized()) window.Kakao.init(KAKAO_JS_KEY);
    return Promise.resolve(window.Kakao);
  }
  return new Promise((resolve) => {
    const existing = document.getElementById('kakao-js-sdk');
    if (existing) {
      existing.addEventListener('load', () => {
        if (window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(KAKAO_JS_KEY);
        resolve(window.Kakao || null);
      }, { once: true });
      return;
    }
    const s = document.createElement('script');
    s.id = 'kakao-js-sdk';
    s.src = 'https://t1.kakaocdn.net/kakao_js_sdk/2.7.4/kakao.min.js';
    s.async = true;
    s.onload = () => {
      if (window.Kakao && !window.Kakao.isInitialized()) window.Kakao.init(KAKAO_JS_KEY);
      resolve(window.Kakao || null);
    };
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

// 국기 (flagcdn, 출생 화면 · 진행 화면과 같은 그림)
function Flag({ cc, size = 20 }) {
  const code = COUNTRIES[cc]?.[0];
  return code ? <img className={styles.flag} src={`https://flagcdn.com/w40/${code}.png`} alt="" width={size} height={Math.round(size * 0.67)} /> : null;
}

// 가장 행복했던 때 · 가장 힘들었던 때 (11/25 동현님: 인생 점수 대신)
//   한 해만 튀는 걸 막으려고 앞뒤 1년과 평균을 내서 고름
function peaksOf(years) {
  const ys = years || [];
  if (!ys.length) return null;
  const avg = (i) => {
    const w = ys.slice(Math.max(0, i - 1), i + 2);
    return w.reduce((x, y) => x + y.happiness, 0) / w.length;
  };
  let hi = 0;
  let lo = 0;
  ys.forEach((y, i) => {
    if (avg(i) > avg(hi)) hi = i;
    if (avg(i) < avg(lo)) lo = i;
  });
  return { hi: ys[hi], lo: ys[lo] };
}

// 가장 행복했던 때 아래 한 줄: 가까운(±2년) 큰 장면, 없으면 그해 연도 · 하던 일
//   (그해 사건 줄을 그대로 쓰면 '차별을 겪었다. 어떻게 할까?' 같은 줄이 나와서 뺌)
//   슬픈 장면(이별 · 시련 · 병원 · 수감 · 피란 · 실직 등)은 '가장 행복했던 때' 밑에 어울리지 않아서 뺌
const SAD_SCENE = new Set(['loss', 'rain', 'hosp', 'prison', 'flee', 'news']);
const SAD_TEXT = /잃|그만두|문을 닫|떠나|세상을 떠|아프|병|다쳤|사고|이혼|헤어|실패|빚|해고|쫓겨|피란|전쟁|체포/;
function peakLine(r, moments, y) {
  const near = moments.filter((m) => Math.abs(m.a - y.age) <= 2 && !SAD_SCENE.has(m.scene) && !SAD_TEXT.test(m.t)).sort((a, b) => Math.abs(a.a - y.age) - Math.abs(b.a - y.age))[0];
  if (near) return near.a === y.age ? near.t : `${near.a}세 · ${near.t}`;
  return `${y.yearNo}년${y.jobName ? ` · ${y.jobName}` : ''}`;
}

// 일한 직업들: 연도별 기록에서 같은 일이 이어진 구간 [{ name, from, to, years }]
//   은퇴한 뒤에도 연도 기록에 마지막 직업이 남아 있던 인생('봉제 공장 50~98세')은 은퇴 나이에서 끊음 (11/25)
function jobRuns(years, ret = 999) {
  const out = [];
  (years || []).filter((y) => y.age < ret).forEach((y) => {
    const last = out[out.length - 1];
    if (y.jobName && last && last.name === y.jobName && last.to === y.age - 1) last.to = y.age;
    else if (y.jobName) out.push({ name: y.jobName, from: y.age, to: y.age });
  });
  return out.map((j) => ({ ...j, years: j.to - j.from + 1 }));
}

// 살았던 나라 구간 [{ cc, name, from, to }] (name: 서버가 붙여 준 그 나라 이름, 11/25)
function countryRuns(years) {
  const out = [];
  (years || []).forEach((y) => {
    if (!y.countryCode) return;
    const last = out[out.length - 1];
    if (last && last.cc === y.countryCode) last.to = y.age;
    else out.push({ cc: y.countryCode, name: y.countryName, from: y.age, to: y.age });
  });
  return out;
}

// 띠 안에 들어갈 만큼만 글자 (넘치면 …)
const fit = (text, px) => {
  const n = Math.floor((px - 8) / 9.5);
  return text.length <= n ? text : n >= 3 ? text.slice(0, n - 1) + '…' : '';
};

// 큰 장면 이름표 (엔딩 크레딧 장면 이름)
const SCENE_LABEL = {
  school: '입학', grad: '졸업', date: '청혼', wedding: '결혼', newborn: '아이', hosp: '병원', loss: '이별', fly: '이민', flee: '피란',
  rain: '시련', news: '역사', home: '내 집', award: '경사', party: '은퇴', prison: '수감', work: '일', village: '그해',
};

// 행복 → 막대 색 (낮으면 차갑게, 높으면 따뜻하게)
const hapColor = (h) => (h >= 70 ? 'var(--stat-happiness)' : h >= 50 ? '#d9b25c' : h >= 35 ? '#9aa7b8' : '#6f7f96');

// 인생 지도: 한 해 한 칸 (높이 = 행복), 아래에 일 · 나라 띠. 칸에 마우스를 올리면 그해 말풍선, 큰 장면이 있는 해는 누르면 사진
function LifeMap({ r, moments, jobs, lands, onPick, onTip }) {
  const ys = r.years || [];
  const n = Math.max(1, (r.deathAge || 0) + 1);
  const W = 1000;
  const H = 148;
  const top = 12;
  const barH = 78;
  const cw = W / n;
  const x = (a) => (a / n) * W;
  const ticks = [];
  for (let a = 0; a <= r.deathAge; a += n > 60 ? 10 : 5) ticks.push(a);
  return (
    <svg className={styles.map} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`인생 지도: 한 칸이 1년, ${r.deathAge}년을 살았어요`} onPointerLeave={() => onTip(null)}>
      {/* 행복 막대 */}
      {ys.map((y) => {
        const h = Math.max(4, (y.happiness / 100) * barH);
        return <rect key={y.age} x={x(y.age) + 0.5} y={top + barH - h} width={Math.max(1, cw - 1)} height={h} rx={Math.min(3, cw / 3)} fill={hapColor(y.happiness)} opacity="0.85" />;
      })}
      <line x1="0" x2={W} y1={top + barH + 0.5} y2={top + barH + 0.5} stroke="var(--line-strong)" />
      {/* 마우스 칸: 한 해 세로 한 줄 전체 (막대가 낮아도 잘 잡히게) → 말풍선 */}
      {ys.map((y) => (
        <rect key={'h' + y.age} className={styles.mapHit} x={x(y.age)} y={top - 6} width={cw} height={barH + 6}
          onPointerEnter={(e) => onTip({ age: y.age, x: e.clientX, y: e.clientY })}
          onPointerMove={(e) => onTip({ age: y.age, x: e.clientX, y: e.clientY })}
          onClick={() => { const i = moments.findIndex((m) => m.a === y.age); if (i >= 0) onPick(i); }} />
      ))}
      {/* 일 띠 */}
      {jobs.map((j, i) => (
        <g key={'j' + i}>
          <rect x={x(j.from)} y={top + barH + 8} width={Math.max(2, x(j.to + 1) - x(j.from))} height="12" rx="4" fill={i % 2 ? 'var(--blue-line)' : 'var(--green-line)'}><title>{`${j.name} · ${j.from}~${j.to}세`}</title></rect>
          <text x={x(j.from) + 5} y={top + barH + 17.5} fontSize="9.5" fill="var(--ink)" pointerEvents="none">{fit(j.name, x(j.to + 1) - x(j.from))}</text>
        </g>
      ))}
      {/* 나라 띠 (이민했을 때만) */}
      {lands.length > 1 && lands.map((l, i) => (
        <g key={'l' + i}>
          <rect x={x(l.from)} y={top + barH + 24} width={Math.max(2, x(l.to + 1) - x(l.from))} height="12" rx="4" fill={i % 2 ? 'var(--primary-light)' : 'var(--panel-2)'} stroke="var(--line)"><title>{`${l.name} · ${l.from}~${l.to}세`}</title></rect>
          <text x={x(l.from) + 5} y={top + barH + 33.5} fontSize="9.5" fill="var(--ink-sub)" pointerEvents="none">{fit(l.name, x(l.to + 1) - x(l.from))}</text>
        </g>
      ))}
      {/* 나이 눈금 */}
      {ticks.map((a) => <text key={a} x={x(a) + cw / 2} y={H - 4} fontSize="10" textAnchor="middle" fill="var(--ink-light)">{a}세</text>)}
    </svg>
  );
}

// 인생 지도 말풍선 (play 인생 지도와 같은 모양): 나이·연도 / 행복·건강·순자산 / 그해 이야기 두 줄
function MapTip({ tip, r, moments, money }) {
  if (!tip) return null;
  const y = (r.years || []).find((v) => v.age === tip.age);
  const year = r.birthYear + tip.age;
  const mi = moments.findIndex((m) => m.a === tip.age);
  const ev = (r.events || []).filter((e) => e.age === tip.age && e.logText);
  const pickd = [];
  if (mi >= 0) pickd.push(moments[mi].t);
  [...ev.filter((e) => e.eventId), ...ev.filter((e) => !e.eventId && e.isAi !== 'Y'), ...ev.filter((e) => e.isAi === 'Y')]
    .forEach((e) => { if (pickd.length < 2 && !pickd.includes(e.logText)) pickd.push(e.logText); });
  const W = 280;
  const left = Math.min(tip.x + 14, window.innerWidth - W - 8);
  const top = tip.y + 170 > window.innerHeight ? tip.y - 160 : tip.y + 16;
  return createPortal(
    <div className={styles.mapTip} role="status" style={{ left, top, width: W }}>
      <b>{tip.age}세 · {year}년</b>{mi >= 0 && <span className={styles.tipNo}>{mi + 1}</span>}
      {y && (
        <div className={styles.tipStats}>
          행복 {y.happiness} · 건강 {y.health}
          {tip.age >= 15 && y.assets != null ? ` · 재산 ${money(y.assets)}` : ''}
          {y.jobName ? <><br />{y.jobName}{y.income ? ` · 소득 ${money(y.income)}` : ''}</> : null}
        </div>
      )}
      {pickd.map((t, i) => <div key={i} className={styles.tipLine}>· {t.length > 80 ? t.slice(0, 80) + '…' : t}</div>)}
      {mi >= 0 && <div className={styles.tipHint}>누르면 장면 사진</div>}
    </div>,
    document.body,
  );
}

function ResultPage() {
  const { lifeId } = useParams();
  if (lifeId === 'test') return <FilmTest />;
  return <ResultView />;
}

function ResultView() {
  const { lifeId } = useParams();
  const [query] = useSearchParams();
  const guestParam = query.get('guest');   // 링크로 받은 비회원 토큰 (없으면 이 브라우저 것)
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [stage, setStage] = useState(-1);          // 인생 기록: 보고 있는 나이대 (-1 = 전체)
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [pick, setPick] = useState(null);          // 사진으로 보고 있는 큰 장면 번호 (null = 닫힘)
  const [tip, setTip] = useState(null);            // 인생 지도 말풍선 { age, x, y }
  const [filmData, setFilmData] = useState(null);  // 큰 장면 사진용 필름 재료 (엔딩 크레딧과 같은 것)
  const [tab, setTab] = useState('log');            // 탭: log 인생 기록 · story 이야기(C19) · ask 묻기(C20)
  const detail = query.get('detail') === '1';  // 인생 기록 화면
  // C18-6 추모관에 올리기 (B01 POST /api/memorials/{lifeId}/open, 회원 · 내가 산 끝난 인생만, 한마디 100자)
  const [memoOpen, setMemoOpen] = useState(false);
  const [memoText, setMemoText] = useState('');
  const [memoBusy, setMemoBusy] = useState(false);
  const [memoErr, setMemoErr] = useState('');
  const [shareMsg, setShareMsg] = useState('');
  const openMemorial = () => {
    const text = memoText.trim();
    if (!text) { setMemoErr('한마디를 적어 주세요.'); return; }
    setMemoBusy(true);
    setMemoErr('');
    client.post(`/api/memorials/${lifeId}/open`, { message: text })
      .then(() => { setResult((x) => ({ ...x, memorialPostId: x.memorialPostId || -1 })); setMemoOpen(false); })
      .catch((err) => setMemoErr(err.response?.data?.message || '추모관을 열지 못했어요. 잠시 뒤 다시 해 주세요.'))
      .finally(() => setMemoBusy(false));
  };

  useEffect(() => {
    const isLogin = !!localStorage.getItem('token');
    const guestToken = guestParam || (isLogin ? null : localStorage.getItem('guestToken'));

    client.get(`/api/result/${lifeId}`, { params: { guestToken } })
      .then((res) => setResult(res.data))
      .catch((err) => {
        // 서버가 보낸 안내 문구(내 인생이 아니에요 등)가 있으면 그대로 보여줌
        const msg = err.response?.data;
        setError(typeof msg === 'string' && msg ? msg : '결과를 불러오지 못했어요.');
      });
  }, [lifeId, guestParam]);

  // 큰 장면 사진 재료: 엔딩 크레딧과 같은 GET /api/engine/film (착장 wear 포함)
  useEffect(() => {
    if (!detail) return undefined;
    const isLogin = !!localStorage.getItem('token');
    const guestToken = guestParam || (isLogin ? null : localStorage.getItem('guestToken'));
    let alive = true;
    client.get('/api/engine/film', { params: { lifeId, guestToken } })
      .then((f) => { if (alive) setFilmData(f.data); })
      .catch((err) => console.log('장면 사진 재료 불러오기 실패', err.response?.data));
    return () => { alive = false; };
  }, [lifeId, guestParam, detail]);

  // 인생 지도 말풍선은 화면을 굴리면 닫힘
  useEffect(() => {
    if (!tip) return undefined;
    const off = () => setTip(null);
    window.addEventListener('scroll', off, { passive: true });
    return () => window.removeEventListener('scroll', off);
  }, [tip]);

  // 공유 안내 문구는 2.5초 뒤 사라짐
  useEffect(() => {
    if (!shareMsg) return undefined;
    const t = setTimeout(() => setShareMsg(''), 2500);
    return () => clearTimeout(t);
  }, [shareMsg]);

  const filmWear = useMemo(() => (filmData?.wear ? { ...filmData.wear, ride: null } : null), [filmData]);

  const filmSegs = useMemo(() => {
    if (!filmData || !result) return null;
    try {
      return buildFilm(result, filmData).seg
        .filter((s) => s.kind === 'moment')
        .map((s) => (filmWear && s.v ? { ...s, v: { ...s.v, costume: filmWear } } : s));
    } catch (e) {
      console.warn('[result] 장면 사진', e);
      return null;
    }
  }, [filmData, filmWear, result]);

  // 화면용 계산 (결과가 오기 전에도 훅 순서가 같게 여기서)
  const view = useMemo(() => {
    if (!result) return null;
    const r = result;
    let moments;
    try { moments = bigMoments(r); } catch { moments = []; }
    const jobs = jobRuns(r.years, retireAge(r.events, r.years));
    const lands = countryRuns(r.years).map((l) => ({ ...l, name: l.name || (l.cc === r.birthCountry ? r.countryName : l.cc === r.currentCountry ? r.currentCountryName : l.cc) }));
    const stages = stagesOf(r.deathAge || 0).map(([a, b, name]) => ({ a, b, name, events: (r.events || []).filter((e) => e.age >= a && e.age <= b) })).filter((s) => s.events.length);
    const bigAges = new Set(moments.map((m) => m.a));
    return { moments, jobs, lands, stages, bigAges, peaks: peaksOf(r.years) };
  }, [result]);

  const shareLife = async (toFilm = false) => {
    if (!result) return;
    const isLocal = /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname);
    const origin = isLocal && SHARE_ORIGIN ? SHARE_ORIGIN.replace(/\/+$/, '') : window.location.origin;
    const hasMemorial = !!result.memorialPostId;
    const shareUrl = hasMemorial
      ? `${origin}/memorial/${lifeId}`
      : `${origin}/result/${lifeId}${toFilm ? '' : '?detail=1'}`;
    const btnTitle = hasMemorial ? '🌼 추모하러 가기' : '🌼 인생 보러 가기';
    const flagCode = COUNTRIES[result.birthCountry]?.[0] || 'kr';
    const flagImg = `https://flagcdn.com/w320/${flagCode}.png`;
    const flagThumb = `https://flagcdn.com/w80/${flagCode}.png`;

    // 카톡 말풍선 카드 요약 표(itemContent): 왼쪽 항목은 5글자 이내, 감성 톤으로 정리
    const tierText = shareTierText(result);
    const leVal = result.lifeExpectancy ? Math.round(result.lifeExpectancy) : null;
    const leDiffVal = leVal != null ? result.deathAge - leVal : null;
    const lifeSpanText = leDiffVal == null
      ? `${result.deathAge}세`
      : `${result.deathAge}세 (기대수명 ${leDiffVal >= 0 ? `+${leDiffVal}` : leDiffVal}년)`;
    const topJob = view?.jobs?.length ? [...view.jobs].sort((a, b) => b.years - a.years)[0] : null;
    const jobLine = topJob ? `${topJob.name} (${topJob.years}년)` : result.deathAge < 18 ? '꿈을 키우던 시절' : '조용한 나날';
    const happyLine = view?.peaks ? `${view.peaks.hi.age}세 (행복 ${view.peaks.hi.happiness})` : '-';
    const famBase = marriedText(result);
    const famLine = famBase === '안 함' && !result.childCount
      ? '홀로 걸은 길'
      : `${famBase}${result.childCount ? ` · 자녀 ${result.childCount}명` : ''}`;
    const endLine = poeticEnd(result.deathCause, result.deathAge);
    const migratedLife = result.currentCountry !== result.birthCountry;
    const title = `${result.name}, 한 사람의 계절이 저물었습니다`;
    const desc = migratedLife
      ? `${result.birthYear}년 ${result.countryName}에서 태어나 ${result.currentCountryName}에서 ${result.deathAge}년의 계절을 건너 별이 되었습니다.`
      : `${result.birthYear}년 ${result.countryName}에서 태어나 ${result.deathAge}년의 계절을 건너, 이제 별이 되었습니다.`;

    const kakao = await loadKakaoSdk();
    if (kakao?.Share) {
      const bannerUrl = await getKakaoBannerUrl(kakao, flagImg);
      kakao.Share.sendDefault({
        objectType: 'feed',
        content: {
          title,
          description: desc,
          imageUrl: bannerUrl,
          imageWidth: 800,
          imageHeight: 450,
          link: { mobileWebUrl: shareUrl, webUrl: shareUrl },
        },
        itemContent: {
          profileText: `환승인생 · ${result.countryName}`,
          profileImageUrl: flagThumb,
          titleImageText: `${result.name} (${result.birthYear}–${result.deathYear})`,
          titleImageCategory: `${tierText} · ${result.deathAge}세`,
          items: [
            { item: '생애', itemOp: lifeSpanText },
            { item: '걸어온 일', itemOp: jobLine },
            { item: '빛나던 때', itemOp: happyLine },
            { item: '곁의 사람', itemOp: famLine },
            { item: '떠난 길', itemOp: endLine },
          ],
          sum: '머문 계절',
          sumOp: `${result.deathAge}년`,
        },
        buttons: [
          { title: btnTitle, link: { mobileWebUrl: shareUrl, webUrl: shareUrl } },
        ],
      });
      return;
    }
    if (navigator.share) {
      try {
        await navigator.share({ title, text: desc, url: shareUrl });
        return;
      } catch {
        // 공유 창을 닫은 경우 링크 복사로 이어짐
      }
    }
    try {
      await navigator.clipboard.writeText(`${title}\n${desc}\n${shareUrl}`);
      setShareMsg('공유 링크를 복사했어요! 카카오톡에 붙여넣어 공유해 보세요.');
    } catch {
      setShareMsg('링크를 복사하지 못했어요.');
    }
  };

  if (error) {
    return (
      <div className="page col">
        <p>{error}</p>
        <Button onClick={() => navigate('/')}>메인으로</Button>
      </div>
    );
  }
  const guestQ = guestParam ? `&guest=${encodeURIComponent(guestParam)}` : '';

  // C22 엔딩 크레딧 (기본): 결과 화면 대신 바로 재생
  if (!detail) {
    return (
      <>
        {shareMsg && <div className={styles.shareToast} role="status">{shareMsg}</div>}
        <EndingFilm lifeId={lifeId} result={result} guestToken={guestParam} onClose={() => navigate('/')}
          actions={[
            { label: '다시 태어나기', onClick: () => navigate('/') },
            { label: '인생 기록 보기', onClick: () => navigate(`/result/${lifeId}?detail=1${guestQ}`) },
            ...(result?.mine ? [{ label: '카카오톡 공유', onClick: () => shareLife(true) }] : []),
          ]} />
      </>
    );
  }

  if (!result || !view) {
    return <div className="page"><p className="sub">결과를 불러오는 중…</p></div>;
  }

  const r = result;
  const isMember = r.startType === 'MEMBER' && !!localStorage.getItem('token') && r.mine;
  const k = r.krwPerUsd;
  const money = (usd) => (usd == null ? '-' : k ? won(usd, k) : '$' + Math.round(usd).toLocaleString('ko-KR'));
  const migrated = r.currentCountry !== r.birthCountry;
  const le = r.lifeExpectancy ? Math.round(r.lifeExpectancy) : null;
  const leDiff = le != null ? r.deathAge - le : null;
  const shown = stage < 0 ? r.events : (view.stages[stage]?.events || []);
  const logs = showAllLogs || stage >= 0 ? shown : shown.slice(0, 30);
  const filmUrl = `/result/${lifeId}${guestParam ? `?guest=${encodeURIComponent(guestParam)}` : ''}`;

  return (
    <div className={'sky ' + styles.page}>
      <div className={styles.wrap}>
        {/* ① 머리 */}
        <header className={styles.hero}>
          <div className={styles.portrait} aria-hidden="true">
            <Figure look={lookOf({ gender: r.gender, age: r.deathAge, costume: filmWear })} />
          </div>
          <div className={styles.heroText}>
            <p className={styles.eyebrow}>한 사람의 일생이 끝났어요</p>
            <h1 className={styles.name}>{r.name}</h1>
            <p className={styles.where}>
              <Flag cc={r.birthCountry} size={24} />
              <b>{r.countryName}</b>
              {histNote(r.countryName, r.histName) && <span className={styles.hist}>{histNote(r.countryName, r.histName)}</span>}
              <span className={styles.dot}>·</span>
              <span>{r.birthYear} – {r.deathYear}</span>
              <span className={styles.dot}>·</span>
              <span>{r.deathAge}세</span>
            </p>
            {migrated && (
              <p className={styles.moved}><Flag cc={r.currentCountry} size={18} />{r.currentCountryName}에서 생을 마침</p>
            )}
            <p className={styles.cause}>{ro(causeText(r.deathCause))} 세상을 떠났어요.</p>
          </div>
          <div className={styles.heroActs}>
            <Button type="primary" pill onClick={() => navigate(filmUrl)}>▶ 엔딩 크레딧 다시 보기</Button>
            {r.mine && <Button pill onClick={() => shareLife(false)}>카카오톡 공유하기</Button>}
            {isMember && !r.memorialPostId && (
              <Button pill onClick={() => { setMemoText(''); setMemoErr(''); setMemoOpen(true); }}>추모관에 올리기</Button>
            )}
            {r.memorialPostId && <Button pill onClick={() => navigate(`/memorial/${lifeId}`)}>추모관 가기</Button>}
            <Button pill onClick={() => navigate('/')}>다시 태어나기</Button>
          </div>
        </header>
        {shareMsg && <div className={styles.shareToast} role="status">{shareMsg}</div>}

        {/* ② 숫자 4칸 */}
        <section className={styles.nums}>
          <div className={styles.num}>
            <span className={styles.numLabel}>수명</span>
            <b className={styles.numVal}>{r.deathAge}<small>세</small></b>
            {le != null && (
              <span className={styles.numSub}>
                그 시대 기대수명 {le}세 · <em className={leDiff >= 0 ? styles.up : styles.down}>{leDiff >= 0 ? `${leDiff}년 더` : `${-leDiff}년 덜`}</em>
              </span>
            )}
            {le != null && (
              <span className={styles.lifeBar} aria-hidden="true">
                <i style={{ width: `${Math.min(100, (r.deathAge / Math.max(le, r.deathAge, 1)) * 100)}%` }} />
                <s style={{ left: `${Math.min(100, (le / Math.max(le, r.deathAge, 1)) * 100)}%` }} />
              </span>
            )}
          </div>
          <div className={styles.num}>
            <span className={styles.numLabel}>가장 행복했던 때</span>
            {view.peaks ? (
              <>
                <b className={styles.numVal}>{view.peaks.hi.age}<small>세</small><span className={styles.numMini}>행복 {view.peaks.hi.happiness}</span></b>
                <span className={styles.numSub + ' ' + styles.clip}>{peakLine(r, view.moments, view.peaks.hi)}</span>
                <span className={styles.numSub}>가장 힘들었던 때 {view.peaks.lo.age}세 (행복 {view.peaks.lo.happiness})</span>
              </>
            ) : <b className={styles.numVal}>-</b>}
          </div>
          <div className={styles.num}>
            <span className={styles.numLabel}>평균 소득 위치</span>
            {!r.avgIncome ? (
              <>
                <b className={styles.numVal}>소득 없음</b>
                <span className={styles.numSub}>{r.deathAge < 18 ? '돈을 벌 나이가 되기 전에 세상을 떠났어요.' : '일해서 번 돈이 없었어요.'}</span>
              </>
            ) : (
              <>
                <b className={styles.numVal}>{r.incomeTopPct == null ? '-' : r.incomeTopPct > 50 ? <>하위 {Math.round((100 - r.incomeTopPct) * 10) / 10}<small>%</small></> : <>상위 {r.incomeTopPct}<small>%</small></>}</b>
                <span className={styles.numSub}>아시아(등록된 나라) 사람들 가운데 · 한 해 평균 {money(r.avgIncome)}</span>
              </>
            )}
          </div>
          <div className={styles.num}>
            <span className={styles.numLabel}>태어난 집</span>
            <b className={styles.numVal}><Spoon level={r.originClass || 3} size={26} /></b>
            <span className={styles.numSub}>그 나라 소득 {r.originClass || 3}분위 (1 가난 · 5 부유)</span>
          </div>
        </section>

        {/* ③ 탭: 인생 기록 · 이야기 · 묻기 */}
        <nav className={styles.mainTabs} role="tablist" aria-label="인생 기록 보기 방식">
          {[['log', '인생 기록', '지도 · 장면 · 기록'], ['story', '이야기', 'AI가 쓴 회고록'], ['ask', '묻기', `${r.deathAge < 13 ? '어머니' : r.name}에게 직접`]].map(([key, label, sub]) => (
            <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}>
              <b>{label}</b><small>{sub}</small>
            </button>
          ))}
        </nav>

        <div className={styles.grid}>
          {/* ④ 왼쪽 (탭 내용) */}
          <div className={styles.main}>
            {tab === 'story' && (
              <StoryPanel lifeId={lifeId} guestToken={guestParam} moments={view.moments} segs={filmSegs} onPhoto={setPick} />
            )}
            {tab === 'ask' && (
              <QnaPanel lifeId={lifeId} guestToken={guestParam} r={r} happyAge={view.peaks?.hi.age} costume={filmWear} />
            )}
            {tab === 'log' && (<>
            <Panel title="인생 지도" right={<span className="sub">한 칸 = 1년 · 높이 = 행복</span>}>
              <LifeMap r={r} moments={view.moments} jobs={view.jobs} lands={view.lands} onPick={setPick} onTip={setTip} />
              <MapTip tip={tip} r={r} moments={view.moments} money={money} />
              <div className={styles.mapLegend}>
                <span><i style={{ background: 'var(--stat-happiness)' }} />행복한 해</span>
                <span><i style={{ background: '#6f7f96' }} />힘든 해</span>
                {view.jobs.length > 0 && <span><i style={{ background: 'var(--green-line)' }} />일한 기간</span>}
                {view.lands.length > 1 && <span><i style={{ background: 'var(--primary-light)', border: '1px solid var(--line)' }} />살았던 나라</span>}
              </div>
            </Panel>

            {view.moments.length > 0 && (
              <Panel title="인생의 큰 장면" right={<span className="sub">누르면 장면 사진</span>}>
                <ol className={styles.moments}>
                  {view.moments.map((m, i) => (
                    <li key={i} className={pick === i ? styles.picked : undefined} onClick={() => setPick(i)}
                      tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPick(i); } }}>
                      <span className={styles.mNo}>{i + 1}</span>
                      <span className={styles.mAge}>{m.a}세<small>{r.birthYear + m.a}년</small></span>
                      <span className={styles.mText}>{m.t}</span>
                      {SCENE_LABEL[m.scene] && <span className={styles.mTag}>{SCENE_LABEL[m.scene]}</span>}
                      <span className={styles.mCam} aria-hidden="true">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z" /><circle cx="12" cy="13" r="3.5" /></svg>
                      </span>
                    </li>
                  ))}
                </ol>
              </Panel>
            )}

            <Panel title="능력치 변화" right={<span className="sub">건강 · 행복 · 지식 · 관계 (0–100)</span>}>
              <StatChart years={r.years} />
            </Panel>

            <Panel title={`인생 기록 (${r.events.length})`}>
              <div className={styles.tabs} role="tablist">
                <button type="button" role="tab" aria-selected={stage < 0} onClick={() => setStage(-1)}>전체</button>
                {view.stages.map((s, i) => (
                  <button key={s.name} type="button" role="tab" aria-selected={stage === i} onClick={() => setStage(i)}>
                    {s.name}<small>{s.events.length}</small>
                  </button>
                ))}
              </div>
              {r.events.length === 0 && <p className="sub">기록된 사건이 없어요.</p>}
              <ul className={styles.logs}>
                {logs.map((e, i) => {
                  const first = i === 0 || logs[i - 1].age !== e.age;
                  const big = view.bigAges.has(e.age) && first;
                  return (
                    <Fragment key={e.logId}>
                      <li className={(first ? styles.newAge : '') + (big ? ' ' + styles.bigLine : '')}>
                        <span className={styles.lAge}>{first ? <>{e.age}세<small>{e.yearNo}</small></> : ''}</span>
                        <span className={styles.lText}>
                          {e.logText}
                          {e.choiceText && <em className={styles.lChoice}>고른 것: {e.choiceText}</em>}
                        </span>
                        {e.isAi === 'Y' && <span className={styles.lAi} title="AI가 그해 상황을 서술한 줄">AI</span>}
                      </li>
                    </Fragment>
                  );
                })}
              </ul>
              {stage < 0 && r.events.length > 30 && (
                <Button type="ghost" block onClick={() => setShowAllLogs(!showAllLogs)}>
                  {showAllLogs ? '접기' : `전체 보기 (${r.events.length}줄)`}
                </Button>
              )}
            </Panel>

            </>)}

            {pick != null && (
              <MomentPhoto list={view.moments} segs={filmSegs} at={pick} birthYear={r.birthYear}
                label={SCENE_LABEL[view.moments[pick]?.scene]} onMove={setPick} onClose={() => setPick(null)} />
            )}

          </div>

          {/* ⑤ 오른쪽 */}
          <aside className={styles.side}>
            <Panel title="삶의 요약">
              <dl className={styles.facts}>
                <dt>학력</dt><dd>{eduText(r)}</dd>
                <dt>일</dt>
                <dd>
                  {view.jobs.length === 0 ? '일한 적 없음' : (
                    <ul className={styles.jobs}>
                      {[...view.jobs].sort((a, b) => b.years - a.years).slice(0, 4).map((j, i) => (
                        <li key={i}><b>{j.name}</b><span>{j.from}~{j.to}세 · {j.years}년</span></li>
                      ))}
                      {view.jobs.length > 4 && <li className="sub">그 밖에 {view.jobs.length - 4}가지</li>}
                    </ul>
                  )}
                </dd>
                <dt>평균 소득</dt><dd>{r.avgIncome ? <>한 해 {money(r.avgIncome)}{k ? <small className={styles.note}> 한국 체감</small> : null}</> : '없음'}</dd>
                <dt>결혼</dt><dd>{marriedText(r)}</dd>
                <dt>자녀</dt><dd>{r.childCount ? `${r.childCount}명` : '없음'}</dd>
                <dt>살았던 나라</dt>
                <dd className={styles.lands}>
                  {view.lands.map((l, i) => (
                    <span key={i}><Flag cc={l.cc} size={16} />{l.name}<small>{l.from}~{l.to}세</small></span>
                  ))}
                </dd>
                <dt>사망 원인</dt><dd>{r.deathCause || '-'}</dd>
              </dl>
            </Panel>

            {r.quests.length > 0 && (
              <Panel title="퀘스트" right={<span className="gold">+{r.pointEarned}P</span>}>
                <ul className={styles.quests}>
                  {r.quests.map((q) => (
                    <li key={q.questId} className={q.achieved === 'Y' ? styles.qOk : ''}>
                      <span aria-hidden="true">{q.achieved === 'Y' ? '★' : '☆'}</span>
                      <span>{q.questName}</span>
                      <b>{q.achieved === 'Y' ? '달성' : '미달성'}</b>
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

          </aside>
        </div>
      </div>

      {/* C18-6 추모관에 올리기: 한마디를 남기면 추모관 목록에 이 인생의 방이 열림 */}
      <Modal open={memoOpen} title="추모관에 올리기" onClose={memoBusy ? undefined : () => setMemoOpen(false)}>
        <div className={styles.memo}>
          <p className="sub">{r.name}({r.birthYear}–{r.deathYear})의 방이 추모관에 열려요. 다른 사람들이 영상 · 사진첩을 보고 촛불과 방명록을 남길 수 있어요.</p>
          <textarea value={memoText} maxLength={100} rows={3} disabled={memoBusy}
            placeholder="이 삶에 남기는 마지막 한마디 (100자까지)" onChange={(e) => setMemoText(e.target.value)} />
          <div className={styles.memoFoot}>
            <span className="sub">{memoText.trim().length}/100</span>
            {memoErr && <span className={styles.memoErr} role="alert">{memoErr}</span>}
          </div>
          <div className={styles.memoActs}>
            <Button onClick={() => setMemoOpen(false)} disabled={memoBusy}>취소</Button>
            <Button type="primary" onClick={openMemorial} disabled={memoBusy || !memoText.trim()}>{memoBusy ? '여는 중…' : '추모관 열기'}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default ResultPage;
