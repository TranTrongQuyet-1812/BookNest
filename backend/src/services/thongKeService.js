/**
 * Tầng Service xử lý thống kê doanh thu và báo cáo phân tích cho Admin (T18, T31, T39).
 * Toàn bộ tính toán được gom nhóm trực tiếp tại SQL Server để tối ưu hiệu năng.
 * Hỗ trợ phân tích theo kênh bán (TRUC_TUYEN / TAI_QUAY), chuỗi thời gian và danh mục.
 */
const { sequelize, DonHang, Sach, KhachHang, DanhGia } = require('../models');
const { Op } = require('sequelize');

// Hàm bổ trợ xử lý điều kiện ngày và kênh bán cho câu lệnh SQL theo chuẩn múi giờ Việt Nam (UTC+7)
function xayDungDieuKienLoc({ tuNgay, denNgay, kenhBan, cotNgay = 'ls.NgayHoanThanh', aliasDonHang = 'dh' }) {
  let dieuKienSql = '';
  const replacements = {};

  if (tuNgay) {
    dieuKienSql += ` AND DATEADD(hour, 7, ${cotNgay}) >= :tuNgay`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(tuNgay)) {
      replacements.tuNgay = `${tuNgay} 00:00:00`;
    } else {
      replacements.tuNgay = tuNgay;
    }
  }
  if (denNgay) {
    dieuKienSql += ` AND DATEADD(hour, 7, ${cotNgay}) <= :denNgay`;
    if (/^\d{4}-\d{2}-\d{2}$/.test(denNgay)) {
      replacements.denNgay = `${denNgay} 23:59:59.999`;
    } else {
      replacements.denNgay = denNgay;
    }
  }
  if (kenhBan) {
    dieuKienSql += ` AND ${aliasDonHang}.KenhBan = :kenhBan`;
    replacements.kenhBan = kenhBan;
  }

  return { dieuKienSql, replacements };
}

// 1. Thống kê tổng quan doanh thu, số đơn hoàn thành, số sách đã bán
async function layTongQuanDoanhThu({ tuNgay, denNgay, kenhBan } = {}) {
  const { dieuKienSql, replacements } = xayDungDieuKienLoc({ tuNgay, denNgay, kenhBan });

  const cauTruyVan = `
    SELECT 
      COALESCE(SUM(dh.TongTien), 0) AS tongDoanhThu,
      COUNT(DISTINCT dh.MaDonHang) AS soDonThanhCong,
      COALESCE(SUM(ct.TongSach), 0) AS tongSachDaBan
    FROM DonHang dh
    INNER JOIN (
      SELECT MaDonHang, MAX(NgayThayDoi) AS NgayHoanThanh
      FROM LichSuTrangThaiDonHang
      WHERE TrangThaiMoi = 'DA_GIAO'
      GROUP BY MaDonHang
    ) ls ON dh.MaDonHang = ls.MaDonHang
    LEFT JOIN (
      SELECT MaDonHang, SUM(SoLuong) AS TongSach
      FROM ChiTietDonHang
      GROUP BY MaDonHang
    ) ct ON dh.MaDonHang = ct.MaDonHang
    WHERE dh.TrangThai = 'DA_GIAO' ${dieuKienSql}
  `;

  const [ketQua] = await sequelize.query(cauTruyVan, {
    replacements,
    type: sequelize.QueryTypes.SELECT
  });

  return {
    tongDoanhThu: ketQua ? parseFloat(ketQua.tongDoanhThu) : 0,
    soDonThanhCong: ketQua ? parseInt(ketQua.soDonThanhCong, 10) : 0,
    tongSachDaBan: ketQua ? parseInt(ketQua.tongSachDaBan, 10) : 0,
    kenhBan: kenhBan || 'TAT_CA'
  };
}

// 2. Thống kê top sách bán chạy nhất
async function layTopSachBanChay({ limit = 10, kenhBan } = {}) {
  const gioiHan = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  let dieuKienKenh = '';
  const replacements = { gioiHan };

  if (kenhBan) {
    dieuKienKenh = ' AND dh.KenhBan = :kenhBan';
    replacements.kenhBan = kenhBan;
  }

  const cauTruyVan = `
    SELECT 
      s.MaSach AS maSach,
      s.TenSach AS tenSach,
      s.AnhBia AS anhBia,
      dm.TenDanhMuc AS tenDanhMuc,
      COALESCE(SUM(ct.SoLuong), 0) AS daBan,
      COALESCE(SUM(ct.SoLuong * ct.DonGia), 0) AS doanhThu
    FROM ChiTietDonHang ct
    INNER JOIN DonHang dh ON ct.MaDonHang = dh.MaDonHang AND dh.TrangThai = 'DA_GIAO' ${dieuKienKenh}
    INNER JOIN Sach s ON ct.MaSach = s.MaSach
    LEFT JOIN DanhMuc dm ON s.MaDanhMuc = dm.MaDanhMuc
    GROUP BY s.MaSach, s.TenSach, s.AnhBia, dm.TenDanhMuc
    ORDER BY daBan DESC
    OFFSET 0 ROWS FETCH NEXT :gioiHan ROWS ONLY
  `;

  const danhSach = await sequelize.query(cauTruyVan, {
    replacements,
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

// 3. Thống kê tỷ lệ đơn hàng theo các trạng thái (Tùy chọn lọc theo kênh)
async function layTyLeDonHang({ kenhBan } = {}) {
  let dieuKienKenh = '';
  const replacements = {};

  if (kenhBan) {
    dieuKienKenh = ' WHERE KenhBan = :kenhBan';
    replacements.kenhBan = kenhBan;
  }

  const cauTruyVan = `
    SELECT TrangThai AS trangThai, COUNT(*) AS soLuong
    FROM DonHang
    ${dieuKienKenh}
    GROUP BY TrangThai
  `;

  const cacTrangThai = await sequelize.query(cauTruyVan, {
    replacements,
    type: sequelize.QueryTypes.SELECT
  });

  const tongSoDon = cacTrangThai.reduce((tong, t) => tong + parseInt(t.soLuong, 10), 0);

  let soDonThanhCong = 0;
  let soDonHuy = 0;

  const chiTiet = cacTrangThai.map(t => {
    const soLuong = parseInt(t.soLuong, 10);
    const tyLe = tongSoDon > 0 ? parseFloat(((soLuong / tongSoDon) * 100).toFixed(1)) : 0;

    if (t.trangThai === 'DA_GIAO') soDonThanhCong = soLuong;
    if (t.trangThai === 'DA_HUY') soDonHuy = soLuong;

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
    kenhBan: kenhBan || 'TAT_CA',
    chiTiet
  };
}

// 4. Thống kê chuỗi thời gian doanh thu (T39: revenue-series theo day hoặc month)
async function layDoanhThuTheoChuoi({ tuNgay, denNgay, kenhBan, group = 'day' } = {}) {
  const { dieuKienSql, replacements } = xayDungDieuKienLoc({ tuNgay, denNgay, kenhBan });
  const dinhDang = group === 'month' ? 'yyyy-MM' : 'yyyy-MM-dd';
  replacements.dinhDangThoiGian = dinhDang;

  const cauTruyVan = `
    SELECT 
      FORMAT(DATEADD(hour, 7, ls.NgayHoanThanh), :dinhDangThoiGian) AS thoiGian,
      COALESCE(SUM(dh.TongTien), 0) AS tongDoanhThu,
      COUNT(DISTINCT dh.MaDonHang) AS soDonThanhCong,
      COALESCE(SUM(ct.TongSach), 0) AS tongSachDaBan
    FROM DonHang dh
    INNER JOIN (
      SELECT MaDonHang, MAX(NgayThayDoi) AS NgayHoanThanh
      FROM LichSuTrangThaiDonHang
      WHERE TrangThaiMoi = 'DA_GIAO'
      GROUP BY MaDonHang
    ) ls ON dh.MaDonHang = ls.MaDonHang
    LEFT JOIN (
      SELECT MaDonHang, SUM(SoLuong) AS TongSach
      FROM ChiTietDonHang
      GROUP BY MaDonHang
    ) ct ON dh.MaDonHang = ct.MaDonHang
    WHERE dh.TrangThai = 'DA_GIAO' ${dieuKienSql}
    GROUP BY FORMAT(DATEADD(hour, 7, ls.NgayHoanThanh), :dinhDangThoiGian)
    ORDER BY thoiGian ASC
  `;

  const danhSach = await sequelize.query(cauTruyVan, {
    replacements,
    type: sequelize.QueryTypes.SELECT
  });

  return danhSach.map(item => ({
    thoiGian: item.thoiGian,
    tongDoanhThu: parseFloat(item.tongDoanhThu || 0),
    soDonThanhCong: parseInt(item.soDonThanhCong || 0, 10),
    tongSachDaBan: parseInt(item.tongSachDaBan || 0, 10)
  }));
}

// 5. Thống kê doanh thu theo thể loại sách (T39: by-category)
async function layDoanhThuTheoDanhMuc({ tuNgay, denNgay, kenhBan } = {}) {
  const { dieuKienSql, replacements } = xayDungDieuKienLoc({ tuNgay, denNgay, kenhBan });

  const cauTruyVan = `
    SELECT 
      dm.MaDanhMuc AS maDanhMuc,
      COALESCE(dm.TenDanhMuc, N'Chưa phân loại') AS tenDanhMuc,
      COALESCE(SUM(ct.SoLuong), 0) AS daBan,
      COALESCE(SUM(ct.SoLuong * ct.DonGia), 0) AS doanhThu
    FROM ChiTietDonHang ct
    INNER JOIN DonHang dh ON ct.MaDonHang = dh.MaDonHang AND dh.TrangThai = 'DA_GIAO'
    INNER JOIN (
      SELECT MaDonHang, MAX(NgayThayDoi) AS NgayHoanThanh
      FROM LichSuTrangThaiDonHang
      WHERE TrangThaiMoi = 'DA_GIAO'
      GROUP BY MaDonHang
    ) ls ON dh.MaDonHang = ls.MaDonHang
    INNER JOIN Sach s ON ct.MaSach = s.MaSach
    LEFT JOIN DanhMuc dm ON s.MaDanhMuc = dm.MaDanhMuc
    WHERE 1=1 ${dieuKienSql}
    GROUP BY dm.MaDanhMuc, dm.TenDanhMuc
    ORDER BY doanhThu DESC
  `;

  const danhSach = await sequelize.query(cauTruyVan, {
    replacements,
    type: sequelize.QueryTypes.SELECT
  });

  const tongDoanhThuTatCa = danhSach.reduce((tong, item) => tong + parseFloat(item.doanhThu || 0), 0);

  return danhSach.map(item => {
    const doanhThu = parseFloat(item.doanhThu || 0);
    const tyLeDoanhThu = tongDoanhThuTatCa > 0 ? parseFloat(((doanhThu / tongDoanhThuTatCa) * 100).toFixed(1)) : 0;
    return {
      maDanhMuc: item.maDanhMuc,
      tenDanhMuc: item.tenDanhMuc,
      daBan: parseInt(item.daBan || 0, 10),
      doanhThu,
      tyLeDoanhThu
    };
  });
}

// Tính đầu ngày hôm nay theo giờ Việt Nam (UTC+7) độc lập với múi giờ máy chủ
function layDauNgayHomNayVN() {
  const now = new Date();
  const vnTime = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const nam = vnTime.getUTCFullYear();
  const thang = vnTime.getUTCMonth();
  const ngay = vnTime.getUTCDate();
  return new Date(Date.UTC(nam, thang, ngay, 0, 0, 0) - 7 * 60 * 60 * 1000);
}

// 6. Bảng điều khiển theo vai trò (T40: GET /api/admin/summary)
async function layTongHopCongViecTheoVaiTro(maNhanVien, vaiTro) {
  const dauNgayHomNay = layDauNgayHomNayVN();
  const bayNgayTruoc = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  if (vaiTro === 'thu_kho') {
    const [donCanSoan, sachSapHet, sachHetHang] = await Promise.all([
      DonHang.count({ where: { TrangThai: 'DA_DUYET' } }),
      Sach.count({ where: { SoLuongTon: { [Op.lte]: 10, [Op.gt]: 0 }, DaAn: false } }),
      Sach.count({ where: { SoLuongTon: 0, DaAn: false } })
    ]);

    return {
      vaiTro,
      thongDiep: 'Công việc kho vận và kiểm soát hàng tồn',
      viecCanLam: {
        donCanSoan,
        sachSapHet,
        sachHetHang
      },
      dieuHuongNhanh: [
        { tieuDe: 'Đơn cần soạn hàng', soLuong: donCanSoan, duongDan: '/admin/pick-list', mauSac: 'primary' },
        { tieuDe: 'Sách sắp hết hàng (<= 10)', soLuong: sachSapHet, duongDan: '/admin/inventory', mauSac: 'warning' },
        { tieuDe: 'Sách đã hết hàng (0)', soLuong: sachHetHang, duongDan: '/admin/inventory', mauSac: 'danger' }
      ]
    };
  }

  if (vaiTro === 'thu_thu') {
    const [donQuayCuaToiHomNay, donChoDuyet, donDangGiao] = await Promise.all([
      DonHang.count({
        where: {
          KenhBan: 'TAI_QUAY',
          MaNhanVienLap: maNhanVien,
          NgayDat: { [Op.gte]: dauNgayHomNay }
        }
      }),
      DonHang.count({ where: { TrangThai: 'CHO_DUYET', KenhBan: 'TRUC_TUYEN' } }),
      DonHang.count({ where: { TrangThai: 'DA_LAY_HANG' } })
    ]);

    return {
      vaiTro,
      thongDiep: 'Công việc bán hàng tại quầy và phục vụ bạn đọc',
      viecCanLam: {
        donQuayCuaToiHomNay,
        donChoDuyet,
        donDangGiao
      },
      dieuHuongNhanh: [
        { tieuDe: 'Đơn quầy lập hôm nay', soLuong: donQuayCuaToiHomNay, duongDan: '/admin/counter-sales', mauSac: 'success' },
        { tieuDe: 'Đơn trực tuyến chờ duyệt', soLuong: donChoDuyet, duongDan: '/admin/orders?status=CHO_DUYET', mauSac: 'warning' },
        { tieuDe: 'Đơn hàng đã lấy hàng', soLuong: donDangGiao, duongDan: '/admin/orders?status=DA_LAY_HANG', mauSac: 'info' }
      ]
    };
  }

  // Mặc định hoặc quan_tri: Toàn cảnh hệ thống
  const [
    donChoDuyet,
    donCanSoan,
    sachSapHet,
    danhGiaMoi,
    ketQuaDonHoanTat,
    khachMoiHomNay
  ] = await Promise.all([
    DonHang.count({ where: { TrangThai: 'CHO_DUYET', KenhBan: 'TRUC_TUYEN' } }),
    DonHang.count({ where: { TrangThai: 'DA_DUYET' } }),
    Sach.count({ where: { SoLuongTon: { [Op.lte]: 10 }, DaAn: false } }),
    DanhGia.count({ where: { NgayTao: { [Op.gte]: bayNgayTruoc } } }),
    sequelize.query(`
      SELECT COUNT(DISTINCT ls.MaDonHang) AS soDonHoanTat
      FROM LichSuTrangThaiDonHang ls
      INNER JOIN DonHang dh ON ls.MaDonHang = dh.MaDonHang
      WHERE ls.TrangThaiMoi = 'DA_GIAO'
        AND dh.TrangThai = 'DA_GIAO'
        AND ls.NgayThayDoi >= :dauNgay
    `, {
      replacements: { dauNgay: dauNgayHomNay },
      type: sequelize.QueryTypes.SELECT
    }),
    KhachHang.count({ where: { NgayTao: { [Op.gte]: dauNgayHomNay } } })
  ]);

  const donHoanTatHomNay = parseInt(ketQuaDonHoanTat?.[0]?.soDonHoanTat || 0, 10);

  return {
    vaiTro: 'quan_tri',
    thongDiep: 'Toàn cảnh vận hành và các đầu việc cần xử lý',
    viecCanLam: {
      donChoDuyet,
      donCanSoan,
      sachSapHet,
      danhGiaMoi,
      donHoanTatHomNay,
      khachMoiHomNay
    },
    dieuHuongNhanh: [
      { tieuDe: 'Đơn trực tuyến chờ duyệt', soLuong: donChoDuyet, duongDan: '/admin/orders?status=CHO_DUYET', mauSac: 'warning' },
      { tieuDe: 'Đơn cần soạn (Kho)', soLuong: donCanSoan, duongDan: '/admin/pick-list', mauSac: 'primary' },
      { tieuDe: 'Sách sắp hết tồn kho', soLuong: sachSapHet, duongDan: '/admin/inventory', mauSac: 'danger' },
      { tieuDe: 'Đánh giá mới (7 ngày)', soLuong: danhGiaMoi, duongDan: '/admin/reviews', mauSac: 'info' }
    ]
  };
}

module.exports = {
  layTongQuanDoanhThu,
  layTopSachBanChay,
  layTyLeDonHang,
  layDoanhThuTheoChuoi,
  layDoanhThuTheoDanhMuc,
  layTongHopCongViecTheoVaiTro
};
