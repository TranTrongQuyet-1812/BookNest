import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { 
  Plus, 
  Edit, 
  Eye, 
  EyeOff, 
  FolderPlus, 
  Check, 
  AlertCircle, 
  X, 
  Search 
} from 'lucide-react';

export const QuanLySach = () => {
  const [sachList, setSachList] = useState([]);
  const [danhMucList, setDanhMucList] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [timKiem, setTimKiem] = useState('');
  const [thongBao, setThongBao] = useState('');
  const [loi, setLoi] = useState('');

  // Modal Sách (Thêm / Sửa)
  const [modalSachMo, setModalSachMo] = useState(false);
  const [sachDangSua, setSachDangSua] = useState(null);
  const [formSach, setFormSach] = useState({
    tieuDe: '',
    tacGia: '',
    maDanhMuc: '',
    gia: '',
    soLuongTon: 0,
    moTa: '',
    hinhAnh: ''
  });

  // Modal Danh Mục
  const [modalDanhMucMo, setModalDanhMucMo] = useState(false);
  const [formDanhMuc, setFormDanhMuc] = useState({ tenDanhMuc: '', moTa: '' });

  // Tải danh sách sách và danh mục
  const taiDuLieu = async () => {
    setDangTai(true);
    try {
      const [resSach, resDanhMuc] = await Promise.all([
        api.get('/books', { params: { limit: 100 } }),
        api.get('/categories')
      ]);
      const dsSach = resSach.data.data?.danhSach || resSach.data.data || [];
      const dsDanhMuc = resDanhMuc.data.data || [];
      setSachList(Array.isArray(dsSach) ? dsSach : []);
      setDanhMucList(Array.isArray(dsDanhMuc) ? dsDanhMuc : []);
    } catch (err) {
      setLoi(err.response?.data?.message || err.response?.data?.thongDiep || 'Không thể tải dữ liệu sách');
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    let daHuy = false;
    const nap = async () => {
      try {
        const [resSach, resDanhMuc] = await Promise.all([
          api.get('/books', { params: { limit: 100 } }),
          api.get('/categories')
        ]);
        if (daHuy) return;
        const dsSach = resSach.data.data?.danhSach || resSach.data.data || [];
        const dsDanhMuc = resDanhMuc.data.data || [];
        setSachList(Array.isArray(dsSach) ? dsSach : []);
        setDanhMucList(Array.isArray(dsDanhMuc) ? dsDanhMuc : []);
      } catch (err) {
        if (!daHuy) setLoi(err.response?.data?.message || 'Không thể tải dữ liệu sách');
      } finally {
        if (!daHuy) setDangTai(false);
      }
    };
    nap();
    return () => {
      daHuy = true;
    };
  }, []);

  // Mở modal thêm sách mới
  const moModalThemSach = () => {
    const defaultDm = danhMucList[0]?.MaDanhMuc ?? danhMucList[0]?.maDanhMuc ?? '';
    setSachDangSua(null);
    setFormSach({
      tieuDe: '',
      tacGia: '',
      maDanhMuc: defaultDm,
      gia: '',
      soLuongTon: 0,
      moTa: '',
      hinhAnh: ''
    });
    setModalSachMo(true);
  };

  // Mở modal sửa sách
  const moModalSuaSach = (sach) => {
    setSachDangSua(sach);
    setFormSach({
      tieuDe: sach.TenSach ?? sach.tenSach ?? sach.tieuDe ?? '',
      tacGia: sach.TacGia ?? sach.tacGia ?? '',
      maDanhMuc: sach.MaDanhMuc ?? sach.maDanhMuc ?? '',
      gia: sach.GiaBan ?? sach.giaBan ?? sach.gia ?? '',
      soLuongTon: sach.SoLuongTon ?? sach.soLuongTon ?? 0,
      moTa: sach.MoTa ?? sach.moTa ?? '',
      hinhAnh: sach.AnhBia ?? sach.anhBia ?? sach.hinhAnh ?? ''
    });
    setModalSachMo(true);
  };

  // Lưu sách (Tạo mới hoặc Sửa)
  const handleLuuSach = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        tenSach: formSach.tieuDe,
        tacGia: formSach.tacGia,
        maDanhMuc: Number(formSach.maDanhMuc),
        giaBan: Number(formSach.gia),
        soLuongTon: Number(formSach.soLuongTon || 0),
        moTa: formSach.moTa || undefined,
        anhBia: formSach.hinhAnh || undefined
      };

      const maSach = sachDangSua ? (sachDangSua.MaSach ?? sachDangSua.maSach) : null;
      if (sachDangSua) {
        await api.put(`/books/${maSach}`, payload);
        setThongBao(`Đã cập nhật cuốn sách "${formSach.tieuDe}"`);
      } else {
        await api.post('/books', payload);
        setThongBao(`Đã thêm mới cuốn sách "${formSach.tieuDe}" vào kho`);
      }
      setModalSachMo(false);
      taiDuLieu();
      setTimeout(() => setThongBao(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.thongDiep || 'Lỗi khi lưu sách');
    }
  };

  // Ẩn hoặc Khôi phục sách (Soft delete toggle)
  const handleToggleAnSach = async (sach) => {
    const maSach = sach.MaSach ?? sach.maSach;
    const tenSach = sach.TenSach ?? sach.tenSach ?? sach.tieuDe;
    const daAn = sach.DaAn ?? sach.daAn;
    const hanhDong = daAn ? 'khôi phục' : 'ẩn';

    if (!window.confirm(`Bạn có chắc muốn ${hanhDong} cuốn sách "${tenSach}"?`)) return;

    try {
      await api.delete(`/books/${maSach}`);
      setThongBao(`Đã ${hanhDong} thành công cuốn sách "${tenSach}"`);
      taiDuLieu();
      setTimeout(() => setThongBao(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.thongDiep || 'Lỗi khi thay đổi trạng thái sách');
    }
  };

  // Thêm danh mục mới
  const handleThemDanhMuc = async (e) => {
    e.preventDefault();
    try {
      await api.post('/categories', formDanhMuc);
      setThongBao(`Đã tạo thể loại "${formDanhMuc.tenDanhMuc}"`);
      setFormDanhMuc({ tenDanhMuc: '', moTa: '' });
      setModalDanhMucMo(false);
      taiDuLieu();
      setTimeout(() => setThongBao(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || err.response?.data?.thongDiep || 'Lỗi khi tạo thể loại');
    }
  };

  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);
  };

  const sachLoc = sachList.filter((s) => {
    const tuKhoa = timKiem.toLowerCase();
    const ten = (s.TenSach ?? s.tenSach ?? s.tieuDe ?? '').toLowerCase();
    const tg = (s.TacGia ?? s.tacGia ?? '').toLowerCase();
    return ten.includes(tuKhoa) || tg.includes(tuKhoa);
  });

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            Quản Lý Sách & Danh Mục
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Quản trị danh mục ấn phẩm, cập nhật giá và kiểm soát ẩn/hiện sách
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setModalDanhMucMo(true)} className="btn btn-outline">
            <FolderPlus size={16} /> Thêm Thể Loại
          </button>
          <button onClick={moModalThemSach} className="btn btn-primary">
            <Plus size={16} /> Thêm Sách Mới
          </button>
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

      {/* Ô tìm kiếm nhanh */}
      <div className="card mb-6" style={{ padding: '0.75rem 1rem' }}>
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.25rem' }}
            placeholder="Tìm kiếm sách theo tựa đề hoặc tác giả trong bảng..."
            value={timKiem}
            onChange={(e) => setTimKiem(e.target.value)}
          />
          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        </div>
      </div>

      {/* Bảng Danh Sách Sách */}
      {dangTai ? (
        <div className="flex justify-center py-12">
          <p className="font-serif" style={{ color: 'var(--text-muted)' }}>Đang nạp dữ liệu sách...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tác Phẩm & Tác Giả</th>
                <th>Thể Loại</th>
                <th>Giá Bán</th>
                <th>Tồn Kho</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {sachLoc.map((sach) => {
                const ma = sach.MaSach ?? sach.maSach;
                const ten = sach.TenSach ?? sach.tenSach ?? sach.tieuDe;
                const tg = sach.TacGia ?? sach.tacGia;
                const dm = sach.danhMuc?.TenDanhMuc ?? sach.danhMuc?.tenDanhMuc ?? 'Chưa phân loại';
                const gia = sach.GiaBan ?? sach.giaBan ?? sach.gia;
                const ton = sach.SoLuongTon ?? sach.soLuongTon ?? 0;
                const an = sach.DaAn ?? sach.daAn;

                return (
                  <tr key={ma}>
                    <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>#{ma}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{ten}</div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Tác giả: {tg}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-role">
                        {dm}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--primary)' }}>
                      {dinhDangTien(gia)}
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 600,
                        color: ton <= 5 ? 'var(--danger)' : 'var(--text-main)'
                      }}>
                        {ton} cuốn
                      </span>
                    </td>
                    <td>
                      {an ? (
                        <span className="badge badge-cancelled">Đang ẩn</span>
                      ) : (
                        <span className="badge badge-delivered">Đang bán</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className="inline-flex gap-2">
                        <button
                          onClick={() => moModalSuaSach(sach)}
                          className="btn btn-outline btn-sm"
                          title="Chỉnh sửa thông tin"
                        >
                          <Edit size={14} /> Sửa
                        </button>
                        <button
                          onClick={() => handleToggleAnSach(sach)}
                          className="btn btn-outline btn-sm"
                          style={{ color: an ? 'var(--accent)' : 'var(--danger)' }}
                          title={an ? 'Khôi phục hiển thị' : 'Ẩn sách khỏi khách hàng'}
                        >
                          {an ? <Eye size={14} /> : <EyeOff size={14} />}
                          {an ? 'Hiện' : 'Ẩn'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Thêm/Sửa Sách */}
      {modalSachMo && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {sachDangSua ? 'Chỉnh Sửa Sách' : 'Thêm Tác Phẩm Mới'}
              </h3>
              <button onClick={() => setModalSachMo(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLuuSach}>
              <div className="form-group">
                <label className="form-label">Tựa đề sách *</label>
                <input
                  type="text"
                  required
                  className="form-input"
                  value={formSach.tieuDe}
                  onChange={(e) => setFormSach({ ...formSach, tieuDe: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Tác giả *</label>
                  <input
                    type="text"
                    required
                    className="form-input"
                    value={formSach.tacGia}
                    onChange={(e) => setFormSach({ ...formSach, tacGia: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Thể loại *</label>
                  <select
                    required
                    className="form-input"
                    value={formSach.maDanhMuc}
                    onChange={(e) => setFormSach({ ...formSach, maDanhMuc: e.target.value })}
                  >
                    <option value="">-- Chọn thể loại --</option>
                    {danhMucList.map((dm) => {
                      const idDm = dm.MaDanhMuc ?? dm.maDanhMuc;
                      const tenDm = dm.TenDanhMuc ?? dm.tenDanhMuc;
                      return (
                        <option key={idDm} value={idDm}>
                          {tenDm}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Giá bán (VND) *</label>
                  <input
                    type="number"
                    min="1000"
                    required
                    className="form-input"
                    value={formSach.gia}
                    onChange={(e) => setFormSach({ ...formSach, gia: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Tồn kho ban đầu</label>
                  <input
                    type="number"
                    min="0"
                    className="form-input"
                    value={formSach.soLuongTon}
                    onChange={(e) => setFormSach({ ...formSach, soLuongTon: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">URL Hình ảnh bìa sách</label>
                <input
                  type="url"
                  className="form-input"
                  placeholder="https://..."
                  value={formSach.hinhAnh}
                  onChange={(e) => setFormSach({ ...formSach, hinhAnh: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả tóm tắt</label>
                <textarea
                  rows="3"
                  className="form-input"
                  value={formSach.moTa}
                  onChange={(e) => setFormSach({ ...formSach, moTa: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setModalSachMo(false)} className="btn btn-outline">
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  {sachDangSua ? 'Lưu Cập Nhật' : 'Thêm Vào Kho'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm Thể Loại */}
      {modalDanhMucMo && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-serif" style={{ fontSize: '1.2rem', fontWeight: 700 }}>
                Thêm Thể Loại Sách
              </h3>
              <button onClick={() => setModalDanhMucMo(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleThemDanhMuc}>
              <div className="form-group">
                <label className="form-label">Tên thể loại *</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Khoa học viễn tưởng"
                  className="form-input"
                  value={formDanhMuc.tenDanhMuc}
                  onChange={(e) => setFormDanhMuc({ ...formDanhMuc, tenDanhMuc: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả thể loại</label>
                <textarea
                  rows="2"
                  className="form-input"
                  value={formDanhMuc.moTa}
                  onChange={(e) => setFormDanhMuc({ ...formDanhMuc, moTa: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setModalDanhMucMo(false)} className="btn btn-outline">
                  Đóng
                </button>
                <button type="submit" className="btn btn-primary">
                  Tạo Thể Loại
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuanLySach;
