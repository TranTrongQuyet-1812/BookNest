import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  Truck, 
  PackageCheck, 
  XCircle, 
  AlertCircle, 
  MapPin, 
  Phone, 
  User, 
  BookOpen 
} from 'lucide-react';

export const ChiTietDonHang = () => {
  const { id } = useParams();
  const [donHang, setDonHang] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState('');

  const taiChiTiet = async () => {
    setDangTai(true);
    try {
      const res = await api.get(`/orders/${id}`);
      setDonHang(res.data.duLieu);
    } catch (err) {
      setLoi(err.response?.data?.thongDiep || 'Không tìm thấy thông tin đơn hàng này (IDOR Protected)');
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    taiChiTiet();
  }, [id]);

  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);
  };

  if (dangTai) {
    return (
      <div className="container py-12 flex justify-center">
        <p className="font-serif" style={{ color: 'var(--text-muted)' }}>Đang nạp chi tiết đơn hàng #{id}...</p>
      </div>
    );
  }

  if (loi && !donHang) {
    return (
      <div className="container py-12 text-center">
        <div className="alert alert-danger" style={{ maxWidth: '480px', margin: '0 auto 1.5rem' }}>
          <AlertCircle size={18} />
          <span>{loi}</span>
        </div>
        <Link to="/orders" className="btn btn-outline">
          <ArrowLeft size={16} /> Quay lại danh sách đơn hàng
        </Link>
      </div>
    );
  }

  // Danh sách các nấc tiến độ
  const cacBuoc = [
    { key: 'PENDING', label: 'Chờ duyệt', icon: Clock },
    { key: 'CONFIRMED', label: 'Đã xác nhận', icon: CheckCircle2 },
    { key: 'SHIPPING', label: 'Đang giao', icon: Truck },
    { key: 'DELIVERED', label: 'Đã giao', icon: PackageCheck }
  ];

  const laDonHuy = donHang.trangThai === 'CANCELLED';
  const chiSoHienTai = cacBuoc.findIndex((b) => b.key === donHang.trangThai);

  return (
    <div className="container py-8">
      <Link to="/orders" className="btn btn-outline btn-sm mb-6 inline-flex items-center gap-1">
        <ArrowLeft size={16} /> Danh sách đơn hàng của tôi
      </Link>

      <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
        <div>
          <h1 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            Chi Tiết Đơn Hàng #{donHang.maDonHang}
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Đặt vào lúc: {new Date(donHang.ngayTao).toLocaleString('vi-VN')}
          </p>
        </div>
      </div>

      {/* Dòng Thời Gian Trực Quan (Timeline) */}
      <div className="card mb-8" style={{ padding: '1.5rem' }}>
        <h3 className="font-serif" style={{ fontSize: '1.05rem', fontWeight: 600, marginBottom: '1.5rem' }}>
          Tiến Độ Đơn Hàng
        </h3>

        {laDonHuy ? (
          <div style={{
            padding: '1rem',
            backgroundColor: 'var(--danger-light)',
            borderRadius: 'var(--radius-sm)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: 'var(--danger)'
          }}>
            <XCircle size={24} />
            <div>
              <strong>Đơn hàng đã bị hủy</strong>
              <div style={{ fontSize: '0.85rem' }}>Lý do: {donHang.lyDoHuy || 'Không có ghi chú'}</div>
            </div>
          </div>
        ) : (
          <div className="flex justify-between items-center" style={{ position: 'relative' }}>
            {cacBuoc.map((buoc, index) => {
              const Icon = buoc.icon;
              const daQua = index <= chiSoHienTai;
              const laHienTai = index === chiSoHienTai;

              return (
                <div key={buoc.key} className="flex flex-col items-center flex-1" style={{ position: 'relative', zIndex: 2 }}>
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '50%',
                    backgroundColor: daQua ? 'var(--primary)' : 'var(--bg-surface)',
                    color: daQua ? 'var(--primary-text)' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: laHienTai ? '3px solid var(--accent)' : '1px solid var(--border)',
                    boxShadow: laHienTai ? 'var(--shadow-md)' : 'none',
                    transition: 'all 0.3s ease'
                  }}>
                    <Icon size={18} />
                  </div>
                  <span style={{
                    fontSize: '0.8rem',
                    fontWeight: daQua ? 600 : 400,
                    marginTop: '6px',
                    color: daQua ? 'var(--text-main)' : 'var(--text-muted)'
                  }}>
                    {buoc.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Danh Sách Sách Trong Đơn */}
        <div className="lg:col-span-2">
          <div className="card">
            <h3 className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem' }}>
              Danh Sách Sách ({donHang.chiTiet?.length || 0} mục)
            </h3>

            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tác Phẩm</th>
                    <th>Giá Mua</th>
                    <th>Số Lượng</th>
                    <th>Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {donHang.chiTiet?.map((item) => (
                    <tr key={item.maChiTietDonHang}>
                      <td>
                        <div className="flex items-center gap-3">
                          <BookOpen size={20} style={{ color: 'var(--primary)' }} />
                          <div>
                            <Link to={`/books/${item.maSach}`} style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                              {item.sach?.tieuDe}
                            </Link>
                            <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                              Tác giả: {item.sach?.tacGia}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td>{dinhDangTien(item.donGia)}</td>
                      <td style={{ fontWeight: 600 }}>{item.soLuong}</td>
                      <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        {dinhDangTien(item.thanhTien)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end py-4 px-2" style={{ borderTop: '1px solid var(--border)' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tổng thanh toán:</span>
                <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {dinhDangTien(donHang.tongTien)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Thông Tin Người Nhận */}
        <div>
          <div className="card" style={{ padding: '1.5rem' }}>
            <h3 className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem' }}>
              Địa Chỉ Giao Hàng
            </h3>

            <div className="flex flex-col gap-3" style={{ fontSize: '0.9rem' }}>
              <div className="flex items-start gap-2">
                <User size={16} style={{ color: 'var(--primary)', marginTop: '3px' }} />
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Người nhận:</span>
                  <div style={{ fontWeight: 600 }}>{donHang.tenNguoiNhan}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Phone size={16} style={{ color: 'var(--primary)', marginTop: '3px' }} />
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Điện thoại:</span>
                  <div style={{ fontWeight: 600 }}>{donHang.soDienThoaiNhan}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin size={16} style={{ color: 'var(--primary)', marginTop: '3px' }} />
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Địa chỉ nhận:</span>
                  <div>{donHang.diaChiGiaoHang}</div>
                </div>
              </div>

              {donHang.ghiChu && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  marginTop: '0.5rem'
                }}>
                  <strong>Ghi chú:</strong> {donHang.ghiChu}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChiTietDonHang;
