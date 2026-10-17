/**
 * Tầng Controller tiếp nhận yêu cầu trò chuyện cùng BookNest AI Chatbot.
 */
const cauHinh = require('../config/cauHinh');
const { phanHoiThanhCong, phanHoiLoi } = require('../middlewares/phanHoi');
const aiChatbotService = require('../services/aiChatbotService');
const cauHinhHeThongService = require('../services/cauHinhHeThongService');

/**
 * Lấy trạng thái hoạt động của trợ lý AI Chatbot
 */
async function layTrangThai(req, res) {
  const congTacBat = await cauHinhHeThongService.docCongTac(cauHinhHeThongService.KHOA_AI_CHATBOT, cauHinh.ai.daBat);
  const daBat = Boolean(cauHinh.ai.daBat && congTacBat);

  return phanHoiThanhCong(res, {
    thongDiep: 'Trạng thái AI Chatbot',
    duLieu: {
      daBat,
      daCauHinh: cauHinh.ai.daCauHinh
    }
  });
}

/**
 * Gửi tin nhắn và nhận câu trả lời từ AI Chatbot
 */
async function guiTinNhan(req, res) {
  // Kiểm tra cờ bật/tắt của hệ thống (kết hợp biến môi trường và công tắc khẩn cấp trong CSDL - Task T41)
  const congTacBat = await cauHinhHeThongService.docCongTac(cauHinhHeThongService.KHOA_AI_CHATBOT, cauHinh.ai.daBat);
  if (!cauHinh.ai.daBat || !congTacBat) {
    return phanHoiLoi(res, {
      maTrangThai: 503,
      thongDiep: 'Tính năng trợ lý AI hiện đang tạm bảo trì để nâng cấp. Vui lòng thử lại sau.'
    });
  }

  // Kiểm tra cấu hình API Key
  if (!cauHinh.ai.daCauHinh) {
    return phanHoiLoi(res, {
      maTrangThai: 503,
      thongDiep: 'Tính năng trợ lý AI chưa được kích hoạt khóa truy cập. Vui lòng liên hệ quản trị viên.'
    });
  }

  let { messages = [], tinNhan = '' } = req.body;

  const tinNhanMoi = String(tinNhan || '').trim();
  if (!tinNhanMoi) {
    return phanHoiLoi(res, {
      maTrangThai: 400,
      thongDiep: 'Nội dung tin nhắn không được để trống.'
    });
  }

  if (tinNhanMoi.length > 500) {
    return phanHoiLoi(res, {
      maTrangThai: 400,
      thongDiep: 'Tin nhắn quá dài (tối đa 500 ký tự).'
    });
  }

  // HÀNG RÀO KIỂM TRA LỊCH SỬ CHAT (Anti-abuse Guard): Chống gửi payload khổng lồ làm cạn RAM và token
  if (!Array.isArray(messages)) {
    messages = [];
  }
  // Khống chế tối đa 20 tin nhắn gần nhất
  if (messages.length > 20) {
    messages = messages.slice(-20);
  }

  let tongDungLuong = 0;
  for (const msg of messages) {
    const doDai = typeof msg?.content === 'string' ? msg.content.length : 0;
    if (doDai > 1000) {
      return phanHoiLoi(res, {
        maTrangThai: 400,
        thongDiep: 'Nội dung tin nhắn trong lịch sử quá dài (tối đa 1000 ký tự mỗi tin).'
      });
    }
    tongDungLuong += doDai;
  }

  if (tongDungLuong > 5000) {
    return phanHoiLoi(res, {
      maTrangThai: 400,
      thongDiep: 'Tổng dung lượng lịch sử hội thoại vượt quá giới hạn (tối đa 5000 ký tự).'
    });
  }

  // BẢO MẬT & PHÂN QUYỀN: Nhận diện khách hàng BẮT BUỘC dựa trên JWT đã xác thực (aud === 'khach_hang'),
  // TUYỆT ĐỐI KHÔNG tin req.body.daDangNhap hay req.body.tenKhachHang do client tự gửi lên.
  const maKhachHang = req.nguoiDung?.MaKhachHang || null;
  const daDangNhap = Boolean(maKhachHang);
  const tenKhachHang = req.nguoiDung?.fullName || req.nguoiDung?.HoTen || '';

  const ipClient = req.ip || req.connection?.remoteAddress || 'unknown_ip';
  const sessionId = req.headers['x-session-id'] || 'no_session';
  const khoaPhien = `${ipClient}_${sessionId}`;

  try {
    const ketQua = await aiChatbotService.xuLyHoiThoaiAI({
      lichSuChat: messages,
      tinNhanMoi,
      maKhachHang,
      daDangNhap,
      tenKhachHang,
      khoaPhien,
      ipClient
    });

    return phanHoiThanhCong(res, {
      thongDiep: 'Phản hồi từ BookNest AI',
      duLieu: ketQua
    });
  } catch (err) {
    console.error('[Lỗi AI Chatbot Controller]:', err.message);
    return phanHoiLoi(res, {
      maTrangThai: 500,
      thongDiep: 'Không thể kết nối đến máy chủ AI vào lúc này. Vui lòng thử lại sau ít phút.'
    });
  }
}

/**
 * Lấy số liệu thống kê tiêu thụ token AI hôm nay (dành cho Quản trị viên)
 */
async function layThongKe(req, res) {
  try {
    const thongKe = await aiChatbotService.layThongKeChatbotHomNay();
    return phanHoiThanhCong(res, {
      thongDiep: 'Lấy thống kê tiêu thụ AI Chatbot thành công.',
      duLieu: thongKe
    });
  } catch (err) {
    console.error('[Lỗi Thống Kê AI Chatbot Controller]:', err.message);
    return phanHoiLoi(res, {
      maTrangThai: 500,
      thongDiep: 'Không thể lấy số liệu thống kê AI Chatbot.'
    });
  }
}

module.exports = {
  layTrangThai,
  guiTinNhan,
  layThongKe
};
