/**
 * Hết hạn thanh toán chuyển khoản QR và đổi sang COD (quyết định của chủ dự án 14/10/2026):
 * đơn QR quá hạn mà chưa trả tiền thì coi như BỊ HỦY (nhả hàng về kho), không treo mãi ở "Chờ chuyển khoản".
 * Khách muốn trả tiền mặt thì phải chủ động đổi sang COD trước hạn (doiSangCOD), khi đó đơn không bị hủy.
 */
const { Op } = require('sequelize');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
const payOSClient = require('./payosClient');
const donHangService = require('./donHangService');
const emailService = require('./emailService');
const { sequelize, DonHang, ChiTietDonHang, ThanhToan, LichSuTrangThaiDonHang } = require('../models');
const { phatDonHetHan } = require('../realtime/socket');

const THONG_DIEP_QR_HET_HAN = 'Mã QR đã hết hạn nên đơn hàng đã bị hủy. Vui lòng đặt lại đơn mới.';
const CHU_KY_QUET_MS = 60 * 1000;

// Khoản QR còn chờ tiền nhưng quá NgayHetHan
function laQrHetHan(thanhToan) {
  return Boolean(thanhToan)
    && thanhToan.PhuongThuc === 'CHUYEN_KHOAN_QR'
    && thanhToan.TrangThai === 'CHO_THANH_TOAN'
    && Boolean(thanhToan.NgayHetHan)
    && thanhToan.NgayHetHan <= new Date();
}

// Đóng link bên payOS để khách không còn trả tiền được vào link đã hủy. Lỗi mạng chỉ ghi log: nếu tiền vẫn về,
// webhook sẽ đánh dấu CAN_HOAN_TIEN thay vì bỏ sót (xem payosService.xuLyWebhookPayOS)
async function dongLinkPayos(thanhToan, lyDo) {
  // Khoản chưa tạo được link (tạo QR lỗi) thì bên payOS chưa có gì để đóng
  if (!payOSClient || !thanhToan.DuongDanThanhToan) return;
  try {
    await payOSClient.paymentRequests.cancel(Number(thanhToan.MaGiaoDichPayos), lyDo);
  } catch (loi) {
    console.warn('[payOS] Không đóng được link thanh toán:', loi.message);
  }
}

/**
 * Hủy một đơn QR đã hết hạn: khoản thanh toán sang HET_HAN, đơn CHO_DUYET sang DA_HUY, hoàn tồn kho, ghi lịch sử.
 * WHERE TrangThai = CHO_THANH_TOAN để không đè lên khoản vừa được trả (webhook) hoặc vừa đổi COD; chạy trùng cũng an toàn.
 * Trả về true nếu lần gọi này đã hủy được đơn.
 */
async function huyDonQrHetHan(thanhToan) {
  const t = await sequelize.transaction();
  let daHuyDon = false;
  try {
    const [soDong] = await ThanhToan.update(
      { TrangThai: 'HET_HAN' },
      { where: { MaThanhToan: thanhToan.MaThanhToan, TrangThai: 'CHO_THANH_TOAN' }, transaction: t }
    );
    if (soDong === 0) {
      await t.rollback();
      return false;
    }

    const donHang = await DonHang.findByPk(thanhToan.MaDonHang, {
      include: [{ model: ChiTietDonHang, as: 'chiTietDonHang' }],
      transaction: t
    });
    // Nhân viên đã tự xử lý đơn (khác CHO_DUYET) thì chỉ đánh dấu khoản thanh toán hết hạn, không hủy đơn của họ
    if (donHang?.TrangThai === 'CHO_DUYET') {
      await donHang.update({ TrangThai: 'DA_HUY' }, { transaction: t });
      await donHangService.hoanTonKho(donHang.chiTietDonHang, t);
      await LichSuTrangThaiDonHang.create({
        MaDonHang: donHang.MaDonHang,
        TrangThaiCu: 'CHO_DUYET',
        TrangThaiMoi: 'DA_HUY',
        GhiChu: 'Hết hạn thanh toán chuyển khoản QR, hệ thống tự hủy đơn'
      }, { transaction: t });
      daHuyDon = true;
    }
    await t.commit();
  } catch (loi) {
    await t.rollback();
    throw loi;
  }

  await dongLinkPayos(thanhToan, 'Hết hạn thanh toán');
  if (daHuyDon) await baoDonBiHuy(thanhToan.MaDonHang);
  return daHuyDon;
}

// Sau khi hủy: gửi email cho khách (trực tuyến) và báo realtime cho trang đang mở và nhân viên
async function baoDonBiHuy(maDonHang) {
  const chiTietDon = await donHangService.layChiTietDonHang(maDonHang);
  if (chiTietDon && chiTietDon.KenhBan !== 'TAI_QUAY') {
    emailService.guiEmailCapNhatTrangThai(chiTietDon, 'DA_HUY', 'Quá hạn thanh toán chuyển khoản QR')
      .catch((loi) => console.error('[Lỗi Gửi Email Hủy Đơn]', loi.message));
  }
  try {
    phatDonHetHan({ maDonHang, maTraCuu: chiTietDon?.MaTraCuu });
  } catch (loi) {
    console.warn('[Socket.IO] Không thể phát sự kiện hết hạn:', loi.message);
  }
}

/**
 * Quét toàn bộ khoản QR đã quá hạn và hủy đơn tương ứng. Chạy định kỳ (batDauQuetHetHan),
 * ngoài ra từng đơn còn được kiểm tra ngay khi khách mở hoặc tạo lại QR nên không phải chờ chu kỳ quét.
 */
async function quetDonQrHetHan() {
  const danhSach = await ThanhToan.findAll({
    where: {
      PhuongThuc: 'CHUYEN_KHOAN_QR',
      TrangThai: 'CHO_THANH_TOAN',
      NgayHetHan: { [Op.lte]: new Date() }
    }
  });
  for (const thanhToan of danhSach) {
    try {
      await huyDonQrHetHan(thanhToan);
    } catch (loi) {
      console.error(`[Hết hạn QR] Không hủy được khoản thanh toán ${thanhToan.MaThanhToan}:`, loi.message);
    }
  }
  return danhSach.length;
}

// Chạy một lượt ngay khi khởi động (bắt các đơn quá hạn lúc máy chủ tắt) rồi lặp mỗi phút
function batDauQuetHetHan() {
  const quet = () => quetDonQrHetHan().catch((loi) => console.error('[Hết hạn QR] Lượt quét lỗi:', loi.message));
  quet();
  return setInterval(quet, CHU_KY_QUET_MS).unref();
}

/**
 * Khách chủ động đổi từ chuyển khoản QR sang COD trước khi hết hạn: khoản thanh toán thành COD đang chờ,
 * link payOS bị đóng, gửi email xác nhận như đơn COD. Đơn từ đó không còn bị hủy do hết hạn.
 */
async function doiSangCOD(donHang) {
  if (donHang.TrangThai !== 'CHO_DUYET') {
    throw LoiNghiepVu.xungDot('Đơn hàng đã được xử lý hoặc đã bị hủy nên không thể đổi hình thức thanh toán');
  }
  const thanhToan = await ThanhToan.findOne({ where: { MaDonHang: donHang.MaDonHang } });
  if (!thanhToan) {
    throw LoiNghiepVu.xungDot('Đơn hàng này không có thanh toán chuyển khoản nào đang chờ');
  }

  const [soDong] = await ThanhToan.update(
    { PhuongThuc: 'COD', TrangThai: 'CHO_THANH_TOAN', DuongDanThanhToan: null, QrCode: null, NgayHetHan: null },
    { where: { MaThanhToan: thanhToan.MaThanhToan, PhuongThuc: 'CHUYEN_KHOAN_QR', TrangThai: 'CHO_THANH_TOAN' } }
  );
  if (soDong === 0) {
    throw LoiNghiepVu.xungDot('Khoản chuyển khoản không còn chờ thanh toán (đã trả tiền hoặc đã hết hạn)');
  }

  await dongLinkPayos(thanhToan, 'Khách đổi sang thanh toán khi nhận hàng');
  const chiTietDon = await donHangService.layChiTietDonHang(donHang.MaDonHang);
  emailService.guiEmailHoaDonDonHang(chiTietDon, emailService.HINH_THUC_COD)
    .catch((loi) => console.error('[Lỗi Gửi Email Hóa Đơn]', loi.message));
  return { maTraCuu: donHang.MaTraCuu, phuongThuc: 'COD' };
}

module.exports = {
  THONG_DIEP_QR_HET_HAN,
  laQrHetHan,
  huyDonQrHetHan,
  quetDonQrHetHan,
  batDauQuetHetHan,
  doiSangCOD
};
