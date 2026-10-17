/**
 * giamGiaController.js - Điều phối các yêu cầu API quản trị giảm giá (GG03)
 */
const giamGiaService = require('../services/giamGiaService');
const { phanHoiThanhCong } = require('../middlewares/phanHoi');

async function xuLyLayDanhSach(req, res) {
  const ketQua = await giamGiaService.layDanhSachChuongTrinh(req.query);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy danh sách chương trình giảm giá thành công'
  });
}

async function xuLyLayChiTiet(req, res) {
  const ketQua = await giamGiaService.layChiTietChuongTrinh(req.params.id);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Lấy chi tiết chương trình giảm giá thành công'
  });
}

async function xuLyTao(req, res) {
  const ketQua = await giamGiaService.taoChuongTrinh(req.body, req.user.id);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Tạo chương trình giảm giá thành công',
    maTrangThai: 201
  });
}

async function xuLyCapNhat(req, res) {
  const ketQua = await giamGiaService.capNhatChuongTrinh(req.params.id, req.body, req.user.id);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: 'Cập nhật chương trình giảm giá thành công'
  });
}

async function xuLyToggle(req, res) {
  const ketQua = await giamGiaService.toggleTrangThai(req.params.id, req.user.id);
  return phanHoiThanhCong(res, {
    duLieu: ketQua,
    thongDiep: ketQua.dangHoatDong ? 'Đã kích hoạt chương trình giảm giá' : 'Đã tạm dừng chương trình giảm giá'
  });
}

module.exports = {
  xuLyLayDanhSach,
  xuLyLayChiTiet,
  xuLyTao,
  xuLyCapNhat,
  xuLyToggle
};
