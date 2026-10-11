import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, LogIn, AlertCircle, Key, UserCheck } from 'lucide-react';

export const DangNhap = () => {
  const { dangNhap } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [loi, setLoi] = useState('');
  const [dangXuLy, setDangXuLy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoi('');
    setDangXuLy(true);

    try {
      const user = await dangNhap(email, matKhau);
      // Điều hướng tương ứng vai trò
      if (['admin', 'librarian', 'order_staff'].includes(user.role)) {
        navigate('/admin');
      } else {
        const duongDanCu = location.state?.from?.pathname || '/';
        navigate(duongDanCu);
      }
    } catch (err) {
      setLoi(err.response?.data?.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại');
    } finally {
      setDangXuLy(false);
    }
  };

  // Nút bấm điền nhanh tài khoản demo phục vụ chấm điểm đồ án
  const dienTaiKhoanDemo = (emailDemo) => {
    setEmail(emailDemo);
    setMatKhau('BookNest@123');
    setLoi('');
  };

  return (
    <div className="container py-12 flex justify-center">
      <div className="card" style={{ maxWidth: '460px', width: '100%', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '10px',
            backgroundColor: 'var(--primary)',
            color: 'var(--primary-text)',
            borderRadius: '12px',
            marginBottom: '0.75rem'
          }}>
            <BookOpen size={28} />
          </div>
          <h2 className="font-serif" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Đăng Nhập BookNest</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Truy cập hệ thống quản lý & mua sách trực tuyến
          </p>
        </div>

        {loi && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
            <span>{loi}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Địa chỉ Email</label>
            <input
              type="email"
              required
              className="form-input"
              placeholder="nhap.email@vidu.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Mật khẩu</label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={matKhau}
              onChange={(e) => setMatKhau(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={dangXuLy}
            className="btn btn-primary w-full mt-4"
            style={{ padding: '0.75rem' }}
          >
            <LogIn size={18} />
            {dangXuLy ? 'Đang xác thực...' : 'Đăng Nhập'}
          </button>
        </form>

        {/* Điền nhanh tài khoản demo */}
        <div style={{
          marginTop: '1.5rem',
          paddingTop: '1.25rem',
          borderTop: '1px solid var(--border)'
        }}>
          <div className="flex items-center gap-1 mb-2" style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            <UserCheck size={14} />
            <span>ĐIỀN NHANH TÀI KHOẢN DEMO (PASS: BookNest@123):</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => dienTaiKhoanDemo('admin@booknest.vn')}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.78rem' }}
            >
              Quản Trị (Admin)
            </button>
            <button
              type="button"
              onClick={() => dienTaiKhoanDemo('thuthu@booknest.vn')}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.78rem' }}
            >
              Thủ Thư (Librarian)
            </button>
            <button
              type="button"
              onClick={() => dienTaiKhoanDemo('nhanvien@booknest.vn')}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.78rem' }}
            >
              NV Đơn (Staff)
            </button>
            <button
              type="button"
              onClick={() => dienTaiKhoanDemo('khachhang@booknest.vn')}
              className="btn btn-outline btn-sm"
              style={{ fontSize: '0.78rem' }}
            >
              Khách (Customer)
            </button>
          </div>
        </div>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Chưa có tài khoản?{' '}
          <Link to="/register" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Đăng ký tài khoản mới
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DangNhap;
