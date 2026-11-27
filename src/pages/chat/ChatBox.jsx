// C15 마을 채팅 입력줄 (기록은 없고, 보낸 말은 마을 사람 머리 위 말풍선으로만 보여요)
// 사용법: ChatVillage 안에서 <ChatBox chat={useChat 결과} />
import { useEffect, useRef, useState } from "react";
import "../../common/ui/ui.css";
import styles from "./ChatBox.module.css";

function ChatBox({ chat }) {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!chat.canTalk) return;
    const onKey = (e) => {
      if (e.key !== "Enter") return;
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || tag === "BUTTON") return;
      // 이벤트 선택창 · 옷 가게 · 상점 · 엔딩 영상처럼 위에 창이 떠 있으면 그 창이 Enter 를 씀
      if (document.querySelector('[aria-modal="true"]')) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chat.canTalk]);

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) {
      inputRef.current?.blur();
      return;
    }
    chat.send(text);
    setText("");
  };

  return (
    <div className={styles.bar}>
      {chat.canTalk ? (
        <form className={styles.form} onSubmit={submit}>
          <input ref={inputRef} className={"input " + styles.input} value={text} maxLength={50}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Escape") e.currentTarget.blur(); }}
            placeholder="Enter로 말하기 · 빈칸에서 Enter나 Esc로 다시 걷기" />
          <button type="submit" className="btn btn-primary btn-sm">말하기</button>
        </form>
      ) : chat.atHome ? (
        <p className={styles.guest}>밖으로 나가면 같은 나라 사람들과 말할 수 있어요.</p>
      ) : chat.placeFull ? (
        <p className={styles.guest}>이 장소는 대화 인원({chat.placeLimit}명)이 가득 차서 지금은 말할 수 없어요. 앞사람이 나가면 자동으로 참여돼요.</p>
      ) : (
        <p className={styles.guest}>로그인하면 같은 나라 사람들과 말할 수 있어요.</p>
      )}
      {chat.error && <p className={styles.error} role="alert">{chat.error}</p>}
      <div className={styles.info}>
        <span>
          {!chat.connected
            ? "연결하는 중…"
            : chat.atHome
              ? `같은 나라 접속 ${chat.count}명`
              : `같은 나라 접속 ${chat.count}명 · 이 장소 대화 ${chat.placeCount}/${chat.placeLimit}명`}
        </span>
      </div>
    </div>
  );
}

export default ChatBox;
