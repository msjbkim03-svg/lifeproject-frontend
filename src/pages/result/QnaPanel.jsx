// C20 인생 Q&A 챗봇 (결과 화면 아래에 펼쳐짐)
// GET  /api/qa/{lifeId}?guestToken=...           → 지난 질문·답변
// POST /api/qa/{lifeId}  { question, guestToken } → 그 인생의 나라·시대·겪은 사건 자료(DB)를 근거로 Gemini 답변
// 답변 속 [1], [2] 는 그 답변 아래 출처 번호
import { useEffect, useRef, useState } from 'react';
import client from '../../api/api';
import Panel from '../../common/ui/Panel';
import Button from '../../common/ui/Button';
import Chips from '../../common/ui/Chips';
import styles from './ResultPage.module.css';

const MAX_LENGTH = 200; // 백엔드 QaService.MAX_QUESTION_LENGTH 와 같게

// 추천 질문 (누르면 바로 질문)
const SUGGESTIONS = [
  { value: '이 사람이 살던 시절 이 나라의 평균 수명은 어땠어?', label: '그 시절 평균 수명' },
  { value: '이 사람이 겪은 가장 큰 역사적 사건은 뭐였어?', label: '겪은 큰 사건' },
  { value: '이 사람이 태어났을 때와 죽었을 때 나라 경제는 얼마나 달라졌어?', label: '경제는 얼마나 변했나' },
  { value: '이 사람의 인생은 그 시대 평균과 비교하면 어땠어?', label: '시대 평균과 비교' },
];

// link: 결과 링크(?guest=)로 받은 비회원 토큰 (없으면 이 브라우저 것)
function guestToken(link) {
  return link || (localStorage.getItem('token') ? null : localStorage.getItem('guestToken'));
}

// "…했다 [1]." 의 [1] 을 금색 작은 글자로
function withCites(text) {
  return text.split(/(\[\d+\])/g).map((part, i) =>
    /^\[\d+\]$/.test(part) ? <sup key={i} className="gold">{part}</sup> : part
  );
}

function QnaPanel({ lifeId, guestToken: linkToken }) {
  const [list, setList] = useState([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  // 지난 질문·답변 불러오기
  useEffect(() => {
    client.get(`/api/qa/${lifeId}`, { params: { guestToken: guestToken(linkToken) } })
      .then((res) => setList(res.data))
      .catch(() => setError('지난 질문을 불러오지 못했어요.'));
  }, [lifeId, linkToken]);

  // 새 답변이 오면 아래로 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [list, asking]);

  const ask = (q) => {
    const text = (q ?? question).trim();
    if (!text || asking) return;
    setAsking(true);
    setError('');
    client.post(`/api/qa/${lifeId}`, { question: text, guestToken: guestToken(linkToken) }, { timeout: 60000 })
      .then((res) => {
        setList((old) => [...old, res.data]);
        setQuestion('');
      })
      .catch((err) => {
        const msg = err.response?.data;
        setError(typeof msg === 'string' && msg ? msg : 'AI가 답하지 못했어요.');
      })
      .finally(() => setAsking(false));
  };

  return (
    <Panel title="이 인생에 대해 물어보기">
      <div className={styles.qna}>
        {list.length === 0 && !asking && (
          <p className="sub">이 사람의 나라·시대·겪은 사건에 대해 물어보세요. 실제 자료를 근거로 답해요.</p>
        )}

        {list.map((qa) => (
          <div key={qa.qaId} className={styles.qaItem}>
            <div className={styles.q}>{qa.question}</div>
            <div className={styles.a}>
              {qa.answer.split(/\n+/).filter((p) => p.trim()).map((p, i) => <p key={i}>{withCites(p)}</p>)}
              {qa.sources.length > 0 && (
                <ul className={styles.qaSources}>
                  {qa.sources.map((s) => (
                    <li key={s.sourceId}>
                      [{s.no}] {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}

        {asking && <p className="sub">자료를 찾아서 답을 쓰고 있어요…</p>}
        {error && <p style={{ color: 'var(--red)' }}>{error}</p>}
        <div ref={bottomRef} />
      </div>

      {/* 추천 질문 */}
      <Chips items={SUGGESTIONS} onPick={(q) => ask(q)} />

      {/* 질문 입력 */}
      <form className={styles.qaForm} onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <input className="input" value={question} maxLength={MAX_LENGTH} disabled={asking}
          placeholder="예: 이 사람이 대학에 간 해에는 어떤 일이 있었어?"
          onChange={(e) => setQuestion(e.target.value)} />
        <Button type="primary" disabled={asking || !question.trim()} onClick={() => ask()}>보내기</Button>
      </form>
      <p className="sub" style={{ fontSize: 'var(--fs-xs)', marginTop: 'var(--sp-2)' }}>
        AI가 쓴 답이라 틀린 부분이 있을 수 있어요. 숫자는 [번호] 출처를 확인해 주세요.
      </p>
    </Panel>
  );
}

export default QnaPanel;
