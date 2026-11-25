// A04 관리자 대시보드 (주소: /admin, 관리자만) - 11/25 다시 그림 (가독성 위주)
// GET /api/admin/dashboard → 플레이 수, 완료율, 퀘스트 달성률, 특성 레벨 분포, 나라별 수명 비교
// 관리자 확인은 서버가 DB 권한(MEMBER_ROLE)으로 다시 함 (localStorage 값만 믿지 않음)
// 화면: 메뉴 줄(기준 시각 · 새로고침) → 숫자 4칸 → 나라별 수명 검증(차이 큰 순 표) → [퀘스트 달성률 | 완료율 · 특성 레벨]
// 그래프는 설치 없이 직접 그림 (막대 = HTML, 도넛 = SVG)
import { useCallback, useEffect, useMemo, useState } from 'react';
import client from '../../api/api';
import Button from '../../common/ui/Button';
import { COUNTRIES } from '../../engine/village/villageData';
import { errMsg } from './adminUtil';
import AdminNav from './AdminNav';
import styles from './AdminMain.module.css';

const TYPE_NAME = { MEMBER: '회원', GUEST: '비회원' };
const EASY = 80; // 달성률이 이보다 높으면 너무 쉬운 퀘스트
const HARD = 10; // 이보다 낮으면 너무 어려운 퀘스트
const GAP = 10; // 게임 수명이 실제 기대수명과 이만큼(년) 넘게 다르면 손볼 나라
const FEW = 10; // 끝까지 산 인생이 이보다 적으면 평균을 믿기 어려움 (흐리게)
const SPAN = 20; // 차이 막대 끝 = ±20년
const SHOW = 10; // 나라 표 처음에 보이는 줄 수

const round1 = (n) => Math.round(n * 10) / 10;
const fmt = (n) => (n == null ? '-' : n.toLocaleString());

function Flag({ cc }) {
  const code = COUNTRIES[cc]?.[0];
  return code ? <img className={styles.flag} src={`https://flagcdn.com/w40/${code}.png`} alt="" width={20} height={13} /> : <span className={styles.flag} />;
}

// 서버 값 → 화면에 쓸 값
function summarize(d) {
  const comp = d.completion || [];
  const ended = comp.reduce((s, c) => s + c.ended, 0);
  const abandoned = comp.reduce((s, c) => s + c.abandoned, 0);
  const playing = comp.reduce((s, c) => s + c.playing, 0);
  const doneRate = ended + abandoned ? round1((ended * 100) / (ended + abandoned)) : null;

  // 나라: 끝까지 산 인생이 있고 실제 기대수명도 있는 나라만, 차이 큰 순
  const countries = (d.countries || [])
    .filter((c) => c.lives > 0 && c.realLifeExpectancy != null)
    .map((c) => ({ ...c, diff: round1(c.avgDeathAge - c.realLifeExpectancy) }))
    .sort((a, b) => (a.lives < FEW) - (b.lives < FEW) || Math.abs(b.diff) - Math.abs(a.diff));
  const sure = countries.filter((c) => c.lives >= FEW);
  const off = sure.filter((c) => Math.abs(c.diff) >= GAP).length;
  const lives = countries.reduce((s, c) => s + c.lives, 0);
  const gameAge = lives ? round1(countries.reduce((s, c) => s + c.avgDeathAge * c.lives, 0) / lives) : null;
  const realAge = lives ? round1(countries.reduce((s, c) => s + c.realLifeExpectancy * c.lives, 0) / lives) : null;

  const judged = (d.quests || []).filter((q) => q.picked > 0);
  const questAvg = judged.length ? round1(judged.reduce((s, q) => s + q.rate, 0) / judged.length) : null;

  return { ended, abandoned, playing, doneRate, countries, off, gameAge, realAge, judged, questAvg };
}

// 숫자 한 칸
function Num({ label, value, unit, sub, tone }) {
  return (
    <div className={styles.num}>
      <span className={styles.numLabel}>{label}</span>
      <b className={styles.numVal}>{value ?? '-'}{value != null && unit && <small>{unit}</small>}</b>
      {sub && <span className={styles.numSub + (tone ? ' ' + styles[tone] : '')}>{sub}</span>}
    </div>
  );
}

// 구역 (제목 + 한 줄 설명)
function Section({ title, desc, right, children }) {
  return (
    <section className={styles.card}>
      <div className={styles.cardHead}>
        <div>
          <h2>{title}</h2>
          {desc && <p>{desc}</p>}
        </div>
        {right}
      </div>
      {children}
    </section>
  );
}

// 나라별 수명 검증: 한 나라 한 줄, 차이는 가운데(0)에서 왼쪽(짧음) · 오른쪽(긺)으로 뻗는 막대
function CountryTable({ rows }) {
  const [all, setAll] = useState(false);
  if (!rows.length) return <p className={styles.empty}>아직 끝까지 산 인생이 없어요.</p>;
  const shown = all ? rows : rows.slice(0, SHOW);
  return (
    <>
      <div className={styles.tbl} role="table">
        <div className={styles.tHead} role="row">
          <span>나라</span>
          <span className={styles.r}>인생</span>
          <span className={styles.r}>게임</span>
          <span className={styles.r}>실제</span>
          <span className={styles.c}>
            <span className={styles.axis}><i>−{SPAN}년</i><i>0</i><i>+{SPAN}년</i></span>
          </span>
        </div>
        {shown.map((c) => {
          const w = Math.min(1, Math.abs(c.diff) / SPAN) * 50;
          const bad = Math.abs(c.diff) >= GAP;
          return (
            <div key={c.countryCode} role="row" className={styles.tRow + (c.lives < FEW ? ' ' + styles.few : '')}>
              <span className={styles.cName}><Flag cc={c.countryCode} />{c.countryName}</span>
              <span className={styles.r}>{fmt(c.lives)}{c.lives < FEW && <small className={styles.tag}>적음</small>}</span>
              <span className={styles.r + ' ' + styles.mono}>{c.avgDeathAge}</span>
              <span className={styles.r + ' ' + styles.mono + ' ' + styles.dim}>{c.realLifeExpectancy}</span>
              <span className={styles.c}>
                <span className={styles.diffTrack}>
                  <i className={styles.zero} />
                  <i
                    className={styles.diffBar + ' ' + (bad ? styles.bad : styles.ok)}
                    style={c.diff >= 0 ? { left: '50%', width: w + '%' } : { right: '50%', width: w + '%' }}
                  />
                </span>
                <b className={styles.diffNum + ' ' + (bad ? styles.badTxt : '')}>{c.diff > 0 ? '+' : ''}{c.diff}년</b>
              </span>
            </div>
          );
        })}
      </div>
      {rows.length > SHOW && (
        <button type="button" className={styles.more} onClick={() => setAll((v) => !v)}>
          {all ? '접기' : `나머지 ${rows.length - SHOW}개 나라 더 보기`}
        </button>
      )}
    </>
  );
}

// 퀘스트별 달성률: 높은 순, 너무 쉬움 · 너무 어려움은 이름 옆 표시
function QuestList({ quests }) {
  if (!quests.length) return <p className={styles.empty}>등록된 퀘스트가 없어요.</p>;
  const rows = [...quests].sort((a, b) => (b.picked > 0) - (a.picked > 0) || b.rate - a.rate);
  return (
    <ul className={styles.qList}>
      {rows.map((q) => {
        const kind = !q.picked ? 'none' : q.rate >= EASY ? 'easy' : q.rate <= HARD ? 'hard' : '';
        return (
          <li key={q.questId} className={kind === 'none' ? styles.few : ''}>
            <div className={styles.qTop}>
              <span className={styles.qName}>
                {q.questName}
                {kind === 'easy' && <small className={styles.tagBlue}>너무 쉬움</small>}
                {kind === 'hard' && <small className={styles.tagRed}>너무 어려움</small>}
              </span>
              <span className={styles.qVal}>
                {q.picked ? <><b>{q.rate}%</b><small>{q.achieved}/{q.picked}</small></> : <small>판정 없음</small>}
              </span>
            </div>
            <span className={styles.qTrack}>
              <i className={styles[kind || 'mid']} style={{ width: (q.picked ? q.rate : 0) + '%' }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

// 완료율 도넛 (SVG 원 테두리를 비율만큼 나눠 칠함)
function Donut({ row }) {
  const all = row.ended + row.abandoned + row.playing || 1;
  const R = 34;
  const L = 2 * Math.PI * R;
  let at = 0;
  const parts = [[row.ended, 'var(--green)'], [row.abandoned, 'var(--red)'], [row.playing, 'var(--line-strong)']];
  return (
    <div className={styles.donut}>
      <div className={styles.donutChart}>
        <svg viewBox="0 0 84 84" width="84" height="84" aria-hidden="true">
          <circle cx="42" cy="42" r={R} fill="none" stroke="var(--panel-2)" strokeWidth="9" />
          {parts.map(([n, col], i) => {
            const len = (n / all) * L;
            const el = <circle key={i} cx="42" cy="42" r={R} fill="none" stroke={col} strokeWidth="9" strokeDasharray={`${len} ${L - len}`} strokeDashoffset={-at} transform="rotate(-90 42 42)" />;
            at += len;
            return el;
          })}
        </svg>
        <b className={styles.donutMid}>{row.ended + row.abandoned ? Math.round(row.endedRate) + '%' : '-'}</b>
      </div>
      <div className={styles.donutText}>
        <b>{TYPE_NAME[row.startType] || row.startType} <small>{fmt(row.total)}명</small></b>
        <span><i style={{ background: 'var(--green)' }} />끝까지 삶 {fmt(row.ended)}</span>
        <span><i style={{ background: 'var(--red)' }} />중간에 나감 {fmt(row.abandoned)}</span>
        <span><i style={{ background: 'var(--line-strong)' }} />진행 중 {fmt(row.playing)}</span>
      </div>
    </div>
  );
}

// 특성 레벨 분포: 특성마다 평균 레벨 + Lv1~5 비율 막대
const LV_COLOR = ['var(--line-strong)', 'var(--blue-line)', 'var(--blue)', 'var(--primary-line)', 'var(--primary)'];
function TraitList({ traits }) {
  if (!traits.length) return <p className={styles.empty}>특성이 없어요.</p>;
  return (
    <>
      <ul className={styles.tList}>
        {traits.map((t) => {
          const tot = t.lv1 + t.lv2 + t.lv3 + t.lv4 + t.lv5;
          return (
            <li key={t.traitId}>
              <span className={styles.tName}>{t.traitName}</span>
              <span className={styles.stack} title={[1, 2, 3, 4, 5].map((lv) => `Lv${lv} ${t['lv' + lv]}명`).join(' · ')}>
                {tot > 0 && [1, 2, 3, 4, 5].map((lv) => t['lv' + lv] > 0 && (
                  <i key={lv} style={{ width: (t['lv' + lv] / tot) * 100 + '%', background: LV_COLOR[lv - 1] }} />
                ))}
              </span>
              <b className={styles.mono}>Lv.{t.avgLevel}</b>
            </li>
          );
        })}
      </ul>
      <div className={styles.lvKey}>
        {LV_COLOR.map((col, i) => <span key={i}><i style={{ background: col }} />{i + 1}</span>)}
        <small>레벨 (막대 = 회원 비율, 오른쪽 = 평균)</small>
      </div>
    </>
  );
}

// 화면 (값은 d 로만 받음 → 테스트 화면에서도 그대로 씀)
export function Dashboard({ d, loadedAt, onReload, loading }) {
  const s = useMemo(() => summarize(d), [d]);
  const lifeGap = s.gameAge != null && s.realAge != null ? round1(s.gameAge - s.realAge) : null;

  return (
    <div className={styles.wrap}>
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
        <Num label="오늘 시작된 인생" value={fmt(d.todayPlays)} unit="명" sub={`누적 ${fmt(d.totalPlays)}명`} />
        <Num label="끝까지 산 비율" value={s.doneRate} unit="%" sub={`끝까지 ${fmt(s.ended)} · 중간에 나감 ${fmt(s.abandoned)}`} />
        <Num
          label="게임 평균 수명" value={s.gameAge} unit="세"
          sub={lifeGap == null ? '끝까지 산 인생 없음' : `실제 ${s.realAge}세보다 ${Math.abs(lifeGap)}년 ${lifeGap >= 0 ? '김' : '짧음'}`}
          tone={lifeGap != null && Math.abs(lifeGap) >= 5 ? 'badTxt' : null}
        />
        <Num label="퀘스트 평균 달성률" value={s.questAvg} unit="%" sub={`판정된 퀘스트 ${s.judged.length}개`} />
      </div>

      {/* 나라별 수명 검증 */}
      <Section
        title="나라별 수명 검증"
        desc={`게임 평균 수명과 실제 기대수명의 차이예요. ${GAP}년 넘게 차이 나면 빨강 → 사망 확률(C07) 손보기.`}
        right={s.off > 0 ? <span className={styles.alertPill}>손볼 나라 {s.off}개</span> : <span className={styles.okPill}>모두 {GAP}년 안쪽</span>}
      >
        <CountryTable rows={s.countries} />
      </Section>

      {/* 아래 두 단 */}
      <div className={styles.grid}>
        <Section title="퀘스트별 달성률" desc={`${EASY}% 이상은 너무 쉬움, ${HARD}% 이하는 너무 어려움`}>
          <QuestList quests={d.quests || []} />
        </Section>
        <div className={styles.side}>
          <Section title="인생 완료율" desc="끝까지 산 ÷ (끝까지 산 + 중간에 나감)">
            {(d.completion || []).length
              ? <div className={styles.donuts}>{d.completion.map((row) => <Donut key={row.startType} row={row} />)}</div>
              : <p className={styles.empty}>아직 플레이된 인생이 없어요.</p>}
          </Section>
          <Section title="특성 레벨 분포" desc="탈퇴하지 않은 회원">
            <TraitList traits={d.traits || []} />
          </Section>
        </div>
      </div>
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
        <div className={styles.wrap}>
          <AdminNav />
          {error ? (
            <div className={styles.card}>
              <p className={styles.empty}>{error}</p>
              <Button pill onClick={reload}>다시 시도</Button>
            </div>
          ) : <p className={styles.empty}>통계를 모으는 중…</p>}
        </div>
      )}
    </div>
  );
}

export default AdminMain;
