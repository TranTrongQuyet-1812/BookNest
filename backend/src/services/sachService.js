/**
 * Tầng Service quản lý sách, tìm kiếm tiếng Việt không dấu, phân trang, CRUD và nhập kho.
 */
const { Op } = require('sequelize');
const { sequelize, Sach, DanhMuc, LichSuNhapKho, NguoiDung } = require('../models');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');

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
      { TenSach: { [Op.like]: `%${tuKhoa}%` } },
      { TacGia: { [Op.like]: `%${tuKhoa}%` } }
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
            '(SELECT ROUND(AVG(CAST(SoSao AS FLOAT)), 1) FROM DanhGia WHERE DanhGia.MaSach = Sach.MaSach)'
          ),
          'soSaoTrungBinh'
        ],
        [
          sequelize.literal(
            '(SELECT COUNT(*) FROM DanhGia WHERE DanhGia.MaSach = Sach.MaSach)'
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
            '(SELECT ROUND(AVG(CAST(SoSao AS FLOAT)), 1) FROM DanhGia WHERE DanhGia.MaSach = Sach.MaSach)'
          ),
          'soSaoTrungBinh'
        ],
        [
          sequelize.literal(
            '(SELECT COUNT(*) FROM DanhGia WHERE DanhGia.MaSach = Sach.MaSach)'
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
async function taoSach(duLieu, maNguoiTao) {
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
        NguongCanhBao: duLieu.nguongCanhBao || 5,
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
          MaNguoiNhap: maNguoiTao,
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
async function capNhatSach(maSach, duLieu) {
  const sach = await Sach.findByPk(maSach);
  if (!sach) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy cuốn sách này');
  }

  if (duLieu.maDanhMuc && duLieu.maDanhMuc !== sach.MaDanhMuc) {
    const danhMuc = await DanhMuc.findByPk(duLieu.maDanhMuc);
    if (!danhMuc) {
      throw LoiNghiepVu.yeuCauKhongHopLe('Danh mục được chọn không tồn tại');
    }
    sach.MaDanhMuc = duLieu.maDanhMuc;
  }

  if (duLieu.tenSach !== undefined) sach.TenSach = duLieu.tenSach;
  if (duLieu.tacGia !== undefined) sach.TacGia = duLieu.tacGia;
  if (duLieu.moTa !== undefined) sach.MoTa = duLieu.moTa;
  if (duLieu.giaBan !== undefined) sach.GiaBan = duLieu.giaBan;
  if (duLieu.nguongCanhBao !== undefined) sach.NguongCanhBao = duLieu.nguongCanhBao;
  if (duLieu.anhBia !== undefined) sach.AnhBia = duLieu.anhBia;
  if (duLieu.daAn !== undefined) sach.DaAn = duLieu.daAn;

  await sach.save();
  return layChiTietSach(sach.MaSach, true);
}

// Xóa mềm sách (DaAn = 1)
async function xoaMemSach(maSach) {
  const sach = await Sach.findByPk(maSach);
  if (!sach) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy cuốn sách này');
  }

  sach.DaAn = true;
  await sach.save();
  return { thanhCong: true };
}

// Nhập kho cho sách (Transaction: Atomic UPDATE SoLuongTon + ghi LichSuNhapKho)
async function nhapKho(maSach, { soLuongNhap, ghiChu }, maNguoiNhap) {
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
    // Cộng dồn nguyên tử ngay trong câu lệnh SQL để chống xung đột cập nhật đồng thời
    await Sach.update(
      { SoLuongTon: sequelize.literal(`SoLuongTon + ${soLuong}`) },
      { where: { MaSach: maSach }, transaction: t }
    );

    await LichSuNhapKho.create(
      {
        MaSach: maSach,
        SoLuongNhap: soLuong,
        MaNguoiNhap: maNguoiNhap,
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
    include: [{ model: NguoiDung, as: 'nguoiNhap', attributes: ['MaNguoiDung', 'HoTen', 'Email'] }],
    order: [['NgayNhap', 'DESC']]
  });

  return lichSu;
}

// Lấy danh sách sách sắp hết hàng (SoLuongTon <= NguongCanhBao)
async function layDanhSachSapHetHang() {
  const danhSach = await Sach.findAll({
    where: {
      DaAn: false,
      SoLuongTon: { [Op.lte]: sequelize.col('NguongCanhBao') }
    },
    include: [{ model: DanhMuc, as: 'danhMuc', attributes: ['MaDanhMuc', 'TenDanhMuc'] }],
    order: [['SoLuongTon', 'ASC']]
  });

  return danhSach;
}

module.exports = {
  layDanhSachSach,
  layChiTietSach,
  taoSach,
  capNhatSach,
  xoaMemSach,
  nhapKho,
  layLichSuNhapKho,
  layDanhSachSapHetHang
};
