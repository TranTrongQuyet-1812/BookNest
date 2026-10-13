import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Boxes, 
  AlertTriangle, 
  PlusCircle, 
  History, 
  Check, 
  AlertCircle 
} from 'lucide-react';

const tenLoaiDieuChinh = {
  KIEM_KE: 'Kiểm kê', HU_HONG: 'Hư hỏng', THAT_LAC: 'Thất lạc', TRA_NXB: 'Trả nhà xuất bản', KHAC: 'Khác'
};

export const NhapKho = () => {
  const [sachSapHet, setSachSapHet] = useState([]);
  const [lichSuNhap, setLichSuNhap] = useState([]);
  const [lichSuDieuChinh, setLichSuDieuChinh] = useState([]);
  const [baoCaoKho, setBaoCaoKho] = useState(null);
  const [phanTrangSapHet, setPhanTrangSapHet] = useState(null);
  const [trangSapHet, setTrangSapHet] = useState(1);
  const [dangTai, setDangTai] = useState(true);
  const [thongBao, setThongBao] = useState('');
  const [loi, setLoi] = useState('');
  // Tăng số này để tải lại cảnh báo và lịch sử sau khi nhập kho xong
  const [lanTai, setLanTai] = useState(0);

  // Tìm sách để nhập: kết quả lấy từ server, mỗi lần tối đa 20 cuốn
  const [tuKhoaSach, setTuKhoaSach] = useState('');
  const [ketQuaSach, setKetQuaSach] = useState([]);
  const [sachDangChon, setSachDangChon] = useState(null);

  // Form nhập kho
  const [formNhap, setFormNhap] = useState({
    soLuongNhap: 10,
    ghiChu: ''
  });
  const [dangNhapKho, setDangNhapKho] = useState(false);
  const [formDieuChinh, setFormDieuChinh] = useState({ soLuongThayDoi: -1, loaiDieuChinh: 'HU_HONG', ghiChu: '' });
  const [dangDieuChinh, setDangDieuChinh] = useState(false);

  // Tải cảnh báo sắp hết hàng và lịch sử nhập kho gần đây
  useEffect(() => {
    let daHuy = false;
    const nap = async () => {
      try {
        const [resSapHet, resLichSu, resDieuChinh, resBaoCao] = await Promise.all([
          api.get('/books/low-stock', { params: { page: trangSapHet, limit: 20 } }),
          api.get('/books/inventory/history'),
          api.get('/books/inventory/adjustments', { params: { page: 1, limit: 20 } }),
          api.get('/admin/stats/inventory')
        ]);
        if (daHuy) return;
        setSachSapHet(resSapHet.data.data.danhSach);
        setPhanTrangSapHet(resSapHet.data.data.phanTrang);
        setLichSuNhap(resLichSu.data.data);
        setLichSuDieuChinh(resDieuChinh.data.data.danhSach);
        setBaoCaoKho(resBaoCao.data.data);
      } catch (err) {
        if (!daHuy) setLoi(err.response?.data?.message || 'Không thể tải dữ liệu nhập kho');
      } finally {
        if (!daHuy) setDangTai(false);
      }
    };
    nap();
    return () => {
      daHuy = true;
    };
  }, [lanTai, trangSapHet]);

  // Tìm sách theo từ khóa (đợi 300ms sau lần gõ cuối để không gọi server liên tục)
  useEffect(() => {
    let daHuy = false;
    const hen = setTimeout(async () => {
      try {
        const params = { limit: 20 };
        if (tuKhoaSach.trim()) params.search = tuKhoaSach.trim();
        const res = await api.get('/admin/books', { params });
        if (!daHuy) setKetQuaSach(res.data.data.danhSach);
      } catch (err) {
        if (!daHuy) setLoi(err.response?.data?.message || 'Không thể tìm sách');
      }
    }, 300);
    return () => {
      daHuy = true;
      clearTimeout(hen);
    };
  }, [tuKhoaSach, lanTai]);

  const handleNhapKho = async (e) => {
    e.preventDefault();
    setThongBao('');
    setLoi('');
    if (!sachDangChon) {
      setLoi('Vui lòng chọn cuốn sách cần nhập');
      return;
    }
    setDangNhapKho(true);

    try {
      await api.post(`/books/${sachDangChon.MaSach}/stock-in`, {
        soLuongNhap: parseInt(formNhap.soLuongNhap),
        ghiChu: formNhap.ghiChu || undefined
      });

      setThongBao(`Đã nhập kho "${sachDangChon.TenSach}" thành công! Số lượng tồn kho đã được cộng dồn.`);
      setSachDangChon(null);
      setFormNhap({ soLuongNhap: 10, ghiChu: '' });
      setLanTai((n) => n + 1);
    } catch (err) {
      setLoi(err.response?.data?.message || 'Nhập kho thất bại');
    } finally {
      setDangNhapKho(false);
    }
  };

  const handleDieuChinhKho = async (e) => {
    e.preventDefault();
    setThongBao('');
    setLoi('');
    if (!sachDangChon) return setLoi('Vui lòng chọn cuốn sách cần điều chỉnh.');
    setDangDieuChinh(true);
    try {
      const soLuongThayDoi = Number(formDieuChinh.soLuongThayDoi);
      await api.post(`/books/${sachDangChon.MaSach}/stock-adjustment`, { ...formDieuChinh, soLuongThayDoi });
      setThongBao(`Đã điều chỉnh tồn kho của "${sachDangChon.TenSach}".`);
      setFormDieuChinh({ soLuongThayDoi: -1, loaiDieuChinh: 'HU_HONG', ghiChu: '' });
      setSachDangChon(null);
      setLanTai(n => n + 1);
    } catch (err) { setLoi(err.response?.data?.message || 'Điều chỉnh tồn kho thất bại.'); }
    finally { setDangDieuChinh(false); }
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            Nhập Kho & Quản Lý Tồn Kho
          </h1>
          <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Lập phiếu nhập ấn phẩm, giám sát biến động tồn kho và cảnh báo thiếu hụt
          </p>
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

      {baoCaoKho && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-5">
          {[
            ['Đầu sách đang bán', baoCaoKho.tongDauSach],
            ['Tổng tồn kho', baoCaoKho.tongSoLuongTon],
            ['Giá trị tồn kho', `${Number(baoCaoKho.giaTriTonKho).toLocaleString('vi-VN')} đ`],
            ['Sắp hết hàng', baoCaoKho.soSachSapHet],
            ['Đã hết hàng', baoCaoKho.soSachHetHang],
            ['Không bán 90 ngày', baoCaoKho.soSachBanCham]
          ].map(([nhan, giaTri]) => <div className="card" key={nhan} style={{ padding: '0.85rem 1rem' }}><small style={{ color: 'var(--adm-text-muted)' }}>{nhan}</small><strong style={{ display: 'block', marginTop: '.35rem', fontSize: '1.15rem' }}>{giaTri}</strong></div>)}
        </div>
      )}

      {baoCaoKho && <div className="card mb-6" style={{ padding: '1rem 1.25rem' }}>
        <div className="flex items-center justify-between gap-3 mb-3"><h3 style={{ margin: 0, fontSize: '.95rem' }}>Còn hàng, không có đơn giao thành công trong 90 ngày</h3><small style={{ color: 'var(--adm-text-muted)' }}>{baoCaoKho.soSachBanCham} đầu sách · sắp xếp theo giá trị tồn</small></div>
        {baoCaoKho.sachBanCham.length ? <div className="admindash-table-wrap"><table className="admindash-table"><thead><tr><th>Sách</th><th>Tồn</th><th>Giá trị tồn</th><th>Lần giao gần nhất</th></tr></thead><tbody>
          {baoCaoKho.sachBanCham.map(sach => <tr key={sach.maSach}><td>{sach.tenSach}</td><td>{sach.soLuongTon}</td><td>{Number(sach.giaTriTon).toLocaleString('vi-VN')} đ</td><td>{sach.ngayBanGanNhat ? new Date(sach.ngayBanGanNhat).toLocaleDateString('vi-VN') : 'Chưa từng bán'}</td></tr>)}
        </tbody></table></div> : <p style={{ margin: 0, color: 'var(--adm-text-muted)', fontSize: '.82rem' }}>Không có đầu sách nào thỏa điều kiện.</p>}
      </div>}

      {/* Cảnh Báo Sách Sắp Hết Hàng */}
      {sachSapHet.length > 0 && (
        <div className="card mb-6" style={{ borderLeft: '3px solid var(--adm-danger)', padding: '1rem 1.25rem' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={18} style={{ color: 'var(--adm-danger)' }} />
            <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--adm-danger)', margin: 0 }}>
              Cảnh Báo: Có {phanTrangSapHet?.tongSoBanGhi ?? sachSapHet.length} tác phẩm chạm ngưỡng sắp hết hàng
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            {sachSapHet.map((s) => {
              const ma = s.MaSach;
              const ten = s.TenSach;
              const ton = s.SoLuongTon ?? 0;
              return (
                <span
                  key={ma}
                  className="badge badge-cancelled"
                  style={{ cursor: 'pointer', padding: '0.35rem 0.65rem' }}
                  onClick={() => setSachDangChon(s)}
                  title="Bấm để chọn nhập ngay cuốn này"
                >
                  {ten} (Còn {ton})
                </span>
              );
            })}
          </div>
          {phanTrangSapHet?.tongSoTrang > 1 && <div className="flex items-center justify-end gap-2 mt-3">
            <button className="btn btn-outline" disabled={trangSapHet <= 1} onClick={() => setTrangSapHet(page => page - 1)}>Trước</button>
            <small style={{ color: 'var(--adm-text-muted)' }}>Trang {trangSapHet}/{phanTrangSapHet.tongSoTrang}</small>
            <button className="btn btn-outline" disabled={trangSapHet >= phanTrangSapHet.tongSoTrang} onClick={() => setTrangSapHet(page => page + 1)}>Sau</button>
          </div>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Tạo Phiếu Nhập Kho */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="flex items-center gap-2 mb-4">
            <PlusCircle size={18} style={{ color: 'var(--adm-primary)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
              Lập Phiếu Nhập Kho
            </h3>
          </div>

          <form onSubmit={handleNhapKho}>
            <div className="form-group">
              <label className="form-label">Tìm tác phẩm cần nhập *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Gõ tên sách hoặc tác giả..."
                value={tuKhoaSach}
                onChange={(e) => setTuKhoaSach(e.target.value)}
              />
              <div style={{ maxHeight: '180px', overflowY: 'auto', marginTop: '0.5rem', border: '1px solid var(--adm-border)', borderRadius: '6px' }}>
                {ketQuaSach.length === 0 ? (
                  <p style={{ padding: '0.5rem 0.75rem', color: 'var(--adm-text-muted)', fontSize: '0.85rem' }}>Không tìm thấy sách phù hợp</p>
                ) : (
                  ketQuaSach.map((s) => (
                    <button
                      type="button"
                      key={s.MaSach}
                      onClick={() => setSachDangChon(s)}
                      style={{
                        display: 'block',
                        width: '100%',
                        textAlign: 'left',
                        padding: '0.4rem 0.75rem',
                        fontSize: '0.85rem',
                        color: 'var(--adm-text-main)',
                        backgroundColor: sachDangChon?.MaSach === s.MaSach ? 'var(--adm-primary-subtle)' : 'transparent'
                      }}
                    >
                      #{s.MaSach} - {s.TenSach} (Còn {s.SoLuongTon})
                    </button>
                  ))
                )}
              </div>
              {sachDangChon && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.825rem', fontWeight: 600, color: 'var(--adm-primary)' }}>
                  Đang chọn: #{sachDangChon.MaSach} - {sachDangChon.TenSach} (hiện còn {sachDangChon.SoLuongTon})
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Số lượng nhập thêm *</label>
              <input
                type="number"
                min="1"
                required
                className="form-input"
                value={formNhap.soLuongNhap}
                onChange={(e) => setFormNhap({ ...formNhap, soLuongNhap: e.target.value })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Ghi chú phiếu nhập (Nhà xuất bản/Lô hàng)</label>
              <textarea
                rows="2"
                className="form-input"
                placeholder="Nhập đợt 1 NXB Kim Đồng..."
                value={formNhap.ghiChu}
                onChange={(e) => setFormNhap({ ...formNhap, ghiChu: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={dangNhapKho}
              className="btn btn-primary w-full mt-3"
            >
              <Boxes size={16} />
              {dangNhapKho ? 'Đang cập nhật kho...' : 'Xác Nhận Nhập Kho'}
            </button>
          </form>
        </div>

        {/* Bảng Lịch Sử Nhập Kho */}
        <div className="card lg:col-span-2" style={{ padding: '1.25rem' }}>
          <div className="flex items-center gap-2 mb-4">
            <History size={18} style={{ color: 'var(--adm-primary)' }} />
            <h3 style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.01em', margin: 0 }}>
              Lịch Sử Các Lần Nhập Kho Gần Đây
            </h3>
          </div>

          {dangTai ? (
            <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.85rem' }}>Đang tải lịch sử...</p>
          ) : lichSuNhap.length === 0 ? (
            <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
              Chưa có phiếu nhập kho nào được tạo trong hệ thống.
            </p>
          ) : (
            <div className="admindash-table-wrap">
              <table className="admindash-table">
                <thead>
                  <tr>
                    <th style={{ width: '85px' }}>Mã Phiếu</th>
                    <th>Thời Gian</th>
                    <th>Tác Phẩm</th>
                    <th>SL Nhập</th>
                    <th>Người Thực Hiện</th>
                  </tr>
                </thead>
                <tbody>
                  {lichSuNhap.map((phieu) => {
                    const maPhieu = phieu.MaNhapKho;
                    const ngay = phieu.NgayNhap;
                    const tenSach = phieu.sach?.TenSach ?? (`Sách #${phieu.MaSach}`);
                    const sl = phieu.SoLuongNhap ?? 0;
                    const nguoi = phieu.nhanVienNhap?.HoTen ?? 'Nhân viên';

                    return (
                      <tr key={maPhieu}>
                        <td style={{ fontWeight: 600 }} className="tabular-nums">#{maPhieu}</td>
                        <td style={{ fontSize: '0.825rem', color: 'var(--adm-text-muted)' }} className="tabular-nums">
                          {ngay ? new Date(ngay).toLocaleString('vi-VN') : '—'}
                        </td>
                        <td>
                          <strong style={{ fontSize: '0.85rem', color: 'var(--adm-text-main)' }}>{tenSach}</strong>
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--adm-success)' }} className="tabular-nums">
                          +{sl} cuốn
                        </td>
                        <td style={{ fontSize: '0.825rem', color: 'var(--adm-text-main)' }}>
                          {nguoi}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        <div className="card" style={{ padding: '1.25rem' }}>
          <div className="flex items-center gap-2 mb-4"><AlertTriangle size={18} style={{ color: 'var(--adm-warning)' }}/><h3 style={{ margin: 0, fontSize: '1rem' }}>Điều chỉnh tồn kho</h3></div>
          <form onSubmit={handleDieuChinhKho}>
            <div className="form-group"><label className="form-label">Sách đã chọn</label><div className="form-input" style={{ minHeight: 40 }}>{sachDangChon ? `#${sachDangChon.MaSach} · ${sachDangChon.TenSach}` : 'Chọn trong ô tìm sách bên trên'}</div></div>
            <div className="form-group"><label className="form-label">Số lượng thay đổi (+/-)</label><input className="form-input" type="number" step="1" required value={formDieuChinh.soLuongThayDoi} onChange={e => setFormDieuChinh({ ...formDieuChinh, soLuongThayDoi: e.target.value })}/><small style={{ color: 'var(--adm-text-muted)' }}>Tăng kho chỉ dành cho kiểm kê hoặc lý do khác.</small></div>
            <div className="form-group"><label className="form-label">Loại điều chỉnh</label><select className="form-input" value={formDieuChinh.loaiDieuChinh} onChange={e => setFormDieuChinh({ ...formDieuChinh, loaiDieuChinh: e.target.value })}>{Object.entries(tenLoaiDieuChinh).map(([ma, ten]) => <option key={ma} value={ma}>{ten}</option>)}</select></div>
            <div className="form-group"><label className="form-label">Ghi chú {formDieuChinh.loaiDieuChinh === 'KHAC' ? '*' : '(tùy chọn)'}</label><textarea className="form-input" required={formDieuChinh.loaiDieuChinh === 'KHAC'} minLength={formDieuChinh.loaiDieuChinh === 'KHAC' ? 1 : undefined} maxLength="500" value={formDieuChinh.ghiChu} onChange={e => setFormDieuChinh({ ...formDieuChinh, ghiChu: e.target.value })} placeholder="Có thể ghi thêm thông tin; bắt buộc khi chọn Khác"/></div>
            <button className="btn btn-primary w-full" disabled={dangDieuChinh}>{dangDieuChinh ? 'Đang cập nhật…' : 'Ghi nhận điều chỉnh'}</button>
          </form>
        </div>
        <div className="card lg:col-span-2" style={{ padding: '1.25rem' }}>
          <div className="flex items-center gap-2 mb-4"><History size={18} style={{ color: 'var(--adm-primary)' }}/><h3 style={{ margin: 0, fontSize: '1rem' }}>Lịch sử điều chỉnh gần đây</h3></div>
          <div className="admindash-table-wrap"><table className="admindash-table"><thead><tr><th>Ngày</th><th>Sách</th><th>Thay đổi</th><th>Tồn trước → sau</th><th>Loại · ghi chú · nhân viên</th></tr></thead><tbody>
            {lichSuDieuChinh.map(item => <tr key={item.MaDieuChinhKho}><td>{new Date(item.NgayDieuChinh).toLocaleDateString('vi-VN')}</td><td>{item.sach?.TenSach || `#${item.MaSach}`}</td><td style={{ color: item.SoLuongThayDoi > 0 ? 'var(--adm-success)' : 'var(--adm-danger)' }}>{item.SoLuongThayDoi > 0 ? '+' : ''}{item.SoLuongThayDoi}</td><td>{item.TonTruoc} → {item.TonSau}</td><td>{tenLoaiDieuChinh[item.LoaiDieuChinh] || item.LoaiDieuChinh}{item.GhiChu && <small style={{ display: 'block' }}>{item.GhiChu}</small>}<small style={{ display: 'block', color: 'var(--adm-text-muted)' }}>{item.nhanVienDieuChinh?.HoTen || 'Nhân viên'}</small></td></tr>)}
            {!lichSuDieuChinh.length && <tr><td colSpan="5">Chưa có lần điều chỉnh nào.</td></tr>}
          </tbody></table></div>
        </div>
      </div>
    </div>
  );
};

export default NhapKho;
