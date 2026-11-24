import { useEffect, useState } from "react";
import FilmScene from "../../engine/film/FilmScene";
import "../../engine/film/film.css";
import s from "./MemorialRoom.module.css";

// 엔딩 영상(C22) 장면 하나를 추모관 칸에 그림 (팀원 FilmScene 을 불러 쓰기만)
//   still: 멈춘 그림이면 장면 시작 몇 ms 뒤 모습 (같은 시간 = 언제나 같은 그림 → 영상 캡처와 같음)
//   live:  true 면 장면을 계속 돌림 (방 탭: 픽셀 캐릭터가 움직이는 자리)
// 예: <MemorialScene v={장면} live className={s.roomScene} />
const STILL_MS = 1500;
const LOOP_MS = 5000; // 장면 하나 길이쯤 돌고 처음으로
const FPS = 15;

function MemorialScene({ v, still = STILL_MS, live = false, className = "" }) {
  const [t, setT] = useState(still);

  useEffect(() => {
    if (!live) return;
    const start = performance.now();
    const id = setInterval(() => setT(still + ((performance.now() - start) % LOOP_MS)), 1000 / FPS);
    return () => clearInterval(id);
  }, [live, still]);

  return (
    <div className={`${s.scene} ${className}`}>
      <FilmScene v={v} t={live ? t : still} />
    </div>
  );
}

export default MemorialScene;
