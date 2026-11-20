import { useOutletContext } from 'react-router-dom';
import Button from '../../common/ui/Button';
import s from './MemorialRoom.module.css';

// 방명록 목록 (방 탭 미리보기 3개, 방명록 탭 전체가 같이 씀)
// 예: <MemorialCommentList list={room.comments.slice(0, 3)} />
function MemorialCommentList({ list }) {
  const { deleteComment } = useOutletContext();

  if (list.length === 0) return <p className={s.muted}>아직 남긴 말이 없어요.</p>;

  return (
    <ul className={s.comments}>
      {list.map((c) => (
        <li key={c.commentId}>
          <b>{c.nickname}</b>
          <span>{c.content}</span>
          <small>{c.createdAt}</small>
          {c.mine && <Button type="ghost" size="sm" onClick={() => deleteComment(c.commentId)}>지우기</Button>}
        </li>
      ))}
    </ul>
  );
}

export default MemorialCommentList;
