/**
 * Middleware kiểm tra tính hợp lệ của dữ liệu đầu vào (Request Validation) bằng thư viện Joi.
 * Hỗ trợ kiểm tra req.body, req.query, hoặc req.params.
 */
const LoiNghiepVu = require('./loiNghiepVu');

function kiemTraDuLieu(luatKiemTra, nguon = 'body') {
  return function (req, res, next) {
    const { error, value } = luatKiemTra.validate(req[nguon], {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const danhSachLoi = error.details.map(chiTiet => ({
        truong: chiTiet.path.join('.'),
        thongDiep: chiTiet.message.replace(/['"]/g, '')
      }));

      // Ưu tiên lấy thông điệp lỗi cụ thể của trường đầu tiên (vd: Mật khẩu phải chứa ít nhất một chữ cái và một chữ số)
      const thongDiepChinh = danhSachLoi[0]?.thongDiep || 'Dữ liệu gửi lên không hợp lệ';

      return next(LoiNghiepVu.yeuCauKhongHopLe(thongDiepChinh, danhSachLoi));
    }

    // Gán lại dữ liệu đã qua làm sạch và chuyển kiểu đúng
    req[nguon] = value;
    return next();
  };
}

module.exports = kiemTraDuLieu;
