/**
 * Middleware kiểm tra quyền sở hữu đơn hàng (chống lỗ hổng IDOR - Insecure Direct Object References).
 * Nếu người dùng là khách hàng (customer), chỉ được xem/hủy đơn của chính mình.
 * Nếu đơn không tồn tại hoặc thuộc khách hàng khác, trả về mã 404 (không tiết lộ sự tồn tại của đơn hàng).
 */
const { DonHang } = require('../models');
const LoiNghiepVu = require('./loiNghiepVu');

async function kiemTraChuDon(req, res, next) {
  try {
    const maDonHang = parseInt(req.params.id, 10);
    if (!maDonHang) {
      throw LoiNghiepVu.yeuCauKhongHopLe('Mã đơn hàng không hợp lệ');
    }

    const donHang = await DonHang.findByPk(maDonHang);
    if (!donHang) {
      throw LoiNghiepVu.khongTimThay('Không tìm thấy đơn hàng yêu cầu');
    }

    // Nếu là khách hàng, bắt buộc mã người dùng phải trùng khớp với chủ đơn
    if (req.user.role === 'customer' && donHang.MaNguoiDung !== req.user.id) {
      throw LoiNghiepVu.khongTimThay('Không tìm thấy đơn hàng yêu cầu');
    }

    // Gắn thông tin đơn hàng vào request để các tầng sau tái sử dụng không cần truy vấn lại
    req.donHang = donHang;
    return next();
  } catch (loi) {
    return next(loi);
  }
}

module.exports = kiemTraChuDon;
