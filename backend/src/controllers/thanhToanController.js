/**
 * Controller xử lý các yêu cầu liên quan đến cổng thanh toán VietQR (payOS).
 */
const payosService = require('../services/payosService');
const hetHanThanhToanService = require('../services/hetHanThanhToanService');
const { DonHang, ChiTietDonHang, Sach } = require('../models');
const { phanHoiThanhCong, phanHoiLoi } = require('../middlewares/phanHoi');
const { chuanHoaMaTraCuu } = require('../utils/maTraCuu');

// API thanh toán không cần đăng nhập nên chỉ nhận MaTraCuu (khó đoán), không nhận MaDonHang tăng dần,
// nếu không ai cũng dò được từng đơn và đếm được số đơn. Mã sai định dạng hay không tồn tại đều trả cùng một 404.
async function timDonTheoMaTraCuu(chuoiMa, tuyChon = {}) {
  const maTraCuu = chuanHoaMaTraCuu(chuoiMa);
  if (!maTraCuu) return null;
  return DonHang.findOne({ where: { MaTraCuu: maTraCuu }, ...tuyChon });
}

// Khách đăng nhập chỉ được thao tác đơn của chính mình. Đơn khách vãng lai (MaKhachHang rỗng) không có chủ tài khoản,
// quyền truy cập dựa vào việc biết mã tra cứu khó đoán
function khongPhaiChuDon(user, donHang) {
  return Boolean(user && user.role === 'khach_hang' && donHang.MaKhachHang && donHang.MaKhachHang !== user.id);
}

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
    const donHang = await timDonTheoMaTraCuu(req.params.maTraCuu, {
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

    if (khongPhaiChuDon(req.user, donHang)) {
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
 * Khách đổi đơn từ chuyển khoản QR sang thanh toán khi nhận hàng (COD) trước khi QR hết hạn
 */
async function doiSangCOD(req, res, next) {
  try {
    const donHang = await timDonTheoMaTraCuu(req.params.maTraCuu);
    if (!donHang) {
      return phanHoiLoi(res, { thongDiep: 'Không tìm thấy thông tin đơn hàng', maTrangThai: 404 });
    }
    if (khongPhaiChuDon(req.user, donHang)) {
      return phanHoiLoi(res, { thongDiep: 'Bạn không có quyền thao tác trên đơn hàng này (IDOR Guard)', maTrangThai: 403 });
    }

    const ketQua = await hetHanThanhToanService.doiSangCOD(donHang);
    return phanHoiThanhCong(res, { duLieu: ketQua, thongDiep: 'Đã đổi sang thanh toán khi nhận hàng (COD)' });
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
    const donHang = await timDonTheoMaTraCuu(req.params.maTraCuu);
    if (!donHang) {
      return phanHoiLoi(res, {
        thongDiep: 'Không tìm thấy thông tin đơn hàng',
        maTrangThai: 404
      });
    }
    const ketQua = await payosService.layThongTinThanhToanTheoDon(donHang);
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
  doiSangCOD,
  xuLyWebhook,
  layTrangThaiThanhToan
};
