/**
 * Tuyến đường (Routes) cho trợ lý AI Chatbot (/api/chat).
 */
const express = require('express');
const jwt = require('jsonwebtoken');
const cauHinh = require('../config/cauHinh');
const aiChatbotController = require('../controllers/aiChatbotController');
const batLoiAsync = require('../middlewares/batLoiAsync');
const { gioiHanChatbot } = require('../middlewares/gioiHanTanSuat');

const router = express.Router();

/**
 * Middleware xác thực tùy chọn: Nhận diện khách hàng nếu có token hợp lệ,
 * nếu không có token thì vẫn cho phép trò chuyện dưới danh nghĩa khách vãng lai.
 */
function xacThucTuyChon(req, res, next) {
  const chuoiHeader = req.headers.authorization;
  if (chuoiHeader && chuoiHeader.startsWith('Bearer ')) {
    const token = chuoiHeader.split(' ')[1];
    try {
      const duLieuGiaiMa = jwt.verify(token, cauHinh.jwt.biMat);
      req.nguoiDung = {
        MaKhachHang: duLieuGiaiMa.id,
        maKhachHang: duLieuGiaiMa.id,
        ...duLieuGiaiMa
      };
    } catch (e) {
      // Token lỗi hoặc hết hạn thì xem như khách vãng lai bình thường
    }
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
router.post('/', gioiHanChatbot, xacThucTuyChon, batLoiAsync(aiChatbotController.guiTinNhan));

module.exports = router;
