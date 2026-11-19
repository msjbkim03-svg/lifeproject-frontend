// C06-3 돈 쓰기 · 투자 창 (원작 '돈 쓰기 · 투자') - 살림 패널의 단추로 열어요
//   GET  /api/engine/shop    목록 (물건 사기 · 돈 쓰기 · 여유 자금 굴리기)
//   POST /api/engine/shop    { itemId, atAge }      사기·하기 → 돈·능력치·기록 문장
//   POST /api/engine/invest  { investType, atAge }  여유 자금 굴리기 방식 바꾸기
// - 여는 동안 시간은 멈춰요 (진행 화면이 running 을 끔)
// - 그해를 서버에 요청하는 중이면 끝날 때까지 기다렸다가 보냄 (waitIdle) - 같은 인생 줄을 동시에 고치지 않게
// 사용법: {shopOpen && <ShopSheet life={life} age={화면 나이} guestToken={…} waitIdle={async () => …}
//            onDone={(dto) => 돈·능력치 반영 + 기록} onClose={() => …} />}
//   열 때마다 새로 만들어서(조건부 렌더링) 목록을 처음부터 불러와요
import { useCallback, useEffect, useState } from 'react';
import client from '../../api/api';
import { won } from './lifeText';
import '../../common/ui/ui.css'; // 창 바탕(.dec-back)·머리(.dec-hd)·등장 움직임

const errText = (err) => {
  const msg = err.response?.data;
  if (typeof msg === 'string' && msg) return msg;
  return err.response ? '서버에서 오류가 났어요.' : '서버에 연결할 수 없어요.';
};

function ShopSheet({ open = true, life, age, guestToken, waitIdle, onDone, onClose }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const res = await client.get('/api/engine/shop', { params: { lifeId: life.lifeId, guestToken } });
      setData(res.data);
      setMsg('');
    } catch (err) {
      setMsg(errText(err));
    }
  }, [life?.lifeId, guestToken]);

  // 열리면 목록 불러오기 (load 는 서버 응답을 기다린 뒤에 상태를 바꿈)
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // Esc 로 닫기
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const k = data?.krwPerUsd ?? life.krwPerUsd;

  const send = async (url, body) => {
    if (busy) return;
    setBusy(true);
    try {
      await waitIdle();
      const res = await client.post(url, { lifeId: life.lifeId, guestToken, atAge: age, ...body });
      setData(res.data);
      setMsg(res.data.message || '');
      onDone(res.data);
    } catch (err) {
      setMsg(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const items = data?.items || [];
  const dos = items.filter((x) => x.kind === 'DO');
  const buys = items.filter((x) => x.kind === 'BUY');
  const row = (x, verb) => (
    <li key={x.id} className={'shop-row' + (x.done ? ' done' : '') + (x.ok ? '' : ' off')}>
      <div className="shop-nm">
        <b>{x.name}</b>
        <small>{x.desc}</small>
      </div>
      <span className="shop-pr">{won(x.price, k)}</span>
      {x.ok ? (
        <button type="button" className="shop-b" disabled={busy} onClick={() => send('/api/engine/shop', { itemId: x.id })}>{verb}</button>
      ) : (
        <span className="shop-why">{x.why}</span>
      )}
    </li>
  );

  return (
    <div className="dec-back" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="shop" role="dialog" aria-modal="true" aria-labelledby="shopTitle">
        <div className="dec-hd">
          <span>돈 쓰기 · 투자</span>
          <span>{age}세 · {life.birthYear + age}년</span>
        </div>
        <div className="shop-bd">
          <h2 id="shopTitle" className="shop-title">
            {data ? (data.assets < 0 ? `빚 ${won(-data.assets, k)}` : `모은 돈 ${won(data.cash, k)}`) : '불러오는 중…'}
          </h2>
          <p className="shop-sub">한국 물가로 환산한 금액이에요. 쓰는 만큼 행복·관계·건강·지식이 바뀌어요. 고르는 동안 시간은 멈춰 있어요.</p>
          {msg && <p className="shop-msg" role="status">{msg}</p>}

          {data && (
            <>
              {dos.length > 0 && (
                <section>
                  <h3>돈 쓰기 <small>한 해에 한 번씩</small></h3>
                  <ul className="shop-list">{dos.map((x) => row(x, '하기'))}</ul>
                </section>
              )}
              {buys.length > 0 && (
                <section>
                  <h3>물건 사기</h3>
                  <ul className="shop-list">{buys.map((x) => row(x, '사기'))}</ul>
                </section>
              )}
              <section>
                <h3>여유 자금 굴리기 <small>해마다 모은 돈에 수익·손실이 붙어요</small></h3>
                <ul className="shop-list">
                  {(data.invests || []).map((x) => (
                    <li key={x.id} className={'shop-row inv' + (x.done ? ' done' : '') + (x.ok ? '' : ' off')}>
                      <div className="shop-nm">
                        <b>{x.name}</b>
                        <small>{x.ok ? x.desc : x.why}</small>
                      </div>
                      {x.done ? <span className="shop-now">지금</span> : (
                        <button type="button" className="shop-b ghost" disabled={busy || !x.ok}
                          onClick={() => send('/api/engine/invest', { investType: x.id.slice(4) })}>맡기기</button>
                      )}
                    </li>
                  ))}
                </ul>
              </section>
            </>
          )}
          <div className="dec-foot">
            <button type="button" className="shop-b ghost" onClick={onClose}>닫기</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ShopSheet;
