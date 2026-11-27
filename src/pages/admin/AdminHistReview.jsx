// C10 역사 문장 검수 (주소: /admin/hist-review, 관리자만)
// 1. 미검수 역사 이벤트 목록에서 최대 10개 고르기 → POST /api/admin/hist-drafts (Gemini 1번 호출)
// 2. 카드마다 초안을 고쳐서 저장 → PUT /api/admin/events/{id}/base-text → 검수 완료(IS_REVIEWED = Y)
// 초안은 DB에 저장되지 않음 (저장 버튼을 눌러야 반영)
import { useEffect, useState } from 'react';
import client from '../../api/api';
import AdminNav from './AdminNav';
import Panel from '../../common/ui/Panel';
import Button from '../../common/ui/Button';
import Badge from '../../common/ui/Badge';

import styles from './AdminHistReview.module.css';
import { errMsg } from './adminUtil';

const MAX = 10; // 한 번에 초안 만들 개수 (서버와 같음)

// 미리보기: 자리 표시를 예시 값으로 바꿔서 게임에서 어떻게 보일지
// (조사 은(는)·이(가)는 게임 서버가 받침에 맞게 바꿔요)
function preview(text, card) {
  if (!text) return '';
  return text
    .replaceAll('{연도}', String(card.startYear))
    .replaceAll('{나라}', card.country ?? '')
    .replaceAll('{이름}', '민수')
    .replaceAll('{나이}', '30');
}

function AdminHistReview() {
  const [rows, setRows] = useState([]);         // 미검수 목록
  const [keyword, setKeyword] = useState('');   // 목록 검색어
  const [selected, setSelected] = useState([]); // 고른 이벤트 ID
  const [cards, setCards] = useState([]);       // 초안 카드 (작업 중)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 처음 한 번: 미검수 역사 이벤트 목록
  useEffect(() => {
    client.get('/api/admin/events', { params: { type: 'HIST', reviewed: 'N' } })
      .then((res) => setRows(res.data))
      .catch((err) => setError(errMsg(err, '목록을 불러오지 못했어요.')));
  }, []);

  // 목록에 보일 것: 카드로 작업 중인 건 빼고, 검색어가 있으면 ID·제목·사건·나라 코드 중 하나에 들어간 것만
  const cardIds = cards.map((c) => c.eventId);
  const shown = rows.filter((r) =>
    !cardIds.includes(r.eventId) &&
    (!keyword.trim() || [r.eventId, r.title, r.histTitle, r.countryCode].some((v) => v && String(v).toLowerCase().includes(keyword.trim().toLowerCase()))));

  // 체크: 이미 골랐으면 빼고, 아니면 10개까지만 추가
  const toggle = (id) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX) return prev;
      return [...prev, id];
    });
  };

  // 지금 보이는 목록 앞에서 10개 고르기
  const pickFirst = () => setSelected(shown.slice(0, MAX).map((r) => r.eventId));

  // AI 초안 만들기 → 카드 추가 (편집 칸에는 초안, 초안이 없으면 지금 문장)
  const makeDrafts = () => {
    setLoading(true);
    setError('');
    client.post('/api/admin/hist-drafts', selected)
      .then((res) => {
        const newCards = res.data.map((d) => ({ ...d, text: d.draft ?? d.currentText ?? '', saveError: '' }));
        setCards((prev) => [...prev, ...newCards]);
        setSelected([]);
      })
      .catch((err) => setError(errMsg(err, '초안을 만들지 못했어요.')))
      .finally(() => setLoading(false));
  };

  // 카드 하나만 바꾸기 (나머지 카드는 그대로)
  const updateCard = (id, change) => {
    setCards((prev) => prev.map((c) => (c.eventId === id ? { ...c, ...change } : c)));
  };

  const removeCard = (id) => setCards((prev) => prev.filter((c) => c.eventId !== id));

  // 저장 → 검수 완료: 카드와 목록에서 빼기 (남은 개수도 줄어듦)
  const save = (card, baseText) => {
    client.put(`/api/admin/events/${card.eventId}/base-text`, { baseText })
      .then(() => {
        removeCard(card.eventId);
        setRows((prev) => prev.filter((r) => r.eventId !== card.eventId));
      })
      .catch((err) => updateCard(card.eventId, { saveError: errMsg(err, '저장하지 못했어요.') }));
  };

  return (
    <div className={'page col ' + styles.wrap}>
      <AdminNav />
      <h1>역사 문장 검수</h1>
      <p className="sub">
        AI 초안을 고쳐서 저장하면 검수 완료가 돼요. 남은 미검수 <b className="gold">{rows.length}</b>건
      </p>
      {error && <p className={styles.error}>{error}</p>}

      {/* 작업 카드 */}
      {cards.map((c) => (
        <Panel
          key={c.eventId}
          title={c.title}
          right={
            <span className="row">
              <Badge color="dark">{c.country}</Badge>
              <span className="sub">{c.startYear}~{c.endYear}</span>
              {c.isChoice === 'Y' && <Badge color="gold">선택</Badge>}
            </span>
          }
        >
          <div className="col">
            <details className={styles.desc}>
              <summary>사건 설명 ({c.histTitle})</summary>
              <p>{c.description ?? '설명 없음'}</p>
            </details>

            <div>
              <div className={styles.label}>지금 문장</div>
              <p className={styles.current}>{c.currentText ?? '(없음)'}</p>
            </div>

            {c.error && <p className={styles.error}>AI 초안 실패: {c.error} (지금 문장을 고쳐서 저장해도 돼요)</p>}

            <div>
              <div className={styles.label}>
                검수할 문장 <span className="sub">{c.text.length}자 · 쓸 수 있는 자리 표시 {'{연도} {이름} {나이} {나라}'}</span>
              </div>
              <textarea
                className={'input ' + styles.textarea}
                rows={3}
                value={c.text}
                onChange={(e) => updateCard(c.eventId, { text: e.target.value, saveError: '' })}
              />
            </div>

            <div>
              <div className={styles.label}>미리보기 <span className="sub">(이름은 민수, 연도는 시작 연도로)</span></div>
              <p className={styles.preview}>{preview(c.text, c)}</p>
            </div>

            {c.saveError && <p className={styles.error}>{c.saveError}</p>}

            <div className="row">
              <Button type="primary" size="sm" disabled={!c.text.trim()} onClick={() => save(c, c.text)}>
                이 문장으로 검수 완료
              </Button>
              <Button size="sm" disabled={!c.currentText} onClick={() => save(c, c.currentText)}>
                지금 문장 유지하고 완료
              </Button>
              <Button type="ghost" size="sm" onClick={() => removeCard(c.eventId)}>
                건너뛰기
              </Button>
            </div>
          </div>
        </Panel>
      ))}

      {/* 미검수 목록 */}
      <Panel
        title="미검수 역사 이벤트"
        right={
          <span className="row">
            <Button size="sm" onClick={pickFirst} disabled={loading}>앞에서 {MAX}개 고르기</Button>
            <Button type="primary" size="sm" disabled={selected.length === 0 || loading} onClick={makeDrafts}>
              {loading ? 'AI가 쓰는 중… (10~20초)' : `AI 초안 만들기 (${selected.length}/${MAX})`}
            </Button>
          </span>
        }
      >
        <input
          className={'input ' + styles.search}
          placeholder="나라 코드(KOR)·사건 이름·ID로 검색"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
        />
        <div className={styles.list}>
          {shown.map((r) => {
            const checked = selected.includes(r.eventId);
            return (
              <label key={r.eventId} className={checked ? `${styles.item} ${styles.itemOn}` : styles.item}>
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={loading || (!checked && selected.length >= MAX)}
                  onChange={() => toggle(r.eventId)}
                />
                <span className={styles.code}>{r.countryCode}</span>
                <span className={styles.year}>{r.startYear}~{r.endYear}</span>
                <span className={styles.title}>{r.title}</span>
                {r.isChoice === 'Y' && <Badge color="gold">선택</Badge>}
              </label>
            );
          })}
          {shown.length === 0 && <p className="sub">검수할 역사 이벤트가 없어요.</p>}
        </div>
      </Panel>
    </div>
  );
}

export default AdminHistReview;