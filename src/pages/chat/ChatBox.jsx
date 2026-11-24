// C15 마을 채팅 입력줄 (기록은 없고, 보낸 말은 마을 사람 머리 위 말풍선으로만 보여요)
// 사용법: ChatVillage 안에서 <ChatBox chat={useChat 결과} />
import { useState } from "react";
import "../../common/ui/ui.css";
import styles from "./ChatBox.module.css";

function ChatBox({ chat }) {
  const [text, setText] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    chat.send(text);
    setText("");
  };

  return (
    <div className={styles.bar}>
      {chat.canTalk ? (
        <form className={styles.form} onSubmit={submit}>
          <input className={"input " + styles.input} value={text} maxLength={50}
            onChange={(e) => setText(e.target.value)} placeholder="같은 나라 사람들에게 한마디 (Enter)" />
          <button type="submit" className="btn btn-primary btn-sm">말하기</button>
        </form>
      ) : (
        <p className={styles.guest}>로그인하면 같은 나라 사람들과 말할 수 있어요.</p>
      )}
      <div className={styles.info}>
        <span>{chat.connected ? `같은 나라 접속 ${chat.count}명` : "연결하는 중…"}</span>
        {chat.error && <span className={styles.error}>{chat.error}</span>}
      </div>
    </div>
  );
}

export default ChatBox;
