/**
 * Tầng Controller tiếp nhận yêu cầu trò chuyện cùng BookNest AI Chatbot.
 */
const cauHinh = require('../config/cauHinh');
const { phanHoiThanhCong, phanHoiLoi } = require('../middlewares/phanHoi');
const aiChatbotService = require('../services/aiChatbotService');

/**
 * Lấy trạng thái hoạt động của trợ lý AI Chatbot
 */
async function layTrangThai(req, res) {
  return phanHoiThanhCong(res, {
    thongDiep: 'Trạng thái AI Chatbot',
    duLieu: {
      daBat: cauHinh.ai.daBat,
      daCauHinh: cauHinh.ai.daCauHinh,
      nhaCungCap: cauHinh.ai.nhaCungCap,
      moHinh: cauHinh.ai.moHinh
    }
  });
}

/**
 * Gửi tin nhắn và nhận câu trả lời từ AI Chatbot
 */
async function guiTinNhan(req, res) {
  // Kiểm tra cờ bật/tắt của hệ thống
  if (!cauHinh.ai.daBat) {
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

  const { messages = [], tinNhan = '' } = req.body;

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

  // Nhận diện khách hàng nếu đã đăng nhập từ token (nếu có)
  const maKhachHang = req.nguoiDung?.MaKhachHang || req.nguoiDung?.maKhachHang || null;

  try {
    const ketQua = await aiChatbotService.xuLyHoiThoaiAI({
      lichSuChat: messages,
      tinNhanMoi,
      maKhachHang
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

module.exports = {
  layTrangThai,
  guiTinNhan
};
