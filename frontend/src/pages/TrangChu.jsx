import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import { 
  Search, 
  Filter, 
  ShoppingCart, 
  BookOpen, 
  ChevronLeft, 
  ChevronRight,
  Sparkles,
  Check
} from 'lucide-react';

export const TrangChu = () => {
  const { daDangNhap } = useAuth();

  // State dữ liệu sách và danh mục
  const [sachList, setSachList] = useState([]);
  const [danhMucList, setDanhMucList] = useState([]);
  const [phanTrang, setPhanTrang] = useState({ page: 1, limit: 12, total: 0, totalPages: 1 });
  const [dangTai, setDangTai] = useState(true);
  const [thongBaoThem, setThongBaoThem] = useState('');

  // Bộ lọc tìm kiếm
  const [timKiem, setTimKiem] = useState('');
  const [tuKhoaDaLoc, setTuKhoaDaLoc] = useState('');
  const [danhMucChon, setDanhMucChon] = useState('');
  const [sapXep, setSapXep] = useState('newest');

  // Tải danh mục một lần khi mount
  useEffect(() => {
    let daHuy = false;
    const taiDanhMuc = async () => {
      try {
        const res = await api.get('/categories');
        if (!daHuy) setDanhMucList(res.data.data || []);
      } catch (err) {
        console.error('Lỗi tải danh mục:', err);
      }
    };
    taiDanhMuc();
    return () => {
      daHuy = true;
    };
  }, []);

  // Tải danh sách sách mỗi khi query hoặc page đổi
  useEffect(() => {
    let daHuy = false;
    const taiSach = async () => {
      try {
        const params = {
          page: phanTrang.page,
          limit: 12,
          sort: sapXep === 'gia_ASC' ? 'price_asc' : sapXep === 'gia_DESC' ? 'price_desc' : (sapXep || 'newest')
        };

        if (tuKhoaDaLoc) params.search = tuKhoaDaLoc;
        if (danhMucChon) params.categoryId = Number(danhMucChon);

        const res = await api.get('/books', { params });
        if (daHuy) return;
        const dataPhanHoi = res.data.data;
        setSachList(dataPhanHoi?.danhSach || (Array.isArray(dataPhanHoi) ? dataPhanHoi : []));
        if (dataPhanHoi?.phanTrang) {
          setPhanTrang(dataPhanHoi.phanTrang);
        }
      } catch (err) {
        console.error('Lỗi tải sách:', err);
      } finally {
        if (!daHuy) setDangTai(false);
      }
    };

    taiSach();
    return () => {
      daHuy = true;
    };
  }, [phanTrang.page, danhMucChon, sapXep, tuKhoaDaLoc]);

  // Xử lý gửi form tìm kiếm
  const handleTimKiem = (e) => {
    e.preventDefault();
    setDangTai(true);
    setTuKhoaDaLoc(timKiem.trim());
    setPhanTrang((prev) => ({ ...prev, page: 1 }));
  };

  // Thêm nhanh vào giỏ hàng
  const handleThemVaoGio = async (maSach, tieuDe) => {
    if (!daDangNhap) {
      alert('Vui lòng đăng nhập để thêm sách vào giỏ hàng');
      return;
    }
    try {
      await api.post('/cart/items', { maSach, soLuong: 1 });
      setThongBaoThem(`Đã thêm "${tieuDe}" vào giỏ hàng`);
      window.dispatchEvent(new CustomEvent('booknest_cart_updated'));
      setTimeout(() => setThongBaoThem(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể thêm vào giỏ hàng');
    }
  };

  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien);
  };

  return (
    <div>
      {/* Banner Chào Mừng & Triết Lý Sách */}
      <section style={{
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border)',
        padding: '3rem 0'
      }}>
        <div className="container">
          <div style={{ maxWidth: '680px' }}>
            <span className="badge badge-pending mb-2">
              <Sparkles size={14} /> Không Gian Tri Thức & Nghệ Thuật Đọc
            </span>
            <h1 className="font-serif" style={{
              fontSize: '2.5rem',
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: '1rem',
              color: 'var(--text-main)'
            }}>
              Mỗi cuốn sách là một tổ ấm cho tâm hồn
            </h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.05rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
              Khám phá tuyển tập các tác phẩm kinh điển, lập trình chuyên sâu, văn học và tư duy phát triển bản thân tại BookNest.
            </p>
          </div>
        </div>
      </section>

      {/* Thông Báo Toast Thêm Giỏ Hàng */}
      {thongBaoThem && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 60,
          backgroundColor: 'var(--accent)',
          color: '#FFFFFF',
          padding: '0.875rem 1.25rem',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <Check size={18} />
          <span>{thongBaoThem}</span>
        </div>
      )}

      {/* Khu Vực Bộ Lọc & Tìm Kiếm */}
      <div className="container py-8">
        <div className="card mb-6" style={{ padding: '1.25rem' }}>
          <form onSubmit={handleTimKiem} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Ô tìm kiếm */}
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Tìm tựa sách, tác giả..."
                className="form-input"
                style={{ paddingLeft: '2.25rem' }}
                value={timKiem}
                onChange={(e) => setTimKiem(e.target.value)}
              />
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)'
                }}
              />
            </div>

            {/* Lọc danh mục */}
            <div>
              <select
                className="form-input"
                value={danhMucChon}
                onChange={(e) => {
                  setDanhMucChon(e.target.value);
                  setPhanTrang((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <option value="">Tất cả thể loại</option>
                {danhMucList.map((dm) => {
                  const idDm = dm.MaDanhMuc;
                  const tenDm = dm.TenDanhMuc;
                  return (
                    <option key={idDm} value={idDm}>
                      {tenDm}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Sắp xếp */}
            <div>
              <select
                className="form-input"
                value={sapXep}
                onChange={(e) => setSapXep(e.target.value)}
              >
                <option value="newest">Mới nhất</option>
                <option value="price_asc">Giá tăng dần</option>
                <option value="price_desc">Giá giảm dần</option>
              </select>
            </div>

            {/* Nút lọc */}
            <div>
              <button type="submit" className="btn btn-primary w-full">
                <Filter size={16} />
                Lọc Sách
              </button>
            </div>
          </form>
        </div>

        {/* Danh Sách Sách */}
        {dangTai ? (
          <div className="flex justify-center items-center py-12">
            <p className="font-serif" style={{ color: 'var(--text-muted)' }}>Đang tải danh mục sách...</p>
          </div>
        ) : sachList.length === 0 ? (
          <div className="card text-center py-12" style={{ textAlign: 'center' }}>
            <BookOpen size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
            <h3 className="font-serif" style={{ fontSize: '1.25rem' }}>Không tìm thấy cuốn sách nào</h3>
            <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              Hãy thử thay đổi từ khóa hoặc bộ lọc thể loại khác
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {sachList.map((sach) => {
              const maSach = sach.MaSach;
              const tenSach = sach.TenSach;
              const tacGia = sach.TacGia;
              const anhBia = sach.AnhBia;
              const tenDanhMuc = sach.danhMuc?.TenDanhMuc ?? 'Sách';
              const giaBan = sach.GiaBan;
              const tonKho = sach.SoLuongTon ?? 0;
              const sao = sach.saoTrungBinh ?? 5;

              return (
                <div key={maSach} className="card flex flex-col justify-between" style={{ padding: '1rem' }}>
                  <div>
                    {/* Bìa sách tượng trưng */}
                    <div style={{
                      height: '200px',
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.75rem',
                      border: '1px solid var(--border)'
                    }}>
                      {anhBia ? (
                        <img
                          src={anhBia}
                          alt={tenSach}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      ) : (
                        <BookOpen size={48} style={{ color: 'var(--primary)', opacity: 0.6 }} />
                      )}
                    </div>

                    {/* Thể loại */}
                    <span className="badge badge-role" style={{ fontSize: '0.72rem', marginBottom: '0.4rem' }}>
                      {tenDanhMuc}
                    </span>

                    {/* Tựa sách */}
                    <Link to={`/books/${maSach}`}>
                      <h3 className="font-serif" style={{
                        fontSize: '1.05rem',
                        fontWeight: 600,
                        lineHeight: 1.35,
                        marginBottom: '0.35rem',
                        color: 'var(--text-main)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {tenSach}
                      </h3>
                    </Link>

                    {/* Tác giả */}
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      Tác giả: {tacGia}
                    </p>

                    {/* Đánh giá sao */}
                    <div className="flex items-center gap-1 mb-2">
                      <StarRating rating={Math.round(sao || 5)} size={14} />
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        ({sao ? sao : '5.0'})
                      </span>
                    </div>
                  </div>

                  <div>
                    {/* Giá và tồn kho */}
                    <div className="flex items-center justify-between mb-3" style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--primary)' }}>
                        {dinhDangTien(giaBan)}
                      </span>
                      <span style={{
                        fontSize: '0.75rem',
                        color: tonKho > 0 ? 'var(--text-muted)' : 'var(--danger)',
                        fontWeight: tonKho > 0 ? 'normal' : '600'
                      }}>
                        {tonKho > 0 ? `Còn ${tonKho} cuốn` : 'Tạm hết hàng'}
                      </span>
                    </div>

                    {/* Nút hành động */}
                    <div className="flex gap-2">
                      <Link
                        to={`/books/${maSach}`}
                        className="btn btn-outline btn-sm flex-1"
                      >
                        Chi Tiết
                      </Link>
                      <button
                        onClick={() => handleThemVaoGio(maSach, tenSach)}
                        disabled={tonKho <= 0}
                        className="btn btn-primary btn-sm"
                        title="Thêm vào giỏ hàng"
                      >
                        <ShoppingCart size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Phân Trang */}
        {phanTrang.totalPages > 1 && (
          <div className="flex justify-center items-center gap-2 mt-8">
            <button
              disabled={phanTrang.page <= 1}
              onClick={() => setPhanTrang((prev) => ({ ...prev, page: prev.page - 1 }))}
              className="btn btn-outline btn-sm"
            >
              <ChevronLeft size={16} /> Trước
            </button>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 8px' }}>
              Trang {phanTrang.page} / {phanTrang.totalPages} (Tổng {phanTrang.total} cuốn)
            </span>
            <button
              disabled={phanTrang.page >= phanTrang.totalPages}
              onClick={() => setPhanTrang((prev) => ({ ...prev, page: prev.page + 1 }))}
              className="btn btn-outline btn-sm"
            >
              Sau <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrangChu;
