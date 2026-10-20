import React, { useState, useEffect } from 'react';
import {
  RefreshCw,
  CheckSquare,
  Square,
  BookOpen
} from 'lucide-react';
import api from '@booknest/shared/api';
import { ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';

export default function DonCanSoan() {

  const [dangTai, setDangTai] = useState(true);
  const [trang, setTrang] = useState(1);
  const [gioiHan, setGioiHan] = useState(10);
  const [duLieu, setDuLieu] = useState({
    tongSoDonCanSoan: 0,
    tongSoCuonSachCanSoan: 0,
    danhSachDonHang: [],
    tongHopSachCanSoan: [],
    phanTrang: null
  });
  const [loi, setLoi] = useState('');
  const [cheDoXem, setCheDoXem] = useState('gom_sach'); // 'gom_sach' | 'theo_don'
  const [sachDaNhat, setSachDaNhat] = useState({}); // { [maSach]: true }

  const napDuLieu = async (trangMoi = trang, limitMoi = gioiHan) => {
    setDangTai(true);
    setLoi('');
    try {
      const res = await api.get('/admin/pick-list', {
        params: { page: trangMoi, limit: limitMoi }
      });
      setDuLieu(res.data.data || {
        tongSoDonCanSoan: 0,
        tongSoCuonSachCanSoan: 0,
        danhSachDonHang: [],
        tongHopSachCanSoan: [],
        phanTrang: null
      });
    } catch (err) {
      setLoi(loiTuApi(err, 'Không thể tải danh sách đơn cần soạn'));
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    napDuLieu(trang, gioiHan);
  }, [trang, gioiHan]);

  const toggleNhatSach = (maSach) => {
    setSachDaNhat((prev) => ({
      ...prev,
      [maSach]: !prev[maSach]
    }));
  };

  const handleInPhieu = () => {
    window.print();
  };

  const soSachDaNhat = Object.values(sachDaNhat).filter(Boolean).length;
  const tongSoDauSach = duLieu.tongHopSachCanSoan.length;

  return (
    <div>
      {/* Tiêu đề & Công cụ */}
      <div className="admindash-page-head">
        <div>
          <h1 className="admindash-page-title">
            Đơn cần soạn
          </h1>
          <p className="admindash-page-desc">
            Danh sách gom ấn phẩm từ kho theo các đơn hàng đã duyệt để chuẩn bị đóng gói
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={napDuLieu}
            disabled={dangTai}
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
            title="Tải lại danh sách mới nhất"
          >
            <RefreshCw size={15} className={dangTai ? 'animate-spin' : ''} />
            Làm mới
          </button>

          <button
            onClick={handleInPhieu}
            disabled={duLieu.tongSoDonCanSoan === 0}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            In phiếu soạn
          </button>
        </div>
      </div>

      {loi && (
        <ThongBaoTaiCho loai="loi" onDong={() => setLoi('')}>
          {loi}
        </ThongBaoTaiCho>
      )}

      {/* Chỉ số nhanh */}
      <section className="admindash-panel" style={{ marginBottom: '1rem' }} aria-label="Chỉ số đơn cần soạn">
        <div className="admindash-strip">
          <div className="admindash-strip-item">
            <span className="admindash-strip-label">Đơn hàng chờ soạn</span>
            <span className="admindash-strip-value">
              <span>{duLieu.tongSoDonCanSoan} <span className="admindash-strip-unit">đơn</span></span>
            </span>
          </div>
          <div className="admindash-strip-item">
            <span className="admindash-strip-label">Tổng số cuốn cần nhặt</span>
            <span className="admindash-strip-value">
              <span>{duLieu.tongSoCuonSachCanSoan} <span className="admindash-strip-unit">cuốn</span></span>
            </span>
          </div>
          <div className="admindash-strip-item">
            <span className="admindash-strip-label">Tiến độ nhặt hàng</span>
            <span className="admindash-strip-value">
              <span>{soSachDaNhat} / {tongSoDauSach} <span className="admindash-strip-unit">đầu sách</span></span>
            </span>
          </div>
        </div>
      </section>

      {/* Tabs Chuyển Đổi Chế Độ Xem */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', borderBottom: '1px solid var(--adm-border)', paddingBottom: '0.5rem' }}>
        <button
          onClick={() => setCheDoXem('gom_sach')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: cheDoXem === 'gom_sach' ? 'var(--adm-primary)' : 'transparent',
            color: cheDoXem === 'gom_sach' ? '#FFFFFF' : 'var(--adm-text-muted)'
          }}
        >
          Tổng hợp theo đầu sách ({tongSoDauSach})
        </button>

        <button
          onClick={() => setCheDoXem('theo_don')}
          style={{
            padding: '0.45rem 1rem',
            borderRadius: '6px',
            fontSize: '0.85rem',
            fontWeight: 600,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            border: 'none',
            cursor: 'pointer',
            backgroundColor: cheDoXem === 'theo_don' ? 'var(--adm-primary)' : 'transparent',
            color: cheDoXem === 'theo_don' ? '#FFFFFF' : 'var(--adm-text-muted)'
          }}
        >
          Theo từng đơn hàng ({duLieu.tongSoDonCanSoan})
        </button>
      </div>

      {/* Nội Dung Bảng */}
      {dangTai ? (
        <div className="flex justify-center py-12">
          <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.9rem' }}>Đang nạp danh sách soạn hàng...</p>
        </div>
      ) : duLieu.tongSoDonCanSoan === 0 ? (
        <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--adm-text-main)' }}>
            Không có đơn hàng nào cần soạn
          </h3>
          <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
            Tất cả các đơn đã duyệt đều đã được chuyển sang khâu đóng gói hoặc giao hàng.
          </p>
        </div>
      ) : cheDoXem === 'gom_sach' ? (
        /* Tab 1: Tổng Hợp Theo Đầu Sách */
        <div className="admindash-table-wrap">
          <table className="admindash-table">
            <thead>
              <tr>
                <th style={{ width: '50px', textAlign: 'center' }}>Xong</th>
                <th style={{ width: '70px' }}>Mã</th>
                <th>Ấn phẩm cần nhặt</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Số lượng cần</th>
                <th>Phân bổ vào các đơn</th>
              </tr>
            </thead>
            <tbody>
              {duLieu.tongHopSachCanSoan.map((s) => {
                const daXong = !!sachDaNhat[s.maSach];
                return (
                  <tr 
                    key={s.maSach}
                    style={{ 
                      backgroundColor: daXong ? 'rgba(16, 185, 129, 0.05)' : 'transparent',
                      opacity: daXong ? 0.65 : 1
                    }}
                  >
                    <td style={{ textAlign: 'center' }}>
                      <button
                        type="button"
                        onClick={() => toggleNhatSach(s.maSach)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: daXong ? 'var(--adm-success)' : 'var(--adm-text-muted)' }}
                        title={daXong ? 'Đánh dấu chưa nhặt' : 'Đánh dấu đã nhặt'}
                      >
                        {daXong ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    </td>
                    <td className="tabular-nums" style={{ fontWeight: 600, color: 'var(--adm-text-muted)', fontSize: '0.8rem' }}>
                      #{s.maSach}
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                        {s.anhBia ? (
                          <img 
                            src={s.anhBia} 
                            alt={s.tenSach} 
                            style={{ width: '36px', height: '48px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--adm-border)' }} 
                          />
                        ) : (
                          <div style={{ width: '36px', height: '48px', backgroundColor: 'var(--adm-surface-2)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--adm-text-muted)' }}>
                            <BookOpen size={16} />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--adm-text-main)', textDecoration: daXong ? 'line-through' : 'none' }}>
                            {s.tenSach}
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>{s.tacGia || 'Chưa rõ tác giả'}</span>
                        </div>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span 
                        style={{ 
                          fontSize: '1.05rem', 
                          fontWeight: 700, 
                          color: daXong ? 'var(--adm-success)' : 'var(--adm-primary)',
                          padding: '0.2rem 0.6rem',
                          backgroundColor: daXong ? 'var(--adm-success-subtle)' : 'var(--adm-info-subtle)',
                          borderRadius: '6px',
                          display: 'inline-block'
                        }}
                      >
                        x{s.tongSoLuongCanSoan}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                        {(s.cacDonLienQuan || []).map((d, idx) => (
                          <span 
                            key={idx}
                            style={{ 
                              fontSize: '0.75rem', 
                              backgroundColor: 'var(--adm-surface-2)', 
                              border: '1px solid var(--adm-border)', 
                              padding: '0.15rem 0.45rem', 
                              borderRadius: '4px',
                              color: 'var(--adm-text-main)'
                            }}
                          >
                            Đơn #{d.maDonHang} (<strong>{d.soLuong}</strong>)
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Tab 2: Theo Từng Đơn Hàng */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {duLieu.danhSachDonHang.map((don) => (
            <div key={don.MaDonHang} className="card" style={{ padding: '1.15rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem', borderBottom: '1px solid var(--adm-border)', paddingBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--adm-text-main)' }}>
                    Đơn hàng #{don.MaDonHang}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', fontFamily: 'monospace' }}>
                    {don.MaTraCuu}
                  </span>
                  <span className="badge badge-processing" style={{ fontSize: '0.72rem' }}>
                    Đã duyệt
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  {new Date(don.NgayDat).toLocaleString('vi-VN')}
                </div>
              </div>

              {don.GhiChu && (
                <div style={{ fontSize: '0.78rem', backgroundColor: 'var(--adm-warning-subtle)', color: 'var(--adm-warning)', padding: '0.4rem 0.65rem', borderRadius: '4px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <strong>Ghi chú:</strong> {don.GhiChu}
                </div>
              )}

              {/* Danh sách các cuốn sách trong đơn */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {(don.chiTietDonHang || []).map((ct) => (
                  <div 
                    key={ct.MaChiTiet || `${don.MaDonHang}-${ct.MaSach}`}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '0.45rem 0.65rem',
                      backgroundColor: 'var(--adm-surface-2)',
                      borderRadius: '6px',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ color: 'var(--adm-text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>#{ct.MaSach}</span>
                      <span style={{ fontWeight: 600, color: 'var(--adm-text-main)' }}>{ct.sach?.TenSach || `Sách #${ct.MaSach}`}</span>
                    </div>

                    <div style={{ fontWeight: 700, color: 'var(--adm-primary)', fontSize: '0.9rem' }}>
                      x{ct.SoLuong}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Phân trang danh sách đơn cần soạn (T56) */}
          {duLieu.phanTrang && (
            <div 
              className="card"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '0.75rem',
                padding: '0.75rem 1.25rem',
                marginTop: '0.5rem'
              }}
            >
              <div style={{ fontSize: '0.85rem', color: 'var(--adm-text-muted)' }}>
                Hiển thị <strong>{duLieu.danhSachDonHang.length > 0 ? (trang - 1) * gioiHan + 1 : 0}–{Math.min(trang * gioiHan, duLieu.tongSoDonCanSoan)}</strong> / <strong>{duLieu.tongSoDonCanSoan}</strong> đơn
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginRight: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>Mỗi trang:</span>
                  <select
                    value={gioiHan}
                    onChange={(e) => {
                      setGioiHan(Number(e.target.value));
                      setTrang(1);
                    }}
                    style={{
                      padding: '0.25rem 0.5rem',
                      fontSize: '0.8rem',
                      borderRadius: '4px',
                      border: '1px solid var(--adm-border)',
                      backgroundColor: 'var(--adm-card-bg)',
                      color: 'var(--adm-text-main)'
                    }}
                  >
                    <option value={2}>2</option>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                  </select>
                </div>

                <button
                  className="btn btn-outline"
                  disabled={trang <= 1 || dangTai}
                  onClick={() => setTrang((p) => Math.max(1, p - 1))}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                >
                  Trước
                </button>

                <span style={{ fontSize: '0.85rem', color: 'var(--adm-text-main)', fontWeight: 500 }}>
                  Trang {trang} / {duLieu.phanTrang?.tongSoTrang || 1}
                </span>

                <button
                  className="btn btn-outline"
                  disabled={trang >= (duLieu.phanTrang?.tongSoTrang || 1) || dangTai}
                  onClick={() => setTrang((p) => Math.min(duLieu.phanTrang?.tongSoTrang || 1, p + 1))}
                  style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
