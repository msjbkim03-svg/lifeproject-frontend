// A03 이벤트 등록·수정 폼 (AdminEvents 오른쪽)
// 등록: POST /api/admin/events  /  수정: PUT /api/admin/events/{id} (전체 덮어쓰기라 모든 칸을 보냄)
// ※ 공통 Button 은 type="button" 고정이라 저장은 onClick 으로 처리 (HTML required 도 안 걸림 → 서버가 검사)
import { useState } from 'react';
import client from '../../api/api';
import Button from '../../common/ui/Button';
import { errMsg } from './adminUtil';
import styles from './AdminEvents.module.css';

// 숫자로 보낼 칸 (빈칸은 null)
const NUM_FIELDS = ['effectScale', 'intensity', 'minAge', 'maxAge', 'minWealth', 'maxWealth', 'probability', 'effWealthRate'];

// 새 이벤트 기본값 (서버 등록 기본값과 같게)
export const EMPTY_EVENT = {
  eventId: '', eventType: 'LIFE', templateId: '', varValue: '', title: '', baseText: '',
  histEventId: '', histTypeCode: '', intensity: '',
  minAge: '', maxAge: '', gender: '', minWealth: '', maxWealth: '',
  requiredExpId: '', excludedExpId: '', isOnce: 'N',
  effectScale: '1', probability: '', effWealthRate: '',
  isChoice: 'N', aiNarrate: 'N', isReviewed: 'Y',
};

// 서버 값 → 입력칸 값 (null 은 빈칸, 숫자는 글자로)
function toForm(e) {
  return Object.fromEntries(Object.entries(e).map(([k, v]) => [k, v == null ? '' : String(v)]));
}

// 입력칸 값 → 서버로 보낼 값 (빈칸은 null, 숫자 칸은 Number)
function toBody(f) {
  const body = {};
  for (const [k, v] of Object.entries(f)) {
    if (v === '') body[k] = null;
    else body[k] = NUM_FIELDS.includes(k) ? Number(v) : v;
  }
  return body;
}

// 이름표 + 입력칸 한 칸 (wide: 한 줄 전체)
export function Field({ label, hint, wide, children }) {
  return (
    <label className={wide ? `${styles.field} ${styles.wide}` : styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      {hint && <small className="sub">{hint}</small>}
    </label>
  );
}

function YN({ value, onChange }) {
  return (
    <select className="input" value={value} onChange={onChange}>
      <option value="Y">Y</option>
      <option value="N">N</option>
    </select>
  );
}

function EventForm({ initial, isNew, templates, onSaved, onCancel }) {
  const [f, setF] = useState(() => toForm(initial)); // 처음 한 번만 복사 (다른 이벤트는 key 로 새로 열림)
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  // set('title') → 제목 칸이 바뀔 때 f.title 만 바꾸는 함수
  const set = (key) => (e) => {
    setF((prev) => ({ ...prev, [key]: e.target.value }));
    setMsg('');
  };

  const isLife = f.eventType === 'LIFE';

  const submit = () => {
    setSaving(true);
    setErr('');
    setMsg('');
    const body = toBody(f);
    const req = isNew
      ? client.post('/api/admin/events', body)
      : client.put(`/api/admin/events/${f.eventId}`, body);
    req
      .then((res) => {
        setMsg(isNew ? '등록했어요.' : '저장했어요.');
        onSaved(res.data.eventId);
      })
      .catch((e) => setErr(errMsg(e, '저장하지 못했어요.')))
      .finally(() => setSaving(false));
  };

  return (
    <div className={styles.form}>
      <div className={styles.section}>기본</div>
      <div className={styles.grid}>
        <Field label="이벤트 ID" hint={isNew ? '영문 대문자·숫자·_ (예: LE_TEST_1)' : '바꿀 수 없어요'}>
          <input className="input" value={f.eventId} onChange={set('eventId')} disabled={!isNew} />
        </Field>
        <Field label="유형">
          <select className="input" value={f.eventType} onChange={set('eventType')} disabled={!isNew}>
            <option value="LIFE">인생 (LIFE)</option>
            <option value="HIST">역사 (HIST)</option>
          </select>
        </Field>
        <Field label="제목" wide>
          <input className="input" value={f.title} onChange={set('title')} />
        </Field>
        <Field
          label="기본 문구"
          wide
          hint={isLife ? '인생 이벤트는 비워 두면 템플릿 문장을 써요.' : '자리 표시: {연도} {이름} {나이} {나라}'}
        >
          <textarea className={'input ' + styles.textarea} rows={3} value={f.baseText} onChange={set('baseText')} />
        </Field>
      </div>

      <div className={styles.section}>{isLife ? '템플릿' : '역사 사건'}</div>
      <div className={styles.grid}>
        {isLife ? (
          <>
            <Field label="템플릿" wide>
              <select className="input" value={f.templateId} onChange={set('templateId')}>
                <option value="">선택</option>
                {templates.map((t) => (
                  <option key={t.templateId} value={t.templateId}>
                    {t.templateName} ({t.templateId})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="변수 값" wide hint="템플릿 문장의 {변수} 자리에 들어가요.">
              <input className="input" value={f.varValue} onChange={set('varValue')} />
            </Field>
          </>
        ) : (
          <>
            <Field label="역사 사건 ID">
              <input className="input" value={f.histEventId} onChange={set('histEventId')} />
            </Field>
            <Field label="사건 유형 코드">
              <input className="input" value={f.histTypeCode} onChange={set('histTypeCode')} />
            </Field>
            <Field label="강도">
              <select className="input" value={f.intensity} onChange={set('intensity')}>
                <option value="">선택</option>
                <option value="1">1</option>
                <option value="2">2</option>
                <option value="3">3</option>
              </select>
            </Field>
          </>
        )}
      </div>

      <div className={styles.section}>조건</div>
      <div className={styles.grid}>
        <Field label="최소 나이" hint={isLife ? '빈칸 = 템플릿 나이' : '빈칸 = 0'}>
          <input className="input" type="number" min="0" max="120" value={f.minAge} onChange={set('minAge')} />
        </Field>
        <Field label="최대 나이" hint={isLife ? '빈칸 = 템플릿 나이' : '빈칸 = 110'}>
          <input className="input" type="number" min="0" max="120" value={f.maxAge} onChange={set('maxAge')} />
        </Field>
        <Field label="성별">
          <select className="input" value={f.gender} onChange={set('gender')}>
            <option value="">무관</option>
            <option value="M">남 (M)</option>
            <option value="F">여 (F)</option>
          </select>
        </Field>
        <Field label="최소 가정형편">
          <select className="input" value={f.minWealth} onChange={set('minWealth')}>
            <option value="">무관</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="최대 가정형편">
          <select className="input" value={f.maxWealth} onChange={set('maxWealth')}>
            <option value="">무관</option>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </Field>
        <Field label="한 번만">
          <YN value={f.isOnce} onChange={set('isOnce')} />
        </Field>
        <Field label="필요 경험 ID" hint="이 경험이 있어야 발생">
          <input className="input" value={f.requiredExpId} onChange={set('requiredExpId')} />
        </Field>
        <Field label="제외 경험 ID" hint="이 경험이 있으면 발생 안 함">
          <input className="input" value={f.excludedExpId} onChange={set('excludedExpId')} />
        </Field>
      </div>

      <div className={styles.section}>효과·확률</div>
      <div className={styles.grid}>
        <Field label="효과 배율" hint="0~99.99">
          <input className="input" type="number" step="0.01" value={f.effectScale} onChange={set('effectScale')} />
        </Field>
        <Field label="확률" hint="0~1">
          <input className="input" type="number" step="0.00001" value={f.probability} onChange={set('probability')} />
        </Field>
        <Field label="재산 변화율" hint="예: -0.2 = 20% 감소">
          <input className="input" type="number" step="0.01" value={f.effWealthRate} onChange={set('effWealthRate')} />
        </Field>
      </div>

      <div className={styles.section}>상태</div>
      <div className={styles.grid}>
        <Field label="선택 이벤트">
          <YN value={f.isChoice} onChange={set('isChoice')} />
        </Field>
        <Field label="AI 서술">
          <YN value={f.aiNarrate} onChange={set('aiNarrate')} />
        </Field>
        <Field label="검수 완료">
          <YN value={f.isReviewed} onChange={set('isReviewed')} />
        </Field>
      </div>

      {err && <p className={styles.error}>{err}</p>}
      {msg && <p className={styles.ok}>{msg}</p>}

      <div className="row">
        <Button type="primary" size="sm" onClick={submit} disabled={saving}>
          {saving ? '저장 중…' : isNew ? '등록' : '저장'}
        </Button>
        {isNew && <Button size="sm" onClick={onCancel}>취소</Button>}
      </div>
    </div>
  );
}

export default EventForm;