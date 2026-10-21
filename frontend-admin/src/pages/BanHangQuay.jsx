import React, { useEffect, useMemo, useState } from 'react';
import { BangXuong, ThongBaoDangTai } from '../../../frontend/src/pages/admin/KhungXuong.jsx';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  RotateCw,
  Copy,
  X
} from 'lucide-react';
import QRCode from 'qrcode';
import { io } from 'socket.io-client';
import api from '@booknest/shared/api';
import { ThongBaoTaiCho, useThongBao, loiTuApi } from '@booknest/shared/thongbao';
import KhoiViecCanLam from '../../../frontend/src/pages/admin/KhoiViecCanLam.jsx';

// Cấu hình thông tin cửa hàng phục vụ in hóa đơn POS 80mm
const THONG_TIN_CUA_HANG = {
  ten: 'HIỆU SÁCH BOOKNEST',
  khauHieu: 'Từng trang sách, một thế giới',
  diaChi: 'Số 123 Đường Sách, Phường Bến Nghé, Quận 1, TP. HCM',
  hotline: '1900 6868 - 028 3822 9999',
  website: 'booknest.lhutech.click'
};

const dinhDangTien = (gia) => new Intl.NumberFormat('vi-VN', { 
  style: 'currency', 
  currency: 'VND', 
  maximumFractionDigits: 0 
}).format(Number(gia || 0));

export default function BanHangQuay() {
  const { thongBao: tb } = useThongBao();
  const [tuKhoa, setTuKhoa] = useState('');
  const [sachTimDuoc, setSachTimDuoc] = useState([]);
  const [gioHang, setGioHang] = useState([]);
  const [dangTim, setDangTim] = useState(false);
  const [dangBan, setDangBan] = useState(false);
  const [tab, setTab] = useState('ban');
  const [khach, setKhach] = useState({ ten: '', dienThoai: '', ma: '' });
  const [loi, setLoi] = useState('');

  // Phương thức thanh toán: 'TIEN_MAT' (chọn sẵn) hoặc 'CHUYEN_KHOAN_QR'
  const [phuongThuc, setPhuongThuc] = useState('TIEN_MAT');
  const [congTacQrBat, setCongTacQrBat] = useState(true);

  // Tiền khách đưa & tiền thừa (chỉ tính hiển thị, không lưu CSDL)
  const [tienKhachDua, setTienKhachDua] = useState('');
  const [thongTinTienMatVuaBan, setThongTinTienMatVuaBan] = useState(null);

  // Hóa đơn vừa bán xong hoặc xem lại từ lịch sử
  const [donVuaBan, setDonVuaBan] = useState(null);

  // Modal đơn chờ QR
  const [donDangChoQR, setDonDangChoQR] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [giayConLai, setGiayConLai] = useState(300);
  const [dangChuyenTienMat, setDangChuyenTienMat] = useState(false);
  const [dangHuyDonQR, setDangHuyDonQR] = useState(false);

  // Tab lịch sử bán
  const [lichSu, setLichSu] = useState([]);
  const [dangTaiLichSu, setDangTaiLichSu] = useState(false);
  const [trangLichSu, setTrangLichSu] = useState(1);
  const [gioiHanLichSu, setGioiHanLichSu] = useState(10);
  const [phanTrangLichSu, setPhanTrangLichSu] = useState(null);

  // 1. Tải trạng thái công tắc QR từ cài đặt hệ thống
  useEffect(() => {
    api.get('/admin/settings')
      .then(res => {
        const danhSach = res.data?.data?.danhSach || res.data?.data || [];
        const qrSetting = Array.isArray(danhSach) ? danhSach.find(s => s.khoa === 'THANH_TOAN_QR_BAT') : null;
        if (qrSetting && qrSetting.bat === false) {
          setCongTacQrBat(false);
          setPhuongThuc('TIEN_MAT');
        } else {
          setCongTacQrBat(true);
        }
      })
      .catch(() => {
        setCongTacQrBat(true);
      });
  }, []);

  // 2. Tìm kiếm sách bán tại quầy
  useEffect(() => {
    const timer = setTimeout(async () => {
      setDangTim(true);
      try {
        const res = await api.get('/admin/books', { params: { search: tuKhoa, page: 1, limit: 12, sort: 'newest' } });
        setSachTimDuoc(res.data.data.danhSach.filter(sach => !sach.DaAn));
      } catch {
        setSachTimDuoc([]);
      } finally { setDangTim(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [tuKhoa]);

  // 3. Tải lịch sử đơn quầy (T56: hỗ trợ phân trang)
  useEffect(() => {
    if (tab !== 'lich-su') return;
    setDangTaiLichSu(true);
    api.get('/admin/counter-orders', { params: { page: trangLichSu, limit: gioiHanLichSu } })
      .then(res => {
        setLichSu(res.data.data?.danhSach || []);
        setPhanTrangLichSu(res.data.data?.phanTrang || null);
      })
      .catch(err => setLoi(loiTuApi(err, 'Không tải được lịch sử bán hàng')))
      .finally(() => setDangTaiLichSu(false));
  }, [tab, donVuaBan, trangLichSu, gioiHanLichSu]);

  // 4. Sinh ảnh QR DataURL khi có đơn chờ thanh toán QR
  useEffect(() => {
    if (!donDangChoQR?.thongTinQR?.qrCode) {
      setQrDataUrl('');
      return;
    }
    QRCode.toDataURL(donDangChoQR.thongTinQR.qrCode, {
      width: 240,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' }
    })
      .then(url => setQrDataUrl(url))
      .catch(() => setQrDataUrl(''));
  }, [donDangChoQR]);

  // 5. Đếm ngược thời gian chờ thanh toán QR (15 phút, lấy hạn từ server)
  useEffect(() => {
    if (!donDangChoQR) return;
    const tinhGiay = () => {
      if (donDangChoQR.thongTinQR?.ngayHetHan) {
        const diff = Math.floor((new Date(donDangChoQR.thongTinQR.ngayHetHan).getTime() - Date.now()) / 1000);
        return Math.max(0, diff);
      }
      return 15 * 60;
    };
    setGiayConLai(tinhGiay());

    const timer = setInterval(() => {
      setGiayConLai(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [donDangChoQR]);

  // 6. Lắng nghe Socket.IO tự động chuyển sang hóa đơn khi tiền QR về
  useEffect(() => {
    if (!donDangChoQR) return;

    let socket;
    try {
      socket = io(window.location.origin, { path: '/socket.io' });
      socket.on('connect', () => {
        if (donDangChoQR.maTraCuu) {
          socket.emit('tham_gia_don_hang', donDangChoQR.maTraCuu);
        }
      });

      const xuLyThanhCong = (duLieu) => {
        if (duLieu?.maDonHang === donDangChoQR.id || duLieu?.maTraCuu === donDangChoQR.maTraCuu) {
          tb.thanhCong('Khách hàng đã thanh toán QR thành công!');
          api.get(`/admin/counter-orders/${donDangChoQR.id}`)
            .then(res => {
              setThongTinTienMatVuaBan(null);
              setDonVuaBan(res.data.data);
              setDonDangChoQR(null);
            })
            .catch(() => {
              setDonDangChoQR(null);
            });
        }
      };

      socket.on('thanhToan:daThanhToan', xuLyThanhCong);
      socket.on('donHang:capNhatTrangThai', (duLieu) => {
        if ((duLieu?.maDonHang === donDangChoQR.id || duLieu?.maTraCuu === donDangChoQR.maTraCuu) && duLieu.trangThaiMoi === 'DA_GIAO') {
          xuLyThanhCong(duLieu);
        }
      });
    } catch (err) {
      console.warn('[Socket] Không thể kết nối socket:', err.message);
    }

    // Polling dự phòng mỗi 3 giây nếu mạng rớt socket
    const pollingInterval = setInterval(async () => {
      try {
        const res = await api.get(`/admin/counter-orders/${donDangChoQR.id}`);
        if (res.data?.data?.TrangThai === 'DA_GIAO') {
          tb.thanhCong('Khách hàng đã thanh toán QR thành công!');
          setThongTinTienMatVuaBan(null);
          setDonVuaBan(res.data.data);
          setDonDangChoQR(null);
        } else if (res.data?.data?.TrangThai === 'DA_HUY') {
          setDonDangChoQR(null);
          setLoi('Đơn hàng đã hết hạn hoặc bị hủy');
        }
      } catch (errPolling) {
        console.warn('[Polling Đơn Quầy] Lỗi kiểm tra trạng thái đơn:', errPolling?.message);
      }
    }, 3000);

    return () => {
      clearInterval(pollingInterval);
      if (socket) socket.disconnect();
    };
  }, [donDangChoQR]);

  const layDonGiaBan = (mon) => {
    const phanTram = Number(mon.PhanTramGiam || 0);
    if (phanTram > 0 && mon.GiaSauGiam !== undefined && mon.GiaSauGiam !== null) {
      return Number(mon.GiaSauGiam);
    }
    return Number(mon.GiaBan || 0);
  };

  const tongTien = useMemo(() => gioHang.reduce((tong, mon) => tong + layDonGiaBan(mon) * mon.soLuong, 0), [gioHang]);

  // Tiền khách đưa & tiền thừa
  const tienKhachDuaSo = Number(tienKhachDua.replace(/\D/g, '') || 0);
  const tienThua = tienKhachDuaSo >= tongTien ? (tienKhachDuaSo - tongTien) : 0;

  const themSach = (sach) => {
    setLoi('');
    setGioHang(danhSach => {
      const coSan = danhSach.find(mon => mon.MaSach === sach.MaSach);
      if (coSan) return danhSach.map(mon => mon.MaSach === sach.MaSach && mon.soLuong < sach.SoLuongTon ? { ...mon, soLuong: mon.soLuong + 1 } : mon);
      return sach.SoLuongTon > 0 ? [...danhSach, { ...sach, soLuong: 1 }] : danhSach;
    });
  };

  const doiSoLuong = (maSach, soLuongMoi) => {
    setGioHang(danhSach => danhSach.map(mon => mon.MaSach === maSach ? { ...mon, soLuong: Math.min(mon.SoLuongTon, Math.max(1, soLuongMoi || 1)) } : mon));
  };

  // Hoàn tất bán hàng
  const hoanTatBan = async () => {
    if (!gioHang.length) return setLoi('Hãy thêm sách vào hóa đơn trước khi hoàn tất.');
    if (phuongThuc === 'CHUYEN_KHOAN_QR' && !congTacQrBat) {
      return setLoi('Phương thức thanh toán QR hiện đang tạm dừng hoạt động. Vui lòng chọn Tiền mặt.');
    }

    setDangBan(true);
    setLoi('');
    try {
      const payload = {
        cacMon: gioHang.map(mon => ({ maSach: mon.MaSach, soLuong: mon.soLuong })),
        phuongThucThanhToan: phuongThuc,
        tenKhach: khach.ten.trim() || undefined,
        soDienThoaiKhach: khach.dienThoai.trim() || undefined,
        maKhachHang: khach.ma ? Number(khach.ma) : undefined
      };
      const res = await api.post('/admin/counter-orders', payload);
      const donTao = res.data.data;

      setGioHang([]);
      setKhach({ ten: '', dienThoai: '', ma: '' });

      if (phuongThuc === 'TIEN_MAT') {
        setThongTinTienMatVuaBan({
          tienKhachDua: tienKhachDuaSo > 0 ? tienKhachDuaSo : tongTien,
          tienThua: tienKhachDuaSo > tongTien ? tienThua : 0
        });
        setTienKhachDua('');
        setDonVuaBan(donTao);
        tb.thanhCong('Bán hàng tại quầy thành công!');
      } else {
        setThongTinTienMatVuaBan(null);
        setTienKhachDua('');
        setDonDangChoQR({
          id: donTao.MaDonHang,
          maTraCuu: donTao.MaTraCuu,
          tongTien: donTao.TongTien,
          thongTinQR: donTao.thongTinQR,
          tenKhach: donTao.TenNguoiNhan || 'Khách lẻ'
        });
      }
    } catch (err) {
      setLoi(loiTuApi(err, 'Chưa thể hoàn tất bán hàng. Vui lòng thử lại.'));
    } finally { setDangBan(false); }
  };

  // Chuyển sang thu tiền mặt khi khách không quét được QR
  const handleChuyenThuTienMat = async () => {
    if (!donDangChoQR) return;
    setDangChuyenTienMat(true);
    try {
      const res = await api.put(`/admin/counter-orders/${donDangChoQR.id}/pay-cash`);
      tb.thanhCong('Đã chuyển sang thu tiền mặt và hoàn tất đơn hàng!');
      setThongTinTienMatVuaBan(null);
      setDonVuaBan(res.data.data);
      setDonDangChoQR(null);
    } catch (err) {
      setLoi(loiTuApi(err, 'Không thể chuyển sang tiền mặt.'));
    } finally {
      setDangChuyenTienMat(false);
    }
  };

  // Hủy đơn quầy đang chờ QR
  const handleHuyDonChoQR = async () => {
    if (!donDangChoQR) return;
    const dongY = await xacNhan({
      tieuDe: 'Hủy đơn hàng chờ thanh toán QR',
      noiDung: 'Bạn có chắc chắn muốn hủy đơn hàng đang chờ thanh toán QR này không? Sách sẽ được hoàn lại kho.',
      nhanXacNhan: 'Xác nhận hủy',
      nguyHiem: true
    });
    if (!dongY) return;
    setDangHuyDonQR(true);
    try {
      await api.put(`/admin/counter-orders/${donDangChoQR.id}/cancel`, { lyDo: 'Khách hủy đơn tại quầy' });
      tb.thanhCong('Đã hủy đơn quầy và hoàn lại tồn kho thành công!');
      setDonDangChoQR(null);
    } catch (err) {
      setLoi(loiTuApi(err, 'Không thể hủy đơn hàng quầy.'));
    } finally {
      setDangHuyDonQR(false);
    }
  };

  // Mở xem lại hóa đơn từ danh sách lịch sử
  const moChiTiet = async (maDonHang) => {
    try {
      const res = await api.get(`/admin/counter-orders/${maDonHang}`);
      setThongTinTienMatVuaBan(null);
      setDonVuaBan(res.data.data);
    } catch (err) { setLoi(loiTuApi(err, 'Không tải được hóa đơn.')); }
  };

  // Mở lại modal QR cho đơn đang CHO_DUYET từ lịch sử
  const moLaiModalQR = (don) => {
    setDonDangChoQR({
      id: don.MaDonHang,
      maTraCuu: don.MaTraCuu,
      tongTien: don.TongTien,
      thongTinQR: {
        qrCode: don.thanhToan?.QrCode,
        accountNumber: don.thanhToan?.MaThamChieuNganHang,
        soTien: don.TongTien,
        ngayHetHan: don.thanhToan?.NgayHetHan
      },
      tenKhach: don.TenNguoiNhan || 'Khách lẻ'
    });
  };

  const handleSaoChep = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(String(text));
    tb.thanhCong('Đã sao chép vào bộ nhớ tạm');
  };

  // Định dạng thời gian đếm ngược MM:SS
  const phut = Math.floor(giayConLai / 60);
  const giay = giayConLai % 60;
  const chuoiDemNguoc = `${phut.toString().padStart(2, '0')}:${giay.toString().padStart(2, '0')}`;
  const qrDaHetHan = giayConLai <= 0;

  return (
    <div className="bo-page counter-page">
      <div className="bo-page-heading">
        <div>
          <h1>Bán hàng tại quầy</h1>
          <p>Tìm sách, lên hóa đơn và cập nhật tồn kho trong một giao dịch.</p>
        </div>
        <div className="bo-tabs" role="tablist">
          <button className={tab === 'ban' ? 'active' : ''} onClick={() => setTab('ban')}>
            Bán hàng
          </button>
          <button className={tab === 'lich-su' ? 'active' : ''} onClick={() => setTab('lich-su')}>
            Lịch sử bán
          </button>
        </div>
      </div>

      {loi && <ThongBaoTaiCho loai="loi" onDong={() => setLoi('')}>{loi}</ThongBaoTaiCho>}
      <KhoiViecCanLam className="counter-tasks" />

      {tab === 'ban' && (
        <div className="counter-grid">
          {/* Cột Trái: Danh Mục Chọn Sách */}
          <section className="bo-panel counter-catalog">
            <div className="bo-panel-title">
              <div>
                <h2>Chọn sách</h2>
                <p>Tìm theo tên sách hoặc tác giả</p>
              </div>
              <span className="bo-soft-badge">{sachTimDuoc.length} kết quả</span>
            </div>
            <label className="bo-search">
              <Search size={18}/>
              <input 
                value={tuKhoa} 
                onChange={e => setTuKhoa(e.target.value)} 
                placeholder="Ví dụ: Dế mèn phiêu lưu ký"
              />
              <kbd>⌕</kbd>
            </label>
            <div className="counter-results">
              {dangTim ? (
                <div aria-busy="true">
                  <ThongBaoDangTai nhan="Đang tìm sách" />
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="counter-book" aria-hidden="true">
                      <div className="admindash-skeleton" style={{ width: '48px', height: '66px', flexShrink: 0 }} />
                      <div className="counter-book-info">
                        <div className="admindash-skeleton admindash-skeleton-line" style={{ width: `${72 - i * 6}%` }} />
                        <div className="admindash-skeleton admindash-skeleton-line" style={{ width: '38%' }} />
                        <div className="admindash-skeleton admindash-skeleton-line" style={{ width: '24%' }} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : sachTimDuoc.length === 0 ? (
                <div className="bo-empty">Không tìm thấy sách còn bán.</div>
              ) : sachTimDuoc.map(sach => {
                const coGiam = Number(sach.PhanTramGiam || 0) > 0;
                const donGia = layDonGiaBan(sach);
                return (
                  <article className="counter-book" key={sach.MaSach}>
                    <img src={sach.AnhBia || '/placeholder-book.png'} alt="" loading="lazy"/>
                    <div className="counter-book-info">
                      <strong>{sach.TenSach}</strong>
                      <span>{sach.TacGia}</span>
                      <div className="counter-book-price">
                        <b>{dinhDangTien(donGia)}</b>
                        {coGiam && (
                          <>
                            <span className="counter-book-old">{dinhDangTien(sach.GiaBan)}</span>
                            <span className="counter-book-badge">-{sach.PhanTramGiam}%</span>
                          </>
                        )}
                      </div>
                      <small>Còn {sach.SoLuongTon}</small>
                    </div>
                    <button 
                      className="bo-icon-button" 
                      onClick={() => themSach(sach)} 
                      disabled={!sach.SoLuongTon} 
                      aria-label={`Thêm ${sach.TenSach}`}
                    >
                      <Plus size={18}/>
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Cột Phải: Hóa Đơn & Thanh Toán */}
          <section className="bo-panel counter-checkout">
            <div className="bo-panel-title">
              <div>
                <h2>Hóa đơn mới</h2>
                <p>{gioHang.length} đầu sách · {gioHang.reduce((sum, mon) => sum + mon.soLuong, 0)} cuốn</p>
              </div>
              <span className="counter-order-mark">BN · QUẦY</span>
            </div>

            <div className="counter-lines">
              {!gioHang.length ? (
                <div className="bo-empty counter-empty">
                  <span>Chọn sách để bắt đầu hóa đơn</span>
                </div>
              ) : gioHang.map(mon => {
                const coGiam = Number(mon.PhanTramGiam || 0) > 0;
                const donGia = layDonGiaBan(mon);
                return (
                  <div className="counter-line" key={mon.MaSach}>
                    <div className="counter-line-main">
                      <strong>{mon.TenSach}</strong>
                      <small>
                        {dinhDangTien(donGia)} / cuốn
                        {coGiam && (
                          <>
                            <span className="counter-line-old">{dinhDangTien(mon.GiaBan)}</span>
                            <span className="counter-line-badge">-{mon.PhanTramGiam}%</span>
                          </>
                        )}
                      </small>
                    </div>
                    <div className="counter-quantity">
                      <button onClick={() => doiSoLuong(mon.MaSach, mon.soLuong - 1)} aria-label="Giảm">
                        <Minus size={13}/>
                      </button>
                      <input 
                        aria-label="Số lượng" 
                        type="number" 
                        min="1" 
                        max={mon.SoLuongTon} 
                        value={mon.soLuong} 
                        onChange={e => doiSoLuong(mon.MaSach, Number(e.target.value))}
                      />
                      <button 
                        disabled={mon.soLuong >= mon.SoLuongTon} 
                        onClick={() => doiSoLuong(mon.MaSach, mon.soLuong + 1)} 
                        aria-label="Tăng"
                      >
                        <Plus size={13}/>
                      </button>
                    </div>
                    <strong className="counter-line-total">{dinhDangTien(donGia * mon.soLuong)}</strong>
                    <button 
                      className="bo-quiet-button" 
                      onClick={() => setGioHang(list => list.filter(s => s.MaSach !== mon.MaSach))} 
                      aria-label="Xóa khỏi hóa đơn"
                    >
                      <Trash2 size={15}/>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Thông tin khách hàng */}
            <div className="counter-customer-title">
              <span>Thông tin khách (không bắt buộc)</span>
            </div>
            <div className="counter-customer-fields">
              <input 
                value={khach.ten} 
                onChange={e => setKhach({ ...khach, ten: e.target.value })} 
                placeholder="Tên khách"
              />
              <input 
                value={khach.dienThoai} 
                onChange={e => setKhach({ ...khach, dienThoai: e.target.value })} 
                placeholder="Số điện thoại" 
                inputMode="tel"
              />
              <input 
                value={khach.ma} 
                onChange={e => setKhach({ ...khach, ma: e.target.value.replace(/\D/g, '') })} 
                placeholder="Mã hồ sơ khách (nếu có)" 
                inputMode="numeric"
              />
            </div>

            {/* Lựa chọn phương thức thanh toán */}
            <div className="counter-customer-title">
              <span>Phương thức thanh toán</span>
            </div>
            <div className="counter-payment-select">
              <label className={`counter-payment-opt ${phuongThuc === 'TIEN_MAT' ? 'active' : ''}`}>
                <input 
                  type="radio" 
                  name="phuongThuc" 
                  value="TIEN_MAT"
                  checked={phuongThuc === 'TIEN_MAT'}
                  onChange={() => setPhuongThuc('TIEN_MAT')}
                />
                <span>Tiền mặt</span>
              </label>

              <label 
                className={`counter-payment-opt ${phuongThuc === 'CHUYEN_KHOAN_QR' ? 'active' : ''}`}
                title={!congTacQrBat ? 'Phương thức thanh toán QR hiện đang tạm dừng hoạt động' : ''}
              >
                <input 
                  type="radio" 
                  name="phuongThuc" 
                  value="CHUYEN_KHOAN_QR"
                  disabled={!congTacQrBat}
                  checked={phuongThuc === 'CHUYEN_KHOAN_QR'}
                  onChange={() => setPhuongThuc('CHUYEN_KHOAN_QR')}
                />
                <span>Chuyển khoản QR {!congTacQrBat && <small>(Tạm ngưng)</small>}</span>
              </label>
            </div>

            {/* Ô tiền khách đưa & tiền thừa (chỉ dành cho Tiền mặt) */}
            {phuongThuc === 'TIEN_MAT' && (
              <div className="counter-cash-given">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label htmlFor="tienKhachDua" style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--bo-muted)' }}>
                    Tiền khách đưa
                  </label>
                  <input
                    id="tienKhachDua"
                    type="text"
                    inputMode="numeric"
                    placeholder={dinhDangTien(tongTien)}
                    value={tienKhachDua ? new Intl.NumberFormat('vi-VN').format(Number(tienKhachDua.replace(/\D/g, ''))) : ''}
                    onChange={(e) => setTienKhachDua(e.target.value.replace(/\D/g, ''))}
                    style={{ width: '150px', padding: '0.35rem 0.5rem', textAlign: 'right', fontSize: '0.85rem', fontWeight: 600 }}
                  />
                </div>

                {/* Các nút bấm chọn nhanh tiền */}
                <div className="counter-quick-cash">
                  <button type="button" className="counter-quick-btn" onClick={() => setTienKhachDua(String(tongTien))}>Đủ tiền</button>
                  {tongTien <= 50000 && <button type="button" className="counter-quick-btn" onClick={() => setTienKhachDua('50000')}>50.000₫</button>}
                  {tongTien <= 100000 && <button type="button" className="counter-quick-btn" onClick={() => setTienKhachDua('100000')}>100.000₫</button>}
                  {tongTien <= 200000 && <button type="button" className="counter-quick-btn" onClick={() => setTienKhachDua('200000')}>200.000₫</button>}
                  <button type="button" className="counter-quick-btn" onClick={() => setTienKhachDua('500000')}>500.000₫</button>
                </div>

                <div className="counter-change-row">
                  <span style={{ color: 'var(--bo-muted)' }}>Tiền thừa trả khách:</span>
                  <strong style={{ color: tienKhachDuaSo > tongTien ? 'var(--adm-success)' : 'inherit', fontSize: '0.95rem' }}>
                    {dinhDangTien(tienThua)}
                  </strong>
                </div>
              </div>
            )}

            {/* Tổng tiền & Nút hoàn tất */}
            <div className="counter-total">
              <span>Tổng thanh toán</span>
              <strong>{dinhDangTien(tongTien)}</strong>
            </div>

            <button 
              className="bo-primary-button counter-submit" 
              disabled={!gioHang.length || dangBan} 
              onClick={hoanTatBan}
            >
              {dangBan ? (
                <><RotateCw className="bo-spin" size={17}/> Đang xử lý…</>
              ) : phuongThuc === 'TIEN_MAT' ? (
                <>Hoàn tất bán tiền mặt <span>·</span> {dinhDangTien(tongTien)}</>
              ) : (
                <>Tạo mã QR thanh toán <span>·</span> {dinhDangTien(tongTien)}</>
              )}
            </button>
            <small className="counter-footnote">
              {phuongThuc === 'TIEN_MAT' ? 'Xác nhận sẽ trừ kho và hoàn tất giao hàng ngay.' : 'Xác nhận sẽ giữ kho trong 15 phút và hiển thị mã QR.'}
            </small>
          </section>
        </div>
      )}

      {/* Tab: Lịch Sử Bán Tại Quầy */}
      {tab === 'lich-su' && (
        <section className="bo-panel counter-history">
          <div className="bo-panel-title">
            <div>
              <h2>Đơn bán tại quầy</h2>
              <p>Hiển thị các hóa đơn do tài khoản hiện tại lập.</p>
            </div>
            <button className="bo-secondary-button" onClick={() => setTab('ban')}>
              Quay lại bán hàng
            </button>
          </div>
          {dangTaiLichSu ? (
            <BangXuong
              lopBang="bo-table"
              lopBoc="bo-table-wrap"
              tieuDe={['Mã đơn', 'Thời gian', 'Khách', 'Phương thức', 'Số đầu sách', 'Tổng tiền', 'Trạng thái', '']}
              nhan="Đang tải lịch sử bán"
            />
          ) : (
            <>
            <div className="bo-table-wrap">
              <table className="bo-table">
                <thead>
                  <tr>
                    <th>Mã đơn</th>
                    <th>Thời gian</th>
                    <th>Khách</th>
                    <th>Phương thức</th>
                    <th>Số đầu sách</th>
                    <th>Tổng tiền</th>
                    <th>Trạng thái</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {lichSu.map(don => {
                    const tenPhuongThuc = don.thanhToan?.PhuongThuc === 'CHUYEN_KHOAN_QR' 
                      ? 'Chuyển khoản QR' 
                      : 'Tiền mặt';

                    const trangThaiHienThi = don.TrangThai === 'DA_GIAO'
                      ? 'Đã hoàn tất'
                      : don.TrangThai === 'CHO_DUYET'
                      ? 'Chờ quét QR'
                      : don.TrangThai === 'DA_HUY'
                      ? 'Đã hủy'
                      : don.TrangThai;

                    return (
                      <tr key={don.MaDonHang}>
                        <td>
                          <strong>#{don.MaDonHang}</strong>
                          <small style={{ color: 'var(--bo-muted)', fontSize: '0.72rem' }}>{don.MaTraCuu}</small>
                        </td>
                        <td>{new Date(don.NgayDat).toLocaleString('vi-VN')}</td>
                        <td>{don.TenNguoiNhan || don.khachHang?.HoTen || 'Khách lẻ'}</td>
                        <td>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{tenPhuongThuc}</span>
                        </td>
                        <td>{don.chiTietDonHang?.length || 0}</td>
                        <td><strong>{dinhDangTien(don.TongTien)}</strong></td>
                        <td>
                          <span className={`bo-status ${don.TrangThai === 'CHO_DUYET' ? 'cho-qr' : ''}`} style={
                            don.TrangThai === 'CHO_DUYET' 
                              ? { backgroundColor: 'var(--adm-warning-subtle)', color: 'var(--adm-warning)' } 
                              : don.TrangThai === 'DA_HUY'
                              ? { backgroundColor: 'var(--adm-danger-subtle)', color: 'var(--adm-danger)' }
                              : {}
                          }>
                            {trangThaiHienThi}
                          </span>
                        </td>
                        <td>
                          {don.TrangThai === 'DA_GIAO' && (
                            <button className="bo-secondary-button" onClick={() => moChiTiet(don.MaDonHang)}>
                              Xem hóa đơn
                            </button>
                          )}
                          {don.TrangThai === 'CHO_DUYET' && (
                            <button className="bo-primary-button" style={{ padding: '0.4rem 0.65rem' }} onClick={() => moLaiModalQR(don)}>
                              Xử lý QR
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {!lichSu.length && <tr><td colSpan="8" className="bo-empty">Chưa có hóa đơn nào.</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Phân trang lịch sử đơn quầy (T56) */}
            {phanTrangLichSu && phanTrangLichSu.tongSoBanGhi > 0 && (
              <div 
                className="history-pagination"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  padding: '0.85rem 1.1rem',
                  borderTop: '1px solid var(--bo-line, var(--adm-border))'
                }}
              >
                <div style={{ color: 'var(--bo-muted)', fontSize: '0.82rem' }}>
                  Hiển thị <strong>{(trangLichSu - 1) * gioiHanLichSu + 1}–{Math.min(trangLichSu * gioiHanLichSu, phanTrangLichSu.tongSoBanGhi)}</strong> / <strong>{phanTrangLichSu.tongSoBanGhi}</strong> hóa đơn
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginRight: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--bo-muted)' }}>Mỗi trang:</span>
                    <select
                      value={gioiHanLichSu}
                      onChange={(e) => {
                        setGioiHanLichSu(Number(e.target.value));
                        setTrangLichSu(1);
                      }}
                      style={{
                        padding: '0.25rem 0.5rem',
                        fontSize: '0.8rem',
                        borderRadius: '4px',
                        border: '1px solid var(--bo-line, var(--adm-border))',
                        backgroundColor: '#FFFFFF',
                        color: 'inherit'
                      }}
                    >
                      <option value={2}>2</option>
                      <option value={5}>5</option>
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                    </select>
                  </div>

                  <button 
                    className="bo-secondary-button" 
                    disabled={trangLichSu <= 1 || dangTaiLichSu} 
                    onClick={() => setTrangLichSu(p => Math.max(1, p - 1))}
                  >
                    Trước
                  </button>

                  <span style={{ fontSize: '0.82rem', color: 'var(--bo-text)' }}>
                    Trang {trangLichSu} / {phanTrangLichSu.tongSoTrang || 1}
                  </span>

                  <button 
                    className="bo-secondary-button" 
                    disabled={trangLichSu >= (phanTrangLichSu.tongSoTrang || 1) || dangTaiLichSu} 
                    onClick={() => setTrangLichSu(p => Math.min(phanTrangLichSu.tongSoTrang || 1, p + 1))}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
            </>
          )}
        </section>
      )}

      {/* Modal Chờ Quét QR (Đếm ngược 15 phút, tự chuyển hóa đơn khi tiền về, hủy, hoặc thu tiền mặt) */}
      {donDangChoQR && (
        <div className="bo-modal-backdrop" role="presentation">
          <section className="bo-qr-modal" role="dialog" aria-modal="true" aria-label="Thanh toán chuyển khoản QR">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'left' }}>
                <h2 style={{ margin: '0.1rem 0 0', fontSize: '1.15rem' }}>Quét mã thanh toán tại quầy</h2>
              </div>
              <button className="bo-quiet-button" onClick={() => setDonDangChoQR(null)} title="Đóng cửa sổ">
                <X size={18}/>
              </button>
            </div>

            <div className={`bo-qr-timer ${qrDaHetHan ? 'expired' : 'running'}`}>
              <span>{qrDaHetHan ? 'Mã QR đã hết hạn thanh toán' : `Thời gian còn lại: ${chuoiDemNguoc}`}</span>
            </div>

            {/* Khung ảnh QR Code */}
            <div style={{ display: 'flex', justifyContent: 'center', margin: '0.5rem 0' }}>
              {qrDataUrl ? (
                <div style={{ padding: '8px', background: '#fff', border: '1px solid var(--adm-border)', borderRadius: '12px', display: 'inline-block' }}>
                  <img src={qrDataUrl} alt="Mã QR thanh toán" style={{ width: '220px', height: '220px', display: 'block' }}/>
                </div>
              ) : (
                <div style={{ width: '220px', height: '220px', display: 'grid', placeItems: 'center', background: 'var(--adm-primary-subtle)', borderRadius: '12px' }}>
                  <RotateCw className="bo-spin" size={24}/>
                </div>
              )}
            </div>

            <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--bo-accent-dark)' }}>
              {dinhDangTien(donDangChoQR.tongTien)}
            </div>
            <p style={{ margin: '0.2rem 0 0.8rem', fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>
              Đơn hàng #{donDangChoQR.id} ({donDangChoQR.maTraCuu}) · Khách: {donDangChoQR.tenKhach}
            </p>

            {/* Chi tiết tài khoản thụ hưởng */}
            <div className="bo-qr-card">
              {donDangChoQR.thongTinQR?.accountNumber && (
                <div className="bo-qr-card-row">
                  <span>Số tài khoản:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <strong>{donDangChoQR.thongTinQR.accountNumber}</strong>
                    <button type="button" className="bo-quiet-button" style={{ padding: '2px' }} onClick={() => handleSaoChep(donDangChoQR.thongTinQR.accountNumber)}>
                      <Copy size={13}/>
                    </button>
                  </div>
                </div>
              )}
              {donDangChoQR.thongTinQR?.noiDungChuyenKhoan && (
                <div className="bo-qr-card-row">
                  <span>Nội dung CK:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <strong>{donDangChoQR.thongTinQR.noiDungChuyenKhoan}</strong>
                    <button type="button" className="bo-quiet-button" style={{ padding: '2px' }} onClick={() => handleSaoChep(donDangChoQR.thongTinQR.noiDungChuyenKhoan)}>
                      <Copy size={13}/>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Các hành động xử lý */}
            <div className="bo-qr-actions">
              <button 
                type="button"
                className="bo-primary-button" 
                onClick={handleChuyenThuTienMat}
                disabled={dangChuyenTienMat}
              >
                {dangChuyenTienMat && <RotateCw className="bo-spin" size={16}/>}
                Khách không quét được, thu tiền mặt
              </button>

              <button 
                type="button"
                className="bo-secondary-button" 
                onClick={handleHuyDonChoQR}
                disabled={dangHuyDonQR}
                style={{ color: 'var(--adm-danger)' }}
              >
                {dangHuyDonQR ? <RotateCw className="bo-spin" size={16}/> : <X size={16}/>}
                Hủy đơn quầy
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Modal Hóa Đơn Bán Lẻ POS 80mm */}
      {donVuaBan && (
        <div className="bo-modal-backdrop" role="presentation" onClick={() => { setDonVuaBan(null); setThongTinTienMatVuaBan(null); }}>
          <section 
            className="bo-receipt-80mm" 
            role="dialog" 
            aria-modal="true" 
            aria-label="Hóa đơn bán lẻ POS 80mm" 
            onClick={e => e.stopPropagation()}
          >
            {/* Thanh nút bấm no-print */}
            <div className="receipt-actions no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.45rem', marginBottom: '0.75rem' }}>
              <button className="bo-quiet-button" onClick={() => { setDonVuaBan(null); setThongTinTienMatVuaBan(null); }}>Đóng</button>
              <button className="bo-primary-button" onClick={() => window.print()}>
                In hóa đơn
              </button>
            </div>

            {/* Header hóa đơn chuẩn POS 80mm */}
            <div className="receipt-header-80mm">
              <h2 className="receipt-store-name">{THONG_TIN_CUA_HANG.ten}</h2>
              <p className="receipt-store-sub">{THONG_TIN_CUA_HANG.khauHieu}</p>
              <p className="receipt-store-sub">{THONG_TIN_CUA_HANG.diaChi}</p>
              <p className="receipt-store-sub">Hotline: {THONG_TIN_CUA_HANG.hotline}</p>

              <div className="receipt-title-80mm">HÓA ĐƠN BÁN LẺ</div>
              
              <div className="receipt-meta-80mm">
                <div className="receipt-meta-row">
                  <span>Mã đơn: <strong>#{donVuaBan.MaDonHang}</strong></span>
                  <span>Mã tra cứu: <strong>{donVuaBan.MaTraCuu}</strong></span>
                </div>
                <div className="receipt-meta-row">
                  <span>Thời gian: {new Date(donVuaBan.NgayDat).toLocaleString('vi-VN')}</span>
                </div>
                <div className="receipt-meta-row">
                  <span>Thu ngân: {donVuaBan.nhanVienLap?.HoTen || 'Thu ngân'}</span>
                  <span>Khách: {donVuaBan.TenNguoiNhan || donVuaBan.khachHang?.HoTen || 'Khách lẻ'}</span>
                </div>
              </div>
            </div>

            {/* Bảng danh sách hàng hóa */}
            <table className="receipt-table-80mm">
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', width: '50%' }}>Tên sách</th>
                  <th style={{ textAlign: 'center', width: '15%' }}>SL</th>
                  <th style={{ textAlign: 'right', width: '35%' }}>Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {donVuaBan.chiTietDonHang?.map(ct => (
                  <tr key={ct.MaSach}>
                    <td style={{ textAlign: 'left', paddingRight: '4px' }}>
                      <div style={{ fontWeight: 600 }}>{ct.sach?.TenSach || `Sách #${ct.MaSach}`}</div>
                      <small style={{ color: '#555' }}>{dinhDangTien(ct.DonGia)}</small>
                    </td>
                    <td style={{ textAlign: 'center' }}>{ct.SoLuong}</td>
                    <td style={{ textAlign: 'right', fontWeight: 600 }}>
                      {dinhDangTien(ct.DonGia * ct.SoLuong)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Khối tổng tiền và phương thức thanh toán */}
            <div className="receipt-total-block-80mm">
              <div className="receipt-total-row grand">
                <span>TỔNG CỘNG:</span>
                <span>{dinhDangTien(donVuaBan.TongTien)}</span>
              </div>

              {/* Thông tin phương thức thanh toán */}
              <div className="receipt-total-row">
                <span>Phương thức:</span>
                <strong>
                  {donVuaBan.thanhToan?.PhuongThuc === 'CHUYEN_KHOAN_QR' 
                    ? 'Chuyển khoản QR (VietQR)' 
                    : 'Tiền mặt'}
                </strong>
              </div>

              {/* Tiền khách đưa & tiền thừa (chỉ hiển thị khi vừa bán tiền mặt xong) */}
              {donVuaBan.thanhToan?.PhuongThuc === 'TIEN_MAT' && thongTinTienMatVuaBan && (
                <>
                  <div className="receipt-total-row">
                    <span>Tiền khách đưa:</span>
                    <span>{dinhDangTien(thongTinTienMatVuaBan.tienKhachDua)}</span>
                  </div>
                  <div className="receipt-total-row">
                    <span>Tiền thừa trả khách:</span>
                    <strong>{dinhDangTien(thongTinTienMatVuaBan.tienThua)}</strong>
                  </div>
                </>
              )}

              {/* Thời gian nhận tiền QR */}
              {donVuaBan.thanhToan?.PhuongThuc === 'CHUYEN_KHOAN_QR' && (
                <div className="receipt-total-row">
                  <span>Giờ nhận tiền:</span>
                  <span>{donVuaBan.thanhToan.NgayThanhToan ? new Date(donVuaBan.thanhToan.NgayThanhToan).toLocaleString('vi-VN') : new Date(donVuaBan.NgayDat).toLocaleString('vi-VN')}</span>
                </div>
              )}
            </div>

            {/* Lời cảm ơn chân thành */}
            <div className="receipt-footer-80mm">
              <p style={{ margin: '0 0 0.2rem', fontStyle: 'italic', fontWeight: 600 }}>
                Cảm ơn Quý khách & Hẹn gặp lại!
              </p>
              <p style={{ margin: 0 }}>Website: {THONG_TIN_CUA_HANG.website}</p>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
