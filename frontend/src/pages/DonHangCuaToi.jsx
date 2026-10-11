import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { 
  Package, 
  Clock, 
  CheckCircle, 
  Truck, 
  XCircle, 
  AlertCircle, 
  ArrowRight, 
  Filter 
} from 'lucide-react';

export const DonHangCuaToi = () => {
  const [donHangList, setDonHangList] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState('');
  const [trangThaiLoc, setTrangThaiLoc] = useState('');

  // Tải danh sách đơn hàng của chính mình
  const taiDonHang = async () => {
    setDangTai(true);
    try {
      const params = {};
      if (trangThaiLoc) params.status = trangThaiLoc;

      const res = await api.get('/orders/my-orders', { params });
      const ds = res.data.data?.danhSach || res.data.data || [];
      setDonHangList(Array.isArray(ds) ? ds : []);
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
        const params = {};
        if (trangThaiLoc) params.status = trangThaiLoc;

        const res = await api.get('/orders/my-orders', { params });
        if (daHuy) return;
        const ds = res.data.data?.danhSach || res.data.data || [];
        setDonHangList(Array.isArray(ds) ? ds : []);
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
  }, [trangThaiLoc]);

  // Hủy đơn hàng PENDING
  const handleHuyDon = async (maDonHang) => {
    const lyDo = window.prompt('Vui lòng nhập lý do hủy đơn hàng:');
    if (lyDo === null) return;

    try {
      await api.put(`/orders/${maDonHang}/cancel`, {
        lyDo: lyDo.trim() || 'Khách hàng yêu cầu hủy đơn'
      });
      alert('Đã hủy đơn hàng thành công. Số lượng sách đã được hoàn trả lại vào kho.');
      taiDonHang();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể hủy đơn hàng này');
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
        return <span className="badge badge-shipping"><Truck size={13} /> Đang giao hàng</span>;
      case 'DELIVERED':
        return <span className="badge badge-delivered"><CheckCircle size={13} /> Đã giao thành công</span>;
      case 'CANCELLED':
        return <span className="badge badge-cancelled"><XCircle size={13} /> Đã hủy</span>;
      default:
        return <span className="badge">{trangThai}</span>;
    }
  };

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            Lịch Sử Đơn Hàng
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Theo dõi hành trình sách và tiến độ giao hàng của bạn
          </p>
        </div>

        {/* Bộ lọc trạng thái */}
        <div className="flex items-center gap-2">
          <Filter size={16} style={{ color: 'var(--text-muted)' }} />
          <select
            className="form-input"
            style={{ width: '180px', padding: '0.45rem 0.75rem' }}
            value={trangThaiLoc}
            onChange={(e) => setTrangThaiLoc(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="PENDING">Chờ duyệt</option>
            <option value="CONFIRMED">Đã xác nhận</option>
            <option value="SHIPPING">Đang giao</option>
            <option value="DELIVERED">Đã giao thành công</option>
            <option value="CANCELLED">Đã hủy</option>
          </select>
        </div>
      </div>

      {loi && (
        <div className="alert alert-danger mb-4">
          <AlertCircle size={18} />
          <span>{loi}</span>
        </div>
      )}

      {dangTai ? (
        <div className="flex justify-center py-12">
          <p className="font-serif" style={{ color: 'var(--text-muted)' }}>Đang tải danh sách đơn...</p>
        </div>
      ) : donHangList.length === 0 ? (
        <div className="card text-center py-12" style={{ textAlign: 'center' }}>
          <Package size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-muted)' }} />
          <h3 className="font-serif" style={{ fontSize: '1.25rem' }}>Bạn chưa có đơn hàng nào</h3>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', marginBottom: '1.5rem' }}>
            Khám phá những tựa sách yêu thích và tạo đơn hàng đầu tiên của bạn
          </p>
          <Link to="/" className="btn btn-primary">
            Khám Phá Sách Ngay
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {donHangList.map((don) => {
            const maDon = don.MaDonHang ?? don.maDonHang;
            const ngay = don.NgayDat ?? don.ngayTao ?? don.createdAt;
            const trangThai = don.TrangThai ?? don.trangThai;
            const nguoiNhan = don.TenNguoiNhan ?? don.tenNguoiNhan;
            const sdt = don.SoDienThoaiNhan ?? don.soDienThoaiNhan;
            const diaChi = don.DiaChiGiaoHang ?? don.diaChiGiaoHang;
            const tongTien = don.TongTien ?? don.tongTien;
            const lyDoHuy = don.LyDoHuy ?? don.lyDoHuy;

            return (
              <div key={maDon} className="card" style={{ padding: '1.25rem' }}>
                <div className="flex items-center justify-between flex-wrap gap-2 pb-3" style={{ borderBottom: '1px solid var(--border)' }}>
                  <div className="flex items-center gap-3">
                    <span style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--primary)' }}>
                      #{maDon}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      {ngay ? new Date(ngay).toLocaleString('vi-VN') : ''}
                    </span>
                  </div>
                  <div>{layBadgeTrangThai(trangThai)}</div>
                </div>

                <div className="py-3 grid grid-cols-1 md:grid-cols-3 gap-3" style={{ fontSize: '0.9rem' }}>
                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Người nhận:</span>
                    <strong>{nguoiNhan}</strong> ({sdt})
                  </div>

                  <div>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Địa chỉ:</span>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {diaChi}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ color: 'var(--text-muted)', display: 'block', fontSize: '0.8rem' }}>Tổng thanh toán:</span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--primary)' }}>
                      {dinhDangTien(tongTien)}
                    </span>
                  </div>
                </div>

                {lyDoHuy && (
                  <div style={{
                    padding: '0.5rem 0.75rem',
                    backgroundColor: 'var(--danger-light)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.825rem',
                    color: 'var(--danger)',
                    marginBottom: '0.75rem'
                  }}>
                    Lý do hủy: {lyDoHuy}
                  </div>
                )}

                <div className="flex justify-end items-center gap-2 pt-2" style={{ borderTop: '1px solid var(--border)' }}>
                  {trangThai === 'PENDING' && (
                    <button
                      onClick={() => handleHuyDon(maDon)}
                      className="btn btn-outline btn-sm"
                      style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                    >
                      Hủy Đơn Hàng
                    </button>
                  )}
                  <Link to={`/orders/${maDon}`} className="btn btn-primary btn-sm">
                    Xem Chi Tiết <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DonHangCuaToi;
