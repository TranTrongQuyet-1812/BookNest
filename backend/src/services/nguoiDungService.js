/**
 * Tầng Service quản lý hồ sơ, đổi mật khẩu và quản trị tài khoản (T17).
 * Tài khoản chia hai bảng: KhachHang (Storefront) và NhanVien (Back-Office).
 * Các hàm hồ sơ nhận "aud" của token để biết phải làm việc với bảng nào.
 */
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { NhanVien, KhachHang } = require('../models');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
const { chuaTuKhoa } = require('../utils/timKiem');
const { AUD_KHACH_HANG, AUD_NHAN_VIEN } = require('../utils/taiKhoan');

// Vai trò quản trị viên được phép tạo qua giao diện (không tạo quan_tri để tránh nhân bản quyền cao nhất)
const VAI_TRO_TAO_DUOC = ['thu_kho', 'thu_thu'];

function bangTheoAud(aud) {
  return aud === AUD_NHAN_VIEN ? NhanVien : KhachHang;
}

// Lấy thông tin hồ sơ cá nhân (không trả mật khẩu băm)
async function layThongTinHoSo(aud, maTaiKhoan) {
  const taiKhoan = await bangTheoAud(aud).findByPk(maTaiKhoan, {
    attributes: { exclude: ['MatKhauHash'] }
  });

  if (!taiKhoan) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy thông tin người dùng');
  }

  return taiKhoan;
}

// Cập nhật thông tin hồ sơ (chỉ cho phép sửa họ tên, SĐT, địa chỉ - chống sửa email, vai trò)
async function capNhatHoSo(aud, maTaiKhoan, { hoTen, soDienThoai, diaChiMacDinh }) {
  const taiKhoan = await bangTheoAud(aud).findByPk(maTaiKhoan);
  if (!taiKhoan) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy thông tin người dùng');
  }

  if (hoTen !== undefined) taiKhoan.HoTen = hoTen;
  if (soDienThoai !== undefined) taiKhoan.SoDienThoai = soDienThoai;
  // Địa chỉ mặc định chỉ có ở khách hàng, bảng NhanVien không có cột này
  if (diaChiMacDinh !== undefined && aud !== AUD_NHAN_VIEN) taiKhoan.DiaChiMacDinh = diaChiMacDinh;

  await taiKhoan.save();
  return layThongTinHoSo(aud, maTaiKhoan);
}

// Đổi mật khẩu cá nhân
async function doiMatKhau(aud, maTaiKhoan, { matKhauCu, matKhauMoi }) {
  const taiKhoan = await bangTheoAud(aud).findByPk(maTaiKhoan);
  if (!taiKhoan) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy thông tin người dùng');
  }

  const matKhauCuDung = await bcrypt.compare(matKhauCu, taiKhoan.MatKhauHash);
  if (!matKhauCuDung) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Mật khẩu hiện tại không chính xác');
  }

  // Băm mật khẩu mới bằng bcrypt
  taiKhoan.MatKhauHash = await bcrypt.hash(matKhauMoi, 10);
  await taiKhoan.save();

  return { thanhCong: true };
}

// ==========================================
// CÁC HÀM QUẢN TRỊ DÀNH CHO QUẢN TRỊ VIÊN (T17)
// ==========================================

// Danh sách có phân trang và tìm kiếm trên một bảng tài khoản (dùng chung cho nhân viên và khách hàng)
async function layDanhSachTaiKhoan(Bang, dieuKienThem, { page = 1, limit = 10, search }) {
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const gioiHan = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const viTri = (trang - 1) * gioiHan;

  const dieuKien = { ...dieuKienThem };
  if (search && search.trim().length > 0) {
    const tuKhoa = search.trim();
    dieuKien[Op.or] = [
      chuaTuKhoa(`[${Bang.name}].[HoTen]`, tuKhoa),
      { Email: { [Op.like]: `%${tuKhoa}%` } }
    ];
  }

  const { rows, count } = await Bang.findAndCountAll({
    where: dieuKien,
    attributes: { exclude: ['MatKhauHash'] },
    order: [['NgayTao', 'DESC']],
    limit: gioiHan,
    offset: viTri
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

// Back-Office: Danh sách nhân viên (lọc theo vai trò)
function adminLayDanhSachNhanVien({ role, ...thamSoCon }) {
  return layDanhSachTaiKhoan(NhanVien, role ? { VaiTro: role } : {}, thamSoCon);
}

// Back-Office: Danh sách khách hàng
function adminLayDanhSachKhachHang(thamSo) {
  return layDanhSachTaiKhoan(KhachHang, {}, thamSo);
}

// Back-Office: Quản trị viên tạo tài khoản nhân viên (chỉ nhận thu_kho hoặc thu_thu)
async function adminTaoNhanVien({ email, matKhau, hoTen, vaiTro, soDienThoai }) {
  if (!VAI_TRO_TAO_DUOC.includes(vaiTro)) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Chỉ được phép tạo tài khoản với vai trò thu_kho hoặc thu_thu');
  }

  const tonTai = await NhanVien.findOne({ where: { Email: email } });
  if (tonTai) {
    throw LoiNghiepVu.xungDot('Email này đã được sử dụng cho một tài khoản nhân viên');
  }

  const matKhauHash = await bcrypt.hash(matKhau, 10);
  const nhanVienMoi = await NhanVien.create({
    Email: email,
    MatKhauHash: matKhauHash,
    HoTen: hoTen,
    VaiTro: vaiTro,
    SoDienThoai: soDienThoai || null,
    DangHoatDong: true
  });

  return layThongTinHoSo(AUD_NHAN_VIEN, nhanVienMoi.MaNhanVien);
}

// Back-Office: Khóa hoặc mở khóa tài khoản nhân viên (chặn quản trị viên tự khóa chính mình)
async function adminCapNhatTrangThaiNhanVien(maNhanVien, dangHoatDong, maQuanTri) {
  if (parseInt(maNhanVien, 10) === parseInt(maQuanTri, 10) && dangHoatDong === false) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Quản trị viên không thể tự khóa tài khoản của chính mình');
  }

  const nhanVien = await NhanVien.findByPk(maNhanVien);
  if (!nhanVien) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy nhân viên yêu cầu');
  }

  nhanVien.DangHoatDong = dangHoatDong;
  await nhanVien.save();

  return layThongTinHoSo(AUD_NHAN_VIEN, maNhanVien);
}

// Back-Office: Khóa hoặc mở khóa tài khoản khách hàng
async function adminCapNhatTrangThaiKhachHang(maKhachHang, dangHoatDong) {
  const khachHang = await KhachHang.findByPk(maKhachHang);
  if (!khachHang) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy khách hàng yêu cầu');
  }

  khachHang.DangHoatDong = dangHoatDong;
  await khachHang.save();

  return layThongTinHoSo(AUD_KHACH_HANG, maKhachHang);
}

module.exports = {
  layThongTinHoSo,
  capNhatHoSo,
  doiMatKhau,
  adminLayDanhSachNhanVien,
  adminLayDanhSachKhachHang,
  adminTaoNhanVien,
  adminCapNhatTrangThaiNhanVien,
  adminCapNhatTrangThaiKhachHang
};
