import React, { useState, useEffect, useRef } from 'react';
import api from '@booknest/shared/api';
import {
  Calendar,
  Filter,
  BarChart3,
  Layers,
  RotateCcw,
  RefreshCw,
  BookOpen,
  PieChart
} from 'lucide-react';
import KhoiViecCanLam from './KhoiViecCanLam.jsx';

// Component Skeleton Shimmer Loading theo chuẩn Impeccable (Operate Mode)
function DashboardSkeleton() {
  return (
    <div>
      {/* 3 Metric Cards Shimmer */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
        {[1, 2, 3].map((i) => (
          <div key={i} className="admindash-kpi-card" style={{ minHeight: '135px' }}>
            <div className="admindash-skeleton mb-3" style={{ width: '130px', height: '14px' }} />
            <div className="admindash-skeleton mb-3" style={{ width: '170px', height: '32px' }} />
            <div className="admindash-skeleton" style={{ width: '190px', height: '12px' }} />
          </div>
        ))}
      </div>

      {/* 2 Khung Biểu Đồ Shimmer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-7">
        {[1, 2].map((i) => (
          <div key={i} className="card" style={{ minHeight: '300px' }}>
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

      {/* 2 Khung Bảng Shimmer */}
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

// Biểu Đồ Cột SVG Thực Thụ (Interactive Column Chart) cho Doanh Thu Chuỗi Thời Gian
function BieuDoCotDoanhThu({ duLieu = [], kieuGomNhom, setKieuGomNhom, dinhDangTien }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const containerRef = useRef(null);

  const dsHienThi = duLieu.slice(-10); // Lấy tối đa 10 mốc gần nhất để cột vừa vặn, không bị chen chúc
  const maxDoanhThu = dsHienThi.reduce((max, d) => Math.max(max, Number(d.tongDoanhThu) || 0), 0);

  // Tính mức trần đẹp (nice ceiling) cho trục Y
  const ceilingY = maxDoanhThu > 0 ? Math.ceil(maxDoanhThu / 500000) * 500000 : 1000000;
  const gridTicks = [ceilingY, Math.round(ceilingY * 0.66), Math.round(ceilingY * 0.33), 0];

  const svgWidth = 580;
  const svgHeight = 200;
  const paddingLeft = 58;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 32;
  const chartW = svgWidth - paddingLeft - paddingRight;
  const chartH = svgHeight - paddingTop - paddingBottom;

  const barCount = dsHienThi.length;
  const slotWidth = barCount > 0 ? chartW / barCount : 0;
  const barWidth = Math.min(32, Math.max(16, slotWidth * 0.55));

  // Định dạng ngày hiển thị ngắn (VD: 2026-10-08 -> 08/10)
  const rutGonNgay = (chuoiNgay) => {
    if (!chuoiNgay) return '';
    if (kieuGomNhom === 'month') return `T${chuoiNgay.slice(5, 7)}/${chuoiNgay.slice(2, 4)}`;
    return chuoiNgay.slice(8, 10) + '/' + chuoiNgay.slice(5, 7);
  };

  const hoveredItem = hoveredIdx !== null ? dsHienThi[hoveredIdx] : null;

  return (
    <div className="card" style={{ position: 'relative' }}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={17} style={{ color: '#2563EB' }} />
            <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#0F172A', letterSpacing: '-0.015em' }}>
              Biến Động Doanh Thu Theo Thời Gian
            </h3>
          </div>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748B' }}>
            Biểu đồ cột theo {kieuGomNhom === 'day' ? 'từng ngày phát sinh đơn' : 'từng tháng trong năm'}
          </p>
        </div>

        {/* Segmented Control chuyển Ngày / Tháng */}
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

      {dsHienThi.length === 0 ? (
        <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
          Chưa có dữ liệu giao dịch trong khoảng thời gian này.
        </div>
      ) : (
        <div ref={containerRef} style={{ position: 'relative', width: '100%', overflowX: 'auto' }}>
          {/* Tooltip nổi tương tác */}
          {hoveredItem && (
            <div 
              className="admindash-chart-tooltip"
              style={{
                top: '12px',
                right: '16px'
              }}
            >
              <div style={{ fontWeight: 700, marginBottom: '2px', color: '#93C5FD' }}>
                {hoveredItem.thoiGian}
              </div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#FFFFFF' }}>
                {dinhDangTien(hoveredItem.tongDoanhThu)}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#CBD5E1', marginTop: '2px' }}>
                {hoveredItem.soDonThanhCong} đơn hàng • {hoveredItem.tongSachDaBan} ấn phẩm
              </div>
            </div>
          )}

          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            style={{ width: '100%', height: 'auto', display: 'block' }}
          >
            {/* Lưới ngang (Horizontal Gridlines) */}
            {gridTicks.map((tick, i) => {
              const y = paddingTop + (i / (gridTicks.length - 1)) * chartH;
              return (
                <g key={i}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke="#E2E8F0"
                    strokeWidth="1"
                    strokeDasharray={i === gridTicks.length - 1 ? '0' : '3 3'}
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9.5"
                    fill="#94A3B8"
                    fontFamily="inherit"
                    fontWeight="500"
                  >
                    {tick >= 1000000 ? `${(tick / 1000000).toFixed(1)}M` : tick >= 1000 ? `${(tick / 1000).toFixed(0)}k` : '0đ'}
                  </text>
                </g>
              );
            })}

            {/* Các Cột Doanh Thu Dựng Đứng */}
            {dsHienThi.map((item, idx) => {
              const val = Number(item.tongDoanhThu) || 0;
              const barH = ceilingY > 0 ? (val / ceilingY) * chartH : 0;
              const x = paddingLeft + idx * slotWidth + (slotWidth - barWidth) / 2;
              const y = paddingTop + chartH - barH;
              const isHovered = hoveredIdx === idx;
              const isPeak = val === maxDoanhThu && val > 0;

              return (
                <g 
                  key={item.thoiGian || idx}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Cột chính */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(barH, 3)}
                    rx="4"
                    fill={isHovered ? '#1D4ED8' : isPeak ? '#2563EB' : '#60A5FA'}
                    style={{ transition: 'fill 0.15s ease, height 0.4s ease' }}
                  />

                  {/* Vùng cảm ứng chuột mở rộng */}
                  <rect
                    x={paddingLeft + idx * slotWidth}
                    y={paddingTop}
                    width={slotWidth}
                    height={chartH}
                    fill="transparent"
                  />

                  {/* Nhãn Ngày bên dưới */}
                  <text
                    x={x + barWidth / 2}
                    y={svgHeight - 12}
                    textAnchor="middle"
                    fontSize="10"
                    fill={isHovered ? '#0F172A' : '#64748B'}
                    fontWeight={isHovered ? '700' : '500'}
                    fontFamily="inherit"
                  >
                    {rutGonNgay(item.thoiGian)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}
    </div>
  );
}

// Bảng Tỷ Lệ Đơn Hàng Dạng Stacked Multi-Color Segmented Meter
function BieuDoTyLeDonHang({ tyLeDon = [], tongDonToanHeThong = 0 }) {
  const cauHinhTrangThai = {
    DA_GIAO: { ten: 'Đã giao thành công', mau: '#059669', bgBadge: '#ECFDF5' },
    CHO_DUYET: { ten: 'Chờ duyệt', mau: '#D97706', bgBadge: '#FFFBEB' },
    DA_DUYET: { ten: 'Đã duyệt (Chờ soạn)', mau: '#2563EB', bgBadge: '#EFF6FF' },
    DA_LAY_HANG: { ten: 'Đã lấy hàng (Đang giao)', mau: '#7C3AED', bgBadge: '#F5F3FF' },
    DA_HUY: { ten: 'Đã hủy', mau: '#DC2626', bgBadge: '#FEF2F2' }
  };

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PieChart size={17} style={{ color: '#2563EB' }} />
          <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#0F172A', letterSpacing: '-0.015em' }}>
            Cơ Cấu Trạng Thái Đơn Hàng
          </h3>
        </div>
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748B' }}>
          Tổng số: <strong style={{ color: '#0F172A' }}>{tongDonToanHeThong} đơn</strong>
        </span>
      </div>

      {/* Thanh phân bổ 100% liền mạch (Unified 100% Stacked Bar) */}
      <div style={{
        height: '14px',
        backgroundColor: '#F1F5F9',
        borderRadius: '999px',
        overflow: 'hidden',
        display: 'flex',
        gap: '2px',
        padding: '2px',
        border: '1px solid #E2E8F0',
        marginBottom: '1.25rem'
      }}>
        {tyLeDon.map((tl) => {
          const cfg = cauHinhTrangThai[tl.trangThai] || { mau: '#94A3B8' };
          const tyLe = Number(tl.tyLe) || 0;
          if (tyLe <= 0) return null;
          return (
            <div
              key={tl.trangThai}
              title={`${cfg.ten}: ${tl.soLuong} đơn (${tl.tyLe}%)`}
              style={{
                height: '100%',
                width: `${tyLe}%`,
                backgroundColor: cfg.mau,
                borderRadius: '999px',
                transition: 'width 0.5s ease'
              }}
            />
          );
        })}
      </div>

      {/* Danh sách giải nghĩa kèm số liệu chi tiết */}
      <div className="flex flex-col gap-2">
        {tyLeDon.map((tl) => {
          const cfg = cauHinhTrangThai[tl.trangThai] || { ten: tl.trangThai, mau: '#94A3B8' };
          return (
            <div 
              key={tl.trangThai}
              className="admindash-chart-row"
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'space-between', 
                padding: '0.45rem 0.65rem',
                fontSize: '0.825rem' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                <span style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: cfg.mau,
                  flexShrink: 0
                }} />
                <span style={{ fontWeight: 600, color: '#334155' }}>
                  {cfg.ten}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ color: '#0F172A', fontWeight: 700 }} className="tabular-nums">
                  {tl.soLuong} đơn
                </span>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  color: cfg.mau,
                  backgroundColor: '#F8FAFC',
                  padding: '0.15rem 0.45rem',
                  borderRadius: '4px',
                  border: '1px solid #E2E8F0',
                  minWidth: '42px',
                  textAlign: 'right'
                }} className="tabular-nums">
                  {tl.tyLe}%
                </span>
              </div>
            </div>
          );
        })}
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
  const [presetChon, setPresetChon] = useState('all'); // 'all', 'today', '7days', '30days'
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

  const apDungPreset = (kieu) => {
    setPresetChon(kieu);
    const bayGio = new Date();
    const dinhDangYmd = (d) => d.toISOString().split('T')[0];

    if (kieu === 'all') {
      setTuNgay('');
      setDenNgay('');
    } else if (kieu === 'today') {
      const homNay = dinhDangYmd(bayGio);
      setTuNgay(homNay);
      setDenNgay(homNay);
    } else if (kieu === '7days') {
      const bayNgayTruoc = new Date(bayGio);
      bayNgayTruoc.setDate(bayGio.getDate() - 7);
      setTuNgay(dinhDangYmd(bayNgayTruoc));
      setDenNgay(dinhDangYmd(bayGio));
    } else if (kieu === '30days') {
      const baMuoiNgayTruoc = new Date(bayGio);
      baMuoiNgayTruoc.setDate(bayGio.getDate() - 30);
      setTuNgay(dinhDangYmd(baMuoiNgayTruoc));
      setDenNgay(dinhDangYmd(bayGio));
    }

    setDangTai(true);
    setLanTai((n) => n + 1);
  };

  const handleDatLaiLoc = () => {
    setKenhBan('');
    setTuNgay('');
    setDenNgay('');
    setPresetChon('all');
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

  return (
    <div>
      {/* Tiêu đề trang SaaS phẳng, thanh thoát, không có eyebrow loè loẹt */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 800, letterSpacing: '-0.025em', margin: 0, color: '#0F172A' }}>
            Thống Kê Doanh Thu & Vận Hành
          </h1>
          <p style={{ color: '#64748B', fontSize: '0.825rem', marginTop: '0.2rem' }}>
            Tổng hợp dữ liệu kinh doanh đa kênh (Trực tuyến & Quầy POS) • Báo cáo tài chính BookNest
          </p>
        </div>

        {/* Nút Làm Mới duy nhất của toàn trang */}
        <button
          type="button"
          onClick={handleLamMoi}
          disabled={dangTai}
          title="Đồng bộ lại số liệu mới nhất"
          className="btn btn-outline"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            padding: '0.45rem 0.85rem',
            fontSize: '0.825rem',
            borderRadius: '8px',
            borderColor: '#CBD5E1'
          }}
        >
          <RefreshCw size={13} className={dangTai ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Khối Việc Cần Làm Theo Vai Trò (T40) */}
      <KhoiViecCanLam />

      {/* Thanh Điều Khiển Bộ Lọc Chuẩn Command Toolbar */}
      <div 
        className="card mb-6" 
        style={{ 
          padding: '0.85rem 1.15rem',
          backgroundColor: '#FFFFFF',
          borderRadius: '12px',
          border: '1px solid #E2E8F0',
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Nhóm Nút Chọn Nhanh Khoảng Thời Gian (Pills) */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748B', marginRight: '0.25rem' }}>
              Thời gian:
            </span>
            <button
              type="button"
              onClick={() => apDungPreset('all')}
              className={`admindash-preset-pill ${presetChon === 'all' && !tuNgay && !denNgay ? 'active' : ''}`}
            >
              Toàn bộ
            </button>
            <button
              type="button"
              onClick={() => apDungPreset('today')}
              className={`admindash-preset-pill ${presetChon === 'today' ? 'active' : ''}`}
            >
              Hôm nay
            </button>
            <button
              type="button"
              onClick={() => apDungPreset('7days')}
              className={`admindash-preset-pill ${presetChon === '7days' ? 'active' : ''}`}
            >
              7 ngày qua
            </button>
            <button
              type="button"
              onClick={() => apDungPreset('30days')}
              className={`admindash-preset-pill ${presetChon === '30days' ? 'active' : ''}`}
            >
              30 ngày qua
            </button>
          </div>

          {/* Form lọc kênh & ngày tùy chỉnh */}
          <form onSubmit={handleLocDuLieu} className="flex items-center flex-wrap gap-2.5">
            {/* Lọc Kênh Bán */}
            <div className="flex items-center gap-1.5">
              <Filter size={13} style={{ color: '#64748B' }} />
              <select
                className="form-input"
                style={{ 
                  width: '150px', 
                  padding: '0.35rem 0.55rem', 
                  fontSize: '0.8rem', 
                  borderRadius: '6px',
                  borderColor: '#CBD5E1' 
                }}
                value={kenhBan}
                onChange={(e) => {
                  setKenhBan(e.target.value);
                  setDangTai(true);
                  setLanTai((n) => n + 1);
                }}
              >
                <option value="">Tất cả kênh</option>
                <option value="TRUC_TUYEN">Trực tuyến (Online)</option>
                <option value="TAI_QUAY">Tại quầy (POS)</option>
              </select>
            </div>

            {/* Ô chọn ngày từ - đến */}
            <div className="flex items-center gap-1.5">
              <Calendar size={13} style={{ color: '#64748B' }} />
              <input
                type="date"
                className="form-input"
                style={{ 
                  padding: '0.35rem 0.55rem', 
                  fontSize: '0.8rem', 
                  borderRadius: '6px',
                  borderColor: '#CBD5E1' 
                }}
                value={tuNgay}
                onChange={(e) => {
                  setTuNgay(e.target.value);
                  setPresetChon('custom');
                }}
              />
              <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>–</span>
              <input
                type="date"
                className="form-input"
                style={{ 
                  padding: '0.35rem 0.55rem', 
                  fontSize: '0.8rem', 
                  borderRadius: '6px',
                  borderColor: '#CBD5E1' 
                }}
                value={denNgay}
                onChange={(e) => {
                  setDenNgay(e.target.value);
                  setPresetChon('custom');
                }}
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ 
                padding: '0.38rem 0.85rem', 
                fontSize: '0.8rem', 
                borderRadius: '6px',
                fontWeight: 600,
                backgroundColor: '#0F172A',
                borderColor: '#0F172A'
              }}
            >
              Lọc
            </button>

            {coLocDangChay && (
              <button
                type="button"
                onClick={handleDatLaiLoc}
                className="btn btn-outline"
                style={{ 
                  padding: '0.38rem 0.75rem', 
                  fontSize: '0.8rem', 
                  borderRadius: '6px', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.3rem',
                  borderColor: '#CBD5E1'
                }}
              >
                <RotateCcw size={12} /> Đặt lại
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Hiển thị Skeleton Loading Shimmer khi đang nạp */}
      {dangTai ? (
        <DashboardSkeleton />
      ) : (
        <>
          {/* Khối 3 Chỉ Số Chính - Typography-First KPIs (Không icon pastel) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-7">
            {/* KPI 1: Doanh Thu */}
            <div className="admindash-kpi-card">
              <div className="admindash-kpi-label">
                Tổng Doanh Thu Thực Tế
              </div>
              <div className="admindash-kpi-val" style={{ color: '#0F172A' }}>
                {dinhDangTien(tongQuan.tongDoanhThu)}
              </div>
              <div className="admindash-kpi-sub">
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#10B981', flexShrink: 0 }} />
                <span>
                  {kenhBan === 'TRUC_TUYEN' ? 'Kênh trực tuyến đã giao thành công' : kenhBan === 'TAI_QUAY' ? 'Thanh toán trực tiếp tại quầy POS' : 'Hợp nhất hai kênh: Trực tuyến & Quầy'}
                </span>
              </div>
            </div>

            {/* KPI 2: Đơn Giao Thành Công */}
            <div className="admindash-kpi-card">
              <div className="admindash-kpi-label">
                Đơn Giao Thành Công
              </div>
              <div className="admindash-kpi-val" style={{ color: '#0F172A' }}>
                {tongQuan.soDonThanhCong}{' '}
                <span style={{ fontSize: '1.05rem', fontWeight: 500, color: '#64748B' }}>đơn</span>
              </div>
              <div className="admindash-kpi-sub">
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#2563EB', flexShrink: 0 }} />
                <span>
                  Hoàn tất quy trình luân chuyển đơn hàng
                </span>
              </div>
            </div>

            {/* KPI 3: Sách Đã Xuất Kho */}
            <div className="admindash-kpi-card">
              <div className="admindash-kpi-label">
                Sách Đã Bán Ra
              </div>
              <div className="admindash-kpi-val" style={{ color: '#0F172A' }}>
                {tongQuan.tongSachDaBan}{' '}
                <span style={{ fontSize: '1.05rem', fontWeight: 500, color: '#64748B' }}>cuốn</span>
              </div>
              <div className="admindash-kpi-sub">
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: '#7C3AED', flexShrink: 0 }} />
                <span>
                  Bình quân {(tongQuan.soDonThanhCong > 0 ? (tongQuan.tongSachDaBan / tongQuan.soDonThanhCong).toFixed(1) : 0)} cuốn / đơn hàng
                </span>
              </div>
            </div>
          </div>

          {/* Khối Phân Tích Dữ Liệu: Biểu Đồ Cột SVG & Cơ Cấu Danh Mục */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-7">
            {/* 1. Biểu Đồ Cột SVG Thực Thụ */}
            <BieuDoCotDoanhThu 
              duLieu={chuoiDoanhThu} 
              kieuGomNhom={kieuGomNhom} 
              setKieuGomNhom={setKieuGomNhom} 
              dinhDangTien={dinhDangTien} 
            />

            {/* 2. Cơ Cấu Doanh Thu Theo Danh Mục */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Layers size={17} style={{ color: '#2563EB' }} />
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#0F172A', letterSpacing: '-0.015em' }}>
                    Doanh Thu Theo Thể Loại Sách
                  </h3>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  Top {doanhThuDanhMuc.length} thể loại dẫn đầu
                </span>
              </div>

              {doanhThuDanhMuc.length === 0 ? (
                <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                  Chưa có dữ liệu phân loại sách bán ra.
                </div>
              ) : (
                <div className="flex flex-col gap-2.5">
                  {doanhThuDanhMuc.slice(0, 6).map((dm) => (
                    <div key={dm.maDanhMuc || dm.tenDanhMuc} className="admindash-chart-row" style={{ padding: '0.45rem 0.65rem' }}>
                      <div className="flex justify-between items-center mb-1" style={{ fontSize: '0.825rem' }}>
                        <span style={{ fontWeight: 600, color: '#1E293B' }}>
                          {dm.tenDanhMuc}
                        </span>
                        <span style={{ color: '#64748B' }}>
                          <strong style={{ color: '#0F172A' }}>{dinhDangTien(dm.doanhThu)}</strong> ({dm.tyLeDoanhThu}%) • {dm.daBan} cuốn
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

          {/* Khối Dưới: Top Tác Phẩm Bán Chạy (Có Thumbnail) & Cơ Cấu Trạng Thái Đơn Hàng */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 1. Top Tác Phẩm Bán Chạy (Có Bìa Sách Thumbnail + Rank Badges) */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen size={17} style={{ color: '#2563EB' }} />
                  <h3 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#0F172A', letterSpacing: '-0.015em' }}>
                    Top Tác Phẩm Bán Chạy Nhất
                  </h3>
                </div>
                <span style={{ fontSize: '0.78rem', color: '#64748B' }}>
                  Xếp hạng theo sản lượng
                </span>
              </div>

              {topSach.length === 0 ? (
                <div style={{ padding: '3.5rem 1rem', textAlign: 'center', color: '#64748B', fontSize: '0.85rem' }}>
                  Chưa có dữ liệu sách bán ra từ các đơn hoàn tất.
                </div>
              ) : (
                <div className="admindash-table-wrap" style={{ border: 'none', boxShadow: 'none' }}>
                  <table className="admindash-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th>Tác Phẩm</th>
                        <th>Đã Bán</th>
                        <th style={{ textAlign: 'right' }}>Doanh Thu</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topSach.map((s, idx) => {
                        const rankClass = idx === 0 ? 'gold' : idx === 1 ? 'silver' : idx === 2 ? 'bronze' : 'plain';
                        return (
                          <tr key={s.maSach || idx}>
                            <td>
                              <span className={`admindash-rank-pill ${rankClass}`}>
                                {idx + 1}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                                {s.hinhAnh ? (
                                  <img 
                                    src={s.hinhAnh} 
                                    alt={s.tenSach} 
                                    className="admindash-book-thumb" 
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                                  />
                                ) : (
                                  <div className="admindash-book-thumb" style={{ display: 'grid', placeItems: 'center', color: '#94A3B8' }}>
                                    <BookOpen size={16} />
                                  </div>
                                )}
                                <div style={{ minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#0F172A' }}>
                                    {s.tenSach}
                                  </div>
                                  <span style={{
                                    fontSize: '0.72rem',
                                    color: '#64748B',
                                    backgroundColor: '#F1F5F9',
                                    padding: '0.1rem 0.45rem',
                                    borderRadius: '4px',
                                    display: 'inline-block',
                                    marginTop: '2px'
                                  }}>
                                    {s.tenDanhMuc}
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td style={{ fontWeight: 700, color: '#059669' }} className="tabular-nums">
                              {s.daBan} cuốn
                            </td>
                            <td style={{ fontWeight: 700, textAlign: 'right', color: '#0F172A' }} className="tabular-nums">
                              {dinhDangTien(s.doanhThu)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* 2. Biểu Đồ Cơ Cấu Trạng Thái Đơn Hàng (Segmented 100% Meter) */}
            <BieuDoTyLeDonHang 
              tyLeDon={tyLeDon} 
              tongDonToanHeThong={tongDonToanHeThong} 
            />
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardThongKe;
