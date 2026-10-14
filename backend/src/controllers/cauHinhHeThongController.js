const cauHinhHeThongService = require('../services/cauHinhHeThongService');
const { phanHoiThanhCong } = require('../middlewares/phanHoi');

async function xuLyLayDanhSach(req, res) {
  const duLieu = await cauHinhHeThongService.layDanhSachCongTac();
  return phanHoiThanhCong(res, { duLieu, thongDiep: 'Lấy danh sách công tắc hệ thống thành công' });
}

async function xuLyDatCongTac(req, res) {
  const duLieu = await cauHinhHeThongService.datCongTac(req.params.khoa, req.body.bat, req.user.id);
  return phanHoiThanhCong(res, { duLieu, thongDiep: duLieu.bat ? 'Đã bật công tắc' : 'Đã tắt công tắc' });
}

module.exports = { xuLyLayDanhSach, xuLyDatCongTac };
