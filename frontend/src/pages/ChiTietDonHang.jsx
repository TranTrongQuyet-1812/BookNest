import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { 
  ArrowLeft, 
  Clock, 
  CheckCircle2, 
  Truck, 
  PackageCheck, 
  XCircle, 
  MapPin, 
  Phone, 
  User, 
  BookOpen,
  QrCode,
  CreditCard,
  ShieldCheck
} from 'lucide-react';
import { KhungThanhToanVietQR } from '../components/KhungThanhToanVietQR';
import { laySocket, thamGiaDonHang, roiDonHang } from '../services/socket';
import { useThongBao, ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';
import { useHuyDonHang } from '../hooks/useHuyDonHang';
import DemNguocHanQR from '../components/DemNguocHanQR';

export const ChiTietDonHang = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const handleQuayLai = () => {
    if (location.state?.from) {
      navigate(location.state.from);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/orders');
  };
  const { thongBao: tb, xacNhan } = useThongBao();
  const { thucHienHuyDon, dangHuy } = useHuyDonHang();
  const [donHang, setDonHang] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState('');
  const [thongTinThanhToan, setThongTinThanhToan] = useState(null);
  const [hienModalQR, setHienModalQR] = useState(false);
  const [duLieuQR, setDuLieuQR] = useState(null);
  const [dangTaoQR, setDangTaoQR] = useState(false);

  const napThongTinThanhToan = async () => {
    try {
      const resPay = await api.get(`/payments/order/${id}`);
      if (resPay.data?.data) {
        setThongTinThanhToan(resPay.data.data);
        // Hỏi thanh toán là lúc máy chủ phát hiện QR quá hạn và hủy đơn: nạp lại đơn để trang hiện đúng "Đã hủy"
        if (resPay.data.data.trangThai === 'HET_HAN') {
          const resDon = await api.get(`/orders/my-orders/${id}`);
          setDonHang(resDon.data.data);
        }
      }
    } catch (_err) {
      console.warn('Đơn hàng chưa có thông tin thanh toán QR hoặc dùng COD');
    }
  };

  const napChiTiet = async () => {
    try {
      const res = await api.get(`/orders/my-orders/${id}`);
      setDonHang(res.data.data);
      napThongTinThanhToan();
    } catch (err) {
      setLoi(loiTuApi(err, 'Không tìm thấy thông tin đơn hàng này'));
    } finally {
      setDangTai(false);
    }
  };

  const handleHuyDon = async () => {
    const daThanhToan =
      (thongTinThanhToan?.phuongThuc === 'CHUYEN_KHOAN_QR' && thongTinThanhToan?.trangThai === 'DA_THANH_TOAN') ||
      (donHang?.thanhToan?.PhuongThuc === 'CHUYEN_KHOAN_QR' && donHang?.thanhToan?.TrangThai === 'DA_THANH_TOAN');
    await thucHienHuyDon(id, napChiTiet, daThanhToan);
  };

  // Khách chủ động đổi sang COD trước khi QR hết hạn (hết hạn là đơn bị hủy)
  const handleDoiSangCOD = async () => {
    const dongY = await xacNhan({
      tieuDe: 'Chuyển sang thanh toán khi nhận hàng',
      noiDung: 'Bạn có chắc chắn muốn chuyển hình thức thanh toán của đơn hàng này sang Tiền mặt khi nhận hàng (COD)?',
      nhanXacNhan: 'Đổi sang COD',
    });
    if (!dongY) return;

    try {
      await api.post(`/payments/switch-to-cod/${id}`);
      tb.thanhCong('Đã chuyển sang hình thức thanh toán COD thành công.');
      setHienModalQR(false);
      await napThongTinThanhToan();
    } catch (err) {
      tb.loiTuApi(err, 'Không thể đổi sang thanh toán khi nhận hàng lúc này');
      napThongTinThanhToan();
    }
  };

  const handleMoQRThanhToan = async () => {
    setDangTaoQR(true);
    try {
      const res = await api.post(`/payments/create-qr/${id}`);
      setDuLieuQR(res.data?.data);
      setHienModalQR(true);
    } catch (err) {
      tb.loiTuApi(err, 'Không thể tạo mã QR thanh toán lúc này');
    } finally {
      setDangTaoQR(false);
    }
  };

  useEffect(() => {
    napChiTiet();
  }, [id]);

  useEffect(() => {
    const socket = laySocket();
    if (!socket || !id) return;

    thamGiaDonHang(id);

    const xuLyCapNhat = (duLieu) => {
      if (!duLieu?.maTraCuu || duLieu?.maTraCuu === id || duLieu?.maDonHang === donHang?.MaDonHang) {
        napChiTiet();
      }
    };

    socket.on('donHang:capNhatTrangThai', xuLyCapNhat);
    socket.on('thanhToan:daThanhToan', xuLyCapNhat);
    socket.on('thanhToan:canHoanTien', xuLyCapNhat);
    socket.on('thanhToan:daHoanTien', xuLyCapNhat);

    return () => {
      roiDonHang(id);
      socket.off('donHang:capNhatTrangThai', xuLyCapNhat);
      socket.off('thanhToan:daThanhToan', xuLyCapNhat);
      socket.off('thanhToan:canHoanTien', xuLyCapNhat);
      socket.off('thanhToan:daHoanTien', xuLyCapNhat);
    };
  }, [id, donHang?.MaDonHang]);

  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);
  };

  if (dangTai) {
    return (
      <div className="container py-12 flex justify-center">
        <p className="font-serif" style={{ color: 'var(--text-muted)' }}>Đang nạp chi tiết đơn hàng {id}...</p>
      </div>
    );
  }

  if (loi && !donHang) {
    return (
      <div className="container py-12 text-center">
        <div style={{ maxWidth: '480px', margin: '0 auto 1.5rem', textAlign: 'left' }}>
          <ThongBaoTaiCho loai="loi">{loi}</ThongBaoTaiCho>
        </div>
        <button type="button" onClick={handleQuayLai} className="btn btn-outline">
          <ArrowLeft size={16} /> Quay lại danh sách đơn hàng
        </button>
      </div>
    );
  }

  // Danh sách các nấc tiến độ
  const cacBuoc = [
    { key: 'CHO_DUYET', label: 'Chờ duyệt', icon: Clock },
    { key: 'DA_DUYET', label: 'Đã duyệt', icon: CheckCircle2 },
    { key: 'DA_LAY_HANG', label: 'Đã lấy hàng', icon: Truck },
    { key: 'DA_GIAO', label: 'Đã giao', icon: PackageCheck }
  ];

  const trangThaiDon = donHang.TrangThai;
  // id trên đường dẫn chính là mã tra cứu; MaDonHang tăng dần bị ẩn khỏi API phía khách
  const maHienThi = donHang.MaTraCuu ?? id;
  const ngayTaoDon = donHang.NgayDat;
  const danhSachMon = donHang.chiTietDonHang;
  // Lý do hủy nằm trong ghi chú của dòng lịch sử chuyển sang DA_HUY
  const lyDoHuy = donHang.lichSuTrangThai?.find((ls) => ls.TrangThaiMoi === 'DA_HUY')?.GhiChu;

  const laDonHuy = trangThaiDon === 'DA_HUY';
  const chiSoHienTai = cacBuoc.findIndex((b) => b.key === trangThaiDon);

  return (
    <div className="container py-8">
      <button 
        type="button" 
        onClick={handleQuayLai} 
        className="btn btn-outline btn-sm mb-6 inline-flex items-center gap-1"
      >
        <ArrowLeft size={16} /> Quay lại danh sách đơn hàng
      </button>

      <div className="flex items-center justify-between flex-wrap gap-2 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700 }}>
              Chi Tiết Đơn Hàng {maHienThi}
            </h1>
            {((thongTinThanhToan?.phuongThuc === 'CHUYEN_KHOAN_QR' && thongTinThanhToan?.trangThai === 'DA_THANH_TOAN') ||
              (donHang?.thanhToan?.PhuongThuc === 'CHUYEN_KHOAN_QR' && donHang?.thanhToan?.TrangThai === 'DA_THANH_TOAN')) &&
              trangThaiDon === 'CHO_DUYET' && (
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                padding: '2px 8px',
                borderRadius: '4px',
                fontSize: '0.8rem',
                fontWeight: 600,
                backgroundColor: '#D1FAE5',
                color: '#065F46',
                border: '1px solid #A7F3D0'
              }}>
                <CheckCircle2 size={14} /> Đã thanh toán
              </span>
            )}
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
            Đặt vào lúc: {ngayTaoDon ? new Date(ngayTaoDon).toLocaleString('vi-VN') : ''}
          </p>
        </div>
        {trangThaiDon === 'CHO_DUYET' && (
          <button
            type="button"
            disabled={dangHuy}
            onClick={handleHuyDon}
            className="btn btn-outline btn-sm"
            style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
          >
            {dangHuy ? 'Đang hủy...' : 'Hủy Đơn Hàng'}
          </button>
        )}
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
              <div style={{ fontSize: '0.85rem' }}>Lý do: {lyDoHuy || 'Không có ghi chú'}</div>
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
              Danh Sách Sách ({danhSachMon.length} mục)
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
                  {danhSachMon.map((item) => {
                    const maSach = item.MaSach;
                    const tenSach = item.sach?.TenSach;
                    const tacGia = item.sach?.TacGia ?? 'Đang cập nhật';
                    const donGia = parseFloat(item.DonGia ?? 0);
                    const soLuong = item.SoLuong ?? 0;
                    const thanhTien = donGia * soLuong;

                    return (
                      <tr key={maSach}>
                        <td>
                          <div className="flex items-center gap-3">
                            <BookOpen size={20} style={{ color: 'var(--primary)' }} />
                            <div>
                              <Link to={`/books/${maSach}`} style={{ fontWeight: 600, color: 'var(--text-main)' }}>
                                {tenSach}
                              </Link>
                              <span style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                Tác giả: {tacGia}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>{dinhDangTien(donGia)}</td>
                        <td style={{ fontWeight: 600 }}>{soLuong}</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary)' }}>
                          {dinhDangTien(thanhTien)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end py-4 px-2" style={{ borderTop: '1px solid var(--border)' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Tổng thanh toán:</span>
                <span style={{ display: 'block', fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)' }}>
                  {dinhDangTien(donHang.TongTien)}
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
                  <div style={{ fontWeight: 600 }}>{donHang.TenNguoiNhan}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Phone size={16} style={{ color: 'var(--primary)', marginTop: '3px' }} />
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Điện thoại:</span>
                  <div style={{ fontWeight: 600 }}>{donHang.SoDienThoaiNhan}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin size={16} style={{ color: 'var(--primary)', marginTop: '3px' }} />
                <div>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Địa chỉ nhận:</span>
                  <div>{donHang.DiaChiGiaoHang}</div>
                </div>
              </div>

              {donHang.GhiChu && (
                <div style={{
                  padding: '0.75rem',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: '0.85rem',
                  marginTop: '0.5rem'
                }}>
                  <strong>Ghi chú:</strong> {donHang.GhiChu}
                </div>
              )}
            </div>
          </div>

          {/* Card Thanh Toán */}
          <div className="card mt-4" style={{ padding: '1.5rem' }}>
            <h3 className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '1rem' }}>
              Phương Thức Thanh Toán
            </h3>

              <div className="flex flex-col gap-3" style={{ fontSize: '0.9rem' }}>
                <div className="flex items-start gap-2">
                  <CreditCard size={16} style={{ color: 'var(--primary)', marginTop: '3px' }} />
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Hình thức:</span>
                    <div style={{ fontWeight: 600 }}>
                      {thongTinThanhToan?.phuongThuc === 'CHUYEN_KHOAN_QR' 
                        ? 'Chuyển khoản VietQR (payOS)' 
                        : 'Thanh toán tiền mặt khi nhận hàng (COD)'}
                    </div>
                  </div>
                </div>

                <div className="flex items-start gap-2">
                  <ShieldCheck size={16} style={{ color: 'var(--primary)', marginTop: '3px' }} />
                  <div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Tình trạng:</span>
                    <div>
                      {thongTinThanhToan?.trangThai === 'DA_THANH_TOAN' ? (
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: '#e6f4ea',
                          color: '#137333',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          ✓ Đã thanh toán
                        </span>
                      ) : thongTinThanhToan?.trangThai === 'HET_HAN' ? (
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: '#fdeceb',
                          color: '#a43b3b',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          Quá hạn thanh toán, đơn đã bị hủy
                        </span>
                      ) : thongTinThanhToan?.trangThai === 'CAN_HOAN_TIEN' ? (
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: '#fef7e0',
                          color: '#b06000',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          Cửa hàng đang xử lý hoàn tiền
                        </span>
                      ) : thongTinThanhToan?.trangThai === 'DA_HOAN_TIEN' ? (
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: '#e6f4ea',
                          color: '#137333',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          ✓ Đã hoàn tiền
                        </span>
                      ) : thongTinThanhToan?.phuongThuc === 'CHUYEN_KHOAN_QR' ? (
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          backgroundColor: '#fef7e0',
                          color: '#b06000',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          <span>⏳ Chờ chuyển khoản</span>
                          {thongTinThanhToan?.ngayHetHan && (
                            <>
                              <span style={{ opacity: 0.5 }}>•</span>
                              <DemNguocHanQR ngayHetHan={thongTinThanhToan.ngayHetHan} />
                            </>
                          )}
                        </span>
                      ) : (
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: 'var(--bg-surface)',
                          color: 'var(--text-muted)',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '4px'
                        }}>
                          Thanh toán khi nhận hàng
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Đơn chuyển khoản còn chờ tiền (chưa hết hạn): mở lại đúng mã QR cũ, hoặc đổi sang COD */}
                {thongTinThanhToan?.phuongThuc === 'CHUYEN_KHOAN_QR' &&
                 thongTinThanhToan?.trangThai === 'CHO_THANH_TOAN' &&
                 !['DA_HUY', 'DA_GIAO'].includes(donHang.TrangThai) && (
                  <div className="flex gap-2 mt-2" style={{ flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      disabled={dangTaoQR}
                      onClick={handleMoQRThanhToan}
                      className="btn btn-primary"
                      style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', borderRadius: '6px' }}
                    >
                      <QrCode size={15} />
                      {dangTaoQR ? 'Đang tải mã...' : 'Xem Mã QR Thanh Toán'}
                    </button>
                    <button
                      type="button"
                      onClick={handleDoiSangCOD}
                      className="btn btn-outline"
                      style={{ padding: '0.6rem 1rem', fontSize: '0.85rem', borderRadius: '6px' }}
                    >
                      Đổi sang thanh toán khi nhận hàng
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      {/* Modal / Khung hiển thị thanh toán VietQR payOS */}
      {hienModalQR && duLieuQR && (
        <KhungThanhToanVietQR
          duLieuQR={duLieuQR}
          onThanhToanThanhCong={() => {
            setHienModalQR(false);
            napThongTinThanhToan();
          }}
          onDong={() => setHienModalQR(false)}
          onDoiSangCOD={handleDoiSangCOD}
        />
      )}
    </div>
  );
};

export default ChiTietDonHang;
