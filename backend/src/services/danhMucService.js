/**
 * Tầng Service xử lý nghiệp vụ quản lý thể loại sách (DanhMuc).
 */
const { sequelize, DanhMuc, Sach } = require('../models');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
const { ghiNhanThayDoi } = require('./lichSuThayDoiService');

// Lấy danh sách thể loại kèm số lượng sách chưa ẩn thuộc danh mục đó
async function layDanhSachDanhMuc() {
  const danhSach = await DanhMuc.findAll({
    attributes: {
      include: [
        [
          sequelize.literal(
            '(SELECT COUNT(*) FROM Sach WHERE Sach.MaDanhMuc = DanhMuc.MaDanhMuc AND Sach.DaAn = 0)'
          ),
          'soLuongSach'
        ]
      ]
    },
    order: [['TenDanhMuc', 'ASC']]
  });

  return danhSach;
}

// Lấy chi tiết một danh mục theo mã
async function layChiTietDanhMuc(maDanhMuc) {
  const danhMuc = await DanhMuc.findByPk(maDanhMuc);
  if (!danhMuc) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy danh mục yêu cầu');
  }
  return danhMuc;
}

// Thêm danh mục mới
async function taoDanhMuc({ tenDanhMuc, moTa }, maNhanVien) {
  const tonTai = await DanhMuc.findOne({ where: { TenDanhMuc: tenDanhMuc } });
  if (tonTai) {
    throw LoiNghiepVu.xungDot('Tên danh mục này đã tồn tại trên hệ thống');
  }

  const t = await sequelize.transaction();
  const danhMucMoi = await DanhMuc.create({
    TenDanhMuc: tenDanhMuc,
    MoTa: moTa || null
  }, { transaction: t });
  await ghiNhanThayDoi({
    loaiDoiTuong: 'DANH_MUC', maDoiTuong: danhMucMoi.MaDanhMuc, maNhanVien,
    thayDoi: { TenDanhMuc: { cu: null, moi: tenDanhMuc }, MoTa: { cu: null, moi: moTa || null } }, transaction: t
  });
  await t.commit();

  return danhMucMoi;
}

// Cập nhật thông tin danh mục
async function capNhatDanhMuc(maDanhMuc, { tenDanhMuc, moTa }, maNhanVien) {
  const t = await sequelize.transaction();
  const danhMuc = await DanhMuc.findByPk(maDanhMuc, { transaction: t });
  if (!danhMuc) {
    await t.rollback();
    throw LoiNghiepVu.khongTimThay('Không tìm thấy danh mục yêu cầu');
  }

  const thayDoi = {};

  if (tenDanhMuc && tenDanhMuc !== danhMuc.TenDanhMuc) {
    const trungTen = await DanhMuc.findOne({ where: { TenDanhMuc: tenDanhMuc } });
    if (trungTen) {
      await t.rollback();
      throw LoiNghiepVu.xungDot('Tên danh mục này đã được sử dụng');
    }
    thayDoi.TenDanhMuc = { cu: danhMuc.TenDanhMuc, moi: tenDanhMuc };
    danhMuc.TenDanhMuc = tenDanhMuc;
  }

  if (moTa !== undefined) {
    thayDoi.MoTa = { cu: danhMuc.MoTa, moi: moTa };
    danhMuc.MoTa = moTa;
  }

  await danhMuc.save({ transaction: t });
  await ghiNhanThayDoi({ loaiDoiTuong: 'DANH_MUC', maDoiTuong: danhMuc.MaDanhMuc, maNhanVien, thayDoi, transaction: t });
  await t.commit();
  return danhMuc;
}

// Xóa danh mục (chặn nếu còn sách thuộc danh mục)
async function xoaDanhMuc(maDanhMuc, maNhanVien) {
  const t = await sequelize.transaction();
  const danhMuc = await DanhMuc.findByPk(maDanhMuc, { transaction: t });
  if (!danhMuc) {
    await t.rollback();
    throw LoiNghiepVu.khongTimThay('Không tìm thấy danh mục yêu cầu');
  }

  // Đếm toàn bộ sách (kể cả sách đã ẩn DaAn = 1)
  const soSach = await Sach.count({ where: { MaDanhMuc: maDanhMuc }, transaction: t });
  if (soSach > 0) {
    await t.rollback();
    throw LoiNghiepVu.xungDot(
      `Không thể xóa danh mục vì vẫn còn ${soSach} cuốn sách thuộc thể loại này. Vui lòng chuyển các cuốn sách sang danh mục khác trước khi xóa.`
    );
  }

  await ghiNhanThayDoi({
    loaiDoiTuong: 'DANH_MUC', maDoiTuong: danhMuc.MaDanhMuc, maNhanVien,
    thayDoi: { TenDanhMuc: { cu: danhMuc.TenDanhMuc, moi: null }, MoTa: { cu: danhMuc.MoTa, moi: null } }, transaction: t
  });
  await danhMuc.destroy({ transaction: t });
  await t.commit();
  return { thanhCong: true };
}

module.exports = {
  layDanhSachDanhMuc,
  layChiTietDanhMuc,
  taoDanhMuc,
  capNhatDanhMuc,
  xoaDanhMuc
};
