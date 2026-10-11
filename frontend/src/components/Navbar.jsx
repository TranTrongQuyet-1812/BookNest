import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { 
  BookOpen, 
  ShoppingCart, 
  User, 
  Sun, 
  Moon, 
  LogOut, 
  Package, 
  ShieldCheck, 
  Menu, 
  X 
} from 'lucide-react';

export const Navbar = () => {
  const { user, daDangNhap, dangXuat, theme, toggleTheme } = useAuth();
  const navigate = useNavigate();
  const [soLuongGio, setSoLuongGio] = useState(0);
  const [menuMo, setMenuMo] = useState(false);

  // Tải số lượng mặt hàng trong giỏ nếu đã đăng nhập và là khách hàng
  useEffect(() => {
    const isCustomer = user?.role === 'customer' || user?.vaiTro === 'customer';
    if (daDangNhap && isCustomer) {
      const laySoLuongGio = async () => {
        try {
          const res = await api.get('/cart');
          const cartData = res.data.data;
          const tongSo = cartData?.tongSoLuong ?? (cartData?.cacMon || []).reduce(
            (sum, item) => sum + (item.soLuong || 0), 
            0
          );
          setSoLuongGio(tongSo);
        } catch {
          // Bỏ qua lỗi giỏ hàng ở navbar
        }
      };
      laySoLuongGio();

      // Lắng nghe cập nhật giỏ hàng từ trang khác
      const handleCapNhatGio = () => laySoLuongGio();
      window.addEventListener('booknest_cart_updated', handleCapNhatGio);
      return () => window.removeEventListener('booknest_cart_updated', handleCapNhatGio);
    } else {
      setSoLuongGio(0);
    }
  }, [daDangNhap, user]);

  const handleDangXuat = () => {
    dangXuat();
    navigate('/login');
  };

  const laNhanSu = user && ['admin', 'librarian', 'order_staff'].includes(user.role);

  return (
    <header style={{
      backgroundColor: 'var(--bg-card)',
      borderBottom: '1px solid var(--border)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      transition: 'all 0.2s ease'
    }}>
      <div className="container flex items-center justify-between py-3">
        {/* Logo & Tên dự án */}
        <Link to="/" className="flex items-center gap-2">
          <div style={{
            backgroundColor: 'var(--primary)',
            color: 'var(--primary-text)',
            padding: '6px',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <BookOpen size={20} />
          </div>
          <span className="font-serif" style={{
            fontSize: '1.35rem',
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: 'var(--text-main)'
          }}>
            Book<span style={{ color: 'var(--primary)' }}>Nest</span>
          </span>
        </Link>

        {/* Menu Điều Hướng Trung Tâm */}
        <nav className="flex items-center gap-6" style={{ display: 'none', mdDisplay: 'flex' }}>
          <Link to="/" style={{ fontWeight: 500, color: 'var(--text-main)' }}>
            Trang Chủ
          </Link>
          <Link to="/books" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>
            Kho Sách
          </Link>
          {laNhanSu && (
            <Link 
              to="/admin" 
              className="badge badge-role"
              style={{ padding: '0.35rem 0.75rem', gap: '0.4rem', color: 'var(--primary)' }}
            >
              <ShieldCheck size={14} />
              Quản Trị Hệ Thống
            </Link>
          )}
        </nav>

        {/* Khối Tiện Ích Bên Phải */}
        <div className="flex items-center gap-3">
          {/* Nút Đổi Theme */}
          <button
            onClick={toggleTheme}
            className="btn btn-outline btn-icon"
            title={theme === 'light' ? 'Chuyển sang chế độ Tối dịu' : 'Chuyển sang chế độ Giấy ngà'}
            aria-label="Đổi giao diện"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
          </button>

          {/* Giỏ Hàng (Dành cho khách hàng) */}
          {(!user || user.role === 'customer') && (
            <Link
              to="/cart"
              className="btn btn-outline"
              style={{ position: 'relative', padding: '0.5rem 0.85rem' }}
              title="Xem giỏ hàng"
            >
              <ShoppingCart size={18} />
              <span style={{ marginLeft: '4px', fontSize: '0.85rem' }}>Giỏ hàng</span>
              {soLuongGio > 0 && (
                <span style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-text)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '999px',
                  padding: '1px 6px',
                  minWidth: '18px',
                  textAlign: 'center'
                }}>
                  {soLuongGio}
                </span>
              )}
            </Link>
          )}

          {/* Trạng Thái Người Dùng */}
          {daDangNhap ? (
            <div className="flex items-center gap-2">
              <Link 
                to="/profile" 
                className="btn btn-outline"
                style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
              >
                <User size={16} />
                <span>{user.fullName}</span>
              </Link>
              
              <Link
                to="/orders"
                className="btn btn-outline"
                style={{ padding: '0.45rem 0.65rem' }}
                title="Đơn hàng của tôi"
              >
                <Package size={16} />
              </Link>

              <button
                onClick={handleDangXuat}
                className="btn btn-outline"
                style={{ padding: '0.45rem 0.65rem', color: 'var(--danger)' }}
                title="Đăng xuất"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login" className="btn btn-outline btn-sm">
                Đăng Nhập
              </Link>
              <Link to="/register" className="btn btn-primary btn-sm">
                Đăng Ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
