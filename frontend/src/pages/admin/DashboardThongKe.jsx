import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  DollarSign, 
  ShoppingBag, 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  PieChart 
} from 'lucide-react';

export const DashboardThongKe = () => {
  const [tongQuan, setTongQuan] = useState({ tongDoanhThu: 0, soDonThanhCong: 0, tongSachDaBan: 0 });
  const [topSach, setTopSach] = useState([]);
  const [tyLeDon, setTyLeDon] = useState([]);
  const [tongDonToanHeThong, setTongDonToanHeThong] = useState(0);

  const [tuNgay, setTuNgay] = useState('');
  const [denNgay, setDenNgay] = useState('');
  const [dangTai, setDangTai] = useState(true);

  const taiThongKe = async (tu, den) => {
    setDangTai(true);
    try {
      const params = {};
      if (tu) params.tuNgay = tu;
      if (den) params.denNgay = den;

      const [resTongQuan, resTopSach, resTyLe] = await Promise.all([
        api.get('/admin/stats/overview', { params }),
        api.get('/admin/stats/top-books', { params: { limit: 5 } }),
        api.get('/admin/stats/order-rates')
      ]);

      setTongQuan(resTongQuan.data.data || {});
      setTopSach(resTopSach.data.data || []);
      const dataTyLe = resTyLe.data.data || {};
      setTyLeDon(dataTyLe.chiTiet);
      setTongDonToanHeThong(dataTyLe.tongSoDon ?? 0);
    } catch (err) {
      console.error('Lỗi tải số liệu thống kê:', err);
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    let daHuy = false;
    const napDuLieuDau = async () => {
      try {
        const [resTongQuan, resTopSach, resTyLe] = await Promise.all([
          api.get('/admin/stats/overview'),
          api.get('/admin/stats/top-books', { params: { limit: 5 } }),
          api.get('/admin/stats/order-rates')
        ]);

        if (daHuy) return;
        setTongQuan(resTongQuan.data.data || {});
        setTopSach(resTopSach.data.data || []);
        const dataTyLe = resTyLe.data.data || {};
        setTyLeDon(dataTyLe.chiTiet);
        setTongDonToanHeThong(dataTyLe.tongSoDon ?? 0);
      } catch (err) {
        console.error('Lỗi tải số liệu thống kê:', err);
      } finally {
        if (!daHuy) setDangTai(false);
      }
    };
    napDuLieuDau();
    return () => {
      daHuy = true;
    };
  }, []);

  const handleLocNgay = (e) => {
    e.preventDefault();
    taiThongKe(tuNgay, denNgay);
  };

  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            Báo Cáo & Thống Kê Doanh Thu
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Tổng hợp dữ liệu kinh doanh từ các giao dịch hoàn tất (DELIVERED)
          </p>
        </div>

        {/* Bộ Lọc Theo Khoảng Thời Gian */}
        <form onSubmit={handleLocNgay} className="flex items-center gap-2">
          <Calendar size={16} style={{ color: 'var(--text-muted)' }} />
          <input
            type="date"
            className="form-input"
            style={{ width: '150px', padding: '0.4rem 0.6rem' }}
            value={tuNgay}
            onChange={(e) => setTuNgay(e.target.value)}
          />
          <span style={{ color: 'var(--text-muted)' }}>–</span>
          <input
            type="date"
            className="form-input"
            style={{ width: '150px', padding: '0.4rem 0.6rem' }}
            value={denNgay}
            onChange={(e) => setDenNgay(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm">
            Lọc
          </button>
        </form>
      </div>

      {dangTai ? (
        <div className="flex justify-center py-12">
          <p className="font-serif" style={{ color: 'var(--text-muted)' }}>Đang trích xuất số liệu thống kê...</p>
        </div>
      ) : (
        <>
          {/* Khối Thẻ Tổng Quan 3 Chỉ Số Chính */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card flex items-center gap-4" style={{ padding: '1.5rem' }}>
              <div style={{
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary)'
              }}>
                <DollarSign size={28} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tổng Doanh Thu</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--primary)', marginTop: '2px' }}>
                  {dinhDangTien(tongQuan.tongDoanhThu)}
                </div>
              </div>
            </div>

            <div className="card flex items-center gap-4" style={{ padding: '1.5rem' }}>
              <div style={{
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: 'var(--accent-light)',
                color: 'var(--accent)'
              }}>
                <ShoppingBag size={28} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Đơn Giao Thành Công</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--accent)', marginTop: '2px' }}>
                  {tongQuan.soDonThanhCong} đơn
                </div>
              </div>
            </div>

            <div className="card flex items-center gap-4" style={{ padding: '1.5rem' }}>
              <div style={{
                padding: '12px',
                borderRadius: '12px',
                backgroundColor: 'var(--info-light)',
                color: 'var(--info)'
              }}>
                <BookOpen size={28} />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Sách Đã Bán Ra</span>
                <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--info)', marginTop: '2px' }}>
                  {tongQuan.tongSachDaBan} cuốn
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Top 5 Sách Bán Chạy Nhất */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={20} style={{ color: 'var(--primary)' }} />
                <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                  Top Tác Phẩm Bán Chạy Nhất
                </h3>
              </div>

              {topSach.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                  Chưa có dữ liệu sách bán ra từ các đơn hoàn tất.
                </p>
              ) : (
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Tác Phẩm</th>
                        <th>Đã Bán</th>
                        <th>Doanh Thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSach.map((s, idx) => (
                        <tr key={s.maSach || idx}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{s.tenSach}</div>
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                              Danh mục: {s.tenDanhMuc}
                            </span>
                          </td>
                          <td style={{ fontWeight: 700, color: 'var(--accent)' }}>
                            {s.daBan} cuốn
                          </td>
                          <td style={{ fontWeight: 600 }}>
                            {dinhDangTien(s.doanhThu)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Bảng Tỷ Lệ Các Trạng Thái Đơn Hàng */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <PieChart size={20} style={{ color: 'var(--primary)' }} />
                <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
                  Tỷ Lệ Trạng Thái Đơn Hàng (Tổng: {tongDonToanHeThong} đơn)
                </h3>
              </div>

              <div className="flex flex-col gap-3">
                {tyLeDon.map((tl) => {
                  let mauSac = 'var(--text-muted)';
                  let tenTiengViet = tl.trangThai;
                  if (tl.trangThai === 'PENDING') { mauSac = 'var(--warning)'; tenTiengViet = 'Chờ duyệt (PENDING)'; }
                  if (tl.trangThai === 'CONFIRMED') { mauSac = 'var(--info)'; tenTiengViet = 'Đã xác nhận (CONFIRMED)'; }
                  if (tl.trangThai === 'SHIPPING') { mauSac = 'var(--primary)'; tenTiengViet = 'Đang giao (SHIPPING)'; }
                  if (tl.trangThai === 'DELIVERED') { mauSac = 'var(--accent)'; tenTiengViet = 'Đã giao (DELIVERED)'; }
                  if (tl.trangThai === 'CANCELLED') { mauSac = 'var(--danger)'; tenTiengViet = 'Đã hủy (CANCELLED)'; }

                  return (
                    <div key={tl.trangThai} style={{ padding: '0.5rem 0' }}>
                      <div className="flex justify-between items-center mb-1" style={{ fontSize: '0.875rem' }}>
                        <span style={{ fontWeight: 500 }}>{tenTiengViet}</span>
                        <span>
                          <strong>{tl.soLuong} đơn</strong> ({tl.tyLe}%)
                        </span>
                      </div>
                      {/* Thanh biểu đồ tỷ lệ */}
                      <div style={{
                        height: '8px',
                        backgroundColor: 'var(--bg-surface)',
                        borderRadius: '999px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${tl.tyLe}%`,
                          backgroundColor: mauSac,
                          transition: 'width 0.4s ease'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardThongKe;
