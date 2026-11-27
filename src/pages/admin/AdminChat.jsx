import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import client from "../../api/api";
import AdminNav from "./AdminNav";
import Panel from "../../common/ui/Panel";
import Button from "../../common/ui/Button";
import Badge from "../../common/ui/Badge";
import Modal from "../../common/ui/Modal";
import Chips from "../../common/ui/Chips";
import styles from "./AdminChat.module.css";

// A02 관리자 채팅 · 방명록 · 금칙어 관리  주소: /admin/chat (관리자만)
//   1. 금칙어 관리 (BANNED_WORD): 조회 · 검색 · 추가 · 삭제 (마을 채팅 + 추모관 한마디·방명록 공통 적용)
//   2. 내역 관리 탭: 마을 채팅(CHAT_MESSAGE) / 추모관 방명록(MEMORIAL_COMMENT) / 추모관 글(MEMORIAL_POST) 검색 · 10개씩 페이징 · 삭제
const TABS = [
  { value: "chats", label: "마을 채팅" },
  { value: "comments", label: "추모관 방명록" },
  { value: "posts", label: "추모관 글" },
];

function AdminChat() {
  const navi = useNavigate();

  // ───── 1. 금칙어 상태 ─────
  const [words, setWords] = useState([]);
  const [newWord, setNewWord] = useState("");
  const [wordFilter, setWordFilter] = useState("");
  const [wordMsg, setWordMsg] = useState("");
  const [wordErr, setWordErr] = useState("");
  const [wordBusy, setWordBusy] = useState(false);

  // ───── 2. 채팅 · 방명록 · 추모관 글 목록 상태 ─────
  const [tab, setTab] = useState("chats");
  const [loadedTab, setLoadedTab] = useState("");
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState({ keyword: "", status: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);       // { total, page, size, list }
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const [target, setTarget] = useState(null);   // 삭제 확인 모달 { kind, id, title, content, sub }
  const [busy, setBusy] = useState(false);

  // 금칙어 목록 불러오기
  useEffect(() => {
    client.get("/api/admin/chat/words")
      .then((resp) => setWords(resp.data || []))
      .catch((err) => {
        if (err.response?.status === 401) {
          navi("/login", { state: { message: "로그인이 필요해요." } });
        }
      });
  }, [navi]);

  // 탭 · 검색어 · 페이지가 바뀌거나 삭제 후 목록 다시 불러오기
  useEffect(() => {
    const url = tab === "chats"
      ? "/api/admin/chat/messages"
      : tab === "comments"
        ? "/api/admin/chat/comments"
        : "/api/admin/chat/posts";
    const params = tab === "chats"
      ? { keyword: search.keyword, status: search.status, page }
      : { keyword: search.keyword, page };

    client.get(url, { params })
      .then((resp) => {
        setData(resp.data);
        setLoadedTab(tab);
        setError("");
      })
      .catch((err) => {
        if (err.response?.status === 401) {
          navi("/login", { state: { message: "로그인이 필요해요." } });
          return;
        }
        setError(err.response?.status === 403 ? "관리자만 볼 수 있어요." : "목록을 불러오지 못했어요.");
      });
  }, [tab, search, page, reload, navi]);

  // 탭 전환 시 검색 초기화
  const changeTab = (nextTab) => {
    setTab(nextTab);
    setKeyword("");
    setStatus("");
    setSearch({ keyword: "", status: "" });
    setPage(1);
    setMessage("");
  };

  // 금칙어 추가
  const handleAddWord = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const w = newWord.trim();
    if (!w || wordBusy) return;
    setWordBusy(true);
    setWordMsg("");
    setWordErr("");
    try {
      const resp = await client.post("/api/admin/chat/words", { word: w });
      setWords(resp.data.words || []);
      setNewWord("");
      setWordMsg(`'${w}' 금칙어를 추가했어요.`);
    } catch (err) {
      setWordErr(err.response?.data?.message || "금칙어를 추가하지 못했어요.");
    } finally {
      setWordBusy(false);
    }
  };

  // 금칙어 삭제
  const handleRemoveWord = async (w) => {
    if (wordBusy) return;
    setWordBusy(true);
    setWordMsg("");
    setWordErr("");
    try {
      const resp = await client.delete("/api/admin/chat/words", { params: { word: w } });
      setWords(resp.data.words || []);
      setWordMsg(`'${w}' 금칙어를 삭제했어요.`);
    } catch (err) {
      setWordErr(err.response?.data?.message || "금칙어를 삭제하지 못했어요.");
    } finally {
      setWordBusy(false);
    }
  };

  // 검색 버튼
  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setSearch({ keyword: keyword.trim(), status });
    setPage(1);
  };

  // 삭제 확인 모달의 [삭제하기]
  const confirmDelete = async () => {
    if (!target || busy) return;
    setBusy(true);
    try {
      const url = target.kind === "chats"
        ? `/api/admin/chat/messages/${target.id}`
        : target.kind === "comments"
          ? `/api/admin/chat/comments/${target.id}`
          : `/api/admin/chat/posts/${target.id}`;
      const resp = await client.delete(url);
      setMessage(resp.data?.message || "삭제했어요.");
      // 마지막 페이지의 마지막 1건을 삭제해 현재 페이지가 비게 되면 이전 페이지로 이동
      if ((tab !== "chats" || search.status === "N") && data?.list?.length === 1 && page > 1) {
        setPage((p) => p - 1);
      } else {
        setReload((n) => n + 1);
      }
    } catch (err) {
      setError(err.response?.data?.message || "삭제하지 못했어요.");
    } finally {
      setTarget(null);
      setBusy(false);
    }
  };

  if (error && !data) return <div className="page col"><AdminNav /><p>{error}</p></div>;
  if (!data) return <div className="page col"><AdminNav /><p className="sub">불러오는 중…</p></div>;

  const filteredWords = wordFilter.trim()
    ? words.filter((w) => w.toLowerCase().includes(wordFilter.trim().toLowerCase()))
    : words;

  const lastPage = Math.max(1, Math.ceil(data.total / data.size));
  const pages = [];
  for (let i = 1; i <= lastPage; i++) pages.push(i);

  const tabTitle = tab === "chats" ? `마을 채팅 ${loadedTab === tab ? data.total + "건" : "불러오는 중…"}`
    : tab === "comments" ? `추모관 방명록 ${loadedTab === tab ? data.total + "건" : "불러오는 중…"}`
      : `추모관 글 ${loadedTab === tab ? data.total + "건" : "불러오는 중…"}`;

  return (
    <div className={"page col " + styles.admin}>
      <AdminNav />
      <h1>채팅 · 방명록 · 금칙어 관리</h1>

      {/* ───── 1. 금칙어 관리 패널 ───── */}
      <Panel title={`금칙어 ${words.length}개`}>
        <p className="sub" style={{ marginTop: 0, marginBottom: "var(--sp-3)" }}>
          등록된 금칙어는 인게임 마을 실시간 채팅, 회원 닉네임, 추모관 마지막 한마디·방명록에 함께 적용돼요. (띄어쓰기·대소문자 무시)
        </p>

        <div className={styles.wordTop}>
          <form className={styles.wordForm} onSubmit={handleAddWord}>
            <input
              className="input"
              maxLength={30}
              placeholder="추가할 금칙어 입력 (최대 30자)"
              value={newWord}
              onChange={(e) => setNewWord(e.target.value)}
            />
            <Button type="primary" disabled={wordBusy || !newWord.trim()} onClick={handleAddWord}>
              금칙어 추가
            </Button>
          </form>

          {words.length > 5 && (
            <input
              className={"input " + styles.wordFilter}
              placeholder="등록된 금칙어 찾기"
              value={wordFilter}
              onChange={(e) => setWordFilter(e.target.value)}
            />
          )}
        </div>

        {wordMsg && <p className={styles.message}>{wordMsg}</p>}
        {wordErr && <p className={styles.error}>{wordErr}</p>}

        {words.length === 0 ? (
          <p className="sub">아직 등록된 금칙어가 없어요. 위 입력칸에서 금칙어를 추가해 보세요.</p>
        ) : filteredWords.length === 0 ? (
          <p className="sub">검색어와 일치하는 금칙어가 없어요.</p>
        ) : (
          <div className={styles.wordList}>
            {filteredWords.map((w) => (
              <span key={w} className={styles.wordChip}>
                <b>{w}</b>
                <button
                  type="button"
                  className={styles.wordDel}
                  disabled={wordBusy}
                  title={`'${w}' 금칙어 삭제`}
                  aria-label={`'${w}' 금칙어 삭제`}
                  onClick={() => handleRemoveWord(w)}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </Panel>

      {/* ───── 2. 마을 채팅 · 추모관 방명록 · 추모관 글 관리 패널 ───── */}
      <Panel title={tabTitle}>
        <div className={styles.tabBar}>
          <Chips items={TABS} selected={tab} onPick={changeTab} />
        </div>

        <form className={styles.search} onSubmit={handleSearch}>
          <input
            className="input"
            placeholder={
              tab === "chats"
                ? "채팅 내용, 닉네임, 아이디, 나라 검색"
                : tab === "comments"
                  ? "방명록 내용, 작성자 닉네임, 아이디, 추모관 이름 검색"
                  : "마지막 한마디, 작성자 닉네임, 아이디, 고인 이름 검색"
            }
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          {tab === "chats" && (
            <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">전체 상태</option>
              <option value="N">정상</option>
              <option value="Y">삭제됨</option>
            </select>
          )}
          <Button type="primary" onClick={handleSearch}>검색</Button>
        </form>

        {message && <p className={styles.message}>{message}</p>}
        {error && <p className={styles.error}>{error}</p>}

        {loadedTab !== tab ? (
          <p className="sub">불러오는 중…</p>
        ) : data.list.length === 0 ? (
          <p className="sub">조건에 맞는 내역이 없어요.</p>
        ) : tab === "chats" ? (
          <div style={{ overflowX: "auto" }}><table className={styles.table}>
            <thead>
              <tr>
                <th>번호</th><th>나라</th><th>작성자</th><th>내용</th><th>작성 시각</th><th>상태</th><th></th>
              </tr>
            </thead>
            <tbody>
              {data.list.map((c) => (
                <tr key={c.msgId} className={c.isDeleted === "Y" ? styles.out : ""}>
                  <td>{c.msgId}</td>
                  <td><Badge>{c.countryName}</Badge></td>
                  <td><b>{c.nickname}</b> <small className={styles.subText}>({c.loginId})</small></td>
                  <td className={styles.contentCell}>{c.content}</td>
                  <td>{c.createdAt}</td>
                  <td>
                    <Badge color={c.isDeleted === "N" ? "green" : "red"}>
                      {c.isDeleted === "N" ? "정상" : "삭제됨"}
                    </Badge>
                  </td>
                  <td>
                    {c.isDeleted === "N" && (
                      <Button
                        size="sm"
                        type="danger"
                        onClick={() => {
                          setMessage("");
                          setTarget({
                            kind: "chats",
                            id: c.msgId,
                            title: "채팅 메시지 삭제",
                            content: c.content,
                            sub: `${c.nickname} (${c.loginId}) · ${c.countryName} · ${c.createdAt}`,
                          });
                        }}
                      >
                        삭제
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : tab === "comments" ? (
          <div style={{ overflowX: "auto" }}><table className={styles.table}>
            <thead>
              <tr>
                <th>번호</th><th>추모관</th><th>작성자</th><th>방명록 내용</th><th>작성 시각</th><th></th>
              </tr>
            </thead>
            <tbody>
              {data.list.map((c) => (
                <tr key={c.commentId}>
                  <td>{c.commentId}</td>
                  <td>
                    <Link to={`/memorial/${c.lifeId}/guest`} className={styles.link}>
                      {c.lifeName}의 방 ›
                    </Link>
                  </td>
                  <td><b>{c.nickname}</b> <small className={styles.subText}>({c.loginId})</small></td>
                  <td className={styles.contentCell}>{c.content}</td>
                  <td>{c.createdAt}</td>
                  <td>
                    <Button
                      size="sm"
                      type="danger"
                      onClick={() => {
                        setMessage("");
                        setTarget({
                          kind: "comments",
                          id: c.commentId,
                          title: "추모관 방명록 삭제",
                          content: c.content,
                          sub: `${c.nickname} (${c.loginId}) · ${c.lifeName}의 방 · ${c.createdAt}`,
                        });
                      }}
                    >
                      삭제
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        ) : (
          <div style={{ overflowX: "auto" }}><table className={styles.table}>
            <thead>
              <tr>
                <th>번호</th><th>추모관 (고인)</th><th>작성자</th><th>마지막 한마디</th><th>촛불·방명록</th><th>개설 시각</th><th></th>
              </tr>
            </thead>
            <tbody>
              {data.list.map((p) => (
                <tr key={p.postId}>
                  <td>{p.postId}</td>
                  <td>
                    <Link to={`/memorial/${p.lifeId}`} className={styles.link}>
                      {p.lifeName} ({p.countryName}) ›
                    </Link>
                  </td>
                  <td><b>{p.nickname}</b> <small className={styles.subText}>({p.loginId})</small></td>
                  <td className={styles.contentCell}>{p.message}</td>
                  <td>
                    <Badge color="gold">🕯 {p.tributeCount}</Badge>{" "}
                    <Badge>💬 {p.commentCount}</Badge>
                  </td>
                  <td>{p.createdAt}</td>
                  <td>
                    <Button
                      size="sm"
                      type="danger"
                      onClick={() => {
                        setMessage("");
                        setTarget({
                          kind: "posts",
                          id: p.postId,
                          title: "추모관 글 삭제",
                          content: p.message,
                          sub: `${p.lifeName}의 방 · 작성자 ${p.nickname} (${p.loginId}) · 달린 방명록 ${p.commentCount}건과 촛불 기록도 함께 삭제됩니다.`,
                        });
                      }}
                    >
                      삭제
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        )}

        {/* 페이지 번호 */}
        {loadedTab === tab && lastPage > 1 && (
          <div className={styles.pager}>
            <Button size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>‹</Button>
            {pages.map((p) => (
              <Button key={p} size="sm" type={p === page ? "primary" : undefined} onClick={() => setPage(p)}>{p}</Button>
            ))}
            <Button size="sm" disabled={page === lastPage} onClick={() => setPage(page + 1)}>›</Button>
          </div>
        )}
      </Panel>

      {/* 삭제 확인 창 */}
      <Modal open={target !== null} title={target?.title || "삭제 확인"} onClose={() => setTarget(null)}>
        {target && (
          <>
            <p>아래 글을 삭제할까요?</p>
            <div className={styles.quoteBox}>
              <b>“{target.content}”</b>
              <small>{target.sub}</small>
            </div>
            <div className={styles.actions}>
              <Button onClick={() => setTarget(null)}>취소</Button>
              <Button type="danger" disabled={busy} onClick={confirmDelete}>
                {busy ? "처리하는 중…" : "삭제하기"}
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}

export default AdminChat;
