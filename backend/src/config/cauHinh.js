/**
 * Quản lý và kiểm tra tính hợp lệ của các biến môi trường cấu hình hệ thống.
 */
require('dotenv').config();

const cacBienBatBuoc = [
  'PORT',
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD',
  'JWT_SECRET'
];

function kiemTraBienBatBuoc() {
  const cacBienThieu = cacBienBatBuoc.filter(tenBien => !process.env[tenBien]);
  if (cacBienThieu.length > 0) {
    throw new Error(`[Lỗi Cấu Hình] Thiếu các biến môi trường bắt buộc: ${cacBienThieu.join(', ')}`);
  }
}

kiemTraBienBatBuoc();

const cauHinh = {
  cong: parseInt(process.env.PORT, 10) || 5000,
  csdl: {
    mayChu: process.env.DB_HOST || 'localhost',
    cong: parseInt(process.env.DB_PORT, 10) || 1433,
    tenCsdl: process.env.DB_NAME || 'BookNestDB',
    nguoiDung: process.env.DB_USER,
    matKhau: process.env.DB_PASSWORD || ''
  },
  jwt: {
    biMat: process.env.JWT_SECRET,
    hanDung: process.env.JWT_EXPIRES_IN || '7d'
  },
  // Nguồn frontend được phép gọi API (CORS), cách nhau bằng dấu phẩy
  corsNguon: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(nguon => nguon.trim()),
  // Số lớp reverse proxy đứng trước server (0 nếu chạy trực tiếp), dùng để rate limit nhận đúng IP
  soLopProxy: parseInt(process.env.TRUST_PROXY, 10) || 0
};

module.exports = cauHinh;
