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
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Thống Kê Doanh Thu & Vận Hành
          </h1>
          <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Tổng hợp dữ liệu kinh doanh và luân chuyển đơn hàng trên toàn hệ thống
          </p>
        </div>

        {/* Bộ Lọc Theo Khoảng Thời Gian */}
        <form onSubmit={handleLocNgay} className="flex items-center gap-2">
          <Calendar size={15} style={{ color: 'var(--adm-text-muted)' }} />
          <input
            type="date"
            className="form-input"
            style={{ width: '140px', padding: '0.35rem 0.55rem', fontSize: '0.825rem' }}
            value={tuNgay}
            onChange={(e) => setTuNgay(e.target.value)}
          />
          <span style={{ color: 'var(--adm-text-muted)', fontSize: '0.8rem' }}>–</span>
          <input
            type="date"
            className="form-input"
            style={{ width: '140px', padding: '0.35rem 0.55rem', fontSize: '0.825rem' }}
            value={denNgay}
            onChange={(e) => setDenNgay(e.target.value)}
          />
          <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0.35rem 0.75rem', fontSize: '0.825rem' }}>
            Lọc Dữ Liệu
          </button>
        </form>
      </div>

      {dangTai ? (
        <div className="flex justify-center py-12">
          <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.875rem' }}>Đang tổng hợp dữ liệu thời gian thực...</p>
        </div>
      ) : (
        <>
          {/* Khối Thẻ Tổng Quan 3 Chỉ Số Chính - Minimalist Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
            <div className="admindash-metric-card">
              <div className="admindash-metric-label">
                <span>Tổng Doanh Thu</span>
                <DollarSign size={18} style={{ color: 'var(--adm-primary)' }} />
              </div>
              <div className="admindash-metric-value" style={{ color: 'var(--adm-primary)' }}>
                {dinhDangTien(tongQuan.tongDoanhThu)}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>
                Từ các đơn hàng giao thành công
              </span>
            </div>

            <div className="admindash-metric-card">
              <div className="admindash-metric-label">
                <span>Đơn Giao Thành Công</span>
                <ShoppingBag size={18} style={{ color: 'var(--adm-success)' }} />
              </div>
              <div className="admindash-metric-value" style={{ color: 'var(--adm-success)' }}>
                {tongQuan.soDonThanhCong} <span style={{ fontSize: '1rem', fontWeight: 500 }}>đơn</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>
                Hoàn tất chu trình giao nhận
              </span>
            </div>

            <div className="admindash-metric-card">
              <div className="admindash-metric-label">
                <span>Sách Đã Bán Ra</span>
                <BookOpen size={18} style={{ color: 'var(--adm-info)' }} />
              </div>
              <div className="admindash-metric-value" style={{ color: 'var(--adm-info)' }}>
                {tongQuan.tongSachDaBan} <span style={{ fontSize: '1rem', fontWeight: 500 }}>cuốn</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>
                Tổng ấn phẩm đã xuất kho
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 5 Sách Bán Chạy Nhất */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} style={{ color: 'var(--adm-primary)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.01em', margin: 0, color: 'var(--adm-text-main)' }}>
                  Top Tác Phẩm Bán Chạy Nhất
                </h3>
              </div>

              {topSach.length === 0 ? (
                <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.85rem' }}>
                  Chưa có dữ liệu sách bán ra từ các đơn hoàn tất.
                </p>
              ) : (
                <div className="admindash-table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
                  <table className="admindash-table">
                    <thead>
                      <tr>
                        <th>Tác Phẩm</th>
                        <th>Đã Bán</th>
                        <th style={{ textAlign: 'right' }}>Doanh Thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSach.map((s, idx) => (
                        <tr key={s.maSach || idx}>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--adm-text-main)' }}>{s.tenSach}</div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>
                              Thể loại: {s.tenDanhMuc}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, color: 'var(--adm-success)' }} className="tabular-nums">
                            {s.daBan} cuốn
                          </td>
                          <td style={{ fontWeight: 600, textAlign: 'right', color: 'var(--adm-text-main)' }} className="tabular-nums">
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
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="flex items-center gap-2 mb-4">
                <PieChart size={18} style={{ color: 'var(--adm-primary)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.01em', margin: 0, color: 'var(--adm-text-main)' }}>
                  Tỷ Lệ Trạng Thái Đơn (Tổng: {tongDonToanHeThong} đơn)
                </h3>
              </div>

              <div className="flex flex-col gap-3">
                {tyLeDon.map((tl) => {
                  let mauSac = 'var(--adm-text-muted)';
                  let tenTiengViet = tl.trangThai;
                  if (tl.trangThai === 'CHO_DUYET') { mauSac = 'var(--adm-warning)'; tenTiengViet = 'Chờ duyệt'; }
                  if (tl.trangThai === 'DA_XAC_NHAN') { mauSac = 'var(--adm-info)'; tenTiengViet = 'Đã xác nhận'; }
                  if (tl.trangThai === 'DANG_GIAO') { mauSac = '#7C3AED'; tenTiengViet = 'Đang giao'; }
                  if (tl.trangThai === 'DA_GIAO') { mauSac = 'var(--adm-success)'; tenTiengViet = 'Đã giao'; }
                  if (tl.trangThai === 'DA_HUY') { mauSac = 'var(--adm-danger)'; tenTiengViet = 'Đã hủy'; }

                  return (
                    <div key={tl.trangThai} style={{ padding: '0.5rem 0' }}>
                      <div className="flex justify-between items-center mb-1" style={{ fontSize: '0.875rem' }}>
                        <span style={{ fontWeight: 500, color: 'var(--adm-text-main)' }}>{tenTiengViet}</span>
                        <span style={{ color: 'var(--adm-text-muted)' }}>
                          <strong style={{ color: 'var(--adm-text-main)' }}>{tl.soLuong} đơn</strong> ({tl.tyLe}%)
                        </span>
                      </div>
                      {/* Thanh biểu đồ tỷ lệ */}
                      <div style={{
                        height: '8px',
                        backgroundColor: '#F1F5F9',
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
