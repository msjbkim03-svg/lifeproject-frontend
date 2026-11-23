import { Routes, Route, useLocation } from 'react-router-dom';
import Header from './common/ui/Header';
import ThemeToggle from './common/ui/ThemeToggle';
import Main from './main/Main';
import LoginPage from './pages/login/LoginPage';
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
import AuthModal from './pages/login/AuthModal';
import QuestPage from './pages/quest/QuestPage';
import AdminMain from './pages/admin/AdminMain';
import AdminEvents from './pages/admin/AdminEvents';
import AdminHistReview from './pages/admin/AdminHistReview';
import AdminMembers from './pages/admin/AdminMembers';
import MemorialListPage from './pages/memorial/MemorialListPage';
import MemorialRoomPage from './pages/memorial/MemorialRoomPage';
import MemorialRoomTab from './pages/memorial/MemorialRoomTab';
import MemorialVideoTab from './pages/memorial/MemorialVideoTab';
import MemorialAlbumTab from './pages/memorial/MemorialAlbumTab';
import MemorialGuestTab from './pages/memorial/MemorialGuestTab';
import MemorialLastTab from './pages/memorial/MemorialLastTab';

function App() {
  // 로그인·찾기를 팝업으로 열면 background = 뒤에 깔린 화면 주소
  //   → 뒤 화면은 그대로 그리고, 그 위에 팝업만 따로 그림 (주소로 바로 들어오면 원래처럼 한 화면)
  const location = useLocation();
  const background = location.state?.background;

  return (
    <>
      {/* 모든 화면 위 머리글 (공통) */}
      <Header />
      <Routes location={background || location}>
        {/* H01 메인 */}
        <Route path="/" element={<Main />} />
        <Route path="/login" element={<LoginPage />} />
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
        {/* B01 추모관 목록 (헤더·메인 [추모관]) → 방 */}
        <Route path="/memorial" element={<MemorialListPage />} />
        <Route path="/memorial/:lifeId" element={<MemorialRoomPage />}>
          <Route index element={<MemorialRoomTab />} />
          <Route path="video" element={<MemorialVideoTab kind="last" />} />
          <Route path="cookie" element={<MemorialVideoTab kind="cookie" />} />
          <Route path="album" element={<MemorialAlbumTab />} />
          <Route path="guest" element={<MemorialGuestTab />} />
          <Route path="last" element={<MemorialLastTab />} />
        </Route>
        {/* A04 관리자 메인 */}
         <Route path="/admin" element={<AdminMain />} />
        {/* A03 이벤트 관리 · C10 역사 문장 검수 (관리자만, 서버가 권한 확인) */}
        <Route path="/admin/events" element={<AdminEvents />} />
        <Route path="/admin/hist-review" element={<AdminHistReview />} />
        <Route path="/admin/members" element={<AdminMembers />} />
        {/* 디자인 가이드 (공통) */}
        <Route path="/design-guide" element={<DesignGuide />} />
        {/* C08 마을 이동 테스트 (엔진) */}
        <Route path="/village-test" element={<VillageTest />} />
      </Routes>
      {/* 로그인·찾기 팝업 (뒤 화면은 어둡게) */}
      {background && (
        <Routes>
          <Route path="/login" element={<AuthModal><LoginPage /></AuthModal>} />
          <Route path="/find" element={<AuthModal><FindPage /></AuthModal>} />
        </Routes>
      )}
      {/* 오른쪽 아래 테마 버튼 (라이트 노을 ↔ 다크 밤하늘, 모든 화면 공통) */}
      <ThemeToggle />
    </>
  );
}

export default App;
