/**
 * logicThongBao.js - Module logic thuần túy phục vụ hệ thống Thông báo BookNest
 * Tách biệt khỏi React State và DOM để dễ dàng kiểm thử đơn vị độc lập.
 */

/**
 * Quản lý hàng đợi hộp thoại FIFO, cách ly Promise, không gây side-effect trong render.
 * @param {Function} onCapNhat - Callback nhận giá trị hopHienTai mới mỗi khi thay đổi
 */
export function taoQuanLyHangDoi(onCapNhat = () => {}) {
  let hopHienTai = null;
  const hangDoi = [];

  return {
    them(hopMoi) {
      if (!hopHienTai) {
        hopHienTai = hopMoi;
        onCapNhat(hopHienTai);
      } else {
        hangDoi.push(hopMoi);
      }
    },

    dong(ketQua) {
      if (hopHienTai && typeof hopHienTai.resolve === 'function') {
        const resolveFn = hopHienTai.resolve;
        resolveFn(ketQua);
      }

      if (hangDoi.length > 0) {
        hopHienTai = hangDoi.shift();
      } else {
        hopHienTai = null;
      }
      onCapNhat(hopHienTai);
      return hopHienTai;
    },

    layHienTai() {
      return hopHienTai;
    },

    layHangDoi() {
      return [...hangDoi];
    },

    datLai() {
      hopHienTai = null;
      hangDoi.length = 0;
      onCapNhat(null);
    }
  };
}

/**
 * Kiểm tra debounce chống spam tin nhắn trùng lặp và tự động dọn dẹp Map bộ nhớ.
 * @param {Map} map - Map lưu trữ lịch sử
 * @param {string} noiDung - Nội dung thông báo
 * @param {number} bayGio - Thời điểm kiểm tra (ms)
 * @param {number} debounceMs - Thời gian chặn lặp (mặc định 1500ms)
 * @param {number} ttlMs - Thời gian tồn tại tối đa trước khi dọn dẹp (mặc định 5000ms)
 * @returns {boolean} true nếu hợp lệ (được hiển thị), false nếu bị chặn do trùng
 */
export function kiemTraVaLuuDebounce(map, noiDung, bayGio = Date.now(), debounceMs = 1500, ttlMs = 5000) {
  if (!noiDung || typeof map?.get !== 'function') return false;

  // 1. Quét và dọn dẹp các mục cũ hơn ttlMs
  for (const [key, tg] of map.entries()) {
    if (bayGio - tg > ttlMs) {
      map.delete(key);
    }
  }

  // 2. Kiểm tra trùng lặp trong khoảng debounceMs
  const lanCuoi = map.get(noiDung) || 0;
  if (bayGio - lanCuoi < debounceMs) {
    return false;
  }

  map.set(noiDung, bayGio);
  return true;
}

/**
 * Thêm Toast vào danh sách hiển thị với giới hạn số lượng tối đa.
 * Khi vượt quá giới hạn, các Toast cũ nhất sẽ tự động bị loại bỏ.
 * @param {Array} danhSach - Danh sách Toast hiện tại
 * @param {Object} toastMoi - Toast mới cần thêm
 * @param {number} gioiHan - Số lượng tối đa (mặc định 3)
 * @returns {Array} Danh sách Toast mới
 */
export function themToastVaoHangDoi(danhSach = [], toastMoi, gioiHan = 3) {
  if (!toastMoi) return danhSach;
  const mangHienTai = Array.isArray(danhSach) ? danhSach : [];
  const danhSachCat = mangHienTai.length >= gioiHan 
    ? mangHienTai.slice(mangHienTai.length - (gioiHan - 1)) 
    : mangHienTai;
  return [...danhSachCat, toastMoi];
}

/**
 * Tính toán thời gian còn lại của Timer khi bị tạm dừng (onMouseEnter / onFocus).
 * @param {number} thoiGianConLai - Thời gian còn lại trước đó
 * @param {number} thoiGianBatDau - Thời điểm bắt đầu chạy
 * @param {number} thoiDiemDung - Thời điểm tạm dừng
 * @returns {number} Thời gian còn lại mới (ms)
 */
export function tinhThoiGianConLai(thoiGianConLai, thoiGianBatDau, thoiDiemDung) {
  const daTroiQua = thoiDiemDung - thoiGianBatDau;
  return Math.max(0, thoiGianConLai - daTroiQua);
}
