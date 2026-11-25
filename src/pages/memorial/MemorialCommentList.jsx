import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import Button from "../../common/ui/Button";
import s from "./MemorialRoom.module.css";

// 방명록 목록 (방 탭 미리보기 3개, 방명록 탭 전체가 같이 씀)
// 예: <MemorialCommentList list={room.comments.slice(0, 3)} />
function MemorialCommentList({ list }) {
  const { deleteComment } = useOutletContext();
  const [busy, setBusy] = useState(false); // 지우는 중 (연타 막기)

  // 지우기: 한 번 더 물어보고 → 서버에 지우기 → 끝나면 다시 누를 수 있게
  const remove = async (commentId) => {
    if (busy) return;
    if (!window.confirm("이 방명록을 지울까요? 지우면 되돌릴 수 없어요.")) return;
    setBusy(true);
    await deleteComment(commentId);
    setBusy(false);
  };

  if (list.length === 0) return <p className={s.muted}>아직 남긴 말이 없어요.</p>;

  return (
    <ul className={s.comments}>
      {list.map((c) => (
        <li key={c.commentId}>
          <b>{c.nickname}</b>
          <span>{c.content}</span>
          <small>{c.createdAt}</small>
          {c.mine && <Button type="ghost" size="sm" disabled={busy} onClick={() => remove(c.commentId)}>지우기</Button>}
        </li>
      ))}
    </ul>
  );
}

export default MemorialCommentList;
