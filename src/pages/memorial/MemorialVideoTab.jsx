import { useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import Badge from "../../common/ui/Badge";
import EndingFilm from "../../engine/film/EndingFilm";
import MemorialScene from "./MemorialScene";
import MemorialSlot from "./MemorialSlot";
import { posterScene } from "./memorialFilm";
import s from "./MemorialRoom.module.css";

// 영상 탭  주소: /memorial/:lifeId/video
// 팀원이 만든 엔딩 영상(C22 EndingFilm)을 그대로 틀어 줌 (재료는 방 화면이 받은 film)
//   포스터는 영상 첫 장면(태어난 방) 그림, 누르면 영상이 화면 가득 재생
function MemorialVideoTab() {
  const { room, film, plan } = useOutletContext();
  const [open, setOpen] = useState(false);

  // 엔딩 영상에 넘길 재료 (입은 옷 포함)
  const filmData = useMemo(() => (film ? { ...film.film, wear: film.wear } : null), [film]);
  const poster = film ? posterScene(plan, film.wear) : null;

  return (
    <div className={s.videoCard}>
      {film ? (
        <button type="button" className={s.poster} onClick={() => setOpen(true)} aria-label="영상 보기">
          {poster && <MemorialScene v={poster} className={s.fill} />}
          <span className={s.play}>▶ 영상 보기</span>
        </button>
      ) : (
        <MemorialSlot label={film === null ? "영상을 불러오는 중…" : "영상을 불러오지 못했어요"} className={s.videoSlot} />
      )}
      <div className={s.videoText}>
        <Badge color="gold">영상</Badge>
        <h3 className={s.videoTitle}>마지막 순간</h3>
        <p className={s.muted}>{room.name} · {room.birthYear} – {room.deathYear}</p>
        <p className={s.muted}>삶이 끝날 때 스쳐 간 장면들과 마지막 길이에요.</p>
      </div>

      {open && (
        <EndingFilm lifeId={room.lifeId} result={film.result} filmData={filmData} onClose={() => setOpen(false)} />
      )}
    </div>
  );
}

export default MemorialVideoTab;
