/**
 * Tầng Controller điều phối các yêu cầu cho quản lý danh mục thể loại sách.
 */
const danhMucService = require('../services/danhMucService');
const { phanHoiThanhCong } = require('../middlewares/phanHoi');

// Lấy danh sách toàn bộ danh mục
async function xuLyLayDanhSach(req, res) {
  const danhSach = await danhMucService.layDanhSachDanhMuc();
  return phanHoiThanhCong(res, {
    duLieu: danhSach,
    thongDiep: 'Lấy danh sách danh mục thành công'
  });
}

// Lấy chi tiết một danh mục
async function xuLyLayChiTiet(req, res) {
  const danhMuc = await danhMucService.layChiTietDanhMuc(req.params.id);
  return phanHoiThanhCong(res, {
    duLieu: danhMuc,
    thongDiep: 'Lấy thông tin danh mục thành công'
  });
}

// Tạo danh mục mới
async function xuLyTao(req, res) {
  const danhMucMoi = await danhMucService.taoDanhMuc(req.body, req.user.id);
  return phanHoiThanhCong(res, {
    duLieu: danhMucMoi,
    thongDiep: 'Tạo danh mục mới thành công',
    maTrangThai: 201
  });
}

// Cập nhật danh mục
async function xuLyCapNhat(req, res) {
  const danhMuc = await danhMucService.capNhatDanhMuc(req.params.id, req.body, req.user.id);
  return phanHoiThanhCong(res, {
    duLieu: danhMuc,
    thongDiep: 'Cập nhật danh mục thành công'
  });
}

// Xóa danh mục
async function xuLyXoa(req, res) {
  await danhMucService.xoaDanhMuc(req.params.id, req.user.id);
  return phanHoiThanhCong(res, {
    thongDiep: 'Xóa danh mục thành công'
  });
}

module.exports = {
  xuLyLayDanhSach,
  xuLyLayChiTiet,
  xuLyTao,
  xuLyCapNhat,
  xuLyXoa
};
