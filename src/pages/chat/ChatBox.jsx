// C15 마을 채팅창 (useChat 결과를 받아서 그림)
// 사용법: const chat = useChat(나라, { age, gender, place }); <ChatBox chat={chat} />
import { useEffect, useRef, useState } from "react";
import "../../common/ui/ui.css";
import styles from "./ChatBox.module.css";

function ChatBox({ chat }) {
  const [text, setText] = useState("");
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [chat.messages]);

  const submit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    chat.send(text);
    setText("");
  };

  return (
    <section className={styles.box}>
      <div className={styles.head}>
        <b>마을 채팅</b>
        <span className={styles.count}>{chat.connected ? `${chat.count}명 접속 중` : "연결하는 중…"}</span>
      </div>

      <ul className={styles.list} ref={listRef}>
        {chat.messages.length === 0 && <li className={styles.empty}>아직 아무도 말하지 않았어요. 먼저 인사해 보세요.</li>}
        {chat.messages.map((m) => (
          <li key={m.msgId} className={m.memberId === chat.myId ? styles.mine : ""}>
            <span className={styles.time}>{m.createdAt}</span>
            <b className={styles.name}>{m.nickname}</b>
            <span>{m.content}</span>
          </li>
        ))}
      </ul>

      {chat.error && <p className={styles.error}>{chat.error}</p>}

      {chat.canTalk ? (
        <form className={styles.form} onSubmit={submit}>
          <input className={"input " + styles.input} value={text} maxLength={100}
            onChange={(e) => setText(e.target.value)} placeholder="같은 나라 사람들에게 한마디 (Enter)" />
          <button type="submit" className="btn btn-primary">보내기</button>
        </form>
      ) : (
        <p className={styles.guest}>로그인하면 대화에 함께할 수 있어요.</p>
      )}
    </section>
  );
}

export default ChatBox;
