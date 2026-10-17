import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useThongBao, ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';
import PhanTrang from '../../components/PhanTrang';
import TaiAnhBia from '../../components/TaiAnhBia';
import { 
  Plus, 
  Edit, 
  Eye, 
  EyeOff, 
  FolderPlus, 
  X, 
  Search 
} from 'lucide-react';

export const QuanLySach = () => {
  const { user } = useAuth();
  const { thongBao: tb, xacNhan } = useThongBao();
  const vaiTro = user?.role;
  // Chỉ Quản trị viên và Thủ kho mới được quyền thêm, sửa, đổi giá và ẩn sách
  const coQuyenSuaSach = ['quan_tri', 'thu_kho'].includes(vaiTro);

  const [searchParams, setSearchParams] = useSearchParams();
  const trang = parseInt(searchParams.get('page') || '1', 10);
  const tuKhoaDaLoc = searchParams.get('search') || '';
  const [timKiem, setTimKiem] = useState(tuKhoaDaLoc);

  // Đồng bộ ô input tìm kiếm khi URL thay đổi (Back/Forward)
  useEffect(() => {
    setTimKiem(tuKhoaDaLoc);
  }, [tuKhoaDaLoc]);

  const sachListState = useState([]);
  const sachList = sachListState[0];
  const setSachList = sachListState[1];
  const [danhMucList, setDanhMucList] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [phanTrang, setPhanTrang] = useState(null);
  // Tăng số này để tải lại dữ liệu sau khi thêm, sửa, ẩn sách hoặc thêm thể loại
  const [lanTai, setLanTai] = useState(0);
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
    hinhAnh: '',
    tenBo: '',
    tap: ''
  });

  // Modal Danh Mục
  const [modalDanhMucMo, setModalDanhMucMo] = useState(false);
  const [formDanhMuc, setFormDanhMuc] = useState({ tenDanhMuc: '', moTa: '' });

  // Danh sách gợi ý tác giả có sẵn (AT13)
  const [goiYTacGia, setGoiYTacGia] = useState([]);

  // Danh sách gợi ý tên bộ sách có sẵn (AT08)
  const [goiYTenBo, setGoiYTenBo] = useState([]);

  // Quản lý tải ảnh bìa WebP (AT07)
  const [fileAnhMoi, setFileAnhMoi] = useState(null);
  const [dangTaiAnh, setDangTaiAnh] = useState(false);

  // Tải danh sách tác giả gợi ý theo từ khóa người dùng đang gõ (debounce 250ms)
  useEffect(() => {
    if (!modalSachMo) {
      setGoiYTacGia([]);
      return;
    }
    const tuKhoa = (formSach.tacGia || '').trim();
    if (tuKhoa.length < 2) {
      setGoiYTacGia([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/books/authors', { params: { search: tuKhoa, limit: 15 } });
        if (res.data?.data) {
          setGoiYTacGia(res.data.data);
        }
      } catch {
        // Lỗi gợi ý không làm gián đoạn nhập liệu
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [formSach.tacGia, modalSachMo]);

  // Tải danh sách tên bộ sách gợi ý (debounce 250ms) (AT08)
  useEffect(() => {
    if (!modalSachMo) {
      setGoiYTenBo([]);
      return;
    }
    const tuKhoa = (formSach.tenBo || '').trim();
    if (tuKhoa.length < 2) {
      setGoiYTenBo([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await api.get('/books/series', { params: { search: tuKhoa, limit: 15 } });
        if (res.data?.data) {
          setGoiYTenBo(res.data.data);
        }
      } catch {
        // Lỗi gợi ý không làm gián đoạn nhập liệu
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [formSach.tenBo, modalSachMo]);

  const taiLai = () => setLanTai((n) => n + 1);

  // Tải một trang sách từ server (tìm kiếm và phân trang do backend xử lý)
  useEffect(() => {
    let daHuy = false;
    const nap = async () => {
      try {
        const params = { page: trang, limit: 20 };
        if (tuKhoaDaLoc) params.search = tuKhoaDaLoc;

        const res = await api.get('/admin/books', { params });
        if (daHuy) return;
        setSachList(res.data.data.danhSach);
        setPhanTrang(res.data.data.phanTrang);
      } catch (err) {
        if (!daHuy) setLoi(loiTuApi(err, 'Không thể tải dữ liệu sách'));
      } finally {
        if (!daHuy) setDangTai(false);
      }
    };
    nap();
    return () => {
      daHuy = true;
    };
  }, [trang, tuKhoaDaLoc, lanTai]);

  // Tải danh sách thể loại (dùng cho ô chọn thể loại khi thêm/sửa sách)
  useEffect(() => {
    let daHuy = false;
    const nap = async () => {
      try {
        const res = await api.get('/categories');
        if (!daHuy) setDanhMucList(res.data.data);
      } catch (err) {
        if (!daHuy) setLoi(loiTuApi(err, 'Không thể tải danh sách thể loại'));
      }
    };
    nap();
    return () => {
      daHuy = true;
    };
  }, [lanTai]);

  const handleTimKiem = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (timKiem.trim()) {
      params.set('search', timKiem.trim());
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleChuyenTrang = (trangMoi) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', trangMoi);
    setSearchParams(params);
  };

  // Mở modal thêm sách mới
  const moModalThemSach = () => {
    const defaultDm = danhMucList[0]?.MaDanhMuc ?? '';
    setSachDangSua(null);
    setFileAnhMoi(null);
    setFormSach({
      tieuDe: '',
      tacGia: '',
      maDanhMuc: defaultDm,
      gia: '',
      soLuongTon: 0,
      moTa: '',
      hinhAnh: '',
      tenBo: '',
      tap: ''
    });
    setModalSachMo(true);
  };

  // Mở modal sửa sách
  const moModalSuaSach = (sach) => {
    setSachDangSua(sach);
    setFileAnhMoi(null);
    setFormSach({
      tieuDe: sach.TenSach ?? '',
      tacGia: sach.TacGia ?? '',
      maDanhMuc: sach.MaDanhMuc ?? '',
      gia: sach.GiaBan ?? '',
      soLuongTon: sach.SoLuongTon ?? 0,
      moTa: sach.MoTa ?? '',
      hinhAnh: sach.AnhBia ?? '',
      tenBo: sach.TenBo ?? '',
      tap: sach.Tap != null ? String(sach.Tap) : ''
    });
    setModalSachMo(true);
  };

  // Mở modal thêm tập mới cho bộ sách có sẵn (AT08)
  const moModalThemTap = (sachGoc) => {
    const tapHienTai = Number(sachGoc.Tap || 1);
    const tapTiepTheo = tapHienTai + 1;
    setSachDangSua(null);
    setFileAnhMoi(null);
    setFormSach({
      tieuDe: `${sachGoc.TenBo} - Tập ${tapTiepTheo}`,
      tacGia: sachGoc.TacGia ?? '',
      maDanhMuc: sachGoc.MaDanhMuc ?? '',
      gia: sachGoc.GiaBan ?? '',
      soLuongTon: 0,
      moTa: sachGoc.MoTa ?? '',
      hinhAnh: '',
      tenBo: sachGoc.TenBo ?? '',
      tap: String(tapTiepTheo)
    });
    setModalSachMo(true);
  };

  // Lưu sách (Tạo mới hoặc Sửa)
  const handleLuuSach = async (e) => {
    e.preventDefault();
    if (!coQuyenSuaSach) {
      tb.canhBao('Tài khoản của bạn chỉ có quyền tra cứu, không được sửa hoặc thêm sách.');
      return;
    }

    // Kiểm tra tính hợp lệ của tập và bộ sách (AT03, AT08)
    const tenBoNhap = formSach.tenBo?.trim() || null;
    const tapNhap = formSach.tap ? Number(formSach.tap) : null;
    if (tapNhap && !tenBoNhap) {
      tb.canhBao('Sách có số tập thì phải có tên bộ');
      return;
    }

    let urlAnhVuaTai = null;

    try {
      // 1. Tải ảnh bìa mới lên Cloudinary nếu người dùng đã chọn file mới (AT04, AT07)
      if (fileAnhMoi) {
        setDangTaiAnh(true);
        try {
          const resAnh = await api.post('/books/cover', fileAnhMoi, {
            headers: { 'Content-Type': fileAnhMoi.type }
          });
          urlAnhVuaTai = resAnh.data?.data?.url;
        } catch (errAnh) {
          setDangTaiAnh(false);
          tb.loiTuApi(errAnh, 'Không thể tải ảnh bìa lên hệ thống');
          return;
        }
      }

      const urlAnhCuoi = urlAnhVuaTai || formSach.hinhAnh || null;

      const payload = {
        tenSach: formSach.tieuDe,
        tacGia: formSach.tacGia,
        maDanhMuc: Number(formSach.maDanhMuc),
        giaBan: Number(formSach.gia),
        soLuongTon: Number(formSach.soLuongTon || 0),
        moTa: formSach.moTa || undefined,
        anhBia: urlAnhCuoi || undefined,
        tenBo: tenBoNhap,
        tap: tapNhap
      };

      const maSach = sachDangSua ? sachDangSua.MaSach : null;
      let res;
      if (sachDangSua) {
        res = await api.put(`/books/${maSach}`, payload);
        tb.thanhCong(`Đã cập nhật cuốn sách "${formSach.tieuDe}"`);
      } else {
        res = await api.post('/books', payload);
        tb.thanhCong(`Đã thêm mới cuốn sách "${formSach.tieuDe}" vào kho`);
      }

      if (res?.data?.data?.thongBaoTacGia) {
        tb.thongTin(res.data.data.thongBaoTacGia);
      }

      setFileAnhMoi(null);
      setModalSachMo(false);
      taiLai();
    } catch (err) {
      // Nếu vừa tải ảnh mới thành công nhưng việc lưu sách thất bại -> dọn sạch ảnh mồ côi (AT05, AT07)
      if (urlAnhVuaTai) {
        api.delete('/books/cover', { data: { url: urlAnhVuaTai } }).catch(() => {});
      }
      tb.loiTuApi(err, 'Lỗi khi lưu sách');
    } finally {
      setDangTaiAnh(false);
    }
  };

  // Ẩn hoặc Khôi phục sách (Soft delete toggle)
  const handleToggleAnSach = async (sach) => {
    if (!coQuyenSuaSach) {
      tb.canhBao('Tài khoản của bạn không có quyền ẩn hoặc khôi phục sách.');
      return;
    }
    const maSach = sach.MaSach;
    const tenSach = sach.TenSach;
    const daAn = sach.DaAn;
    const hanhDong = daAn ? 'khôi phục' : 'ẩn';

    const dongY = await xacNhan({
      tieuDe: `Xác nhận ${hanhDong} sách`,
      noiDung: `Bạn có chắc muốn ${hanhDong} cuốn sách "${tenSach}"?`,
      nhanXacNhan: daAn ? 'Khôi phục sách' : 'Ẩn cuốn sách này',
      nguyHiem: !daAn,
    });
    if (!dongY) return;

    try {
      await api.delete(`/books/${maSach}`);
      tb.thanhCong(`Đã ${hanhDong} thành công cuốn sách "${tenSach}"`);
      taiLai();
    } catch (err) {
      tb.loiTuApi(err, 'Lỗi khi thay đổi trạng thái sách');
    }
  };

  // Thêm danh mục mới
  const handleThemDanhMuc = async (e) => {
    e.preventDefault();
    if (!coQuyenSuaSach) {
      tb.canhBao('Tài khoản của bạn không có quyền tạo thể loại mới.');
      return;
    }
    try {
      await api.post('/categories', formDanhMuc);
      tb.thanhCong(`Đã tạo thể loại "${formDanhMuc.tenDanhMuc}"`);
      setFormDanhMuc({ tenDanhMuc: '', moTa: '' });
      setModalDanhMucMo(false);
      taiLai();
    } catch (err) {
      tb.loiTuApi(err, 'Lỗi khi tạo thể loại');
    }
  };

  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 style={{ fontSize: '1.45rem', fontWeight: 700, letterSpacing: '-0.02em', margin: 0 }}>
            {coQuyenSuaSach ? 'Quản Lý Sách & Thể Loại' : 'Tra Cứu Sách & Tồn Kho'}
          </h1>
          <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            {coQuyenSuaSach
              ? 'Quản trị danh mục ấn phẩm, cập nhật giá bán và kiểm soát trạng thái kinh doanh'
              : 'Tra cứu danh mục sách, theo dõi tồn kho và thông tin tác phẩm (Chế độ chỉ đọc)'}
          </p>
        </div>

        {coQuyenSuaSach && (
          <div className="flex gap-2">
            <button onClick={() => setModalDanhMucMo(true)} className="btn btn-outline btn-sm">
              <FolderPlus size={15} /> Thêm Thể Loại
            </button>
            <button onClick={moModalThemSach} className="btn btn-primary btn-sm">
              <Plus size={15} /> Thêm Sách Mới
            </button>
          </div>
        )}
      </div>

      {loi && (
        <ThongBaoTaiCho loai="loi" onDong={() => setLoi('')}>
          {loi}
        </ThongBaoTaiCho>
      )}

      {/* Ô tìm kiếm nhanh */}
      <form onSubmit={handleTimKiem} className="card mb-6 flex gap-2" style={{ padding: '0.65rem 0.85rem' }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <input
            type="text"
            className="form-input"
            style={{ paddingLeft: '2.25rem', fontSize: '0.875rem' }}
            placeholder="Tìm sách theo tựa đề hoặc tác giả..."
            value={timKiem}
            onChange={(e) => setTimKiem(e.target.value)}
          />
          <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted)' }} />
        </div>
        <button type="submit" className="btn btn-primary btn-sm">Tìm</button>
      </form>

      {/* Bảng Danh Sách Sách */}
      {dangTai ? (
        <div className="flex justify-center py-12">
          <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.875rem' }}>Đang nạp dữ liệu sách...</p>
        </div>
      ) : (
        <div className="admindash-table-wrap">
          <table className="admindash-table">
            <thead>
              <tr>
                <th style={{ width: '70px' }}>Mã</th>
                <th>Tác Phẩm & Tác Giả</th>
                <th>Thể Loại</th>
                <th>Giá Bán</th>
                <th>Tồn Kho</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {sachList.map((sach) => {
                const ma = sach.MaSach;
                const ten = sach.TenSach;
                const tg = sach.TacGia;
                const dm = sach.danhMuc?.TenDanhMuc ?? 'Chưa phân loại';
                const gia = sach.GiaBan;
                const ton = sach.SoLuongTon ?? 0;
                const an = sach.DaAn;

                return (
                  <tr key={ma}>
                    <td style={{ fontWeight: 600, color: 'var(--adm-text-muted)' }} className="tabular-nums">#{ma}</td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--adm-text-main)' }}>{ten}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>
                          Tác giả: {tg}
                        </span>
                        {sach.TenBo && (
                          <span
                            className="badge badge-role"
                            style={{ fontSize: '0.7rem', padding: '1px 6px', fontWeight: 600 }}
                            title={`Thuộc bộ sách: ${sach.TenBo}`}
                          >
                            Bộ: {sach.TenBo}
                          </span>
                        )}
                        {sach.Tap != null && (
                          <span
                            className="badge badge-delivered"
                            style={{ fontSize: '0.7rem', padding: '1px 6px', fontWeight: 600 }}
                          >
                            Tập {sach.Tap}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-role" style={{ fontSize: '0.72rem' }}>
                        {dm}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: 'var(--adm-primary)' }} className="tabular-nums">
                      {dinhDangTien(gia)}
                    </td>
                    <td className="tabular-nums">
                      <span style={{
                        fontWeight: 600,
                        color: ton <= 5 ? 'var(--adm-danger)' : 'var(--adm-text-main)'
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
                      <div className="inline-flex gap-2" style={{ flexWrap: 'nowrap', justifyContent: 'flex-end' }}>
                        {coQuyenSuaSach ? (
                          <>
                            {sach.TenBo && (
                              <button
                                onClick={() => moModalThemTap(sach)}
                                className="btn btn-outline btn-sm"
                                style={{
                                  borderColor: 'var(--adm-primary)',
                                  color: 'var(--adm-primary)',
                                  padding: '0.25rem 0.5rem',
                                  fontSize: '0.78rem'
                                }}
                                title={`Thêm tập tiếp theo cho bộ "${sach.TenBo}"`}
                              >
                                <Plus size={13} /> Thêm tập
                              </button>
                            )}
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
                              style={{ color: an ? 'var(--adm-success)' : 'var(--adm-danger)', borderColor: an ? '#A7F3D0' : '#FECACA' }}
                              title={an ? 'Khôi phục hiển thị' : 'Ẩn sách khỏi khách hàng'}
                            >
                              {an ? <Eye size={14} /> : <EyeOff size={14} />}
                              {an ? 'Hiện' : 'Ẩn'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => moModalSuaSach(sach)}
                            className="btn btn-outline btn-sm"
                            title="Xem chi tiết cuốn sách"
                          >
                            <Eye size={14} /> Xem
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

      <PhanTrang phanTrang={phanTrang} onChuyenTrang={handleChuyenTrang} donVi="cuốn" />

      {/* Modal Thêm/Sửa/Xem Sách */}
      {modalSachMo && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '600px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--adm-text-main)' }}>
                {coQuyenSuaSach
                  ? (sachDangSua ? 'Chỉnh Sửa Sách' : 'Thêm Tác Phẩm Mới')
                  : 'Chi Tiết Tác Phẩm (Chỉ Đọc)'}
              </h3>
              <button onClick={() => setModalSachMo(false)} style={{ color: 'var(--adm-text-muted)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleLuuSach}>
              <div className="form-group">
                <label className="form-label">Tựa đề sách *</label>
                <input
                  type="text"
                  required
                  disabled={!coQuyenSuaSach}
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
                    disabled={!coQuyenSuaSach}
                    className="form-input"
                    value={formSach.tacGia}
                    onChange={(e) => setFormSach({ ...formSach, tacGia: e.target.value })}
                    list="goi-y-tac-gia-list"
                    autoComplete="off"
                  />
                  <datalist id="goi-y-tac-gia-list">
                    {goiYTacGia.map((tg) => (
                      <option key={tg} value={tg} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label className="form-label">Thể loại *</label>
                  <select
                    required
                    disabled={!coQuyenSuaSach}
                    className="form-input"
                    value={formSach.maDanhMuc}
                    onChange={(e) => setFormSach({ ...formSach, maDanhMuc: e.target.value })}
                  >
                    <option value="">-- Chọn thể loại --</option>
                    {danhMucList.map((dm) => {
                      const idDm = dm.MaDanhMuc;
                      const tenDm = dm.TenDanhMuc;
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
                  <label className="form-label">Tên bộ sách (nếu có)</label>
                  <input
                    type="text"
                    disabled={!coQuyenSuaSach}
                    className="form-input"
                    placeholder="Để trống nếu là sách lẻ"
                    value={formSach.tenBo}
                    onChange={(e) => setFormSach({ ...formSach, tenBo: e.target.value })}
                    list="goi-y-ten-bo-list"
                    autoComplete="off"
                  />
                  <datalist id="goi-y-ten-bo-list">
                    {goiYTenBo.map((tbItem) => (
                      <option key={tbItem} value={tbItem} />
                    ))}
                  </datalist>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    Số tập {formSach.tenBo?.trim() ? '*' : ''}
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    disabled={!coQuyenSuaSach || !formSach.tenBo?.trim()}
                    className="form-input"
                    placeholder={formSach.tenBo?.trim() ? 'Ví dụ: 1, 2...' : 'Nhập tên bộ trước'}
                    value={formSach.tap}
                    onChange={(e) => setFormSach({ ...formSach, tap: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Giá bán (VND) *</label>
                  <input
                    type="number"
                    min="1000"
                    required
                    disabled={!coQuyenSuaSach}
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
                    disabled={!coQuyenSuaSach}
                    className="form-input"
                    value={formSach.soLuongTon}
                    onChange={(e) => setFormSach({ ...formSach, soLuongTon: e.target.value })}
                  />
                </div>
              </div>

              {/* Chọn và xem trước ảnh bìa sách (AT07) */}
              <TaiAnhBia
                anhHienTai={formSach.hinhAnh}
                fileMoi={fileAnhMoi}
                onThayDoiFile={(file) => {
                  setFileAnhMoi(file);
                  if (!file) {
                    setFormSach((cu) => ({ ...cu, hinhAnh: '' }));
                  }
                }}
                disabled={!coQuyenSuaSach || dangTaiAnh}
              />

              <div className="form-group">
                <label className="form-label">Mô tả tóm tắt</label>
                <textarea
                  rows="3"
                  disabled={!coQuyenSuaSach || dangTaiAnh}
                  className="form-input"
                  value={formSach.moTa}
                  onChange={(e) => setFormSach({ ...formSach, moTa: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                {coQuyenSuaSach ? (
                  <>
                    <button
                      type="button"
                      disabled={dangTaiAnh}
                      onClick={() => setModalSachMo(false)}
                      className="btn btn-outline"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      disabled={dangTaiAnh}
                      className="btn btn-primary"
                    >
                      {dangTaiAnh
                        ? 'Đang tải ảnh...'
                        : sachDangSua
                          ? 'Lưu Cập Nhật'
                          : 'Thêm Vào Kho'}
                    </button>
                  </>
                ) : (
                  <button type="button" onClick={() => setModalSachMo(false)} className="btn btn-outline">
                    Đóng
                  </button>
                )}
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
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--adm-text-main)' }}>
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
