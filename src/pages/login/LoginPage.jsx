import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import client from "../../api/api";
import Button from "../../common/ui/Button";
import styles from "./LoginPage.module.css";

// 로그인 화면 (M02)

function LoginPage() {
  const navi = useNavigate();
  const location = useLocation();
  const expired = new URLSearchParams(location.search).get("expired");
  const notice = location.state?.message || (expired ? "로그인이 만료됐어요. 다시 로그인하면 이어서 살 수 있어요." : null);
  const background = location.state?.background;
  const returnTo = background || location.state?.returnTo;

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false); // 로그인 중 (연타로 요청 여러 번 막기)
  // 회원 인생과 비회원 인생 중 무엇을 이어갈지 묻는 중이면 로그인 응답을 여기 잠깐 맡겨 둠
  // (고르기 전에 팝업을 닫으면 로그인하지 않은 것으로 → 하던 비회원 인생이 그대로 이어짐)
  const [pending, setPending] = useState(null);

  // 이미 로그인한 상태로 들어오면 메인으로
  useEffect(() => {
    if (localStorage.getItem("token")) navi("/", { replace: true });
  }, [navi]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (busy) return;
    setError("");

    if (!loginId || !password) {
      return setError("아이디와 비밀번호를 입력해 주세요.");
    }

    setBusy(true);
    try {
      // 비회원으로 하던 인생이 있으면 그 임시 토큰도 같이 보냄 (서버가 회원 인생으로 전환)
      const guestToken = localStorage.getItem("guestToken");

      const resp = await client.post("/api/members/login", { loginId, password, guestToken });

      // 회원에게 이미 진행 중인 인생이 있는데 비회원으로 하던 인생도 있음 → 저장하기 전에 어느 쪽을 이어갈지 물어봄
      if (resp.data.guestPending) {
        setPending(resp.data);
        return;
      }
      saveLogin(resp.data);
      if (resp.data.guestConverted) {
        localStorage.removeItem("guestToken");
      }
      goBack(resp.data.guestConverted);
    } catch (err) {
      setError(err.response?.data?.message || "아이디 또는 비밀번호가 맞지 않아요.");
    } finally {
      setBusy(false);
    }
  };

  // 로그인 정보 저장 (헤더에 보여 줄 닉네임, 관리자 메뉴용 권한도)
  const saveLogin = (data) => {
    localStorage.setItem("token", data.token);
    localStorage.setItem("nickname", data.nickname);
    localStorage.setItem("memberRole", data.memberRole);
  };

  // 로그인 끝 → 팝업·가입 전 화면(플레이·추모관 등)이 있으면 그곳으로, 비회원 인생을 전환했으면 플레이 화면으로, 아니면 메인
  // ※ 플레이 화면은 비회원 인생을 들고 있어서, 화면을 새로 불러와야 회원 인생으로 다시 시작함
  const goBack = (converted = false) => {
    if (returnTo) window.location.href = returnTo.pathname + returnTo.search;
    else if (converted) window.location.href = "/play";
    else navi("/");
  };

  // [비회원 인생 이어가기] → 회원이 하던 인생은 포기하고 비회원 인생을 회원 인생으로 옮김
  const takeGuest = async () => {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      // 아직 저장 전이라 토큰을 직접 붙여 보냄
      await client.post("/api/members/me/takeGuestLife", { guestToken: localStorage.getItem("guestToken") },
        { headers: { Authorization: `Bearer ${pending.token}` } });
      saveLogin(pending);
      localStorage.removeItem("guestToken");
      goBack(true);
    } catch (err) {
      setError(err.response?.data?.message || "인생을 옮기지 못했어요.");
      setBusy(false);
    }
  };

  // [원래 인생 이어가기] → 비회원 인생은 두고(7일 뒤 정리) 회원 인생으로
  const keepMine = () => {
    saveLogin(pending);
    localStorage.removeItem("guestToken");
    goBack();
  };

  // 어느 인생을 이어갈지 고르는 화면
  if (pending) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>이미 진행 중인 인생이 있어요</div>
          <div className={styles.cardBody}>
            <p className={styles.hint}>이 계정에는 이어서 하던 인생이 있어요. 어느 인생을 이어서 할까요?</p>
            {error && <div className={styles.errorBox}>{error}</div>}
            <Button type="primary" size="lg" block className={styles.mainBtn} disabled={busy} onClick={takeGuest}>
              {busy ? "옮기는 중…" : "지금 하던 비회원 인생 이어가기"}
            </Button>
            <p className={styles.hint}>계정에서 하던 원래 인생은 포기돼요.</p>
            <Button block className={styles.subBtn} disabled={busy} onClick={keepMine}>
              계정의 원래 인생 이어가기
            </Button>
            <p className={styles.hint}>지금 하던 비회원 인생은 이어서 할 수 없어요.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.cardTitle}>로그인</div>

        <div className={styles.cardBody}>
          <label className={styles.label}>아이디</label>
          <input className={styles.input} value={loginId} onChange={(e) => setLoginId(e.target.value)} />

          <label className={styles.label}>비밀번호</label>
          <input className={styles.input} type="password" value={password}
            onChange={(e) => setPassword(e.target.value)} />

          {/* 안내 문구 (회원가입·비밀번호 변경을 마치고 왔을 때) */}
          {notice && !error && <div className={styles.noticeBox}>{notice}</div>}

          {/* 오류 문구 칸 (와이어프레임의 회색 상자) */}
          {error && <div className={styles.errorBox}>{error}</div>}

          {/* 엔터로 로그인되게 하는 숨은 버튼 (공통 Button 은 type="button" 이라 엔터 제출이 안 됨) */}
          <button type="submit" hidden />
          <Button type="primary" size="lg" block className={styles.mainBtn} disabled={busy} onClick={handleSubmit}>
            {busy ? "로그인 중…" : "로그인"}
          </Button>

          <div className={styles.links}>
            <Link to="/find" state={{ background, returnTo }}>아이디·비밀번호 찾기</Link>
            <span>|</span>
            <Link to="/join" state={{ returnTo }}>회원가입</Link>
          </div>

          <Button block className={styles.subBtn} onClick={() => navi("/")}>
            로그인 없이 태어나기
          </Button>
          <p className={styles.hint}>비회원은 퀘스트·포인트 없이 진행돼요.</p>
        </div>
      </form>
    </div>
  );
}

export default LoginPage;
