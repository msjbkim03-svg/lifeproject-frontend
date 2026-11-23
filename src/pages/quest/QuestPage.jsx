import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import client from "../../api/api";
import Button from "../../common/ui/Button";
import CheckItem from "../../common/ui/CheckItem";
import LevelDots from "../../common/ui/LevelDots";
import Panel from "../../common/ui/Panel";
import styles from "./QuestPage.module.css";
import { TRAIT_VIEW } from "../../utils/traits";

// 퀘스트 설정 (C01)  주소: /quest   ← 메인에서 회원이 [태어나기]를 누르면 옴
// 와이어프레임 4쪽: 왼쪽 퀘스트 목록 / 오른쪽 고른 퀘스트 + 특성 레벨 + 버튼
// 고른 퀘스트는 /birth 로 같이 넘기고, 태어난 뒤 출생 화면이 POST /api/quests/life 로 저장
const MAX_PICK = 3; // 1~3개

// 특성 짧은 이름은 utils/traits.js 의 TRAIT_VIEW (특성 강화 화면과 같이 씀)

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
        // 토큰 만료·탈퇴(401) → 로그인 정보 지우고 로그인 화면으로 (마이페이지와 같은 방식)
        if (err.response?.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("nickname");
          localStorage.removeItem("memberRole");
          navi("/login");
          return;
        }
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
      setError(`퀘스트는 ${MAX_PICK}개까지 고를 수 있어요.`);
    } else {
      setPicked([...picked, questId]);
    }
  };

  // 3. 퀘스트 정하고 태어나기 → 고른 퀘스트를 들고 출생 화면으로
  const goBirth = () => {
    if (picked.length === 0) return setError("퀘스트를 1개 이상 골라 주세요.");
    navi("/birth", { state: { decade, questIds: picked } });
  };

  // 고른 퀘스트를 고른 순서대로 (이름 보여 주기용)
  const pickedQuests = picked.map((id) => quests.find((q) => q.questId === id)).filter(Boolean);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>이번 생의 퀘스트 정하기</h1>
      <p className={styles.lead}>
        {decade}년대 어딘가에서 태어나요. 어느 나라일지는 몰라요. 목표를 1~3개 고르면, 달성한 퀘스트 1개당 1포인트를 받아요.
      </p>

      <div className={styles.grid}>
        {/* ===== 왼쪽: 퀘스트 목록 ===== */}
        <Panel title="퀘스트 목록" right={<span className={styles.sub}>보상</span>}>
          <div className={styles.list}>
            {quests.map((q) => (
              <div key={q.questId}>
                <CheckItem label={q.questName} right="1P" on={picked.includes(q.questId)} onClick={() => toggle(q.questId)} />
                {q.description && <p className={styles.desc}>{q.description}</p>}
              </div>
            ))}
          </div>
        </Panel>

        {/* ===== 오른쪽 ===== */}
        <div className={styles.side}>
          <Panel title="고른 퀘스트" right={<span className={styles.sub}>{picked.length} / {MAX_PICK}</span>}>
            {pickedQuests.length === 0 ? (
              <p className={styles.empty}>왼쪽에서 퀘스트를 골라 주세요.</p>
            ) : (
              <ol className={styles.pickedList}>
                {pickedQuests.map((q, i) => (
                  <li key={q.questId}><b>{i + 1}.</b> {q.questName}</li>
                ))}
              </ol>
            )}
            <div className={styles.point}>
              <span>최대 획득 포인트</span>
              <b>{picked.length}P</b>
            </div>
          </Panel>

          <Panel title="특성 레벨">
            <div className={styles.traits}>
              {traits.map((t) => (
                <LevelDots key={t.traitId} label={TRAIT_VIEW[t.traitId]?.label || t.traitName} level={t.traitLevel} max={t.maxLevel} />
              ))}
            </div>
            <Button block size="sm" className={styles.traitBtn} onClick={() => navi("/mypage/traits", { state: { decade, picked } })}>
              특성 강화하러 가기
            </Button>
          </Panel>

          {error && <p className={styles.error}>{error}</p>}

          <Button type="primary" size="lg" block disabled={picked.length === 0} onClick={goBirth}>
            퀘스트 정하고 태어나기
          </Button>
          <Button block onClick={() => navi("/")}>시대 다시 고르기</Button>
        </div>
      </div>
    </div>
  );
}

export default QuestPage;

