/**
 * Quản lý tập trung các Model Sequelize và thiết lập mối quan hệ (Associations) giữa các bảng.
 * Không sử dụng sequelize.sync() vì cơ sở dữ liệu đã được khởi tạo bởi script SQL chuẩn 3NF.
 */
const { sequelize } = require('../config/ketNoiDb');
const NhanVien = require('./NhanVien');
const KhachHang = require('./KhachHang');
const DanhMuc = require('./DanhMuc');
const Sach = require('./Sach');
const GioHang = require('./GioHang');
const DonHang = require('./DonHang');
const ChiTietDonHang = require('./ChiTietDonHang');
const DanhGia = require('./DanhGia');
const LichSuNhapKho = require('./LichSuNhapKho');
const LichSuTrangThaiDonHang = require('./LichSuTrangThaiDonHang');
const LichSuThayDoi = require('./LichSuThayDoi');
const LichSuDieuChinhKho = require('./LichSuDieuChinhKho');
const ThanhToan = require('./ThanhToan');
const NhatKyWebhookPayos = require('./NhatKyWebhookPayos');
const CauHinhHeThong = require('./CauHinhHeThong');
const NhatKyChatbot = require('./NhatKyChatbot');
const ChuongTrinhGiamGia = require('./ChuongTrinhGiamGia');
const ChuongTrinhGiamGiaDoiTuong = require('./ChuongTrinhGiamGiaDoiTuong');
const OtpQuenMatKhau = require('./OtpQuenMatKhau');

// ==========================================
// 1. Quan hệ DanhMuc ↔ Sach (1 - n)
// ==========================================
DanhMuc.hasMany(Sach, { foreignKey: 'MaDanhMuc', as: 'danhSachSach' });
Sach.belongsTo(DanhMuc, { foreignKey: 'MaDanhMuc', as: 'danhMuc' });

// ==========================================
// 2. Quan hệ KhachHang ↔ DonHang (1 - n). MaKhachHang NULL = đơn của khách vãng lai
// ==========================================
KhachHang.hasMany(DonHang, { foreignKey: 'MaKhachHang', as: 'danhSachDonHang' });
DonHang.belongsTo(KhachHang, { foreignKey: 'MaKhachHang', as: 'khachHang' });
NhanVien.hasMany(DonHang, { foreignKey: 'MaNhanVienLap', as: 'donHangLap' });
DonHang.belongsTo(NhanVien, { foreignKey: 'MaNhanVienLap', as: 'nhanVienLap' });

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
// 4. Quan hệ KhachHang ↔ GioHang ↔ Sach (n - n)
// ==========================================
KhachHang.hasMany(GioHang, { foreignKey: 'MaKhachHang', as: 'gioHang' });
GioHang.belongsTo(KhachHang, { foreignKey: 'MaKhachHang', as: 'khachHang' });

Sach.hasMany(GioHang, { foreignKey: 'MaSach', as: 'gioHang' });
GioHang.belongsTo(Sach, { foreignKey: 'MaSach', as: 'sach' });

KhachHang.belongsToMany(Sach, { through: GioHang, foreignKey: 'MaKhachHang', otherKey: 'MaSach', as: 'sachTrongGio' });
Sach.belongsToMany(KhachHang, { through: GioHang, foreignKey: 'MaSach', otherKey: 'MaKhachHang', as: 'khachCoTrongGio' });

// ==========================================
// 5. Quan hệ KhachHang & Sach ↔ DanhGia (1 - n)
// ==========================================
KhachHang.hasMany(DanhGia, { foreignKey: 'MaKhachHang', as: 'danhSachDanhGia' });
DanhGia.belongsTo(KhachHang, { foreignKey: 'MaKhachHang', as: 'khachHang' });

Sach.hasMany(DanhGia, { foreignKey: 'MaSach', as: 'danhSachDanhGia' });
DanhGia.belongsTo(Sach, { foreignKey: 'MaSach', as: 'sach' });

// ==========================================
// 6. Quan hệ Sach & NhanVien ↔ LichSuNhapKho (1 - n)
// ==========================================
Sach.hasMany(LichSuNhapKho, { foreignKey: 'MaSach', as: 'lichSuNhapKho' });
LichSuNhapKho.belongsTo(Sach, { foreignKey: 'MaSach', as: 'sach' });

NhanVien.hasMany(LichSuNhapKho, { foreignKey: 'MaNhanVienNhap', as: 'lichSuNhapKho' });
LichSuNhapKho.belongsTo(NhanVien, { foreignKey: 'MaNhanVienNhap', as: 'nhanVienNhap' });

// ==========================================
// 7. Quan hệ DonHang ↔ LichSuTrangThaiDonHang (1 - n); người thực hiện là khách hoặc nhân viên
// ==========================================
DonHang.hasMany(LichSuTrangThaiDonHang, { foreignKey: 'MaDonHang', as: 'lichSuTrangThai' });
LichSuTrangThaiDonHang.belongsTo(DonHang, { foreignKey: 'MaDonHang', as: 'donHang' });

KhachHang.hasMany(LichSuTrangThaiDonHang, { foreignKey: 'MaKhachHangThucHien', as: 'lichSuCapNhatDon' });
LichSuTrangThaiDonHang.belongsTo(KhachHang, { foreignKey: 'MaKhachHangThucHien', as: 'khachHangThucHien' });

NhanVien.hasMany(LichSuTrangThaiDonHang, { foreignKey: 'MaNhanVienThucHien', as: 'lichSuCapNhatDon' });
LichSuTrangThaiDonHang.belongsTo(NhanVien, { foreignKey: 'MaNhanVienThucHien', as: 'nhanVienThucHien' });

// ==========================================
// 8. Lịch sử thay đổi dữ liệu và điều chỉnh tồn kho
// ==========================================
NhanVien.hasMany(LichSuThayDoi, { foreignKey: 'MaNhanVienThayDoi', as: 'lichSuThayDoi' });
LichSuThayDoi.belongsTo(NhanVien, { foreignKey: 'MaNhanVienThayDoi', as: 'nhanVienThayDoi' });
Sach.hasMany(LichSuDieuChinhKho, { foreignKey: 'MaSach', as: 'lichSuDieuChinhKho' });
LichSuDieuChinhKho.belongsTo(Sach, { foreignKey: 'MaSach', as: 'sach' });
NhanVien.hasMany(LichSuDieuChinhKho, { foreignKey: 'MaNhanVienDieuChinh', as: 'lichSuDieuChinhKho' });
LichSuDieuChinhKho.belongsTo(NhanVien, { foreignKey: 'MaNhanVienDieuChinh', as: 'nhanVienDieuChinh' });

// ==========================================
// 9. Quan hệ DonHang ↔ ThanhToan (1 - 1; một đơn có tối đa một khoản)
// ==========================================
DonHang.hasOne(ThanhToan, { foreignKey: 'MaDonHang', as: 'thanhToan' });
ThanhToan.belongsTo(DonHang, { foreignKey: 'MaDonHang', as: 'donHang' });

NhanVien.hasMany(CauHinhHeThong, { foreignKey: 'MaNhanVienCapNhat', as: 'cauHinhCapNhat' });
CauHinhHeThong.belongsTo(NhanVien, { foreignKey: 'MaNhanVienCapNhat', as: 'nhanVienCapNhat' });

KhachHang.hasMany(NhatKyChatbot, { foreignKey: 'MaKhachHang', as: 'nhatKyChatbot' });
NhatKyChatbot.belongsTo(KhachHang, { foreignKey: 'MaKhachHang', as: 'khachHang' });

// ==========================================
// 10. Quan hệ Chương trình giảm giá (GG02)
// ==========================================
ChuongTrinhGiamGia.hasMany(ChuongTrinhGiamGiaDoiTuong, { foreignKey: 'MaChuongTrinh', as: 'danhSachDoiTuong' });
ChuongTrinhGiamGiaDoiTuong.belongsTo(ChuongTrinhGiamGia, { foreignKey: 'MaChuongTrinh', as: 'chuongTrinh' });
ChuongTrinhGiamGiaDoiTuong.belongsTo(Sach, { foreignKey: 'MaSach', as: 'sach' });
ChuongTrinhGiamGiaDoiTuong.belongsTo(DanhMuc, { foreignKey: 'MaDanhMuc', as: 'danhMuc' });
ChuongTrinhGiamGia.belongsTo(NhanVien, { foreignKey: 'MaNhanVienTao', as: 'nhanVienTao' });

// ==========================================
// 11. Quan hệ Khách hàng ↔ OtpQuenMatKhau (1 - n) (R12)
// ==========================================
KhachHang.hasMany(OtpQuenMatKhau, { foreignKey: 'MaKhachHang', as: 'danhSachOtp' });
OtpQuenMatKhau.belongsTo(KhachHang, { foreignKey: 'MaKhachHang', as: 'khachHang' });

module.exports = {
  sequelize,
  NhanVien,
  KhachHang,
  DanhMuc,
  Sach,
  GioHang,
  DonHang,
  ChiTietDonHang,
  DanhGia,
  LichSuNhapKho,
  LichSuTrangThaiDonHang,
  LichSuThayDoi,
  LichSuDieuChinhKho,
  ThanhToan,
  NhatKyWebhookPayos,
  CauHinhHeThong,
  NhatKyChatbot,
  ChuongTrinhGiamGia,
  ChuongTrinhGiamGiaDoiTuong,
  OtpQuenMatKhau
};
