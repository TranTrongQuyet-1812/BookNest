import React, { useState, useEffect } from 'react';
import { BangXuong } from './KhungXuong.jsx';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useThongBao, ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';
import PhanTrang from '../../components/PhanTrang';
import TaiAnhBia from '../../components/TaiAnhBia';
import {
  Edit,
  X,
  Search,
  Trash2
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

  // Modal Quản Lý Thể Loại (Thêm / Sửa / Xóa)
  const [modalDanhMucMo, setModalDanhMucMo] = useState(false);
  const [danhMucDangSua, setDanhMucDangSua] = useState(null);
  const [formDanhMuc, setFormDanhMuc] = useState({ tenDanhMuc: '', moTa: '' });
  const [dangLuuDanhMuc, setDangLuuDanhMuc] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // Mở modal thêm tập mới cho bộ sách có sẵn (AT08, BA4)
  const moModalThemTap = async (sachGoc) => {
    let tapTiepTheo = Number(sachGoc.Tap || 1) + 1;
    try {
      const res = await api.get(`/books/${sachGoc.MaSach}/volumes`);
      const data = res.data?.data?.cacTap || res.data?.data || [];
      const cacTap = Array.isArray(data) ? data : [];
      if (cacTap.length > 0) {
        const tapLonNhat = Math.max(...cacTap.map(t => Number(t.tap || t.Tap || 0)));
        if (tapLonNhat > 0) {
          tapTiepTheo = tapLonNhat + 1;
        }
      }
    } catch (err) {
      console.warn('Không thể lấy danh sách tập, dùng gợi ý mặc định:', err);
    }

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

  // Mở modal quản lý thể loại
  const moModalQuanLyDanhMuc = () => {
    setDanhMucDangSua(null);
    setFormDanhMuc({ tenDanhMuc: '', moTa: '' });
    setModalDanhMucMo(true);
  };

  // Chọn thể loại để sửa
  const batDauSuaDanhMuc = (dm) => {
    setDanhMucDangSua(dm);
    setFormDanhMuc({
      tenDanhMuc: dm.TenDanhMuc || '',
      moTa: dm.MoTa || ''
    });
  };

  // Hủy chế độ sửa, quay về thêm mới
  const huySuaDanhMuc = () => {
    setDanhMucDangSua(null);
    setFormDanhMuc({ tenDanhMuc: '', moTa: '' });
  };

  // Thêm mới hoặc cập nhật danh mục
  const handleLuuDanhMuc = async (e) => {
    e.preventDefault();
    if (!coQuyenSuaSach) {
      tb.canhBao('Tài khoản của bạn không có quyền thao tác thể loại.');
      return;
    }
    setDangLuuDanhMuc(true);
    try {
      if (danhMucDangSua) {
        await api.put(`/categories/${danhMucDangSua.MaDanhMuc}`, formDanhMuc);
        tb.thanhCong(`Đã cập nhật thể loại "${formDanhMuc.tenDanhMuc}"`);
      } else {
        await api.post('/categories', formDanhMuc);
        tb.thanhCong(`Đã tạo thể loại "${formDanhMuc.tenDanhMuc}"`);
      }
      huySuaDanhMuc();
      taiLai();
    } catch (err) {
      tb.loiTuApi(err, danhMucDangSua ? 'Lỗi khi cập nhật thể loại' : 'Lỗi khi tạo thể loại');
    } finally {
      setDangLuuDanhMuc(false);
    }
  };

  // Xóa danh mục kèm hộp xác nhận và thông báo lỗi tiếng Việt nếu còn sách
  const handleXoaDanhMuc = async (dm) => {
    if (!coQuyenSuaSach) {
      tb.canhBao('Tài khoản của bạn không có quyền xóa thể loại.');
      return;
    }
    const dongY = await xacNhan({
      tieuDe: 'Xóa thể loại sách',
      noiDung: `Bạn có chắc chắn muốn xóa thể loại "${dm.TenDanhMuc}"? Thao tác này sẽ xóa vĩnh viễn thể loại khỏi hệ thống nếu không còn sách gắn kèm.`,
      nhanXacNhan: 'Xóa thể loại',
      nguyHiem: true
    });
    if (!dongY) return;

    try {
      await api.delete(`/categories/${dm.MaDanhMuc}`);
      tb.thanhCong(`Đã xóa thành công thể loại "${dm.TenDanhMuc}"`);
      if (danhMucDangSua?.MaDanhMuc === dm.MaDanhMuc) {
        huySuaDanhMuc();
      }
      taiLai();
    } catch (err) {
      tb.loiTuApi(err, 'Không thể xóa thể loại này');
    }
  };

  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);
  };

  return (
    <div>
      <div className="admindash-page-head">
        <div>
          <h1 className="admindash-page-title">
            {coQuyenSuaSach ? 'Quản lý sách & thể loại' : 'Tra cứu sách & tồn kho'}
          </h1>
          <p className="admindash-page-desc">
            {coQuyenSuaSach
              ? 'Quản trị danh mục ấn phẩm, cập nhật giá bán và kiểm soát trạng thái kinh doanh'
              : 'Tra cứu danh mục sách, theo dõi tồn kho và thông tin tác phẩm (Chế độ chỉ đọc)'}
          </p>
        </div>

        {coQuyenSuaSach && (
          <div className="flex gap-2">
            <button onClick={moModalQuanLyDanhMuc} className="btn btn-outline btn-sm">
              Quản lý thể loại
            </button>
            <button onClick={moModalThemSach} className="btn btn-primary btn-sm">
              Thêm sách mới
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
        <BangXuong
          tieuDe={['Mã', 'Tác phẩm & tác giả', 'Thể loại', 'Giá bán', 'Tồn kho', 'Trạng thái', 'Thao tác']}
          canPhai={[6]}
          nhan="Đang tải danh sách sách"
        />
      ) : (
        <div className="admindash-table-wrap">
          <table className="admindash-table">
            <thead>
              <tr>
                <th style={{ width: '70px' }}>Mã</th>
                <th>Tác phẩm & tác giả</th>
                <th>Thể loại</th>
                <th>Giá bán</th>
                <th>Tồn kho</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
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
                                Thêm tập
                              </button>
                            )}
                            <button
                              onClick={() => moModalSuaSach(sach)}
                              className="btn btn-outline btn-sm"
                              title="Chỉnh sửa thông tin"
                            >
                              Sửa
                            </button>
                            <button
                              onClick={() => handleToggleAnSach(sach)}
                              className="btn btn-outline btn-sm"
                              style={{ color: an ? 'var(--adm-success)' : 'var(--adm-danger)', borderColor: an ? 'var(--adm-success-subtle)' : 'var(--adm-danger-subtle)' }}
                              title={an ? 'Khôi phục hiển thị' : 'Ẩn sách khỏi khách hàng'}
                            >
                              {an ? 'Hiện' : 'Ẩn'}
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => moModalSuaSach(sach)}
                            className="btn btn-outline btn-sm"
                            title="Xem chi tiết cuốn sách"
                          >
                            Xem
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
                  ? (sachDangSua ? 'Chỉnh sửa sách' : 'Thêm tác phẩm mới')
                  : 'Chi tiết tác phẩm (chỉ đọc)'}
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
                          ? 'Lưu cập nhật'
                          : 'Thêm vào kho'}
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

      {/* Modal Quản Lý Thể Loại (Thêm, Sửa, Xóa) */}
      {modalDanhMucMo && (
        <div className="modal-overlay" style={{ zIndex: 1050 }}>
          <div className="modal-content" style={{ maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="flex justify-between items-center pb-3 mb-4 border-b">
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--adm-text-main)' }}>
                  Quản lý thể loại sách
                </h3>
                <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.8rem', marginTop: '0.2rem', marginBottom: 0 }}>
                  Thêm mới, đổi tên, cập nhật mô tả hoặc xóa các danh mục thể loại
                </p>
              </div>
              <button
                type="button"
                onClick={() => { setModalDanhMucMo(false); huySuaDanhMuc(); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--adm-text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Thêm Mới / Chỉnh Sửa */}
            <div style={{ background: 'var(--adm-bg-surface, var(--adm-surface-2))', padding: '1rem', borderRadius: '8px', border: '1px solid var(--adm-border, var(--adm-border))', marginBottom: '1.25rem' }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.65rem', color: 'var(--adm-text-main)' }}>
                {danhMucDangSua ? `Chỉnh sửa thể loại #${danhMucDangSua.MaDanhMuc}` : 'Thêm thể loại mới'}
              </div>
              <form onSubmit={handleLuuDanhMuc}>
                <div className="form-group mb-2.5">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Tên thể loại *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Khoa học viễn tưởng"
                    className="form-input w-full"
                    value={formDanhMuc.tenDanhMuc}
                    onChange={(e) => setFormDanhMuc({ ...formDanhMuc, tenDanhMuc: e.target.value })}
                  />
                </div>

                <div className="form-group mb-3">
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Mô tả thể loại</label>
                  <textarea
                    rows="2"
                    placeholder="Mô tả tóm lược về nhóm sách này..."
                    className="form-input w-full"
                    value={formDanhMuc.moTa}
                    onChange={(e) => setFormDanhMuc({ ...formDanhMuc, moTa: e.target.value })}
                  />
                </div>

                <div className="flex justify-end items-center gap-2">
                  {danhMucDangSua && (
                    <button
                      type="button"
                      onClick={huySuaDanhMuc}
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: '0.8rem' }}
                    >
                      Hủy sửa
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={dangLuuDanhMuc}
                    className="btn btn-primary btn-sm"
                    style={{ fontSize: '0.8rem' }}
                  >
                    {danhMucDangSua ? 'Lưu thay đổi' : 'Tạo thể loại'}
                  </button>
                </div>
              </form>
            </div>

            {/* Danh Sách Thể Loại Hiện Có */}
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--adm-text-main)' }}>
                Danh sách thể loại ({danhMucList.length})
              </div>
              {danhMucList.length === 0 ? (
                <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.85rem' }}>Chưa có thể loại nào.</p>
              ) : (
                <div style={{ border: '1px solid var(--adm-border, var(--adm-border))', borderRadius: '6px', overflow: 'hidden' }}>
                  <table className="admindash-table" style={{ margin: 0, fontSize: '0.825rem' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '45px' }}>ID</th>
                        <th>Tên thể loại</th>
                        <th>Mô tả</th>
                        <th style={{ textAlign: 'center', width: '80px' }}>Số sách</th>
                        <th style={{ textAlign: 'right', width: '90px' }}>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {danhMucList.map((dm) => (
                        <tr key={dm.MaDanhMuc} style={{ background: danhMucDangSua?.MaDanhMuc === dm.MaDanhMuc ? 'var(--adm-info-subtle)' : 'transparent' }}>
                          <td style={{ color: 'var(--adm-text-muted)' }} className="tabular-nums">#{dm.MaDanhMuc}</td>
                          <td style={{ fontWeight: 600, color: 'var(--adm-text-main)' }}>{dm.TenDanhMuc}</td>
                          <td style={{ color: 'var(--adm-text-muted)', maxWidth: '200px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {dm.MoTa || '—'}
                          </td>
                          <td style={{ textAlign: 'center', fontWeight: 600 }} className="tabular-nums">
                            {dm.soLuongSach || 0}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="inline-flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => batDauSuaDanhMuc(dm)}
                                className="btn btn-outline btn-sm"
                                style={{ padding: '0.2rem 0.45rem', color: 'var(--adm-primary)' }}
                                title="Sửa tên và mô tả thể loại"
                              >
                                <Edit size={12} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleXoaDanhMuc(dm)}
                                className="btn btn-outline btn-sm"
                                style={{ padding: '0.2rem 0.45rem', color: 'var(--adm-danger)', borderColor: 'var(--adm-danger-subtle)' }}
                                title="Xóa thể loại (chặn nếu còn sách)"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 mt-4 border-t">
              <button
                type="button"
                onClick={() => { setModalDanhMucMo(false); huySuaDanhMuc(); }}
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

export default QuanLySach;
