/**
 * Tầng Service xử lý nghiệp vụ xác thực (Authentication).
 * Đảm nhiệm đăng ký khách hàng, băm mật khẩu, kiểm tra đăng nhập và ký JWT.
 * Khách hàng (bảng KhachHang) và nhân viên (bảng NhanVien) đăng nhập ở hai cổng riêng, mỗi cổng chỉ tra một bảng.
 */
const crypto = require('crypto');
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

// Hàm tính mã phiên mật khẩu HMAC-SHA256 (bảo vệ cấu trúc hash bcrypt, không làm lộ hash ra JWT payload)
function tinhMaPhienMatKhau(matKhauHash, biMat = cauHinh.jwt?.biMat || cauHinh.jwtBiMat) {
  if (!matKhauHash) return '';
  return crypto.createHmac('sha256', biMat).update(String(matKhauHash)).digest('hex').slice(0, 10);
}

// Cấp token JWT chuẩn mực với mã phiên pwh bảo mật
function taoToken(user, aud, taiKhoan) {
  const pwh = tinhMaPhienMatKhau(taiKhoan.MatKhauHash);
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, fullName: user.fullName, aud, pwh },
    cauHinh.jwt.biMat,
    { expiresIn: cauHinh.jwt.hanDung }
  );
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
  const token = taoToken(user, aud, taiKhoan);

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

// ==========================================
// Nghiệp vụ Quên Mật Khẩu qua Email OTP
// ==========================================
const emailService = require('./emailService');
const khoLuuOtpQuenMatKhau = new Map();

/**
 * Gửi mã OTP xác nhận về email khi khách yêu cầu đặt lại mật khẩu
 */
async function guiOtpQuenMatKhau(email) {
  const emailChuanHoa = email.trim().toLowerCase();
  const khachHang = await KhachHang.findOne({ where: { Email: emailChuanHoa } });

  // Bảo mật chống dò email: Trả về thông báo thành công chung ngay cả khi email không có trong DB hoặc tài khoản bị khóa
  if (!khachHang || !khachHang.DangHoatDong) {
    return {
      thanhCong: true,
      thongBao: 'Nếu địa chỉ email tồn tại và hợp lệ trên hệ thống, mã xác nhận đã được gửi thành công.'
    };
  }

  // Chống gửi dồn dập (thời gian giãn cách tối thiểu 60 giây giữa các lần gửi mã)
  const banGhiCu = khoLuuOtpQuenMatKhau.get(emailChuanHoa);
  const now = Date.now();
  if (banGhiCu && now - banGhiCu.taoLuc < 60 * 1000) {
    const soGiayConLai = Math.ceil((60 * 1000 - (now - banGhiCu.taoLuc)) / 1000);
    throw LoiNghiepVu.yeuCauKhongHopLe(`Vui lòng chờ ${soGiayConLai} giây trước khi yêu cầu gửi lại mã xác thực.`);
  }

  // Sinh mã OTP ngẫu nhiên 6 chữ số bằng crypto.randomInt an toàn mật mã học
  const maOtp = crypto.randomInt(100000, 1000000).toString();
  const thoiHanPhut = 15;
  const hetHanLuc = now + thoiHanPhut * 60 * 1000;

  khoLuuOtpQuenMatKhau.set(emailChuanHoa, {
    maOtp,
    taoLuc: now,
    hetHanLuc,
    soLanThu: 0
  });

  // Gửi email bất đồng bộ
  await emailService.guiEmailMaXacNhan(khachHang.Email, maOtp, thoiHanPhut);

  return {
    thanhCong: true,
    thongBao: 'Mã xác nhận 6 chữ số đã được gửi đến email của bạn. Vui lòng kiểm tra hòm thư.'
  };
}

/**
 * Kiểm tra tính hợp lệ của mã OTP
 */
async function xacMinhOtpQuenMatKhau(email, maOtp) {
  const emailChuanHoa = email.trim().toLowerCase();
  const banGhi = khoLuuOtpQuenMatKhau.get(emailChuanHoa);

  if (!banGhi || Date.now() > banGhi.hetHanLuc) {
    khoLuuOtpQuenMatKhau.delete(emailChuanHoa);
    throw LoiNghiepVu.yeuCauKhongHopLe('Mã xác nhận không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.');
  }

  if (banGhi.soLanThu >= 5) {
    khoLuuOtpQuenMatKhau.delete(emailChuanHoa);
    throw LoiNghiepVu.yeuCauKhongHopLe('Bạn đã nhập sai mã xác nhận quá 5 lần. Mã này đã bị hủy vì lý do an toàn.');
  }

  if (banGhi.maOtp !== String(maOtp).trim()) {
    banGhi.soLanThu += 1;
    throw LoiNghiepVu.yeuCauKhongHopLe('Mã xác nhận không chính xác. Vui lòng kiểm tra lại.');
  }

  return { hopLe: true };
}

/**
 * Xác thực mã OTP và đặt lại mật khẩu mới cho khách hàng
 */
async function datLaiMatKhau(email, maOtp, matKhauMoi) {
  const emailChuanHoa = email.trim().toLowerCase();
  
  // Kiểm tra mã OTP trước khi cập nhật
  await xacMinhOtpQuenMatKhau(emailChuanHoa, maOtp);

  const khachHang = await KhachHang.findOne({ where: { Email: emailChuanHoa } });
  if (!khachHang) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy tài khoản người dùng.');
  }

  // Mã hóa mật khẩu mới bằng bcrypt salt rounds = 10
  const matKhauHash = await bcrypt.hash(matKhauMoi, 10);
  await khachHang.update({ MatKhauHash: matKhauHash });

  // Hủy mã OTP sau khi đổi mật khẩu thành công
  khoLuuOtpQuenMatKhau.delete(emailChuanHoa);

  return {
    thanhCong: true,
    thongBao: 'Đặt lại mật khẩu thành công! Bạn có thể sử dụng mật khẩu mới để đăng nhập ngay bây giờ.'
  };
}

function layOtpChoTest(email) {
  const banGhi = khoLuuOtpQuenMatKhau.get(email.trim().toLowerCase());
  return banGhi?.maOtp || null;
}

function xoaTatCaOtpChoTest() {
  khoLuuOtpQuenMatKhau.clear();
}

module.exports = {
  dangKy,
  dangNhapKhachHang,
  dangNhapNhanVien,
  guiOtpQuenMatKhau,
  xacMinhOtpQuenMatKhau,
  datLaiMatKhau,
  layOtpChoTest,
  xoaTatCaOtpChoTest,
  taoToken,
  tinhMaPhienMatKhau
};
