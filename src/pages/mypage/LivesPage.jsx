import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import client from "../../api/api";
import Button from "../../common/ui/Button";
import common from "./MyPage.module.css"; // 마이페이지와 같은 틀 (main, card, stats, life …)
import styles from "./LivesPage.module.css"; // 표·페이지 번호만

// 마지막으로 받은 전생 기록을 기억해 둠 (다른 화면에 갔다 와도 '불러오는 중…' 없이 바로 보여 주고, 뒤에서 새로 받음)
//   키에 로그인 아이디를 넣어서 다른 사람 기록이 섞이지 않게 함
const cache = {};

// 전생 기록 (M07)  주소: /life/lives
// 와이어프레임 17쪽: 숫자 칸 3개 + 진행 중인 인생 + 인생 목록(10개씩, 최신순/오래 산 순) + 페이지 번호
function LivesPage() {
  const navi = useNavigate();
  const { my } = useOutletContext(); // 진행 중인 인생 정보 (MyPageLayout 이 넘겨 줌)

  const [page, setPage] = useState(1);        // 지금 페이지
  const [sort, setSort] = useState("recent"); // recent 최신순 / age 오래 산 순
  const [data, setData] = useState(() => cache[`${my.loginId}:1:recent`] ?? null); // 서버 응답 { total, size, questDone, pointSum, lives }
  const [loadError, setLoadError] = useState(false); // 불러오기 실패 (빈 목록과 구분)

  // 페이지나 정렬이 바뀔 때마다 서버에 다시 물어봄
  useEffect(() => {
    client.get("/api/members/me/lives", { params: { page, sort } })
      .then((resp) => {
        cache[`${my.loginId}:${page}:${sort}`] = resp.data;
        setData(resp.data);
        setLoadError(false);
      })
      .catch(() => setLoadError(true)); // 오류를 '기록 없음'으로 보이지 않게
  }, [page, sort, my.loginId]);

  // 정렬을 바꾸면 1페이지부터
  const changeSort = (e) => {
    setSort(e.target.value);
    setPage(1);
  };

  if (loadError) {
    return <main className={common.main}><p className={common.lead}>전생 기록을 불러오지 못했어요. 잠시 뒤 다시 시도해 주세요.</p></main>;
  }

  if (!data) {
    return <main className={common.main}><p className={common.lead}>불러오는 중…</p></main>;
  }

  // 페이지 번호 [1] [2] [3] … 만들기
  const lastPage = Math.max(1, Math.ceil(data.total / data.size));
  const pages = [];
  for (let i = 1; i <= lastPage; i++) pages.push(i);

  return (
    <main className={common.main}>
      <h1 className={common.title}>전생 기록</h1>
      <p className={common.lead}>지금까지 살아 본 인생들을 모아 봤어요. 결과 보기를 누르면 그 인생의 결과 화면으로 가요.</p>

      {/* 숫자 칸 3개 */}
      <div className={common.stats}>
        <div className={common.stat}><span>살아 본 인생</span><b>{data.total}번</b></div>
        <div className={common.stat}><span>퀘스트 달성</span><b>{data.questDone}개</b></div>
        <div className={common.stat}><span>획득 포인트 합계</span><b>{data.pointSum}P</b></div>
      </div>

      {/* 진행 중인 인생 (마이페이지와 같은 모양) */}
      <section className={common.card}>
        <div className={common.cardHead}><span className={common.cardTitle}>진행 중인 인생</span></div>
        {my.lifeId ? (
          <div className={common.life}>
            <div className={common.character}>캐릭터</div>
            <div className={common.lifeText}>
              <b>{my.lifeName}</b>
              <span>{my.currentCountryName} · {my.currentAge}살</span>
            </div>
            <Button type="primary" onClick={() => navi("/play", { state: { lifeId: my.lifeId } })}>이어서 살기</Button>
          </div>
        ) : (
          <div className={common.life}>
            <div className={common.character}>캐릭터</div>
            <div className={common.lifeText}>
              <b>진행 중인 인생이 없어요</b>
              <span>메인에서 새 인생을 시작해 보세요.</span>
            </div>
            <Button onClick={() => navi("/")}>새 인생 시작하기</Button>
          </div>
        )}
      </section>

      {/* 인생 목록 */}
      <section className={common.card}>
        <div className={common.cardHead}>
          <span className={common.cardTitle}>인생 목록</span>
          <select className={styles.sort} value={sort} onChange={changeSort}>
            <option value="recent">최신순</option>
            <option value="age">오래 산 순</option>
          </select>
        </div>

        {data.lives.length === 0 ? (
          <p className={common.desc}>아직 끝난 인생이 없어요. 인생을 끝까지 살아 보면 여기에 쌓여요.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>번째</th><th>나라</th><th>출생 연도</th><th>수명</th>
                <th>사망 원인</th><th>퀘스트</th><th>포인트</th><th></th>
              </tr>
            </thead>
            <tbody>
              {data.lives.map((l) => (
                <tr key={l.lifeId}>
                  <td>{l.lifeNo}</td>
                  <td>{l.birthCountryName}</td>
                  <td>{l.birthYear}</td>
                  <td>{l.deathAge != null ? `${l.deathAge}세` : "-"}</td>
                  <td className={styles.cause}>{l.deathCause || "-"}</td>
                  <td>{l.questTotal > 0 ? `${l.questDone} / ${l.questTotal}` : "-"}</td>
                  <td>{l.earnedPoint}P</td>
                  <td>
                    <div className="row" style={{ gap: "var(--sp-1)", flexWrap: "nowrap" }}>
                      <Button size="sm" onClick={() => navi(`/result/${l.lifeId}`)}>결과 보기</Button>
                      <Button size="sm" onClick={() => navi(`/memorial/${l.lifeId}`)}>추모관</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* 페이지 번호 */}
        {lastPage > 1 && (
          <div className={styles.pager}>
            <Button size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</Button>
            {pages.map((p) => (
              <Button key={p} size="sm" type={p === page ? "primary" : undefined} onClick={() => setPage(p)}>{p}</Button>
            ))}
            <Button size="sm" disabled={page === lastPage} onClick={() => setPage(page + 1)}>›</Button>
          </div>
        )}
      </section>
    </main>
  );
}

export default LivesPage;
