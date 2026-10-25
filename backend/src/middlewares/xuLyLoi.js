/**
 * Middleware tập trung xử lý toàn bộ lỗi phát sinh trong hệ thống.
 * Chuyển các lỗi kỹ thuật thành thông báo tiếng Việt và không lộ stack trace ra môi trường bên ngoài.
 */
const { phanHoiLoi } = require('./phanHoi');
const LoiNghiepVu = require('./loiNghiepVu');

function xuLyLoi(loi, req, res, _next) {
  // 1. Lỗi nghiệp vụ do ứng dụng chủ động ném ra
  if (loi instanceof LoiNghiepVu) {
    return phanHoiLoi(res, {
      thongDiep: loi.message,
      maTrangThai: loi.maTrangThai,
      danhSachLoi: loi.danhSachLoi
    });
  }

  // 2. Lỗi trùng lặp dữ liệu UNIQUE từ Sequelize / PostgreSQL
  if (loi.name === 'SequelizeUniqueConstraintError') {
    return phanHoiLoi(res, {
      thongDiep: 'Dữ liệu đã tồn tại trên hệ thống, vui lòng kiểm tra lại thông tin',
      maTrangThai: 409
    });
  }

  // 3. Lỗi ràng buộc khóa ngoại FOREIGN KEY từ Sequelize / PostgreSQL
  if (loi.name === 'SequelizeForeignKeyConstraintError') {
    return phanHoiLoi(res, {
      thongDiep: 'Thao tác không thể thực hiện do dữ liệu liên kết không tồn tại hoặc đang được sử dụng',
      maTrangThai: 409
    });
  }

  // 4. Vi phạm ràng buộc CHECK (mã PostgreSQL 23514, trước đây SQL Server là 547) là do dữ liệu người dùng gửi nên trả 400.
  // Mọi lỗi SQL khác (thiếu cột/bảng, sai cú pháp...) là lỗi máy chủ: để rơi xuống nhánh 5 để ghi log và trả 500
  if (loi.name === 'SequelizeDatabaseError' && (loi.original?.code ?? loi.parent?.code) === '23514') {
    return phanHoiLoi(res, {
      thongDiep: 'Dữ liệu gửi lên không đúng định dạng hoặc vi phạm quy định của hệ thống. Vui lòng kiểm tra lại',
      maTrangThai: 400
    });
  }

  // 5. Lỗi kích thước file vượt quá giới hạn (Payload Too Large - 413)
  if (loi.type === 'entity.too.large' || loi.status === 413) {
    return phanHoiLoi(res, {
      thongDiep: 'Dung lượng file vượt quá giới hạn cho phép (tối đa 5MB)',
      maTrangThai: 413
    });
  }

  // 6. Lỗi máy chủ không xác định (Internal Server Error) - Bảo mật, không trả stack trace
  console.error('[Lỗi Hệ Thống]', loi.message);
  return phanHoiLoi(res, {
    thongDiep: 'Hệ thống đang bận hoặc gặp sự cố xử lý. Vui lòng thử lại sau ít phút',
    maTrangThai: 500
  });
}

module.exports = xuLyLoi;
