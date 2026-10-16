/**
 * Tầng Service quản lý sách, tìm kiếm tiếng Việt không dấu, phân trang, CRUD và nhập kho.
 */
const { Op, TableHints } = require('sequelize');
const { sequelize, Sach, DanhMuc, LichSuNhapKho, LichSuDieuChinhKho, NhanVien } = require('../models');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
const { chuaTuKhoa } = require('../utils/timKiem');
const { ghiNhanThayDoi } = require('./lichSuThayDoiService');

// Lấy danh sách sách công khai (tìm kiếm, lọc giá, lọc danh mục, phân trang)
async function layDanhSachSach({
  page = 1,
  limit = 10,
  search,
  categoryId,
  minPrice,
  maxPrice,
  sort,
  laAdmin = false
}) {
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const gioiHan = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const viTri = (trang - 1) * gioiHan;

  const dieuKien = {};
  if (!laAdmin) {
    dieuKien.DaAn = false;
  }

  if (search && search.trim().length > 0) {
    const tuKhoa = search.trim();
    dieuKien[Op.or] = [
      chuaTuKhoa('[Sach].[TenSach]', tuKhoa),
      chuaTuKhoa('[Sach].[TacGia]', tuKhoa)
    ];
  }

  if (categoryId) {
    dieuKien.MaDanhMuc = parseInt(categoryId, 10);
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    dieuKien.GiaBan = {};
    if (minPrice !== undefined) dieuKien.GiaBan[Op.gte] = parseFloat(minPrice);
    if (maxPrice !== undefined) dieuKien.GiaBan[Op.lte] = parseFloat(maxPrice);
  }

  let sapXep = [['NgayTao', 'DESC']];
  if (sort === 'price_asc') sapXep = [['GiaBan', 'ASC']];
  if (sort === 'price_desc') sapXep = [['GiaBan', 'DESC']];

  const { rows, count } = await Sach.findAndCountAll({
    where: dieuKien,
    order: sapXep,
    limit: gioiHan,
    offset: viTri,
    include: [{ model: DanhMuc, as: 'danhMuc', attributes: ['MaDanhMuc', 'TenDanhMuc'] }],
    attributes: {
      include: [
        [
          sequelize.literal(
            '(SELECT ROUND(AVG(CAST(SoSao AS FLOAT)), 1) FROM DanhGia WHERE DanhGia.MaSach = Sach.MaSach AND DanhGia.DaAn = 0)'
          ),
          'soSaoTrungBinh'
        ],
        [
          sequelize.literal(
            '(SELECT COUNT(*) FROM DanhGia WHERE DanhGia.MaSach = Sach.MaSach AND DanhGia.DaAn = 0)'
          ),
          'soLuotDanhGia'
        ]
      ]
    }
  });

  return {
    danhSach: rows,
    phanTrang: {
      tongSoBanGhi: count,
      tongSoTrang: Math.ceil(count / gioiHan),
      trangHienTai: trang,
      soBanGhiMoiTrang: gioiHan
    }
  };
}

// Lấy chi tiết sách theo mã
async function layChiTietSach(maSach, laAdmin = false) {
  const sach = await Sach.findByPk(maSach, {
    include: [{ model: DanhMuc, as: 'danhMuc', attributes: ['MaDanhMuc', 'TenDanhMuc'] }],
    attributes: {
      include: [
        [
          sequelize.literal(
            '(SELECT ROUND(AVG(CAST(SoSao AS FLOAT)), 1) FROM DanhGia WHERE DanhGia.MaSach = Sach.MaSach AND DanhGia.DaAn = 0)'
          ),
          'soSaoTrungBinh'
        ],
        [
          sequelize.literal(
            '(SELECT COUNT(*) FROM DanhGia WHERE DanhGia.MaSach = Sach.MaSach AND DanhGia.DaAn = 0)'
          ),
          'soLuotDanhGia'
        ]
      ]
    }
  });

  if (!sach || (!laAdmin && sach.DaAn)) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy cuốn sách này');
  }

  return sach;
}

// Thêm sách mới (trong transaction: ghi thêm LichSuNhapKho nếu tồn kho > 0)
async function taoSach(duLieu, maNhanVienTao) {
  const danhMuc = await DanhMuc.findByPk(duLieu.maDanhMuc);
  if (!danhMuc) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Danh mục được chọn không tồn tại');
  }

  const tonKhoBanDau = parseInt(duLieu.soLuongTon, 10) || 0;
  const t = await sequelize.transaction();

  try {
    const sachMoi = await Sach.create(
      {
        TenSach: duLieu.tenSach,
        TacGia: duLieu.tacGia,
        MoTa: duLieu.moTa || null,
        GiaBan: duLieu.giaBan,
        SoLuongTon: tonKhoBanDau,
        NguongCanhBao: duLieu.nguongCanhBao ?? 5,
        AnhBia: duLieu.anhBia || null,
        MaDanhMuc: duLieu.maDanhMuc,
        DaAn: false
      },
      { transaction: t }
    );

    if (tonKhoBanDau > 0) {
      await LichSuNhapKho.create(
        {
          MaSach: sachMoi.MaSach,
          SoLuongNhap: tonKhoBanDau,
          MaNhanVienNhap: maNhanVienTao,
          GhiChu: 'Nhập kho ban đầu khi tạo sách'
        },
        { transaction: t }
      );
    }

    await t.commit();
    return layChiTietSach(sachMoi.MaSach, true);
  } catch (loi) {
    await t.rollback();
    throw loi;
  }
}

// Cập nhật sách (không sửa trực tiếp SoLuongTon, có thể sửa DaAn để khôi phục)
async function capNhatSach(maSach, duLieu, maNhanVien) {
  const t = await sequelize.transaction();
  try {
    const sach = await Sach.findByPk(maSach, { transaction: t, tableHint: TableHints.UPDLOCK });
    if (!sach) throw LoiNghiepVu.khongTimThay('Không tìm thấy cuốn sách này');
    if (duLieu.maDanhMuc && duLieu.maDanhMuc !== sach.MaDanhMuc) {
      const danhMuc = await DanhMuc.findByPk(duLieu.maDanhMuc, { transaction: t });
      if (!danhMuc) throw LoiNghiepVu.yeuCauKhongHopLe('Danh mục được chọn không tồn tại');
    }

    const thayDoi = {};
    const cacTruong = {
      tenSach: ['TenSach', 'TenSach'], tacGia: ['TacGia', 'TacGia'], moTa: ['MoTa', 'MoTa'],
      giaBan: ['GiaBan', 'GiaBan'], nguongCanhBao: ['NguongCanhBao', 'NguongCanhBao'],
      anhBia: ['AnhBia', 'AnhBia'], maDanhMuc: ['MaDanhMuc', 'MaDanhMuc'], daAn: ['DaAn', 'DaAn']
    };
    for (const [khoa, [truongDb, truongLog]] of Object.entries(cacTruong)) {
      if (duLieu[khoa] === undefined) continue;
      const cu = sach[truongDb];
      const moi = duLieu[khoa];
      if (String(cu ?? '') !== String(moi ?? '')) thayDoi[truongLog] = { cu, moi };
      sach[truongDb] = moi;
    }
    await sach.save({ transaction: t });
    await ghiNhanThayDoi({ loaiDoiTuong: 'SACH', maDoiTuong: sach.MaSach, maNhanVien, thayDoi, transaction: t });
    await t.commit();
    return layChiTietSach(sach.MaSach, true);
  } catch (loi) {
    await t.rollback();
    throw loi;
  }
}

// Xóa mềm sách (DaAn = 1)
async function xoaMemSach(maSach, maNhanVien) {
  return capNhatSach(maSach, { daAn: true }, maNhanVien).then(() => ({ thanhCong: true }));
}

// Nhập kho cho sách (Transaction: Atomic UPDATE SoLuongTon + ghi LichSuNhapKho)
async function nhapKho(maSach, { soLuongNhap, ghiChu }, maNhanVienNhap) {
  const sach = await Sach.findByPk(maSach);
  if (!sach) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy cuốn sách này');
  }

  if (sach.DaAn) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Không thể nhập kho cho cuốn sách đã bị ẩn');
  }

  const soLuong = parseInt(soLuongNhap, 10);
  const t = await sequelize.transaction();

  try {
    // Cộng dồn nguyên tử bằng API increment của Sequelize để chống xung đột và an toàn ORM
    await Sach.increment('SoLuongTon', {
      by: soLuong,
      where: { MaSach: maSach },
      transaction: t
    });

    await LichSuNhapKho.create(
      {
        MaSach: maSach,
        SoLuongNhap: soLuong,
        MaNhanVienNhap: maNhanVienNhap,
        GhiChu: ghiChu || null
      },
      { transaction: t }
    );

    await t.commit();
    return layChiTietSach(maSach, true);
  } catch (loi) {
    await t.rollback();
    throw loi;
  }
}

// Lấy lịch sử nhập kho của cuốn sách
async function layLichSuNhapKho(maSach) {
  const sach = await Sach.findByPk(maSach);
  if (!sach) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy cuốn sách này');
  }

  const lichSu = await LichSuNhapKho.findAll({
    where: { MaSach: maSach },
    include: [{ model: NhanVien, as: 'nhanVienNhap', attributes: ['MaNhanVien', 'HoTen', 'Email'] }],
    order: [['NgayNhap', 'DESC']]
  });

  return lichSu;
}

// Lấy toàn bộ lịch sử các đợt nhập kho gần đây cho Back-Office
async function layTatCaLichSuNhapKho() {
  const lichSu = await LichSuNhapKho.findAll({
    include: [
      { model: Sach, as: 'sach', attributes: ['MaSach', 'TenSach'] },
      { model: NhanVien, as: 'nhanVienNhap', attributes: ['MaNhanVien', 'HoTen', 'Email'] }
    ],
    order: [['NgayNhap', 'DESC']],
    limit: 50
  });

  return lichSu;
}

// Lấy danh sách sách sắp hết hàng (SoLuongTon <= NguongCanhBao)
async function layDanhSachSapHetHang({ page = 1, limit = 20 } = {}) {
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const gioiHan = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
  const viTri = (trang - 1) * gioiHan;
  const danhSach = await Sach.findAll({
    where: {
      DaAn: false,
      SoLuongTon: { [Op.lte]: sequelize.col('NguongCanhBao') }
    },
    include: [{ model: DanhMuc, as: 'danhMuc', attributes: ['MaDanhMuc', 'TenDanhMuc'] }],
    order: [['SoLuongTon', 'ASC'], ['TenSach', 'ASC']],
    limit: gioiHan,
    offset: viTri
  });
  const tongSoBanGhi = await Sach.count({ where: {
    DaAn: false,
    SoLuongTon: { [Op.lte]: sequelize.col('NguongCanhBao') }
  } });
  return { danhSach, phanTrang: { tongSoBanGhi, tongSoTrang: Math.ceil(tongSoBanGhi / gioiHan), trangHienTai: trang, soBanGhiMoiTrang: gioiHan } };
}

// Báo cáo tổng quan kho không trả về thông tin cá nhân khách hàng.
async function layBaoCaoKho() {
  const [ketQua] = await sequelize.query(`
    SELECT COUNT(*) AS tongDauSach,
      COALESCE(SUM(SoLuongTon), 0) AS tongSoLuongTon,
      COALESCE(SUM(SoLuongTon * GiaBan), 0) AS giaTriTonKho,
      SUM(CASE WHEN SoLuongTon <= NguongCanhBao THEN 1 ELSE 0 END) AS soSachSapHet,
      SUM(CASE WHEN SoLuongTon = 0 THEN 1 ELSE 0 END) AS soSachHetHang
    FROM Sach WHERE DaAn = 0
  `, { type: sequelize.QueryTypes.SELECT });
  const sachBanCham = await sequelize.query(`
    SELECT s.MaSach AS maSach, s.TenSach AS tenSach, s.SoLuongTon AS soLuongTon,
      s.GiaBan AS giaBan, s.SoLuongTon * s.GiaBan AS giaTriTon,
      ban.ngayBanGanNhat,
      COUNT(*) OVER() AS soSachBanCham
    FROM Sach s
    OUTER APPLY (
      SELECT
        COUNT(DISTINCT CASE WHEN ls.NgayThayDoi >= DATEADD(DAY, -90, SYSDATETIME()) THEN dh.MaDonHang END) AS soDon90Ngay,
        MAX(ls.NgayThayDoi) AS ngayBanGanNhat
      FROM ChiTietDonHang ct
      INNER JOIN DonHang dh ON dh.MaDonHang = ct.MaDonHang AND dh.TrangThai = 'DA_GIAO'
      INNER JOIN LichSuTrangThaiDonHang ls ON ls.MaDonHang = dh.MaDonHang AND ls.TrangThaiMoi = 'DA_GIAO'
      WHERE ct.MaSach = s.MaSach
    ) ban
    WHERE s.DaAn = 0 AND s.SoLuongTon > 0 AND ban.soDon90Ngay = 0
    ORDER BY giaTriTon DESC, s.TenSach ASC
  `, { type: sequelize.QueryTypes.SELECT });
  return {
    tongDauSach: Number(ketQua.tongDauSach || 0),
    tongSoLuongTon: Number(ketQua.tongSoLuongTon || 0),
    giaTriTonKho: Number(ketQua.giaTriTonKho || 0),
    soSachSapHet: Number(ketQua.soSachSapHet || 0),
    soSachHetHang: Number(ketQua.soSachHetHang || 0),
    sachBanCham: sachBanCham.map(sach => ({
      maSach: sach.maSach,
      tenSach: sach.tenSach,
      soLuongTon: Number(sach.soLuongTon),
      giaBan: Number(sach.giaBan),
      giaTriTon: Number(sach.giaTriTon),
      ngayBanGanNhat: sach.ngayBanGanNhat,
      soNgayKhongBan: 90
    })),
    soSachBanCham: Number(sachBanCham[0]?.soSachBanCham || 0)
  };
}

async function layLichSuDieuChinhKho({ page = 1, limit = 20 } = {}) {
  const trang = Math.max(1, Number(page) || 1);
  const gioiHan = Math.min(100, Math.max(1, Number(limit) || 20));
  const { rows, count } = await LichSuDieuChinhKho.findAndCountAll({
    order: [['NgayDieuChinh', 'DESC'], ['MaDieuChinhKho', 'DESC']],
    limit: gioiHan, offset: (trang - 1) * gioiHan,
    include: [
      { model: Sach, as: 'sach', attributes: ['MaSach', 'TenSach'] },
      { model: NhanVien, as: 'nhanVienDieuChinh', attributes: ['MaNhanVien', 'HoTen'] }
    ]
  });
  return { danhSach: rows, phanTrang: { tongSoBanGhi: count, tongSoTrang: Math.ceil(count / gioiHan), trangHienTai: trang, soBanGhiMoiTrang: gioiHan } };
}

// Điều chỉnh tồn kho có lý do; UPDLOCK giữ số tồn trước/sau nhất quán.
async function dieuChinhTonKho(maSach, duLieu, maNhanVien) {
  const { soLuongThayDoi, loaiDieuChinh, ghiChu } = duLieu;
  if (!Number.isInteger(soLuongThayDoi) || soLuongThayDoi === 0) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Số lượng điều chỉnh phải là số nguyên khác 0');
  }
  if (soLuongThayDoi > 0 && !['KIEM_KE', 'KHAC'].includes(loaiDieuChinh)) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Chỉ kiểm kê hoặc lý do khác mới được phép tăng tồn kho');
  }
  if (!['KIEM_KE', 'HU_HONG', 'THAT_LAC', 'TRA_NXB', 'KHAC'].includes(loaiDieuChinh)) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Loại điều chỉnh tồn kho không hợp lệ');
  }
  if (loaiDieuChinh === 'KHAC' && !String(ghiChu || '').trim()) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Vui lòng ghi chú khi chọn loại điều chỉnh khác');
  }

  const t = await sequelize.transaction();
  try {
    const sach = await Sach.findByPk(maSach, { transaction: t, tableHint: TableHints.UPDLOCK });
    if (!sach) throw LoiNghiepVu.khongTimThay('Không tìm thấy cuốn sách này');
    if (sach.DaAn) throw LoiNghiepVu.yeuCauKhongHopLe('Không thể điều chỉnh sách đã ẩn');
    const tonTruoc = sach.SoLuongTon;
    const dieuKien = { MaSach: maSach };
    if (soLuongThayDoi < 0) dieuKien.SoLuongTon = { [Op.gte]: Math.abs(soLuongThayDoi) };
    const phepTinh = soLuongThayDoi > 0 ? '+' : '-';
    const [soDongCapNhat] = await Sach.update({
      SoLuongTon: sequelize.literal(`[SoLuongTon] ${phepTinh} ${Math.abs(soLuongThayDoi)}`)
    }, { where: dieuKien, transaction: t });
    if (soDongCapNhat === 0) throw LoiNghiepVu.xungDot(`Không thể giảm kho, hiện chỉ còn ${tonTruoc} cuốn`);
    const tonSau = tonTruoc + soLuongThayDoi;
    await LichSuDieuChinhKho.create({
      MaSach: maSach, SoLuongThayDoi: soLuongThayDoi, TonTruoc: tonTruoc, TonSau: tonSau,
      LoaiDieuChinh: loaiDieuChinh, GhiChu: ghiChu?.trim() || null, MaNhanVienDieuChinh: maNhanVien
    }, { transaction: t });
    await t.commit();
    return layChiTietSach(maSach, true);
  } catch (loi) {
    await t.rollback();
    throw loi;
  }
}

module.exports = {
  layDanhSachSach,
  layChiTietSach,
  taoSach,
  capNhatSach,
  xoaMemSach,
  nhapKho,
  layLichSuNhapKho,
  layTatCaLichSuNhapKho,
  layDanhSachSapHetHang,
  dieuChinhTonKho,
  layBaoCaoKho,
  layLichSuDieuChinhKho
};
