import React, { useEffect, useState } from 'react';
import { HangBangXuong } from '../../../frontend/src/pages/admin/KhungXuong.jsx';
import {
  Search,
  RefreshCw
} from 'lucide-react';
import api from '@booknest/shared/api';
import { useAuth } from '@booknest/shared/auth';
import { useThongBao, HopThoai, ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';

export default function QuanLyThanhToan() {
  const { user } = useAuth();
  const laQuanTri = user?.role === 'quan_tri' || user?.VaiTro === 'quan_tri';
  const { thongBao: tb } = useThongBao();
  const [danhSach, setDanhSach] = useState([]);
  const [thongKe, setThongKe] = useState({});
  const [phanTrang, setPhanTrang] = useState({ trangHienTai: 1, tongSoTrang: 1, tongSoBanGhi: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  
  const [dangTai, setDangTai] = useState(true);
  const [dangXuLyId, setDangXuLyId] = useState(null);
  const [loi, setLoi] = useState('');

  // Modal hoàn tiền
  const [khoanCanHoan, setKhoanCanHoan] = useState(null);
  const [maThamChieu, setMaThamChieu] = useState('');
  const [ghiChuHoan, setGhiChuHoan] = useState('');

  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);
  };

  const taiDanhSach = async () => {
    setDangTai(true);
    setLoi('');
    try {
      const res = await api.get('/admin/payments', {
        params: {
          page,
          limit: 15,
          status: status || undefined,
          method: method || undefined,
          search: search.trim() || undefined
        }
      });
      setDanhSach(res.data.data.danhSach || []);
      setPhanTrang(res.data.data.phanTrang || { trangHienTai: 1, tongSoTrang: 1, tongSoBanGhi: 0 });
      setThongKe(res.data.data.thongKe || {});
    } catch (err) {
      setLoi(loiTuApi(err, 'Không thể tải danh sách thanh toán.'));
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    taiDanhSach();
  }, [page, status, method]);

  const handleTimKiem = (e) => {
    e.preventDefault();
    setPage(1);
    taiDanhSach();
  };

  // Xác nhận đã hoàn tiền thủ công cho khách qua ngân hàng
  const handleXacNhanHoanTien = async (e) => {
    e.preventDefault();
    if (!khoanCanHoan) return;
    setDangXuLyId(khoanCanHoan.MaThanhToan);
    setLoi('');
    try {
      await api.put(`/admin/payments/${khoanCanHoan.MaThanhToan}/refunded`, {
        maThamChieu: maThamChieu.trim() || undefined,
        ghiChu: ghiChuHoan.trim() || undefined
      });
      tb.thanhCong(`Đã xác nhận hoàn tiền thành công cho đơn ${khoanCanHoan.donHang?.MaTraCuu || khoanCanHoan.MaDonHang}`);
      setKhoanCanHoan(null);
      setMaThamChieu('');
      setGhiChuHoan('');
      taiDanhSach();
    } catch (err) {
      tb.loiTuApi(err, 'Lỗi khi xác nhận hoàn tiền.');
    } finally {
      setDangXuLyId(null);
    }
  };

  const layBadgeTrangThai = (tt) => {
    switch (tt) {
      case 'CAN_HOAN_TIEN':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '0.78rem',
            fontWeight: 700,
            backgroundColor: 'var(--adm-danger-subtle)',
            color: 'var(--adm-danger)',
            border: '1px solid var(--adm-danger-subtle)'
          }}>
            Cần hoàn tiền
          </span>
        );
      case 'DA_HOAN_TIEN':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '0.78rem',
            fontWeight: 700,
            backgroundColor: 'var(--adm-info-subtle)',
            color: 'var(--adm-info)',
            border: '1px solid var(--adm-info-subtle)'
          }}>
            Đã hoàn tiền
          </span>
        );
      case 'DA_THANH_TOAN':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '0.78rem',
            fontWeight: 700,
            backgroundColor: 'var(--adm-success-subtle)',
            color: 'var(--adm-success)',
            border: '1px solid var(--adm-success-subtle)'
          }}>
            Đã thanh toán
          </span>
        );
      case 'CHO_THANH_TOAN':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '0.78rem',
            fontWeight: 600,
            backgroundColor: 'var(--adm-warning-subtle)',
            color: 'var(--adm-warning)',
            border: '1px solid var(--adm-warning-subtle)'
          }}>
            Chờ thanh toán
          </span>
        );
      case 'HET_HAN':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '0.78rem',
            fontWeight: 600,
            backgroundColor: 'var(--adm-primary-subtle)',
            color: 'var(--adm-text-muted)',
            border: '1px solid var(--adm-border)'
          }}>
            Quá hạn
          </span>
        );
      case 'DA_HUY':
        return (
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '3px 8px',
            borderRadius: '4px',
            fontSize: '0.78rem',
            fontWeight: 600,
            backgroundColor: 'var(--adm-primary-subtle)',
            color: 'var(--adm-text-muted)',
            border: '1px solid var(--adm-border)'
          }}>
            Đã hủy
          </span>
        );
      default:
        return <span>{tt}</span>;
    }
  };

  const layTenTrangThaiDonHang = (tt) => {
    switch (tt) {
      case 'CHO_DUYET': return 'Chờ duyệt';
      case 'DA_DUYET': return 'Đã duyệt';
      case 'DA_LAY_HANG': return 'Đã lấy hàng';
      case 'DA_GIAO': return 'Đã giao';
      case 'DA_HUY': return 'Đã hủy';
      default: return tt || 'N/A';
    }
  };

  const tabs = [
    { key: '', label: 'Tất cả', count: thongKe?.tongTatCa },
    { key: 'CAN_HOAN_TIEN', label: 'Cần hoàn tiền', count: thongKe?.soLuongCanHoanTien, danger: true },
    { key: 'DA_HOAN_TIEN', label: 'Đã hoàn tiền', count: thongKe?.soLuongDaHoanTien },
    { key: 'DA_THANH_TOAN', label: 'Đã thanh toán', count: thongKe?.soLuongDaThanhToan },
    { key: 'CHO_THANH_TOAN', label: 'Chờ thanh toán', count: thongKe?.soLuongChoThanhToan },
    { key: 'HET_HAN', label: 'Hết hạn / đã hủy', count: thongKe?.soLuongDaHuy }
  ];

  return (
    <div className="admindash-content">
      {/* Tiêu đề trang & Nút tải lại */}
      <div className="admindash-page-head">
        <div>
          <h1 className="admindash-page-title">
            Quản lý thanh toán & đối soát hoàn tiền
          </h1>
          <p className="admindash-page-desc">
            Theo dõi dòng tiền thanh toán VietQR payOS / COD và thực hiện đối soát hoàn tiền cho các đơn bị hủy
          </p>
        </div>

        <button
          onClick={taiDanhSach}
          disabled={dangTai}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.9rem',
            fontSize: '0.85rem',
            fontWeight: 600,
            backgroundColor: 'var(--adm-card-bg)',
            border: '1px solid var(--adm-card-border)',
            borderRadius: '6px',
            cursor: 'pointer',
            color: 'var(--adm-text-body)'
          }}
        >
          <RefreshCw size={15} className={dangTai ? 'animate-spin' : ''} />
          Làm mới
        </button>
      </div>

      {loi && (
        <ThongBaoTaiCho loai="loi" onDong={() => setLoi('')}>
          {loi}
        </ThongBaoTaiCho>
      )}

      {/* Tabs Bộ Lọc Nhanh Trạng Thái */}
      <div style={{
        display: 'flex',
        gap: '0.4rem',
        borderBottom: '1px solid var(--adm-card-border)',
        marginBottom: '1.25rem',
        overflowX: 'auto'
      }}>
        {tabs.map((tab) => {
          const laActive = status === tab.key;
          const coCanhBao = tab.danger && tab.count > 0;
          return (
            <button
              key={tab.key}
              onClick={() => { setStatus(tab.key); setPage(1); }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                padding: '0.65rem 1rem',
                fontSize: '0.85rem',
                fontWeight: laActive ? 700 : 500,
                color: laActive ? 'var(--adm-primary)' : 'var(--adm-text-muted)',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: laActive ? '2px solid var(--adm-primary)' : '2px solid transparent',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '1px 6px',
                  borderRadius: '10px',
                  backgroundColor: coCanhBao ? 'var(--adm-danger)' : laActive ? 'var(--adm-primary)' : 'var(--adm-card-border)',
                  color: '#FFFFFF'
                }}>
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Bộ Lọc Tìm Kiếm & Phương Thức */}
      <div style={{
        display: 'flex',
        gap: '0.75rem',
        marginBottom: '1.25rem',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <form onSubmit={handleTimKiem} style={{ display: 'flex', gap: '0.5rem', flex: 1, maxWidth: '480px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted)' }} />
            <input
              type="text"
              placeholder="Tìm theo mã tra cứu (BN-...), mã PayOS, số tiền..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.25rem',
                fontSize: '0.85rem',
                backgroundColor: 'var(--adm-card-bg)',
                border: '1px solid var(--adm-card-border)',
                borderRadius: '6px',
                color: 'var(--adm-text-title)'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.85rem',
              fontWeight: 600,
              backgroundColor: 'var(--adm-primary)',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Tìm
          </button>
        </form>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <select
            value={method}
            onChange={(e) => { setMethod(e.target.value); setPage(1); }}
            style={{
              padding: '0.5rem 0.75rem',
              fontSize: '0.85rem',
              backgroundColor: 'var(--adm-card-bg)',
              border: '1px solid var(--adm-card-border)',
              borderRadius: '6px',
              color: 'var(--adm-text-body)'
            }}
          >
            <option value="">Tất cả hình thức</option>
            <option value="CHUYEN_KHOAN_QR">Chuyển khoản VietQR</option>
            <option value="COD">Thanh toán khi nhận (COD)</option>
          </select>
        </div>
      </div>

      {/* Bảng Dữ Liệu Thanh Toán */}
      <div style={{
        backgroundColor: 'var(--adm-card-bg)',
        border: '1px solid var(--adm-card-border)',
        borderRadius: '8px',
        overflow: 'hidden',
        boxShadow: 'none'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--adm-table-header-bg)', borderBottom: '1px solid var(--adm-card-border)', color: 'var(--adm-text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Mã đơn / tra cứu</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Khách hàng / nhận hàng</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Số tiền</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Phương thức</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Trạng thái</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Mã GD / tham chiếu</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Thời gian</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {dangTai ? (
                <HangBangXuong soCot={8} soHang={6} canPhai={[7]} kieuO={{ padding: '0.85rem 1rem' }} />
              ) : danhSach.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--adm-text-muted)' }}>
                    <div style={{ fontWeight: 600 }}>Không tìm thấy khoản thanh toán nào phù hợp</div>
                  </td>
                </tr>
              ) : (
                danhSach.map((item) => {
                  const don = item.donHang;
                  const laCanHoan = item.TrangThai === 'CAN_HOAN_TIEN';
                  return (
                    <tr
                      key={item.MaThanhToan}
                      style={{
                        borderBottom: '1px solid var(--adm-card-border)',
                        backgroundColor: laCanHoan ? 'rgba(254, 242, 242, 0.45)' : 'transparent',
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      {/* Mã Đơn / Tra Cứu */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: 'var(--adm-primary)' }}>
                          {don?.MaTraCuu || `Đơn #${item.MaDonHang}`}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>
                          Mã TT: #{item.MaThanhToan} • Đơn: {layTenTrangThaiDonHang(don?.TrangThai)}
                        </div>
                      </td>

                      {/* Khách Hàng / Nhận Hàng */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--adm-text-title)' }}>
                          {don?.TenNguoiNhan || don?.khachHang?.HoTen || 'Khách vãng lai'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>
                          {don?.SoDienThoaiNhan || don?.khachHang?.SoDienThoai || 'Chưa có SĐT'}
                        </div>
                      </td>

                      {/* Số Tiền */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontWeight: 700, color: laCanHoan ? 'var(--adm-danger)' : 'var(--adm-text-title)' }}>
                          {dinhDangTien(item.SoTien)}
                        </div>
                      </td>

                      {/* Phương Thức */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <span style={{
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px',
                          backgroundColor: item.PhuongThuc === 'CHUYEN_KHOAN_QR' ? 'rgba(59, 130, 246, 0.1)' : 'var(--adm-card-border)',
                          color: item.PhuongThuc === 'CHUYEN_KHOAN_QR' ? 'var(--adm-info)' : 'var(--adm-text-body)'
                        }}>
                          {item.PhuongThuc === 'CHUYEN_KHOAN_QR' ? 'VietQR payOS' : 'COD'}
                        </span>
                      </td>

                      {/* Trạng Thái */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {layBadgeTrangThai(item.TrangThai)}
                      </td>

                      {/* Mã GD / Tham Chiếu */}
                      <td style={{ padding: '0.85rem 1rem' }}>
                        <div style={{ fontSize: '0.8rem', fontFamily: 'monospace' }}>
                          {item.MaGiaoDichPayos ? `GD: ${item.MaGiaoDichPayos}` : '---'}
                        </div>
                        {item.MaThamChieuNganHang && (
                          <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', fontFamily: 'monospace' }}>
                            Ref: {item.MaThamChieuNganHang}
                          </div>
                        )}
                      </td>

                      {/* Thời Gian */}
                      <td style={{ padding: '0.85rem 1rem', fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>
                        <div>{item.NgayTao ? new Date(item.NgayTao).toLocaleString('vi-VN') : '---'}</div>
                        {item.NgayThanhToan && (
                          <div style={{ color: 'var(--adm-success)', fontSize: '0.72rem' }}>
                            Trả: {new Date(item.NgayThanhToan).toLocaleTimeString('vi-VN')}
                          </div>
                        )}
                      </td>

                      {/* Hành Động */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        {laCanHoan ? (
                          laQuanTri ? (
                            <button
                              type="button"
                              onClick={() => {
                                setKhoanCanHoan(item);
                                setMaThamChieu('');
                                setGhiChuHoan('');
                              }}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                                padding: '0.45rem 0.85rem',
                                fontSize: '0.8rem',
                                fontWeight: 700,
                                backgroundColor: 'var(--adm-danger)',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)'
                              }}
                            >
                              Xác nhận đã hoàn
                            </button>
                          ) : (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              padding: '4px 8px',
                              borderRadius: '4px',
                              fontSize: '0.75rem',
                              fontWeight: 600,
                              backgroundColor: 'var(--adm-danger-subtle)',
                              color: 'var(--adm-danger)',
                              border: '1px dashed var(--adm-danger-subtle)'
                            }}>
                              Chờ Admin hoàn
                            </span>
                          )
                        ) : (
                          <span style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>
                            ---
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Phân Trang */}
        {phanTrang.tongSoTrang > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.75rem 1rem',
            borderTop: '1px solid var(--adm-card-border)',
            fontSize: '0.85rem',
            color: 'var(--adm-text-muted)'
          }}>
            <div>
              Trang {phanTrang.trangHienTai} / {phanTrang.tongSoTrang} (Tổng {phanTrang.tongSoBanGhi} giao dịch)
            </div>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <button
                disabled={phanTrang.trangHienTai <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--adm-card-bg)',
                  border: '1px solid var(--adm-card-border)',
                  borderRadius: '4px',
                  cursor: phanTrang.trangHienTai <= 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Trước
              </button>
              <button
                disabled={phanTrang.trangHienTai >= phanTrang.tongSoTrang}
                onClick={() => setPage((p) => Math.min(phanTrang.tongSoTrang, p + 1))}
                style={{
                  padding: '0.35rem 0.75rem',
                  fontSize: '0.8rem',
                  backgroundColor: 'var(--adm-card-bg)',
                  border: '1px solid var(--adm-card-border)',
                  borderRadius: '4px',
                  cursor: phanTrang.trangHienTai >= phanTrang.tongSoTrang ? 'not-allowed' : 'pointer'
                }}
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Xác Nhận Hoàn Tiền */}
      {khoanCanHoan && (
        <HopThoai
          mo={Boolean(khoanCanHoan)}
          onDong={() => setKhoanCanHoan(null)}
          tieuDe="Xác nhận đã hoàn tiền cho khách hàng"
          kichThuoc="md"
          chanClickNgoai
        >
          <p style={{ fontSize: '0.85rem', color: 'var(--adm-text-muted)', margin: '0 0 1.25rem 0' }}>
            Đơn hàng: <strong>{khoanCanHoan.donHang?.MaTraCuu || khoanCanHoan.MaDonHang}</strong> • Số tiền: <strong>{dinhDangTien(khoanCanHoan.SoTien)}</strong>
          </p>

          <form onSubmit={handleXacNhanHoanTien}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--adm-text-title)' }}>
                Mã giao dịch chuyển khoản ngân hàng (tùy chọn)
              </label>
              <input
                type="text"
                placeholder="Ví dụ: FT241016892348 hoặc mã đối soát ngân hàng"
                value={maThamChieu}
                maxLength={100}
                onChange={(e) => setMaThamChieu(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.85rem',
                  backgroundColor: 'var(--adm-card-bg)',
                  border: '1px solid var(--adm-card-border)',
                  borderRadius: '6px',
                  color: 'var(--adm-text-title)',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--adm-text-title)' }}>
                Ghi chú đối soát hoàn tiền (tùy chọn)
              </label>
              <textarea
                rows={3}
                placeholder="Nhập ghi chú (VD: Đã liên hệ khách và chuyển khoản hoàn tiền qua Vietcombank STK 102...)"
                value={ghiChuHoan}
                maxLength={500}
                onChange={(e) => setGhiChuHoan(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem 0.75rem',
                  fontSize: '0.85rem',
                  backgroundColor: 'var(--adm-card-bg)',
                  border: '1px solid var(--adm-card-border)',
                  borderRadius: '6px',
                  color: 'var(--adm-text-title)',
                  resize: 'vertical',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="bn-btn bn-btn-secondary"
                disabled={dangXuLyId !== null}
                onClick={() => setKhoanCanHoan(null)}
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                className="bn-btn bn-btn-primary"
                disabled={dangXuLyId !== null}
              >
                {dangXuLyId !== null ? 'Đang lưu...' : 'Xác nhận hoàn tiền'}
              </button>
            </div>
          </form>
        </HopThoai>
      )}
    </div>
  );
}
