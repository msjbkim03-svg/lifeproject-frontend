// 실시간 목록 (방금 시작된 인생, 방금 끝난 인생)
// 예: <FeedList items={[{ id: 1, time: '방금', flag: 'bd', title: '방글라데시 1984년', sub: '여자아이', side: <Spoon level={2} />, fresh: true }]} />
// time: 왼쪽 강조색 글자(없으면 생략), flag: 국기 2글자 코드(flagcdn, 없으면 생략), title: 굵은 줄, sub: 그 아래 설명
// side: 오른쪽 자리 - 글자면 \n 으로 줄바꿈, 그림 · 태그 같은 화면 조각(JSX)도 그대로 받음
// fresh: 새로 들어온 줄이면 true → 위에서 미끄러져 들어오고 잠깐 깜빡임 (id가 같으면 다시 안 깜빡임)
import './ui.css';

function FeedList({ items }) {
  return (
    <ul className="feed" aria-live="polite">
      {items.map((it) => (
        <li key={it.id} className={it.fresh ? 'fresh' : undefined}>
          {it.time && <span className="feed-time">{it.time}</span>}
          <span className="feed-main">
            <b>
              {it.flag && <img className="feed-flag" src={`https://flagcdn.com/w40/${it.flag}.png`} alt="" width={18} height={12} loading="lazy" />}
              {it.title}
            </b>
            {it.sub && <span className="feed-sub" title={typeof it.sub === 'string' ? it.sub : undefined}>{it.sub}</span>}
          </span>
          {it.side != null && it.side !== '' && (
            <span className="feed-side">
              {typeof it.side === 'string'
                ? it.side.split('\n').map((line, i) => <span key={i}>{i > 0 && <br />}{line}</span>)
                : it.side}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export default FeedList;
