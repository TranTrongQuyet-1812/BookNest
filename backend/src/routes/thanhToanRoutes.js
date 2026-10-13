/**
 * Định nghĩa các tuyến đường (routes) cho cổng thanh toán VietQR (payOS).
 */
const express = require('express');
const router = express.Router();
const thanhToanController = require('../controllers/thanhToanController');
const jwt = require('jsonwebtoken');
const cauHinh = require('../config/cauHinh');
const {
  gioiHanDoMaDon,
  gioiHanTaoQr,
  gioiHanTraTrangThaiThanhToan,
  gioiHanWebhook
} = require('../middlewares/gioiHanTanSuat');

// Middleware xác thực tùy chọn (cho phép cả khách vãng lai và thành viên)
function xacThucTuyChon(req, res, next) {
  const chuoiHeader = req.headers.authorization;
  if (chuoiHeader && chuoiHeader.startsWith('Bearer ')) {
    const token = chuoiHeader.split(' ')[1];
    try {
      const duLieu = jwt.verify(token, cauHinh.jwt.biMat);
      req.user = duLieu;
    } catch (e) {
      // Bỏ qua lỗi token nếu là tùy chọn
    }
  }
  next();
}

// Kiểm tra xem cổng thanh toán QR có đang khả dụng không
router.get('/status-check', thanhToanController.kiemTraKhaDung);
router.get('/options', thanhToanController.kiemTraKhaDung);

// Tạo liên kết và mã QR VietQR cho đơn hàng (định danh bằng mã tra cứu, xem thanhToanController)
router.post('/create-qr/:maTraCuu', gioiHanDoMaDon, gioiHanTaoQr, xacThucTuyChon, thanhToanController.taoQrThanhToan);

// Endpoint nhận Webhook trực tiếp từ payOS
router.post('/payos-webhook', gioiHanWebhook, thanhToanController.xuLyWebhook);
router.post('/webhook', gioiHanWebhook, thanhToanController.xuLyWebhook);

// Tra cứu thông tin và trạng thái thanh toán của một đơn hàng
router.get('/order/:maTraCuu', gioiHanDoMaDon, gioiHanTraTrangThaiThanhToan, thanhToanController.layTrangThaiThanhToan);

module.exports = router;
