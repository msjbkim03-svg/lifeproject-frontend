import { useMemo } from "react";
import { Link, useOutletContext } from "react-router-dom";
import LogItem from "../../common/ui/LogItem";
import MemorialScene from "./MemorialScene";
import MemorialSlot from "./MemorialSlot";
import { filmPhotos, roomScene } from "./memorialFilm";
import MemorialCommentList from "./MemorialCommentList";
import s from "./MemorialRoom.module.css";

// 방 탭  주소: /memorial/:lifeId
// 픽셀 방 + 삶이 남긴 것 + 이 삶이 만난 길(큰 사건) + 사진첩·방명록 미리보기
// 방 = 엔딩 영상(C22)의 마지막 해 집 장면을 계속 돌림 / 사진 = 사진첩과 같은 영상 장면 앞 3장
function MemorialRoomTab() {
  const { room, base, film, plan } = useOutletContext();
  const home = useMemo(() => roomScene(plan, film?.wear), [plan, film]);
  const photos = useMemo(() => filmPhotos(plan, film?.wear, room.photos).slice(0, 3), [plan, film, room.photos]);

  return (
    <>
      {home ? (
        <MemorialScene v={home} live />
      ) : (
        <MemorialSlot label={film === null ? "방을 꾸미는 중…" : "방 그림을 불러오지 못했어요"} className={s.roomSlot} />
      )}
      {room.leftThings.length > 0 && (
        <p className={s.muted}>삶이 남긴 것: {room.leftThings.join(", ")}</p>
      )}

      <section className={s.section}>
        <h3 className={s.secTitle}>이 삶이 만난 길</h3>
        {room.events.length === 0 ? (
          <p className={s.muted}>기록된 큰 사건이 없어요.</p>
        ) : (
          room.events.map((e, i) => (
            <LogItem
              key={i}
              big
              age={e.age}
              year={e.year}
              text={e.text}
            />
          ))
        )}
      </section>

      <section className={s.section}>
        <div className={s.secHead}>
          <h3 className={s.secTitle}>사진첩</h3>
          <Link to={`${base}/album`}>모두 보기 ›</Link>
        </div>
        <div className={s.photoRow}>
          {photos.map((p, i) => (
            <figure key={i} className={s.photo}>
              {p.v ? <MemorialScene v={p.v} /> : <MemorialSlot label="사진" className={s.photoSlot} />}
              <figcaption><b>{p.age}세</b> {p.text}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className={s.section}>
        <div className={s.secHead}>
          <h3 className={s.secTitle}>방명록</h3>
          <Link to={`${base}/guest`}>모두 보기 ›</Link>
        </div>
        <MemorialCommentList list={room.comments.slice(0, 3)} />
      </section>
    </>
  );
}

export default MemorialRoomTab;
