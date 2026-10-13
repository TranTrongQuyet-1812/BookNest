/**
 * Tầng Controller điều phối yêu cầu HTTP cho các chức năng xác thực.
 * Nhận request, gọi Service và trả về response chuẩn qua phanHoiThanhCong.
 */
const xacThucService = require('../services/xacThucService');
const { phanHoiThanhCong } = require('../middlewares/phanHoi');

// Xử lý đăng ký tài khoản khách hàng
async function xuLyDangKy(req, res) {
  const ketQua = await xacThucService.dangKy(req.body);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Đăng ký tài khoản thành công',
    maTrangThai: 201
  });
}

// Xử lý đăng nhập của khách hàng
async function xuLyDangNhapKhachHang(req, res) {
  const ketQua = await xacThucService.dangNhapKhachHang(req.body);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Đăng nhập thành công',
    maTrangThai: 200
  });
}

// Xử lý đăng nhập của nhân viên (cổng Back-Office)
async function xuLyDangNhapNhanVien(req, res) {
  const ketQua = await xacThucService.dangNhapNhanVien(req.body);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Đăng nhập thành công',
    maTrangThai: 200
  });
}

// Xử lý gửi mã OTP quên mật khẩu
async function xuLyQuenMatKhau(req, res) {
  const { email } = req.body;
  const ketQua = await xacThucService.guiOtpQuenMatKhau(email);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: ketQua.thongBao,
    maTrangThai: 200
  });
}

// Xử lý kiểm tra mã OTP
async function xuLyXacMinhOtp(req, res) {
  const { email, maOtp } = req.body;
  const ketQua = await xacThucService.xacMinhOtpQuenMatKhau(email, maOtp);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Mã xác nhận hợp lệ',
    maTrangThai: 200
  });
}

// Xử lý đặt lại mật khẩu mới
async function xuLyDatLaiMatKhau(req, res) {
  const { email, maOtp, matKhauMoi } = req.body;
  const ketQua = await xacThucService.datLaiMatKhau(email, maOtp, matKhauMoi);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: ketQua.thongBao,
    maTrangThai: 200
  });
}

module.exports = {
  xuLyDangKy,
  xuLyDangNhapKhachHang,
  xuLyDangNhapNhanVien,
  xuLyQuenMatKhau,
  xuLyXacMinhOtp,
  xuLyDatLaiMatKhau
};
