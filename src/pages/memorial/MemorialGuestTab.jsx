import { useState } from "react";
import { Link, useLocation, useOutletContext } from "react-router-dom";
import Button from "../../common/ui/Button";
import Chips from "../../common/ui/Chips";
import MemorialCommentList from "./MemorialCommentList";
import { QUICK } from "./memorialData";
import s from "./MemorialRoom.module.css";

// 방명록 탭  주소: /memorial/:lifeId/guest
// 목록 + 자주 쓰는 말 칩(누르면 입력칸에 들어감) + 한 줄(100자) 남기기
function MemorialGuestTab() {
  const { room, isLogin, sendComment } = useOutletContext();
  const location = useLocation(); // 로그인하면 이 화면으로 돌아오게
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false); // 보내는 중 (Enter 연타로 같은 글 여러 번 막기)
  const [error, setError] = useState("");

  const send = async () => {
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true);
    setError("");
    const res = await sendComment(content); // 틀(MemorialRoomPage)이 서버에 보냄
    if (res?.ok) setText("");
    else if (res?.error) { setError(res.error); setText(""); } // 안내를 띄우고 입력칸은 처음처럼 비움
    setBusy(false);
  };

  if (!room.opened) return <p className={s.muted}>추모관을 열면 방명록을 남길 수 있어요.</p>;

  return (
    <>
      <p className={s.muted}>이 삶을 만난 사람은 한마디를 남길 수 있어요.</p>
      <MemorialCommentList list={room.comments} />

      <h3 className={s.secTitle} style={{ marginTop: "var(--sp-4)" }}>한마디 남기기</h3>
      <Chips
        items={QUICK.map((q) => ({ value: q, label: q }))}
        selected={text}
        onPick={(v) => { setText(v); setError(""); }}
      />

      {isLogin ? (
        <>
          <div className={s.write}>
            <input
              className="input"
              value={text}
              maxLength={100}
              placeholder="한 줄로 남겨 주세요 (100자)"
              onChange={(e) => { setText(e.target.value); if (error) setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && send()}
            />
            <Button type="primary" disabled={busy} onClick={send}>{busy ? "남기는 중…" : "남기기"}</Button>
          </div>
          {error && <p className={s.writeErr} role="alert">{error}</p>}
        </>
      ) : (
        <p className={s.muted}>
          <Link to="/login" state={{ background: location }} className="gold">로그인</Link>하면 방명록을 남길 수 있어요.
        </p>
      )}
    </>
  );
}

export default MemorialGuestTab;
