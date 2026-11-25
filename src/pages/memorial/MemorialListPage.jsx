import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/api";
import Button from "../../common/ui/Button";
import Badge from "../../common/ui/Badge";
import MemorialPortrait from "./MemorialPortrait";
import s from "./MemorialRoom.module.css";

// 추모관 목록 (B01)  주소: /memorial
// 들어오는 곳: 위 헤더 [추모관], 메인 "방금 끝난 인생" 칸의 [추모관]
// 열린 추모관을 최신순으로 12개씩 카드로 보여 주고, 카드를 누르면 그 방(/memorial/:lifeId)으로 감

function MemorialListPage() {
  const navi = useNavigate();
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);           // { total, size, list }
  const [loadError, setLoadError] = useState(false);

  // 페이지가 바뀔 때마다 서버에 다시 물어봄
  useEffect(() => {
    client.get("/api/memorials", { params: { page } })
      .then((resp) => {
        setData({ ...resp.data, list: resp.data.list ?? [] });
        setLoadError(false);
      })
      .catch(() => setLoadError(true));
  }, [page]);

  const list = data?.list ?? [];
  const lastPage = data ? Math.max(1, Math.ceil(data.total / data.size)) : 1;
  const pages = [];
  for (let i = 1; i <= lastPage; i++) pages.push(i);

  return (
    <main className={`page ${s.page}`}>
      <div className={s.listHead}>
        <h1 className={s.listTitle}>전생의 집</h1>
        <p className="sub">끝난 인생들이 잠든 곳이에요. 방에 들어가 촛불을 켜고 한마디를 남길 수 있어요.</p>
      </div>

      {loadError ? (
        <p className={s.empty}>추모관 목록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.</p>
      ) : !data ? (
        <p className={s.empty}>불러오는 중…</p>
      ) : list.length === 0 ? (
        <p className={s.empty}>아직 열린 추모관이 없어요. 인생을 끝까지 살고 추모관을 열어 보세요.</p>
      ) : (
        <div className={s.cardGrid}>
          {list.map((c) => (
            <button key={c.lifeId} className={`panel ${s.card}`} onClick={() => navi(`/memorial/${c.lifeId}`)}>
              <MemorialPortrait gender={c.gender} age={c.deathAge} costume={{ hair: c.hair, top: c.top, hat: c.hat }}
                className={s.cardPortrait} />
              <b className={s.cardName}>{c.name}</b>
              <span className={s.mono}>{c.birthYear} – {c.deathYear} · {c.deathAge}세</span>
              <span className={s.cardCountry}>{c.birthCountryName}</span>
              {c.message && <span className={s.cardMsg}>“{c.message}”</span>}
              <span className={s.cardNick}>👤 {c.nickname}</span>
              <span className={s.cardStats}>
                <Badge color="gold">🕯 {c.tributeCount}</Badge>
                <Badge>👁 {c.viewCount}</Badge>
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 페이지 번호 */}
      {!loadError && lastPage > 1 && (
        <div className={s.pager}>
          <Button size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</Button>
          {pages.map((p) => (
            <Button key={p} size="sm" type={p === page ? "primary" : undefined} onClick={() => setPage(p)}>{p}</Button>
          ))}
          <Button size="sm" disabled={page === lastPage} onClick={() => setPage(page + 1)}>›</Button>
        </div>
      )}
    </main>
  );
}

export default MemorialListPage;
