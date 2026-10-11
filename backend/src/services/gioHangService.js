/**
 * Tầng Service quản lý giỏ hàng của khách hàng (GioHang).
 * Mỗi khách hàng chỉ thao tác trên giỏ của chính mình, đảm bảo tính biệt lập dữ liệu.
 */
const { GioHang, Sach } = require('../models');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');

// Lấy danh sách sản phẩm trong giỏ của khách hàng kèm thông tin tạm tính và cảnh báo
async function layGioHang(maNguoiDung) {
  const cacMon = await GioHang.findAll({
    where: { MaNguoiDung: maNguoiDung },
    include: [
      {
        model: Sach,
        as: 'sach',
        attributes: ['MaSach', 'TenSach', 'GiaBan', 'SoLuongTon', 'AnhBia', 'DaAn']
      }
    ],
    order: [['NgayThem', 'DESC']]
  });

  let tongTienTamTinh = 0;
  let tongSoLuong = 0;

  const danhSachMon = cacMon.map(mon => {
    const sach = mon.sach;
    const donGia = sach ? parseFloat(sach.GiaBan) : 0;
    const soLuong = mon.SoLuong;
    const thanhTien = donGia * soLuong;

    let canhBao = null;
    if (!sach || sach.DaAn) {
      canhBao = 'Sách đã ngừng kinh doanh';
    } else if (soLuong > sach.SoLuongTon) {
      canhBao = `Số lượng trong giỏ (${soLuong}) vượt quá tồn kho hiện tại (${sach.SoLuongTon})`;
    } else {
      tongTienTamTinh += thanhTien;
      tongSoLuong += soLuong;
    }

    return {
      maSach: mon.MaSach,
      soLuong: mon.SoLuong,
      donGia,
      thanhTien,
      ngayThem: mon.NgayThem,
      sach: sach ? {
        maSach: sach.MaSach,
        tenSach: sach.TenSach,
        anhBia: sach.AnhBia,
        giaBan: donGia,
        soLuongTon: sach.SoLuongTon,
        daAn: sach.DaAn
      } : null,
      canhBao
    };
  });

  return {
    cacMon: danhSachMon,
    chiTiet: danhSachMon,
    tongSoMon: danhSachMon.length,
    tongSoLuong,
    tongTien: tongTienTamTinh,
    tongTienTamTinh
  };
}

// Thêm sách vào giỏ: cộng dồn số lượng nếu đã có, kiểm tra tồn kho
async function themVaoGio(maNguoiDung, { maSach, soLuong }) {
  const sach = await Sach.findByPk(maSach);
  if (!sach || sach.DaAn) {
    throw LoiNghiepVu.khongTimThay('Cuốn sách này không tồn tại hoặc đã ngừng kinh doanh');
  }

  const monHienCo = await GioHang.findOne({
    where: { MaNguoiDung: maNguoiDung, MaSach: maSach }
  });

  const soLuongMoi = monHienCo ? (monHienCo.SoLuong + soLuong) : soLuong;

  if (soLuongMoi > sach.SoLuongTon) {
    throw LoiNghiepVu.xungDot(
      `Không thể thêm vào giỏ. Tổng số lượng yêu cầu (${soLuongMoi}) vượt quá tồn kho hiện tại (${sach.SoLuongTon} cuốn)`
    );
  }

  if (monHienCo) {
    monHienCo.SoLuong = soLuongMoi;
    await monHienCo.save();
  } else {
    await GioHang.create({
      MaNguoiDung: maNguoiDung,
      MaSach: maSach,
      SoLuong: soLuong
    });
  }

  return layGioHang(maNguoiDung);
}

// Cập nhật số lượng của một cuốn sách trong giỏ
async function capNhatSoLuong(maNguoiDung, maSach, soLuong) {
  const monTrongGio = await GioHang.findOne({
    where: { MaNguoiDung: maNguoiDung, MaSach: maSach }
  });

  if (!monTrongGio) {
    throw LoiNghiepVu.khongTimThay('Sách không có trong giỏ hàng');
  }

  const sach = await Sach.findByPk(maSach);
  if (!sach || sach.DaAn) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Cuốn sách này đã ngừng kinh doanh');
  }

  if (soLuong > sach.SoLuongTon) {
    throw LoiNghiepVu.xungDot(
      `Số lượng cập nhật (${soLuong}) vượt quá tồn kho hiện tại (${sach.SoLuongTon} cuốn)`
    );
  }

  monTrongGio.SoLuong = soLuong;
  await monTrongGio.save();

  return layGioHang(maNguoiDung);
}

// Xóa một cuốn sách khỏi giỏ hàng
async function xoaKhoiGio(maNguoiDung, maSach) {
  const monTrongGio = await GioHang.findOne({
    where: { MaNguoiDung: maNguoiDung, MaSach: maSach }
  });

  if (!monTrongGio) {
    throw LoiNghiepVu.khongTimThay('Sách không có trong giỏ hàng');
  }

  await monTrongGio.destroy();
  return { thanhCong: true };
}

// Xóa toàn bộ giỏ hàng của người dùng
async function xoaToanBoGioHang(maNguoiDung) {
  await GioHang.destroy({ where: { MaNguoiDung: maNguoiDung } });
  return { thanhCong: true };
}

module.exports = {
  layGioHang,
  themVaoGio,
  capNhatSoLuong,
  xoaKhoiGio,
  xoaToanBoGioHang
};
