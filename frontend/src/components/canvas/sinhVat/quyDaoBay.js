// Toán quỹ đạo bay, không đụng DOM hay three.js nên test riêng được.
// Toạ độ là "toạ độ trang": x sang phải, y xuống dưới (như CSS), z là độ nổi lên phía camera.
// Dùng toạ độ trang (không phải toạ độ màn hình) để khi người dùng cuộn giữa chừng,
// con vật vẫn bay đúng đường thay vì bị trôi theo thanh cuộn.

const gioiHan = (v, thap, cao) => Math.min(cao, Math.max(thap, v));
const sine = (t) => 0.5 - 0.5 * Math.cos(Math.PI * t);
const ngauNhien = (a, b) => a + Math.random() * (b - a);

export const lamMuot = (t) => {
  const x = gioiHan(t, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

const bezier = (a, b, c, d, t) => {
  const u = 1 - t;
  return u * u * u * a + 3 * u * u * t * b + 3 * u * t * t * c + t * t * t * d;
};

// Đặc trưng chuyển động phụ của từng loài (đường đi chính vẫn là Bezier)
// - bienDo / tanSo: độ lắc ngang và số nhịp lắc trong một chuyến bay
// - nhun: nhún lên xuống (bướm chao cánh, ong rung)
// - dungGiua: dừng lơ lửng giữa chặng như chuồn chuồn
const DAC_TINH_BAY = {
  chim: { bienDo: 12, tanSo: 1.1, nhun: 0, dungGiua: false },
  buom: { bienDo: 46, tanSo: 3.0, nhun: 18, dungGiua: false },
  chuon_chuon: { bienDo: 5, tanSo: 2.0, nhun: 0, dungGiua: true },
  ong: { bienDo: 26, tanSo: 6.5, nhun: 6, dungGiua: false },
  dom_dom: { bienDo: 34, tanSo: 1.3, nhun: 12, dungGiua: false },
  doi: { bienDo: 24, tanSo: 1.9, nhun: 16, dungGiua: false }
};

// Biến thời gian chuẩn hoá t (0..1) thành tiến độ đường đi u (0..1).
// Mỗi loài có nhịp riêng: chuồn chuồn lao - khựng - lao, ong lao nhanh rồi phanh, còn lại êm.
function bienDoiThoiGian(loai, t) {
  if (loai === 'chuon_chuon') {
    if (t < 0.42) return 0.5 * sine(t / 0.42);
    if (t < 0.54) return 0.5;
    return 0.5 + 0.5 * sine((t - 0.54) / 0.46);
  }
  if (loai === 'ong') return 0.55 * t + 0.45 * sine(t);
  return sine(t);
}

/**
 * Dựng quỹ đạo từ batDau đến ketThuc.
 * huongNe: vector đơn vị (hệ trang) chỉ hướng tránh xa chuột, con vật vọt ra hướng này trước.
 * heSoNang: 1 là cất cánh bình thường, nhỏ hơn thì bay thẳng hơn (dùng khi bay vào từ ngoài màn hình).
 */
export function taoQuyDao(loai, cauHinh, batDau, ketThuc, huongNe, heSoNang = 1) {
  const dx = ketThuc.x - batDau.x;
  const dy = ketThuc.y - batDau.y;
  const khoangCach = Math.max(1, Math.hypot(dx, dy));
  const nang = gioiHan(khoangCach * 0.28, 80, 240) * heSoNang;
  const zBay = cauHinh.bienDoZ * ngauNhien(0.6, 1.2);
  const dac = DAC_TINH_BAY[loai];

  return {
    loai,
    dac,
    p0: { ...batDau },
    // Cất cánh: vọt lên và tránh khỏi chuột
    p1: {
      x: batDau.x + dx * 0.18 + huongNe.x * 70,
      y: batDau.y - nang + dy * 0.1 + huongNe.y * 30,
      z: batDau.z + zBay
    },
    // Hạ cánh: lượn tới phía trên điểm đậu rồi thả mình xuống
    p2: {
      x: ketThuc.x - dx * 0.2 + ngauNhien(-60, 60),
      y: ketThuc.y - nang * 0.7,
      z: ketThuc.z + zBay * 0.7
    },
    p3: { ...ketThuc },
    phapTuyen: { x: -dy / khoangCach, y: dx / khoangCach },
    pha: [ngauNhien(0, 6.28), ngauNhien(0, 6.28), ngauNhien(0, 6.28)],
    thoiLuong: gioiHan(khoangCach / cauHinh.tocDoBay + 1.1, 1.7, 5.5) + (dac.dungGiua ? 0.6 : 0)
  };
}

/** Vị trí (toạ độ trang) tại thời điểm chuẩn hoá t. Đúng p0 khi t=0 và đúng p3 khi t=1. */
export function layDiemQuyDao(qd, t) {
  const u = bienDoiThoiGian(qd.loai, gioiHan(t, 0, 1));
  // Hệ số này bằng 0 ở hai đầu nên lắc lư không làm lệch điểm cất/hạ cánh
  const bao = Math.sin(Math.PI * u);
  const { bienDo, tanSo, nhun } = qd.dac;
  const lac = Math.sin(2 * Math.PI * tanSo * u + qd.pha[0]) * 0.7
    + Math.sin(2 * Math.PI * tanSo * 1.9 * u + qd.pha[1]) * 0.3;
  const lechNgang = bienDo * bao * lac;
  const nhunDoc = nhun * bao * Math.sin(2 * Math.PI * tanSo * 2.3 * u + qd.pha[2]);

  return {
    x: bezier(qd.p0.x, qd.p1.x, qd.p2.x, qd.p3.x, u) + qd.phapTuyen.x * lechNgang,
    y: bezier(qd.p0.y, qd.p1.y, qd.p2.y, qd.p3.y, u) + qd.phapTuyen.y * lechNgang + nhunDoc,
    z: bezier(qd.p0.z, qd.p1.z, qd.p2.z, qd.p3.z, u)
  };
}
