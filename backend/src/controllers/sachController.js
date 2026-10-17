/**
 * Tầng Controller điều phối các yêu cầu liên quan đến sách và quản lý kho.
 */
const sachService = require('../services/sachService');
const anhBiaService = require('../services/anhBiaService');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
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

// Lấy danh sách gợi ý tác giả cho nhân viên (AT13)
async function xuLyLayDanhSachTacGia(req, res) {
  const duLieu = await sachService.layDanhSachTacGiaGoiY(req.query);
  return phanHoiThanhCong(res, { duLieu, thongDiep: 'Lấy danh sách tác giả gợi ý thành công' });
}

// Lấy danh sách tên các bộ sách có sẵn (AT06)
async function xuLyLayDanhSachTenBo(req, res) {
  const duLieu = await sachService.layDanhSachTenBoGoiY(req.query);
  return phanHoiThanhCong(res, { duLieu, thongDiep: 'Lấy danh sách tên bộ sách gợi ý thành công' });
}

// Lấy danh sách các tập sách trong bộ (AT06)
async function xuLyLayCacTapTrongBo(req, res) {
  const duLieu = await sachService.layCacTapTrongBo(req.params.id);
  return phanHoiThanhCong(res, { duLieu, thongDiep: 'Lấy danh sách các tập sách trong bộ thành công' });
}

// Tải ảnh bìa lên Cloudinary (AT04)
async function xuLyTaiAnhBia(req, res) {
  if (!req.body || !Buffer.isBuffer(req.body) || req.body.length === 0) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Vui lòng chọn file ảnh để tải lên');
  }
  const ketQua = await anhBiaService.taiAnhBiaLen(req.body);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Tải ảnh bìa thành công',
    maTrangThai: 201
  });
}

// Xóa ảnh bìa vừa tải lên khi lưu sách lỗi (AT05, AT07)
async function xuLyXoaAnhBia(req, res) {
  const { url } = req.body || {};
  if (!url) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Vui lòng cung cấp đường dẫn ảnh cần xóa');
  }
  await anhBiaService.xoaAnhVuaTai(url);
  return phanHoiThanhCong(res, {
    thongDiep: 'Xóa ảnh bìa thành công'
  });
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
  xuLyLayLichSuDieuChinhKho,
  xuLyLayDanhSachTacGia,
  xuLyLayDanhSachTenBo,
  xuLyLayCacTapTrongBo,
  xuLyTaiAnhBia,
  xuLyXoaAnhBia
};
