// C19 AI 인생 이야기 (결과 화면 아래에 펼쳐짐)
// GET /api/story/{lifeId}?guestToken=...  → 처음엔 Gemini가 만들어 저장(5~15초), 다음부터는 바로 나옴
// 이야기 속 [1], [2] 는 아래 출처 목록 번호
import { useEffect, useState } from 'react';
import client from '../../api/api';
import Panel from '../../common/ui/Panel';
import Button from '../../common/ui/Button';
import styles from './ResultPage.module.css';

// "…했다 [1]." 의 [1] 을 금색 작은 글자로 바꿔서 보여줌
function withCites(text) {
  return text.split(/(\[\d+\])/g).map((part, i) =>
    /^\[\d+\]$/.test(part) ? <sup key={i} className="gold">{part}</sup> : part
  );
}

// guestToken: 결과 링크(?guest=)로 받은 비회원 토큰 (없으면 이 브라우저 것)
function StoryPanel({ lifeId, guestToken: linkToken }) {
  const [story, setStory] = useState(null);
  const [error, setError] = useState('');
  const [tryNo, setTryNo] = useState(0); // 다시 시도 버튼용

  useEffect(() => {
    const isLogin = !!localStorage.getItem('token');
    const guestToken = linkToken || (isLogin ? null : localStorage.getItem('guestToken'));
    let alive = true;

    // 오류 문구 지우기는 [다시 시도] 단추에서 (effect 안에서 바로 상태를 바꾸지 않게)
    client.get(`/api/story/${lifeId}`, { params: { guestToken }, timeout: 60000 })
      .then((res) => { if (alive) { setStory(res.data); setError(''); } })
      .catch((err) => {
        if (!alive) return;
        const msg = err.response?.data;
        setError(typeof msg === 'string' && msg ? msg : 'AI 이야기를 불러오지 못했어요.');
      });
    return () => { alive = false; };
  }, [lifeId, tryNo, linkToken]);

  if (error) {
    return (
      <Panel title="AI 인생 이야기">
        <p>{error}</p>
        <Button onClick={() => { setError(''); setTryNo((n) => n + 1); }}>다시 시도</Button>
      </Panel>
    );
  }
  if (!story) {
    return (
      <Panel title="AI 인생 이야기">
        <p className="sub">AI가 이 사람의 일생을 실제 역사 자료와 함께 정리하고 있어요… (10초 정도)</p>
      </Panel>
    );
  }

  return (
    <Panel title="AI 인생 이야기" right={<span className="sub">{story.createdAt}</span>}>
      <div className={styles.story}>
        {story.story.split(/\n+/).filter((p) => p.trim()).map((p, i) => (
          <p key={i}>{withCites(p)}</p>
        ))}
      </div>
      {story.sources.length > 0 && (
        <div className={styles.sources}>
          <div className="sub">출처</div>
          <ol>
            {story.sources.map((s) => (
              <li key={s.sourceId}>
                {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}
              </li>
            ))}
          </ol>
        </div>
      )}
      <p className="sub" style={{ fontSize: 'var(--fs-xs)' }}>
        인물과 개인사는 게임 속 가상 이야기이고, 역사·통계는 출처의 실제 자료예요. AI가 쓴 글이라 틀린 부분이 있을 수 있어요.
      </p>
    </Panel>
  );
}

export default StoryPanel;
