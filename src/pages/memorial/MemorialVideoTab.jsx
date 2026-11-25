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
//   포스터는 영상 첫 장면(태어난 방) 그림, 누르면 포스터 자리에서 그대로(전체 화면 아님) 재생
function MemorialVideoTab() {
  const { room, film, plan } = useOutletContext();
  const [open, setOpen] = useState(false);

  // 엔딩 영상에 넘길 재료 (입은 옷 포함)
  const filmData = useMemo(() => (film ? { ...film.film, wear: film.wear } : null), [film]);
  const poster = film ? posterScene(plan, film.wear) : null;
  // 영상 순서표(plan)를 못 만들었으면 영상 버튼을 숨김
  // (엔딩 영상도 안에서 같은 순서표를 만들다 멈춰서 화면 전체가 하얗게 되는 것을 막음)
  const canPlay = !!film && !!plan;
  const slotLabel = film === null ? "영상을 불러오는 중…" : film === false ? "영상을 불러오지 못했어요" : "이 삶의 영상을 만들지 못했어요";

  return (
    <div>
      {canPlay ? (
        open ? (
          // 엔딩 영상(전체 화면용 틀)을 이 칸 폭에 맞춰 재생 (맞추는 CSS 는 MemorialRoom.module.css 의 .filmBox)
          <div className={s.filmBox}>
            <EndingFilm lifeId={room.lifeId} result={film.result} filmData={filmData} onClose={() => setOpen(false)} />
          </div>
        ) : (
          <button type="button" className={s.poster} onClick={() => setOpen(true)} aria-label="영상 보기">
            {poster && <MemorialScene v={poster} className={s.fill} />}
            <span className={s.play}>▶ 영상 보기</span>
          </button>
        )
      ) : (
        <MemorialSlot label={slotLabel} className={s.videoSlot} />
      )}
      <div className={s.videoText}>
        <Badge color="gold">영상</Badge>
        <h3 className={s.videoTitle}>이 삶의 영상</h3>
        <p className={s.muted}>{room.name} · {room.birthYear} – {room.deathYear}</p>
        <p className={s.muted}>삶이 끝날 때 스쳐 간 장면들과 마지막 길이에요.</p>
      </div>
    </div>
  );
}

export default MemorialVideoTab;
