import { Routes, Route } from 'react-router-dom';
import Header from './common/ui/Header';
import ThemeToggle from './common/ui/ThemeToggle';
import Main from './main/Main';
import LoginPage from './pages/login/LoginPage';
import KakaoCallback from './pages/login/KakaoCallback';
import JoinPage from './pages/join/JoinPage';
import BirthPage from './pages/birth/BirthPage';
import PlayPage from './engine/play/PlayPage';
import DesignGuide from './common/DesignGuide';
import VillageTest from './engine/village/VillageTest';
import ResultPage from './pages/result/ResultPage';
import MyPageLayout from './pages/mypage/MyPageLayout';
import MyPage from './pages/mypage/MyPage';
import EditPage from './pages/mypage/EditPage';
import LivesPage from './pages/mypage/LivesPage';
import TraitsPage from './pages/mypage/TraitsPage';
import FindPage from './pages/find/FindPage';
import QuestPage from './pages/quest/QuestPage';
import AdminMain from './pages/admin/AdminMain';

function App() {
  return (
    <>
      {/* 모든 화면 위 머리글 (공통) */}
      <Header />
      <Routes>
        {/* H01 메인 */}
        <Route path="/" element={<Main />} />
        <Route path="/login" element={<LoginPage />} />
        {/* M02 카카오 로그인 - 카카오가 code 를 붙여 돌려보내는 주소 */}
        <Route path="/oauth/kakao" element={<KakaoCallback />} />
        <Route path="/join" element={<JoinPage />} />
        <Route path="/find" element={<FindPage />} />

        <Route path="/mypage" element={<MyPageLayout />}>
          <Route index element={<MyPage />} />             
          <Route path="edit" element={<EditPage />} />     
          <Route path="lives" element={<LivesPage />} />   
          <Route path="traits" element={<TraitsPage />} /> 
        </Route>
        
        {/* C01 퀘스트 설정 (회원이 태어나기 전) */}
        <Route path="/quest" element={<QuestPage />} />
        {/* C02 출생 추첨 */}
        <Route path="/birth" element={<BirthPage />} />
        {/* C03 인생 진행 */}
        <Route path="/play" element={<PlayPage />} />
        {/* C18 인생 결과 */}
        <Route path="/result/:lifeId" element={<ResultPage />} />
        {/* A04 관리자 메인 */}
        <Route path="/admin" element={<AdminMain />} />
        {/* 디자인 가이드 (공통) */}
        <Route path="/design-guide" element={<DesignGuide />} />
        {/* C08 마을 이동 테스트 (엔진) */}
        <Route path="/village-test" element={<VillageTest />} />
      </Routes>
      {/* 오른쪽 아래 테마 버튼 (라이트 노을 ↔ 다크 밤하늘, 모든 화면 공통) */}
      <ThemeToggle />
    </>
  );
}

export default App;
