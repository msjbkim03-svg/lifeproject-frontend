import { useOutletContext } from "react-router-dom";
import MemorialSlot from "./MemorialSlot";
import { groupName, groupRange } from "./memorialData";
import s from "./MemorialRoom.module.css";

// 사진첩 탭  주소: /memorial/:lifeId/album
// 사진을 나이대(어린 시절·10대·20대…)로 묶어서 보여 줌. 사진은 빈 칸 → 영상 캡처를 끌어다 붙일 자리
function MemorialAlbumTab() {
  const { room } = useOutletContext();

  // 1. 나이대별로 묶기
  const groups = [];
  room.photos.forEach((p) => {
    const name = groupName(p.age);
    let g = groups.find((x) => x.name === name);
    if (!g) {
      g = { name, list: [] };
      groups.push(g);
    }
    g.list.push(p);
  });

  if (groups.length === 0) return <p className={s.muted}>아직 사진이 없어요.</p>;

  // 2. 묶음마다 제목 줄 + 사진 2칸씩
  return groups.map((g) => (
    <section key={g.name} className={s.albumGroup}>
      <h3 className={s.albumHead}>
        {g.name} <small>{groupRange(g.name, room.birthYear, room.deathYear)}</small>
      </h3>
      <div className={s.albumGrid}>
        {g.list.map((p, i) => (
          <figure key={i} className={s.photo}>
            <MemorialSlot label="사진" className={s.albumSlot} />
            <figcaption>
              <b className={s.photoAge}>{p.age}세</b> <small className={s.mono}>{room.birthYear + p.age}</small>
              <p>{p.text}</p>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  ));
}

export default MemorialAlbumTab;

