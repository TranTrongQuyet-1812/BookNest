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
  // Tách nguồn gọi API theo khu; CORS_ORIGIN giữ tương thích với cấu hình cũ.
  corsStorefront: (process.env.CORS_STOREFRONT_ORIGIN || process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(nguon => nguon.trim()),
  corsBackOffice: (process.env.CORS_BACKOFFICE_ORIGIN || 'http://localhost:5174').split(',').map(nguon => nguon.trim()),
  // Tài liệu Swagger (/api-docs) liệt kê toàn bộ API nên mặc định chỉ bật khi không phải môi trường production.
  // Đặt BAT_API_DOCS=true/false để ép bật/tắt.
  batApiDocs: process.env.BAT_API_DOCS ? process.env.BAT_API_DOCS === 'true' : process.env.NODE_ENV !== 'production',
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
