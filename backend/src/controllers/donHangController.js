/**
 * Tầng Controller điều phối các nghiệp vụ đặt hàng, xem đơn và quản lý đơn hàng.
 */
const donHangService = require('../services/donHangService');
const { phanHoiThanhCong } = require('../middlewares/phanHoi');
const { anMaNoiBoDonHang } = require('../utils/maTraCuu');

// Khách hàng đặt hàng từ giỏ hàng
async function xuLyDatHang(req, res) {
  const donHang = await donHangService.datHang(req.user.id, req.body);
  return phanHoiThanhCong(res, {
    duLieu: anMaNoiBoDonHang(donHang),
    thongDiep: 'Đặt hàng thành công',
    maTrangThai: 201
  });
}

// Khách vãng lai (Guest) đặt hàng trực tiếp
async function xuLyDatHangKhachVangLai(req, res) {
  const ketQua = await donHangService.datHangKhachVangLai(req.body);
  return phanHoiThanhCong(res, {
    duLieu: anMaNoiBoDonHang(ketQua),
    thongDiep: 'Đặt hàng thành công',
    maTrangThai: 201
  });
}

// Khách hàng xem danh sách đơn hàng cá nhân
async function xuLyLayDanhSachDonCuaKhach(req, res) {
  const ketQua = await donHangService.layDanhSachDonKhach(req.user.id, req.query);
  return phanHoiThanhCong(res, {
    duLieu: anMaNoiBoDonHang(ketQua),
    thongDiep: 'Lấy danh sách đơn hàng thành công'
  });
}

// Khách hàng xem chi tiết đơn hàng (đã qua middleware kiemTraChuDon)
async function xuLyLayChiTietDonCuaKhach(req, res) {
  // req.params.id là mã tra cứu; middleware đã tìm sẵn đơn nên dùng mã nội bộ từ req.donHang
  const donHang = await donHangService.layChiTietDonHang(req.donHang.MaDonHang);
  return phanHoiThanhCong(res, {
    duLieu: anMaNoiBoDonHang(donHang),
    thongDiep: 'Lấy chi tiết đơn hàng thành công'
  });
}

// Khách hàng tự hủy đơn hàng
async function xuLyKhachHuyDon(req, res) {
  const donHang = await donHangService.khachHuyDon(req.donHang.MaDonHang, req.user.id, req.body.lyDo);
  return phanHoiThanhCong(res, {
    duLieu: anMaNoiBoDonHang(donHang),
    thongDiep: 'Hủy đơn hàng thành công'
  });
}

// Back-Office: Nhân viên/Admin xem danh sách đơn toàn hệ thống
async function xuLyAdminLayDanhSachDon(req, res) {
  const ketQua = await donHangService.adminLayDanhSachDon({ ...req.query, vaiTro: req.user.role });
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy danh sách đơn hàng hệ thống thành công'
  });
}

// Bán tại quầy bằng tài khoản nhân viên.
async function xuLyTaoDonQuay(req, res) {
  const donHang = await donHangService.taoDonQuay(req.body, req.user.id);
  return phanHoiThanhCong(res, {
    duLieu: donHang,
    thongDiep: 'Bán hàng tại quầy thành công',
    maTrangThai: 201
  });
}

async function xuLyLayDanhSachDonQuay(req, res) {
  const ketQua = await donHangService.layDanhSachDonQuay(req.user.id, req.user.role, req.query);
  return phanHoiThanhCong(res, { duLieu: ketQua, thongDiep: 'Lấy lịch sử bán tại quầy thành công' });
}

async function xuLyLayChiTietDonQuay(req, res) {
  const donHang = await donHangService.layChiTietDonQuay(req.params.id, req.user.id, req.user.role);
  return phanHoiThanhCong(res, { duLieu: donHang, thongDiep: 'Lấy chi tiết đơn quầy thành công' });
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

// Back-Office: Danh sách đơn hàng cần soạn (Pick list)
async function xuLyLayDanhSachDonCanSoan(req, res) {
  const duLieu = await donHangService.layDanhSachDonCanSoan();
  return phanHoiThanhCong(res, {
    duLieu,
    thongDiep: 'Lấy danh sách đơn cần soạn thành công'
  });
}

module.exports = {
  xuLyDatHang,
  xuLyDatHangKhachVangLai,
  xuLyLayDanhSachDonCuaKhach,
  xuLyLayChiTietDonCuaKhach,
  xuLyKhachHuyDon,
  xuLyAdminLayDanhSachDon,
  xuLyTaoDonQuay,
  xuLyLayDanhSachDonQuay,
  xuLyLayChiTietDonQuay,
  xuLyAdminLayChiTietDon,
  xuLyAdminCapNhatTrangThai,
  xuLyAdminHuyDon,
  xuLyLayDanhSachDonCanSoan
};
