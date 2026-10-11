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

// Xử lý đăng nhập tài khoản
async function xuLyDangNhap(req, res) {
  const ketQua = await xacThucService.dangNhap(req.body);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Đăng nhập thành công',
    maTrangThai: 200
  });
}

module.exports = {
  xuLyDangKy,
  xuLyDangNhap
};
