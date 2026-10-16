/**
 * logicThongBao.cjs - Bản CommonJS phục vụ Jest kiểm thử đơn vị độc lập
 */

function taoQuanLyHangDoi(onCapNhat = () => {}) {
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

function kiemTraVaLuuDebounce(map, noiDung, bayGio = Date.now(), debounceMs = 1500, ttlMs = 5000) {
  if (!noiDung || typeof map?.get !== 'function') return false;

  for (const [key, tg] of map.entries()) {
    if (bayGio - tg > ttlMs) {
      map.delete(key);
    }
  }

  const lanCuoi = map.get(noiDung) || 0;
  if (bayGio - lanCuoi < debounceMs) {
    return false;
  }

  map.set(noiDung, bayGio);
  return true;
}

function themToastVaoHangDoi(danhSach = [], toastMoi, gioiHan = 3) {
  if (!toastMoi) return danhSach;
  const mangHienTai = Array.isArray(danhSach) ? danhSach : [];
  const danhSachCat = mangHienTai.length >= gioiHan 
    ? mangHienTai.slice(mangHienTai.length - (gioiHan - 1)) 
    : mangHienTai;
  return [...danhSachCat, toastMoi];
}

function tinhThoiGianConLai(thoiGianConLai, thoiGianBatDau, thoiDiemDung) {
  const daTroiQua = thoiDiemDung - thoiGianBatDau;
  return Math.max(0, thoiGianConLai - daTroiQua);
}

module.exports = {
  taoQuanLyHangDoi,
  kiemTraVaLuuDebounce,
  themToastVaoHangDoi,
  tinhThoiGianConLai,
};
