/**
 * Quản lý và kiểm tra tính hợp lệ của các biến môi trường cấu hình hệ thống.
 */
require('dotenv').config();
const path = require('path');

const cacBienBatBuoc = [
  'PORT',
  'JWT_SECRET'
];

// Kết nối PostgreSQL: Heroku cấp một chuỗi DATABASE_URL; máy dev dùng 5 biến DB_* riêng lẻ.
const cacBienCsdl = [
  'DB_HOST',
  'DB_PORT',
  'DB_NAME',
  'DB_USER',
  'DB_PASSWORD'
];

function kiemTraBienBatBuoc() {
  const cacBienCanCo = process.env.DATABASE_URL ? cacBienBatBuoc : [...cacBienBatBuoc, ...cacBienCsdl];
  const cacBienThieu = cacBienCanCo.filter(tenBien => !process.env[tenBien]);
  if (cacBienThieu.length > 0) {
    throw new Error(`[Lỗi Cấu Hình] Thiếu các biến môi trường bắt buộc: ${cacBienThieu.join(', ')}`);
  }
}

kiemTraBienBatBuoc();

const cauHinh = {
  cong: parseInt(process.env.PORT, 10) || 5000,
  csdl: {
    // Nếu có DATABASE_URL (Heroku) thì dùng chuỗi này thay cho 5 biến DB_* bên dưới
    url: process.env.DATABASE_URL || '',
    mayChu: process.env.DB_HOST || 'localhost',
    cong: parseInt(process.env.DB_PORT, 10) || 5432,
    tenCsdl: process.env.DB_NAME || 'booknest',
    nguoiDung: process.env.DB_USER,
    matKhau: process.env.DB_PASSWORD || '',
    // Mặc định bật SSL khi dùng DATABASE_URL (Heroku, Supabase đều bắt buộc); đặt DB_SSL=false để tắt, DB_SSL=true để bật khi nối bằng DB_*
    dungSsl: process.env.DB_SSL ? process.env.DB_SSL === 'true' : Boolean(process.env.DATABASE_URL)
  },
  jwt: {
    biMat: process.env.JWT_SECRET,
    hanDung: process.env.JWT_EXPIRES_IN || '7d'
  },
  // Tách nguồn gọi API theo khu; CORS_ORIGIN giữ tương thích với cấu hình cũ.
  corsStorefront: (process.env.CORS_STOREFRONT_ORIGIN || process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(nguon => nguon.trim()),
  corsBackOffice: (process.env.CORS_BACKOFFICE_ORIGIN || 'http://localhost:5174').split(',').map(nguon => nguon.trim()),
  // Tài liệu Swagger (/api-docs) liệt kê toàn bộ API nên mặc định chỉ bật khi không phải môi trường production.
  // Đặt BAT_API_DOCS=true/false để ép bật/tắt.
  batApiDocs: process.env.BAT_API_DOCS ? process.env.BAT_API_DOCS === 'true' : process.env.NODE_ENV !== 'production',
  // Phục vụ hai giao diện đã build từ chính backend (Heroku chỉ có một app, không có nginx); mặc định tắt vì máy dev dùng Vite
  giaoDien: {
    bat: process.env.PHUC_VU_GIAO_DIEN === 'true',
    // Các tên miền thuộc khu quản trị (phân tách bằng dấu phẩy); mọi tên miền khác là trang khách
    hostQuanTri: (process.env.BACKOFFICE_HOSTS || '').split(',').map(host => host.trim()).filter(Boolean),
    thuMucKhach: path.resolve(__dirname, '..', '..', '..', 'frontend', 'dist'),
    thuMucQuanTri: path.resolve(__dirname, '..', '..', '..', 'frontend-admin', 'dist')
  },
  // Số lớp reverse proxy đứng trước server (0 nếu chạy trực tiếp), dùng để rate limit nhận đúng IP
  soLopProxy: parseInt(process.env.TRUST_PROXY, 10) || 0,
  // Cổng thanh toán VietQR payOS
  payos: {
    clientId: process.env.PAYOS_CLIENT_ID || '',
    apiKey: process.env.PAYOS_API_KEY || '',
    checksumKey: process.env.PAYOS_CHECKSUM_KEY || '',
    daCauHinh: Boolean(
      process.env.PAYOS_CLIENT_ID &&
      process.env.PAYOS_API_KEY &&
      process.env.PAYOS_CHECKSUM_KEY
    )
  },
  // AI Chatbot Tư Vấn (Xoay tua: Gemini chính -> Gemini phụ -> NVIDIA NIM dự phòng - T54)
  ai: {
    // Nhà cung cấp Gemini chính & phụ
    gemini: {
      khoaApi: (process.env.GEMINI_API_KEY || '').trim(),
      moHinhChinh: (process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite').trim(),
      moHinhPhu: (process.env.GEMINI_MODEL_PHU || '').trim(),
      gioResetUtc: parseInt(process.env.GEMINI_GIO_RESET_UTC, 10) || 0,
      diaChiGoc: 'https://generativelanguage.googleapis.com/v1beta/openai',
      daCauHinh: Boolean(
        process.env.GEMINI_API_KEY &&
        process.env.GEMINI_API_KEY.trim() !== '' &&
        process.env.GEMINI_API_KEY.trim() !== 'your_gemini_api_key_here'
      )
    },
    // Nhà cung cấp NVIDIA NIM dự phòng
    nvidia: {
      khoaApi: (process.env.AI_API_KEY || '').trim(),
      moHinh: (process.env.AI_MODEL || 'meta/llama-3.2-11b-vision-instruct').trim(),
      diaChiGoc: (process.env.AI_BASE_URL || 'https://integrate.api.nvidia.com/v1').trim(),
      daCauHinh: Boolean(
        process.env.AI_API_KEY &&
        process.env.AI_API_KEY.trim() !== '' &&
        process.env.AI_API_KEY.trim() !== 'your_nvidia_nim_api_key_here'
      )
    },
    // Giữ tương thích ngược với các đoạn mã cũ
    nhaCungCap: process.env.AI_PROVIDER || 'gemini',
    khoaApi: (process.env.AI_API_KEY || '').trim(),
    moHinh: (process.env.AI_MODEL || 'meta/llama-3.2-11b-vision-instruct').trim(),
    diaChiGoc: (process.env.AI_BASE_URL || 'https://integrate.api.nvidia.com/v1').trim(),
    daBat: process.env.AI_CHATBOT_BAT !== 'false',
    daCauHinh: Boolean(
      (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '' && process.env.GEMINI_API_KEY.trim() !== 'your_gemini_api_key_here') ||
      (process.env.AI_API_KEY && process.env.AI_API_KEY.trim() !== '' && process.env.AI_API_KEY.trim() !== 'your_nvidia_nim_api_key_here')
    )
  },
  // Dịch vụ gửi Email (SMTP / Nodemailer)
  email: {
    mayChu: process.env.EMAIL_HOST || 'smtp.gmail.com',
    cong: parseInt(process.env.EMAIL_PORT, 10) || 587,
    baoMat: process.env.EMAIL_SECURE === 'true',
    nguoiDung: (process.env.EMAIL_USER || '').trim(),
    matKhau: (process.env.EMAIL_PASS || '').replace(/\s+/g, ''),
    nguoiGui: process.env.EMAIL_FROM || 'BookNest Bookstore <noreply@booknest.lhutech.click>',
    giaLap: process.env.EMAIL_MOCK === 'true',
    daCauHinh: Boolean(
      process.env.EMAIL_USER &&
      process.env.EMAIL_PASS &&
      process.env.EMAIL_USER !== 'your_email@gmail.com' &&
      process.env.EMAIL_MOCK !== 'true'
    )
  },
  // Dịch vụ lưu trữ ảnh Cloudinary (AT04)
  cloudinary: {
    tenDamMay: process.env.CLOUDINARY_CLOUD_NAME || '',
    khoa: process.env.CLOUDINARY_API_KEY || '',
    matKhau: process.env.CLOUDINARY_API_SECRET || '',
    daCauHinh: Boolean(
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    )
  }
};

module.exports = cauHinh;
