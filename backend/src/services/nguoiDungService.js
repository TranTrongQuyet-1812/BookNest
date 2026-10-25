/**
 * Tầng Service quản lý hồ sơ, đổi mật khẩu và quản trị tài khoản (T17).
 * Tài khoản chia hai bảng: KhachHang (Storefront) và NhanVien (Back-Office).
 * Các hàm hồ sơ nhận "aud" của token để biết phải làm việc với bảng nào.
 */
const { Op } = require('sequelize');
const bcrypt = require('bcryptjs');
const { NhanVien, KhachHang, DonHang, ThanhToan } = require('../models');
const { sequelize } = require('../config/ketNoiDb');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
const { chuaTuKhoa } = require('../utils/timKiem');
const { AUD_KHACH_HANG, AUD_NHAN_VIEN } = require('../utils/taiKhoan');
const { ghiNhanThayDoi } = require('./lichSuThayDoiService');
const { thuHoiKetNoiTaiKhoan } = require('../realtime/socket');

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

  if (hoTen !== undefined) taiKhoan.HoTen = hoTen.trim();
  if (soDienThoai !== undefined) taiKhoan.SoDienThoai = soDienThoai ? soDienThoai.trim() : null;
  // Địa chỉ mặc định chỉ có ở khách hàng, bảng NhanVien không có cột này
  if (diaChiMacDinh !== undefined && aud !== AUD_NHAN_VIEN) taiKhoan.DiaChiMacDinh = diaChiMacDinh ? diaChiMacDinh.trim() : null;

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

  // Cấp ngay token mới chứa phiên mật khẩu mới để client gia hạn phiên làm việc, không bị đá ra 401
  const { taoToken } = require('./xacThucService');
  const user = {
    id: taiKhoan[aud === AUD_NHAN_VIEN ? 'MaNhanVien' : 'MaKhachHang'],
    email: taiKhoan.Email,
    role: aud === AUD_NHAN_VIEN ? taiKhoan.VaiTro : 'khach_hang',
    fullName: taiKhoan.HoTen
  };
  const tokenMoi = taoToken(user, aud, taiKhoan);

  return { thanhCong: true, token: tokenMoi };
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
      chuaTuKhoa(`"${Bang.name}"."HoTen"`, tuKhoa),
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

// Back-Office: Cập nhật thông tin nhân viên (họ tên, SĐT, vai trò) kèm kiểm tra an toàn và ghi lịch sử
async function adminCapNhatNhanVien(maNhanVien, { hoTen, soDienThoai, vaiTro }, maQuanTriHienTai) {
  const nhanVien = await NhanVien.findByPk(maNhanVien);
  if (!nhanVien) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy nhân viên yêu cầu');
  }

  // Chặn tự thay đổi vai trò của chính mình
  if (parseInt(maNhanVien, 10) === parseInt(maQuanTriHienTai, 10) && vaiTro !== undefined && vaiTro !== nhanVien.VaiTro) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Quản trị viên không thể tự thay đổi vai trò của chính mình');
  }

  // Nếu hạ vai trò của một quản trị viên khác: đảm bảo hệ thống luôn còn ít nhất 1 quản trị viên hoạt động
  if (nhanVien.VaiTro === 'quan_tri' && vaiTro !== undefined && vaiTro !== 'quan_tri') {
    const soLuongQuanTri = await NhanVien.count({
      where: { VaiTro: 'quan_tri', DangHoatDong: true }
    });
    if (soLuongQuanTri <= 1) {
      throw LoiNghiepVu.yeuCauKhongHopLe('Không thể hạ vai trò quản trị viên duy nhất còn lại trong hệ thống');
    }
  }

  const thayDoi = {};
  if (hoTen !== undefined && hoTen.trim() !== nhanVien.HoTen) {
    thayDoi.HoTen = { cu: nhanVien.HoTen, moi: hoTen.trim() };
  }
  if (soDienThoai !== undefined) {
    const sdtMoi = soDienThoai ? soDienThoai.trim() : null;
    if (sdtMoi !== nhanVien.SoDienThoai) {
      thayDoi.SoDienThoai = { cu: nhanVien.SoDienThoai, moi: sdtMoi };
    }
  }
  if (vaiTro !== undefined && vaiTro !== nhanVien.VaiTro) {
    thayDoi.VaiTro = { cu: nhanVien.VaiTro, moi: vaiTro };
  }

  const t = await sequelize.transaction();
  try {
    if (thayDoi.HoTen) nhanVien.HoTen = thayDoi.HoTen.moi;
    if (thayDoi.SoDienThoai) nhanVien.SoDienThoai = thayDoi.SoDienThoai.moi;
    if (thayDoi.VaiTro) nhanVien.VaiTro = thayDoi.VaiTro.moi;

    await nhanVien.save({ transaction: t });

    if (Object.keys(thayDoi).length > 0) {
      await ghiNhanThayDoi({
        loaiDoiTuong: 'NHAN_VIEN',
        maDoiTuong: maNhanVien,
        maNhanVien: maQuanTriHienTai,
        thayDoi,
        transaction: t
      });
    }

    await t.commit();
  } catch (error) {
    await t.rollback();
    throw error;
  }

  // Đổi vai trò: ngắt kết nối realtime cũ, client vào lại phòng sẽ được xác minh theo vai trò mới
  if (thayDoi.VaiTro) await thuHoiKetNoiTaiKhoan(AUD_NHAN_VIEN, maNhanVien);

  return layThongTinHoSo(AUD_NHAN_VIEN, maNhanVien);
}

// Back-Office: Đặt lại mật khẩu nhân viên (băm bcrypt). Nhật ký chỉ ghi "ai đặt lại cho ai", tuyệt đối không ghi mật khẩu.
async function adminDatLaiMatKhauNhanVien(maNhanVien, matKhauMoi, maQuanTri) {
  const nhanVien = await NhanVien.findByPk(maNhanVien);
  if (!nhanVien) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy nhân viên yêu cầu');
  }

  const matKhauHash = await bcrypt.hash(matKhauMoi, 10);
  const t = await sequelize.transaction();
  try {
    nhanVien.MatKhauHash = matKhauHash;
    await nhanVien.save({ transaction: t });

    await ghiNhanThayDoi({
      loaiDoiTuong: 'NHAN_VIEN',
      maDoiTuong: maNhanVien,
      maNhanVien: maQuanTri,
      thayDoi: { MatKhau: { cu: '(không lưu)', moi: '(đã đặt lại)' } },
      transaction: t
    });

    await t.commit();
  } catch (error) {
    await t.rollback();
    throw error;
  }

  // Token cũ của người này đã vô hiệu (mã phiên mật khẩu đổi), ngắt luôn kết nối realtime đang mở
  await thuHoiKetNoiTaiKhoan(AUD_NHAN_VIEN, maNhanVien);

  return { thanhCong: true, thongDiep: 'Đặt lại mật khẩu thành công' };
}

// Back-Office: Khóa hoặc mở khóa tài khoản nhân viên (chặn quản trị viên tự khóa chính mình hoặc khóa quản trị viên cuối cùng)
async function adminCapNhatTrangThaiNhanVien(maNhanVien, dangHoatDong, maQuanTri) {
  if (parseInt(maNhanVien, 10) === parseInt(maQuanTri, 10) && dangHoatDong === false) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Quản trị viên không thể tự khóa tài khoản của chính mình');
  }

  const nhanVien = await NhanVien.findByPk(maNhanVien);
  if (!nhanVien) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy nhân viên yêu cầu');
  }

  // Nếu khóa một tài khoản quản trị: đảm bảo hệ thống luôn còn ít nhất 1 quản trị viên hoạt động
  if (nhanVien.VaiTro === 'quan_tri' && dangHoatDong === false) {
    const soLuongQuanTri = await NhanVien.count({
      where: { VaiTro: 'quan_tri', DangHoatDong: true }
    });
    if (soLuongQuanTri <= 1) {
      throw LoiNghiepVu.yeuCauKhongHopLe('Không thể khóa quản trị viên duy nhất còn lại trong hệ thống');
    }
  }

  const giaTriCu = nhanVien.DangHoatDong;
  const t = await sequelize.transaction();
  try {
    nhanVien.DangHoatDong = dangHoatDong;
    await nhanVien.save({ transaction: t });

    if (giaTriCu !== dangHoatDong) {
      await ghiNhanThayDoi({
        loaiDoiTuong: 'NHAN_VIEN',
        maDoiTuong: maNhanVien,
        maNhanVien: maQuanTri,
        thayDoi: { DangHoatDong: { cu: giaTriCu, moi: dangHoatDong } },
        transaction: t
      });
    }

    await t.commit();
  } catch (error) {
    await t.rollback();
    throw error;
  }

  // Bị khóa thì ngắt luôn kết nối realtime đang mở, không để nhận thêm sự kiện tới khi token hết hạn
  if (dangHoatDong === false) await thuHoiKetNoiTaiKhoan(AUD_NHAN_VIEN, maNhanVien);

  return layThongTinHoSo(AUD_NHAN_VIEN, maNhanVien);
}

// Back-Office: Xem chi tiết khách hàng và 5 đơn hàng gần nhất
async function adminLayChiTietKhachHang(maKhachHang) {
  const khachHang = await KhachHang.findByPk(maKhachHang, {
    attributes: { exclude: ['MatKhauHash'] }
  });

  if (!khachHang) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy khách hàng yêu cầu');
  }

  const donHangGanDay = await DonHang.findAll({
    where: { MaKhachHang: maKhachHang },
    attributes: ['MaDonHang', 'MaTraCuu', 'NgayDat', 'TrangThai', 'TongTien', 'KenhBan'],
    include: [
      {
        model: ThanhToan,
        as: 'thanhToan',
        attributes: ['PhuongThuc', 'TrangThai']
      }
    ],
    order: [['NgayDat', 'DESC']],
    limit: 5
  });

  return {
    ...khachHang.toJSON(),
    donHangGanDay
  };
}

// Back-Office: Cập nhật thông tin khách hàng (họ tên, SĐT, địa chỉ mặc định) kèm ghi lịch sử
async function adminCapNhatKhachHang(maKhachHang, { hoTen, soDienThoai, diaChiMacDinh }, maNhanVien) {
  const khachHang = await KhachHang.findByPk(maKhachHang);
  if (!khachHang) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy khách hàng yêu cầu');
  }

  const thayDoi = {};
  if (hoTen !== undefined && hoTen.trim() !== khachHang.HoTen) {
    thayDoi.HoTen = { cu: khachHang.HoTen, moi: hoTen.trim() };
  }
  if (soDienThoai !== undefined) {
    const sdtMoi = soDienThoai ? soDienThoai.trim() : null;
    if (sdtMoi !== khachHang.SoDienThoai) {
      thayDoi.SoDienThoai = { cu: khachHang.SoDienThoai, moi: sdtMoi };
    }
  }
  if (diaChiMacDinh !== undefined) {
    const diaChiMoi = diaChiMacDinh ? diaChiMacDinh.trim() : null;
    if (diaChiMoi !== khachHang.DiaChiMacDinh) {
      thayDoi.DiaChiMacDinh = { cu: khachHang.DiaChiMacDinh, moi: diaChiMoi };
    }
  }

  const t = await sequelize.transaction();
  try {
    if (thayDoi.HoTen) khachHang.HoTen = thayDoi.HoTen.moi;
    if (thayDoi.SoDienThoai) khachHang.SoDienThoai = thayDoi.SoDienThoai.moi;
    if (thayDoi.DiaChiMacDinh) khachHang.DiaChiMacDinh = thayDoi.DiaChiMacDinh.moi;

    await khachHang.save({ transaction: t });

    if (Object.keys(thayDoi).length > 0) {
      await ghiNhanThayDoi({
        loaiDoiTuong: 'KHACH_HANG',
        maDoiTuong: maKhachHang,
        maNhanVien: maNhanVien,
        thayDoi,
        transaction: t
      });
    }

    await t.commit();
  } catch (error) {
    await t.rollback();
    throw error;
  }

  return layThongTinHoSo(AUD_KHACH_HANG, maKhachHang);
}

// Back-Office: Khóa hoặc mở khóa tài khoản khách hàng kèm ghi lịch sử
async function adminCapNhatTrangThaiKhachHang(maKhachHang, dangHoatDong, maNhanVien) {
  const khachHang = await KhachHang.findByPk(maKhachHang);
  if (!khachHang) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy khách hàng yêu cầu');
  }

  const giaTriCu = khachHang.DangHoatDong;
  const t = await sequelize.transaction();
  try {
    khachHang.DangHoatDong = dangHoatDong;
    await khachHang.save({ transaction: t });

    if (giaTriCu !== dangHoatDong) {
      await ghiNhanThayDoi({
        loaiDoiTuong: 'KHACH_HANG',
        maDoiTuong: maKhachHang,
        maNhanVien: maNhanVien,
        thayDoi: { DangHoatDong: { cu: giaTriCu, moi: dangHoatDong } },
        transaction: t
      });
    }

    await t.commit();
  } catch (error) {
    await t.rollback();
    throw error;
  }

  if (dangHoatDong === false) await thuHoiKetNoiTaiKhoan(AUD_KHACH_HANG, maKhachHang);

  return layThongTinHoSo(AUD_KHACH_HANG, maKhachHang);
}

module.exports = {
  layThongTinHoSo,
  capNhatHoSo,
  doiMatKhau,
  adminLayDanhSachNhanVien,
  adminLayDanhSachKhachHang,
  adminTaoNhanVien,
  adminCapNhatNhanVien,
  adminDatLaiMatKhauNhanVien,
  adminCapNhatTrangThaiNhanVien,
  adminLayChiTietKhachHang,
  adminCapNhatKhachHang,
  adminCapNhatTrangThaiKhachHang
};
