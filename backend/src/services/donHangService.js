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
  ThanhToan,
  KhachHang,
  NhanVien
} = require('../models');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
const { sinhMaTraCuu } = require('../utils/maTraCuu');
const { tinhNgayHetHan, sinhMaGiaoDich } = require('../utils/thanhToanQr');
const emailService = require('./emailService');
const { phatSuKien } = require('../realtime/socket');
const giamGiaService = require('./giamGiaService');
const { tinhGiaSauGiam } = require('../utils/giaBan');

// Phát sự kiện Socket.IO an toàn tới phòng nhân viên và phòng khách hàng (không làm gián đoạn transaction CSDL nếu socket gặp lỗi)
function baoNhanVienRealtime(tenSuKien, duLieu) {
  try {
    // 1. Luôn phát tới phòng nhân viên (Back-Office)
    phatSuKien(tenSuKien, duLieu, 'nhan_vien');

    // 2. Phát tới phòng riêng của đơn hàng theo mã tra cứu (Storefront ChiTietDonHang)
    if (duLieu?.maTraCuu) {
      phatSuKien(tenSuKien, {
        maTraCuu: duLieu.maTraCuu,
        trangThaiDonHang: duLieu.trangThaiMoi || duLieu.trangThaiDonHang,
        trangThaiCu: duLieu.trangThaiCu,
        trangThaiThanhToan: duLieu.trangThaiThanhToan,
        soTien: duLieu.soTien,
        thoiGian: duLieu.thoiGian || new Date().toISOString()
      }, `don_hang:${duLieu.maTraCuu}`);
    }

    // 3. Nếu đơn có MaKhachHang, phát tới phòng riêng của khách hàng (Storefront DonHangCuaToi)
    if (duLieu?.maKhachHang) {
      phatSuKien(tenSuKien, {
        maTraCuu: duLieu.maTraCuu,
        trangThaiDonHang: duLieu.trangThaiMoi || duLieu.trangThaiDonHang,
        trangThaiCu: duLieu.trangThaiCu,
        trangThaiThanhToan: duLieu.trangThaiThanhToan,
        soTien: duLieu.soTien,
        thoiGian: duLieu.thoiGian || new Date().toISOString()
      }, `khach_hang:${duLieu.maKhachHang}`);
    }
  } catch (err) {
    console.warn(`[Socket.IO] Không thể phát sự kiện ${tenSuKien}:`, err.message);
  }
}

// Số lần thử sinh mã tra cứu khác khi gặp mã trùng (cực hiếm: hơn 1 tỷ tổ hợp, chỉ mục duy nhất chặn trùng)
const SO_LAN_THU_SINH_MA = 5;

// Tạo đơn kèm mã tra cứu ngẫu nhiên khó đoán (MaDonHang tăng dần chỉ dùng nội bộ, không đưa cho khách)
async function taoDonHangCoMa(thongTinDon, tuyChon) {
  for (let lan = 1; ; lan += 1) {
    try {
      return await DonHang.create({ ...thongTinDon, MaTraCuu: sinhMaTraCuu() }, tuyChon);
    } catch (loi) {
      if (loi.name !== 'SequelizeUniqueConstraintError' || lan >= SO_LAN_THU_SINH_MA) throw loi;
    }
  }
}

// Hàm thuần kiểm tra tính hợp lệ của việc chuyển đổi trạng thái đơn hàng (State Machine)
function kiemTraChuyenTrangThai(trangThaiCu, trangThaiMoi) {
  const maTranChuyen = {
    CHO_DUYET: ['DA_DUYET'],
    DA_DUYET: ['DA_LAY_HANG'],
    DA_LAY_HANG: ['DA_GIAO']
  };
  return Boolean(maTranChuyen[trangThaiCu] && maTranChuyen[trangThaiCu].includes(trangThaiMoi));
}

// Trừ kho và chốt đơn giá dùng chung cho đơn trực tuyến lẫn đơn tại quầy.
async function truTonKhoVaChotChiTiet(cacMon, transaction) {
  let tongTien = 0;
  const danhSachChiTiet = [];

  // Tự động gộp số lượng nếu danh sách gửi lên có các món trùng mã sách (chống lỗi khóa chính ChiTietDonHang)
  const banDoMon = new Map();
  for (const mon of cacMon) {
    const maSach = Number(mon.MaSach ?? mon.maSach);
    const soLuong = Number(mon.SoLuong ?? mon.soLuong);
    if (!maSach || !Number.isInteger(soLuong) || soLuong < 1) {
      throw LoiNghiepVu.yeuCauKhongHopLe('Số lượng mỗi sách phải là số nguyên dương');
    }
    banDoMon.set(maSach, (banDoMon.get(maSach) || 0) + soLuong);
  }

  // Sắp xếp theo MaSach ASC để chuẩn hóa khóa dòng CSDL, triệt tiêu Deadlock 1205
  const cacMonSapXep = Array.from(banDoMon.entries())
    .map(([maSach, soLuong]) => ({ maSach, soLuong }))
    .sort((a, b) => a.maSach - b.maSach);

  // Lấy trước thông tin giảm giá đang có hiệu lực cho tất cả sách trong đơn
  const danhSachSachTrongDon = await Sach.findAll({
    where: { MaSach: { [Op.in]: cacMonSapXep.map(m => m.maSach) } },
    attributes: ['MaSach', 'MaDanhMuc', 'GiaBan'],
    transaction
  });
  const banDoGiamGia = await giamGiaService.layPhanTramDangApDung(danhSachSachTrongDon);

  for (const mon of cacMonSapXep) {
    const maSach = mon.maSach;
    const soLuong = mon.soLuong;
    const sach = await Sach.findByPk(maSach, { transaction });
    if (!sach || sach.DaAn) {
      throw LoiNghiepVu.xungDot(`Cuốn sách "${sach?.TenSach || maSach}" đã ngừng kinh doanh`);
    }

    const ketQua = await Sach.decrement('SoLuongTon', {
      by: soLuong,
      where: { MaSach: maSach, SoLuongTon: { [Op.gte]: soLuong }, DaAn: false },
      transaction
    });
    const [[, soDongCapNhat]] = ketQua;
    if (soDongCapNhat === 0) {
      const sachHienTai = await Sach.findByPk(maSach, { transaction });
      throw LoiNghiepVu.xungDot(
        `Sách "${sach.TenSach}" không đủ số lượng tồn kho (chỉ còn ${sachHienTai?.SoLuongTon || 0} cuốn)`
      );
    }

    const ptGiam = banDoGiamGia[maSach] || 0;
    const donGia = tinhGiaSauGiam(sach.GiaBan, ptGiam);
    tongTien += donGia * soLuong;
    danhSachChiTiet.push({ MaSach: maSach, SoLuong: soLuong, DonGia: donGia });
  }

  return { tongTien, danhSachChiTiet };
}

/**
 * Đơn chọn chuyển khoản QR có sẵn khoản thanh toán "đang chờ" ngay khi đặt (chưa có link payOS).
 * Nhờ vậy dù tạo link lỗi, đơn vẫn có hạn: quá hạn không trả thì bị hủy và nhả kho (hetHanThanhToanService),
 * trong lúc đó khách thử lại hoặc đổi sang COD. MaGiaoDichPayos là cột duy nhất nên cấp tạm một mã, link thật sẽ lấy mã mới.
 */
async function taoKhoanQrDangCho(donHangMoi, tongTien, transaction) {
  await ThanhToan.create({
    MaDonHang: donHangMoi.MaDonHang,
    PhuongThuc: 'CHUYEN_KHOAN_QR',
    TrangThai: 'CHO_THANH_TOAN',
    SoTien: tongTien,
    MaGiaoDichPayos: sinhMaGiaoDich(),
    NgayHetHan: tinhNgayHetHan()
  }, { transaction });
}

/**
 * Gửi hóa đơn ngay khi đặt đơn, trừ đơn chọn chuyển khoản QR: đơn đó chưa trả tiền nên chưa được báo "đã xác nhận".
 * Hóa đơn của đơn QR gửi sau, khi payOS báo đã nhận tiền (payosService.xuLyWebhookPayOS).
 */
function guiHoaDonKhiDatDon(chiTietDon, phuongThucThanhToan) {
  if (phuongThucThanhToan === 'CHUYEN_KHOAN_QR') return;
  emailService.guiEmailHoaDonDonHang(chiTietDon).catch(err => console.error('[Lỗi Gửi Email Hóa Đơn]', err.message));
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

    const { tongTien, danhSachChiTiet } = await truTonKhoVaChotChiTiet(cacMonTrongGio, t);

    // Tạo đơn hàng mới ở trạng thái chờ duyệt (CHO_DUYET)
    const donHangMoi = await taoDonHangCoMa(
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

    if (thongTinGiaoHang.phuongThucThanhToan === 'CHUYEN_KHOAN_QR') await taoKhoanQrDangCho(donHangMoi, tongTien, t);
    await t.commit();
    const chiTietDon = await layChiTietDonHang(donHangMoi.MaDonHang);
    guiHoaDonKhiDatDon(chiTietDon, thongTinGiaoHang.phuongThucThanhToan);
    baoNhanVienRealtime('donHang:donMoi', {
      maDonHang: chiTietDon.MaDonHang,
      maTraCuu: chiTietDon.MaTraCuu,
      tongTien: chiTietDon.TongTien,
      nguoiNhan: chiTietDon.TenNguoiNhan,
      thoiGian: chiTietDon.NgayDat
    });
    return chiTietDon;
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
    const { tongTien, danhSachChiTiet } = await truTonKhoVaChotChiTiet(cacMon, t);

    // Tạo đơn hàng mới ở trạng thái chờ duyệt (CHO_DUYET)
    const donHangMoi = await taoDonHangCoMa(
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

    if (thongTinDatHang.phuongThucThanhToan === 'CHUYEN_KHOAN_QR') await taoKhoanQrDangCho(donHangMoi, tongTien, t);
    await t.commit();

    // Không cấp token: khách vãng lai không có phiên đăng nhập
    const chiTietDon = await layChiTietDonHang(donHangMoi.MaDonHang);
    guiHoaDonKhiDatDon(chiTietDon, thongTinDatHang.phuongThucThanhToan);
    baoNhanVienRealtime('donHang:donMoi', {
      maDonHang: chiTietDon.MaDonHang,
      maTraCuu: chiTietDon.MaTraCuu,
      tongTien: chiTietDon.TongTien,
      nguoiNhan: chiTietDon.TenNguoiNhan,
      thoiGian: chiTietDon.NgayDat
    });
    return chiTietDon;
  } catch (loi) {
    await t.rollback();
    throw loi;
  }
}

// Lập đơn tại quầy; tồn kho, đơn, chi tiết và lịch sử cùng commit hoặc rollback.
async function taoDonQuay(duLieu, maNhanVien) {
  const cacMon = duLieu.cacMon || [];
  if (!cacMon.length) throw LoiNghiepVu.yeuCauKhongHopLe('Vui lòng chọn ít nhất một cuốn sách');
  const maSachDaChon = cacMon.map(mon => Number(mon.maSach));
  if (new Set(maSachDaChon).size !== maSachDaChon.length) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Mỗi cuốn sách chỉ được xuất hiện một lần trong đơn');
  }

  const t = await sequelize.transaction();
  try {
    let maKhachHang = null;
    if (duLieu.maKhachHang) {
      const khachHang = await KhachHang.findOne({
        where: { MaKhachHang: duLieu.maKhachHang, DangHoatDong: true },
        transaction: t
      });
      if (!khachHang) throw LoiNghiepVu.yeuCauKhongHopLe('Khách hàng không tồn tại hoặc đã bị khóa');
      maKhachHang = khachHang.MaKhachHang;
    }

    const { tongTien, danhSachChiTiet } = await truTonKhoVaChotChiTiet(cacMon, t);
    const donHang = await taoDonHangCoMa({
      MaKhachHang: maKhachHang,
      KenhBan: 'TAI_QUAY',
      MaNhanVienLap: maNhanVien,
      TenNguoiNhan: duLieu.tenKhach || null,
      SoDienThoaiNhan: duLieu.soDienThoaiKhach || null,
      EmailNhan: null,
      DiaChiGiaoHang: null,
      GhiChu: null,
      TongTien: tongTien,
      TrangThai: 'DA_GIAO'
    }, { transaction: t });

    await ChiTietDonHang.bulkCreate(danhSachChiTiet.map(chiTiet => ({
      ...chiTiet,
      MaDonHang: donHang.MaDonHang
    })), { transaction: t });
    await LichSuTrangThaiDonHang.create({
      MaDonHang: donHang.MaDonHang,
      TrangThaiCu: null,
      TrangThaiMoi: 'DA_GIAO',
      MaNhanVienThucHien: maNhanVien,
      GhiChu: 'Bán hàng tại quầy'
    }, { transaction: t });

    await t.commit();
    return layChiTietDonHang(donHang.MaDonHang);
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
        include: [{ model: Sach, as: 'sach', attributes: ['MaSach', 'TenSach', 'AnhBia', 'TacGia'] }]
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
      },
      {
        model: NhanVien,
        as: 'nhanVienLap',
        attributes: ['MaNhanVien', 'HoTen', 'VaiTro']
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
        include: [{ model: Sach, as: 'sach', attributes: ['MaSach', 'TenSach', 'AnhBia', 'TacGia'] }]
      },
      {
        model: ThanhToan,
        as: 'thanhToan',
        attributes: ['PhuongThuc', 'TrangThai', 'NgayHetHan']
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

    // Xử lý bản ghi thanh toán: nếu đang chờ thì hủy; nếu đã thanh toán thì chuyển CAN_HOAN_TIEN
    const thanhToan = await ThanhToan.findOne({ where: { MaDonHang: maDonHang }, transaction: t });
    let canHuyLink = false;
    let canBaoHoanTien = false;
    if (thanhToan) {
      if (thanhToan.TrangThai === 'CHO_THANH_TOAN') {
        await thanhToan.update({ TrangThai: 'DA_HUY' }, { transaction: t });
        canHuyLink = true;
      } else if (thanhToan.TrangThai === 'DA_THANH_TOAN') {
        await thanhToan.update({ TrangThai: 'CAN_HOAN_TIEN' }, { transaction: t });
        canBaoHoanTien = true;
      }
    }

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
    if (canHuyLink && thanhToan?.PhuongThuc === 'CHUYEN_KHOAN_QR' && thanhToan?.DuongDanThanhToan && thanhToan?.MaGiaoDichPayos) {
      try {
        const { huyLinkPayOS } = require('./payosService');
        huyLinkPayOS(thanhToan.MaGiaoDichPayos, lyDo || 'Khách hàng tự hủy đơn');
      } catch (errHuy) {}
    }
    const chiTietDon = await layChiTietDonHang(maDonHang);
    emailService.guiEmailCapNhatTrangThai(chiTietDon, 'DA_HUY', lyDo || 'Khách hàng tự hủy đơn').catch(err => console.error('[Lỗi Gửi Email Hủy Đơn]', err.message));
    baoNhanVienRealtime('donHang:capNhatTrangThai', {
      maDonHang: chiTietDon.MaDonHang,
      maTraCuu: chiTietDon.MaTraCuu,
      maKhachHang: chiTietDon.MaKhachHang,
      trangThaiDonHang: 'DA_HUY',
      trangThaiCu: 'CHO_DUYET',
      trangThaiThanhToan: thanhToan?.TrangThai,
      lyDo: lyDo || 'Khách hàng tự hủy đơn'
    });
    if (canBaoHoanTien) {
      baoNhanVienRealtime('thanhToan:canHoanTien', {
        maDonHang: chiTietDon.MaDonHang,
        maTraCuu: chiTietDon.MaTraCuu,
        maKhachHang: chiTietDon.MaKhachHang,
        soTien: thanhToan.SoTien,
        lyDo: lyDo || 'Khách hàng tự hủy đơn'
      });
    }
    return chiTietDon;
  } catch (loi) {
    await t.rollback();
    throw loi;
  }
}

// 5. Back-Office: Danh sách toàn bộ đơn hàng của hệ thống
async function adminLayDanhSachDon({ page = 1, limit = 10, status, tuNgay, denNgay, kenhBan, maNhanVien, vaiTro }) {
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const gioiHan = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const viTri = (trang - 1) * gioiHan;

  const dieuKien = {};
  if (status) dieuKien.TrangThai = status;
  if (kenhBan) dieuKien.KenhBan = kenhBan;
  if (vaiTro !== 'quan_tri' && maNhanVien) dieuKien.MaNhanVienLap = maNhanVien;
  if (tuNgay || denNgay) {
    dieuKien.NgayDat = {};
    if (tuNgay) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(tuNgay)) {
        dieuKien.NgayDat[Op.gte] = new Date(`${tuNgay}T00:00:00+07:00`);
      } else {
        dieuKien.NgayDat[Op.gte] = new Date(tuNgay);
      }
    }
    if (denNgay) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(denNgay)) {
        dieuKien.NgayDat[Op.lte] = new Date(`${denNgay}T23:59:59.999+07:00`);
      } else {
        const dNgay = new Date(denNgay);
        if (dNgay.getUTCHours() === 0 && dNgay.getUTCMinutes() === 0 && dNgay.getUTCSeconds() === 0 && dNgay.getUTCMilliseconds() === 0) {
          dNgay.setUTCHours(23, 59, 59, 999);
        }
        dieuKien.NgayDat[Op.lte] = dNgay;
      }
    }
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
        model: NhanVien,
        as: 'nhanVienLap',
        attributes: ['MaNhanVien', 'HoTen', 'VaiTro']
      },
      {
        model: ChiTietDonHang,
        as: 'chiTietDonHang',
        include: [{ model: Sach, as: 'sach', attributes: ['MaSach', 'TenSach'] }]
      },
      {
        model: ThanhToan,
        as: 'thanhToan',
        attributes: ['PhuongThuc', 'TrangThai', 'SoTien']
      }
    ],
    distinct: true,
    col: 'MaDonHang'
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

// Danh sách quầy luôn lọc đúng kênh; thủ thư chỉ xem đơn do mình lập.
async function layDanhSachDonQuay(maNhanVien, vaiTro, truyVan) {
  return adminLayDanhSachDon({ ...truyVan, kenhBan: 'TAI_QUAY', maNhanVien, vaiTro });
}

async function layChiTietDonQuay(maDonHang, maNhanVien, vaiTro) {
  const donHang = await layChiTietDonHang(maDonHang);
  if (donHang.KenhBan !== 'TAI_QUAY') throw LoiNghiepVu.khongTimThay('Không tìm thấy đơn bán tại quầy');
  if (vaiTro !== 'quan_tri' && donHang.MaNhanVienLap !== maNhanVien) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy đơn bán tại quầy');
  }
  return donHang;
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
      `Không thể chuyển trạng thái từ ${trangThaiCu} sang ${trangThaiMoi}. Vui lòng tuân thủ quy trình CHO_DUYET -> DA_DUYET -> DA_LAY_HANG -> DA_GIAO.`
    );
  }

  // Chặn nhân viên xác nhận hoặc giao hàng cho đơn QR chưa nhận được tiền
  if (['DA_DUYET', 'DA_LAY_HANG'].includes(trangThaiMoi)) {
    const thanhToan = await ThanhToan.findOne({ where: { MaDonHang: maDonHang } });
    if (thanhToan && thanhToan.PhuongThuc === 'CHUYEN_KHOAN_QR' && thanhToan.TrangThai === 'CHO_THANH_TOAN') {
      throw LoiNghiepVu.xungDot('Khách hàng chưa hoàn tất thanh toán chuyển khoản VietQR. Vui lòng không xác nhận hoặc giao hàng khi tiền chưa về!');
    }
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
    const chiTietDon = await layChiTietDonHang(maDonHang);
    // DT05: Email trạng thái chỉ gửi khi sang DA_LAY_HANG và DA_GIAO (chuyển sang DA_DUYET không gửi)
    if (['DA_LAY_HANG', 'DA_GIAO'].includes(trangThaiMoi)) {
      emailService.guiEmailCapNhatTrangThai(chiTietDon, trangThaiMoi, ghiChu).catch(err => console.error('[Lỗi Gửi Email Cập Nhật]', err.message));
    }
    baoNhanVienRealtime('donHang:capNhatTrangThai', {
      maDonHang,
      maTraCuu: chiTietDon.MaTraCuu,
      maKhachHang: chiTietDon.MaKhachHang,
      trangThaiCu,
      trangThaiMoi,
      trangThaiThanhToan: chiTietDon.thanhToan?.TrangThai,
      thoiGian: new Date().toISOString()
    });
    return chiTietDon;
  } catch (loi) {
    await t.rollback();
    throw loi;
  }
}

// 7. Back-Office: Nhân viên hủy đơn (bắt buộc có lý do, hoàn kho nếu CHO_DUYET hoặc DA_DUYET)
async function adminHuyDon(maDonHang, lyDo, maNhanVien) {
  const donHang = await DonHang.findByPk(maDonHang, {
    include: [{ model: ChiTietDonHang, as: 'chiTietDonHang' }]
  });

  if (!donHang) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy đơn hàng yêu cầu');
  }

  const trangThaiCu = donHang.TrangThai;
  if (!['CHO_DUYET', 'DA_DUYET'].includes(trangThaiCu)) {
    throw LoiNghiepVu.xungDot(`Không thể hủy đơn hàng đang ở trạng thái ${trangThaiCu}.`);
  }

  const t = await sequelize.transaction();

  try {
    const [soDongCapNhat] = await DonHang.update(
      { TrangThai: 'DA_HUY' },
      {
        where: { MaDonHang: maDonHang, TrangThai: { [Op.in]: ['CHO_DUYET', 'DA_DUYET'] } },
        transaction: t
      }
    );

    if (soDongCapNhat === 0) {
      throw LoiNghiepVu.xungDot('Đơn hàng đã bị thay đổi trạng thái trước đó. Vui lòng thử lại.');
    }

    // Hoàn trả tồn kho (sắp xếp MaSach ASC và dùng Sach.increment)
    await hoanTonKho(donHang.chiTietDonHang, t);

    // Xử lý bản ghi thanh toán: nếu đang chờ thì hủy; nếu đã thanh toán thì chuyển CAN_HOAN_TIEN
    const thanhToan = await ThanhToan.findOne({ where: { MaDonHang: maDonHang }, transaction: t });
    let canHuyLink = false;
    let canBaoHoanTien = false;
    if (thanhToan) {
      if (thanhToan.TrangThai === 'CHO_THANH_TOAN') {
        await thanhToan.update({ TrangThai: 'DA_HUY' }, { transaction: t });
        canHuyLink = true;
      } else if (thanhToan.TrangThai === 'DA_THANH_TOAN') {
        await thanhToan.update({ TrangThai: 'CAN_HOAN_TIEN' }, { transaction: t });
        canBaoHoanTien = true;
      }
    }

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
    if (canHuyLink && thanhToan?.DuongDanThanhToan && thanhToan?.MaGiaoDichPayos) {
      try {
        const { huyLinkPayOS } = require('./payosService');
        huyLinkPayOS(thanhToan.MaGiaoDichPayos, lyDo || 'Nhân viên hủy đơn');
      } catch (errHuy) {}
    }
    const chiTietDon = await layChiTietDonHang(maDonHang);
    emailService.guiEmailCapNhatTrangThai(chiTietDon, 'DA_HUY', lyDo).catch(err => console.error('[Lỗi Gửi Email Hủy Đơn]', err.message));
    baoNhanVienRealtime('donHang:capNhatTrangThai', {
      maDonHang,
      maTraCuu: chiTietDon.MaTraCuu,
      maKhachHang: chiTietDon.MaKhachHang,
      trangThaiCu,
      trangThaiMoi: 'DA_HUY',
      trangThaiThanhToan: thanhToan?.TrangThai,
      lyDo,
      thoiGian: new Date().toISOString()
    });
    if (canBaoHoanTien) {
      baoNhanVienRealtime('thanhToan:canHoanTien', {
        maDonHang: chiTietDon.MaDonHang,
        maTraCuu: chiTietDon.MaTraCuu,
        maKhachHang: chiTietDon.MaKhachHang,
        soTien: thanhToan.SoTien,
        lyDo
      });
    }
    return chiTietDon;
  } catch (loi) {
    await t.rollback();
    throw loi;
  }
}

// Back-Office: Danh sách đơn hàng cần soạn (Pick list) cho thủ kho (T33)
// Đơn ở trạng thái DA_DUYET, CHỈ trả thông tin sách và số lượng, TUYỆT ĐỐI không trả thông tin cá nhân khách
async function layDanhSachDonCanSoan() {
  const cacDonHang = await DonHang.findAll({
    where: { TrangThai: 'DA_DUYET' },
    attributes: ['MaDonHang', 'MaTraCuu', 'NgayDat', 'TrangThai', 'KenhBan', 'GhiChu'],
    include: [
      {
        model: ChiTietDonHang,
        as: 'chiTietDonHang',
        attributes: ['MaDonHang', 'MaSach', 'SoLuong', 'DonGia'],
        include: [
          {
            model: Sach,
            as: 'sach',
            attributes: ['MaSach', 'TenSach', 'AnhBia', 'TacGia']
          }
        ]
      }
    ],
    order: [['NgayDat', 'ASC']]
  });

  // Gom tổng số lượng từng cuốn sách cần soạn để thủ kho lấy hàng một lượt từ giá kệ
  const banDoTongHop = {};
  cacDonHang.forEach(don => {
    (don.chiTietDonHang || []).forEach(ct => {
      const maSach = ct.MaSach;
      if (!banDoTongHop[maSach]) {
        banDoTongHop[maSach] = {
          maSach,
          tenSach: ct.sach?.TenSach || `Sách #${maSach}`,
          anhBia: ct.sach?.AnhBia || null,
          tacGia: ct.sach?.TacGia || null,
          tongSoLuongCanSoan: 0,
          cacDonLienQuan: []
        };
      }
      banDoTongHop[maSach].tongSoLuongCanSoan += ct.SoLuong;
      banDoTongHop[maSach].cacDonLienQuan.push({
        maDonHang: don.MaDonHang,
        soLuong: ct.SoLuong
      });
    });
  });

  const tongHopSachCanSoan = Object.values(banDoTongHop).sort((a, b) => b.tongSoLuongCanSoan - a.tongSoLuongCanSoan);

  return {
    tongSoDonCanSoan: cacDonHang.length,
    tongSoCuonSachCanSoan: tongHopSachCanSoan.reduce((tong, s) => tong + s.tongSoLuongCanSoan, 0),
    danhSachDonHang: cacDonHang,
    tongHopSachCanSoan
  };
}

module.exports = {
  kiemTraChuyenTrangThai,
  truTonKhoVaChotChiTiet,
  datHang,
  datHangKhachVangLai,
  taoDonQuay,
  hoanTonKho,
  layChiTietDonHang,
  layDanhSachDonQuay,
  layChiTietDonQuay,
  layDanhSachDonKhach,
  layDanhSachDonCanSoan,
  khachHuyDon,
  adminLayDanhSachDon,
  adminCapNhatTrangThai,
  adminHuyDon
};
