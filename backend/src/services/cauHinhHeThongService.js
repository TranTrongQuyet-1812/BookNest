/**
 * Công tắc hệ thống (bảng CauHinhHeThong): đọc, đổi, ghi lịch sử và báo realtime.
 * Hiện chỉ có công tắc thanh toán QR; thêm công tắc mới thì khai báo thêm vào CONG_TAC.
 */
const cauHinh = require('../config/cauHinh');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
const { sequelize, CauHinhHeThong, NhanVien } = require('../models');
const { ghiNhanThayDoi } = require('./lichSuThayDoiService');
const { phatSuKien } = require('../realtime/socket');

const KHOA_THANH_TOAN_QR = 'THANH_TOAN_QR_BAT';
const KHOA_AI_CHATBOT = 'AI_CHATBOT_BAT';
const KHOA_AI_TRAN_NGAY = 'AI_CHATBOT_TRAN_NGAY';

// Danh sách khóa được phép đổi qua API. Khóa lạ bị từ chối để Quản trị viên không ghi bừa vào bảng cấu hình.
const CONG_TAC = {
  [KHOA_THANH_TOAN_QR]: {
    ten: 'Thanh toán chuyển khoản VietQR',
    moTa: 'Công tắc bật/tắt thanh toán chuyển khoản VietQR qua payOS (1: Bật, 0: Tắt)',
    // Thiếu khóa trong .env thì dù bật cũng không dùng được, giao diện cần biết để cảnh báo
    daDuDieuKien: () => cauHinh.payos.daCauHinh
  },
  [KHOA_AI_CHATBOT]: {
    ten: 'Trợ lý AI Chatbot tư vấn',
    moTa: 'Công tắc bật/tắt khẩn cấp trợ lý AI Chatbot (1: Bật, 0: Tắt)',
    // Thiếu API key thì dù bật cũng không hoạt động được
    daDuDieuKien: () => cauHinh.ai.daCauHinh
  }
};

/**
 * Đọc công tắc. Chỉ giá trị '1' mới là bật: thiếu dòng hoặc lỗi đọc CSDL đều coi như tắt
 * ("đóng khi chưa chắc", vì đây là nút khẩn cấp liên quan pháp lý).
 */
async function docCongTac(khoa, macDinh = false) {
  try {
    const dong = await CauHinhHeThong.findByPk(khoa);
    if (!dong) return macDinh;
    return dong?.GiaTri === '1';
  } catch (err) {
    console.error(`[CauHinhHeThong] Không đọc được công tắc ${khoa}, coi như tắt:`, err.message);
    return false;
  }
}

/**
 * Đọc giá trị số từ cấu hình hệ thống (ví dụ: hạn mức token ngày, thời hạn thanh toán).
 */
async function docGiaTriSo(khoa, macDinh = 0) {
  try {
    const dong = await CauHinhHeThong.findByPk(khoa);
    if (!dong || !dong.GiaTri) return macDinh;
    const so = parseInt(dong.GiaTri, 10);
    return isNaN(so) ? macDinh : so;
  } catch (err) {
    console.error(`[CauHinhHeThong] Không đọc được giá trị số ${khoa}, dùng mặc định ${macDinh}:`, err.message);
    return macDinh;
  }
}

async function layTrangThaiCongTac(khoa) {
  const dong = await CauHinhHeThong.findByPk(khoa, {
    include: [{ model: NhanVien, as: 'nhanVienCapNhat', attributes: ['HoTen'] }]
  });
  return {
    khoa,
    ten: CONG_TAC[khoa].ten,
    bat: dong?.GiaTri === '1',
    daDuDieuKien: CONG_TAC[khoa].daDuDieuKien(),
    ngayCapNhat: dong?.NgayCapNhat || null,
    nhanVienCapNhat: dong?.nhanVienCapNhat?.HoTen || null
  };
}

async function layDanhSachCongTac() {
  return Promise.all(Object.keys(CONG_TAC).map(layTrangThaiCongTac));
}

/**
 * Bật/tắt một công tắc: đổi giá trị và ghi lịch sử trong cùng một transaction,
 * sau khi lưu thành công mới báo realtime để các trang khách đang mở cập nhật ngay.
 */
async function datCongTac(khoa, bat, maNhanVien) {
  if (!CONG_TAC[khoa]) throw LoiNghiepVu.khongTimThay('Không có công tắc này');

  const giaTriMoi = bat ? '1' : '0';
  await sequelize.transaction(async (transaction) => {
    const dong = await CauHinhHeThong.findByPk(khoa, { transaction });
    const giaTriCu = dong ? dong.GiaTri : '0'; // chưa có dòng nghĩa là đang tắt

    if (dong) {
      await dong.update({ GiaTri: giaTriMoi, MaNhanVienCapNhat: maNhanVien }, { transaction });
    } else {
      await CauHinhHeThong.create(
        { Khoa: khoa, GiaTri: giaTriMoi, MoTa: CONG_TAC[khoa].moTa, MaNhanVienCapNhat: maNhanVien },
        { transaction }
      );
    }

    // Khóa cấu hình là chuỗi còn MaDoiTuong là số nguyên nên đặt MaDoiTuong = 0, tên khóa nằm ở TruongDuLieu
    await ghiNhanThayDoi({
      loaiDoiTuong: 'CAU_HINH',
      maDoiTuong: 0,
      maNhanVien,
      thayDoi: { [khoa]: { cu: giaTriCu, moi: giaTriMoi } },
      transaction
    });
  });

  phatSuKien('cauHinh:doi', { khoa, bat: Boolean(bat) });
  return layTrangThaiCongTac(khoa);
}

module.exports = {
  KHOA_THANH_TOAN_QR,
  KHOA_AI_CHATBOT,
  KHOA_AI_TRAN_NGAY,
  docCongTac,
  docGiaTriSo,
  layDanhSachCongTac,
  datCongTac
};
