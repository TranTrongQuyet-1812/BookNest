/**
 * Tầng Service quản lý thông tin hồ sơ, đổi mật khẩu và quản trị nhân sự (T17).
 */
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { NguoiDung } = require('../models');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
const { chuaTuKhoa } = require('../utils/timKiem');

// Lấy thông tin hồ sơ cá nhân của người dùng hiện tại
async function layThongTinHoSo(maNguoiDung) {
  const nguoiDung = await NguoiDung.findByPk(maNguoiDung, {
    attributes: { exclude: ['MatKhauHash'] }
  });

  if (!nguoiDung) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy thông tin người dùng');
  }

  return nguoiDung;
}

// Cập nhật thông tin hồ sơ (chỉ cho phép sửa họ tên, SĐT, địa chỉ - chống sửa email, role)
async function capNhatHoSo(maNguoiDung, { hoTen, soDienThoai, diaChiMacDinh }) {
  const nguoiDung = await NguoiDung.findByPk(maNguoiDung);
  if (!nguoiDung) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy thông tin người dùng');
  }

  if (hoTen !== undefined) nguoiDung.HoTen = hoTen;
  if (soDienThoai !== undefined) nguoiDung.SoDienThoai = soDienThoai;
  if (diaChiMacDinh !== undefined) nguoiDung.DiaChiMacDinh = diaChiMacDinh;

  await nguoiDung.save();
  return layThongTinHoSo(maNguoiDung);
}

// Đổi mật khẩu cá nhân
async function doiMatKhau(maNguoiDung, { matKhauCu, matKhauMoi }) {
  const nguoiDung = await NguoiDung.findByPk(maNguoiDung);
  if (!nguoiDung) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy thông tin người dùng');
  }

  const matKhauCuDung = await bcrypt.compare(matKhauCu, nguoiDung.MatKhauHash);
  if (!matKhauCuDung) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Mật khẩu hiện tại không chính xác');
  }

  // Băm mật khẩu mới bằng bcrypt
  const matKhauMoiHash = await bcrypt.hash(matKhauMoi, 10);
  nguoiDung.MatKhauHash = matKhauMoiHash;
  await nguoiDung.save();

  return { thanhCong: true };
}

// ==========================================
// CÁC HÀM QUẢN TRỊ DÀNH CHO ADMIN (T17)
// ==========================================

// Back-Office: Danh sách người dùng hệ thống (phân trang, tìm kiếm, lọc vai trò)
async function adminLayDanhSachNguoiDung({ page = 1, limit = 10, role, search }) {
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const gioiHan = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const viTri = (trang - 1) * gioiHan;

  const dieuKien = {};
  if (role) {
    dieuKien.VaiTro = role;
  }
  if (search && search.trim().length > 0) {
    const tuKhoa = search.trim();
    dieuKien[Op.or] = [
      chuaTuKhoa('[NguoiDung].[HoTen]', tuKhoa),
      { Email: { [Op.like]: `%${tuKhoa}%` } }
    ];
  }

  const { rows, count } = await NguoiDung.findAndCountAll({
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

// Back-Office: Admin tạo tài khoản nhân viên (chỉ nhận librarian hoặc order_staff)
async function adminTaoNhanVien({ email, matKhau, hoTen, vaiTro, soDienThoai, diaChiMacDinh }) {
  if (!['librarian', 'order_staff'].includes(vaiTro)) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Chỉ được phép tạo tài khoản với vai trò librarian hoặc order_staff');
  }

  const tonTai = await NguoiDung.findOne({ where: { Email: email } });
  if (tonTai) {
    throw LoiNghiepVu.xungDot('Email này đã được sử dụng trên hệ thống');
  }

  const matKhauHash = await bcrypt.hash(matKhau, 10);
  const nguoiDungMoi = await NguoiDung.create({
    Email: email,
    MatKhauHash: matKhauHash,
    HoTen: hoTen,
    VaiTro: vaiTro,
    SoDienThoai: soDienThoai || null,
    DiaChiMacDinh: diaChiMacDinh || null,
    DangHoatDong: true
  });

  return layThongTinHoSo(nguoiDungMoi.MaNguoiDung);
}

// Back-Office: Khóa hoặc mở khóa tài khoản (chặn admin tự khóa chính mình)
async function adminCapNhatTrangThaiKhoa(maNguoiDung, dangHoatDong, adminId) {
  if (parseInt(maNguoiDung, 10) === parseInt(adminId, 10) && dangHoatDong === false) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Quản trị viên không thể tự khóa tài khoản của chính mình');
  }

  const nguoiDung = await NguoiDung.findByPk(maNguoiDung);
  if (!nguoiDung) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy người dùng yêu cầu');
  }

  nguoiDung.DangHoatDong = dangHoatDong;
  await nguoiDung.save();

  return layThongTinHoSo(maNguoiDung);
}

module.exports = {
  layThongTinHoSo,
  capNhatHoSo,
  doiMatKhau,
  adminLayDanhSachNguoiDung,
  adminTaoNhanVien,
  adminCapNhatTrangThaiKhoa
};
