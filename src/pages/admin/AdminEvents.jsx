// A03 이벤트 관리 (주소: /admin/events, 관리자만)
// 왼쪽: 목록 (필터·검색·AI 서술 토글)  /  오른쪽: 등록·수정 폼 + 템플릿·사건·선택지
// API: GET /api/admin/events, GET /api/admin/events/{id}, PUT /api/admin/events/{id}/ai-narrate?value=Y, GET /api/admin/templates
import { useEffect, useState } from 'react';
import client from '../../api/api';
import AdminNav from './AdminNav';
import EventForm, { EMPTY_EVENT } from './EventForm';
import Panel from '../../common/ui/Panel';
import Button from '../../common/ui/Button';
import Badge from '../../common/ui/Badge';
import { errMsg } from './adminUtil';
import styles from './AdminEvents.module.css';
import ChoiceEditor from './ChoiceEditor';
import TemplateCard from './TemplateCard';

// 필터 칩 [보낼 값, 화면 글자]  ('' = 조건 없음)
const TYPES = [['', '전체'], ['LIFE', '인생'], ['HIST', '역사']];
const REVIEWED = [['', '전체'], ['N', '미검수'], ['Y', '검수 완료']];
const AI = [['', '전체'], ['Y', 'AI 서술'], ['N', '기본 문구']];

// 칩 묶음 하나 (지금 값은 금색)
function ChipGroup({ label, options, value, onChange }) {
  return (
    <div className="row">
      <span className={styles.filterLabel}>{label}</span>
      <div className="chips">
        {options.map(([v, text]) => (
          <button key={v} type="button" className={value === v ? 'chip on' : 'chip'} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

// 폼 아래: 템플릿 확률 조정(인생) · 사건 설명(역사) · 선택지
function EventExtra({ d, resultActions, onSaved }) {
  return (
    <div className="col">
      {d.template && <TemplateCard key={d.template.templateId} template={d.template} onSaved={onSaved} />}

      {d.info?.histTitle && (
        <details className={styles.desc}>
          <summary>사건: {d.info.histTitle} ({d.info.countryCode} {d.info.startYear}~{d.info.endYear})</summary>
          <p>{d.description ?? '설명 없음'}</p>
        </details>
      )}

      <ChoiceEditor
        eventId={d.event.eventId}
        isChoice={d.event.isChoice}
        choices={d.choices}
        resultActions={resultActions}
        onSaved={onSaved}
      />
    </div>
  );
}

function AdminEvents() {
  const [filter, setFilter] = useState({ type: '', reviewed: '', aiNarrate: '', keyword: '' });
  const [keywordInput, setKeywordInput] = useState(''); // 입력 중인 검색어 (Enter·검색 버튼 때 filter 에 반영)
  const [rows, setRows] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [creating, setCreating] = useState(false); // 새 이벤트 등록 중인지
  const [templates, setTemplates] = useState([]);  // 템플릿 목록 (폼 드롭다운)
  const [resultActions, setResultActions] = useState([]); // 결과 동작 목록 (선택지 드롭다운)
  const [reload, setReload] = useState(0);         // 숫자가 바뀌면 목록·상세를 다시 불러옴 (저장 후 사용)
  const [error, setError] = useState('');

  // 처음 한 번: 템플릿 목록, 결과 동작 목록
  useEffect(() => {
    client.get('/api/admin/templates')
      .then((res) => setTemplates(res.data))
      .catch((err) => setError(errMsg(err, '템플릿 목록을 불러오지 못했어요.')));
    client.get('/api/admin/result-actions')
      .then((res) => setResultActions(res.data))
      .catch((err) => setError(errMsg(err, '결과 동작 목록을 불러오지 못했어요.')));
  }, []);

  // 필터가 바뀌거나 저장하면 목록 다시 불러오기 (빈 값은 서버가 조건 없음으로 처리)
  useEffect(() => {
    client.get('/api/admin/events', { params: filter })
      .then((res) => setRows(res.data))
      .catch((err) => setError(errMsg(err, '목록을 불러오지 못했어요.')));
  }, [filter, reload]);

  // 고른 이벤트가 바뀌거나 저장하면 상세 다시 불러오기
  useEffect(() => {
    if (!selectedId) return;
    client.get(`/api/admin/events/${selectedId}`)
      .then((res) => setDetail(res.data))
      .catch((err) => setError(errMsg(err, '상세를 불러오지 못했어요.')));
  }, [selectedId, reload]);

  const changeFilter = (key, value) => setFilter((prev) => ({ ...prev, [key]: value }));

  const search = (e) => {
    e.preventDefault();
    changeFilter('keyword', keywordInput.trim());
  };

  const selectRow = (id) => {
    setCreating(false);
    setSelectedId(id);
  };

  const startCreate = () => {
    setCreating(true);
    setSelectedId(null);
    setDetail(null);
  };

  // 저장 끝: 목록·상세 다시 불러오기 (등록이면 새 이벤트를 열기)
  const afterSave = (eventId) => {
    if (creating) {
      setCreating(false);
      setSelectedId(eventId);
    }
    setReload((n) => n + 1);
  };

  // AI 서술 켜기·끄기 → 목록 줄과 (열려 있으면) 상세도 같이 바꿈
  const toggleAi = (row) => {
    const value = row.aiNarrate === 'Y' ? 'N' : 'Y';
    client.put(`/api/admin/events/${row.eventId}/ai-narrate`, null, { params: { value } })
      .then(() => {
        setRows((prev) => prev.map((r) => (r.eventId === row.eventId ? { ...r, aiNarrate: value } : r)));
        if (detail?.event.eventId === row.eventId) {
          setDetail((prev) => ({ ...prev, event: { ...prev.event, aiNarrate: value } }));
        }
      })
      .catch((err) => setError(errMsg(err, 'AI 서술을 바꾸지 못했어요.')));
  };

  let detailTitle = '상세';
  if (creating) detailTitle = '새 이벤트';
  else if (detail) detailTitle = `${detail.event.title} (${detail.event.eventId})`;

  return (
    <div className="page col">
      <AdminNav />
      <h1>이벤트 관리</h1>
      {error && <p className={styles.error} onClick={() => setError('')}>{error} (눌러서 닫기)</p>}

      <div className={styles.layout}>
        {/* 왼쪽: 목록 */}
        <Panel title={`이벤트 ${rows.length}건`} right={<Button type="primary" size="sm" onClick={startCreate}>+ 새 이벤트</Button>}>
          <div className="col">
            <ChipGroup label="유형" options={TYPES} value={filter.type} onChange={(v) => changeFilter('type', v)} />
            <ChipGroup label="검수" options={REVIEWED} value={filter.reviewed} onChange={(v) => changeFilter('reviewed', v)} />
            <ChipGroup label="AI" options={AI} value={filter.aiNarrate} onChange={(v) => changeFilter('aiNarrate', v)} />
            <form className="row" onSubmit={search}>
              <input
                className={'input ' + styles.search}
                placeholder="ID·제목·문구·사건 이름 검색"
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
              />
              <Button size="sm" onClick={search}>검색</Button>
            </form>
          </div>

          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>제목</th>
                  <th>템플릿·사건</th>
                  <th>선택지</th>
                  <th>검수</th>
                  <th>AI 서술</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.eventId} className={r.eventId === selectedId ? styles.on : ''} onClick={() => selectRow(r.eventId)}>
                    <td className={styles.id}>{r.eventId}</td>
                    <td>{r.title}</td>
                    <td className="sub">
                      {r.eventType === 'LIFE' ? r.templateName : `${r.countryCode} ${r.startYear}~${r.endYear}`}
                    </td>
                    <td>{r.isChoice === 'Y' ? `${r.choiceCount}개` : '-'}</td>
                    <td>{r.isReviewed === 'Y' ? <Badge color="green">완료</Badge> : <Badge color="yellow">미검수</Badge>}</td>
                    <td>
                      <button
                        type="button"
                        className={(r.aiNarrate === 'Y' ? 'chip on ' : 'chip ') + styles.aiChip}
                        title={r.isChoice === 'Y' ? '선택 이벤트는 선택지가 열릴 때 AI 서술을 하지 않아요.' : ''}
                        onClick={(e) => {
                          e.stopPropagation(); // 줄 클릭(상세 열기)까지 같이 되지 않게
                          toggleAi(r);
                        }}
                      >
                        {r.aiNarrate === 'Y' ? '켜짐' : '꺼짐'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && <p className="sub">조건에 맞는 이벤트가 없어요.</p>}
          </div>
        </Panel>

        {/* 오른쪽: 등록 폼 / 수정 폼 + 템플릿·사건·선택지 */}
        <Panel title={detailTitle} className={styles.detail}>
          {creating && (
            <EventForm
              key="new"
              initial={EMPTY_EVENT}
              isNew
              templates={templates}
              onSaved={afterSave}
              onCancel={() => setCreating(false)}
            />
          )}
          {!creating && detail && (
            <div className="col">
              {/* key 에 aiNarrate 포함: 목록에서 AI 를 토글하면 폼도 새 값으로 다시 열림 (예전 값으로 덮어쓰기 방지) */}
              <EventForm
                key={detail.event.eventId + detail.event.aiNarrate}
                initial={detail.event}
                templates={templates}
                onSaved={afterSave}
              />
              <EventExtra d={detail} resultActions={resultActions} onSaved={() => setReload((n) => n + 1)} />
            </div>
          )}
          {!creating && !detail && <p className="sub">왼쪽 목록에서 이벤트를 고르거나 + 새 이벤트를 누르세요.</p>}
        </Panel>
      </div>
    </div>
  );
}

export default AdminEvents;