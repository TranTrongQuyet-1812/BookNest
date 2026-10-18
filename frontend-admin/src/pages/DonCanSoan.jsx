import React, { useState, useEffect } from 'react';
import { 
  ClipboardCheck, 
  PackageCheck, 
  Layers, 
  RefreshCw, 
  CheckSquare, 
  Square, 
  Printer, 
  BookOpen, 
  Clock, 
  CheckCircle2,
  FileText
} from 'lucide-react';
import api from '@booknest/shared/api';
import { useThongBao, ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';

export default function DonCanSoan() {
  const { thongBao: tb } = useThongBao();

  const [dangTai, setDangTai] = useState(true);
  const [duLieu, setDuLieu] = useState({
    tongSoDonCanSoan: 0,
    tongSoCuonSachCanSoan: 0,
    danhSachDonHang: [],
    tongHopSachCanSoan: []
  });
  const [loi, setLoi] = useState('');
  const [cheDoXem, setCheDoXem] = useState('gom_sach'); // 'gom_sach' | 'theo_don'
  const [sachDaNhat, setSachDaNhat] = useState({}); // { [maSach]: true }

  const napDuLieu = async () => {
    setDangTai(true);
    setLoi('');
    try {
      const res = await api.get('/admin/pick-list');
      setDuLieu(res.data.data || {
        tongSoDonCanSoan: 0,
        tongSoCuonSachCanSoan: 0,
        danhSachDonHang: [],
        tongHopSachCanSoan: []
      });
    } catch (err) {
      setLoi(loiTuApi(err, 'Không thể tải danh sách đơn cần soạn'));
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    napDuLieu();
  }, []);

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
    <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
      {/* Tiêu đề & Công cụ */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--adm-text-main)', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ClipboardCheck size={24} style={{ color: 'var(--adm-primary)' }} />
            Đơn Cần Soạn (Pick List)
          </h1>
          <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Danh sách gom ấn phẩm từ kho theo các đơn hàng đã xác nhận để chuẩn bị đóng gói
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
            Làm Mới
          </button>

          <button
            onClick={handleInPhieu}
            disabled={duLieu.tongSoDonCanSoan === 0}
            className="btn btn-primary"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem' }}
          >
            <Printer size={15} />
            In Phiếu Soạn
          </button>
        </div>
      </div>

      {loi && (
        <ThongBaoTaiCho loai="loi" onDong={() => setLoi('')}>
          {loi}
        </ThongBaoTaiCho>
      )}

      {/* Thẻ Thống Kê Nhanh */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card" style={{ padding: '1.15rem 1.25rem', borderLeft: '4px solid var(--adm-primary)' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', fontWeight: 500 }}>Đơn Hàng Chờ Soạn</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--adm-text-main)', marginTop: '0.2rem' }}>
            {duLieu.tongSoDonCanSoan} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--adm-text-muted)' }}>đơn</span>
          </div>
        </div>

        <div className="card" style={{ padding: '1.15rem 1.25rem', borderLeft: '4px solid #10B981' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', fontWeight: 500 }}>Tổng Số Cuốn Cần Nhặt</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--adm-text-main)', marginTop: '0.2rem' }}>
            {duLieu.tongSoCuonSachCanSoan} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--adm-text-muted)' }}>cuốn</span>
          </div>
        </div>

        <div className="card" style={{ padding: '1.15rem 1.25rem', borderLeft: '4px solid #F59E0B' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', fontWeight: 500 }}>Tiến Độ Nhặt Hàng</div>
          <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--adm-text-main)', marginTop: '0.2rem' }}>
            {soSachDaNhat} / {tongSoDauSach} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--adm-text-muted)' }}>đầu sách</span>
          </div>
        </div>
      </div>

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
          <Layers size={15} />
          Tổng Hợp Theo Đầu Sách ({tongSoDauSach})
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
          <PackageCheck size={15} />
          Theo Từng Đơn Hàng ({duLieu.tongSoDonCanSoan})
        </button>
      </div>

      {/* Nội Dung Bảng */}
      {dangTai ? (
        <div className="flex justify-center py-12">
          <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.9rem' }}>Đang nạp danh sách soạn hàng...</p>
        </div>
      ) : duLieu.tongSoDonCanSoan === 0 ? (
        <div className="card" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
          <CheckCircle2 size={40} style={{ color: '#10B981', margin: '0 auto 0.75rem' }} />
          <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--adm-text-main)' }}>
            Không có đơn hàng nào cần soạn
          </h3>
          <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.85rem', marginTop: '0.3rem' }}>
            Tất cả các đơn đã xác nhận đều đã được chuyển sang khâu đóng gói hoặc giao hàng.
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
                <th>Ấn Phẩm Cần Nhặt</th>
                <th style={{ width: '130px', textAlign: 'center' }}>Số Lượng Cần</th>
                <th>Phân Bổ Vào Các Đơn</th>
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
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: daXong ? '#10B981' : 'var(--adm-text-muted)' }}
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
                          <div style={{ width: '36px', height: '48px', backgroundColor: 'var(--adm-sidebar-bg)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--adm-text-muted)' }}>
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
                          color: daXong ? '#10B981' : 'var(--adm-primary)',
                          padding: '0.2rem 0.6rem',
                          backgroundColor: daXong ? '#ECFDF5' : '#EFF6FF',
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
                              backgroundColor: 'var(--adm-sidebar-bg)', 
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
                    Đã xác nhận
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Clock size={13} />
                  {new Date(don.NgayDat || don.NgayTao).toLocaleString('vi-VN')}
                </div>
              </div>

              {(don.GhiChu || don.GhiChuKhachHang) && (
                <div style={{ fontSize: '0.78rem', backgroundColor: '#FFFBEB', color: '#B45309', padding: '0.4rem 0.65rem', borderRadius: '4px', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <FileText size={13} />
                  <strong>Ghi chú:</strong> {don.GhiChu || don.GhiChuKhachHang}
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
                      backgroundColor: 'var(--adm-sidebar-bg)',
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
        </div>
      )}
    </div>
  );
}
