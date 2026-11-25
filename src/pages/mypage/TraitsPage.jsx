import { useEffect, useState } from "react";
import { useLocation, useNavigate, useOutletContext } from "react-router-dom";
import client from "../../api/api";
import Badge from "../../common/ui/Badge";
import Button from "../../common/ui/Button";
import LevelDots from "../../common/ui/LevelDots";
import Modal from "../../common/ui/Modal";
import common from "./MyPage.module.css"; // 마이페이지와 같은 틀 (main, card, stat …)
import styles from "./TraitsPage.module.css";
import { TRAIT_VIEW } from "../../utils/traits";

// 특성 강화 (M08)  주소: /life/traits
// 와이어프레임 18쪽: 보유 포인트 + 강화 규칙 / 특성 4종 카드 / 고른 카드의 확인 줄 (Lv.3 → Lv.4)
// 포인트 1점 = 1레벨, Lv.1 ~ Lv.5, 올린 레벨은 다음 생부터 적용 (C13)

// 화면용 짧은 이름 · 아이콘은 utils/traits.js 의 TRAIT_VIEW (퀘스트 화면과 같이 씀)

function TraitsPage() {
  const navi = useNavigate();
  const { my, setMy } = useOutletContext(); // 보유 포인트(my.point) - 바꾸면 마이페이지에도 반영
  const fromQuest = useLocation().state; // 퀘스트 화면에서 왔으면 { decade, picked } → 돌아가기 버튼
  const [traits, setTraits] = useState([]);
  const [selected, setSelected] = useState(null); // 확인 줄에 띄울 특성 (traitId)
  const [busy, setBusy] = useState(false);         // 서버 처리 중 (연속 클릭 막기)
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [noPoint, setNoPoint] = useState(false);  // 포인트 부족 안내 창
  const [loadError, setLoadError] = useState(""); // 처음 불러오기 실패 안내

  // 1. 처음 한 번: 내 특성 레벨 받기
  useEffect(() => {
    client.get("/api/members/me/traits")
      .then((resp) => setTraits(resp.data))
      .catch(() => setLoadError("특성을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요."));
  }, []);

  // 2. 카드의 [레벨 올리기 · 1P]
  //    포인트가 없으면 → 안내 창 (플레이하러 가기)
  //    포인트가 있으면 → 아래 확인 줄 띄우기
  const pick = (t) => {
    setMessage("");
    setError("");
    if (my.point < 1) {
      setSelected(null);
      setNoPoint(true);
      return;
    }
    setSelected(t.traitId);
  };

  // 3. 확인 줄의 [레벨 올리기] → POST .../levelUp
  const levelUp = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const resp = await client.post(`/api/members/me/traits/${selected}/levelUp`);
      setTraits(resp.data.traits);             // 새 레벨로 다시 그리기
      setMy({ ...my, point: resp.data.point }); // 남은 포인트 (마이페이지 숫자도 같이 바뀜)
      setMessage(`${TRAIT_VIEW[selected]?.label} 레벨을 올렸어요. 다음 생부터 적용돼요.`);
      setSelected(null);
    } catch (err) {
      setError(err.response?.data?.message || "레벨을 올리지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  const sel = traits.find((t) => t.traitId === selected);

  return (
    <main className={common.main}>
      <h1 className={common.title}>특성 강화</h1>
      <p className={common.lead}>퀘스트로 모은 포인트로 특성을 키워요. 올린 레벨은 다음 생부터 적용돼요.</p>
      {fromQuest?.decade && (
        <Button type="primary" onClick={() => navi("/quest", { state: fromQuest })}>
          ← {fromQuest.decade}년대 퀘스트 정하러 돌아가기
        </Button>
      )}

      {/* 보유 포인트 + 강화 규칙 */}
      <div className={styles.top}>
        <div className={common.stat}>
          <span>보유 포인트</span>
          <b>{my.point}P</b>
          <small className={styles.small}>퀘스트 1개 달성 = 1P</small>
        </div>
        <section className={common.card}>
          <div className={common.cardHead}><span className={common.cardTitle}>강화 규칙</span></div>
          <dl className={styles.rules}>
            <dt>시작 레벨</dt><dd>Lv.1</dd>
            <dt>최대 레벨</dt><dd>Lv.5</dd>
            <dt>비용</dt><dd>1레벨당 1P</dd>
            <dt>더 올릴 수 없음</dt><dd>Lv.5가 되면</dd>
          </dl>
        </section>
      </div>

      {/* 특성 4종 */}
      <section className={common.card}>
        <div className={common.cardHead}><span className={common.cardTitle}>특성 4종</span></div>
        {loadError && (
          <div>
            <p className={styles.error}>{loadError}</p>
            <Button onClick={() => window.location.reload()}>다시 시도</Button>
          </div>
        )}
        <div className={styles.grid}>
          {traits.map((t) => {
            const view = TRAIT_VIEW[t.traitId] || { label: t.traitName, icon: "⭐" };
            const isMax = t.traitLevel >= t.maxLevel;
            return (
              <div key={t.traitId} className={selected === t.traitId ? `${styles.trait} ${styles.on}` : styles.trait}>
                <div className={styles.icon}>
                  {view.icon}
                  {isMax && <span className={styles.badge}><Badge color="gold">최대 레벨</Badge></span>}
                </div>
                <div className={styles.body}>
                  <b className={styles.name}>{view.label}</b>
                  <p className={styles.desc}>{t.description}</p>
                  <LevelDots label="" level={t.traitLevel} max={t.maxLevel} />
                  <Button type={isMax ? undefined : "primary"} size="sm" block
                    disabled={isMax} onClick={() => pick(t)}>
                    {isMax ? "올릴 수 없음" : "레벨 올리기 · 1P"}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {message && <div className={styles.ok}>{message}</div>}

      {/* 고른 특성 확인 줄 */}
      {sel && (
        <section className={styles.confirm}>
          <div>
            <b>{TRAIT_VIEW[sel.traitId]?.label || sel.traitName} · Lv.{sel.traitLevel} → Lv.{sel.traitLevel + 1}</b>
            <p>포인트 {my.point}P → {my.point - 1}P · 다음 생부터 적용돼요.</p>
            {error && <p className={styles.error}>{error}</p>}
          </div>
          <div className={styles.confirmBtns}>
            <Button onClick={() => setSelected(null)}>취소</Button>
            <Button type="primary" disabled={busy} onClick={levelUp}>{busy ? "올리는 중…" : "레벨 올리기"}</Button>
          </div>
        </section>
      )}

      {/* 포인트 부족 안내 창 */}
      <Modal open={noPoint} title="포인트가 부족해요" onClose={() => setNoPoint(false)}>
        <p>특성을 올리려면 포인트 1P가 필요해요.</p>
        <p className="sub">인생을 살면서 퀘스트를 달성하면 포인트를 받을 수 있어요.</p>
        <div className={styles.modalBtns}>
          <Button onClick={() => setNoPoint(false)}>닫기</Button>
          <Button type="primary" onClick={() => navi("/")}>플레이하러 가기</Button>
        </div>
      </Modal>
    </main>
  );
}

export default TraitsPage;
