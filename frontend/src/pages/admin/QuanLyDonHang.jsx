import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle, 
  Truck, 
  PackageCheck, 
  XCircle, 
  Filter, 
  Check, 
  AlertCircle, 
  ArrowRight, 
  Ban 
} from 'lucide-react';

export const QuanLyDonHang = () => {
  const [donHangList, setDonHangList] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [trangThaiLoc, setTrangThaiLoc] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [loi, setLoi] = useState('');
  const [phanTrang, setPhanTrang] = useState({ page: 1, limit: 15, total: 0, totalPages: 1 });

  // Modal Chi Tiết & Hủy Đơn
  const [donDangXem, setDonDangXem] = useState(null);

  const taiDonHang = async () => {
    setDangTai(true);
    try {
      const params = {
        page: phanTrang.page,
        limit: 15
      };
      if (trangThaiLoc) params.trangThai = trangThaiLoc;

      const res = await api.get('/admin/orders', { params });
      setDonHangList(res.data.duLieu || []);
      if (res.data.phanTrang) {
        setPhanTrang(res.data.phanTrang);
      }
    } catch (err) {
      setLoi(err.response?.data?.thongDiep || 'Không thể tải danh sách đơn hàng');
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    taiDonHang();
  }, [phanTrang.page, trangThaiLoc]);

  // Luân chuyển trạng thái đơn hàng kế tiếp (State Machine)
  const handleChuyenTrangThai = async (maDonHang, trangThaiMoi, tenHanhDong) => {
    if (!window.confirm(`Xác nhận ${tenHanhDong} cho đơn hàng #${maDonHang}?`)) return;

    try {
      await api.put(`/admin/orders/${maDonHang}/status`, { trangThai: trangThaiMoi });
      setThongBao(`Đã chuyển đơn hàng #${maDonHang} sang trạng thái: ${trangThaiMoi}`);
      taiDonHang();
      setTimeout(() => setThongBao(''), 3000);
    } catch (err) {
      alert(err.response?.data?.thongDiep || 'Chuyển trạng thái thất bại');
    }
  };

  // Hủy đơn hàng và hoàn lại tồn kho
  const handleHuyDon = async (maDonHang) => {
    const lyDo = window.prompt('Nhập lý do hủy đơn hàng (bắt buộc):');
    if (lyDo === null) return;
    if (!lyDo.trim()) {
      alert('Lý do hủy đơn không được để trống');
      return;
    }

    try {
      await api.put(`/admin/orders/${maDonHang}/cancel`, { lyDoHuy: lyDo.trim() });
      setThongBao(`Đã hủy đơn hàng #${maDonHang} và hoàn lại sách vào kho.`);
      taiDonHang();
      setTimeout(() => setThongBao(''), 3000);
    } catch (err) {
      alert(err.response?.data?.thongDiep || 'Không thể hủy đơn hàng này');
    }
  };

  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);
  };

  const layBadgeTrangThai = (trangThai) => {
    switch (trangThai) {
      case 'PENDING':
        return <span className="badge badge-pending"><Clock size={13} /> Chờ duyệt</span>;
      case 'CONFIRMED':
        return <span className="badge badge-confirmed"><CheckCircle size={13} /> Đã xác nhận</span>;
      case 'SHIPPING':
        return <span className="badge badge-shipping"><Truck size={13} /> Đang giao</span>;
      case 'DELIVERED':
        return <span className="badge badge-delivered"><PackageCheck size={13} /> Đã giao</span>;
      case 'CANCELLED':
        return <span className="badge badge-cancelled"><XCircle size={13} /> Đã hủy</span>;
      default:
        return <span className="badge">{trangThai}</span>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            Quản Lý & Xử Lý Đơn Hàng
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Luân chuyển trạng thái đơn hàng theo quy trình nghiêm ngặt và hỗ trợ hoàn kho an toàn
          </p>
        </div>

        {/* Lọc Trạng Thái */}
        <div className="flex items-center gap-2">
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <select
            className="form-input"
            style={{ width: '180px', padding: '0.45rem 0.75rem' }}
            value={trangThaiLoc}
            onChange={(e) => {
              setTrangThaiLoc(e.target.value);
              setPhanTrang((prev) => ({ ...prev, page: 1 }));
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt (PENDING)</option>
            <option value="CONFIRMED">Đã xác nhận (CONFIRMED)</option>
            <option value="SHIPPING">Đang giao (SHIPPING)</option>
            <option value="DELIVERED">Đã giao (DELIVERED)</option>
            <option value="CANCELLED">Đã hủy (CANCELLED)</option>
          </select>
        </div>
      </div>

      {thongBao && (
        <div className="alert alert-success mb-4">
          <Check size={18} /> <span>{thongBao}</span>
        </div>
      )}
      {loi && (
        <div className="alert alert-danger mb-4">
          <AlertCircle size={18} /> <span>{loi}</span>
        </div>
      )}

      {/* Bảng Danh Sách Đơn Hàng */}
      {dangTai ? (
        <div className="flex justify-center py-12">
          <p className="font-serif" style={{ color: 'var(--text-muted)' }}>Đang nạp dữ liệu đơn hàng...</p>
        </div>
      ) : donHangList.length === 0 ? (
        <div className="card text-center py-12">
          <ClipboardList size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
          <h3 className="font-serif" style={{ fontSize: '1.25rem' }}>Không có đơn hàng nào</h3>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mã Đơn</th>
                <th>Thời Gian</th>
                <th>Khách Hàng & Liên Hệ</th>
                <th>Tổng Tiền</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'right' }}>Xử Lý Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {donHangList.map((don) => (
                <tr key={don.maDonHang}>
                  <td style={{ fontWeight: 700, color: 'var(--primary)' }}>#{don.maDonHang}</td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    {new Date(don.ngayTao).toLocaleString('vi-VN')}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{don.tenNguoiNhan}</div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {don.soDienThoaiNhan} • {don.diaChiGiaoHang}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>
                    {dinhDangTien(don.tongTien)}
                  </td>
                  <td>{layBadgeTrangThai(don.trangThai)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="inline-flex gap-2">
                      {/* Nút chuyển tiến theo State Machine */}
                      {don.trangThai === 'PENDING' && (
                        <button
                          onClick={() => handleChuyenTrangThai(don.maDonHang, 'CONFIRMED', 'Xác nhận đơn')}
                          className="btn btn-primary btn-sm"
                        >
                          Duyệt Đơn
                        </button>
                      )}

                      {don.trangThai === 'CONFIRMED' && (
                        <button
                          onClick={() => handleChuyenTrangThai(don.maDonHang, 'SHIPPING', 'Giao hàng')}
                          className="btn btn-primary btn-sm"
                        >
                          Giao Hàng
                        </button>
                      )}

                      {don.trangThai === 'SHIPPING' && (
                        <button
                          onClick={() => handleChuyenTrangThai(don.maDonHang, 'DELIVERED', 'Hoàn tất giao')}
                          className="btn btn-sm"
                          style={{ backgroundColor: 'var(--accent)', color: '#FFF' }}
                        >
                          Hoàn Tất
                        </button>
                      )}

                      {/* Nút hủy đơn (Áp dụng cho PENDING, CONFIRMED, SHIPPING) */}
                      {!['DELIVERED', 'CANCELLED'].includes(don.trangThai) && (
                        <button
                          onClick={() => handleHuyDon(don.maDonHang)}
                          className="btn btn-outline btn-sm"
                          style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                          title="Hủy đơn hàng và hoàn kho"
                        >
                          <Ban size={14} /> Hủy
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default QuanLyDonHang;
