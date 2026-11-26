// A03 관리자 폼 공통: 이름표 + 입력칸 한 칸 (wide: 한 줄 전체)
//   EventForm, ChoiceEditor, TemplateCard 에서 같이 씀
import styles from './AdminEvents.module.css';

function Field({ label, hint, wide, children }) {
  return (
    <label className={wide ? `${styles.field} ${styles.wide}` : styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      {hint && <small className="sub">{hint}</small>}
    </label>
  );
}

export default Field;