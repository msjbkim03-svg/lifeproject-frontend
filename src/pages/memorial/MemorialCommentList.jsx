import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import Button from "../../common/ui/Button";
import s from "./MemorialRoom.module.css";

// 방명록 목록 (방 탭 미리보기 3개, 방명록 탭 전체가 같이 씀)
// 예: <MemorialCommentList list={room.comments.slice(0, 3)} />
function MemorialCommentList({ list }) {
  const { deleteComment } = useOutletContext();
  const [busy, setBusy] = useState(false); // 지우는 중 (연타 막기)
  const [askId, setAskId] = useState(null); // 지우기 확인 중인 방명록 번호

  // 지우기: 인라인 확인 후 서버에 삭제 요청
  const remove = async (commentId) => {
    if (busy) return;
    setBusy(true);
    await deleteComment(commentId);
    setAskId(null);
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
          {c.mine && (
            askId === c.commentId ? (
              <>
                <Button size="sm" disabled={busy} onClick={() => setAskId(null)}>취소</Button>
                <Button type="danger" size="sm" disabled={busy} onClick={() => remove(c.commentId)}>삭제</Button>
              </>
            ) : (
              <Button type="ghost" size="sm" disabled={busy} onClick={() => setAskId(c.commentId)}>지우기</Button>
            )
          )}
        </li>
      ))}
    </ul>
  );
}

export default MemorialCommentList;
