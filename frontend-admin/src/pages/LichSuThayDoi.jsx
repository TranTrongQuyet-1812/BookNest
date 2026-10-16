import React, { useEffect, useState } from 'react';
import { History, RefreshCw, Trash2 } from 'lucide-react';
import api from '@booknest/shared/api';
import { useThongBao, ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';

const nhan = (value) => value == null || value === '' ? '—' : value;
const nguoiDungTruong = { TenSach: 'Tên sách', TacGia: 'Tác giả', MoTa: 'Mô tả', GiaBan: 'Giá bán', NguongCanhBao: 'Ngưỡng cảnh báo', AnhBia: 'Ảnh bìa', MaDanhMuc: 'Danh mục', DaAn: 'Trạng thái', TenDanhMuc: 'Tên danh mục', THANH_TOAN_QR_BAT: 'Thanh toán QR' };
const tenDoiTuong = { SACH: 'Sách', DANH_MUC: 'Danh mục', CAU_HINH: 'Cài đặt hệ thống' };
// Công tắc lưu '1'/'0' trong CSDL, hiển thị cho người đọc là Bật/Tắt
const hienGiaTri = (item, giaTri) => item.LoaiDoiTuong === 'CAU_HINH' ? (giaTri === '1' ? 'Bật' : 'Tắt') : nhan(giaTri);

export default function LichSuThayDoi() {
  const { thongBao: tb, xacNhan } = useThongBao();
  const [danhSach, setDanhSach] = useState([]);
  const [page, setPage] = useState(1);
  const [tongSoTrang, setTongSoTrang] = useState(1);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState('');
  const [truocNgay, setTruocNgay] = useState('');
  const [xemTruoc, setXemTruoc] = useState(null);
  const [dangDon, setDangDon] = useState(false);
  const [ketQuaDon, setKetQuaDon] = useState(null);

  const taiLichSu = async () => {
    setDangTai(true);
    try {
      const res = await api.get('/admin/change-history', { params: { page, limit: 30 } });
      setDanhSach(res.data.data.danhSach);
      setTongSoTrang(res.data.data.phanTrang.tongSoTrang || 1);
      setLoi('');
    } catch (err) { setLoi(loiTuApi(err, 'Không tải được lịch sử.')); }
    finally { setDangTai(false); }
  };

  useEffect(() => { taiLichSu(); }, [page]);

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
        <div className="bo-panel-title"><div><h2><History size={18}/> Gần đây</h2><p>{danhSach.length} mục ở trang {page}/{tongSoTrang}</p></div></div>
        {dangTai ? <div className="bo-empty">Đang tải lịch sử…</div> : <div className="bo-table-wrap"><table className="bo-table history-table"><thead><tr><th>Thời điểm</th><th>Đối tượng</th><th>Trường</th><th>Thay đổi</th><th>Nhân viên</th></tr></thead><tbody>
          {danhSach.map(item => <tr key={item.MaLichSuThayDoi}><td>{new Date(item.NgayThayDoi).toLocaleString('vi-VN')}</td><td>{tenDoiTuong[item.LoaiDoiTuong] || item.LoaiDoiTuong} {item.LoaiDoiTuong !== 'CAU_HINH' && <small>#{item.MaDoiTuong}</small>}</td><td>{nguoiDungTruong[item.TruongDuLieu] || item.TruongDuLieu}</td><td><span className="history-old">{hienGiaTri(item, item.GiaTriCu)}</span><span className="history-arrow">→</span><strong>{hienGiaTri(item, item.GiaTriMoi)}</strong></td><td>{item.nhanVienThayDoi?.HoTen || 'Nhân viên không còn hoạt động'}</td></tr>)}
          {!danhSach.length && <tr><td colSpan="5" className="bo-empty">Chưa có thay đổi nào được ghi nhận.</td></tr>}
        </tbody></table></div>}
        <div className="history-pagination"><button className="bo-secondary-button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</button><span>Trang {page} / {tongSoTrang}</span><button className="bo-secondary-button" disabled={page >= tongSoTrang} onClick={() => setPage(p => p + 1)}>Sau</button></div>
      </section>
    </div>
  );
}
