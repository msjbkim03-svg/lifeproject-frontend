import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import client from "../../api/api";
import Button from "../../common/ui/Button";
import { formatPhone } from "../../utils/phone";
import styles from "./LoginPage.module.css";

// 구글 OAuth 클라이언트 ID (Google Cloud Console - lifeproject)
const GOOGLE_CLIENT_ID = "1060054612101-00gbenedhdoubrsnk69e4guoblbpdovc.apps.googleusercontent.com";
// 연타 시에도 원본 window.open 참조가 오염되지 않도록 최초 1회 저장
const NATIVE_WINDOW_OPEN = typeof window !== "undefined" ? window.open : null;

// 공식 4색 Google 'G' SVG 아이콘
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

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
  const tokenClientRef = useRef(null);
  const openRestoreTimerRef = useRef(null);
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
    googleCallbackRef.current = async (tokenValue) => {
      if (!tokenValue || busy) return;
      setError("");
      setBusy(true);
      try {
        const guestToken = localStorage.getItem("guestToken");
        const resp = await client.post("/api/members/google/login", {
          credential: tokenValue,
          guestToken,
        });

        // 1) 처음 구글로 로그인한 사용자 → 추가 정보(닉네임·전화번호·개인정보 동의) 입력 단계로 전환
        if (resp.data.needJoin) {
          setGoogleStep({
            credential: tokenValue,
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

  // 구글 OAuth2 스크립트 로드 및 토큰 클라이언트 초기화
  useEffect(() => {
    const initClient = () => {
      if (!window.google?.accounts?.oauth2) return;
      tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_CLIENT_ID,
        scope: "openid email profile",
        callback: (res) => {
          if (res?.access_token) {
            googleCallbackRef.current?.(res.access_token);
          }
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
  }, []);

  // 구글 로그인 버튼 클릭 → 화면 정중앙에 아담한 크기(420x520)로 팝업 띄우기
  const handleGoogleClick = () => {
    if (busy) return;
    if (!tokenClientRef.current) {
      if (window.google?.accounts?.oauth2) {
        tokenClientRef.current = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: "openid email profile",
          callback: (res) => {
            if (res?.access_token) {
              googleCallbackRef.current?.(res.access_token);
            }
          },
        });
      } else {
        setError("구글 로그인을 불러오는 중이에요. 잠시 후 다시 눌러 주세요.");
        return;
      }
    }

    // 듀얼 모니터에서 screenLeft(1920 등)가 더해지면 크롬이 화면 오른쪽 끝(1920 - width)으로 붙여버리므로
    // 현재 모니터의 해상도(availWidth, availHeight) 기준 정중앙 좌표만 계산해 로그인 카드(380px) 바로 위에 띄움
    const origOpen = NATIVE_WINDOW_OPEN || window.open;
    const popupW = 380;
    const popupH = 480;
    const availW = window.screen?.availWidth || window.innerWidth || 1920;
    const availH = window.screen?.availHeight || window.innerHeight || 1080;
    const left = Math.max(0, Math.round((availW - popupW) / 2));
    const top = Math.max(0, Math.round((availH - popupH) / 2));

    if (openRestoreTimerRef.current) {
      clearTimeout(openRestoreTimerRef.current);
    }
    openRestoreTimerRef.current = setTimeout(() => {
      window.open = origOpen;
      openRestoreTimerRef.current = null;
    }, 1500);

    window.open = function (url, target) {
      if (openRestoreTimerRef.current) {
        clearTimeout(openRestoreTimerRef.current);
        openRestoreTimerRef.current = null;
      }
      window.open = origOpen;
      const centeredFeatures = `popup=yes,width=${popupW},height=${popupH},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no,location=no`;
      const popup = origOpen.call(window, url, target, centeredFeatures);
      try {
        popup?.resizeTo(popupW, popupH);
        popup?.moveTo(left, top);
      } catch {
        // 교차 출처 정책으로 moveTo가 제한되는 경우 centeredFeatures 좌표가 적용됨
      }
      return popup;
    };

    tokenClientRef.current.requestAccessToken({ prompt: "select_account" });
  };

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
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>Google 간편 가입</div>
            <p className={styles.cardSub}>
              처음 오셨네요! 사용할 닉네임과 연락처만 입력하면 바로 시작할 수 있어요.
            </p>
          </div>

          <div className={styles.cardBody}>
            {/* 인증된 구글 이메일 배지 */}
            <div className={styles.googleAccountBox}>
              <span className={styles.googleIconBadge}>
                <GoogleIcon />
              </span>
              <div className={styles.googleAccountInfo}>
                <span className={styles.googleAccountLabel}>연동된 Google 계정</span>
                <strong className={styles.googleAccountEmail}>{googleStep.email}</strong>
              </div>
              <span className={styles.verifiedTag}>인증됨</span>
            </div>

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
            <div className={styles.googleJoinActions}>
              <Button
                className={styles.cancelBtn}
                disabled={busy}
                onClick={() => {
                  setGoogleStep(null);
                  setError("");
                }}
              >
                취소
              </Button>
              <Button
                type="primary"
                className={styles.submitJoinBtn}
                disabled={busy}
                onClick={handleGoogleJoinSubmit}
              >
                {busy ? "가입하는 중…" : "가입하고 시작하기"}
              </Button>
            </div>
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

          {/* 환승인생 테마 맞춤형 Google 소셜 로그인 알약 버튼 */}
          <button
            type="button"
            className={styles.googleCustomBtn}
            disabled={busy}
            onClick={handleGoogleClick}
          >
            <span className={styles.googleIconBadge}>
              <GoogleIcon />
            </span>
            <span className={styles.googleBtnText}>Google 계정으로 시작하기</span>
          </button>

          <div className={styles.links}>
            <Link to="/find" state={{ background, returnTo }}>아이디·비밀번호 찾기</Link>
            <span>|</span>
            <Link to="/join" state={{ returnTo }}>회원가입</Link>
          </div>

          <div className={styles.divider}>
            <span>비회원 플레이</span>
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
