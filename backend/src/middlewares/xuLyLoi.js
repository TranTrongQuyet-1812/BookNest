/**
 * Middleware tập trung xử lý toàn bộ lỗi phát sinh trong hệ thống.
 * Chuyển các lỗi kỹ thuật thành thông báo tiếng Việt và không lộ stack trace ra môi trường bên ngoài.
 */
const { phanHoiLoi } = require('./phanHoi');
const LoiNghiepVu = require('./loiNghiepVu');

function xuLyLoi(loi, req, res, next) {
  // 1. Lỗi nghiệp vụ do ứng dụng chủ động ném ra
  if (loi instanceof LoiNghiepVu) {
    return phanHoiLoi(res, {
      thongDiep: loi.message,
      maTrangThai: loi.maTrangThai,
      danhSachLoi: loi.danhSachLoi
    });
  }

  // 2. Lỗi trùng lặp dữ liệu UNIQUE từ Sequelize / SQL Server
  if (loi.name === 'SequelizeUniqueConstraintError') {
    return phanHoiLoi(res, {
      thongDiep: 'Dữ liệu đã tồn tại trên hệ thống, vui lòng kiểm tra lại thông tin',
      maTrangThai: 409
    });
  }

  // 3. Lỗi ràng buộc khóa ngoại FOREIGN KEY từ Sequelize / SQL Server
  if (loi.name === 'SequelizeForeignKeyConstraintError') {
    return phanHoiLoi(res, {
      thongDiep: 'Thao tác không thể thực hiện do dữ liệu liên kết không tồn tại hoặc đang được sử dụng',
      maTrangThai: 409
    });
  }

  // 4. Lỗi vi phạm ràng buộc CHECK hoặc lỗi cú pháp DB
  if (loi.name === 'SequelizeDatabaseError') {
    return phanHoiLoi(res, {
      thongDiep: 'Dữ liệu không thỏa mãn các điều kiện ràng buộc toàn vẹn của hệ thống',
      maTrangThai: 400
    });
  }

  // 5. Lỗi máy chủ không xác định (Internal Server Error) - Bảo mật, không trả stack trace
  console.error('[Lỗi Hệ Thống]', loi.message);
  return phanHoiLoi(res, {
    thongDiep: 'Đã xảy ra lỗi máy chủ nội bộ. Vui lòng liên hệ quản trị viên hoặc thử lại sau',
    maTrangThai: 500
  });
}

module.exports = xuLyLoi;
