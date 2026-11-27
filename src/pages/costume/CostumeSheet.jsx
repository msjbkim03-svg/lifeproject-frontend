// C21 코스튬 상점: 진행 화면에서 열고, 여는 동안 시간은 멈춰요 (ShopSheet 와 같은 방식)
//   GET  /api/costumes?lifeId=&guestToken=        → { assets, wear: {hair, top, hat}, items }
//   POST /api/costumes/{costumeId}/buy | equip | unequip   { lifeId, guestToken }
//   그림은 동현님 마을 그림(Figure + costumeData.lookOf)을 그대로 씀, wear 는 Village costume 과 같은 모양
// 사용법: {costumeOpen && <CostumeSheet life={life} guestToken={…} waitIdle={waitIdle}
//            onDone={(data) => setLife((x) => ({ ...x, assets: data.assets, costume: data.wear }))} onClose={() => …} />}
import { useEffect, useState } from "react";
import client from "../../api/api";
import Button from "../../common/ui/Button";
import { won } from "../../engine/play/lifeText";
import Figure from "../../engine/village/Figure";
import { COSTUMES, lookOf } from "../../engine/village/costumeData";
import "../../common/ui/ui.css";
import styles from "./CostumeSheet.module.css";

const PARTS = [
  { part: "HAT", key: "hat", label: "모자" },
  { part: "HAIR", key: "hair", label: "머리" },
  { part: "CLOTHES", key: "top", label: "옷" },
  { part: "RIDE", key: "ride", label: "탈것" },
];

const errText = (err) => {
  if (err.response?.data?.message) return err.response.data.message;
  return err.response ? "서버에서 오류가 났어요." : "서버에 연결할 수 없어요.";
};

// 잠금 표시용 철제 자물쇠 SVG 아이콘 (미리보기 오버레이 · 안내 문구 · 버튼 공용)
function PadlockIcon({ size = 24 }) {
  const height = Math.round((size * 30) / 26);
  return (
    <svg width={size} height={height} viewBox="0 0 26 30" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
      {/* 윗쪽 강철 고리(샤클) - 몸체 중심(x=13)과 정확히 일치 */}
      <path
        d="M7.5 13V9C7.5 5.962 9.962 3.5 13 3.5C16.038 3.5 18.5 5.962 18.5 9V13"
        stroke="#cbd5e1"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M7.5 13V9C7.5 5.962 9.962 3.5 13 3.5C16.038 3.5 18.5 5.962 18.5 9V13"
        stroke="#475569"
        strokeWidth="1.2"
        strokeLinecap="round"
        opacity="0.55"
      />
      {/* 자물쇠 몸체 */}
      <rect x="3" y="12" width="20" height="15" rx="3.5" fill="#64748b" stroke="#1e293b" strokeWidth="1.5" />
      <rect x="4.5" y="13.5" width="17" height="3" rx="1.5" fill="#e2e8f0" opacity="0.35" />
      {/* 금속 리벳 4개 */}
      <circle cx="6.2" cy="15.2" r="1" fill="#334155" />
      <circle cx="19.8" cy="15.2" r="1" fill="#334155" />
      <circle cx="6.2" cy="24" r="1" fill="#334155" />
      <circle cx="19.8" cy="24" r="1" fill="#334155" />
      {/* 열쇠 구멍 */}
      <circle cx="13" cy="18.6" r="2.2" fill="#0f172a" />
      <path d="M12 20L11.3 23.6H14.7L14 20H12Z" fill="#0f172a" />
    </svg>
  );
}

function CostumeSheet({ life, guestToken, waitIdle, onDone, onClose }) {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState("HAT");

  const lifeId = life.lifeId;
  const k = life.krwPerUsd;

  useEffect(() => {
    let alive = true;
    client.get("/api/costumes", { params: { lifeId, guestToken } })
      .then((resp) => { if (alive) setData(resp.data); })
      .catch((err) => { if (alive) setMsg(errText(err)); });
    return () => { alive = false; };
  }, [lifeId, guestToken]);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.code === "Space" || e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
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
  const lookWith = (costume) => lookOf({ gender: life.gender, age: life.currentAge, costume });

  const button = (c, minAge, locked) => {
    if (c.equipped === "Y") {
      return <Button size="sm" pill disabled={busy} onClick={() => send(c.costumeId, "unequip")}>벗기</Button>;
    }
    if (locked) {
      return (
        <Button size="sm" pill disabled title={`${minAge}세부터 이용할 수 있어요`}>
          <PadlockIcon size={13} /> {minAge}세부터
        </Button>
      );
    }
    if (c.owned === "Y") {
      return <Button size="sm" pill disabled={busy} onClick={() => send(c.costumeId, "equip")}>착용</Button>;
    }
    return (
      <Button type="primary" size="sm" pill disabled={busy || data.assets < c.price}
        onClick={() => send(c.costumeId, "buy")}>사기</Button>
    );
  };

  return (
    <div className="dec-back" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={styles.sheet} role="dialog" aria-modal="true" aria-labelledby="costumeTitle">
        <div className="dec-hd">
          <span>상점</span>
          <span>{life.currentAge}세 · {life.birthYear + life.currentAge}년</span>
        </div>
        <div className={styles.body}>
          <div className={styles.top}>
            <div className={styles.mirror + (wear.ride ? " " + styles.mirrorRide : "")}>
              <Figure look={lookWith(wear)} />
            </div>
            <div>
              <h2 id="costumeTitle" className={styles.title}>
                {data ? (data.assets < 0 ? `빚 ${won(-data.assets, k)}` : `모은 돈 ${won(data.assets, k)}`) : msg ? "상점을 열지 못했어요" : "불러오는 중…"}
              </h2>
              <p className={styles.sub}>값은 이 나라 형편에 맞춘 한국 체감 금액이에요. 산 것은 이번 인생 동안 언제든 바꿔 착용할 수 있어요.</p>
            </div>
          </div>
          {msg && <p className={styles.msg} role="status">{msg}</p>}

          <div className={styles.tabs} role="tablist">
            {PARTS.map(({ part, label }) => (
              <button key={part} type="button" role="tab" aria-selected={tab === part}
                className={styles.tab + (tab === part ? " " + styles.tabOn : "")}
                onClick={() => setTab(part)}>
                {label} <small>{items.filter((c) => c.part === part).length}</small>
              </button>
            ))}
          </div>

          {data && PARTS.filter(({ part }) => part === tab).map(({ part, key }) => (
            <section key={part}>
              <ul className={styles.list}>
                {items.filter((c) => c.part === part).map((c) => {
                  const minAge = COSTUMES[c.look]?.minAge || 0;
                  const locked = life.currentAge < minAge;
                  const hasRide = Boolean(key === "ride" ? c.look : wear.ride);
                  return (
                    <li key={c.costumeId} className={styles.row + (c.equipped === "Y" ? " " + styles.on : "") + (locked ? " " + styles.locked : "")}>
                      <span className={styles.preview + (hasRide ? " " + styles.previewRide : "")}>
                        <Figure look={lookWith({ ...wear, [key]: c.look })} />
                        {locked && (
                          <span className={styles.lockOverlay} aria-hidden="true">
                            <PadlockIcon size={24} />
                          </span>
                        )}
                      </span>
                      <span className={styles.nameBox}>
                        <b className={styles.name}>{c.costumeName}</b>
                        {minAge > 0 && (
                          <small className={locked ? styles.ageLock : styles.ageOk}>
                            {locked ? <><PadlockIcon size={12} /> {minAge}세 이상 이용 가능 (현재 {life.currentAge}세)</> : `${minAge}세 이상`}
                          </small>
                        )}
                      </span>
                      <span className={styles.price}>{c.owned === "Y" ? (c.equipped === "Y" ? "착용 중" : "가진 것") : won(c.price, k)}</span>
                      {button(c, minAge, locked)}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          <div className="dec-foot">
            <Button size="sm" pill onClick={onClose}>닫기</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CostumeSheet;
