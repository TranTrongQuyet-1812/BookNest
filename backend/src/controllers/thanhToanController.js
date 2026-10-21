/**
 * Controller xử lý các yêu cầu liên quan đến cổng thanh toán VietQR (payOS).
 */
const payosService = require('../services/payosService');
const hetHanThanhToanService = require('../services/hetHanThanhToanService');
const { sequelize, DonHang, ChiTietDonHang, Sach, ThanhToan, KhachHang, LichSuThayDoi } = require('../models');
const { phanHoiThanhCong, phanHoiLoi } = require('../middlewares/phanHoi');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
const { chuanHoaMaTraCuu } = require('../utils/maTraCuu');

// API thanh toán không cần đăng nhập nên chỉ nhận MaTraCuu (khó đoán), không nhận MaDonHang tăng dần,
// nếu không ai cũng dò được từng đơn và đếm được số đơn. Mã sai định dạng hay không tồn tại đều trả cùng một 404.
async function timDonTheoMaTraCuu(chuoiMa, tuyChon = {}) {
  const maTraCuu = chuanHoaMaTraCuu(chuoiMa);
  if (!maTraCuu) return null;
  return DonHang.findOne({ where: { MaTraCuu: maTraCuu }, ...tuyChon });
}

// Đơn của khách có tài khoản: chỉ chủ đơn (đã đăng nhập) hoặc nhân viên được thao tác/xem thanh toán.
// Đơn khách vãng lai và đơn bán quầy (MaKhachHang rỗng) không có chủ tài khoản, quyền truy cập dựa vào việc biết mã tra cứu khó đoán.
function khongDuocThaoTacDon(user, donHang) {
  if (!donHang.MaKhachHang) return false;
  if (!user) return true;
  if (user.aud === 'nhan_vien') return false;
  return user.id !== donHang.MaKhachHang;
}

// Trả lỗi 401 (chưa đăng nhập) hoặc 403 (không phải chủ đơn) và báo đã phản hồi để hàm gọi dừng lại
function chanNeuKhongDuocThaoTac(req, res, donHang) {
  if (!khongDuocThaoTacDon(req.user, donHang)) return false;
  phanHoiLoi(res, req.user
    ? { thongDiep: 'Bạn không có quyền thao tác trên đơn hàng này (IDOR Guard)', maTrangThai: 403 }
    : { thongDiep: 'Vui lòng đăng nhập để thao tác trên đơn hàng này', maTrangThai: 401 });
  return true;
}

/**
 * Kiểm tra xem tính năng thanh toán QR có đang khả dụng không
 */
async function kiemTraKhaDung(req, res, next) {
  try {
    const daBat = await payosService.kiemTraCongTacQRDangBat();
    return phanHoiThanhCong(res, {
      duLieu: { khaDung: daBat },
      thongDiep: daBat ? 'Cổng thanh toán VietQR đang hoạt động' : 'Cổng thanh toán QR hiện đang tắt'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Tạo liên kết và mã QR VietQR cho đơn hàng
 */
async function taoQrThanhToan(req, res, next) {
  try {
    const donHang = await timDonTheoMaTraCuu(req.params.maTraCuu, {
      include: [{
        model: ChiTietDonHang,
        as: 'chiTietDonHang',
        include: [{ model: Sach, as: 'sach', attributes: ['TenSach'] }]
      }]
    });

    if (!donHang) {
      return phanHoiLoi(res, {
        thongDiep: 'Không tìm thấy thông tin đơn hàng',
        maTrangThai: 404
      });
    }

    if (chanNeuKhongDuocThaoTac(req, res, donHang)) return;

    const danhSachMon = (donHang.chiTietDonHang || []).map(ct => ({
      tenSach: ct.sach?.TenSach || `Sách #${ct.MaSach}`,
      soLuong: ct.SoLuong,
      donGia: ct.DonGia
    }));

    const ketQua = await payosService.taoThanhToanQR(donHang, danhSachMon);
    return phanHoiThanhCong(res, {
      duLieu: ketQua,
      thongDiep: 'Khởi tạo mã thanh toán VietQR thành công'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Khách đổi đơn từ chuyển khoản QR sang thanh toán khi nhận hàng (COD) trước khi QR hết hạn
 */
async function doiSangCOD(req, res, next) {
  try {
    const donHang = await timDonTheoMaTraCuu(req.params.maTraCuu);
    if (!donHang) {
      return phanHoiLoi(res, { thongDiep: 'Không tìm thấy thông tin đơn hàng', maTrangThai: 404 });
    }
    if (chanNeuKhongDuocThaoTac(req, res, donHang)) return;

    const ketQua = await hetHanThanhToanService.doiSangCOD(donHang);
    return phanHoiThanhCong(res, { duLieu: ketQua, thongDiep: 'Đã đổi sang thanh toán khi nhận hàng (COD)' });
  } catch (err) {
    next(err);
  }
}

/**
 * Tiếp nhận và xử lý Webhook từ payOS khi tiền về
 */
async function xuLyWebhook(req, res) {
  try {
    const webhookData = req.body;
    await payosService.xuLyWebhookPayOS(webhookData);
    // payOS yêu cầu phản hồi HTTP 200 nhanh chóng
    return res.status(200).json({ error: 0, message: 'Webhook processed successfully' });
  } catch (err) {
    // Trả về 200 kèm ghi nhận lỗi, không để lộ thông tin kỹ thuật/CSDL nội bộ
    console.error('[payOS Webhook Error]', err.message);
    return res.status(200).json({ error: 1, message: 'Lỗi khi xử lý dữ liệu webhook payOS' });
  }
}

/**
 * Tra cứu thông tin và trạng thái thanh toán của một đơn hàng
 */
async function layTrangThaiThanhToan(req, res, next) {
  try {
    const donHang = await timDonTheoMaTraCuu(req.params.maTraCuu);
    if (!donHang) {
      return phanHoiLoi(res, {
        thongDiep: 'Không tìm thấy thông tin đơn hàng',
        maTrangThai: 404
      });
    }
    if (chanNeuKhongDuocThaoTac(req, res, donHang)) return;

    const ketQua = await payosService.layThongTinThanhToanTheoDon(donHang);
    return phanHoiThanhCong(res, {
      duLieu: ketQua,
      thongDiep: 'Lấy trạng thái thanh toán thành công'
    });
  } catch (err) {
    next(err);
  }
}

/**
 * Lấy danh sách các khoản thanh toán phục vụ Back-Office
 */
async function layDanhSachThanhToanAdmin(req, res) {
  const { page = 1, limit = 10, status, method, search } = req.query;
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const gioiHan = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const viTri = (trang - 1) * gioiHan;

  const dieuKienWhere = {};
  if (status) {
    dieuKienWhere.TrangThai = status;
  }
  if (method) {
    dieuKienWhere.PhuongThuc = method;
  }
  if (search && search.trim()) {
    const tuKhoa = search.trim();
    const { Op } = require('sequelize');
    const dieuKienOr = [
      { '$donHang.MaTraCuu$': { [Op.like]: `%${tuKhoa}%` } },
      { MaThamChieuNganHang: { [Op.like]: `%${tuKhoa}%` } }
    ];
    if (!isNaN(tuKhoa)) {
      dieuKienOr.push(
        { MaGiaoDichPayos: Number(tuKhoa) },
        { MaDonHang: Number(tuKhoa) },
        { MaThanhToan: Number(tuKhoa) }
      );
    }
    dieuKienWhere[Op.or] = dieuKienOr;
  }

  const { rows, count } = await ThanhToan.findAndCountAll({
    where: dieuKienWhere,
    include: [
      {
        model: DonHang,
        as: 'donHang',
        attributes: ['MaDonHang', 'MaTraCuu', 'TrangThai', 'TenNguoiNhan', 'SoDienThoaiNhan', 'EmailNhan', 'TongTien', 'NgayDat', 'KenhBan'],
        include: [
          {
            model: KhachHang,
            as: 'khachHang',
            attributes: ['MaKhachHang', 'HoTen', 'Email', 'SoDienThoai']
          }
        ]
      }
    ],
    order: [
      [sequelize.literal("CASE WHEN [ThanhToan].[TrangThai] = 'CAN_HOAN_TIEN' THEN 0 ELSE 1 END"), 'ASC'],
      ['NgayCapNhat', 'DESC']
    ],
    limit: gioiHan,
    offset: viTri,
    distinct: true
  });

  // Thống kê nhanh số lượng theo trạng thái
  const [thongKeTrangThai] = await sequelize.query(`
    SELECT
      COUNT(CASE WHEN TrangThai = 'CAN_HOAN_TIEN' THEN 1 END) AS soLuongCanHoanTien,
      COUNT(CASE WHEN TrangThai = 'DA_HOAN_TIEN' THEN 1 END) AS soLuongDaHoanTien,
      COUNT(CASE WHEN TrangThai = 'DA_THANH_TOAN' THEN 1 END) AS soLuongDaThanhToan,
      COUNT(CASE WHEN TrangThai = 'CHO_THANH_TOAN' THEN 1 END) AS soLuongChoThanhToan,
      COUNT(CASE WHEN TrangThai IN ('HET_HAN', 'DA_HUY') THEN 1 END) AS soLuongDaHuy,
      COUNT(*) AS tongTatCa
    FROM ThanhToan
  `, { type: sequelize.QueryTypes.SELECT });

  return phanHoiThanhCong(res, {
    duLieu: {
      danhSach: rows,
      phanTrang: {
        tongSoBanGhi: count,
        tongSoTrang: Math.ceil(count / gioiHan),
        trangHienTai: trang,
        soBanGhiMoiTrang: gioiHan
      },
      thongKe: thongKeTrangThai || {}
    },
    thongDiep: 'Lấy danh sách thanh toán thành công'
  });
}

/**
 * Quản trị viên / Thủ thư xác nhận đã đối soát và hoàn tiền qua ngân hàng cho khách
 */
async function xacNhanHoanTienAdmin(req, res) {
  const maThanhToan = parseInt(req.params.id, 10);
  const { maThamChieu, ghiChu } = req.body;

  if (maThamChieu !== undefined && maThamChieu !== null) {
    if (typeof maThamChieu !== 'string' || maThamChieu.trim().length > 100) {
      throw LoiNghiepVu.yeuCauKhongHopLe('Mã tham chiếu hoàn tiền phải là chuỗi không quá 100 ký tự');
    }
  }
  if (ghiChu !== undefined && ghiChu !== null) {
    if (typeof ghiChu !== 'string' || ghiChu.trim().length > 500) {
      throw LoiNghiepVu.yeuCauKhongHopLe('Ghi chú hoàn tiền phải là chuỗi không quá 500 ký tự');
    }
  }

  const thanhToan = await ThanhToan.findByPk(maThanhToan, {
    include: [{ model: DonHang, as: 'donHang' }]
  });

  if (!thanhToan) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy khoản thanh toán này');
  }

  if (thanhToan.TrangThai !== 'CAN_HOAN_TIEN') {
    throw LoiNghiepVu.xungDot('Chỉ có thể hoàn tiền cho khoản thanh toán ở trạng thái Cần hoàn tiền');
  }

  const trangThaiCu = thanhToan.TrangThai;
  await sequelize.transaction(async (t) => {
    // Không ghi đè MaThamChieuNganHang gốc của giao dịch chuyển khoản; mã hoàn tiền được lưu vào LichSuThayDoi
    const [soDongCapNhat] = await ThanhToan.update(
      {
        TrangThai: 'DA_HOAN_TIEN'
      },
      {
        where: { MaThanhToan: maThanhToan, TrangThai: 'CAN_HOAN_TIEN' },
        transaction: t
      }
    );

    if (soDongCapNhat === 0) {
      throw LoiNghiepVu.xungDot('Khoản thanh toán này đã được hoàn tiền trước đó hoặc không còn ở trạng thái Cần hoàn tiền');
    }

    thanhToan.TrangThai = 'DA_HOAN_TIEN';

    // Ghi nhật ký trạng thái vào LichSuThayDoi
    await LichSuThayDoi.create({
      LoaiDoiTuong: 'THANH_TOAN',
      MaDoiTuong: maThanhToan,
      TruongDuLieu: 'TrangThai',
      GiaTriCu: trangThaiCu,
      GiaTriMoi: 'DA_HOAN_TIEN',
      MaNhanVienThayDoi: req.user.id,
      NgayThayDoi: new Date()
    }, { transaction: t });

    // Ghi nhật ký mã tham chiếu hoàn tiền vào LichSuThayDoi
    if (maThamChieu && String(maThamChieu).trim()) {
      await LichSuThayDoi.create({
        LoaiDoiTuong: 'THANH_TOAN',
        MaDoiTuong: maThanhToan,
        TruongDuLieu: 'MaThamChieuHoanTien',
        GiaTriCu: null,
        GiaTriMoi: String(maThamChieu).trim(),
        MaNhanVienThayDoi: req.user.id,
        NgayThayDoi: new Date()
      }, { transaction: t });
    }

    if (ghiChu && String(ghiChu).trim()) {
      await LichSuThayDoi.create({
        LoaiDoiTuong: 'THANH_TOAN',
        MaDoiTuong: maThanhToan,
        TruongDuLieu: 'GhiChuHoanTien',
        GiaTriCu: null,
        GiaTriMoi: String(ghiChu).trim(),
        MaNhanVienThayDoi: req.user.id,
        NgayThayDoi: new Date()
      }, { transaction: t });
    }
  });

  // Phát Socket.IO thông báo nhân viên và phòng đơn hàng / khách hàng
  try {
    const { phatSuKien } = require('../realtime/socket');
    const duLieuSocket = {
      maThanhToan,
      maDonHang: thanhToan.MaDonHang,
      maTraCuu: thanhToan.donHang?.MaTraCuu,
      soTien: thanhToan.SoTien,
      maNhanVien: req.user.id,
      thoiGian: new Date().toISOString()
    };
    phatSuKien('thanhToan:daHoanTien', duLieuSocket, 'nhan_vien');
    if (thanhToan.donHang?.MaTraCuu) {
      phatSuKien('thanhToan:daHoanTien', duLieuSocket, `don_hang:${thanhToan.donHang.MaTraCuu}`);
    }
    if (thanhToan.donHang?.MaKhachHang) {
      phatSuKien('thanhToan:daHoanTien', duLieuSocket, `khach_hang:${thanhToan.donHang.MaKhachHang}`);
    }
  } catch (e) {
    console.warn('[ThanhToan] Lỗi phát socket hoàn tiền:', e.message);
  }

  return phanHoiThanhCong(res, {
    duLieu: thanhToan,
    thongDiep: 'Đã xác nhận hoàn tiền thành công'
  });
}

module.exports = {
  kiemTraKhaDung,
  taoQrThanhToan,
  doiSangCOD,
  xuLyWebhook,
  layTrangThaiThanhToan,
  layDanhSachThanhToanAdmin,
  xacNhanHoanTienAdmin
};
