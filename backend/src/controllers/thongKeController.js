/**
 * Tầng Controller điều phối các yêu cầu thống kê báo cáo cho Admin.
 */
const thongKeService = require('../services/thongKeService');
const { phanHoiThanhCong } = require('../middlewares/phanHoi');

// Xem tổng quan doanh thu
async function xuLyLayTongQuan(req, res) {
  const ketQua = await thongKeService.layTongQuanDoanhThu(req.query);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy thống kê tổng quan doanh thu thành công'
  });
}

// Xem top sách bán chạy
async function xuLyLayTopSach(req, res) {
  const ketQua = await thongKeService.layTopSachBanChay(req.query);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy danh sách sách bán chạy thành công'
  });
}

// Xem tỷ lệ đơn hàng
async function xuLyLayTyLeDon(req, res) {
  const ketQua = await thongKeService.layTyLeDonHang();
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy tỷ lệ trạng thái đơn hàng thành công'
  });
}

module.exports = {
  xuLyLayTongQuan,
  xuLyLayTopSach,
  xuLyLayTyLeDon
};
