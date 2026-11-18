import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import client from '../../api/api';
import ToonEarth from './ToonEarth';
import { useTheme } from '../../common/theme';
import styles from './BirthPage.module.css';

// ───────────────────────────────────────────────
// 설정값
// ───────────────────────────────────────────────

// 나라별 착륙 지점 (위도·경도)
const COUNTRY_POS = {
  KOR: { lat: 36.5, lng: 127.8 },
  PRK: { lat: 40.0, lng: 127.0 },
  JPN: { lat: 36.2, lng: 138.3 },
  CHN: { lat: 34.0, lng: 104.0 },
  VNM: { lat: 16.0, lng: 107.5 },
  IND: { lat: 22.5, lng: 79.0 },
};
const ASIA_CENTER = { lat: 28, lng: 105 };

// 연출 시간 (밀리초)
const MIN_FLY_TIME = 3500; // 서버 응답이 빨라도 최소 이만큼은 비행
const APPROACH_TIME = 2200; // 지구가 그 나라로 돌아가는 시간
const DROP_TIME = 2400; // 아기가 떨어지는 시간 (CSS 와 맞춤)

// 단계별 안내 문구
const PHASE_TEXT = {
  flying: '아시아 상공을 비행하고 있어요',
  approach: '착륙할 곳을 찾고 있어요',
  drop: '뛰어내립니다!',
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ───────────────────────────────────────────────
// 출생 추첨 화면 (C02)
// ───────────────────────────────────────────────
function BirthPage() {
  const navigate = useNavigate();
  const theme = useTheme(); // 라이트 노을 / 다크 밤하늘 (지구 색)
  const location = useLocation();
  const decade = location.state?.decade; // 메인에서 고른 시대
  const questIds = location.state?.questIds; // 퀘스트 화면(C01)에서 고른 퀘스트 (회원만)

  const startedRef = useRef(false); // 개발 모드에서 두 번 요청되는 것 막기
  const [phase, setPhase] = useState('flying'); // flying → approach → drop → landed
  const [life, setLife] = useState(null); // 서버가 정해 준 인생
  const [target, setTarget] = useState(null); // 착륙할 위도·경도
  const [jump, setJump] = useState(null); // 아기 출발·도착 화면 좌표
  const [error, setError] = useState('');

  // ① 시대를 안 고르고 주소로 바로 들어오면 메인으로
  useEffect(() => {
    if (!decade) navigate('/');
  }, [decade, navigate]);

  // ② 비행기가 멈추면 ToonEarth 가 화면 좌표를 알려 줌
  const handleParked = useCallback((pos) => setJump(pos), []);

  // ③ 서버에 출생 요청 → 연출 순서대로 진행
  useEffect(() => {
    if (!decade || startedRef.current) return;
    startedRef.current = true;

    const run = async () => {
      try {
        const isLogin = !!localStorage.getItem('token');
        const oldGuestToken = isLogin ? null : localStorage.getItem('guestToken');

        // 서버 요청과 최소 비행 시간을 동시에 기다림
        const [res] = await Promise.all([
          // POST /api/engine/birth  { decade, guestToken }
          // 회원은 api.js 가 Authorization 헤더(토큰)를 자동으로 붙여서 서버가 회원 인생으로 저장
          client.post('/api/engine/birth', { decade, guestToken: oldGuestToken }),
          sleep(MIN_FLY_TIME),
        ]);

        const born = res.data;
        if (!born || !born.birthCountry) {
          throw new Error('이 시대의 통계 데이터가 아직 없어요.');
        }
        setLife(born);

        // 비회원이면 새 임시 토큰 저장 (이어하기에 사용)
        if (!isLogin && born.guestToken) {
          localStorage.setItem('guestToken', born.guestToken);
        }

        // 회원이 퀘스트를 골랐으면 이 인생에 저장 (C01) - 실패해도 연출은 계속
        if (isLogin && questIds?.length) {
          client.post('/api/quests/life', { lifeId: born.lifeId, questIds })
            .catch((e) => console.log('퀘스트 저장 실패', e.response?.data));
        }

        // 지구를 그 나라로 돌리기
        setTarget(COUNTRY_POS[born.birthCountry] || ASIA_CENTER);
        setPhase('approach');
        await sleep(APPROACH_TIME);

        // 뛰어내리기
        setPhase('drop');
        await sleep(DROP_TIME);

        // 착륙!
        setPhase('landed');
      } catch (err) {
        // 서버가 보낸 안내 문구가 있으면 그대로 보여줌
        const msg = err.response?.data;
        if (typeof msg === 'string' && msg) setError(msg);
        else setError(err.response ? '서버에서 오류가 났어요.' : err.message);
        setPhase('error');
      }
    };

    run();
  }, [decade]);

  const landed = phase === 'landed';
  const genderText = life?.gender === 'M' ? '남자' : '여자';
  const countryText = life
    ? life.histName && life.histName !== life.countryName
      ? `${life.countryName} (당시 ${life.histName})`
      : life.countryName
    : '';

  return (
    <div className={styles.page}>
      {/* 하늘에 떠 있는 구름 (CSS) */}
      <div className={`${styles.cloud} ${styles.cloud1}`} />
      <div className={`${styles.cloud} ${styles.cloud2}`} />
      <div className={`${styles.cloud} ${styles.cloud3}`} />

      {/* 밤하늘 점 지구 + 비행기 (three.js) */}
      {/* 테마가 바뀌면 지구를 새 색으로 다시 그림 */}
      <ToonEarth key={theme} phase={phase} target={target} onParked={handleParked} />

      {/* 낙하산 타고 떨어지는 아기 */}
      {jump && (phase === 'drop' || phase === 'landed') && (
        <div
          className={styles.jumper}
          style={{ left: jump.x, top: jump.y, '--fall': `${jump.ty - jump.y}px` }}
          aria-hidden="true"
        >
          <Parachute />
        </div>
      )}

      {/* 착륙 지점 이름표 */}
      {landed && life && jump && (
        <div className={styles.pin} style={{ left: jump.tx, top: jump.ty - 70 }}>
          <span className={styles.pinCode}>{life.birthCountry}</span>
          {life.countryName}
        </div>
      )}

      {/* 맨 위 안내 문구 */}
      <header className={styles.topBar}>
        <p className={styles.step}>출생 추첨</p>
        <h1 className={styles.title}>{decade}년대, 아시아 어딘가</h1>
        {PHASE_TEXT[phase] && (
          <p className={styles.status}>
            <span className={styles.dot} />
            {PHASE_TEXT[phase]}
          </p>
        )}
      </header>

      {/* 결과 카드 */}
      {landed && life && (
        <section className={styles.resultCard}>
          <p className={styles.resultEyebrow}>{life.birthYear}년, 새 생명이 태어났어요</p>
          <h2 className={styles.resultName}>
            {life.name}
            <span className={styles.resultGender}>{genderText}</span>
          </h2>
          <p className={styles.resultCountry}>{countryText}</p>

          <ul className={styles.facts}>
            <li>
              <span>가정형편</span>
              <strong>소득 {life.wealthClass}분위</strong>
            </li>
            <li>
              <span>사는 곳</span>
              <strong>{life.isUrban === 'Y' ? '도시' : '시골'}</strong>
            </li>
            <li>
              <span>기대수명</span>
              <strong>{life.lifeExpectancy ? `${Math.round(life.lifeExpectancy)}세` : '-'}</strong>
            </li>
            <li>
              <span>1인당 GDP</span>
              <strong>{life.gdpPerCapita ? `$${Math.round(life.gdpPerCapita).toLocaleString()}` : '-'}</strong>
            </li>
          </ul>

          <div className={styles.actions}>
            <button type="button" className={styles.ghostBtn} onClick={() => navigate('/')}>
              메인으로
            </button>
            {/* C03 인생 진행 화면으로 (state 로 넘기면 서버를 한 번 덜 부름) */}
            <button
              type="button"
              className={styles.primaryBtn}
              onClick={() => navigate('/play', { state: { life } })}
            >
              삶을 시작하기
            </button>
          </div>
        </section>
      )}

      {/* 오류 */}
      {phase === 'error' && (
        <section className={styles.resultCard}>
          <h2 className={styles.resultName}>착륙하지 못했어요</h2>
          <p className={styles.resultCountry}>{error}</p>
          <div className={styles.actions}>
            <button type="button" className={styles.primaryBtn} onClick={() => navigate('/')}>
              메인으로
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

// 낙하산 + 아기 바구니 (테마 색: 라이트 노을 / 다크 밤하늘)
function Parachute() {
  const line = { stroke: 'var(--outline)' };
  return (
    <svg width="84" height="105" viewBox="0 0 64 80" aria-hidden="true">
      <g className={styles.canopy}>
        <path d="M4 26 Q32 -8 60 26 Z" style={{ ...line, fill: 'var(--primary)' }} strokeWidth="1.5" />
        <path d="M18 26 Q32 -4 46 26 Z" style={{ ...line, fill: 'var(--paper-mid)' }} strokeWidth="1.2" />
        <path d="M28 26 Q32 4 36 26 Z" style={{ ...line, fill: 'var(--primary)' }} strokeWidth="1.2" />
      </g>
      <path d="M6 27 L28 58 M58 27 L36 58 M22 28 L30 58 M42 28 L34 58" style={{ stroke: 'var(--ink-sub)' }} strokeWidth="1" />
      <circle cx="32" cy="60" r="5" fill="#f2c9a0" style={line} strokeWidth="1.2" />
      <path d="M24 64 h16 l-2 10 h-12 Z" style={{ ...line, fill: 'var(--blue)' }} strokeWidth="1.2" />
    </svg>
  );
}

export default BirthPage;
