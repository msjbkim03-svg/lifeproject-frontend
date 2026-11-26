// A03 템플릿 확률 조정 (인생 이벤트 상세 아래)
// PUT /api/admin/templates/{templateId} → BASE_PROB·MIN_AGE·MAX_AGE 만 바뀜, 서버가 템플릿 캐시를 비움
// 확률 방식마다 BASE_PROB 를 쓰는 방법이 달라서 안내를 같이 보여줌 (EventService.calcProbability 기준)
import { useState } from 'react';
import client from '../../api/api';
import Button from '../../common/ui/Button';
import Field from './Field';
import { errMsg } from './adminUtil';
import styles from './AdminEvents.module.css';

const METHOD_HINT = {
  FIXED: '기본 확률이 그대로 매년 발생 확률이에요.',
  NET_MIGRATION: '기본 확률 × 나라 순이민률 배율(0.5~2.0배)이에요.',
  DEATH_CAUSE: '기본 확률 × 나이대 배율 × 나라 건강 배율(기대수명 기준)이에요.',
  TFR: '합계출산율 ÷ (최대 나이 − 30 + 1)로 계산해요. 기본 확률은 통계가 없을 때만 써요.',
  UNEMPLOYMENT: '실업률 ÷ 100 × 0.4로 계산해요. 기본 확률은 통계가 없을 때만 써요.',
  SPOUSE_DEATH: '엔진 생명표(배우자의 사망 확률)로 계산해요. 기본 확률은 쓰이지 않아요.',
};

function TemplateCard({ template, onSaved }) {
  const [f, setF] = useState({
    baseProb: template.baseProb == null ? '' : String(template.baseProb),
    minAge: template.minAge == null ? '' : String(template.minAge),
    maxAge: template.maxAge == null ? '' : String(template.maxAge),
  });
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  const set = (key) => (e) => {
    setF((prev) => ({ ...prev, [key]: e.target.value }));
    setMsg('');
  };

  const num = (v) => (v === '' ? null : Number(v));

  const submit = () => {
    setSaving(true);
    setErr('');
    setMsg('');
    const body = { ...template, baseProb: num(f.baseProb), minAge: num(f.minAge), maxAge: num(f.maxAge) };
    client.put(`/api/admin/templates/${template.templateId}`, body)
      .then(() => {
        setMsg('저장했어요. 내 서버는 바로 반영되고, 다른 팀원 서버는 재시작 후 반영돼요.');
        onSaved();
      })
      .catch((e) => setErr(errMsg(e, '저장하지 못했어요.')))
      .finally(() => setSaving(false));
  };

  return (
    <div className={styles.form}>
      <div className={styles.section}>
        템플릿 · {template.templateName} ({template.templateId})
      </div>
      <p className={'sub ' + styles.note}>
        확률 방식 <b>{template.probMethod}</b>: {METHOD_HINT[template.probMethod] ?? ''}
        <br />이 템플릿을 쓰는 모든 인생 이벤트에 적용되고, DB가 팀 공용이라 다른 팀원 게임에도 반영돼요.
      </p>
      <div className={styles.grid}>
        <Field label="기본 확률" hint="0~1, 소수점 5자리">
          <input
            className="input"
            type="number"
            step="0.0001"
            min="0"
            max="1"
            value={f.baseProb}
            onChange={set('baseProb')}
            disabled={template.probMethod === 'SPOUSE_DEATH'}
          />
        </Field>
        <Field label="최소 나이">
          <input className="input" type="number" min="0" max="120" value={f.minAge} onChange={set('minAge')} />
        </Field>
        <Field label="최대 나이">
          <input className="input" type="number" min="0" max="120" value={f.maxAge} onChange={set('maxAge')} />
        </Field>
      </div>
      {err && <p className={styles.error}>{err}</p>}
      {msg && <p className={styles.ok}>{msg}</p>}
      <div className="row">
        <Button type="primary" size="sm" onClick={submit} disabled={saving}>
          {saving ? '저장 중…' : '템플릿 저장'}
        </Button>
      </div>
    </div>
  );
}

export default TemplateCard;