// C21 코스튬 상점: 진행 화면에서 열고, 여는 동안 시간은 멈춰요 (ShopSheet 와 같은 방식)
//   GET  /api/costumes?lifeId=&guestToken=        → { assets, wear: {hat, hair, clothes}, items }
//   POST /api/costumes/{costumeId}/buy | equip | unequip   { lifeId, guestToken }
// 사용법: {costumeOpen && <CostumeSheet life={life} guestToken={…} waitIdle={waitIdle}
//            onDone={(data) => 돈(data.assets)·착용(data.wear) 반영} onClose={() => …} />}
import { useEffect, useState } from "react";
import client from "../../api/api";
import { won } from "../../engine/play/lifeText";
import { CostumeFigure } from "./CostumeParts";
import "../../common/ui/ui.css";
import styles from "./CostumeSheet.module.css";

const PARTS = [
  { part: "HAT", key: "hat", label: "모자" },
  { part: "HAIR", key: "hair", label: "머리" },
  { part: "CLOTHES", key: "clothes", label: "옷" },
];

const errText = (err) => {
  if (err.response?.data?.message) return err.response.data.message;
  return err.response ? "서버에서 오류가 났어요." : "서버에 연결할 수 없어요.";
};

function CostumeSheet({ life, guestToken, waitIdle, onDone, onClose }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const lifeId = life.lifeId;
  const k = life.krwPerUsd;
  const baseColor = life.gender === "F" ? "#e98aa6" : "#6f95e8";

  useEffect(() => {
    let alive = true;
    client.get("/api/costumes", { params: { lifeId, guestToken } })
      .then((resp) => { if (alive) setData(resp.data); })
      .catch((err) => { if (alive) setMsg(errText(err)); });
    return () => { alive = false; };
  }, [lifeId, guestToken]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const send = async (costumeId, action) => {
    if (busy) return;
    setBusy(true);
    try {
      await waitIdle();
      const resp = await client.post(`/api/costumes/${costumeId}/${action}`, { lifeId, guestToken });
      setData(resp.data);
      setMsg(resp.data.message);
      onDone(resp.data);
    } catch (err) {
      setMsg(errText(err));
    } finally {
      setBusy(false);
    }
  };

  const wear = data?.wear || {};
  const items = data?.items || [];

  const button = (c) => {
    if (c.equipped === "Y") {
      return <button type="button" className={styles.ghost} disabled={busy} onClick={() => send(c.costumeId, "unequip")}>벗기</button>;
    }
    if (c.owned === "Y") {
      return <button type="button" className={styles.ghost} disabled={busy} onClick={() => send(c.costumeId, "equip")}>착용</button>;
    }
    return (
      <button type="button" className={styles.buy} disabled={busy || data.assets < c.price}
        onClick={() => send(c.costumeId, "buy")}>사기</button>
    );
  };

  return (
    <div className="dec-back" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="costumeTitle">
        <div className="dec-hd">
          <span>옷 가게</span>
          <span>{life.currentAge}세 · {life.birthYear + life.currentAge}년</span>
        </div>
        <div className={styles.body}>
          <div className={styles.top}>
            <div className={styles.mirror}>
              <CostumeFigure wear={wear} size={4} baseColor={baseColor} />
            </div>
            <div>
              <h2 id="costumeTitle" className={styles.title}>
                {data ? (data.assets < 0 ? `빚 ${won(-data.assets, k)}` : `모은 돈 ${won(data.assets, k)}`) : "불러오는 중…"}
              </h2>
              <p className={styles.sub}>값은 이 나라 형편에 맞춘 한국 체감 금액이에요. 산 것은 이번 인생 동안 언제든 바꿔 착용할 수 있어요.</p>
            </div>
          </div>
          {msg && <p className={styles.msg} role="status">{msg}</p>}

          {data && PARTS.map(({ part, key, label }) => (
            <section key={part}>
              <h3 className={styles.part}>{label}</h3>
              <ul className={styles.list}>
                {items.filter((c) => c.part === part).map((c) => (
                  <li key={c.costumeId} className={styles.row + (c.equipped === "Y" ? " " + styles.on : "")}>
                    <span className={styles.preview}>
                      <CostumeFigure wear={{ ...wear, [key]: c.look }} size={1.6} baseColor={baseColor} />
                    </span>
                    <b className={styles.name}>{c.costumeName}</b>
                    <span className={styles.price}>{c.owned === "Y" ? (c.equipped === "Y" ? "착용 중" : "가진 것") : won(c.price, k)}</span>
                    {button(c)}
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <div className="dec-foot">
            <button type="button" className={styles.ghost} onClick={onClose}>닫기</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CostumeSheet;
