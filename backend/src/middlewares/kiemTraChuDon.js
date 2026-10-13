/**
 * Middleware kiểm tra quyền sở hữu đơn hàng (chống lỗ hổng IDOR - Insecure Direct Object References).
 * Phía khách chỉ gọi đơn bằng MaTraCuu (BN-7K3F9Q), không dùng MaDonHang tăng dần vì nó lộ số đơn của cửa hàng
 * và cho phép dò từng đơn. Nếu người dùng là khách hàng (khach_hang), chỉ được xem/hủy đơn của chính mình.
 * Mã sai định dạng, đơn không tồn tại hay thuộc khách khác đều trả cùng một 404 (không tiết lộ đơn nào tồn tại).
 */
const { DonHang } = require('../models');
const LoiNghiepVu = require('./loiNghiepVu');
const { chuanHoaMaTraCuu } = require('../utils/maTraCuu');

async function kiemTraChuDon(req, res, next) {
  try {
    const maTraCuu = chuanHoaMaTraCuu(req.params.id);
    const donHang = maTraCuu ? await DonHang.findOne({ where: { MaTraCuu: maTraCuu } }) : null;
    if (!donHang) {
      throw LoiNghiepVu.khongTimThay('Không tìm thấy đơn hàng yêu cầu');
    }

    // Nếu là khách hàng, bắt buộc mã khách hàng phải trùng khớp với chủ đơn
    if (req.user.role === 'khach_hang' && donHang.MaKhachHang !== req.user.id) {
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
