/**
 * Hàm dùng chung cho tài khoản của hai khu: khách hàng (bảng KhachHang) và nhân viên (bảng NhanVien).
 * Claim "aud" trong token cho biết token được cấp ở cổng nào, từ đó biết phải tra bảng nào.
 */
const AUD_KHACH_HANG = 'khach_hang';
const AUD_NHAN_VIEN = 'nhan_vien';

// Chuẩn hóa thông tin tài khoản về một dạng chung. Khách hàng không có cột vai trò nên role luôn là khach_hang
function thongTinTaiKhoan(aud, taiKhoan) {
  const laKhach = aud === AUD_KHACH_HANG;
  return {
    id: laKhach ? taiKhoan.MaKhachHang : taiKhoan.MaNhanVien,
    email: taiKhoan.Email,
    fullName: taiKhoan.HoTen,
    role: laKhach ? AUD_KHACH_HANG : taiKhoan.VaiTro,
    aud
  };
}

module.exports = { AUD_KHACH_HANG, AUD_NHAN_VIEN, thongTinTaiKhoan };
