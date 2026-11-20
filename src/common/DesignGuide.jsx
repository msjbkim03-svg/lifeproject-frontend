// 디자인 가이드 화면 (주소: /design-guide)
// 팀원들이 색·글꼴·부품을 보고 똑같이 쓰도록 모아둔 화면 - 밤하늘 스타일 (M01 시안)
import { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from './ui/Button';
import Panel from './ui/Panel';
import StatBar from './ui/StatBar';
import Badge from './ui/Badge';
import Modal from './ui/Modal';
import ChoiceList from './ui/ChoiceList';
import GameBar from './ui/GameBar';
import Chips from './ui/Chips';
import OptionGrid from './ui/OptionGrid';
import ChoiceCard from './ui/ChoiceCard';
import InfoBox from './ui/InfoBox';
import LevelDots from './ui/LevelDots';
import DocCard from './ui/DocCard';
import LogItem from './ui/LogItem';
import BarRow from './ui/BarRow';
import CheckItem from './ui/CheckItem';
import BigStat from './ui/BigStat';
import FeedList from './ui/FeedList';
import StarIcon from './ui/StarIcon';
import OrbitGlobe from './ui/OrbitGlobe';
import { DECADES } from './ui/decades';
import YearEvents from './ui/YearEvents';
import EventChoiceModal from './ui/EventChoiceModal';
import LifeStatus from './ui/LifeStatus';
import EffectChips from './ui/EffectChips';

const COLORS = [
  ['--bg', '바탕 (밤하늘)'], ['--bg-deep', '더 어두운 바탕'], ['--panel', '카드 안쪽'], ['--panel-2', '카드 안 칸'],
  ['--line', '테두리'], ['--line-strong', '진한 테두리'], ['--ink', '글자'], ['--ink-sub', '보조 글자'],
  ['--ink-light', '흐린 글자'], ['--primary', '금색 (메인)'], ['--green', '성공'], ['--blue', '정보'],
  ['--red', '위험'], ['--death', '떠난 사람'], ['--stat-health', '건강'], ['--stat-happiness', '행복'],
  ['--stat-knowledge', '지식'], ['--stat-relation', '관계'],
];

const FOCUS_SAMPLE = [
  { value: 'STUDY', label: '공부', desc: '지식↑ 행복↓' },
  { value: 'PLAY', label: '친구·놀이', desc: '관계↑ 행복↑' },
  { value: 'SPORT', label: '운동', desc: '건강↑' },
];

// 엔진 응답 예시 (/api/engine/next)
const EVENTS_SAMPLE = [
  { eventId: 'LE_MEET', title: '새로운 만남', logText: '34세, 마음이 통하는 사람을 만났다.', effHappiness: 8, effRelation: 6, choice: false },
  { eventId: 'LE_DISEASE_TB', title: '결핵', logText: '몸이 좋지 않아 병원을 찾았더니 결핵이라고 했다.', effHealth: -15, effHappiness: -4, choice: false },
  { eventId: 'LE_PROMOTE', title: '승진', logText: '성실함을 인정받아 승진했다.', effHappiness: 5, effIncomeRate: 0.1, choice: false },
];
const CHOICE_SAMPLE = {
  eventId: 'LE_SHOP', logText: '27세, 가게 창업 기회가 찾아왔다.',
  choices: [{ choiceId: 1, choiceText: '모은 돈으로 작은 가게를 연다' }, { choiceId: 2, choiceText: '지금 하던 일을 계속한다' }],
};
const LIFE_SAMPLE = {
  currentAge: 34, eduLevel: 'HIGH', schoolStatus: 'GRADUATED', jobStatus: 'EMPLOYED', jobName: '방직 공장 기술공',
  marriedYn: 'Y', childCount: 2, parentAlive: 'N', birthCountry: 'IND', currentCountry: 'IND',
};

const FEED_SAMPLE = [
  { id: 1, time: '방금', title: '방글라데시 다카', sub: '여자아이', side: '형편 2' },
  { id: 2, time: '4초 전', title: '베트남 하노이', sub: '남자아이', side: '형편 3' },
];

function DesignGuide() {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState('STUDY');
  const [focus, setFocus] = useState('WORK');
  const [decade, setDecade] = useState(1980);
  const [job, setJob] = useState('A');
  const [quests, setQuests] = useState(['Q1']);
  const [paused, setPaused] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [choiceOpen, setChoiceOpen] = useState(false);

  const toggleQuest = (q) =>
    setQuests(quests.includes(q) ? quests.filter((x) => x !== q) : [...quests, q]);

  return (
    <>
    <GameBar age={34} year={1981} savedYear={1981} paused={paused} speed={speed}
      onPause={() => setPaused(!paused)} onSpeed={setSpeed} onShop={() => {}} onHome={() => {}} />
    <div className="page col">
      <h1>환승인생 디자인 가이드</h1>
      <p className="sub">밤하늘 바탕에 금색 별빛 하나만 강조로 써요. 파일: src/common/design.css, src/common/ui/
        <br />메인 화면: <Link to="/" className="gold">/</Link>,  마을: <Link to="/village-test" className="gold">/village-test</Link></p>

      <Panel title="1. 색 (var(--이름))">
        <div className="row">
          {COLORS.map(([v, name]) => (
            <div key={v} style={{ width: 120 }}>
              <div style={{ height: 40, background: `var(${v})`, border: '1px solid var(--line-strong)', borderRadius: 8 }} />
              <div style={{ fontSize: 12, marginTop: 4 }}>{name}</div>
              <div className="sub" style={{ fontSize: 11 }}>{v}</div>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="2. 글꼴">
        <h1 style={{ fontSize: 'var(--fs-hero)' }}>환승인생</h1>
        <h1>큰 제목 (고운바탕, 44px)</h1>
        <h2>제목 (고운바탕, 28px)</h2>
        <h3>작은 제목 (고운바탕, 20px)</h3>
        <p>본문은 IBM Plex Sans KR 16px이에요. 1955년, 인도의 작은 시골 마을에서 태어났습니다.</p>
        <p className="sub">보조 글자는 .sub 클래스 (설명, 날짜)</p>
        <p><span className="display" style={{ fontSize: 28 }}>1,234,567원</span> ← 숫자·강조는 .display 클래스</p>
      </Panel>

      <Panel title="3. 버튼 (Button)">
        <div className="row">
          <Button type="primary" size="lg"><StarIcon size={14} color="var(--on-primary)" />1980년대에 태어나기</Button>
          <Button type="primary">다음 해</Button>
          <Button type="light">회원가입</Button>
          <Button>이어하기</Button>
          <Button type="danger">포기하기</Button>
          <Button type="ghost">취소</Button>
          <Button size="sm">작은 버튼</Button>
          <Button pill>알약 모양</Button>
          <Button disabled>못 누름</Button>
        </div>
      </Panel>

      <div className="row" style={{ alignItems: 'stretch' }}>
        <Panel title="4. 능력치 바 (StatBar)" style={{ flex: 1, minWidth: 320 }}>
          <div className="col" style={{ gap: 12 }}>
            <StatBar type="health" value={82} />
            <StatBar type="happiness" value={55} />
            <StatBar type="knowledge" value={37} />
            <StatBar type="relation" value={68} />
          </div>
        </Panel>

        <Panel title="5. 뱃지 (Badge)" style={{ flex: 1, minWidth: 320 }}>
          <div className="row">
            <Badge>직장인</Badge>
            <Badge color="gold">형편 4</Badge>
            <Badge color="green">대졸</Badge>
            <Badge color="blue">도시</Badge>
            <Badge color="red">사망</Badge>
            <Badge color="dark">인도</Badge>
            <Badge live>실시간</Badge>
          </div>
        </Panel>
      </div>

      <Panel title="6. 지구본 + 시대 궤도 (OrbitGlobe) - 메인 H01" right={<span className="sub">고른 시대: <b className="gold">{decade}년대</b></span>}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <OrbitGlobe value={decade} onChange={setDecade} />
        </div>
      </Panel>

      <div className="row" style={{ alignItems: 'stretch' }}>
        <Panel title="7. 실시간 목록 (FeedList)" right={<a href="#">전체 보기</a>} style={{ flex: 1, minWidth: 320 }}>
          <FeedList items={FEED_SAMPLE} />
        </Panel>
        <Panel title="8. 큰 숫자 (BigStat)" style={{ flex: 1, minWidth: 320 }}>
          <div className="row" style={{ gap: 40 }}>
            <BigStat label="태어난 아기" value={1204} dot="birth" />
            <BigStat label="떠난 사람" value={486} dot="death" />
            <BigStat label="평균 소득" value="1,820만 원" />
          </div>
        </Panel>
      </div>

      <h2 style={{ marginTop: 16 }}>인생 진행 화면 부품 (C03·C09)</h2>
      <p className="sub">엔진 /api/engine/next 응답을 그대로 넣으면 돼요. events → YearEvents, needChoice·pendingEvent → EventChoiceModal, 응답 전체 → LifeStatus</p>

      <div className="row" style={{ alignItems: 'stretch' }}>
        <Panel title="올해 일어난 일 (YearEvents)" style={{ flex: 2, minWidth: 360 }}>
          <div className="col" style={{ gap: 24 }}>
            <YearEvents age={34} year={1981} events={EVENTS_SAMPLE} />
            <YearEvents age={35} year={1982} events={[]} />
          </div>
        </Panel>
        <div className="col" style={{ flex: 1, minWidth: 280 }}>
          <Panel title="인생 상태 (LifeStatus)">
            <LifeStatus life={LIFE_SAMPLE} />
          </Panel>
          <Panel title="효과 칩 (EffectChips)">
            <EffectChips effect={{ effHealth: -10, effHappiness: 5, effIncomeRate: 0.1, effWealthRate: -0.3 }} />
          </Panel>
          <Panel title="선택 이벤트 창 (EventChoiceModal)">
            <Button type="primary" onClick={() => setChoiceOpen(true)}>선택 이벤트 열기</Button>
            <EventChoiceModal open={choiceOpen} event={CHOICE_SAMPLE} onChoose={() => setChoiceOpen(false)} />
          </Panel>
        </div>
      </div>

      <Panel title="9. 선택 창 (Modal + ChoiceList)">
        <Button type="primary" onClick={() => setOpen(true)}>집중 선택 창 열기</Button>
        <Modal open={open} title="올해 무엇에 집중할까요?" onClose={() => setOpen(false)}>
          <ChoiceList items={FOCUS_SAMPLE} selected={pick} onPick={setPick} />
          <div className="modal-actions">
            <Button type="ghost" onClick={() => setOpen(false)}>닫기</Button>
            <Button type="primary" onClick={() => setOpen(false)}>결정</Button>
          </div>
        </Modal>
      </Panel>

      <Panel title="10. 입력칸 (.input)">
        <div className="row">
          <input className="input" placeholder="아이디" />
          <input className="input" placeholder="채팅을 입력하세요" />
        </div>
      </Panel>

      <h2 style={{ marginTop: 16 }}>와이어프레임 부품</h2>
      <p className="sub">맨 위 헤더(Header, App.jsx에서 모든 화면에 붙음)와 게임 진행 바(GameBar)도 공통 부품이에요.</p>

      <Panel title="11. 연대 선택 목록형 (OptionGrid) - 지구본을 못 쓰는 좁은 화면용">
        <OptionGrid selected={decade} onPick={setDecade}
          items={DECADES.map((d) => ({
            value: d, label: d + '년대', sub: d === 2020 ? '2020 – 현재' : d + ' – ' + (d + 9),
          }))} />
      </Panel>

      <Panel title="12. 올해의 집중 (Chips) - 인생 진행 C04">
        <Chips selected={focus} onPick={setFocus} items={[
          { value: 'WORK', label: '일에 몰두' }, { value: 'BALANCE', label: '균형' },
          { value: 'FAMILY', label: '가족·친구' }, { value: 'HEALTH', label: '건강 관리' },
          { value: 'SELF_DEV', label: '자기계발' },
        ]} />
      </Panel>

      <Panel title="13. 직업 제안 (ChoiceCard) - C06">
        <div className="col" style={{ gap: 8 }}>
          <Badge color="gold">직업 제안, 19세 (1966년)</Badge>
          <h3>할 수 있는 일 3가지가 들어왔습니다</h3>
          <ChoiceCard title="방직 공장 기술공" tag="소득 배율 ×1.1" desc="공장 노동자, 초졸 이상" on={job === 'A'} onClick={() => setJob('A')} />
          <ChoiceCard title="시장 상인" tag="소득 배율 ×0.9" desc="노점상·소상인" on={job === 'B'} onClick={() => setJob('B')} />
          <ChoiceCard title="철도 정비원" tag="소득 배율 ×1.2" desc="철도원, 중졸 이상" on={job === 'C'} onClick={() => setJob('C')} />
          <div className="row" style={{ justifyContent: 'flex-end' }}>
            <Button type="primary">이 일 시작하기</Button>
          </div>
        </div>
      </Panel>

      <DocCard title="출생 신고서" en="Certificate of live birth" right="No. 000094"
        footer={<><span className="sub">14. 문서 카드 (DocCard) + 정보 칸 (InfoBox)</span><Button type="primary" size="lg">삶을 시작하기</Button></>}>
        <div className="row"><Badge color="dark">인도 (당시 영국령 인도)</Badge><Badge live>실시간</Badge></div>
        <div className="info-grid">
          <InfoBox label="성별" value="여자" />
          <InfoBox label="이름" value="프리야 싱" />
          <InfoBox label="가정형편" value="2분위" />
          <InfoBox label="사는 곳" value="시골" />
        </div>
      </DocCard>

      <div className="row" style={{ alignItems: 'stretch' }}>
        <Panel title="15. 특성 레벨 (LevelDots)" style={{ flex: 1, minWidth: 320 }}>
          <div className="col" style={{ gap: 8 }}>
            <LevelDots label="투자 성공" level={2} />
            <LevelDots label="질병 예방" level={3} />
            <LevelDots label="연애 성공" level={1} />
            <LevelDots label="학업 능력" level={5} />
          </div>
        </Panel>
        <Panel title="16. 가로 막대 (BarRow)" style={{ flex: 1, minWidth: 320 }}>
          <div className="col" style={{ gap: 8 }}>
            <BarRow label="인도" value={98} max={98} unit="명" />
            <BarRow label="중국" value={84} max={98} unit="명" />
            <BarRow label="대한민국" value={52} max={98} unit="명" />
            <BarRow label="북한" value={15} max={98} unit="명" />
          </div>
        </Panel>
      </div>

      <Panel title="17. 인생 기록 (LogItem) - C03">
        <div className="col" style={{ gap: 6 }}>
          <LogItem age={0} year={1947} text="인도의 작은 시골 마을에서 태어났습니다." big star
            detail="이해 인도는 영국에서 독립했습니다." />
          <LogItem age={6} year={1953} text="초등학교에 들어갔습니다." star />
          <LogItem age={19} year={1966} text="방직 공장 기술공으로 일을 시작했습니다." />
        </div>
      </Panel>

      <Panel title="18. 퀘스트 고르기 (CheckItem) - C01">
        <div className="col" style={{ gap: 8 }}>
          {[['Q1', '80세까지 살기'], ['Q2', '대학 졸업하기'], ['Q3', '다른 나라로 이주하기']].map(([q, label]) => (
            <CheckItem key={q} label={label} right="1P" on={quests.includes(q)} onClick={() => toggleQuest(q)} />
          ))}
        </div>
      </Panel>
    </div>
    </>
  );
}

export default DesignGuide;
