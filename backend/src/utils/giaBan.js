/**
 * giaBan.js - Hàm thuần tính giá bán sau giảm giá (GG02)
 * 
 * Quy tắc nghiệp vụ (Kế hoạch GIAM_GIA_SACH):
 * - Chỉ giảm theo %, từ 1% đến 60%.
 * - Làm tròn xuống đến hàng trăm đồng (ví dụ 62.000 giảm 20% = 49.600; 12.345 giảm 33% = 8.200).
 * - Không bao giờ âm và không vượt quá giá niêm yết.
 */

/**
 * Tính giá bán thực tế sau khi áp dụng phần trăm giảm giá
 * @param {number} giaNiemYet Giá niêm yết gốc của sách (VND)
 * @param {number|null|undefined} phanTram Phần trăm giảm giá (1 - 60)
 * @returns {number} Giá bán sau giảm (làm tròn xuống hàng trăm đồng)
 */
function tinhGiaSauGiam(giaNiemYet, phanTram) {
  const giaGoc = Number(giaNiemYet) || 0;
  if (giaGoc <= 0) return 0;

  const pt = Number(phanTram) || 0;
  if (pt <= 0) return giaGoc;

  // Giới hạn trần giảm giá tối đa 60%
  const ptHopLe = Math.min(60, Math.max(0, pt));

  // Làm tròn xuống đến hàng trăm đồng: floor(gia * (100 - pt) / 100 / 100) * 100
  const giaSauGiam = Math.floor((giaGoc * (100 - ptHopLe)) / 100 / 100) * 100;

  return Math.max(0, Math.min(giaGoc, giaSauGiam));
}

module.exports = {
  tinhGiaSauGiam
};
