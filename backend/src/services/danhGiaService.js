/**
 * Tầng Service quản lý đánh giá sách của khách hàng (DanhGia).
 * Quy tắc nghiệp vụ: Chỉ khách đã mua và nhận sách thành công (đơn DELIVERED) mới được đánh giá.
 * Mỗi khách chỉ có 1 đánh giá cho mỗi sách (gửi lại sẽ cập nhật đánh giá cũ).
 */
const { sequelize, DanhGia, DonHang, ChiTietDonHang, Sach, NguoiDung } = require('../models');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');

// Lấy danh sách đánh giá của cuốn sách kèm thống kê số sao trung bình
async function layDanhSachDanhGia(maSach, { page = 1, limit = 10 }) {
  const sach = await Sach.findByPk(maSach);
  if (!sach || sach.DaAn) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy cuốn sách này');
  }

  const trang = Math.max(1, parseInt(page, 10) || 1);
  const gioiHan = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const viTri = (trang - 1) * gioiHan;

  const { rows, count } = await DanhGia.findAndCountAll({
    where: { MaSach: maSach },
    order: [['NgayCapNhat', 'DESC']],
    limit: gioiHan,
    offset: viTri,
    include: [
      {
        model: NguoiDung,
        as: 'nguoiDung',
        attributes: ['MaNguoiDung', 'HoTen'] // Tuyệt đối không lộ Email hoặc thông tin cá nhân
      }
    ]
  });

  // Tính số sao trung bình của sách bằng câu truy vấn vô hướng chuẩn SQL Server
  const [thongKe] = await sequelize.query(
    'SELECT ROUND(AVG(CAST(SoSao AS FLOAT)), 1) AS saoTrungBinh, COUNT(MaDanhGia) AS soLuotDanhGia FROM DanhGia WHERE MaSach = :maSach',
    { replacements: { maSach }, type: sequelize.QueryTypes.SELECT }
  );

  return {
    danhSach: rows,
    phanTrang: {
      tongSoBanGhi: count,
      tongSoTrang: Math.ceil(count / gioiHan),
      trangHienTai: trang,
      soBanGhiMoiTrang: gioiHan
    },
    thongKe: {
      saoTrungBinh: thongKe && thongKe.saoTrungBinh ? parseFloat(thongKe.saoTrungBinh) : 0,
      soLuotDanhGia: thongKe && thongKe.soLuotDanhGia ? parseInt(thongKe.soLuotDanhGia, 10) : 0
    }
  };
}

// Viết hoặc cập nhật đánh giá sách (chỉ cho phép khách đã nhận sách DELIVERED)
async function taoHoacCapNhatDanhGia(maNguoiDung, maSach, { soSao, noiDung }) {
  const sach = await Sach.findByPk(maSach);
  if (!sach || sach.DaAn) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy cuốn sách này');
  }

  // Kiểm tra điều kiện: Khách phải có ít nhất 1 đơn hàng trạng thái DELIVERED chứa cuốn sách này
  const daNhanSach = await DonHang.findOne({
    where: {
      MaNguoiDung: maNguoiDung,
      TrangThai: 'DELIVERED'
    },
    include: [
      {
        model: ChiTietDonHang,
        as: 'chiTietDonHang',
        where: { MaSach: maSach }
      }
    ]
  });

  if (!daNhanSach) {
    throw LoiNghiepVu.camTruyCap(
      'Bạn cần mua và nhận sách này thành công trước khi có thể đánh giá'
    );
  }

  // Khách chỉ có 1 đánh giá cho mỗi sách: Nếu đã có thì cập nhật, chưa có thì tạo mới
  let danhGia = await DanhGia.findOne({
    where: { MaNguoiDung: maNguoiDung, MaSach: maSach }
  });

  if (danhGia) {
    danhGia.SoSao = soSao;
    danhGia.NoiDung = noiDung || null;
    await danhGia.save();
  } else {
    danhGia = await DanhGia.create({
      MaNguoiDung: maNguoiDung,
      MaSach: maSach,
      SoSao: soSao,
      NoiDung: noiDung || null
    });
  }

  return danhGia;
}

module.exports = {
  layDanhSachDanhGia,
  taoHoacCapNhatDanhGia
};
