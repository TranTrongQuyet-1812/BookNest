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

      return next(LoiNghiepVu.yeuCauKhongHopLe('Dữ liệu gửi lên không hợp lệ', danhSachLoi));
    }

    // Gán lại dữ liệu đã qua làm sạch và chuyển kiểu đúng
    req[nguon] = value;
    return next();
  };
}

module.exports = kiemTraDuLieu;
