import { useOutletContext } from "react-router-dom";
import MemorialSlot from "./MemorialSlot";
import s from "./MemorialRoom.module.css";

// 마지막 순간 탭  주소: /memorial/:lifeId/last
// 픽셀 장면(빈 칸) + 장례 설명 + 묘비판 + 마지막 문장
function MemorialLastTab() {
  const { room } = useOutletContext();
  const days = Math.round(room.deathAge * 365.25); // 산 날 수 (대략)

  return (
    <>
      <MemorialSlot label="마지막 순간 (픽셀 장면 자리)" className={s.lastSlot} />
      {room.last.scene && <p className={s.lastText}>{room.last.scene}</p>}
      {room.last.mourners && <p className={s.muted}>{room.last.mourners}</p>}

      {/* 묘비판 */}
      <div className={s.plaque}>
        <h2>{room.name}</h2>
        <p className={s.plaqueYears}>{room.birthYear} – {room.deathYear}</p>
        <p>{room.birthCountryName}에서 태어나 {room.deathCountryName}에서 잠들었어요.</p>
        <p>{room.deathAge}년, 날로 치면 약 {days.toLocaleString()}일을 살았어요.</p>
        {(room.last.lines ?? []).map((l, i) => <p key={i}>{l}</p>)}
        {room.message && <p className={s.plaqueMsg}>“{room.message}”</p>}
      </div>

      <p className={s.ending}>80억 명 가운데 오직 한 번, 이 사람으로 산 삶이었어요.</p>
    </>
  );
}

export default MemorialLastTab;
