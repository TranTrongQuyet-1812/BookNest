/**
 * Hằng và hàm dùng chung cho thanh toán chuyển khoản QR (đặt đơn và tạo link đều cần).
 */
const crypto = require('crypto');

// Thời gian giữ đơn chờ chuyển khoản; quá hạn mà chưa trả tiền thì đơn bị hủy (xem hetHanThanhToanService)
const HAN_THANH_TOAN_QR_PHUT = 15;
const HAN_THANH_TOAN_QUAY_PHUT = 5;

function tinhNgayHetHan(soPhut = HAN_THANH_TOAN_QR_PHUT) {
  return new Date(Date.now() + soPhut * 60 * 1000);
}

function tinhNgayHetHanQuay() {
  return tinhNgayHetHan(HAN_THANH_TOAN_QUAY_PHUT);
}

/**
 * Sinh mã giao dịch orderCode kiểu số nguyên duy nhất cho payOS (tối đa 9007199254740991).
 * Không dùng MaDonHang để orderCode (hiện trên trang payOS/sao kê) không lộ số đơn của cửa hàng:
 * mili giây * 1000 + 3 số ngẫu nhiên (khoảng 16 chữ số, vẫn dưới giới hạn); cột MaGiaoDichPayos có ràng buộc duy nhất.
 */
function sinhMaGiaoDich() {
  return Date.now() * 1000 + crypto.randomInt(1000);
}

module.exports = {
  HAN_THANH_TOAN_QR_PHUT,
  HAN_THANH_TOAN_QUAY_PHUT,
  tinhNgayHetHan,
  tinhNgayHetHanQuay,
  sinhMaGiaoDich
};
