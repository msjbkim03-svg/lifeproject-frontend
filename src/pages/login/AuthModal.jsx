import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styles from "./AuthModal.module.css";

// 로그인·회원가입·찾기 팝업 틀 (App.jsx 에서 감쌈)
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
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={`${styles.overlay} ${closing ? styles.closing : ""}`} onMouseDown={close}>
      <div className={styles.box} onMouseDown={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={close} aria-label="닫기">×</button>
        {children}
      </div>
    </div>
  );
}

export default AuthModal;
