// 상단 헤더 (모든 화면 공통) - App.jsx에서 <Routes> 위에 한 번만 붙어요
// 로그인 안 했을 때: 시작하기 · 추모관 · 내 인생들 | 로그인 · 회원가입
// 로그인 했을 때:   시작하기 · 추모관 · 내 인생들 (· 관리자) | 닉네임 님 · [남은시간] · [집] · 로그아웃
// 내 인생들 → /lives (전생 기록 · 특성 강화)
// [집] 버튼  → /my          (마이페이지 · 개인정보 수정)
// 로그인 정보는 localStorage(token, nickname, memberRole)에서 읽어요 (민승 Header 로직 그대로)
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Button from './Button';
import StarIcon from './StarIcon';
import './ui.css';

// JWT 토큰에서 발급 시각(iat)·만료 시각(exp)(ms) 꺼내기 (형식이 깨졌으면 null)
function getTokenTimes(token) {
  try {
    if (typeof token !== 'string') return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const payload = JSON.parse(atob(padded));
    const exp = typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    const iat = typeof payload.iat === 'number' ? payload.iat * 1000 : null;
    return exp ? { iat, exp } : null;
  } catch {
    return null;
  }
}

// 남은 초를 "2:59:42" 또는 "59:42" 모양으로 변환
function formatLeft(sec) {
  const s = Math.max(0, Math.floor(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(r)}` : `${pad(m)}:${pad(r)}`;
}

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

  // 로그인 토큰 남은 시간(초) — 1초마다 갱신, New-Token 자동 연장·타 탭 로그아웃도 즉시 반영
  // 로그인 직후 첫 렌더에서 예전 now 값이 쓰여 남은 시간이 3시간을 초과해 튀지 않도록 iat 하한 보정
  const [now, setNow] = useState(() => Date.now());
  const tokenTimes = getTokenTimes(token);
  const effectiveNow = tokenTimes?.iat ? Math.max(now, tokenTimes.iat) : now;
  const leftSec = token && tokenTimes?.exp ? Math.max(0, Math.floor((tokenTimes.exp - effectiveNow) / 1000)) : null;

  useEffect(() => {
    if (!token) return;

    const tick = () => {
      const currentToken = localStorage.getItem('token');
      const currentExp = getTokenTimes(currentToken)?.exp;
      const currentNow = Date.now();
      if (currentToken && (!currentExp || currentExp <= currentNow)) {
        // 만료·손상 시 로그인 정보 정리 후 회원 전용 화면이면 로그인 만료 화면으로 이동
        localStorage.removeItem('token');
        localStorage.removeItem('nickname');
        localStorage.removeItem('memberRole');
        const p = window.location.pathname;
        if (p.startsWith('/my') || p.startsWith('/life') || p.startsWith('/quest') || p.startsWith('/admin')) {
          window.location.href = '/login?expired=1';
          return;
        }
      }
      setNow(currentNow);
    };

    // 로그인 직후·화면 이동 직후 1초를 기다리지 않고 현재 시각을 바로 동기화
    const initId = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);
    return () => {
      clearTimeout(initId);
      clearInterval(id);
    };
  }, [token, location.pathname]);

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
              {leftSec !== null && (
                <span
                  className={'header-timer' + (leftSec <= 300 ? ' warn' : '')}
                  title="로그인 남은 시간 (활동 시 자동 연장)"
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" />
                  </svg>
                  {formatLeft(leftSec)}
                </span>
              )}
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
