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
  NguoiDung
} = require('../models');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');
const cauHinh = require('../config/cauHinh');

// Hàm thuần kiểm tra tính hợp lệ của việc chuyển đổi trạng thái đơn hàng (State Machine)
function kiemTraChuyenTrangThai(trangThaiCu, trangThaiMoi) {
  const maTranChuyen = {
    PENDING: ['CONFIRMED'],
    CONFIRMED: ['SHIPPING'],
    SHIPPING: ['DELIVERED']
  };
  return Boolean(maTranChuyen[trangThaiCu] && maTranChuyen[trangThaiCu].includes(trangThaiMoi));
}

// 1. Đặt hàng trong một Transaction (ACID, chống race condition và bán âm kho)
async function datHang(maNguoiDung, thongTinGiaoHang) {
  const t = await sequelize.transaction();

  try {
    // Đọc giỏ hàng BÊN TRONG transaction có khóa dòng TableHints.UPDLOCK
    // Trên SQL Server, lock: t.LOCK.UPDATE bị bỏ qua; TableHints.UPDLOCK sinh WITH (UPDLOCK) thật sự.
    // Nếu khách hàng bấm đúp, request thứ hai sẽ bị khóa chờ request thứ nhất commit và thấy giỏ hàng đã trống.
    const cacMonTrongGio = await GioHang.findAll({
      where: { MaNguoiDung: maNguoiDung },
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

    // Tạo đơn hàng mới ở trạng thái chờ duyệt (PENDING)
    const donHangMoi = await DonHang.create(
      {
        MaNguoiDung: maNguoiDung,
        TenNguoiNhan: thongTinGiaoHang.tenNguoiNhan,
        SoDienThoaiNhan: thongTinGiaoHang.soDienThoaiNhan,
        DiaChiGiaoHang: thongTinGiaoHang.diaChiGiaoHang,
        GhiChu: thongTinGiaoHang.ghiChu || null,
        TongTien: tongTien,
        TrangThai: 'PENDING'
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
        TrangThaiMoi: 'PENDING',
        MaNguoiThucHien: maNguoiDung,
        GhiChu: 'Khách hàng đặt đơn hàng mới'
      },
      { transaction: t }
    );

    // Dọn sạch giỏ hàng của khách sau khi đặt thành công
    await GioHang.destroy({ where: { MaNguoiDung: maNguoiDung }, transaction: t });

    // Tự động lưu/cập nhật thông tin nhận hàng (SĐT, Địa chỉ mặc định) vào hồ sơ người dùng nếu đang trống hoặc có yêu cầu
    const nguoiDungHienTai = await NguoiDung.findByPk(maNguoiDung, { transaction: t });
    if (nguoiDungHienTai) {
      const capNhat = {};
      if (!nguoiDungHienTai.SoDienThoai || thongTinGiaoHang.luuMacDinh) {
        capNhat.SoDienThoai = thongTinGiaoHang.soDienThoaiNhan;
      }
      if (!nguoiDungHienTai.DiaChiMacDinh || thongTinGiaoHang.luuMacDinh) {
        capNhat.DiaChiMacDinh = thongTinGiaoHang.diaChiGiaoHang;
      }
      if (Object.keys(capNhat).length > 0) {
        await nguoiDungHienTai.update(capNhat, { transaction: t });
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
  const { tenNguoiNhan, soDienThoaiNhan, diaChiGiaoHang, email, ghiChu, cacMon } = thongTinDatHang;

  if (!cacMon || cacMon.length === 0) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Giỏ hàng đang trống, vui lòng chọn sách trước khi đặt hàng');
  }

  const t = await sequelize.transaction();

  try {
    // Tìm hoặc tạo tài khoản khách hàng để thỏa mãn ràng buộc khóa ngoại MaNguoiDung NOT NULL
    const emailChuanHoa = email ? email.toLowerCase().trim() : `guest_${soDienThoaiNhan}@guest.booknest.vn`;
    let nguoiDung = await NguoiDung.findOne({
      where: { Email: emailChuanHoa },
      transaction: t
    });

    if (!nguoiDung) {
      nguoiDung = await NguoiDung.findOne({
        where: { SoDienThoai: soDienThoaiNhan },
        transaction: t
      });
    }

    if (!nguoiDung) {
      const matKhauNgauNhien = Math.random().toString(36).slice(-8) + 'Aa1@';
      const matKhauHash = await bcrypt.hash(matKhauNgauNhien, 10);
      nguoiDung = await NguoiDung.create(
        {
          HoTen: tenNguoiNhan,
          Email: emailChuanHoa,
          MatKhauHash: matKhauHash,
          SoDienThoai: soDienThoaiNhan,
          DiaChiMacDinh: diaChiGiaoHang,
          VaiTro: 'customer',
          DangHoatDong: true
        },
        { transaction: t }
      );
    }

    const maNguoiDung = nguoiDung.MaNguoiDung;
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

    // Tạo đơn hàng mới ở trạng thái chờ duyệt (PENDING)
    const donHangMoi = await DonHang.create(
      {
        MaNguoiDung: maNguoiDung,
        TenNguoiNhan: tenNguoiNhan,
        SoDienThoaiNhan: soDienThoaiNhan,
        DiaChiGiaoHang: diaChiGiaoHang,
        GhiChu: ghiChu || null,
        TongTien: tongTien,
        TrangThai: 'PENDING'
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
        TrangThaiMoi: 'PENDING',
        MaNguoiThucHien: maNguoiDung,
        GhiChu: 'Khách vãng lai đặt đơn hàng mới'
      },
      { transaction: t }
    );

    await t.commit();

    // Sinh token JWT để khách tự động duy trì phiên đăng nhập và truy cập đơn vừa tạo
    const token = jwt.sign(
      {
        id: nguoiDung.MaNguoiDung,
        email: nguoiDung.Email,
        role: nguoiDung.VaiTro,
        fullName: nguoiDung.HoTen
      },
      cauHinh.jwt.biMat,
      { expiresIn: cauHinh.jwt.hanDung }
    );

    const chiTiet = await layChiTietDonHang(donHangMoi.MaDonHang);
    const donHangObj = chiTiet.toJSON ? chiTiet.toJSON() : chiTiet;

    return {
      ...donHangObj,
      token,
      user: {
        id: nguoiDung.MaNguoiDung,
        email: nguoiDung.Email,
        fullName: nguoiDung.HoTen,
        role: nguoiDung.VaiTro
      }
    };
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
        include: [{ model: NguoiDung, as: 'nguoiThucHien', attributes: ['MaNguoiDung', 'HoTen', 'VaiTro'] }]
      },
      {
        model: NguoiDung,
        as: 'nguoiDung',
        attributes: ['MaNguoiDung', 'HoTen', 'Email', 'SoDienThoai']
      }
    ]
  });

  if (!donHang) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy đơn hàng yêu cầu');
  }

  return donHang;
}

// 3. Khách hàng xem danh sách đơn của chính mình
async function layDanhSachDonKhach(maNguoiDung, { page = 1, limit = 10, status }) {
  const trang = Math.max(1, parseInt(page, 10) || 1);
  const gioiHan = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));
  const viTri = (trang - 1) * gioiHan;

  const dieuKien = { MaNguoiDung: maNguoiDung };
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

// 4. Khách hàng tự hủy đơn khi đơn còn PENDING (Transaction hoàn kho)
async function khachHuyDon(maDonHang, maNguoiDung, lyDo) {
  const donHang = await DonHang.findByPk(maDonHang, {
    include: [{ model: ChiTietDonHang, as: 'chiTietDonHang' }]
  });

  if (!donHang || donHang.MaNguoiDung !== maNguoiDung) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy đơn hàng yêu cầu');
  }

  if (donHang.TrangThai !== 'PENDING') {
    throw LoiNghiepVu.xungDot('Chỉ có thể hủy đơn hàng khi đang ở trạng thái chờ duyệt (PENDING)');
  }

  const t = await sequelize.transaction();

  try {
    // Cập nhật trạng thái sang CANCELLED có điều kiện WHERE TrangThai = PENDING (chống hủy trùng)
    const [soDongCapNhat] = await DonHang.update(
      { TrangThai: 'CANCELLED' },
      { where: { MaDonHang: maDonHang, TrangThai: 'PENDING' }, transaction: t }
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
        TrangThaiCu: 'PENDING',
        TrangThaiMoi: 'CANCELLED',
        MaNguoiThucHien: maNguoiDung,
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
        model: NguoiDung,
        as: 'nguoiDung',
        attributes: ['MaNguoiDung', 'HoTen', 'Email', 'SoDienThoai']
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
async function adminCapNhatTrangThai(maDonHang, trangThaiMoi, ghiChu, maNguoiThucHien) {
  const donHang = await DonHang.findByPk(maDonHang);
  if (!donHang) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy đơn hàng yêu cầu');
  }

  const trangThaiCu = donHang.TrangThai;
  if (!kiemTraChuyenTrangThai(trangThaiCu, trangThaiMoi)) {
    throw LoiNghiepVu.xungDot(
      `Không thể chuyển trạng thái từ ${trangThaiCu} sang ${trangThaiMoi}. Vui lòng tuân thủ quy trình PENDING -> CONFIRMED -> SHIPPING -> DELIVERED.`
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
        MaNguoiThucHien: maNguoiThucHien,
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

// 7. Back-Office: Nhân viên hủy đơn (bắt buộc có lý do, hoàn kho nếu PENDING hoặc CONFIRMED)
async function adminHuyDon(maDonHang, lyDo, maNguoiThucHien) {
  const donHang = await DonHang.findByPk(maDonHang, {
    include: [{ model: ChiTietDonHang, as: 'chiTietDonHang' }]
  });

  if (!donHang) {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy đơn hàng yêu cầu');
  }

  const trangThaiCu = donHang.TrangThai;
  if (!['PENDING', 'CONFIRMED'].includes(trangThaiCu)) {
    throw LoiNghiepVu.xungDot(`Không thể hủy đơn hàng đang ở trạng thái ${trangThaiCu}.`);
  }

  const t = await sequelize.transaction();

  try {
    const [soDongCapNhat] = await DonHang.update(
      { TrangThai: 'CANCELLED' },
      {
        where: { MaDonHang: maDonHang, TrangThai: { [Op.in]: ['PENDING', 'CONFIRMED'] } },
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
        TrangThaiMoi: 'CANCELLED',
        MaNguoiThucHien: maNguoiThucHien,
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
