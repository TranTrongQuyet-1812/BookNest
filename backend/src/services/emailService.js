/**
 * Dịch vụ Gửi Email Thông Báo & Hóa Đơn Tự Động (BookNest Email Service).
 * Hỗ trợ:
 * 1. Gửi mã OTP xác thực khi quên mật khẩu.
 * 2. Gửi hóa đơn xác nhận đơn hàng khi đặt sách thành công.
 * 3. Gửi thông báo khi trạng thái đơn hàng thay đổi.
 * Tích hợp chế độ Safe Dev Mode / Mock Testing (không crash server khi chưa nạp thông tin SMTP).
 */
const nodemailer = require('nodemailer');
const cauHinh = require('../config/cauHinh');

// Nhật ký lưu email giả lập phục vụ kiểm thử tự động
const nhatKyEmailGiaLap = [];

/**
 * Định dạng số tiền sang chuẩn tiền tệ Việt Nam (VNĐ)
 */
function dinhDangTien(soTien) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(soTien || 0));
}

/**
 * Tạo transporter nodemailer nếu đã cấu hình SMTP thật, ngược lại dùng mock transport
 */
let transporter = null;
if (cauHinh.email.daCauHinh && process.env.NODE_ENV !== 'test' && !cauHinh.email.giaLap) {
  transporter = nodemailer.createTransport({
    host: cauHinh.email.mayChu,
    port: cauHinh.email.cong,
    secure: cauHinh.email.baoMat,
    auth: {
      user: cauHinh.email.nguoiDung,
      pass: cauHinh.email.matKhau
    }
  });
}

/**
 * Hàm gửi mail cốt lõi với cơ chế dự phòng an toàn
 */
async function guiMail({ nguoiNhan, tieuDe, html, text }) {
  if (!nguoiNhan) return false;

  const thongTinMail = {
    from: cauHinh.email.nguoiGui,
    to: nguoiNhan,
    subject: tieuDe,
    text: text || tieuDe,
    html: html
  };

  // Nếu đang ở môi trường test hoặc bật chế độ mock (EMAIL_MOCK=true) hoặc chưa cấu hình SMTP thật -> chạy chế độ Mock an toàn
  if (!transporter || process.env.NODE_ENV === 'test' || cauHinh.email.giaLap) {
    nhatKyEmailGiaLap.push({
      ...thongTinMail,
      thoiGian: new Date()
    });
    console.log(`[Safe Dev Mode] [Email Đã Gửi Tới: ${nguoiNhan}] Tiêu đề: "${tieuDe}"`);
    return true;
  }

  try {
    await transporter.sendMail(thongTinMail);
    return true;
  } catch (loi) {
    console.error(`[Lỗi Gửi Email] Không thể gửi tới ${nguoiNhan}:`, loi.message);
    return false;
  }
}

/**
 * 1. Gửi mã OTP xác nhận quên mật khẩu
 */
async function guiEmailMaXacNhan(email, maOtp, thoiHanPhut = 15) {
  const tieuDe = `[BookNest] Mã xác nhận đặt lại mật khẩu: ${maOtp}`;
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #FDFBF7; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="background-color: #1E293B; padding: 24px 32px; text-align: center;">
        <h1 style="color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.02em;">BookNest Bookstore</h1>
        <p style="color: #94A3B8; margin: 6px 0 0; font-size: 13px;">Hệ Thống Phục Hồi Tài Khoản Bảo Mật</p>
      </div>
      
      <div style="padding: 32px; color: #334155;">
        <h2 style="font-size: 18px; font-weight: 700; color: #0F172A; margin-top: 0;">Yêu cầu đặt lại mật khẩu</h2>
        <p style="font-size: 14px; line-height: 1.6; color: #475569;">
          Chào bạn,<br>
          Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản liên kết với địa chỉ email <strong>${email}</strong> trên BookNest.
        </p>
        
        <div style="background-color: #FEF3C7; border: 1px solid #FCD34D; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0;">
          <div style="font-size: 12px; font-weight: 600; color: #92400E; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px;">Mã xác thực OTP của bạn</div>
          <div style="font-size: 32px; font-weight: 800; color: #B45309; letter-spacing: 6px;">${maOtp}</div>
          <div style="font-size: 12px; color: #B45309; margin-top: 8px;">Mã này có hiệu lực trong vòng <strong>${thoiHanPhut} phút</strong>.</div>
        </div>
        
        <p style="font-size: 13px; line-height: 1.6; color: #64748B;">
          ⚠️ <strong>Lưu ý bảo mật:</strong> Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email này. Tài khoản của bạn vẫn an toàn và không có thay đổi nào xảy ra.
        </p>
      </div>

      <div style="background-color: #F8FAFC; padding: 16px 32px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #94A3B8;">
        © ${new Date().getFullYear()} BookNest Bookstore • Thư viện tri thức trực tuyến
      </div>
    </div>
  `;

  return guiMail({
    nguoiNhan: email,
    tieuDe,
    html,
    text: `Mã xác thực OTP đặt lại mật khẩu BookNest của bạn là: ${maOtp}. Mã có hiệu lực trong ${thoiHanPhut} phút.`
  });
}

const HINH_THUC_COD = 'Thanh toán khi nhận hàng (COD)';
const HINH_THUC_DA_THANH_TOAN_QR = 'Đã thanh toán qua chuyển khoản VietQR';

/**
 * 2. Gửi hóa đơn xác nhận đơn hàng.
 * Đơn COD gửi ngay khi đặt; đơn chuyển khoản QR chỉ gửi sau khi payOS báo đã nhận tiền (hinhThucThanhToan ghi rõ điều đó).
 */
async function guiEmailHoaDonDonHang(donHang, hinhThucThanhToan = HINH_THUC_COD) {
  const emailNhan = donHang.EmailNhan;
  if (!emailNhan) return false;

  const maHienThi = donHang.MaTraCuu || `BN-${donHang.MaDonHang}`;
  const tieuDe = `[BookNest] Xác nhận đơn hàng thành công #${maHienThi}`;

  // Chuẩn bị danh sách chi tiết các cuốn sách (hỗ trợ cả alias Sequelize chiTietDonHang và ChiTietDonHangs)
  const danhSachMon = donHang.chiTietDonHang || donHang.ChiTietDonHangs || [];
  const hangSachHtml = danhSachMon.map(mon => {
    const tenSach = mon.sach?.TenSach || mon.Sach?.TenSach || mon.TenSach || `Sách #${mon.MaSach}`;
    const soLuong = mon.SoLuong || 1;
    const donGia = Number(mon.DonGia || 0);
    const thanhTien = donGia * soLuong;
    return `
      <tr style="border-bottom: 1px solid #E2E8F0;">
        <td style="padding: 12px 8px; font-size: 13px; color: #1E293B; font-weight: 600;">${tenSach}</td>
        <td style="padding: 12px 8px; font-size: 13px; color: #64748B; text-align: center;">${soLuong}</td>
        <td style="padding: 12px 8px; font-size: 13px; color: #64748B; text-align: right;">${dinhDangTien(donGia)}</td>
        <td style="padding: 12px 8px; font-size: 13px; color: #0F172A; font-weight: 700; text-align: right;">${dinhDangTien(thanhTien)}</td>
      </tr>
    `;
  }).join('');

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="background-color: #1E293B; padding: 24px 32px; text-align: center;">
        <h1 style="color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 700;">BookNest Bookstore</h1>
        <p style="color: #94A3B8; margin: 6px 0 0; font-size: 13px;">Hóa Đơn Điện Tử & Xác Nhận Đơn Hàng</p>
      </div>

      <div style="padding: 32px; color: #334155;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 20px; border-bottom: 1px solid #F1F5F9; padding-bottom: 16px;">
          <div>
            <div style="font-size: 12px; color: #64748B; text-transform: uppercase; font-weight: 600;">Mã đơn hàng</div>
            <div style="font-size: 18px; font-weight: 800; color: #0F172A;">#${maHienThi}</div>
          </div>
          <div style="text-align: right;">
            <div style="font-size: 12px; color: #64748B; text-transform: uppercase; font-weight: 600;">Ngày đặt hàng</div>
            <div style="font-size: 14px; font-weight: 600; color: #334155;">${new Date(donHang.NgayDat || Date.now()).toLocaleDateString('vi-VN')}</div>
          </div>
        </div>

        <div style="background-color: #F8FAFC; border-radius: 8px; padding: 16px; margin-bottom: 24px; font-size: 13px; line-height: 1.6;">
          <div><strong>Người nhận:</strong> ${donHang.TenNguoiNhan || 'Quý khách'}</div>
          <div><strong>Số điện thoại:</strong> ${donHang.SoDienThoaiNhan || 'Chưa cung cấp'}</div>
          <div><strong>Địa chỉ giao hàng:</strong> ${donHang.DiaChiGiaoHang || 'Nhận tại quầy'}</div>
          <div><strong>Kênh mua hàng:</strong> ${donHang.KenhBan === 'TAI_QUAY' ? 'Mua trực tiếp tại quầy' : 'Đặt trực tuyến Storefront'}</div>
          <div><strong>Hình thức thanh toán:</strong> ${hinhThucThanhToan}</div>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="border-bottom: 2px solid #CBD5E1; background-color: #F1F5F9;">
              <th style="padding: 10px 8px; text-align: left; font-size: 12px; color: #475569; text-transform: uppercase;">Tên sách</th>
              <th style="padding: 10px 8px; text-align: center; font-size: 12px; color: #475569; text-transform: uppercase;">SL</th>
              <th style="padding: 10px 8px; text-align: right; font-size: 12px; color: #475569; text-transform: uppercase;">Đơn giá</th>
              <th style="padding: 10px 8px; text-align: right; font-size: 12px; color: #475569; text-transform: uppercase;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${hangSachHtml}
          </tbody>
        </table>

        <div style="border-top: 2px solid #E2E8F0; padding-top: 16px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; font-size: 13px; color: #64748B; margin-bottom: 6px;">
            <span>Phí vận chuyển:</span>
            <span style="font-weight: 600; color: #10B981;">Miễn phí (Freeship toàn sàn)</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 800; color: #0F172A; margin-top: 10px;">
            <span>Tổng cộng thanh toán:</span>
            <span style="color: #D97706; font-size: 18px;">${dinhDangTien(donHang.TongTien)}</span>
          </div>
        </div>

        <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 8px; padding: 14px; font-size: 12px; color: #1E40AF; line-height: 1.6;">
          📖 Cảm ơn bạn đã lựa chọn những trang sách từ BookNest! Bạn có thể dùng mã <strong>${maHienThi}</strong> để tra cứu tiến trình đơn hàng bất cứ lúc nào qua website hoặc trợ lý AI Chatbot.
        </div>
      </div>

      <div style="background-color: #F8FAFC; padding: 16px 32px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #94A3B8;">
        © ${new Date().getFullYear()} BookNest Bookstore • Thư viện tri thức trực tuyến
      </div>
    </div>
  `;

  return guiMail({
    nguoiNhan: emailNhan,
    tieuDe,
    html,
    text: `Xác nhận đơn hàng BookNest #${maHienThi}. Tổng thanh toán: ${dinhDangTien(donHang.TongTien)}. Cảm ơn quý khách!`
  });
}

/**
 * 3. Gửi email thông báo cập nhật trạng thái đơn hàng
 */
async function guiEmailCapNhatTrangThai(donHang, trangThaiMoi, ghiChuLyDo = '') {
  const emailNhan = donHang.EmailNhan;
  if (!emailNhan) return false;

  const maHienThi = donHang.MaTraCuu || `BN-${donHang.MaDonHang}`;

  const bangTrangThai = {
    'CHO_DUYET': { ten: 'Chờ duyệt', mau: '#F59E0B', moTa: 'Đơn hàng đang chờ nhân viên tiếp nhận và duyệt.' },
    'DA_DUYET': { ten: 'Đã duyệt', mau: '#3B82F6', moTa: 'Đơn hàng đã được duyệt và đang chuẩn bị.' }, // không gửi email ở bước này (T59)
    'DA_LAY_HANG': { ten: 'Đã lấy hàng', mau: '#8B5CF6', moTa: 'Kiện sách đã được đơn vị vận chuyển lấy khỏi kho và đang trên đường đến bạn.' },
    'DA_GIAO': { ten: 'Đã giao hàng', mau: '#10B981', moTa: 'Đơn hàng đã được giao trọn vẹn. Chúc bạn có những giờ phút đọc sách tuyệt vời!' },
    'DA_HUY': { ten: 'Đã hủy đơn hàng', mau: '#EF4444', moTa: 'Đơn hàng này đã bị hủy.' }
  };

  const thongTinTrangThai = bangTrangThai[trangThaiMoi] || { ten: trangThaiMoi, mau: '#64748B', moTa: '' };
  const tieuDe = `[BookNest] Cập nhật đơn hàng #${maHienThi}: ${thongTinTrangThai.ten}`;

  // Kiểm tra nếu đơn hàng bị hủy là đơn thanh toán QR đã thanh toán / cần hoàn tiền
  const thongTinThanhToan = donHang.thanhToan || donHang.ThanhToan;
  const daThanhToanQr = trangThaiMoi === 'DA_HUY' &&
    thongTinThanhToan &&
    thongTinThanhToan.PhuongThuc === 'CHUYEN_KHOAN_QR' &&
    ['DA_THANH_TOAN', 'CAN_HOAN_TIEN'].includes(thongTinThanhToan.TrangThai);

  const thongBaoHoanTienHtml = daThanhToanQr
    ? `<div style="margin-top: 10px; font-size: 13px; color: #047857; background-color: #ECFDF5; padding: 10px 14px; border-radius: 6px; border: 1px solid #A7F3D0;">💳 <strong>Lưu ý hoàn tiền:</strong> Khoản thanh toán của bạn sẽ được cửa hàng hoàn lại.</div>`
    : '';

  const thongBaoHoanTienText = daThanhToanQr
    ? ' Khoản thanh toán của bạn sẽ được cửa hàng hoàn lại.'
    : '';

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; background-color: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="background-color: #1E293B; padding: 24px 32px; text-align: center;">
        <h1 style="color: #FFFFFF; margin: 0; font-size: 22px; font-weight: 700;">BookNest Bookstore</h1>
        <p style="color: #94A3B8; margin: 6px 0 0; font-size: 13px;">Thông Báo Tiến Trình Đơn Hàng</p>
      </div>

      <div style="padding: 32px; color: #334155;">
        <div style="font-size: 14px; color: #64748B; margin-bottom: 8px;">Kính gửi quý khách <strong>${donHang.TenNguoiNhan || 'Bạn'}</strong>,</div>
        <p style="font-size: 14px; line-height: 1.6; color: #475569; margin-top: 0;">
          Đơn hàng <strong>#${maHienThi}</strong> của bạn vừa có cập nhật trạng thái mới nhất:
        </p>

        <div style="background-color: #F8FAFC; border-left: 4px solid ${thongTinTrangThai.mau}; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 20px 0;">
          <div style="font-size: 12px; font-weight: 600; color: #64748B; text-transform: uppercase;">Trạng thái hiện tại</div>
          <div style="font-size: 20px; font-weight: 800; color: ${thongTinTrangThai.mau}; margin: 4px 0;">${thongTinTrangThai.ten}</div>
          <div style="font-size: 13px; color: #475569; line-height: 1.5;">${thongTinTrangThai.moTa}</div>
          ${ghiChuLyDo ? `<div style="margin-top: 10px; font-size: 13px; color: #64748B;"><strong>Lý do / Ghi chú:</strong> ${ghiChuLyDo}</div>` : ''}
          ${thongBaoHoanTienHtml}
        </div>

        <div style="font-size: 13px; color: #64748B; line-height: 1.6; border-top: 1px solid #F1F5F9; padding-top: 16px;">
          <div>• <strong>Mã đơn hàng:</strong> #${maHienThi}</div>
          <div>• <strong>Tổng thanh toán:</strong> ${dinhDangTien(donHang.TongTien)}</div>
          <div>• <strong>Địa chỉ giao nhận:</strong> ${donHang.DiaChiGiaoHang || 'Nhận tại quầy'}</div>
        </div>
      </div>

      <div style="background-color: #F8FAFC; padding: 16px 32px; border-top: 1px solid #E2E8F0; text-align: center; font-size: 12px; color: #94A3B8;">
        © ${new Date().getFullYear()} BookNest Bookstore • Thư viện tri thức trực tuyến
      </div>
    </div>
  `;

  return guiMail({
    nguoiNhan: emailNhan,
    tieuDe,
    html,
    text: `Đơn hàng #${maHienThi} cập nhật trạng thái: ${thongTinTrangThai.ten}. ${ghiChuLyDo ? 'Lý do: ' + ghiChuLyDo : ''}${thongBaoHoanTienText}`.trim()
  });
}

/**
 * Các hàm tiện ích phục vụ Unit Test
 */
function layNhatKyEmailGiaLap() {
  return [...nhatKyEmailGiaLap];
}

function xoaNhatKyEmailGiaLap() {
  nhatKyEmailGiaLap.length = 0;
}

module.exports = {
  HINH_THUC_COD,
  HINH_THUC_DA_THANH_TOAN_QR,
  guiEmailMaXacNhan,
  guiEmailHoaDonDonHang,
  guiEmailCapNhatTrangThai,
  layNhatKyEmailGiaLap,
  xoaNhatKyEmailGiaLap
};
