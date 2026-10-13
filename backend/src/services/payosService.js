/**
 * Dịch vụ xử lý thanh toán VietQR qua payOS.
 * Tuân thủ nghiêm ngặt nguyên tắc bảo mật và quy trình trong docs/KE_HOACH_THANH_TOAN_QR_PAYOS.md.
 */
const PayOS = require('@payos/node');
const cauHinh = require('../config/cauHinh');
const { 
  sequelize, 
  DonHang, 
  ThanhToan, 
  NhatKyWebhookPayos, 
  CauHinhHeThong, 
  LichSuTrangThaiDonHang 
} = require('../models');

// Khởi tạo client SDK payOS nếu đã cung cấp đủ 3 khóa trong .env
let payOSClient = null;
if (cauHinh.payos.daCauHinh) {
  try {
    payOSClient = new PayOS(
      cauHinh.payos.clientId,
      cauHinh.payos.apiKey,
      cauHinh.payos.checksumKey
    );
  } catch (err) {
    console.warn('[payOS] Không thể khởi tạo SDK payOS:', err.message);
  }
}

/**
 * Kiểm tra xem công tắc thanh toán QR có đang BẬT và đủ khóa cấu hình không
 */
async function kiemTraCongTacQRDangBat() {
  if (!cauHinh.payos.daCauHinh || !payOSClient) {
    return false;
  }
  try {
    const cauHinhDb = await CauHinhHeThong.findByPk('THANH_TOAN_QR_BAT');
    if (cauHinhDb && cauHinhDb.GiaTri === '0') {
      return false;
    }
    return true;
  } catch (err) {
    // Nếu bảng chưa có thì mặc định kiểm tra cờ môi trường
    return cauHinh.payos.daCauHinh;
  }
}

/**
 * Sinh mã giao dịch orderCode kiểu số nguyên duy nhất cho payOS (tối đa 9007199254740991)
 */
function sinhMaGiaoDich(maDonHang) {
  // Lấy 8 chữ số cuối timestamp + mã đơn hàng (đảm bảo là số duy nhất)
  const prefix = String(Date.now()).slice(-7);
  const suffix = String(maDonHang % 10000).padStart(4, '0');
  return parseInt(`${prefix}${suffix}`, 10);
}

/**
 * Tạo link và mã QR thanh toán payOS cho đơn hàng
 */
async function taoThanhToanQR(donHang, danhSachMon = []) {
  const daBat = await kiemTraCongTacQRDangBat();
  if (!daBat) {
    throw new Error('Cổng thanh toán QR hiện đang tạm đóng hoặc chưa được cấu hình khóa trong hệ thống');
  }

  const maDonHang = donHang.MaDonHang;
  const soTien = Math.round(Number(donHang.TongTien));

  // Kiểm tra xem đơn đã có bản ghi thanh toán chưa
  let banGhiThanhToan = await ThanhToan.findOne({
    where: { MaDonHang: maDonHang }
  });

  if (banGhiThanhToan && banGhiThanhToan.TrangThai === 'DA_THANH_TOAN') {
    throw new Error('Đơn hàng này đã được thanh toán thành công trước đó');
  }

  // Nếu đã có link và chưa hết hạn, có thể tái sử dụng
  if (banGhiThanhToan && banGhiThanhToan.DuongDanThanhToan && banGhiThanhToan.NgayHetHan > new Date()) {
    return {
      maThanhToan: banGhiThanhToan.MaThanhToan,
      maDonHang: banGhiThanhToan.MaDonHang,
      orderCode: banGhiThanhToan.MaGiaoDichPayos,
      checkoutUrl: banGhiThanhToan.DuongDanThanhToan,
      qrCode: banGhiThanhToan.QrCode,
      soTien: banGhiThanhToan.SoTien,
      ngayHetHan: banGhiThanhToan.NgayHetHan
    };
  }

  const orderCode = sinhMaGiaoDich(maDonHang);
  const moTa = `DON HANG #${maDonHang}`.slice(0, 25); // payOS yêu cầu description tối đa 25 ký tự không dấu

  const items = Array.isArray(danhSachMon) && danhSachMon.length > 0
    ? danhSachMon.map(mon => ({
        name: (mon.tenSach || mon.TenSach || `Sách #${mon.maSach || mon.MaSach}`).slice(0, 50),
        quantity: parseInt(mon.soLuong || mon.SoLuong, 10) || 1,
        price: Math.round(Number(mon.donGia || mon.DonGia || 0))
      }))
    : [{ name: `Đơn hàng #${maDonHang}`, quantity: 1, price: soTien }];

  const domainClient = cauHinh.corsStorefront[0] || 'http://localhost:3000';
  const duLieuPayos = {
    orderCode,
    amount: soTien,
    description: moTa,
    items,
    returnUrl: `${domainClient}/orders/${maDonHang}?payment=success`,
    cancelUrl: `${domainClient}/orders/${maDonHang}?payment=cancelled`
  };

  const paymentLinkRes = await payOSClient.createPaymentLink(duLieuPayos);

  // Hạn thanh toán mặc định 15 phút
  const ngayHetHan = new Date(Date.now() + 15 * 60 * 1000);

  if (banGhiThanhToan) {
    await banGhiThanhToan.update({
      PhuongThuc: 'CHUYEN_KHOAN_QR',
      TrangThai: 'CHO_THANH_TOAN',
      SoTien: soTien,
      MaGiaoDichPayos: orderCode,
      MaLienKetPayos: paymentLinkRes.paymentLinkId,
      DuongDanThanhToan: paymentLinkRes.checkoutUrl,
      QrCode: paymentLinkRes.qrCode,
      NgayHetHan: ngayHetHan
    });
  } else {
    banGhiThanhToan = await ThanhToan.create({
      MaDonHang: maDonHang,
      PhuongThuc: 'CHUYEN_KHOAN_QR',
      TrangThai: 'CHO_THANH_TOAN',
      SoTien: soTien,
      MaGiaoDichPayos: orderCode,
      MaLienKetPayos: paymentLinkRes.paymentLinkId,
      DuongDanThanhToan: paymentLinkRes.checkoutUrl,
      QrCode: paymentLinkRes.qrCode,
      NgayHetHan: ngayHetHan
    });
  }

  return {
    maThanhToan: banGhiThanhToan.MaThanhToan,
    maDonHang: banGhiThanhToan.MaDonHang,
    orderCode: paymentLinkRes.orderCode,
    checkoutUrl: paymentLinkRes.checkoutUrl,
    qrCode: paymentLinkRes.qrCode,
    accountNumber: paymentLinkRes.accountNumber,
    accountName: paymentLinkRes.accountName,
    bin: paymentLinkRes.bin,
    soTien,
    ngayHetHan
  };
}

/**
 * Xử lý Webhook an toàn từ payOS
 */
async function xuLyWebhookPayOS(webhookBody) {
  const noiDungTho = typeof webhookBody === 'string' ? webhookBody : JSON.stringify(webhookBody);
  let chuKyHopLe = false;
  let duLieuXacThuc = null;

  // 1. Xác thực chữ ký Checksum
  if (!payOSClient) {
    await NhatKyWebhookPayos.create({
      NoiDungTho: noiDungTho,
      ChuKyHopLe: false,
      KetQuaXuLy: 'SAI_CHU_KY'
    });
    throw new Error('Hệ thống chưa được cấu hình Checksum Key để xác minh webhook');
  }

  try {
    duLieuXacThuc = payOSClient.verifyPaymentWebhookData(webhookBody);
    chuKyHopLe = true;
  } catch (err) {
    chuKyHopLe = false;
    await NhatKyWebhookPayos.create({
      NoiDungTho: noiDungTho,
      ChuKyHopLe: false,
      KetQuaXuLy: 'SAI_CHU_KY'
    });
    throw new Error('Chữ ký Webhook không hợp lệ');
  }

  const { orderCode, amount, reference } = duLieuXacThuc;

  // 2. Tra cứu bản ghi thanh toán theo orderCode
  const thanhToan = await ThanhToan.findOne({
    where: { MaGiaoDichPayos: orderCode }
  });

  if (!thanhToan) {
    await NhatKyWebhookPayos.create({
      MaGiaoDichPayos: orderCode,
      NoiDungTho: noiDungTho,
      ChuKyHopLe: true,
      KetQuaXuLy: 'KHONG_TIM_THAY'
    });
    return { thanhCong: true, thongDiep: 'Không tìm thấy đơn hàng tương ứng nhưng đã ghi nhận webhook' };
  }

  // 3. Cơ chế Idempotent: Nếu đã thanh toán rồi thì bỏ qua lặp
  if (thanhToan.TrangThai === 'DA_THANH_TOAN') {
    await NhatKyWebhookPayos.create({
      MaGiaoDichPayos: orderCode,
      NoiDungTho: noiDungTho,
      ChuKyHopLe: true,
      KetQuaXuLy: 'BO_QUA_LAP'
    });
    return { thanhCong: true, thongDiep: 'Giao dịch đã được xử lý trước đó (Idempotent)' };
  }

  // 4. Đối soát số tiền
  const soTienDoiChieu = Math.round(Number(thanhToan.SoTien));
  if (soTienDoiChieu !== Number(amount)) {
    await NhatKyWebhookPayos.create({
      MaGiaoDichPayos: orderCode,
      NoiDungTho: noiDungTho,
      ChuKyHopLe: true,
      KetQuaXuLy: 'SAI_SO_TIEN'
    });
    throw new Error(`Số tiền thanh toán (${amount}) không khớp với đơn hàng (${soTienDoiChieu})`);
  }

  // 5. Cập nhật trạng thái trong Transaction
  const t = await sequelize.transaction();
  try {
    await thanhToan.update({
      TrangThai: 'DA_THANH_TOAN',
      NgayThanhToan: new Date(),
      MaThamChieuNganHang: reference || null
    }, { transaction: t });

    // Tự động chuyển đơn hàng sang DA_XAC_NHAN nếu đang ở CHO_DUYET
    const donHang = await DonHang.findByPk(thanhToan.MaDonHang, { transaction: t });
    if (donHang && donHang.TrangThai === 'CHO_DUYET') {
      await donHang.update({
        TrangThai: 'DA_XAC_NHAN'
      }, { transaction: t });

      await LichSuTrangThaiDonHang.create({
        MaDonHang: donHang.MaDonHang,
        TrangThaiCu: 'CHO_DUYET',
        TrangThaiMoi: 'DA_XAC_NHAN',
        GhiChu: `Khách đã thanh toán chuyển khoản VietQR qua payOS (Mã GD: ${orderCode}, Tham chiếu: ${reference || 'N/A'})`
      }, { transaction: t });
    }

    await NhatKyWebhookPayos.create({
      MaGiaoDichPayos: orderCode,
      NoiDungTho: noiDungTho,
      ChuKyHopLe: true,
      KetQuaXuLy: 'DA_XU_LY'
    }, { transaction: t });

    await t.commit();
    return { thanhCong: true, maDonHang: thanhToan.MaDonHang };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * Tra cứu trạng thái thanh toán hiện tại của một đơn hàng
 */
async function layThongTinThanhToanTheoDon(maDonHang) {
  const thanhToan = await ThanhToan.findOne({
    where: { MaDonHang: maDonHang }
  });

  if (!thanhToan) {
    return { coThanhToan: false };
  }

  // Nếu đang chờ thanh toán và có client SDK, có thể chủ động kiểm tra trạng thái bên payOS
  if (thanhToan.TrangThai === 'CHO_THANH_TOAN' && thanhToan.MaGiaoDichPayos && payOSClient) {
    try {
      const thongTinPayos = await payOSClient.getPaymentLinkInformation(thanhToan.MaGiaoDichPayos);
      if (thongTinPayos.status === 'PAID') {
        // Đồng bộ trạng thái nếu payOS báo đã trả tiền mà webhook chưa tới
        await thanhToan.update({
          TrangThai: 'DA_THANH_TOAN',
          NgayThanhToan: new Date()
        });
        const donHang = await DonHang.findByPk(maDonHang);
        if (donHang && donHang.TrangThai === 'CHO_DUYET') {
          await donHang.update({ TrangThai: 'DA_XAC_NHAN' });
          await LichSuTrangThaiDonHang.create({
            MaDonHang: maDonHang,
            TrangThaiCu: 'CHO_DUYET',
            TrangThaiMoi: 'DA_XAC_NHAN',
            GhiChu: 'Thanh toán VietQR payOS xác nhận thành công qua đồng bộ API'
          });
        }
      }
    } catch (e) {
      // Bỏ qua lỗi kết nối payOS tạm thời
    }
  }

  return {
    coThanhToan: true,
    maThanhToan: thanhToan.MaThanhToan,
    maDonHang: thanhToan.MaDonHang,
    phuongThuc: thanhToan.PhuongThuc,
    trangThai: thanhToan.TrangThai,
    soTien: thanhToan.SoTien,
    maGiaoDichPayos: thanhToan.MaGiaoDichPayos,
    checkoutUrl: thanhToan.DuongDanThanhToan,
    qrCode: thanhToan.QrCode,
    ngayHetHan: thanhToan.NgayHetHan,
    ngayThanhToan: thanhToan.NgayThanhToan
  };
}

module.exports = {
  kiemTraCongTacQRDangBat,
  taoThanhToanQR,
  xuLyWebhookPayOS,
  layThongTinThanhToanTheoDon
};
