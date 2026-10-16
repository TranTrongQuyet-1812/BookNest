import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useCartStore from '../stores/cartStore';
import LogoBookNest from '../components/LogoBookNest';
import { 
  Eye, 
  EyeOff 
} from 'lucide-react';
import { ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';

// choNhanVien = true: cổng đăng nhập của nhân viên (/admin/login), còn lại là cổng khách hàng (/login)
export const DangNhap = ({ choNhanVien = false }) => {
  const { dangNhap, dangNhapNhanVien } = useAuth();
  const { dongBoGioHangGuestLenServer } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [hienMatKhau, setHienMatKhau] = useState(false);
  const [loi, setLoi] = useState('');
  const [dangXuLy, setDangXuLy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoi('');
    setDangXuLy(true);

    const laDuongDanNoiBoHopLe = (p) => typeof p === 'string' && p.startsWith('/') && !p.startsWith('//');

    try {
      if (choNhanVien) {
        await dangNhapNhanVien(email, matKhau);
        const fromState = location.state?.from;
        let duongDanAdminCu = '/admin';
        if (typeof fromState === 'string' && laDuongDanNoiBoHopLe(fromState)) {
          duongDanAdminCu = fromState;
        } else if (fromState?.pathname && laDuongDanNoiBoHopLe(fromState.pathname)) {
          duongDanAdminCu = fromState.pathname + (fromState.search || '') + (fromState.hash || '');
        }
        navigate(duongDanAdminCu);
      } else {
        await dangNhap(email, matKhau);
        // Tự động đồng bộ giỏ hàng khách vãng lai lên server nếu có
        await dongBoGioHangGuestLenServer();
        const fromState = location.state?.from;
        let duongDanCu = '/';
        if (typeof fromState === 'string' && laDuongDanNoiBoHopLe(fromState)) {
          duongDanCu = fromState;
        } else if (fromState?.pathname && laDuongDanNoiBoHopLe(fromState.pathname)) {
          duongDanCu = fromState.pathname + (fromState.search || '') + (fromState.hash || '');
        }
        navigate(duongDanCu);
      }
    } catch (err) {
      setLoi(loiTuApi(err, 'Đăng nhập không thành công. Vui lòng kiểm tra lại'));
    } finally {
      setDangXuLy(false);
    }
  };



  return (
    <div className="container py-12 flex justify-center items-center" style={{ minHeight: 'calc(100vh - 220px)' }}>
      {/* Khung sách đôi Folio Split Card (Thiết kế Card Sang Trọng, Phân Tầng Rõ Nét) */}
      <div style={{
        maxWidth: '920px',
        width: '100%',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '24px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))'
      }}>
        {/* Cột Trái: Story & Brand Atmosphere */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '3rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          borderRight: '1px solid var(--border)'
        }}>
          <div>
            {/* Logo & Tên thương hiệu */}
            <div className="flex items-center gap-3 mb-8">
              <LogoBookNest height={44} />
              <span className="font-fleur" style={{
                fontSize: '2.5rem',
                color: 'var(--text-main)',
                lineHeight: 1
              }}>
                BookNest
              </span>
            </div>

            {/* Đoạn tản văn & Danh ngôn */}
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
              fontStyle: 'italic',
              lineHeight: 1.6,
              color: 'var(--text-main)',
              marginBottom: '0.75rem'
            }}>
              "Một cuốn sách thực sự tốt sẽ dạy cho ta điều gì đó mới mẻ mỗi lần ta đọc lại nó."
            </p>
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              marginBottom: '2rem',
              fontWeight: 500
            }}>
              — Ralph Waldo Emerson
            </p>

            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              lineHeight: 1.7,
              marginBottom: '2rem'
            }}>
              Chào mừng bạn trở về với BookNest. Nơi tách cà phê thơm dịu và những trang sách đang kiên nhẫn chờ người lật mở.
            </p>
          </div>

          {/* 3 Cam kết - Phong cách Typography tối giản không lạm dụng icon */}
          <div style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.65rem',
            fontSize: '0.825rem',
            color: 'var(--text-muted)'
          }}>
            <div>• 100% Sách Thật & Tuyển Chọn Tinh Tế</div>
            <div>• Giao Hàng Nhanh Chóng & Bọc Sách Cẩn Trọng</div>
            <div>• Độc Giả Xác Thực & Đánh Giá Khách Quan</div>
          </div>
        </div>

        {/* Cột Phải: Biểu Mẫu Đăng Nhập */}
        <div style={{
          padding: '3rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
              {choNhanVien ? 'Đăng Nhập Nhân Viên' : 'Đăng Nhập'}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.35rem' }}>
              {choNhanVien ? 'Dành cho thủ thư, thủ kho và quản trị viên của BookNest' : 'Nhập email và mật khẩu để tiếp tục hành trình đọc sách'}
            </p>
          </div>

          {loi && (
            <div className="mb-4">
              <ThongBaoTaiCho loai="loi" onDong={() => setLoi('')}>
                {loi}
              </ThongBaoTaiCho>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Trường Email - Tối giản không icon thừa */}
            <div className="form-group mb-4">
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Địa chỉ Email
              </label>
              <input
                type="email"
                required
                className="form-input"
                placeholder="nhap.email@vidu.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Trường Mật khẩu - Giữ duy nhất nút mắt toggle */}
            <div className="form-group mb-5">
              <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                Mật khẩu
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={hienMatKhau ? 'text' : 'password'}
                  required
                  className="form-input"
                  style={{ paddingRight: '40px' }}
                  placeholder="••••••••"
                  value={matKhau}
                  onChange={(e) => setMatKhau(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setHienMatKhau(!hienMatKhau)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: 'var(--text-muted)',
                    padding: '4px'
                  }}
                  title={hienMatKhau ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {hienMatKhau ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {!choNhanVien && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                  <Link
                    to="/forgot-password"
                    className="link-quen-mat-khau"
                  >
                    Quên mật khẩu?
                  </Link>
                </div>
              )}
            </div>

            {/* Nút bấm Submit */}
            <button
              type="submit"
              disabled={dangXuLy}
              className="btn btn-primary w-full"
              style={{
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                textAlign: 'center'
              }}
            >
              {dangXuLy ? 'Đang xác thực thông tin...' : 'Đăng Nhập'}
            </button>
          </form>



          {/* Link sang trang Đăng Ký */}
          <div style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.875rem',
            color: 'var(--text-muted)'
          }}>
            {choNhanVien ? 'Bạn là khách hàng?' : 'Bạn chưa có tài khoản?'}{' '}
            <Link 
              to={choNhanVien ? `${import.meta.env.VITE_STOREFRONT_URL || 'http://localhost:3000'}/login` : '/register'}
              state={choNhanVien ? undefined : location.state}
              className="link-accent"
            >
              {choNhanVien ? 'Đăng nhập khách hàng' : 'Đăng ký tài khoản mới'}
            </Link>
            {!choNhanVien && (
              <div style={{ marginTop: '0.5rem' }}>
                Bạn là nhân viên?{' '}
                <a 
                  href={`${import.meta.env.VITE_BACKOFFICE_URL || 'http://localhost:5174'}/admin/login`} 
                  className="link-accent"
                >
                  Đăng nhập nhân viên
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DangNhap;
