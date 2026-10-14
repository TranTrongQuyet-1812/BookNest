/**
 * Dịch vụ xử lý thanh toán VietQR qua payOS.
 * Tuân thủ nghiêm ngặt nguyên tắc bảo mật và quy trình trong docs/KE_HOACH_THANH_TOAN_QR_PAYOS.md.
 */
const { maRutGonChoChuyenKhoan } = require('../utils/maTraCuu');
const { tinhNgayHetHan, sinhMaGiaoDich } = require('../utils/thanhToanQr');
const cauHinh = require('../config/cauHinh');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
const payOSClient = require('./payosClient');
const cauHinhHeThongService = require('./cauHinhHeThongService');
const hetHanThanhToanService = require('./hetHanThanhToanService');
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

  // Đơn đã hủy thì không cấp QR nữa; QR quá hạn thì hủy đơn ngay (không chờ lượt quét định kỳ) rồi báo khách
  if (donHang.TrangThai === 'DA_HUY') {
    throw LoiNghiepVu.xungDot('Đơn hàng đã bị hủy nên không thể thanh toán');
  }
  if (banGhiThanhToan?.TrangThai === 'HET_HAN' || hetHanThanhToanService.laQrHetHan(banGhiThanhToan)) {
    await hetHanThanhToanService.huyDonQrHetHan(banGhiThanhToan);
    throw LoiNghiepVu.xungDot(hetHanThanhToanService.THONG_DIEP_QR_HET_HAN);
  }

  // Nếu đã có link còn chờ thanh toán và chưa hết hạn, tái sử dụng đúng mã QR cũ (khách mở lại QR)
  if (banGhiThanhToan && banGhiThanhToan.TrangThai === 'CHO_THANH_TOAN' && banGhiThanhToan.DuongDanThanhToan && banGhiThanhToan.NgayHetHan > new Date()) {
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

  const ngayHetHan = tinhNgayHetHan();

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

// Tiền đã về nhưng khoản thanh toán không còn chờ (đã hết hạn hoặc bị hủy): giữ nguyên đơn đã hủy,
// đánh dấu CAN_HOAN_TIEN để nhân viên hoàn tiền cho khách, tuyệt đối không bỏ sót khoản tiền này
async function ghiNhanTienVeMuon(thanhToan, orderCode, noiDungTho) {
  await ThanhToan.update(
    { TrangThai: 'CAN_HOAN_TIEN', NgayThanhToan: new Date() },
    { where: { MaThanhToan: thanhToan.MaThanhToan } }
  );
  await NhatKyWebhookPayos.create({
    MaGiaoDichPayos: orderCode,
    NoiDungTho: noiDungTho,
    ChuKyHopLe: true,
    KetQuaXuLy: 'DA_XU_LY'
  });
  console.warn(`[payOS] Tiền về cho khoản thanh toán ${thanhToan.MaThanhToan} đã hết hạn hoặc bị hủy (mã GD ${orderCode}), cần hoàn tiền`);
  return { thanhCong: true, thongDiep: 'Tiền về sau khi đơn đã hủy, đã đánh dấu cần hoàn tiền' };
}

// Cập nhật có điều kiện không đổi được dòng nào: hoặc webhook trùng đã xử lý trước, hoặc khoản vừa bị hủy do hết hạn
async function xuLyKhongDoiDuocTrangThai(thanhToan, orderCode, noiDungTho) {
  const hienTai = await ThanhToan.findByPk(thanhToan.MaThanhToan);
  if (hienTai.TrangThai !== 'DA_THANH_TOAN') {
    return ghiNhanTienVeMuon(thanhToan, orderCode, noiDungTho);
  }
  await NhatKyWebhookPayos.create({
    MaGiaoDichPayos: orderCode,
    NoiDungTho: noiDungTho,
    ChuKyHopLe: true,
    KetQuaXuLy: 'BO_QUA_LAP'
  });
  return { thanhCong: true, thongDiep: 'Giao dịch đã được xử lý trước đó (Idempotent)' };
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

  // 3b. Tiền về muộn: khoản đã hết hạn/hủy thì không coi là đã thanh toán, đánh dấu cần hoàn tiền
  if (thanhToan.TrangThai !== 'CHO_THANH_TOAN') {
    return ghiNhanTienVeMuon(thanhToan, orderCode, noiDungTho);
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
    // WHERE TrangThai = CHO_THANH_TOAN: nếu lượt quét hết hạn vừa hủy khoản này thì không ghi đè sang đã thanh toán
    const [soDongDoi] = await ThanhToan.update({
      TrangThai: 'DA_THANH_TOAN',
      NgayThanhToan: new Date(),
      MaThamChieuNganHang: reference || null
    }, { where: { MaThanhToan: thanhToan.MaThanhToan, TrangThai: 'CHO_THANH_TOAN' }, transaction: t });

    if (soDongDoi === 0) {
      await t.rollback();
      return xuLyKhongDoiDuocTrangThai(thanhToan, orderCode, noiDungTho);
    }

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
  if (thanhToan.PhuongThuc === 'CHUYEN_KHOAN_QR' && thanhToan.TrangThai === 'CHO_THANH_TOAN' && thanhToan.DuongDanThanhToan && payOSClient) {
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
        // Webhook chưa tới nên hóa đơn cũng chưa được gửi: gửi ở đây (webhook tới sau sẽ bị bỏ qua vì đã DA_THANH_TOAN)
        donHangService.layChiTietDonHang(maDonHang)
          .then((chiTiet) => emailService.guiEmailHoaDonDonHang(chiTiet, emailService.HINH_THUC_DA_THANH_TOAN_QR))
          .catch((errMail) => console.error('[Lỗi Gửi Email Hóa Đơn]', errMail.message));
      }
    } catch (e) {
      // Bỏ qua lỗi kết nối payOS tạm thời
    }
  }

  // Quá hạn mà chưa trả tiền thì hủy đơn ngay (không đợi lượt quét định kỳ) để trang hiển thị đúng trạng thái.
  // Đặt sau bước đồng bộ ở trên để khoản đã trả mà webhook tới chậm vẫn được cứu
  if (hetHanThanhToanService.laQrHetHan(thanhToan)) {
    await hetHanThanhToanService.huyDonQrHetHan(thanhToan);
    await thanhToan.reload();
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
