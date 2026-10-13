const { Op } = require('sequelize');
const {
  sequelize, LichSuThayDoi, LichSuNhapKho, LichSuDieuChinhKho,
  LichSuTrangThaiDonHang, NhanVien
} = require('../models');
const LoiNghiepVu = require('../middlewares/loiNghiepVu');

const cacBangLichSu = [
  { ten: 'LichSuThayDoi', model: LichSuThayDoi, khoa: 'MaLichSuThayDoi', cotNgay: 'NgayThayDoi' },
  { ten: 'LichSuNhapKho', model: LichSuNhapKho, khoa: 'MaNhapKho', cotNgay: 'NgayNhap' },
  { ten: 'LichSuDieuChinhKho', model: LichSuDieuChinhKho, khoa: 'MaDieuChinhKho', cotNgay: 'NgayDieuChinh' },
  { ten: 'LichSuTrangThaiDonHang', model: LichSuTrangThaiDonHang, khoa: 'MaLichSu', cotNgay: 'NgayThayDoi' }
];

function taoDieuKienNgay(cotNgay, truocNgay) {
  return { [cotNgay]: { [Op.lt]: new Date(truocNgay) } };
}

async function layDanhSach({ page = 1, limit = 30, loaiDoiTuong, truongDuLieu, tuNgay, denNgay }) {
  const trang = Math.max(1, Number(page) || 1);
  const gioiHan = Math.min(100, Math.max(1, Number(limit) || 30));
  const where = {};
  if (loaiDoiTuong) where.LoaiDoiTuong = loaiDoiTuong;
  if (truongDuLieu) where.TruongDuLieu = truongDuLieu;
  if (tuNgay || denNgay) {
    where.NgayThayDoi = {};
    if (tuNgay) where.NgayThayDoi[Op.gte] = new Date(tuNgay);
    if (denNgay) where.NgayThayDoi[Op.lte] = new Date(denNgay);
  }
  const { rows, count } = await LichSuThayDoi.findAndCountAll({
    where, order: [['NgayThayDoi', 'DESC'], ['MaLichSuThayDoi', 'DESC']],
    limit: gioiHan, offset: (trang - 1) * gioiHan,
    include: [{ model: NhanVien, as: 'nhanVienThayDoi', attributes: ['MaNhanVien', 'HoTen', 'Email'] }]
  });
  return { danhSach: rows, phanTrang: { tongSoBanGhi: count, tongSoTrang: Math.ceil(count / gioiHan), trangHienTai: trang, soBanGhiMoiTrang: gioiHan } };
}

function taoDieuKienDonGiuLai(truocNgay) {
  return { [Op.and]: [taoDieuKienNgay('NgayThayDoi', truocNgay), { TrangThaiMoi: { [Op.ne]: 'DA_GIAO' } }] };
}

async function xemTruocDonDep(truocNgay) {
  const dieuKien = taoDieuKienDonGiuLai(truocNgay);
  const [soThayDoi, soNhapKho, soDieuChinhKho, soLichSuDon] = await Promise.all([
    LichSuThayDoi.count({ where: taoDieuKienNgay('NgayThayDoi', truocNgay) }),
    LichSuNhapKho.count({ where: taoDieuKienNgay('NgayNhap', truocNgay) }),
    LichSuDieuChinhKho.count({ where: taoDieuKienNgay('NgayDieuChinh', truocNgay) }),
    LichSuTrangThaiDonHang.count({ where: dieuKien })
  ]);
  return { truocNgay, soDongDuKien: soThayDoi + soNhapKho + soDieuChinhKho + soLichSuDon,
    theoBang: { LichSuThayDoi: soThayDoi, LichSuNhapKho: soNhapKho, LichSuDieuChinhKho: soDieuChinhKho, LichSuTrangThaiDonHang: soLichSuDon },
    soDongDaGiaoGiuLai: await LichSuTrangThaiDonHang.count({ where: { NgayThayDoi: { [Op.lt]: new Date(truocNgay) }, TrangThaiMoi: 'DA_GIAO' } }) };
}

async function donDepLichSu(truocNgay) {
  const ngay = new Date(truocNgay);
  if (Number.isNaN(ngay.valueOf()) || ngay >= new Date()) throw LoiNghiepVu.yeuCauKhongHopLe('Ngày dọn phải là một thời điểm trong quá khứ');
  const xemTruoc = await xemTruocDonDep(ngay.toISOString());
  if (xemTruoc.soDongDuKien === 0) return { ...xemTruoc, daXoa: {} };

  const t = await sequelize.transaction();
  try {
    const daXoa = {};
    for (const bang of cacBangLichSu) {
      const where = bang.ten === 'LichSuTrangThaiDonHang'
        ? taoDieuKienDonGiuLai(ngay.toISOString())
        : taoDieuKienNgay(bang.cotNgay, ngay.toISOString());
      daXoa[bang.ten] = await bang.model.destroy({ where, transaction: t });
    }
    await t.commit();
    return { ...xemTruoc, daXoa };
  } catch (loi) {
    await t.rollback();
    throw loi;
  }
}

module.exports = { layDanhSach, xemTruocDonDep, donDepLichSu };
