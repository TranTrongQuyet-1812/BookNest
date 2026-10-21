/**
 * Tuyến đường (Routes) cho trợ lý AI Chatbot (/api/chat).
 */
const express = require('express');
const { xacThucTuyChon: xacThucTuyChonDungChung } = require('../middlewares/xacThucToken');
const aiChatbotController = require('../controllers/aiChatbotController');
const batLoiAsync = require('../middlewares/batLoiAsync');
const { gioiHanChatbot } = require('../middlewares/gioiHanTanSuat');

const router = express.Router();

/**
 * Nhận diện khách hàng từ req.user do xác thực tùy chọn dùng chung nạp sẵn (đã đối chiếu CSDL: tài khoản còn hoạt động, mật khẩu chưa đổi).
 * Không có token hợp lệ thì vẫn trò chuyện dưới danh nghĩa khách vãng lai.
 * BẢO MẬT & PHÂN QUYỀN: bắt buộc aud === khach_hang; token nhân viên (aud: nhan_vien) tuyệt đối không được gán nhầm thành MaKhachHang.
 */
function nhanDienKhachHang(req, res, next) {
  if (req.user && req.user.aud === 'khach_hang') {
    req.nguoiDung = {
      MaKhachHang: req.user.id,
      maKhachHang: req.user.id,
      ...req.user
    };
  }
  next();
}

/**
 * @swagger
 * /api/chat/status:
 *   get:
 *     summary: Kiểm tra trạng thái hoạt động của trợ lý AI Chatbot
 *     tags: [AI Chatbot]
 *     responses:
 *       200:
 *         description: Trạng thái AI Chatbot
 */
router.get('/status', batLoiAsync(aiChatbotController.layTrangThai));

/**
 * @swagger
 * /api/chat:
 *   post:
 *     summary: Gửi tin nhắn đến AI Chatbot tư vấn BookNest
 *     tags: [AI Chatbot]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tinNhan]
 *             properties:
 *               tinNhan:
 *                 type: string
 *                 example: "Tìm cho tôi sách văn học kinh điển giá dưới 100k"
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *     responses:
 *       200:
 *         description: Phản hồi từ trợ lý AI
 */
router.post('/', gioiHanChatbot, xacThucTuyChonDungChung, nhanDienKhachHang, batLoiAsync(aiChatbotController.guiTinNhan));

module.exports = router;
