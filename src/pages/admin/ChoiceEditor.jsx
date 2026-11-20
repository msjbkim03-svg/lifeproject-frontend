// A03 선택지 수정·추가 (AdminEvents 오른쪽 아래)
// 수정: PUT /api/admin/choices/{choiceId}  (순서·이벤트는 서버가 바꾸지 않음)
// 추가: POST /api/admin/events/{eventId}/choices  (순서 빈칸 = 마지막 다음 번호)
import { useState } from 'react';
import client from '../../api/api';
import Button from '../../common/ui/Button';
import { Field } from './EventForm';
import { errMsg } from './adminUtil';
import styles from './AdminEvents.module.css';

// 숫자로 보낼 칸 (빈칸은 null)
const NUM_FIELDS = ['choiceOrder', 'effHealth', 'effHappiness', 'effKnowledge', 'effRelation',
  'effIncomeRate', 'effWealthRate', 'successRate'];

// 폼에서 다루는 칸 (새 선택지 기본값)
const EMPTY_CHOICE = {
  choiceOrder: '', choiceText: '', resultText: '',
  effHealth: '', effHappiness: '', effKnowledge: '', effRelation: '',
  effIncomeRate: '', effWealthRate: '', resultAction: '', migrateTo: '', successRate: '',
};

// 서버 값 → 입력칸 값 (폼 칸만, null 은 빈칸)
function toForm(c) {
  return Object.fromEntries(Object.keys(EMPTY_CHOICE).map((k) => [k, c[k] == null ? '' : String(c[k])]));
}

// 입력칸 값 → 서버로 보낼 값
function toBody(f) {
  const body = {};
  for (const [k, v] of Object.entries(f)) {
    if (v === '') body[k] = null;
    else body[k] = NUM_FIELDS.includes(k) ? Number(v) : v;
  }
  if (body.resultAction !== 'MIGRATE') body.migrateTo = null; // 이민 나라는 MIGRATE 일 때만 (서버 규칙)
  return body;
}

// 선택지 하나의 폼 (choice 가 없으면 새 선택지)
function ChoiceForm({ eventId, choice, resultActions, onSaved }) {
  const isNew = !choice;
  const [f, setF] = useState(() => toForm(choice ?? EMPTY_CHOICE));
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => {
    setF((prev) => ({ ...prev, [key]: e.target.value }));
    setMsg('');
  };

  const submit = () => {
    setSaving(true);
    setErr('');
    setMsg('');
    const body = toBody(f);
    const req = isNew
      ? client.post(`/api/admin/events/${eventId}/choices`, body)
      : client.put(`/api/admin/choices/${choice.choiceId}`, body);
    req
      .then((res) => {
        const text = isNew ? `${res.data.choiceOrder}번 선택지를 추가했어요.` : '저장했어요.';
        setMsg(text);
        onSaved(text);
      })
      .catch((e) => setErr(errMsg(e, '저장하지 못했어요.')))
      .finally(() => setSaving(false));
  };

  return (
    <div className={styles.form}>
      <div className={styles.grid}>
        {isNew && (
          <Field label="순서" hint="빈칸 = 마지막 다음 번호">
            <input className="input" type="number" min="1" max="99" value={f.choiceOrder} onChange={set('choiceOrder')} />
          </Field>
        )}
        <Field label="선택지 문구 (버튼)" wide>
          <input className="input" value={f.choiceText} onChange={set('choiceText')} />
        </Field>
        <Field label="결과 문구" wide hint="자리 표시: {연도} {이름} {나이} {나라}">
          <textarea className={'input ' + styles.textarea} rows={2} value={f.resultText} onChange={set('resultText')} />
        </Field>

        <Field label="건강" hint="-100~100">
          <input className="input" type="number" value={f.effHealth} onChange={set('effHealth')} />
        </Field>
        <Field label="행복" hint="-100~100">
          <input className="input" type="number" value={f.effHappiness} onChange={set('effHappiness')} />
        </Field>
        <Field label="지식" hint="-100~100">
          <input className="input" type="number" value={f.effKnowledge} onChange={set('effKnowledge')} />
        </Field>
        <Field label="관계" hint="-100~100">
          <input className="input" type="number" value={f.effRelation} onChange={set('effRelation')} />
        </Field>
        <Field label="소득 변화율" hint="예: -0.1 = 10% 감소">
          <input className="input" type="number" step="0.01" value={f.effIncomeRate} onChange={set('effIncomeRate')} />
        </Field>
        <Field label="재산 변화율" hint="예: -0.2 = 20% 감소">
          <input className="input" type="number" step="0.01" value={f.effWealthRate} onChange={set('effWealthRate')} />
        </Field>

        <Field label="결과 동작">
          <select className="input" value={f.resultAction} onChange={set('resultAction')}>
            <option value="">없음</option>
            {resultActions.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </Field>
        {f.resultAction === 'MIGRATE' && (
          <Field label="이민 나라 코드" hint="빈칸 = 목적지 5곳 중 고르기">
            <input className="input" maxLength={3} value={f.migrateTo} onChange={set('migrateTo')} />
          </Field>
        )}
        <Field label="성공 확률" hint="빈칸 = 성공·실패 없음 (게임 최대 0.95)">
          <input className="input" type="number" step="0.05" min="0" max="1" value={f.successRate} onChange={set('successRate')} />
        </Field>
      </div>

      {err && <p className={styles.error}>{err}</p>}
      {msg && <p className={styles.ok}>{msg}</p>}
      <div className="row">
        <Button type="primary" size="sm" onClick={submit} disabled={saving}>
          {saving ? '저장 중…' : isNew ? '추가' : '선택지 저장'}
        </Button>
      </div>
    </div>
  );
}

// 선택지 목록 (펼쳐서 수정) + 추가
function ChoiceEditor({ eventId, isChoice, choices, resultActions, onSaved }) {
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState('');

  return (
    <div className="col">
      <div className={styles.section}>선택지 {choices.length}개</div>
      <p className={'sub ' + styles.note}>
        순서는 바꿀 수 없어요. 경험 ID가 이벤트ID_순서라서 다른 이벤트의 조건이 이 번호를 가리킬 수 있어요.
      </p>

      {choices.map((c) => (
        <details key={c.choiceId} className={styles.choice}>
          <summary>
            <b>{c.choiceOrder}.</b> {c.choiceText}
            {c.resultAction && <span className="sub"> · {c.resultAction}</span>}
            {c.successRate != null && <span className="sub"> · 성공 {c.successRate}</span>}
          </summary>
          <ChoiceForm eventId={eventId} choice={c} resultActions={resultActions} onSaved={() => onSaved()} />
        </details>
      ))}

      {notice && <p className={styles.ok}>{notice}</p>}

      {isChoice !== 'Y' && (
        <p className={'sub ' + styles.note}>선택 이벤트(위 폼의 선택 이벤트 = Y)로 저장하면 선택지를 추가할 수 있어요.</p>
      )}
      {isChoice === 'Y' && !adding && (
        <Button size="sm" onClick={() => { setAdding(true); setNotice(''); }}>+ 선택지 추가</Button>
      )}
      {isChoice === 'Y' && adding && (
        <div className={styles.choice}>
          <ChoiceForm
            eventId={eventId}
            resultActions={resultActions}
            onSaved={(text) => {
              setNotice(text);
              setAdding(false); // 추가 폼 닫기 (다음에 열면 빈 폼)
              onSaved();
            }}
          />
          <Button size="sm" type="ghost" onClick={() => setAdding(false)}>닫기</Button>
        </div>
      )}
    </div>
  );
}

export default ChoiceEditor;