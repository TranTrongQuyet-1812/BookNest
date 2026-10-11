/**
 * Điểm khởi chạy chính (Entry Point) của máy chủ BookNest.
 * Kiểm tra kết nối CSDL thành công trước khi lắng nghe kết nối HTTP.
 */
const cauHinh = require('./config/cauHinh');
const { kiemTraKetNoiDb } = require('./config/ketNoiDb');
const app = require('./app');

async function khoiDongMayChu() {
  try {
    // 1. Thử kết nối cơ sở dữ liệu Microsoft SQL Server trước
    await kiemTraKetNoiDb();

    // 2. Kết nối thành công mới mở cổng lắng nghe HTTP
    app.listen(cauHinh.cong, () => {
      console.log(`[BookNest] Máy chủ đang chạy tại cổng http://localhost:${cauHinh.cong}`);
    });
  } catch (loi) {
    console.error('[BookNest] Khởi động máy chủ thất bại do không thể kết nối CSDL:', loi.message);
    process.exit(1);
  }
}

khoiDongMayChu();
