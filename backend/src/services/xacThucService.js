/**
 * Tầng Service xử lý nghiệp vụ xác thực (Authentication).
 * Đảm nhiệm đăng ký khách hàng, băm mật khẩu, kiểm tra đăng nhập và ký JWT.
 * Khách hàng (bảng KhachHang) và nhân viên (bảng NhanVien) đăng nhập ở hai cổng riêng, mỗi cổng chỉ tra một bảng.
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { NhanVien, KhachHang } = require('../models');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
const cauHinh = require('../config/cauHinh');
const { AUD_KHACH_HANG, AUD_NHAN_VIEN, thongTinTaiKhoan } = require('../utils/taiKhoan');

// Đăng ký tài khoản khách hàng mới (nhân viên do quản trị viên tạo, không tự đăng ký)
async function dangKy({ email, matKhau, hoTen, soDienThoai, diaChiMacDinh }) {
  const taiKhoanTonTai = await KhachHang.findOne({ where: { Email: email } });
  if (taiKhoanTonTai) {
    throw LoiNghiepVu.xungDot('Email này đã được đăng ký trên hệ thống');
  }

  // Băm mật khẩu bằng bcrypt với salt rounds = 10
  const matKhauHash = await bcrypt.hash(matKhau, 10);

  const khachMoi = await KhachHang.create({
    HoTen: hoTen,
    Email: email,
    MatKhauHash: matKhauHash,
    SoDienThoai: soDienThoai || null,
    DiaChiMacDinh: diaChiMacDinh || null,
    DangHoatDong: true
  });

  const { id, email: emailMoi, fullName, role } = thongTinTaiKhoan(AUD_KHACH_HANG, khachMoi);
  return { id, email: emailMoi, fullName, role };
}

// Kiểm tra email, mật khẩu trên một bảng tài khoản rồi cấp JWT mang đúng aud của cổng đó
async function dangNhapTrenBang(Bang, aud, { email, matKhau }) {
  const taiKhoan = await Bang.findOne({ where: { Email: email } });

  // Dùng chung một câu thông báo khi sai email hoặc sai mật khẩu để chống dò quét tài khoản
  if (!taiKhoan) {
    throw LoiNghiepVu.chuaXacThuc('Email hoặc mật khẩu không chính xác');
  }

  const matKhauDung = await bcrypt.compare(matKhau, taiKhoan.MatKhauHash);
  if (!matKhauDung) {
    throw LoiNghiepVu.chuaXacThuc('Email hoặc mật khẩu không chính xác');
  }

  // Chặn đăng nhập nếu tài khoản đã bị quản trị viên khóa
  if (!taiKhoan.DangHoatDong) {
    throw LoiNghiepVu.camTruyCap('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên');
  }

  const user = thongTinTaiKhoan(aud, taiKhoan);

  // Ký token JWT với thời hạn cấu hình; aud cho biết token được cấp ở cổng nào
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.fullName, aud },
    cauHinh.jwt.biMat,
    { expiresIn: cauHinh.jwt.hanDung }
  );

  return { token, user };
}

// Cổng đăng nhập của khách hàng (Storefront): chỉ tra bảng KhachHang
function dangNhapKhachHang(thongTin) {
  return dangNhapTrenBang(KhachHang, AUD_KHACH_HANG, thongTin);
}

// Cổng đăng nhập của nhân viên (Back-Office): chỉ tra bảng NhanVien
function dangNhapNhanVien(thongTin) {
  return dangNhapTrenBang(NhanVien, AUD_NHAN_VIEN, thongTin);
}

module.exports = {
  dangKy,
  dangNhapKhachHang,
  dangNhapNhanVien
};
