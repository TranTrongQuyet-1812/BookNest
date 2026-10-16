/**
 * Tầng Service quản lý đánh giá sách của khách hàng (DanhGia).
 * Quy tắc nghiệp vụ: Chỉ khách đã mua và nhận sách thành công (đơn DA_GIAO) mới được đánh giá.
 * Mỗi khách chỉ có 1 đánh giá cho mỗi sách (gửi lại sẽ cập nhật đánh giá cũ).
 */
const { Op } = require('sequelize');
const { sequelize, DanhGia, DonHang, ChiTietDonHang, Sach, KhachHang, LichSuThayDoi } = require('../models');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');

// Lấy danh sách đánh giá của cuốn sách kèm thống kê số sao trung bình (Chỉ lấy đánh giá chưa ẩn)
async function layDanhSachDanhGia(maSach, { page = 1, limit = 10 }) {
  const sach = await Sach.findByPk(maSach);
  if (!sach || sach.DaAn) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy cuốn sách này');
  }

  const trang = Math.max(1, parseInt(page, 10) || 1);
  const gioiHan = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const viTri = (trang - 1) * gioiHan;

  const { rows, count } = await DanhGia.findAndCountAll({
    where: {
      MaSach: maSach,
      DaAn: false
    },
    order: [['NgayCapNhat', 'DESC']],
    limit: gioiHan,
    offset: viTri,
    include: [
      {
        model: KhachHang,
        as: 'khachHang',
        attributes: ['MaKhachHang', 'HoTen'] // Tuyệt đối không lộ Email hoặc thông tin cá nhân
      }
    ]
  });

  // Tính số sao trung bình của sách bằng câu truy vấn vô hướng chuẩn SQL Server (Chỉ tính đánh giá chưa ẩn)
  const [thongKe] = await sequelize.query(
    'SELECT ROUND(AVG(CAST(SoSao AS FLOAT)), 1) AS saoTrungBinh, COUNT(MaDanhGia) AS soLuotDanhGia FROM DanhGia WHERE MaSach = :maSach AND DaAn = 0',
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

// Viết hoặc cập nhật đánh giá sách (chỉ cho phép khách đã nhận sách DA_GIAO)
async function taoHoacCapNhatDanhGia(maKhachHang, maSach, { soSao, noiDung }) {
  const sach = await Sach.findByPk(maSach);
  if (!sach || sach.DaAn) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy cuốn sách này');
  }

  // Kiểm tra điều kiện: Khách phải có ít nhất 1 đơn hàng trạng thái DA_GIAO chứa cuốn sách này
  const daNhanSach = await DonHang.findOne({
    where: {
      MaKhachHang: maKhachHang,
      TrangThai: 'DA_GIAO'
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
    where: { MaKhachHang: maKhachHang, MaSach: maSach }
  });

  if (danhGia) {
    // Chống lách kiểm duyệt: Nếu đánh giá đã bị kiểm duyệt ẩn thì không cho khách tự ý mở lại
    if (danhGia.DaAn) {
      throw LoiNghiepVu.camTruyCap(
        'Đánh giá của bạn về tác phẩm này đang bị quản trị viên tạm ẩn kiểm duyệt. Vui lòng liên hệ ban quản trị.'
      );
    }
    danhGia.SoSao = soSao;
    danhGia.NoiDung = noiDung || null;
    await danhGia.save();
  } else {
    danhGia = await DanhGia.create({
      MaKhachHang: maKhachHang,
      MaSach: maSach,
      SoSao: soSao,
      NoiDung: noiDung || null,
      DaAn: false
    });
  }

  return danhGia;
}

/**
 * Lấy danh sách đánh giá phục vụ kiểm duyệt phía Back-Office (Task T38)
 */
async function layDanhSachDanhGiaAdmin({ page = 1, limit = 10, search = '', rating = null, daAn = null }) {
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const gioiHan = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const viTri = (trang - 1) * gioiHan;

  const dieuKienWhere = {};

  // Lọc theo trạng thái ẩn/hiện
  if (daAn !== null && daAn !== undefined && daAn !== '') {
    dieuKienWhere.DaAn = String(daAn) === 'true' || daAn === true || String(daAn) === '1';
  }

  // Lọc theo số sao (1 đến 5)
  const soSaoInt = parseInt(rating, 10);
  if (soSaoInt >= 1 && soSaoInt <= 5) {
    dieuKienWhere.SoSao = soSaoInt;
  }

  // Tìm kiếm theo từ khóa (nội dung, tên sách hoặc tên khách hàng)
  const tuKhoa = String(search || '').trim();
  if (tuKhoa) {
    dieuKienWhere[Op.or] = [
      { NoiDung: { [Op.like]: `%${tuKhoa}%` } },
      { '$sach.TenSach$': { [Op.like]: `%${tuKhoa}%` } },
      { '$khachHang.HoTen$': { [Op.like]: `%${tuKhoa}%` } }
    ];
  }

  const { rows, count } = await DanhGia.findAndCountAll({
    where: dieuKienWhere,
    order: [['NgayCapNhat', 'DESC']],
    limit: gioiHan,
    offset: viTri,
    include: [
      {
        model: KhachHang,
        as: 'khachHang',
        attributes: ['MaKhachHang', 'HoTen', 'Email', 'SoDienThoai']
      },
      {
        model: Sach,
        as: 'sach',
        attributes: ['MaSach', 'TenSach', 'AnhBia', 'GiaBan', 'DaAn']
      }
    ]
  });

  return {
    danhSach: rows,
    phanTrang: {
      tongSoBanGhi: count,
      tongSoTrang: Math.ceil(count / gioiHan),
      trangHienTai: trang,
      soBanGhiMoiTrang: gioiHan
    }
  };
}

/**
 * Ẩn hoặc Bỏ ẩn một đánh giá vi phạm/tiêu cực (Chỉ Quản trị viên, Thủ thư)
 */
async function anHienDanhGia(maDanhGia, daAn, maNhanVien, lyDo = '') {
  const danhGia = await DanhGia.findByPk(maDanhGia, {
    include: [
      { model: KhachHang, as: 'khachHang', attributes: ['MaKhachHang', 'HoTen', 'Email'] },
      { model: Sach, as: 'sach', attributes: ['MaSach', 'TenSach'] }
    ]
  });

  if (!danhGia) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy đánh giá cần cập nhật');
  }

  const giaTriCu = danhGia.DaAn ? '1' : '0';
  const giaTriMoi = daAn ? '1' : '0';

  danhGia.DaAn = Boolean(daAn);
  await danhGia.save();

  // Ghi nhật ký kiểm toán Back-Office
  if (maNhanVien) {
    try {
      await LichSuThayDoi.create({
        LoaiDoiTuong: 'DanhGia',
        MaDoiTuong: maDanhGia,
        TruongDuLieu: 'DaAn',
        GiaTriCu: giaTriCu,
        GiaTriMoi: `${giaTriMoi}${lyDo ? ` (Lý do: ${lyDo})` : ''}`,
        MaNhanVienThayDoi: maNhanVien
      });
    } catch (e) {
      console.warn('[LichSuThayDoi] Không thể ghi nhật ký thay đổi đánh giá:', e.message);
    }
  }

  return danhGia;
}

/**
 * Xóa vĩnh viễn đánh giá rác/spam nghiêm trọng (Chỉ Quản trị viên)
 */
async function xoaDanhGia(maDanhGia, maNhanVien) {
  const danhGia = await DanhGia.findByPk(maDanhGia);
  if (!danhGia) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy đánh giá cần xóa');
  }

  // Ghi nhật ký kiểm toán trước khi xóa
  if (maNhanVien) {
    try {
      await LichSuThayDoi.create({
        LoaiDoiTuong: 'DanhGia',
        MaDoiTuong: maDanhGia,
        TruongDuLieu: 'DaXoa',
        GiaTriCu: JSON.stringify({ SoSao: danhGia.SoSao, NoiDung: danhGia.NoiDung }),
        GiaTriMoi: 'DA_XOA_VINH_VIEN',
        MaNhanVienThayDoi: maNhanVien
      });
    } catch (e) {
      console.warn('[LichSuThayDoi] Không thể ghi nhật ký xóa đánh giá:', e.message);
    }
  }

  await danhGia.destroy();
  return { thanhCong: true, maDanhGia };
}

module.exports = {
  layDanhSachDanhGia,
  taoHoacCapNhatDanhGia,
  layDanhSachDanhGiaAdmin,
  anHienDanhGia,
  xoaDanhGia
};
