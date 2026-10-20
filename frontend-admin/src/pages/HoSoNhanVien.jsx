import React, { useState, useEffect } from 'react';
import { User, Lock, KeyRound, Shield, CheckCircle2 } from 'lucide-react';
import api from '@booknest/shared/api';
import { useAuth } from '@booknest/shared/auth';
import { useThongBao, ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';

export default function HoSoNhanVien() {
  const { capNhatThongTinNguoiDung } = useAuth();
  const { thongBao: tb } = useThongBao();

  const [dangTai, setDangTai] = useState(true);
  const [dangLuuHoSo, setDangLuuHoSo] = useState(false);
  const [dangDoiMatKhau, setDangDoiMatKhau] = useState(false);
  const [loiHoSo, setLoiHoSo] = useState('');
  const [loiMatKhau, setLoiMatKhau] = useState('');

  // Form hồ sơ
  const [hoTen, setHoTen] = useState('');
  const [email, setEmail] = useState('');
  const [soDienThoai, setSoDienThoai] = useState('');
  const [vaiTro, setVaiTro] = useState('');

  // Form đổi mật khẩu
  const [matKhauCu, setMatKhauCu] = useState('');
  const [matKhauMoi, setMatKhauMoi] = useState('');
  const [xacNhanMatKhau, setXacNhanMatKhau] = useState('');

  // Nạp thông tin hồ sơ từ backend
  const napHoSo = async () => {
    setDangTai(true);
    setLoiHoSo('');
    try {
      const res = await api.get('/admin/profile');
      const duLieu = res.data.data;
      setHoTen(duLieu.HoTen || duLieu.fullName || '');
      setEmail(duLieu.Email || duLieu.email || '');
      setSoDienThoai(duLieu.SoDienThoai || '');
      setVaiTro(duLieu.VaiTro || duLieu.role || '');
    } catch (err) {
      setLoiHoSo(loiTuApi(err, 'Không thể tải thông tin hồ sơ'));
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    napHoSo();
  }, []);

  // Xử lý lưu hồ sơ
  const handleLuuHoSo = async (e) => {
    e.preventDefault();
    setDangLuuHoSo(true);
    setLoiHoSo('');
    try {
      const res = await api.put('/admin/profile', {
        hoTen: hoTen.trim(),
        soDienThoai: soDienThoai.trim() || undefined
      });
      tb.thanhCong('Cập nhật thông tin hồ sơ thành công');
      if (typeof capNhatThongTinNguoiDung === 'function') {
        capNhatThongTinNguoiDung({
          fullName: res.data.data.HoTen || hoTen.trim()
        });
      }
    } catch (err) {
      setLoiHoSo(loiTuApi(err, 'Lỗi khi cập nhật hồ sơ'));
    } finally {
      setDangLuuHoSo(false);
    }
  };

  // Xử lý đổi mật khẩu
  const handleDoiMatKhau = async (e) => {
    e.preventDefault();
    setLoiMatKhau('');

    if (matKhauMoi.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d)/.test(matKhauMoi)) {
      setLoiMatKhau('Mật khẩu mới phải có tối thiểu 8 ký tự và bao gồm cả chữ cái và chữ số');
      return;
    }

    if (matKhauMoi !== xacNhanMatKhau) {
      setLoiMatKhau('Xác nhận mật khẩu mới không trùng khớp');
      return;
    }

    setDangDoiMatKhau(true);
    try {
      const res = await api.put('/admin/change-password', {
        matKhauCu,
        matKhauMoi
      });
      // Nếu có token mới thì cập nhật vào localStorage
      if (res.data?.data?.token) {
        localStorage.setItem('booknest_token', res.data.data.token);
      }
      tb.thanhCong('Đổi mật khẩu thành công');
      setMatKhauCu('');
      setMatKhauMoi('');
      setXacNhanMatKhau('');
    } catch (err) {
      setLoiMatKhau(loiTuApi(err, 'Lỗi khi đổi mật khẩu'));
    } finally {
      setDangDoiMatKhau(false);
    }
  };

  const layTenVaiTro = (code) => {
    switch (code) {
      case 'quan_tri':
        return 'Quản Trị Viên';
      case 'thu_kho':
        return 'Thủ Kho';
      case 'thu_thu':
        return 'Thủ Thư';
      default:
        return code || 'Nhân Viên';
    }
  };

  if (dangTai) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px' }}>
        <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.9rem' }}>Đang nạp thông tin hồ sơ nhân viên...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <div className="mb-6">
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--adm-text-main)', letterSpacing: '-0.02em' }}>
          Hồ Sơ Nhân Viên & Đổi Mật Khẩu
        </h1>
        <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
          Quản lý thông tin định danh và bảo mật tài khoản cá nhân trong Back-Office
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Khối Cập Nhật Thông Tin Hồ Sơ */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--adm-border)', paddingBottom: '0.75rem' }}>
            <User size={18} style={{ color: 'var(--adm-primary)' }} />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--adm-text-main)' }}>
              Thông Tin Cá Nhân
            </h2>
          </div>

          {loiHoSo && (
            <ThongBaoTaiCho loai="loi" onDong={() => setLoiHoSo('')}>
              {loiHoSo}
            </ThongBaoTaiCho>
          )}

          <form onSubmit={handleLuuHoSo}>
            <div className="form-group mb-3">
              <label className="form-label">Email đăng nhập</label>
              <input
                type="text"
                disabled
                className="form-input w-full"
                value={email}
                style={{ backgroundColor: 'var(--adm-sidebar-bg)', color: 'var(--adm-text-muted)', cursor: 'not-allowed' }}
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>Email tài khoản nội bộ không thể thay đổi</span>
            </div>

            <div className="form-group mb-3">
              <label className="form-label">Vai trò nghiệp vụ</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span className="badge" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>
                  <Shield size={14} style={{ display: 'inline', marginRight: '4px' }} />
                  {layTenVaiTro(vaiTro)}
                </span>
              </div>
            </div>

            <div className="form-group mb-3">
              <label className="form-label">Họ và tên *</label>
              <input
                type="text"
                required
                className="form-input w-full"
                value={hoTen}
                onChange={(e) => setHoTen(e.target.value)}
              />
            </div>

            <div className="form-group mb-4">
              <label className="form-label">Số điện thoại liên hệ</label>
              <input
                type="tel"
                placeholder="0912345678"
                className="form-input w-full"
                value={soDienThoai}
                onChange={(e) => setSoDienThoai(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={dangLuuHoSo}
              className="btn btn-primary w-full"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
            >
              <CheckCircle2 size={16} />
              {dangLuuHoSo ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </form>
        </div>

        {/* Khối Đổi Mật Khẩu */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid var(--adm-border)', paddingBottom: '0.75rem' }}>
            <KeyRound size={18} style={{ color: 'var(--adm-primary)' }} />
            <h2 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--adm-text-main)' }}>
              Đổi Mật Khẩu
            </h2>
          </div>

          {loiMatKhau && (
            <ThongBaoTaiCho loai="loi" onDong={() => setLoiMatKhau('')}>
              {loiMatKhau}
            </ThongBaoTaiCho>
          )}

          <form onSubmit={handleDoiMatKhau}>
            <div className="form-group mb-3">
              <label className="form-label">Mật khẩu hiện tại *</label>
              <input
                type="password"
                required
                placeholder="Nhập mật khẩu hiện tại"
                className="form-input w-full"
                value={matKhauCu}
                onChange={(e) => setMatKhauCu(e.target.value)}
              />
            </div>

            <div className="form-group mb-3">
              <label className="form-label">Mật khẩu mới *</label>
              <input
                type="password"
                required
                placeholder="Tối thiểu 8 ký tự (chữ & số)"
                className="form-input w-full"
                value={matKhauMoi}
                onChange={(e) => setMatKhauMoi(e.target.value)}
              />
            </div>

            <div className="form-group mb-4">
              <label className="form-label">Xác nhận mật khẩu mới *</label>
              <input
                type="password"
                required
                placeholder="Nhập lại mật khẩu mới"
                className="form-input w-full"
                value={xacNhanMatKhau}
                onChange={(e) => setXacNhanMatKhau(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={dangDoiMatKhau}
              className="btn btn-outline w-full"
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.45rem' }}
            >
              <Lock size={16} />
              {dangDoiMatKhau ? 'Đang cập nhật...' : 'Cập Nhật Mật Khẩu'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
