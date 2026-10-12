/**
 * Tầng Controller điều phối các nghiệp vụ đặt hàng, xem đơn và quản lý đơn hàng.
 */
const donHangService = require('../services/donHangService');
const { phanHoiThanhCong } = require('../middlewares/phanHoi');

// Khách hàng đặt hàng từ giỏ hàng
async function xuLyDatHang(req, res) {
  const donHang = await donHangService.datHang(req.user.id, req.body);
  return phanHoiThanhCong(res, {
    duLieu: donHang,
    thongDiep: 'Đặt hàng thành công',
    maTrangThai: 201
  });
}

// Khách vãng lai (Guest) đặt hàng trực tiếp
async function xuLyDatHangKhachVangLai(req, res) {
  const ketQua = await donHangService.datHangKhachVangLai(req.body);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Đặt hàng thành công',
    maTrangThai: 201
  });
}

// Khách hàng xem danh sách đơn hàng cá nhân
async function xuLyLayDanhSachDonCuaKhach(req, res) {
  const ketQua = await donHangService.layDanhSachDonKhach(req.user.id, req.query);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy danh sách đơn hàng thành công'
  });
}

// Khách hàng xem chi tiết đơn hàng (đã qua middleware kiemTraChuDon)
async function xuLyLayChiTietDonCuaKhach(req, res) {
  const donHang = await donHangService.layChiTietDonHang(req.params.id);
  return phanHoiThanhCong(res, {
    duLieu: donHang,
    thongDiep: 'Lấy chi tiết đơn hàng thành công'
  });
}

// Khách hàng tự hủy đơn hàng
async function xuLyKhachHuyDon(req, res) {
  const donHang = await donHangService.khachHuyDon(req.params.id, req.user.id, req.body.lyDo);
  return phanHoiThanhCong(res, {
    duLieu: donHang,
    thongDiep: 'Hủy đơn hàng thành công'
  });
}

// Back-Office: Nhân viên/Admin xem danh sách đơn toàn hệ thống
async function xuLyAdminLayDanhSachDon(req, res) {
  const ketQua = await donHangService.adminLayDanhSachDon(req.query);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy danh sách đơn hàng hệ thống thành công'
  });
}

// Back-Office: Nhân viên/Admin xem chi tiết một đơn hàng
async function xuLyAdminLayChiTietDon(req, res) {
  const donHang = await donHangService.layChiTietDonHang(req.params.id);
  return phanHoiThanhCong(res, {
    duLieu: donHang,
    thongDiep: 'Lấy chi tiết đơn hàng thành công'
  });
}

// Back-Office: Cập nhật trạng thái đơn hàng (State machine)
async function xuLyAdminCapNhatTrangThai(req, res) {
  const { trangThaiMoi, ghiChu } = req.body;
  const donHang = await donHangService.adminCapNhatTrangThai(
    req.params.id,
    trangThaiMoi,
    ghiChu,
    req.user.id
  );
  return phanHoiThanhCong(res, {
    duLieu: donHang,
    thongDiep: 'Cập nhật trạng thái đơn hàng thành công'
  });
}

// Back-Office: Nhân viên hủy đơn hàng
async function xuLyAdminHuyDon(req, res) {
  const donHang = await donHangService.adminHuyDon(
    req.params.id,
    req.body.lyDo,
    req.user.id
  );
  return phanHoiThanhCong(res, {
    duLieu: donHang,
    thongDiep: 'Hủy đơn hàng thành công'
  });
}

module.exports = {
  xuLyDatHang,
  xuLyDatHangKhachVangLai,
  xuLyLayDanhSachDonCuaKhach,
  xuLyLayChiTietDonCuaKhach,
  xuLyKhachHuyDon,
  xuLyAdminLayDanhSachDon,
  xuLyAdminLayChiTietDon,
  xuLyAdminCapNhatTrangThai,
  xuLyAdminHuyDon
};
