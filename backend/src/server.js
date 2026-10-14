/**
 * Điểm khởi chạy chính (Entry Point) của máy chủ BookNest.
 * Kiểm tra kết nối CSDL thành công trước khi lắng nghe kết nối HTTP.
 */
const http = require('http');
const cauHinh = require('./config/cauHinh');
const { kiemTraKetNoiDb } = require('./config/ketNoiDb');
const app = require('./app');
const { khoiTaoSocket } = require('./realtime/socket');
const { batDauQuetHetHan } = require('./services/hetHanThanhToanService');

async function khoiDongMayChu() {
  try {
    // 1. Thử kết nối cơ sở dữ liệu Microsoft SQL Server trước
    await kiemTraKetNoiDb();

    // 2. Tạo HTTP Server bọc Express Application
    const server = http.createServer(app);

    // 3. Khởi tạo Socket.IO trên cùng một cổng HTTP
    khoiTaoSocket(server);

    // 4. Mở cổng lắng nghe cả HTTP API và WebSocket
    server.listen(cauHinh.cong, () => {
      console.log(`[BookNest] Máy chủ đang chạy tại cổng http://localhost:${cauHinh.cong} (HTTP & Socket.IO)`);
      // 5. Định kỳ hủy các đơn chuyển khoản QR đã quá hạn thanh toán mà chưa trả tiền
      batDauQuetHetHan();
    });
  } catch (loi) {
    console.error('[BookNest] Khởi động máy chủ thất bại do không thể kết nối CSDL:', loi.message);
    process.exit(1);
  }
}

khoiDongMayChu();
