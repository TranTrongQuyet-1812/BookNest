/**
 * Quản lý tập trung các Model Sequelize và thiết lập mối quan hệ (Associations) giữa các bảng.
 * Không sử dụng sequelize.sync() vì cơ sở dữ liệu đã được khởi tạo bởi script SQL chuẩn 3NF.
 */
const { sequelize } = require('../config/ketNoiDb');
const NguoiDung = require('./NguoiDung');
const DanhMuc = require('./DanhMuc');
const Sach = require('./Sach');
const GioHang = require('./GioHang');
const DonHang = require('./DonHang');
const ChiTietDonHang = require('./ChiTietDonHang');
const DanhGia = require('./DanhGia');
const LichSuNhapKho = require('./LichSuNhapKho');
const LichSuTrangThaiDonHang = require('./LichSuTrangThaiDonHang');

// ==========================================
// 1. Quan hệ DanhMuc ↔ Sach (1 - n)
// ==========================================
DanhMuc.hasMany(Sach, { foreignKey: 'MaDanhMuc', as: 'danhSachSach' });
Sach.belongsTo(DanhMuc, { foreignKey: 'MaDanhMuc', as: 'danhMuc' });

// ==========================================
// 2. Quan hệ NguoiDung ↔ DonHang (1 - n)
// ==========================================
NguoiDung.hasMany(DonHang, { foreignKey: 'MaNguoiDung', as: 'danhSachDonHang' });
DonHang.belongsTo(NguoiDung, { foreignKey: 'MaNguoiDung', as: 'nguoiDung' });

// ==========================================
// 3. Quan hệ DonHang ↔ ChiTietDonHang ↔ Sach (n - n)
// ==========================================
DonHang.hasMany(ChiTietDonHang, { foreignKey: 'MaDonHang', as: 'chiTietDonHang' });
ChiTietDonHang.belongsTo(DonHang, { foreignKey: 'MaDonHang', as: 'donHang' });

Sach.hasMany(ChiTietDonHang, { foreignKey: 'MaSach', as: 'chiTietDonHang' });
ChiTietDonHang.belongsTo(Sach, { foreignKey: 'MaSach', as: 'sach' });

DonHang.belongsToMany(Sach, { through: ChiTietDonHang, foreignKey: 'MaDonHang', otherKey: 'MaSach', as: 'danhSachSach' });
Sach.belongsToMany(DonHang, { through: ChiTietDonHang, foreignKey: 'MaSach', otherKey: 'MaDonHang', as: 'danhSachDonHang' });

// ==========================================
// 4. Quan hệ NguoiDung ↔ GioHang ↔ Sach (n - n)
// ==========================================
NguoiDung.hasMany(GioHang, { foreignKey: 'MaNguoiDung', as: 'gioHang' });
GioHang.belongsTo(NguoiDung, { foreignKey: 'MaNguoiDung', as: 'nguoiDung' });

Sach.hasMany(GioHang, { foreignKey: 'MaSach', as: 'gioHang' });
GioHang.belongsTo(Sach, { foreignKey: 'MaSach', as: 'sach' });

NguoiDung.belongsToMany(Sach, { through: GioHang, foreignKey: 'MaNguoiDung', otherKey: 'MaSach', as: 'sachTrongGio' });
Sach.belongsToMany(NguoiDung, { through: GioHang, foreignKey: 'MaSach', otherKey: 'MaNguoiDung', as: 'khachCoTrongGio' });

// ==========================================
// 5. Quan hệ NguoiDung & Sach ↔ DanhGia (1 - n)
// ==========================================
NguoiDung.hasMany(DanhGia, { foreignKey: 'MaNguoiDung', as: 'danhSachDanhGia' });
DanhGia.belongsTo(NguoiDung, { foreignKey: 'MaNguoiDung', as: 'nguoiDung' });

Sach.hasMany(DanhGia, { foreignKey: 'MaSach', as: 'danhSachDanhGia' });
DanhGia.belongsTo(Sach, { foreignKey: 'MaSach', as: 'sach' });

// ==========================================
// 6. Quan hệ Sach & NguoiDung ↔ LichSuNhapKho (1 - n)
// ==========================================
Sach.hasMany(LichSuNhapKho, { foreignKey: 'MaSach', as: 'lichSuNhapKho' });
LichSuNhapKho.belongsTo(Sach, { foreignKey: 'MaSach', as: 'sach' });

NguoiDung.hasMany(LichSuNhapKho, { foreignKey: 'MaNguoiNhap', as: 'lichSuNhapKho' });
LichSuNhapKho.belongsTo(NguoiDung, { foreignKey: 'MaNguoiNhap', as: 'nguoiNhap' });

// ==========================================
// 7. Quan hệ DonHang & NguoiDung ↔ LichSuTrangThaiDonHang (1 - n)
// ==========================================
DonHang.hasMany(LichSuTrangThaiDonHang, { foreignKey: 'MaDonHang', as: 'lichSuTrangThai' });
LichSuTrangThaiDonHang.belongsTo(DonHang, { foreignKey: 'MaDonHang', as: 'donHang' });

NguoiDung.hasMany(LichSuTrangThaiDonHang, { foreignKey: 'MaNguoiThucHien', as: 'lichSuCapNhatDon' });
LichSuTrangThaiDonHang.belongsTo(NguoiDung, { foreignKey: 'MaNguoiThucHien', as: 'nguoiThucHien' });

module.exports = {
  sequelize,
  NguoiDung,
  DanhMuc,
  Sach,
  GioHang,
  DonHang,
  ChiTietDonHang,
  DanhGia,
  LichSuNhapKho,
  LichSuTrangThaiDonHang
};
