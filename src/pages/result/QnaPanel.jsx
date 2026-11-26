// C20 이 삶에 대해 묻기 — 그 사람에게 직접 묻는 대화 (11/25 다시 만듦)
// POST /api/qa/{lifeId}  { question, guestToken, sinceQaId } → 그 사람이 1인칭으로 답함 (근거: 그 인생 기록 + 나라·시대 자료(DB))
//   묻기 탭을 열 때마다 새 대화 (11/25 동현님): 지난 대화는 불러오지 않고, AI도 이번 대화(sinceQaId 부터)만 참고
//   (지난 질문은 DB QA_LOG 에 남아 질문 수 제한(인생당 30개)에만 쓰임)
//   13살 전에 떠난 아이는 어머니가 대신 답함 (백엔드 QaService.speaker 와 같게)
//   추천 질문은 이 인생에 맞춰 만듦 (이민 · 일 · 결혼 · 자녀 · 가장 행복했던 때)
//   답변 속 [1], [2] 는 그 답변 아래 출처 번호
//   예: <QnaPanel lifeId={11271} guestToken={...} r={result} happyAge={34} costume={wear} />
import { useEffect, useMemo, useRef, useState } from 'react';
import client from '../../api/api';
import Button from '../../common/ui/Button';
import Figure from '../../engine/village/Figure';
import { lookOf } from '../../engine/village/costumeData';
import { ro } from '../../engine/play/lifeText';
import { retireAge } from '../../engine/film/filmPlan';
import styles from './AiPanels.module.css';

const MAX_LENGTH = 200; // 백엔드 QaService.MAX_QUESTION_LENGTH 와 같게
const CHILD_AGE = 13;   // 이 나이 전에 떠나면 어머니가 답함

// link: 결과 링크(?guest=)로 받은 비회원 토큰 (없으면 이 브라우저 것)
function guestToken(link) {
  return link || (localStorage.getItem('token') ? null : localStorage.getItem('guestToken'));
}

// 받침 있으면 a, 없으면 b ('샤프나는' / '민준은', '샤프나예요' / '민준이에요')
function josa(word, a, b) {
  const c = String(word || '').charCodeAt(String(word || '').length - 1);
  const has = c >= 0xac00 && c <= 0xd7a3 && (c - 0xac00) % 28 !== 0;
  return word + (has ? a : b);
}

function withCites(text) {
  return text.split(/(\[\d+\])/g).map((part, i) =>
    /^\[\d+\]$/.test(part) ? <sup key={i} className={styles.cite}>{part}</sup> : part
  );
}

// 이 인생에 맞춘 추천 질문 (앞에서 4개)
function suggestionsOf(r, happyAge, child) {
  if (child) {
    return [
      `${josa(r.name, '은', '는')} 어떤 아이였어요?`,
      '그때 집 살림은 어땠어요?',
      '그 시절 아이들은 어떻게 자랐어요?',
      `${josa(r.name, '을', '를')} 떠나보낸 뒤 어떻게 지내셨어요?`,
    ];
  }
  const q = [];
  if (r.currentCountry && r.currentCountry !== r.birthCountry) q.push(`${ro(r.currentCountryName)} 떠날 때 어땠어요?`);
  const ret = retireAge(r.events, r.years);
  const job = (r.years || []).filter((y) => y.age < ret).map((y) => y.jobName).filter(Boolean);
  if (job.length) {
    const most = Object.entries(job.reduce((m, j) => ({ ...m, [j]: (m[j] || 0) + 1 }), {})).sort((a, b) => b[1] - a[1])[0][0];
    q.push(`${most} 일은 어땠어요?`);
  }
  if (happyAge != null) q.push(`${happyAge}세 무렵엔 어떻게 지내셨어요?`); // '가장 행복하셨죠?'라고 단정하면 기록과 어긋날 때 AI가 부정함 (11/25)
  if ((r.weddingCount || 0) > 0 || r.marriedYn === 'Y') q.push('결혼할 때 이야기 들려주세요.');
  if (r.childCount > 0) q.push('아이들은 어떻게 키우셨어요?');
  q.push('그 시절 사람들은 어떻게 살았어요?');
  q.push('다시 태어난다면 무엇을 바꾸고 싶어요?');
  return q;
}

function QnaPanel({ lifeId, guestToken: linkToken, r, happyAge, costume }) {
  const [list, setList] = useState([]);
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState('');   // 보내는 중인 질문 (말풍선 미리 보여 주기)
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const child = (r?.deathAge ?? 99) < CHILD_AGE;
  const who = child ? `${r.name}의 어머니` : r.name;
  const look = useMemo(() => (child
    ? lookOf({ gender: 'F', age: 30 + (r.deathAge || 0) })
    : lookOf({ gender: r.gender, age: r.deathAge, costume })), [child, r, costume]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [list, asking]);

  const asked = new Set(list.map((x) => x.question));
  const chips = suggestionsOf(r, happyAge, child).filter((q) => !asked.has(q)).slice(0, 4);

  const ask = (q) => {
    const text = (q ?? question).trim();
    if (!text || asking) return;
    setAsking(text);
    setQuestion('');
    setError('');
    const sinceQaId = list.length ? list[0].qaId : null; // 이번 대화의 첫 질문 번호
    client.post(`/api/qa/${lifeId}`, { question: text, guestToken: guestToken(linkToken), sinceQaId }, { timeout: 60000 })
      .then((res) => setList((old) => [...old, res.data]))
      .catch((err) => {
        const msg = err.response?.data;
        setError(typeof msg === 'string' && msg ? msg : '대답을 듣지 못했어요. 잠시 뒤 다시 물어봐 주세요.');
        setQuestion(text);
      })
      .finally(() => setAsking(''));
  };

  const avatar = <span className={styles.avatar} aria-hidden="true"><Figure look={look} /></span>;

  return (
    <div className={styles.box}>
      <div className={styles.chat}>
        {/* 첫인사 */}
        <div className={styles.them}>
          {avatar}
          <div>
            <span className={styles.who}>{who}</span>
            <div className={styles.bubble}>
              {child
                ? `${r.name}의 이야기를 들으러 오셨군요. 짧았지만 소중한 아이였어요. 궁금한 걸 물어보세요.`
                : `안녕하세요, ${josa(r.name, '이에요', '예요')}. ${r.birthYear}년에 태어나 ${r.deathAge}년을 살았어요. 제 삶이나 그 시절에 대해 무엇이든 물어보세요.`}
            </div>
          </div>
        </div>

        {list.map((qa) => (
          <div key={qa.qaId} className={styles.pair}>
            <div className={styles.me}><div className={styles.bubble}>{qa.question}</div></div>
            <div className={styles.them}>
              {avatar}
              <div>
                <span className={styles.who}>{who}</span>
                <div className={styles.bubble}>
                  {qa.answer.split(/\n+/).filter((p) => p.trim()).map((p, i) => <p key={i}>{withCites(p)}</p>)}
                </div>
                {qa.sources?.length > 0 && (
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
          </div>
        ))}

        {asking && (
          <div className={styles.pair}>
            <div className={styles.me}><div className={styles.bubble}>{asking}</div></div>
            <div className={styles.them}>
              {avatar}
              <div><span className={styles.who}>{who}</span><div className={styles.bubble + ' ' + styles.typing}><i /><i /><i /></div></div>
            </div>
          </div>
        )}
        {error && <p className={styles.err}>{error}</p>}
        <div ref={bottomRef} />
      </div>

      {chips.length > 0 && (
        <div className={styles.chips}>
          {chips.map((q) => <button key={q} type="button" disabled={!!asking} onClick={() => ask(q)}>{q}</button>)}
        </div>
      )}

      <form className={styles.form} onSubmit={(e) => { e.preventDefault(); ask(); }}>
        <input className="input" value={question} maxLength={MAX_LENGTH} disabled={!!asking}
          placeholder={`${who}에게 물어보기 (${MAX_LENGTH}자까지)`}
          onChange={(e) => setQuestion(e.target.value)} />
        <Button type="primary" pill disabled={!!asking || !question.trim()} onClick={() => ask()}>보내기</Button>
      </form>
      <p className={styles.foot}>게임 속 가상 인물이 기록과 실제 역사 자료를 바탕으로 답해요. AI가 쓴 답이라 틀린 부분이 있을 수 있어요.</p>
    </div>
  );
}

export default QnaPanel;
