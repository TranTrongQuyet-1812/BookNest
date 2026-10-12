import React from 'react';
import { Link, NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogoBookNest from '../../components/LogoBookNest';
import { 
  BarChart3, 
  BookOpen, 
  ClipboardList, 
  Users, 
  LogOut, 
  ArrowUpRight, 
  Boxes 
} from 'lucide-react';

export const AdminLayout = () => {
  const { user, dangXuat } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleDangXuat = () => {
    dangXuat();
    navigate('/admin/login');
  };

  const vaiTro = user?.role;
  const laQuanTri = vaiTro === 'quan_tri';
  const laThuKho = vaiTro === 'thu_kho';
  const laThuThu = vaiTro === 'thu_thu';

  const coQuyenVaoKho = laQuanTri || laThuKho;
  const coQuyenXuLyDon = laQuanTri || laThuThu;

  // Tên vai trò hiển thị
  const tenVaiTro = laQuanTri ? 'Quản Trị Viên' : laThuKho ? 'Thủ Kho' : laThuThu ? 'Thủ Thư' : 'Nhân Sự';

  // Lấy chữ cái đầu làm avatar
  const userInitials = (user?.fullName || user?.email || 'AD')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map(s => s[0].toUpperCase())
    .join('');

  // Breadcrumb tiêu đề trang hiện tại
  const layTieuDeTrang = () => {
    const p = location.pathname;
    if (p.includes('/admin/dashboard')) return 'Thống Kê Doanh Thu';
    if (p.includes('/admin/books')) return laThuThu ? 'Tra Cứu Sách & Tồn Kho' : 'Quản Lý Sách & Thể Loại';
    if (p.includes('/admin/inventory')) return 'Nhập Kho & Tồn Kho';
    if (p.includes('/admin/orders')) return 'Xử Lý Đơn Hàng';
    if (p.includes('/admin/users')) return 'Quản Lý Nhân Sự & Khách';
    return 'Bảng Điều Hành';
  };

  return (
    <div className="admindash-shell" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar Deep Slate Chuyên Nghiệp */}
      <aside className="admindash-sidebar">
        <div>
          {/* Logo & Branding */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.25rem 0.5rem 1.25rem', borderBottom: '1px solid var(--adm-sidebar-border)' }}>
            <LogoBookNest height={26} />
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, color: '#FFFFFF' }}>
                BookNest
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--adm-sidebar-muted)', fontWeight: 600, letterSpacing: '0.08em' }}>
                ADMINDASH
              </div>
            </div>
          </div>

          {/* Hồ Sơ Nhân Sự Tối Giản (User Profile Card) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            padding: '0.65rem 0.75rem',
            margin: '1rem 0 1.25rem',
            backgroundColor: 'var(--adm-sidebar-hover)',
            borderRadius: '6px',
            border: '1px solid var(--adm-sidebar-border)'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: 'var(--adm-primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.78rem',
              fontWeight: 700,
              flexShrink: 0
            }}>
              {userInitials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontSize: '0.825rem', fontWeight: 600, color: '#FFFFFF', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.fullName || user?.email}
              </div>
              <div style={{
                display: 'inline-block',
                marginTop: '2px',
                fontSize: '0.68rem',
                fontWeight: 600,
                color: '#93C5FD',
                letterSpacing: '0.02em'
              }}>
                {tenVaiTro}
              </div>
            </div>
          </div>

          {/* Danh Sách Mục Menu Theo Nhóm Chức Năng (RBAC) */}
          <nav>
            {laQuanTri && (
              <div className="admindash-nav-group">
                <div className="admindash-group-label">Tổng Quan</div>
                <NavLink
                  to="/admin/dashboard"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <BarChart3 size={16} />
                  <span>Thống Kê Doanh Thu</span>
                </NavLink>
              </div>
            )}

            {coQuyenVaoKho && (
              <div className="admindash-nav-group">
                <div className="admindash-group-label">Hàng Hóa & Kho</div>
                <NavLink
                  to="/admin/books"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <BookOpen size={16} />
                  <span>Quản Lý Sách & Thể Loại</span>
                </NavLink>

                <NavLink
                  to="/admin/inventory"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Boxes size={16} />
                  <span>Nhập Kho & Tồn Kho</span>
                </NavLink>
              </div>
            )}

            {laThuThu && (
              <div className="admindash-nav-group">
                <div className="admindash-group-label">Ấn Phẩm</div>
                <NavLink
                  to="/admin/books"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <BookOpen size={16} />
                  <span>Tra Cứu Sách & Tồn Kho</span>
                </NavLink>
              </div>
            )}

            {coQuyenXuLyDon && (
              <div className="admindash-nav-group">
                <div className="admindash-group-label">Vận Hành</div>
                <NavLink
                  to="/admin/orders"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <ClipboardList size={16} />
                  <span>Xử Lý Đơn Hàng</span>
                </NavLink>
              </div>
            )}

            {laQuanTri && (
              <div className="admindash-nav-group">
                <div className="admindash-group-label">Hệ Thống</div>
                <NavLink
                  to="/admin/users"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Users size={16} />
                  <span>Quản Lý Nhân Sự & Khách</span>
                </NavLink>
              </div>
            )}
          </nav>
        </div>

        {/* Khối Tiện Ích Dưới Sidebar */}
        <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--adm-sidebar-border)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <Link
            to="/"
            className="admindash-nav-link"
            style={{ fontSize: '0.8rem' }}
          >
            <ArrowUpRight size={15} />
            <span>Xem Cửa Hàng Storefront</span>
          </Link>

          <button
            onClick={handleDangXuat}
            className="admindash-nav-link"
            style={{ fontSize: '0.8rem', color: '#F87171' }}
          >
            <LogOut size={15} />
            <span>Đăng Xuất Khỏi Admindash</span>
          </button>
        </div>
      </aside>

      {/* Khu Vực Nội Dung Chính Có Topbar */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        <header className="admindash-topbar">
          <div style={{ fontSize: '0.825rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--adm-text-main)' }}>Admindash</span>
            <span>/</span>
            <span style={{ color: 'var(--adm-text-main)', fontWeight: 500 }}>{layTieuDeTrang()}</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
            <span>Hệ thống trực tuyến</span>
          </div>
        </header>

        {/* Nội Dung Các Trang Con */}
        <main style={{ flex: 1, padding: '1.75rem 2rem', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
