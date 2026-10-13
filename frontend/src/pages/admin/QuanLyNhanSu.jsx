import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PhanTrang from '../../components/PhanTrang';
import { 
  UserPlus, 
  Lock, 
  Unlock, 
  Search, 
  Filter, 
  Check, 
  AlertCircle, 
  X 
} from 'lucide-react';

export const QuanLyNhanSu = () => {
  const { user: adminHienTai } = useAuth();

  const [searchParams, setSearchParams] = useSearchParams();
  const trang = parseInt(searchParams.get('page') || '1', 10);
  const vaiTroLoc = searchParams.get('role') || '';
  const tuKhoaDaLoc = searchParams.get('search') || '';

  const [nguoiDungList, setNguoiDungList] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [timKiem, setTimKiem] = useState(tuKhoaDaLoc);
  const [phanTrang, setPhanTrang] = useState(null);
  const [thongBao, setThongBao] = useState('');
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

  // Khách hàng nằm ở danh sách riêng, nhân viên lọc theo vai trò
  const laKhach = vaiTroLoc === 'khach_hang';
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
        if (!daHuy) setLoi(err.response?.data?.message || 'Không thể tải danh sách tài khoản');
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
    params.set('page', trangMoi);
    setSearchParams(params);
  };

  // Khóa hoặc mở khóa tài khoản
  const handleToggleKhoa = async (u) => {
    const userId = laKhach ? u.MaKhachHang : u.MaNhanVien;
    const myId = adminHienTai?.id;
    if (!laKhach && userId === myId) {
      alert('Bạn không thể tự khóa tài khoản quản trị của chính mình!');
      return;
    }

    const dangHoatDong = u.DangHoatDong;
    const email = u.Email;
    const hanhDong = dangHoatDong ? 'khóa' : 'mở khóa';
    if (!window.confirm(`Bạn có chắc muốn ${hanhDong} tài khoản "${email}"?`)) return;

    try {
      const trangThaiMoi = !dangHoatDong;
      await api.put(`${duongDanDanhSach}/${userId}/status`, { dangHoatDong: trangThaiMoi });
      setThongBao(`Đã ${hanhDong} tài khoản ${email} thành công`);
      taiLai();
      setTimeout(() => setThongBao(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi cập nhật trạng thái người dùng');
    }
  };

  // Tạo tài khoản nhân sự mới
  const handleTaoNhanSu = async (e) => {
    e.preventDefault();
    setDangTao(true);
    try {
      await api.post('/admin/staff', {
        hoTen: formNhanSu.hoTen,
        email: formNhanSu.email,
        matKhau: formNhanSu.matKhau,
        vaiTro: formNhanSu.vaiTro,
        soDienThoai: formNhanSu.soDienThoai || undefined
      });
      setThongBao(`Đã khởi tạo tài khoản nhân sự thành công: ${formNhanSu.email}`);
      setModalMo(false);
      setFormNhanSu({
        hoTen: '',
        email: '',
        matKhau: '',
        vaiTro: 'thu_thu',
        soDienThoai: ''
      });
      taiLai();
      setTimeout(() => setThongBao(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi tạo tài khoản nhân sự');
    } finally {
      setDangTao(false);
    }
  };

  const layBadgeVaiTro = (vaiTro) => {
    switch (vaiTro) {
      case 'quan_tri':
        return <span className="badge" style={{ backgroundColor: '#EFF6FF', color: '#1D4ED8', border: '1px solid #BFDBFE' }}>Quản trị viên</span>;
      case 'thu_kho':
        return <span className="badge" style={{ backgroundColor: '#F0FDF4', color: '#15803D', border: '1px solid #BBF7D0' }}>Thủ kho</span>;
      case 'thu_thu':
        return <span className="badge" style={{ backgroundColor: '#FFFBEB', color: '#B45309', border: '1px solid #FDE68A' }}>Thủ thư</span>;
      case 'khach_hang':
        return <span className="badge" style={{ backgroundColor: '#F1F5F9', color: '#475569', border: '1px solid #CBD5E1' }}>Khách hàng</span>;
      default:
        return <span className="badge badge-role">{vaiTro}</span>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--adm-text-main)', letterSpacing: '-0.02em' }}>
            Quản Lý Nhân Sự & Khách Hàng
          </h1>
          <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
            Cấp tài khoản nhân viên vận hành và quản lý quyền truy cập hệ thống
          </p>
        </div>

        <button onClick={() => setModalMo(true)} className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
          <UserPlus size={15} /> Tạo Tài Khoản Nhân Sự
        </button>
      </div>

      {thongBao && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          backgroundColor: 'var(--adm-success-subtle)',
          color: 'var(--adm-success)',
          border: '1px solid #A7F3D0',
          fontSize: '0.85rem',
          marginBottom: '1rem'
        }}>
          <Check size={16} /> <span>{thongBao}</span>
        </div>
      )}
      {loi && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          padding: '0.75rem 1rem',
          borderRadius: '6px',
          backgroundColor: 'var(--adm-danger-subtle)',
          color: 'var(--adm-danger)',
          border: '1px solid #FECACA',
          fontSize: '0.85rem',
          marginBottom: '1rem'
        }}>
          <AlertCircle size={16} /> <span>{loi}</span>
        </div>
      )}

      {/* Bộ Lọc & Tìm Kiếm */}
      <div className="card mb-5" style={{ padding: '0.85rem 1.25rem' }}>
        <form onSubmit={handleTimKiem} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              className="form-input w-full"
              style={{ paddingLeft: '2.25rem' }}
              value={timKiem}
              onChange={(e) => setTimKiem(e.target.value)}
            />
            <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-muted)' }} />
          </div>

          <div>
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
          </div>

          <div>
            <button type="submit" className="btn btn-outline w-full" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}>
              <Filter size={15} /> Lọc Danh Sách
            </button>
          </div>
        </form>
      </div>

      {/* Bảng Danh Sách Người Dùng */}
      {dangTai ? (
        <div className="flex justify-center py-12">
          <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.9rem' }}>Đang nạp danh sách tài khoản...</p>
        </div>
      ) : (
        <div className="admindash-table-wrap">
          <table className="admindash-table">
            <thead>
              <tr>
                <th style={{ width: '70px' }}>Mã</th>
                <th>Họ Tên & Email</th>
                <th style={{ width: '140px' }}>Vai Trò</th>
                <th style={{ width: '130px' }}>Số Điện Thoại</th>
                <th style={{ width: '120px' }}>Trạng Thái</th>
                <th style={{ textAlign: 'right', width: '120px' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {nguoiDungList.map((u) => {
                const userId = laKhach ? u.MaKhachHang : u.MaNhanVien;
                const hoTen = u.HoTen;
                const email = u.Email;
                const vaiTro = laKhach ? 'khach_hang' : u.VaiTro;
                const sdt = u.SoDienThoai;
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
                    <td>{layBadgeVaiTro(vaiTro)}</td>
                    <td className="tabular-nums" style={{ fontSize: '0.85rem' }}>{sdt || '—'}</td>
                    <td>
                      {dangHoatDong ? (
                        <span className="badge badge-delivered">Hoạt động</span>
                      ) : (
                        <span className="badge badge-cancelled">Đã khóa</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {laChinhMinh ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)', fontStyle: 'italic' }}>
                          Tài khoản hiện tại
                        </span>
                      ) : (
                        <button
                          onClick={() => handleToggleKhoa(u)}
                          className="btn btn-outline"
                          style={{
                            fontSize: '0.75rem',
                            padding: '0.3rem 0.6rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            color: dangHoatDong ? 'var(--adm-danger)' : 'var(--adm-success)',
                            borderColor: dangHoatDong ? '#FECACA' : '#A7F3D0'
                          }}
                          title={dangHoatDong ? 'Khóa tài khoản' : 'Mở khóa'}
                        >
                          {dangHoatDong ? <Lock size={13} /> : <Unlock size={13} />}
                          <span>{dangHoatDong ? 'Khóa' : 'Mở Khóa'}</span>
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Thêm Nhân Sự */}
      {modalMo && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <div className="flex justify-between items-center mb-4">
              <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--adm-text-main)' }}>
                Thêm Mới Nhân Sự Vận Hành
              </h3>
              <button onClick={() => setModalMo(false)} style={{ color: 'var(--adm-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleTaoNhanSu}>
              <div className="form-group">
                <label className="form-label">Họ và tên *</label>
                <input
                  type="text"
                  required
                  placeholder="Lê Văn C"
                  className="form-input"
                  value={formNhanSu.hoTen}
                  onChange={(e) => setFormNhanSu({ ...formNhanSu, hoTen: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email đăng nhập *</label>
                <input
                  type="email"
                  required
                  placeholder="nhanvien.moi@booknest.vn"
                  className="form-input"
                  value={formNhanSu.email}
                  onChange={(e) => setFormNhanSu({ ...formNhanSu, email: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Mật khẩu khởi tạo *</label>
                  <input
                    type="password"
                    required
                    placeholder="Tối thiểu 8 ký tự (chữ & số)"
                    className="form-input"
                    value={formNhanSu.matKhau}
                    onChange={(e) => setFormNhanSu({ ...formNhanSu, matKhau: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Vai trò nghiệp vụ *</label>
                  <select
                    className="form-input"
                    value={formNhanSu.vaiTro}
                    onChange={(e) => setFormNhanSu({ ...formNhanSu, vaiTro: e.target.value })}
                  >
                    <option value="thu_thu">Thủ thư</option>
                    <option value="thu_kho">Thủ kho</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Số điện thoại</label>
                <input
                  type="tel"
                  className="form-input"
                  value={formNhanSu.soDienThoai}
                  onChange={(e) => setFormNhanSu({ ...formNhanSu, soDienThoai: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-2 mt-4">
                <button type="button" onClick={() => setModalMo(false)} className="btn btn-outline">
                  Hủy
                </button>
                <button type="submit" disabled={dangTao} className="btn btn-primary">
                  {dangTao ? 'Đang tạo...' : 'Tạo Tài Khoản'}
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
