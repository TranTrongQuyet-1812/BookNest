/**
 * Tầng Service xử lý thống kê doanh thu và báo cáo phân tích cho Admin (T18).
 * Toàn bộ tính toán được gom nhóm trực tiếp tại SQL Server để tối ưu hiệu năng.
 */
const { sequelize } = require('../models');

// 1. Thống kê tổng quan doanh thu, số đơn hoàn thành, số sách đã bán
async function layTongQuanDoanhThu({ tuNgay, denNgay }) {
  let dieuKienNgay = '';
  const replacements = {};

  if (tuNgay) {
    dieuKienNgay += ' AND ls.NgayThayDoi >= :tuNgay';
    replacements.tuNgay = new Date(tuNgay);
  }
  if (denNgay) {
    dieuKienNgay += ' AND ls.NgayThayDoi <= :denNgay';
    replacements.denNgay = new Date(denNgay);
  }

  const cauTruyVan = `
    SELECT 
      COALESCE(SUM(dh.TongTien), 0) AS tongDoanhThu,
      COUNT(DISTINCT dh.MaDonHang) AS soDonThanhCong,
      COALESCE(SUM(ct.TongSach), 0) AS tongSachDaBan
    FROM DonHang dh
    INNER JOIN LichSuTrangThaiDonHang ls 
      ON dh.MaDonHang = ls.MaDonHang AND ls.TrangThaiMoi = 'DELIVERED'
    LEFT JOIN (
      SELECT MaDonHang, SUM(SoLuong) AS TongSach
      FROM ChiTietDonHang
      GROUP BY MaDonHang
    ) ct ON dh.MaDonHang = ct.MaDonHang
    WHERE dh.TrangThai = 'DELIVERED' ${dieuKienNgay}
  `;

  const [ketQua] = await sequelize.query(cauTruyVan, {
    replacements,
    type: sequelize.QueryTypes.SELECT
  });

  return {
    tongDoanhThu: ketQua ? parseFloat(ketQua.tongDoanhThu) : 0,
    soDonThanhCong: ketQua ? parseInt(ketQua.soDonThanhCong, 10) : 0,
    tongSachDaBan: ketQua ? parseInt(ketQua.tongSachDaBan, 10) : 0
  };
}

// 2. Thống kê top sách bán chạy nhất
async function layTopSachBanChay({ limit = 10 }) {
  const gioiHan = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

  const cauTruyVan = `
    SELECT 
      s.MaSach AS maSach,
      s.TenSach AS tenSach,
      s.AnhBia AS anhBia,
      dm.TenDanhMuc AS tenDanhMuc,
      COALESCE(SUM(ct.SoLuong), 0) AS daBan,
      COALESCE(SUM(ct.SoLuong * ct.DonGia), 0) AS doanhThu
    FROM ChiTietDonHang ct
    INNER JOIN DonHang dh ON ct.MaDonHang = dh.MaDonHang AND dh.TrangThai = 'DELIVERED'
    INNER JOIN Sach s ON ct.MaSach = s.MaSach
    LEFT JOIN DanhMuc dm ON s.MaDanhMuc = dm.MaDanhMuc
    GROUP BY s.MaSach, s.TenSach, s.AnhBia, dm.TenDanhMuc
    ORDER BY daBan DESC
    OFFSET 0 ROWS FETCH NEXT :gioiHan ROWS ONLY
  `;

  const danhSach = await sequelize.query(cauTruyVan, {
    replacements: { gioiHan },
    type: sequelize.QueryTypes.SELECT
  });

  return danhSach.map(s => ({
    maSach: s.maSach,
    tenSach: s.tenSach,
    anhBia: s.anhBia,
    tenDanhMuc: s.tenDanhMuc,
    daBan: parseInt(s.daBan, 10),
    doanhThu: parseFloat(s.doanhThu)
  }));
}

// 3. Thống kê tỷ lệ đơn hàng theo các trạng thái
async function layTyLeDonHang() {
  const cauTruyVan = `
    SELECT TrangThai AS trangThai, COUNT(*) AS soLuong
    FROM DonHang
    GROUP BY TrangThai
  `;

  const cacTrangThai = await sequelize.query(cauTruyVan, {
    type: sequelize.QueryTypes.SELECT
  });

  const tongSoDon = cacTrangThai.reduce((tong, t) => tong + parseInt(t.soLuong, 10), 0);

  let soDonThanhCong = 0;
  let soDonHuy = 0;

  const chiTiet = cacTrangThai.map(t => {
    const soLuong = parseInt(t.soLuong, 10);
    const tyLe = tongSoDon > 0 ? parseFloat(((soLuong / tongSoDon) * 100).toFixed(1)) : 0;

    if (t.trangThai === 'DELIVERED') soDonThanhCong = soLuong;
    if (t.trangThai === 'CANCELLED') soDonHuy = soLuong;

    return {
      trangThai: t.trangThai,
      soLuong,
      tyLe
    };
  });

  const tyLeHoanThanh = tongSoDon > 0 ? parseFloat(((soDonThanhCong / tongSoDon) * 100).toFixed(1)) : 0;
  const tyLeHuy = tongSoDon > 0 ? parseFloat(((soDonHuy / tongSoDon) * 100).toFixed(1)) : 0;

  return {
    tongSoDon,
    tyLeHoanThanh,
    tyLeHuy,
    chiTiet
  };
}

module.exports = {
  layTongQuanDoanhThu,
  layTopSachBanChay,
  layTyLeDonHang
};
