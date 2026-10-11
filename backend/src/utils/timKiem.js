/**
 * Hàm hỗ trợ tìm kiếm tiếng Việt không phân biệt hoa thường và không phân biệt dấu.
 */
const { Op, where, literal } = require('sequelize');

// Cột chữ của dự án dùng Vietnamese_CI_AI: bỏ qua dấu thanh nhưng vẫn coi ă â ê ô ơ ư đ là chữ riêng,
// nên gõ "so do" không ra "Số Đỏ". Ép so sánh bằng Latin1_General_CI_AI để gõ không dấu vẫn tìm được.
const BANG_MA_TIM_KIEM = 'Latin1_General_CI_AI';

// Thoát các ký tự đặc biệt của LIKE (% _ [) để người dùng gõ chúng vẫn được hiểu là chữ thường
function thoatKyTuLike(tuKhoa) {
  return tuKhoa.replace(/[%_[]/g, '[$&]');
}

// Điều kiện "cột chứa từ khóa". tenCot do code truyền vào (không phải dữ liệu người dùng), ví dụ '[Sach].[TenSach]'
function chuaTuKhoa(tenCot, tuKhoa) {
  return where(literal(`${tenCot} COLLATE ${BANG_MA_TIM_KIEM}`), {
    [Op.like]: `%${thoatKyTuLike(tuKhoa)}%`
  });
}

module.exports = { chuaTuKhoa, thoatKyTuLike };
