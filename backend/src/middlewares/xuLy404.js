/**
 * Middleware bắt các tuyến đường không tồn tại (Route Not Found - 404).
 */
const { phanHoiLoi } = require('./phanHoi');

function xuLy404(req, res) {
  return phanHoiLoi(res, {
    thongDiep: `Không tìm thấy tuyến đường ${req.method} ${req.originalUrl} trên máy chủ`,
    maTrangThai: 404
  });
}

module.exports = xuLy404;
