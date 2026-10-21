/**
 * Định nghĩa các tuyến đường (routes) cho cổng thanh toán VietQR (payOS).
 */
const express = require('express');
const router = express.Router();
const thanhToanController = require('../controllers/thanhToanController');
const { xacThucTuyChon } = require('../middlewares/xacThucToken');
const { chanTaoLink } = require('../middlewares/kiemTraCongTacQR');
const {
  gioiHanDoMaDon,
  gioiHanTaoQr,
  gioiHanTraTrangThaiThanhToan,
  gioiHanWebhook
} = require('../middlewares/gioiHanTanSuat');

// Xác thực tùy chọn dùng chung (cho phép cả khách vãng lai và thành viên): token được đối chiếu với CSDL,
// tài khoản bị khóa hoặc đã đổi mật khẩu thì coi như chưa đăng nhập. Trước đây route này tự giải mã token và tin thẳng nội dung.

// Kiểm tra xem cổng thanh toán QR có đang khả dụng không
router.get('/status-check', thanhToanController.kiemTraKhaDung);
router.get('/options', thanhToanController.kiemTraKhaDung);

// Tạo liên kết và mã QR VietQR cho đơn hàng (định danh bằng mã tra cứu, xem thanhToanController)
router.post('/create-qr/:maTraCuu', gioiHanDoMaDon, gioiHanTaoQr, chanTaoLink, xacThucTuyChon, thanhToanController.taoQrThanhToan);

// Đổi đơn đang chờ chuyển khoản sang COD (trước khi QR hết hạn, hết hạn là đơn bị hủy)
router.post('/switch-to-cod/:maTraCuu', gioiHanDoMaDon, gioiHanTaoQr, xacThucTuyChon, thanhToanController.doiSangCOD);

// Endpoint nhận Webhook trực tiếp từ payOS
router.post('/payos-webhook', gioiHanWebhook, thanhToanController.xuLyWebhook);
router.post('/webhook', gioiHanWebhook, thanhToanController.xuLyWebhook);

// Tra cứu thông tin và trạng thái thanh toán của một đơn hàng
router.get('/order/:maTraCuu', gioiHanDoMaDon, gioiHanTraTrangThaiThanhToan, xacThucTuyChon, thanhToanController.layTrangThaiThanhToan);

module.exports = router;
