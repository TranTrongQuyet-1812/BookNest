const lichSuService = require('../services/lichSuQuanTriService');
const { phanHoiThanhCong } = require('../middlewares/phanHoi');

async function xuLyLayDanhSach(req, res) {
  const duLieu = await lichSuService.layDanhSach(req.query);
  return phanHoiThanhCong(res, { duLieu, thongDiep: 'Lấy lịch sử thay đổi thành công' });
}

async function xuLyXemTruocDonDep(req, res) {
  const duLieu = await lichSuService.xemTruocDonDep(req.body.truocNgay);
  return phanHoiThanhCong(res, { duLieu, thongDiep: 'Đã đếm dữ liệu theo mốc dọn dẹp' });
}

async function xuLyDonDep(req, res) {
  const duLieu = await lichSuService.donDepLichSu(req.body.truocNgay);
  return phanHoiThanhCong(res, { duLieu, thongDiep: 'Đã lưu trữ và dọn lịch sử' });
}

module.exports = { xuLyLayDanhSach, xuLyXemTruocDonDep, xuLyDonDep };
