import React, { useState, useEffect, useRef } from 'react';
import api from '@booknest/shared/api';
import { RefreshCw } from 'lucide-react';
import KhoiViecCanLam from './KhoiViecCanLam.jsx';

const dinhDangTien = (soTien) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);

// Trạng thái đơn xếp theo dòng chảy xử lý (không theo thứ tự API trả về) để đọc từ trái sang phải
const THU_TU_TRANG_THAI = ['CHO_DUYET', 'DA_DUYET', 'DA_LAY_HANG', 'DA_GIAO', 'DA_HUY'];
const CAU_HINH_TRANG_THAI = {
  CHO_DUYET: { ten: 'Chờ duyệt', mau: 'var(--adm-warning)' },
  DA_DUYET: { ten: 'Đã duyệt, chờ soạn', mau: 'var(--adm-info)' },
  DA_LAY_HANG: { ten: 'Đã lấy hàng, đang giao', mau: 'var(--adm-shipping)' },
  DA_GIAO: { ten: 'Đã giao', mau: 'var(--adm-success)' },
  DA_HUY: { ten: 'Đã hủy', mau: 'var(--adm-danger)' }
};

const CAC_MOC_THOI_GIAN = [
  { value: 'all', label: 'Toàn bộ' },
  { value: 'today', label: 'Hôm nay' },
  { value: '7days', label: '7 ngày qua' },
  { value: '30days', label: '30 ngày qua' }
];

const CAC_KIEU_GOM = [
  { value: 'day', label: 'Theo ngày' },
  { value: 'month', label: 'Theo tháng' }
];

// Đo chiều rộng khung chứa để vẽ biểu đồ đúng cỡ thật, chữ không bị phóng to thu nhỏ theo khung
function useDoRongKhung() {
  const ref = useRef(null);
  const [rong, setRong] = useState(0);

  useEffect(() => {
    const phanTu = ref.current;
    if (!phanTu) return undefined;
    const quanSat = new ResizeObserver(([muc]) => setRong(Math.floor(muc.contentRect.width)));
    quanSat.observe(phanTu);
    return () => quanSat.disconnect();
  }, []);

  return [ref, rong];
}

// Trục Y theo bước "tròn" (1, 2, 5 × 10^k) để nhãn dễ đọc: 0, 500 k, 1 tr, 1,5 tr...
function tinhTrucY(giaTriLonNhat) {
  if (giaTriLonNhat <= 0) return { tran: 1000000, buoc: 250000 };
  const buocTho = giaTriLonNhat / 4;
  const luyThua = 10 ** Math.floor(Math.log10(buocTho));
  const heSoTho = buocTho / luyThua;
  const heSo = heSoTho <= 1 ? 1 : heSoTho <= 2 ? 2 : heSoTho <= 5 ? 5 : 10;
  const buoc = heSo * luyThua;
  return { tran: Math.ceil(giaTriLonNhat / buoc) * buoc, buoc };
}

const dinhDangNhanTrucY = (v) => {
  if (v >= 1000000) return `${(v / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr`;
  if (v >= 1000) return `${(v / 1000).toLocaleString('vi-VN', { maximumFractionDigits: 0 })} k`;
  return '0';
};

// Thanh chọn phân đoạn: nền trắng trượt sang mục được chọn; không mục nào được chọn thì ẩn nền trượt
function ThanhPhanDoan({ cacMuc, giaTri, onChange, nhan }) {
  const viTri = cacMuc.findIndex((m) => m.value === giaTri);
  return (
    <div
      className="admindash-segmented"
      role="group"
      aria-label={nhan}
      style={{ '--n': cacMuc.length, '--idx': Math.max(viTri, 0), '--has-active': viTri >= 0 ? 1 : 0 }}
    >
      {cacMuc.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={`admindash-segmented-btn ${m.value === giaTri ? 'active' : ''}`}
          aria-pressed={m.value === giaTri}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function KhungCho() {
  return (
    <div aria-busy="true">
      <div className="admindash-panel" style={{ marginBottom: '1rem' }}>
        <div className="admindash-strip">
          {[1, 2, 3].map((i) => (
            <div key={i} className="admindash-strip-item">
              <div className="admindash-skeleton" style={{ width: '120px', height: '13px' }} />
              <div className="admindash-skeleton" style={{ width: '160px', height: '30px', marginTop: '4px' }} />
              <div className="admindash-skeleton" style={{ width: '180px', height: '12px', marginTop: '4px' }} />
            </div>
          ))}
        </div>
      </div>
      <div className="admindash-grid cols-7-5">
        {[1, 2].map((i) => (
          <div key={i} className="admindash-panel" style={{ height: '320px', padding: '1.25rem' }}>
            <div className="admindash-skeleton" style={{ width: '200px', height: '16px' }} />
            <div className="admindash-skeleton" style={{ width: '100%', height: '230px', marginTop: '1.1rem' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function BieuDoCotDoanhThu({ duLieu = [], kieuGomNhom }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  const [khungRef, rong] = useDoRongKhung();

  const dsHienThi = duLieu.slice(-12); // Tối đa 12 mốc gần nhất để cột không bị chen chúc
  const maxDoanhThu = dsHienThi.reduce((max, d) => Math.max(max, Number(d.tongDoanhThu) || 0), 0);
  const { tran, buoc } = tinhTrucY(maxDoanhThu);
  const cacVach = [];
  for (let v = 0; v <= tran; v += buoc) cacVach.push(v);

  const cao = 232;
  const le = { trai: 46, phai: 8, tren: 12, duoi: 26 };
  const rongVe = Math.max(rong - le.trai - le.phai, 0);
  const caoVe = cao - le.tren - le.duoi;
  const soCot = dsHienThi.length;
  const rongOCot = soCot > 0 ? rongVe / soCot : 0;
  const rongCot = Math.min(40, Math.max(14, rongOCot * 0.6));

  // 2026-10-08 -> 08/10; theo tháng: T10/26
  const rutGonNgay = (chuoiNgay) => {
    if (!chuoiNgay) return '';
    if (kieuGomNhom === 'month') return `T${chuoiNgay.slice(5, 7)}/${chuoiNgay.slice(2, 4)}`;
    return `${chuoiNgay.slice(8, 10)}/${chuoiNgay.slice(5, 7)}`;
  };

  // Nhãn đầy đủ cho tooltip: 12/10/2026, hoặc Tháng 10/2026 khi gom theo tháng
  const nhanDayDu = (chuoiNgay) => {
    if (!chuoiNgay) return '';
    if (kieuGomNhom === 'month') return `Tháng ${chuoiNgay.slice(5, 7)}/${chuoiNgay.slice(0, 4)}`;
    return `${chuoiNgay.slice(8, 10)}/${chuoiNgay.slice(5, 7)}/${chuoiNgay.slice(0, 4)}`;
  };

  const mucDangChi = hoveredIdx !== null ? dsHienThi[hoveredIdx] : null;
  const yCuaGiaTri = (v) => le.tren + caoVe - (tran > 0 ? (v / tran) * caoVe : 0);

  if (soCot === 0) {
    return <div className="admindash-empty">Chưa có đơn giao thành công trong khoảng thời gian này.</div>;
  }

  return (
    <div ref={khungRef} className="admindash-chart" style={{ height: `${cao}px` }}>
      {rong > 0 && (
        <svg width={rong} height={cao} role="img" aria-label="Biểu đồ cột doanh thu theo thời gian">
          {cacVach.map((v) => {
            const y = yCuaGiaTri(v);
            return (
              <g key={v}>
                <line x1={le.trai} x2={rong - le.phai} y1={y} y2={y} stroke="var(--adm-border)" strokeWidth="1" />
                <text x={le.trai - 8} y={y + 4} textAnchor="end" fontSize="11" fill="var(--adm-text-muted)" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  {dinhDangNhanTrucY(v)}
                </text>
              </g>
            );
          })}

          {dsHienThi.map((muc, idx) => {
            const giaTri = Number(muc.tongDoanhThu) || 0;
            const caoCot = tran > 0 ? (giaTri / tran) * caoVe : 0;
            const xTam = le.trai + idx * rongOCot + rongOCot / 2;
            return (
              <g key={muc.thoiGian || idx}>
                <rect
                  className={`admindash-bar ${hoveredIdx === idx ? 'is-hover' : ''}`}
                  style={{ '--i': idx }}
                  x={xTam - rongCot / 2}
                  y={le.tren + caoVe - Math.max(caoCot, 2)}
                  width={rongCot}
                  height={Math.max(caoCot, 2)}
                  rx="3"
                >
                  <title>{`${nhanDayDu(muc.thoiGian)}: ${dinhDangTien(giaTri)}`}</title>
                </rect>
                <text x={xTam} y={cao - 8} textAnchor="middle" fontSize="11" fill="var(--adm-text-muted)">
                  {rutGonNgay(muc.thoiGian)}
                </text>
                {/* Vùng rê chuột cả ô, không chỉ phần cột, để dễ trỏ vào cột thấp */}
                <rect
                  x={le.trai + idx * rongOCot}
                  y={le.tren}
                  width={rongOCot}
                  height={caoVe}
                  fill="transparent"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              </g>
            );
          })}
        </svg>
      )}

      {mucDangChi && (
        <div
          className="admindash-chart-tooltip"
          style={{
            left: Math.min(Math.max(le.trai + hoveredIdx * rongOCot + rongOCot / 2, 80), rong - 80),
            top: Math.max(yCuaGiaTri(Number(mucDangChi.tongDoanhThu) || 0) - 8, 40)
          }}
        >
          <strong>{dinhDangTien(mucDangChi.tongDoanhThu)}</strong>
          <br />
          <span>{nhanDayDu(mucDangChi.thoiGian)} · {mucDangChi.soDonThanhCong} đơn · {mucDangChi.tongSachDaBan} cuốn</span>
        </div>
      )}
    </div>
  );
}

function CoCauTrangThaiDon({ tyLeDon = [] }) {
  const sapXep = [...tyLeDon].sort(
    (a, b) => THU_TU_TRANG_THAI.indexOf(a.trangThai) - THU_TU_TRANG_THAI.indexOf(b.trangThai)
  );

  if (sapXep.length === 0) {
    return <div className="admindash-empty">Chưa có đơn hàng nào.</div>;
  }

  return (
    <>
      <div className="admindash-stack" role="img" aria-label="Tỷ lệ đơn hàng theo trạng thái">
        {sapXep.map((tl, i) => {
          const tyLe = Number(tl.tyLe) || 0;
          if (tyLe <= 0) return null;
          const cfg = CAU_HINH_TRANG_THAI[tl.trangThai];
          return (
            <div
              key={tl.trangThai}
              title={`${cfg?.ten || tl.trangThai}: ${tl.soLuong} đơn (${tl.tyLe}%)`}
              style={{ width: `${tyLe}%`, backgroundColor: cfg?.mau || 'var(--adm-text-sub)', animationDelay: `${i * 40}ms` }}
            />
          );
        })}
      </div>

      <div className="admindash-legend">
        {sapXep.map((tl) => {
          const cfg = CAU_HINH_TRANG_THAI[tl.trangThai] || { ten: tl.trangThai, mau: 'var(--adm-text-sub)' };
          return (
            <div key={tl.trangThai} className="admindash-legend-row">
              <span className="admindash-swatch" style={{ backgroundColor: cfg.mau }} />
              <span>{cfg.ten}</span>
              <span className="admindash-legend-count">{tl.soLuong}</span>
              <span className="admindash-legend-pct">{tl.tyLe}%</span>
            </div>
          );
        })}
      </div>
    </>
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
  const [presetChon, setPresetChon] = useState('all'); // 'all', 'today', '7days', '30days', 'custom'
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState('');
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
        setLoi('');
      } catch (err) {
        console.error('Lỗi tải số liệu thống kê:', err);
        if (!daHuy) setLoi('Không tải được số liệu thống kê. Kiểm tra kết nối rồi thử lại.');
      } finally {
        if (!daHuy) setDangTai(false);
      }
    };

    napDuLieu();
    return () => {
      daHuy = true;
    };
  }, [kenhBan, tuNgay, denNgay, kieuGomNhom, lanTai]);

  const taiLai = () => {
    setDangTai(true);
    setLanTai((n) => n + 1);
  };

  const handleLocDuLieu = (e) => {
    if (e) e.preventDefault();
    taiLai();
  };

  const apDungPreset = (kieu) => {
    setPresetChon(kieu);
    const bayGio = new Date();
    const dinhDangYmd = (d) => d.toISOString().split('T')[0];
    const lui = (soNgay) => {
      const d = new Date(bayGio);
      d.setDate(bayGio.getDate() - soNgay);
      return dinhDangYmd(d);
    };

    if (kieu === 'all') {
      setTuNgay('');
      setDenNgay('');
    } else if (kieu === 'today') {
      setTuNgay(dinhDangYmd(bayGio));
      setDenNgay(dinhDangYmd(bayGio));
    } else {
      setTuNgay(lui(kieu === '7days' ? 7 : 30));
      setDenNgay(dinhDangYmd(bayGio));
    }

    taiLai();
  };

  const handleDatLaiLoc = () => {
    setKenhBan('');
    setTuNgay('');
    setDenNgay('');
    setPresetChon('all');
    setKieuGomNhom('day');
    taiLai();
  };

  const coLocDangChay = Boolean(kenhBan || tuNgay || denNgay);
  const trungBinhCuonMoiDon = tongQuan.soDonThanhCong > 0
    ? (tongQuan.tongSachDaBan / tongQuan.soDonThanhCong).toFixed(1)
    : 0;
  const ghiChuKenh = kenhBan === 'TRUC_TUYEN'
    ? 'Chỉ kênh trực tuyến'
    : kenhBan === 'TAI_QUAY'
      ? 'Chỉ bán tại quầy'
      : 'Gồm trực tuyến và tại quầy';

  return (
    <div>
      <div className="admindash-page-head">
        <div>
          <h1 className="admindash-page-title">Thống kê doanh thu và vận hành</h1>
          <p className="admindash-page-desc">Số liệu bán hàng trực tuyến và tại quầy của BookNest.</p>
        </div>
        <button type="button" onClick={taiLai} disabled={dangTai} className="btn btn-outline" title="Tải lại số liệu mới nhất">
          <RefreshCw size={14} className={dangTai ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      <KhoiViecCanLam lanTaiNgoai={lanTai} />

      <div className="admindash-toolbar">
        <ThanhPhanDoan cacMuc={CAC_MOC_THOI_GIAN} giaTri={presetChon} onChange={apDungPreset} nhan="Khoảng thời gian" />

        <form onSubmit={handleLocDuLieu} className="admindash-toolbar-group">
          <select
            className="admindash-field"
            aria-label="Kênh bán"
            value={kenhBan}
            onChange={(e) => {
              setKenhBan(e.target.value);
              taiLai();
            }}
          >
            <option value="">Tất cả kênh</option>
            <option value="TRUC_TUYEN">Trực tuyến</option>
            <option value="TAI_QUAY">Tại quầy</option>
          </select>
          <input
            type="date"
            className="admindash-field"
            aria-label="Từ ngày"
            value={tuNgay}
            onChange={(e) => {
              setTuNgay(e.target.value);
              setPresetChon('custom');
            }}
          />
          <span className="admindash-range-sep">đến</span>
          <input
            type="date"
            className="admindash-field"
            aria-label="Đến ngày"
            value={denNgay}
            onChange={(e) => {
              setDenNgay(e.target.value);
              setPresetChon('custom');
            }}
          />
          <button type="submit" className="btn btn-primary">Lọc</button>
          {coLocDangChay && (
            <button type="button" onClick={handleDatLaiLoc} className="btn btn-outline">Đặt lại</button>
          )}
        </form>
      </div>

      {loi && (
        <div className="admindash-panel" style={{ marginBottom: '1rem' }}>
          <div className="admindash-empty">
            {loi}{' '}
            <button type="button" className="btn btn-outline btn-sm" onClick={taiLai} style={{ marginLeft: '0.5rem' }}>
              Thử lại
            </button>
          </div>
        </div>
      )}

      {dangTai && !loi ? (
        <KhungCho />
      ) : !loi && (
        <>
          <section className="admindash-panel" style={{ marginBottom: '1rem' }} aria-label="Chỉ số chính">
            <div className="admindash-strip">
              <div className="admindash-strip-item">
                <span className="admindash-strip-label">Tổng doanh thu</span>
                <span className="admindash-strip-value">{dinhDangTien(tongQuan.tongDoanhThu)}</span>
                <span className="admindash-strip-hint">{ghiChuKenh}</span>
              </div>
              <div className="admindash-strip-item">
                <span className="admindash-strip-label">Đơn giao thành công</span>
                <span className="admindash-strip-value">
                  <span>{tongQuan.soDonThanhCong} <span className="admindash-strip-unit">đơn</span></span>
                </span>
                <span className="admindash-strip-hint">Đơn đã hoàn tất giao hàng</span>
              </div>
              <div className="admindash-strip-item">
                <span className="admindash-strip-label">Sách đã bán</span>
                <span className="admindash-strip-value">
                  <span>{tongQuan.tongSachDaBan} <span className="admindash-strip-unit">cuốn</span></span>
                </span>
                <span className="admindash-strip-hint">Trung bình {trungBinhCuonMoiDon} cuốn mỗi đơn</span>
              </div>
            </div>
          </section>

          <div className="admindash-grid cols-7-5">
            <section className="admindash-panel">
              <div className="admindash-panel-head">
                <h2 className="admindash-panel-title">Doanh thu theo thời gian</h2>
                <ThanhPhanDoan cacMuc={CAC_KIEU_GOM} giaTri={kieuGomNhom} onChange={setKieuGomNhom} nhan="Gom theo" />
              </div>
              <div className="admindash-panel-body">
                <BieuDoCotDoanhThu duLieu={chuoiDoanhThu} kieuGomNhom={kieuGomNhom} />
              </div>
            </section>

            <section className="admindash-panel">
              <div className="admindash-panel-head">
                <h2 className="admindash-panel-title">Trạng thái đơn hàng</h2>
                <span className="admindash-panel-note tabular-nums">Tổng {tongDonToanHeThong} đơn</span>
              </div>
              <div className="admindash-panel-body">
                <CoCauTrangThaiDon tyLeDon={tyLeDon} />
              </div>
            </section>
          </div>

          <div className="admindash-grid cols-1-1">
            <section className="admindash-panel">
              <div className="admindash-panel-head">
                <h2 className="admindash-panel-title">Sách bán chạy nhất</h2>
                <span className="admindash-panel-note">Theo số cuốn bán</span>
              </div>
              <div className="admindash-panel-body" style={{ paddingInline: 0 }}>
                {topSach.length === 0 ? (
                  <div className="admindash-empty">Chưa có sách nào bán ra từ các đơn hoàn tất.</div>
                ) : (
                  <div className="admindash-table-wrap">
                    <table className="admindash-table is-compact">
                      <thead>
                        <tr>
                          <th className="is-rank">#</th>
                          <th>Sách</th>
                          <th className="is-num">Đã bán</th>
                          <th className="is-num">Doanh thu</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topSach.map((s, idx) => (
                          <tr key={s.maSach || idx}>
                            <td className="is-rank">{idx + 1}</td>
                            <td>
                              <div className="admindash-book-cell">
                                {s.anhBia ? (
                                  <img
                                    src={s.anhBia}
                                    alt=""
                                    loading="lazy"
                                    className="admindash-book-thumb"
                                    onError={(e) => { e.currentTarget.style.visibility = 'hidden'; }}
                                  />
                                ) : (
                                  <span className="admindash-book-thumb" />
                                )}
                                <div style={{ minWidth: 0 }}>
                                  <div className="admindash-book-title">{s.tenSach}</div>
                                  <div className="admindash-book-meta">{s.tenDanhMuc}</div>
                                </div>
                              </div>
                            </td>
                            <td className="is-num">{s.daBan} cuốn</td>
                            <td className="is-num">{dinhDangTien(s.doanhThu)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>

            <section className="admindash-panel">
              <div className="admindash-panel-head">
                <h2 className="admindash-panel-title">Doanh thu theo thể loại</h2>
                <span className="admindash-panel-note">{doanhThuDanhMuc.length} thể loại có doanh thu</span>
              </div>
              <div className="admindash-panel-body">
                {doanhThuDanhMuc.length === 0 ? (
                  <div className="admindash-empty">Chưa có dữ liệu phân loại sách bán ra.</div>
                ) : (
                  <ul className="admindash-bar-list">
                    {doanhThuDanhMuc.slice(0, 6).map((dm, i) => (
                      <li key={dm.maDanhMuc || dm.tenDanhMuc}>
                        <div className="admindash-bar-row-head">
                          <span className="admindash-bar-row-name">{dm.tenDanhMuc}</span>
                          <span className="admindash-bar-row-value">
                            <strong>{dinhDangTien(dm.doanhThu)}</strong> · {dm.tyLeDoanhThu}% · {dm.daBan} cuốn
                          </span>
                        </div>
                        <div className="admindash-progress-track">
                          <div
                            className="admindash-progress-bar"
                            style={{ width: `${dm.tyLeDoanhThu}%`, animationDelay: `${i * 40}ms` }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardThongKe;
