/**
 * Giới hạn tần suất (Rate Limit) cho các API công khai, đếm theo địa chỉ IP.
 * Mục đích: chống dò mã đơn, chống spam đặt đơn ảo (trừ kho) và spam tạo link thanh toán, giữ tài nguyên máy chủ.
 * Đăng nhập có bộ giới hạn riêng trong routes/xacThucRoutes.js (tách theo cổng khách / nhân viên).
 *
 * LƯU Ý IP: đứng sau reverse proxy hoặc ngrok thì phải đặt TRUST_PROXY trong .env (số lớp proxy), nếu không mọi khách
 * đều có chung một IP (127.0.0.1) và dùng chung một bộ đếm. Xem app.set('trust proxy') trong app.js.
 * Bộ đếm nằm trong bộ nhớ của tiến trình: khởi động lại server hoặc chạy nhiều tiến trình thì đếm lại từ đầu
 * (đủ cho quy mô hiện tại; khi mở rộng nhiều máy nên chuyển sang kho dùng chung như Redis).
 *
 * Dùng lại cho AI Chatbot sau này: gọi taoGioiHan({...}) với số tin nhắn mỗi phút/mỗi IP theo KE_HOACH_AI_CHATBOT.md.
 */
const rateLimit = require('express-rate-limit');

const laMoiTruongTest = process.env.NODE_ENV === 'test';

/**
 * Tạo một bộ giới hạn.
 * - cuaSoPhut: độ dài cửa sổ đếm (phút); toiDa: số request tối đa trong cửa sổ
 * - chiTinhLoi: true thì chỉ đếm request thất bại (mã trạng thái >= 400), request thành công không bị tính;
 *   dùng cho chống dò mã, vì khách dùng đúng mã không bao giờ chạm giới hạn
 * - boQuaKhiTest: môi trường test nới giới hạn để các bộ test không tự chặn nhau
 */
function taoGioiHan({ cuaSoPhut, toiDa, thongDiep, chiTinhLoi = false, boQuaKhiTest = true }) {
  return rateLimit({
    windowMs: cuaSoPhut * 60 * 1000,
    limit: boQuaKhiTest && laMoiTruongTest ? 100000 : toiDa,
    skipSuccessfulRequests: chiTinhLoi,
    standardHeaders: true, // trả RateLimit-* và Retry-After để client biết chờ bao lâu
    legacyHeaders: false,
    message: { success: false, message: thongDiep }
  });
}

// Lưới an toàn chung cho toàn bộ /api: rộng rãi, chỉ chặn kiểu tải bất thường (một trang web thường chỉ vài chục request)
const gioiHanChung = taoGioiHan({
  cuaSoPhut: 1,
  toiDa: 600,
  thongDiep: 'Bạn gửi yêu cầu quá nhanh. Vui lòng thử lại sau ít phút.'
});

// Chống dò mã đơn: chỉ đếm lần thất bại (mã sai, đơn không tồn tại). Khách nhập đúng mã không bao giờ bị tính.
const gioiHanDoMaDon = taoGioiHan({
  cuaSoPhut: 15,
  toiDa: 20,
  chiTinhLoi: true,
  thongDiep: 'Bạn đã nhập sai mã đơn quá nhiều lần. Vui lòng thử lại sau 15 phút.'
});

// Đặt đơn khách vãng lai: mỗi đơn trừ kho thật, nên chặn spam đơn ảo
const gioiHanDatDonVangLai = taoGioiHan({
  cuaSoPhut: 60,
  toiDa: 10,
  thongDiep: 'Bạn đặt hàng quá nhiều lần trong một giờ. Vui lòng thử lại sau hoặc liên hệ cửa hàng.'
});

// Tạo link thanh toán QR: mỗi lần gọi một request sang payOS, nên giữ ở mức vừa đủ cho việc thử lại
const gioiHanTaoQr = taoGioiHan({
  cuaSoPhut: 10,
  toiDa: 10,
  thongDiep: 'Bạn tạo mã thanh toán quá nhiều lần. Vui lòng thử lại sau ít phút.'
});

// Thăm dò trạng thái thanh toán: khung QR gọi mỗi 3 giây (khoảng 20 lần/phút/khách), chừa chỗ cho nhiều khách cùng IP
const gioiHanTraTrangThaiThanhToan = taoGioiHan({
  cuaSoPhut: 1,
  toiDa: 120,
  thongDiep: 'Bạn kiểm tra trạng thái quá nhanh. Vui lòng đợi vài giây rồi thử lại.'
});

// Webhook payOS đã xác minh chữ ký; giới hạn để kẻ gửi giả không làm phình bảng NhatKyWebhookPayos
const gioiHanWebhook = taoGioiHan({
  cuaSoPhut: 1,
  toiDa: 120,
  thongDiep: 'Quá nhiều yêu cầu webhook.'
});

// Giới hạn tần suất cho AI Chatbot: tránh spam câu hỏi làm cạn token và quá tải server (20 câu hỏi/phút/IP)
const gioiHanChatbot = taoGioiHan({
  cuaSoPhut: 1,
  toiDa: 20,
  thongDiep: 'Bạn gửi câu hỏi quá nhanh. Vui lòng đợi ít phút trước khi trò chuyện tiếp cùng BookNest AI.'
});

module.exports = {
  taoGioiHan,
  gioiHanChung,
  gioiHanDoMaDon,
  gioiHanDatDonVangLai,
  gioiHanTaoQr,
  gioiHanTraTrangThaiThanhToan,
  gioiHanWebhook,
  gioiHanChatbot
};
