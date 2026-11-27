import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/api";
import AdminNav from "./AdminNav";
import Panel from "../../common/ui/Panel";
import Button from "../../common/ui/Button";
import Badge from "../../common/ui/Badge";
import Modal from "../../common/ui/Modal";
import { formatPhone } from "../../utils/phone";
import styles from "./AdminMembers.module.css";

// A01 관리자 회원 관리  주소: /admin/members (관리자만)
// 검색(아이디·닉네임·이메일 + 상태) → 목록 10명씩 → 강제 탈퇴(확인 창)
const STATUS_NAME = { ACTIVE: "활동 중", WITHDRAWN: "탈퇴" };

function AdminMembers() {
  const navi = useNavigate();

  // 입력칸 값 (치는 중) / 검색 버튼을 눌렀을 때의 값 (실제로 서버에 보내는 값)
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState({ keyword: "", status: "" });

  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);       // 서버 응답 { total, page, size, list }
  const [error, setError] = useState("");
  const [target, setTarget] = useState(null);   // 탈퇴 확인 창에 띄울 회원 (null 이면 창 닫힘)
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);      // 숫자를 바꾸면 목록을 다시 불러옴
  const [busy, setBusy] = useState(false);      // 탈퇴 요청 보내는 중 (연타 막기)

  // 1. 검색 조건·페이지가 바뀌거나 탈퇴 처리 뒤에 목록 다시 불러오기
  useEffect(() => {
    client.get("/api/admin/members", { params: { ...search, page } })
      .then((resp) => {
        setData(resp.data);
        setError("");
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          navi("/login", { state: { message: "로그인이 필요해요." } });
          return;
        }
        setError(err.response?.status === 403 ? "관리자만 볼 수 있어요." : "회원 목록을 불러오지 못했어요.");
      });
  }, [search, page, reload, navi]);

  // 2. 검색 버튼 (또는 Enter) → 1페이지부터
  const handleSearch = (e) => {
    if (e?.preventDefault) e.preventDefault();
    setSearch({ keyword: keyword.trim(), status });
    setPage(1);
  };

  // 3. 확인 창의 [탈퇴시키기]
  const withdraw = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await client.post(`/api/admin/members/${target.memberId}/withdraw`);
      setMessage(`${target.nickname} 님을 탈퇴 처리했어요.`);
      // '활동 중' 필터의 마지막 페이지에서 마지막 1명을 탈퇴시켰으면 이전 페이지로 이동
      if (search.status === "ACTIVE" && data?.list?.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        setReload((n) => n + 1);
      }
    } catch (err) {
      setMessage(err.response?.data?.message || "탈퇴 처리하지 못했어요.");
    } finally {
      setTarget(null);
      setBusy(false);
    }
  };

  // 처음부터 못 불러왔을 때만 화면 전체를 안내로 (목록을 한 번 받은 뒤 검색이 실패하면 목록 위에 문구만)
  if (error && !data) return <div className="page"><p>{error}</p></div>;
  if (!data) return <div className="page"><p className="sub">불러오는 중…</p></div>;

  // 페이지 번호 [1] [2] [3] …
  const lastPage = Math.max(1, Math.ceil(data.total / data.size));
  const pages = [];
  for (let i = 1; i <= lastPage; i++) pages.push(i);

  return (
    <div className={"page col " + styles.admin}>
      <AdminNav />
      <h1>회원 관리</h1>

      <Panel title={`회원 ${data.total}명`}>
        {/* 검색 */}
        <form className={styles.search} onSubmit={handleSearch}>
          <input
            className="input"
            placeholder="아이디, 닉네임, 이메일"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">전체</option>
            <option value="ACTIVE">활동 중</option>
            <option value="WITHDRAWN">탈퇴</option>
          </select>
          <Button type="primary" onClick={handleSearch}>검색</Button>
        </form>

        {message && <p className={styles.message}>{message}</p>}
        {error && <p className={styles.error}>{error}</p>}

        {/* 목록 */}
        {data.list.length === 0 ? (
          <p className="sub">조건에 맞는 회원이 없어요.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>번호</th><th>아이디</th><th>닉네임</th><th>이메일</th><th>전화번호</th>
                <th>권한</th><th>포인트</th><th>인생</th><th>상태</th><th>가입일</th><th></th>
              </tr>
            </thead>
            <tbody>
              {data.list.map((m) => (
                <tr key={m.memberId} className={m.status === "WITHDRAWN" ? styles.out : ""}>
                  <td>{m.memberId}</td>
                  <td>{m.loginId}</td>
                  <td>{m.nickname}</td>
                  <td>{m.email}</td>
                  <td>{m.phone ? formatPhone(m.phone) : "-"}</td>
                  <td>{m.memberRole === "ADMIN" ? <Badge color="gold">관리자</Badge> : "회원"}</td>
                  <td>{m.point}P</td>
                  <td>{m.lifeCount}번</td>
                  <td><Badge color={m.status === "ACTIVE" ? "green" : "red"}>{STATUS_NAME[m.status]}</Badge></td>
                  <td>{m.joinDate}</td>
                  <td>
                    {/* 활동 중인 일반 회원만 탈퇴 버튼 (관리자·이미 탈퇴한 회원은 없음, 서버에서도 한 번 더 막음) */}
                    {m.status === "ACTIVE" && m.memberRole !== "ADMIN" && (
                      <Button size="sm" type="danger" onClick={() => { setMessage(""); setTarget(m); }}>
                        강제 탈퇴
                      </Button>
                    )}
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
      </Panel>

      {/* 강제 탈퇴 확인 창 */}
      <Modal open={target !== null} title="강제 탈퇴" onClose={() => setTarget(null)}>
        {target && (
          <>
            <p><b>{target.nickname}</b> ({target.loginId}) 님을 탈퇴 처리할까요?</p>
            <p className="sub">탈퇴하면 이 회원은 바로 로그인할 수 없고 전화번호는 지워져요. 인생 기록과 추모관 글은 남아요.</p>
            <div className={styles.actions}>
              <Button onClick={() => setTarget(null)}>취소</Button>
              <Button type="danger" disabled={busy} onClick={withdraw}>{busy ? "처리하는 중…" : "탈퇴시키기"}</Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

export default AdminMembers;
