/**
 * Kiểm tra tham số đường dẫn là mã số nguyên dương (khớp kiểu INT của PostgreSQL).
 * Dùng với router.param('id', taoKiemTraMaSo('sách')): chuỗi lạ như "abc" hay số quá lớn trả 400 ngay,
 * không để lọt xuống truy vấn rồi nổ lỗi chuyển kiểu của CSDL thành 500.
 */
const LoiNghiepVu = require('./loiNghiepVu');

const MA_SO_TOI_DA = 2147483647;

function taoKiemTraMaSo(doiTuong = '') {
  const thongDiep = doiTuong ? `Mã ${doiTuong} không hợp lệ` : 'Mã không hợp lệ';
  return function (req, res, next, giaTri) {
    if (!/^[0-9]{1,10}$/.test(giaTri) || Number(giaTri) < 1 || Number(giaTri) > MA_SO_TOI_DA) {
      return next(LoiNghiepVu.yeuCauKhongHopLe(thongDiep));
    }
    return next();
  };
}

module.exports = taoKiemTraMaSo;
