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

export const NhapKho = () => {
  const [sachList, setSachList] = useState([]);
  const [lichSuNhap, setLichSuNhap] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [thongBao, setThongBao] = useState('');
  const [loi, setLoi] = useState('');

  // Form nhập kho
  const [formNhap, setFormNhap] = useState({
    maSach: '',
    soLuongNhap: 10,
    giaNhap: '',
    ghiChu: ''
  });
  const [dangNhapKho, setDangNhapKho] = useState(false);

  const taiDuLieu = async () => {
    setDangTai(true);
    try {
      const [resSach, resLichSu] = await Promise.all([
        api.get('/books', { params: { limit: 100 } }),
        api.get('/books/inventory/history')
      ]);
      const dsSach = resSach.data.data?.danhSach || resSach.data.data || [];
      const dsLichSu = resLichSu.data.data || [];
      setSachList(Array.isArray(dsSach) ? dsSach : []);
      setLichSuNhap(Array.isArray(dsLichSu) ? dsLichSu : []);
    } catch (err) {
      setLoi(err.response?.data?.message || err.response?.data?.thongDiep || 'Không thể tải dữ liệu nhập kho');
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    taiDuLieu();
  }, []);

  const handleNhapKho = async (e) => {
    e.preventDefault();
    setThongBao('');
    setLoi('');
    setDangNhapKho(true);

    try {
      await api.post('/books/inventory/import', {
        maSach: parseInt(formNhap.maSach),
        soLuongNhap: parseInt(formNhap.soLuongNhap),
        giaNhap: formNhap.giaNhap ? parseFloat(formNhap.giaNhap) : undefined,
        ghiChu: formNhap.ghiChu || undefined
      });

      setThongBao('Tạo phiếu nhập kho thành công! Số lượng tồn kho đã được cộng dồn.');
      setFormNhap({ maSach: '', soLuongNhap: 10, giaNhap: '', ghiChu: '' });
      taiDuLieu();
    } catch (err) {
      setLoi(err.response?.data?.message || err.response?.data?.thongDiep || 'Nhập kho thất bại');
    } finally {
      setDangNhapKho(false);
    }
  };

  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);
  };

  // Sách sắp hết hàng (tồn kho <= 5)
  const sachSapHet = sachList.filter((s) => (s.SoLuongTon ?? s.soLuongTon ?? 0) <= 5);

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            Quản Lý Nhập Kho & Tồn Kho
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Lập phiếu nhập sách mới, theo dõi lịch sử nguồn nhập và cảnh báo hết hàng
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

      {/* Cảnh Báo Sách Sắp Hết Hàng */}
      {sachSapHet.length > 0 && (
        <div className="card mb-8" style={{ borderLeft: '4px solid var(--danger)', padding: '1.25rem' }}>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={20} style={{ color: 'var(--danger)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--danger)' }}>
              Cảnh Báo: Có {sachSapHet.length} tác phẩm sắp hết hàng (≤ 5 cuốn)
            </h3>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {sachSapHet.map((s) => {
              const ma = s.MaSach ?? s.maSach;
              const ten = s.TenSach ?? s.tenSach ?? s.tieuDe;
              const ton = s.SoLuongTon ?? s.soLuongTon ?? 0;
              return (
                <span
                  key={ma}
                  className="badge badge-cancelled"
                  style={{ cursor: 'pointer', padding: '0.35rem 0.65rem' }}
                  onClick={() => setFormNhap((prev) => ({ ...prev, maSach: ma }))}
                  title="Bấm để chọn nhập ngay cuốn này"
                >
                  {ten} (Còn {ton})
                </span>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Form Tạo Phiếu Nhập Kho */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <PlusCircle size={20} style={{ color: 'var(--primary)' }} />
            <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
              Lập Phiếu Nhập Kho
            </h3>
          </div>

          <form onSubmit={handleNhapKho}>
            <div className="form-group">
              <label className="form-label">Chọn tác phẩm cần nhập *</label>
              <select
                required
                className="form-input"
                value={formNhap.maSach}
                onChange={(e) => setFormNhap({ ...formNhap, maSach: e.target.value })}
              >
                <option value="">-- Chọn sách --</option>
                {sachList.map((s) => {
                  const ma = s.MaSach ?? s.maSach;
                  const ten = s.TenSach ?? s.tenSach ?? s.tieuDe;
                  const ton = s.SoLuongTon ?? s.soLuongTon ?? 0;
                  return (
                    <option key={ma} value={ma}>
                      #{ma} - {ten} (Hiện còn: {ton})
                    </option>
                  );
                })}
              </select>
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
              <label className="form-label">Giá nhập đơn vị (VND)</label>
              <input
                type="number"
                min="0"
                className="form-input"
                placeholder="Ví dụ: 75000"
                value={formNhap.giaNhap}
                onChange={(e) => setFormNhap({ ...formNhap, giaNhap: e.target.value })}
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
              <Boxes size={18} />
              {dangNhapKho ? 'Đang cập nhật kho...' : 'Xác Nhận Nhập Kho'}
            </button>
          </form>
        </div>

        {/* Bảng Lịch Sử Nhập Kho */}
        <div className="card lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <History size={20} style={{ color: 'var(--primary)' }} />
            <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 600 }}>
              Lịch Sử Các Lần Nhập Kho Gần Đây
            </h3>
          </div>

          {dangTai ? (
            <p style={{ color: 'var(--text-muted)' }}>Đang tải lịch sử...</p>
          ) : lichSuNhap.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Chưa có phiếu nhập kho nào được tạo trong hệ thống.
            </p>
          ) : (
            <div className="table-container">
              <table className="table">
                <thead>
                  <tr>
                    <th>Mã Phiếu</th>
                    <th>Thời Gian</th>
                    <th>Tác Phẩm</th>
                    <th>SL Nhập</th>
                    <th>Giá Nhập</th>
                    <th>Người Thực Hiện</th>
                  </tr>
                </thead>
                <tbody>
                  {lichSuNhap.map((phieu) => {
                    const maPhieu = phieu.MaNhapKho ?? phieu.MaPhieuNhap ?? phieu.maPhieuNhap ?? phieu.id;
                    const ngay = phieu.NgayNhap ?? phieu.ngayNhap;
                    const tenSach = phieu.sach?.TenSach ?? phieu.sach?.tenSach ?? phieu.sach?.tieuDe ?? (`Sách #${phieu.MaSach ?? phieu.maSach}`);
                    const sl = phieu.SoLuongNhap ?? phieu.soLuongNhap ?? 0;
                    const gia = phieu.GiaNhap ?? phieu.giaNhap;
                    const nguoi = phieu.nguoiNhap?.HoTen ?? phieu.nguoiNhap?.hoTen ?? 'Thủ thư';

                    return (
                      <tr key={maPhieu}>
                        <td style={{ fontWeight: 600 }}>#{maPhieu}</td>
                        <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                          {ngay ? new Date(ngay).toLocaleString('vi-VN') : '—'}
                        </td>
                        <td>
                          <strong>{tenSach}</strong>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--accent)' }}>
                          +{sl} cuốn
                        </td>
                        <td>{gia ? dinhDangTien(gia) : '—'}</td>
                        <td style={{ fontSize: '0.85rem' }}>
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
    </div>
  );
};

export default NhapKho;
