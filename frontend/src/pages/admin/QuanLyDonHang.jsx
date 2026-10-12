import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import PhanTrang from '../../components/PhanTrang';
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
  Ban 
} from 'lucide-react';

export const QuanLyDonHang = () => {
  const [donHangList, setDonHangList] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [trangThaiLoc, setTrangThaiLoc] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [loi, setLoi] = useState('');
  const [trang, setTrang] = useState(1);
  const [phanTrang, setPhanTrang] = useState(null);

  const taiDonHang = async () => {
    setDangTai(true);
    try {
      const params = {
        page: trang,
        limit: 15
      };
      if (trangThaiLoc) params.status = trangThaiLoc;

      const res = await api.get('/admin/orders', { params });
      const ds = res.data.data.danhSach;
      setDonHangList(Array.isArray(ds) ? ds : []);
      setPhanTrang(res.data.data.phanTrang);
    } catch (err) {
      setLoi(err.response?.data?.message || 'Không thể tải danh sách đơn hàng');
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    let daHuy = false;
    const nap = async () => {
      try {
        const params = {
          page: trang,
          limit: 15
        };
        if (trangThaiLoc) params.status = trangThaiLoc;

        const res = await api.get('/admin/orders', { params });
        if (daHuy) return;
        const ds = res.data.data.danhSach;
        setDonHangList(Array.isArray(ds) ? ds : []);
        setPhanTrang(res.data.data.phanTrang);
      } catch (err) {
        if (!daHuy) setLoi(err.response?.data?.message || 'Không thể tải danh sách đơn hàng');
      } finally {
        if (!daHuy) setDangTai(false);
      }
    };
    nap();
    return () => {
      daHuy = true;
    };
  }, [trang, trangThaiLoc]);

  // Luân chuyển trạng thái đơn hàng kế tiếp (State Machine)
  const handleChuyenTrangThai = async (maDonHang, trangThaiMoi, tenHanhDong) => {
    if (!window.confirm(`Xác nhận ${tenHanhDong} cho đơn hàng #${maDonHang}?`)) return;

    try {
      await api.put(`/admin/orders/${maDonHang}/status`, { trangThaiMoi });
      setThongBao(`Đã chuyển đơn hàng #${maDonHang} sang trạng thái: ${trangThaiMoi}`);
      taiDonHang();
      setTimeout(() => setThongBao(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Chuyển trạng thái thất bại');
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
      await api.put(`/admin/orders/${maDonHang}/cancel`, { lyDo: lyDo.trim() });
      setThongBao(`Đã hủy đơn hàng #${maDonHang} và hoàn lại sách vào kho.`);
      taiDonHang();
      setTimeout(() => setThongBao(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể hủy đơn hàng này');
    }
  };

  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);
  };

  const layBadgeTrangThai = (trangThai) => {
    switch (trangThai) {
      case 'CHO_DUYET':
        return <span className="badge badge-pending"><Clock size={13} /> Chờ duyệt</span>;
      case 'DA_XAC_NHAN':
        return <span className="badge badge-confirmed"><CheckCircle size={13} /> Đã xác nhận</span>;
      case 'DANG_GIAO':
        return <span className="badge badge-shipping"><Truck size={13} /> Đang giao</span>;
      case 'DA_GIAO':
        return <span className="badge badge-delivered"><PackageCheck size={13} /> Đã giao</span>;
      case 'DA_HUY':
        return <span className="badge badge-cancelled"><XCircle size={13} /> Đã hủy</span>;
      default:
        return <span className="badge">{trangThai}</span>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Quản Lý & Xử Lý Đơn Hàng
          </h1>
          <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Luân chuyển trạng thái đơn hàng theo quy trình State Machine nghiêm ngặt
          </p>
        </div>

        {/* Lọc Trạng Thái */}
        <div className="flex items-center gap-2">
          <Filter size={15} style={{ color: 'var(--adm-text-muted)' }} />
          <select
            className="form-input"
            style={{ width: '170px', padding: '0.4rem 0.65rem', fontSize: '0.825rem' }}
            value={trangThaiLoc}
            onChange={(e) => {
              setTrangThaiLoc(e.target.value);
              setTrang(1);
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="CHO_DUYET">Chờ duyệt</option>
            <option value="DA_XAC_NHAN">Đã xác nhận</option>
            <option value="DANG_GIAO">Đang giao</option>
            <option value="DA_GIAO">Đã giao</option>
            <option value="DA_HUY">Đã hủy</option>
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
          <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.875rem' }}>Đang nạp dữ liệu đơn hàng...</p>
        </div>
      ) : donHangList.length === 0 ? (
        <div className="card text-center py-12">
          <ClipboardList size={40} style={{ margin: '0 auto 0.75rem', color: 'var(--adm-text-muted)' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--adm-text-main)' }}>Không tìm thấy đơn hàng nào</h3>
        </div>
      ) : (
        <div className="admindash-table-wrap">
          <table className="admindash-table">
            <thead>
              <tr>
                <th style={{ width: '85px' }}>Mã Đơn</th>
                <th>Thời Gian</th>
                <th>Khách Hàng & Liên Hệ</th>
                <th>Tổng Tiền</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'right' }}>Xử Lý Trạng Thái</th>
              </tr>
            </thead>
            <tbody>
              {donHangList.map((don) => {
                const maDon = don.MaDonHang;
                const ngay = don.NgayDat;
                const nguoiNhan = don.TenNguoiNhan;
                const sdt = don.SoDienThoaiNhan;
                const diaChi = don.DiaChiGiaoHang;
                const tongTien = don.TongTien;
                const trangThai = don.TrangThai;

                return (
                  <tr key={maDon}>
                    <td style={{ fontWeight: 700, color: 'var(--adm-primary)' }} className="tabular-nums">#{maDon}</td>
                    <td style={{ fontSize: '0.825rem', color: 'var(--adm-text-muted)' }} className="tabular-nums">
                      {ngay ? new Date(ngay).toLocaleString('vi-VN') : '—'}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--adm-text-main)' }}>{nguoiNhan}</div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>
                        {sdt} • {diaChi}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: 'var(--adm-text-main)' }} className="tabular-nums">
                      {dinhDangTien(tongTien)}
                    </td>
                    <td>{layBadgeTrangThai(trangThai)}</td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="inline-flex gap-2">
                        {/* Nút chuyển tiến theo State Machine */}
                        {trangThai === 'CHO_DUYET' && (
                          <button
                            onClick={() => handleChuyenTrangThai(maDon, 'DA_XAC_NHAN', 'Xác nhận đơn')}
                            className="btn btn-primary btn-sm"
                          >
                            Duyệt Đơn
                          </button>
                        )}

                        {trangThai === 'DA_XAC_NHAN' && (
                          <button
                            onClick={() => handleChuyenTrangThai(maDon, 'DANG_GIAO', 'Giao hàng')}
                            className="btn btn-primary btn-sm"
                          >
                            Giao Hàng
                          </button>
                        )}

                        {trangThai === 'DANG_GIAO' && (
                          <button
                            onClick={() => handleChuyenTrangThai(maDon, 'DA_GIAO', 'Hoàn tất giao')}
                            className="btn btn-sm"
                            style={{ backgroundColor: 'var(--adm-success)', color: '#FFF' }}
                          >
                            Hoàn Tất
                          </button>
                        )}

                        {/* Nút hủy đơn (Áp dụng cho CHO_DUYET, DA_XAC_NHAN, DANG_GIAO) */}
                        {!['DA_GIAO', 'DA_HUY'].includes(trangThai) && (
                          <button
                            onClick={() => handleHuyDon(maDon)}
                            className="btn btn-outline btn-sm"
                            style={{ color: 'var(--adm-danger)', borderColor: '#FECACA' }}
                            title="Hủy đơn hàng và hoàn kho"
                          >
                            <Ban size={14} /> Hủy
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <PhanTrang phanTrang={phanTrang} onChuyenTrang={setTrang} donVi="đơn" />
    </div>
  );
};

export default QuanLyDonHang;
