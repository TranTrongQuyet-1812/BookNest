import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { 
  MapPin, 
  CheckCircle, 
  AlertCircle, 
  ArrowLeft, 
  ShieldCheck 
} from 'lucide-react';

export const ThanhToan = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [gioHang, setGioHang] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [dangDatHang, setDangDatHang] = useState(false);
  const [loi, setLoi] = useState('');

  // Form thông tin nhận hàng - điền sẵn từ hồ sơ
  const [form, setForm] = useState({
    tenNguoiNhan: user?.fullName || user?.hoTen || '',
    soDienThoaiNhan: user?.soDienThoai || '',
    diaChiGiaoHang: user?.diaChiMacDinh || user?.diaChi || '',
    ghiChu: ''
  });

  useEffect(() => {
    const taiGioHang = async () => {
      try {
        const res = await api.get('/cart');
        setGioHang(res.data.data);
      } catch {
        setLoi('Không thể tải thông tin giỏ hàng');
      } finally {
        setDangTai(false);
      }
    };
    taiGioHang();
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleDatHang = async (e) => {
    e.preventDefault();
    setLoi('');
    setDangDatHang(true);

    try {
      const res = await api.post('/orders', {
        tenNguoiNhan: form.tenNguoiNhan,
        soDienThoaiNhan: form.soDienThoaiNhan,
        diaChiGiaoHang: form.diaChiGiaoHang,
        ghiChu: form.ghiChu || undefined
      });

      // Bắn sự kiện cập nhật giỏ hàng trên navbar về 0
      window.dispatchEvent(new CustomEvent('booknest_cart_updated'));

      const maDonHang = res.data.data?.MaDonHang || res.data.data?.maDonHang;
      alert('Chúc mừng! Đơn hàng của bạn đã được khởi tạo thành công.');
      navigate(`/orders/${maDonHang}`);
    } catch (err) {
      setLoi(err.response?.data?.message || err.response?.data?.thongDiep || 'Đặt hàng thất bại. Vui lòng kiểm tra lại');
    } finally {
      setDangDatHang(false);
    }
  };

  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);
  };

  if (dangTai) {
    return (
      <div className="container py-12 flex justify-center">
        <p className="font-serif" style={{ color: 'var(--text-muted)' }}>Đang chuẩn bị trang thanh toán...</p>
      </div>
    );
  }

  const items = gioHang?.cacMon || [];
  if (items.length === 0) {
    return (
      <div className="container py-12 text-center">
        <div className="card" style={{ maxWidth: '480px', margin: '0 auto', padding: '2rem' }}>
          <h3 className="font-serif" style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
            Giỏ hàng của bạn đang trống!
          </h3>
          <Link to="/" className="btn btn-primary">
            Khám phá sách và thêm vào giỏ
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <Link to="/cart" className="btn btn-outline btn-sm mb-6 inline-flex items-center gap-1">
        <ArrowLeft size={16} /> Quay lại giỏ hàng
      </Link>

      <h1 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '1.5rem' }}>
        Xác Nhận Đặt Hàng
      </h1>

      {loi && (
        <div className="alert alert-danger mb-6">
          <AlertCircle size={18} />
          <span>{loi}</span>
        </div>
      )}

      <form onSubmit={handleDatHang}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cột Điền Thông Tin Nhận Hàng */}
          <div className="lg:col-span-2">
            <div className="card" style={{ padding: '1.75rem' }}>
              <div className="flex items-center gap-2 mb-4">
                <MapPin size={20} style={{ color: 'var(--primary)' }} />
                <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                  Thông Tin Giao Hàng
                </h3>
              </div>

              <div className="form-group">
                <label className="form-label">Tên người nhận hàng *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required
                    name="tenNguoiNhan"
                    className="form-input"
                    value={form.tenNguoiNhan}
                    onChange={handleChange}
                    placeholder="Nguyễn Văn A"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Số điện thoại liên hệ *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    required
                    name="soDienThoaiNhan"
                    className="form-input"
                    value={form.soDienThoaiNhan}
                    onChange={handleChange}
                    placeholder="0912345678"
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Địa chỉ nhận sách chi tiết *</label>
                <textarea
                  required
                  rows="3"
                  name="diaChiGiaoHang"
                  className="form-input"
                  value={form.diaChiGiaoHang}
                  onChange={handleChange}
                  placeholder="Số nhà, tên đường, phường/xã, quận/huyện, tỉnh/thành phố..."
                />
              </div>

              <div className="form-group">
                <label className="form-label">Ghi chú cho nhân viên giao hàng (nếu có)</label>
                <input
                  type="text"
                  name="ghiChu"
                  className="form-input"
                  value={form.ghiChu}
                  onChange={handleChange}
                  placeholder="Giao giờ hành chính, gọi trước khi đến..."
                />
              </div>

              <div style={{
                marginTop: '1.25rem',
                padding: '1rem',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)',
                display: 'flex',
                gap: '8px',
                fontSize: '0.85rem',
                color: 'var(--text-muted)'
              }}>
                <ShieldCheck size={20} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                <span>
                  Phương thức thanh toán: <strong>Thanh toán khi nhận hàng (COD)</strong>. Bạn chỉ cần thanh toán khi đã cầm trên tay những cuốn sách nguyên vẹn từ BookNest.
                </span>
              </div>
            </div>
          </div>

          {/* Cột Xem Lại Đơn Hàng */}
          <div>
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem' }}>
                Đơn Hàng ({items.length} tác phẩm)
              </h3>

              <div style={{
                maxHeight: '260px',
                overflowY: 'auto',
                marginBottom: '1rem',
                borderBottom: '1px solid var(--border)',
                paddingBottom: '0.5rem'
              }}>
                {items.map((item) => (
                  <div key={item.maSach || item.maChiTietGioHang} className="flex justify-between items-center py-2" style={{ fontSize: '0.875rem' }}>
                    <div style={{ maxWidth: '65%' }}>
                      <p style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.sach?.tenSach || item.sach?.tieuDe}
                      </p>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {dinhDangTien(item.donGia)} × {item.soLuong}
                      </span>
                    </div>
                    <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                      {dinhDangTien(item.thanhTien)}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between py-1" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <span>Tạm tính:</span>
                <span>{dinhDangTien(gioHang?.tongTien)}</span>
              </div>

              <div className="flex justify-between py-1" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                <span>Vận chuyển:</span>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Miễn phí</span>
              </div>

              <div className="flex justify-between py-3 mt-2" style={{ borderTop: '1px solid var(--border)', fontSize: '1.1rem' }}>
                <span style={{ fontWeight: 600 }}>Tổng tiền:</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.3rem' }}>
                  {dinhDangTien(gioHang?.tongTien)}
                </span>
              </div>

              <button
                type="submit"
                disabled={dangDatHang}
                className="btn btn-primary w-full mt-4"
                style={{ padding: '0.85rem' }}
              >
                <CheckCircle size={18} />
                {dangDatHang ? 'Đang xác thực giao dịch...' : 'Xác Nhận Đặt Hàng'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default ThanhToan;
