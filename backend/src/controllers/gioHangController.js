/**
 * Tầng Controller điều phối các yêu cầu giỏ hàng của khách hàng.
 */
const gioHangService = require('../services/gioHangService');
const { phanHoiThanhCong } = require('../middlewares/phanHoi');

// Lấy toàn bộ giỏ hàng của khách
async function xuLyLayGioHang(req, res) {
  const gioHang = await gioHangService.layGioHang(req.user.id);
  return phanHoiThanhCong(res, {
    duLieu: gioHang,
    thongDiep: 'Lấy giỏ hàng thành công'
  });
}

// Thêm sách vào giỏ
async function xuLyThemVaoGio(req, res) {
  const ketQua = await gioHangService.themVaoGio(req.user.id, req.body);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Thêm sách vào giỏ hàng thành công',
    maTrangThai: 201
  });
}

// Cập nhật số lượng sách trong giỏ
async function xuLyCapNhatSoLuong(req, res) {
  const maSach = parseInt(req.params.bookId, 10);
  const ketQua = await gioHangService.capNhatSoLuong(req.user.id, maSach, req.body.soLuong);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Cập nhật số lượng thành công'
  });
}

// Xóa một cuốn sách khỏi giỏ hàng
async function xuLyXoaKhoiGio(req, res) {
  const maSach = parseInt(req.params.bookId, 10);
  await gioHangService.xoaKhoiGio(req.user.id, maSach);
  return phanHoiThanhCong(res, {
    thongDiep: 'Xóa sách khỏi giỏ hàng thành công'
  });
}

// Xóa toàn bộ giỏ hàng
async function xuLyXoaToanBoGioHang(req, res) {
  await gioHangService.xoaToanBoGioHang(req.user.id);
  return phanHoiThanhCong(res, {
    thongDiep: 'Dọn sạch giỏ hàng thành công'
  });
}

module.exports = {
  xuLyLayGioHang,
  xuLyThemVaoGio,
  xuLyCapNhatSoLuong,
  xuLyXoaKhoiGio,
  xuLyXoaToanBoGioHang
};
