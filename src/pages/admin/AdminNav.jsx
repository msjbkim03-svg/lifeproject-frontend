// 관리자 화면 위쪽 메뉴 (A04 대시보드 · A03 이벤트 관리 · C10 역사 문장 검수가 같이 씀)
// 예: <AdminNav />  → 지금 주소에 맞는 메뉴가 금색(chip on)
import { NavLink } from 'react-router-dom';
import '../../common/ui/ui.css';

const MENUS = [
  { path: '/admin', label: '대시보드', end: true }, // end: /admin/events 에서는 꺼지게 (정확히 /admin 일 때만)
  { path: '/admin/events', label: '이벤트 관리' },
  { path: '/admin/hist-review', label: '역사 문장 검수' },
];

// 칩은 원래 버튼용이라 링크(a)에 쓸 때 가운데 정렬·밑줄 없애기
const linkStyle = { display: 'inline-flex', alignItems: 'center', textDecoration: 'none' };

function AdminNav() {
  return (
    <nav className="chips">
      {MENUS.map((m) => (
        <NavLink
          key={m.path}
          to={m.path}
          end={m.end}
          className={({ isActive }) => (isActive ? 'chip on' : 'chip')}
          style={linkStyle}
        >
          {m.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default AdminNav;