import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  DollarSign, 
  ShoppingBag, 
  BookOpen, 
  Calendar, 
  TrendingUp, 
  PieChart,
  Filter,
  BarChart3,
  Layers,
  RotateCcw
} from 'lucide-react';

export const DashboardThongKe = () => {
  const [tongQuan, setTongQuan] = useState({ tongDoanhThu: 0, soDonThanhCong: 0, tongSachDaBan: 0 });
  const [topSach, setTopSach] = useState([]);
  const [tyLeDon, setTyLeDon] = useState([]);
  const [tongDonToanHeThong, setTongDonToanHeThong] = useState(0);

  // Nâng cao (T31 + T39)
  const [chuoiDoanhThu, setChuoiDoanhThu] = useState([]);
  const [doanhThuDanhMuc, setDoanhThuDanhMuc] = useState([]);
  const [kieuGomNhom, setKieuGomNhom] = useState('day'); // 'day' hoặc 'month'

  // Bộ lọc
  const [kenhBan, setKenhBan] = useState(''); // '' (tất cả), 'TRUC_TUYEN', 'TAI_QUAY'
  const [tuNgay, setTuNgay] = useState('');
  const [denNgay, setDenNgay] = useState('');
  const [dangTai, setDangTai] = useState(true);
  const [lanTai, setLanTai] = useState(0);

  useEffect(() => {
    let daHuy = false;
    const napDuLieu = async () => {
      try {
        const params = {};
        if (kenhBan) params.kenhBan = kenhBan;
        if (tuNgay) params.tuNgay = tuNgay;
        if (denNgay) params.denNgay = denNgay;

        const paramsChuoi = { ...params, group: kieuGomNhom || 'day' };

        const [resTongQuan, resTopSach, resTyLe, resChuoi, resDanhMuc] = await Promise.all([
          api.get('/admin/stats/overview', { params }),
          api.get('/admin/stats/top-books', { params: { ...params, limit: 5 } }),
          api.get('/admin/stats/order-rates', { params }),
          api.get('/admin/stats/revenue-series', { params: paramsChuoi }),
          api.get('/admin/stats/by-category', { params })
        ]);

        if (daHuy) return;
        setTongQuan(resTongQuan.data.data || {});
        setTopSach(resTopSach.data.data || []);
        const dataTyLe = resTyLe.data.data || {};
        setTyLeDon(dataTyLe.chiTiet || []);
        setTongDonToanHeThong(dataTyLe.tongSoDon ?? 0);
        setChuoiDoanhThu(resChuoi.data.data || []);
        setDoanhThuDanhMuc(resDanhMuc.data.data || []);
      } catch (err) {
        console.error('Lỗi tải số liệu thống kê:', err);
      } finally {
        if (!daHuy) setDangTai(false);
      }
    };

    napDuLieu();
    return () => {
      daHuy = true;
    };
  }, [kenhBan, tuNgay, denNgay, kieuGomNhom, lanTai]);

  const handleLocDuLieu = (e) => {
    if (e) e.preventDefault();
    setDangTai(true);
    setLanTai((n) => n + 1);
  };

  const handleDatLaiLoc = () => {
    setKenhBan('');
    setTuNgay('');
    setDenNgay('');
    setKieuGomNhom('day');
    setDangTai(true);
    setLanTai((n) => n + 1);
  };

  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);
  };

  const coLocDangChay = Boolean(kenhBan || tuNgay || denNgay);

  // Tìm doanh thu lớn nhất trong chuỗi để tính thanh tỷ lệ phần trăm trực quan
  const maxDoanhThuChuoi = chuoiDoanhThu.reduce((max, c) => Math.max(max, c.tongDoanhThu || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Thống Kê Doanh Thu & Vận Hành
          </h1>
          <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Tổng hợp dữ liệu kinh doanh đa kênh (Trực tuyến & Tại quầy), phân tích chuỗi thời gian và cơ cấu thể loại
          </p>
        </div>
      </div>

      {/* Thanh Bộ Lọc Kênh Bán & Thời Gian */}
      <div className="card mb-6" style={{ padding: '0.9rem 1.15rem' }}>
        <form onSubmit={handleLocDuLieu} className="flex items-center flex-wrap gap-3">
          {/* Lọc Kênh Bán (T31) */}
          <div className="flex items-center gap-2">
            <Filter size={15} style={{ color: 'var(--adm-text-muted)' }} />
            <span style={{ fontSize: '0.825rem', color: 'var(--adm-text-muted)' }}>Kênh:</span>
            <select
              className="form-input"
              style={{ width: '160px', padding: '0.4rem 0.65rem', fontSize: '0.825rem' }}
              value={kenhBan}
              onChange={(e) => setKenhBan(e.target.value)}
            >
              <option value="">Tất cả kênh</option>
              <option value="TRUC_TUYEN">Trực tuyến (Online)</option>
              <option value="TAI_QUAY">Tại quầy (POS)</option>
            </select>
          </div>

          {/* Lọc Khoảng Ngày */}
          <div className="flex items-center gap-2">
            <Calendar size={15} style={{ color: 'var(--adm-text-muted)' }} />
            <span style={{ fontSize: '0.825rem', color: 'var(--adm-text-muted)' }}>Từ:</span>
            <input
              type="date"
              className="form-input"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.825rem' }}
              value={tuNgay}
              onChange={(e) => setTuNgay(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span style={{ fontSize: '0.825rem', color: 'var(--adm-text-muted)' }}>Đến:</span>
            <input
              type="date"
              className="form-input"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.825rem' }}
              value={denNgay}
              onChange={(e) => setDenNgay(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0.42rem 0.85rem' }}>
            Lọc Dữ Liệu
          </button>

          {coLocDangChay && (
            <button
              type="button"
              onClick={handleDatLaiLoc}
              className="btn btn-outline btn-sm"
              style={{ padding: '0.42rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <RotateCcw size={13} /> Đặt Lại
            </button>
          )}
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
                {kenhBan === 'TRUC_TUYEN' ? 'Kênh trực tuyến giao thành công' : kenhBan === 'TAI_QUAY' ? 'Bán trực tiếp tại quầy thu ngân' : 'Tổng cả hai kênh trực tuyến & quầy'}
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
                Hoàn tất chu trình luân chuyển đơn
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
                Tổng ấn phẩm đã xuất kho thành công
              </span>
            </div>
          </div>

          {/* Khối Phân Tích Nâng Cao (T39): Chuỗi Thời Gian & Cơ Cấu Danh Mục */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-7">
            {/* Chuỗi Thời Gian Doanh Thu (revenue-series) */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} style={{ color: 'var(--adm-primary)' }} />
                  <h3 style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.01em', margin: 0, color: 'var(--adm-text-main)' }}>
                    Biến Động Doanh Thu Theo Thời Gian
                  </h3>
                </div>
                {/* Nút chuyển đổi gom nhóm ngày / tháng */}
                <div className="inline-flex rounded-md shadow-sm" role="group">
                  <button
                    type="button"
                    onClick={() => setKieuGomNhom('day')}
                    className="btn btn-sm"
                    style={{
                      padding: '0.2rem 0.55rem',
                      fontSize: '0.75rem',
                      borderRadius: '4px 0 0 4px',
                      background: kieuGomNhom === 'day' ? 'var(--adm-primary)' : 'var(--adm-bg-surface, #F1F5F9)',
                      color: kieuGomNhom === 'day' ? '#FFF' : 'var(--adm-text-muted)',
                      border: '1px solid var(--adm-border, #CBD5E1)'
                    }}
                  >
                    Theo Ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setKieuGomNhom('month')}
                    className="btn btn-sm"
                    style={{
                      padding: '0.2rem 0.55rem',
                      fontSize: '0.75rem',
                      borderRadius: '0 4px 4px 0',
                      background: kieuGomNhom === 'month' ? 'var(--adm-primary)' : 'var(--adm-bg-surface, #F1F5F9)',
                      color: kieuGomNhom === 'month' ? '#FFF' : 'var(--adm-text-muted)',
                      border: '1px solid var(--adm-border, #CBD5E1)',
                      borderLeft: 'none'
                    }}
                  >
                    Theo Tháng
                  </button>
                </div>
              </div>

              {chuoiDoanhThu.length === 0 ? (
                <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.85rem' }}>
                  Chưa có dữ liệu giao dịch trong khoảng thời gian này.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {chuoiDoanhThu.slice(-8).map((item) => {
                    const tyLeThanh = maxDoanhThuChuoi > 0 ? (item.tongDoanhThu / maxDoanhThuChuoi) * 100 : 0;
                    return (
                      <div key={item.thoiGian} style={{ fontSize: '0.825rem' }}>
                        <div className="flex justify-between items-center mb-1">
                          <span style={{ fontWeight: 600, color: 'var(--adm-text-main)' }}>
                            {item.thoiGian}
                          </span>
                          <span style={{ color: 'var(--adm-text-muted)' }}>
                            <strong style={{ color: 'var(--adm-primary)' }}>{dinhDangTien(item.tongDoanhThu)}</strong> • {item.soDonThanhCong} đơn ({item.tongSachDaBan} cuốn)
                          </span>
                        </div>
                        <div style={{ height: '6px', background: 'var(--adm-bg-surface, #F1F5F9)', borderRadius: '999px', overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${tyLeThanh}%`,
                              background: 'var(--adm-primary)',
                              borderRadius: '999px',
                              transition: 'width 0.4s ease'
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cơ Cấu Doanh Thu Theo Danh Mục (by-category) */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div className="flex items-center gap-2 mb-4">
                <Layers size={18} style={{ color: 'var(--adm-primary)' }} />
                <h3 style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.01em', margin: 0, color: 'var(--adm-text-main)' }}>
                  Doanh Thu Theo Thể Loại Sách
                </h3>
              </div>

              {doanhThuDanhMuc.length === 0 ? (
                <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.85rem' }}>
                  Chưa có dữ liệu doanh thu theo danh mục.
                </p>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {doanhThuDanhMuc.slice(0, 6).map((dm) => (
                    <div key={dm.maDanhMuc || dm.tenDanhMuc} style={{ fontSize: '0.825rem' }}>
                      <div className="flex justify-between items-center mb-1">
                        <span style={{ fontWeight: 600, color: 'var(--adm-text-main)' }}>
                          {dm.tenDanhMuc}
                        </span>
                        <span style={{ color: 'var(--adm-text-muted)' }}>
                          <strong>{dinhDangTien(dm.doanhThu)}</strong> ({dm.tyLeDoanhThu}%) • {dm.daBan} cuốn
                        </span>
                      </div>
                      <div style={{ height: '6px', background: 'var(--adm-bg-surface, #F1F5F9)', borderRadius: '999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${dm.tyLeDoanhThu}%`,
                            background: '#10B981',
                            borderRadius: '999px',
                            transition: 'width 0.4s ease'
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
