/**
 * Middleware phân quyền dựa trên vai trò (Role-Based Access Control - RBAC).
 * Cho phép một hoặc nhiều vai trò truy cập vào endpoint tương ứng.
 */
const LoiNghiepVu = require('./loiNghiepVu');

function phanQuyen(...cacVaiTroChoPhep) {
  return function (req, res, next) {
    if (!req.user || !req.user.role) {
      return next(LoiNghiepVu.chuaXacThuc('Vui lòng đăng nhập để thực hiện quyền này'));
    }

    if (!cacVaiTroChoPhep.includes(req.user.role)) {
      return next(LoiNghiepVu.camTruyCap(
        `Bạn không có quyền truy cập chức năng này (yêu cầu vai trò: ${cacVaiTroChoPhep.join(', ')})`
      ));
    }

    return next();
  };
}

module.exports = phanQuyen;
