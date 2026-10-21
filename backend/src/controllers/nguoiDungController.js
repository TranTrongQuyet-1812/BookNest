/**
 * Tầng Controller điều phối các yêu cầu xem/sửa thông tin hồ sơ, đổi mật khẩu và quản trị tài khoản.
 */
const nguoiDungService = require('../services/nguoiDungService');
const { phanHoiThanhCong } = require('../middlewares/phanHoi');

// Lấy thông tin hồ sơ của người dùng đang đăng nhập (khách hoặc nhân viên, theo aud của token)
async function xuLyLayHoSo(req, res) {
  const ketQua = await nguoiDungService.layThongTinHoSo(req.user.aud, req.user.id);
  const banGhi = ketQua.toJSON ? ketQua.toJSON() : ketQua;
  const laKhach = req.user.aud === 'khach_hang';
  const thongTin = {
    ...banGhi,
    id: laKhach ? banGhi.MaKhachHang : banGhi.MaNhanVien,
    email: banGhi.Email,
    fullName: banGhi.HoTen,
    role: laKhach ? 'khach_hang' : banGhi.VaiTro,
    aud: req.user.aud
  };
  return phanHoiThanhCong(res, {
    duLieu: thongTin,
    thongDiep: 'Lấy thông tin hồ sơ thành công'
  });
}

// Cập nhật thông tin hồ sơ
async function xuLyCapNhatHoSo(req, res) {
  const ketQua = await nguoiDungService.capNhatHoSo(req.user.aud, req.user.id, req.body);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Cập nhật thông tin hồ sơ thành công'
  });
}

// Đổi mật khẩu
async function xuLyDoiMatKhau(req, res) {
  const ketQua = await nguoiDungService.doiMatKhau(req.user.aud, req.user.id, req.body);
  return phanHoiThanhCong(res, {
    duLieu: { token: ketQua.token },
    thongDiep: 'Đổi mật khẩu thành công'
  });
}

// Back-Office: Danh sách nhân viên
async function xuLyAdminLayDanhSachNhanVien(req, res) {
  const ketQua = await nguoiDungService.adminLayDanhSachNhanVien(req.query);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy danh sách nhân viên thành công'
  });
}

// Back-Office: Danh sách khách hàng
async function xuLyAdminLayDanhSachKhachHang(req, res) {
  const ketQua = await nguoiDungService.adminLayDanhSachKhachHang(req.query);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy danh sách khách hàng thành công'
  });
}

// Back-Office: Tạo nhân viên
async function xuLyAdminTaoNhanVien(req, res) {
  const ketQua = await nguoiDungService.adminTaoNhanVien(req.body);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Tạo tài khoản nhân viên thành công',
    maTrangThai: 201
  });
}

// Back-Office: Cập nhật thông tin nhân viên (họ tên, SĐT, vai trò)
async function xuLyAdminCapNhatNhanVien(req, res) {
  const ketQua = await nguoiDungService.adminCapNhatNhanVien(
    req.params.id,
    req.body,
    req.user.id
  );
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Cập nhật thông tin nhân viên thành công'
  });
}

// Back-Office: Đặt lại mật khẩu nhân viên
async function xuLyAdminDatLaiMatKhauNhanVien(req, res) {
  const ketQua = await nguoiDungService.adminDatLaiMatKhauNhanVien(
    req.params.id,
    req.body.matKhauMoi,
    req.user.id
  );
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Đặt lại mật khẩu nhân viên thành công'
  });
}

// Back-Office: Khóa / mở khóa tài khoản nhân viên
async function xuLyAdminCapNhatTrangThaiNhanVien(req, res) {
  const ketQua = await nguoiDungService.adminCapNhatTrangThaiNhanVien(
    req.params.id,
    req.body.dangHoatDong,
    req.user.id
  );
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Cập nhật trạng thái hoạt động thành công'
  });
}

// Back-Office: Xem chi tiết khách hàng và 5 đơn hàng gần nhất
async function xuLyAdminLayChiTietKhachHang(req, res) {
  const ketQua = await nguoiDungService.adminLayChiTietKhachHang(req.params.id);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy thông tin chi tiết khách hàng thành công'
  });
}

// Back-Office: Cập nhật thông tin khách hàng (họ tên, SĐT, địa chỉ mặc định)
async function xuLyAdminCapNhatKhachHang(req, res) {
  const ketQua = await nguoiDungService.adminCapNhatKhachHang(
    req.params.id,
    req.body,
    req.user.id
  );
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Cập nhật thông tin khách hàng thành công'
  });
}

// Back-Office: Khóa / mở khóa tài khoản khách hàng
async function xuLyAdminCapNhatTrangThaiKhachHang(req, res) {
  const ketQua = await nguoiDungService.adminCapNhatTrangThaiKhachHang(
    req.params.id,
    req.body.dangHoatDong,
    req.user.id
  );
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Cập nhật trạng thái hoạt động thành công'
  });
}

module.exports = {
  xuLyLayHoSo,
  xuLyCapNhatHoSo,
  xuLyDoiMatKhau,
  xuLyAdminLayDanhSachNhanVien,
  xuLyAdminLayDanhSachKhachHang,
  xuLyAdminTaoNhanVien,
  xuLyAdminCapNhatNhanVien,
  xuLyAdminDatLaiMatKhauNhanVien,
  xuLyAdminCapNhatTrangThaiNhanVien,
  xuLyAdminLayChiTietKhachHang,
  xuLyAdminCapNhatKhachHang,
  xuLyAdminCapNhatTrangThaiKhachHang
};
