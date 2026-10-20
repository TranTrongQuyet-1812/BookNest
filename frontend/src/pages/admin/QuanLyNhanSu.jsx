import React, { useState, useEffect } from 'react';
import { BangXuong } from './KhungXuong.jsx';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useThongBao, ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';
import PhanTrang from '../../components/PhanTrang';
import {
  Lock,
  Unlock,
  Search,
  X,
  KeyRound
} from 'lucide-react';

export const QuanLyNhanSu = () => {
  const { user: adminHienTai } = useAuth();
  const { thongBao: tb, xacNhan } = useThongBao();

  const [searchParams, setSearchParams] = useSearchParams();
  const trang = parseInt(searchParams.get('page') || '1', 10);
  const vaiTroLoc = searchParams.get('role') || '';
  const tuKhoaDaLoc = searchParams.get('search') || '';

  const laQuanTri = adminHienTai?.role === 'quan_tri';
  const laThuThu = adminHienTai?.role === 'thu_thu';

  const [nguoiDungList, setNguoiDungList] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [timKiem, setTimKiem] = useState(tuKhoaDaLoc);
  const [phanTrang, setPhanTrang] = useState(null);
  const [loi, setLoi] = useState('');
  const [lanTai, setLanTai] = useState(0);

  // Đồng bộ ô input tìm kiếm khi URL thay đổi (Back/Forward)
  useEffect(() => {
    setTimKiem(tuKhoaDaLoc);
  }, [tuKhoaDaLoc]);

  // Modal tạo nhân sự mới
  const [modalMo, setModalMo] = useState(false);
  const [formNhanSu, setFormNhanSu] = useState({
    hoTen: '',
    email: '',
    matKhau: '',
    vaiTro: 'thu_thu',
    soDienThoai: ''
  });
  const [dangTao, setDangTao] = useState(false);

  // Modal sửa thông tin nhân viên
  const [modalSuaNhanVienMo, setModalSuaNhanVienMo] = useState(false);
  const [nhanVienDangSua, setNhanVienDangSua] = useState(null);
  const [formSuaNhanVien, setFormSuaNhanVien] = useState({ hoTen: '', soDienThoai: '', vaiTro: 'thu_thu' });
  const [dangSuaNhanVien, setDangSuaNhanVien] = useState(false);

  // Modal đặt lại mật khẩu nhân viên
  const [modalDoiMatKhauNhanVienMo, setModalDoiMatKhauNhanVienMo] = useState(false);
  const [nhanVienDoiMatKhau, setNhanVienDoiMatKhau] = useState(null);
  const [matKhauMoiNhanVien, setMatKhauMoiNhanVien] = useState('');
  const [dangDoiMatKhauNhanVien, setDangDoiMatKhauNhanVien] = useState(false);

  // Modal chi tiết khách hàng và 5 đơn hàng gần nhất
  const [modalChiTietKhachMo, setModalChiTietKhachMo] = useState(false);
  const [khachHangChiTiet, setKhachHangChiTiet] = useState(null);
  const [dangTaiChiTietKhach, setDangTaiChiTietKhach] = useState(false);

  // Modal sửa thông tin khách hàng
  const [modalSuaKhachMo, setModalSuaKhachMo] = useState(false);
  const [khachHangDangSua, setKhachHangDangSua] = useState(null);
  const [formSuaKhach, setFormSuaKhach] = useState({ hoTen: '', soDienThoai: '', diaChiMacDinh: '' });
  const [dangSuaKhach, setDangSuaKhach] = useState(false);

  // Khách hàng nằm ở danh sách riêng, nhân viên lọc theo vai trò
  const laKhach = vaiTroLoc === 'khach_hang' || (!laQuanTri && laThuThu);
  const duongDanDanhSach = laKhach ? '/admin/customers' : '/admin/staff';

  const taiLai = () => setLanTai((n) => n + 1);

  useEffect(() => {
    let daHuy = false;
    const nap = async () => {
      setDangTai(true);
      try {
        const params = { page: trang, limit: 20 };
        if (vaiTroLoc && !laKhach) params.role = vaiTroLoc;
        if (tuKhoaDaLoc) params.search = tuKhoaDaLoc;

        const res = await api.get(duongDanDanhSach, { params });
        if (daHuy) return;
        const ds = res.data.data.danhSach;
        setNguoiDungList(Array.isArray(ds) ? ds : []);
        setPhanTrang(res.data.data.phanTrang);
      } catch (err) {
        if (!daHuy) setLoi(loiTuApi(err, 'Không thể tải danh sách tài khoản'));
      } finally {
        if (!daHuy) setDangTai(false);
      }
    };
    nap();
    return () => {
      daHuy = true;
    };
  }, [vaiTroLoc, trang, laKhach, duongDanDanhSach, tuKhoaDaLoc, lanTai]);

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

  const handleLocVaiTro = (role) => {
    const params = new URLSearchParams(searchParams);
    if (role) {
      params.set('role', role);
    } else {
      params.delete('role');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleChuyenTrang = (trangMoi) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(trangMoi));
    setSearchParams(params);
  };

  // Khóa hoặc mở khóa tài khoản
  const handleToggleKhoa = async (u) => {
    const userId = laKhach ? u.MaKhachHang : u.MaNhanVien;
    const myId = adminHienTai?.id;
    if (!laKhach && userId === myId) {
      tb.canhBao('Bạn không thể tự khóa tài khoản quản trị của chính mình!');
      return;
    }

    const dangHoatDong = u.DangHoatDong;
    const email = u.Email;
    const hanhDong = dangHoatDong ? 'khóa' : 'mở khóa';

    const dongY = await xacNhan({
      tieuDe: `Xác nhận ${hanhDong} tài khoản`,
      noiDung: `Bạn có chắc muốn ${hanhDong} tài khoản "${email}"?`,
      nhanXacNhan: dangHoatDong ? 'Khóa tài khoản' : 'Mở khóa tài khoản',
      nguyHiem: dangHoatDong,
    });
    if (!dongY) return;

    try {
      const trangThaiMoi = !dangHoatDong;
      await api.put(`${duongDanDanhSach}/${userId}/status`, { dangHoatDong: trangThaiMoi });
      tb.thanhCong(`Đã ${hanhDong} tài khoản ${email} thành công`);
      taiLai();
    } catch (err) {
      tb.loiTuApi(err, 'Lỗi khi cập nhật trạng thái người dùng');
    }
  };

  // Tạo tài khoản nhân sự mới
  const handleTaoNhanSu = async (e) => {
    e.preventDefault();
    setDangTao(true);
    try {
      await api.post('/admin/staff', {
        hoTen: formNhanSu.hoTen.trim(),
        email: formNhanSu.email.trim(),
        matKhau: formNhanSu.matKhau,
        vaiTro: formNhanSu.vaiTro,
        soDienThoai: formNhanSu.soDienThoai.trim() || undefined
      });
      tb.thanhCong(`Đã khởi tạo tài khoản nhân sự thành công: ${formNhanSu.email}`);
      setModalMo(false);
      setFormNhanSu({
        hoTen: '',
        email: '',
        matKhau: '',
        vaiTro: 'thu_thu',
        soDienThoai: ''
      });
      taiLai();
    } catch (err) {
      tb.loiTuApi(err, 'Lỗi khi tạo tài khoản nhân sự');
    } finally {
      setDangTao(false);
    }
  };

  // Mở modal sửa nhân viên
  const handleMoModalSuaNhanVien = (u) => {
    setNhanVienDangSua(u);
    setFormSuaNhanVien({
      hoTen: u.HoTen || '',
      soDienThoai: u.SoDienThoai || '',
      vaiTro: u.VaiTro || 'thu_thu'
    });
    setModalSuaNhanVienMo(true);
  };

  // Lưu sửa nhân viên
  const handleLuuSuaNhanVien = async (e) => {
    e.preventDefault();
    if (!nhanVienDangSua) return;
    setDangSuaNhanVien(true);
    try {
      await api.put(`/admin/staff/${nhanVienDangSua.MaNhanVien}`, {
        hoTen: formSuaNhanVien.hoTen.trim(),
        soDienThoai: formSuaNhanVien.soDienThoai.trim() || null,
        vaiTro: formSuaNhanVien.vaiTro
      });
      tb.thanhCong(`Đã cập nhật thông tin nhân viên ${nhanVienDangSua.Email} thành công`);
      setModalSuaNhanVienMo(false);
      taiLai();
    } catch (err) {
      tb.loiTuApi(err, 'Lỗi khi cập nhật thông tin nhân viên');
    } finally {
      setDangSuaNhanVien(false);
    }
  };

  // Mở modal đổi mật khẩu nhân viên
  const handleMoModalDoiMatKhau = (u) => {
    setNhanVienDoiMatKhau(u);
    setMatKhauMoiNhanVien('');
    setModalDoiMatKhauNhanVienMo(true);
  };

  // Lưu đổi mật khẩu nhân viên
  const handleLuuDoiMatKhauNhanVien = async (e) => {
    e.preventDefault();
    if (!nhanVienDoiMatKhau) return;
    if (matKhauMoiNhanVien.length < 8 || !/^(?=.*[A-Za-z])(?=.*\d)/.test(matKhauMoiNhanVien)) {
      tb.canhBao('Mật khẩu mới phải có ít nhất 8 ký tự và gồm cả chữ cái và chữ số');
      return;
    }
    setDangDoiMatKhauNhanVien(true);
    try {
      await api.put(`/admin/staff/${nhanVienDoiMatKhau.MaNhanVien}/password`, {
        matKhauMoi: matKhauMoiNhanVien
      });
      tb.thanhCong(`Đã đặt lại mật khẩu thành công cho ${nhanVienDoiMatKhau.Email}`);
      setModalDoiMatKhauNhanVienMo(false);
    } catch (err) {
      tb.loiTuApi(err, 'Lỗi khi đặt lại mật khẩu');
    } finally {
      setDangDoiMatKhauNhanVien(false);
    }
  };

  // Mở modal xem chi tiết khách hàng
  const handleXemChiTietKhach = async (u) => {
    setModalChiTietKhachMo(true);
    setDangTaiChiTietKhach(true);
    setKhachHangChiTiet(null);
    try {
      const res = await api.get(`/admin/customers/${u.MaKhachHang}`);
      setKhachHangChiTiet(res.data.data);
    } catch (err) {
      tb.loiTuApi(err, 'Lỗi khi nạp chi tiết khách hàng');
    } finally {
      setDangTaiChiTietKhach(false);
    }
  };

  // Mở modal sửa khách hàng
  const handleMoModalSuaKhach = (u) => {
    setKhachHangDangSua(u);
    setFormSuaKhach({
      hoTen: u.HoTen || '',
      soDienThoai: u.SoDienThoai || '',
      diaChiMacDinh: u.DiaChiMacDinh || ''
    });
    setModalSuaKhachMo(true);
  };

  // Lưu sửa khách hàng
  const handleLuuSuaKhach = async (e) => {
    e.preventDefault();
    if (!khachHangDangSua) return;
    setDangSuaKhach(true);
    try {
      await api.put(`/admin/customers/${khachHangDangSua.MaKhachHang}`, {
        hoTen: formSuaKhach.hoTen.trim(),
        soDienThoai: formSuaKhach.soDienThoai.trim() || null,
        diaChiMacDinh: formSuaKhach.diaChiMacDinh.trim() || null
      });
      tb.thanhCong(`Đã cập nhật thông tin khách hàng ${khachHangDangSua.Email} thành công`);
      setModalSuaKhachMo(false);
      taiLai();
    } catch (err) {
      tb.loiTuApi(err, 'Lỗi khi cập nhật thông tin khách hàng');
    } finally {
      setDangSuaKhach(false);
    }
  };

  const layBadgeVaiTro = (vaiTro) => {
    switch (vaiTro) {
      case 'quan_tri':
        return <span className="badge" style={{ backgroundColor: 'var(--adm-info-subtle)', color: 'var(--adm-info)', border: '1px solid var(--adm-info-subtle)' }}>Quản trị viên</span>;
      case 'thu_kho':
        return <span className="badge" style={{ backgroundColor: 'var(--adm-success-subtle)', color: 'var(--adm-success)', border: '1px solid var(--adm-success-subtle)' }}>Thủ kho</span>;
      case 'thu_thu':
        return <span className="badge" style={{ backgroundColor: 'var(--adm-warning-subtle)', color: 'var(--adm-warning)', border: '1px solid var(--adm-warning-subtle)' }}>Thủ thư</span>;
      case 'khach_hang':
        return <span className="badge" style={{ backgroundColor: 'var(--adm-primary-subtle)', color: 'var(--adm-text-muted)', border: '1px solid var(--adm-border-strong)' }}>Khách hàng</span>;
      default:
        return <span className="badge badge-role">{vaiTro}</span>;
    }
  };

  const layBadgeTrangThaiDon = (tt) => {
    switch (tt) {
      case 'CHO_DUYET':
        return <span className="badge badge-pending">Chờ duyệt</span>;
      case 'DA_DUYET':
        return <span className="badge badge-processing">Đã duyệt</span>;
      case 'DA_LAY_HANG':
        return <span className="badge badge-shipping">Đã lấy hàng</span>;
      case 'DA_GIAO':
        return <span className="badge badge-delivered">Đã giao</span>;
      case 'DA_HUY':
        return <span className="badge badge-cancelled">Đã hủy</span>;
      default:
        return <span className="badge">{tt}</span>;
    }
  };

  return (
    <div>
      <div className="admindash-page-head">
        <div>
          <h1 className="admindash-page-title">
            {laKhach ? 'Tra cứu & quản lý khách hàng' : 'Quản lý nhân sự & khách hàng'}
          </h1>
          <p className="admindash-page-desc">
            {laKhach 
              ? 'Tra cứu thông tin khách hàng, số điện thoại, địa chỉ và lịch sử đơn hàng gần nhất'
              : 'Cấp tài khoản nhân viên vận hành, điều chỉnh vai trò và kiểm soát quyền truy cập hệ thống'
            }
          </p>
        </div>

        {laQuanTri && !laKhach && (
          <button onClick={() => setModalMo(true)} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
            Tạo tài khoản nhân sự
          </button>
        )}
      </div>

      {loi && (
        <ThongBaoTaiCho loai="loi" onDong={() => setLoi('')}>
          {loi}
        </ThongBaoTaiCho>
      )}

      {/* Bộ Lọc & Tìm Kiếm */}
      <div className="card mb-5" style={{ padding: '0.85rem 1.25rem' }}>
        <form onSubmit={handleTimKiem} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder={laKhach ? "Tìm theo tên, email khách hàng..." : "Tìm theo tên hoặc email..."}
              className="form-input w-full"
              style={{ paddingLeft: '2.25rem' }}
              value={timKiem}
              onChange={(e) => setTimKiem(e.target.value)}
            />
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted)' }} />
          </div>

          <div>
            {laQuanTri ? (
              <select
                className="form-input w-full"
                value={vaiTroLoc}
                onChange={(e) => handleLocVaiTro(e.target.value)}
              >
                <option value="">Tất cả nhân viên</option>
                <option value="quan_tri">Quản trị viên</option>
                <option value="thu_kho">Thủ kho</option>
                <option value="thu_thu">Thủ thư</option>
                <option value="khach_hang">Khách hàng</option>
              </select>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', height: '100%', fontSize: '0.85rem', color: 'var(--adm-text-muted)' }}>
                Đang xem danh sách Khách hàng
              </div>
            )}
          </div>

          <div>
            <button type="submit" className="btn btn-outline w-full" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              Lọc danh sách
            </button>
          </div>
        </form>
      </div>

      {/* Bảng Danh Sách Người Dùng */}
      {dangTai ? (
        <BangXuong
          tieuDe={['Mã', 'Họ tên & email', laKhach ? 'Địa chỉ mặc định' : 'Vai trò', 'Số điện thoại', 'Trạng thái', 'Thao tác']}
          canPhai={[5]}
          nhan="Đang tải danh sách tài khoản"
        />
      ) : (
        <div className="admindash-table-wrap">
          <table className="admindash-table">
            <thead>
              <tr>
                <th style={{ width: '70px' }}>Mã</th>
                <th>Họ tên & Email</th>
                <th style={{ width: '140px' }}>{laKhach ? 'Địa chỉ mặc định' : 'Vai trò'}</th>
                <th style={{ width: '130px' }}>Số điện thoại</th>
                <th style={{ width: '120px' }}>Trạng thái</th>
                <th style={{ textAlign: 'right', width: '220px' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {nguoiDungList.map((u) => {
                const userId = laKhach ? u.MaKhachHang : u.MaNhanVien;
                const hoTen = u.HoTen;
                const email = u.Email;
                const vaiTro = laKhach ? 'khach_hang' : u.VaiTro;
                const sdt = u.SoDienThoai;
                const diaChi = u.DiaChiMacDinh;
                const dangHoatDong = u.DangHoatDong;
                const myId = adminHienTai?.id;
                const laChinhMinh = !laKhach && userId === myId;

                return (
                  <tr key={userId}>
                    <td className="tabular-nums" style={{ fontWeight: 600, color: 'var(--adm-text-muted)', fontSize: '0.8rem' }}>
                      #{userId}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--adm-text-main)' }}>{hoTen}</div>
                      <span style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)' }}>{email}</span>
                    </td>
                    <td>
                      {laKhach ? (
                        <span style={{ fontSize: '0.8rem', color: 'var(--adm-text-muted)' }}>
                          {diaChi || 'Chưa thiết lập'}
                        </span>
                      ) : (
                        layBadgeVaiTro(vaiTro)
                      )}
                    </td>
                    <td className="tabular-nums" style={{ fontSize: '0.85rem' }}>{sdt || '—'}</td>
                    <td>
                      {dangHoatDong ? (
                        <span className="badge badge-delivered">Hoạt động</span>
                      ) : (
                        <span className="badge badge-cancelled">Đã khóa</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'flex-end' }}>
                        {laKhach ? (
                          <>
                            {/* Khách Hàng: Nút Xem Chi Tiết */}
                            <button
                              onClick={() => handleXemChiTietKhach(u)}
                              className="btn btn-outline"
                              style={{ fontSize: '0.75rem', padding: '0.28rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              title="Xem chi tiết & đơn hàng gần đây"
                            >
                              <span>Chi tiết</span>
                            </button>

                            {/* Khách Hàng: Nút Sửa Thông Tin */}
                            <button
                              onClick={() => handleMoModalSuaKhach(u)}
                              className="btn btn-outline"
                              style={{ fontSize: '0.75rem', padding: '0.28rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                              title="Sửa họ tên, SĐT, địa chỉ"
                            >
                              <span>Sửa</span>
                            </button>

                            {/* Khách Hàng: Khóa / Mở khóa (chỉ quan_tri) */}
                            {laQuanTri && (
                              <button
                                onClick={() => handleToggleKhoa(u)}
                                className="btn btn-outline"
                                style={{
                                  fontSize: '0.75rem',
                                  padding: '0.28rem 0.55rem',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '0.25rem',
                                  color: dangHoatDong ? 'var(--adm-danger)' : 'var(--adm-success)',
                                  borderColor: dangHoatDong ? 'var(--adm-danger-subtle)' : 'var(--adm-success-subtle)'
                                }}
                                title={dangHoatDong ? 'Khóa tài khoản' : 'Mở khóa'}
                              >
                                {dangHoatDong ? <Lock size={13} /> : <Unlock size={13} />}
                              </button>
                            )}
                          </>
                        ) : (
                          <>
                            {/* Nhân Viên: Nút Sửa Thông Tin & Vai Trò (chỉ quan_tri) */}
                            {laQuanTri && (
                              <button
                                onClick={() => handleMoModalSuaNhanVien(u)}
                                className="btn btn-outline"
                                style={{ fontSize: '0.75rem', padding: '0.28rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                title="Sửa họ tên, SĐT, vai trò"
                              >
                                <span>Sửa</span>
                              </button>
                            )}

                            {/* Nhân Viên: Nút Đặt Lại Mật Khẩu (chỉ quan_tri) */}
                            {laQuanTri && (
                              <button
                                onClick={() => handleMoModalDoiMatKhau(u)}
                                className="btn btn-outline"
                                style={{ fontSize: '0.75rem', padding: '0.28rem 0.55rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                                title="Đặt lại mật khẩu nhân viên"
                              >
                                <KeyRound size={13} />
                              </button>
                            )}

                            {/* Nhân Viên: Khóa / Mở Khóa */}
                            {laChinhMinh ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)', fontStyle: 'italic', padding: '0.28rem 0.4rem' }}>
                                Đang dùng
                              </span>
                            ) : (
                              laQuanTri && (
                                <button
                                  onClick={() => handleToggleKhoa(u)}
                                  className="btn btn-outline"
                                  style={{
                                    fontSize: '0.75rem',
                                    padding: '0.28rem 0.55rem',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '0.25rem',
                                    color: dangHoatDong ? 'var(--adm-danger)' : 'var(--adm-success)',
                                    borderColor: dangHoatDong ? 'var(--adm-danger-subtle)' : 'var(--adm-success-subtle)'
                                  }}
                                  title={dangHoatDong ? 'Khóa tài khoản' : 'Mở khóa'}
                                >
                                  {dangHoatDong ? <Lock size={13} /> : <Unlock size={13} />}
                                </button>
                              )
                            )}
                          </>
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

      {/* Modal Thêm Mới Nhân Sự */}
      {modalMo && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--adm-text-main)' }}>
                Thêm mới nhân sự vận hành
              </h3>
              <button onClick={() => setModalMo(false)} style={{ color: 'var(--adm-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTaoNhanSu}>
              <div className="form-group mb-3">
                <label className="form-label">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Lê Văn C"
                  className="form-input w-full"
                  value={formNhanSu.hoTen}
                  onChange={(e) => setFormNhanSu({ ...formNhanSu, hoTen: e.target.value })}
                />
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Email đăng nhập *</label>
                <input
                  type="email"
                  required
                  placeholder="nhanvien.moi@booknest.lhutech.click"
                  className="form-input w-full"
                  value={formNhanSu.email}
                  onChange={(e) => setFormNhanSu({ ...formNhanSu, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="form-group">
                  <label className="form-label">Mật khẩu khởi tạo *</label>
                  <input
                    type="password"
                    required
                    placeholder="Tối thiểu 8 ký tự (chữ & số)"
                    className="form-input w-full"
                    value={formNhanSu.matKhau}
                    onChange={(e) => setFormNhanSu({ ...formNhanSu, matKhau: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Vai trò nghiệp vụ *</label>
                  <select
                    className="form-input w-full"
                    value={formNhanSu.vaiTro}
                    onChange={(e) => setFormNhanSu({ ...formNhanSu, vaiTro: e.target.value })}
                  >
                    <option value="thu_thu">Thủ thư</option>
                    <option value="thu_kho">Thủ kho</option>
                  </select>
                </div>
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Số điện thoại</label>
                <input
                  type="tel"
                  placeholder="0912345678"
                  className="form-input w-full"
                  value={formNhanSu.soDienThoai}
                  onChange={(e) => setFormNhanSu({ ...formNhanSu, soDienThoai: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setModalMo(false)} className="btn btn-outline">
                  Hủy
                </button>
                <button type="submit" disabled={dangTao} className="btn btn-primary">
                  {dangTao ? 'Đang tạo...' : 'Tạo tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sửa Thông Tin Nhân Viên */}
      {modalSuaNhanVienMo && nhanVienDangSua && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--adm-text-main)' }}>
                Sửa thông tin nhân viên #{nhanVienDangSua.MaNhanVien}
              </h3>
              <button onClick={() => setModalSuaNhanVienMo(false)} style={{ color: 'var(--adm-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLuuSuaNhanVien}>
              <div className="form-group mb-3">
                <label className="form-label">Email đăng nhập</label>
                <input
                  type="text"
                  disabled
                  className="form-input w-full"
                  value={nhanVienDangSua.Email}
                  style={{ backgroundColor: 'var(--adm-surface-2)', color: 'var(--adm-text-muted)', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Họ và tên *</label>
                <input
                  type="text"
                  required
                  className="form-input w-full"
                  value={formSuaNhanVien.hoTen}
                  onChange={(e) => setFormSuaNhanVien({ ...formSuaNhanVien, hoTen: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="form-group">
                  <label className="form-label">Vai trò nghiệp vụ *</label>
                  <select
                    className="form-input w-full"
                    disabled={nhanVienDangSua.MaNhanVien === adminHienTai?.id}
                    value={formSuaNhanVien.vaiTro}
                    onChange={(e) => setFormSuaNhanVien({ ...formSuaNhanVien, vaiTro: e.target.value })}
                  >
                    <option value="quan_tri">Quản trị viên</option>
                    <option value="thu_kho">Thủ kho</option>
                    <option value="thu_thu">Thủ thư</option>
                  </select>
                  {nhanVienDangSua.MaNhanVien === adminHienTai?.id && (
                    <span style={{ fontSize: '0.72rem', color: 'var(--adm-danger)' }}>
                      Không thể tự đổi vai trò của chính mình
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Số điện thoại</label>
                  <input
                    type="tel"
                    placeholder="0912345678"
                    className="form-input w-full"
                    value={formSuaNhanVien.soDienThoai}
                    onChange={(e) => setFormSuaNhanVien({ ...formSuaNhanVien, soDienThoai: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setModalSuaNhanVienMo(false)} className="btn btn-outline">
                  Hủy
                </button>
                <button type="submit" disabled={dangSuaNhanVien} className="btn btn-primary">
                  {dangSuaNhanVien ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đặt Lại Mật Khẩu Nhân Viên */}
      {modalDoiMatKhauNhanVienMo && nhanVienDoiMatKhau && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '450px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--adm-text-main)' }}>
                Đặt lại mật khẩu nhân viên
              </h3>
              <button onClick={() => setModalDoiMatKhauNhanVienMo(false)} style={{ color: 'var(--adm-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--adm-text-muted)', marginBottom: '1rem' }}>
              Thiết lập mật khẩu đăng nhập mới cho tài khoản: <strong>{nhanVienDoiMatKhau.Email}</strong>
            </p>

            <form onSubmit={handleLuuDoiMatKhauNhanVien}>
              <div className="form-group mb-4">
                <label className="form-label">Mật khẩu mới *</label>
                <input
                  type="password"
                  required
                  placeholder="Tối thiểu 8 ký tự (chữ & số)"
                  className="form-input w-full"
                  value={matKhauMoiNhanVien}
                  onChange={(e) => setMatKhauMoiNhanVien(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setModalDoiMatKhauNhanVienMo(false)} className="btn btn-outline">
                  Hủy
                </button>
                <button type="submit" disabled={dangDoiMatKhauNhanVien} className="btn btn-primary">
                  {dangDoiMatKhauNhanVien ? 'Đang cập nhật...' : 'Xác nhận đặt lại'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Xem Chi Tiết Khách Hàng */}
      {modalChiTietKhachMo && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '650px' }}>
            <div className="flex justify-between items-center mb-4 border-b pb-3" style={{ borderColor: 'var(--adm-border)' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--adm-text-main)' }}>
                Chi tiết khách hàng
              </h3>
              <button onClick={() => setModalChiTietKhachMo(false)} style={{ color: 'var(--adm-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {dangTaiChiTietKhach ? (
              <div className="flex justify-center py-8">
                <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.9rem' }}>Đang nạp thông tin khách hàng...</p>
              </div>
            ) : khachHangChiTiet ? (
              <div>
                {/* Thông tin định danh */}
                <div className="grid grid-cols-2 gap-3 mb-4" style={{ backgroundColor: 'var(--adm-surface-2)', padding: '0.85rem 1rem', borderRadius: '6px' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)', display: 'block' }}>Mã khách hàng</span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--adm-text-main)' }}>#{khachHangChiTiet.MaKhachHang}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)', display: 'block' }}>Trạng thái</span>
                    {khachHangChiTiet.DangHoatDong ? (
                      <span className="badge badge-delivered" style={{ fontSize: '0.75rem' }}>Hoạt động</span>
                    ) : (
                      <span className="badge badge-cancelled" style={{ fontSize: '0.75rem' }}>Đã khóa</span>
                    )}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)', display: 'block' }}>Họ và tên</span>
                    <strong style={{ fontSize: '0.9rem', color: 'var(--adm-text-main)' }}>{khachHangChiTiet.HoTen}</strong>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)', display: 'block' }}>Email</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--adm-text-main)' }}>{khachHangChiTiet.Email}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)', display: 'block' }}>Số điện thoại</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--adm-text-main)' }}>{khachHangChiTiet.SoDienThoai || 'Chưa cập nhật'}</span>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)', display: 'block' }}>Địa chỉ nhận hàng</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--adm-text-main)' }}>{khachHangChiTiet.DiaChiMacDinh || 'Chưa cập nhật'}</span>
                  </div>
                </div>

                {/* 5 đơn hàng gần nhất */}
                <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--adm-text-main)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  5 đơn hàng gần nhất
                </h4>

                {khachHangChiTiet.donHangGanDay && khachHangChiTiet.donHangGanDay.length > 0 ? (
                  <div className="admindash-table-wrap mb-4">
                    <table className="admindash-table" style={{ fontSize: '0.8rem' }}>
                      <thead>
                        <tr>
                          <th>Mã đơn</th>
                          <th>Ngày đặt</th>
                          <th>Tổng tiền</th>
                          <th>Kênh</th>
                          <th>Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody>
                        {khachHangChiTiet.donHangGanDay.map((dh) => (
                          <tr key={dh.MaDonHang}>
                            <td className="tabular-nums" style={{ fontWeight: 600 }}>#{dh.MaDonHang}</td>
                            <td className="tabular-nums">{new Date(dh.NgayDat).toLocaleDateString('vi-VN')}</td>
                            <td className="tabular-nums" style={{ fontWeight: 600 }}>{Number(dh.TongTien || 0).toLocaleString('vi-VN')}đ</td>
                            <td>{dh.KenhBan === 'TAI_QUAY' ? 'Tại quầy' : 'Trực tuyến'}</td>
                            <td>{layBadgeTrangThaiDon(dh.TrangThai)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.825rem', color: 'var(--adm-text-muted)', fontStyle: 'italic', marginBottom: '1.25rem' }}>
                    Khách hàng chưa phát sinh đơn hàng nào.
                  </p>
                )}

                <div className="flex justify-end">
                  <button onClick={() => setModalChiTietKhachMo(false)} className="btn btn-outline">
                    Đóng
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Modal Sửa Thông Tin Khách Hàng */}
      {modalSuaKhachMo && khachHangDangSua && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--adm-text-main)' }}>
                Sửa thông tin khách hàng #{khachHangDangSua.MaKhachHang}
              </h3>
              <button onClick={() => setModalSuaKhachMo(false)} style={{ color: 'var(--adm-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleLuuSuaKhach}>
              <div className="form-group mb-3">
                <label className="form-label">Email tài khoản</label>
                <input
                  type="text"
                  disabled
                  className="form-input w-full"
                  value={khachHangDangSua.Email}
                  style={{ backgroundColor: 'var(--adm-surface-2)', color: 'var(--adm-text-muted)', cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Họ và tên *</label>
                <input
                  type="text"
                  required
                  className="form-input w-full"
                  value={formSuaKhach.hoTen}
                  onChange={(e) => setFormSuaKhach({ ...formSuaKhach, hoTen: e.target.value })}
                />
              </div>

              <div className="form-group mb-3">
                <label className="form-label">Số điện thoại</label>
                <input
                  type="tel"
                  placeholder="0912345678"
                  className="form-input w-full"
                  value={formSuaKhach.soDienThoai}
                  onChange={(e) => setFormSuaKhach({ ...formSuaKhach, soDienThoai: e.target.value })}
                />
              </div>

              <div className="form-group mb-4">
                <label className="form-label">Địa chỉ nhận hàng mặc định</label>
                <textarea
                  rows={2}
                  placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành phố"
                  className="form-input w-full"
                  value={formSuaKhach.diaChiMacDinh}
                  onChange={(e) => setFormSuaKhach({ ...formSuaKhach, diaChiMacDinh: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setModalSuaKhachMo(false)} className="btn btn-outline">
                  Hủy
                </button>
                <button type="submit" disabled={dangSuaKhach} className="btn btn-primary">
                  {dangSuaKhach ? 'Đang lưu...' : 'Lưu thay đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <PhanTrang phanTrang={phanTrang} onChuyenTrang={handleChuyenTrang} donVi="tài khoản" />
    </div>
  );
};

export default QuanLyNhanSu;
