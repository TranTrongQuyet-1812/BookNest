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

/**
 * Xác minh một chuỗi token với CSDL và trả về thông tin người dùng (id, email, fullName, role, aud).
 * Ném LoiNghiepVu nếu token sai/hết hạn, tài khoản không còn, bị khóa, hoặc mật khẩu đã đổi sau khi cấp token.
 * Dùng chung cho middleware HTTP và việc vào phòng Socket.IO, để kết nối realtime cũng bị thu hồi khi khóa tài khoản
 * hoặc đổi mật khẩu (trước đây phòng socket chỉ kiểm chữ ký token nên token cũ còn dùng được tới khi hết hạn).
 */
async function xacMinhToken(token) {
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

  // Bảo mật phiên & vô hiệu hóa token cũ: Bắt buộc token phải mang claim pwh chuẩn HMAC-SHA256 khớp với mật khẩu hiện tại trong CSDL
  if (taiKhoan.MatKhauHash) {
    const { tinhMaPhienMatKhau } = require('../services/xacThucService');
    const pwhHmac = tinhMaPhienMatKhau(taiKhoan.MatKhauHash);
    if (!duLieuGiaiMa.pwh || duLieuGiaiMa.pwh !== pwhHmac) {
      throw LoiNghiepVu.chuaXacThuc('Phiên đăng nhập cũ không còn hiệu lực hoặc mật khẩu đã được thay đổi. Vui lòng đăng nhập lại.');
    }
  }

  // Thông tin lấy từ CSDL (không tin vai trò lưu cứng trong token cũ)
  return thongTinTaiKhoan(duLieuGiaiMa.aud, taiKhoan);
}

async function xacThucToken(req, res, next) {
  try {
    const chuoiHeader = req.headers.authorization;
    if (!chuoiHeader || !chuoiHeader.startsWith('Bearer ')) {
      throw LoiNghiepVu.chuaXacThuc('Vui lòng cung cấp mã xác thực Bearer token');
    }

    const token = chuoiHeader.split(' ')[1];
    req.user = await xacMinhToken(token);

    return next();
  } catch (loi) {
    return next(loi);
  }
}

// Middleware xác thực tùy chọn: Nếu có token hợp lệ thì nạp req.user, không có hoặc không hợp lệ vẫn cho qua (như khách vãng lai)
async function xacThucTuyChon(req, res, next) {
  const chuoiHeader = req.headers.authorization;
  if (!chuoiHeader || !chuoiHeader.startsWith('Bearer ')) {
    return next();
  }

  try {
    req.user = await xacMinhToken(chuoiHeader.split(' ')[1]);
  } catch (loi) {
    console.warn('[Xác Thực Tùy Chọn] Bỏ qua token không dùng được:', loi.message);
  }

  return next();
}

xacThucToken.xacThucTuyChon = xacThucTuyChon;
xacThucToken.xacMinhToken = xacMinhToken;
module.exports = xacThucToken;
