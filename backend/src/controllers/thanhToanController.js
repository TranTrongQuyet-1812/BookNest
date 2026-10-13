/**
 * Controller xử lý các yêu cầu liên quan đến cổng thanh toán VietQR (payOS).
 */
const payosService = require('../services/payosService');
const { DonHang, ChiTietDonHang, Sach } = require('../models');
const { phanHoiThanhCong, phanHoiLoi } = require('../middlewares/phanHoi');

/**
 * Kiểm tra xem tính năng thanh toán QR có đang khả dụng không
 */
async function kiemTraKhaDung(req, res, next) {
  try {
    const daBat = await payosService.kiemTraCongTacQRDangBat();
    return phanHoiThanhCong(res, {
      duLieu: { khaDung: daBat },
      thongDiep: daBat ? 'Cổng thanh toán VietQR đang hoạt động' : 'Cổng thanh toán QR hiện đang tắt'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Tạo liên kết và mã QR VietQR cho đơn hàng
 */
async function taoQrThanhToan(req, res, next) {
  try {
    const { maDonHang } = req.params;
    const donHang = await DonHang.findByPk(maDonHang, {
      include: [{
        model: ChiTietDonHang,
        as: 'chiTietDonHang',
        include: [{ model: Sach, as: 'sach', attributes: ['TenSach'] }]
      }]
    });

    if (!donHang) {
      return phanHoiLoi(res, {
        thongDiep: 'Không tìm thấy thông tin đơn hàng',
        maTrangThai: 404
      });
    }

    // Nếu là khách đăng nhập, kiểm tra quyền sở hữu đơn
    if (req.user && req.user.role === 'khach_hang' && donHang.MaKhachHang && donHang.MaKhachHang !== req.user.id) {
      return phanHoiLoi(res, {
        thongDiep: 'Bạn không có quyền thao tác trên đơn hàng này (IDOR Guard)',
        maTrangThai: 403
      });
    }

    const danhSachMon = (donHang.chiTietDonHang || []).map(ct => ({
      tenSach: ct.sach?.TenSach || `Sách #${ct.MaSach}`,
      soLuong: ct.SoLuong,
      donGia: ct.DonGia
    }));

    const ketQua = await payosService.taoThanhToanQR(donHang, danhSachMon);
    return phanHoiThanhCong(res, {
      duLieu: ketQua,
      thongDiep: 'Khởi tạo mã thanh toán VietQR thành công'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Tiếp nhận và xử lý Webhook từ payOS khi tiền về
 */
async function xuLyWebhook(req, res) {
  try {
    const webhookData = req.body;
    await payosService.xuLyWebhookPayOS(webhookData);
    // payOS yêu cầu phản hồi HTTP 200 nhanh chóng
    return res.status(200).json({ error: 0, message: 'Webhook processed successfully' });
  } catch (err) {
    // Trả về 200 hoặc 400 kèm ghi nhận lỗi
    console.error('[payOS Webhook Error]', err.message);
    return res.status(200).json({ error: 1, message: err.message });
  }
}

/**
 * Tra cứu thông tin và trạng thái thanh toán của một đơn hàng
 */
async function layTrangThaiThanhToan(req, res, next) {
  try {
    const { maDonHang } = req.params;
    const ketQua = await payosService.layThongTinThanhToanTheoDon(maDonHang);
    return phanHoiThanhCong(res, {
      duLieu: ketQua,
      thongDiep: 'Lấy trạng thái thanh toán thành công'
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  kiemTraKhaDung,
  taoQrThanhToan,
  xuLyWebhook,
  layTrangThaiThanhToan
};
