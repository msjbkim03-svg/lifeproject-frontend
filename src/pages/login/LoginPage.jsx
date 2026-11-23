import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import client from "../../api/api";
import Button from "../../common/ui/Button";
import styles from "./LoginPage.module.css";

// 로그인 화면 (M02)

function LoginPage() {
  const navi = useNavigate();
  const location = useLocation();
  const notice = location.state?.message;
  const background = location.state?.background;

  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!loginId || !password) {
      return setError("아이디와 비밀번호를 입력해 주세요.");
    }

    try {
      // 비회원으로 하던 인생이 있으면 그 임시 토큰도 같이 보냄 (서버가 회원 인생으로 전환)
      const guestToken = localStorage.getItem("guestToken");

      const resp = await client.post("/api/members/login", { loginId, password, guestToken });

      localStorage.setItem("token", resp.data.token);
      // 헤더에 보여줄 닉네임, 관리자 메뉴용 권한도 저장
      localStorage.setItem("nickname", resp.data.nickname);
      localStorage.setItem("memberRole", resp.data.memberRole);
      if (resp.data.guestConverted) {
        localStorage.removeItem("guestToken");
      }

      navi("/");
    } catch (err) {
      setError(err.response?.data?.message || "아이디 또는 비밀번호가 맞지 않아요.");
    }
  };

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
          <Button type="primary" size="lg" block className={styles.mainBtn} onClick={handleSubmit}>로그인</Button>

          <div className={styles.links}>
            <Link to="/find" state={{ background }}>아이디·비밀번호 찾기</Link>
            <span>|</span>
            <Link to="/join">회원가입</Link>
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
