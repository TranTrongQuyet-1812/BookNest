/**
 * Tầng Service xử lý nghiệp vụ xác thực (Authentication).
 * Đảm nhiệm đăng ký, băm mật khẩu, kiểm tra đăng nhập và ký JWT.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { NguoiDung } = require('../models');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
const cauHinh = require('../config/cauHinh');

// Đăng ký tài khoản người dùng mới
async function dangKy({ email, matKhau, hoTen, soDienThoai, diaChiMacDinh }) {
  const taiKhoanTonTai = await NguoiDung.findOne({ where: { Email: email } });
  if (taiKhoanTonTai) {
    throw LoiNghiepVu.xungDot('Email này đã được đăng ký trên hệ thống');
  }

  // Băm mật khẩu bằng bcrypt với salt rounds = 10
  const matKhauHash = await bcrypt.hash(matKhau, 10);

  // Luôn gán vai trò customer, chống lỗ hổng mass assignment nâng quyền
  const nguoiDungMoi = await NguoiDung.create({
    HoTen: hoTen,
    Email: email,
    MatKhauHash: matKhauHash,
    SoDienThoai: soDienThoai || null,
    DiaChiMacDinh: diaChiMacDinh || null,
    VaiTro: 'customer',
    DangHoatDong: true
  });

  return {
    id: nguoiDungMoi.MaNguoiDung,
    email: nguoiDungMoi.Email,
    fullName: nguoiDungMoi.HoTen,
    role: nguoiDungMoi.VaiTro
  };
}

// Đăng nhập và cấp mã JWT
async function dangNhap({ email, matKhau }) {
  const nguoiDung = await NguoiDung.findOne({ where: { Email: email } });

  // Dùng chung một câu thông báo khi sai email hoặc sai mật khẩu để chống dò quét tài khoản
  if (!nguoiDung) {
    throw LoiNghiepVu.chuaXacThuc('Email hoặc mật khẩu không chính xác');
  }

  const matKhauDung = await bcrypt.compare(matKhau, nguoiDung.MatKhauHash);
  if (!matKhauDung) {
    throw LoiNghiepVu.chuaXacThuc('Email hoặc mật khẩu không chính xác');
  }

  // Chặn đăng nhập nếu tài khoản đã bị admin khóa
  if (!nguoiDung.DangHoatDong) {
    throw LoiNghiepVu.camTruyCap('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên');
  }

  // Ký token JWT với thời hạn cấu hình
  const token = jwt.sign(
    {
      id: nguoiDung.MaNguoiDung,
      email: nguoiDung.Email,
      role: nguoiDung.VaiTro,
      fullName: nguoiDung.HoTen
    },
    cauHinh.jwt.biMat,
    { expiresIn: cauHinh.jwt.hanDung }
  );

  return {
    token,
    user: {
      id: nguoiDung.MaNguoiDung,
      email: nguoiDung.Email,
      fullName: nguoiDung.HoTen,
      role: nguoiDung.VaiTro
    }
  };
}

module.exports = {
  dangKy,
  dangNhap
};
