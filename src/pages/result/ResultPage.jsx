// C18 인생 결과 화면 (주소: /result/:lifeId)
// GET /api/result/{lifeId}?guestToken=...  → 요약 + 능력치 그래프 + 인생 기록 + 퀘스트를 한 번에 받음
// 회원은 api.js 가 로그인 토큰을 자동으로 붙이고, 비회원은 localStorage 의 guestToken 을 같이 보냄
// C22 (11/23 동현님): 이 주소는 이제 엔딩 크레딧(EndingFilm)이 바로 틀어짐. 예전 결과 화면은 ?detail=1 (끝난 뒤 '인생 기록 보기')
//   비회원 인생을 다른 브라우저에서 볼 땐 &guest=토큰
// /result/test = 엔딩 크레딧 테스트 화면 (FilmTest, 작업용 - C22 끝나면 지울 것)
import { useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import client from '../../api/api';
import Panel from '../../common/ui/Panel';
import InfoBox from '../../common/ui/InfoBox';
import BigStat from '../../common/ui/BigStat';
import StatBar from '../../common/ui/StatBar';
import Badge from '../../common/ui/Badge';
import Button from '../../common/ui/Button';
import LogItem from '../../common/ui/LogItem';
import StatChart from './StatChart';
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
  return EDU_NAME[r.eduLevel];
}

// 금액 (엔진 소득 단위: 달러)
const money = (v) => (v == null ? '-' : '$' + Math.round(v).toLocaleString('ko-KR'));

// 결혼: 지금 상태 + 이력 (이혼·사별하면 마지막엔 미혼이라 '안 함'으로 나오던 것)
function marriedText(r) {
  const w = r.weddingCount || 0;
  const d = r.divorceCount || 0;
  const x = r.widowCount || 0;
  if (r.marriedYn === 'Y') return w > 1 ? `했음 (재혼, ${w}번)` : '했음';
  if (w === 0) return '안 함';
  const end = d > 0 && x > 0 ? '이혼·사별' : x > 0 ? '사별' : '이혼';
  return w > 1 ? `했음 → ${end} (${w}번 결혼)` : `했음 → ${end}`;
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
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [showStory, setShowStory] = useState(false); // C19 AI 인생 이야기 펼치기
  const [showQna, setShowQna] = useState(false);     // C20 인생 Q&A 펼치기
  const detail = query.get('detail') === '1';  // 예전 결과 화면 (요약·그래프·기록·퀘스트·AI 이야기)

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
      <EndingFilm lifeId={lifeId} result={result} guestToken={guestParam} onClose={() => navigate('/')}
        actions={[
          { label: '다시 태어나기', onClick: () => navigate('/') },
          { label: '인생 기록 보기', onClick: () => navigate(`/result/${lifeId}?detail=1${guestQ}`) },
        ]} />
    );
  }

  if (!result) {
    return <div className="page"><p className="sub">결과를 불러오는 중…</p></div>;
  }

  const r = result;
  const isMember = r.startType === 'MEMBER' && !!localStorage.getItem('token');
  const logs = showAllLogs ? r.events : r.events.slice(0, 10);

  return (
    <div className={'page col ' + styles.result}>
      {/* 1. 제목: 이름, 나라(당시 명칭 병기), 출생~사망 */}
      <div className={styles.head}>
        <p className="sub">한 사람의 일생이 끝났어요</p>
        <h1>{r.name}</h1>
        <div className="row" style={{ justifyContent: 'center' }}>
          <Badge color="dark">
            {r.countryName}{r.histName && r.histName !== r.countryName ? ` (당시 ${r.histName})` : ''}
          </Badge>
          {r.currentCountry !== r.birthCountry && <Badge color="blue">{r.currentCountryName}에서 생을 마침</Badge>}
          <Badge>{r.birthYear} ~ {r.deathYear}</Badge>
        </div>
        {/* C22 엔딩 크레딧 다시 보기 (가로 16:9, 약 1분 30초) */}
        <div className="row" style={{ justifyContent: 'center', marginTop: 12 }}>
          <Button type="primary" pill onClick={() => navigate(`/result/${lifeId}${guestParam ? `?guest=${encodeURIComponent(guestParam)}` : ''}`)}>▶ 엔딩 크레딧 다시 보기</Button>
        </div>
      </div>

      {/* 2. 큰 숫자: 수명, 인생 점수, 소득 상위 % */}
      <div className={styles.bigRow}>
        <BigStat label="수명" value={`${r.deathAge}세`} dot="death"
          sub={r.lifeExpectancy ? <>그 시대 기대수명 {Math.round(r.lifeExpectancy)}세</> : null} />
        <BigStat label="인생 점수" value={r.lifeScore ?? '-'} />
        <BigStat label="아시아 소득 상위" value={r.incomeTopPct != null ? `${r.incomeTopPct}%` : '-'} />
      </div>

      {/* 3. 요약 칸 */}
      <Panel title="인생 요약">
        <div className="info-grid">
          <InfoBox label="사망 원인" value={r.deathCause || '-'} />
          <InfoBox label="학력" value={eduText(r)} />
          <InfoBox label="마지막 직업" value={r.jobName || '없음'} />
          <InfoBox label="평균 소득 (연)" value={money(r.avgIncome)} />
          <InfoBox label="결혼" value={marriedText(r)} />
          <InfoBox label="자녀" value={`${r.childCount}명`} />
        </div>
      </Panel>

      {/* 4. 능력치: 마지막 값 + 변화 그래프 */}
      <Panel title="능력치 변화">
        <div className={styles.stats}>
          <StatBar type="health" value={r.health} />
          <StatBar type="happiness" value={r.happiness} />
          <StatBar type="knowledge" value={r.knowledge} />
          <StatBar type="relation" value={r.relation} />
        </div>
        <StatChart years={r.years} />
      </Panel>

      {/* 5. 퀘스트 (회원만, 비회원은 퀘스트 없음) */}
      {r.quests.length > 0 && (
        <Panel title="퀘스트" right={<span className="gold">+{r.pointEarned}P</span>}>
          <div className="col">
            {r.quests.map((q) => (
              <div key={q.questId} className={styles.quest}>
                <span>{q.achieved === 'Y' ? '★' : '☆'}</span>
                <span>{q.questName}</span>
                <Badge color={q.achieved === 'Y' ? 'green' : undefined}>{q.achieved === 'Y' ? '달성' : '실패'}</Badge>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* 6. 인생 기록 전체 */}
      <Panel title={`인생 기록 (${r.events.length})`}>
        {r.events.length === 0 && <p className="sub">기록된 사건이 없어요.</p>}
        {logs.map((e) => (
          <LogItem key={e.logId} age={e.age} year={e.yearNo}
            text={e.logText} detail={e.choiceText ? `선택: ${e.choiceText}` : null} star={e.isAi === 'Y'} />
        ))}
        {r.events.length > 10 && (
          <Button type="ghost" block onClick={() => setShowAllLogs(!showAllLogs)}>
            {showAllLogs ? '접기' : `전체 보기 (${r.events.length}개)`}
          </Button>
        )}
      </Panel>

      {/* 7. 다음 행동: 추모관(B01, 회원만), AI 이야기(C19), 다시 태어나기 */}
      <div className="row" style={{ justifyContent: 'center' }}>
        {isMember && !r.memorialPostId && (
          <Button type="primary" onClick={() => alert('추모관 올리기는 B01 연결 예정')}>추모관에 올리기</Button>
        )}
        {r.memorialPostId && <Badge color="gold">추모관에 올린 인생</Badge>}
        {!showStory && <Button onClick={() => setShowStory(true)}>AI 인생 이야기</Button>}
        {!showQna && <Button onClick={() => setShowQna(true)}>이 인생에 대해 질문하기</Button>}
        <Button type="light" onClick={() => navigate('/')}>다시 태어나기</Button>
      </div>

      {/* 8. C19 AI 인생 이야기 (버튼을 누르면 펼쳐짐) */}
      {showStory && <StoryPanel lifeId={lifeId} guestToken={guestParam} />}

      {/* 9. C20 인생 Q&A 챗봇 */}
      {showQna && <QnaPanel lifeId={lifeId} guestToken={guestParam} />}
    </div>
  );
}

export default ResultPage;
