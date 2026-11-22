import { Link, useOutletContext } from "react-router-dom";
import LogItem from "../../common/ui/LogItem";
import MemorialSlot from "./MemorialSlot";
import MemorialCommentList from "./MemorialCommentList";
import s from "./MemorialRoom.module.css";

// 방 탭  주소: /memorial/:lifeId
// 픽셀 방(빈 칸) + 삶이 남긴 것 + 이 삶이 만난 세상(큰 사건 3개) + 사진첩·방명록 미리보기
function MemorialRoomTab() {
  const { room, base } = useOutletContext();

  return (
    <>
      <MemorialSlot label="방 (픽셀 캐릭터가 움직이는 자리)" className={s.roomSlot} />
      {room.leftThings.length > 0 && (
        <p className={s.muted}>삶이 남긴 것: {room.leftThings.join(", ")}</p>
      )}

      <section className={s.section}>
        <h3 className={s.secTitle}>이 삶이 만난 세상</h3>
        {room.events.length === 0 ? (
          <p className={s.muted}>기록된 큰 사건이 없어요.</p>
        ) : (
          room.events.map((e, i) => (
            <LogItem
              key={i}
              big
              age={e.age}
              year={e.year}
              text={<>{e.text}{e.source && <small className={s.source}> ({e.source})</small>}</>}
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
          {room.photos.slice(0, 3).map((p, i) => (
            <figure key={i} className={s.photo}>
              <MemorialSlot label="사진" className={s.photoSlot} />
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
