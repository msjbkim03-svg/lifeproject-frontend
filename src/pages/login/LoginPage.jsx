import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import client from '../../api/api';
import Button from '../../common/ui/Button';
import styles from './LoginPage.module.css';

// 로그인 화면 (M02)
// 카카오 로그인 (M02 소셜) - 카카오 동의 화면 주소
//   client_id = REST API 키 (백엔드 kakao.client.id 와 같은 값)
//   redirect_uri = 카카오 개발자 콘솔에 등록한 주소와 글자 하나까지 같아야 함
const KAKAO_CLIENT_ID = 'a01d11e4928741d24d7eb0b8045f28aa';
const KAKAO_REDIRECT_URI = 'http://localhost:5173/oauth/kakao';
const KAKAO_AUTH_URL = 'https://kauth.kakao.com/oauth/authorize'
  + '?response_type=code'
  + '&client_id=' + KAKAO_CLIENT_ID
  + '&redirect_uri=' + encodeURIComponent(KAKAO_REDIRECT_URI);

function LoginPage() {
  const navigate = useNavigate();
  const notice = useLocation().state?.message; // 회원가입·비밀번호 변경 뒤 넘어온 안내 문구

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // 로그인 버튼
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!loginId || !password) {
      return setError('아이디와 비밀번호를 입력해 주세요.');
    }

    try {
      // 비회원으로 하던 인생이 있으면 그 임시 토큰도 같이 보냄 (서버가 회원 인생으로 전환)
      const guestToken = localStorage.getItem('guestToken');

      const res = await client.post('/api/members/login', { loginId, password, guestToken });

      // 서버가 준 JWT 저장 → 이후 요청에 자동으로 붙음 (api/api.js)
      localStorage.setItem('token', res.data.token);
      // 헤더에 보여줄 닉네임, 관리자 메뉴용 권한도 저장
      localStorage.setItem('nickname', res.data.nickname);
      localStorage.setItem('memberRole', res.data.memberRole);
      // 비회원 인생이 회원 인생으로 전환됐으면 임시 토큰은 이제 필요 없음
      if (res.data.guestConverted) {
        localStorage.removeItem('guestToken');
      }

      navigate('/'); // 메인으로
    } catch (err) {
      // 어느 쪽이 틀렸는지는 알려주지 않음 (M02 규칙)
      setError(err.response?.data?.message || '아이디 또는 비밀번호가 맞지 않아요.');
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

          {/* 카카오로 시작하기 → 카카오 동의 화면으로 이동 (돌아오면 KakaoCallback 이 처리) */}
          <button type="button" className={styles.kakaoBtn} onClick={() => { window.location.href = KAKAO_AUTH_URL; }}>
            카카오로 시작하기
          </button>

          <div className={styles.links}>
            <Link to="/find">아이디·비밀번호 찾기</Link>
            <span>|</span>
            <Link to="/join">회원가입</Link>
          </div>

          <Button block className={styles.subBtn} onClick={() => navigate('/')}>
            로그인 없이 태어나기
          </Button>
          <p className={styles.hint}>비회원은 퀘스트·포인트 없이 진행돼요.</p>
        </div>
      </form>
    </div>
  );
}

export default LoginPage;
