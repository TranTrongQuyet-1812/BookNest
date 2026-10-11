/**
 * Lớp lỗi tùy biến dành cho các nghiệp vụ trong hệ thống BookNest.
 * Lưu trữ mã trạng thái HTTP tương ứng và thông điệp tiếng Việt.
 */
class LoiNghiepVu extends Error {
  constructor(thongDiep, maTrangThai = 400, danhSachLoi = null) {
    super(thongDiep);
    this.name = 'LoiNghiepVu';
    this.maTrangThai = maTrangThai;
    this.danhSachLoi = danhSachLoi;
  }

  // 400 - Dữ liệu yêu cầu không hợp lệ
  static yeuCauKhongHopLe(thongDiep = 'Dữ liệu gửi lên không hợp lệ', danhSachLoi = null) {
    return new LoiNghiepVu(thongDiep, 400, danhSachLoi);
  }

  // 401 - Chưa xác thực danh tính
  static chuaXacThuc(thongDiep = 'Vui lòng đăng nhập để tiếp tục') {
    return new LoiNghiepVu(thongDiep, 401);
  }

  // 403 - Không đủ quyền hạn truy cập
  static camTruyCap(thongDiep = 'Bạn không có quyền thực hiện thao tác này') {
    return new LoiNghiepVu(thongDiep, 403);
  }

  // 404 - Không tìm thấy tài nguyên
  static khongTimThay(thongDiep = 'Không tìm thấy tài nguyên yêu cầu') {
    return new LoiNghiepVu(thongDiep, 404);
  }

  // 409 - Xung đột trạng thái / trùng lặp dữ liệu / hết hàng
  static xungDot(thongDiep = 'Dữ liệu bị xung đột hoặc tài nguyên đã tồn tại') {
    return new LoiNghiepVu(thongDiep, 409);
  }
}

module.exports = LoiNghiepVu;
