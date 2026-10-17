/**
 * giamGiaService.js - Dịch vụ quản lý và tính toán chương trình giảm giá sách (GG02)
 * 
 * Tuân thủ quy tắc kiến trúc và nghiệp vụ:
 * - Chỉ giảm theo %, từ 1% đến 60%.
 * - Lấy mức giảm cao nhất khi một cuốn sách rơi vào nhiều chương trình (không cộng dồn).
 * - Tự động hết hạn khi tra cứu, không cần job nền.
 * - Mọi thay đổi ghi LichSuThayDoi với LoaiDoiTuong = 'GIAM_GIA'.
 */

const { Op } = require('sequelize');
const { 
  sequelize, 
  ChuongTrinhGiamGia, 
  ChuongTrinhGiamGiaDoiTuong, 
  Sach, 
  DanhMuc, 
  NhanVien 
} = require('../models');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
const { ghiNhanThayDoi } = require('./lichSuThayDoiService');
const { tinhGiaSauGiam } = require('../utils/giaBan');

/**
 * Xác định trạng thái nghiệp vụ của chương trình giảm giá
 * @param {object} ct Đối tượng chương trình
 * @param {Date} now Thời điểm hiện tại
 * @returns {'TAM_DUNG'|'SAP_DIEN_RA'|'DA_HET_HAN'|'DANG_CHAY'}
 */
function xacDinhTrangThai(ct, now = new Date()) {
  if (!ct.DangHoatDong) return 'TAM_DUNG';
  const batDau = new Date(ct.NgayBatDau);
  const ketThuc = new Date(ct.NgayKetThuc);
  if (batDau > now) return 'SAP_DIEN_RA';
  if (ketThuc < now) return 'DA_HET_HAN';
  return 'DANG_CHAY';
}

/**
 * Lấy phần trăm giảm giá đang có hiệu lực cho danh sách sách (GG02)
 * Chỉ tính các chương trình DangHoatDong = 1 và trong khoảng thời gian hiệu lực.
 * Lấy mức giảm cao nhất nếu trùng nhiều chương trình (không cộng dồn).
 * 
 * @param {Array<number|object>} danhSachSach Mảng mã sách hoặc mảng object { MaSach, MaDanhMuc }
 * @returns {Promise<Record<number, number>>} Map ánh xạ { [MaSach]: PhanTramGiamCaoNhat }
 */
async function layPhanTramDangApDung(danhSachSach) {
  if (!Array.isArray(danhSachSach) || danhSachSach.length === 0) {
    return {};
  }

  // Chuẩn hóa danh sách sách thành mảng các { maSach, maDanhMuc }
  const canTraCuuDb = [];
  const dsChuanHoa = [];

  for (const item of danhSachSach) {
    if (typeof item === 'number' || typeof item === 'string') {
      const ma = Number(item);
      canTraCuuDb.push(ma);
      dsChuanHoa.push({ maSach: ma, maDanhMuc: null });
    } else if (item && typeof item === 'object') {
      const maSach = item.MaSach ?? item.maSach;
      const maDanhMuc = item.MaDanhMuc ?? item.maDanhMuc;
      if (maSach) {
        if (!maDanhMuc) canTraCuuDb.push(Number(maSach));
        dsChuanHoa.push({ maSach: Number(maSach), maDanhMuc: maDanhMuc ? Number(maDanhMuc) : null });
      }
    }
  }

  if (dsChuanHoa.length === 0) return {};

  // Nếu có sách chưa biết MaDanhMuc, tra cứu nhanh từ DB
  if (canTraCuuDb.length > 0) {
    const thongTinThem = await Sach.findAll({
      where: { MaSach: { [Op.in]: canTraCuuDb } },
      attributes: ['MaSach', 'MaDanhMuc']
    });
    const mapDanhMuc = new Map(thongTinThem.map(s => [s.MaSach, s.MaDanhMuc]));
    for (const item of dsChuanHoa) {
      if (!item.maDanhMuc && mapDanhMuc.has(item.maSach)) {
        item.maDanhMuc = mapDanhMuc.get(item.maSach);
      }
    }
  }

  const tatCaMaSach = dsChuanHoa.map(s => s.maSach);
  const tatCaMaDanhMuc = dsChuanHoa.map(s => s.maDanhMuc).filter(Boolean);

  const now = new Date();

  // Truy vấn các chương trình đang hoạt động trong khoảng thời gian hiệu lực
  const cacChuongTrinh = await ChuongTrinhGiamGia.findAll({
    where: {
      DangHoatDong: true,
      NgayBatDau: { [Op.lte]: now },
      NgayKetThuc: { [Op.gte]: now }
    },
    include: [
      {
        model: ChuongTrinhGiamGiaDoiTuong,
        as: 'danhSachDoiTuong',
        where: {
          [Op.or]: [
            { MaSach: { [Op.in]: tatCaMaSach } },
            tatCaMaDanhMuc.length > 0 ? { MaDanhMuc: { [Op.in]: tatCaMaDanhMuc } } : null
          ].filter(Boolean)
        },
        required: true
      }
    ]
  });

  const ketQuaPhanTram = {};

  for (const ct of cacChuongTrinh) {
    const pt = Number(ct.PhanTramGiam) || 0;
    for (const dt of ct.danhSachDoiTuong) {
      if (dt.MaSach) {
        ketQuaPhanTram[dt.MaSach] = Math.max(ketQuaPhanTram[dt.MaSach] || 0, pt);
      } else if (dt.MaDanhMuc) {
        for (const sach of dsChuanHoa) {
          if (sach.maDanhMuc === dt.MaDanhMuc) {
            ketQuaPhanTram[sach.maSach] = Math.max(ketQuaPhanTram[sach.maSach] || 0, pt);
          }
        }
      }
    }
  }

  return ketQuaPhanTram;
}

/**
 * Lấy danh sách chương trình giảm giá cho Back-Office (GG03)
 */
async function layDanhSachChuongTrinh({ page = 1, limit = 10, search, trangThai }) {
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const gioiHan = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const viTri = (trang - 1) * gioiHan;

  const dieuKien = {};
  if (search && search.trim()) {
    dieuKien.TenChuongTrinh = { [Op.like]: `%${search.trim()}%` };
  }

  const now = new Date();
  if (trangThai === 'TAM_DUNG') {
    dieuKien.DangHoatDong = false;
  } else if (trangThai === 'SAP_DIEN_RA') {
    dieuKien.DangHoatDong = true;
    dieuKien.NgayBatDau = { [Op.gt]: now };
  } else if (trangThai === 'DA_HET_HAN') {
    dieuKien.DangHoatDong = true;
    dieuKien.NgayKetThuc = { [Op.lt]: now };
  } else if (trangThai === 'DANG_CHAY') {
    dieuKien.DangHoatDong = true;
    dieuKien.NgayBatDau = { [Op.lte]: now };
    dieuKien.NgayKetThuc = { [Op.gte]: now };
  }

  const { count, rows } = await ChuongTrinhGiamGia.findAndCountAll({
    where: dieuKien,
    include: [
      {
        model: NhanVien,
        as: 'nhanVienTao',
        attributes: ['MaNhanVien', 'HoTen', 'Email']
      },
      {
        model: ChuongTrinhGiamGiaDoiTuong,
        as: 'danhSachDoiTuong',
        attributes: ['MaDoiTuong', 'MaSach', 'MaDanhMuc']
      }
    ],
    order: [['NgayTao', 'DESC']],
    offset: viTri,
    limit: gioiHan,
    distinct: true
  });

  const danhSach = rows.map((r) => {
    const item = r.toJSON();
    item.trangThai = xacDinhTrangThai(item, now);
    item.soLuongDoiTuong = item.danhSachDoiTuong?.length || 0;
    return item;
  });

  return {
    danhSach,
    phanTrang: {
      trangHienTai: trang,
      tongSoTrang: Math.ceil(count / gioiHan),
      tongSoBanGhi: count,
      kichThuocTrang: gioiHan
    }
  };
}

/**
 * Lấy chi tiết một chương trình giảm giá
 */
async function layChiTietChuongTrinh(maChuongTrinh) {
  const ct = await ChuongTrinhGiamGia.findByPk(maChuongTrinh, {
    include: [
      {
        model: NhanVien,
        as: 'nhanVienTao',
        attributes: ['MaNhanVien', 'HoTen', 'Email']
      },
      {
        model: ChuongTrinhGiamGiaDoiTuong,
        as: 'danhSachDoiTuong',
        include: [
          { model: Sach, as: 'sach', attributes: ['MaSach', 'TenSach', 'GiaBan', 'AnhBia', 'SoLuongTon', 'DaAn'] },
          { model: DanhMuc, as: 'danhMuc', attributes: ['MaDanhMuc', 'TenDanhMuc'] }
        ]
      }
    ]
  });

  if (!ct) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy chương trình giảm giá này');
  }

  const item = ct.toJSON();
  item.trangThai = xacDinhTrangThai(item);
  return item;
}

/**
 * Tạo chương trình giảm giá mới (GG03)
 */
async function taoChuongTrinh(duLieu, maNhanVienTao) {
  const { tenChuongTrinh, phanTramGiam, ngayBatDau, ngayKetThuc, danhSachMaSach, danhSachMaDanhMuc } = duLieu;

  const coSach = Array.isArray(danhSachMaSach) && danhSachMaSach.length > 0;
  const coDanhMuc = Array.isArray(danhSachMaDanhMuc) && danhSachMaDanhMuc.length > 0;

  if (!coSach && !coDanhMuc) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Vui lòng chọn ít nhất một cuốn sách hoặc thể loại áp dụng giảm giá');
  }

  const dBatDau = new Date(ngayBatDau);
  const dKetThuc = new Date(ngayKetThuc);
  if (isNaN(dBatDau.getTime()) || isNaN(dKetThuc.getTime())) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Thời gian bắt đầu hoặc kết thúc không hợp lệ');
  }
  if (dKetThuc < dBatDau) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
  }

  const pt = parseInt(phanTramGiam, 10);
  if (isNaN(pt) || pt < 1 || pt > 60) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Mức giảm giá phải là số nguyên từ 1% đến 60%');
  }

  const t = await sequelize.transaction();
  try {
    const chuongTrinh = await ChuongTrinhGiamGia.create({
      TenChuongTrinh: tenChuongTrinh.trim(),
      PhanTramGiam: pt,
      NgayBatDau: dBatDau,
      NgayKetThuc: dKetThuc,
      DangHoatDong: true,
      MaNhanVienTao: maNhanVienTao
    }, { transaction: t });

    // Tạo các đối tượng áp dụng
    const doiTuongCanThem = [];
    if (coSach) {
      for (const maSach of danhSachMaSach) {
        doiTuongCanThem.push({
          MaChuongTrinh: chuongTrinh.MaChuongTrinh,
          MaSach: Number(maSach),
          MaDanhMuc: null
        });
      }
    }
    if (coDanhMuc) {
      for (const maDm of danhSachMaDanhMuc) {
        doiTuongCanThem.push({
          MaChuongTrinh: chuongTrinh.MaChuongTrinh,
          MaSach: null,
          MaDanhMuc: Number(maDm)
        });
      }
    }

    await ChuongTrinhGiamGiaDoiTuong.bulkCreate(doiTuongCanThem, { transaction: t });

    // Ghi lịch sử thay đổi
    await ghiNhanThayDoi({
      loaiDoiTuong: 'GIAM_GIA',
      maDoiTuong: chuongTrinh.MaChuongTrinh,
      maNhanVien: maNhanVienTao,
      thayDoi: {
        TenChuongTrinh: { cu: null, moi: chuongTrinh.TenChuongTrinh },
        PhanTramGiam: { cu: null, moi: pt },
        SoLuongDoiTuong: { cu: 0, moi: doiTuongCanThem.length }
      },
      transaction: t
    });

    await t.commit();
    return await layChiTietChuongTrinh(chuongTrinh.MaChuongTrinh);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * Cập nhật chương trình giảm giá (GG03)
 */
async function capNhatChuongTrinh(maChuongTrinh, duLieu, maNhanVien) {
  const t = await sequelize.transaction();
  try {
    const ct = await ChuongTrinhGiamGia.findByPk(maChuongTrinh, { transaction: t });
    if (!ct) {
      throw LoiNghiepVu.khongTimThay('Không tìm thấy chương trình giảm giá này');
    }

    const thayDoi = {};
    if (duLieu.tenChuongTrinh !== undefined) {
      const tenMoi = duLieu.tenChuongTrinh.trim();
      if (!tenMoi) throw LoiNghiepVu.yeuCauKhongHopLe('Tên chương trình không được để trống');
      if (ct.TenChuongTrinh !== tenMoi) {
        thayDoi.TenChuongTrinh = { cu: ct.TenChuongTrinh, moi: tenMoi };
        ct.TenChuongTrinh = tenMoi;
      }
    }

    if (duLieu.phanTramGiam !== undefined) {
      const pt = parseInt(duLieu.phanTramGiam, 10);
      if (isNaN(pt) || pt < 1 || pt > 60) {
        throw LoiNghiepVu.yeuCauKhongHopLe('Mức giảm giá phải từ 1% đến 60%');
      }
      if (ct.PhanTramGiam !== pt) {
        thayDoi.PhanTramGiam = { cu: ct.PhanTramGiam, moi: pt };
        ct.PhanTramGiam = pt;
      }
    }

    let batDau = ct.NgayBatDau;
    let ketThuc = ct.NgayKetThuc;
    if (duLieu.ngayBatDau !== undefined) {
      batDau = new Date(duLieu.ngayBatDau);
      if (isNaN(batDau.getTime())) throw LoiNghiepVu.yeuCauKhongHopLe('Ngày bắt đầu không hợp lệ');
      thayDoi.NgayBatDau = { cu: ct.NgayBatDau, moi: batDau };
      ct.NgayBatDau = batDau;
    }
    if (duLieu.ngayKetThuc !== undefined) {
      ketThuc = new Date(duLieu.ngayKetThuc);
      if (isNaN(ketThuc.getTime())) throw LoiNghiepVu.yeuCauKhongHopLe('Ngày kết thúc không hợp lệ');
      thayDoi.NgayKetThuc = { cu: ct.NgayKetThuc, moi: ketThuc };
      ct.NgayKetThuc = ketThuc;
    }
    if (new Date(ketThuc) < new Date(batDau)) {
      throw LoiNghiepVu.yeuCauKhongHopLe('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
    }

    await ct.save({ transaction: t });

    // Cập nhật danh sách đối tượng nếu client truyền lên
    const coCapNhatSach = Array.isArray(duLieu.danhSachMaSach);
    const coCapNhatDm = Array.isArray(duLieu.danhSachMaDanhMuc);

    if (coCapNhatSach || coCapNhatDm) {
      await ChuongTrinhGiamGiaDoiTuong.destroy({
        where: { MaChuongTrinh: maChuongTrinh },
        transaction: t
      });

      const doiTuongMoi = [];
      if (coCapNhatSach) {
        for (const maSach of duLieu.danhSachMaSach) {
          doiTuongMoi.push({ MaChuongTrinh: maChuongTrinh, MaSach: Number(maSach), MaDanhMuc: null });
        }
      }
      if (coCapNhatDm) {
        for (const maDm of duLieu.danhSachMaDanhMuc) {
          doiTuongMoi.push({ MaChuongTrinh: maChuongTrinh, MaSach: null, MaDanhMuc: Number(maDm) });
        }
      }

      if (doiTuongMoi.length === 0) {
        throw LoiNghiepVu.yeuCauKhongHopLe('Chương trình phải áp dụng cho ít nhất một cuốn sách hoặc thể loại');
      }

      await ChuongTrinhGiamGiaDoiTuong.bulkCreate(doiTuongMoi, { transaction: t });
      thayDoi.DoiTuong = { cu: 'danh sách cũ', moi: `${doiTuongMoi.length} đối tượng mới` };
    }

    if (Object.keys(thayDoi).length > 0) {
      await ghiNhanThayDoi({
        loaiDoiTuong: 'GIAM_GIA',
        maDoiTuong: maChuongTrinh,
        maNhanVien,
        thayDoi,
        transaction: t
      });
    }

    await t.commit();
    return await layChiTietChuongTrinh(maChuongTrinh);
  } catch (err) {
    await t.rollback();
    throw err;
  }
}

/**
 * Bật hoặc Tạm dừng chương trình giảm giá (GG03)
 */
async function toggleTrangThai(maChuongTrinh, maNhanVien) {
  const ct = await ChuongTrinhGiamGia.findByPk(maChuongTrinh);
  if (!ct) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy chương trình giảm giá này');
  }

  const trangThaiCu = ct.DangHoatDong;
  const trangThaiMoi = !trangThaiCu;
  ct.DangHoatDong = trangThaiMoi;
  await ct.save();

  await ghiNhanThayDoi({
    loaiDoiTuong: 'GIAM_GIA',
    maDoiTuong: maChuongTrinh,
    maNhanVien,
    thayDoi: {
      DangHoatDong: { cu: trangThaiCu, moi: trangThaiMoi }
    }
  });

  return {
    maChuongTrinh: ct.MaChuongTrinh,
    dangHoatDong: ct.DangHoatDong,
    trangThai: xacDinhTrangThai(ct)
  };
}

module.exports = {
  tinhGiaSauGiam,
  layPhanTramDangApDung,
  layDanhSachChuongTrinh,
  layChiTietChuongTrinh,
  taoChuongTrinh,
  capNhatChuongTrinh,
  toggleTrangThai,
  xacDinhTrangThai
};
