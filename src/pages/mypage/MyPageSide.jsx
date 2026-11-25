import { useNavigate } from "react-router-dom";
import styles from "./MyPage.module.css";

// 마이페이지 왼쪽 메뉴 - 두 묶음으로 나눔
//   헤더 [집] 버튼   → 마이페이지 · 개인정보 수정
//   헤더 [내 인생들] → 전생 기록 · 특성 강화
// ※ 로그아웃은 위쪽 공통 헤더(common/ui/Header.jsx)의 [로그아웃] 버튼 하나만 씀
// 예: <MyPageSide active="edit" nickname="민승" loginId="msj01" />
// active: 지금 보고 있는 메뉴 → 'home' / 'edit' / 'lives' / 'traits'
const HOME_MENUS = [
  { key: "home", label: "마이페이지", path: "/mypage" },
  { key: "edit", label: "개인정보 수정", path: "/mypage/edit" },
];
const LIFE_MENUS = [
  { key: "lives", label: "전생 기록", path: "/mypage/lives" },
  { key: "traits", label: "특성 강화", path: "/mypage/traits" },
];

function MyPageSide({ active, nickname, loginId }) {
  const navi = useNavigate();
  // 지금 메뉴가 어느 묶음인지 보고 그 묶음만 보여 줌
  const menus = active === "lives" || active === "traits" ? LIFE_MENUS : HOME_MENUS;

  return (
    <aside className={styles.side}>
      <div className={styles.profile}>
        <div className={styles.character}>캐릭터</div>
        <div>
          <div className={styles.profileName}>{nickname}</div>
          <div className={styles.profileSub}>{loginId}</div>
        </div>
      </div>

      {/* 이 묶음 메뉴 2개를 반복해서 그림 (지금 메뉴는 금색) */}
      {menus.map((m) => (
        <button
          key={m.key}
          className={m.key === active ? `${styles.menu} ${styles.menuOn}` : styles.menu}
          onClick={() => navi(m.path)}
        >
          {m.label} <span>›</span>
        </button>
      ))}
    </aside>
  );
}

export default MyPageSide;
