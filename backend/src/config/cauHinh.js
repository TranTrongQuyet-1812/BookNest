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
    nguoiDung: process.env.DB_USER || 'booknest_user',
    matKhau: process.env.DB_PASSWORD || ''
  },
  jwt: {
    biMat: process.env.JWT_SECRET || 'booknest_jwt_secret_key_2026',
    hanDung: process.env.JWT_EXPIRES_IN || '7d'
  }
};

module.exports = cauHinh;
