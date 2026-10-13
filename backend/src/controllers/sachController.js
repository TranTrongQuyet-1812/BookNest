/**
 * Tầng Controller điều phối các yêu cầu liên quan đến sách và quản lý kho.
 */
const sachService = require('../services/sachService');
const { phanHoiThanhCong } = require('../middlewares/phanHoi');

// Lấy danh sách sách công khai (tìm kiếm, lọc, phân trang)
async function xuLyLayDanhSach(req, res) {
  const ketQua = await sachService.layDanhSachSach(req.query);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy danh sách sách thành công'
  });
}

// Lấy danh sách sách dành cho quản trị viên (thấy cả sách đã ẩn)
async function xuLyLayDanhSachAdmin(req, res) {
  const ketQua = await sachService.layDanhSachSach({ ...req.query, laAdmin: true });
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy danh sách sách quản trị thành công'
  });
}

// Lấy chi tiết một cuốn sách
async function xuLyLayChiTiet(req, res) {
  const laAdmin = req.user && ['quan_tri', 'thu_kho', 'thu_thu'].includes(req.user.role);
  const sach = await sachService.layChiTietSach(req.params.id, laAdmin);
  return phanHoiThanhCong(res, {
    duLieu: sach,
    thongDiep: 'Lấy thông tin sách thành công'
  });
}

// Tạo sách mới
async function xuLyTao(req, res) {
  const sachMoi = await sachService.taoSach(req.body, req.user.id);
  return phanHoiThanhCong(res, {
    duLieu: sachMoi,
    thongDiep: 'Thêm sách mới thành công',
    maTrangThai: 201
  });
}

// Cập nhật thông tin sách
async function xuLyCapNhat(req, res) {
  const sach = await sachService.capNhatSach(req.params.id, req.body, req.user.id);
  return phanHoiThanhCong(res, {
    duLieu: sach,
    thongDiep: 'Cập nhật sách thành công'
  });
}

// Xóa mềm sách
async function xuLyXoa(req, res) {
  await sachService.xoaMemSach(req.params.id, req.user.id);
  return phanHoiThanhCong(res, {
    thongDiep: 'Xóa sách thành công'
  });
}

// Nhập kho sách
async function xuLyNhapKho(req, res) {
  const maSach = req.params.id;
  const sach = await sachService.nhapKho(maSach, req.body, req.user.id);
  return phanHoiThanhCong(res, {
    duLieu: sach,
    thongDiep: 'Nhập kho thành công'
  });
}

// Lấy lịch sử nhập kho của cuốn sách
async function xuLyLichSuNhapKho(req, res) {
  const lichSu = await sachService.layLichSuNhapKho(req.params.id);
  return phanHoiThanhCong(res, {
    duLieu: lichSu,
    thongDiep: 'Lấy lịch sử nhập kho thành công'
  });
}

// Lấy toàn bộ lịch sử các đợt nhập kho gần đây cho Back-Office
async function xuLyTatCaLichSuNhapKho(req, res) {
  const lichSu = await sachService.layTatCaLichSuNhapKho();
  return phanHoiThanhCong(res, {
    duLieu: lichSu,
    thongDiep: 'Lấy toàn bộ lịch sử nhập kho thành công'
  });
}

// Lấy danh sách sách sắp hết hàng
async function xuLySapHetHang(req, res) {
  const danhSach = await sachService.layDanhSachSapHetHang(req.query);
  return phanHoiThanhCong(res, {
    duLieu: danhSach,
    thongDiep: 'Lấy danh sách sách sắp hết hàng thành công'
  });
}

async function xuLyDieuChinhTonKho(req, res) {
  const sach = await sachService.dieuChinhTonKho(req.params.id, req.body, req.user.id);
  return phanHoiThanhCong(res, { duLieu: sach, thongDiep: 'Điều chỉnh tồn kho thành công' });
}

async function xuLyLayLichSuDieuChinhKho(req, res) {
  const duLieu = await sachService.layLichSuDieuChinhKho(req.query);
  return phanHoiThanhCong(res, { duLieu, thongDiep: 'Lấy lịch sử điều chỉnh tồn kho thành công' });
}

module.exports = {
  xuLyLayDanhSach,
  xuLyLayDanhSachAdmin,
  xuLyLayChiTiet,
  xuLyTao,
  xuLyCapNhat,
  xuLyXoa,
  xuLyNhapKho,
  xuLyLichSuNhapKho,
  xuLyTatCaLichSuNhapKho,
  xuLySapHetHang,
  xuLyDieuChinhTonKho,
  xuLyLayLichSuDieuChinhKho
};
