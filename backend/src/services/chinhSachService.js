/**
 * Module quản lý tập trung toàn bộ Chính sách của Hệ thống BookNest (Single Source of Truth - SSOT).
 * Đảm bảo tính nhất quán tuyệt đối giữa:
 *   1. Các trang Điều khoản / Chính sách hiển thị trên Storefront
 *   2. System Prompt và phản hồi tư vấn của AI Chatbot
 *   3. Logic tính toán phí vận chuyển và quy trình hoàn tiền ở Backend
 */

const CHINH_SACH_VAN_CHUYEN = {
  tieuDe: 'Chính sách vận chuyển & Giao nhận',
  phiVanChuyen: 0,
  moTaPhi: 'MIỄN PHÍ VẬN CHUYỂN (FREESHIP) CHO 100% MỌI ĐƠN HÀNG trên toàn quốc (Phí vận chuyển: 0đ). Tuyệt đối KHÔNG thu phí ship 25k hay đặt điều kiện giá trị đơn hàng!',
  thoiGianGiao: 'Từ 1–2 ngày làm việc đối với khu vực nội thành, 3–5 ngày làm việc đối với các tỉnh/thành khác.',
  dongKiem: 'Khách hàng có quyền mở gói hàng kiểm tra ngoại quan (đúng tựa sách, đủ số lượng, không rách nát) cùng nhân viên bưu tá trước khi nhận hàng.',
  dongGoi: 'Mỗi cuốn sách đều được bọc màng bóng khí chống sốc và chèn góc để bảo vệ mép bìa và gáy sách nguyên vẹn.'
};

const CHINH_SACH_HOAN_TIEN = {
  tieuDe: 'Chính sách thanh toán & Hoàn tiền',
  phuongThuc: [
    'Thanh toán khi nhận hàng (COD): Kiểm tra sách và thanh toán tiền mặt trực tiếp cho nhân viên giao hàng.',
    'Chuyển khoản VietQR tự động qua payOS: Quét mã QR bằng ứng dụng ngân hàng, xác nhận tức thì trong 15 phút.'
  ],
  quyTrinhHoanTien: 'Trường hợp khách chuyển khoản khi đơn đã quá hạn hoặc bị hủy, hệ thống sẽ tự động ghi nhận trạng thái CẦN HOÀN TIỀN để nhân viên BookNest liên hệ hỗ trợ đối soát hoàn tiền về tài khoản ngân hàng của bạn (mã trạng thái CAN_HOAN_TIEN, không có hoàn tiền tự động tức thì).',
  camKetTuDong: false // Tuyệt đối không cam kết hoàn tiền tự động tức thì hay 24h
};

const CHINH_SACH_DOI_TRA = {
  tieuDe: 'Chính sách đổi trả & Bảo hành sách',
  thoiHan: '7 ngày kể từ ngày nhận sách thành công (đơn hàng ở trạng thái ĐÃ GIAO).',
  dieuKien: 'Sách bị lỗi in ấn từ nhà xuất bản (thiếu trang, ngược chữ, rách trang) hoặc hư hỏng gãy gáy do quá trình vận chuyển.',
  chiPhiDoiTra: 'BookNest chịu 100% chi phí vận chuyển 2 chiều khi đổi trả sách lỗi cho khách hàng.'
};

const CHINH_SACH_BAO_MAT_AI = {
  tieuDe: 'Bảo vệ dữ liệu hội thoại AI Chatbot',
  nhaCungCap: 'NVIDIA Cloud NIM (meta/llama-3.2-11b-vision-instruct)',
  canhBaoNguoiDung: 'Dữ liệu trò chuyện được xử lý qua hạ tầng AI đám mây bảo mật. Tuyệt đối không nhập mật khẩu, mã OTP hoặc thông tin thẻ ngân hàng/tài khoản cá nhân vào khung chat.',
  luuTru: 'Hệ thống chỉ lưu vết số liệu kỹ thuật và lượng token tiêu thụ để kiểm soát chất lượng, không lưu trữ thông tin nhạy cảm của khách hàng.'
};

/**
 * Trích xuất ngữ cảnh chính sách dạng văn bản súc tích để nạp vào Lời nhắc Hệ thống (System Prompt) của AI Chatbot.
 * Giúp LLM luôn nắm bắt chính xác 100% chính sách mới nhất mà không cần sửa code prompt thủ công.
 */
function layNguCanhChinhSachChoAI() {
  return `
--- NGUỒN CHÍNH SÁCH CHUẨN CỦA CỬA HÀNG BOOKNEST (SINGLE SOURCE OF TRUTH) ---
1. VẬN CHUYỂN & GIAO HÀNG:
   - ${CHINH_SACH_VAN_CHUYEN.moTaPhi} Phí ship: 0đ.
   - Thời gian giao: ${CHINH_SACH_VAN_CHUYEN.thoiGianGiao}
   - Đồng kiểm: ${CHINH_SACH_VAN_CHUYEN.dongKiem}
   - Đóng gói: ${CHINH_SACH_VAN_CHUYEN.dongGoi}

2. THANH TOÁN & HOÀN TIỀN:
   - Các phương thức: ${CHINH_SACH_HOAN_TIEN.phuongThuc.join('; ')}
   - Quy trình hoàn tiền: ${CHINH_SACH_HOAN_TIEN.quyTrinhHoanTien}
   - Lưu ý quan trọng: Tuyệt đối KHÔNG hứa hẹn hoàn tiền tự động trong 24 giờ.

3. ĐỔI TRẢ & BẢO HÀNH:
   - Thời hạn: ${CHINH_SACH_DOI_TRA.thoiHan}
   - Điều kiện: ${CHINH_SACH_DOI_TRA.dieuKien}
   - Chi phí: ${CHINH_SACH_DOI_TRA.chiPhiDoiTra}

4. BẢO MẬT & AI:
   - Trợ lý AI vận hành bởi ${CHINH_SACH_BAO_MAT_AI.nhaCungCap}.
   - Cảnh báo: ${CHINH_SACH_BAO_MAT_AI.canhBaoNguoiDung}
--------------------------------------------------------------------------
`.trim();
}

/**
 * Trả về toàn bộ dữ liệu chính sách có cấu trúc phục vụ API hoặc Render giao diện
 */
function layTatCaChinhSach() {
  return {
    vanChuyen: CHINH_SACH_VAN_CHUYEN,
    hoanTien: CHINH_SACH_HOAN_TIEN,
    doiTra: CHINH_SACH_DOI_TRA,
    baoMatAI: CHINH_SACH_BAO_MAT_AI
  };
}

module.exports = {
  CHINH_SACH_VAN_CHUYEN,
  CHINH_SACH_HOAN_TIEN,
  CHINH_SACH_DOI_TRA,
  CHINH_SACH_BAO_MAT_AI,
  layNguCanhChinhSachChoAI,
  layTatCaChinhSach
};
