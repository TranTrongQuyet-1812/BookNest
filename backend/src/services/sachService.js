/**
 * Tầng Service quản lý sách, tìm kiếm tiếng Việt không dấu, phân trang, CRUD và nhập kho.
 */
const { Op, TableHints } = require('sequelize');
const { sequelize, Sach, DanhMuc, LichSuNhapKho, LichSuDieuChinhKho, NhanVien } = require('../models');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
const {
  chuaTuKhoa,
  chuaTuKhoaBoKhoangTrang,
  chuaTuKhoaLinhHoat,
  locTuKhoaThucSu,
  chamDiemTimGanDung
} = require('../utils/timKiem');
const { ghiNhanThayDoi } = require('./lichSuThayDoiService');
const anhBiaService = require('./anhBiaService');
const { tinhGiaSauGiam } = require('../utils/giaBan');

// Biểu thức SQL tính phần trăm giảm giá cao nhất đang có hiệu lực (GG04 - Sử dụng GETUTCDATE() đồng bộ UTC)
const bieuThucPhanTramGiam = `(
  SELECT MAX(ct.PhanTramGiam)
  FROM ChuongTrinhGiamGia ct
  INNER JOIN ChuongTrinhGiamGiaDoiTuong dt ON ct.MaChuongTrinh = dt.MaChuongTrinh
  WHERE ct.DangHoatDong = 1 
    AND ct.NgayBatDau <= GETUTCDATE() 
    AND ct.NgayKetThuc >= GETUTCDATE()
    AND (dt.MaSach = Sach.MaSach OR dt.MaDanhMuc = Sach.MaDanhMuc)
)`;

// Biểu thức SQL tính giá sau giảm làm tròn xuống hàng trăm đồng (GG04)
const bieuThucGiaSauGiam = `CASE 
  WHEN ${bieuThucPhanTramGiam} IS NOT NULL
  THEN FLOOR(CAST(Sach.GiaBan AS BIGINT) * (100 - ${bieuThucPhanTramGiam}) / 10000.0) * 100
  ELSE Sach.GiaBan
END`;

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
    const tuKhoaTachCamelCase = tuKhoa.replace(/([a-z])([A-Z])/g, '$1 $2');
    const cotGhepTenVaTacGia = "COALESCE([Sach].[TenSach], N'') + N' ' + COALESCE([Sach].[TacGia], N'')";

    dieuKien[Op.or] = [
      chuaTuKhoa('[Sach].[TenSach]', tuKhoa),
      chuaTuKhoa('[Sach].[TacGia]', tuKhoa),
      chuaTuKhoaLinhHoat('[Sach].[TenSach]', tuKhoaTachCamelCase),
      chuaTuKhoaLinhHoat('[Sach].[TacGia]', tuKhoaTachCamelCase),
      chuaTuKhoaLinhHoat(cotGhepTenVaTacGia, tuKhoaTachCamelCase),
      chuaTuKhoaBoKhoangTrang('[Sach].[TenSach]', tuKhoa),
      chuaTuKhoaBoKhoangTrang('[Sach].[TacGia]', tuKhoa)
    ];
  }

  if (categoryId) {
    dieuKien.MaDanhMuc = parseInt(categoryId, 10);
  }

  if (minPrice !== undefined || maxPrice !== undefined) {
    const cacDieuKienGia = [];
    if (minPrice !== undefined) {
      cacDieuKienGia.push(sequelize.literal(`${bieuThucGiaSauGiam} >= ${parseFloat(minPrice)}`));
    }
    if (maxPrice !== undefined) {
      cacDieuKienGia.push(sequelize.literal(`${bieuThucGiaSauGiam} <= ${parseFloat(maxPrice)}`));
    }
    dieuKien[Op.and] = dieuKien[Op.and] ? [...dieuKien[Op.and], ...cacDieuKienGia] : cacDieuKienGia;
  }

  let sapXep = [['NgayTao', 'DESC']];
  if (sort === 'price_asc') sapXep = [[sequelize.literal(bieuThucGiaSauGiam), 'ASC']];
  if (sort === 'price_desc') sapXep = [[sequelize.literal(bieuThucGiaSauGiam), 'DESC']];
  if (sort === 'discount_desc') {
    const dieuKienGiam = sequelize.literal(`${bieuThucPhanTramGiam} > 0`);
    dieuKien[Op.and] = dieuKien[Op.and] ? [...dieuKien[Op.and], dieuKienGiam] : [dieuKienGiam];
    sapXep = [
      [sequelize.literal(bieuThucPhanTramGiam), 'DESC'],
      [sequelize.literal(bieuThucGiaSauGiam), 'ASC']
    ];
  }

  const tuyChonTimSach = {
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
        ],
        [sequelize.literal(bieuThucPhanTramGiam), 'PhanTramGiam'],
        [sequelize.literal(bieuThucGiaSauGiam), 'GiaSauGiam']
      ]
    }
  };
  let { rows, count } = await Sach.findAndCountAll(tuyChonTimSach);
  let timGanDung = false;

  const tuKhoaGanDung = search?.trim().replace(/([a-z])([A-Z])/g, '$1 $2') || '';
  if (count === 0 && locTuKhoaThucSu(tuKhoaGanDung).length > 0) {
    const dieuKienKhongTuKhoa = { ...dieuKien };
    delete dieuKienKhongTuKhoa[Op.or];

    const sachUngVien = await Sach.findAll({
      where: dieuKienKhongTuKhoa,
      order: sapXep,
      attributes: ['MaSach', 'TenSach', 'TacGia']
    });
    let sachGanDung = sachUngVien
      .map(sach => ({ maSach: sach.MaSach, ...chamDiemTimGanDung(search, sach.TenSach, sach.TacGia) }))
      .filter(ketQua => ketQua.diem > 0);

    if (!['price_asc', 'price_desc', 'discount_desc'].includes(sort)) {
      sachGanDung = sachGanDung.sort((a, b) => b.diem - a.diem);
    }

    count = sachGanDung.length;
    timGanDung = count > 0;
    const maSachTrang = sachGanDung.slice(viTri, viTri + gioiHan).map(ketQua => ketQua.maSach);
    if (maSachTrang.length > 0) {
      const sachTrang = await Sach.findAll({
        where: { ...dieuKienKhongTuKhoa, MaSach: { [Op.in]: maSachTrang } },
        order: sapXep,
        include: tuyChonTimSach.include,
        attributes: tuyChonTimSach.attributes
      });
      const thuTuMaSach = new Map(maSachTrang.map((maSach, viTriSach) => [maSach, viTriSach]));
      rows = sachTrang.sort((a, b) => thuTuMaSach.get(a.MaSach) - thuTuMaSach.get(b.MaSach));
    } else {
      rows = [];
    }
  }

  // Gán chuẩn hóa PhanTramGiam và GiaSauGiam cho từng cuốn sách
  for (const sach of rows) {
    const ptRaw = typeof sach.get === 'function' ? sach.get('PhanTramGiam') : sach.PhanTramGiam;
    const pt = ptRaw !== undefined && ptRaw !== null ? Number(ptRaw) : null;
    const giaSauRaw = typeof sach.get === 'function' ? sach.get('GiaSauGiam') : sach.GiaSauGiam;
    const giaSau = giaSauRaw !== undefined && giaSauRaw !== null ? Number(giaSauRaw) : tinhGiaSauGiam(sach.GiaBan, pt);

    if (typeof sach.setDataValue === 'function') {
      sach.setDataValue('PhanTramGiam', pt);
      sach.setDataValue('GiaSauGiam', giaSau);
    } else {
      sach.PhanTramGiam = pt;
      sach.GiaSauGiam = giaSau;
    }
  }

  return {
    danhSach: rows,
    phanTrang: {
      tongSoBanGhi: count,
      tongSoTrang: Math.ceil(count / gioiHan),
      trangHienTai: trang,
      soBanGhiMoiTrang: gioiHan,
      timGanDung
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
        ],
        [sequelize.literal(bieuThucPhanTramGiam), 'PhanTramGiam'],
        [sequelize.literal(bieuThucGiaSauGiam), 'GiaSauGiam']
      ]
    }
  });

  if (!sach || (!laAdmin && sach.DaAn)) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy cuốn sách này');
  }

  const ptRaw = typeof sach.get === 'function' ? sach.get('PhanTramGiam') : sach.PhanTramGiam;
  const pt = ptRaw !== undefined && ptRaw !== null ? Number(ptRaw) : null;
  const giaSauRaw = typeof sach.get === 'function' ? sach.get('GiaSauGiam') : sach.GiaSauGiam;
  const giaSau = giaSauRaw !== undefined && giaSauRaw !== null ? Number(giaSauRaw) : tinhGiaSauGiam(sach.GiaBan, pt);

  if (typeof sach.setDataValue === 'function') {
    sach.setDataValue('PhanTramGiam', pt);
    sach.setDataValue('GiaSauGiam', giaSau);
  } else {
    sach.PhanTramGiam = pt;
    sach.GiaSauGiam = giaSau;
  }

  return sach;
}

// Chuẩn hóa tên tác giả: cắt/gộp khoảng trắng, tra cứu kiểu viết phổ biến có sẵn
async function chuanHoaTacGia(ten, transaction) {
  if (!ten || typeof ten !== 'string') {
    throw LoiNghiepVu.yeuCauKhongHopLe('Vui lòng nhập tên tác giả');
  }

  // Cắt khoảng trắng đầu cuối, gộp các khoảng trắng liên tiếp (kể cả non-breaking space \u00A0)
  const tenDaCat = ten.replace(/[\s\u00A0]+/g, ' ').trim();
  if (!tenDaCat) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Vui lòng nhập tên tác giả');
  }

  // Tra cứu tác giả có sẵn trong DB trùng khi so sánh không phân biệt hoa thường và dấu
  const danhSachTrung = await sequelize.query(`
    SELECT TOP 1 TacGia, COUNT(*) AS SoLuong, MIN(MaSach) AS MaDauTien
    FROM Sach
    WHERE TacGia COLLATE Latin1_General_CI_AI = :tenGoc COLLATE Latin1_General_CI_AI
    GROUP BY TacGia COLLATE Latin1_General_BIN2, TacGia
    ORDER BY SoLuong DESC, MaDauTien ASC;
  `, {
    replacements: { tenGoc: tenDaCat },
    type: sequelize.QueryTypes.SELECT,
    transaction
  });

  if (danhSachTrung && danhSachTrung.length > 0) {
    const tenCoSan = danhSachTrung[0].TacGia;
    return {
      tenChuanHoa: tenCoSan,
      tenGoc: tenDaCat,
      daThayThe: tenCoSan !== tenDaCat
    };
  }

  // Chưa có thì giữ nguyên, KHÔNG tự ý viết hoa
  return {
    tenChuanHoa: tenDaCat,
    tenGoc: tenDaCat,
    daThayThe: false
  };
}

// Lấy danh sách gợi ý tác giả cho nhân viên (chỉ lấy kiểu viết phổ biến nhất, loại bỏ "Đang cập nhật")
async function layDanhSachTacGiaGoiY({ search = '', limit = 20 } = {}) {
  const soLuong = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const tuKhoa = (search || '').trim();

  const danhSach = await sequelize.query(`
    WITH ThongKeTacGia AS (
      SELECT 
        TacGia,
        COUNT(*) AS SoLuong,
        MIN(MaSach) AS MaDauTien
      FROM Sach
      WHERE TacGia IS NOT NULL 
        AND LTRIM(RTRIM(TacGia)) <> ''
        AND TacGia COLLATE Latin1_General_CI_AI <> N'Dang cap nhat'
        ${tuKhoa ? "AND TacGia COLLATE Latin1_General_CI_AI LIKE N'%' + :search + N'%'" : ""}
      GROUP BY TacGia COLLATE Latin1_General_BIN2, TacGia
    ),
    XepHang AS (
      SELECT 
        TacGia,
        SoLuong,
        ROW_NUMBER() OVER (
          PARTITION BY TacGia COLLATE Latin1_General_CI_AI 
          ORDER BY SoLuong DESC, MaDauTien ASC
        ) AS ThuTu
      FROM ThongKeTacGia
    )
    SELECT TOP (:limit) TacGia, SoLuong
    FROM XepHang
    WHERE ThuTu = 1
    ORDER BY SoLuong DESC, TacGia ASC;
  `, {
    replacements: { search: tuKhoa, limit: soLuong },
    type: sequelize.QueryTypes.SELECT
  });

  return danhSach.map(item => item.TacGia);
}

// Thêm sách mới (trong transaction: ghi thêm LichSuNhapKho nếu tồn kho > 0)
async function taoSach(duLieu, maNhanVienTao) {
  const danhMuc = await DanhMuc.findByPk(duLieu.maDanhMuc);
  if (!danhMuc) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Danh mục được chọn không tồn tại');
  }

  const tenBo = duLieu.tenBo && duLieu.tenBo.trim() ? duLieu.tenBo.trim() : null;
  const tap = duLieu.tap !== undefined && duLieu.tap !== null ? parseInt(duLieu.tap, 10) : null;
  if (tap && !tenBo) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Sách có số tập thì phải có tên bộ');
  }

  const tonKhoBanDau = parseInt(duLieu.soLuongTon, 10) || 0;
  const t = await sequelize.transaction();

  try {
    if (tenBo && tap) {
      const daCoTap = await Sach.findOne({
        where: { TenBo: tenBo, Tap: tap },
        transaction: t
      });
      if (daCoTap) {
        throw LoiNghiepVu.xungDot(`Bộ sách này đã có tập ${tap}`);
      }
    }

    const ketQuaTacGia = await chuanHoaTacGia(duLieu.tacGia, t);
    const sachMoi = await Sach.create(
      {
        TenSach: duLieu.tenSach,
        TacGia: ketQuaTacGia.tenChuanHoa,
        MoTa: duLieu.moTa || null,
        GiaBan: duLieu.giaBan,
        SoLuongTon: tonKhoBanDau,
        NguongCanhBao: duLieu.nguongCanhBao ?? 5,
        AnhBia: duLieu.anhBia || null,
        Tap: tap,
        TenBo: tenBo,
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
    const chiTiet = await layChiTietSach(sachMoi.MaSach, true);
    const ketQuaTraVe = chiTiet.toJSON ? chiTiet.toJSON() : chiTiet;
    if (ketQuaTacGia.daThayThe) {
      ketQuaTraVe.thongBaoTacGia = `Đã dùng tên tác giả có sẵn: ${ketQuaTacGia.tenChuanHoa}`;
      ketQuaTraVe.daThayTheTacGia = true;
    }
    return ketQuaTraVe;
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

    // Luật kiểm tra tập và bộ chỉ chạy khi người dùng có thay đổi tập hoặc bộ (BA3)
    if (duLieu.tenBo !== undefined || duLieu.tap !== undefined) {
      const tenBoMoi = duLieu.tenBo !== undefined ? (duLieu.tenBo && duLieu.tenBo.trim() ? duLieu.tenBo.trim() : null) : sach.TenBo;
      const tapMoi = duLieu.tap !== undefined ? (duLieu.tap !== null ? parseInt(duLieu.tap, 10) : null) : sach.Tap;

      if (tapMoi && !tenBoMoi) {
        throw LoiNghiepVu.yeuCauKhongHopLe('Sách có số tập thì phải có tên bộ');
      }

      if (tenBoMoi && tapMoi) {
        const daCoTap = await Sach.findOne({
          where: {
            TenBo: tenBoMoi,
            Tap: tapMoi,
            MaSach: { [Op.ne]: sach.MaSach }
          },
          transaction: t
        });
        if (daCoTap) {
          throw LoiNghiepVu.xungDot(`Bộ sách này đã có tập ${tapMoi}`);
        }
      }

      duLieu.tenBo = tenBoMoi;
      duLieu.tap = tapMoi;
    }

    // Chỉ chuẩn hóa tác giả khi giá trị gửi lên khác giá trị hiện tại của sách (BA2)
    let ketQuaTacGia = null;
    if (duLieu.tacGia !== undefined) {
      const tacGiaMoi = (duLieu.tacGia || '').trim();
      const tacGiaHienTai = (sach.TacGia || '').trim();
      if (tacGiaMoi !== tacGiaHienTai) {
        ketQuaTacGia = await chuanHoaTacGia(duLieu.tacGia, t);
        duLieu.tacGia = ketQuaTacGia.tenChuanHoa;
      } else {
        duLieu.tacGia = sach.TacGia;
      }
    }

    const anhBiaCu = sach.AnhBia;
    const thayDoi = {};
    const cacTruong = {
      tenSach: ['TenSach', 'TenSach'], tacGia: ['TacGia', 'TacGia'], moTa: ['MoTa', 'MoTa'],
      giaBan: ['GiaBan', 'GiaBan'], nguongCanhBao: ['NguongCanhBao', 'NguongCanhBao'],
      anhBia: ['AnhBia', 'AnhBia'], maDanhMuc: ['MaDanhMuc', 'MaDanhMuc'], daAn: ['DaAn', 'DaAn'],
      tap: ['Tap', 'Tap'], tenBo: ['TenBo', 'TenBo']
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

    // Dọn dẹp ảnh bìa cũ trên Cloudinary nếu ảnh bìa bị thay đổi hoặc gỡ bỏ (AT05)
    if (anhBiaCu && thayDoi.AnhBia) {
      anhBiaService.xoaAnhCu(anhBiaCu).catch(err => {
        console.error('[Lỗi Xóa Ảnh Cũ]', err.message);
      });
    }

    const chiTiet = await layChiTietSach(sach.MaSach, true);
    const ketQuaTraVe = chiTiet.toJSON ? chiTiet.toJSON() : chiTiet;
    if (ketQuaTacGia && ketQuaTacGia.daThayThe) {
      ketQuaTraVe.thongBaoTacGia = `Đã dùng tên tác giả có sẵn: ${ketQuaTacGia.tenChuanHoa}`;
      ketQuaTraVe.daThayTheTacGia = true;
    }
    return ketQuaTraVe;
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

// Lấy danh sách tên các bộ sách có sẵn để gợi ý (AT06)
async function layDanhSachTenBoGoiY({ search = '', limit = 20 } = {}) {
  const soLuong = Math.min(50, Math.max(1, parseInt(limit, 10) || 20));
  const tuKhoa = (search || '').trim();

  const ketQua = await sequelize.query(`
    SELECT DISTINCT TOP (:limit) TenBo
    FROM Sach
    WHERE TenBo IS NOT NULL 
      AND LTRIM(RTRIM(TenBo)) <> ''
      ${tuKhoa ? "AND TenBo COLLATE Latin1_General_CI_AI LIKE N'%' + :search + N'%'" : ""}
    ORDER BY TenBo ASC;
  `, {
    replacements: { search: tuKhoa, limit: soLuong },
    type: sequelize.QueryTypes.SELECT
  });

  return ketQua.map(item => item.TenBo);
}

// Lấy danh sách các tập sách trong cùng bộ (AT06)
async function layCacTapTrongBo(maSach) {
  const ma = parseInt(maSach, 10);
  if (isNaN(ma) || ma <= 0) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Mã sách không hợp lệ');
  }

  const sachGoc = await Sach.findByPk(ma);
  if (!sachGoc || sachGoc.DaAn) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy cuốn sách này');
  }

  if (!sachGoc.TenBo || !sachGoc.TenBo.trim()) {
    return [];
  }

  const cacTap = await Sach.findAll({
    where: {
      TenBo: sachGoc.TenBo,
      DaAn: false
    },
    order: [
      ['Tap', 'ASC'],
      ['MaSach', 'ASC']
    ],
    attributes: ['MaSach', 'TenSach', 'Tap', 'AnhBia', 'GiaBan', 'SoLuongTon']
  });

  return cacTap.map(item => {
    const tapJson = item.toJSON ? item.toJSON() : item;
    return {
      maSach: tapJson.MaSach,
      tenSach: tapJson.TenSach,
      tap: tapJson.Tap,
      anhBia: tapJson.AnhBia,
      giaBan: tapJson.GiaBan,
      conHang: tapJson.SoLuongTon > 0,
      dangXem: tapJson.MaSach === ma
    };
  });
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
  layLichSuDieuChinhKho,
  chuanHoaTacGia,
  layDanhSachTacGiaGoiY,
  layDanhSachTenBoGoiY,
  layCacTapTrongBo
};
