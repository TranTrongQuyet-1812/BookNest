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
  const [sachSapHet, setSachSapHet] = useState([]);
  const [lichSuNhap, setLichSuNhap] = useState([]);
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

  // Tải cảnh báo sắp hết hàng và lịch sử nhập kho gần đây
  useEffect(() => {
    let daHuy = false;
    const nap = async () => {
      try {
        const [resSapHet, resLichSu] = await Promise.all([
          api.get('/books/low-stock'),
          api.get('/books/inventory/history')
        ]);
        if (daHuy) return;
        setSachSapHet(resSapHet.data.data);
        setLichSuNhap(resLichSu.data.data);
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
  }, [lanTai]);

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
              Cảnh Báo: Có {sachSapHet.length} tác phẩm sắp hết hàng (tồn kho đã chạm ngưỡng cảnh báo)
            </h3>
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            {sachSapHet.slice(0, 12).map((s) => {
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
            {sachSapHet.length > 12 && (
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
                và {sachSapHet.length - 12} tác phẩm khác...
              </span>
            )}
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
              <label className="form-label">Tìm tác phẩm cần nhập *</label>
              <input
                type="text"
                className="form-input"
                placeholder="Gõ tên sách hoặc tác giả..."
                value={tuKhoaSach}
                onChange={(e) => setTuKhoaSach(e.target.value)}
              />
              <div style={{ maxHeight: '180px', overflowY: 'auto', marginTop: '0.5rem', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
                {ketQuaSach.length === 0 ? (
                  <p style={{ padding: '0.5rem 0.75rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>Không tìm thấy sách phù hợp</p>
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
                        backgroundColor: sachDangChon?.MaSach === s.MaSach ? 'var(--primary-light, rgba(0,0,0,0.06))' : 'transparent'
                      }}
                    >
                      #{s.MaSach} - {s.TenSach} (Còn {s.SoLuongTon})
                    </button>
                  ))
                )}
              </div>
              {sachDangChon && (
                <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
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
