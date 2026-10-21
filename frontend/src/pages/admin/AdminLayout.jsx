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
  PanelLeftOpen,
  FileCode2
} from 'lucide-react';

// Một mục trên thanh bên: icon chỉ để nhận diện nhanh mục điều hướng, nhãn luôn hiện trừ khi thu gọn
const MucDieuHuong = ({ to, nhan, tieuDe, Icon }) => (
  <NavLink
    to={to}
    title={tieuDe || nhan}
    className={({ isActive }) => `admindash-nav-link ${isActive ? 'active' : ''}`}
  >
    <Icon size={16} />
    <span className="admindash-hide-collapsed">{nhan}</span>
  </NavLink>
);

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
  const tenVaiTro = laQuanTri ? 'Quản trị viên' : laThuKho ? 'Thủ kho' : laThuThu ? 'Thủ thư' : 'Nhân sự';

  // Lấy chữ cái đầu làm avatar
  const userInitials = (user?.fullName || user?.email || 'AD')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(-2)
    .map(s => s[0].toUpperCase())
    .join('');

  // Tiêu đề trang hiện tại, hiện cạnh nút thu gọn menu
  const layTieuDeTrang = () => {
    const p = location.pathname;
    if (p.includes('/admin/dashboard')) return 'Thống kê doanh thu';
    if (p.includes('/admin/books')) return laThuThu ? 'Tra cứu sách và tồn kho' : 'Quản lý sách và thể loại';
    if (p.includes('/admin/inventory')) return 'Nhập kho và tồn kho';
    if (p.includes('/admin/discounts')) return 'Giảm giá sách';
    if (p.includes('/admin/orders')) return 'Xử lý đơn hàng';
    if (p.includes('/admin/payments')) return 'Thanh toán và hoàn tiền';
    if (p.includes('/admin/reviews')) return 'Kiểm duyệt đánh giá';
    if (p.includes('/admin/counter-sales')) return 'Bán hàng tại quầy';
    if (p.includes('/admin/change-history')) return 'Lịch sử thay đổi';
    if (p.includes('/admin/settings')) return 'Cài đặt hệ thống';
    if (p.includes('/admin/api-docs')) return 'Tài liệu API (Swagger)';
    if (p.includes('/admin/users')) return 'Nhân sự và khách hàng';
    if (p.includes('/admin/profile')) return 'Hồ sơ và đổi mật khẩu';
    if (p.includes('/admin/pick-list')) return 'Đơn cần soạn';
    return 'Bảng điều hành';
  };

  return (
    <div className="admindash-shell" style={{ display: 'flex', minHeight: '100vh' }}>
      <aside className={`admindash-sidebar ${thuGonSidebar ? 'collapsed' : ''}`}>
        <div>
          <div className="admindash-brand">
            <LogoBookNest height={26} />
            <div className="admindash-hide-collapsed">
              <div className="admindash-brand-name">BookNest</div>
              <div className="admindash-brand-sub">Quản trị</div>
            </div>
          </div>

          {/* Hồ sơ nhân sự: nhấn để xem/sửa hồ sơ và đổi mật khẩu */}
          <NavLink
            to="/admin/profile"
            className={({ isActive }) => `admindash-user ${isActive ? 'active' : ''}`}
            title={thuGonSidebar ? `Hồ sơ: ${user?.fullName || user?.email} (${tenVaiTro})` : undefined}
          >
            <div className="admindash-avatar">{userInitials}</div>
            <div className="admindash-hide-collapsed" style={{ minWidth: 0, flex: 1 }}>
              <div className="admindash-user-name">{user?.fullName || user?.email}</div>
              <div className="admindash-user-role">{tenVaiTro}</div>
            </div>
          </NavLink>

          {/* Danh sách mục menu theo nhóm chức năng (RBAC) */}
          <nav>
            {laQuanTri && (
              <div className="admindash-nav-group">
                {!thuGonSidebar && <div className="admindash-group-label">Tổng quan</div>}
                <MucDieuHuong to="/admin/dashboard" nhan="Thống kê doanh thu" Icon={BarChart3} />
              </div>
            )}

            {coQuyenVaoKho && (
              <div className="admindash-nav-group">
                {!thuGonSidebar && <div className="admindash-group-label">Hàng hóa và kho</div>}
                <MucDieuHuong to="/admin/books" nhan="Quản lý sách và thể loại" Icon={BookOpen} />
                <MucDieuHuong to="/admin/inventory" nhan="Nhập kho và tồn kho" Icon={Boxes} />
                <MucDieuHuong to="/admin/discounts" nhan="Giảm giá sách" Icon={Percent} />
                <MucDieuHuong to="/admin/pick-list" nhan="Đơn cần soạn" Icon={ClipboardCheck} />
              </div>
            )}

            {laThuThu && (
              <div className="admindash-nav-group">
                {!thuGonSidebar && <div className="admindash-group-label">Ấn phẩm</div>}
                <MucDieuHuong to="/admin/books" nhan="Tra cứu sách và tồn kho" Icon={BookOpen} />
              </div>
            )}

            {coQuyenXuLyDon && (
              <div className="admindash-nav-group">
                {!thuGonSidebar && <div className="admindash-group-label">Vận hành</div>}
                <MucDieuHuong to="/admin/orders" nhan="Xử lý đơn hàng" Icon={ClipboardList} />
                {laThuThu && (
                  <MucDieuHuong to="/admin/pick-list" nhan="Đơn cần soạn" Icon={ClipboardCheck} />
                )}
                <MucDieuHuong to="/admin/payments" nhan="Quản lý thanh toán" Icon={CreditCard} />
                <MucDieuHuong to="/admin/reviews" nhan="Kiểm duyệt đánh giá" Icon={MessageSquare} />
              </div>
            )}

            {coQuyenXuLyDon && (
              <div className="admindash-nav-group">
                {!thuGonSidebar && <div className="admindash-group-label">Bán hàng</div>}
                <MucDieuHuong to="/admin/counter-sales" nhan="Bán tại quầy" Icon={ShoppingCart} />
                {laThuThu && (
                  <MucDieuHuong to="/admin/users?role=khach_hang" nhan="Tra cứu khách hàng" Icon={Users} />
                )}
              </div>
            )}

            {laQuanTri && (
              <div className="admindash-nav-group">
                {!thuGonSidebar && <div className="admindash-group-label">Hệ thống</div>}
                <MucDieuHuong to="/admin/users" nhan="Nhân sự và khách hàng" Icon={Users} />
                <MucDieuHuong to="/admin/change-history" nhan="Lịch sử thay đổi" Icon={History} />
                <MucDieuHuong to="/admin/settings" nhan="Cài đặt hệ thống" Icon={Settings} />
                <MucDieuHuong to="/admin/api-docs" nhan="Tài liệu API (Swagger)" Icon={FileCode2} />
              </div>
            )}
          </nav>
        </div>

        <div className="admindash-sidebar-foot">
          <a
            href={`${import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:3000'}/`}
            className="admindash-nav-link"
            title="Xem cửa hàng"
          >
            <ArrowUpRight size={16} />
            <span className="admindash-hide-collapsed">Xem cửa hàng</span>
          </a>

          <button
            type="button"
            onClick={handleDangXuat}
            className="admindash-nav-link danger"
            title="Đăng xuất"
          >
            <LogOut size={16} />
            <span className="admindash-hide-collapsed">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Khu vực nội dung chính có thanh trên */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        <header className="admindash-topbar">
          <button
            type="button"
            onClick={toggleThuGon}
            className="admindash-icon-btn"
            title={thuGonSidebar ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
            aria-label={thuGonSidebar ? 'Mở rộng menu' : 'Thu gọn menu'}
          >
            {thuGonSidebar ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
          <span className="admindash-crumb">{layTieuDeTrang()}</span>
        </header>

        {/* Nội dung các trang con; key theo đường dẫn để mỗi lần đổi trang nội dung hiện dần một lần */}
        <main
          key={location.pathname}
          className="admindash-main"
          style={{ flex: 1, padding: thuGonSidebar ? '1.25rem 1.5rem' : '1.5rem 1.75rem', overflowY: 'auto' }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
