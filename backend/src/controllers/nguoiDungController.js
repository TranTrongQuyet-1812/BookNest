/**
 * Tầng Controller điều phối các yêu cầu xem/sửa thông tin hồ sơ và đổi mật khẩu người dùng.
 */
const nguoiDungService = require('../services/nguoiDungService');
const { phanHoiThanhCong } = require('../middlewares/phanHoi');

// Lấy thông tin hồ sơ của người dùng đang đăng nhập
async function xuLyLayHoSo(req, res) {
  const ketQua = await nguoiDungService.layThongTinHoSo(req.user.id);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy thông tin hồ sơ thành công'
  });
}

// Cập nhật thông tin hồ sơ
async function xuLyCapNhatHoSo(req, res) {
  const ketQua = await nguoiDungService.capNhatHoSo(req.user.id, req.body);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Cập nhật thông tin hồ sơ thành công'
  });
}

// Đổi mật khẩu
async function xuLyDoiMatKhau(req, res) {
  await nguoiDungService.doiMatKhau(req.user.id, req.body);
  return phanHoiThanhCong(res, {
    thongDiep: 'Đổi mật khẩu thành công'
  });
}

// Back-Office: Danh sách người dùng
async function xuLyAdminLayDanhSach(req, res) {
  const ketQua = await nguoiDungService.adminLayDanhSachNguoiDung(req.query);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy danh sách người dùng thành công'
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

// Back-Office: Khóa / mở khóa tài khoản
async function xuLyAdminCapNhatTrangThaiKhoa(req, res) {
  const ketQua = await nguoiDungService.adminCapNhatTrangThaiKhoa(
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
  xuLyAdminLayDanhSach,
  xuLyAdminTaoNhanVien,
  xuLyAdminCapNhatTrangThaiKhoa
};
