import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import client from "../../api/api";
import Button from "../../common/ui/Button";
import { formatPhone } from "../../utils/phone";
import RecaptchaBox from "./RecaptchaBox";
import styles from "./JoinPage.module.css";

// 회원가입 화면 (M01)
function JoinPage() {
  const navi = useNavigate();

  // 이미 로그인한 상태로 들어오면 메인으로
  useEffect(() => {
    if (localStorage.getItem("token")) navi("/", { replace: true });
  }, [navi]);

  // 입력값 6개를 한 상자에
  const [form, setForm] = useState({
    loginId: "",
    password: "",
    passwordCheck: "",
    nickname: "",
    email: "",
    phone: "",
  });

  // 개인정보 수집·이용 동의 (필수)
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false); // 동의 내용 펼치기

  // 로봇 확인 (reCAPTCHA) - 체크하면 구글이 준 토큰, 안 했거나 풀리면 ''
  const [captchaToken, setCaptchaToken] = useState("");

  // 중복 확인 통과 여부 (true 여야 가입 가능)
  const [checked, setChecked] = useState({ loginId: false, nickname: false, email: false });

  // 각 칸 아래에 보여 줄 안내 문구
  const [msg, setMsg] = useState({ loginId: "", nickname: "", email: "" });

  // 맨 아래 왼쪽에 보여 줄 오류 문구
  const [error, setError] = useState("");

  // 가입 요청을 보내는 중인지 (연타 막기)
  const [busy, setBusy] = useState(false);

  // 전화번호는 utils/phone.js 의 formatPhone 으로 하이픈 자동 넣기

  // ① 글자를 칠 때마다 실행
  const handleChange = (e) => {
    const { name } = e.target;
    const value = name === "phone" ? formatPhone(e.target.value) : e.target.value;
    setForm({ ...form, [name]: value });

    // 중복 확인한 칸을 다시 고치면 → 다시 확인해야 함
    if (name in checked) {
      setChecked({ ...checked, [name]: false });
      setMsg({ ...msg, [name]: "" });
    }
  };

  // ② 중복 확인 버튼 (field = 'loginId' | 'nickname' | 'email')
  const checkDuplicate = async (field) => {
    const value = form[field];
    if (!value) {
      setMsg({ ...msg, [field]: "먼저 입력해 주세요." });
      return;
    }

    const urls = {
      loginId: `/api/members/checkId?loginId=${encodeURIComponent(value)}`,
      nickname: `/api/members/checkNickname?nickname=${encodeURIComponent(value)}`,
      email: `/api/members/checkEmail?email=${encodeURIComponent(value)}`,
    };

    try {
      const resp = await client.get(urls[field]); // 서버에 물어보기
      if (resp.data.available) {
        setChecked({ ...checked, [field]: true });
        setMsg({ ...msg, [field]: "사용할 수 있어요." });
      } else {
        setChecked({ ...checked, [field]: false });
        setMsg({ ...msg, [field]: "이미 사용 중이에요." });
      }
    } catch {
      setMsg({ ...msg, [field]: "서버에 연결할 수 없어요." });
    }
  };

  // ③ 가입하기 버튼
  const handleSubmit = async (e) => {
    e.preventDefault(); // 새로고침 막기
    if (busy) return;
    setError("");

    // 화면에서 먼저 검사 (서버에서도 한 번 더 검사함)
    if (!/^[a-zA-Z0-9]{4,20}$/.test(form.loginId)) {
      return setError("아이디는 영문·숫자 4~20자로 입력해 주세요.");
    }
    if (!/^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9]).{8,20}$/.test(form.password)) {
      return setError("비밀번호는 영문·숫자·특수문자를 포함해 8~20자로 입력해 주세요.");
    }
    if (form.password !== form.passwordCheck) {
      return setError("비밀번호 확인이 맞지 않아요.");
    }
    if (form.nickname.length < 2 || form.nickname.length > 10) {
      return setError("닉네임은 2~10자로 입력해 주세요.");
    }
    if (!checked.loginId || !checked.nickname || !checked.email) {
      return setError("아이디·닉네임·이메일 중복 확인을 해 주세요.");
    }
    if (!/^01[0-9]{8,9}$/.test(form.phone.replace(/-/g, ""))) {
      return setError("전화번호를 올바르게 입력해 주세요. (예: 010-1234-5678)");
    }
    if (!agreed) {
      return setError("개인정보 수집·이용에 동의해 주세요.");
    }
    if (!captchaToken) {
      return setError('"로봇이 아닙니다"에 체크해 주세요.');
    }

    setBusy(true);
    try {
      // 서버로 보내기 (동의 여부는 DB 값에 맞춰 Y / N 으로)
      // captchaToken 도 같이 보내면 서버가 구글에 진짜인지 확인함
      await client.post("/api/members", { ...form, privacyAgreed: agreed ? "Y" : "N", captchaToken });
      // 로그인 화면으로 이동 + 안내 문구 넘기기 (alert 창 대신 화면 안 초록 칸)
      navi("/login", { state: { message: "회원가입을 마쳤어요. 로그인해 주세요." } });
    } catch (err) {
      setError(err.response?.data?.message || "서버에 연결할 수 없어요.");
      // 토큰은 한 번만 쓸 수 있어서, 실패하면 체크박스를 비우고 다시 체크하게 함
      window.grecaptcha?.reset();
      setCaptchaToken("");
    } finally {
      setBusy(false);
    }
  };

  // 비밀번호 확인 칸 아래 문구
  const pwMatch = form.password === form.passwordCheck;
  const pwMatchMsg =
    form.passwordCheck === "" ? "" : pwMatch ? "비밀번호가 같아요." : "비밀번호가 달라요.";

  // 문구 색: 통과면 초록(hintOk), 아니면 빨강(hint)
  const hintClass = (ok) => (ok ? styles.hintOk : styles.hint);

  return (
    <div className={styles.container}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.cardTitle}>회원가입</div>

        <div className={styles.cardBody}>
          {/* 아이디 */}
          <div className={styles.row}>
            <label className={styles.label}>아이디</label>
            <div className={styles.field}>
              <div className={styles.inputWithBtn}>
                <input className={styles.input} name="loginId" value={form.loginId}
                  onChange={handleChange} placeholder="영문·숫자 4~20자" />
                <Button className={styles.noWrap} onClick={() => checkDuplicate("loginId")}>중복 확인</Button>
              </div>
              <p className={hintClass(checked.loginId)}>{msg.loginId}</p>
            </div>
          </div>

          {/* 비밀번호 */}
          <div className={styles.row}>
            <label className={styles.label}>비밀번호</label>
            <div className={styles.field}>
              <input className={styles.input} type="password" name="password" value={form.password}
                onChange={handleChange} placeholder="영문·숫자·특수문자 포함 8~20자" />
            </div>
          </div>

          {/* 비밀번호 확인 */}
          <div className={styles.row}>
            <label className={styles.label}>비밀번호 확인</label>
            <div className={styles.field}>
              <input className={styles.input} type="password" name="passwordCheck" value={form.passwordCheck}
                onChange={handleChange} />
              <p className={hintClass(pwMatch)}>{pwMatchMsg}</p>
            </div>
          </div>

          {/* 닉네임 */}
          <div className={styles.row}>
            <label className={styles.label}>닉네임</label>
            <div className={styles.field}>
              <div className={styles.inputWithBtn}>
                <input className={styles.input} name="nickname" value={form.nickname}
                  onChange={handleChange} placeholder="2~10자" />
                <Button className={styles.noWrap} onClick={() => checkDuplicate("nickname")}>중복 확인</Button>
              </div>
              <p className={hintClass(checked.nickname)}>{msg.nickname}</p>
            </div>
          </div>

          {/* 이메일 */}
          <div className={styles.row}>
            <label className={styles.label}>이메일</label>
            <div className={styles.field}>
              <div className={styles.inputWithBtn}>
                <input className={styles.input} type="email" name="email" value={form.email}
                  onChange={handleChange} placeholder="아이디·비밀번호 찾기에 사용" />
                <Button className={styles.noWrap} onClick={() => checkDuplicate("email")}>중복 확인</Button>
              </div>
              <p className={hintClass(checked.email)}>{msg.email}</p>
            </div>
          </div>

          {/* 전화번호 */}
          <div className={styles.row}>
            <label className={styles.label}>전화번호</label>
            <div className={styles.field}>
              <input className={styles.input} type="tel" name="phone" value={form.phone}
                onChange={handleChange} placeholder="010-1234-5678" />
            </div>
          </div>

          {/* 개인정보 수집·이용 동의 (필수) */}
          <div className={styles.agreeBox}>
            <div className={styles.agreeRow}>
              <label className={styles.agreeLabel}>
                <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
                <span><b>[필수]</b> 개인정보 수집·이용에 동의합니다.</span>
              </label>
              <button type="button" className={styles.agreeToggle} onClick={() => setShowTerms(!showTerms)}>
                {showTerms ? "닫기" : "내용 보기"}
              </button>
            </div>
            {showTerms && (
              <div className={styles.agreeText}>
                <p><b>수집 항목</b> 아이디, 비밀번호, 닉네임, 이메일, 전화번호</p>
                <p><b>이용 목적</b> 회원 식별, 로그인, 아이디·비밀번호 찾기, 서비스 이용 안내</p>
                <p><b>보유 기간</b> 회원 탈퇴 시까지</p>
                <p className={styles.agreeNote}>동의하지 않으면 회원가입을 할 수 없어요. 비회원으로는 계속 이용할 수 있어요.</p>
              </div>
            )}
          </div>

          {/* 로봇 확인 (reCAPTCHA) */}
          <div className={styles.captcha}>
            <RecaptchaBox onChange={setCaptchaToken} />
          </div>
        </div>

        <div className={styles.cardFooter}>
          <p className={styles.error}>{error}</p>
          <div className={styles.footerBtns}>
            <button type="submit" hidden />
            <Button onClick={() => navi("/")}>취소</Button>
            <Button type="primary" disabled={busy} onClick={handleSubmit}>{busy ? "가입하는 중…" : "가입하기"}</Button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default JoinPage;
