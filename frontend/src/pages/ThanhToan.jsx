import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import useCartStore from '../stores/cartStore';
import { useAuth } from '../context/AuthContext';
import { 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  ShieldCheck, 
  BookOpen, 
  User, 
  Mail, 
  Phone, 
  Truck,
  Sparkles,
  Lock,
  QrCode,
  CreditCard
} from 'lucide-react';
import { KhungThanhToanVietQR } from '../components/KhungThanhToanVietQR';

export const ThanhToan = () => {
  const navigate = useNavigate();
  const { user, daDangNhap } = useAuth();
  const { gioHang, cacMon, layGioHang, xoaTrangState } = useCartStore();

  const [dangTai, setDangTai] = useState(true);
  const [dangDatHang, setDangDatHang] = useState(false);
  const [loi, setLoi] = useState('');
  // Đơn vừa đặt của khách vãng lai: khách không có trang xem đơn nên hiện kết quả ngay tại đây
  const [donVuaDat, setDonVuaDat] = useState(null);
  const [donVangLaiTam, setDonVangLaiTam] = useState(null);

  // Phương thức thanh toán: COD hoặc CHUYEN_KHOAN_QR
  const [phuongThucThanhToan, setPhuongThucThanhToan] = useState('COD');
  const [congQrKhaDung, setCongQrKhaDung] = useState(true);
  const [hienModalQR, setHienModalQR] = useState(false);
  const [duLieuQR, setDuLieuQR] = useState(null);

  // Form thông tin nhận hàng
  const [form, setForm] = useState({
    tenNguoiNhan: '',
    soDienThoaiNhan: '',
    email: '',
    diaChiGiaoHang: '',
    ghiChu: '',
    luuMacDinh: true
  });

  useEffect(() => {
    let daHuy = false;

    const taiDuLieu = async () => {
      try {
        // Tải giỏ hàng (tự động nhận diện Guest qua localStorage hoặc Customer qua API)
        await layGioHang();
        if (daHuy) return;

        // Nếu đã đăng nhập, tự động lấy thông tin từ hồ sơ người dùng để điền sẵn form
        if (daDangNhap) {
          try {
            const resHoSo = await api.get('/users/profile');
            if (daHuy) return;
            const hoSo = resHoSo.data?.data;
            if (hoSo) {
              setForm((formCu) => ({
                ...formCu,
                tenNguoiNhan: hoSo.HoTen || '',
                soDienThoaiNhan: hoSo.SoDienThoai || '',
                email: hoSo.Email || user?.email || '',
                diaChiGiaoHang: hoSo.DiaChiMacDinh || ''
              }));
            }
          } catch (errProfile) {
            console.warn('Không thể nạp hồ sơ người dùng, chuyển sang chế độ điền tay:', errProfile);
          }
        }
        // Kiểm tra trạng thái khả dụng của cổng thanh toán VietQR payOS
        try {
          const resCheck = await api.get('/payments/status-check');
          if (!daHuy && resCheck.data?.data) {
            setCongQrKhaDung(!!resCheck.data.data.khaDung);
          }
        } catch (errCheck) {
          console.warn('Không thể kiểm tra cổng QR, dùng mặc định:', errCheck);
        }
      } catch (errGio) {
        console.error('Lỗi tải giỏ hàng:', errGio);
        if (!daHuy) setLoi('Không thể tải thông tin giỏ hàng');
      } finally {
        if (!daHuy) setDangTai(false);
      }
    };

    taiDuLieu();
    return () => { daHuy = true; };
  }, [layGioHang, daDangNhap, user]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleDatHang = async (e) => {
    e.preventDefault();
    setLoi('');
    setDangDatHang(true);

    const danhSachMon = items;
    if (danhSachMon.length === 0) {
      setLoi('Giỏ hàng của bạn đang trống!');
      setDangDatHang(false);
      return;
    }

    try {
      if (daDangNhap) {
        // --- Nhánh Khách hàng ĐÃ ĐĂNG NHẬP ---
        const res = await api.post('/orders', {
          tenNguoiNhan: form.tenNguoiNhan,
          soDienThoaiNhan: form.soDienThoaiNhan,
          emailNhan: form.email,
          diaChiGiaoHang: form.diaChiGiaoHang,
          ghiChu: form.ghiChu || undefined,
          luuMacDinh: form.luuMacDinh,
          phuongThucThanhToan
        });

        const maDonHang = res.data.data?.MaDonHang;

        // Xóa sạch state giỏ hàng tập trung
        xoaTrangState();

        if (phuongThucThanhToan === 'CHUYEN_KHOAN_QR') {
          try {
            const resQr = await api.post(`/payments/create-qr/${maDonHang}`);
            setDuLieuQR(resQr.data.data);
            setHienModalQR(true);
            return; // Dừng lại ở modal để khách quét mã QR
          } catch (errQr) {
            // Hiện đúng lý do máy chủ trả về (khóa sai, payOS từ chối...) thay vì một câu chung chung
            const lyDo = errQr.response?.data?.message || errQr.message;
            console.warn('Không thể tạo mã VietQR:', lyDo, errQr);
            alert(`Không thể tạo mã VietQR: ${lyDo}. Đơn hàng của bạn đã được lưu với phương thức COD (thanh toán khi nhận hàng)!`);
          }
        } else {
          alert('Kính chúc quý độc giả nhiều niềm vui! Đơn hàng của bạn đã được khởi tạo thành công.');
        }

        navigate(`/orders/${maDonHang}`, { state: { from: '/orders' }, replace: true });
      } else {
        // --- Nhánh Khách vãng lai (Guest Checkout): không tạo tài khoản, không lưu thông tin ---
        const res = await api.post('/orders/guest', {
          tenNguoiNhan: form.tenNguoiNhan,
          soDienThoaiNhan: form.soDienThoaiNhan,
          emailNhan: form.email,
          diaChiGiaoHang: form.diaChiGiaoHang,
          ghiChu: form.ghiChu || undefined,
          phuongThucThanhToan,
          cacMon: danhSachMon.map(mon => ({
            maSach: mon.maSach,
            soLuong: mon.soLuong
          }))
        });

        // Xóa sạch giỏ hàng Guest trong localStorage
        localStorage.removeItem('booknest_guest_cart');
        xoaTrangState();

        const maDonHang = res.data.data?.MaDonHang;
        if (phuongThucThanhToan === 'CHUYEN_KHOAN_QR' && maDonHang) {
          setDonVangLaiTam(res.data.data);
          try {
            const resQr = await api.post(`/payments/create-qr/${maDonHang}`);
            setDuLieuQR(resQr.data.data);
            setHienModalQR(true);
            return; // Dừng lại ở modal để khách quét mã QR
          } catch (errQr) {
            const lyDo = errQr.response?.data?.message || errQr.message;
            console.warn('Không thể tạo mã VietQR cho khách vãng lai:', lyDo, errQr);
            alert(`Không thể tạo mã VietQR: ${lyDo}. Đơn hàng của bạn đã được lưu với phương thức COD!`);
            setDonVuaDat(res.data.data);
          }
        } else {
          setDonVuaDat(res.data.data);
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || 'Đặt hàng thất bại. Vui lòng kiểm tra lại thông tin nhận hàng';
      setLoi(msg);
    } finally {
      setDangDatHang(false);
    }
  };

  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);
  };

  // Lấy danh sách món đa tầng: Ưu tiên state Zustand, sau đó fallback trực tiếp vào localStorage
  const items = (cacMon && cacMon.length > 0)
    ? cacMon
    : (gioHang?.cacMon && gioHang.cacMon.length > 0)
      ? gioHang.cacMon
      : (() => {
          try {
            const raw = localStorage.getItem('booknest_guest_cart');
            return raw ? JSON.parse(raw) : [];
          } catch {
            return [];
          }
        })();

  if (dangTai) {
    return (
      <div className="container py-16 text-center" style={{ minHeight: '60vh' }}>
        <div style={{
          width: '48px',
          height: '48px',
          border: '3px solid var(--border)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          margin: '0 auto 1.5rem',
          animation: 'spin 1s linear infinite'
        }} />
        <p className="font-serif" style={{ color: 'var(--text-muted)', fontSize: '1.05rem', fontStyle: 'italic' }}>
          Đang chuẩn bị trang thanh toán cho ấn phẩm của bạn...
        </p>
      </div>
    );
  }

  if (donVuaDat) {
    return (
      <div className="container py-16 text-center">
        <div className="card" style={{ maxWidth: '560px', margin: '0 auto', padding: '2.5rem 2rem', borderRadius: '12px' }}>
          <CheckCircle size={48} style={{ color: 'var(--success, #28a745)', marginBottom: '1rem' }} />
          <h2 className="font-serif" style={{ fontSize: '1.45rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            Đặt hàng thành công
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
            Mã đơn của bạn là <strong>#{donVuaDat.MaDonHang}</strong>, hãy ghi lại để tiện liên hệ.
            Vì bạn đặt hàng không đăng nhập nên thông tin này sẽ không được lưu cho lần sau.
          </p>
          <div style={{ textAlign: 'left', fontSize: '0.9rem', lineHeight: 1.8, marginBottom: '1.75rem' }}>
            <div><strong>Người nhận:</strong> {donVuaDat.TenNguoiNhan}</div>
            <div><strong>Số điện thoại:</strong> {donVuaDat.SoDienThoaiNhan}</div>
            <div><strong>Email thông báo:</strong> {donVuaDat.EmailNhan}</div>
            <div><strong>Địa chỉ:</strong> {donVuaDat.DiaChiGiaoHang}</div>
            <div><strong>Tổng tiền:</strong> {dinhDangTien(donVuaDat.TongTien)}</div>
          </div>
          <div className="flex gap-3" style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link to="/" className="btn btn-primary" style={{ padding: '0.7rem 1.5rem', borderRadius: '6px' }}>
              Tiếp tục mua sắm
            </Link>
            <Link to="/register" className="btn btn-outline" style={{ padding: '0.7rem 1.5rem', borderRadius: '6px' }}>
              Đăng ký để lần sau không phải nhập lại
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Đặt đơn xong thì giỏ đã bị xóa (items rỗng) nhưng khung QR vẫn phải hiện lên để khách quét mã.
  // Nếu thoát sớm ở đây, khung QR (dựng ở cuối trang chính) không bao giờ xuất hiện và khách chỉ thấy "Giỏ hàng trống".
  const dangHienKhungQR = hienModalQR && Boolean(duLieuQR);
  if (items.length === 0 && !dangHienKhungQR) {
    return (
      <div className="container py-16 text-center">
        <div className="card" style={{ maxWidth: '520px', margin: '0 auto', padding: '2.5rem 2rem', borderRadius: '12px' }}>
          <div style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            backgroundColor: 'rgba(76, 69, 65, 0.08)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem',
            color: 'var(--text-muted)'
          }}>
            <BookOpen size={30} />
          </div>
          <h2 className="font-serif" style={{ fontSize: '1.45rem', fontWeight: 700, marginBottom: '0.75rem' }}>
            Giỏ Hàng Của Bạn Đang Trống
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.75rem', lineHeight: 1.6 }}>
            Hãy dạo quanh các kệ sách nghệ thuật của BookNest để lựa chọn những tác phẩm yêu thích trước khi tiến hành thanh toán nhé.
          </p>
          <Link to="/" className="btn btn-primary" style={{ padding: '0.75rem 1.75rem', borderRadius: '6px' }}>
            Khám phá các kệ sách
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Thanh điều hướng nhanh */}
      <div className="flex items-center justify-between mb-6">
        <Link to="/cart" className="btn btn-outline btn-sm inline-flex items-center gap-1.5" style={{ borderRadius: '6px' }}>
          <ArrowLeft size={16} /> Quay lại giỏ hàng
        </Link>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Thanh toán an toàn • Mã hóa SSL 256-bit
        </span>
      </div>

      <div className="mb-6">
        <h1 className="font-serif" style={{ fontSize: '1.85rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
          Xác Nhận Đặt Hàng & Giao Nhận
        </h1>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
          Vui lòng điền thông tin để BookNest đóng gói cẩn thận và gửi ấn phẩm đến tay bạn.
        </p>
      </div>

      {loi && (
        <div className="alert alert-danger mb-6 flex items-center gap-2" style={{ borderRadius: '8px' }}>
          <AlertCircle size={20} style={{ flexShrink: 0 }} />
          <span>{loi}</span>
        </div>
      )}

      <form onSubmit={handleDatHang}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cột Trái: Thông Tin Nhận Hàng & Giao Nhận */}
          <div className="lg:col-span-2 space-y-6">
            {/* Banner trạng thái khách */}
            <div style={{
              padding: '1rem 1.25rem',
              borderRadius: '8px',
              backgroundColor: daDangNhap ? 'rgba(40, 167, 69, 0.08)' : 'rgba(217, 131, 36, 0.08)',
              border: `1px solid ${daDangNhap ? 'rgba(40, 167, 69, 0.25)' : 'rgba(217, 131, 36, 0.25)'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div className="flex items-center gap-3">
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: daDangNhap ? 'rgba(40, 167, 69, 0.15)' : 'rgba(217, 131, 36, 0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: daDangNhap ? 'var(--success, #28a745)' : 'var(--accent, #d98324)',
                  flexShrink: 0
                }}>
                  {daDangNhap ? <Sparkles size={18} /> : <User size={18} />}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                    {daDangNhap ? `Thành viên BookNest: ${user?.fullName || user?.email}` : 'Đặt hàng với tư cách Khách vãng lai (Guest)'}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {daDangNhap 
                      ? 'Thông tin mặc định được tự động điền từ hồ sơ của bạn.'
                      : 'Bạn không cần đăng nhập. Thông tin chỉ dùng để giao đơn này và không được lưu lại, lần sau bạn sẽ nhập lại.'}
                  </div>
                </div>
              </div>
              {!daDangNhap && (
                <Link to="/login" state={{ from: { pathname: '/checkout' } }} className="btn btn-outline btn-sm" style={{ flexShrink: 0, fontSize: '0.78rem' }}>
                  Đã có tài khoản?
                </Link>
              )}
            </div>

            {/* Khung Thông Tin Giao Hàng */}
            <div className="card" style={{ padding: '1.75rem', borderRadius: '10px' }}>
              <div className="flex items-center gap-2 mb-5 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <MapPin size={20} style={{ color: 'var(--primary)' }} />
                <h2 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 600 }}>
                  Địa Chỉ Nhận Sách
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Họ tên người nhận */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    Tên người nhận hàng <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="text"
                      required
                      name="tenNguoiNhan"
                      className="form-input"
                      value={form.tenNguoiNhan}
                      onChange={handleChange}
                      placeholder="Ví dụ: Nguyễn Văn An"
                      style={{ borderRadius: '6px' }}
                    />
                  </div>
                </div>

                {/* Số điện thoại nhận */}
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                    Số điện thoại liên hệ <span style={{ color: 'var(--danger)' }}>*</span>
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="tel"
                      required
                      name="soDienThoaiNhan"
                      className="form-input"
                      value={form.soDienThoaiNhan}
                      onChange={handleChange}
                      placeholder="Ví dụ: 0912345678"
                      style={{ borderRadius: '6px' }}
                    />
                  </div>
                </div>
              </div>

              {/* Email nhận thông báo trạng thái đơn hàng */}
              <div className="form-group mt-4">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  Địa chỉ Email <span style={{ color: 'var(--danger)' }}>*</span>{' '}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>(để nhận thông báo khi trạng thái đơn hàng thay đổi)</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    name="email"
                    className="form-input"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="tenban@gmail.com"
                    style={{ borderRadius: '6px' }}
                  />
                </div>
              </div>

              {/* Địa chỉ chi tiết */}
              <div className="form-group mt-4">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  Địa chỉ giao hàng chi tiết <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                <textarea
                  required
                  rows="3"
                  name="diaChiGiaoHang"
                  className="form-input"
                  value={form.diaChiGiaoHang}
                  onChange={handleChange}
                  placeholder="Số nhà, ngõ/ngách, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                  style={{ borderRadius: '6px', resize: 'vertical' }}
                />
              </div>

              {/* Ghi chú */}
              <div className="form-group mt-4">
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                  Ghi chú cho bộ phận điều phối (nếu có)
                </label>
                <input
                  type="text"
                  name="ghiChu"
                  className="form-input"
                  value={form.ghiChu}
                  onChange={handleChange}
                  placeholder="Giao giờ hành chính, bọc chống sốc cẩn thận, gọi trước khi đến..."
                  style={{ borderRadius: '6px' }}
                />
              </div>

              {/* Tùy chọn lưu làm mặc định cho thành viên */}
              {daDangNhap && (
                <div style={{
                  marginTop: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '0.5rem 0.25rem'
                }}>
                  <input
                    type="checkbox"
                    id="luuMacDinh"
                    name="luuMacDinh"
                    checked={form.luuMacDinh}
                    onChange={(e) => setForm({ ...form, luuMacDinh: e.target.checked })}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--primary)' }}
                  />
                  <label htmlFor="luuMacDinh" style={{ fontSize: '0.85rem', color: 'var(--text-muted)', cursor: 'pointer', userSelect: 'none' }}>
                    Tự động lưu thông tin này làm địa chỉ mặc định cho các lần đặt sách sau
                  </label>
                </div>
              )}

              {/* Lựa chọn Phương thức Thanh toán */}
              <div style={{ marginTop: '1.75rem' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.75rem', display: 'block' }}>
                  Phương Thức Thanh Toán <span style={{ color: 'var(--danger)' }}>*</span>
                </label>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                  {/* Tùy chọn 1: COD */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '1rem',
                    borderRadius: '10px',
                    border: `2px solid ${phuongThucThanhToan === 'COD' ? 'var(--primary)' : 'var(--border)'}`,
                    backgroundColor: phuongThucThanhToan === 'COD' ? 'rgba(139, 69, 19, 0.04)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}>
                    <input
                      type="radio"
                      name="phuongThucThanhToan"
                      value="COD"
                      checked={phuongThucThanhToan === 'COD'}
                      onChange={() => setPhuongThucThanhToan('COD')}
                      style={{ marginTop: '3px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center gap-1.5" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem', marginBottom: '4px' }}>
                        <Truck size={17} style={{ color: 'var(--accent)' }} />
                        <span>Thanh toán khi nhận hàng (COD)</span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                        Kiểm tra sách nguyên vẹn khi nhận rồi mới thanh toán tiền mặt cho bưu tá.
                      </p>
                    </div>
                  </label>

                  {/* Tùy chọn 2: VietQR qua payOS */}
                  <label style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    padding: '1rem',
                    borderRadius: '10px',
                    border: `2px solid ${phuongThucThanhToan === 'CHUYEN_KHOAN_QR' ? 'var(--primary)' : 'var(--border)'}`,
                    backgroundColor: phuongThucThanhToan === 'CHUYEN_KHOAN_QR' ? 'rgba(139, 69, 19, 0.04)' : 'var(--bg-surface)',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s ease',
                    opacity: congQrKhaDung ? 1 : 0.6
                  }}>
                    <input
                      type="radio"
                      name="phuongThucThanhToan"
                      value="CHUYEN_KHOAN_QR"
                      checked={phuongThucThanhToan === 'CHUYEN_KHOAN_QR'}
                      onChange={() => setPhuongThucThanhToan('CHUYEN_KHOAN_QR')}
                      style={{ marginTop: '3px', accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="flex items-center gap-1.5" style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem' }}>
                          <QrCode size={17} style={{ color: 'var(--primary)' }} />
                          <span>Chuyển khoản VietQR</span>
                        </div>
                        <span style={{
                          fontSize: '0.68rem',
                          backgroundColor: '#e6f4ea',
                          color: '#137333',
                          fontWeight: 700,
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          Tự động 24/7
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                        Quét mã QR bằng mọi app Ngân hàng & MoMo. Hệ thống tự động duyệt trong 3 giây.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Cột Phải: Tổng Kết & Xác Nhận Đơn Hàng */}
          <div>
            <div className="card" style={{ padding: '1.75rem', borderRadius: '10px', position: 'sticky', top: '90px' }}>
              <div className="flex items-center justify-between mb-4 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                <h2 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                  Tóm Tắt Đơn Hàng
                </h2>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  {gioHang?.tongSoLuong || items.reduce((s, i) => s + (i.soLuong || 0), 0)} cuốn
                </span>
              </div>

              {/* Danh sách sách cuộn */}
              <div style={{
                maxHeight: '280px',
                overflowY: 'auto',
                marginBottom: '1.25rem',
                paddingRight: '4px'
              }}>
                {items.map((item) => (
                  <div
                    key={item.maSach}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '0.65rem 0',
                      borderBottom: '1px solid rgba(76, 69, 65, 0.08)'
                    }}
                  >
                    {/* Ảnh thu nhỏ */}
                    <div style={{
                      width: '42px',
                      height: '56px',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      flexShrink: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: '1px solid var(--border)'
                    }}>
                      {item.sach?.anhBia ? (
                        <img
                          src={item.sach.anhBia}
                          alt={item.sach.tenSach}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      ) : (
                        <BookOpen size={18} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </div>

                    {/* Chi tiết */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: '2px'
                      }}>
                        {item.sach?.tenSach}
                      </p>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {dinhDangTien(item.donGia)} × {item.soLuong}
                      </div>
                    </div>

                    {/* Thành tiền */}
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', flexShrink: 0 }}>
                      {dinhDangTien(item.thanhTien)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chi tiết chi phí */}
              <div className="space-y-2 py-2" style={{ borderTop: '1px solid var(--border)', fontSize: '0.9rem' }}>
                <div className="flex justify-between" style={{ color: 'var(--text-muted)' }}>
                  <span>Tạm tính tiền sách:</span>
                  <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                    {dinhDangTien(gioHang?.tongTien)}
                  </span>
                </div>

                <div className="flex justify-between items-center" style={{ color: 'var(--text-muted)' }}>
                  <span className="flex items-center gap-1.5">
                    <Truck size={15} style={{ color: 'var(--accent)' }} /> Vận chuyển toàn quốc:
                  </span>
                  <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Miễn phí</span>
                </div>
              </div>

              {/* Tổng thanh toán */}
              <div className="flex justify-between items-center py-4 mt-2" style={{
                borderTop: '1px dashed var(--border)',
                borderBottom: '1px dashed var(--border)'
              }}>
                <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                  Tổng thanh toán:
                </span>
                <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: '1.45rem' }}>
                  {dinhDangTien(gioHang?.tongTien)}
                </span>
              </div>

              {/* Nút Đặt Hàng */}
              <button
                type="submit"
                disabled={dangDatHang}
                className="btn btn-primary w-full mt-5"
                style={{
                  padding: '0.95rem 1rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  borderRadius: '6px',
                  boxShadow: '0 4px 12px rgba(139, 69, 19, 0.15)'
                }}
              >
                {dangDatHang ? (
                  <span className="inline-flex items-center gap-2">
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid rgba(255, 255, 255, 0.4)',
                      borderTopColor: '#fff',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                    Đang khởi tạo đơn hàng...
                  </span>
                ) : phuongThucThanhToan === 'CHUYEN_KHOAN_QR' ? (
                  <span className="inline-flex items-center gap-2">
                    <QrCode size={18} /> Đặt Hàng & Quét Mã VietQR
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <CheckCircle size={18} /> Xác Nhận Đặt Hàng (COD)
                  </span>
                )}
              </button>

              <div className="flex items-center justify-center gap-1.5 mt-3" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                <Lock size={13} />
                <span>Khoá số lượng và đơn giá nguyên tử trong CSDL</span>
              </div>
            </div>
          </div>
        </div>
      </form>

      {/* Modal / Khung hiển thị thanh toán VietQR payOS */}
      {hienModalQR && duLieuQR && (
        <KhungThanhToanVietQR
          duLieuQR={duLieuQR}
          onThanhToanThanhCong={() => {
            setHienModalQR(false);
            if (daDangNhap) {
              navigate(`/orders/${duLieuQR.maDonHang}`, { state: { from: '/orders' }, replace: true });
            } else if (donVangLaiTam) {
              setDonVuaDat(donVangLaiTam);
            }
          }}
          onDong={() => {
            setHienModalQR(false);
            if (daDangNhap) {
              navigate(`/orders/${duLieuQR.maDonHang}`, { state: { from: '/orders' }, replace: true });
            } else if (donVangLaiTam) {
              setDonVuaDat(donVangLaiTam);
            }
          }}
          onDoiSangCOD={() => {
            setHienModalQR(false);
            alert(`Đơn hàng #${duLieuQR.maDonHang} của bạn đã chuyển sang hình thức thanh toán khi nhận hàng (COD)!`);
            if (daDangNhap) {
              navigate(`/orders/${duLieuQR.maDonHang}`, { state: { from: '/orders' }, replace: true });
            } else if (donVangLaiTam) {
              setDonVuaDat(donVangLaiTam);
            }
          }}
        />
      )}
    </div>
  );
};

export default ThanhToan;
