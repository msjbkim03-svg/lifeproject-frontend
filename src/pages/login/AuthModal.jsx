import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./AuthModal.module.css";

// 로그인·찾기 팝업 틀 (App.jsx 에서 감쌈)
//   뒤 화면은 흐리게(실루엣) + 상자는 아래에서 톡 올라옴
//   닫기: 바깥 누르기 · Esc · [×] → 닫히는 애니메이션 0.2초 뒤 뒤 화면 주소로
function AuthModal({ children }) {
  const navi = useNavigate();
  const background = useLocation().state?.background;
  const [closing, setClosing] = useState(false);

  const close = () => {
    if (closing) return;
    setClosing(true);
    setTimeout(() => navi(background ? background.pathname + background.search : "/"), 200);
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        close();
        return;
      }
      const tag = e.target?.tagName;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && (e.code === "Space" || e.key === "ArrowLeft" || e.key === "ArrowRight")) {
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", onKey, true);
    // 뒤 화면 스크롤 막기 (스크롤바 자리는 ui.css의 scrollbar-gutter가 비워 둬서 화면이 안 밀림)
    document.body.style.overflow = "hidden";

    // 플레이 화면(/play) 위에서 열렸고 게임이 진행 중이면 잠시 멈춰 둠 (닫으면 다시 진행)
    const pauseBtn = document.querySelector('.pp-speed > .pp-b[aria-pressed]:not(:disabled)');
    if (pauseBtn && pauseBtn.getAttribute("aria-pressed") === "false") {
      pauseBtn.dataset.authPaused = "1";
      pauseBtn.click();
    }

    return () => {
      window.removeEventListener("keydown", onKey, true);
      document.body.style.overflow = "";
      // 로그인 ↔ 찾기 팝업으로 넘어갈 때는 계속 멈춰 두고, 팝업이 완전히 닫혔을 때만 다시 진행
      setTimeout(() => {
        if (document.querySelector('[data-auth-modal="true"]')) return;
        const btn = document.querySelector('.pp-speed > .pp-b[data-auth-paused="1"]');
        if (btn) {
          delete btn.dataset.authPaused;
          if (btn.getAttribute("aria-pressed") === "true") btn.click();
        }
      }, 0);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`${styles.overlay} ${closing ? styles.closing : ""}`} onMouseDown={close}>
      <div className={styles.box} role="dialog" aria-modal="true" data-auth-modal="true"
        onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={close} aria-label="닫기">×</button>
        {children}
      </div>
    </div>
  );
}

export default AuthModal;
