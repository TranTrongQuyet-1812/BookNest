/**
 * Mã tra cứu đơn hàng (DonHang.MaTraCuu): mã công khai khó đoán, dạng BN-7K3F9Q.
 * MaDonHang là số tăng dần nên nhìn vào là biết cửa hàng có bao nhiêu đơn và dò được từng đơn;
 * vì vậy mọi nơi khách nhìn thấy hoặc gọi được (giao diện, URL, API công khai, socket, nội dung chuyển khoản)
 * dùng mã này, còn MaDonHang chỉ dùng nội bộ.
 *
 * Bảng chữ 32 ký tự (A-Z bỏ I, O; số 2-9) để khách đọc/gõ không nhầm 0-O, 1-I; 6 ký tự cho hơn 1 tỷ tổ hợp.
 * Bảng chữ này phải KHỚP với database/10_them_ma_tra_cuu_don_hang.sql (lúc điền bù đơn cũ).
 */
const crypto = require('crypto');

const TIEN_TO = 'BN-';
const BANG_CHU = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const SO_KY_TU = 6;

const MAU_MA_TRA_CUU = /^(BN-[A-HJ-NP-Z2-9]{6}|TEST-[A-Z0-9-]{1,7})$/;

// crypto.randomInt cho số ngẫu nhiên mạnh, khó đoán hơn Math.random
function sinhMaTraCuu() {
  let phanDuoi = '';
  for (let i = 0; i < SO_KY_TU; i += 1) {
    phanDuoi += BANG_CHU[crypto.randomInt(BANG_CHU.length)];
  }
  return `${TIEN_TO}${phanDuoi}`;
}

// Chuẩn hóa thứ khách gõ vào (chữ thường, thừa khoảng trắng) về dạng chuẩn rồi kiểm tra định dạng. Sai thì trả null.
function chuanHoaMaTraCuu(chuoi) {
  if (typeof chuoi !== 'string') return null;
  const ma = chuoi.trim().toUpperCase();
  return MAU_MA_TRA_CUU.test(ma) ? ma : null;
}

// Nội dung chuyển khoản gửi payOS: chỉ chữ và số (một số ngân hàng bỏ ký tự lạ như dấu gạch), vd BN7K3F9Q
function maRutGonChoChuyenKhoan(maTraCuu) {
  return String(maTraCuu).replace(/[^A-Z0-9]/g, '');
}

// Bỏ mọi trường MaDonHang (kể cả lồng trong chi tiết, lịch sử) khỏi dữ liệu trả về cho KHÁCH, để người mua một đơn
// mở DevTools cũng không đọc được số thứ tự nội bộ. Phía nhân viên (Back-Office) cần MaDonHang nên không dùng hàm này.
function anMaNoiBoDonHang(duLieu) {
  const banSao = JSON.parse(JSON.stringify(duLieu));
  const duyet = (nut) => {
    if (Array.isArray(nut)) {
      nut.forEach(duyet);
    } else if (nut && typeof nut === 'object') {
      delete nut.MaDonHang;
      Object.values(nut).forEach(duyet);
    }
  };
  duyet(banSao);
  return banSao;
}

module.exports = { sinhMaTraCuu, chuanHoaMaTraCuu, maRutGonChoChuyenKhoan, anMaNoiBoDonHang, MAU_MA_TRA_CUU };
