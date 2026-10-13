import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import LogoBookNest from '../components/LogoBookNest';
import { 
  KeyRound, 
  Mail, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  RefreshCw,
  ShieldCheck
} from 'lucide-react';

export const QuenMatKhau = () => {
  const navigate = useNavigate();

  // Trạng thái bước thực hiện: 1 = Nhập email, 2 = Nhập mã OTP và mật khẩu mới
  const [buoc, setBuoc] = useState(1);
  const [email, setEmail] = useState('');
  const [maOtp, setMaOtp] = useState('');
  const [matKhauMoi, setMatKhauMoi] = useState('');
  const [nhapLaiMatKhau, setNhapLaiMatKhau] = useState('');
  const [hienMatKhau, setHienMatKhau] = useState(false);

  // Trạng thái xử lý và thông báo
  const [dangXuLy, setDangXuLy] = useState(false);
  const [loi, setLoi] = useState('');
  const [thongBaoThanhCong, setThongBaoThanhCong] = useState('');

  // Đếm ngược gửi lại mã OTP (60s)
  const [demNguoc, setDemNguoc] = useState(0);

  useEffect(() => {
    let timer;
    if (demNguoc > 0) {
      timer = setTimeout(() => setDemNguoc(demNguoc - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [demNguoc]);

  // Bước 1: Yêu cầu gửi mã OTP về email
  const handleGuiMa = async (e) => {
    e.preventDefault();
    setLoi('');
    setThongBaoThanhCong('');
    setDangXuLy(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setThongBaoThanhCong(res.data?.message || 'Mã xác thực đã được gửi tới email của bạn.');
      setBuoc(2);
      setDemNguoc(60);
    } catch (err) {
      setLoi(err.response?.data?.message || 'Không thể gửi mã xác nhận. Vui lòng thử lại sau.');
    } finally {
      setDangXuLy(false);
    }
  };

  // Gửi lại mã OTP
  const handleGuiLaiMa = async () => {
    if (demNguoc > 0 || dangXuLy) return;
    setLoi('');
    setDangXuLy(true);

    try {
      const res = await api.post('/auth/forgot-password', { email });
      setThongBaoThanhCong(res.data?.message || 'Mã xác thực mới đã được gửi tới email của bạn.');
      setDemNguoc(60);
    } catch (err) {
      setLoi(err.response?.data?.message || 'Không thể gửi lại mã xác nhận.');
    } finally {
      setDangXuLy(false);
    }
  };

  // Bước 2: Xác nhận OTP và đặt lại mật khẩu mới
  const handleDatLaiMatKhau = async (e) => {
    e.preventDefault();
    setLoi('');
    setThongBaoThanhCong('');

    if (maOtp.trim().length !== 6) {
      return setLoi('Mã xác nhận phải gồm đúng 6 chữ số.');
    }

    if (matKhauMoi.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d)/.test(matKhauMoi)) {
      return setLoi('Mật khẩu mới phải có tối thiểu 8 ký tự, bao gồm ít nhất một chữ cái và một chữ số.');
    }

    if (matKhauMoi !== nhapLaiMatKhau) {
      return setLoi('Mật khẩu nhập lại không khớp.');
    }

    setDangXuLy(true);

    try {
      const res = await api.post('/auth/reset-password', {
        email,
        maOtp: maOtp.trim(),
        matKhauMoi
      });

      setThongBaoThanhCong(res.data?.message || 'Đặt lại mật khẩu thành công! Đang chuyển hướng sang Đăng nhập...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setLoi(err.response?.data?.message || 'Đặt lại mật khẩu không thành công. Vui lòng kiểm tra lại mã xác nhận.');
    } finally {
      setDangXuLy(false);
    }
  };

  return (
    <div style={{
      minHeight: '85vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2.5rem 1rem'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        backgroundColor: 'var(--card-bg, #FFFFFF)',
        border: '1px solid var(--border, #E2E8F0)',
        borderRadius: '16px',
        boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
        padding: '2.5rem 2.25rem',
        position: 'relative'
      }}>
        {/* Nút quay lại đăng nhập */}
        <Link
          to="/login"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.85rem',
            color: 'var(--text-muted, #64748B)',
            textDecoration: 'none',
            marginBottom: '1.5rem',
            fontWeight: 500,
            transition: 'color 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main, #0F172A)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted, #64748B)'}
        >
          <ArrowLeft size={16} />
          <span>Quay lại Đăng nhập</span>
        </Link>

        {/* Tiêu đề & Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <LogoBookNest height={36} />
          </div>
          <h1 className="font-serif" style={{
            fontSize: '1.65rem',
            fontWeight: 700,
            color: 'var(--text-main, #0F172A)',
            margin: '0.25rem 0 0.5rem'
          }}>
            {buoc === 1 ? 'Khôi Phục Mật Khẩu' : 'Đặt Lại Mật Khẩu Mới'}
          </h1>
          <p style={{
            color: 'var(--text-muted, #64748B)',
            fontSize: '0.875rem',
            lineHeight: 1.5,
            margin: 0
          }}>
            {buoc === 1 
              ? 'Nhập địa chỉ email tài khoản của bạn để nhận mã xác nhận OTP 6 chữ số.' 
              : `Nhập mã xác thực đã gửi tới email ${email} và thiết lập mật khẩu mới.`}
          </p>
        </div>

        {/* Cảnh báo lỗi */}
        {loi && (
          <div className="alert alert-danger mb-4" style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#B91C1C',
            fontSize: '0.875rem',
            marginBottom: '1.25rem'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{loi}</span>
          </div>
        )}

        {/* Thông báo thành công */}
        {thongBaoThanhCong && (
          <div className="alert alert-success mb-4" style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            backgroundColor: '#F0FDF4',
            border: '1px solid #86EFAC',
            color: '#15803D',
            fontSize: '0.875rem',
            marginBottom: '1.25rem'
          }}>
            <CheckCircle2 size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{thongBaoThanhCong}</span>
          </div>
        )}

        {/* ================= BƯỚC 1: NHẬP EMAIL ================= */}
        {buoc === 1 && (
          <form onSubmit={handleGuiMa}>
            <div className="form-group mb-4">
              <label className="form-label" style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-main, #1E293B)',
                marginBottom: '0.4rem'
              }}>
                Địa chỉ Email đã đăng ký
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  className="form-input"
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem 0.75rem 2.6rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border, #CBD5E1)',
                    backgroundColor: 'var(--bg-input, #FFFFFF)',
                    color: 'var(--text-main, #0F172A)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  placeholder="nhap.email@vidu.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Mail size={18} style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted, #94A3B8)'
                }} />
              </div>
            </div>

            <button
              type="submit"
              disabled={dangXuLy}
              className="btn btn-primary w-full"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                borderRadius: '8px',
                cursor: dangXuLy ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '1rem',
                transition: 'opacity 0.2s'
              }}
            >
              {dangXuLy ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Đang kiểm tra và gửi mã...</span>
                </>
              ) : (
                <>
                  <KeyRound size={18} />
                  <span>Gửi Mã Xác Thực OTP</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* ================= BƯỚC 2: NHẬP OTP VÀ ĐẶT LẠI MẬT KHẨU ================= */}
        {buoc === 2 && (
          <form onSubmit={handleDatLaiMatKhau}>
            {/* Trường mã OTP */}
            <div className="form-group mb-4">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="form-label" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-main, #1E293B)', margin: 0 }}>
                  Mã Xác Thực OTP (6 số)
                </label>
                <button
                  type="button"
                  onClick={handleGuiLaiMa}
                  disabled={demNguoc > 0 || dangXuLy}
                  className={demNguoc > 0 ? '' : 'link-quen-mat-khau'}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    fontSize: '0.8rem',
                    color: demNguoc > 0 ? 'var(--text-muted, #94A3B8)' : 'var(--link-accent, #92400E)',
                    cursor: demNguoc > 0 ? 'default' : 'pointer',
                    fontWeight: 600
                  }}
                >
                  {demNguoc > 0 ? `Gửi lại sau ${demNguoc}s` : 'Gửi lại mã'}
                </button>
              </div>

              <input
                type="text"
                required
                maxLength={6}
                pattern="[0-9]{6}"
                className="form-input text-center"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border, #CBD5E1)',
                  backgroundColor: 'var(--bg-input, #FFFFFF)',
                  color: 'var(--text-main, #0F172A)',
                  fontSize: '1.35rem',
                  letterSpacing: '8px',
                  fontWeight: 800,
                  textAlign: 'center',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="000000"
                value={maOtp}
                onChange={(e) => setMaOtp(e.target.value.replace(/\D/g, ''))}
              />
            </div>

            {/* Mật khẩu mới */}
            <div className="form-group mb-4">
              <label className="form-label" style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-main, #1E293B)',
                marginBottom: '0.4rem'
              }}>
                Mật khẩu mới
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={hienMatKhau ? 'text' : 'password'}
                  required
                  className="form-input"
                  style={{
                    width: '100%',
                    padding: '0.75rem 2.6rem 0.75rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border, #CBD5E1)',
                    backgroundColor: 'var(--bg-input, #FFFFFF)',
                    color: 'var(--text-main, #0F172A)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                  placeholder="Tối thiểu 8 ký tự, có chữ và số"
                  value={matKhauMoi}
                  onChange={(e) => setMatKhauMoi(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setHienMatKhau(!hienMatKhau)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    color: 'var(--text-muted, #94A3B8)',
                    cursor: 'pointer'
                  }}
                >
                  {hienMatKhau ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Nhập lại mật khẩu mới */}
            <div className="form-group mb-5">
              <label className="form-label" style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-main, #1E293B)',
                marginBottom: '0.4rem'
              }}>
                Xác nhận mật khẩu mới
              </label>
              <input
                type={hienMatKhau ? 'text' : 'password'}
                required
                className="form-input"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border, #CBD5E1)',
                  backgroundColor: 'var(--bg-input, #FFFFFF)',
                  color: 'var(--text-main, #0F172A)',
                  fontSize: '0.9rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder="Nhập lại chính xác mật khẩu mới"
                value={nhapLaiMatKhau}
                onChange={(e) => setNhapLaiMatKhau(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={dangXuLy}
              className="btn btn-primary w-full"
              style={{
                width: '100%',
                padding: '0.85rem',
                fontSize: '0.95rem',
                fontWeight: 600,
                borderRadius: '8px',
                cursor: dangXuLy ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '1.25rem'
              }}
            >
              {dangXuLy ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Đang xử lý đổi mật khẩu...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Xác Nhận Đặt Lại Mật Khẩu</span>
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1.25rem' }}>
              <button
                type="button"
                onClick={() => { setBuoc(1); setLoi(''); setThongBaoThanhCong(''); }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted, #64748B)',
                  fontSize: '0.825rem',
                  cursor: 'pointer',
                  textDecoration: 'underline'
                }}
              >
                Nhập địa chỉ email khác
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default QuenMatKhau;
