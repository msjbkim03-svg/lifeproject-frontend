import Figure from "../../engine/village/Figure";
import { lookOf } from "../../engine/village/costumeData";
import s from "./MemorialRoom.module.css";

// 추모관 초상 (영정 액자) - 방 왼쪽 카드 · 목록 카드가 같이 씀
// 마을 캐릭터 그림(Figure)을 세상을 떠난 나이의 모습 + 그 생에 입은 코스튬(C21)으로
// 예: <MemorialPortrait gender="F" age={82} costume={{ hair: "HAIR_02", top: null, hat: null }} />
function MemorialPortrait({ gender, age, costume, className = "" }) {
  return (
    <div className={`${s.portraitBox} ${className}`}>
      <Figure look={lookOf({ gender, age, costume })} />
    </div>
  );
}

export default MemorialPortrait;
