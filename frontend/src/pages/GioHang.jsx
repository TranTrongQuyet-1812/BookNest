import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  AlertTriangle, 
  BookOpen, 
  ArrowLeft 
} from 'lucide-react';

export const GioHang = () => {
  const navigate = useNavigate();
  const [gioHang, setGioHang] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState('');
  const [dangCapNhat, setDangCapNhat] = useState(false);

  // Tải thông tin giỏ hàng từ API
  const taiGioHang = async () => {
    setDangTai(true);
    try {
      const res = await api.get('/cart');
      setGioHang(res.data.data);
    } catch (err) {
      setLoi(err.response?.data?.message || 'Không thể tải giỏ hàng của bạn');
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    let daHuy = false;
    const nap = async () => {
      try {
        const res = await api.get('/cart');
        if (daHuy) return;
        setGioHang(res.data.data);
      } catch (err) {
        if (!daHuy) setLoi(err.response?.data?.message || 'Không thể tải giỏ hàng của bạn');
      } finally {
        if (!daHuy) setDangTai(false);
      }
    };
    nap();
    return () => {
      daHuy = true;
    };
  }, []);

  // Thay đổi số lượng mặt hàng trong giỏ
  const handleCapNhatSoLuong = async (maSach, soLuongMoi) => {
    if (soLuongMoi < 1) return;
    setDangCapNhat(true);
    try {
      await api.put(`/cart/items/${maSach}`, { soLuong: soLuongMoi });
      await taiGioHang();
      window.dispatchEvent(new CustomEvent('booknest_cart_updated'));
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật số lượng');
    } finally {
      setDangCapNhat(false);
    }
  };

  // Xóa một mặt hàng khỏi giỏ
  const handleXoaMatHang = async (maSach) => {
    if (!window.confirm('Bạn có chắc muốn xóa cuốn sách này khỏi giỏ hàng?')) return;
    try {
      await api.delete(`/cart/items/${maSach}`);
      await taiGioHang();
      window.dispatchEvent(new CustomEvent('booknest_cart_updated'));
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi xóa sản phẩm');
    }
  };

  // Xóa sạch toàn bộ giỏ hàng
  const handleXoaTatCa = async () => {
    if (!window.confirm('Bạn có chắc muốn dọn sạch giỏ hàng?')) return;
    try {
      await api.delete('/cart');
      await taiGioHang();
      window.dispatchEvent(new CustomEvent('booknest_cart_updated'));
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi dọn giỏ hàng');
    }
  };

  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);
  };

  if (dangTai) {
    return (
      <div className="container py-12 flex justify-center">
        <p className="font-serif" style={{ color: 'var(--text-muted)' }}>Đang nạp giỏ hàng...</p>
      </div>
    );
  }

  const items = gioHang?.cacMon || [];
  const coSanPhamVuotTon = items.some((item) => item.soLuong > (item.sach?.soLuongTon ?? item.sach?.SoLuongTon ?? 0));

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700 }}>
          Giỏ Hàng Của Bạn
        </h1>
        {items.length > 0 && (
          <button
            onClick={handleXoaTatCa}
            className="btn btn-outline btn-sm"
            style={{ color: 'var(--danger)' }}
          >
            <Trash2 size={15} /> Dọn Sạch Giỏ Hàng
          </button>
        )}
      </div>

      {loi && (
        <div className="alert alert-danger mb-4">
          <span>{loi}</span>
        </div>
      )}

      {coSanPhamVuotTon && (
        <div className="alert alert-warning mb-4">
          <AlertTriangle size={18} />
          <span>Một số cuốn sách trong giỏ có số lượng lớn hơn số lượng còn trong kho. Vui lòng giảm số lượng để có thể đặt hàng.</span>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card text-center py-12" style={{ textAlign: 'center' }}>
          <ShoppingCart size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
          <h3 className="font-serif" style={{ fontSize: '1.25rem' }}>Giỏ hàng của bạn đang trống</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            Hãy chọn cho mình những cuốn sách yêu thích từ kho sách BookNest
          </p>
          <Link to="/" className="btn btn-primary">
            <BookOpen size={16} /> Khám Phá Sách Ngay
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Bảng Các Mục Sách */}
          <div className="lg:col-span-2">
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Sách</th>
                    <th>Đơn Giá</th>
                    <th>Số Lượng</th>
                    <th>Thành Tiền</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const tonKho = item.sach?.soLuongTon ?? item.sach?.SoLuongTon ?? 0;
                    const vuotTon = item.soLuong > tonKho;

                    return (
                      <tr key={item.maSach}>
                        {/* Cột thông tin sách */}
                        <td>
                          <div className="flex items-center gap-3">
                            <div style={{
                              width: '48px',
                              height: '64px',
                              backgroundColor: 'var(--bg-surface)',
                              borderRadius: '4px',
                              overflow: 'hidden',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}>
                              {(item.sach?.anhBia || item.sach?.hinhAnh) ? (
                                <img
                                  src={item.sach?.anhBia || item.sach?.hinhAnh}
                                  alt={item.sach?.tenSach || item.sach?.tieuDe}
                                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                />
                              ) : (
                                <BookOpen size={20} style={{ color: 'var(--text-muted)' }} />
                              )}
                            </div>
                            <div>
                              <Link
                                to={`/books/${item.maSach}`}
                                style={{ fontWeight: 600, color: 'var(--text-main)', display: 'block' }}
                              >
                                {item.sach?.tenSach || item.sach?.tieuDe}
                              </Link>
                              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Tác giả: {item.sach?.tacGia || item.sach?.TacGia || 'Đang cập nhật'}
                              </span>
                              {vuotTon && (
                                <div style={{ fontSize: '0.75rem', color: 'var(--danger)', fontWeight: 600, marginTop: '2px' }}>
                                  Kho chỉ còn {tonKho} cuốn!
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Cột đơn giá */}
                        <td style={{ fontWeight: 500 }}>
                          {dinhDangTien(item.donGia)}
                        </td>

                        {/* Cột số lượng */}
                        <td>
                          <div className="flex items-center gap-1" style={{
                            border: '1px solid var(--border)',
                            borderRadius: '4px',
                            display: 'inline-flex',
                            padding: '2px'
                          }}>
                            <button
                              disabled={item.soLuong <= 1 || dangCapNhat}
                              onClick={() => handleCapNhatSoLuong(item.maSach, item.soLuong - 1)}
                              style={{ padding: '2px 6px', color: 'var(--text-main)' }}
                            >
                              <Minus size={14} />
                            </button>
                            <span style={{ minWidth: '28px', textAlign: 'center', fontSize: '0.875rem', fontWeight: 600 }}>
                              {item.soLuong}
                            </span>
                            <button
                              disabled={dangCapNhat}
                              onClick={() => handleCapNhatSoLuong(item.maSach, item.soLuong + 1)}
                              style={{ padding: '2px 6px', color: 'var(--text-main)' }}
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </td>

                        {/* Cột thành tiền */}
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {dinhDangTien(item.thanhTien)}
                        </td>

                        {/* Cột nút xóa */}
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleXoaMatHang(item.maSach)}
                            style={{ color: 'var(--danger)', opacity: 0.8 }}
                            title="Xóa sản phẩm"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <Link to="/" className="btn btn-outline btn-sm inline-flex items-center gap-1">
                <ArrowLeft size={16} /> Tiếp tục chọn thêm sách
              </Link>
            </div>
          </div>

          {/* Cột Tổng Kết & Thanh Toán */}
          <div>
            <div className="card" style={{ padding: '1.5rem' }}>
              <h3 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '1rem' }}>
                Tổng Kết Đơn Hàng
              </h3>

              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Tổng số mặt hàng:</span>
                <span style={{ fontWeight: 600 }}>{gioHang?.tongSoLuong || 0} cuốn</span>
              </div>

              <div className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--border)', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Phí vận chuyển:</span>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Miễn phí</span>
              </div>

              <div className="flex justify-between py-4" style={{ fontSize: '1.1rem' }}>
                <span style={{ fontWeight: 600 }}>Tổng thanh toán:</span>
                <span style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.35rem' }}>
                  {dinhDangTien(gioHang?.tongTien)}
                </span>
              </div>

              <button
                disabled={items.length === 0 || coSanPhamVuotTon}
                onClick={() => navigate('/checkout')}
                className="btn btn-primary w-full"
                style={{ padding: '0.85rem' }}
              >
                Tiến Hành Đặt Hàng
                <ArrowRight size={18} />
              </button>

              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem', textAlign: 'center' }}>
                Giá và tình trạng tồn kho được khóa nguyên tử khi tạo đơn hàng
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GioHang;
