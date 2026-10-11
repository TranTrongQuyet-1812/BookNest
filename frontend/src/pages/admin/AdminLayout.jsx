import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  BarChart3, 
  BookOpen, 
  Layers, 
  ClipboardList, 
  Users, 
  LogOut, 
  Home, 
  Sun, 
  Moon, 
  ShieldCheck, 
  Boxes 
} from 'lucide-react';

export const AdminLayout = () => {
  const { user, dangXuat, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();

  const handleDangXuat = () => {
    dangXuat();
    navigate('/login');
  };

  const vaiTro = user?.role;
  const laAdmin = vaiTro === 'admin';
  const laThuThu = vaiTro === 'librarian' || laAdmin;
  const laNhanVienDon = vaiTro === 'order_staff' || laAdmin;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: 'var(--bg-app)' }}>
      {/* Sidebar Bảng Điều Khiển Quản Trị */}
      <aside style={{
        width: '260px',
        backgroundColor: 'var(--bg-card)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        height: '100vh',
        padding: '1.25rem',
        flexShrink: 0
      }}>
        <div>
          {/* Logo Quản Trị */}
          <div className="flex items-center gap-2 mb-6 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <div style={{
              backgroundColor: 'var(--primary)',
              color: 'var(--primary-text)',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center'
            }}>
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 700 }}>
                BookNest
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Hệ Thống Back-Office
              </div>
            </div>
          </div>

          {/* Hồ Sơ Nhanh Của Nhân Sự */}
          <div style={{
            padding: '0.75rem',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-sm)',
            marginBottom: '1.25rem'
          }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{user?.hoTen}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="badge badge-role" style={{ fontSize: '0.7rem' }}>
                {vaiTro === 'admin' ? 'Quản Trị Viên (Admin)' : vaiTro === 'librarian' ? 'Thủ Thư (Librarian)' : 'NV Đơn Hàng (Staff)'}
              </span>
            </div>
          </div>

          {/* Danh Sách Mục Menu Theo Vai Trò (RBAC) */}
          <nav className="flex flex-col gap-1">
            {laAdmin && (
              <NavLink
                to="/admin/dashboard"
                className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-outline'}`}
                style={{ justifyContent: 'flex-start', padding: '0.625rem 0.85rem', width: '100%' }}
              >
                <BarChart3 size={18} />
                <span>Thống Kê Doanh Thu</span>
              </NavLink>
            )}

            {laThuThu && (
              <>
                <NavLink
                  to="/admin/books"
                  className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-outline'}`}
                  style={{ justifyContent: 'flex-start', padding: '0.625rem 0.85rem', width: '100%' }}
                >
                  <BookOpen size={18} />
                  <span>Quản Lý Sách & Danh Mục</span>
                </NavLink>

                <NavLink
                  to="/admin/inventory"
                  className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-outline'}`}
                  style={{ justifyContent: 'flex-start', padding: '0.625rem 0.85rem', width: '100%' }}
                >
                  <Boxes size={18} />
                  <span>Nhập Kho & Tồn Kho</span>
                </NavLink>
              </>
            )}

            {laNhanVienDon && (
              <NavLink
                to="/admin/orders"
                className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-outline'}`}
                style={{ justifyContent: 'flex-start', padding: '0.625rem 0.85rem', width: '100%' }}
              >
                <ClipboardList size={18} />
                <span>Xử Lý Đơn Hàng</span>
              </NavLink>
            )}

            {laAdmin && (
              <NavLink
                to="/admin/users"
                className={({ isActive }) => `btn ${isActive ? 'btn-primary' : 'btn-outline'}`}
                style={{ justifyContent: 'flex-start', padding: '0.625rem 0.85rem', width: '100%' }}
              >
                <Users size={18} />
                <span>Quản Lý Nhân Sự</span>
              </NavLink>
            )}
          </nav>
        </div>

        {/* Khối Tiện Ích Dưới Sidebar */}
        <div className="flex flex-col gap-2 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
          <Link
            to="/"
            className="btn btn-outline btn-sm"
            style={{ justifyContent: 'flex-start' }}
          >
            <Home size={16} />
            <span>Về Nhà Sách Storefront</span>
          </Link>

          <div className="flex items-center justify-between gap-2 mt-2">
            <button
              onClick={toggleTheme}
              className="btn btn-outline btn-sm flex-1"
              style={{ justifyContent: 'center' }}
            >
              {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
              <span style={{ fontSize: '0.8rem' }}>{theme === 'light' ? 'Tối Dịu' : 'Trắng Ngà'}</span>
            </button>

            <button
              onClick={handleDangXuat}
              className="btn btn-outline btn-sm"
              style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Nội Dung Các Trang Con Back-Office */}
      <main style={{ flex: 1, padding: '2rem', overflowY: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
