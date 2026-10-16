import React, { useEffect, useState } from 'react';
import { 
  CreditCard, 
  Search, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  XCircle,
  ArrowUpRight,
  ShieldAlert,
  FileCheck2,
  Receipt
} from 'lucide-react';
import api from '@booknest/shared/api';
import { useAuth } from '@booknest/shared/auth';

export default function QuanLyThanhToan() {
  const { user } = useAuth();
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
  const [thongBao, setThongBao] = useState('');

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
      setLoi(err.response?.data?.message || 'Không thể tải danh sách thanh toán.');
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
      setThongBao(`Đã xác nhận hoàn tiền thành công cho đơn ${khoanCanHoan.donHang?.MaTraCuu || khoanCanHoan.MaDonHang}`);
      setKhoanCanHoan(null);
      setMaThamChieu('');
      setGhiChuHoan('');
      taiDanhSach();
      setTimeout(() => setThongBao(''), 5000);
    } catch (err) {
      setLoi(err.response?.data?.message || 'Lỗi khi xác nhận hoàn tiền.');
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
            backgroundColor: '#FEF2F2',
            color: '#DC2626',
            border: '1px solid #FCA5A5'
          }}>
            <ShieldAlert size={12} /> Cần hoàn tiền
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
            backgroundColor: '#EFF6FF',
            color: '#1D4ED8',
            border: '1px solid #BFDBFE'
          }}>
            <FileCheck2 size={12} /> Đã hoàn tiền
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
            backgroundColor: '#ECFDF5',
            color: '#059669',
            border: '1px solid #A7F3D0'
          }}>
            <CheckCircle2 size={12} /> Đã thanh toán
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
            backgroundColor: '#FFFBEB',
            color: '#D97706',
            border: '1px solid #FDE68A'
          }}>
            <Clock size={12} /> Chờ thanh toán
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
            backgroundColor: '#F3F4F6',
            color: '#6B7280',
            border: '1px solid #E5E7EB'
          }}>
            <XCircle size={12} /> Quá hạn
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
            backgroundColor: '#F3F4F6',
            color: '#6B7280',
            border: '1px solid #E5E7EB'
          }}>
            <XCircle size={12} /> Đã hủy
          </span>
        );
      default:
        return <span>{tt}</span>;
    }
  };

  const tabs = [
    { key: '', label: 'Tất Cả', count: thongKe?.tongTatCa },
    { key: 'CAN_HOAN_TIEN', label: 'Cần Hoàn Tiền', count: thongKe?.soLuongCanHoanTien, danger: true },
    { key: 'DA_HOAN_TIEN', label: 'Đã Hoàn Tiền', count: thongKe?.soLuongDaHoanTien },
    { key: 'DA_THANH_TOAN', label: 'Đã Thanh Toán', count: thongKe?.soLuongDaThanhToan },
    { key: 'CHO_THANH_TOAN', label: 'Chờ Thanh Toán', count: thongKe?.soLuongChoThanhToan },
    { key: 'HET_HAN', label: 'Hết Hạn / Đã Hủy', count: thongKe?.soLuongDaHuy }
  ];

  return (
    <div className="admindash-content" style={{ padding: '1.75rem', maxWidth: '1440px', margin: '0 auto' }}>
      {/* Tiêu đề trang & Nút tải lại */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, color: 'var(--adm-text-title)', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <CreditCard size={24} style={{ color: 'var(--adm-primary)' }} />
            Quản Lý Thanh Toán & Đối Soát Hoàn Tiền
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--adm-text-muted)', margin: '0.35rem 0 0' }}>
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

      {/* Thông báo Alert */}
      {thongBao && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          backgroundColor: '#ECFDF5',
          border: '1px solid #A7F3D0',
          borderRadius: '8px',
          color: '#065F46',
          marginBottom: '1.25rem',
          fontSize: '0.9rem'
        }}>
          <CheckCircle2 size={18} />
          <span>{thongBao}</span>
        </div>
      )}

      {loi && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          backgroundColor: '#FEF2F2',
          border: '1px solid #FCA5A5',
          borderRadius: '8px',
          color: '#991B1B',
          marginBottom: '1.25rem',
          fontSize: '0.9rem'
        }}>
          <AlertCircle size={18} />
          <span>{loi}</span>
        </div>
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
                  backgroundColor: coCanhBao ? '#DC2626' : laActive ? 'var(--adm-primary)' : 'var(--adm-card-border)',
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
          <Filter size={15} style={{ color: 'var(--adm-text-muted)' }} />
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
        boxShadow: 'var(--adm-card-shadow)'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--adm-table-header-bg)', borderBottom: '1px solid var(--adm-card-border)', color: 'var(--adm-text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Mã Đơn / Tra Cứu</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Khách Hàng / Nhận Hàng</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Số Tiền</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Phương Thức</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Trạng Thái</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Mã GD / Tham Chiếu</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Thời Gian</th>
                <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Hành Động</th>
              </tr>
            </thead>
            <tbody>
              {dangTai ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--adm-text-muted)' }}>
                    <RefreshCw size={24} className="animate-spin" style={{ margin: '0 auto 0.5rem' }} />
                    <div>Đang nạp dữ liệu thanh toán...</div>
                  </td>
                </tr>
              ) : danhSach.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '3rem', textAlign: 'center', color: 'var(--adm-text-muted)' }}>
                    <Receipt size={36} style={{ margin: '0 auto 0.5rem', opacity: 0.5 }} />
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
                          Mã TT: #{item.MaThanhToan} • Đơn: {don?.TrangThai || 'N/A'}
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
                        <div style={{ fontWeight: 700, color: laCanHoan ? '#DC2626' : 'var(--adm-text-title)' }}>
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
                          color: item.PhuongThuc === 'CHUYEN_KHOAN_QR' ? '#2563EB' : 'var(--adm-text-body)'
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
                          <div style={{ color: '#059669', fontSize: '0.72rem' }}>
                            Trả: {new Date(item.NgayThanhToan).toLocaleTimeString('vi-VN')}
                          </div>
                        )}
                      </td>

                      {/* Hành Động */}
                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        {laCanHoan ? (
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
                              backgroundColor: '#DC2626',
                              color: '#FFFFFF',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              boxShadow: '0 2px 4px rgba(220, 38, 38, 0.25)'
                            }}
                          >
                            <FileCheck2 size={14} />
                            Xác Nhận Đã Hoàn
                          </button>
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
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--adm-card-bg)',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '520px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--adm-card-border)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--adm-card-border)' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, color: 'var(--adm-text-title)' }}>
                Xác Nhận Đã Hoàn Tiền Cho Khách Hàng
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)', margin: '0.25rem 0 0' }}>
                Đơn hàng: {khoanCanHoan.donHang?.MaTraCuu || khoanCanHoan.MaDonHang} • Số tiền: {dinhDangTien(khoanCanHoan.SoTien)}
              </p>
            </div>

            <form onSubmit={handleXacNhanHoanTien} style={{ padding: '1.5rem' }}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--adm-text-title)' }}>
                  Mã Giao Dịch Chuyển Khoản Ngân Hàng (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: FT241016892348 hoặc mã đối soát ngân hàng"
                  value={maThamChieu}
                  onChange={(e) => setMaThamChieu(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--adm-card-bg)',
                    border: '1px solid var(--adm-card-border)',
                    borderRadius: '6px',
                    color: 'var(--adm-text-title)'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.4rem', color: 'var(--adm-text-title)' }}>
                  Ghi Chú Đối Soát Hoàn Tiền (Tùy chọn)
                </label>
                <textarea
                  rows={3}
                  placeholder="Nhập ghi chú (VD: Đã liên hệ khách và chuyển khoản hoàn tiền qua Vietcombank STK 102...)"
                  value={ghiChuHoan}
                  onChange={(e) => setGhiChuHoan(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.55rem 0.75rem',
                    fontSize: '0.85rem',
                    backgroundColor: 'var(--adm-card-bg)',
                    border: '1px solid var(--adm-card-border)',
                    borderRadius: '6px',
                    color: 'var(--adm-text-title)',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  disabled={dangXuLyId !== null}
                  onClick={() => setKhoanCanHoan(null)}
                  style={{
                    padding: '0.55rem 1.1rem',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    backgroundColor: 'transparent',
                    border: '1px solid var(--adm-card-border)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: 'var(--adm-text-body)'
                  }}
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={dangXuLyId !== null}
                  style={{
                    padding: '0.55rem 1.25rem',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    backgroundColor: '#059669',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: dangXuLyId !== null ? 'not-allowed' : 'pointer'
                  }}
                >
                  {dangXuLyId !== null ? 'Đang lưu...' : 'Xác Nhận Hoàn Tiền'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
