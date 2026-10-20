import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@booknest/shared/auth';
import { ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';
import LogoBookNest from '../../../frontend/src/components/LogoBookNest.jsx';

// Chỉ nhận đường dẫn nội bộ của khu quản trị để quay lại sau khi đăng nhập, tránh bị dẫn sang trang ngoài
const laDuongDanNoiBoHopLe = (p) => typeof p === 'string' && p.startsWith('/') && !p.startsWith('//');

const layDuongDanQuayLai = (from) => {
  if (typeof from === 'string' && laDuongDanNoiBoHopLe(from)) return from;
  if (from?.pathname && laDuongDanNoiBoHopLe(from.pathname)) {
    return from.pathname + (from.search || '') + (from.hash || '');
  }
  return '/admin';
};

// Cổng đăng nhập riêng của khu quản trị (sẽ chạy trên tên miền riêng, sau lớp zero trust).
// Cố ý không có đăng ký, quên mật khẩu hay đường dẫn sang cửa hàng: tài khoản nhân sự do quản trị viên cấp và đặt lại.
export const DangNhapQuanTri = () => {
  const { dangNhapNhanVien } = useAuth();
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
    try {
      await dangNhapNhanVien(email, matKhau);
      navigate(layDuongDanQuayLai(location.state?.from));
    } catch (err) {
      setLoi(loiTuApi(err, 'Đăng nhập không thành công. Vui lòng kiểm tra lại.'));
    } finally {
      setDangXuLy(false);
    }
  };

  return (
    <main className="admindash-shell admindash-gate">
      <div className="admindash-gate-card">
        <div className="admindash-gate-brand">
          <LogoBookNest height={30} />
          <div>
            <div className="admindash-brand-name">BookNest</div>
            <div className="admindash-brand-sub">Quản trị</div>
          </div>
        </div>

        <h1 className="admindash-gate-title">Đăng nhập</h1>
        <p className="admindash-gate-desc">Dùng tài khoản nhân sự do quản trị viên cấp.</p>

        {loi && (
          <div style={{ marginBottom: '1rem' }}>
            <ThongBaoTaiCho loai="loi" onDong={() => setLoi('')}>
              {loi}
            </ThongBaoTaiCho>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="admindash-gate-field">
            <label className="form-label" htmlFor="dang-nhap-email">Email</label>
            <input
              id="dang-nhap-email"
              type="email"
              required
              autoFocus
              autoComplete="username"
              className="form-input"
              style={{ width: '100%' }}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="admindash-gate-field">
            <label className="form-label" htmlFor="dang-nhap-mat-khau">Mật khẩu</label>
            <div className="admindash-gate-password">
              <input
                id="dang-nhap-mat-khau"
                type={hienMatKhau ? 'text' : 'password'}
                required
                autoComplete="current-password"
                className="form-input"
                style={{ width: '100%' }}
                value={matKhau}
                onChange={(e) => setMatKhau(e.target.value)}
              />
              <button
                type="button"
                className="admindash-gate-toggle"
                onClick={() => setHienMatKhau((v) => !v)}
                aria-pressed={hienMatKhau}
              >
                {hienMatKhau ? 'Ẩn' : 'Hiện'}
              </button>
            </div>
          </div>

          <button type="submit" disabled={dangXuLy} className="btn btn-primary admindash-gate-submit">
            {dangXuLy ? 'Đang xác thực…' : 'Đăng nhập'}
          </button>
        </form>

        <p className="admindash-gate-note">Quên mật khẩu? Liên hệ quản trị viên để được đặt lại.</p>
      </div>
    </main>
  );
};

export default DangNhapQuanTri;
