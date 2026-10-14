/**
 * Dịch vụ xử lý thanh toán VietQR qua payOS.
 * Tuân thủ nghiêm ngặt nguyên tắc bảo mật và quy trình trong docs/KE_HOACH_THANH_TOAN_QR_PAYOS.md.
 */
const crypto = require('crypto');
const { PayOS } = require('@payos/node');
const { maRutGonChoChuyenKhoan } = require('../utils/maTraCuu');
const cauHinh = require('../config/cauHinh');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
const cauHinhHeThongService = require('./cauHinhHeThongService');
const donHangService = require('./donHangService');
const emailService = require('./emailService');
const {
  sequelize,
  DonHang,
  ThanhToan,
  NhatKyWebhookPayos,
  LichSuTrangThaiDonHang
} = require('../models');
const { phatThanhToanThanhCong } = require('../realtime/socket');

const { KHOA_THANH_TOAN_QR } = cauHinhHeThongService;
const THONG_DIEP_QR_DANG_TAT = 'Chuyển khoản QR đang tạm ngừng. Vui lòng chọn thanh toán khi nhận hàng (COD).';

// Khởi tạo client SDK payOS nếu đã cung cấp đủ 3 khóa trong .env
let payOSClient = null;
if (cauHinh.payos.daCauHinh) {
  try {
    payOSClient = new PayOS({
      clientId: cauHinh.payos.clientId,
      apiKey: cauHinh.payos.apiKey,
      checksumKey: cauHinh.payos.checksumKey
    });
  } catch (err) {
    console.warn('[payOS] Không thể khởi tạo SDK payOS:', err.message);
  }
}

/**
 * Kiểm tra xem công tắc thanh toán QR có đang BẬT và đủ khóa cấu hình không.
 * Thiếu dòng cấu hình hay lỗi đọc CSDL đều coi như TẮT (xem docCongTac).
 */
async function kiemTraCongTacQRDangBat() {
  if (!cauHinh.payos.daCauHinh || !payOSClient) {
    return false;
  }
  return cauHinhHeThongService.docCongTac(KHOA_THANH_TOAN_QR);
}

/**
 * Sinh mã giao dịch orderCode kiểu số nguyên duy nhất cho payOS (tối đa 9007199254740991).
 * Không dùng MaDonHang để orderCode (hiện trên trang payOS/sao kê) không lộ số đơn của cửa hàng:
 * mili giây * 1000 + 3 số ngẫu nhiên (khoảng 16 chữ số, vẫn dưới giới hạn); cột MaGiaoDichPayos có ràng buộc duy nhất.
 */
function sinhMaGiaoDich() {
  return Date.now() * 1000 + crypto.randomInt(1000);
}

/**
 * Trích xuất mã định danh ngân hàng (BIN), STK và nội dung chuyển khoản từ chuỗi QR EMVCo
 */
function trichXuatThongTinTuQr(qr) {
  if (!qr || typeof qr !== 'string') return {};
  const binMatch = qr.match(/0006(\d{6})/);
  const accMatch = qr.match(/0006\d{6}01\d{2}([A-Z0-9]+?)0208QRIBFTTA/);
  const descMatch = qr.match(/08\d{2}([A-Z0-9 ]+?)6304/);
  return {
    bin: binMatch ? binMatch[1] : '970422',
    accountNumber: accMatch ? accMatch[1] : undefined,
    noiDungChuyenKhoan: descMatch ? descMatch[1] : undefined
  };
}

/**
 * Tạo link và mã QR thanh toán payOS cho đơn hàng
 */
async function taoThanhToanQR(donHang, danhSachMon = []) {
  const daBat = await kiemTraCongTacQRDangBat();
  if (!daBat) {
    throw LoiNghiepVu.camTruyCap(THONG_DIEP_QR_DANG_TAT);
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
    const thongTinTrich = trichXuatThongTinTuQr(banGhiThanhToan.QrCode);
    return {
      maTraCuu: donHang.MaTraCuu,
      orderCode: banGhiThanhToan.MaGiaoDichPayos,
      checkoutUrl: banGhiThanhToan.DuongDanThanhToan,
      qrCode: banGhiThanhToan.QrCode,
      bin: thongTinTrich.bin || '970422',
      accountNumber: thongTinTrich.accountNumber,
      noiDungChuyenKhoan: thongTinTrich.noiDungChuyenKhoan || maRutGonChoChuyenKhoan(donHang.MaTraCuu),
      soTien: banGhiThanhToan.SoTien,
      ngayHetHan: banGhiThanhToan.NgayHetHan
    };
  }

  if (!donHang.MaTraCuu) {
    throw new Error('Đơn hàng chưa có mã tra cứu nên chưa thể tạo thanh toán');
  }
  const orderCode = sinhMaGiaoDich();
  // Nội dung chuyển khoản dùng mã tra cứu (BN7K3F9Q), không dùng MaDonHang tăng dần để khỏi lộ số đơn
  const moTa = maRutGonChoChuyenKhoan(donHang.MaTraCuu).slice(0, 25); // payOS: description tối đa 25 ký tự không dấu

  const items = Array.isArray(danhSachMon) && danhSachMon.length > 0
    ? danhSachMon.map(mon => ({
        name: (mon.tenSach || mon.TenSach || `Sách #${mon.maSach || mon.MaSach}`).slice(0, 50),
        quantity: parseInt(mon.soLuong || mon.SoLuong, 10) || 1,
        price: Math.round(Number(mon.donGia || mon.DonGia || 0))
      }))
    : [{ name: `Đơn hàng ${donHang.MaTraCuu}`, quantity: 1, price: soTien }];

  const domainClient = cauHinh.corsStorefront[0] || 'http://localhost:3000';
  const duLieuPayos = {
    orderCode,
    amount: soTien,
    description: moTa,
    items,
    returnUrl: `${domainClient}/orders/${donHang.MaTraCuu}?payment=success`,
    cancelUrl: `${domainClient}/orders/${donHang.MaTraCuu}?payment=cancelled`
  };

  const paymentLinkRes = await payOSClient.paymentRequests.create(duLieuPayos);

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
    maTraCuu: donHang.MaTraCuu,
    orderCode: paymentLinkRes.orderCode,
    checkoutUrl: paymentLinkRes.checkoutUrl,
    qrCode: paymentLinkRes.qrCode,
    accountNumber: paymentLinkRes.accountNumber,
    accountName: paymentLinkRes.accountName,
    bin: paymentLinkRes.bin,
    noiDungChuyenKhoan: moTa,
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
    duLieuXacThuc = await payOSClient.webhooks.verify(webhookBody);
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

    // Tiền đã về thì mới gửi hóa đơn (đơn QR không gửi lúc đặt, xem donHangService.guiHoaDonKhiDatDon)
    donHangService.layChiTietDonHang(thanhToan.MaDonHang)
      .then((chiTiet) => emailService.guiEmailHoaDonDonHang(chiTiet, emailService.HINH_THUC_DA_THANH_TOAN_QR))
      .catch((errMail) => console.error('[Lỗi Gửi Email Hóa Đơn]', errMail.message));

    // Phát sự kiện thời gian thực Socket.IO tới phòng đơn hàng và quản trị viên (T43)
    try {
      phatThanhToanThanhCong({
        maDonHang: thanhToan.MaDonHang,
        maTraCuu: donHang?.MaTraCuu,
        soTien: thanhToan.SoTien,
        maGiaoDichPayos: orderCode
      });
    } catch (errSocket) {
      console.warn('[Socket.IO] Không thể phát sự kiện thanh toán:', errSocket.message);
    }

    return { thanhCong: true, maDonHang: thanhToan.MaDonHang };
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * Tra cứu trạng thái thanh toán hiện tại của một đơn hàng
 */
async function layThongTinThanhToanTheoDon(donHangTraCuu) {
  const maDonHang = donHangTraCuu.MaDonHang;
  const thanhToan = await ThanhToan.findOne({
    where: { MaDonHang: maDonHang }
  });

  if (!thanhToan) {
    return { coThanhToan: false };
  }

  // Nếu đang chờ thanh toán và có client SDK, có thể chủ động kiểm tra trạng thái bên payOS
  if (thanhToan.TrangThai === 'CHO_THANH_TOAN' && thanhToan.MaGiaoDichPayos && payOSClient) {
    try {
      const thongTinPayos = await payOSClient.paymentRequests.get(thanhToan.MaGiaoDichPayos);
      if (thongTinPayos && thongTinPayos.status === 'PAID') {
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

  const thongTinTrich = trichXuatThongTinTuQr(thanhToan.QrCode);
  return {
    coThanhToan: true,
    maTraCuu: donHangTraCuu.MaTraCuu,
    phuongThuc: thanhToan.PhuongThuc,
    trangThai: thanhToan.TrangThai,
    soTien: thanhToan.SoTien,
    maGiaoDichPayos: thanhToan.MaGiaoDichPayos,
    checkoutUrl: thanhToan.DuongDanThanhToan,
    qrCode: thanhToan.QrCode,
    bin: thongTinTrich.bin || '970422',
    accountNumber: thongTinTrich.accountNumber,
    noiDungChuyenKhoan: thongTinTrich.noiDungChuyenKhoan || maRutGonChoChuyenKhoan(donHangTraCuu.MaTraCuu),
    ngayHetHan: thanhToan.NgayHetHan,
    ngayThanhToan: thanhToan.NgayThanhToan
  };
}

/**
 * Đăng ký và xác thực Webhook URL với payOS
 */
async function xacNhanWebhookUrl(webhookUrl) {
  if (!payOSClient) {
    throw new Error('Chưa cấu hình khóa PayOS trong hệ thống');
  }
  return await payOSClient.webhooks.confirm(webhookUrl);
}

module.exports = {
  THONG_DIEP_QR_DANG_TAT,
  kiemTraCongTacQRDangBat,
  taoThanhToanQR,
  xuLyWebhookPayOS,
  layThongTinThanhToanTheoDon,
  xacNhanWebhookUrl
};
