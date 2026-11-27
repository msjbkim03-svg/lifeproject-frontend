import { useEffect, useRef, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import client from "../../api/api";
import Button from "../../common/ui/Button";
import Modal from "../../common/ui/Modal";
import { formatPhone } from "../../utils/phone";
import common from "./MyPage.module.css"; // 마이페이지와 같은 틀 (container, card, title …)
import styles from "./EditPage.module.css"; // 이 화면만 쓰는 입력칸 모양

// 구글 OAuth 클라이언트 ID (LoginPage.jsx 와 동일)
const GOOGLE_CLIENT_ID = "1060054612101-00gbenedhdoubrsnk69e4guoblbpdovc.apps.googleusercontent.com";

// 개인정보 수정 (M05) + 회원 탈퇴 (M06)  주소: /my/edit
// 와이어프레임 16쪽
function EditPage() {
  const navi = useNavigate();

  // 내 정보는 MyPageLayout 이 넘겨 줌 (setMy 로 바꾸면 왼쪽 메뉴 닉네임도 같이 바뀜)
  const { my, setMy } = useOutletContext();
  const isGoogle = Boolean(my.loginId && my.loginId.startsWith("g_"));

  // 입력칸 값 (처음엔 내 정보로 채워 둠)
  const [nickname, setNickname] = useState(my.nickname);
  const [email, setEmail] = useState(my.email);
  const [phone, setPhone] = useState(formatPhone(my.phone)); // 010-1234-5678 모양 (예전 회원은 빈칸)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPasswordCheck, setNewPasswordCheck] = useState("");

  // 안내 문구
  const [nickMsg, setNickMsg] = useState("");
  const [emailMsg, setEmailMsg] = useState("");

  // 이메일 변경 인증 (이메일을 바꿨을 때만 씀)
  const [emailCode, setEmailCode] = useState("");
  const [emailSent, setEmailSent] = useState(false); // 새 이메일로 인증번호를 보냈는지
  const [sending, setSending] = useState(false);     // 메일 보내는 중 (서버 대답 기다리는 동안)
  const [message, setMessage] = useState(""); // 저장 결과
  const [error, setError] = useState("");     // 저장 오류

  // 탈퇴
  const [withdrawPw, setWithdrawPw] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false); // 탈퇴 확인 창

  // 저장·탈퇴 요청을 보내는 중인지 (연타 막기)
  const [busy, setBusy] = useState(false);

  // 구글 소셜 계정 탈퇴 시 본인 확인(재인증)용 OAuth 클라이언트
  const googleTokenClientRef = useRef(null);
  const googleWithdrawCbRef = useRef(null);
  const withdrawPendingRef = useRef(false);

  const closeConfirm = () => {
    withdrawPendingRef.current = false;
    setConfirmOpen(false);
    setBusy(false);
  };

  useEffect(() => {
    if (!isGoogle) return;
    const initClient = () => {
      if (!window.google?.accounts?.oauth2) return;
      googleTokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "openid email profile",
        callback: (res) => {
          if (res?.access_token) {
            googleWithdrawCbRef.current?.(res.access_token);
          } else {
            setConfirmOpen(false);
            setWithdrawError("Google 본인 확인이 취소되었어요.");
            setBusy(false);
          }
        },
        error_callback: () => {
          setConfirmOpen(false);
          setWithdrawError("Google 본인 확인이 취소되었어요.");
          setBusy(false);
        },
      });
    };

    if (window.google?.accounts?.oauth2) {
      initClient();
      return;
    }

    const existing = document.getElementById("google-gsi-script");
    if (existing) {
      existing.addEventListener("load", initClient);
      return () => existing.removeEventListener("load", initClient);
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client?hl=ko";
    script.async = true;
    script.defer = true;
    script.onload = initClient;
    document.body.appendChild(script);
  }, [isGoogle]);

  // 이메일을 바꿨는지 (공백·대소문자는 무시 → 서버와 같은 기준)
  const emailChanged = email.trim().toLowerCase() !== (my.email || "").toLowerCase();

  // 2. 닉네임 중복 확인 (원래 닉네임 그대로면 확인 필요 없음)
  const checkNickname = async () => {
    if (nickname === my.nickname) return setNickMsg("지금 쓰는 닉네임이에요.");
    const nick = nickname.trim();
    if (nick.length < 2 || nick.length > 10) return setNickMsg("닉네임은 2~10자로 입력해 주세요.");
    try {
      const resp = await client.get("/api/members/checkNickname", { params: { nickname } });
      setNickMsg(resp.data.available ? "사용할 수 있는 닉네임이에요." : (resp.data.message || "이미 사용 중인 닉네임이에요."));
    } catch {
      setNickMsg("중복 확인을 하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    }
  };

  // 3. 이메일 중복 확인
  const checkEmail = async () => {
    if (!emailChanged) return setEmailMsg("지금 쓰는 이메일이에요.");
    if (!/^[\w.+-]+@[\w-]+\.[\w.]+$/.test(email.trim())) return setEmailMsg("이메일 형식이 맞지 않아요.");
    try {
      const resp = await client.get("/api/members/checkEmail", { params: { email } });
      setEmailMsg(resp.data.available ? "사용할 수 있는 이메일이에요." : "이미 사용 중인 이메일이에요.");
    } catch {
      setEmailMsg("중복 확인을 하지 못했어요. 잠시 뒤 다시 시도해 주세요.");
    }
  };

  // 3-1. 새 이메일로 인증번호 받기 → POST /api/members/me/emailCode
  //   입력칸은 바로 열어 두고(기다리는 동안 메일함 확인 가능) → 실패하면 다시 닫고 이유를 보여 줌
  const sendEmailCode = async () => {
    if (sending) return;
    setSending(true);
    setEmailSent(true);
    setEmailMsg("새 이메일로 인증번호를 보내고 있어요…");
    try {
      const resp = await client.post("/api/members/me/emailCode", { email });
      setEmailMsg(resp.data.message);
    } catch (err) {
      setEmailSent(false);
      setEmailCode("");
      setEmailMsg(err.response?.data?.message || "인증번호를 보내지 못했어요.");
    } finally {
      setSending(false);
    }
  };

  // 4. 저장하기 → PUT /api/members/me
  const save = async () => {
    if (busy) return;
    setMessage("");
    setError("");
    if (!isGoogle && !currentPassword) return setError("현재 비밀번호를 입력해 주세요.");
    if (!isGoogle && newPassword && newPassword !== newPasswordCheck) return setError("새 비밀번호 확인이 맞지 않아요.");
    if (!isGoogle && emailChanged && !emailCode) return setError("이메일을 바꾸려면 새 이메일로 받은 인증번호를 입력해 주세요.");
    if (!/^01[0-9]{8,9}$/.test(phone.replace(/-/g, ""))) return setError("전화번호를 올바르게 입력해 주세요. (예: 010-1234-5678)");

    setBusy(true);
    try {
      const resp = await client.put("/api/members/me", {
        nickname, email, phone, currentPassword, newPassword, newPasswordCheck, emailCode,
      });
      // 비밀번호를 바꿨으면 예전 토큰은 더 못 씀 → 로그아웃하고 새 비밀번호로 다시 로그인
      if (newPassword) {
        localStorage.removeItem("token");
        localStorage.removeItem("nickname");
        localStorage.removeItem("memberRole");
        navi("/login", { state: { message: "비밀번호를 바꿨어요. 새 비밀번호로 다시 로그인해 주세요." } });
        return;
      }
      // 헤더 닉네임도 바꾸기 (서버가 앞뒤 공백을 자른 값으로)
      localStorage.setItem("nickname", resp.data.nickname);
      setMy({ ...my, nickname: resp.data.nickname, email: email.trim().toLowerCase(), phone: phone.replace(/-/g, "") });
      setCurrentPassword("");
      setNewPassword("");
      setNewPasswordCheck("");
      setEmailCode("");
      setEmailSent(false);
      setEmailMsg("");
      setMessage("저장했어요.");
      // 헤더는 주소가 바뀔 때만 다시 그려짐 → 같은 주소로 한 번 더 들어가서 새 닉네임을 바로 보여 줌
      // (같은 화면이라 입력칸 · "저장했어요." 문구는 그대로 남음)
      navi("/my/edit", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "저장하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  // 5. 회원 탈퇴 버튼 → 비밀번호 입력했는지 보고 확인 창 열기 (구글 계정은 비밀번호 없이 바로 확인 창)
  const openConfirm = () => {
    setWithdrawError("");
    if (!isGoogle && !withdrawPw) return setWithdrawError("비밀번호를 입력해 주세요.");
    setConfirmOpen(true);
  };

  // 6. 확인 창에서 "탈퇴하기" → POST /api/members/me/withdraw
  const sendWithdraw = async (payload) => {
    try {
      await client.post("/api/members/me/withdraw", payload);
      // 로그인 토큰 지우고 메인으로 (비회원 guestToken 은 그대로)
      localStorage.removeItem("token");
      localStorage.removeItem("nickname");
      localStorage.removeItem("memberRole");
      navi("/");
    } catch (err) {
      setConfirmOpen(false);
      setWithdrawError(err.response?.data?.message || "탈퇴하지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    googleWithdrawCbRef.current = (accessToken) => {
      if (!withdrawPendingRef.current) return;
      withdrawPendingRef.current = false;
      sendWithdraw({ googleCredential: accessToken });
    };
  });

  const withdraw = async () => {
    if (busy) return;
    setBusy(true);
    setWithdrawError("");

    // 구글 소셜 계정은 탈퇴 전 Google 재인증(연동 이메일 본인 확인) 필수
    if (isGoogle) {
      if (!googleTokenClientRef.current) {
        setConfirmOpen(false);
        setWithdrawError("Google 인증을 불러오는 중이에요. 잠시 후 다시 시도해 주세요.");
        setBusy(false);
        return;
      }
      withdrawPendingRef.current = true;
      googleTokenClientRef.current.requestAccessToken({ prompt: "select_account" });
      return;
    }

    await sendWithdraw({ currentPassword: withdrawPw });
  };

  return (
    // 오른쪽 내용만 (왼쪽 메뉴는 MyPageLayout) + 탈퇴 확인 창
    <>
      <main className={common.main}>
        <h1 className={common.title}>개인정보 수정</h1>
        <p className={common.lead}>
          {isGoogle
            ? "Google 소셜 로그인으로 연동된 계정이에요. 닉네임과 전화번호를 수정할 수 있어요."
            : "저장하려면 현재 비밀번호를 꼭 입력해 주세요. 아이디는 바꿀 수 없어요."}
        </p>

        {/* ===== 개인정보 수정 (M05) ===== */}
        {/* 카드 안을 [입력칸 | 안내 상자] 두 칸으로 나눔 */}
        <section className={`${common.card} ${styles.narrow}`}>
          <div className={styles.editGrid}>
          <div className={styles.form}>
          <div className={styles.row}>
            <label>아이디</label>
            <input className={styles.input} value={isGoogle ? "Google 소셜 연동 계정" : my.loginId} disabled />
          </div>

          <div className={styles.row}>
            <label>닉네임</label>
            <input className={styles.input} value={nickname}
              onChange={(e) => { setNickname(e.target.value); setNickMsg(""); }} />
            <Button onClick={checkNickname}>중복 확인</Button>
          </div>
          {nickMsg && <p className={styles.hint}>{nickMsg}</p>}

          {!isGoogle && (
            <>
              <div className={styles.row}>
                <label>현재 비밀번호</label>
                <input className={styles.input} type="password" value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)} />
              </div>

              <div className={styles.row}>
                <label>새 비밀번호</label>
                <input className={styles.input} type="password" value={newPassword}
                  placeholder="바꾸지 않으려면 비워 두세요"
                  onChange={(e) => setNewPassword(e.target.value)} />
              </div>

              <div className={styles.row}>
                <label>새 비밀번호 확인</label>
                <input className={styles.input} type="password" value={newPasswordCheck}
                  onChange={(e) => setNewPasswordCheck(e.target.value)} />
              </div>
            </>
          )}

          <div className={styles.row}>
            <label>이메일</label>
            <input className={styles.input} value={email} disabled={isGoogle}
              onChange={(e) => { setEmail(e.target.value); setEmailMsg(""); setEmailSent(false); setEmailCode(""); }} />
            {!isGoogle && <Button onClick={checkEmail}>중복 확인</Button>}
          </div>

          {/* 이메일을 바꿨을 때만: 새 이메일로 인증번호 받기 */}
          {emailChanged && (
            <div className={styles.row}>
              <label>이메일 인증번호</label>
              <input className={styles.input} value={emailCode} maxLength={6}
                placeholder={emailSent ? "메일로 받은 6자리" : "먼저 인증번호를 받아 주세요"}
                disabled={!emailSent}
                onChange={(e) => setEmailCode(e.target.value.replace(/[^0-9]/g, ""))} />
              <Button disabled={sending} onClick={sendEmailCode}>
                {sending ? "보내는 중…" : emailSent ? "다시 받기" : "인증번호 받기"}
              </Button>
            </div>
          )}
          {emailMsg && <p className={styles.hint}>{emailMsg}</p>}

          <div className={styles.row}>
            <label>전화번호</label>
            <input className={styles.input} type="tel" value={phone} placeholder="010-1234-5678"
              onChange={(e) => setPhone(formatPhone(e.target.value))} />
          </div>

          {error && <div className={styles.error}>{error}</div>}
          {message && <div className={styles.ok}>{message}</div>}

          <div className={styles.actions}>
            <Button onClick={() => navi("/my")}>취소</Button>
            <Button type="primary" disabled={busy} onClick={save}>{busy ? "저장하는 중…" : "저장하기"}</Button>
          </div>
          </div>

          {/* 오른쪽 안내 상자: 이 화면이 실제로 검사하는 규칙만 적음 */}
          <aside className={styles.guide}>
            <b className={styles.guideTitle}>수정할 때 알아 두세요</b>
            {isGoogle ? (
              <ul className={styles.guideList}>
                <li><b>아이디·이메일</b>은 Google 계정과 연동되어 바꿀 수 없어요.</li>
                <li><b>닉네임</b>은 2~10자이고, 바꿨다면 중복 확인을 해 주세요.</li>
                <li><b>전화번호</b>는 010-1234-5678 모양으로 적어 주세요.</li>
              </ul>
            ) : (
              <ul className={styles.guideList}>
                <li><b>아이디</b>는 바꿀 수 없어요.</li>
                <li><b>닉네임</b>은 2~10자이고, 바꿨다면 중복 확인을 해 주세요.</li>
                <li>저장하려면 <b>현재 비밀번호</b>가 꼭 필요해요.</li>
                <li><b>새 비밀번호</b>를 바꾸면 저장 후 로그아웃돼요. 새 비밀번호로 다시 로그인해 주세요.</li>
                <li><b>이메일</b>을 바꾸면 새 이메일로 받은 6자리 인증번호를 넣어야 해요.</li>
                <li><b>전화번호</b>는 010-1234-5678 모양으로 적어 주세요.</li>
              </ul>
            )}
          </aside>
          </div>
        </section>

        {/* ===== 회원 탈퇴 (M06) ===== */}
        <section className={`${common.card} ${styles.narrow}`}>
          <div className={common.cardHead}>
            <span className={common.cardTitle}>회원 탈퇴</span>
          </div>
          {/* 수정 카드와 같은 모양: [입력칸 | 안내 상자] */}
          <div className={styles.editGrid}>
            <div className={styles.form}>
              <p className={common.desc}>
                {isGoogle
                  ? "탈퇴하면 다시 로그인할 수 없어요. 탈퇴 시 연동된 Google 계정으로 본인 확인을 한 번 더 진행해요."
                  : "탈퇴하면 다시 로그인할 수 없어요. 비밀번호를 입력해 본인 확인을 해 주세요."}
              </p>
              <div className={styles.row}>
                {!isGoogle && (
                  <>
                    <label>비밀번호</label>
                    <input className={styles.input} type="password" value={withdrawPw} placeholder="지금 비밀번호"
                      onChange={(e) => setWithdrawPw(e.target.value)} />
                  </>
                )}
                <Button type="danger" onClick={openConfirm}>회원 탈퇴</Button>
              </div>
              {withdrawError && <div className={styles.error}>{withdrawError}</div>}
            </div>

            <aside className={styles.guide}>
              <b className={styles.guideTitle}>탈퇴 전에 확인하세요</b>
              <ul className={styles.guideList}>
                <li>탈퇴하면 이 계정으로 <b>다시 로그인할 수 없어요.</b></li>
              </ul>
            </aside>
          </div>
        </section>
      </main>

      {/* ===== 탈퇴 확인 창 (팀 공통 Modal) ===== */}
      <Modal open={confirmOpen} title="정말 탈퇴할까요?" onClose={closeConfirm}>
        <p className={common.desc}>탈퇴하면 이 계정으로 다시 로그인할 수 없어요.</p>
        <div className={styles.actions}>
          <Button onClick={closeConfirm}>취소</Button>
          <Button type="danger" disabled={busy} onClick={withdraw}>
            {busy ? "처리하는 중…" : isGoogle ? "Google 인증 후 탈퇴하기" : "탈퇴하기"}
          </Button>
        </div>
      </Modal>
    </>
  );
}

export default EditPage;
