/**
 * Bộ kiểm thử tự động toàn diện cho Giai đoạn GĐ5: Mua Hàng (T12, T13, T14, T15, T16).
 * Kiểm tra các tính năng: Giỏ hàng, Đặt hàng (ACID, chống bán âm), Quản lý đơn khách (chống IDOR),
 * Xử lý đơn nhân viên (State Machine), và Đánh giá sách (chỉ khách đã mua).
 */
const request = require('supertest');
const app = require('../src/app');
const {
  sequelize,
  Sach,
  GioHang,
  DonHang,
  ChiTietDonHang,
  LichSuTrangThaiDonHang,
  DanhGia
} = require('../src/models');

describe('Kiểm thử Giai đoạn GĐ5: Mua Hàng (T12 - T16)', () => {
  let tokenAdmin = '';
  let tokenNhanVien = '';
  let tokenKhach1 = '';
  let tokenKhach2 = '';
  let tokenThuThu = '';

  let maDonHangTest = null;
  const maSachBanChay = 1; // Số Đỏ
  const maSachGiaTri = 5;  // Mắt Biếc
  const maSachTonIt = 6;   // Tôi Thấy Hoa Vàng Trên Cỏ Xanh (Tồn 3)
  const maSachHetHang = 7; // Nỗi Buồn Chiến Tranh (Tồn 0)

  beforeAll(async () => {
    // Đăng nhập các tài khoản mẫu từ seed
    const resAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@booknest.vn', matKhau: 'BookNest@123' });
    tokenAdmin = resAdmin.body.data.token;

    const resNhanVien = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nhanvien@booknest.vn', matKhau: 'BookNest@123' });
    tokenNhanVien = resNhanVien.body.data.token;

    const resKhach1 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'khach1@gmail.com', matKhau: 'BookNest@123' });
    tokenKhach1 = resKhach1.body.data.token;

    const resKhach2 = await request(app)
      .post('/api/auth/login')
      .send({ email: 'khach2@gmail.com', matKhau: 'BookNest@123' });
    tokenKhach2 = resKhach2.body.data.token;

    const resThuThu = await request(app)
      .post('/api/auth/login')
      .send({ email: 'thuthu@booknest.vn', matKhau: 'BookNest@123' });
    tokenThuThu = resThuThu.body.data.token;

    // Làm sạch giỏ hàng của Khách 1 và Khách 2 trước khi chạy test
    await GioHang.destroy({ where: { MaNguoiDung: [4, 5] } });
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu test phát sinh và bảo toàn tồn kho CSDL
    if (maDonHangTest) {
      const don = await DonHang.findByPk(maDonHangTest);
      if (don && don.TrangThai !== 'CANCELLED') {
        const chiTiets = await ChiTietDonHang.findAll({ where: { MaDonHang: maDonHangTest } });
        for (const ct of chiTiets) {
          await Sach.increment('SoLuongTon', { by: ct.SoLuong, where: { MaSach: ct.MaSach } });
        }
      }
      await LichSuTrangThaiDonHang.destroy({ where: { MaDonHang: maDonHangTest } });
      await ChiTietDonHang.destroy({ where: { MaDonHang: maDonHangTest } });
      await DonHang.destroy({ where: { MaDonHang: maDonHangTest } });
    }
    await sequelize.close();
  });

  // =========================================================================
  // TASK T12: GIỎ HÀNG (/api/cart)
  // =========================================================================
  describe('Task T12: Giỏ hàng', () => {
    it('1. Khách xem giỏ hàng ban đầu: giỏ rỗng, tổng tiền = 0', async () => {
      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${tokenKhach1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.cacMon).toEqual([]);
      expect(res.body.data.tongTien).toBe(0);
    });

    it('2. Thủ thư (librarian) hoặc người chưa đăng nhập gọi /api/cart bị chặn (403/401)', async () => {
      const resNoAuth = await request(app).get('/api/cart');
      expect(resNoAuth.statusCode).toBe(401);

      const resThuThu = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${tokenThuThu}`);
      expect(resThuThu.statusCode).toBe(403);
    });

    it('3. Thêm sách vào giỏ: Thêm cùng 1 cuốn 2 lần thì số lượng cộng dồn thành 1 dòng', async () => {
      // Lần 1: thêm 2 cuốn Số Đỏ
      const res1 = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${tokenKhach1}`)
        .send({ maSach: maSachBanChay, soLuong: 2 });
      expect(res1.statusCode).toBe(201);

      // Lần 2: thêm tiếp 3 cuốn Số Đỏ
      const res2 = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${tokenKhach1}`)
        .send({ maSach: maSachBanChay, soLuong: 3 });
      expect(res2.statusCode).toBe(201);
      expect(res2.body.data.cacMon.length).toBe(1);
      expect(res2.body.data.cacMon[0].soLuong).toBe(5);
    });

    it('4. Thêm sách vượt quá số lượng tồn kho trả về 409 Conflict', async () => {
      // Cuốn maSachTonIt (MaSach = 6) chỉ còn tồn 3 cuốn trong seed
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${tokenKhach1}`)
        .send({ maSach: maSachTonIt, soLuong: 10 });

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('vượt quá tồn kho');
    });

    it('5. Thêm sách đã ẩn (DaAn = 1) hoặc không tồn tại trả về 404', async () => {
      const res = await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${tokenKhach1}`)
        .send({ maSach: 8, soLuong: 1 }); // MaSach = 8 là Cánh Đồng Bất Tận (DaAn = 1)

      expect(res.statusCode).toBe(404);
    });

    it('6. Cập nhật số lượng món trong giỏ qua PUT /api/cart/items/:bookId', async () => {
      const res = await request(app)
        .put(`/api/cart/items/${maSachBanChay}`)
        .set('Authorization', `Bearer ${tokenKhach1}`)
        .send({ soLuong: 1 });

      expect(res.statusCode).toBe(200);
      const mon = res.body.data.cacMon.find(m => m.maSach === maSachBanChay);
      expect(mon.soLuong).toBe(1);
    });

    it('7. Xóa món khỏi giỏ qua DELETE /api/cart/items/:bookId', async () => {
      const res = await request(app)
        .delete(`/api/cart/items/${maSachBanChay}`)
        .set('Authorization', `Bearer ${tokenKhach1}`);

      expect(res.statusCode).toBe(200);

      // Kiểm tra lại giỏ đã rỗng
      const resXem = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${tokenKhach1}`);
      expect(resXem.body.data.cacMon.length).toBe(0);
    });
  });

  // =========================================================================
  // TASK T13: ĐẶT HÀNG (TRANSACTION & CHỐNG BÁN ÂM) (/api/orders)
  // =========================================================================
  describe('Task T13: Đặt hàng (Transaction, chống bán âm kho)', () => {
    it('8. Giỏ hàng rỗng khi đặt hàng phải trả về mã 400', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenKhach1}`)
        .send({
          tenNguoiNhan: 'Hoàng Khách Hàng',
          soDienThoaiNhan: '0914444555',
          diaChiGiaoHang: '123 Biên Hòa, Đồng Nai'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('trống');
    });

    it('9. Đặt hàng với số điện thoại sai định dạng trả về 400 Validation Error', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenKhach1}`)
        .send({
          tenNguoiNhan: 'Hoàng Khách Hàng',
          soDienThoaiNhan: '12345',
          diaChiGiaoHang: '123 Biên Hòa, Đồng Nai'
        });

      expect(res.statusCode).toBe(400);
      expect(JSON.stringify(res.body).toLowerCase()).toContain('số điện thoại');
    });

    it('10. Đặt hàng thành công: Giảm tồn kho, lưu đơn, ghi lịch sử, dọn sạch giỏ', async () => {
      // 1. Lấy tồn kho trước khi đặt
      const sachTruoc = await Sach.findByPk(maSachBanChay);
      const tonTruoc = sachTruoc.SoLuongTon;
      const giaSach = parseFloat(sachTruoc.GiaBan);

      // 2. Thêm 2 cuốn vào giỏ
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${tokenKhach1}`)
        .send({ maSach: maSachBanChay, soLuong: 2 });

      // 3. Đặt hàng (cố tình gửi TongTien sai 1000đ để kiểm chứng server tự tính)
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenKhach1}`)
        .send({
          tenNguoiNhan: 'Hoàng Khách Hàng',
          soDienThoaiNhan: '0914444555',
          diaChiGiaoHang: '123 Biên Hòa, Đồng Nai',
          ghiChu: 'Giao trong giờ hành chính',
          TongTien: 1000
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);

      const donHang = res.body.data;
      maDonHangTest = donHang.MaDonHang;
      expect(donHang.TrangThai).toBe('PENDING');
      expect(parseFloat(donHang.TongTien)).toBe(giaSach * 2); // Server tự tính chuẩn xác
      expect(donHang.chiTietDonHang.length).toBe(1);
      expect(donHang.lichSuTrangThai.length).toBe(1);
      expect(donHang.lichSuTrangThai[0].TrangThaiMoi).toBe('PENDING');

      // 4. Kiểm tra tồn kho đã giảm đúng 2 cuốn
      const sachSau = await Sach.findByPk(maSachBanChay);
      expect(sachSau.SoLuongTon).toBe(tonTruoc - 2);

      // 5. Kiểm tra giỏ hàng của khách đã được dọn sạch
      const resGio = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${tokenKhach1}`);
      expect(resGio.body.data.cacMon.length).toBe(0);
    });

    it('11. Kiểm chứng Rollback Transaction: Nếu 1 cuốn hết hàng thì toàn bộ đơn bị hủy, cuốn khác không bị trừ kho', async () => {
      // Lấy tồn kho cuốn 1 trước khi thử nghiệm
      const sach1Truoc = await Sach.findByPk(maSachBanChay);
      const ton1Truoc = sach1Truoc.SoLuongTon;

      // Thêm cuốn 1 (có hàng) vào giỏ
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${tokenKhach2}`)
        .send({ maSach: maSachBanChay, soLuong: 1 });

      // Giả lập chèn trực tiếp cuốn hết hàng (maSachHetHang = 7, Tồn 0) vào giỏ
      await GioHang.create({
        MaNguoiDung: 5, // Khách 2
        MaSach: maSachHetHang,
        SoLuong: 1
      });

      // Tiến hành đặt hàng -> Phải thất bại 409
      const resDat = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenKhach2}`)
        .send({
          tenNguoiNhan: 'Phạm Thu Thảo',
          soDienThoaiNhan: '0915555666',
          diaChiGiaoHang: '45 Võ Thị Sáu, Biên Hòa'
        });

      expect(resDat.statusCode).toBe(409);
      expect(resDat.body.message).toContain('không đủ số lượng tồn kho');

      // Tồn kho cuốn 1 TUYỆT ĐỐI không bị trừ (Rollback thành công)
      const sach1Sau = await Sach.findByPk(maSachBanChay);
      expect(sach1Sau.SoLuongTon).toBe(ton1Truoc);

      // Dọn giỏ khách 2
      await GioHang.destroy({ where: { MaNguoiDung: 5 } });
    });
  });

  // =========================================================================
  // TASK T14: ĐƠN HÀNG CỦA KHÁCH & CHỐNG IDOR (/api/orders/my-orders, cancel)
  // =========================================================================
  describe('Task T14: Đơn hàng của khách & Chống IDOR', () => {
    it('12. Khách 1 xem danh sách đơn của chính mình qua GET /api/orders/my-orders', async () => {
      const res = await request(app)
        .get('/api/orders/my-orders')
        .set('Authorization', `Bearer ${tokenKhach1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.danhSach.length).toBeGreaterThan(0);
      const coChuaDonVuaDat = res.body.data.danhSach.some(d => d.MaDonHang === maDonHangTest);
      expect(coChuaDonVuaDat).toBe(true);
    });

    it('13. Khách 1 xem chi tiết đơn của chính mình qua GET /api/orders/my-orders/:id', async () => {
      const res = await request(app)
        .get(`/api/orders/my-orders/${maDonHangTest}`)
        .set('Authorization', `Bearer ${tokenKhach1}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.MaDonHang).toBe(maDonHangTest);
      expect(res.body.data.chiTietDonHang).toBeDefined();
      expect(res.body.data.lichSuTrangThai).toBeDefined();
    });

    it('14. Chống IDOR: Khách 2 xem đơn của Khách 1 bị chặn mã 404', async () => {
      const res = await request(app)
        .get(`/api/orders/my-orders/${maDonHangTest}`)
        .set('Authorization', `Bearer ${tokenKhach2}`);

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toContain('Không tìm thấy');
    });

    it('15. Chống IDOR khi hủy: Khách 2 cố tình gửi yêu cầu hủy đơn của Khách 1 bị chặn 404', async () => {
      const res = await request(app)
        .put(`/api/orders/${maDonHangTest}/cancel`)
        .set('Authorization', `Bearer ${tokenKhach2}`)
        .send({ lyDo: 'Hủy trộm' });

      expect(res.statusCode).toBe(404);
    });

    it('16. Khách 1 tự hủy đơn PENDING thành công: Hoàn tồn kho và ghi lịch sử hủy', async () => {
      const sachTruoc = await Sach.findByPk(maSachBanChay);
      const tonTruoc = sachTruoc.SoLuongTon;

      const res = await request(app)
        .put(`/api/orders/${maDonHangTest}/cancel`)
        .set('Authorization', `Bearer ${tokenKhach1}`)
        .send({ lyDo: 'Đổi ý không mua nữa' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.TrangThai).toBe('CANCELLED');

      // Tồn kho được hoàn lại đúng 2 cuốn
      const sachSau = await Sach.findByPk(maSachBanChay);
      expect(sachSau.SoLuongTon).toBe(tonTruoc + 2);

      // Có dòng lịch sử PENDING -> CANCELLED
      const dongCuoi = res.body.data.lichSuTrangThai.slice(-1)[0];
      expect(dongCuoi.TrangThaiMoi).toBe('CANCELLED');
      expect(dongCuoi.GhiChu).toBe('Đổi ý không mua nữa');
    });

    it('17. Thử hủy lại đơn đã CANCELLED phải bị từ chối 409, không hoàn kho lần 2', async () => {
      const sachTruoc = await Sach.findByPk(maSachBanChay);
      const tonTruoc = sachTruoc.SoLuongTon;

      const res = await request(app)
        .put(`/api/orders/${maDonHangTest}/cancel`)
        .set('Authorization', `Bearer ${tokenKhach1}`)
        .send({ lyDo: 'Hủy lần 2' });

      expect(res.statusCode).toBe(409);

      // Tồn kho giữ nguyên
      const sachSau = await Sach.findByPk(maSachBanChay);
      expect(sachSau.SoLuongTon).toBe(tonTruoc);
    });
  });

  // =========================================================================
  // TASK T15: NHÂN VIÊN XỬ LÝ ĐƠN HÀNG (STATE MACHINE) (/api/admin/orders)
  // =========================================================================
  describe('Task T15: Nhân viên xử lý đơn (State Machine)', () => {
    let maDonNhanVienTest = null;

    beforeAll(async () => {
      // Khách 1 tạo 1 đơn hàng mới tinh để nhân viên xử lý
      await request(app)
        .post('/api/cart/items')
        .set('Authorization', `Bearer ${tokenKhach1}`)
        .send({ maSach: maSachBanChay, soLuong: 1 });

      const resDon = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${tokenKhach1}`)
        .send({
          tenNguoiNhan: 'Khách Test State Machine',
          soDienThoaiNhan: '0914444555',
          diaChiGiaoHang: 'Biên Hòa'
        });
      maDonNhanVienTest = resDon.body.data.MaDonHang;
    });

    afterAll(async () => {
      if (maDonNhanVienTest) {
        // Đơn maDonNhanVienTest đã trừ 1 cuốn maSachBanChay lúc tạo đơn, cần hoàn lại tồn kho trước khi xóa
        await Sach.increment('SoLuongTon', { by: 1, where: { MaSach: maSachBanChay } });
        await LichSuTrangThaiDonHang.destroy({ where: { MaDonHang: maDonNhanVienTest } });
        await ChiTietDonHang.destroy({ where: { MaDonHang: maDonNhanVienTest } });
        await DonHang.destroy({ where: { MaDonHang: maDonNhanVienTest } });
      }
    });

    it('18. Khách hàng hoặc Thủ thư gọi route /api/admin/orders bị chặn 403', async () => {
      const resCust = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${tokenKhach1}`);
      expect(resCust.statusCode).toBe(403);

      const resThuThu = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${tokenThuThu}`);
      expect(resThuThu.statusCode).toBe(403);
    });

    it('19. Nhân viên đơn hàng (order_staff) xem danh sách toàn bộ đơn hàng', async () => {
      const res = await request(app)
        .get('/api/admin/orders')
        .set('Authorization', `Bearer ${tokenNhanVien}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.danhSach.length).toBeGreaterThan(0);
      expect(res.body.data.danhSach[0]).toHaveProperty('nguoiDung');
    });

    it('20. Chuyển trạng thái nhảy cóc (PENDING -> SHIPPING) bị chặn 409 bởi State Machine', async () => {
      const res = await request(app)
        .put(`/api/admin/orders/${maDonNhanVienTest}/status`)
        .set('Authorization', `Bearer ${tokenNhanVien}`)
        .send({ trangThaiMoi: 'SHIPPING' });

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toContain('Không thể chuyển trạng thái');
    });

    it('21. Vòng đời chuẩn State Machine: PENDING -> CONFIRMED -> SHIPPING -> DELIVERED', async () => {
      // 1. PENDING -> CONFIRMED
      const res1 = await request(app)
        .put(`/api/admin/orders/${maDonNhanVienTest}/status`)
        .set('Authorization', `Bearer ${tokenNhanVien}`)
        .send({ trangThaiMoi: 'CONFIRMED', ghiChu: 'Đã xác nhận đơn' });
      expect(res1.statusCode).toBe(200);
      expect(res1.body.data.TrangThai).toBe('CONFIRMED');

      // 2. CONFIRMED -> SHIPPING
      const res2 = await request(app)
        .put(`/api/admin/orders/${maDonNhanVienTest}/status`)
        .set('Authorization', `Bearer ${tokenNhanVien}`)
        .send({ trangThaiMoi: 'SHIPPING', ghiChu: 'Đã bàn giao đơn vị vận chuyển' });
      expect(res2.statusCode).toBe(200);
      expect(res2.body.data.TrangThai).toBe('SHIPPING');

      // 3. SHIPPING -> DELIVERED
      const res3 = await request(app)
        .put(`/api/admin/orders/${maDonNhanVienTest}/status`)
        .set('Authorization', `Bearer ${tokenNhanVien}`)
        .send({ trangThaiMoi: 'DELIVERED', ghiChu: 'Khách đã nhận hàng thành công' });
      expect(res3.statusCode).toBe(200);
      expect(res3.body.data.TrangThai).toBe('DELIVERED');

      // Kiểm tra lịch sử dòng thời gian có đủ 4 nấc
      expect(res3.body.data.lichSuTrangThai.length).toBe(4);
    });

    it('22. Đơn đã DELIVERED không thể hủy (409 Conflict)', async () => {
      const res = await request(app)
        .put(`/api/admin/orders/${maDonNhanVienTest}/cancel`)
        .set('Authorization', `Bearer ${tokenNhanVien}`)
        .send({ lyDo: 'Khách đòi hủy sau khi đã nhận' });

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toContain('Không thể hủy');
    });
  });

  // =========================================================================
  // TASK T16: ĐÁNH GIÁ SÁCH (CHỈ KHÁCH ĐÃ MUA MỚI ĐƯỢC ĐÁNH GIÁ) (/api/books/:id/reviews)
  // =========================================================================
  describe('Task T16: Đánh giá sách', () => {
    afterAll(async () => {
      // Dọn dẹp đánh giá test
      await DanhGia.destroy({ where: { MaNguoiDung: 4, MaSach: maSachGiaTri } });
    });

    it('23. Khách chưa mua hoặc chưa nhận sách bị từ chối đánh giá (403 Forbidden)', async () => {
      // Khách 2 chưa có đơn DELIVERED nào chứa cuốn maSachGiaTri
      const res = await request(app)
        .post(`/api/books/${maSachGiaTri}/reviews`)
        .set('Authorization', `Bearer ${tokenKhach2}`)
        .send({ soSao: 5, noiDung: 'Sách rất hay nhưng tôi chưa mua' });

      expect(res.statusCode).toBe(403);
      expect(res.body.message).toContain('Bạn cần mua và nhận sách');
    });

    it('24. Đánh giá số sao không hợp lệ (soSao = 0 hoặc 6) trả về 400', async () => {
      const res = await request(app)
        .post(`/api/books/${maSachGiaTri}/reviews`)
        .set('Authorization', `Bearer ${tokenKhach1}`)
        .send({ soSao: 6 });

      expect(res.statusCode).toBe(400);
    });

    it('25. Khách 1 đã có đơn DELIVERED chứa sách đánh giá thành công (5 sao)', async () => {
      const res = await request(app)
        .post(`/api/books/${maSachGiaTri}/reviews`)
        .set('Authorization', `Bearer ${tokenKhach1}`)
        .send({ soSao: 5, noiDung: 'Tác phẩm văn học trào phúng tuyệt vời!' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.SoSao).toBe(5);
    });

    it('26. Khách 1 đánh giá lại (3 sao) thì cập nhật đánh giá cũ (Upsert, không tạo dòng mới)', async () => {
      const res = await request(app)
        .post(`/api/books/${maSachGiaTri}/reviews`)
        .set('Authorization', `Bearer ${tokenKhach1}`)
        .send({ soSao: 3, noiDung: 'Đọc lại thấy bình thường' });

      expect(res.statusCode).toBe(201);
      expect(res.body.data.SoSao).toBe(3);

      // Kiểm tra DB chỉ có đúng 1 bản ghi
      const soBanGhi = await DanhGia.count({
        where: { MaNguoiDung: 4, MaSach: maSachGiaTri }
      });
      expect(soBanGhi).toBe(1);
    });

    it('27. Xem danh sách đánh giá công khai: kèm sao trung bình, không lộ email', async () => {
      const res = await request(app).get(`/api/books/${maSachGiaTri}/reviews`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data.danhSach.length).toBeGreaterThan(0);
      expect(res.body.data.thongKe).toBeDefined();
      expect(res.body.data.thongKe.saoTrungBinh).toBeGreaterThan(0);

      // Người dùng chỉ hiển thị HoTen, không có Email
      const danhGiaDau = res.body.data.danhSach[0];
      expect(danhGiaDau.nguoiDung).toBeDefined();
      expect(danhGiaDau.nguoiDung.HoTen).toBeDefined();
      expect(danhGiaDau.nguoiDung.Email).toBeUndefined();
    });
  });
});
