import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react';

export const DangKy = () => {
  const { dangKy } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    hoTen: '',
    email: '',
    matKhau: '',
    xacNhanMatKhau: '',
    soDienThoai: '',
    diaChi: ''
  });

  const [loi, setLoi] = useState('');
  const [thanhCong, setThanhCong] = useState(false);
  const [dangXuLy, setDangXuLy] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoi('');

    if (form.matKhau !== form.xacNhanMatKhau) {
      return setLoi('Mật khẩu xác nhận không khớp');
    }

    setDangXuLy(true);
    try {
      await dangKy({
        hoTen: form.hoTen,
        email: form.email,
        matKhau: form.matKhau,
        soDienThoai: form.soDienThoai || undefined,
        diaChi: form.diaChi || undefined
      });

      setThanhCong(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setLoi(err.response?.data?.thongDiep || 'Đăng ký tài khoản không thành công');
    } finally {
      setDangXuLy(false);
    }
  };

  return (
    <div className="container py-12 flex justify-center">
      <div className="card" style={{ maxWidth: '520px', width: '100%', padding: '2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <h2 className="font-serif" style={{ fontSize: '1.5rem', fontWeight: 700 }}>Đăng Ký Tài Khoản</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Trở thành bạn đọc của BookNest để mua sách và nhận nhiều ưu đãi
          </p>
        </div>

        {loi && (
          <div className="alert alert-danger">
            <AlertCircle size={18} />
            <span>{loi}</span>
          </div>
        )}

        {thanhCong && (
          <div className="alert alert-success">
            <CheckCircle2 size={18} />
            <span>Đăng ký thành công! Đang chuyển hướng sang trang đăng nhập...</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Họ và tên *</label>
            <input
              type="text"
              name="hoTen"
              required
              className="form-input"
              placeholder="Nguyễn Văn A"
              value={form.hoTen}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Email *</label>
            <input
              type="email"
              name="email"
              required
              className="form-input"
              placeholder="nguyenvana@gmail.com"
              value={form.email}
              onChange={handleChange}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="form-group">
              <label className="form-label">Mật khẩu *</label>
              <input
                type="password"
                name="matKhau"
                required
                className="form-input"
                placeholder="Ít nhất 6 ký tự"
                value={form.matKhau}
                onChange={handleChange}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu *</label>
              <input
                type="password"
                name="xacNhanMatKhau"
                required
                className="form-input"
                placeholder="••••••••"
                value={form.xacNhanMatKhau}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Số điện thoại nhận hàng</label>
            <input
              type="tel"
              name="soDienThoai"
              className="form-input"
              placeholder="0912345678"
              value={form.soDienThoai}
              onChange={handleChange}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Địa chỉ nhận hàng</label>
            <input
              type="text"
              name="diaChi"
              className="form-input"
              placeholder="Số nhà, tên đường, phường/xã, TP..."
              value={form.diaChi}
              onChange={handleChange}
            />
          </div>

          <button
            type="submit"
            disabled={dangXuLy || thanhCong}
            className="btn btn-primary w-full mt-4"
            style={{ padding: '0.75rem' }}
          >
            <UserPlus size={18} />
            {dangXuLy ? 'Đang khởi tạo tài khoản...' : 'Tạo Tài Khoản'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          Đã có tài khoản?{' '}
          <Link to="/login" style={{ color: 'var(--primary)', fontWeight: 600 }}>
            Đăng nhập ngay
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DangKy;
