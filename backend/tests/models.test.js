/**
 * Kiểm thử tích hợp các Model Sequelize và các mối quan hệ (Associations).
 */
const {
  sequelize,
  NguoiDung,
  DanhMuc,
  Sach,
  GioHang,
  DonHang,
  ChiTietDonHang,
  DanhGia,
  LichSuNhapKho,
  LichSuTrangThaiDonHang
} = require('../src/models');

describe('Kiểm thử 9 Model Sequelize và các mối quan hệ bảng', () => {
  afterAll(async () => {
    await sequelize.close();
  });

  it('1. Đọc dữ liệu thành công từ cả 9 Model Sequelize', async () => {
    const soNguoiDung = await NguoiDung.count();
    const soDanhMuc = await DanhMuc.count();
    const soSach = await Sach.count();
    const soGioHang = await GioHang.count();
    const soDonHang = await DonHang.count();
    const soChiTiet = await ChiTietDonHang.count();
    const soDanhGia = await DanhGia.count();
    const soNhapKho = await LichSuNhapKho.count();
    const soLichSuTrangThai = await LichSuTrangThaiDonHang.count();

    expect(soNguoiDung).toBeGreaterThan(0);
    expect(soDanhMuc).toBeGreaterThan(0);
    expect(soSach).toBeGreaterThan(0);
    expect(soGioHang).toBeGreaterThanOrEqual(0);
    expect(soDonHang).toBeGreaterThan(0);
    expect(soChiTiet).toBeGreaterThan(0);
    expect(soDanhGia).toBeGreaterThan(0);
    expect(soNhapKho).toBeGreaterThan(0);
    expect(soLichSuTrangThai).toBeGreaterThan(0);
  });

  it('2. Quan hệ DanhMuc ↔ Sach: Truy vấn sách kèm danh mục', async () => {
    const sach = await Sach.findOne({
      where: { MaSach: 1 },
      include: [{ model: DanhMuc, as: 'danhMuc' }]
    });

    expect(sach).not.toBeNull();
    expect(sach.TenSach).toBe('Số Đỏ');
    expect(sach.danhMuc).not.toBeNull();
    expect(sach.danhMuc.TenDanhMuc).toBe('Văn Học');
  });

  it('3. Quan hệ DonHang ↔ NguoiDung & ChiTietDonHang: Truy vấn đơn hàng kèm khách và chi tiết sách', async () => {
    const donHang = await DonHang.findOne({
      where: { MaDonHang: 1 },
      include: [
        { model: NguoiDung, as: 'nguoiDung' },
        {
          model: ChiTietDonHang,
          as: 'chiTietDonHang',
          include: [{ model: Sach, as: 'sach' }]
        },
        { model: LichSuTrangThaiDonHang, as: 'lichSuTrangThai' }
      ]
    });

    expect(donHang).not.toBeNull();
    expect(donHang.nguoiDung).not.toBeNull();
    expect(donHang.nguoiDung.HoTen).toBe('Hoàng Khách Hàng');
    expect(donHang.chiTietDonHang.length).toBe(2);
    expect(donHang.chiTietDonHang[0].sach).not.toBeNull();
    expect(donHang.lichSuTrangThai.length).toBeGreaterThan(0);
  });

  it('4. Quan hệ Sach ↔ DanhGia: Truy vấn đánh giá của sách kèm người đánh giá', async () => {
    const danhGia = await DanhGia.findOne({
      where: { MaDanhGia: 1 },
      include: [
        { model: Sach, as: 'sach' },
        { model: NguoiDung, as: 'nguoiDung' }
      ]
    });

    expect(danhGia).not.toBeNull();
    expect(danhGia.SoSao).toBe(5);
    expect(danhGia.sach).not.toBeNull();
    expect(danhGia.nguoiDung).not.toBeNull();
  });
});
