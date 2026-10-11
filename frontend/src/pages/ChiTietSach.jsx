import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import { 
  BookOpen, 
  ShoppingCart, 
  ArrowLeft, 
  Check, 
  AlertCircle, 
  MessageSquare,
  ShieldCheck,
  Send
} from 'lucide-react';

export const ChiTietSach = () => {
  const { id } = useParams();
  const { daDangNhap, user } = useAuth();

  const [sach, setSach] = useState(null);
  const [danhGiaList, setDanhGiaList] = useState([]);
  const [thongKeSao, setThongKeSao] = useState({ saoTrungBinh: 5, tongDanhGia: 0 });
  const [soLuong, setSoLuong] = useState(1);
  const [dangTai, setDangTai] = useState(true);
  const [thongBao, setThongBao] = useState('');
  const [loi, setLoi] = useState('');

  // Form đánh giá
  const [soSaoDanhGia, setSoSaoDanhGia] = useState(5);
  const [nhanXet, setNhanXet] = useState('');
  const [dangGuiDanhGia, setDangGuiDanhGia] = useState(false);
  const [loiDanhGia, setLoiDanhGia] = useState('');
  const [thanhCongDanhGia, setThanhCongDanhGia] = useState('');

  // Tải thông tin sách & danh sách đánh giá
  const taiDuLieu = async () => {
    setDangTai(true);
    try {
      // 1. Chi tiết sách
      const resSach = await api.get(`/books/${id}`);
      setSach(resSach.data.duLieu);

      // 2. Danh sách đánh giá
      const resDanhGia = await api.get(`/books/${id}/reviews`);
      setDanhGiaList(resDanhGia.data.duLieu || []);
      if (resDanhGia.data.thongKe) {
        setThongKeSao(resDanhGia.data.thongKe);
      }
    } catch (err) {
      setLoi(err.response?.data?.thongDiep || 'Không thể tải thông tin cuốn sách này');
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    taiDuLieu();
  }, [id]);

  // Thêm sách vào giỏ hàng
  const handleThemGioHang = async () => {
    if (!daDangNhap) {
      alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng');
      return;
    }
    setThongBao('');
    setLoi('');
    try {
      await api.post('/cart', { maSach: sach.maSach, soLuong });
      setThongBao(`Đã thêm ${soLuong} cuốn "${sach.tieuDe}" vào giỏ hàng thành công!`);
      window.dispatchEvent(new CustomEvent('booknest_cart_updated'));
      setTimeout(() => setThongBao(''), 3500);
    } catch (err) {
      setLoi(err.response?.data?.thongDiep || 'Lỗi khi thêm sách vào giỏ hàng');
    }
  };

  // Gửi đánh giá sách (Verified Buyer)
  const handleGuiDanhGia = async (e) => {
    e.preventDefault();
    setLoiDanhGia('');
    setThanhCongDanhGia('');
    setDangGuiDanhGia(true);

    try {
      await api.post(`/books/${id}/reviews`, {
        soSao: soSaoDanhGia,
        nhanXet: nhanXet.trim() || undefined
      });
      setThanhCongDanhGia('Cảm ơn bạn đã gửi đánh giá! Nhận xét đã được lưu');
      setNhanXet('');
      // Tải lại danh sách đánh giá
      taiDuLieu();
    } catch (err) {
      setLoiDanhGia(err.response?.data?.thongDiep || 'Bạn chỉ có thể đánh giá sách này sau khi đơn hàng được giao thành công');
    } finally {
      setDangGuiDanhGia(false);
    }
  };

  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);
  };

  if (dangTai) {
    return (
      <div className="container py-12 flex justify-center">
        <p className="font-serif" style={{ color: 'var(--text-muted)' }}>Đang nạp chi tiết tác phẩm...</p>
      </div>
    );
  }

  if (loi && !sach) {
    return (
      <div className="container py-12 text-center">
        <div className="alert alert-danger" style={{ maxWidth: '500px', margin: '0 auto 1.5rem' }}>
          <AlertCircle size={18} />
          <span>{loi}</span>
        </div>
        <Link to="/" className="btn btn-outline">
          <ArrowLeft size={16} /> Quay về trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="container py-8">
      {/* Nút quay lại */}
      <Link to="/" className="btn btn-outline btn-sm mb-6 inline-flex items-center gap-1">
        <ArrowLeft size={16} /> Về danh sách sách
      </Link>

      {/* Thông Báo Thành Công / Lỗi */}
      {thongBao && (
        <div className="alert alert-success">
          <Check size={18} />
          <span>{thongBao}</span>
        </div>
      )}
      {loi && (
        <div className="alert alert-danger">
          <AlertCircle size={18} />
          <span>{loi}</span>
        </div>
      )}

      {/* Khối Thông Tin Chi Tiết Sách */}
      <div className="card grid grid-cols-1 md:grid-cols-3 gap-8 mb-8" style={{ padding: '2rem' }}>
        {/* Hình Ảnh Bìa Sách */}
        <div>
          <div style={{
            height: '380px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}>
            {sach.hinhAnh ? (
              <img
                src={sach.hinhAnh}
                alt={sach.tieuDe}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <BookOpen size={72} style={{ color: 'var(--primary)', opacity: 0.5 }} />
            )}
          </div>
        </div>

        {/* Nội Dung & Thuộc Tính */}
        <div className="md:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="badge badge-role">
                {sach.danhMuc?.tenDanhMuc || 'Chưa phân loại'}
              </span>
              {sach.daAn && (
                <span className="badge badge-cancelled">
                  Sách đang ẩn (Chỉ nhân sự thấy)
                </span>
              )}
            </div>

            <h1 className="font-serif" style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem', lineHeight: 1.25 }}>
              {sach.tieuDe}
            </h1>

            <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Tác giả: <strong>{sach.tacGia}</strong>
            </p>

            {/* Điểm đánh giá */}
            <div className="flex items-center gap-2 mb-4" style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
              <StarRating rating={Math.round(thongKeSao.saoTrungBinh || 5)} size={18} />
              <span style={{ fontWeight: 600 }}>{thongKeSao.saoTrungBinh || '5.0'} / 5</span>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                ({thongKeSao.tongDanhGia} lượt nhận xét từ bạn đọc)
              </span>
            </div>

            {/* Giá & Trạng Thái Kho */}
            <div className="flex items-baseline gap-4 mb-4">
              <span style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>
                {dinhDangTien(sach.gia)}
              </span>
              <span style={{
                fontSize: '0.9rem',
                color: sach.soLuongTon > 0 ? 'var(--accent)' : 'var(--danger)',
                fontWeight: 600
              }}>
                {sach.soLuongTon > 0 ? `✓ Còn ${sach.soLuongTon} cuốn trong kho` : '✗ Hết hàng'}
              </span>
            </div>

            {/* Mô tả */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>Tóm tắt nội dung:</h3>
              <p style={{ color: 'var(--text-muted)', lineHeight: '1.7', fontSize: '0.925rem' }}>
                {sach.moTa || 'Tác phẩm đang được cập nhật phần giới thiệu chi tiết.'}
              </p>
            </div>
          </div>

          {/* Khối Đặt Mua */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '1.25rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)'
          }}>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label style={{ fontSize: '0.875rem', fontWeight: 500 }}>Số lượng:</label>
                <input
                  type="number"
                  min="1"
                  max={sach.soLuongTon || 1}
                  disabled={sach.soLuongTon <= 0}
                  value={soLuong}
                  onChange={(e) => setSoLuong(Math.max(1, parseInt(e.target.value) || 1))}
                  className="form-input"
                  style={{ width: '80px', textAlign: 'center' }}
                />
              </div>

              <button
                onClick={handleThemGioHang}
                disabled={sach.soLuongTon <= 0}
                className="btn btn-primary flex-1"
                style={{ padding: '0.75rem' }}
              >
                <ShoppingCart size={18} />
                Thêm Vào Giỏ Hàng
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Khu Vực Đánh Giá & Nhận Xét (T16) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Form Viết Nhận Xét */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <MessageSquare size={18} style={{ color: 'var(--primary)' }} />
            <h3 className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 600 }}>
              Gửi Đánh Giá Của Bạn
            </h3>
          </div>
          <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
            <ShieldCheck size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            Theo chính sách bảo vệ chất lượng nhận xét, chỉ bạn đọc đã nhận sách thành công (Đơn hàng DELIVERED) mới có thể gửi đánh giá.
          </p>

          {loiDanhGia && (
            <div className="alert alert-danger" style={{ fontSize: '0.85rem' }}>
              <AlertCircle size={16} />
              <span>{loiDanhGia}</span>
            </div>
          )}
          {thanhCongDanhGia && (
            <div className="alert alert-success" style={{ fontSize: '0.85rem' }}>
              <Check size={16} />
              <span>{thanhCongDanhGia}</span>
            </div>
          )}

          {daDangNhap ? (
            <form onSubmit={handleGuiDanhGia}>
              <div className="form-group">
                <label className="form-label">Chọn mức độ hài lòng:</label>
                <StarRating
                  rating={soSaoDanhGia}
                  interactive={true}
                  onRatingChange={(sao) => setSoSaoDanhGia(sao)}
                  size={24}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nhận xét chi tiết:</label>
                <textarea
                  rows="4"
                  className="form-input"
                  placeholder="Chia sẻ cảm nhận của bạn về nội dung, chất lượng in ấn..."
                  value={nhanXet}
                  onChange={(e) => setNhanXet(e.target.value)}
                />
              </div>

              <button
                type="submit"
                disabled={dangGuiDanhGia}
                className="btn btn-primary w-full"
              >
                <Send size={16} />
                {dangGuiDanhGia ? 'Đang gửi...' : 'Gửi Nhận Xét'}
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', padding: '1rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-sm)' }}>
              <p style={{ fontSize: '0.875rem', marginBottom: '0.75rem', color: 'var(--text-muted)' }}>
                Vui lòng đăng nhập để viết nhận xét
              </p>
              <Link to="/login" className="btn btn-outline btn-sm">
                Đăng Nhập Ngay
              </Link>
            </div>
          )}
        </div>

        {/* Danh Sách Đánh Giá Thực Tế */}
        <div className="card md:col-span-2">
          <h3 className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem' }}>
            Nhận Xét Từ Bạn Đọc ({danhGiaList.length})
          </h3>

          {danhGiaList.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
              Chưa có nhận xét nào cho tác phẩm này. Hãy là người đầu tiên trải nghiệm và chia sẻ cảm nghĩ!
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {danhGiaList.map((dg) => (
                <div
                  key={dg.maDanhGia}
                  style={{
                    paddingBottom: '1rem',
                    borderBottom: '1px solid var(--border)'
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span style={{ fontWeight: 600, fontSize: '0.925rem' }}>
                      {dg.nguoiDung?.hoTen || 'Bạn đọc ẩn danh'}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {new Date(dg.ngayDanhGia).toLocaleDateString('vi-VN')}
                    </span>
                  </div>
                  <StarRating rating={dg.soSao} size={14} />
                  <p style={{ marginTop: '0.5rem', fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
                    {dg.nhanXet || 'Người đọc không để lại lời bình.'}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChiTietSach;
