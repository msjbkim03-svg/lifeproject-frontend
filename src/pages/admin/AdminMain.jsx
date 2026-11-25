// A04 관리자 대시보드 (주소: /admin, 관리자만) - 11/25 인생 기록 화면처럼 다시 그림
// GET /api/admin/dashboard → 플레이 수, 완료율, 퀘스트 달성률, 특성 레벨 분포, 나라별 수명 비교
// 관리자 확인은 서버가 DB 권한(MEMBER_ROLE)으로 다시 함 (localStorage 값만 믿지 않음)
// 그래프: Chart.js (npm i chart.js react-chartjs-2)
//   머리 → 숫자 4칸 → [왼쪽] 나라별 수명 검증 · 퀘스트 달성률 / [오른쪽] 인생 완료율 · 특성 레벨 분포
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import client from '../../api/api';
import Panel from '../../common/ui/Panel';
import Button from '../../common/ui/Button';
import { useTheme } from '../../common/theme';
import { errMsg } from './adminUtil';
import AdminNav from './AdminNav';
import styles from './AdminMain.module.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const TYPE_NAME = { MEMBER: '회원', GUEST: '비회원' };
const EASY = 80; // 달성률이 이보다 높으면 너무 쉬운 퀘스트
const HARD = 10; // 이보다 낮으면 너무 어려운 퀘스트
const GAP = 10; // 게임 수명이 실제 기대수명과 이만큼(년) 넘게 다르면 사망 확률 손볼 나라

// CSS 변수 값 읽기 (Chart.js 는 var(--이름)을 못 써서 테마가 바뀔 때마다 다시 읽음)
function palette() {
  const s = getComputedStyle(document.documentElement);
  const v = (n) => s.getPropertyValue(n).trim();
  return {
    ink: v('--ink'), sub: v('--ink-sub'), light: v('--ink-light'), line: v('--line'), panel2: v('--panel-2'),
    primary: v('--primary'), blue: v('--blue'), teal: v('--teal'), green: v('--green'), red: v('--red'), yellow: v('--yellow'), death: v('--death'),
    font: getComputedStyle(document.body).fontFamily,
  };
}

const round1 = (n) => Math.round(n * 10) / 10;

// 화면에 쓸 값 계산 (서버 값 → 숫자 4칸 · 그래프 재료)
function summarize(d) {
  const comp = d.completion || [];
  const ended = comp.reduce((s, c) => s + c.ended, 0);
  const abandoned = comp.reduce((s, c) => s + c.abandoned, 0);
  const playing = comp.reduce((s, c) => s + c.playing, 0);
  const doneRate = ended + abandoned ? round1((ended * 100) / (ended + abandoned)) : null;

  const lived = (d.countries || []).filter((c) => c.lives > 0);
  const lives = lived.reduce((s, c) => s + c.lives, 0);
  const gameAge = lives ? round1(lived.reduce((s, c) => s + c.avgDeathAge * c.lives, 0) / lives) : null;
  const withReal = lived.filter((c) => c.realLifeExpectancy != null);
  const realLives = withReal.reduce((s, c) => s + c.lives, 0);
  const realAge = realLives ? round1(withReal.reduce((s, c) => s + c.realLifeExpectancy * c.lives, 0) / realLives) : null;
  const off = withReal.map((c) => ({ ...c, diff: round1(c.avgDeathAge - c.realLifeExpectancy) }))
    .filter((c) => Math.abs(c.diff) >= GAP)
    .sort((a, b) => Math.abs(b.diff) - Math.abs(a.diff));

  const judged = (d.quests || []).filter((q) => q.picked > 0);
  const questAvg = judged.length ? round1(judged.reduce((s, q) => s + q.rate, 0) / judged.length) : null;
  const easy = judged.filter((q) => q.rate >= EASY).length;
  const hard = judged.filter((q) => q.rate <= HARD).length;

  return { ended, abandoned, playing, doneRate, lives, gameAge, realAge, off, judged, questAvg, easy, hard };
}

// 숫자 한 칸
function Num({ label, value, unit, children }) {
  return (
    <div className={styles.num}>
      <span className={styles.numLabel}>{label}</span>
      <b className={styles.numVal}>{value ?? '-'}{value != null && unit && <small>{unit}</small>}</b>
      {children}
    </div>
  );
}

// 나라별 게임 평균 수명 vs 실제 기대수명 (가로 막대 두 줄씩)
function CountryChart({ rows, c }) {
  const data = {
    labels: rows.map((r) => r.countryName),
    datasets: [
      { label: '게임 평균 수명', data: rows.map((r) => (r.lives ? r.avgDeathAge : null)), backgroundColor: c.primary, borderRadius: 4, barPercentage: 0.9, categoryPercentage: 0.72 },
      { label: '실제 기대수명', data: rows.map((r) => r.realLifeExpectancy), backgroundColor: c.blue + '99', borderRadius: 4, barPercentage: 0.9, categoryPercentage: 0.72 },
    ],
  };
  const options = {
    indexAxis: 'y',
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          title: (it) => `${rows[it[0].dataIndex].countryName} · 끝까지 산 인생 ${rows[it[0].dataIndex].lives}명`,
          label: (it) => ` ${it.dataset.label} ${it.raw}세`,
          footer: (it) => {
            const r = rows[it[0].dataIndex];
            if (!r.lives || r.realLifeExpectancy == null) return '';
            const g = round1(r.avgDeathAge - r.realLifeExpectancy);
            return g === 0 ? '차이 없음' : `게임이 ${Math.abs(g)}년 ${g > 0 ? '더 김' : '더 짧음'}`;
          },
        },
      },
    },
    scales: {
      x: { min: 0, suggestedMax: 90, grid: { color: c.line }, ticks: { color: c.light, callback: (v) => v + '세' } },
      y: { grid: { display: false }, ticks: { color: c.ink, autoSkip: false } },
    },
  };
  return (
    <div className={styles.chartBox} style={{ height: Math.max(120, rows.length * 34 + 40) }}>
      <Bar data={data} options={options} />
    </div>
  );
}

// 퀘스트별 달성률 (높은 순, 너무 쉬움 · 너무 어려움 색 다르게)
function QuestChart({ quests, c }) {
  const rows = [...quests].sort((a, b) => (b.picked > 0) - (a.picked > 0) || b.rate - a.rate);
  const color = (q) => (q.picked === 0 ? c.death + '66' : q.rate >= EASY ? c.blue : q.rate <= HARD ? c.red : c.teal);
  const data = {
    labels: rows.map((q) => q.questName),
    datasets: [{ data: rows.map((q) => (q.picked ? q.rate : 0)), backgroundColor: rows.map(color), borderRadius: 4, barPercentage: 0.8 }],
  };
  const options = {
    indexAxis: 'y',
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (it) => {
            const q = rows[it.dataIndex];
            return q.picked ? ` 달성 ${q.achieved} / 고른 인생 ${q.picked} · ${q.rate}%` : ' 아직 판정된 인생 없음';
          },
        },
      },
    },
    scales: {
      x: { min: 0, max: 100, grid: { color: c.line }, ticks: { color: c.light, callback: (v) => v + '%' } },
      y: { grid: { display: false }, ticks: { color: c.ink, autoSkip: false } },
    },
  };
  return (
    <div className={styles.chartBox} style={{ height: Math.max(120, rows.length * 28 + 40) }}>
      <Bar data={data} options={options} />
    </div>
  );
}

// 회원 · 비회원 완료율 도넛
function CompletionDonut({ row, c }) {
  const data = {
    labels: ['끝까지 삶', '중간에 나감', '진행 중'],
    datasets: [{ data: [row.ended, row.abandoned, row.playing], backgroundColor: [c.green, c.red, c.death + '88'], borderWidth: 0, cutout: '72%' }],
  };
  const options = {
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (it) => ` ${it.label} ${it.raw}명` } } },
  };
  return (
    <div className={styles.donut}>
      <div className={styles.donutChart}>
        <Doughnut data={data} options={options} />
        <div className={styles.donutMid}>
          <b>{row.ended + row.abandoned ? row.endedRate + '%' : '-'}</b>
          <small>완료율</small>
        </div>
      </div>
      <div className={styles.donutText}>
        <b>{TYPE_NAME[row.startType] || row.startType}</b>
        <span>전체 {row.total.toLocaleString()}명</span>
        <ul className={styles.keys}>
          <li><i style={{ background: c.green }} />끝까지 삶 {row.ended}</li>
          <li><i style={{ background: c.red }} />중간에 나감 {row.abandoned}</li>
          <li><i style={{ background: c.death + '88' }} />진행 중 {row.playing}</li>
        </ul>
      </div>
    </div>
  );
}

// 특성별 레벨 분포 (특성마다 한 줄, Lv1~5 비율로 쌓음)
function TraitChart({ traits, c }) {
  const LV = [c.death + '88', c.blue + '88', c.blue, c.primary + 'bb', c.primary];
  const total = (t) => t.lv1 + t.lv2 + t.lv3 + t.lv4 + t.lv5;
  const data = {
    labels: traits.map((t) => `${t.traitName}  Lv.${t.avgLevel}`),
    datasets: [1, 2, 3, 4, 5].map((lv) => ({
      label: `Lv${lv}`,
      data: traits.map((t) => (total(t) ? round1((t['lv' + lv] * 100) / total(t)) : 0)),
      backgroundColor: LV[lv - 1],
      barPercentage: 0.7,
    })),
  };
  const options = {
    indexAxis: 'y',
    maintainAspectRatio: false,
    animation: { duration: 300 },
    plugins: {
      legend: { position: 'bottom', labels: { color: c.sub, boxWidth: 10, boxHeight: 10, font: { size: 11 } } },
      tooltip: { callbacks: { label: (it) => ` ${it.dataset.label} ${traits[it.dataIndex]['lv' + (it.datasetIndex + 1)]}명 (${it.raw}%)` } },
    },
    scales: {
      x: { stacked: true, min: 0, max: 100, grid: { color: c.line }, ticks: { color: c.light, callback: (v) => v + '%' } },
      y: { stacked: true, grid: { display: false }, ticks: { color: c.ink } },
    },
  };
  return (
    <div className={styles.chartBox} style={{ height: Math.max(140, traits.length * 34 + 70) }}>
      <Bar data={data} options={options} />
    </div>
  );
}

// 화면 (값은 d 로만 받음 → 테스트 화면에서도 그대로 씀)
export function Dashboard({ d, loadedAt, onReload, loading }) {
  const theme = useTheme();
  const c = useMemo(() => { // 테마가 바뀌면 색을 다시 읽음
    const p = palette();
    ChartJS.defaults.font.family = p.font; // 그래프 글꼴도 화면과 같게 (그리기 전에)
    ChartJS.defaults.color = p.sub;
    return p;
  }, [theme]); // eslint-disable-line react-hooks/exhaustive-deps
  const s = useMemo(() => summarize(d), [d]);
  const [allCountries, setAllCountries] = useState(false);
  const countryRows = (d.countries || []).filter((x) => allCountries || x.lives > 0);
  const lifeGap = s.gameAge != null && s.realAge != null ? round1(s.gameAge - s.realAge) : null;

  return (
    <div className={styles.wrap}>
      {/* ① 머리 */}
      <header className={styles.hero}>
        <div className={styles.heroText}>
          <p className={styles.eyebrow}>환승인생 관리자</p>
          <h1 className={styles.title}>운영 대시보드</h1>
          <p className={styles.where}>
            {loadedAt && <span>{loadedAt} 기준</span>}
            <span className={styles.dot}>·</span>
            <span>회원 + 비회원(지워진 비회원 인생 포함)</span>
          </p>
        </div>
        <div className={styles.heroActs}>
          <Button pill onClick={onReload} disabled={loading}>{loading ? '불러오는 중…' : '↻ 새로고침'}</Button>
        </div>
      </header>
      <AdminNav />

      {/* ② 숫자 4칸 */}
      <section className={styles.nums}>
        <Num label="오늘 시작된 인생" value={d.todayPlays.toLocaleString()} unit="명">
          <span className={styles.numSub}>누적 {d.totalPlays.toLocaleString()}명</span>
        </Num>
        <Num label="끝까지 산 비율" value={s.doneRate} unit="%">
          <span className={styles.numSub}>
            {(d.completion || []).map((x) => `${TYPE_NAME[x.startType] || x.startType} ${x.endedRate}%`).join(' · ') || '아직 끝난 인생 없음'}
          </span>
          <span className={styles.numSub}>진행 중 {s.playing.toLocaleString()}명은 빼고 셈</span>
        </Num>
        <Num label="게임 평균 수명" value={s.gameAge} unit="세">
          {lifeGap != null ? (
            <>
              <span className={styles.numSub}>
                실제 기대수명 {s.realAge}세 · <em className={Math.abs(lifeGap) >= 5 ? styles.down : styles.up}>{lifeGap === 0 ? '같음' : `${Math.abs(lifeGap)}년 ${lifeGap > 0 ? '더 김' : '더 짧음'}`}</em>
              </span>
              <span className={styles.lifeBar} aria-hidden="true">
                <i style={{ width: `${Math.min(100, (s.gameAge / Math.max(s.gameAge, s.realAge, 1)) * 100)}%` }} />
                <s style={{ left: `${Math.min(100, (s.realAge / Math.max(s.gameAge, s.realAge, 1)) * 100)}%` }} />
              </span>
            </>
          ) : <span className={styles.numSub}>끝까지 산 인생 {s.lives}명</span>}
        </Num>
        <Num label="퀘스트 평균 달성률" value={s.questAvg} unit="%">
          <span className={styles.numSub}>
            판정된 퀘스트 {s.judged.length}개 · <em className={s.easy ? styles.blueTxt : ''}>너무 쉬움 {s.easy}</em> · <em className={s.hard ? styles.down : ''}>너무 어려움 {s.hard}</em>
          </span>
        </Num>
      </section>

      {/* ③ 두 단 */}
      <div className={styles.grid}>
        <div className={styles.main}>
          <Panel
            title="나라별 수명 검증"
            right={(
              <div className={styles.toggle} role="tablist">
                <button type="button" aria-selected={!allCountries} onClick={() => setAllCountries(false)}>인생 있는 나라</button>
                <button type="button" aria-selected={allCountries} onClick={() => setAllCountries(true)}>전체 나라</button>
              </div>
            )}
          >
            <div className={styles.legend}>
              <span><i style={{ background: c.primary }} />게임 평균 수명 (끝까지 산 인생)</span>
              <span><i style={{ background: c.blue + '99' }} />실제 기대수명 (그 인생들이 태어난 연대)</span>
            </div>
            {countryRows.length ? <CountryChart rows={countryRows} c={c} /> : <p className={styles.empty}>아직 끝까지 산 인생이 없어요.</p>}
            {s.off.length > 0 ? (
              <div className={styles.alert}>
                <b>사망 확률(C07)을 볼 나라</b>
                <ul>
                  {s.off.slice(0, 5).map((x) => (
                    <li key={x.countryCode}>
                      <span>{x.countryName}</span>
                      <em className={x.diff > 0 ? styles.blueTxt : styles.down}>게임이 {Math.abs(x.diff)}년 {x.diff > 0 ? '더 김' : '더 짧음'}</em>
                      <small>{x.lives}명</small>
                    </li>
                  ))}
                </ul>
              </div>
            ) : countryRows.length > 0 && (
              <p className={styles.note}>모든 나라가 실제 기대수명과 {GAP}년 안쪽이에요.</p>
            )}
            <p className={styles.note}>끝까지 산 인생이 적은 나라는 차이가 크게 보일 수 있어요. 막대에 마우스를 올리면 인생 수와 차이가 나와요.</p>
          </Panel>

          <Panel title="퀘스트별 달성률" right={<span className="sub">높은 순</span>}>
            <div className={styles.legend}>
              <span><i style={{ background: c.blue }} />너무 쉬움 ({EASY}% 이상)</span>
              <span><i style={{ background: c.teal }} />보통</span>
              <span><i style={{ background: c.red }} />너무 어려움 ({HARD}% 이하)</span>
              <span><i style={{ background: c.death + '66' }} />판정 없음</span>
            </div>
            {(d.quests || []).length ? <QuestChart quests={d.quests} c={c} /> : <p className={styles.empty}>등록된 퀘스트가 없어요.</p>}
          </Panel>
        </div>

        <aside className={styles.side}>
          <Panel title="인생 완료율">
            {(d.completion || []).length ? (
              <div className={styles.donuts}>
                {d.completion.map((row) => <CompletionDonut key={row.startType} row={row} c={c} />)}
              </div>
            ) : <p className={styles.empty}>아직 플레이된 인생이 없어요.</p>}
            <p className={styles.note}>완료율 = 끝까지 산 ÷ (끝까지 산 + 중간에 나감). 진행 중은 빼요.</p>
          </Panel>

          <Panel title="특성 레벨 분포" right={<span className="sub">회원</span>}>
            {(d.traits || []).length ? <TraitChart traits={d.traits} c={c} /> : <p className={styles.empty}>특성이 없어요.</p>}
            <p className={styles.note}>특성마다 회원들의 레벨 비율이에요. 이름 옆은 평균 레벨.</p>
          </Panel>
        </aside>
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
      {error && !d && (
        <div className={styles.wrap}>
          <AdminNav />
          <div className={styles.box}>
            <p>{error}</p>
            <Button pill onClick={reload}>다시 시도</Button>
          </div>
        </div>
      )}
      {!error && !d && <div className={styles.wrap}><p className={styles.empty}>통계를 모으는 중…</p></div>}
      {d && <Dashboard d={d} loadedAt={loadedAt} onReload={reload} loading={loading} />}
    </div>
  );
}

export default AdminMain;
