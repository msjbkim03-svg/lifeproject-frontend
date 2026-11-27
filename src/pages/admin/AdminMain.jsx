// A04 관리자 대시보드 (주소: /admin, 관리자만) - 11/25 다시 그림 (가독성 · 할 일 위주)
// GET /api/admin/dashboard → 플레이 수 · 최근 14일 · 완료율 · 퀘스트 달성률 · 나라별 수명 · 사망 원인 · 수명 분포 · 최근 끝난 인생
//   (특성 레벨 분포 traits 도 서버가 주지만 화면에서는 뺌 (11/25): 보고 바로 고칠 게 없어서 수명 · 사망 쪽에 자리를 줌)
// 관리자 확인은 서버가 DB 권한(MEMBER_ROLE)으로 다시 함 (localStorage 값만 믿지 않음)
// 화면 순서 (자주 보는 것 → 고칠 것 → 자세히)
//   메뉴 줄(기준 시각 · 새로고침) → 숫자 4칸(꺾은선 · 앞 기간 대비) → 확인할 것(자동 점검) → 최근 14일
//   → 나라별 수명 검증(상태별 표) → [사망 원인 | 수명 분포] → [퀘스트 달성률 | 최근 끝난 인생]
//   (회원 · 비회원 완료율은 숫자 칸 '끝까지 산 비율' 안 작은 막대로)
// 그래프는 설치 없이 직접 그림 (막대 = HTML, 도넛 = SVG)
import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import client from '../../api/api';
import Button from '../../common/ui/Button';
import { COUNTRIES } from '../../engine/village/villageData';
import { errMsg } from './adminUtil';
import AdminNav from './AdminNav';
import styles from './AdminMain.module.css';

// ───────── 기준값 (여기만 바꾸면 화면 전체가 따라감) ─────────
const TYPE_NAME = { MEMBER: '회원', GUEST: '비회원' };
const EASY = 80; // 달성률이 이 % 이상이면 너무 쉬운 퀘스트
const HARD = 10; // 이 % 이하면 너무 어려운 퀘스트
const BAD = 10; // 게임 수명이 실제 기대수명과 이 년 이상 다르면 '손볼 나라'
const WARN = 5; // 이 년 이상이면 '주의'
const FEW = 30; // 끝까지 산 인생이 이 명보다 적으면 평균을 믿기 어려움 ('표본 적음')
//   수명은 사람마다 20년쯤 들쭉날쭉해서, 평균의 흔들림 ≈ 20 ÷ √(인생 수): 10명이면 ±6년, 30명이면 ±3.7년
//   → 10명으로는 '10년 차이'가 우연일 수 있어서 30명부터 판정
const SPAN = 20; // 차이 막대 끝 = ±20년
const SHOW = 10; // 나라 표 처음에 보이는 줄 수
const QUIT = 40; // 중간에 나간 비율이 이 % 이상이면 확인할 것

const round1 = (n) => Math.round(n * 10) / 10;
const fmt = (n) => (n == null ? '-' : Number(n).toLocaleString());
const one = (n) => (n == null ? '-' : Number(n).toFixed(1)); // 55 → '55.0' (자리 맞춤)
const signed = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(1); // 진짜 빼기 기호

function Flag({ cc }) {
  const code = COUNTRIES[cc]?.[0];
  return code
    ? <img className={styles.flag} src={`https://flagcdn.com/w40/${code}.png`} alt="" width={20} height={14} loading="lazy" />
    : <span className={styles.flag} aria-hidden="true" />;
}

// ───────── 말풍선 (인생 기록 화면 '인생 지도' 말풍선과 같은 모양) ─────────
// 그래프 칸에 {...hov(<TipBody … />)} 를 붙이면 마우스를 올렸을 때 커서 옆에 뜸
function Tip({ tip }) {
  if (!tip) return null;
  const W = 250;
  const left = Math.max(8, Math.min(tip.x + 14, window.innerWidth - W - 8));
  const below = tip.y + 190 < window.innerHeight; // 아래 자리가 모자라면 커서 위로
  const pos = below ? { top: tip.y + 16 } : { bottom: window.innerHeight - tip.y + 12 };
  return createPortal(<div className={styles.tip} role="status" style={{ left, width: W, ...pos }}>{tip.c}</div>, document.body);
}

// 말풍선 안: 제목 · 작은 제목 · [이름, 값, 색(bad·warn·ok), 굵게] 줄들 · 아래 한 줄
function TipBody({ title, sub, rows = [], note }) {
  return (
    <>
      <b className={styles.tipTitle}>{title}</b>
      {sub && <span className={styles.tipSub}>{sub}</span>}
      {rows.length > 0 && (
        <div className={styles.tipRows}>
          {rows.map(([k, v, tone, strong], i) => (
            <div key={i} className={(strong ? styles.tipStrong : '') + (k.startsWith('  ') ? ' ' + styles.tipIn : '')}>
              <span>{k.trim()}</span><em className={tone ? styles['t_' + tone] : ''}>{v}</em>
            </div>
          ))}
        </div>
      )}
      {note && <span className={styles.tipNote}>{note}</span>}
    </>
  );
}

// 나라 상태: bad 손볼 · warn 주의 · ok 정확 · few 표본 적음
const stateOf = (c) => (c.lives < FEW ? 'few' : Math.abs(c.diff) >= BAD ? 'bad' : Math.abs(c.diff) >= WARN ? 'warn' : 'ok');
const STATE = {
  bad: { name: '손볼 나라', short: '손볼', desc: `${BAD}년 이상 차이` },
  warn: { name: '주의', short: '주의', desc: `${WARN}~${BAD}년 차이` },
  ok: { name: '정확', short: '정확', desc: `${WARN}년 안쪽` },
  few: { name: '표본 적음', short: '표본 적음', desc: `인생 ${FEW}명 미만` },
};

// 서버 값 → 화면에 쓸 값
function summarize(d) {
  const comp = d.completion || [];
  const ended = comp.reduce((s, c) => s + c.ended, 0);
  const abandoned = comp.reduce((s, c) => s + c.abandoned, 0);
  const playing = comp.reduce((s, c) => s + c.playing, 0);
  const doneRate = ended + abandoned ? round1((ended * 100) / (ended + abandoned)) : null;

  // 나라: 끝까지 산 인생이 있고 실제 기대수명도 있는 나라만
  const countries = (d.countries || [])
    .filter((c) => c.lives > 0 && c.realLifeExpectancy != null)
    .map((c) => { const x = { ...c, diff: round1(c.avgDeathAge - c.realLifeExpectancy) }; return { ...x, state: stateOf(x) }; })
    .sort((a, b) => b.lives - a.lives || Math.abs(b.diff) - Math.abs(a.diff)); // 기본: 인생 많은 나라 순 (많이 태어나는 나라 = 플레이어가 많이 겪는 나라, 평균도 믿을 만함)
  const count = { bad: 0, warn: 0, ok: 0, few: 0 };
  countries.forEach((c) => { count[c.state] += 1; });
  const sure = countries.filter((c) => c.state !== 'few');
  const sureLives = sure.reduce((s, c) => s + c.lives, 0);
  const gameAge = sureLives ? round1(sure.reduce((s, c) => s + c.avgDeathAge * c.lives, 0) / sureLives) : null;
  const realAge = sureLives ? round1(sure.reduce((s, c) => s + c.realLifeExpectancy * c.lives, 0) / sureLives) : null;

  const judged = (d.quests || []).filter((q) => q.picked > 0);
  const questAvg = judged.length ? round1(judged.reduce((s, q) => s + q.rate, 0) / judged.length) : null;
  const easy = judged.filter((q) => q.rate >= EASY);
  const hard = judged.filter((q) => q.rate <= HARD);
  const quits = comp.filter((c) => c.ended + c.abandoned > 0 && c.abandonedRate >= QUIT);

  // 확인할 것 (자동 점검): [색, 글, 이동할 곳 id, 나라 표 탭]
  const todo = [];
  if (count.bad) todo.push(['bad', `수명이 실제와 ${BAD}년 넘게 다른 나라 ${count.bad}개 — ${sure.filter((c) => c.state === 'bad').slice(0, 3).map((c) => c.countryName).join(', ')}${count.bad > 3 ? ' 등' : ''}`, 'sec-country', 'bad']);
  if (count.warn) todo.push(['warn', `수명 차이 ${WARN}~${BAD}년인 나라 ${count.warn}개`, 'sec-country', 'warn']);
  const names = (list) => list.slice(0, 3).map((q) => `${q.questName} ${q.rate}%`).join(', ') + (list.length > 3 ? ' 등' : ''); // 3개까지
  if (hard.length) todo.push(['bad', `너무 어려운 퀘스트 ${hard.length}개 — ${names(hard)}`, 'sec-quest']);
  if (easy.length) todo.push(['warn', `너무 쉬운 퀘스트 ${easy.length}개 — ${names(easy)}`, 'sec-quest']);
  quits.forEach((c) => todo.push(['warn', `${TYPE_NAME[c.startType] || c.startType} 인생의 ${c.abandonedRate}%가 중간에 나감`, 'kpi-done']));

  return { ended, abandoned, playing, doneRate, countries, count, gameAge, realAge, judged, questAvg, easy, hard, todo };
}

// ───────── 작은 조각 ─────────

// 숫자 한 칸
//   spark: 최근 14일 값 (오른쪽 위 작은 꺾은선), tone: bad · warn · ok (아래 글 색)
function Num({ id, flash, label, value, unit, sub, tone, spark, sparkNote, children }) {
  return (
    <div id={id} className={styles.num + (id && flash === id ? ' ' + styles.flash : '')}>
      <div className={styles.numTop}>
        <span className={styles.numLabel}>{label}</span>
        {spark && <span className={styles.sparkBox} title={sparkNote ? `최근 14일 ${sparkNote}` : '최근 14일'}><Spark values={spark} /></span>}
      </div>
      <b className={styles.numVal}>{value ?? '-'}{value != null && unit && <small>{unit}</small>}</b>
      {children}
      {sub && <span className={styles.numSub + (tone ? ' ' + styles['t_' + tone] : '')}>{sub}</span>}
    </div>
  );
}

// 구역 카드 (제목 + 한 줄 설명 + 오른쪽 자리)
function Section({ id, title, desc, right, children, flash }) {
  return (
    <section id={id} className={styles.card + (flash && flash === id ? ' ' + styles.flash : '')}>
      <header className={styles.cardHead}>
        <div>
          <h2>{title}</h2>
          {desc && <p>{desc}</p>}
        </div>
        {right}
      </header>
      {children}
    </section>
  );
}

// 확인할 것 (자동 점검)
function Todo({ list, onGo }) {
  return (
    <section className={styles.todo + (list.length ? '' : ' ' + styles.todoOk)}>
      <h2>{list.length ? `확인할 것 ${list.length}` : '확인할 것 없음'}</h2>
      {list.length ? (
        <ul>
          {list.map(([tone, text, to, tab], i) => (
            <li key={i}>
              <button type="button" onClick={() => onGo(to, tab)}>
                <i className={styles['dot_' + tone]} />
                <span>{text}</span>
                <em aria-hidden="true">›</em>
              </button>
            </li>
          ))}
        </ul>
      ) : <p>수명 · 퀘스트 · 완료율 모두 기준 안이에요.</p>}
    </section>
  );
}

// ───────── 나라별 수명 검증 ─────────
//   상태 탭(손볼 · 주의 · 정확 · 표본 적음) + 한 나라 한 줄 표
//   차이 막대: 가운데 0에서 왼쪽 = 게임이 짧음, 오른쪽 = 게임이 김
//   tab 은 위(Dashboard)에서 받음 → '확인할 것'에서 '손볼 나라'를 누르면 손볼 탭으로 바로 열림
//   정렬: 인생 많은 순(기본) / 차이 큰 순 - 머리줄의 '인생' · '차이'를 누르면 바뀜
function CountryTable({ rows, count, tab, setTab, hov }) {
  const [all, setAll] = useState(false);
  const [sort, setSort] = useState('lives');
  if (!rows.length) return <p className={styles.empty}>아직 끝까지 산 인생이 없어요.</p>;
  const picked = tab === 'all' ? rows.filter((c) => c.state !== 'few') : rows.filter((c) => c.state === tab);
  const list = sort === 'diff' ? [...picked].sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff) || b.lives - a.lives) : picked;
  const head = (key, label) => (
    <button type="button" className={styles.sortBtn + (sort === key ? ' ' + styles.sortOn : '')} onClick={() => setSort(key)}
      title={key === 'lives' ? '인생 많은 순으로' : '차이 큰 순으로'}>
      {label}{sort === key && <i aria-hidden="true">▼</i>}
    </button>
  );
  const shown = all ? list : list.slice(0, SHOW);
  const tabs = [['all', '전체', rows.length - count.few], ...['bad', 'warn', 'ok', 'few'].map((k) => [k, STATE[k].short, count[k]])];

  return (
    <>
      <div className={styles.tabs} role="tablist">
        {tabs.map(([k, name, n]) => (
          <button key={k} type="button" role="tab" aria-selected={tab === k} disabled={!n}
            className={styles['tab_' + k]} onClick={() => { setTab(k); setAll(false); }}>
            {k !== 'all' && <i />}{name}<b>{n}</b>
          </button>
        ))}
        <span className={styles.tabNote}>{tab === 'all' ? `표본 적은 나라(${FEW}명 미만)는 빼고` : STATE[tab].desc}</span>
      </div>

      {list.length === 0 ? <p className={styles.empty}>해당하는 나라가 없어요.</p> : (
        <div className={styles.tbl} role="table">
          <div className={styles.tHead} role="row">
            <span>나라</span>
            <span className={styles.r}>{head('lives', '인생')}</span>
            <span className={styles.r}>게임</span>
            <span className={styles.r}>실제</span>
            <span className={styles.axis}><i>← 게임이 짧음</i><i>0</i><i>게임이 긺 →</i></span>
            <span className={styles.r}>{head('diff', '차이')}</span>
          </div>
          {shown.map((c) => {
            const w = Math.min(1, Math.abs(c.diff) / SPAN) * 50;
            return (
              <div key={c.countryCode} role="row" className={styles.tRow + ' ' + styles['row_' + c.state]}
                {...hov(
                  <TipBody
                    title={<><Flag cc={c.countryCode} /> {c.countryName}</>}
                    sub={STATE[c.state].name + ' · ' + STATE[c.state].desc}
                    rows={[
                      ['끝까지 산 인생', `${fmt(c.lives)}명`],
                      ['게임 평균 수명', `${one(c.avgDeathAge)}세`, null, true],
                      ['실제 기대수명', `${one(c.realLifeExpectancy)}세`],
                      ['차이', `${signed(c.diff)}년`, c.state === 'few' ? null : c.state, true],
                    ]}
                    note={`이 인원이면 평균이 ±${round1(20 / Math.sqrt(c.lives))}년쯤 흔들릴 수 있어요`}
                  />,
                )}>
                <span className={styles.cName}><Flag cc={c.countryCode} /><span>{c.countryName}</span></span>
                <span className={styles.r + ' ' + styles.mono}>{fmt(c.lives)}</span>
                <span className={styles.r + ' ' + styles.mono}>{one(c.avgDeathAge)}</span>
                <span className={styles.r + ' ' + styles.mono + ' ' + styles.dim}>{one(c.realLifeExpectancy)}</span>
                <span className={styles.diffTrack}>
                  {/* 정확(±5년) 구간 옅은 초록 · 손볼(±10년) 자리 점선 */}
                  <i className={styles.okZone} style={{ left: 50 - (WARN / SPAN) * 50 + '%', width: (WARN / SPAN) * 100 + '%' }} />
                  {[-BAD, BAD].map((t) => <i key={t} className={styles.badLine} style={{ left: 50 + (t / SPAN) * 50 + '%' }} />)}
                  <i className={styles.zero} />
                  <i className={styles.diffBar} style={c.diff >= 0 ? { left: '50%', width: w + '%' } : { right: '50%', width: w + '%' }} />
                </span>
                <b className={styles.r + ' ' + styles.mono + ' ' + styles.diffNum}>{signed(c.diff)}<small>년</small></b>
              </div>
            );
          })}
        </div>
      )}
      {list.length > SHOW && (
        <button type="button" className={styles.more} onClick={() => setAll((v) => !v)}>
          {all ? '접기' : `${list.length - SHOW}개 더 보기`}
        </button>
      )}
    </>
  );
}

// ───────── 퀘스트별 달성률 ─────────
//   높은 순. 둥근 막대(색 = 판정: 파랑 너무 쉬움 · 청록 적당 · 빨강 너무 어려움) + 기준선 10% · 80% 눈금
//   0% 는 막대 대신 점선 빈 칸, 고른 인생이 적은(FEW_Q명 미만) 퀘스트는 흐리게 (달성률이 우연일 수 있어서)
const FEW_Q = 10;
function QuestList({ quests, hov }) {
  if (!quests.length) return <p className={styles.empty}>등록된 퀘스트가 없어요.</p>;
  const judged = quests.filter((q) => q.picked > 0).sort((a, b) => b.rate - a.rate || b.picked - a.picked);
  const none = quests.filter((q) => !q.picked);
  return (
    <>
      <div className={styles.qScale} aria-hidden="true">
        <span />
        <span className={styles.qScaleBar}>
          <i style={{ left: HARD + '%' }}>{HARD}%</i>
          <i style={{ left: EASY + '%' }}>{EASY}%</i>
        </span>
        <span />
      </div>
      <ul className={styles.qList}>
        {judged.map((q) => {
          const kind = q.rate >= EASY ? 'easy' : q.rate <= HARD ? 'hard' : 'mid';
          const few = q.picked < FEW_Q;
          return (
            <li key={q.questId} className={few ? styles.qFew : ''} {...hov(
              <TipBody
                title={q.questName}
                sub={kind === 'easy' ? `너무 쉬움 (${EASY}% 이상)` : kind === 'hard' ? `너무 어려움 (${HARD}% 이하)` : `적당 (${HARD}~${EASY}%)`}
                rows={[['고른 인생', `${fmt(q.picked)}명`], ['달성', `${fmt(q.achieved)}명`, 'ok'], ['못 이룸', `${fmt(q.picked - q.achieved)}명`], ['달성률', `${q.rate}%`, kind === 'mid' ? null : kind === 'easy' ? 'warn' : 'bad', true]]}
                note={few ? `고른 인생이 ${FEW_Q}명이 안 돼서 우연일 수 있어요` : null}
              />,
            )}>
              <span className={styles.qName}>{q.questName}</span>
              <span className={styles.qTrack}>
                <i className={styles.qTick} style={{ left: HARD + '%' }} />
                <i className={styles.qTick} style={{ left: EASY + '%' }} />
                {q.rate > 0
                  ? <i className={styles.qFill + ' ' + styles['q_' + kind]} style={{ width: `max(${q.rate}%, 10px)` }} />
                  : <i className={styles.qZero} />}
              </span>
              <span className={styles.qVal}>
                <b className={styles['qt_' + kind]}>{q.rate}<small>%</small></b>
                <em>{fmt(q.achieved)}/{fmt(q.picked)}명</em>
              </span>
            </li>
          );
        })}
      </ul>
      <div className={styles.qKey}>
        <span><i className={styles.q_hard} />너무 어려움 {HARD}% 이하</span>
        <span><i className={styles.q_mid} />적당</span>
        <span><i className={styles.q_easy} />너무 쉬움 {EASY}% 이상</span>
        <span>흐린 줄: 고른 인생 {FEW_Q}명 미만</span>
      </div>
      {none.length > 0 && (
        <p className={styles.note}>아직 판정된 인생이 없는 퀘스트 {none.length}개: {none.map((q) => q.questName).join(', ')}</p>
      )}
    </>
  );
}

// ───────── 최근 14일 ─────────
// 하루 합계 (회원 + 비회원)
//   끝까지 삶 · 중간에 나감 · 진행 중은 모두 '그날 시작한 인생' 기준 → 셋을 더하면 하루 합계 (11/26)
const dayTotal = (x) => x.memberStarts + x.guestStarts;
const playingOf = (x) => x.playing ?? Math.max(0, dayTotal(x) - x.ended - x.abandoned); // 예전 서버는 playing 이 없음
const mmdd = (day) => `${+day.slice(5, 7)}/${+day.slice(8, 10)}`;
const WEEK = ['일', '월', '화', '수', '목', '금', '토'];
const weekday = (day) => WEEK[new Date(day + 'T00:00:00').getDay()];

// 숫자 칸 아래 작은 꺾은선 (최근 14일)
function Spark({ values }) {
  if (!values || values.length < 2) return null;
  const W = 120;
  const H = 30;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - 2 - (v / max) * (H - 6)]);
  const line = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const [lx, ly] = pts[pts.length - 1];
  return (
    <svg className={styles.spark} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={`${line} L${W},${H} L0,${H} Z`} className={styles.sparkArea} />
      <path d={line} className={styles.sparkLine} vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="2.6" className={styles.sparkDot} />
    </svg>
  );
}

// 앞 기간보다 얼마나 늘었나 (▲ 12% / ▼ 3명)
function Delta({ now, before, unit = '%' }) {
  if (before == null) return null;
  if (unit === '%' && !before) return <span className={styles.delta}>앞 기간 0</span>;
  const v = unit === '%' ? Math.round(((now - before) / before) * 100) : now - before;
  const tone = v > 0 ? styles.up : v < 0 ? styles.down : '';
  return <span className={styles.delta + ' ' + tone}>{v > 0 ? '▲' : v < 0 ? '▼' : '–'} {Math.abs(v)}{unit}</span>;
}

// 깔끔한 눈금: 최댓값을 1 · 2 · 2.5 · 5 · 10 단위로 4칸쯤 나눔 (3,496 → 0 · 1,000 · 2,000 · 3,000 · 4,000)
function niceTicks(max, want = 4) {
  if (max <= 0) return [0, 1];
  const rough = max / want;
  const mag = 10 ** Math.floor(Math.log10(rough));
  const step = Math.max(1, [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= rough)); // 사람 수라 1 단위보다 잘게 나누지 않음
  const top = Math.ceil(max / step) * step;
  const out = [];
  for (let v = 0; v <= top + step / 2; v += step) out.push(Math.round(v));
  return out;
}
const short = (n) => (n >= 10000 ? round1(n / 10000) + '만' : n >= 1000 ? round1(n / 1000) + '천' : String(n)); // 눈금 글자

// 최근 14일 하루 시작된 인생 (아래 회원 · 위 비회원 쌓은 막대) + 그 가운데 끝까지 산 인생(초록 꺾은선 · 점)
//   막대에 마우스를 올리면 그날 말풍선
function DailyChart({ days, hov }) {
  if (!days?.length) return <p className={styles.empty}>날짜별 기록이 없어요.</p>;
  const max = Math.max(1, ...days.map((x) => Math.max(dayTotal(x), x.ended)));
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const pct = (v) => (v / top) * 100;
  const n = days.length;
  const today = days[n - 1].day;
  const line = days.map((x, i) => `${((i + 0.5) / n) * 100},${100 - pct(x.ended)}`).join(' ');
  return (
    <div className={styles.dChart}>
      <div className={styles.dAxis} aria-hidden="true">
        {ticks.map((t) => <span key={t} style={{ bottom: pct(t) + '%' }}>{short(t)}</span>)}
      </div>
      <div className={styles.dPlot}>
        {ticks.map((t) => <i key={t} className={styles.dGrid + (t === 0 ? ' ' + styles.dBase : '')} style={{ bottom: pct(t) + '%' }} />)}
        <svg className={styles.dLine} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          <polyline points={line} vectorEffect="non-scaling-stroke" />
        </svg>
        {days.map((x, i) => {
          const tot = dayTotal(x);
          const wk = weekday(x.day);
          const prev = i > 0 ? dayTotal(days[i - 1]) : null;
          return (
            <div key={x.day} className={styles.dCol + (x.day === today ? ' ' + styles.dToday : '')}
              {...hov(
                <TipBody
                  title={`${x.day === today ? '오늘 · ' : ''}${mmdd(x.day)} (${wk})`}
                  sub="그날 시작한 인생이 지금 어떻게 됐나"
                  rows={[
                    ['시작된 인생', `${fmt(tot)}명`, null, true],
                    ['  회원', `${fmt(x.memberStarts)}명`],
                    ['  비회원', `${fmt(x.guestStarts)}명`],
                    ['끝까지 삶', `${fmt(x.ended)}명`, 'ok'],
                    ['중간에 나감', `${fmt(x.abandoned)}명`, x.abandoned ? 'bad' : null],
                    ['아직 진행 중', `${fmt(playingOf(x))}명`],
                  ]}
                  note={prev != null ? `전날보다 ${tot === prev ? '같음' : `${tot > prev ? '▲' : '▼'} ${fmt(Math.abs(tot - prev))}명`}` : null}
                />,
              )}>
              <div className={styles.dBar}>
                {tot > 0 && <b className={styles.dNum} style={{ bottom: `calc(${pct(Math.max(tot, x.ended))}% + ${x.ended > tot * 0.8 ? 14 : 4}px)` }}>{short(tot)}</b>} {/* 초록 점과 안 겹치게 */}
                {/* 아래 회원 · 위 비회원 (회원이 적어도 막대 꼭대기에 빨간 줄처럼 보이지 않게) */}
                <i className={styles.dMember + (x.guestStarts ? '' : ' ' + styles.dTopSeg)} style={{ height: pct(x.memberStarts) + '%' }} />
                <i className={styles.dGuest + ' ' + styles.dTopSeg} style={{ height: pct(x.guestStarts) + '%' }} />
                <i className={styles.dEnded} style={{ bottom: pct(x.ended) + '%' }} />
              </div>
              <span className={styles.dLabel + (wk === '일' || wk === '토' ? ' ' + styles.dWeekend : '')}>
                {x.day === today ? '오늘' : mmdd(x.day)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ───────── 사망 원인 · 수명 분포 ─────────
// 사망 원인: 많은 순, 비율 막대 + 평균 수명
function CauseList({ causes, hov }) {
  if (!causes?.length) return <p className={styles.empty}>아직 끝까지 산 인생이 없어요.</p>;
  const total = causes.reduce((s, c) => s + c.lives, 0);
  const max = Math.max(...causes.map((c) => c.lives));
  const top = causes.slice(0, 8);
  const rest = causes.slice(8).reduce((s, c) => s + c.lives, 0);
  return (
    <>
      <ul className={styles.cList}>
        {top.map((c) => (
          <li key={c.cause} {...hov(
            <TipBody
              title={c.cause}
              rows={[['떠난 인생', `${fmt(c.lives)}명`, null, true], ['전체 가운데', `${round1((c.lives * 100) / total)}%`], ['평균 수명', `${one(c.avgAge)}세`]]}
            />,
          )}>
            <span className={styles.cCause}>{c.cause}</span>
            <span className={styles.cTrack}><i style={{ width: (c.lives / max) * 100 + '%' }} /></span>
            <b className={styles.mono}>{round1((c.lives * 100) / total)}%</b>
            <small className={styles.mono}>{one(c.avgAge)}세</small>
          </li>
        ))}
      </ul>
      <p className={styles.note}>
        끝까지 산 인생 {fmt(total)}명 기준 · 오른쪽 끝 = 평균 수명{rest > 0 && ` · 그 밖의 원인 ${fmt(rest)}명`}
      </p>
    </>
  );
}

// 수명 분포: 10년 단위 기둥 + 아래에 평균 수명 알약 2개
//   기둥 이름은 기둥 가운데 '0대 · 10대 … 100+'
//   알약(실제 기대수명 파랑 · 게임 평균 주황)은 바닥선 위 점에서 곧게 내려온 선 끝에 달림
//   점 = 그 나이가 들어 있는 기둥 안의 정확한 자리 (63.7세 → 60대 기둥의 37% 자리)
//   두 개면 한 줄에: 어린 쪽 알약은 자기 선의 왼쪽으로, 많은 쪽 알약은 오른쪽으로 펼침 → 선과 알약이 서로 안 겹치고 안 가림
//   하나뿐이면 선 아래 가운데
//   기둥에 마우스를 올리면 그 나이대 말풍선 (몇 명 · 몇 % · 이 나이 전에 떠난 비율)
const H_GAP = 6; // 기둥 사이 간격(px) - CSS .hist gap 과 같게
const H_N = 11; // 기둥 수 (0대 ~ 100세 이상)
const colW = `((100% - ${H_GAP * (H_N - 1)}px) / ${H_N})`; // 기둥 하나 너비 (CSS calc 글자)
// 나이 → 가로 위치 (기둥 · 간격을 그대로 따라감, 100세 이상 칸은 100~110세로 셈)
const ageX = (age) => {
  const a = Math.max(0, Math.min(109.9, age));
  const k = Math.floor(a / 10);
  const f = (a - k * 10) / 10;
  return `calc(${k} * (${colW} + ${H_GAP}px) + ${f} * ${colW})`;
};

function AgeHist({ ages, gameAge, realAge, hov }) {
  if (!ages?.length) return <p className={styles.empty}>아직 끝까지 산 인생이 없어요.</p>;
  const by = {};
  ages.forEach((a) => { by[a.fromAge] = a.lives; });
  const cols = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((a) => ({ a, n: by[a] || 0 }));
  const total = cols.reduce((s, c) => s + c.n, 0);
  const max = Math.max(1, ...cols.map((c) => c.n)) * 1.16; // 위에 % 글자 자리
  const peak = cols.reduce((p, c) => (c.n > p.n ? c : p), cols[0]);
  const kids = cols[0].n + cols[1].n; // 20세 전에 떠난 인생
  const marks = [
    realAge != null && { key: 'real', age: realAge, cls: styles.mReal, text: '실제 기대수명' },
    gameAge != null && { key: 'game', age: gameAge, cls: styles.mGame, text: '게임 평균' },
  ].filter(Boolean).sort((x, y) => x.age - y.age); // 어린 쪽 → 많은 쪽
  let cum = 0;
  return (
    <>
      <div className={styles.hWrap}>
        <div className={styles.hist}>
          {cols.map((c) => {
            cum += c.n;
            const share = total ? round1((c.n * 100) / total) : 0;
            const before = total ? round1(((cum - c.n) * 100) / total) : 0;
            return (
              <div key={c.a} className={styles.hCol + (c === peak ? ' ' + styles.hPeak : '') + (c.a < 20 ? ' ' + styles.hKid : '')}
                {...hov(
                  <TipBody
                    title={c.a === 100 ? '100세 이상' : `${c.a}~${c.a + 9}세에 떠남`}
                    rows={[['인생', `${fmt(c.n)}명`, null, true], ['전체 가운데', `${share}%`], ['이 나이 전에 떠남', `${before}%`]]}
                    note={c === peak ? '가장 많이 떠난 나이대' : null}
                  />,
                )}>
                <span className={styles.hBarBox}>
                  <i style={{ height: (c.n / max) * 100 + '%' }}>{c.n > 0 && <b>{Math.round(share)}%</b>}</i>
                </span>
              </div>
            );
          })}
        </div>
        {/* 기둥 이름 (기둥 가운데) */}
        <div className={styles.hAxis} aria-hidden="true">
          {cols.map((c) => <small key={c.a}><span>{c.a === 100 ? '100+' : `${c.a}대`}</span></small>)}
        </div>
        {/* 평균 수명 알약 (점 = 정확한 나이 자리) */}
        {marks.length > 0 && (
          <div className={styles.hPills} aria-label={marks.map((m) => `${m.text} ${one(m.age)}세`).join(', ')}>
            {marks.map((m, i) => {
              const side = marks.length === 1 ? '' : i === 0 ? styles.pinToLeft : styles.pinToRight;
              return (
                <span key={m.key} className={styles.hPin + ' ' + m.cls} style={{ left: ageX(m.age) }}>
                  <em className={side}>{m.text} <b>{one(m.age)}세</b></em>
                </span>
              );
            })}
          </div>
        )}
      </div>
      <p className={styles.note}>
        가장 많이 떠난 나이 {peak.a === 100 ? '100세 이상' : `${peak.a}대`} · 20세 전에 떠난 인생 <b className={kids / Math.max(1, total) >= 0.15 ? styles.t_warn : ''}>{total ? round1((kids * 100) / total) : 0}%</b>
      </p>
    </>
  );
}

// ───────── 최근 끝난 인생 ─────────
// 끝난 시각 'MM-DD HH:MI' → 오늘이면 '16:00', 어제면 '어제 16:00', 그 전이면 '11/24'
const mdOf = (date) => `${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
function whenOf(t) {
  if (!t) return '';
  const now = new Date();
  const yest = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (t.startsWith(mdOf(now))) return t.slice(6);
  if (t.startsWith(mdOf(yest))) return '어제 ' + t.slice(6);
  return `${+t.slice(0, 2)}/${+t.slice(3, 5)}`;
}

function RecentList({ list, hov }) {
  if (!list?.length) return <p className={styles.empty}>아직 끝난 인생이 없어요.</p>;
  return (
    <ul className={styles.rList}>
      {list.map((x) => (
        <li key={x.lifeId} {...hov(
          <TipBody
            title={<><Flag cc={x.countryCode} /> {x.name}</>}
            sub={`${x.countryName || ''}${x.startType === 'GUEST' ? ' · 비회원' : ' · 회원'} · 인생 #${x.lifeId}`}
            rows={[
              ['살았던 해', x.birthYear ? `${x.birthYear} – ${x.birthYear + (x.deathAge || 0)}` : '-'],
              ['수명', `${x.deathAge}세`, null, true],
              ['사망 원인', x.deathCause || '-'],
              ['끝난 시각', x.endedAt || '-'],
            ]}
          />,
        )}>
          <Flag cc={x.countryCode} />
          <span className={styles.rWho}>
            <b>{x.name}</b>
            <small>{x.countryName}{x.birthYear ? ` · ${x.birthYear}년생` : ''}{x.startType === 'GUEST' ? ' · 비회원' : ''}</small>
          </span>
          <span className={styles.rAge}><span><b className={styles.mono}>{x.deathAge}</b>세</span><small>{x.deathCause || ''}</small></span>
          <span className={styles.rWhen}>{whenOf(x.endedAt)}</span>
        </li>
      ))}
    </ul>
  );
}

// ───────── 화면 ─────────
// (값은 d 로만 받음 → 테스트 화면에서도 그대로 씀)
export function Dashboard({ d, loadedAt, onReload, loading }) {
  const s = useMemo(() => summarize(d), [d]);
  const lifeGap = s.gameAge != null && s.realAge != null ? round1(s.gameAge - s.realAge) : null;
  const lifeTone = lifeGap == null ? null : Math.abs(lifeGap) >= BAD ? 'bad' : Math.abs(lifeGap) >= WARN ? 'warn' : 'ok';
  const [tab, setTab] = useState('all'); // 나라 표 탭
  const days = d.daily || []; // 최근 14일 (예전 서버면 빈 목록 → 날짜 칸은 안내만)
  const week = days.slice(-7).reduce((n, x) => n + dayTotal(x), 0);
  const prevWeek = days.slice(-14, -7).reduce((n, x) => n + dayTotal(x), 0);
  const startSum = days.reduce((n, x) => n + dayTotal(x), 0);
  const memberShare = startSum ? Math.round((days.reduce((n, x) => n + x.memberStarts, 0) * 100) / startSum) : 0;
  const [flash, setFlash] = useState(''); // 방금 이동한 구역 (잠깐 테두리 강조)
  const [tip, setTip] = useState(null); // 말풍선 { x, y, c }

  // 그래프 칸에 붙이는 마우스 이벤트 (올리면 말풍선, 움직이면 따라옴, 나가면 닫힘)
  const hov = useCallback((c) => ({
    onPointerEnter: (e) => setTip({ x: e.clientX, y: e.clientY, c }),
    onPointerMove: (e) => setTip({ x: e.clientX, y: e.clientY, c }),
    onPointerLeave: () => setTip(null),
  }), []);

  // 화면을 굴리면 말풍선 닫기
  useEffect(() => {
    if (!tip) return undefined;
    const off = () => setTip(null);
    window.addEventListener('scroll', off, { passive: true });
    return () => window.removeEventListener('scroll', off);
  }, [tip]);

  // '확인할 것' 한 줄 누름 → (나라면 그 탭으로 바꾸고) 그 구역으로 이동해서 잠깐 강조
  //   큰 구역은 위쪽 맞춤(머리글에 안 가리게 scroll-margin), 숫자 칸은 화면 가운데로
  const go = (id, t) => {
    if (t) setTab(t);
    setFlash('');
    window.setTimeout(() => { // 탭이 바뀐 뒤 위치로 (강조도 다시 켜야 애니메이션이 또 돎)
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: id.startsWith('kpi-') ? 'center' : 'start' });
      setFlash(id);
    }, 30);
    window.setTimeout(() => setFlash(''), 1800);
  };

  return (
    <div className={'page ' + styles.wrap}>
      {/* 메뉴 줄 */}
      <div className={styles.top}>
        <AdminNav />
        <div className={styles.stamp}>
          {loadedAt && <span>{loadedAt} 기준</span>}
          <Button size="sm" pill onClick={onReload} disabled={loading}>{loading ? '불러오는 중…' : '↻ 새로고침'}</Button>
        </div>
      </div>

      {/* 숫자 4칸 */}
      <div className={styles.nums}>
        <Num label="오늘 시작된 인생" value={fmt(d.todayPlays)} unit="명"
          sub={days.length > 1 ? <>어제 {fmt(dayTotal(days[days.length - 2]))}명 <Delta now={d.todayPlays} before={dayTotal(days[days.length - 2])} unit="명" /></> : `누적 ${fmt(d.totalPlays)}명`}
          spark={days.map(dayTotal)} />
        <Num label="최근 7일 시작" value={days.length ? fmt(week) : null} unit="명"
          sub={days.length >= 14 ? <>그 전 7일 {fmt(prevWeek)}명 <Delta now={week} before={prevWeek} /></> : `누적 ${fmt(d.totalPlays)}명`}
        />
        <Num id="kpi-done" flash={flash} label="끝까지 산 비율" value={s.doneRate} unit="%" sub={(d.completion || []).length ? null : '아직 끝난 인생 없음'}>
          {/* 회원 · 비회원 완료율 작은 막대 (진행 중은 빼고 셈) */}
          <div className={styles.miniRows}>
            {(d.completion || []).map((x) => (
              <span key={x.startType} className={(x.ended + x.abandoned === 0 ? styles.miniNone + ' ' : '') + (x.ended + x.abandoned && x.abandonedRate >= QUIT ? styles.t_warn : '')}
                {...hov(
                  <TipBody
                    title={`${TYPE_NAME[x.startType] || x.startType} 인생`}
                    rows={[['전체', `${fmt(x.total)}명`, null, true], ['끝까지 삶', `${fmt(x.ended)}명`, 'ok'], ['중간에 나감', `${fmt(x.abandoned)}명`, 'bad'], ['진행 중', `${fmt(x.playing)}명`], ['완료율', `${x.endedRate}%`, null, true]]}
                    note="완료율은 진행 중을 빼고 셈"
                  />,
                )}>
                <em>{TYPE_NAME[x.startType] || x.startType}</em>
                <i>{x.ended + x.abandoned > 0 && <s style={{ width: x.endedRate + '%' }} />}</i>
                <b className={styles.mono}>{x.ended + x.abandoned > 0 ? `${Math.round(x.endedRate)}%` : '-'}</b>
              </span>
            ))}
          </div>
        </Num>
        <Num
          label="게임 평균 수명" value={s.gameAge} unit="세" tone={lifeTone}
          sub={lifeGap == null ? `인생 ${FEW}명 넘는 나라가 아직 없어요` : `실제 기대수명 ${one(s.realAge)}세 · ${lifeGap === 0 ? '같음' : `${Math.abs(lifeGap)}년 ${lifeGap > 0 ? '김' : '짧음'}`}`}
        >
          {/* 게임(막대)과 실제(세로 눈금) 비교 */}
          {lifeGap != null && (
            <span className={styles.lifeBar} aria-hidden="true">
              <i style={{ width: Math.min(100, (s.gameAge / 100) * 100) + '%' }} />
              <s style={{ left: Math.min(100, (s.realAge / 100) * 100) + '%' }} />
            </span>
          )}
        </Num>
      </div>

      {/* 확인할 것 */}
      <Todo list={s.todo} onGo={go} />

      {/* 최근 14일 */}
      <Section
        title="최근 14일"
        desc="하루에 시작된 인생 (막대) · 그 가운데 끝까지 산 인생 (초록 선) · 한국 날짜 기준 · 막대에 마우스를 올리면 자세히"
        right={(
          <div className={styles.legendRow}>
            <span><i className={styles.kMember} />회원</span>
            <span><i className={styles.kGuest} />비회원</span>
            <span><i className={styles.kEnded} />끝까지 삶</span>
          </div>
        )}
      >
        <DailyChart days={days} hov={hov} />
        {days.length > 0 && (
          <div className={styles.dSum}>
            <span>14일 합계 <b className={styles.mono}>{fmt(days.reduce((n, x) => n + dayTotal(x), 0))}</b>명</span>
            <span>하루 평균 <b className={styles.mono}>{one(days.reduce((n, x) => n + dayTotal(x), 0) / days.length)}</b>명</span>
            <span>회원 비율 <b className={styles.mono}>{memberShare}</b>%</span>
            <span>중간에 나감 <b className={styles.mono}>{fmt(days.reduce((n, x) => n + x.abandoned, 0))}</b>명</span>
          </div>
        )}
      </Section>

      {/* 나라별 수명 검증 */}
      <Section
        id="sec-country" flash={flash}
        title="나라별 수명 검증"
        desc="게임 속 평균 수명(끝까지 산 인생)과 그 인생들이 태어난 연대의 실제 기대수명 비교. 차이가 크면 사망 확률(C07)을 손봐요."
      >
        <CountryTable rows={s.countries} count={s.count} tab={tab} setTab={setTab} hov={hov} />
      </Section>

      {/* 사망 원인 | 수명 분포 */}
      <div className={styles.grid2}>
        <Section title="사망 원인" desc="끝까지 산 인생이 어떤 원인으로 떠났나 (C07)">
          <CauseList causes={d.causes} hov={hov} />
        </Section>
        <Section title="수명 분포" desc="몇 살에 떠났나 (10년 단위, 끝까지 산 인생)">
          <AgeHist ages={d.ages} gameAge={s.gameAge} realAge={s.realAge} hov={hov} />
        </Section>
      </div>

      {/* 퀘스트 | 최근 끝난 인생 */}
      <div className={styles.grid2}>
        <Section id="sec-quest" flash={flash} title="퀘스트별 달성률" desc="고른 인생 가운데 달성한 비율 (판정이 끝난 것만)">
          <QuestList quests={d.quests || []} hov={hov} />
        </Section>
        <Section title="최근 끝난 인생" desc="방금 세상을 떠난 게임 속 인물들">
          <RecentList list={d.recent} hov={hov} />
        </Section>
      </div>

      <Tip tip={tip} />
    </div>
  );
}

// 불러오는 동안 자리 (숫자 4칸 + 큰 카드 모양)
function Skeleton() {
  return (
    <div className={styles.skel} aria-label="통계를 모으는 중">
      <div className={styles.nums}>{[0, 1, 2, 3].map((i) => <div key={i} className={styles.num}><i /><b /><i /></div>)}</div>
      <div className={styles.card}><i /><b /><b /><b /></div>
    </div>
  );
}

function AdminMain() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadedAt, setLoadedAt] = useState('');

  // 값 받아오기 (state 는 응답이 온 뒤에만 바꿈)
  const fetchData = useCallback(() => {
    client.get('/api/admin/dashboard')
      .then((res) => {
        setD(res.data);
        setError('');
        setLoadedAt(new Date().toLocaleString('ko-KR', { month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }));
      })
      .catch((err) => setError(errMsg(err, '통계를 불러오지 못했어요.')))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  const reload = () => { setLoading(true); fetchData(); };

  return (
    <div className={'sky ' + styles.page}>
      {d ? <Dashboard d={d} loadedAt={loadedAt} onReload={reload} loading={loading} /> : (
        <div className={'page ' + styles.wrap}>
          <div className={styles.top}><AdminNav /></div>
          {error ? (
            <div className={styles.card}>
              <p className={styles.empty}>{error}</p>
              <Button pill onClick={reload}>다시 시도</Button>
            </div>
          ) : <Skeleton />}
        </div>
      )}
    </div>
  );
}

export default AdminMain;
