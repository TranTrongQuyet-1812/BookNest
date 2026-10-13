import { KHOANG_CACH_DAU, LOAI_DIEM_DAU } from './cauHinhSinhVat';

// Vùng màn hình được coi là "nhìn thấy được" để chọn chỗ đậu.
// Phía trên chừa chỗ cho Navbar (cao ~72px) để con vật không đậu dưới thanh điều hướng.
const TREN_TOI_THIEU = 96;
const DUOI_CHUA_LAI = 70;
const BE_RONG_TOI_THIEU = 100;

let phamViChu = null;

/** Quét các phần tử có thể đậu. Phần tử hiện ra muộn (kệ sách tải xong) sẽ được thấy ở lần quét sau. */
export function quetDiemDau() {
  const ketQua = [];
  LOAI_DIEM_DAU.forEach((cauHinh) => {
    document.querySelectorAll(cauHinh.selector).forEach((el) => ketQua.push({ el, cauHinh }));
  });
  return ketQua;
}

/**
 * Khung thật để đứng lên (toạ độ khung nhìn).
 * Với chữ thì đo đúng bề rộng nét chữ bằng Range, vì thẻ h1/p chiếm cả cột chứ chữ không dài đến vậy
 * và con vật sẽ đậu lơ lửng ngoài chữ nếu dùng khung của thẻ.
 */
export function layKhungDau(el, kieu) {
  if (kieu === 'chu') {
    if (!phamViChu) phamViChu = document.createRange();
    phamViChu.selectNodeContents(el);
    const r = phamViChu.getBoundingClientRect();
    if (r.width > 0) return { trai: r.left, phai: r.right, tren: r.top, duoi: r.bottom };
  }
  const r = el.getBoundingClientRect();
  return { trai: r.left, phai: r.right, tren: r.top, duoi: r.bottom };
}

// Chân con vật treo ngược bám hơi chồm lên mép dưới, để thân không lìa khỏi chữ
const LECH_TREO = 4;

/**
 * Điểm đứng hiện tại (toạ độ khung nhìn) của một điểm đậu, lấy trực tiếp từ DOM mỗi khung hình.
 * Loài treo ngược (dơi) bám vào MÉP DƯỚI phần tử, các loài khác đứng trên mép trên.
 */
export function layToaDoDiemDau(diemDau) {
  const khung = layKhungDau(diemDau.el, diemDau.cauHinh.kieu);
  return {
    x: khung.trai + (khung.phai - khung.trai) * diemDau.xFrac,
    y: diemDau.treo ? khung.duoi - LECH_TREO : khung.tren + diemDau.cauHinh.lech
  };
}

// Tìm vị trí ngang còn trống trên phần tử, cách các con khác đủ xa. Hết chỗ thì trả null.
function timViTriTrong(el, rong, cacConKhac) {
  const daChiem = cacConKhac
    .filter((c) => c.diemDau && c.diemDau.el === el)
    .map((c) => c.diemDau.xFrac * rong);

  for (let lan = 0; lan < 8; lan++) {
    const xFrac = 0.1 + Math.random() * 0.8;
    if (daChiem.every((x) => Math.abs(x - xFrac * rong) >= KHOANG_CACH_DAU)) return xFrac;
  }
  return null;
}

/**
 * Chọn chỗ đậu cho một con: phần tử đang nhìn thấy, còn chỗ trống, hợp tính của loài (trọng số ngẫu nhiên).
 * tranh: phần tử cần tránh (chỗ vừa rời) để con vật thật sự đổi chỗ chứ không bay một vòng về lại.
 * Trả null nếu không có chỗ nào phù hợp.
 */
export function chonDiemDau(cauHinhLoai, dsDiemDau, cacConKhac, tranh = null) {
  const cao = window.innerHeight;
  const treo = Boolean(cauHinhLoai.treoNguoc);
  let tot = null;

  dsDiemDau.forEach(({ el, cauHinh }) => {
    if (el === tranh || !el.isConnected) return;
    const khung = layKhungDau(el, cauHinh.kieu);
    const rong = khung.phai - khung.trai;
    // Loài treo ngược xét theo mép dưới (chỗ chân bám), loài đứng xét theo mép trên
    const moc = treo ? khung.duoi : khung.tren;
    if (rong < BE_RONG_TOI_THIEU || moc < TREN_TOI_THIEU || moc > cao - DUOI_CHUA_LAI) return;

    const xFrac = timViTriTrong(el, rong, cacConKhac);
    if (xFrac === null) return;

    const diem = (cauHinhLoai.uaThich[cauHinh.kieu] || 1) * (0.6 + Math.random());
    if (!tot || diem > tot.diem) tot = { el, cauHinh, xFrac, diem };
  });

  return tot && { el: tot.el, cauHinh: tot.cauHinh, xFrac: tot.xFrac, treo };
}
