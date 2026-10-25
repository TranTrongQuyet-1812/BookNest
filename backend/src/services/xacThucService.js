/**
 * Tầng Service xử lý nghiệp vụ xác thực (Authentication).
 * Đảm nhiệm đăng ký khách hàng, băm mật khẩu, kiểm tra đăng nhập và ký JWT.
 * Khách hàng (bảng KhachHang) và nhân viên (bảng NhanVien) đăng nhập ở hai cổng riêng, mỗi cổng chỉ tra một bảng.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Op } = require('sequelize');
const { sequelize, NhanVien, KhachHang, OtpQuenMatKhau } = require('../models');
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
// Nghiệp vụ Quên Mật Khẩu qua Email OTP (R12 - DATABASE_SCHEMA mục 3.12)
// Lưu trữ băm HMAC-SHA256 trong bảng OtpQuenMatKhau, tuyệt đối không lưu mã gốc
// ==========================================
const emailService = require('./emailService');

/**
 * Tạo chuỗi băm HMAC-SHA256 cho mã OTP (không lưu mã gốc trong CSDL)
 * @param {number} maKhachHang
 * @param {string} maOtp
 * @returns {string} Chuỗi băm hex 64 ký tự
 */
function tinhOtpHash(maKhachHang, maOtp) {
  return crypto
    .createHmac('sha256', cauHinh.jwt.biMat)
    .update(`otp:${maKhachHang}:${String(maOtp).trim()}`)
    .digest('hex');
}

/**
 * So sánh an toàn thời gian (timing-safe) giữa hai chuỗi băm HMAC-SHA256
 */
function soSanhOtpHash(hash1, hash2) {
  if (!hash1 || !hash2 || typeof hash1 !== 'string' || typeof hash2 !== 'string') {
    return false;
  }
  const buf1 = Buffer.from(hash1, 'hex');
  const buf2 = Buffer.from(hash2, 'hex');
  if (buf1.length !== 32 || buf2.length !== 32) {
    return false;
  }
  return crypto.timingSafeEqual(buf1, buf2);
}

/**
 * Gửi mã OTP xác nhận về email khi khách yêu cầu đặt lại mật khẩu
 */
async function guiOtpQuenMatKhau(email) {
  const emailChuanHoa = String(email || '').trim().toLowerCase();
  const khachHang = await KhachHang.findOne({ where: { Email: emailChuanHoa } });

  // Bảo mật chống dò email: Khách không tồn tại hoặc bị khóa (DaKhoa = true hoặc DangHoatDong = false)
  // thì TUYỆT ĐỐI KHÔNG TẠO DÒNG NÀO trong OtpQuenMatKhau và vẫn trả thông báo thành công chung
  const biKhoa = Boolean(khachHang && (khachHang.DaKhoa || !khachHang.DangHoatDong));
  if (!khachHang || biKhoa) {
    return {
      thanhCong: true,
      thongBao: 'Nếu địa chỉ email tồn tại và hợp lệ trên hệ thống, mã xác nhận đã được gửi thành công.'
    };
  }

  // Chống gửi dồn dập (thời gian giãn cách tối thiểu 60 giây giữa các lần gửi mã theo TaoLuc mới nhất)
  const banGhiMoiNhat = await OtpQuenMatKhau.findOne({
    where: { MaKhachHang: khachHang.MaKhachHang },
    order: [['TaoLuc', 'DESC']]
  });

  const nowMs = Date.now();
  if (banGhiMoiNhat) {
    const taoLucMs = new Date(banGhiMoiNhat.TaoLuc).getTime();
    if (nowMs - taoLucMs < 60 * 1000) {
      const soGiayConLai = Math.ceil((60 * 1000 - (nowMs - taoLucMs)) / 1000);
      throw LoiNghiepVu.yeuCauKhongHopLe(`Vui lòng chờ ${soGiayConLai} giây trước khi yêu cầu gửi lại mã xác thực.`);
    }
  }

  // Sinh mã OTP ngẫu nhiên 6 chữ số bằng crypto.randomInt an toàn mật mã học
  const maOtp = crypto.randomInt(100000, 1000000).toString();
  const maOtpBam = tinhOtpHash(khachHang.MaKhachHang, maOtp);
  const thoiHanPhut = 15;
  const taoLuc = new Date();
  const hetHanLuc = new Date(taoLuc.getTime() + thoiHanPhut * 60 * 1000);

  // Trong một transaction: Đánh DaDung = 1 cho mã cũ chưa dùng, tạo dòng mới, dọn dòng hết hạn hơn 1 ngày
  const t = await sequelize.transaction();
  try {
    // 1. Đánh dấu vô hiệu hóa các mã cũ chưa dùng của khách này
    await OtpQuenMatKhau.update(
      { DaDung: true },
      { where: { MaKhachHang: khachHang.MaKhachHang, DaDung: false }, transaction: t }
    );

    // 2. Dọn các dòng đã hết hạn hơn 1 ngày (dọn khi gửi, không cần tác vụ nền)
    const motNgayTruoc = new Date(Date.now() - 24 * 3600 * 1000);
    await OtpQuenMatKhau.destroy({
      where: { HetHanLuc: { [Op.lt]: motNgayTruoc } },
      transaction: t
    });

    // 3. Tạo dòng OTP mới với mã băm HMAC-SHA256
    await OtpQuenMatKhau.create({
      MaKhachHang: khachHang.MaKhachHang,
      MaOtpBam: maOtpBam,
      TaoLuc: taoLuc,
      HetHanLuc: hetHanLuc,
      SoLanThu: 0,
      DaDung: false
    }, { transaction: t });

    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

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
  const emailChuanHoa = String(email || '').trim().toLowerCase();
  const khachHang = await KhachHang.findOne({ where: { Email: emailChuanHoa } });

  const biKhoa = Boolean(khachHang && (khachHang.DaKhoa || !khachHang.DangHoatDong));
  if (!khachHang || biKhoa) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Mã xác nhận không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.');
  }

  // Lấy dòng mới nhất chưa dùng của khách
  const banGhi = await OtpQuenMatKhau.findOne({
    where: {
      MaKhachHang: khachHang.MaKhachHang,
      DaDung: false
    },
    order: [['TaoLuc', 'DESC']]
  });

  const now = new Date();
  if (!banGhi || now > new Date(banGhi.HetHanLuc)) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Mã xác nhận không tồn tại hoặc đã hết hạn. Vui lòng yêu cầu mã mới.');
  }

  // Tăng số lần thử nguyên tử bằng câu lệnh UPDATE có điều kiện SoLanThu < 5 và DaDung = 0 chống race condition
  const [soDongCapNhat] = await OtpQuenMatKhau.update(
    { SoLanThu: sequelize.literal('"SoLanThu" + 1') },
    {
      where: {
        MaOtp: banGhi.MaOtp,
        SoLanThu: { [Op.lt]: 5 },
        DaDung: false
      }
    }
  );

  if (soDongCapNhat === 0) {
    // Đã có tiến trình khác dùng hết 5 lần hoặc mã đã bị hủy/sử dụng
    await OtpQuenMatKhau.update({ DaDung: true }, { where: { MaOtp: banGhi.MaOtp } });
    throw LoiNghiepVu.yeuCauKhongHopLe('Mã xác nhận đã hết hạn, đã sử dụng hoặc bị hủy do nhập sai quá 5 lần.');
  }

  // Tăng số lần thử trên đối tượng trong bộ nhớ
  banGhi.SoLanThu = (banGhi.SoLanThu || 0) + 1;

  // Sau khi đã chiếm giữ 1 lượt thử hợp lệ trong hạn mức (< 5), mới tính băm và so khớp
  const hashThu = tinhOtpHash(khachHang.MaKhachHang, maOtp);
  const hopLe = soSanhOtpHash(hashThu, banGhi.MaOtpBam);

  if (!hopLe) {
    if (banGhi.SoLanThu >= 5) {
      await OtpQuenMatKhau.update({ DaDung: true }, { where: { MaOtp: banGhi.MaOtp } });
      throw LoiNghiepVu.yeuCauKhongHopLe('Bạn đã nhập sai mã xác nhận quá 5 lần. Mã này đã bị hủy vì lý do an toàn.');
    }
    throw LoiNghiepVu.yeuCauKhongHopLe('Mã xác nhận không chính xác. Vui lòng kiểm tra lại.');
  }

  return { hopLe: true, banGhiOtp: banGhi, khachHang };
}

/**
 * Xác thực mã OTP và đặt lại mật khẩu mới cho khách hàng
 */
async function datLaiMatKhau(email, maOtp, matKhauMoi) {
  const emailChuanHoa = String(email || '').trim().toLowerCase();

  // Xác minh tính hợp lệ của mã OTP
  const { banGhiOtp, khachHang } = await xacMinhOtpQuenMatKhau(emailChuanHoa, maOtp);

  // Mã hóa mật khẩu mới bằng bcrypt salt rounds = 10
  const matKhauHash = await bcrypt.hash(matKhauMoi, 10);

  // Đổi mật khẩu và cập nhật DaDung = 1 trong cùng transaction có điều kiện DaDung = 0
  const t = await sequelize.transaction();
  try {
    const [soDongCapNhat] = await OtpQuenMatKhau.update(
      { DaDung: true },
      {
        where: { MaOtp: banGhiOtp.MaOtp, DaDung: false },
        transaction: t
      }
    );

    if (soDongCapNhat === 0) {
      throw LoiNghiepVu.yeuCauKhongHopLe('Mã xác nhận đã được sử dụng hoặc không còn hiệu lực.');
    }

    await khachHang.update({ MatKhauHash: matKhauHash }, { transaction: t });
    await t.commit();
  } catch (err) {
    await t.rollback();
    throw err;
  }

  return {
    thanhCong: true,
    thongBao: 'Đặt lại mật khẩu thành công! Bạn có thể sử dụng mật khẩu mới để đăng nhập ngay bây giờ.'
  };
}

module.exports = {
  dangKy,
  dangNhapKhachHang,
  dangNhapNhanVien,
  guiOtpQuenMatKhau,
  xacMinhOtpQuenMatKhau,
  datLaiMatKhau,
  tinhOtpHash,
  soSanhOtpHash,
  taoToken,
  tinhMaPhienMatKhau
};

