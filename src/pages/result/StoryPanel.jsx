// C19 AI 인생 이야기 — 사진첩처럼 나이대별 장 (11/25 다시 만듦)
// GET /api/story/{lifeId}?guestToken=...&scenes=16:grad,18:work  → 처음엔 Gemini가 만들어 저장(5~15초), 다음부터는 바로 나옴
//   scenes: 장마다 붙일 큰 장면 사진의 '나이:장면' → 서버가 그 장 글에 그 일을 꼭 쓰게 함 (11/25: 18세 일 시작 사진은 10대인데 글은 청년기에 있던 것)
//   이야기는 '## 어린 시절 (0~12세)' 같은 장 제목 줄로 나뉘어 옴 → 장마다 그 나이의 큰 장면 사진을 붙임
//   장 제목이 없는 예전 이야기는 문단만 그대로 보여 줌
//   이야기 속 [1], [2] 는 아래 출처 목록 번호
//   AI가 안 되면(한도 · 키 · 시간 초과) 서버가 인생 기록 줄로 엮은 이야기를 fallback: true 로 줌 → 안내 + 'AI로 다시 쓰기'
//   예: <StoryPanel lifeId={11271} guestToken={...} moments={view.moments} segs={filmSegs} onPhoto={setPick} />
import { useEffect, useState } from 'react';
import client from '../../api/api';
import Button from '../../common/ui/Button';
import FilmScene from '../../engine/film/FilmScene';
import styles from './AiPanels.module.css';

// "…했다 [1]." 의 [1] 을 작은 번호로
function withCites(text) {
  return text.split(/(\[\d+\])/g).map((part, i) =>
    /^\[\d+\]$/.test(part) ? <sup key={i} className={styles.cite}>{part}</sup> : part
  );
}

// 이야기 → 장 목록 [{ title, from, to, paras }]  (장 제목이 없으면 장 하나)
function chaptersOf(text) {
  const out = [];
  let cur = null;
  text.split(/\n+/).map((l) => l.replace(/\*\*/g, '').replace(/^[-*]\s+/, '').trim()).filter(Boolean).forEach((line) => { // AI가 붙이는 **굵게** · 목록 표시는 뺌
    const h = /^#{1,3}\s*(.+?)\s*\((\d+)\s*[~∼-]\s*(\d+)\s*세\)\s*$/.exec(line);
    if (h) {
      cur = { title: h[1], from: +h[2], to: +h[3], paras: [] };
      out.push(cur);
      return;
    }
    if (/^#{1,3}\s/.test(line)) { // 나이 없는 제목 줄
      cur = { title: line.replace(/^#+\s*/, ''), from: null, to: null, paras: [] };
      out.push(cur);
      return;
    }
    if (!cur) { cur = { title: null, from: null, to: null, paras: [] }; out.push(cur); }
    cur.paras.push(line);
  });
  return out.filter((c) => c.paras.length);
}

// 장면 작은 사진 (누르면 크게)
function Thumb({ m, no, seg, onOpen }) {
  return (
    <button type="button" className={styles.thumb} onClick={onOpen} title={`${m.a}세 · ${m.t}`}>
      <span className={styles.thumbImg}>{seg ? <FilmScene v={seg.v} t={1600} /> : null}</span>
      <span className={styles.thumbCap}><b>{no}</b>{m.a}세</span>
    </button>
  );
}

function StoryPanel({ lifeId, guestToken: linkToken, moments = [], segs, onPhoto }) {
  const [story, setStory] = useState(null);
  const [error, setError] = useState('');
  const [tryNo, setTryNo] = useState(0); // 다시 시도 버튼용
  const scenes = moments.map((m) => `${m.a}:${m.scene || 'village'}`).join(','); // 글자로 바꿔서 넘김 (배열은 그릴 때마다 새로 만들어져서)

  useEffect(() => {
    const isLogin = !!localStorage.getItem('token');
    const guestToken = linkToken || (isLogin ? null : localStorage.getItem('guestToken'));
    let alive = true;
    client.get(`/api/story/${lifeId}`, { params: { guestToken, scenes: scenes || undefined }, timeout: 70000 }) // 고쳐 쓰기까지 하면 길게는 1분
      .then((res) => { if (alive) { setStory(res.data); setError(''); } })
      .catch((err) => {
        if (!alive) return;
        const msg = err.response?.data;
        setError(typeof msg === 'string' && msg ? msg : 'AI 이야기를 불러오지 못했어요.');
      });
    return () => { alive = false; };
  }, [lifeId, tryNo, linkToken, scenes]);

  if (error) {
    return (
      <div className={styles.box}>
        <p>{error}</p>
        <Button onClick={() => { setError(''); setTryNo((n) => n + 1); }}>다시 시도</Button>
      </div>
    );
  }
  if (!story) {
    return (
      <div className={styles.box}>
        <div className={styles.loading}>
          <span className={styles.pen} aria-hidden="true">✎</span>
          <p>AI가 이 사람의 일생을 실제 역사 자료와 함께 정리하고 있어요…<br /><small>처음 한 번만 길게는 1분쯤 걸려요. 다음부터는 바로 열려요.</small></p>
        </div>
      </div>
    );
  }

  const chapters = chaptersOf(story.story || '');
  const retry = () => { setStory(null); setTryNo((n) => n + 1); };
  const segOf = (i) => (segs ? segs.find((s) => s.f?.a === moments[i].a) || segs[i] : null);
  const used = new Set();

  return (
    <div className={styles.box}>
      {story.fallback && (
        <div className={styles.notice}>
          <span>{story.notice || 'AI가 잠시 답하지 않아요.'} 그동안 인생 기록으로 엮은 이야기를 보여 드려요.</span>
          <Button size="sm" pill onClick={retry}>AI로 다시 쓰기</Button>
        </div>
      )}
      <div className={styles.album}>
        {chapters.map((c, ci) => {
          // 이 장 나이대의 큰 장면 (한 장면은 한 번만)
          const pics = c.from == null ? [] : moments.map((m, i) => ({ m, i })).filter(({ m, i }) => m.a >= c.from && m.a <= c.to && !used.has(i));
          pics.forEach(({ i }) => used.add(i));
          return (
            <section key={ci} className={styles.chapter}>
              {c.title && (
                <h3 className={styles.chTitle}>
                  <span className={styles.chNo}>{String(ci + 1).padStart(2, '0')}</span>
                  {c.title}
                  {c.from != null && <small>{c.from}~{c.to}세</small>}
                </h3>
              )}
              {pics.length > 0 && (
                <div className={styles.thumbs}>
                  {pics.map(({ m, i }) => <Thumb key={i} m={m} no={i + 1} seg={segOf(i)} onOpen={() => onPhoto?.(i)} />)}
                </div>
              )}
              <div className={styles.story}>
                {c.paras.map((p, i) => <p key={i}>{withCites(p)}</p>)}
              </div>
            </section>
          );
        })}
      </div>

      {story.sources?.length > 0 && (
        <details className={styles.sources}>
          <summary>출처 {story.sources.length}개</summary>
          <ol>
            {story.sources.map((s) => (
              <li key={s.sourceId}>
                {s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title}</a> : s.title}
              </li>
            ))}
          </ol>
        </details>
      )}
      <p className={styles.foot}>
        {story.fallback
          ? '게임 속 인생 기록을 그대로 이어 붙인 글이에요.'
          : '인물과 개인사는 게임 속 가상 이야기이고, 역사·통계는 출처의 실제 자료예요. AI가 쓴 글이라 틀린 부분이 있을 수 있어요.'}
        {story.createdAt ? ` · ${story.createdAt}` : ''}
      </p>
    </div>
  );
}

export default StoryPanel;
