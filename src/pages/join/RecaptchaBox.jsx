// 회원가입 로봇 확인 체크박스 (Google reCAPTCHA v2)
// 예: <RecaptchaBox onChange={setCaptchaToken} />
//   체크하면 onChange(토큰), 시간이 지나 풀리면 onChange('')
// 따로 설치할 패키지 없이 구글 스크립트를 직접 불러와서 그림
import { useEffect, useRef } from 'react';


const SITE_KEY = '6Lf5hicuAAAAANdEgR7C_CSDYlS2_1cVYD63bxNc';

function RecaptchaBox({ onChange }) {
  const boxRef = useRef(null); // 체크박스가 그려질 자리

  useEffect(() => {
    const draw = () => {
      if (!boxRef.current || boxRef.current.childElementCount > 0) return;
      window.grecaptcha.render(boxRef.current, {
        sitekey: SITE_KEY,
        callback: (token) => onChange(token),  // 체크 성공 → 토큰
        'expired-callback': () => onChange(''), // 2분쯤 지나면 풀림 → 다시 체크해야 함
      });
    };

    // 1) 구글 스크립트가 이미 있으면 (가입 화면에 두 번째로 들어온 경우) 바로 그리기
    if (window.grecaptcha && window.grecaptcha.render) {
      window.grecaptcha.ready(draw);
      return;
    }

    // 2) 처음이면 스크립트를 붙이고, 다 불러오면 draw 실행
    window.onRecaptchaLoad = draw;
    if (!document.getElementById('recaptcha-script')) {
      const script = document.createElement('script');
      script.id = 'recaptcha-script';
      script.src = 'https://www.google.com/recaptcha/api.js?onload=onRecaptchaLoad&render=explicit&hl=ko';
      script.async = true;
      document.body.appendChild(script);
    }
  }, [onChange]);

  return <div ref={boxRef} />;
}

export default RecaptchaBox;
