import { useState } from 'react';
import Button from '../../common/ui/Button';
import Panel from '../../common/ui/Panel';
import MemorialSlot from './MemorialSlot';
import s from './MemorialRoom.module.css';

const CANDLE_COUNT = 7;

// 추모관 왼쪽 카드: 초상(빈 칸) · 이름 · 생몰년 · 나라 · 한 줄 요약 · 행복 막대 · 촛불 (안 열린 내 방이면 열기 칸)
// 예: <MemorialSide room={room} onCandle={lightCandle} onOpen={openRoom} />
function MemorialSide({ room, onCandle, onOpen }) {
  const [message, setMessage] = useState('');
  const moved = room.birthCountry !== room.deathCountry;
  const lit = Math.min(room.tributeCount, CANDLE_COUNT);
  const maxHappy = Math.max(1, ...room.happiness);

  return (
    <Panel className={s.side}>
      <MemorialSlot label="초상 (픽셀 자리)" className={s.portrait} />

      <h2 className={s.name}>{room.name}</h2>
      <p className={s.mono}>{room.birthYear} – {room.deathYear} · {room.deathAge}세</p>
      <p className={s.country}>{moved ? `${room.birthCountry} → ${room.deathCountry}` : room.birthCountry}</p>

      {room.summary && <p className={s.summary}>{room.summary}</p>}
      <p className={s.born}>
        {moved
          ? `${room.birthCountry}에서 태어나 ${room.deathCountry}에서 잠들었어요.`
          : `${room.birthCountry}에서 태어나 그곳에서 잠들었어요.`}
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
          <Button type="primary" block disabled={!message.trim()} onClick={() => onOpen(message.trim())}>
            추모관 열기
          </Button>
        </div>
      )}

      {room.opened && (
        <div className={s.candleBox}>
          <div className={s.shelf}>
            {Array.from({ length: CANDLE_COUNT }, (_, i) => (
              <span key={i} className={`${s.candle} ${i < lit ? s.on : ''}`} style={{ height: 22 + ((i * 7) % 4) * 6 }} />
            ))}
          </div>
          <p>
            {room.tributeCount === 0
              ? '아직 아무도 촛불을 켜지 않았어요.'
              : `${room.tributeCount}명이 촛불을 켜 두었어요.`}
          </p>
          <Button type="primary" disabled={room.myCandle} onClick={onCandle}>
            {room.myCandle ? '촛불을 켰어요' : '촛불 켜기'}
          </Button>
        </div>
      )}
    </Panel>
  );
}

export default MemorialSide;
