import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { laySocket, thamGiaNhanVien, roiNhanVien } from '../../services/socket';
import { useThongBao, ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';
import PhanTrang from '../../components/PhanTrang';
import { 
  ClipboardList, 
  Clock, 
  CheckCircle, 
  Truck, 
  PackageCheck, 
  XCircle, 
  Filter, 
  Ban,
  Eye,
  Calendar,
  RotateCcw,
  X,
  History,
  CreditCard,
  ShoppingBag
} from 'lucide-react';

const NHAN_TRANG_THAI_DON_HANG = {
  CHO_DUYET: 'Chờ duyệt',
  DA_DUYET: 'Đã duyệt',
  DA_LAY_HANG: 'Đã lấy hàng',
  DA_GIAO: 'Đã giao hàng',
  DA_HUY: 'Đã hủy',
};

const layTenTrangThai = (ma) => NHAN_TRANG_THAI_DON_HANG[ma] || ma || '';

// Đơn có nằm trong số đơn nhân viên này vừa tự thao tác (trong 5 giây gần nhất) hay không
const laVuaTuThaoTac = (donDaThaoTac, maDonHang) => {
  const luc = donDaThaoTac.get(String(maDonHang));
  return Boolean(luc) && Date.now() - luc < 5000;
};

export const QuanLyDonHang = () => {
  const { thongBao: tb, xacNhan, nhapLyDo } = useThongBao();
  const [searchParams, setSearchParams] = useSearchParams();
  const trang = parseInt(searchParams.get('page') || '1', 10);
  const trangThaiLoc = searchParams.get('status') || '';
  const tuNgayLoc = searchParams.get('tuNgay') || '';
  const denNgayLoc = searchParams.get('denNgay') || '';

  const [donHangList, setDonHangList] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState('');
  const [phanTrang, setPhanTrang] = useState(null);
  const [lanTai, setLanTai] = useState(0);

  // State xem chi tiết đơn hàng & timeline lịch sử trạng thái
  const [donDangXemId, setDonDangXemId] = useState(null);
  const [chiTietDon, setChiTietDon] = useState(null);
  const [dangTaiChiTiet, setDangTaiChiTiet] = useState(false);
  const [loiChiTiet, setLoiChiTiet] = useState('');

  const taiLai = () => setLanTai((n) => n + 1);

  // Đơn mà chính nhân viên này vừa đổi trạng thái hoặc hủy: sự kiện realtime của đơn đó đến ngay sau,
  // nên bỏ qua toast của sự kiện (đã có toast kết quả thao tác), vẫn tải lại danh sách
  const donVuaTuThaoTac = useRef(new Map());

  // Lắng nghe sự kiện realtime đơn hàng từ Socket.IO cho nhân viên quản trị
  useEffect(() => {
    const socket = laySocket();
    const token = localStorage.getItem('booknest_token');
    thamGiaNhanVien(token);

    const xuLyDonMoi = (duLieu) => {
      tb.thongTin(`Có đơn hàng mới #${duLieu?.maDonHang || ''} vừa được tạo!`);
      taiLai();
    };

    const xuLyCapNhatTrangThai = (duLieu) => {
      if (!laVuaTuThaoTac(donVuaTuThaoTac.current, duLieu?.maDonHang)) tb.thongTin(`Đơn hàng #${duLieu?.maDonHang || ''} vừa cập nhật trạng thái: ${layTenTrangThai(duLieu?.trangThaiMoi)}`);
      taiLai();
    };

    socket.on('donHang:donMoi', xuLyDonMoi);
    socket.on('donHang:capNhatTrangThai', xuLyCapNhatTrangThai);

    return () => {
      socket.off('donHang:donMoi', xuLyDonMoi);
      socket.off('donHang:capNhatTrangThai', xuLyCapNhatTrangThai);
      roiNhanVien();
    };
  }, [tb]);

  // Nạp danh sách đơn hàng
  useEffect(() => {
    let daHuy = false;
    const nap = async () => {
      setDangTai(true);
      try {
        const params = {
          page: trang,
          limit: 15
        };
        if (trangThaiLoc) params.status = trangThaiLoc;
        if (tuNgayLoc) params.tuNgay = tuNgayLoc;
        if (denNgayLoc) params.denNgay = denNgayLoc;

        const res = await api.get('/admin/orders', { params });
        if (daHuy) return;
        const ds = res.data.data.danhSach;
        setDonHangList(Array.isArray(ds) ? ds : []);
        setPhanTrang(res.data.data.phanTrang);
      } catch (err) {
        if (!daHuy) setLoi(loiTuApi(err, 'Không thể tải danh sách đơn hàng'));
      } finally {
        if (!daHuy) setDangTai(false);
      }
    };
    nap();
    return () => {
      daHuy = true;
    };
  }, [trang, trangThaiLoc, tuNgayLoc, denNgayLoc, lanTai]);

  // Nạp chi tiết đơn hàng khi mở modal
  useEffect(() => {
    if (!donDangXemId) return;

    let daHuy = false;
    api.get(`/admin/orders/${donDangXemId}`)
      .then((res) => {
        if (!daHuy) setChiTietDon(res.data.data);
      })
      .catch((err) => {
        if (!daHuy) setLoiChiTiet(loiTuApi(err, 'Không thể tải thông tin chi tiết đơn hàng'));
      })
      .finally(() => {
        if (!daHuy) setDangTaiChiTiet(false);
      });

    return () => {
      daHuy = true;
    };
  }, [donDangXemId, lanTai]);

  const handleMoChiTiet = (maDon) => {
    setDonDangXemId(maDon);
    setDangTaiChiTiet(true);
    setLoiChiTiet('');
  };

  const handleDongChiTiet = () => {
    setDonDangXemId(null);
    setChiTietDon(null);
    setLoiChiTiet('');
    setDangTaiChiTiet(false);
  };

  const handleLocTrangThai = (status) => {
    const params = new URLSearchParams(searchParams);
    if (status) {
      params.set('status', status);
    } else {
      params.delete('status');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleApDungLocNgay = (e) => {
    if (e) e.preventDefault();
    const form = e.currentTarget;
    const tu = form.tuNgay.value;
    const den = form.denNgay.value;
    const params = new URLSearchParams(searchParams);
    if (tu) {
      params.set('tuNgay', tu);
    } else {
      params.delete('tuNgay');
    }
    if (den) {
      params.set('denNgay', den);
    } else {
      params.delete('denNgay');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleXoaTatCaLoc = () => {
    const params = new URLSearchParams();
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleChuyenTrang = (trangMoi) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', trangMoi);
    setSearchParams(params);
  };

  // Luân chuyển trạng thái đơn hàng kế tiếp (State Machine)
  const handleChuyenTrangThai = async (maDonHang, trangThaiMoi, tenHanhDong) => {
    const dongY = await xacNhan({
      tieuDe: 'Cập nhật trạng thái đơn hàng',
      noiDung: `Chuyển đơn hàng #${maDonHang} sang trạng thái "${layTenTrangThai(trangThaiMoi)}"?`,
      nhanXacNhan: tenHanhDong,
    });
    if (!dongY) return;

    donVuaTuThaoTac.current.set(String(maDonHang), Date.now());
    try {
      await api.put(`/admin/orders/${maDonHang}/status`, { trangThaiMoi });
      tb.thanhCong(`Đã chuyển đơn hàng #${maDonHang} sang trạng thái: ${layTenTrangThai(trangThaiMoi)}`);
      taiLai();
    } catch (err) {
      tb.loiTuApi(err, 'Chuyển trạng thái thất bại');
    }
  };

  // Hủy đơn hàng và hoàn lại tồn kho
  const handleHuyDon = async (maDonHang, don) => {
    const laQkDaTraTien = don?.thanhToan?.PhuongThuc === 'CHUYEN_KHOAN_QR' && don?.thanhToan?.TrangThai === 'DA_THANH_TOAN';
    const noiDungXacNhan = laQkDaTraTien
      ? 'Thao tác này sẽ hủy đơn và hoàn trả toàn bộ số lượng sách vào kho. Khoản đã thanh toán sẽ chuyển sang danh sách Cần hoàn tiền.'
      : 'Thao tác này sẽ hủy đơn và hoàn trả toàn bộ số lượng sách vào kho.';

    const lyDo = await nhapLyDo({
      tieuDe: `Hủy đơn hàng #${maDonHang}`,
      noiDung: noiDungXacNhan,
      nhan: 'Lý do hủy đơn',
      placeholder: 'Nhập lý do hủy đơn hàng (bắt buộc)...',
      batBuoc: true,
      nguyHiem: true,
      nhanXacNhan: 'Xác nhận hủy đơn',
    });
    if (lyDo === null) return;

    donVuaTuThaoTac.current.set(String(maDonHang), Date.now());
    try {
      await api.put(`/admin/orders/${maDonHang}/cancel`, { lyDo });
      const thongBaoThanhCong = laQkDaTraTien
        ? `Đã hủy đơn hàng #${maDonHang} và hoàn lại sách vào kho. Vui lòng vào mục Quản lý thanh toán để thực hiện hoàn tiền.`
        : `Đã hủy đơn hàng #${maDonHang} và hoàn lại sách vào kho.`;
      tb.thanhCong(thongBaoThanhCong);
      taiLai();
    } catch (err) {
      tb.loiTuApi(err, 'Không thể hủy đơn hàng này');
    }
  };

  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);
  };

  const layBadgeTrangThai = (trangThai) => {
    switch (trangThai) {
      case 'CHO_DUYET':
        return <span className="badge badge-pending"><Clock size={13} /> Chờ duyệt</span>;
      case 'DA_DUYET':
        return <span className="badge badge-confirmed"><CheckCircle size={13} /> Đã duyệt</span>;
      case 'DA_LAY_HANG':
        return <span className="badge badge-shipping"><Truck size={13} /> Đã lấy hàng</span>;
      case 'DA_GIAO':
        return <span className="badge badge-delivered"><PackageCheck size={13} /> Đã giao</span>;
      case 'DA_HUY':
        return <span className="badge badge-cancelled"><XCircle size={13} /> Đã hủy</span>;
      default:
        return <span className="badge">{trangThai}</span>;
    }
  };

  const coLocDangChay = Boolean(trangThaiLoc || tuNgayLoc || denNgayLoc);

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
      </div>

      {/* Thanh Công Cụ Bộ Lọc: Trạng thái & Khoảng Ngày */}
      <div className="card mb-5" style={{ padding: '0.9rem 1.15rem' }}>
        <form key={`${tuNgayLoc}_${denNgayLoc}`} onSubmit={handleApDungLocNgay} className="flex items-center flex-wrap gap-3">
          {/* Lọc Trạng Thái */}
          <div className="flex items-center gap-2">
            <Filter size={15} style={{ color: 'var(--adm-text-muted)' }} />
            <select
              className="form-input"
              style={{ width: '160px', padding: '0.4rem 0.65rem', fontSize: '0.825rem' }}
              value={trangThaiLoc}
              onChange={(e) => handleLocTrangThai(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="CHO_DUYET">Chờ duyệt</option>
              <option value="DA_DUYET">Đã duyệt</option>
              <option value="DA_LAY_HANG">Đã lấy hàng</option>
              <option value="DA_GIAO">Đã giao</option>
              <option value="DA_HUY">Đã hủy</option>
            </select>
          </div>

          {/* Lọc Từ Ngày */}
          <div className="flex items-center gap-2">
            <Calendar size={15} style={{ color: 'var(--adm-text-muted)' }} />
            <span style={{ fontSize: '0.825rem', color: 'var(--adm-text-muted)' }}>Từ:</span>
            <input
              type="date"
              name="tuNgay"
              className="form-input"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.825rem' }}
              defaultValue={tuNgayLoc}
            />
          </div>

          {/* Lọc Đến Ngày */}
          <div className="flex items-center gap-2">
            <span style={{ fontSize: '0.825rem', color: 'var(--adm-text-muted)' }}>Đến:</span>
            <input
              type="date"
              name="denNgay"
              className="form-input"
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.825rem' }}
              defaultValue={denNgayLoc}
            />
          </div>

          <button type="submit" className="btn btn-primary btn-sm" style={{ padding: '0.42rem 0.85rem' }}>
            Lọc Ngày
          </button>

          {coLocDangChay && (
            <button
              type="button"
              onClick={handleXoaTatCaLoc}
              className="btn btn-outline btn-sm"
              style={{ padding: '0.42rem 0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}
            >
              <RotateCcw size={13} /> Đặt Lại
            </button>
          )}
        </form>
      </div>

      {loi && (
        <ThongBaoTaiCho loai="loi" onDong={() => setLoi('')}>
          {loi}
        </ThongBaoTaiCho>
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
          {coLocDangChay && (
            <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.85rem', marginTop: '0.35rem' }}>
              Hãy thử nới lỏng hoặc xóa bộ lọc ngày/trạng thái.
            </p>
          )}
        </div>
      ) : (
        <div className="admindash-table-wrap">
          <table className="admindash-table">
            <thead>
              <tr>
                <th style={{ width: '100px' }}>Mã Đơn</th>
                <th>Thời Gian</th>
                <th>Khách Hàng & Liên Hệ</th>
                <th>Tổng Tiền</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
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
                    <td>
                      <button
                        type="button"
                        onClick={() => handleMoChiTiet(maDon)}
                        style={{
                          background: 'none',
                          border: 'none',
                          padding: 0,
                          textAlign: 'left',
                          cursor: 'pointer',
                          color: 'var(--adm-primary)',
                          fontWeight: 700
                        }}
                        className="tabular-nums"
                        title="Xem chi tiết đơn và lịch sử trạng thái"
                      >
                        #{maDon}
                      </button>
                      <div style={{ fontSize: '0.7rem', fontWeight: 500, opacity: 0.7 }}>{don.MaTraCuu}</div>
                    </td>
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
                    <td>
                      <div>
                        {trangThai === 'CHO_DUYET' && don.thanhToan?.PhuongThuc === 'CHUYEN_KHOAN_QR' && don.thanhToan?.TrangThai === 'DA_THANH_TOAN' ? (
                          <span className="badge" style={{ backgroundColor: '#ECFDF5', color: '#059669', border: '1px solid #A7F3D0', fontWeight: 700 }}>
                            <CheckCircle size={13} /> Đã thanh toán, chờ duyệt
                          </span>
                        ) : (
                          layBadgeTrangThai(trangThai)
                        )}
                      </div>
                      {don.thanhToan && (
                        <div style={{ marginTop: '4px', fontSize: '0.72rem' }}>
                          {don.thanhToan.PhuongThuc === 'CHUYEN_KHOAN_QR' ? (
                            don.thanhToan.TrangThai === 'DA_THANH_TOAN' ? (
                              <span style={{ color: '#059669', fontWeight: 600 }}>✓ VietQR: Đã thanh toán</span>
                            ) : don.thanhToan.TrangThai === 'CAN_HOAN_TIEN' ? (
                              <span style={{ color: '#DC2626', fontWeight: 700 }}>⚠️ VietQR: Cần hoàn tiền</span>
                            ) : don.thanhToan.TrangThai === 'CHO_THANH_TOAN' ? (
                              <span style={{ color: '#D97706', fontWeight: 600 }}>⏳ VietQR: Chờ thanh toán</span>
                            ) : don.thanhToan.TrangThai === 'DA_HOAN_TIEN' ? (
                              <span style={{ color: '#059669', fontWeight: 600 }}>✓ VietQR: Đã hoàn tiền</span>
                            ) : don.thanhToan.TrangThai === 'DA_HUY' ? (
                              <span style={{ color: 'var(--adm-text-muted)' }}>✕ VietQR: Đã hủy</span>
                            ) : (
                              <span style={{ color: 'var(--adm-text-muted)' }}>VietQR: {don.thanhToan.TrangThai === 'THAT_BAI' ? 'Thất bại' : don.thanhToan.TrangThai === 'HET_HAN' ? 'Hết hạn' : don.thanhToan.TrangThai}</span>
                            )
                          ) : (
                            <span style={{ color: 'var(--adm-text-muted)' }}>COD (Tiền mặt)</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="inline-flex items-center gap-1.5">
                        {/* Nút Xem Chi Tiết */}
                        <button
                          type="button"
                          onClick={() => handleMoChiTiet(maDon)}
                          className="btn btn-outline btn-sm"
                          style={{ padding: '0.3rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                          title="Xem chi tiết đơn hàng và dòng thời gian lịch sử trạng thái"
                        >
                          <Eye size={13} /> Chi tiết
                        </button>

                        {/* Nút chuyển tiến theo State Machine */}
                        {trangThai === 'CHO_DUYET' && (
                          don.thanhToan?.PhuongThuc === 'CHUYEN_KHOAN_QR' && don.thanhToan?.TrangThai === 'CHO_THANH_TOAN' ? (
                            <span
                              title="Khách chưa hoàn tất thanh toán QR, không thể duyệt đơn!"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                padding: '4px 8px',
                                fontSize: '0.75rem',
                                color: '#D97706',
                                backgroundColor: '#FFFBEB',
                                border: '1px solid #FDE68A',
                                borderRadius: '4px',
                                fontWeight: 600
                              }}
                            >
                              Chờ Quét QR
                            </span>
                          ) : (
                            <button
                              onClick={() => handleChuyenTrangThai(maDon, 'DA_DUYET', 'Duyệt đơn')}
                              className="btn btn-primary btn-sm"
                            >
                              Duyệt Đơn
                            </button>
                          )
                        )}

                        {trangThai === 'DA_DUYET' && (
                          <button
                            onClick={() => handleChuyenTrangThai(maDon, 'DA_LAY_HANG', 'Xác nhận đã lấy hàng')}
                            className="btn btn-primary btn-sm"
                          >
                            Xác nhận đã lấy hàng
                          </button>
                        )}

                        {trangThai === 'DA_LAY_HANG' && (
                          <button
                            onClick={() => handleChuyenTrangThai(maDon, 'DA_GIAO', 'Hoàn tất giao')}
                            className="btn btn-sm"
                            style={{ backgroundColor: 'var(--adm-success)', color: '#FFF' }}
                          >
                            Hoàn Tất Giao
                          </button>
                        )}

                        {/* Nút hủy đơn (Chỉ áp dụng cho CHO_DUYET và DA_DUYET) */}
                        {['CHO_DUYET', 'DA_DUYET'].includes(trangThai) && (
                          <button
                            onClick={() => handleHuyDon(maDon, don)}
                            className="btn btn-outline btn-sm"
                            style={{ color: 'var(--adm-danger)', borderColor: '#FECACA' }}
                            title="Hủy đơn hàng và hoàn kho"
                          >
                            <Ban size={13} /> Hủy
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

      <PhanTrang phanTrang={phanTrang} onChuyenTrang={handleChuyenTrang} donVi="đơn" />

      {/* Modal Chi Tiết Đơn Hàng & Dòng Thời Gian Lịch Sử Trạng Thái */}
      {donDangXemId && (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
          <div className="modal-content" style={{ maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-start pb-3 mb-4 border-b">
              <div>
                <div className="flex items-center gap-2">
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--adm-text-main)' }}>
                    Chi Tiết Đơn Hàng #{donDangXemId}
                  </h3>
                  {chiTietDon && layBadgeTrangThai(chiTietDon.TrangThai)}
                </div>
                {chiTietDon && (
                  <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.8rem', marginTop: '0.25rem', marginBottom: 0 }}>
                    Mã tra cứu: <span style={{ fontWeight: 600, color: 'var(--adm-primary)' }}>{chiTietDon.MaTraCuu}</span> • 
                    Kênh: <span style={{ fontWeight: 600 }}>{chiTietDon.KenhBan === 'TAI_QUAY' ? 'Tại quầy' : 'Trực tuyến'}</span> • 
                    Đặt lúc: {chiTietDon.NgayDat ? new Date(chiTietDon.NgayDat).toLocaleString('vi-VN') : '—'}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleDongChiTiet}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {dangTaiChiTiet ? (
              <div className="text-center py-10">
                <p style={{ color: 'var(--adm-text-muted)' }}>Đang nạp chi tiết đơn hàng...</p>
              </div>
            ) : loiChiTiet ? (
              <ThongBaoTaiCho loai="loi">{loiChiTiet}</ThongBaoTaiCho>
            ) : chiTietDon ? (
              <div className="space-y-4">
                {/* Khối Thông Tin Giao Hàng & Thanh Toán */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3" style={{ fontSize: '0.85rem' }}>
                  <div style={{ background: 'var(--adm-bg-surface, #F8FAFC)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--adm-border, #E2E8F0)' }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--adm-text-main)' }}>
                      📍 Người Nhận Hàng
                    </div>
                    <div><strong>Họ tên:</strong> {chiTietDon.TenNguoiNhan || '—'}</div>
                    <div><strong>Số điện thoại:</strong> {chiTietDon.SoDienThoaiNhan || '—'}</div>
                    <div><strong>Địa chỉ:</strong> {chiTietDon.DiaChiGiaoHang || '—'}</div>
                    {chiTietDon.GhiChu && (
                      <div style={{ marginTop: '0.35rem', fontStyle: 'italic', color: 'var(--adm-text-muted)' }}>
                        <strong>Ghi chú:</strong> {chiTietDon.GhiChu}
                      </div>
                    )}
                  </div>

                  <div style={{ background: 'var(--adm-bg-surface, #F8FAFC)', padding: '0.85rem 1rem', borderRadius: '8px', border: '1px solid var(--adm-border, #E2E8F0)' }}>
                    <div style={{ fontWeight: 700, marginBottom: '0.4rem', color: 'var(--adm-text-main)' }} className="flex items-center gap-1.5">
                      <CreditCard size={15} /> Thanh Toán
                    </div>
                    <div>
                      <strong>Hình thức:</strong>{' '}
                      {chiTietDon.thanhToan?.PhuongThuc === 'CHUYEN_KHOAN_QR' ? 'Chuyển khoản VietQR' : 'Tiền mặt (COD)'}
                    </div>
                    <div>
                      <strong>Trạng thái tiền:</strong>{' '}
                      {chiTietDon.thanhToan?.TrangThai === 'DA_THANH_TOAN' ? (
                        <span style={{ color: '#059669', fontWeight: 600 }}>✓ Đã thanh toán</span>
                      ) : chiTietDon.thanhToan?.TrangThai === 'CAN_HOAN_TIEN' ? (
                        <span style={{ color: '#DC2626', fontWeight: 700 }}>⚠️ Cần hoàn tiền</span>
                      ) : chiTietDon.thanhToan?.TrangThai === 'CHO_THANH_TOAN' ? (
                        <span style={{ color: '#D97706', fontWeight: 600 }}>⏳ Chờ thanh toán</span>
                      ) : (
                        chiTietDon.thanhToan?.TrangThai || 'Chưa thanh toán'
                      )}
                    </div>
                    <div style={{ marginTop: '0.35rem', fontSize: '1rem', fontWeight: 700, color: 'var(--adm-primary)' }}>
                      Tổng tiền: {dinhDangTien(chiTietDon.TongTien)}
                    </div>
                  </div>
                </div>

                {/* Khối Danh Sách Sản Phẩm Trong Đơn */}
                <div style={{ border: '1px solid var(--adm-border, #E2E8F0)', borderRadius: '8px', overflow: 'hidden' }}>
                  <div style={{ background: 'var(--adm-bg-surface, #F8FAFC)', padding: '0.6rem 0.85rem', fontWeight: 700, fontSize: '0.85rem', color: 'var(--adm-text-main)' }} className="flex items-center gap-1.5">
                    <ShoppingBag size={15} /> Danh Sách Sách Trong Đơn ({chiTietDon.chiTietDonHang?.length || 0} mục)
                  </div>
                  <table className="admindash-table" style={{ margin: 0, fontSize: '0.825rem' }}>
                    <thead>
                      <tr>
                        <th>Tên Sách</th>
                        <th style={{ textAlign: 'right' }}>Đơn Giá Lúc Mua</th>
                        <th style={{ textAlign: 'center', width: '80px' }}>Số Lượng</th>
                        <th style={{ textAlign: 'right' }}>Thành Tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(chiTietDon.chiTietDonHang || []).map((ct, idx) => {
                        const donGia = Number(ct.DonGia ?? ct.GiaBanLucMua ?? 0);
                        const thanhTien = (ct.SoLuong || 0) * donGia;
                        return (
                          <tr key={idx}>
                            <td>
                              <div style={{ fontWeight: 600, color: 'var(--adm-text-main)' }}>
                                {ct.sach?.TenSach || `Sách #${ct.MaSach}`}
                              </div>
                              <span style={{ fontSize: '0.725rem', color: 'var(--adm-text-muted)' }}>
                                Mã sách: #{ct.MaSach}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right' }} className="tabular-nums">
                              {dinhDangTien(donGia)}
                            </td>
                            <td style={{ textAlign: 'center', fontWeight: 600 }} className="tabular-nums">
                              {ct.SoLuong}
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--adm-text-main)' }} className="tabular-nums">
                              {dinhDangTien(thanhTien)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Khối Dòng Thời Gian Lịch Sử Trạng Thái (Timeline) */}
                <div style={{ border: '1px solid var(--adm-border, #E2E8F0)', borderRadius: '8px', padding: '0.9rem 1.15rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.75rem', color: 'var(--adm-text-main)' }} className="flex items-center gap-1.5">
                    <History size={16} /> Dòng Thời Gian Lịch Sử Trạng Thái
                  </div>

                  {(!chiTietDon.lichSuTrangThai || chiTietDon.lichSuTrangThai.length === 0) ? (
                    <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.825rem', margin: 0 }}>
                      Chưa ghi nhận sự kiện chuyển trạng thái nào cho đơn hàng này.
                    </p>
                  ) : (
                    <div style={{ position: 'relative', paddingLeft: '1.25rem' }}>
                      {/* Đường kẻ trục timeline dọc */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '6px',
                          top: '6px',
                          bottom: '6px',
                          width: '2px',
                          background: 'var(--adm-border, #CBD5E1)'
                        }}
                      />

                      <div className="space-y-4">
                        {chiTietDon.lichSuTrangThai.map((ls, idx) => {
                          const nguoiSua = ls.nhanVienThucHien 
                            ? `${ls.nhanVienThucHien.HoTen} (${ls.nhanVienThucHien.VaiTro === 'quan_tri' ? 'Quản trị viên' : ls.nhanVienThucHien.VaiTro === 'thu_kho' ? 'Thủ kho' : 'Thủ thư'})`
                            : ls.khachHangThucHien
                            ? `${ls.khachHangThucHien.HoTen} (Khách hàng)`
                            : 'Hệ thống tự động';

                          return (
                            <div key={idx} style={{ position: 'relative', fontSize: '0.825rem' }}>
                              {/* Điểm mốc tròn trên đường kẻ */}
                              <div
                                style={{
                                  position: 'absolute',
                                  left: '-1.25rem',
                                  top: '4px',
                                  width: '10px',
                                  height: '10px',
                                  borderRadius: '50%',
                                  background: ls.TrangThaiMoi === 'DA_HUY' ? '#DC2626' : ls.TrangThaiMoi === 'DA_GIAO' ? '#059669' : 'var(--adm-primary, #6366F1)',
                                  border: '2px solid #FFF'
                                }}
                              />

                              <div>
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                  <div style={{ fontWeight: 600, color: 'var(--adm-text-main)' }}>
                                    {ls.TrangThaiCu ? (
                                      <span>{layTenTrangThai(ls.TrangThaiCu)} → <strong style={{ color: ls.TrangThaiMoi === 'DA_HUY' ? '#DC2626' : 'inherit' }}>{layTenTrangThai(ls.TrangThaiMoi)}</strong></span>
                                    ) : (
                                      <span>Khởi tạo đơn: <strong>{layTenTrangThai(ls.TrangThaiMoi)}</strong></span>
                                    )}
                                  </div>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)' }} className="tabular-nums">
                                    {ls.NgayThayDoi ? new Date(ls.NgayThayDoi).toLocaleString('vi-VN') : '—'}
                                  </span>
                                </div>

                                <div style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)', marginTop: '0.15rem' }}>
                                  Thực hiện bởi: <span style={{ color: 'var(--adm-text-main)', fontWeight: 500 }}>{nguoiSua}</span>
                                </div>

                                {ls.GhiChu && (
                                  <div
                                    style={{
                                      marginTop: '0.35rem',
                                      padding: '0.4rem 0.65rem',
                                      borderRadius: '4px',
                                      background: ls.TrangThaiMoi === 'DA_HUY' ? '#FEF2F2' : '#F1F5F9',
                                      color: ls.TrangThaiMoi === 'DA_HUY' ? '#991B1B' : 'var(--adm-text-main)',
                                      fontSize: '0.775rem'
                                    }}
                                  >
                                    <strong>Ghi chú/Lý do:</strong> {ls.GhiChu}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            <div className="flex justify-end pt-3 mt-4 border-t">
              <button
                type="button"
                onClick={handleDongChiTiet}
                className="btn btn-outline"
                style={{ padding: '0.4rem 1.15rem', fontSize: '0.85rem' }}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuanLyDonHang;
