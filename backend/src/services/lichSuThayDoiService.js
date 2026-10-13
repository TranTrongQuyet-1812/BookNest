const { LichSuThayDoi } = require('../models');

// Chỉ ghi các trường nghiệp vụ được phép hiển thị trong nhật ký.
async function ghiNhanThayDoi({ loaiDoiTuong, maDoiTuong, maNhanVien, thayDoi, transaction }) {
  const cacTruong = Object.entries(thayDoi)
    .filter(([, giaTri]) => giaTri.cu !== giaTri.moi)
    .map(([truongDuLieu, giaTri]) => ({
      LoaiDoiTuong: loaiDoiTuong,
      MaDoiTuong: maDoiTuong,
      TruongDuLieu: truongDuLieu,
      GiaTriCu: giaTri.cu == null ? null : String(giaTri.cu),
      GiaTriMoi: giaTri.moi == null ? null : String(giaTri.moi),
      MaNhanVienThayDoi: maNhanVien
    }));

  if (cacTruong.length) await LichSuThayDoi.bulkCreate(cacTruong, { transaction });
}

module.exports = { ghiNhanThayDoi };
