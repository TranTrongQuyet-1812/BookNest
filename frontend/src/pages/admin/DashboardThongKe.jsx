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
  RotateCcw,
  RefreshCw
} from 'lucide-react';
import KhoiViecCanLam from './KhoiViecCanLam.jsx';

// Component Skeleton Shimmer Loading theo chuẩn Impeccable (Operate Mode)
function DashboardSkeleton() {
  return (
    <div>
      {/* 3 Metric Cards Shimmer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
        {[1, 2, 3].map((i) => (
          <div key={i} className="admindash-metric-card" style={{ minHeight: '142px' }}>
            <div className="flex items-center justify-between">
              <div className="admindash-skeleton" style={{ width: '120px', height: '14px' }} />
              <div className="admindash-skeleton" style={{ width: '38px', height: '38px', borderRadius: '10px' }} />
            </div>
            <div className="admindash-skeleton my-3" style={{ width: '160px', height: '32px' }} />
            <div className="admindash-skeleton" style={{ width: '190px', height: '12px' }} />
          </div>
        ))}
      </div>

      {/* 2 Khung Biểu Đồ Shimmer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-7">
        {[1, 2].map((i) => (
          <div key={i} className="card" style={{ minHeight: '280px' }}>
            <div className="flex items-center justify-between mb-5">
              <div className="admindash-skeleton" style={{ width: '220px', height: '18px' }} />
              <div className="admindash-skeleton" style={{ width: '140px', height: '26px', borderRadius: '8px' }} />
            </div>
            <div className="flex flex-col gap-3.5">
              {[1, 2, 3, 4, 5].map((j) => (
                <div key={j} className="flex flex-col gap-1.5">
                  <div className="flex justify-between">
                    <div className="admindash-skeleton" style={{ width: '90px', height: '13px' }} />
                    <div className="admindash-skeleton" style={{ width: '160px', height: '13px' }} />
                  </div>
                  <div className="admindash-skeleton" style={{ width: '100%', height: '7px', borderRadius: '999px' }} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 2 Khung Bảng & Tỷ lệ Shimmer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <div key={i} className="card" style={{ minHeight: '260px' }}>
            <div className="admindash-skeleton mb-4" style={{ width: '200px', height: '18px' }} />
            <div className="flex flex-col gap-3">
              {[1, 2, 3, 4].map((j) => (
                <div key={j} className="admindash-skeleton" style={{ width: '100%', height: '38px' }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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

  const handleLamMoi = () => {
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
      {/* Header trang chuẩn phong cách Impeccable Operate */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.12em', color: 'var(--adm-primary)', textTransform: 'uppercase' }}>
              Trung Tâm Điều Hành
            </span>
            <span style={{ width: '4px', height: '4px', borderRadius: '50%', background: 'var(--adm-border-strong)' }} />
            <span style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10B981', display: 'inline-block' }} />
              Số liệu thời gian thực
            </span>
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em', margin: 0, color: 'var(--adm-text-main)' }}>
            Thống Kê Doanh Thu & Vận Hành
          </h1>
          <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.84rem', marginTop: '0.2rem' }}>
            Tổng hợp dữ liệu kinh doanh đa kênh (Trực tuyến & Quầy POS), phân tích chuỗi thời gian và cơ cấu thể loại
          </p>
        </div>

        {/* Nút làm mới dữ liệu mượt mà */}
        <button
          type="button"
          onClick={handleLamMoi}
          disabled={dangTai}
          title="Cập nhật lại số liệu mới nhất"
          className="btn btn-outline"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.45rem 0.85rem',
            fontSize: '0.825rem',
            borderRadius: '8px'
          }}
        >
          <RefreshCw size={14} className={dangTai ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Khối Việc Cần Làm Theo Vai Trò (T40) */}
      <KhoiViecCanLam />

      {/* Thanh Bộ Lọc Kênh Bán & Thời Gian (Command Bar Filter) */}
      <div className="card mb-6" style={{ padding: '0.9rem 1.25rem' }}>
        <form onSubmit={handleLocDuLieu} className="flex items-center flex-wrap gap-3.5">
          {/* Lọc Kênh Bán (T31) */}
          <div className="flex items-center gap-2">
            <Filter size={15} style={{ color: 'var(--adm-text-muted)' }} />
            <span style={{ fontSize: '0.825rem', color: 'var(--adm-text-muted)', fontWeight: 500 }}>Kênh:</span>
            <select
              className="form-input"
              style={{ width: '165px', padding: '0.4rem 0.65rem', fontSize: '0.825rem', borderRadius: '8px' }}
              value={kenhBan}
              onChange={(e) => setKenhBan(e.target.value)}
            >
              <option value="">Tất cả kênh bán</option>
              <option value="TRUC_TUYEN">Trực tuyến (Online)</option>
              <option value="TAI_QUAY">Tại quầy (POS)</option>
            </select>
          </div>

          {/* Lọc Khoảng Ngày */}
          <div className="flex items-center gap-2">
            <Calendar size={15} style={{ color: 'var(--adm-text-muted)' }} />
            <span style={{ fontSize: '0.825rem', color: 'var(--adm-text-muted)', fontWeight: 500 }}>Từ:</span>
            <input
              type="date"
              className="form-input"
              style={{ padding: '0.4rem 0.65rem', fontSize: '0.825rem', borderRadius: '8px' }}
              value={tuNgay}
              onChange={(e) => setTuNgay(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <span style={{ fontSize: '0.825rem', color: 'var(--adm-text-muted)', fontWeight: 500 }}>Đến:</span>
            <input
              type="date"
              className="form-input"
              style={{ padding: '0.4rem 0.65rem', fontSize: '0.825rem', borderRadius: '8px' }}
              value={denNgay}
              onChange={(e) => setDenNgay(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ 
              padding: '0.45rem 0.95rem', 
              fontSize: '0.825rem', 
              borderRadius: '8px',
              fontWeight: 600,
              boxShadow: '0 1px 2px rgba(37, 99, 235, 0.2)' 
            }}
          >
            Lọc Dữ Liệu
          </button>

          {coLocDangChay && (
            <button
              type="button"
              onClick={handleDatLaiLoc}
              className="btn btn-outline"
              style={{ 
                padding: '0.45rem 0.85rem', 
                fontSize: '0.825rem', 
                borderRadius: '8px', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.35rem' 
              }}
            >
              <RotateCcw size={13} /> Đặt Lại
            </button>
          )}
        </form>
      </div>

      {/* Hiển thị Skeleton Loading Shimmer khi đang nạp */}
      {dangTai ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Khối Thẻ Tổng Quan 3 Chỉ Số Chính - Metric Cards Chuẩn Impeccable */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
            <div className="admindash-metric-card">
              <div className="admindash-metric-label">
                <span>Tổng Doanh Thu</span>
                <div className="admindash-icon-box primary">
                  <DollarSign size={20} />
                </div>
              </div>
              <div className="admindash-metric-value" style={{ color: 'var(--adm-primary)' }}>
                {dinhDangTien(tongQuan.tongDoanhThu)}
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>
                {kenhBan === 'TRUC_TUYEN' ? 'Kênh trực tuyến giao thành công' : kenhBan === 'TAI_QUAY' ? 'Bán trực tiếp tại quầy thu ngân' : 'Tổng hợp cả hai kênh trực tuyến & quầy'}
              </span>
            </div>

            <div className="admindash-metric-card">
              <div className="admindash-metric-label">
                <span>Đơn Giao Thành Công</span>
                <div className="admindash-icon-box success">
                  <ShoppingBag size={20} />
                </div>
              </div>
              <div className="admindash-metric-value" style={{ color: 'var(--adm-success)' }}>
                {tongQuan.soDonThanhCong} <span style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--adm-text-muted)' }}>đơn</span>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>
                Hoàn tất chu trình luân chuyển đơn hàng
              </span>
            </div>

            <div className="admindash-metric-card">
              <div className="admindash-metric-label">
                <span>Sách Đã Bán Ra</span>
                <div className="admindash-icon-box info">
                  <BookOpen size={20} />
                </div>
              </div>
              <div className="admindash-metric-value" style={{ color: 'var(--adm-info)' }}>
                {tongQuan.tongSachDaBan} <span style={{ fontSize: '1.05rem', fontWeight: 500, color: 'var(--adm-text-muted)' }}>cuốn</span>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>
                Tổng ấn phẩm đã xuất kho thành công
              </span>
            </div>
          </div>

          {/* Khối Phân Tích Nâng Cao: Chuỗi Thời Gian & Cơ Cấu Danh Mục */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-7">
            {/* Chuỗi Thời Gian Doanh Thu (revenue-series) */}
            <div className="card">
              <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 size={18} style={{ color: 'var(--adm-primary)' }} />
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 600, letterSpacing: '-0.015em', margin: 0, color: 'var(--adm-text-main)' }}>
                    Biến Động Doanh Thu Theo Thời Gian
                  </h3>
                </div>
                {/* Segmented Control chuyển đổi Ngày / Tháng */}
                <div className="admindash-segmented" role="group">
                  <button
                    type="button"
                    onClick={() => setKieuGomNhom('day')}
                    className={`admindash-segmented-btn ${kieuGomNhom === 'day' ? 'active' : ''}`}
                  >
                    Theo Ngày
                  </button>
                  <button
                    type="button"
                    onClick={() => setKieuGomNhom('month')}
                    className={`admindash-segmented-btn ${kieuGomNhom === 'month' ? 'active' : ''}`}
                  >
                    Theo Tháng
                  </button>
                </div>
              </div>

              {chuoiDoanhThu.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.85rem' }}>
                  Chưa có dữ liệu giao dịch trong khoảng thời gian này.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {chuoiDoanhThu.slice(-8).map((item) => {
                    const tyLeThanh = maxDoanhThuChuoi > 0 ? (item.tongDoanhThu / maxDoanhThuChuoi) * 100 : 0;
                    return (
                      <div key={item.thoiGian} className="admindash-chart-row" style={{ fontSize: '0.825rem' }}>
                        <div className="flex justify-between items-center mb-1">
                          <span style={{ fontWeight: 600, color: 'var(--adm-text-main)', letterSpacing: '-0.01em' }}>
                            {item.thoiGian}
                          </span>
                          <span style={{ color: 'var(--adm-text-muted)' }}>
                            <strong style={{ color: 'var(--adm-primary)' }}>{dinhDangTien(item.tongDoanhThu)}</strong> • {item.soDonThanhCong} đơn ({item.tongSachDaBan} cuốn)
                          </span>
                        </div>
                        <div className="admindash-progress-track">
                          <div
                            className="admindash-progress-bar primary"
                            style={{ width: `${tyLeThanh}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Cơ Cấu Doanh Thu Theo Danh Mục (by-category) */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <Layers size={18} style={{ color: 'var(--adm-primary)' }} />
                <h3 style={{ fontSize: '0.98rem', fontWeight: 600, letterSpacing: '-0.015em', margin: 0, color: 'var(--adm-text-main)' }}>
                  Doanh Thu Theo Thể Loại Sách
                </h3>
              </div>

              {doanhThuDanhMuc.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.85rem' }}>
                  Chưa có dữ liệu doanh thu theo danh mục.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {doanhThuDanhMuc.slice(0, 6).map((dm) => (
                    <div key={dm.maDanhMuc || dm.tenDanhMuc} className="admindash-chart-row" style={{ fontSize: '0.825rem' }}>
                      <div className="flex justify-between items-center mb-1">
                        <span style={{ fontWeight: 600, color: 'var(--adm-text-main)', letterSpacing: '-0.01em' }}>
                          {dm.tenDanhMuc}
                        </span>
                        <span style={{ color: 'var(--adm-text-muted)' }}>
                          <strong style={{ color: 'var(--adm-text-main)' }}>{dinhDangTien(dm.doanhThu)}</strong> ({dm.tyLeDoanhThu}%) • {dm.daBan} cuốn
                        </span>
                      </div>
                      <div className="admindash-progress-track">
                        <div
                          className="admindash-progress-bar success"
                          style={{ width: `${dm.tyLeDoanhThu}%` }}
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
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp size={18} style={{ color: 'var(--adm-primary)' }} />
                <h3 style={{ fontSize: '0.98rem', fontWeight: 600, letterSpacing: '-0.015em', margin: 0, color: 'var(--adm-text-main)' }}>
                  Top Tác Phẩm Bán Chạy Nhất
                </h3>
              </div>

              {topSach.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--adm-text-muted)', fontSize: '0.85rem' }}>
                  Chưa có dữ liệu sách bán ra từ các đơn hoàn tất.
                </div>
              ) : (
                <div className="admindash-table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
                  <table className="admindash-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Tác Phẩm</th>
                        <th>Đã Bán</th>
                        <th style={{ textAlign: 'right' }}>Doanh Thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSach.map((s, idx) => (
                        <tr key={s.maSach || idx}>
                          <td style={{ width: '36px', color: 'var(--adm-text-muted)', fontWeight: 600, fontSize: '0.8rem' }}>
                            {idx + 1}
                          </td>
                          <td>
                            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--adm-text-main)' }}>{s.tenSach}</div>
                            <span style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>
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
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <PieChart size={18} style={{ color: 'var(--adm-primary)' }} />
                <h3 style={{ fontSize: '0.98rem', fontWeight: 600, letterSpacing: '-0.015em', margin: 0, color: 'var(--adm-text-main)' }}>
                  Tỷ Lệ Trạng Thái Đơn (Tổng: {tongDonToanHeThong} đơn)
                </h3>
              </div>

              <div className="flex flex-col gap-2.5">
                {tyLeDon.map((tl) => {
                  let mauSac = 'var(--adm-text-muted)';
                  let tenTiengViet = tl.trangThai;
                  if (tl.trangThai === 'CHO_DUYET') { mauSac = 'var(--adm-warning)'; tenTiengViet = 'Chờ duyệt'; }
                  if (tl.trangThai === 'DA_DUYET') { mauSac = 'var(--adm-info)'; tenTiengViet = 'Đã duyệt'; }
                  if (tl.trangThai === 'DA_LAY_HANG') { mauSac = '#7C3AED'; tenTiengViet = 'Đã lấy hàng'; }
                  if (tl.trangThai === 'DA_GIAO') { mauSac = 'var(--adm-success)'; tenTiengViet = 'Đã giao'; }
                  if (tl.trangThai === 'DA_HUY') { mauSac = 'var(--adm-danger)'; tenTiengViet = 'Đã hủy'; }

                  return (
                    <div key={tl.trangThai} className="admindash-chart-row" style={{ padding: '0.45rem 0.65rem' }}>
                      <div className="flex justify-between items-center mb-1" style={{ fontSize: '0.85rem' }}>
                        <span style={{ fontWeight: 600, color: 'var(--adm-text-main)' }}>{tenTiengViet}</span>
                        <span style={{ color: 'var(--adm-text-muted)', fontSize: '0.8rem' }}>
                          <strong style={{ color: 'var(--adm-text-main)' }}>{tl.soLuong} đơn</strong> ({tl.tyLe}%)
                        </span>
                      </div>
                      {/* Thanh biểu đồ tỷ lệ mượt mà */}
                      <div className="admindash-progress-track">
                        <div style={{
                          height: '100%',
                          width: `${tl.tyLe}%`,
                          backgroundColor: mauSac,
                          borderRadius: '999px',
                          transition: 'width 0.6s cubic-bezier(0.16, 1, 0.3, 1)'
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
