import React, { useState, useEffect } from 'react';
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

  const [nguoiDungList, setNguoiDungList] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [vaiTroLoc, setVaiTroLoc] = useState('');
  const [timKiem, setTimKiem] = useState('');
  const [trang, setTrang] = useState(1);
  const [phanTrang, setPhanTrang] = useState(null);
  const [thongBao, setThongBao] = useState('');
  const [loi, setLoi] = useState('');

  // Modal tạo nhân sự mới
  const [modalMo, setModalMo] = useState(false);
  const [formNhanSu, setFormNhanSu] = useState({
    hoTen: '',
    email: '',
    matKhau: '',
    vaiTro: 'librarian',
    soDienThoai: '',
    diaChi: ''
  });
  const [dangTao, setDangTao] = useState(false);

  const taiNguoiDung = async (trangCanTai = trang) => {
    setDangTai(true);
    try {
      const params = { page: trangCanTai, limit: 20 };
      if (vaiTroLoc) params.role = vaiTroLoc;
      if (timKiem.trim()) params.search = timKiem.trim();

      const res = await api.get('/admin/users', { params });
      const ds = res.data.data.danhSach;
      setNguoiDungList(Array.isArray(ds) ? ds : []);
      setPhanTrang(res.data.data.phanTrang);
    } catch (err) {
      setLoi(err.response?.data?.message || 'Không thể tải danh sách tài khoản');
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => {
    let daHuy = false;
    const nap = async () => {
      try {
        const params = { page: trang, limit: 20 };
        if (vaiTroLoc) params.role = vaiTroLoc;

        const res = await api.get('/admin/users', { params });
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
  }, [vaiTroLoc, trang]);

  const handleTimKiem = (e) => {
    e.preventDefault();
    setTrang(1);
    taiNguoiDung(1);
  };

  // Khóa hoặc mở khóa tài khoản
  const handleToggleKhoa = async (u) => {
    const userId = u.MaNguoiDung;
    const myId = adminHienTai?.id;
    if (userId === myId) {
      alert('Bạn không thể tự khóa tài khoản quản trị của chính mình!');
      return;
    }

    const dangHoatDong = u.DangHoatDong;
    const email = u.Email;
    const hanhDong = dangHoatDong ? 'khóa' : 'mở khóa';
    if (!window.confirm(`Bạn có chắc muốn ${hanhDong} tài khoản "${email}"?`)) return;

    try {
      const trangThaiMoi = !dangHoatDong;
      await api.put(`/admin/users/${userId}/status`, { dangHoatDong: trangThaiMoi });
      setThongBao(`Đã ${hanhDong} tài khoản ${email} thành công`);
      taiNguoiDung();
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
      await api.post('/admin/users', {
        hoTen: formNhanSu.hoTen,
        email: formNhanSu.email,
        matKhau: formNhanSu.matKhau,
        vaiTro: formNhanSu.vaiTro,
        soDienThoai: formNhanSu.soDienThoai || undefined,
        diaChiMacDinh: formNhanSu.diaChi || undefined
      });
      setThongBao(`Đã khởi tạo tài khoản nhân sự thành công: ${formNhanSu.email}`);
      setModalMo(false);
      setFormNhanSu({
        hoTen: '',
        email: '',
        matKhau: '',
        vaiTro: 'librarian',
        soDienThoai: '',
        diaChi: ''
      });
      taiNguoiDung();
      setTimeout(() => setThongBao(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi tạo tài khoản nhân sự');
    } finally {
      setDangTao(false);
    }
  };

  const layBadgeVaiTro = (vaiTro) => {
    switch (vaiTro) {
      case 'admin':
        return <span className="badge" style={{ backgroundColor: 'var(--primary-light)', color: 'var(--primary)' }}>Admin</span>;
      case 'librarian':
        return <span className="badge badge-confirmed">Thủ thư</span>;
      case 'order_staff':
        return <span className="badge badge-pending">NV Đơn hàng</span>;
      case 'customer':
        return <span className="badge badge-role">Khách hàng</span>;
      default:
        return <span className="badge">{vaiTro}</span>;
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="font-serif" style={{ fontSize: '1.75rem', fontWeight: 700 }}>
            Quản Lý Nhân Sự & Người Dùng
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Cấp tài khoản nhân viên vận hành và quản lý quyền truy cập hệ thống
          </p>
        </div>

        <button onClick={() => setModalMo(true)} className="btn btn-primary">
          <UserPlus size={16} /> Tạo Tài Khoản Nhân Sự
        </button>
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

      {/* Bộ Lọc & Tìm Kiếm */}
      <div className="card mb-6" style={{ padding: '1rem' }}>
        <form onSubmit={handleTimKiem} className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              className="form-input"
              style={{ paddingLeft: '2.25rem' }}
              value={timKiem}
              onChange={(e) => setTimKiem(e.target.value)}
            />
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          </div>

          <div>
            <select
              className="form-input"
              value={vaiTroLoc}
              onChange={(e) => {
                setVaiTroLoc(e.target.value);
                setTrang(1);
              }}
            >
              <option value="">Tất cả vai trò</option>
              <option value="admin">Quản trị viên (Admin)</option>
              <option value="librarian">Thủ thư (Librarian)</option>
              <option value="order_staff">Nhân viên đơn (Staff)</option>
              <option value="customer">Khách hàng (Customer)</option>
            </select>
          </div>

          <div>
            <button type="submit" className="btn btn-outline w-full">
              <Filter size={16} /> Lọc Danh Sách
            </button>
          </div>
        </form>
      </div>

      {/* Bảng Danh Sách Người Dùng */}
      {dangTai ? (
        <div className="flex justify-center py-12">
          <p className="font-serif" style={{ color: 'var(--text-muted)' }}>Đang nạp danh sách tài khoản...</p>
        </div>
      ) : (
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Họ Tên & Email</th>
                <th>Vai Trò</th>
                <th>Số Điện Thoại</th>
                <th>Trạng Thái</th>
                <th style={{ textAlign: 'right' }}>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {nguoiDungList.map((u) => {
                const userId = u.MaNguoiDung;
                const hoTen = u.HoTen;
                const email = u.Email;
                const vaiTro = u.VaiTro;
                const sdt = u.SoDienThoai;
                const dangHoatDong = u.DangHoatDong;
                const myId = adminHienTai?.id;
                const laChinhMinh = userId === myId;

                return (
                  <tr key={userId}>
                    <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>#{userId}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{hoTen}</div>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{email}</span>
                    </td>
                    <td>{layBadgeVaiTro(vaiTro)}</td>
                    <td style={{ fontSize: '0.875rem' }}>{sdt || '—'}</td>
                    <td>
                      {dangHoatDong ? (
                        <span className="badge badge-delivered">Hoạt động</span>
                      ) : (
                        <span className="badge badge-cancelled">Đã khóa</span>
                      )}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {laChinhMinh ? (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Tài khoản của bạn</span>
                      ) : (
                        <button
                          onClick={() => handleToggleKhoa(u)}
                          className="btn btn-outline btn-sm"
                          style={{
                            color: dangHoatDong ? 'var(--danger)' : 'var(--accent)',
                            borderColor: dangHoatDong ? 'var(--danger)' : 'var(--accent)'
                          }}
                          title={dangHoatDong ? 'Khóa tài khoản' : 'Mở khóa'}
                        >
                          {dangHoatDong ? <Lock size={14} /> : <Unlock size={14} />}
                          {dangHoatDong ? 'Khóa' : 'Mở Khóa'}
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
              <h3 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                Thêm Mới Nhân Sự Vận Hành
              </h3>
              <button onClick={() => setModalMo(false)}>
                <X size={20} />
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
                    <option value="librarian">Thủ thư (Librarian)</option>
                    <option value="order_staff">Nhân viên đơn (Staff)</option>
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

      <PhanTrang phanTrang={phanTrang} onChuyenTrang={setTrang} donVi="tài khoản" />
    </div>
  );
};

export default QuanLyNhanSu;
