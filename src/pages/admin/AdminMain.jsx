// A04 관리자 메인 (주소: /admin, 관리자만)
// GET /api/admin/dashboard → 플레이 수, 완료율, 퀘스트 달성률, 특성 레벨 분포, 나라별 수명 비교
// 관리자 확인은 서버가 DB 권한(MEMBER_ROLE)으로 다시 함 (localStorage 값만 믿지 않음)
import { useEffect, useState } from 'react';
import client from '../../api/api';
import Panel from '../../common/ui/Panel';
import BigStat from '../../common/ui/BigStat';
import BarRow from '../../common/ui/BarRow';
import Badge from '../../common/ui/Badge';
import styles from './AdminMain.module.css';
import AdminNav from './AdminNav';

const TYPE_NAME = { MEMBER: '회원', GUEST: '비회원' };

function AdminMain() {
  const [d, setD] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    client.get('/api/admin/dashboard')
      .then((res) => setD(res.data))
      .catch((err) => {
        const msg = err.response?.data;
        setError(typeof msg === 'string' && msg ? msg : '통계를 불러오지 못했어요.');
      });
  }, []);

  if (error) return <div className="page"><p>{error}</p></div>;
  if (!d) return <div className="page"><p className="sub">통계를 모으는 중…</p></div>;

  // 그래프 눈금 맞추기용 최댓값
  const maxAge = Math.max(1, ...d.countries.map((c) => Math.max(c.avgDeathAge, c.realLifeExpectancy || 0)));
  const maxTraitCount = Math.max(1, ...d.traits.flatMap((t) => [t.lv1, t.lv2, t.lv3, t.lv4, t.lv5]));

  return (
    <div className={'page col ' + styles.admin}>
      <AdminNav />
      <h1>관리자 메인</h1>

      {/* 1. 플레이 수 */}
      <div className={styles.bigRow}>
        <BigStat label="오늘 시작된 인생" value={d.todayPlays} dot="birth" />
        <BigStat label="누적 인생" value={d.totalPlays} />
      </div>

      {/* 1. 완료율 (회원·비회원) */}
      <Panel title="인생 완료율">
        <div className={styles.grid2}>
          {d.completion.map((c) => (
            <div key={c.startType} className="col">
              <div className="row">
                <Badge color={c.startType === 'MEMBER' ? 'gold' : 'dark'}>{TYPE_NAME[c.startType]}</Badge>
                <span className="sub">전체 {c.total} · 진행 중 {c.playing}</span>
              </div>
              <BarRow label="끝까지 삶" value={c.endedRate} max={100} unit="%" />
              <BarRow label="중간에 나감" value={c.abandonedRate} max={100} unit="%" />
              <span className="sub" style={{ fontSize: 'var(--fs-xs)' }}>완료 {c.ended} / 이탈 {c.abandoned} (진행 중 제외)</span>
            </div>
          ))}
          {d.completion.length === 0 && <p className="sub">아직 플레이된 인생이 없어요.</p>}
        </div>
      </Panel>

      {/* 4. 나라별 평균 수명 vs 실제 기대수명 */}
      <Panel title="나라별 평균 수명 vs 실제 기대수명" right={<span className="sub">시뮬레이션 검증</span>}>
        <div className={styles.legend}>
          <span><i className={styles.game} />게임 평균 수명</span>
          <span><i className={styles.real} />실제 기대수명 (태어난 연대 기준)</span>
        </div>
        {d.countries.map((c) => (
          <div key={c.countryCode} className={styles.compare}>
            <span>{c.countryName}<small className="sub"> {c.lives}명</small></span>
            <div className={styles.bars}>
              <div className={styles.barGame} style={{ width: (c.avgDeathAge / maxAge) * 100 + '%' }}>
                {c.lives > 0 ? c.avgDeathAge + '세' : ''}
              </div>
              <div className={styles.barReal} style={{ width: ((c.realLifeExpectancy || 0) / maxAge) * 100 + '%' }}>
                {c.realLifeExpectancy != null ? c.realLifeExpectancy + '세' : ''}
              </div>
            </div>
          </div>
        ))}
        <p className="sub" style={{ fontSize: 'var(--fs-xs)' }}>
          게임 평균 수명이 실제 기대수명과 크게 다르면 사망 확률(C07)을 조정해야 해요. 끝까지 산 인생이 적으면 차이가 커 보일 수 있어요.
        </p>
      </Panel>

      {/* 2. 퀘스트별 달성률 */}
      <Panel title="퀘스트별 달성률" right={<span className="sub">너무 쉽거나 어려운 퀘스트 확인</span>}>
        {d.quests.map((q) => (
          <BarRow key={q.questId} label={`${q.questName} (${q.achieved}/${q.picked})`} value={q.rate} max={100} unit="%" />
        ))}
        {d.quests.length === 0 && <p className="sub">등록된 퀘스트가 없어요.</p>}
      </Panel>

      {/* 3. 특성별 레벨 분포 */}
      <Panel title="특성별 레벨 분포 (회원)">
        <div className={styles.traits}>
          {d.traits.map((t) => (
            <div key={t.traitId} className={styles.trait}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b>{t.traitName}</b>
                <span className="gold">평균 Lv.{t.avgLevel}</span>
              </div>
              <div className={styles.levelBars}>
                {[t.lv1, t.lv2, t.lv3, t.lv4, t.lv5].map((n, i) => (
                  <div key={i} className={styles.levelCol} title={`${i + 1}레벨 ${n}명`}>
                    <div className={styles.levelFill} style={{ height: (n / maxTraitCount) * 100 + '%' }} />
                    <small>Lv{i + 1}<br />{n}</small>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}

export default AdminMain;
