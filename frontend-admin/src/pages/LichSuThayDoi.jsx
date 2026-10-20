import React, { useEffect, useState } from 'react';
import { History, RefreshCw, Trash2 } from 'lucide-react';
import api from '@booknest/shared/api';
import { useThongBao, ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';

const nhan = (value) => value == null || value === '' ? '—' : value;
const nguoiDungTruong = {
  TenSach: 'Tên sách',
  TacGia: 'Tác giả',
  MoTa: 'Mô tả',
  GiaBan: 'Giá bán',
  NguongCanhBao: 'Ngưỡng cảnh báo',
  AnhBia: 'Ảnh bìa',
  MaDanhMuc: 'Danh mục',
  DaAn: 'Trạng thái',
  DaXoa: 'Xóa vĩnh viễn',
  TenDanhMuc: 'Tên danh mục',
  THANH_TOAN_QR_BAT: 'Thanh toán QR',
  AI_CHATBOT_BAT: 'AI Chatbot',
  AI_CHATBOT_TRAN_NGAY: 'Trần token AI hàng ngày',
  Tap: 'Số tập',
  TenBo: 'Tên bộ',
  TenChuongTrinh: 'Tên chương trình',
  PhanTramGiam: 'Mức giảm (%)',
  NgayBatDau: 'Bắt đầu',
  NgayKetThuc: 'Kết thúc',
  DangHoatDong: 'Trạng thái',
  TrangThai: 'Trạng thái',
  MaThamChieuHoanTien: 'Mã tham chiếu hoàn tiền',
  GhiChuHoanTien: 'Ghi chú hoàn tiền',
  PhuongThuc: 'Phương thức thanh toán',
  DoiTuong: 'Đối tượng áp dụng',
  SoLuongDoiTuong: 'Số đối tượng áp dụng',
  HoTen: 'Họ và tên',
  Email: 'Email',
  SoDienThoai: 'Số điện thoại',
  VaiTro: 'Vai trò',
  DiaChiMacDinh: 'Địa chỉ mặc định',
  MatKhau: 'Mật khẩu'
};

const tenDoiTuong = {
  SACH: 'Sách',
  DANH_MUC: 'Danh mục',
  CAU_HINH: 'Cài đặt hệ thống',
  GIAM_GIA: 'Chương trình giảm giá',
  THANH_TOAN: 'Thanh toán',
  DANH_GIA: 'Đánh giá',
  DanhGia: 'Đánh giá',
  NHAN_VIEN: 'Nhân viên',
  KHACH_HANG: 'Khách hàng'
};

// Hiển thị giá trị thân thiện cho người đọc (GGB)
const hienGiaTri = (item, giaTri) => {
  if (giaTri == null || giaTri === '') return '—';
  if (item.LoaiDoiTuong === 'CAU_HINH') {
    return (giaTri === '1' || giaTri === 1 || giaTri === true) ? 'Bật' : 'Tắt';
  }
  if (item.LoaiDoiTuong === 'GIAM_GIA' && item.TruongDuLieu === 'DangHoatDong') {
    return (giaTri === '1' || giaTri === 1 || giaTri === true || giaTri === 'true') ? 'Bật' : 'Tạm dừng';
  }
  if ((item.LoaiDoiTuong === 'NHAN_VIEN' || item.LoaiDoiTuong === 'KHACH_HANG') && item.TruongDuLieu === 'DangHoatDong') {
    return (giaTri === '1' || giaTri === 1 || giaTri === true || giaTri === 'true') ? 'Hoạt động' : 'Đã khóa';
  }
  if (item.TruongDuLieu === 'VaiTro') {
    const vaiTroMap = {
      quan_tri: 'Quản trị viên',
      thu_kho: 'Thủ kho',
      thu_thu: 'Thủ thư',
      khach_hang: 'Khách hàng'
    };
    return vaiTroMap[giaTri] || giaTri;
  }
  if (item.TruongDuLieu === 'NgayBatDau' || item.TruongDuLieu === 'NgayKetThuc') {
    const d = new Date(giaTri);
    if (!isNaN(d.getTime())) return d.toLocaleString('vi-VN');
  }
  if (item.TruongDuLieu === 'PhanTramGiam') {
    return `${giaTri}%`;
  }
  if ((item.LoaiDoiTuong === 'DANH_GIA' || item.LoaiDoiTuong === 'DanhGia') && item.TruongDuLieu === 'DaAn') {
    if (typeof giaTri === 'string' && giaTri.startsWith('1')) {
      const lyDo = giaTri.slice(1).trim();
      return lyDo ? `Đã ẩn ${lyDo}` : 'Đã ẩn';
    }
    if (giaTri === '0' || giaTri === 0 || giaTri === false) return 'Hiển thị';
    if (giaTri === '1' || giaTri === 1 || giaTri === true) return 'Đã ẩn';
  }
  if (item.TruongDuLieu === 'DaXoa') {
    if (giaTri === 'DA_XOA_VINH_VIEN') return 'Đã xóa vĩnh viễn';
  }
  if (item.LoaiDoiTuong === 'THANH_TOAN' && item.TruongDuLieu === 'TrangThai') {
    const ttMap = {
      CAN_HOAN_TIEN: 'Cần hoàn tiền',
      DA_HOAN_TIEN: 'Đã hoàn tiền',
      DA_THANH_TOAN: 'Đã thanh toán',
      CHO_THANH_TOAN: 'Chờ thanh toán',
      HET_HAN: 'Hết hạn',
      DA_HUY: 'Đã hủy',
      THAT_BAI: 'Thất bại'
    };
    return ttMap[giaTri] || giaTri;
  }
  return nhan(giaTri);
};

export default function LichSuThayDoi() {
  const { thongBao: tb, xacNhan } = useThongBao();
  const [danhSach, setDanhSach] = useState([]);
  const [page, setPage] = useState(1);
  const [tongSoTrang, setTongSoTrang] = useState(1);
  const [phanTrang, setPhanTrang] = useState(null);
  const [loaiDoiTuong, setLoaiDoiTuong] = useState('');
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState('');
  const [truocNgay, setTruocNgay] = useState('');
  const [xemTruoc, setXemTruoc] = useState(null);
  const [dangDon, setDangDon] = useState(false);

  const taiLichSu = async () => {
    setDangTai(true);
    try {
      const params = { page, limit: 30 };
      if (loaiDoiTuong) params.loaiDoiTuong = loaiDoiTuong;
      const res = await api.get('/admin/change-history', { params });
      setDanhSach(res.data.data.danhSach || []);
      setTongSoTrang(res.data.data.phanTrang?.tongSoTrang || 1);
      setPhanTrang(res.data.data.phanTrang || null);
      setLoi('');
    } catch (err) { setLoi(loiTuApi(err, 'Không tải được lịch sử.')); }
    finally { setDangTai(false); }
  };

  useEffect(() => { taiLichSu(); }, [page, loaiDoiTuong]);

  const kiemTraDonDep = async () => {
    if (!truocNgay) return setLoi('Chọn mốc thời gian trước khi dọn lịch sử.');
    try {
      const res = await api.post('/admin/change-history/cleanup-preview', { truocNgay: new Date(truocNgay).toISOString() });
      setXemTruoc(res.data.data);
      setLoi('');
    } catch (err) { setLoi(loiTuApi(err, 'Không thể xem trước dữ liệu.')); }
  };

  const xacNhanDonDep = async () => {
    if (!xemTruoc || !xemTruoc.soDongDuKien) return;

    const dongY = await xacNhan({
      tieuDe: 'Xác nhận xóa vĩnh viễn lịch sử',
      noiDung: `Bạn có chắc chắn muốn xóa vĩnh viễn ${xemTruoc.soDongDuKien.toLocaleString('vi-VN')} dòng lịch sử cũ trước ngày ${truocNgay}? Thao tác này không thể hoàn tác.`,
      nhanXacNhan: 'Xác nhận xóa vĩnh viễn',
      nguyHiem: true,
    });
    if (!dongY) return;

    setDangDon(true);
    try {
      const res = await api.post('/admin/change-history/cleanup', { truocNgay: new Date(truocNgay).toISOString() });
      const tongDaXoa = Object.values(res.data.data?.daXoa || {}).reduce((tong, soDong) => tong + soDong, 0);
      tb.thanhCong(`Đã xóa vĩnh viễn ${tongDaXoa.toLocaleString('vi-VN')} dòng lịch sử.`);
      setXemTruoc(null);
      await taiLichSu();
    } catch (err) {
      tb.loiTuApi(err, 'Lưu trữ thất bại; dữ liệu chưa bị xóa.');
    } finally {
      setDangDon(false);
    }
  };

  return (
    <div className="bo-page">
      <div className="bo-page-heading"><div><span className="bo-eyebrow">THEO DÕI NGHIỆP VỤ</span><h1>Lịch sử thay đổi</h1><p>Nhật ký sách và danh mục, gồm người thực hiện, thời điểm và giá trị trước/sau.</p></div><button className="bo-secondary-button" onClick={taiLichSu}><RefreshCw size={15}/> Làm mới</button></div>
      {loi && <ThongBaoTaiCho loai="loi" onDong={() => setLoi('')}>{loi}</ThongBaoTaiCho>}
      <section className="bo-panel history-cleanup">
        <div className="history-cleanup-copy"><span className="history-icon"><Trash2 size={18}/></span><div><strong>Dọn lịch sử cũ</strong><p>Dữ liệu trước mốc đã chọn sẽ bị xóa vĩnh viễn. Lịch sử đơn đã giao được giữ để bảo toàn báo cáo.</p></div></div>
        <div className="history-cleanup-controls"><label>Từ trước ngày<input type="date" value={truocNgay} onChange={e => { setTruocNgay(e.target.value); setXemTruoc(null); }}/></label><button className="bo-secondary-button" onClick={kiemTraDonDep}>Xem trước</button></div>
        {xemTruoc && <div className="history-preview"><div><strong>Sẽ xóa vĩnh viễn {xemTruoc.soDongDuKien.toLocaleString('vi-VN')} dòng:</strong><small>Thay đổi: {xemTruoc.theoBang.LichSuThayDoi.toLocaleString('vi-VN')} · Nhập kho: {xemTruoc.theoBang.LichSuNhapKho.toLocaleString('vi-VN')} · Điều chỉnh kho: {xemTruoc.theoBang.LichSuDieuChinhKho.toLocaleString('vi-VN')} · Trạng thái đơn: {xemTruoc.theoBang.LichSuTrangThaiDonHang.toLocaleString('vi-VN')}</small></div><span>Giữ lại <strong>{xemTruoc.soDongDaGiaoGiuLai.toLocaleString('vi-VN')}</strong> dòng giao thành công.</span><button className="bo-danger-button" disabled={dangDon || !xemTruoc.soDongDuKien} onClick={xacNhanDonDep}>{dangDon ? 'Đang xóa…' : 'Xác nhận xóa vĩnh viễn'}</button></div>}
      </section>
      <section className="bo-panel history-table-panel">
        <div className="bo-panel-title">
          <div>
            <h2><History size={18}/> Gần đây</h2>
            <p>{phanTrang?.tongSoBanGhi ? `Hiển thị ${(page - 1) * 30 + 1}–${Math.min(page * 30, phanTrang.tongSoBanGhi)} / ${phanTrang.tongSoBanGhi} mục` : `${danhSach.length} mục ở trang ${page}/${tongSoTrang}`}</p>
          </div>
          <div className="history-filter-controls" style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <label htmlFor="bo-filter-loai-doi-tuong" style={{ fontSize: '0.85rem', color: 'var(--bo-text-muted)' }}>
              Lọc đối tượng:
            </label>
            <select
              id="bo-filter-loai-doi-tuong"
              value={loaiDoiTuong}
              onChange={e => {
                setLoaiDoiTuong(e.target.value);
                setPage(1);
              }}
              style={{
                padding: '0.4rem 0.75rem',
                borderRadius: '6px',
                border: '1px solid var(--bo-border, #E5E7EB)',
                backgroundColor: 'var(--bo-surface, #FFFFFF)',
                fontSize: '0.85rem',
                color: 'var(--bo-text, #1F2937)'
              }}
            >
              <option value="">Tất cả đối tượng</option>
              <option value="SACH">Sách</option>
              <option value="DANH_MUC">Danh mục</option>
              <option value="CAU_HINH">Cài đặt hệ thống</option>
              <option value="GIAM_GIA">Chương trình giảm giá</option>
              <option value="THANH_TOAN">Thanh toán</option>
              <option value="DANH_GIA">Đánh giá</option>
              <option value="NHAN_VIEN">Nhân viên</option>
              <option value="KHACH_HANG">Khách hàng</option>
            </select>
          </div>
        </div>
        {dangTai ? <div className="bo-empty">Đang tải lịch sử…</div> : <div className="bo-table-wrap"><table className="bo-table history-table"><thead><tr><th>Thời điểm</th><th>Đối tượng</th><th>Trường</th><th>Thay đổi</th><th>Nhân viên</th></tr></thead><tbody>
          {danhSach.map(item => <tr key={item.MaLichSuThayDoi}><td>{new Date(item.NgayThayDoi).toLocaleString('vi-VN')}</td><td>{tenDoiTuong[item.LoaiDoiTuong] || item.LoaiDoiTuong} {item.LoaiDoiTuong !== 'CAU_HINH' && <small>#{item.MaDoiTuong}</small>}</td><td>{nguoiDungTruong[item.TruongDuLieu] || item.TruongDuLieu}</td><td><span className="history-old">{hienGiaTri(item, item.GiaTriCu)}</span><span className="history-arrow">→</span><strong>{hienGiaTri(item, item.GiaTriMoi)}</strong></td><td>{item.nhanVienThayDoi?.HoTen || 'Nhân viên không còn hoạt động'}</td></tr>)}
          {!danhSach.length && <tr><td colSpan="5" className="bo-empty">Chưa có thay đổi nào được ghi nhận.</td></tr>}
        </tbody></table></div>}
        <div className="history-pagination">
          <button className="bo-secondary-button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</button>
          <span>{phanTrang?.tongSoBanGhi ? `Hiển thị ${(page - 1) * 30 + 1}–${Math.min(page * 30, phanTrang.tongSoBanGhi)} / ${phanTrang.tongSoBanGhi} · ` : ''}Trang {page} / {tongSoTrang}</span>
          <button className="bo-secondary-button" disabled={page >= tongSoTrang} onClick={() => setPage(p => p + 1)}>Sau</button>
        </div>
      </section>
    </div>
  );
}
