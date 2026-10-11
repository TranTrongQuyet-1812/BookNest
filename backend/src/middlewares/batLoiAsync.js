/**
 * Bọc các hàm xử lý bất đồng bộ (async Controller) để bắt lỗi và chuyển cho middleware xử lý lỗi tiếp theo.
 * Giúp mã nguồn không phải lặp lại cấu trúc try/catch thủ công ở mọi hàm.
 */
function batLoiAsync(hamXuLy) {
  return function (req, res, next) {
    Promise.resolve(hamXuLy(req, res, next)).catch(next);
  };
}

module.exports = batLoiAsync;
