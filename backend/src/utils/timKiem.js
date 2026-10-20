/**
 * Hàm hỗ trợ tìm kiếm tiếng Việt không phân biệt hoa thường và không phân biệt dấu.
 * Hỗ trợ bóc tách từ khóa đa từ (Tokenized / Fuzzy Matching) cho BookNest.
 */
const { Op, where, literal } = require('sequelize');

// Cột chữ của dự án dùng Vietnamese_CI_AI: bỏ qua dấu thanh nhưng vẫn coi ă â ê ô ơ ư đ là chữ riêng,
// nên gõ "so do" không ra "Số Đỏ". Ép so sánh bằng Latin1_General_CI_AI để gõ không dấu vẫn tìm được.
const BANG_MA_TIM_KIEM = 'Latin1_General_CI_AI';

// Thoát các ký tự đặc biệt của LIKE (% _ [) để người dùng gõ chúng vẫn được hiểu là chữ thường
function thoatKyTuLike(tuKhoa) {
  if (!tuKhoa) return '';
  return String(tuKhoa).replace(/[%_[]/g, '[$&]');
}

// Làm sạch từ khóa: lược bỏ từ đệm tìm kiếm tiếng Việt thông dụng ở đầu câu (ví dụ "sách", "cuốn", "sản phẩm")
function lamSachTuKhoa(tuKhoa) {
  if (!tuKhoa || typeof tuKhoa !== 'string') return '';
  return tuKhoa
    .trim()
    .replace(/^(sách|cuốn sách|cuốn|bộ sách|bộ|truyện|tác phẩm|sản phẩm)\s+/i, '')
    .trim();
}

// Tách chuỗi tìm kiếm thành các token từ khóa độc lập (bỏ các ký tự phân cách như -, :, ,, ., en-dash, em-dash, v.v.)
function tachTuKhoa(tuKhoa) {
  const chuoiChuan = lamSachTuKhoa(tuKhoa);
  if (!chuoiChuan) return [];
  return chuoiChuan
    .split(/[\s\-_,:;./\\+&|()[\]\u2013\u2014–—'"`“”‘’]+/i)
    .map(t => t.trim())
    .filter(t => t.length > 0 && !/^[^a-zA-Z0-9\u00C0-\u1EF9]+$/.test(t));
}

/**
 * Điều kiện "cột chứa từ khóa" cơ bản (Latin1_General_CI_AI không phân biệt dấu).
 * Giữ nguyên bản để tương thích tuyệt đối với các module chuẩn và unit test T20.
 */
function chuaTuKhoa(tenCot, tuKhoa) {
  return where(literal(`${tenCot} COLLATE ${BANG_MA_TIM_KIEM}`), {
    [Op.like]: `%${thoatKyTuLike(tuKhoa)}%`
  });
}

/** So khớp khi người dùng vô tình bỏ khoảng trắng hoặc dấu phân cách trong tên. */
function chuaTuKhoaBoKhoangTrang(tenCot, tuKhoa) {
  const bieuThuc = `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${tenCot}, N' ', N''), N'-', N''), N'_', N''), N'.', N''), N',', N'')`;
  const tuKhoaGon = String(tuKhoa || '').replace(/[\s\-_. ,]+/g, '');

  if (!tuKhoaGon) return chuaTuKhoa(tenCot, tuKhoa);

  return where(literal(`${bieuThuc} COLLATE ${BANG_MA_TIM_KIEM}`), {
    [Op.like]: `%${thoatKyTuLike(tuKhoaGon)}%`
  });
}

/**
 * Điều kiện "cột chứa từ khóa linh hoạt" (Tokenized Multi-word Matching):
 * - Bỏ từ đệm tiếng Việt (sách, cuốn, truyện...)
 * - Tách từ khóa theo các dấu gạch nối (-), dấu phẩy, khoảng trắng...
 * - Kết hợp Op.and cho từng từ, giúp tìm thấy sách dù tựa đề có dấu gạch ngang hoặc khách gõ thiếu từ nối.
 */
function chuaTuKhoaLinhHoat(tenCot, tuKhoa) {
  const cacTu = tachTuKhoa(tuKhoa);

  if (cacTu.length === 0) {
    return chuaTuKhoa(tenCot, tuKhoa);
  }

  if (cacTu.length === 1) {
    return chuaTuKhoa(tenCot, cacTu[0]);
  }

  return {
    [Op.and]: cacTu.map(t => chuaTuKhoa(tenCot, t))
  };
}

// Danh sách từ đệm, đại từ, từ dừng và từ xác nhận tiếng Việt phổ biến trong mua sắm và hội thoại
const DANH_SACH_TU_DEM = new Set([
  // Loại hình / tiền tố
  'sach', 'cuon', 'bo', 'truyen', 'tac', 'pham', 'san', 'pham', 'quyen', 'tap',
  // Đại từ nhân xưng & chỉ định
  'toi', 'tao', 'to', 'minh', 'em', 'anh', 'chi', 'ban', 'shop', 'ad', 'admin',
  'no', 'nay', 'nayy', 'do', 'day', 'kia', 'ay', 'chung',
  // Động từ mong muốn / hành vi
  'dang', 'muon', 'mua', 'tim', 'cho', 'hoi', 'ben', 'lay', 'dat', 'xem', 'can',
  // Từ khẳng định / xác nhận / phủ định
  'dung', 'chinh', 'la', 'roi', 'chuan', 'xac', 'nhan', 'dich', 'thuc', 'vang', 'da',
  'u', 'uh', 'uk', 'ok', 'oke', 'okay', 'ko', 'khong', 'chua',
  // Hư từ / trợ từ / thán từ
  'con', 'a', 'nhe', 'nha', 'voi', 'co', 'hay', 'the', 'vay', 'ha', 'oi', 'ne', 'nhi', 'ma'
]);

// Hàm loại bỏ dấu tiếng Việt để so khớp tương đối
function boDauTiengViet(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D');
}

// Lọc chuỗi đầu vào thành các token từ khóa thực sự (bỏ từ đệm, từ dừng)
function locTuKhoaThucSu(chuoi) {
  if (!chuoi || typeof chuoi !== 'string') return [];
  return chuoi
    .split(/[\s\-_,:;./\\+&|()[\]?!'"`“”‘’\u2013\u2014–—]+/)
    .map(t => t.trim())
    .filter(t => {
      if (t.length < 2) return false;
      if (/^[^a-zA-Z0-9\u00C0-\u1EF9]+$/.test(t)) return false;
      const khongDau = boDauTiengViet(t).toLowerCase();
      return !DANH_SACH_TU_DEM.has(khongDau);
    });
}

// Tính điểm tương đồng giữa chuỗi mục tiêu và danh sách token từ khóa
function tinhDiemTrungKhop(chuoiMucTieu, danhSachToken) {
  if (!chuoiMucTieu || !Array.isArray(danhSachToken) || danhSachToken.length === 0) return 0;
  const mucTieuKhongDau = boDauTiengViet(chuoiMucTieu).toLowerCase();
  let diem = 0;
  for (const t of danhSachToken) {
    const tokenKhongDau = boDauTiengViet(t).toLowerCase();
    if (mucTieuKhongDau.includes(tokenKhongDau)) {
      diem++;
    }
  }
  return diem;
}

module.exports = {
  chuaTuKhoa,
  chuaTuKhoaBoKhoangTrang,
  chuaTuKhoaLinhHoat,
  thoatKyTuLike,
  lamSachTuKhoa,
  tachTuKhoa,
  locTuKhoaThucSu,
  tinhDiemTrungKhop,
  boDauTiengViet,
  BANG_MA_TIM_KIEM
};

