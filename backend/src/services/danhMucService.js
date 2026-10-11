/**
 * Tầng Service xử lý nghiệp vụ quản lý thể loại sách (DanhMuc).
 */
const { sequelize, DanhMuc, Sach } = require('../models');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');

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
async function taoDanhMuc({ tenDanhMuc, moTa }) {
  const tonTai = await DanhMuc.findOne({ where: { TenDanhMuc: tenDanhMuc } });
  if (tonTai) {
    throw LoiNghiepVu.xungDot('Tên danh mục này đã tồn tại trên hệ thống');
  }

  const danhMucMoi = await DanhMuc.create({
    TenDanhMuc: tenDanhMuc,
    MoTa: moTa || null
  });

  return danhMucMoi;
}

// Cập nhật thông tin danh mục
async function capNhatDanhMuc(maDanhMuc, { tenDanhMuc, moTa }) {
  const danhMuc = await DanhMuc.findByPk(maDanhMuc);
  if (!danhMuc) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy danh mục yêu cầu');
  }

  if (tenDanhMuc && tenDanhMuc !== danhMuc.TenDanhMuc) {
    const trungTen = await DanhMuc.findOne({ where: { TenDanhMuc: tenDanhMuc } });
    if (trungTen) {
      throw LoiNghiepVu.xungDot('Tên danh mục này đã được sử dụng');
    }
    danhMuc.TenDanhMuc = tenDanhMuc;
  }

  if (moTa !== undefined) {
    danhMuc.MoTa = moTa;
  }

  await danhMuc.save();
  return danhMuc;
}

// Xóa danh mục (chặn nếu còn sách thuộc danh mục)
async function xoaDanhMuc(maDanhMuc) {
  const danhMuc = await DanhMuc.findByPk(maDanhMuc);
  if (!danhMuc) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy danh mục yêu cầu');
  }

  // Đếm toàn bộ sách (kể cả sách đã ẩn DaAn = 1)
  const soSach = await Sach.count({ where: { MaDanhMuc: maDanhMuc } });
  if (soSach > 0) {
    throw LoiNghiepVu.xungDot(
      `Không thể xóa danh mục vì vẫn còn ${soSach} cuốn sách thuộc thể loại này. Vui lòng chuyển các cuốn sách sang danh mục khác trước khi xóa.`
    );
  }

  await danhMuc.destroy();
  return { thanhCong: true };
}

module.exports = {
  layDanhSachDanhMuc,
  layChiTietDanhMuc,
  taoDanhMuc,
  capNhatDanhMuc,
  xoaDanhMuc
};
