import { useState } from "react";
import Button from "../../common/ui/Button";
import Panel from "../../common/ui/Panel";
import MemorialPortrait from "./MemorialPortrait";
import MemorialSlot from "./MemorialSlot";
import s from "./MemorialRoom.module.css";

const CANDLE_COUNT = 7;

// 추모관 왼쪽 카드: 초상 · 이름 · 생몰년 · 나라 · 한 줄 요약 · 행복 막대 · 촛불 (안 열린 내 방이면 열기 칸)
// 초상 = 마을 캐릭터 그림(Figure)을 세상을 떠난 나이의 모습 + 그 생에 입은 옷(C21)으로
// 예: <MemorialSide room={room} film={film} onCandle={lightCandle} onOpen={openRoom} />
function MemorialSide({ room, film, onCandle, onOpen, onCloseRoom }) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false); // 서버 처리 중 (연속 클릭 막기)
  const [askClose, setAskClose] = useState(false); // 추모관 닫기 확인

  // 열기·촛불 공통: 처리 중이면 무시 → 끝나면 다시 누를 수 있게
  const run = async (action) => {
    if (busy) return;
    setBusy(true);
    await action();
    setBusy(false);
  };
  const moved = room.birthCountryName !== room.deathCountryName;
  const lit = Math.min(room.tributeCount, CANDLE_COUNT);
  const maxHappy = Math.max(1, ...room.happiness);

  return (
    <Panel className={s.side}>
      {film === null ? (
        <MemorialSlot label="초상" className={s.portrait} />
      ) : (
        <MemorialPortrait gender={film?.film?.life?.gender} age={room.deathAge} costume={film?.wear} />
      )}

      <h2 className={s.name}>{room.name}</h2>
      <p className={s.mono}>{room.birthYear} – {room.deathYear} · {room.deathAge}세</p>
      <p className={s.country}>{moved ? `${room.birthCountryName} → ${room.deathCountryName}` : room.birthCountryName}</p>

      {room.summary && <p className={s.summary}>{room.summary}</p>}
      <p className={s.born}>
        {moved
          ? `${room.birthCountryName}에서 태어나 ${room.deathCountryName}에서 잠들었어요.`
          : `${room.birthCountryName}에서 태어나 그곳에서 잠들었어요.`}
      </p>

      {room.happiness.length > 0 && (
        <>
          <div className={s.bars}>
            {room.happiness.map((h, i) => (
              <i key={i} style={{ height: `${Math.max(8, (h / maxHappy) * 100)}%`, opacity: 0.35 + (h / maxHappy) * 0.65 }} />
            ))}
          </div>
          <p className={s.tiny}>해마다의 행복이에요. 높을수록 행복했던 해예요.</p>
        </>
      )}

      {!room.opened && room.mine && (
        <div className={s.openBox}>
          <p>아직 닫혀 있는 방이에요. 마지막 한마디를 남기고 추모관을 열어 주세요.</p>
          <input
            className="input"
            value={message}
            maxLength={100}
            placeholder="마지막 한마디 (100자)"
            onChange={(e) => setMessage(e.target.value)}
          />
          <Button type="primary" block disabled={busy || !message.trim()} onClick={() => run(() => onOpen(message.trim()))}>
            추모관 열기
          </Button>
        </div>
      )}

      {room.opened && (
        <div className={s.candleBox}>
          <div className={s.shelf}>
            {Array.from({ length: CANDLE_COUNT }, (_, i) => (
              <span key={i} className={`${s.candle} ${i < lit ? s.on : ""}`} style={{ height: 22 + ((i * 7) % 4) * 6 }} />
            ))}
          </div>
          <p>
            {room.tributeCount === 0
              ? "아직 아무도 촛불을 켜지 않았어요."
              : `${room.tributeCount}명이 촛불을 켜 두었어요.`}
            {room.viewCount != null && <><br /><small>👁 다녀간 사람 {room.viewCount.toLocaleString()}명</small></>}
          </p>
          <Button type="primary" disabled={busy || room.myCandle} onClick={() => run(onCandle)}>
            {room.myCandle ? "촛불을 켰어요" : "촛불 켜기"}
          </Button>
          {room.mine && onCloseRoom && (
            askClose ? (
              <div className={s.closeAsk}>
                <small>달린 방명록과 촛불도 함께 지워져요. 정말 닫을까요?</small>
                <div className="row" style={{ justifyContent: "center", gap: "var(--sp-1)" }}>
                  <Button size="sm" disabled={busy} onClick={() => setAskClose(false)}>취소</Button>
                  <Button size="sm" type="danger" disabled={busy} onClick={() => run(async () => { await onCloseRoom(); setAskClose(false); })}>
                    추모관 닫기
                  </Button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: "var(--sp-2)" }}>
                <Button size="sm" type="ghost" disabled={busy} onClick={() => setAskClose(true)}>
                  내 추모관 닫기
                </Button>
              </div>
            )
          )}
        </div>
      )}
    </Panel>
  );
}

export default MemorialSide;
