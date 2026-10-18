/**
 * Lớp trung gian kết nối các nhà cung cấp AI (trung lập theo tài liệu docs/KE_HOACH_AI_CHATBOT.md).
 * Hiện tại hỗ trợ NVIDIA NIM (endpoint chuẩn OpenAI API) với model meta/llama-3.2-11b-vision-instruct.
 * Có cơ chế mock để chạy Unit Test 0 tốn token.
 */
const cauHinh = require('../config/cauHinh');

// Biến lưu handler mock khi chạy kiểm thử unit test
let hamGiaLapAI = null;

/**
 * Thiết lập hàm giả lập phản hồi của AI (dành cho Unit Test)
 * @param {Function|null} hamMock
 */
function datHamGiaLapAI(hamMock) {
  hamGiaLapAI = hamMock;
}

/**
 * Gửi yêu cầu hoàn thành hội thoại tới nhà cung cấp AI (hỗ trợ Function Calling)
 * @param {Object} thamSo
 * @param {Array} thamSo.messages - Lịch sử hội thoại [{ role, content, ... }]
 * @param {Array} [thamSo.tools] - Danh sách công cụ khả dụng
 * @param {number} [thamSo.maxTokens=600] - Số lượng token tối đa cho câu trả lời
 * @param {number} [thamSo.temperature=0.3] - Độ sáng tạo
 * @returns {Promise<{ message: Object, usage: Object }>}
 */
async function goiNhaCungCapAI({ messages, tools, maxTokens = 600, temperature = 0.3 }) {
  // Nếu đang trong môi trường mock test thì ưu tiên dùng mock handler để không tốn token thật
  if (hamGiaLapAI) {
    return await hamGiaLapAI({ messages, tools, maxTokens, temperature });
  }

  if (!cauHinh.ai.daCauHinh) {
    throw new Error('Dịch vụ AI chưa được cấu hình khóa API (AI_API_KEY)');
  }

  const diaChiGoc = cauHinh.ai.diaChiGoc.replace(/\/+$/, '');
  const url = `${diaChiGoc}/chat/completions`;

  const bodyData = {
    model: cauHinh.ai.moHinh,
    messages,
    max_tokens: maxTokens,
    temperature
  };

  // Chỉ đính kèm tools nếu có khai báo
  if (Array.isArray(tools) && tools.length > 0) {
    bodyData.tools = tools;
    bodyData.tool_choice = 'auto';
  }

  const controller = new AbortController();
  const thoiGianCho = setTimeout(() => controller.abort(), 60000); // 60s timeout tránh timeout mạng quốc tế khi gọi nhiều vòng Function Calling

  try {
    const phanHoi = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${cauHinh.ai.khoaApi}`
      },
      body: JSON.stringify(bodyData),
      signal: controller.signal
    });

    clearTimeout(thoiGianCho);

    if (!phanHoi.ok) {
      const noiDungLoi = await phanHoi.text();
      console.error('[AI Error Response]', phanHoi.status, noiDungLoi);
      let thongDiepLoi = `Lỗi từ nhà cung cấp AI (Mã ${phanHoi.status})`;
      try {
        const jsonLoi = JSON.parse(noiDungLoi);
        thongDiepLoi = jsonLoi.detail || jsonLoi.message || jsonLoi.title || thongDiepLoi;
      } catch (e) {
        // bỏ qua lỗi parse json
      }
      const loi = new Error(thongDiepLoi);
      loi.status = phanHoi.status;
      throw loi;
    }

    const duLieu = await phanHoi.json();
    const luaChon = duLieu.choices?.[0];

    if (!luaChon || !luaChon.message) {
      throw new Error('Định dạng phản hồi từ AI không hợp lệ');
    }

    return {
      message: luaChon.message,
      usage: duLieu.usage || null
    };
  } catch (loi) {
    clearTimeout(thoiGianCho);
    if (loi.name === 'AbortError') {
      throw new Error('Thời gian chờ phản hồi từ AI quá lâu, vui lòng thử lại sau.');
    }
    throw loi;
  }
}

module.exports = {
  goiNhaCungCapAI,
  datHamGiaLapAI
};
