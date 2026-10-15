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

// Back-Office: Xem danh sách kiểm duyệt đánh giá toàn hệ thống (Task T38)
async function xuLyLayDanhSachAdmin(req, res) {
  const ketQua = await danhGiaService.layDanhSachDanhGiaAdmin(req.query);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy danh sách đánh giá quản trị thành công'
  });
}

// Back-Office: Ẩn hoặc Bỏ ẩn một đánh giá
async function xuLyAnHienDanhGia(req, res) {
  const maDanhGia = parseInt(req.params.id, 10);
  const { daAn, lyDo } = req.body;
  const danhGia = await danhGiaService.anHienDanhGia(maDanhGia, daAn, req.user?.id, lyDo);
  return phanHoiThanhCong(res, {
    duLieu: danhGia,
    thongDiep: daAn ? 'Đã ẩn đánh giá khỏi giao diện' : 'Đã khôi phục hiển thị đánh giá'
  });
}

// Back-Office: Xóa vĩnh viễn đánh giá rác/spam
async function xuLyXoaDanhGia(req, res) {
  const maDanhGia = parseInt(req.params.id, 10);
  const ketQua = await danhGiaService.xoaDanhGia(maDanhGia, req.user?.id);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Đã xóa vĩnh viễn đánh giá thành công'
  });
}

module.exports = {
  xuLyLayDanhSachDanhGia,
  xuLyTaoHoacCapNhatDanhGia,
  xuLyLayDanhSachAdmin,
  xuLyAnHienDanhGia,
  xuLyXoaDanhGia
};
