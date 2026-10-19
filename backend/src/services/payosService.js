/**
 * Dịch vụ xử lý thanh toán VietQR qua payOS.
 * Tuân thủ nghiêm ngặt nguyên tắc bảo mật và quy trình trong docs/KE_HOACH_THANH_TOAN_QR_PAYOS.md.
 */
const { maRutGonChoChuyenKhoan } = require('../utils/maTraCuu');
const { tinhNgayHetHan, tinhNgayHetHanQuay, sinhMaGiaoDich } = require('../utils/thanhToanQr');
const cauHinh = require('../config/cauHinh');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
const payOSClient = require('./payosClient');
const cauHinhHeThongService = require('./cauHinhHeThongService');
const hetHanThanhToanService = require('./hetHanThanhToanService');
const donHangService = require('./donHangService');
const emailService = require('./emailService');
const { Op } = require('sequelize');
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
async function taoThanhToanQR(donHang, danhSachMon = [], options = {}) {
  const transaction = options.transaction || null;
  const daBat = await kiemTraCongTacQRDangBat();
  if (!daBat) {
    throw LoiNghiepVu.camTruyCap(THONG_DIEP_QR_DANG_TAT);
  }

  const maDonHang = donHang.MaDonHang;
  const soTien = Math.round(Number(donHang.TongTien));

  // Kiểm tra xem đơn đã có bản ghi thanh toán chưa
  let banGhiThanhToan = await ThanhToan.findOne({
    where: { MaDonHang: maDonHang },
    transaction
  });

  if (banGhiThanhToan && banGhiThanhToan.TrangThai === 'DA_THANH_TOAN') {
    throw LoiNghiepVu.xungDot('Đơn hàng này đã được thanh toán thành công trước đó');
  }

  // Đơn chọn COD thì không tạo lại mã thanh toán QR
  if (banGhiThanhToan && banGhiThanhToan.PhuongThuc === 'TIEN_MAT_KHI_NHAN_HANG') {
    throw LoiNghiepVu.xungDot('Đơn hàng này được đặt với hình thức thanh toán khi nhận hàng (COD), không thể tạo mã thanh toán QR');
  }

  // Đơn đã hủy hoặc đã giao/đang giao thì không cấp QR nữa
  if (donHang.TrangThai === 'DA_HUY') {
    throw LoiNghiepVu.xungDot('Đơn hàng đã bị hủy nên không thể thanh toán');
  }
  if (['DA_GIAO', 'DA_LAY_HANG'].includes(donHang.TrangThai)) {
    const nhanTrangThai = donHang.TrangThai === 'DA_GIAO' ? 'Đã giao hàng' : 'Đã lấy hàng';
    throw LoiNghiepVu.xungDot(`Đơn hàng đang ở trạng thái ${nhanTrangThai}, không thể tạo mã thanh toán QR`);
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

  // Đơn quầy hết hạn sau 5 phút, đơn trực tuyến sau 15 phút
  const ngayHetHan = donHang.KenhBan === 'TAI_QUAY' ? tinhNgayHetHanQuay() : tinhNgayHetHan();

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
    }, { transaction });
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
    }, { transaction });
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
// đánh dấu CAN_HOAN_TIEN để nhân viên hoàn tiền cho khách, tuyệt đối không bỏ sót khoản tiền này.
// ĐẶC BIỆT: Nếu khoản đã là CAN_HOAN_TIEN hoặc DA_HOAN_TIEN thì không mở lại hoặc cập nhật đè (Idempotent).
async function ghiNhanTienVeMuon(thanhToan, orderCode, noiDungTho) {
  if (['CAN_HOAN_TIEN', 'DA_HOAN_TIEN'].includes(thanhToan.TrangThai)) {
    await NhatKyWebhookPayos.create({
      MaGiaoDichPayos: orderCode,
      NoiDungTho: noiDungTho,
      ChuKyHopLe: true,
      KetQuaXuLy: 'BO_QUA_LAP'
    });
    return { thanhCong: true, thongDiep: 'Khoản thanh toán đã được ghi nhận hoàn tiền trước đó (Idempotent)' };
  }

  await ThanhToan.update(
    { TrangThai: 'CAN_HOAN_TIEN', NgayThanhToan: new Date() },
    { where: { MaThanhToan: thanhToan.MaThanhToan, TrangThai: { [Op.notIn]: ['CAN_HOAN_TIEN', 'DA_HOAN_TIEN'] } } }
  );
  await NhatKyWebhookPayos.create({
    MaGiaoDichPayos: orderCode,
    NoiDungTho: noiDungTho,
    ChuKyHopLe: true,
    KetQuaXuLy: 'DA_XU_LY'
  });
  console.warn(`[payOS] Tiền về cho khoản thanh toán ${thanhToan.MaThanhToan} đã hết hạn hoặc bị hủy (mã GD ${orderCode}), cần hoàn tiền`);
  try {
    const { phatSuKien } = require('../realtime/socket');
    const donHangLienKet = await DonHang.findByPk(thanhToan.MaDonHang, { attributes: ['MaTraCuu', 'MaKhachHang'] });
    const duLieuSocket = {
      maThanhToan: thanhToan.MaThanhToan,
      maDonHang: thanhToan.MaDonHang,
      maTraCuu: donHangLienKet?.MaTraCuu,
      soTien: thanhToan.SoTien,
      lyDo: 'Tiền về sau khi đơn đã hủy',
      thoiGian: new Date().toISOString()
    };
    phatSuKien('thanhToan:canHoanTien', duLieuSocket, 'nhan_vien');
    if (donHangLienKet?.MaTraCuu) {
      phatSuKien('thanhToan:canHoanTien', duLieuSocket, `don_hang:${donHangLienKet.MaTraCuu}`);
    }
    if (donHangLienKet?.MaKhachHang) {
      phatSuKien('thanhToan:canHoanTien', duLieuSocket, `khach_hang:${donHangLienKet.MaKhachHang}`);
    }
  } catch (e) {
    console.warn('[Socket.IO] Không thể phát sự kiện tiền về muộn:', e.message);
  }
  return { thanhCong: true, thongDiep: 'Tiền về sau khi đơn đã hủy, đã đánh dấu cần hoàn tiền' };
}

// Cập nhật có điều kiện không đổi được dòng nào: hoặc webhook trùng đã xử lý trước, hoặc khoản vừa bị hủy do hết hạn
async function xuLyKhongDoiDuocTrangThai(thanhToan, orderCode, noiDungTho) {
  const hienTai = await ThanhToan.findByPk(thanhToan.MaThanhToan);
  if (!hienTai || ['DA_THANH_TOAN', 'CAN_HOAN_TIEN', 'DA_HOAN_TIEN'].includes(hienTai.TrangThai)) {
    await NhatKyWebhookPayos.create({
      MaGiaoDichPayos: orderCode,
      NoiDungTho: noiDungTho,
      ChuKyHopLe: true,
      KetQuaXuLy: 'BO_QUA_LAP'
    });
    return { thanhCong: true, thongDiep: 'Giao dịch đã được xử lý trước đó (Idempotent)' };
  }
  return ghiNhanTienVeMuon(hienTai, orderCode, noiDungTho);
}

/**
 * Xử lý Webhook an toàn từ payOS
 */
async function xuLyWebhookPayOS(webhookBody) {
  const noiDungTho = typeof webhookBody === 'string' ? webhookBody : JSON.stringify(webhookBody);
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
  } catch (_err) {
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

  // 3. Cơ chế Idempotent: Nếu đã thanh toán, đã đánh dấu cần hoàn hoặc đã hoàn tiền thì tuyệt đối bỏ qua lặp (chống mở lại khoản đã hoàn)
  if (['DA_THANH_TOAN', 'CAN_HOAN_TIEN', 'DA_HOAN_TIEN'].includes(thanhToan.TrangThai)) {
    await NhatKyWebhookPayos.create({
      MaGiaoDichPayos: orderCode,
      NoiDungTho: noiDungTho,
      ChuKyHopLe: true,
      KetQuaXuLy: 'BO_QUA_LAP'
    });
    return { thanhCong: true, thongDiep: 'Giao dịch đã được xử lý trước đó (Idempotent)' };
  }

  // 3b. Tiền về muộn hoặc đơn đã bị hủy: không coi là đã thanh toán, đánh dấu cần hoàn tiền
  const donHangLienKet = await DonHang.findByPk(thanhToan.MaDonHang);
  if (thanhToan.TrangThai !== 'CHO_THANH_TOAN' || !donHangLienKet || donHangLienKet.TrangThai === 'DA_HUY') {
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

    // T59 / DT: Webhook payOS không tự duyệt đơn trực tuyến. Đơn trực tuyến giữ nguyên trạng thái (CHO_DUYET), chỉ khoản thanh toán thành DA_THANH_TOAN.
    // T55: Đơn bán tại quầy (KenhBan = TAI_QUAY) đang CHO_DUYET -> Chuyển thẳng sang DA_GIAO
    const donHang = await DonHang.findByPk(thanhToan.MaDonHang, { transaction: t });
    let trangThaiDonMoi = donHang?.TrangThai || 'CHO_DUYET';

    if (donHang && donHang.KenhBan === 'TAI_QUAY' && donHang.TrangThai === 'CHO_DUYET') {
      await donHang.update({ TrangThai: 'DA_GIAO' }, { transaction: t });
      trangThaiDonMoi = 'DA_GIAO';

      await LichSuTrangThaiDonHang.create({
        MaDonHang: donHang.MaDonHang,
        TrangThaiCu: 'CHO_DUYET',
        TrangThaiMoi: 'DA_GIAO',
        MaNhanVienThucHien: donHang.MaNhanVienLap || null,
        GhiChu: 'Thanh toán QR tại quầy'
      }, { transaction: t });
    }

    await NhatKyWebhookPayos.create({
      MaGiaoDichPayos: orderCode,
      NoiDungTho: noiDungTho,
      ChuKyHopLe: true,
      KetQuaXuLy: 'DA_XU_LY'
    }, { transaction: t });

    await t.commit();

    // Tiền đã về thì mới gửi hóa đơn cho đơn trực tuyến (đơn quầy không gửi email hóa đơn)
    if (donHang && donHang.KenhBan !== 'TAI_QUAY') {
      donHangService.layChiTietDonHang(thanhToan.MaDonHang)
        .then((chiTiet) => emailService.guiEmailHoaDonDonHang(chiTiet, emailService.HINH_THUC_DA_THANH_TOAN_QR))
        .catch((errMail) => console.error('[Lỗi Gửi Email Hóa Đơn]', errMail.message));
    }

    // Phát sự kiện thời gian thực Socket.IO tới phòng đơn hàng và quản trị viên (T43) kèm trạng thái đơn thật
    try {
      phatThanhToanThanhCong({
        maDonHang: thanhToan.MaDonHang,
        maTraCuu: donHang?.MaTraCuu,
        soTien: thanhToan.SoTien,
        maGiaoDichPayos: orderCode,
        trangThaiDonHang: trangThaiDonMoi
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
async function layThongTinThanhToanTheoDon(donHangInput) {
  let donHangTraCuu = donHangInput;
  const maDonHang = (typeof donHangInput === 'object' && donHangInput !== null)
    ? donHangInput.MaDonHang
    : donHangInput;

  if (typeof donHangTraCuu !== 'object' || !donHangTraCuu?.MaTraCuu) {
    donHangTraCuu = await DonHang.findByPk(maDonHang);
  }

  const thanhToan = await ThanhToan.findOne({
    where: { MaDonHang: maDonHang }
  });

  if (!thanhToan) {
    return { coThanhToan: false };
  }

  // Nếu đang chờ thanh toán và có client SDK, có thể chủ động kiểm tra trạng thái bên payOS
  if (thanhToan.PhuongThuc === 'CHUYEN_KHOAN_QR' && thanhToan.TrangThai === 'CHO_THANH_TOAN' && thanhToan.DuongDanThanhToan && payOSClient) {
    let thongTinPayos = null;
    try {
      thongTinPayos = await payOSClient.paymentRequests.get(thanhToan.MaGiaoDichPayos);
    } catch (errKetNoiPayos) {
      // Hỏi payOS chỉ để đồng bộ sớm, webhook vẫn là nguồn chính: không hỏi được (mạng, timeout, payOS trả lỗi)
      // thì ghi cảnh báo và trả trạng thái hiện có trong CSDL, không làm trang theo dõi đơn của khách lỗi 500
      console.warn('[payOS] Không thể kết nối tới cổng payOS để đồng bộ trạng thái:', errKetNoiPayos.message);
    }

    if (thongTinPayos && thongTinPayos.status === 'PAID') {
      const donHang = await DonHang.findByPk(maDonHang);
      if (!donHang || donHang.TrangThai === 'DA_HUY') {
        await ghiNhanTienVeMuon(
          thanhToan,
          thanhToan.MaGiaoDichPayos,
          `Tiền về sau khi đơn đã hủy (phát hiện qua truy vấn trạng thái payOS: ${JSON.stringify(thongTinPayos)})`
        );
        await thanhToan.reload();
      } else {
        // Đồng bộ trạng thái nguyên tử qua Transaction nếu payOS báo đã trả tiền mà webhook chưa tới
        // Tuân thủ "lỗi thì báo lỗi": Lỗi CSDL sẽ được ném ra ngoài minh bạch, không nuốt âm thầm
        const tDongBo = await sequelize.transaction();
        let soDongCapNhat = 0;
        let trangThaiDonMoi = donHangTraCuu?.TrangThai || 'CHO_DUYET';
        try {
          const [soDong] = await ThanhToan.update(
            {
              TrangThai: 'DA_THANH_TOAN',
              NgayThanhToan: new Date()
            },
            {
              where: {
                MaThanhToan: thanhToan.MaThanhToan,
                TrangThai: 'CHO_THANH_TOAN'
              },
              transaction: tDongBo
            }
          );
          soDongCapNhat = soDong;

          // T59 / DT: Đối soát tự động cũng không tự duyệt đơn trực tuyến (CHO_DUYET)
          // T55: Đơn quầy chuyển thẳng DA_GIAO
          if (donHangTraCuu && donHangTraCuu.KenhBan === 'TAI_QUAY' && donHangTraCuu.TrangThai === 'CHO_DUYET') {
            await DonHang.update({ TrangThai: 'DA_GIAO' }, { where: { MaDonHang: maDonHang, TrangThai: 'CHO_DUYET' }, transaction: tDongBo });
            await LichSuTrangThaiDonHang.create({
              MaDonHang: maDonHang,
              TrangThaiCu: 'CHO_DUYET',
              TrangThaiMoi: 'DA_GIAO',
              MaNhanVienThucHien: donHangTraCuu.MaNhanVienLap || null,
              GhiChu: 'Thanh toán QR tại quầy'
            }, { transaction: tDongBo });
            trangThaiDonMoi = 'DA_GIAO';
          }

          await tDongBo.commit();
        } catch (errDb) {
          await tDongBo.rollback();
          console.error('[payOS] Lỗi transaction khi đồng bộ thanh toán vào CSDL:', errDb.message);
          throw errDb;
        }

        if (soDongCapNhat > 0) {
          await thanhToan.reload();

          // Webhook chưa tới nên hóa đơn cũng chưa được gửi: đơn trực tuyến gửi email hóa đơn, đơn quầy không gửi
          if (donHangTraCuu && donHangTraCuu.KenhBan !== 'TAI_QUAY') {
            donHangService.layChiTietDonHang(maDonHang)
              .then((chiTiet) => emailService.guiEmailHoaDonDonHang(chiTiet, emailService.HINH_THUC_DA_THANH_TOAN_QR))
              .catch((errMail) => console.error('[Lỗi Gửi Email Hóa Đơn]', errMail.message));
          }

          // Phát sự kiện realtime đầy đủ cho cả nhân viên và phòng của khách
          try {
            phatThanhToanThanhCong({
              maDonHang: thanhToan.MaDonHang,
              maTraCuu: donHangTraCuu?.MaTraCuu,
              soTien: thanhToan.SoTien,
              maGiaoDichPayos: thanhToan.MaGiaoDichPayos,
              trangThaiDonHang: trangThaiDonMoi
            });

            if (donHangTraCuu?.MaTraCuu) {
              const { phatSuKien } = require('../realtime/socket');
              const thongTinCapNhat = {
                maDonHang: thanhToan.MaDonHang,
                maTraCuu: donHangTraCuu.MaTraCuu,
                trangThaiDonHang: trangThaiDonMoi,
                trangThaiThanhToan: 'DA_THANH_TOAN',
                thoiGian: new Date().toISOString()
              };
              phatSuKien('donHang:capNhatTrangThai', thongTinCapNhat, 'nhan_vien');
              phatSuKien('donHang:capNhatTrangThai', thongTinCapNhat, `don_hang:${donHangTraCuu.MaTraCuu}`);
              if (donHangTraCuu?.MaKhachHang) {
                phatSuKien('donHang:capNhatTrangThai', thongTinCapNhat, `khach_hang:${donHangTraCuu.MaKhachHang}`);
              }
            }
          } catch (errSocket) {
            console.warn('[Socket.IO] Không thể phát sự kiện đồng bộ thanh toán:', errSocket.message);
          }
        }
      }
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

/**
 * Hủy link thanh toán trên cổng payOS khi đơn hàng bị hủy
 */
async function huyLinkPayOS(orderCode, lyDo = 'Đơn hàng đã bị hủy') {
  if (!payOSClient || !orderCode) return;
  try {
    await payOSClient.paymentRequests.cancel(orderCode, String(lyDo).slice(0, 50));
  } catch (err) {
    console.warn(`[payOS] Không thể hủy link thanh toán ${orderCode}:`, err.message);
  }
}

module.exports = {
  THONG_DIEP_QR_DANG_TAT,
  kiemTraCongTacQRDangBat,
  taoThanhToanQR,
  xuLyWebhookPayOS,
  layThongTinThanhToanTheoDon,
  xacNhanWebhookUrl,
  huyLinkPayOS
};
