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

function tachTokenTimGanDung(chuoi) {
  const tachCamelCase = String(chuoi || '').replace(/([a-z])([A-Z])/g, '$1 $2');
  const chuanHoa = boDauTiengViet(tachCamelCase)
    .toLowerCase()
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

  return chuanHoa ? chuanHoa.split(/\s+/) : [];
}

function tinhKhoangCachLevenshtein(chuoiA, chuoiB) {
  const bang = Array.from({ length: chuoiA.length + 1 }, () => []);
  for (let i = 0; i <= chuoiA.length; i++) bang[i][0] = i;
  for (let j = 0; j <= chuoiB.length; j++) bang[0][j] = j;

  for (let i = 1; i <= chuoiA.length; i++) {
    for (let j = 1; j <= chuoiB.length; j++) {
      const chiPhi = chuoiA[i - 1] === chuoiB[j - 1] ? 0 : 1;
      bang[i][j] = Math.min(bang[i - 1][j] + 1, bang[i][j - 1] + 1, bang[i - 1][j - 1] + chiPhi);
      if (i > 1 && j > 1 && chuoiA[i - 1] === chuoiB[j - 2] && chuoiA[i - 2] === chuoiB[j - 1]) {
        bang[i][j] = Math.min(bang[i][j], bang[i - 2][j - 2] + 1);
      }
    }
  }

  return bang[chuoiA.length][chuoiB.length];
}

// Hai từ cùng độ dài chỉ khác nhau ở một cặp chữ liền kề bị đảo chỗ (hao ↔ hoa)
function laDaoChoHaiChuLienNhau(tuA, tuB) {
  if (tuA.length !== tuB.length) return false;
  const viTriKhac = [];
  for (let i = 0; i < tuA.length && viTriKhac.length <= 2; i++) {
    if (tuA[i] !== tuB[i]) viTriKhac.push(i);
  }
  return viTriKhac.length === 2
    && viTriKhac[1] === viTriKhac[0] + 1
    && tuA[viTriKhac[0]] === tuB[viTriKhac[1]]
    && tuA[viTriKhac[1]] === tuB[viTriKhac[0]];
}

function tinhDiemTokenGanDung(tokenTim, tokenSach) {
  if (tokenTim === tokenSach) return 1;
  // Khớp kiểu "chứa nhau" chỉ khi CẢ HAI từ từ 3 ký tự trở lên; nếu không, từ 1 ký tự trong tên sách (Z, A, 1...)
  // sẽ khớp mọi từ khóa có chứa ký tự đó và gõ bừa cũng ra hàng trăm gợi ý.
  if (tokenTim.length >= 3 && tokenSach.length >= 3 && (tokenSach.includes(tokenTim) || tokenTim.includes(tokenSach))) return 0.82;

  // Từ 3 ký tự sai một chữ rất dễ thành từ khác (bao, bán, ban) nên chỉ bù lỗi đảo chỗ hai chữ liền nhau
  if (tokenTim.length === 3 && tokenSach.length === 3) return laDaoChoHaiChuLienNhau(tokenTim, tokenSach) ? 0.62 : 0;

  const soKyTuSaiToiDa = tokenTim.length >= 8 && tokenSach.length >= 8 ? 2 : tokenTim.length >= 4 && tokenSach.length >= 4 ? 1 : 0;
  if (tokenTim.length > 64 || Math.abs(tokenTim.length - tokenSach.length) > soKyTuSaiToiDa) return 0;
  const khoangCach = tinhKhoangCachLevenshtein(tokenTim, tokenSach);
  if (khoangCach > soKyTuSaiToiDa) return 0;
  return khoangCach === 1 ? 0.72 : 0.62;
}

function chamDiemTimGanDung(tuKhoa, tenSach, tacGia) {
  const tuKhoaCamelCase = String(tuKhoa || '').replace(/([a-z])([A-Z])/g, '$1 $2');
  const tokenTim = locTuKhoaThucSu(tuKhoaCamelCase).map(t => boDauTiengViet(t).toLowerCase());
  const tokenTenSach = tachTokenTimGanDung(tenSach);
  const tokenTacGia = tachTokenTimGanDung(tacGia);
  const tongTokenSach = [...tokenTenSach, ...tokenTacGia];
  if (!tokenTim.length || !tongTokenSach.length) return { diem: 0, soTuKhop: 0 };

  const diemTungTu = tokenTim.map(token => Math.max(
    ...tokenTenSach.map(t => tinhDiemTokenGanDung(token, t)),
    ...tokenTacGia.map(t => tinhDiemTokenGanDung(token, t) * 0.92),
    0
  ));
  const soTuKhop = diemTungTu.filter(diem => diem > 0).length;
  const soTuKhopToiThieu = tokenTim.length >= 4 ? tokenTim.length - 1 : tokenTim.length;
  const diem = soTuKhop >= soTuKhopToiThieu
    ? diemTungTu.reduce((tong, diemTu) => tong + diemTu, 0) / tokenTim.length
    : 0;

  return { diem, soTuKhop };
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
  chamDiemTimGanDung,
  boDauTiengViet,
  BANG_MA_TIM_KIEM
};

