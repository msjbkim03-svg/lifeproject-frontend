import { useOutletContext } from "react-router-dom";
import MemorialFuneral from "./MemorialFuneral";
import MemorialScene from "./MemorialScene";
import { withWear } from "./memorialFilm";
import { funeralText } from "./memorialData";
import s from "./MemorialRoom.module.css";

// 마지막 순간 탭  주소: /memorial/:lifeId/last
// 장례 장면 그림(사진첩의 장례 사진과 같음) + 장례 문장(누가 배웅했는지) + 묘비판 + 마지막 문장
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
  const family = film?.film?.life?.family;
  const funeral = family ? funeralText(family) : null; // 영상 재료가 없으면 서버 글로 대신
  const fv = plan?.seg.find((x) => x.kind === "funeral")?.v;
  const funeralV = fv ? withWear(fv, film?.wear) : null;
  const days = Math.round(room.deathAge * 365.25); // 산 날 수 (대략)

  return (
    <>
      {/* 장례 그림 = 사진첩과 같은 영상 장례 장면 (가족 · 내 마지막 모습) (영상 재료가 없으면 빈소 그림) */}
      {funeralV ? (
        <MemorialScene v={funeralV} live />
      ) : (
        <MemorialFuneral gender={me.gender} age={me.age} costume={me.costume} />
      )}
      {funeral ? (
        <>
          <p className={s.lastText}>{funeral.title}</p>
          <p className={s.muted}>{funeral.people}</p>
        </>
      ) : (
        room.last.mourners && <p className={s.muted}>{room.last.mourners}</p>
      )}

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
