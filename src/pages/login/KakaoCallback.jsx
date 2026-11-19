// 카카오 로그인 돌아오는 화면 (주소: /oauth/kakao?code=...)
// 흐름: 로그인 화면 [카카오로 시작하기] → 카카오 동의 화면 → 카카오가 이 주소로 code 를 붙여 돌려보냄
//   → 이 화면이 code 를 서버로 보냄 POST /api/members/oauth/kakao { code, guestToken }
//   → 서버가 카카오에 확인하고 우리 JWT 를 줌 → 일반 로그인과 똑같이 저장하고 메인으로
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import client from '../../api/api';
import styles from './LoginPage.module.css';

function KakaoCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [error, setError] = useState('');
  const sentRef = useRef(false); // code 는 한 번만 쓸 수 있어서 두 번 보내지 않게 (개발 모드는 useEffect 가 2번 돌아요)

  useEffect(() => {
    if (sentRef.current) return;
    sentRef.current = true;

    const code = params.get('code');
    // 카카오 동의 화면에서 [취소]를 누르면 code 대신 error 가 와요
    if (!code) {
      setError('카카오 로그인을 취소했어요.');
      return;
    }

    const guestToken = localStorage.getItem('guestToken'); // 비회원으로 하던 인생이 있으면 같이 보냄
    client.post('/api/members/oauth/kakao', { code, guestToken })
      .then((res) => {
        // 일반 로그인(LoginPage)과 같은 값 저장
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('nickname', res.data.nickname);
        localStorage.setItem('memberRole', res.data.memberRole);
        if (res.data.guestConverted) {
          localStorage.removeItem('guestToken');
        }
        navigate('/', { replace: true }); // 뒤로 가기로 이 화면에 다시 오지 않게
      })
      .catch((err) => {
        setError(err.response?.data?.message || '카카오 로그인에 실패했어요. 다시 시도해 주세요.');
      });
  }, [params, navigate]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.cardTitle}>카카오 로그인</div>
        <div className={styles.cardBody}>
          {error ? (
            <>
              <div className={styles.errorBox}>{error}</div>
              <div className={styles.links}>
                <Link to="/login">로그인 화면으로</Link>
              </div>
            </>
          ) : (
            <p className={styles.hint}>카카오 계정을 확인하는 중이에요…</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default KakaoCallback;
