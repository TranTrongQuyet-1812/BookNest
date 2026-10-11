/**
 * Middleware xác thực danh tính người dùng thông qua mã JSON Web Token (JWT).
 * Kiểm tra tính hợp lệ của token và truy vấn CSDL để đảm bảo tài khoản không bị khóa.
 */
const jwt = require('jsonwebtoken');
const cauHinh = require('../config/cauHinh');
const LoiNghiepVu = require('./loiNghiepVu');
const { NguoiDung } = require('../models');

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
    const nguoiDung = await NguoiDung.findByPk(duLieuGiaiMa.id);
    if (!nguoiDung) {
      throw LoiNghiepVu.chuaXacThuc('Tài khoản liên kết với token này không tồn tại');
    }

    if (!nguoiDung.DangHoatDong) {
      throw LoiNghiepVu.camTruyCap('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên');
    }

    // Gắn thông tin người dùng từ CSDL vào request (không tin vai trò lưu cứng trong token cũ)
    req.user = {
      id: nguoiDung.MaNguoiDung,
      email: nguoiDung.Email,
      role: nguoiDung.VaiTro,
      fullName: nguoiDung.HoTen
    };

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

    const nguoiDung = await NguoiDung.findByPk(duLieuGiaiMa.id);
    if (nguoiDung && nguoiDung.DangHoatDong) {
      req.user = {
        id: nguoiDung.MaNguoiDung,
        email: nguoiDung.Email,
        role: nguoiDung.VaiTro,
        fullName: nguoiDung.HoTen
      };
    }

    return next();
  } catch (loi) {
    return next();
  }
}

xacThucToken.xacThucTuyChon = xacThucTuyChon;
module.exports = xacThucToken;
