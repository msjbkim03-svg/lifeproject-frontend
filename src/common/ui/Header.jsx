// 상단 헤더 (모든 화면 공통) - App.jsx에서 <Routes> 위에 한 번만 붙어요
// 로그인 안 했을 때: 시작하기 · 추모관 · 내 인생들 | 로그인 · 회원가입
// 로그인 했을 때:   시작하기 · 추모관 · 내 인생들 (· 관리자) | 닉네임 님 · [집] · 로그아웃
// 내 인생들 → /lives (전생 기록 · 특성 강화)
// [집] 버튼  → /my          (마이페이지 · 개인정보 수정)
// 로그인 정보는 localStorage(token, nickname, memberRole)에서 읽어요 (민승 Header 로직 그대로)
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Button from './Button';
import StarIcon from './StarIcon';
import './ui.css';

function Header() {
  const navigate = useNavigate();

  // 주소가 바뀔 때마다 Header를 다시 그리게 함
  // (로그인 후 메인으로 이동하면 → 다시 그려지면서 토큰을 새로 읽음)
  const location = useLocation();
  // 로그인은 지금 화면 위에 팝업으로 (회원가입은 한 화면 페이지)
  // (이미 팝업이면 뒤 화면은 그대로)
  // 로그인 화면에 주소로 바로 들어와 있으면 팝업 없이 원래처럼 이동
  const onAuthPage = ['/login', '/find'].includes(location.pathname);
  const background = location.state?.background || (onAuthPage ? null : location);

  // 브라우저에 저장된 값 읽기 (없으면 null)
  const token = localStorage.getItem('token');
  const nickname = localStorage.getItem('nickname');
  const isAdmin = localStorage.getItem('memberRole') === 'ADMIN';

  // 로그아웃: 저장해 둔 토큰·닉네임·권한을 지우고 메인으로 새로 이동 (화면에 남아 있던 회원 이어하기 상태도 비움)
  // (비회원 임시 토큰 guestToken 은 다른 키라서 지우지 않음)
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('nickname');
    localStorage.removeItem('memberRole');
    window.location.href = '/';
  };

  const navClass = ({ isActive }) => (isActive ? 'on' : '');

  // 마이페이지 묶음 나누기
  //   /life 로 시작하면 → [내 인생들] 금색
  //   /my, /my/edit → [집] 버튼 금색
  const path = location.pathname;
  const onLives = path.startsWith('/life');
  const onHome = path === '/my' || path.startsWith('/my/');

  return (
    <header className="header">
      <div className="header-in">
        <Link to="/" className="header-logo"><StarIcon size={16} />환승인생</Link>
        <nav className="header-nav">
          <NavLink to="/" end className={navClass}>시작하기</NavLink>
          <NavLink to="/memorial" className={navClass}>추모관</NavLink>
          <NavLink to="/life/lives" className={onLives ? 'on' : ''}>내 인생들</NavLink>
          {token && isAdmin && <NavLink to="/admin" className={navClass}>관리자</NavLink>}
        </nav>
        <div className="header-space" />
        <div className="header-right">
          {token ? (
            <>
              <span className="header-user"><b>{nickname}</b> 님</span>
              {/* 집 모양 = 마이페이지 (마이페이지 · 개인정보 수정) */}
              <Button
                size="sm"
                className={'header-home' + (onHome ? ' on' : '')}
                onClick={() => navigate('/my')}
                aria-label="마이페이지"
                title="마이페이지"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M3 11l9-7 9 7" />
                  <path d="M5 10v10h5v-6h4v6h5V10" />
                </svg>
              </Button>
              <Button size="sm" onClick={handleLogout}>로그아웃</Button>
            </>
          ) : (
            <>
              <Button size="sm" onClick={() => navigate('/login', { state: { background } })}>로그인</Button>
              <Button size="sm" type="light" onClick={() => navigate('/join', { state: { returnTo: background } })}>회원가입</Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export default Header;
