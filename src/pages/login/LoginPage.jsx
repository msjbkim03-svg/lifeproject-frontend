import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import client from "../../api/api";
import Button from "../../common/ui/Button";
import { formatPhone } from "../../utils/phone";
import styles from "./LoginPage.module.css";

// 구글 OAuth 클라이언트 ID (Google Cloud Console - lifeproject)
const GOOGLE_CLIENT_ID = "1060054612101-00gbenedhdoubrsnk69e4guoblbpdovc.apps.googleusercontent.com";

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

  // ===== 구글 소셜 로그인 + 신규 구글 회원 추가 정보 입력 상태 =====
  const googleBtnRef = useRef(null);
  const [googleStep, setGoogleStep] = useState(null); // { credential, email }
  const [gNickname, setGNickname] = useState("");
  const [gNickChecked, setGNickChecked] = useState(false);
  const [gNickMsg, setGNickMsg] = useState("");
  const [gPhone, setGPhone] = useState("");
  const [gAgreed, setGAgreed] = useState(false);
  const [gShowTerms, setGShowTerms] = useState(false);

  // 이미 로그인한 상태로 들어오면 메인으로
  useEffect(() => {
    if (localStorage.getItem("token")) navi("/", { replace: true });
  }, [navi]);

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

  // 구글 로그인 완료 콜백 (최신 함수 참조 유지)
  const googleCallbackRef = useRef(null);
  useEffect(() => {
    googleCallbackRef.current = async (response) => {
      if (!response?.credential || busy) return;
      setError("");
      setBusy(true);
      try {
        const guestToken = localStorage.getItem("guestToken");
        const resp = await client.post("/api/members/google/login", {
          credential: response.credential,
          guestToken,
        });

        // 1) 처음 구글로 로그인한 사용자 → 추가 정보(닉네임·전화번호·개인정보 동의) 입력 단계로 전환
        if (resp.data.needJoin) {
          setGoogleStep({
            credential: response.credential,
            email: resp.data.email,
          });
          setGNickname(resp.data.suggestedNickname || "");
          setGNickChecked(false);
          setGNickMsg("");
          setGPhone("");
          setGAgreed(false);
          setGShowTerms(false);
          setError("");
          return;
        }

        // 2) 이미 가입된 회원 → 비회원 인생 선택 또는 즉시 로그인 완료
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
        setError(err.response?.data?.message || "구글 로그인에 실패했어요.");
      } finally {
        setBusy(false);
      }
    };
  });

  // 구글 로그인 버튼 스크립트 로드 및 그리기
  useEffect(() => {
    if (pending || googleStep) return;

    const drawGoogleBtn = () => {
      if (!window.google?.accounts?.id || !googleBtnRef.current) return;
      googleBtnRef.current.innerHTML = "";
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (res) => googleCallbackRef.current?.(res),
      });
      window.google.accounts.id.renderButton(googleBtnRef.current, {
        theme: "outline",
        size: "large",
        width: 332,
        text: "continue_with",
        shape: "rectangular",
        locale: "ko",
      });
    };

    if (window.google?.accounts?.id) {
      drawGoogleBtn();
      return;
    }

    const existing = document.getElementById("google-gsi-script");
    if (existing) {
      existing.addEventListener("load", drawGoogleBtn);
      return () => existing.removeEventListener("load", drawGoogleBtn);
    }

    const script = document.createElement("script");
    script.id = "google-gsi-script";
    script.src = "https://accounts.google.com/gsi/client?hl=ko";
    script.async = true;
    script.defer = true;
    script.onload = drawGoogleBtn;
    document.body.appendChild(script);
  }, [pending, googleStep]);

  // 구글 추가 정보 입력: 닉네임 중복 확인
  const checkGoogleNickname = async () => {
    const nick = gNickname.trim();
    if (!nick) {
      setGNickChecked(false);
      setGNickMsg("먼저 입력해 주세요.");
      return;
    }
    if (nick.length < 2 || nick.length > 10) {
      setGNickChecked(false);
      setGNickMsg("닉네임은 2~10자로 입력해 주세요.");
      return;
    }
    try {
      const resp = await client.get(`/api/members/checkNickname?nickname=${encodeURIComponent(nick)}`);
      if (resp.data.available) {
        setGNickChecked(true);
        setGNickMsg("사용할 수 있어요.");
      } else {
        setGNickChecked(false);
        setGNickMsg(resp.data.message || "이미 사용 중이에요.");
      }
    } catch {
      setGNickChecked(false);
      setGNickMsg("서버에 연결할 수 없어요.");
    }
  };

  // 구글 추가 정보 입력 완료 → 가입 및 즉시 로그인
  const handleGoogleJoinSubmit = async (e) => {
    e.preventDefault();
    if (busy || !googleStep) return;
    setError("");

    const nick = gNickname.trim();
    if (nick.length < 2 || nick.length > 10) {
      return setError("닉네임은 2~10자로 입력해 주세요.");
    }
    if (!gNickChecked) {
      return setError("닉네임 중복 확인을 해 주세요.");
    }
    if (!/^01[0-9]{8,9}$/.test(gPhone.replace(/-/g, ""))) {
      return setError("전화번호를 올바르게 입력해 주세요. (예: 010-1234-5678)");
    }
    if (!gAgreed) {
      return setError("개인정보 수집·이용에 동의해 주세요.");
    }

    setBusy(true);
    try {
      const guestToken = localStorage.getItem("guestToken");
      const resp = await client.post("/api/members/google/join", {
        credential: googleStep.credential,
        nickname: nick,
        phone: gPhone,
        privacyAgreed: "Y",
        guestToken,
      });

      if (resp.data.guestPending) {
        setGoogleStep(null);
        setPending(resp.data);
        return;
      }
      saveLogin(resp.data);
      if (resp.data.guestConverted) {
        localStorage.removeItem("guestToken");
      }
      goBack(resp.data.guestConverted);
    } catch (err) {
      setError(err.response?.data?.message || "구글 회원가입에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

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

  // 구글 신규 로그인 시 추가 정보(닉네임·전화번호·개인정보 동의) 입력 화면
  if (googleStep) {
    return (
      <div className={styles.container}>
        <form className={styles.card} onSubmit={handleGoogleJoinSubmit}>
          <div className={styles.cardTitle}>Google 간편 가입</div>
          <div className={styles.cardBody}>
            <p className={styles.hintLeft}>
              처음 오셨네요! 게임에서 쓸 닉네임과 연락처만 입력하면 바로 시작할 수 있어요.
            </p>

            <label className={styles.label}>Google 이메일</label>
            <input className={styles.input} value={googleStep.email} disabled />

            <label className={styles.label}>닉네임</label>
            <div className={styles.inputWithBtn}>
              <input
                className={styles.input}
                value={gNickname}
                placeholder="2~10자"
                onChange={(e) => {
                  setGNickname(e.target.value);
                  setGNickChecked(false);
                  setGNickMsg("");
                }}
              />
              <Button className={styles.noWrap} onClick={checkGoogleNickname}>
                중복 확인
              </Button>
            </div>
            {gNickMsg && (
              <p className={gNickChecked ? styles.hintOk : styles.hintErr}>{gNickMsg}</p>
            )}

            <label className={styles.label}>전화번호</label>
            <input
              className={styles.input}
              type="tel"
              value={gPhone}
              placeholder="010-1234-5678"
              onChange={(e) => setGPhone(formatPhone(e.target.value))}
            />

            <div className={styles.agreeBox}>
              <div className={styles.agreeRow}>
                <label className={styles.agreeLabel}>
                  <input
                    type="checkbox"
                    checked={gAgreed}
                    onChange={(e) => setGAgreed(e.target.checked)}
                  />
                  <span><b>[필수]</b> 개인정보 수집·이용에 동의합니다.</span>
                </label>
                <button
                  type="button"
                  className={styles.agreeToggle}
                  onClick={() => setGShowTerms(!gShowTerms)}
                >
                  {gShowTerms ? "닫기" : "내용 보기"}
                </button>
              </div>
              {gShowTerms && (
                <div className={styles.agreeText}>
                  <p><b>수집 항목</b> Google 이메일, 닉네임, 전화번호</p>
                  <p><b>이용 목적</b> 회원 식별, 로그인, 서비스 이용 안내</p>
                  <p><b>보유 기간</b> 회원 탈퇴 시까지</p>
                </div>
              )}
            </div>

            {error && <div className={styles.errorBox}>{error}</div>}

            <button type="submit" hidden />
            <Button
              type="primary"
              size="lg"
              block
              className={styles.mainBtn}
              disabled={busy}
              onClick={handleGoogleJoinSubmit}
            >
              {busy ? "가입하는 중…" : "가입하고 시작하기"}
            </Button>
            <Button
              block
              className={styles.subBtn}
              disabled={busy}
              onClick={() => {
                setGoogleStep(null);
                setError("");
              }}
            >
              취소
            </Button>
          </div>
        </form>
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

          {/* 구글 소셜 로그인 영역 */}
          <div className={styles.divider}>
            <span>또는</span>
          </div>
          <div className={styles.googleWrap}>
            <div ref={googleBtnRef} />
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
