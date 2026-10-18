/**
 * Tầng Controller điều phối các yêu cầu thống kê báo cáo cho Admin.
 */
const thongKeService = require('../services/thongKeService');
const sachService = require('../services/sachService');
const { phanHoiThanhCong } = require('../middlewares/phanHoi');

// Xem tổng quan doanh thu (hỗ trợ lọc theo kenhBan, tuNgay, denNgay)
async function xuLyLayTongQuan(req, res) {
  const ketQua = await thongKeService.layTongQuanDoanhThu(req.query);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy thống kê tổng quan doanh thu thành công'
  });
}

// Xem top sách bán chạy (hỗ trợ lọc theo kenhBan, limit)
async function xuLyLayTopSach(req, res) {
  const ketQua = await thongKeService.layTopSachBanChay(req.query);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy danh sách sách bán chạy thành công'
  });
}

// Xem tỷ lệ đơn hàng (hỗ trợ lọc theo kenhBan)
async function xuLyLayTyLeDon(req, res) {
  const ketQua = await thongKeService.layTyLeDonHang(req.query);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy tỷ lệ trạng thái đơn hàng thành công'
  });
}

// Xem chuỗi thời gian doanh thu (revenue-series) theo day hoặc month
async function xuLyLayChuoiDoanhThu(req, res) {
  const ketQua = await thongKeService.layDoanhThuTheoChuoi(req.query);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy chuỗi doanh thu theo thời gian thành công'
  });
}

// Xem doanh thu theo danh mục thể loại (by-category)
async function xuLyLayTheoDanhMuc(req, res) {
  const ketQua = await thongKeService.layDoanhThuTheoDanhMuc(req.query);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy thống kê doanh thu theo thể loại thành công'
  });
}

// Báo cáo tồn kho
async function xuLyLayBaoCaoKho(req, res) {
  const ketQua = await sachService.layBaoCaoKho();
  return phanHoiThanhCong(res, { duLieu: ketQua, thongDiep: 'Lấy báo cáo tồn kho thành công' });
}

module.exports = {
  xuLyLayTongQuan,
  xuLyLayTopSach,
  xuLyLayTyLeDon,
  xuLyLayChuoiDoanhThu,
  xuLyLayTheoDanhMuc,
  xuLyLayBaoCaoKho
};
