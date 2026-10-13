import React, { useEffect, useState } from 'react';
import { Archive, History, RefreshCw } from 'lucide-react';
import api from '@booknest/shared/api';

const nhan = (value) => value == null || value === '' ? '—' : value;
const nguoiDungTruong = { TenSach: 'Tên sách', TacGia: 'Tác giả', MoTa: 'Mô tả', GiaBan: 'Giá bán', NguongCanhBao: 'Ngưỡng cảnh báo', AnhBia: 'Ảnh bìa', MaDanhMuc: 'Danh mục', DaAn: 'Trạng thái', TenDanhMuc: 'Tên danh mục' };

export default function LichSuThayDoi() {
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
    } catch (err) { setLoi(err.response?.data?.message || 'Không tải được lịch sử.'); }
    finally { setDangTai(false); }
  };

  useEffect(() => { taiLichSu(); }, [page]);

  const kiemTraDonDep = async () => {
    if (!truocNgay) return setLoi('Chọn mốc thời gian trước khi dọn lịch sử.');
    try {
      const res = await api.post('/admin/change-history/cleanup-preview', { truocNgay: new Date(truocNgay).toISOString() });
      setXemTruoc(res.data.data);
      setLoi('');
    } catch (err) { setLoi(err.response?.data?.message || 'Không thể xem trước dữ liệu.'); }
  };

  const xacNhanDonDep = async () => {
    setDangDon(true);
    try {
      const res = await api.post('/admin/change-history/cleanup', { truocNgay: new Date(truocNgay).toISOString() });
      setKetQuaDon(res.data.data);
      setXemTruoc(null);
      await taiLichSu();
    } catch (err) { setLoi(err.response?.data?.message || 'Lưu trữ thất bại; dữ liệu chưa bị xóa.'); }
    finally { setDangDon(false); }
  };

  return (
    <div className="bo-page">
      <div className="bo-page-heading"><div><span className="bo-eyebrow">THEO DÕI NGHIỆP VỤ</span><h1>Lịch sử thay đổi</h1><p>Nhật ký sách và danh mục, gồm người thực hiện, thời điểm và giá trị trước/sau.</p></div><button className="bo-secondary-button" onClick={taiLichSu}><RefreshCw size={15}/> Làm mới</button></div>
      {loi && <div className="bo-alert" role="alert">{loi}</div>}
      <section className="bo-panel history-cleanup">
        <div className="history-cleanup-copy"><span className="history-icon"><Archive size={18}/></span><div><strong>Dọn lịch sử cũ</strong><p>Sao lưu có kiểm tra SHA-256 trước khi xóa. Lịch sử đơn đã giao được giữ để bảo toàn báo cáo.</p></div></div>
        <div className="history-cleanup-controls"><label>Từ trước ngày<input type="date" value={truocNgay} onChange={e => { setTruocNgay(e.target.value); setXemTruoc(null); }}/></label><button className="bo-secondary-button" onClick={kiemTraDonDep}>Xem trước</button></div>
        {xemTruoc && <div className="history-preview"><span>Sẽ lưu trữ và xóa <strong>{xemTruoc.soDongDuKien.toLocaleString('vi-VN')}</strong> dòng.</span><span>Giữ lại <strong>{xemTruoc.soDongDaGiaoGiuLai.toLocaleString('vi-VN')}</strong> dòng giao thành công.</span><button className="bo-danger-button" disabled={dangDon || !xemTruoc.soDongDuKien} onClick={xacNhanDonDep}>{dangDon ? 'Đang lưu trữ…' : 'Lưu trữ và dọn'}</button></div>}
        {ketQuaDon?.luuTru && <div className="history-success">Đã lưu trữ tại <code>{ketQuaDon.luuTru.thuMuc}\{ketQuaDon.luuTru.tenFile}</code> · SHA-256 <code>{ketQuaDon.luuTru.sha256}</code></div>}
      </section>
      <section className="bo-panel history-table-panel">
        <div className="bo-panel-title"><div><h2><History size={18}/> Gần đây</h2><p>{danhSach.length} mục ở trang {page}/{tongSoTrang}</p></div></div>
        {dangTai ? <div className="bo-empty">Đang tải lịch sử…</div> : <div className="bo-table-wrap"><table className="bo-table history-table"><thead><tr><th>Thời điểm</th><th>Đối tượng</th><th>Trường</th><th>Thay đổi</th><th>Nhân viên</th></tr></thead><tbody>
          {danhSach.map(item => <tr key={item.MaLichSuThayDoi}><td>{new Date(item.NgayThayDoi).toLocaleString('vi-VN')}</td><td>{item.LoaiDoiTuong === 'SACH' ? 'Sách' : 'Danh mục'} <small>#{item.MaDoiTuong}</small></td><td>{nguoiDungTruong[item.TruongDuLieu] || item.TruongDuLieu}</td><td><span className="history-old">{nhan(item.GiaTriCu)}</span><span className="history-arrow">→</span><strong>{nhan(item.GiaTriMoi)}</strong></td><td>{item.nhanVienThayDoi?.HoTen || 'Nhân viên không còn hoạt động'}</td></tr>)}
          {!danhSach.length && <tr><td colSpan="5" className="bo-empty">Chưa có thay đổi nào được ghi nhận.</td></tr>}
        </tbody></table></div>}
        <div className="history-pagination"><button className="bo-secondary-button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Trước</button><span>Trang {page} / {tongSoTrang}</span><button className="bo-secondary-button" disabled={page >= tongSoTrang} onClick={() => setPage(p => p + 1)}>Sau</button></div>
      </section>
    </div>
  );
}
