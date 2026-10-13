const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { pipeline } = require('node:stream/promises');
const { createReadStream, createWriteStream } = require('node:fs');
const readline = require('node:readline');
const { Op } = require('sequelize');
const {
  sequelize, LichSuThayDoi, LichSuNhapKho, LichSuDieuChinhKho,
  LichSuTrangThaiDonHang, NhanVien, Sach
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

function layThuMucLuuTru() {
  return path.resolve(process.env.BOOKNEST_ARCHIVE_DIR || path.join(os.homedir(), 'BookNestHistoryArchive'));
}

function kiemTraThuMucNgoaiDuAn(thuMuc) {
  const thuMucDuAn = path.resolve(__dirname, '../../../');
  const duongDanTuongDoi = path.relative(thuMucDuAn, thuMuc);
  if (!duongDanTuongDoi || (!duongDanTuongDoi.startsWith('..') && !path.isAbsolute(duongDanTuongDoi))) {
    throw LoiNghiepVu.yeuCauKhongHopLe('Thư mục lưu trữ phải nằm ngoài mã nguồn dự án');
  }
}

async function ghiDongJsonl(duongDan, tenBang, model, khoa, where) {
  const handle = await fs.open(duongDan, 'a');
  let daGhi = 0;
  let khoaCuoi = 0;
  try {
    while (true) {
      const dong = await model.findAll({
        where: { [Op.and]: [where, { [khoa]: { [Op.gt]: khoaCuoi } }] },
        order: [[khoa, 'ASC']], limit: 500, raw: true
      });
      if (!dong.length) break;
      for (const banGhi of dong) {
        await handle.appendFile(`${JSON.stringify({ bang: tenBang, banGhi })}\n`, 'utf8');
        khoaCuoi = banGhi[khoa];
        daGhi += 1;
      }
    }
    await handle.sync();
  } finally {
    await handle.close();
  }
  return daGhi;
}

async function taoLuuTru(truocNgay) {
  let thuMuc = layThuMucLuuTru();
  kiemTraThuMucNgoaiDuAn(thuMuc);
  await fs.mkdir(thuMuc, { recursive: true });
  thuMuc = await fs.realpath(thuMuc);
  kiemTraThuMucNgoaiDuAn(thuMuc);
  const mocThoiGian = new Date().toISOString().replace(/[:.]/g, '-');
  const tenFile = `booknest-history-${mocThoiGian}.jsonl.gz`;
  const duongDanJsonl = path.join(thuMuc, `${tenFile}.raw`);
  const duongDanTam = path.join(thuMuc, `${tenFile}.partial`);
  const duongDan = path.join(thuMuc, tenFile);
  const dieuKienDon = taoDieuKienDonGiuLai(truocNgay);
  const dem = {};

  try {
    for (const bang of cacBangLichSu) {
      const where = bang.ten === 'LichSuTrangThaiDonHang'
        ? dieuKienDon : taoDieuKienNgay(bang.cotNgay, truocNgay);
      dem[bang.ten] = await ghiDongJsonl(duongDanJsonl, bang.ten, bang.model, bang.khoa, where);
    }
    await pipeline(createReadStream(duongDanJsonl), zlib.createGzip({ level: 9 }), createWriteStream(duongDanTam, { flags: 'wx' }));
    const demDaKiem = Object.fromEntries(cacBangLichSu.map(bang => [bang.ten, 0]));
    const luongGiaiNen = readline.createInterface({ input: createReadStream(duongDanTam).pipe(zlib.createGunzip()), crlfDelay: Infinity });
    for await (const dong of luongGiaiNen) {
      const banGhi = JSON.parse(dong);
      if (!Object.hasOwn(demDaKiem, banGhi.bang) || !banGhi.banGhi) throw new Error('Bản lưu trữ có cấu trúc không hợp lệ');
      demDaKiem[banGhi.bang] += 1;
    }
    if (JSON.stringify(demDaKiem) !== JSON.stringify(dem)) throw new Error('Số dòng trong bản lưu trữ không khớp dữ liệu nguồn');
    const noiDungHash = crypto.createHash('sha256');
    const luong = createReadStream(duongDanTam);
    for await (const phan of luong) noiDungHash.update(phan);
    const sha256 = noiDungHash.digest('hex');
    await fs.rename(duongDanTam, duongDan);
    await fs.rm(duongDanJsonl, { force: true });
    const manifest = { tenFile, truocNgay, taoLuc: new Date().toISOString(), dem, sha256, dinhDang: 'JSONL UTF-8 nén gzip; SHA-256 tính trên tệp gzip' };
    await fs.writeFile(`${duongDan}.manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
    return { thuMuc, tenFile, sha256, dem };
  } catch (loi) {
    await fs.rm(duongDanTam, { force: true });
    await fs.rm(duongDanJsonl, { force: true });
    throw loi;
  }
}

async function donDepLichSu(truocNgay) {
  const ngay = new Date(truocNgay);
  if (Number.isNaN(ngay.valueOf()) || ngay >= new Date()) throw LoiNghiepVu.yeuCauKhongHopLe('Ngày dọn phải là một thời điểm trong quá khứ');
  const xemTruoc = await xemTruocDonDep(ngay.toISOString());
  if (xemTruoc.soDongDuKien === 0) return { ...xemTruoc, daXoa: {}, luuTru: null };

  const luuTru = await taoLuuTru(ngay.toISOString());
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
    return { ...xemTruoc, daXoa, luuTru };
  } catch (loi) {
    await t.rollback();
    throw loi;
  }
}

module.exports = { layDanhSach, xemTruocDonDep, donDepLichSu };
