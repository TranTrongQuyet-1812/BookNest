/**
 * Tầng Service quản lý vòng đời đơn hàng, trừ kho có điều kiện (chống bán âm),
 * hoàn kho khi hủy, máy trạng thái chuyển đổi và dòng thời gian lịch sử đơn hàng.
 */
const { Op, TableHints } = require('sequelize');
const {
  sequelize,
  DonHang,
  ChiTietDonHang,
  Sach,
  GioHang,
  LichSuTrangThaiDonHang,
  KhachHang,
  NhanVien
} = require('../models');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');

// Hàm thuần kiểm tra tính hợp lệ của việc chuyển đổi trạng thái đơn hàng (State Machine)
function kiemTraChuyenTrangThai(trangThaiCu, trangThaiMoi) {
  const maTranChuyen = {
    CHO_DUYET: ['DA_XAC_NHAN'],
    DA_XAC_NHAN: ['DANG_GIAO'],
    DANG_GIAO: ['DA_GIAO']
  };
  return Boolean(maTranChuyen[trangThaiCu] && maTranChuyen[trangThaiCu].includes(trangThaiMoi));
}

// 1. Đặt hàng trong một Transaction (ACID, chống race condition và bán âm kho)
async function datHang(maKhachHang, thongTinGiaoHang) {
  const t = await sequelize.transaction();

  try {
    // Đọc giỏ hàng BÊN TRONG transaction có khóa dòng TableHints.UPDLOCK
    // Trên SQL Server, lock: t.LOCK.UPDATE bị bỏ qua; TableHints.UPDLOCK sinh WITH (UPDLOCK) thật sự.
    // Nếu khách hàng bấm đúp, request thứ hai sẽ bị khóa chờ request thứ nhất commit và thấy giỏ hàng đã trống.
    const cacMonTrongGio = await GioHang.findAll({
      where: { MaKhachHang: maKhachHang },
      include: [{ model: Sach, as: 'sach' }],
      tableHint: TableHints.UPDLOCK,
      transaction: t
    });

    if (!cacMonTrongGio || cacMonTrongGio.length === 0) {
      throw LoiNghiepVu.yeuCauKhongHopLe('Giỏ hàng đang trống, vui lòng chọn sách trước khi đặt hàng');
    }

    let tongTien = 0;
    const danhSachChiTiet = [];

    // Sắp xếp các món theo MaSach ASC để chuẩn hóa thứ tự khóa dòng (Row lock ordering), triệt tiêu nguy cơ Deadlock 1205
    const cacMonSapXep = [...cacMonTrongGio].sort((a, b) => a.MaSach - b.MaSach);

    // Kiểm tra từng cuốn sách và trừ kho bằng câu lệnh UPDATE có điều kiện
    for (const mon of cacMonSapXep) {
      const sach = mon.sach;
      if (!sach || sach.DaAn) {
        throw LoiNghiepVu.xungDot(`Cuốn sách "${sach ? sach.TenSach : mon.MaSach}" đã ngừng kinh doanh`);
      }

      // Trừ tồn kho nguyên tử bằng API decrement của Sequelize (SoLuongTon >= SoLuong, DaAn = false)
      const ketQua = await Sach.decrement('SoLuongTon', {
        by: mon.SoLuong,
        where: {
          MaSach: mon.MaSach,
          SoLuongTon: { [Op.gte]: mon.SoLuong },
          DaAn: false
        },
        transaction: t
      });

      // Với MSSQL, Sequelize trả về [[dữ liệu, số dòng bị ảnh hưởng]]
      const [[, soDongCapNhat]] = ketQua;

      if (soDongCapNhat === 0) {
        // Đọc lại số lượng tồn kho mới nhất trong DB để báo lỗi chính xác
        const sachHienTai = await Sach.findByPk(mon.MaSach, { transaction: t });
        const tonHienTai = sachHienTai ? sachHienTai.SoLuongTon : 0;
        throw LoiNghiepVu.xungDot(
          `Sách "${sach.TenSach}" không đủ số lượng tồn kho (chỉ còn ${tonHienTai} cuốn)`
        );
      }

      // Đơn giá được chốt từ CSDL phía Server, không tin tưởng giá từ Client
      const donGia = parseFloat(sach.GiaBan);
      tongTien += donGia * mon.SoLuong;
      danhSachChiTiet.push({
        MaSach: mon.MaSach,
        SoLuong: mon.SoLuong,
        DonGia: donGia
      });
    }

    // Tạo đơn hàng mới ở trạng thái chờ duyệt (CHO_DUYET)
    const donHangMoi = await DonHang.create(
      {
        MaKhachHang: maKhachHang,
        TenNguoiNhan: thongTinGiaoHang.tenNguoiNhan,
        SoDienThoaiNhan: thongTinGiaoHang.soDienThoaiNhan,
        EmailNhan: thongTinGiaoHang.emailNhan,
        DiaChiGiaoHang: thongTinGiaoHang.diaChiGiaoHang,
        GhiChu: thongTinGiaoHang.ghiChu || null,
        TongTien: tongTien,
        TrangThai: 'CHO_DUYET'
      },
      { transaction: t }
    );

    // Gắn mã đơn hàng vào danh sách chi tiết và lưu hàng loạt
    const chiTietCoMaDon = danhSachChiTiet.map(ct => ({
      ...ct,
      MaDonHang: donHangMoi.MaDonHang
    }));
    await ChiTietDonHang.bulkCreate(chiTietCoMaDon, { transaction: t });

    // Ghi nhận dòng lịch sử trạng thái đầu tiên (Khởi tạo đơn)
    await LichSuTrangThaiDonHang.create(
      {
        MaDonHang: donHangMoi.MaDonHang,
        TrangThaiCu: null,
        TrangThaiMoi: 'CHO_DUYET',
        MaKhachHangThucHien: maKhachHang,
        GhiChu: 'Khách hàng đặt đơn hàng mới'
      },
      { transaction: t }
    );

    // Dọn sạch giỏ hàng của khách sau khi đặt thành công
    await GioHang.destroy({ where: { MaKhachHang: maKhachHang }, transaction: t });

    // Tự động lưu/cập nhật thông tin nhận hàng (SĐT, Địa chỉ mặc định) vào hồ sơ người dùng nếu đang trống hoặc có yêu cầu
    const khachHienTai = await KhachHang.findByPk(maKhachHang, { transaction: t });
    if (khachHienTai) {
      const capNhat = {};
      if (!khachHienTai.SoDienThoai || thongTinGiaoHang.luuMacDinh) {
        capNhat.SoDienThoai = thongTinGiaoHang.soDienThoaiNhan;
      }
      if (!khachHienTai.DiaChiMacDinh || thongTinGiaoHang.luuMacDinh) {
        capNhat.DiaChiMacDinh = thongTinGiaoHang.diaChiGiaoHang;
      }
      if (Object.keys(capNhat).length > 0) {
        await khachHienTai.update(capNhat, { transaction: t });
      }
    }

    await t.commit();
    return layChiTietDonHang(donHangMoi.MaDonHang);
  } catch (loi) {
    await t.rollback();
    throw loi;
  }
}

// 1b. Khách vãng lai (Guest) đặt hàng trực tiếp (ACID Transaction, chống race condition và bán âm kho)
async function datHangKhachVangLai(thongTinDatHang) {
  const { tenNguoiNhan, soDienThoaiNhan, emailNhan, diaChiGiaoHang, ghiChu, cacMon } = thongTinDatHang;

  if (!cacMon || cacMon.length === 0) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Giỏ hàng đang trống, vui lòng chọn sách trước khi đặt hàng');
  }

  const t = await sequelize.transaction();

  try {
    // Khách vãng lai không có tài khoản: đơn lưu MaKhachHang = NULL, thông tin giao hàng nằm ngay trên đơn.
    // Hệ thống không lưu hồ sơ khách, lần sau khách phải nhập lại.
    let tongTien = 0;
    const danhSachChiTiet = [];

    // Sắp xếp các món theo maSach ASC để triệt tiêu Deadlock 1205
    const cacMonSapXep = [...cacMon].sort((a, b) => a.maSach - b.maSach);

    for (const mon of cacMonSapXep) {
      const soLuong = parseInt(mon.soLuong, 10);
      if (soLuong <= 0) continue;

      // Trừ tồn kho nguyên tử bằng Sequelize decrement
      const ketQua = await Sach.decrement('SoLuongTon', {
        by: soLuong,
        where: {
          MaSach: mon.maSach,
          SoLuongTon: { [Op.gte]: soLuong },
          DaAn: false
        },
        transaction: t
      });

      const [[, soDongCapNhat]] = ketQua;

      if (soDongCapNhat === 0) {
        const sachHienTai = await Sach.findByPk(mon.maSach, { transaction: t });
        if (!sachHienTai || sachHienTai.DaAn) {
          throw LoiNghiepVu.xungDot(`Cuốn sách mã số ${mon.maSach} hiện đã ngừng kinh doanh`);
        }
        throw LoiNghiepVu.xungDot(
          `Sách "${sachHienTai.TenSach}" không đủ số lượng tồn kho (chỉ còn ${sachHienTai.SoLuongTon} cuốn)`
        );
      }

      const sachChotGia = await Sach.findByPk(mon.maSach, { transaction: t });
      const donGia = parseFloat(sachChotGia.GiaBan);
      tongTien += donGia * soLuong;
      danhSachChiTiet.push({
        MaSach: mon.maSach,
        SoLuong: soLuong,
        DonGia: donGia
      });
    }

    // Tạo đơn hàng mới ở trạng thái chờ duyệt (CHO_DUYET)
    const donHangMoi = await DonHang.create(
      {
        MaKhachHang: null,
        TenNguoiNhan: tenNguoiNhan,
        SoDienThoaiNhan: soDienThoaiNhan,
        EmailNhan: emailNhan,
        DiaChiGiaoHang: diaChiGiaoHang,
        GhiChu: ghiChu || null,
        TongTien: tongTien,
        TrangThai: 'CHO_DUYET'
      },
      { transaction: t }
    );

    // Gắn mã đơn hàng vào danh sách chi tiết và lưu hàng loạt
    const chiTietCoMaDon = danhSachChiTiet.map(ct => ({
      ...ct,
      MaDonHang: donHangMoi.MaDonHang
    }));
    await ChiTietDonHang.bulkCreate(chiTietCoMaDon, { transaction: t });

    // Ghi nhận dòng lịch sử trạng thái đầu tiên
    await LichSuTrangThaiDonHang.create(
      {
        MaDonHang: donHangMoi.MaDonHang,
        TrangThaiCu: null,
        TrangThaiMoi: 'CHO_DUYET',
        MaKhachHangThucHien: null,
        MaNhanVienThucHien: null,
        GhiChu: 'Khách vãng lai đặt đơn hàng mới'
      },
      { transaction: t }
    );

    await t.commit();

    // Không cấp token: khách vãng lai không có phiên đăng nhập
    return layChiTietDonHang(donHangMoi.MaDonHang);
  } catch (loi) {
    await t.rollback();
    throw loi;
  }
}

// 2. Lấy chi tiết đầy đủ của một đơn hàng kèm chi tiết sách và lịch sử trạng thái
async function layChiTietDonHang(maDonHang) {
  const donHang = await DonHang.findByPk(maDonHang, {
    order: [[{ model: LichSuTrangThaiDonHang, as: 'lichSuTrangThai' }, 'NgayThayDoi', 'ASC']],
    include: [
      {
        model: ChiTietDonHang,
        as: 'chiTietDonHang',
        include: [{ model: Sach, as: 'sach', attributes: ['MaSach', 'TenSach', 'AnhBia'] }]
      },
      {
        model: LichSuTrangThaiDonHang,
        as: 'lichSuTrangThai',
        include: [
          { model: KhachHang, as: 'khachHangThucHien', attributes: ['MaKhachHang', 'HoTen'] },
          { model: NhanVien, as: 'nhanVienThucHien', attributes: ['MaNhanVien', 'HoTen', 'VaiTro'] }
        ]
      },
      {
        model: KhachHang,
        as: 'khachHang',
        attributes: ['MaKhachHang', 'HoTen', 'Email', 'SoDienThoai']
      }
    ]
  });

  if (!donHang) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy đơn hàng yêu cầu');
  }

  return donHang;
}

// 3. Khách hàng xem danh sách đơn của chính mình
async function layDanhSachDonKhach(maKhachHang, { page = 1, limit = 10, status }) {
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const gioiHan = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const viTri = (trang - 1) * gioiHan;

  const dieuKien = { MaKhachHang: maKhachHang };
  if (status) dieuKien.TrangThai = status;

  const { rows, count } = await DonHang.findAndCountAll({
    where: dieuKien,
    order: [['NgayDat', 'DESC']],
    limit: gioiHan,
    offset: viTri,
    include: [
      {
        model: ChiTietDonHang,
        as: 'chiTietDonHang',
        include: [{ model: Sach, as: 'sach', attributes: ['MaSach', 'TenSach', 'AnhBia'] }]
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

// Hàm helper hoàn lại số lượng tồn kho theo thứ tự MaSach ASC để chuẩn hóa khóa dòng, triệt tiêu Deadlock 1205
async function hoanTonKho(danhSachChiTiet, transaction) {
  // Sắp xếp theo MaSach ASC đồng bộ với quy ước khóa dòng của datHang
  const chiTietSapXep = [...danhSachChiTiet].sort((a, b) => a.MaSach - b.MaSach);
  for (const ct of chiTietSapXep) {
    await Sach.increment('SoLuongTon', {
      by: ct.SoLuong,
      where: { MaSach: ct.MaSach },
      transaction
    });
  }
}

// 4. Khách hàng tự hủy đơn khi đơn còn CHO_DUYET (Transaction hoàn kho)
async function khachHuyDon(maDonHang, maKhachHang, lyDo) {
  const donHang = await DonHang.findByPk(maDonHang, {
    include: [{ model: ChiTietDonHang, as: 'chiTietDonHang' }]
  });

  if (!donHang || donHang.MaKhachHang !== maKhachHang) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy đơn hàng yêu cầu');
  }

  if (donHang.TrangThai !== 'CHO_DUYET') {
    throw LoiNghiepVu.xungDot('Chỉ có thể hủy đơn hàng khi đang ở trạng thái chờ duyệt (CHO_DUYET)');
  }

  const t = await sequelize.transaction();

  try {
    // Cập nhật trạng thái sang DA_HUY có điều kiện WHERE TrangThai = CHO_DUYET (chống hủy trùng)
    const [soDongCapNhat] = await DonHang.update(
      { TrangThai: 'DA_HUY' },
      { where: { MaDonHang: maDonHang, TrangThai: 'CHO_DUYET' }, transaction: t }
    );

    if (soDongCapNhat === 0) {
      throw LoiNghiepVu.xungDot('Đơn hàng đã được nhân viên xử lý hoặc đã bị hủy trước đó');
    }

    // Hoàn lại số lượng tồn kho cho từng cuốn sách trong đơn (sắp xếp MaSach ASC và dùng Sach.increment)
    await hoanTonKho(donHang.chiTietDonHang, t);

    // Ghi nhận dòng lịch sử hủy đơn của khách
    await LichSuTrangThaiDonHang.create(
      {
        MaDonHang: maDonHang,
        TrangThaiCu: 'CHO_DUYET',
        TrangThaiMoi: 'DA_HUY',
        MaKhachHangThucHien: maKhachHang,
        GhiChu: lyDo || 'Khách hàng tự hủy đơn'
      },
      { transaction: t }
    );

    await t.commit();
    return layChiTietDonHang(maDonHang);
  } catch (loi) {
    await t.rollback();
    throw loi;
  }
}

// 5. Back-Office: Danh sách toàn bộ đơn hàng của hệ thống
async function adminLayDanhSachDon({ page = 1, limit = 10, status, tuNgay, denNgay }) {
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const gioiHan = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const viTri = (trang - 1) * gioiHan;

  const dieuKien = {};
  if (status) dieuKien.TrangThai = status;
  if (tuNgay || denNgay) {
    dieuKien.NgayDat = {};
    if (tuNgay) dieuKien.NgayDat[Op.gte] = new Date(tuNgay);
    if (denNgay) dieuKien.NgayDat[Op.lte] = new Date(denNgay);
  }

  const { rows, count } = await DonHang.findAndCountAll({
    where: dieuKien,
    order: [['NgayDat', 'DESC']],
    limit: gioiHan,
    offset: viTri,
    include: [
      {
        model: KhachHang,
        as: 'khachHang',
        attributes: ['MaKhachHang', 'HoTen', 'Email', 'SoDienThoai']
      },
      {
        model: ChiTietDonHang,
        as: 'chiTietDonHang',
        include: [{ model: Sach, as: 'sach', attributes: ['MaSach', 'TenSach'] }]
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

// 6. Back-Office: Chuyển trạng thái đơn hàng (Optimistic Lock)
async function adminCapNhatTrangThai(maDonHang, trangThaiMoi, ghiChu, maNhanVien) {
  const donHang = await DonHang.findByPk(maDonHang);
  if (!donHang) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy đơn hàng yêu cầu');
  }

  const trangThaiCu = donHang.TrangThai;
  if (!kiemTraChuyenTrangThai(trangThaiCu, trangThaiMoi)) {
    throw LoiNghiepVu.xungDot(
      `Không thể chuyển trạng thái từ ${trangThaiCu} sang ${trangThaiMoi}. Vui lòng tuân thủ quy trình CHO_DUYET -> DA_XAC_NHAN -> DANG_GIAO -> DA_GIAO.`
    );
  }

  const t = await sequelize.transaction();

  try {
    // Optimistic lock: chỉ cập nhật nếu trạng thái trong DB vẫn bằng trạng thái cũ lúc đọc
    const [soDongCapNhat] = await DonHang.update(
      { TrangThai: trangThaiMoi },
      { where: { MaDonHang: maDonHang, TrangThai: trangThaiCu }, transaction: t }
    );

    if (soDongCapNhat === 0) {
      throw LoiNghiepVu.xungDot('Đơn hàng vừa được cập nhật bởi một nhân viên khác. Vui lòng tải lại trang.');
    }

    // Ghi nhận lịch sử chuyển trạng thái
    await LichSuTrangThaiDonHang.create(
      {
        MaDonHang: maDonHang,
        TrangThaiCu: trangThaiCu,
        TrangThaiMoi: trangThaiMoi,
        MaNhanVienThucHien: maNhanVien,
        GhiChu: ghiChu || null
      },
      { transaction: t }
    );

    await t.commit();
    return layChiTietDonHang(maDonHang);
  } catch (loi) {
    await t.rollback();
    throw loi;
  }
}

// 7. Back-Office: Nhân viên hủy đơn (bắt buộc có lý do, hoàn kho nếu CHO_DUYET hoặc DA_XAC_NHAN)
async function adminHuyDon(maDonHang, lyDo, maNhanVien) {
  const donHang = await DonHang.findByPk(maDonHang, {
    include: [{ model: ChiTietDonHang, as: 'chiTietDonHang' }]
  });

  if (!donHang) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy đơn hàng yêu cầu');
  }

  const trangThaiCu = donHang.TrangThai;
  if (!['CHO_DUYET', 'DA_XAC_NHAN'].includes(trangThaiCu)) {
    throw LoiNghiepVu.xungDot(`Không thể hủy đơn hàng đang ở trạng thái ${trangThaiCu}.`);
  }

  const t = await sequelize.transaction();

  try {
    const [soDongCapNhat] = await DonHang.update(
      { TrangThai: 'DA_HUY' },
      {
        where: { MaDonHang: maDonHang, TrangThai: { [Op.in]: ['CHO_DUYET', 'DA_XAC_NHAN'] } },
        transaction: t
      }
    );

    if (soDongCapNhat === 0) {
      throw LoiNghiepVu.xungDot('Đơn hàng đã bị thay đổi trạng thái trước đó. Vui lòng thử lại.');
    }

    // Hoàn trả tồn kho (sắp xếp MaSach ASC và dùng Sach.increment)
    await hoanTonKho(donHang.chiTietDonHang, t);

    await LichSuTrangThaiDonHang.create(
      {
        MaDonHang: maDonHang,
        TrangThaiCu: trangThaiCu,
        TrangThaiMoi: 'DA_HUY',
        MaNhanVienThucHien: maNhanVien,
        GhiChu: lyDo
      },
      { transaction: t }
    );

    await t.commit();
    return layChiTietDonHang(maDonHang);
  } catch (loi) {
    await t.rollback();
    throw loi;
  }
}

module.exports = {
  kiemTraChuyenTrangThai,
  datHang,
  datHangKhachVangLai,
  layChiTietDonHang,
  layDanhSachDonKhach,
  khachHuyDon,
  adminLayDanhSachDon,
  adminCapNhatTrangThai,
  adminHuyDon
};
