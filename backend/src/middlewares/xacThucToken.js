/**
 * Middleware xác thực danh tính người dùng thông qua mã JSON Web Token (JWT).
 * Kiểm tra tính hợp lệ của token và truy vấn CSDL để đảm bảo tài khoản không bị khóa.
 * Token mang claim "aud" (khach_hang hoặc nhan_vien) để biết phải tra bảng KhachHang hay NhanVien.
 */
const jwt = require('jsonwebtoken');
const cauHinh = require('../config/cauHinh');
const LoiNghiepVu = require('./loiNghiepVu');
const { NhanVien, KhachHang } = require('../models');
const { AUD_KHACH_HANG, AUD_NHAN_VIEN, thongTinTaiKhoan } = require('../utils/taiKhoan');

// Mỗi khu có bảng tài khoản riêng, tra theo aud của token
const BANG_THEO_AUD = {
  [AUD_KHACH_HANG]: KhachHang,
  [AUD_NHAN_VIEN]: NhanVien
};

// Tra tài khoản theo token; trả về null nếu token không có aud hợp lệ hoặc tài khoản không tồn tại
async function timTaiKhoan(duLieuGiaiMa) {
  const Bang = BANG_THEO_AUD[duLieuGiaiMa.aud];
  if (!Bang) return null;
  return Bang.findByPk(duLieuGiaiMa.id);
}

async function xacThucToken(req, res, next) {
  try {
    const chuoiHeader = req.headers.authorization;
    if (!chuoiHeader || !chuoiHeader.startsWith('Bearer ')) {
      throw LoiNghiepVu.chuaXacThuc('Vui lòng cung cấp mã xác thực Bearer token');
    }

    const token = chuoiHeader.split(' ')[1];
    let duLieuGiaiMa;

    try {
      duLieuGiaiMa = jwt.verify(token, cauHinh.jwt.biMat);
    } catch (loiJwt) {
      if (loiJwt.name === 'TokenExpiredError') {
        throw LoiNghiepVu.chuaXacThuc('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
      }
      throw LoiNghiepVu.chuaXacThuc('Mã xác thực không hợp lệ hoặc đã bị chỉnh sửa');
    }

    // Truy vấn CSDL để lấy thông tin mới nhất và kiểm tra trạng thái hoạt động
    const taiKhoan = await timTaiKhoan(duLieuGiaiMa);
    if (!taiKhoan) {
      throw LoiNghiepVu.chuaXacThuc('Tài khoản liên kết với token này không tồn tại hoặc phiên đăng nhập cũ không còn hợp lệ');
    }

    if (!taiKhoan.DangHoatDong) {
      throw LoiNghiepVu.camTruyCap('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên');
    }

    // Gắn thông tin từ CSDL vào request (không tin vai trò lưu cứng trong token cũ)
    req.user = thongTinTaiKhoan(duLieuGiaiMa.aud, taiKhoan);

    return next();
  } catch (loi) {
    return next(loi);
  }
}

// Middleware xác thực tùy chọn: Nếu có token thì giải mã và nạp req.user, nếu không có vẫn cho qua
async function xacThucTuyChon(req, res, next) {
  try {
    const chuoiHeader = req.headers.authorization;
    if (!chuoiHeader || !chuoiHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = chuoiHeader.split(' ')[1];
    let duLieuGiaiMa;

    try {
      duLieuGiaiMa = jwt.verify(token, cauHinh.jwt.biMat);
    } catch (loiJwt) {
      return next();
    }

    const taiKhoan = await timTaiKhoan(duLieuGiaiMa);
    if (taiKhoan && taiKhoan.DangHoatDong) {
      req.user = thongTinTaiKhoan(duLieuGiaiMa.aud, taiKhoan);
    }

    return next();
  } catch (loi) {
    return next();
  }
}

xacThucToken.xacThucTuyChon = xacThucTuyChon;
module.exports = xacThucToken;
