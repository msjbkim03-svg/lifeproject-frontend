import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate, useParams } from "react-router-dom";
import client from "../../api/api";
import Button from "../../common/ui/Button";
import Panel from "../../common/ui/Panel";
import { buildFilm } from "../../engine/film/filmPlan";
import MemorialSide from "./MemorialSide";
import { TABS, toRoom } from "./memorialData";
import s from "./MemorialRoom.module.css";

// 추모관 방 틀 (B01)  주소가 /memorial/:lifeId 로 시작하면 항상 이 화면이 먼저 그려짐
//   왼쪽: MemorialSide (사람 카드 + 촛불)
//   오른쪽: 탭 줄 + <Outlet /> 자리에 주소에 맞는 탭 화면
//     /memorial/1 → 방,  /video → 영상,  /album → 사진첩,  /guest → 방명록,  /last → 마지막 순간
// 방 정보(GET /api/memorials/{lifeId})는 여기서 한 번만 받아서 context 로 탭들에 넘겨 줌
function MemorialRoomPage() {
  const { lifeId } = useParams();
  const navi = useNavigate();
  const location = useLocation();
  const isLogin = !!localStorage.getItem("token");

  const [room, setRoom] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [notice, setNotice] = useState(""); // 화면 안 안내 문구
  const [film, setFilm] = useState(null);   // 엔딩 영상 재료 { result, film, wear } (못 받으면 false) → 영상·사진첩 탭

  // 1. 방 불러오기
  //    view: true 면 조회수 +1 (처음 들어올 때만, 방명록 쓰고 다시 불러올 때는 안 올림)
  const load = (view = false) => {
    client.get(`/api/memorials/${lifeId}`, { params: { view } })
      .then((resp) => { setRoom(toRoom(resp.data)); setLoadError(false); })
      .catch(() => setLoadError(true));
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => load(true), [lifeId]);

  // 1-2. 엔딩 영상 재료 (팀원 C22 엔딩 영상과 같은 재료) → 영상 탭은 영상 그대로, 사진첩은 영상 속 장면
  useEffect(() => {
    let alive = true;
    client.get(`/api/memorials/${lifeId}/film`)
      .then((resp) => { if (alive) setFilm(resp.data); })
      .catch(() => { if (alive) setFilm(false); });
    return () => { alive = false; };
  }, [lifeId]);

  // 1-3. 영상 순서표 (장면 목록) - 팀원 buildFilm 을 한 번만 돌려서 초상 · 방 · 사진첩 · 영상 탭이 같이 씀
  //   영상 재료가 조금 이상해서 buildFilm 이 에러를 내도 방 전체가 하얀 화면이 되지 않게
  //   → 실패하면 null (장면 칸만 비고 방 · 방명록 · 마지막 순간은 그대로 보임)
  const plan = useMemo(() => {
    if (!film?.result || !film?.film) return null;
    try {
      return buildFilm(film.result, { ...film.film, wear: film.wear });
    } catch (e) {
      console.warn("추모관 영상 순서표를 만들지 못했어요.", e);
      return null;
    }
  }, [film]);

  // 401 이면 로그인 화면으로
  //   background = 지금 화면 → 로그인 팝업이 뜨고, 로그인하면 이 추모관으로 돌아옴
  const goLogin = () => navi("/login", { state: { message: "로그인하고 다시 해 주세요.", background: location } });

  // 추모관 열기 (내 끝난 인생, 마지막 한마디)
  const openRoom = async (message) => {
    try {
      await client.post(`/api/memorials/${lifeId}/open`, { message });
      load();
    } catch (e) {
      if (e.response?.status === 401) return goLogin();
      setNotice(e.response?.data?.message ?? "추모관을 열지 못했어요.");
    }
  };

  // 2. 촛불 켜기 (회원당 1개)
  const lightCandle = async () => {
    if (!isLogin) return goLogin();
    try {
      const resp = await client.post(`/api/memorials/${lifeId}/candle`);
      setRoom({ ...room, myCandle: true, tributeCount: resp.data.tributeCount ?? room.tributeCount + 1 });
    } catch (e) {
      if (e.response?.status === 401) return goLogin();
      if (e.response?.status === 400) setRoom({ ...room, myCandle: true }); // 이미 켬
      else setNotice("촛불을 켜지 못했어요. 잠시 뒤 다시 해 주세요.");
    }
  };

  // 3. 방명록 남기기 (성공하면 true → 방명록 탭이 입력칸을 비움)
  const sendComment = async (content) => {
    if (!isLogin) { goLogin(); return false; }
    try {
      await client.post(`/api/memorials/${lifeId}/comments`, { content });
      load();
      return true;
    } catch (e) {
      if (e.response?.status === 401) goLogin();
      else setNotice(e.response?.data?.message ?? "방명록을 남기지 못했어요.");
      return false;
    }
  };

  // 4. 내 방명록 지우기
  const deleteComment = async (commentId) => {
    try {
      await client.delete(`/api/memorials/comments/${commentId}`);
      load();
    } catch (e) {
      if (e.response?.status === 401) return goLogin();
      setNotice("방명록을 지우지 못했어요.");
    }
  };

  // 5. 링크 복사
  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
      .then(() => setNotice("링크를 복사했어요."))
      .catch(() => setNotice("링크를 복사하지 못했어요."));
  };

  if (loadError) return <main className="page"><p className={s.empty}>추모관을 불러오지 못했어요.</p></main>;
  if (!room) return <main className="page"><p className={s.empty}>불러오는 중…</p></main>;

  const base = `/memorial/${lifeId}`;

  return (
    <main className={`page ${s.page}`}>
      {/* 위 길 표시 */}
      <div className={s.crumb}>
        <span className={s.house}>⚰️</span>
        <Link to="/memorial">전생의 집</Link>
        <span>›</span>
        <b>{room.name}의 방</b>
        <Button size="sm" style={{ marginLeft: "auto" }} onClick={() => navi(`/result/${lifeId}?detail=1`)}>
          인생 기록 보기
        </Button>
      </div>

      <div className={s.layout}>
        <MemorialSide room={room} film={film} onCandle={lightCandle} onOpen={openRoom} />

        <Panel className={s.main}>
          {/* 탭 줄: 지금 주소와 같은 탭이 강조됨 (NavLink 가 알아서 on) */}
          <nav className={s.tabs}>
            {TABS.map((t) => (
              <NavLink
                key={t.path}
                to={t.path ? `${base}/${t.path}` : base}
                end
                className={({ isActive }) => (isActive ? `${s.tab} ${s.tabOn}` : s.tab)}
              >
                {t.label}
              </NavLink>
            ))}
          </nav>
          {/* 탭 화면들은 useOutletContext() 로 room 등을 꺼내 씀 */}
          <Outlet context={{ room, base, isLogin, sendComment, deleteComment, film, plan }} />
        </Panel>
      </div>

      {notice && <p className={s.notice}>{notice}</p>}

      {/* 아래 */}
      <Panel className={s.bottom}>
        <p>당신은 80억 명 가운데 어디에서, 누구로 태어날까요?</p>
        <div className="row" style={{ justifyContent: "center" }}>
          <Button type="primary" onClick={() => navi("/")}>나도 태어나 보기</Button>
          <Button onClick={() => navi(`/result/${lifeId}?detail=1`)}>인생 기록 보기</Button>
          <Button onClick={copyLink}>링크 복사</Button>
          <Button onClick={() => navi("/memorial")}>다른 추모관 둘러보기</Button>
        </div>
      </Panel>
    </main>
  );
}

export default MemorialRoomPage;
