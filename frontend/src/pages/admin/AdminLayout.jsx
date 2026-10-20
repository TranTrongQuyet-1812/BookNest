import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import LogoBookNest from '../../components/LogoBookNest';
import { 
  BarChart3, 
  BookOpen, 
  ClipboardList, 
  Users, 
  LogOut, 
  ArrowUpRight,
  Boxes,
  ShoppingCart,
  History,
  Settings,
  MessageSquare,
  CreditCard,
  Percent,
  ClipboardCheck,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';

export const AdminLayout = () => {
  const { user, dangXuat } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Tự động thu gọn sidebar trên màn hình laptop nhỏ (< 1180px) để tối ưu không gian bảng
  const [thuGonSidebar, setThuGonSidebar] = React.useState(() => {
    try {
      if (typeof window !== 'undefined') {
        const saved = localStorage.getItem('admindash_sidebar_collapsed');
        if (saved !== null) return saved === 'true';
        return window.innerWidth < 1180;
      }
    } catch {
      // Bỏ qua lỗi truy cập storage khi trình duyệt chặn quyền nghiêm ngặt
    }
    return false;
  });

  const toggleThuGon = () => {
    setThuGonSidebar(prev => {
      const next = !prev;
      try {
        localStorage.setItem('admindash_sidebar_collapsed', String(next));
      } catch {
        // Bỏ qua lỗi ghi storage khi bị chặn quyền
      }
      return next;
    });
  };

  const handleDangXuat = () => {
    try {
      localStorage.removeItem('booknest_last_admin_path');
    } catch {
      // Bỏ qua lỗi xóa storage khi bị chặn quyền
    }
    dangXuat();
    navigate('/admin/login');
  };

  // Lưu lại tab admin hiện tại kèm bộ lọc để khôi phục khi truy cập lại /admin
  React.useEffect(() => {
    if (
      location.pathname.startsWith('/admin') &&
      location.pathname !== '/admin' &&
      location.pathname !== '/admin/' &&
      location.pathname !== '/admin/login'
    ) {
      try {
        localStorage.setItem('booknest_last_admin_path', location.pathname + location.search);
      } catch {
        // Bỏ qua lỗi ghi storage khi bị chặn quyền
      }
    }
  }, [location.pathname, location.search]);

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
    if (p.includes('/admin/discounts')) return 'Quản Lý Giảm Giá Sách';
    if (p.includes('/admin/orders')) return 'Xử Lý Đơn Hàng';
    if (p.includes('/admin/payments')) return 'Quản Lý Thanh Toán & Hoàn Tiền';
    if (p.includes('/admin/reviews')) return 'Kiểm Duyệt Đánh Giá';
    if (p.includes('/admin/counter-sales')) return 'Bán Hàng Tại Quầy';
    if (p.includes('/admin/change-history')) return 'Lịch Sử Thay Đổi';
    if (p.includes('/admin/settings')) return 'Cài Đặt Hệ Thống';
    if (p.includes('/admin/users')) return 'Quản Lý Nhân Sự & Khách';
    if (p.includes('/admin/profile')) return 'Hồ Sơ & Đổi Mật Khẩu';
    if (p.includes('/admin/pick-list')) return 'Đơn Cần Soạn (Pick List)';
    return 'Bảng Điều Hành';
  };

  return (
    <div className="admindash-shell" style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar Deep Slate Chuyên Nghiệp */}
      <aside className={`admindash-sidebar ${thuGonSidebar ? 'collapsed' : ''}`}>
        <div>
          {/* Logo & Branding */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: thuGonSidebar ? 'center' : 'space-between',
            padding: thuGonSidebar ? '0.25rem 0 1.25rem' : '0.25rem 0.5rem 1.25rem',
            borderBottom: '1px solid var(--adm-sidebar-border)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <LogoBookNest height={26} />
              {!thuGonSidebar && (
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, color: '#FFFFFF' }}>
                    BookNest
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--adm-sidebar-muted)', fontWeight: 600, letterSpacing: '0.08em' }}>
                    ADMINDASH
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={toggleThuGon}
              title={thuGonSidebar ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              aria-label={thuGonSidebar ? 'Mở rộng menu' : 'Thu gọn menu'}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: 'var(--adm-sidebar-muted)',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = '#FFFFFF'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--adm-sidebar-muted)'}
            >
              {thuGonSidebar ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
          </div>

          {/* Hồ Sơ Nhân Sự Tối Giản (User Profile Card) - Nhấn để xem/sửa hồ sơ và đổi mật khẩu */}
          <NavLink
            to="/admin/profile"
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              justifyContent: thuGonSidebar ? 'center' : 'flex-start',
              gap: '0.65rem',
              padding: thuGonSidebar ? '0.65rem 0' : '0.65rem 0.75rem',
              margin: '1rem 0 1.25rem',
              backgroundColor: isActive ? 'var(--adm-primary-hover, rgba(37, 99, 235, 0.2))' : 'var(--adm-sidebar-hover)',
              borderRadius: '6px',
              border: isActive ? '1px solid var(--adm-primary)' : '1px solid var(--adm-sidebar-border)',
              textDecoration: 'none',
              transition: 'background-color 0.15s ease'
            })}
            title={thuGonSidebar ? `Hồ sơ: ${user?.fullName || user?.email} (${tenVaiTro})` : undefined}
          >
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
            {!thuGonSidebar && (
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
                  {tenVaiTro} • Hồ sơ
                </div>
              </div>
            )}
          </NavLink>

          {/* Danh Sách Mục Menu Theo Nhóm Chức Năng (RBAC) */}
          <nav>
            {laQuanTri && (
              <div className="admindash-nav-group">
                {!thuGonSidebar && <div className="admindash-group-label">Tổng Quan</div>}
                <NavLink
                  to="/admin/dashboard"
                  title="Thống Kê Doanh Thu"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <BarChart3 size={17} style={{ flexShrink: 0 }} />
                  <span className="admindash-hide-collapsed">Thống Kê Doanh Thu</span>
                </NavLink>
              </div>
            )}

            {coQuyenVaoKho && (
              <div className="admindash-nav-group">
                {!thuGonSidebar && <div className="admindash-group-label">Hàng Hóa & Kho</div>}
                <NavLink
                  to="/admin/books"
                  title="Quản Lý Sách & Thể Loại"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <BookOpen size={17} style={{ flexShrink: 0 }} />
                  <span className="admindash-hide-collapsed">Quản Lý Sách & Thể Loại</span>
                </NavLink>

                <NavLink
                  to="/admin/inventory"
                  title="Nhập Kho & Tồn Kho"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Boxes size={17} style={{ flexShrink: 0 }} />
                  <span className="admindash-hide-collapsed">Nhập Kho & Tồn Kho</span>
                </NavLink>

                <NavLink
                  to="/admin/discounts"
                  title="Giảm Giá Sách"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Percent size={17} style={{ flexShrink: 0 }} />
                  <span className="admindash-hide-collapsed">Giảm Giá Sách</span>
                </NavLink>

                <NavLink
                  to="/admin/pick-list"
                  title="Đơn Cần Soạn (Pick List)"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <ClipboardCheck size={17} style={{ flexShrink: 0 }} />
                  <span className="admindash-hide-collapsed">Đơn Cần Soạn</span>
                </NavLink>
              </div>
            )}

            {laThuThu && (
              <div className="admindash-nav-group">
                {!thuGonSidebar && <div className="admindash-group-label">Ấn Phẩm</div>}
                <NavLink
                  to="/admin/books"
                  title="Tra Cứu Sách & Tồn Kho"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <BookOpen size={17} style={{ flexShrink: 0 }} />
                  <span className="admindash-hide-collapsed">Tra Cứu Sách & Tồn Kho</span>
                </NavLink>
              </div>
            )}

            {coQuyenXuLyDon && (
              <div className="admindash-nav-group">
                {!thuGonSidebar && <div className="admindash-group-label">Vận Hành</div>}
                <NavLink
                  to="/admin/orders"
                  title="Xử Lý Đơn Hàng"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <ClipboardList size={17} style={{ flexShrink: 0 }} />
                  <span className="admindash-hide-collapsed">Xử Lý Đơn Hàng</span>
                </NavLink>

                {laThuThu && (
                  <NavLink
                    to="/admin/pick-list"
                    title="Đơn Cần Soạn (Pick List)"
                    className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                  >
                    <ClipboardCheck size={17} style={{ flexShrink: 0 }} />
                    <span className="admindash-hide-collapsed">Đơn Cần Soạn</span>
                  </NavLink>
                )}

                <NavLink
                  to="/admin/payments"
                  title="Quản Lý Thanh Toán"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <CreditCard size={17} style={{ flexShrink: 0 }} />
                  <span className="admindash-hide-collapsed">Quản Lý Thanh Toán</span>
                </NavLink>

                <NavLink
                  to="/admin/reviews"
                  title="Kiểm Duyệt Đánh Giá"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <MessageSquare size={17} style={{ flexShrink: 0 }} />
                  <span className="admindash-hide-collapsed">Kiểm Duyệt Đánh Giá</span>
                </NavLink>
              </div>
            )}

            {coQuyenXuLyDon && (
              <div className="admindash-nav-group">
                {!thuGonSidebar && <div className="admindash-group-label">Bán Hàng</div>}
                <NavLink
                  to="/admin/counter-sales"
                  title="Bán tại quầy"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <ShoppingCart size={17} style={{ flexShrink: 0 }} />
                  <span className="admindash-hide-collapsed">Bán tại quầy</span>
                </NavLink>

                {laThuThu && (
                  <NavLink
                    to="/admin/users?role=khach_hang"
                    title="Tra cứu khách hàng"
                    className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                  >
                    <Users size={17} style={{ flexShrink: 0 }} />
                    <span className="admindash-hide-collapsed">Tra cứu khách hàng</span>
                  </NavLink>
                )}
              </div>
            )}

            {laQuanTri && (
              <div className="admindash-nav-group">
                {!thuGonSidebar && <div className="admindash-group-label">Hệ Thống</div>}
                <NavLink
                  to="/admin/users"
                  title="Quản Lý Nhân Sự & Khách"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Users size={17} style={{ flexShrink: 0 }} />
                  <span className="admindash-hide-collapsed">Quản Lý Nhân Sự & Khách</span>
                </NavLink>
                <NavLink
                  to="/admin/change-history"
                  title="Lịch Sử Thay Đổi"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <History size={17} style={{ flexShrink: 0 }} />
                  <span className="admindash-hide-collapsed">Lịch Sử Thay Đổi</span>
                </NavLink>
                <NavLink
                  to="/admin/settings"
                  title="Cài Đặt Hệ Thống"
                  className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
                >
                  <Settings size={17} style={{ flexShrink: 0 }} />
                  <span className="admindash-hide-collapsed">Cài Đặt Hệ Thống</span>
                </NavLink>
              </div>
            )}
          </nav>
        </div>

        {/* Khối Tiện Ích Dưới Sidebar */}
        <div style={{ paddingTop: '0.75rem', borderTop: '1px solid var(--adm-sidebar-border)', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <a
            href={`${import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:3000'}/`}
            className="admindash-nav-link"
            title="Xem Cửa Hàng Storefront"
            style={{ fontSize: '0.8rem' }}
          >
            <ArrowUpRight size={16} style={{ flexShrink: 0 }} />
            <span className="admindash-hide-collapsed">Xem Cửa Hàng Storefront</span>
          </a>

          <button
            onClick={handleDangXuat}
            className="admindash-nav-link"
            title="Đăng Xuất Khỏi Admindash"
            style={{ fontSize: '0.8rem', color: '#F87171' }}
          >
            <LogOut size={16} style={{ flexShrink: 0 }} />
            <span className="admindash-hide-collapsed">Đăng Xuất Khỏi Admindash</span>
          </button>
        </div>
      </aside>

      {/* Khu Vực Nội Dung Chính Có Topbar */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        <header className="admindash-topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <button
              type="button"
              onClick={toggleThuGon}
              title={thuGonSidebar ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              aria-label={thuGonSidebar ? 'Mở rộng menu' : 'Thu gọn menu'}
              style={{
                backgroundColor: 'transparent',
                border: '1px solid var(--adm-border)',
                borderRadius: '6px',
                padding: '0.35rem 0.5rem',
                color: 'var(--adm-text-main)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--adm-sidebar-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              {thuGonSidebar ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>

            <div style={{ fontSize: '0.825rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--adm-text-main)' }}>Admindash</span>
              <span>/</span>
              <span style={{ color: 'var(--adm-text-main)', fontWeight: 500 }}>{layTieuDeTrang()}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10b981', display: 'inline-block' }} />
            <span>Hệ thống trực tuyến</span>
          </div>
        </header>

        {/* Nội Dung Các Trang Con */}
        <main className="admindash-main" style={{ flex: 1, padding: thuGonSidebar ? '1.25rem 1.5rem' : '1.5rem 1.75rem', overflowY: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
