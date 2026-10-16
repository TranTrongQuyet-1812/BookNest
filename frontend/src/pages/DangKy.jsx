import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LogoBookNest from '../components/LogoBookNest';
import { 
  Eye, 
  EyeOff, 
  AlertCircle, 
  CheckCircle2 
} from 'lucide-react';
import { ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';

export const DangKy = () => {
  const { dangKy } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    hoTen: '',
    email: '',
    matKhau: '',
    xacNhanMatKhau: '',
    soDienThoai: '',
    diaChi: ''
  });

  const [hienMatKhau, setHienMatKhau] = useState(false);
  const [hienXacNhanMatKhau, setHienXacNhanMatKhau] = useState(false);
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
      return setLoi('Mật khẩu xác nhận không trùng khớp');
    }

    setDangXuLy(true);
    try {
      await dangKy({
        hoTen: form.hoTen,
        email: form.email,
        matKhau: form.matKhau,
        soDienThoai: form.soDienThoai || undefined,
        diaChiMacDinh: form.diaChi || undefined
      });

      setThanhCong(true);
      setTimeout(() => {
        navigate('/login', { state: location.state });
      }, 1800);
    } catch (err) {
      setLoi(loiTuApi(err, 'Đăng ký tài khoản không thành công. Vui lòng kiểm tra lại'));
    } finally {
      setDangXuLy(false);
    }
  };

  return (
    <div className="container py-12 flex justify-center items-center" style={{ minHeight: 'calc(100vh - 220px)' }}>
      {/* Khung sách đôi Folio Split Card (Thiết kế Card Sang Trọng, Phân Tầng Rõ Nét) */}
      <div style={{
        maxWidth: '980px',
        width: '100%',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '24px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))'
      }}>
        {/* Cột Trái: Story & Reader Privileges */}
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

            {/* Danh ngôn văn học */}
            <p style={{
              fontFamily: 'var(--font-serif)',
              fontSize: '1.25rem',
              fontStyle: 'italic',
              lineHeight: 1.6,
              color: 'var(--text-main)',
              marginBottom: '0.75rem'
            }}>
              "Việc đọc sách đối với tâm trí cũng như việc tập thể dục đối với cơ thể."
            </p>
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              marginBottom: '2rem',
              fontWeight: 500
            }}>
              — Joseph Addison
            </p>

            <p style={{
              fontSize: '0.9rem',
              color: 'var(--text-muted)',
              lineHeight: 1.7,
              marginBottom: '2rem'
            }}>
              Gia nhập cộng đồng bạn đọc BookNest để lưu giữ hương thơm trang giấy, xây dựng tủ sách yêu thích và tận hưởng những đặc quyền riêng biệt.
            </p>
          </div>

          {/* 3 Đặc quyền bạn đọc - Tối giản không icon rườm rà */}
          <div style={{
            borderTop: '1px solid var(--border)',
            paddingTop: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.85rem',
            fontSize: '0.825rem',
            color: 'var(--text-muted)'
          }}>
            <div>
              <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '2px' }}>
                • Kho Sách Tuyển Chọn Đa Dạng
              </strong>
              <span>Tiếp cận hàng ngàn tác phẩm nguyên bản được chọn lọc kỹ càng.</span>
            </div>
            <div>
              <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '2px' }}>
                • Huy Hiệu Verified Buyer
              </strong>
              <span>Nhận xét và chấm điểm sách với tư cách người mua thật sau khi nhận hàng.</span>
            </div>
            <div>
              <strong style={{ color: 'var(--text-main)', display: 'block', marginBottom: '2px' }}>
                • Theo Dõi Đơn Hàng Mạch Lạc
              </strong>
              <span>Cập nhật tiến trình đóng gói và giao vận chi tiết từng bước.</span>
            </div>
          </div>
        </div>

        {/* Cột Phải: Biểu Mẫu Đăng Ký */}
        <div style={{
          padding: '3rem 2.5rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center'
        }}>
          <div style={{ marginBottom: '1.75rem' }}>
            <h2 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Đăng Ký Tài Khoản
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.35rem' }}>
              Điền thông tin bên dưới để khởi tạo tài khoản độc giả mới
            </p>
          </div>

          {loi && (
            <div className="mb-4">
              <ThongBaoTaiCho loai="loi" onDong={() => setLoi('')}>
                {loi}
              </ThongBaoTaiCho>
            </div>
          )}

          {thanhCong && (
            <div className="mb-4">
              <ThongBaoTaiCho loai="thanhCong">
                Đăng ký thành công! Đang chuyển hướng bạn tới trang đăng nhập...
              </ThongBaoTaiCho>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Dòng 1: Họ tên & Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                  Họ và tên *
                </label>
                <input
                  type="text"
                  name="hoTen"
                  required
                  className="form-input"
                  style={{ fontSize: '0.9rem' }}
                  placeholder="Nguyễn Văn A"
                  value={form.hoTen}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                  Email *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className="form-input"
                  style={{ fontSize: '0.9rem' }}
                  placeholder="nguyenvana@gmail.com"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Dòng 2: Mật khẩu & Xác nhận mật khẩu */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                  Mật khẩu *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={hienMatKhau ? 'text' : 'password'}
                    name="matKhau"
                    required
                    className="form-input"
                    style={{ paddingRight: '36px', fontSize: '0.9rem' }}
                    placeholder="Tối thiểu 8 ký tự, có chữ và số"
                    value={form.matKhau}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setHienMatKhau(!hienMatKhau)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      padding: '2px'
                    }}
                    title={hienMatKhau ? 'Ẩn' : 'Hiện'}
                  >
                    {hienMatKhau ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                  Xác nhận mật khẩu *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={hienXacNhanMatKhau ? 'text' : 'password'}
                    name="xacNhanMatKhau"
                    required
                    className="form-input"
                    style={{ paddingRight: '36px', fontSize: '0.9rem' }}
                    placeholder="Nhập lại mật khẩu"
                    value={form.xacNhanMatKhau}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setHienXacNhanMatKhau(!hienXacNhanMatKhau)}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      padding: '2px'
                    }}
                    title={hienXacNhanMatKhau ? 'Ẩn' : 'Hiện'}
                  >
                    {hienXacNhanMatKhau ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Dòng 3: Số điện thoại & Địa chỉ nhận hàng */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                  Số điện thoại nhận hàng
                </label>
                <input
                  type="tel"
                  name="soDienThoai"
                  className="form-input"
                  style={{ fontSize: '0.9rem' }}
                  placeholder="0912345678"
                  value={form.soDienThoai}
                  onChange={handleChange}
                />
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontSize: '0.825rem', fontWeight: 600 }}>
                  Địa chỉ giao sách mặc định
                </label>
                <input
                  type="text"
                  name="diaChi"
                  className="form-input"
                  style={{ fontSize: '0.9rem' }}
                  placeholder="Số nhà, tên đường, tỉnh..."
                  value={form.diaChi}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Nút Submit */}
            <button
              type="submit"
              disabled={dangXuLy || thanhCong}
              className="btn btn-primary w-full"
              style={{
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                textAlign: 'center'
              }}
            >
              {dangXuLy ? 'Đang khởi tạo tài khoản...' : 'Tạo Tài Khoản'}
            </button>

            <p style={{
              fontSize: '0.78rem',
              color: 'var(--text-sub)',
              textAlign: 'center',
              marginTop: '0.9rem',
              lineHeight: 1.5
            }}>
              Bằng việc đăng ký tài khoản, bạn đồng ý với{' '}
              <Link to="/dieu-khoan" target="_blank" style={{ color: 'var(--text-muted)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                Điều khoản dịch vụ
              </Link>{' '}
              và{' '}
              <Link to="/chinh-sach-bao-mat" target="_blank" style={{ color: 'var(--text-muted)', textDecoration: 'underline', textUnderlineOffset: '2px' }}>
                Chính sách bảo mật
              </Link>{' '}
              của BookNest.
            </p>
          </form>

          {/* Link chuyển sang Đăng Nhập */}
          <div style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            fontSize: '0.875rem',
            color: 'var(--text-muted)'
          }}>
            Bạn đã có tài khoản BookNest?{' '}
            <Link 
              to="/login" 
              state={location.state}
              className="link-accent"
            >
              Đăng nhập ngay
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DangKy;
