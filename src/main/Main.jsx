// 메인 화면 H01 (주소: /) - M01 시안
//   - 시대 고르기: OrbitGlobe (value / onChange)
//   - 태어나기 버튼: 회원은 퀘스트 설정(/quest, C01) → 비회원은 바로 출생(/birth, C02)  (민승 MainPage 로직 그대로)
//   - 이어서 살기 (H01, 김민승): GET /api/engine/current 로 진행 중인 인생이 있으면 버튼 켜기 → /play
//   - 진행 중인 인생이 있는데 태어나기를 누르면 확인 창 (새로 태어나면 그 인생은 포기됨, 엔진 C02가 처리)
//   - 아무 시대에나 태어나기: 궤도를 몇 번 빠르게 돌린 뒤 무작위 시대로 멈춤 → 잠깐 보여 주고 그 시대로 태어나기
//   - 실시간 목록: useLiveFeed() 예시 데이터 (C17 소켓 붙으면 교체)
//   - 실시간 숫자: useAsiaCounter() = 유엔 세계인구전망 2024 아시아 통계로 계산 (그대로 써도 됨)
import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import client from '../api/api';
import Badge from '../common/ui/Badge';
import Button from '../common/ui/Button';
import Modal from '../common/ui/Modal';
import Panel from '../common/ui/Panel';
import FeedList from '../common/ui/FeedList';
import BigStat from '../common/ui/BigStat';
import StarIcon from '../common/ui/StarIcon';
import OrbitGlobe, { DECADES } from '../common/ui/OrbitGlobe';
import { useAsiaCounter, useLiveFeed } from './useLiveStats';
import './main.css';

// 주사위 아이콘 (아무 시대에나)
function DiceIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="1.5" width="13" height="13" rx="3" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="5" cy="5" r="1.2" fill="currentColor" /><circle cx="11" cy="11" r="1.2" fill="currentColor" />
      <circle cx="8" cy="8" r="1.2" fill="currentColor" /><circle cx="11" cy="5" r="1.2" fill="currentColor" />
      <circle cx="5" cy="11" r="1.2" fill="currentColor" />
    </svg>
  );
}

function Main() {
  const navigate = useNavigate();
  const isLogin = !!localStorage.getItem('token'); // 토큰이 있으면 로그인 상태
  const [decade, setDecade] = useState(1980);
  const [spinning, setSpinning] = useState(false);
  const [luck, setLuck] = useState(false); // 운명이 골라 준 시대인지 (칸에 금색 표시)
  const timers = useRef([]);
  const [current, setCurrent] = useState(null);       // 진행 중인 인생 (없으면 null) - H01 이어서 살기
  const [askDecade, setAskDecade] = useState(null);    // 포기 확인 창에 띄운 시대 (null 이면 창 닫힘)
  const range = decade === 2020 ? '2020 – 현재' : decade + ' – ' + (decade + 9);

  const counter = useAsiaCounter();
  const feed = useLiveFeed();

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // 진행 중인 인생 확인 (H01) - 회원은 토큰(api.js 가 자동으로 붙임), 비회원은 guestToken 으로
  //   있으면 200 + 인생 정보 → [이어서 살기] 켜기 / 없으면 404 → 그대로 꺼 둠
  useEffect(() => {
    const guestToken = localStorage.getItem('guestToken');
    if (!isLogin && !guestToken) return; // 둘 다 없으면 진행 중인 인생도 없음
    client.get('/api/engine/current', { params: { guestToken } })
      .then((res) => setCurrent(res.data))
      .catch(() => setCurrent(null));
  }, [isLogin]);

  // 태어나기: 회원은 퀘스트 설정(C01) → 비회원은 바로 출생(C02)
  const startBirth = (d) => {
    navigate(isLogin ? '/quest' : '/birth', { state: { decade: d } });
  };

  // 태어나기 버튼: 진행 중인 인생이 있으면 먼저 확인 창, 없으면 바로 태어나기
  const goBirth = (d) => {
    if (current) {
      setAskDecade(d);
      return;
    }
    startBirth(d);
  };

  const choose = (d) => {
    setDecade(d);
    setLuck(false);
  };

  // 아무 시대에나: 누르면 바로 무작위 시대로 태어나기 (궤도 돌리는 연출 없이)
  const spin = () => {
    if (spinning) return;
    const final = DECADES[Math.floor(Math.random() * DECADES.length)];
    if (current) { // 진행 중인 인생이 있으면 확인 창부터
      setDecade(final);
      setAskDecade(final);
      return;
    }
    setSpinning(true);
    setDecade(final);
    goBirth(final);
  };

  return (
    <div className="ms sky">
      <main className="ms-in">
        <section className="ms-hero">
          <Badge live>지금 아시아 48개국 실시간</Badge>
          <h1 className="ms-title">환승인생</h1>
          <p className="ms-lead">시대를 고르면 나라, 성별, 집안 형편이 무작위로 정해집니다. 매년 선택하며 한 사람의 일생을 끝까지 살아 보세요.</p>

          <div className={'ms-pick' + (luck ? ' luck' : '') + (spinning ? ' spinning' : '')} aria-live="polite">
            <span className="ms-pick-dot" />
            <div>{luck ? '운명이 고른 시대' : spinning ? '시대를 고르는 중' : '태어날 시대'}<b>{decade}년대</b></div>
            <span className="ms-pick-hint">{range}<br />{luck ? '이 시대로 태어납니다' : '오른쪽 궤도에서 바꿀 수 있어요'}</span>
          </div>

          <div className="ms-acts">
            <Button type="primary" size="lg" className="ms-cta" disabled={spinning} onClick={() => goBirth(decade)}>
              <StarIcon size={14} color="var(--on-primary)" />{decade}년대에 태어나기
            </Button>
            {/* 이어서 살기 (H01): 진행 중인 인생이 있을 때만 켜짐 → 게임 화면이 GET /api/engine/current 로 다시 불러옴 */}
            <Button size="lg" className="ms-cont" disabled={!current} onClick={() => navigate('/play')}>
              이어서 살기
              <small>{current ? `${current.name} · ${current.currentAge}세` : '진행 중인 인생이 없어요'}</small>
            </Button>
          </div>
          <button type="button" className="ms-random" onClick={spin} disabled={spinning}>
            <DiceIcon />{spinning ? '운명이 시대를 고르는 중…' : '시대도 운에 맡기고 아무 때나 태어나기'}
          </button>
          {!isLogin && <p className="ms-guest">비회원은 퀘스트 없이 바로 태어나요. 인생은 이 브라우저에만 7일 동안 저장돼요.</p>}
        </section>

        <Panel title="지금 아시아" className="ms-globe"
          right={<span className="ms-legend"><span><i className="bigstat-dot birth" />태어남</span><span><i className="bigstat-dot death" />떠남</span></span>}>
          <OrbitGlobe value={decade} onChange={choose} births={feed.globeBirths} deaths={feed.globeDeaths} />
        </Panel>

        <Panel title="방금 시작된 인생" right={<a href="#">전체 보기</a>} className="ms-c1">
          <FeedList items={feed.born} />
        </Panel>
        <Panel title="방금 끝난 인생" right={<a href="/memorial">추모관</a>} className="ms-c2">
          <FeedList items={feed.died} />
        </Panel>
        <Panel className="ms-c3">
          <div className="col" style={{ gap: 12 }}>
            <BigStat label="오늘 아시아에서 태어난 아기" value={counter.bornToday} dot="birth"
              sub={<>이 페이지를 연 뒤 <b>+{counter.bornSincePage.toLocaleString('ko-KR')}</b>명</>} />
            <BigStat label="오늘 아시아에서 떠난 사람" value={counter.diedToday} dot="death"
              sub={<>이 페이지를 연 뒤 <b>+{counter.diedSincePage.toLocaleString('ko-KR')}</b>명</>} />
            <p className="ms-source">유엔 세계인구전망 2024 기준 추정 (아시아 연간 출생 약 6,491만 명, 사망 약 3,488만 명)</p>
          </div>
        </Panel>
      </main>

      {/* 기존 인생 포기 확인 창 (H01) - 바깥을 누르면 닫힘 */}
      <Modal open={askDecade !== null} title="진행 중인 인생이 있어요" onClose={() => setAskDecade(null)}>
        <p>
          <b>{current?.name}</b>({current?.currentAge}세)의 삶이 아직 진행 중이에요.<br />
          {askDecade}년대에 새로 태어나면 지금 인생은 <b>포기</b>되고, 다시 이어서 할 수 없어요.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
          <Button onClick={() => navigate('/play')}>이어서 살기</Button>
          <Button type="danger" onClick={() => startBirth(askDecade)}>포기하고 새로 태어나기</Button>
        </div>
      </Modal>
    </div>
  );
}

export default Main;
