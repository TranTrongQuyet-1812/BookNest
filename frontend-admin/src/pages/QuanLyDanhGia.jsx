import React, { useEffect, useState } from 'react';
import { 
  MessageSquare, 
  Star, 
  Eye, 
  EyeOff, 
  Trash2, 
  RefreshCw, 
  Search, 
  Filter, 
  AlertCircle, 
  CheckCircle2,
  BookOpen
} from 'lucide-react';
import api from '@booknest/shared/api';
import { useAuth } from '@booknest/shared/auth';

export default function QuanLyDanhGia() {
  const { user } = useAuth();
  const laQuanTri = user?.role === 'quan_tri';

  const [danhSach, setDanhSach] = useState([]);
  const [phanTrang, setPhanTrang] = useState({ trangHienTai: 1, tongSoTrang: 1, tongSoBanGhi: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [rating, setRating] = useState('');
  const [daAn, setDaAn] = useState('');
  
  const [dangTai, setDangTai] = useState(true);
  const [dangXuLyId, setDangXuLyId] = useState(null);
  const [loi, setLoi] = useState('');
  const [thongBao, setThongBao] = useState('');

  // Modal xác nhận xóa vĩnh viễn (Chỉ Quản trị viên)
  const [danhGiaCanXoa, setDanhGiaCanXoa] = useState(null);
  // Modal ẩn đánh giá kèm lý do
  const [danhGiaCanAn, setDanhGiaCanAn] = useState(null);
  const [lyDoAn, setLyDoAn] = useState('');

  const taiDanhSach = async () => {
    setDangTai(true);
    setLoi('');
    try {
      const res = await api.get('/admin/reviews', {
        params: {
          page,
          limit: 15,
          search: search.trim() || undefined,
          rating: rating || undefined,
          daAn: daAn !== '' ? daAn : undefined
        }
      });
      setDanhSach(res.data.data.danhSach || []);
      setPhanTrang(res.data.data.phanTrang || { trangHienTai: 1, tongSoTrang: 1, tongSoBanGhi: 0 });
    } catch (err) {
      setLoi(err.response?.data?.message || 'Không thể tải danh sách đánh giá.');
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    taiDanhSach();
  }, [page, rating, daAn]);

  const handleTimKiem = (e) => {
    e.preventDefault();
    setPage(1);
    taiDanhSach();
  };

  const xuLyDoiTrangThaiAn = async (maDanhGia, trangThaiMoi, lyDo = '') => {
    setDangXuLyId(maDanhGia);
    setThongBao('');
    setLoi('');
    try {
      await api.put(`/admin/reviews/${maDanhGia}/visibility`, {
        daAn: trangThaiMoi,
        lyDo
      });
      setDanhSach(prev => prev.map(item => {
        if (item.MaDanhGia === maDanhGia) {
          return { ...item, DaAn: trangThaiMoi };
        }
        return item;
      }));
      setThongBao(trangThaiMoi ? `Đã ẩn đánh giá #${maDanhGia} khỏi cửa hàng.` : `Đã cho hiển thị lại đánh giá #${maDanhGia}.`);
      setDanhGiaCanAn(null);
      setLyDoAn('');
    } catch (err) {
      setLoi(err.response?.data?.message || 'Không thể thay đổi trạng thái đánh giá.');
    } finally {
      setDangXuLyId(null);
    }
  };

  const xuLyXoaVinhVien = async () => {
    if (!danhGiaCanXoa) return;
    setDangXuLyId(danhGiaCanXoa.MaDanhGia);
    setThongBao('');
    setLoi('');
    try {
      await api.delete(`/admin/reviews/${danhGiaCanXoa.MaDanhGia}`);
      setDanhSach(prev => prev.filter(item => item.MaDanhGia !== danhGiaCanXoa.MaDanhGia));
      setThongBao(`Đã xóa vĩnh viễn đánh giá #${danhGiaCanXoa.MaDanhGia}.`);
      setDanhGiaCanXoa(null);
    } catch (err) {
      setLoi(err.response?.data?.message || 'Không thể xóa đánh giá.');
    } finally {
      setDangXuLyId(null);
    }
  };

  const renderSao = (soSao) => {
    return (
      <div style={{ display: 'inline-flex', gap: '2px', color: '#F59E0B' }}>
        {[1, 2, 3, 4, 5].map((sao) => (
          <Star
            key={sao}
            size={14}
            fill={sao <= soSao ? '#F59E0B' : 'transparent'}
            stroke="#F59E0B"
          />
        ))}
      </div>
    );
  };

  return (
    <div className="bo-page">
      {/* Header */}
      <div className="bo-page-heading">
        <div>
          <span className="bo-eyebrow">VẬN HÀNH & KIỂM DUYỆT</span>
          <h1>Kiểm Duyệt Đánh Giá</h1>
          <p>Quản lý nhận xét và đánh giá của khách hàng. Ẩn nội dung phản cảm/vi phạm hoặc xóa thư rác.</p>
        </div>
        <button className="bo-secondary-button" onClick={taiDanhSach} disabled={dangTai}>
          <RefreshCw size={15} className={dangTai ? 'spin' : ''} />
          Làm mới
        </button>
      </div>

      {loi && (
        <div className="bo-alert" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <AlertCircle size={16} />
          <span>{loi}</span>
        </div>
      )}

      {thongBao && (
        <div className="history-success" role="status" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle2 size={16} />
          <span>{thongBao}</span>
        </div>
      )}

      {/* Filter Bar */}
      <section className="bo-panel" style={{ marginBottom: '1.25rem', padding: '1rem' }}>
        <form onSubmit={handleTimKiem} style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', alignItems: 'center' }}>
          {/* Ô tìm kiếm */}
          <div style={{ position: 'relative', flex: '1 1 240px' }}>
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }} />
            <input
              type="text"
              placeholder="Tìm theo tên sách, khách hàng, nội dung..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.45rem 0.75rem 0.45rem 2.25rem',
                border: '1px solid var(--adm-border, #CBD5E1)',
                borderRadius: '6px',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Lọc số sao */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Số sao:</span>
            <select
              value={rating}
              onChange={(e) => { setRating(e.target.value); setPage(1); }}
              style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.875rem' }}
            >
              <option value="">Tất cả số sao</option>
              <option value="5">5 sao ⭐⭐⭐⭐⭐</option>
              <option value="4">4 sao ⭐⭐⭐⭐</option>
              <option value="3">3 sao ⭐⭐⭐</option>
              <option value="2">2 sao ⭐⭐</option>
              <option value="1">1 sao ⭐</option>
            </select>
          </div>

          {/* Lọc trạng thái ẩn/hiện */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.85rem', color: '#64748B' }}>Trạng thái:</span>
            <select
              value={daAn}
              onChange={(e) => { setDaAn(e.target.value); setPage(1); }}
              style={{ padding: '0.45rem 0.65rem', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '0.875rem' }}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="false">Đang hiển thị</option>
              <option value="true">Đã bị ẩn</option>
            </select>
          </div>

          <button type="submit" className="bo-secondary-button">
            <Filter size={14} /> Lọc
          </button>
        </form>
      </section>

      {/* Bảng danh sách */}
      <section className="bo-panel history-table-panel">
        <div className="bo-panel-title">
          <div>
            <h2><MessageSquare size={18} /> Danh Sách Nhận Xét</h2>
            <p>Tổng cộng {phanTrang.tongSoBanGhi} đánh giá · Trang {page}/{phanTrang.tongSoTrang || 1}</p>
          </div>
        </div>

        {dangTai ? (
          <div className="bo-empty">Đang tải danh sách đánh giá...</div>
        ) : (
          <div className="bo-table-wrap">
            <table className="bo-table">
              <thead>
                <tr>
                  <th style={{ width: '220px' }}>Sách</th>
                  <th style={{ width: '180px' }}>Khách Hàng</th>
                  <th>Nhận Xét & Đánh Giá</th>
                  <th style={{ width: '130px', textAlign: 'center' }}>Trạng Thái</th>
                  <th style={{ width: '160px', textAlign: 'right' }}>Thao Tác</th>
                </tr>
              </thead>
              <tbody>
                {danhSach.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="bo-empty">
                      Không có đánh giá nào phù hợp với bộ lọc.
                    </td>
                  </tr>
                ) : (
                  danhSach.map((dg) => (
                    <tr key={dg.MaDanhGia}>
                      {/* Cột Sách */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                          {dg.sach?.AnhBia ? (
                            <img
                              src={dg.sach.AnhBia}
                              alt={dg.sach.TenSach}
                              style={{ width: '38px', height: '52px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #E2E8F0' }}
                            />
                          ) : (
                            <div style={{ width: '38px', height: '52px', background: '#F1F5F9', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94A3B8' }}>
                              <BookOpen size={16} />
                            </div>
                          )}
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '0.875rem', lineHeight: 1.3 }}>
                              {dg.sach?.TenSach || `Sách #${dg.MaSach}`}
                            </div>
                            <small style={{ color: '#64748B' }}>Mã: #{dg.MaSach}</small>
                          </div>
                        </div>
                      </td>

                      {/* Cột Khách Hàng */}
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                          {dg.khachHang?.HoTen || 'Khách ẩn danh'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748B' }}>
                          {dg.khachHang?.Email || 'Chưa có email'}
                        </div>
                      </td>

                      {/* Cột Đánh Giá */}
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          {renderSao(dg.SoSao)}
                          <span style={{ fontSize: '0.75rem', color: '#94A3B8' }}>
                            {dg.NgayCapNhat ? new Date(dg.NgayCapNhat).toLocaleString('vi-VN') : ''}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#1E293B', whiteSpace: 'pre-wrap' }}>
                          {dg.NoiDung || <em style={{ color: '#94A3B8' }}>(Không có nhận xét bằng chữ)</em>}
                        </div>
                      </td>

                      {/* Cột Trạng Thái */}
                      <td style={{ textAlign: 'center' }}>
                        {dg.DaAn ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '999px',
                            background: '#FEE2E2',
                            color: '#991B1B',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            <EyeOff size={12} /> Đã bị ẩn
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '999px',
                            background: '#DCFCE7',
                            color: '#166534',
                            fontSize: '0.75rem',
                            fontWeight: 600
                          }}>
                            <Eye size={12} /> Hiển thị
                          </span>
                        )}
                      </td>

                      {/* Cột Thao Tác */}
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          {dg.DaAn ? (
                            <button
                              type="button"
                              className="bo-secondary-button"
                              style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', color: '#166534', borderColor: '#BBF7D0' }}
                              title="Cho phép hiển thị lại trên Storefront"
                              disabled={dangXuLyId === dg.MaDanhGia}
                              onClick={() => xuLyDoiTrangThaiAn(dg.MaDanhGia, false)}
                            >
                              <Eye size={13} /> Hiện
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="bo-secondary-button"
                              style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem', color: '#B45309', borderColor: '#FDE68A' }}
                              title="Ẩn đánh giá khỏi trang Storefront"
                              disabled={dangXuLyId === dg.MaDanhGia}
                              onClick={() => { setDanhGiaCanAn(dg); setLyDoAn(''); }}
                            >
                              <EyeOff size={13} /> Ẩn
                            </button>
                          )}

                          {laQuanTri && (
                            <button
                              type="button"
                              className="bo-danger-button"
                              style={{ padding: '0.3rem 0.55rem', fontSize: '0.75rem' }}
                              title="Xóa vĩnh viễn đánh giá spam"
                              disabled={dangXuLyId === dg.MaDanhGia}
                              onClick={() => setDanhGiaCanXoa(dg)}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Phân trang */}
        <div className="history-pagination">
          <button
            className="bo-secondary-button"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Trước
          </button>
          <span>Trang {page} / {phanTrang.tongSoTrang || 1}</span>
          <button
            className="bo-secondary-button"
            disabled={page >= (phanTrang.tongSoTrang || 1)}
            onClick={() => setPage((p) => p + 1)}
          >
            Sau
          </button>
        </div>
      </section>

      {/* Modal Ẩn đánh giá kèm lý do */}
      {danhGiaCanAn && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            maxWidth: '460px',
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#1E293B' }}>
              Xác nhận ẩn đánh giá #{danhGiaCanAn.MaDanhGia}
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0 0 1rem 0' }}>
              Đánh giá này sẽ bị ẩn khỏi Storefront và không được tính vào điểm số sao trung bình của sách.
            </p>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: '#475569', marginBottom: '0.35rem' }}>
                Lý do ẩn (sẽ lưu vào Lịch sử thay đổi):
              </label>
              <input
                type="text"
                placeholder="Ví dụ: Chứa từ ngữ thô tục, quảng cáo, không liên quan..."
                value={lyDoAn}
                onChange={(e) => setLyDoAn(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.5rem 0.75rem',
                  borderRadius: '6px',
                  border: '1px solid #CBD5E1',
                  fontSize: '0.875rem'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="bo-secondary-button"
                onClick={() => setDanhGiaCanAn(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="bo-danger-button"
                style={{ background: '#D97706', borderColor: '#D97706' }}
                onClick={() => xuLyDoiTrangThaiAn(danhGiaCanAn.MaDanhGia, true, lyDoAn)}
              >
                Xác nhận ẩn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Xác nhận Xóa Vĩnh Viễn */}
      {danhGiaCanXoa && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            background: '#FFFFFF',
            borderRadius: '12px',
            maxWidth: '440px',
            width: '100%',
            padding: '1.5rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#DC2626' }}>
              Xóa vĩnh viễn đánh giá #{danhGiaCanXoa.MaDanhGia}?
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748B', margin: '0 0 1rem 0' }}>
              Hành động này <strong style={{ color: '#DC2626' }}>không thể hoàn tác</strong>. Đánh giá của khách hàng <em>{danhGiaCanXoa.khachHang?.HoTen}</em> cho cuốn sách <em>{danhGiaCanXoa.sach?.TenSach}</em> sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
              <button
                type="button"
                className="bo-secondary-button"
                onClick={() => setDanhGiaCanXoa(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="bo-danger-button"
                onClick={xuLyXoaVinhVien}
              >
                Xác nhận xóa vĩnh viễn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
