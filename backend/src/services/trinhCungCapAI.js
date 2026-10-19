/**
 * Lớp trung gian kết nối các nhà cung cấp AI (trung lập theo tài liệu docs/KE_HOACH_AI_CHATBOT.md mục 11 - T54).
 * Hỗ trợ xoay tua tự động (Rotation) giữa các nhà cung cấp:
 *   1. Gemini model chính (gemini-3.1-flash-lite hoặc cấu hình GEMINI_MODEL)
 *   2. Gemini model phụ (nếu cấu hình GEMINI_MODEL_PHU - vd: gemini-3.5-flash-lite)
 *   3. NVIDIA NIM dự phòng (meta/llama-3.2-11b-vision-instruct)
 * Trạng thái khóa (khoaDen) lưu trong RAM của tiến trình backend theo đúng bảng 11.4:
 *   - 429 theo phút: khóa 65 giây.
 *   - 429 theo ngày (RPD/PerDay): khóa đến 07:00 giờ Việt Nam kế tiếp, thử lại mỗi 30 phút.
 *   - 5xx / timeout (Gemini 20s, NVIDIA 30s): khóa 60 giây.
 *   - 401/403: lỗi xác thực cấu hình, không tự mở khóa và ghi log rõ ràng.
 */
const cauHinh = require('../config/cauHinh');

// Biến lưu mock handler khi chạy unit test
let hamGiaLapAI = null;

// Trạng thái khóa trong RAM cho từng nhà cung cấp
const trangThaiNhaCungCap = {
  gemini: {
    khoaDen: null,         // timestamp ms, null nghĩa là sẵn sàng
    loaiKhoa: null,        // 'PHUT' | 'NGAY' | 'MANG_5XX' | 'LOI_XAC_THUC'
    lanThuKenhNgay: 0,     // mốc thời gian thử lại gần nhất khi bị khóa ngày
    lyDo: ''
  },
  gemini_phu: {
    khoaDen: null,
    loaiKhoa: null,
    lanThuKenhNgay: 0,
    lyDo: ''
  },
  nvidia: {
    khoaDen: null,
    loaiKhoa: null,
    lanThuKenhNgay: 0,
    lyDo: ''
  }
};

/**
 * Thiết lập hàm giả lập phản hồi của AI (dành cho Unit Test)
 */
function datHamGiaLapAI(hamMock) {
  hamGiaLapAI = hamMock;
}

/**
 * Lấy bản sao trạng thái khóa RAM (dành cho Unit Test hoặc kiểm tra)
 */
function layTrangThaiNhaCungCap() {
  const banSao = {};
  for (const [k, v] of Object.entries(trangThaiNhaCungCap)) {
    banSao[k] = { ...v };
  }
  return banSao;
}

/**
 * Đặt trạng thái cho một nhà cung cấp (dành cho Unit Test)
 */
function datTrangThaiNhaCungCap(tenNhaCungCap, trangThai) {
  if (trangThaiNhaCungCap[tenNhaCungCap]) {
    Object.assign(trangThaiNhaCungCap[tenNhaCungCap], trangThai);
  }
}

/**
 * Reset toàn bộ trạng thái khóa RAM về ban đầu
 */
function resetTrangThaiNhaCungCap() {
  for (const key of Object.keys(trangThaiNhaCungCap)) {
    trangThaiNhaCungCap[key] = {
      khoaDen: null,
      loaiKhoa: null,
      lanThuKenhNgay: 0,
      lyDo: ''
    };
  }
}

/**
 * Tính mốc 07:00 giờ Việt Nam kế tiếp (tương ứng 00:00 UTC nếu gioResetUtc = 0)
 * @param {number} [gioResetUtc=0]
 * @param {Date} [thoiDiem=new Date()]
 * @returns {number} timestamp ms
 */
function tinhMoc07GioVNKeTiep(gioResetUtc = 0, thoiDiem = new Date()) {
  const bayGio = new Date(thoiDiem);
  const mocKeTiep = new Date(Date.UTC(
    bayGio.getUTCFullYear(),
    bayGio.getUTCMonth(),
    bayGio.getUTCDate(),
    gioResetUtc, 0, 0, 0
  ));
  if (mocKeTiep.getTime() <= bayGio.getTime()) {
    mocKeTiep.setUTCDate(mocKeTiep.getUTCDate() + 1);
  }
  return mocKeTiep.getTime();
}

/**
 * Kiểm tra xem một nhà cung cấp có đang sẵn sàng tiếp nhận yêu cầu hay không
 * @param {string} tenNhaCungCap - 'gemini' | 'gemini_phu' | 'nvidia'
 * @param {number} [bayGio=Date.now()]
 * @returns {boolean}
 */
function kiemTraNhaCungCapSanSang(tenNhaCungCap, bayGio = Date.now()) {
  const tt = trangThaiNhaCungCap[tenNhaCungCap];
  if (!tt || !tt.khoaDen) return true;

  // Lỗi xác thực 401/403: Không tự mở khóa cho đến khi khởi động lại
  if (tt.loaiKhoa === 'LOI_XAC_THUC') {
    return false;
  }

  // Khóa theo ngày (429 RPD): Cho phép thử lại mỗi 30 phút
  if (tt.loaiKhoa === 'NGAY') {
    if (bayGio >= tt.khoaDen) {
      tt.khoaDen = null;
      tt.loaiKhoa = null;
      tt.lanThuKenhNgay = 0;
      tt.lyDo = '';
      return true;
    }
    const khoangCachThuMs = 30 * 60 * 1000; // 30 phút
    if (!tt.lanThuKenhNgay || (bayGio - tt.lanThuKenhNgay >= khoangCachThuMs)) {
      return true; // Cho phép thử lại
    }
    return false;
  }

  // Khóa theo phút (65s) hoặc lỗi mạng/5xx (60s)
  if (bayGio >= tt.khoaDen) {
    tt.khoaDen = null;
    tt.loaiKhoa = null;
    tt.lyDo = '';
    return true;
  }

  return false;
}

/**
 * Khóa một nhà cung cấp trong RAM khi gặp lỗi theo quy tắc bảng 11.4
 */
function khoaNhaCungCap(tenNhaCungCap, loi, status, noiDungLoi = '', bayGio = Date.now()) {
  const tt = trangThaiNhaCungCap[tenNhaCungCap];
  if (!tt) return;

  const loiStr = (String(noiDungLoi || '') + ' ' + String(loi?.message || '')).toLowerCase();

  // 1. Lỗi 401/403: Lỗi xác thực cấu hình
  if (status === 401 || status === 403) {
    tt.khoaDen = Infinity;
    tt.loaiKhoa = 'LOI_XAC_THUC';
    tt.lyDo = `HTTP ${status}: Khóa API không hợp lệ hoặc bị thu hồi (${loi?.message || noiDungLoi || 'Unauthorized'})`;
    console.error(`[AI Rotation] ⚠️ LỖI CẤU HÌNH [${tenNhaCungCap}]: ${tt.lyDo}. Không tự mở khóa đến khi khởi động lại!`);
    return;
  }

  // 1.5. Lỗi 400/404: Lỗi cấu hình (sai tên mô hình, cú pháp body sai...)
  if (status === 400 || status === 404) {
    const thongTinLoi = String(noiDungLoi || loi?.message || '').trim().substring(0, 200) || `HTTP ${status}`;
    const thoiGianKhoaMs = 10 * 60 * 1000; // Khóa 10 phút (600.000ms)
    tt.khoaDen = bayGio + thoiGianKhoaMs;
    tt.loaiKhoa = 'LOI_CAU_HINH';
    tt.lyDo = `HTTP ${status}: Lỗi cấu hình - ${thongTinLoi}`;
    const thoiGianMoKhoa = new Date(tt.khoaDen).toLocaleTimeString('vi-VN');
    console.error(`[AI Rotation] ⚠️ LỖI CẤU HÌNH [${tenNhaCungCap}]: ${tt.lyDo} (khóa 10 phút đến: ${thoiGianMoKhoa})`);
    return;
  }

  // 2. Lỗi 429: Phân loại theo ngày hay theo phút
  if (status === 429) {
    const laKhoaNgay = loiStr.includes('perday') || loiStr.includes('per_day');

    if (laKhoaNgay) {
      const gioResetUtc = cauHinh.ai?.gemini?.gioResetUtc || 0;
      const moc07 = tinhMoc07GioVNKeTiep(gioResetUtc, new Date(bayGio));
      tt.khoaDen = moc07;
      tt.loaiKhoa = 'NGAY';
      tt.lanThuKenhNgay = bayGio;
      tt.lyDo = `HTTP 429: Hết hạn mức ngày (RPD). Khóa đến 07:00 VN (${new Date(moc07).toLocaleTimeString('vi-VN')} ngày ${new Date(moc07).toLocaleDateString('vi-VN')}), thử lại mỗi 30 phút`;
      console.warn(`[AI Rotation] 🔄 [${tenNhaCungCap}] ${tt.lyDo}`);
      return;
    }

    // 429 theo phút hoặc không nói rõ (mặc định khóa 65 giây)
    const thoiGianKhoaMs = 65 * 1000; // 65 giây
    tt.khoaDen = bayGio + thoiGianKhoaMs;
    tt.loaiKhoa = 'PHUT';
    tt.lyDo = `HTTP 429: Vượt hạn mức theo phút (RPM/TPM). Khóa 65 giây`;
    const thoiGianMoKhoa = new Date(tt.khoaDen).toLocaleTimeString('vi-VN');
    console.warn(`[AI Rotation] 🔄 [${tenNhaCungCap}] ${tt.lyDo} (khóa đến lúc: ${thoiGianMoKhoa})`);
    return;
  }

  // 3. Lỗi 5xx hoặc Timeout
  const laTimeout = loi?.name === 'AbortError' || loiStr.includes('timeout') || loiStr.includes('quá lâu');
  const laLoi5xx = typeof status === 'number' && status >= 500 && status < 600;

  if (laTimeout || laLoi5xx) {
    const thoiGianKhoaMs = 60 * 1000; // 60 giây
    tt.khoaDen = bayGio + thoiGianKhoaMs;
    tt.loaiKhoa = 'MANG_5XX';
    tt.lyDo = laTimeout ? 'Hết thời gian chờ (Timeout). Khóa 60 giây' : `Lỗi máy chủ HTTP ${status}. Khóa 60 giây`;
    const thoiGianMoKhoa = new Date(tt.khoaDen).toLocaleTimeString('vi-VN');
    console.warn(`[AI Rotation] 🔄 [${tenNhaCungCap}] ${tt.lyDo} (khóa đến lúc: ${thoiGianMoKhoa})`);
    return;
  }

  // 4. Lỗi khác
  const thoiGianKhoaMs = 60 * 1000;
  tt.khoaDen = bayGio + thoiGianKhoaMs;
  tt.loaiKhoa = 'MANG_5XX';
  const thongDiepLoiKhac = String(noiDungLoi || loi?.message || '').trim().substring(0, 200) || 'Lỗi không xác định';
  tt.lyDo = `Lỗi kết nối: ${thongDiepLoiKhac}. Khóa 60 giây`;
  const thoiGianMoKhoa = new Date(tt.khoaDen).toLocaleTimeString('vi-VN');
  console.warn(`[AI Rotation] 🔄 [${tenNhaCungCap}] ${tt.lyDo} (khóa đến lúc: ${thoiGianMoKhoa})`);
}

/**
 * Lấy danh sách các nhà cung cấp cấu hình theo thứ tự ưu tiên
 * 1) Gemini chính -> 2) Gemini phụ -> 3) NVIDIA NIM
 */
function layDanhSachNhaCungCap() {
  const danhSach = [];

  // 1. Gemini chính
  const khoaGemini = (cauHinh.ai?.gemini?.khoaApi || '').trim();
  const moHinhGeminiChinh = (cauHinh.ai?.gemini?.moHinhChinh || 'gemini-3.1-flash-lite').trim();
  if (khoaGemini && moHinhGeminiChinh && khoaGemini !== 'your_gemini_api_key_here') {
    danhSach.push({
      ten: 'gemini',
      nhan: 'Gemini chính',
      khoaApi: khoaGemini,
      moHinh: moHinhGeminiChinh,
      diaChiGoc: (cauHinh.ai?.gemini?.diaChiGoc || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, ''),
      timeoutMs: 20000 // 20s theo tài liệu 11.4
    });
  }

  // 2. Gemini phụ (nếu có cấu hình GEMINI_MODEL_PHU)
  const moHinhGeminiPhu = (cauHinh.ai?.gemini?.moHinhPhu || '').trim();
  if (khoaGemini && moHinhGeminiPhu && khoaGemini !== 'your_gemini_api_key_here') {
    danhSach.push({
      ten: 'gemini_phu',
      nhan: 'Gemini phụ',
      khoaApi: khoaGemini,
      moHinh: moHinhGeminiPhu,
      diaChiGoc: (cauHinh.ai?.gemini?.diaChiGoc || 'https://generativelanguage.googleapis.com/v1beta/openai').replace(/\/+$/, ''),
      timeoutMs: 20000 // 20s theo tài liệu 11.4
    });
  }

  // 3. NVIDIA NIM dự phòng
  const khoaNvidia = (cauHinh.ai?.nvidia?.khoaApi || cauHinh.ai?.khoaApi || '').trim();
  const moHinhNvidia = (cauHinh.ai?.nvidia?.moHinh || cauHinh.ai?.moHinh || 'meta/llama-3.2-11b-vision-instruct').trim();
  if (khoaNvidia && moHinhNvidia && khoaNvidia !== 'your_nvidia_nim_api_key_here') {
    danhSach.push({
      ten: 'nvidia',
      nhan: 'NVIDIA NIM',
      khoaApi: khoaNvidia,
      moHinh: moHinhNvidia,
      diaChiGoc: (cauHinh.ai?.nvidia?.diaChiGoc || cauHinh.ai?.diaChiGoc || 'https://integrate.api.nvidia.com/v1').replace(/\/+$/, ''),
      timeoutMs: 30000 // 30s theo tài liệu 11.4
    });
  }

  return danhSach;
}

/**
 * Gửi yêu cầu hội thoại tới nhà cung cấp AI với cơ chế xoay tua tự động (T54)
 * @param {Object} thamSo
 * @param {Array} thamSo.messages - Lịch sử hội thoại [{ role, content, ... }]
 * @param {Array} [thamSo.tools] - Danh sách công cụ khả dụng
 * @param {number} [thamSo.maxTokens=600] - Số lượng token tối đa cho câu trả lời
 * @param {number} [thamSo.temperature=0.3] - Độ sáng tạo
 * @returns {Promise<{ message: Object, usage: Object, nhaCungCap: string }>}
 */
async function goiNhaCungCapAI({ messages, tools, maxTokens = 600, temperature = 0.3 }) {
  // 0. Ưu tiên mock handler khi chạy unit test
  if (hamGiaLapAI) {
    const ketQuaMock = await hamGiaLapAI({ messages, tools, maxTokens, temperature });
    if (!ketQuaMock.nhaCungCap) {
      ketQuaMock.nhaCungCap = 'mock';
    }
    return ketQuaMock;
  }

  const danhSachNcc = layDanhSachNhaCungCap();
  if (danhSachNcc.length === 0) {
    throw new Error('Dịch vụ AI chưa được cấu hình khóa API hợp lệ (thiếu GEMINI_API_KEY hoặc AI_API_KEY)');
  }

  const thoiDiemGoi = Date.now();
  const nhatKyLoiCacNcc = [];

  for (let i = 0; i < danhSachNcc.length; i++) {
    const ncc = danhSachNcc[i];

    // Kiểm tra trạng thái khóa trong RAM
    const sanSang = kiemTraNhaCungCapSanSang(ncc.ten, thoiDiemGoi);
    if (!sanSang) {
      const tt = trangThaiNhaCungCap[ncc.ten];
      const thoiGianMoKhoa = tt.khoaDen === Infinity ? 'vĩnh viễn (lỗi cấu hình)' : new Date(tt.khoaDen).toLocaleTimeString('vi-VN');
      nhatKyLoiCacNcc.push(`[${ncc.nhan}] Đang bị khóa (${tt.lyDo}, mở lúc: ${thoiGianMoKhoa})`);
      continue;
    }

    const url = `${ncc.diaChiGoc}/chat/completions`;
    const bodyData = {
      model: ncc.moHinh,
      messages,
      max_tokens: maxTokens,
      temperature
    };

    if (Array.isArray(tools) && tools.length > 0) {
      bodyData.tools = tools;
      bodyData.tool_choice = 'auto';
    }

    const controller = new AbortController();
    const thoiGianCho = setTimeout(() => controller.abort(), ncc.timeoutMs);

    try {
      const phanHoi = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${ncc.khoaApi}`
        },
        body: JSON.stringify(bodyData),
        signal: controller.signal
      });

      clearTimeout(thoiGianCho);

      if (!phanHoi.ok) {
        const noiDungLoi = await phanHoi.text();
        khoaNhaCungCap(ncc.ten, null, phanHoi.status, noiDungLoi, Date.now());

        const tt = trangThaiNhaCungCap[ncc.ten];
        const thoiGianMoKhoa = tt.khoaDen === Infinity ? 'vĩnh viễn' : new Date(tt.khoaDen).toLocaleTimeString('vi-VN');
        const nccKeTiep = danhSachNcc[i + 1];
        if (nccKeTiep) {
          console.warn(`[AI Rotation] 🔄 Đổi nhà cung cấp: ${ncc.nhan} gặp lỗi (HTTP ${phanHoi.status}) -> Chuyển sang ${nccKeTiep.nhan}. Lý do: ${tt.lyDo} | Khóa đến: ${thoiGianMoKhoa}`);
        }

        nhatKyLoiCacNcc.push(`[${ncc.nhan}] Lỗi HTTP ${phanHoi.status}: ${noiDungLoi.substring(0, 150)}`);
        continue; // Thử nhà cung cấp kế tiếp
      }

      const duLieu = await phanHoi.json();
      const luaChon = duLieu.choices?.[0];

      if (!luaChon || !luaChon.message) {
        throw new Error('Định dạng phản hồi từ AI không hợp lệ');
      }

      // Gọi thành công -> giải phóng trạng thái khóa nếu có
      if (trangThaiNhaCungCap[ncc.ten].khoaDen) {
        trangThaiNhaCungCap[ncc.ten].khoaDen = null;
        trangThaiNhaCungCap[ncc.ten].loaiKhoa = null;
        trangThaiNhaCungCap[ncc.ten].lanThuKenhNgay = 0;
        trangThaiNhaCungCap[ncc.ten].lyDo = '';
      }

      return {
        message: luaChon.message,
        usage: duLieu.usage || null,
        nhaCungCap: ncc.ten
      };
    } catch (loi) {
      clearTimeout(thoiGianCho);
      khoaNhaCungCap(ncc.ten, loi, loi.status || null, loi.message, Date.now());

      const tt = trangThaiNhaCungCap[ncc.ten];
      const thoiGianMoKhoa = tt.khoaDen === Infinity ? 'vĩnh viễn' : new Date(tt.khoaDen).toLocaleTimeString('vi-VN');
      const nccKeTiep = danhSachNcc[i + 1];
      if (nccKeTiep) {
        console.warn(`[AI Rotation] 🔄 Đổi nhà cung cấp: ${ncc.nhan} gặp lỗi (${loi.message}) -> Chuyển sang ${nccKeTiep.nhan}. Lý do: ${tt.lyDo} | Khóa đến: ${thoiGianMoKhoa}`);
      }

      nhatKyLoiCacNcc.push(`[${ncc.nhan}] ${loi.message}`);
    }
  }

  // Nếu tất cả nhà cung cấp đều bị khóa hoặc lỗi
  console.error('[AI Rotation] ❌ Tất cả nhà cung cấp AI đều bị khóa hoặc gặp lỗi:\n' + nhatKyLoiCacNcc.map(l => '  - ' + l).join('\n'));
  throw new Error('Không thể kết nối đến máy chủ AI vào lúc này. Vui lòng thử lại sau ít phút.');
}

module.exports = {
  goiNhaCungCapAI,
  datHamGiaLapAI,
  layTrangThaiNhaCungCap,
  datTrangThaiNhaCungCap,
  resetTrangThaiNhaCungCap,
  kiemTraNhaCungCapSanSang,
  khoaNhaCungCap,
  tinhMoc07GioVNKeTiep,
  layDanhSachNhaCungCap
};
