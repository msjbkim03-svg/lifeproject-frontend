import { useOutletContext } from "react-router-dom";
import MemorialFuneral from "./MemorialFuneral";
import s from "./MemorialRoom.module.css";

// 마지막 순간 탭  주소: /memorial/:lifeId/last
// 빈소 그림(영정 · 국화 단 · 관) + 장례 설명 + 묘비판 + 마지막 문장
function MemorialLastTab() {
  const { room, film, plan } = useOutletContext();
  // 영정 사진 = 엔딩 영상의 '마지막 장면'(death) 속 내 모습 그대로 (세상을 떠난 나이 · 성별 · 그 생에 입은 옷)
  // 영상 재료가 없으면 방 정보의 나이로 대신
  const last = plan?.seg.find((x) => x.kind === "death")?.v;
  const me = {
    gender: last?.gender ?? film?.film?.life?.gender,
    age: last?.age ?? room.deathAge,
    costume: film?.wear,
  };
  const days = Math.round(room.deathAge * 365.25); // 산 날 수 (대략)

  return (
    <>
      {/* 영정 속 모습 = 내 마지막 모습 (영상 마지막 장면 · 왼쪽 초상과 같은 사람) */}
      <MemorialFuneral gender={me.gender} age={me.age} costume={me.costume} />
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
