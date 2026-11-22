import { useOutletContext } from "react-router-dom";
import Badge from "../../common/ui/Badge";
import MemorialSlot from "./MemorialSlot";
import s from "./MemorialRoom.module.css";

// 영상 탭 (/video) 과 쿠키 영상 탭 (/cookie) 이 같이 씀
// 예: <MemorialVideoTab kind="cookie" />
// 영상 화면은 빈 칸 → 나중에 끌어다 붙일 자리
const VIDEOS = {
  last: { title: "마지막 순간", desc: "삶이 끝날 때 스쳐 간 장면들과 마지막 길이에요." },
  cookie: { title: "평범한 하루", desc: "이 삶의 어느 평범한 하루예요." },
};

function MemorialVideoTab({ kind }) {
  const { room } = useOutletContext();
  const v = VIDEOS[kind];

  return (
    <div className={s.videoCard}>
      <MemorialSlot label={`${v.title} 영상 자리`} className={s.videoSlot} />
      <div className={s.videoText}>
        <Badge color="gold">{kind === "cookie" ? "쿠키 영상" : "영상"}</Badge>
        <h3 className={s.videoTitle}>{v.title}</h3>
        <p className={s.muted}>{room.name} · {room.birthYear} – {room.deathYear}</p>
        <p className={s.muted}>{v.desc}</p>
      </div>
    </div>
  );
}

export default MemorialVideoTab;
