/**
 * Tiện ích chuẩn hóa cấu trúc phản hồi HTTP cho toàn bộ hệ thống API BookNest.
 * Giúp mã nguồn Controller ngắn gọn, nhất quán và dễ bảo trì.
 */

// Hàm phản hồi thành công chuẩn
function phanHoiThanhCong(res, { duLieu = null, thongDiep = 'Thành công', maTrangThai = 200 }) {
  return res.status(maTrangThai).json({
    success: true,
    message: thongDiep,
    data: duLieu
  });
}

// Hàm phản hồi thất bại chuẩn
function phanHoiLoi(res, { thongDiep = 'Yêu cầu thất bại', maTrangThai = 400, danhSachLoi = null }) {
  const ketQua = {
    success: false,
    message: thongDiep
  };

  if (danhSachLoi) {
    ketQua.errors = danhSachLoi;
  }

  return res.status(maTrangThai).json(ketQua);
}

module.exports = {
  phanHoiThanhCong,
  phanHoiLoi
};
