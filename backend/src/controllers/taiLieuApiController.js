/**
 * Controller cấp đặc tả OpenAPI (Swagger) cho khu quản trị.
 * Chỉ quản trị viên gọi được (kiểm quyền ở route), nên có thể bật cả khi chạy production
 * trong khi trang /api-docs công khai vẫn tắt.
 */
const swaggerSpec = require('../config/swagger');

// Trả bản sao đặc tả với máy chủ là chính nguồn gốc đang gọi (đường dẫn tương đối "/"),
// để nút "Try it out" gửi đúng về tên miền hiện tại thay vì http://localhost:5000
function layDacTaApi(req, res) {
  res.json({ ...swaggerSpec, servers: [{ url: '/', description: 'Máy chủ hiện tại' }] });
}

module.exports = { layDacTaApi };
