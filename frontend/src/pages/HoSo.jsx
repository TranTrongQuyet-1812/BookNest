import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { User, Lock, Check, AlertCircle, Save, KeyRound } from 'lucide-react';
import { ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';

export const HoSo = () => {
  const { user, capNhatUser, capNhatToken } = useAuth();

  // State cập nhật thông tin
  const [formProfile, setFormProfile] = useState({
    hoTen: '',
    soDienThoai: '',
    diaChi: ''
  });
  const [thongBaoProfile, setThongBaoProfile] = useState('');
  const [loiProfile, setLoiProfile] = useState('');
  const [dangLuuProfile, setDangLuuProfile] = useState(false);

  // State đổi mật khẩu
  const [formPassword, setFormPassword] = useState({
    matKhauCu: '',
    matKhauMoi: '',
    xacNhanMatKhau: ''
  });
  const [thongBaoPass, setThongBaoPass] = useState('');
  const [loiPass, setLoiPass] = useState('');
  const [dangLuuPass, setDangLuuPass] = useState(false);

  // Tải hồ sơ từ server để điền sẵn form (thông tin đăng nhập chỉ có id, email, họ tên, vai trò)
  useEffect(() => {
    const taiHoSo = async () => {
      try {
        const res = await api.get('/users/profile');
        const hoSo = res.data.data;
        setFormProfile({
          hoTen: hoSo.HoTen,
          soDienThoai: hoSo.SoDienThoai || '',
          diaChi: hoSo.DiaChiMacDinh || ''
        });
      } catch {
        setLoiProfile('Không thể tải thông tin cá nhân');
      }
    };
    taiHoSo();
  }, []);

  const handleLuuProfile = async (e) => {
    e.preventDefault();
    setThongBaoProfile('');
    setLoiProfile('');
    setDangLuuProfile(true);

    try {
      const res = await api.put('/users/profile', {
        hoTen: formProfile.hoTen.trim(),
        soDienThoai: formProfile.soDienThoai ? formProfile.soDienThoai.trim() : null,
        diaChiMacDinh: formProfile.diaChi ? formProfile.diaChi.trim() : null
      });
      capNhatUser({ fullName: res.data.data.HoTen });
      setThongBaoProfile('Đã cập nhật thông tin cá nhân thành công!');
    } catch (err) {
      setLoiProfile(loiTuApi(err, 'Cập nhật thông tin thất bại'));
    } finally {
      setDangLuuProfile(false);
    }
  };

  const handleDoiMatKhau = async (e) => {
    e.preventDefault();
    setThongBaoPass('');
    setLoiPass('');

    if (formPassword.matKhauMoi !== formPassword.xacNhanMatKhau) {
      return setLoiPass('Mật khẩu mới và xác nhận mật khẩu không khớp');
    }

    setDangLuuPass(true);
    try {
      const res = await api.put('/users/change-password', {
        matKhauCu: formPassword.matKhauCu,
        matKhauMoi: formPassword.matKhauMoi
      });
      const tokenMoi = res.data?.data?.token;
      if (tokenMoi && capNhatToken) {
        capNhatToken(tokenMoi);
      }
      setThongBaoPass('Đổi mật khẩu thành công! Mật khẩu mới đã có hiệu lực');
      setFormPassword({ matKhauCu: '', matKhauMoi: '', xacNhanMatKhau: '' });
    } catch (err) {
      setLoiPass(loiTuApi(err, 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu cũ'));
    } finally {
      setDangLuuPass(false);
    }
  };

  return (
    <div className="container py-8" style={{ maxWidth: '860px' }}>
      <h1 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        Hồ Sơ Của Tôi
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Form Cập Nhật Thông Tin Cá Nhân */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <User size={20} style={{ color: 'var(--primary)' }} />
            <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
              Thông Tin Cá Nhân
            </h3>
          </div>

          <div className="mb-3" style={{ fontSize: '0.875rem' }}>
            <span style={{ color: 'var(--text-muted)' }}>Email: </span>
            <strong>{user?.email}</strong>
            <span className="badge badge-role" style={{ marginLeft: '8px' }}>{{ khach_hang: 'Khách hàng', quan_tri: 'Quản trị viên', thu_kho: 'Thủ kho', thu_thu: 'Thủ thư' }[user?.role] ?? user?.role}</span>
          </div>

          {thongBaoProfile && (
            <div className="mb-4">
              <ThongBaoTaiCho loai="thanhCong" onDong={() => setThongBaoProfile('')}>
                {thongBaoProfile}
              </ThongBaoTaiCho>
            </div>
          )}
          {loiProfile && (
            <div className="mb-4">
              <ThongBaoTaiCho loai="loi" onDong={() => setLoiProfile('')}>
                {loiProfile}
              </ThongBaoTaiCho>
            </div>
          )}

          <form onSubmit={handleLuuProfile}>
            <div className="form-group">
              <label className="form-label">Họ và tên</label>
              <input
                type="text"
                required
                className="form-input"
                value={formProfile.hoTen}
                onChange={(e) => setFormProfile({ ...formProfile, hoTen: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Số điện thoại</label>
              <input
                type="tel"
                className="form-input"
                value={formProfile.soDienThoai}
                onChange={(e) => setFormProfile({ ...formProfile, soDienThoai: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Địa chỉ giao hàng</label>
              <textarea
                rows="3"
                className="form-input"
                value={formProfile.diaChi}
                onChange={(e) => setFormProfile({ ...formProfile, diaChi: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={dangLuuProfile}
              className="btn btn-primary w-full mt-2"
            >
              <Save size={16} />
              {dangLuuProfile ? 'Đang lưu...' : 'Lưu Thay Đổi'}
            </button>
          </form>
        </div>

        {/* Form Đổi Mật Khẩu */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Lock size={20} style={{ color: 'var(--primary)' }} />
            <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
              Đổi Mật Khẩu
            </h3>
          </div>

          {thongBaoPass && (
            <div className="mb-4">
              <ThongBaoTaiCho loai="thanhCong" onDong={() => setThongBaoPass('')}>
                {thongBaoPass}
              </ThongBaoTaiCho>
            </div>
          )}
          {loiPass && (
            <div className="mb-4">
              <ThongBaoTaiCho loai="loi" onDong={() => setLoiPass('')}>
                {loiPass}
              </ThongBaoTaiCho>
            </div>
          )}

          <form onSubmit={handleDoiMatKhau}>
            <div className="form-group">
              <label className="form-label">Mật khẩu hiện tại</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={formPassword.matKhauCu}
                onChange={(e) => setFormPassword({ ...formPassword, matKhauCu: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Mật khẩu mới</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="Tối thiểu 8 ký tự (chữ & số)"
                value={formPassword.matKhauMoi}
                onChange={(e) => setFormPassword({ ...formPassword, matKhauMoi: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Xác nhận mật khẩu mới</label>
              <input
                type="password"
                required
                className="form-input"
                placeholder="••••••••"
                value={formPassword.xacNhanMatKhau}
                onChange={(e) => setFormPassword({ ...formPassword, xacNhanMatKhau: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={dangLuuPass}
              className="btn btn-outline w-full mt-2"
            >
              <KeyRound size={16} />
              {dangLuuPass ? 'Đang đổi mật khẩu...' : 'Cập Nhật Mật Khẩu'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default HoSo;
