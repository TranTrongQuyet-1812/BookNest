/**
 * Tầng Controller điều phối các yêu cầu xem và viết đánh giá sách.
 */
const danhGiaService = require('../services/danhGiaService');
const { phanHoiThanhCong } = require('../middlewares/phanHoi');

// Xem danh sách đánh giá công khai của một cuốn sách
async function xuLyLayDanhSachDanhGia(req, res) {
  const maSach = parseInt(req.params.id, 10);
  const ketQua = await danhGiaService.layDanhSachDanhGia(maSach, req.query);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy danh sách đánh giá thành công'
  });
}

// Khách hàng viết hoặc sửa đánh giá cho sách
async function xuLyTaoHoacCapNhatDanhGia(req, res) {
  const maSach = parseInt(req.params.id, 10);
  const danhGia = await danhGiaService.taoHoacCapNhatDanhGia(req.user.id, maSach, req.body);
  return phanHoiThanhCong(res, {
    duLieu: danhGia,
    thongDiep: 'Đánh giá sách thành công',
    maTrangThai: 201
  });
}

module.exports = {
  xuLyLayDanhSachDanhGia,
  xuLyTaoHoacCapNhatDanhGia
};
