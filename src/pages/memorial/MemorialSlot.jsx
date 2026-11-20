import s from './MemorialRoom.module.css';

// 나중에 픽셀 화면(방·영상·사진·마지막 순간)을 끌어다 붙일 빈 칸
// 예: <MemorialSlot label="방" className={s.roomSlot} />
function MemorialSlot({ label, className = '' }) {
  return (
    <div className={`${s.slot} ${className}`}>
      <span>{label}</span>
    </div>
  );
}

export default MemorialSlot;
