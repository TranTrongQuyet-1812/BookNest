/**
 * Chặn thanh toán QR ngay ở máy chủ khi Quản trị viên đã tắt công tắc THANH_TOAN_QR_BAT.
 * Ẩn nút ở giao diện chỉ để khách đỡ bối rối; chặn thật phải nằm ở đây, vì ai mở DevTool hoặc gọi API trực tiếp
 * cũng có thể bỏ qua giao diện.
 *
 * - chanTaoLink: dùng cho API tạo link QR, tắt là từ chối luôn
 * - chanKhiChonQR: dùng cho API đặt đơn, chỉ từ chối khi khách chọn phương thức QR (chọn COD vẫn đặt bình thường)
 */
const payosService = require('../services/payosService');
const LoiNghiepVu = require('./loiNghiepVu');
const batLoiAsync = require('./batLoiAsync');

async function tuChoiNeuQRDangTat() {
  if (!(await payosService.kiemTraCongTacQRDangBat())) {
    throw LoiNghiepVu.camTruyCap(payosService.THONG_DIEP_QR_DANG_TAT);
  }
}

const chanTaoLink = batLoiAsync(async (req, res, next) => {
  await tuChoiNeuQRDangTat();
  next();
});

const chanKhiChonQR = batLoiAsync(async (req, res, next) => {
  if (req.body?.phuongThucThanhToan === 'CHUYEN_KHOAN_QR') await tuChoiNeuQRDangTat();
  next();
});

module.exports = { chanTaoLink, chanKhiChonQR };
