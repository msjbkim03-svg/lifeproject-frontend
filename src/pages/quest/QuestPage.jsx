import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import client from "../../api/api";
import Badge from "../../common/ui/Badge";
import Button from "../../common/ui/Button";
import LevelDots from "../../common/ui/LevelDots";
import Panel from "../../common/ui/Panel";
import styles from "./QuestPage.module.css";
import { TRAIT_VIEW } from "../../utils/traits";

// 퀘스트 설정 (C01)  주소: /quest   ← 메인에서 회원이 [태어나기]를 누르면 옴
// 화면: 위 [이번 생의 목표 3칸 + 최대 포인트] / 가운데 [퀘스트 카드 3열] / 아래 [특성 레벨 한 줄] / 버튼
// 고른 퀘스트는 /birth 로 같이 넘기고, 태어난 뒤 출생 화면이 POST /api/quests/life 로 저장
const MAX_PICK = 3; // 1~3개

// 퀘스트 이름에 들어 있는 말로 아이콘 고르기 (DB에 아이콘이 없어서 화면에서 정함, 맞는 게 없으면 ⭐)
const ICONS = [
  [/결혼|연애|배우자/, "💍"],
  [/자녀|아이|손주/, "👶"],
  [/대학|졸업|학위|공부/, "🎓"],
  [/부자|재산|자산|돈|억/, "💰"],
  [/집|내 집/, "🏠"],
  [/이민|나라|해외/, "✈️"],
  [/행복/, "😊"],
  [/친구|관계/, "🤝"],
  [/건강/, "💪"],
  [/직업|취업|회사|일/, "💼"],
  [/살기|세까지|장수|오래/, "🎂"],
];
const iconOf = (name = "") => ICONS.find(([re]) => re.test(name))?.[1] || "⭐";

function QuestPage() {
  const navi = useNavigate();
  const location = useLocation();
  const decade = location.state?.decade; // 메인에서 고른 시대

  const [quests, setQuests] = useState([]); // 퀘스트 목록
  const [traits, setTraits] = useState([]); // 내 특성 레벨
  const [picked, setPicked] = useState(location.state?.picked || []); // 고른 퀘스트 번호 (특성 강화 갔다 오면 그대로)
  const [error, setError] = useState("");

  // 1. 처음 한 번: 시대·로그인 확인 → 퀘스트 목록과 내 특성 레벨 받기
  useEffect(() => {
    if (!decade) {
      navi("/"); // 주소로 바로 들어오면 메인으로
      return;
    }
    if (!localStorage.getItem("token")) {
      navi("/birth", { state: { decade } }); // 비회원은 퀘스트 없이 바로 출생
      return;
    }
    client.get("/api/quests")
      .then((resp) => setQuests(resp.data))
      .catch((err) => {
        if (err.response?.status === 401) return; // 로그인 만료 → api.js 가 로그인 화면으로 보냄
        setError("퀘스트 목록을 불러오지 못했어요.");
      });
    client.get("/api/members/me/traits").then((resp) => setTraits(resp.data)).catch(() => {});
  }, [decade, navi]);

  // 2. 퀘스트 누르기: 이미 골랐으면 빼고, 아니면 넣기 (3개까지)
  const toggle = (questId) => {
    setError("");
    if (picked.includes(questId)) {
      setPicked(picked.filter((id) => id !== questId));
    } else if (picked.length >= MAX_PICK) {
      setError(`퀘스트는 ${MAX_PICK}개까지 고를 수 있어요. 위 칸의 ✕ 로 하나를 빼 주세요.`);
    } else {
      setPicked([...picked, questId]);
    }
  };

  // 3. 퀘스트 정하고 태어나기 → 고른 퀘스트를 들고 출생 화면으로
  const goBirth = () => {
    if (picked.length === 0) return setError("퀘스트를 1개 이상 골라 주세요.");
    navi("/birth", { state: { decade, questIds: picked } });
  };

  // 고른 퀘스트를 고른 순서대로 (위 목표 칸에 보여 주기용)
  const pickedQuests = picked.map((id) => quests.find((q) => q.questId === id)).filter(Boolean);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>이번 생의 퀘스트 정하기</h1>
      <p className={styles.lead}>
        {decade}년대 어딘가에서 태어나요. 어느 나라일지는 몰라요. 목표를 1~3개 고르면, 달성한 퀘스트 1개당 1포인트를 받아요.
      </p>

      {/* ===== 위: 이번 생의 목표 3칸 + 최대 포인트 ===== */}
      <Panel title="이번 생의 목표" right={<span className={styles.sub}>{picked.length} / {MAX_PICK}</span>}>
        <div className={styles.goals}>
          {[0, 1, 2].map((i) => {
            const q = pickedQuests[i];
            if (!q) {
              return (
                <div key={i} className={`${styles.slot} ${styles.empty}`}>
                  <b>{i + 1}</b>아래에서 골라 주세요
                </div>
              );
            }
            return (
              <div key={i} className={styles.slot}>
                <b>{i + 1}</b>
                <span className={styles.slotName}>{iconOf(q.questName)} {q.questName}</span>
                <button type="button" className={styles.remove} onClick={() => toggle(q.questId)} aria-label={`${q.questName} 빼기`}>✕</button>
              </div>
            );
          })}
          <div className={styles.point}>
            <span>최대 획득</span>
            <b>{picked.length}P</b>
          </div>
        </div>
      </Panel>

      {/* ===== 가운데: 퀘스트 카드 3열 ===== */}
      <Panel title="퀘스트 목록" right={<span className={styles.sub}>눌러서 넣기 · 다시 누르면 빼기</span>}>
        <div className={styles.cards}>
          {quests.map((q) => {
            const order = picked.indexOf(q.questId); // -1 이면 안 고름
            return (
              <button key={q.questId} type="button"
                className={`choice-card ${styles.card}`+ (order >= 0 ? " on" : "")}
                onClick={() => toggle(q.questId)}>
                <span className={styles.icon}>{iconOf(q.questName)}</span>
                <span className={styles.cardText}>
                  <span className="choice-card-top">
                    <span className="choice-card-title">{q.questName}</span>
                    <Badge color="gold">1P</Badge>
                  </span>
                  {q.description && <span className="choice-card-desc">{q.description}</span>}
                </span>
                {order >= 0 && <span className={styles.num}>{order + 1}</span>}
              </button>
            );
          })}
        </div>
      </Panel>

      {/* ===== 아래: 특성 레벨 한 줄 ===== */}
      <div className={`panel ${styles.strip}`}>
        {traits.map((t) => (
          <LevelDots key={t.traitId} label={TRAIT_VIEW[t.traitId]?.label || t.traitName} level={t.traitLevel} max={t.maxLevel} />
        ))}
        <span className={styles.space} />
        <Button size="sm" pill onClick={() => navi("/life/traits", { state: { decade, picked } })}>특성 강화</Button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {/* ===== 버튼 ===== */}
      <div className={styles.actions}>
        <Button size="lg" pill onClick={() => navi("/")}>시대 다시 고르기</Button>
        <Button type="primary" size="lg" pill disabled={picked.length === 0} onClick={goBirth}>
          퀘스트 정하고 태어나기
        </Button>
      </div>
    </div>
  );
}

export default QuestPage;
