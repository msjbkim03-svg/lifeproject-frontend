import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import client from '../../api/api';
import ToonEarth from './ToonEarth';
import { COUNTRIES } from '../../engine/village/villageData'; // 국기용 2자리 코드 (C02-4)
import { useTheme } from '../../common/theme';
import Spoon from '../../common/ui/Spoon.jsx';
import styles from './BirthPage.module.css';

// ───────────────────────────────────────────────
// 설정값
// ───────────────────────────────────────────────

// 나라별 착륙 지점 (위도·경도) - 키는 COUNTRY.COUNTRY_CODE (ISO 3글자)
// 여기 없는 나라는 아래 ASIA_CENTER(아시아 가운데)로 떨어짐
const COUNTRY_POS = {
  // 동아시아
  KOR: { lat: 36.5, lng: 127.8 }, // 한국
  PRK: { lat: 40.0, lng: 127.0 }, // 북한
  JPN: { lat: 36.2, lng: 138.3 }, // 일본
  CHN: { lat: 34.0, lng: 104.0 }, // 중국
  TWN: { lat: 23.7, lng: 121.0 }, // 대만
  HKG: { lat: 22.3, lng: 114.2 }, // 홍콩
  MAC: { lat: 22.2, lng: 113.5 }, // 마카오
  MNG: { lat: 46.9, lng: 103.8 }, // 몽골
  // 동남아시아
  VNM: { lat: 16.0, lng: 107.5 }, // 베트남
  LAO: { lat: 19.9, lng: 102.5 }, // 라오스
  KHM: { lat: 12.6, lng: 105.0 }, // 캄보디아
  THA: { lat: 15.9, lng: 101.0 }, // 태국
  MMR: { lat: 21.9, lng: 96.0 },  // 미얀마
  MYS: { lat: 4.2, lng: 102.0 },  // 말레이시아
  SGP: { lat: 1.35, lng: 103.8 }, // 싱가포르
  IDN: { lat: -2.5, lng: 118.0 }, // 인도네시아
  PHL: { lat: 12.9, lng: 121.8 }, // 필리핀
  BRN: { lat: 4.5, lng: 114.7 },  // 브루나이
  TLS: { lat: -8.9, lng: 125.7 }, // 동티모르
  // 남아시아
  IND: { lat: 22.5, lng: 79.0 },  // 인도
  PAK: { lat: 30.4, lng: 69.3 },  // 파키스탄
  BGD: { lat: 23.7, lng: 90.4 },  // 방글라데시
  NPL: { lat: 28.4, lng: 84.1 },  // 네팔
  BTN: { lat: 27.5, lng: 90.4 },  // 부탄
  LKA: { lat: 7.9, lng: 80.8 },   // 스리랑카
  MDV: { lat: 3.2, lng: 73.2 },   // 몰디브
  AFG: { lat: 33.9, lng: 67.7 },  // 아프가니스탄
  // 중앙아시아
  KAZ: { lat: 48.0, lng: 67.0 },  // 카자흐스탄
  UZB: { lat: 41.4, lng: 64.6 },  // 우즈베키스탄
  TKM: { lat: 39.0, lng: 59.6 },  // 투르크메니스탄
  KGZ: { lat: 41.2, lng: 74.8 },  // 키르기스스탄
  TJK: { lat: 38.9, lng: 71.3 },  // 타지키스탄
  // 서아시아 (중동·코카서스)
  IRN: { lat: 32.4, lng: 53.7 },  // 이란
  IRQ: { lat: 33.2, lng: 43.7 },  // 이라크
  SYR: { lat: 34.8, lng: 39.0 },  // 시리아
  LBN: { lat: 33.9, lng: 35.9 },  // 레바논
  ISR: { lat: 31.0, lng: 34.9 },  // 이스라엘
  PSE: { lat: 31.9, lng: 35.2 },  // 팔레스타인
  JOR: { lat: 30.6, lng: 36.2 },  // 요르단
  SAU: { lat: 23.9, lng: 45.1 },  // 사우디아라비아
  YEM: { lat: 15.6, lng: 48.5 },  // 예멘
  OMN: { lat: 21.5, lng: 55.9 },  // 오만
  ARE: { lat: 23.4, lng: 53.8 },  // 아랍에미리트
  QAT: { lat: 25.4, lng: 51.2 },  // 카타르
  BHR: { lat: 26.0, lng: 50.6 },  // 바레인
  KWT: { lat: 29.3, lng: 47.5 },  // 쿠웨이트
  TUR: { lat: 39.0, lng: 35.2 },  // 튀르키예
  CYP: { lat: 35.1, lng: 33.4 },  // 키프로스
  GEO: { lat: 42.3, lng: 43.4 },  // 조지아
  ARM: { lat: 40.1, lng: 45.0 },  // 아르메니아
  AZE: { lat: 40.1, lng: 47.6 },  // 아제르바이잔
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
// 태어난 집 (소득 1~5분위를 쉬운 말로, 11/23 동현님: '형편 N분위'가 무슨 뜻인지 모름)
const HOME_WORD = {
  1: '그 나라에서 가장 가난한 20% 집',
  2: '넉넉지 않은 집 (아래에서 20~40%)',
  3: '그 나라에서 딱 중간쯤인 집',
  4: '넉넉한 집 (위에서 20~40%)',
  5: '그 나라에서 가장 부유한 20% 집',
};

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
  const [questError, setQuestError] = useState(''); // 퀘스트 저장 실패 안내 (C01)
  const [questRetry, setQuestRetry] = useState(false); // [다시 저장] 버튼 보일지 (401 이면 안 보임)
  const [questBusy, setQuestBusy] = useState(false); // 다시 저장 중 (연속 클릭 막기)

  // ① 시대를 안 고르고 주소로 바로 들어오면 메인으로
  useEffect(() => {
    if (!decade) navigate('/');
  }, [decade, navigate]);

  // ② 비행기가 멈추면 ToonEarth 가 화면 좌표를 알려 줌
  const handleParked = useCallback((pos) => setJump(pos), []);

  // ②-1 퀘스트 저장 (C01) - 태어난 직후 + [다시 저장] 버튼이 같이 씀
  //   성공: 안내 문구 지움
  //   401(로그인 만료): 다시 저장해도 안 되니까 로그인 안내만 (버튼 숨김)
  //   그 밖의 실패: 안내 + [다시 저장] 버튼
  const saveQuests = async (lifeId) => {
    try {
      await client.post('/api/quests/life', { lifeId, questIds });
      setQuestError('');
      setQuestRetry(false);
    } catch (e) {
      console.log('퀘스트 저장 실패', e.response?.data);
      if (e.response?.status === 401) {
        setQuestError('로그인이 만료되어 퀘스트를 저장하지 못했어요. 다시 로그인해 주세요.');
        setQuestRetry(false);
      } else {
        setQuestError(e.response?.data?.message || '퀘스트를 저장하지 못했어요. 이번 생은 퀘스트 없이 진행돼요.');
        setQuestRetry(true);
      }
    }
  };

  // ②-2 [다시 저장] 버튼
  const retryQuests = async () => {
    if (questBusy) return;
    setQuestBusy(true);
    await saveQuests(life.lifeId);
    setQuestBusy(false);
  };

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

        // 회원이 퀘스트를 골랐으면 이 인생에 저장 (C01)
        // await 안 함 → 저장을 기다리지 않고 연출은 계속 (실패하면 결과 카드에 안내)
        if (isLogin && questIds?.length) {
          saveQuests(born.lifeId);
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
    // 시대가 정해지면 한 번만 출생 요청 (startedRef 로 막음) - 퀘스트·저장 함수는 그때 값이면 충분
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <p className={styles.resultCountry}>
            {COUNTRIES[life.birthCountry]?.[0] && (
              <img className={styles.flag} src={`https://flagcdn.com/w40/${COUNTRIES[life.birthCountry][0]}.png`}
                alt="" width="24" height="16" />
            )}
            {countryText}
          </p>

          <ul className={styles.facts}>
            <li>
              <span>태어난 집</span>
              <strong><Spoon level={life.wealthClass} /> <small>{HOME_WORD[life.wealthClass] || ''}</small></strong>
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
              <span>영아사망률</span>
              <strong>{life.infantMortality ? `1,000명당 ${Math.round(life.infantMortality)}명` : '-'}</strong>
            </li>
            <li>
              <span>1인당 GDP</span>
              <strong>{life.gdpPerCapita ? `$${Math.round(life.gdpPerCapita).toLocaleString()}` : '-'}</strong>
            </li>
          </ul>

          {/* 퀘스트 저장 실패 안내 (C01) */}
          {questError && (
            <div className={styles.questError}>
              <p>{questError}</p>
              {questRetry ? (
                <button type="button" className={styles.ghostBtn} disabled={questBusy} onClick={retryQuests}>
                  {questBusy ? '저장하는 중…' : '퀘스트 다시 저장'}
                </button>
              ) : (
                <button type="button" className={styles.ghostBtn} onClick={() => navigate('/login')}>
                  로그인하러 가기
                </button>
              )}
            </div>
          )}

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
