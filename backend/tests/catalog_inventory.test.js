/**
 * Bộ kiểm thử tự động toàn diện cho Giai đoạn GĐ4: Sách & Kho (T09, T10, T11).
 * Sử dụng Jest + Supertest kiểm tra trực tiếp qua API HTTP.
 */
const request = require('supertest');
const app = require('../src/app');
const { sequelize, DanhMuc, Sach, LichSuNhapKho } = require('../src/models');

describe('Kiểm thử Giai đoạn GĐ4: Sách & Kho (T09, T10, T11)', () => {
  let tokenAdmin = '';
  let tokenThuThu = '';
  let tokenKhach = '';
  let maDanhMucTest = null;
  let maSachTest = null;

  beforeAll(async () => {
    // Đăng nhập 3 vai trò: Admin, Thủ thư (Librarian), Khách hàng (Customer)
    const resAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@booknest.vn', matKhau: 'BookNest@123' });
    tokenAdmin = resAdmin.body.data.token;

    const resThuThu = await request(app)
      .post('/api/auth/login')
      .send({ email: 'thuthu@booknest.vn', matKhau: 'BookNest@123' });
    tokenThuThu = resThuThu.body.data.token;

    const resKhach = await request(app)
      .post('/api/auth/login')
      .send({ email: 'khach1@gmail.com', matKhau: 'BookNest@123' });
    tokenKhach = resKhach.body.data.token;
  });

  afterAll(async () => {
    // Dọn dẹp dữ liệu test nếu còn sót lại
    if (maSachTest) {
      await LichSuNhapKho.destroy({ where: { MaSach: maSachTest } });
      await Sach.destroy({ where: { MaSach: maSachTest } });
    }
    if (maDanhMucTest) {
      await DanhMuc.destroy({ where: { MaDanhMuc: maDanhMucTest } });
    }
    await sequelize.close();
  });

  // =========================================================================
  // TASK T09: QUẢN LÝ DANH MỤC THỂ LOẠI SÁCH (/api/categories)
  // =========================================================================
  describe('Task T09: Quản lý danh mục', () => {
    it('1. GET /api/categories: Công khai, trả kèm số lượng sách chưa ẩn', async () => {
      const res = await request(app).get('/api/categories');
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);

      const danhMucDau = res.body.data[0];
      expect(danhMucDau).toHaveProperty('MaDanhMuc');
      expect(danhMucDau).toHaveProperty('TenDanhMuc');
      expect(danhMucDau).toHaveProperty('soLuongSach');
    });

    it('2. POST /api/categories: Khách chưa đăng nhập bị chặn 401, customer bị chặn 403', async () => {
      // Chưa đăng nhập
      const resKhongToken = await request(app)
        .post('/api/categories')
        .send({ tenDanhMuc: 'Thể Loại Không Quyền' });
      expect(resKhongToken.statusCode).toBe(401);

      // Customer
      const resCust = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${tokenKhach}`)
        .send({ tenDanhMuc: 'Thể Loại Customer' });
      expect(resCust.statusCode).toBe(403);
    });

    it('3. POST /api/categories: Thủ thư tạo danh mục thành công', async () => {
      const tenMoi = `Thể Loại Test_${Date.now()}`;
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${tokenThuThu}`)
        .send({ tenDanhMuc: tenMoi, moTa: 'Mô tả thể loại kiểm thử T09' });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.TenDanhMuc).toBe(tenMoi);
      maDanhMucTest = res.body.data.MaDanhMuc;
    });

    it('4. POST /api/categories: Tạo danh mục trùng tên trả về 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ tenDanhMuc: 'Văn Học' }); // Danh mục có sẵn từ seed

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('đã tồn tại');
    });

    it('5. POST /api/categories: Dữ liệu không hợp lệ trả về 400', async () => {
      const res = await request(app)
        .post('/api/categories')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ tenDanhMuc: ' ' });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('6. PUT /api/categories/:id: Cập nhật danh mục thành công', async () => {
      const tenCapNhat = `Thể Loại Đổi Tên_${Date.now()}`;
      const res = await request(app)
        .put(`/api/categories/${maDanhMucTest}`)
        .set('Authorization', `Bearer ${tokenThuThu}`)
        .send({ tenDanhMuc: tenCapNhat, moTa: 'Mô tả sau cập nhật' });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.TenDanhMuc).toBe(tenCapNhat);
    });

    it('7. PUT /api/categories/:id: Sửa danh mục không tồn tại trả về 404', async () => {
      const res = await request(app)
        .put('/api/categories/999999')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ tenDanhMuc: 'Danh Mục Ảo' });

      expect(res.statusCode).toBe(404);
    });

    it('8. DELETE /api/categories/:id: Xóa danh mục còn sách phải bị chặn 409', async () => {
      // Danh mục 1 (Văn Học) chứa nhiều sách trong DB
      const res = await request(app)
        .delete('/api/categories/1')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.statusCode).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('vẫn còn');
    });

    it('9. DELETE /api/categories/:id: Xóa danh mục rỗng thành công', async () => {
      const res = await request(app)
        .delete(`/api/categories/${maDanhMucTest}`)
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      maDanhMucTest = null; // Đã xóa
    });
  });

  // =========================================================================
  // TASK T10: SÁCH - TÌM KIẾM, LỌC, PHÂN TRANG, CRUD (/api/books)
  // =========================================================================
  describe('Task T10: Sách - Tìm kiếm, Lọc, CRUD', () => {
    it('10. GET /api/books: Tìm kiếm tiếng Việt không dấu (Collation Vietnamese_CI_AI)', async () => {
      // Tìm 'nguyen nhat anh' không dấu
      const res = await request(app).get('/api/books?search=nguyen nhat anh');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.danhSach.length).toBeGreaterThan(0);
      const coChuaTacGia = res.body.data.danhSach.some(s => s.TacGia.includes('Nguyễn Nhật Ánh'));
      expect(coChuaTacGia).toBe(true);
    });

    it('11. GET /api/books: Tìm kiếm tên sách có dấu', async () => {
      const res = await request(app).get('/api/books?search=Số Đỏ');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.danhSach.length).toBeGreaterThan(0);
      expect(res.body.data.danhSach[0].TenSach).toBe('Số Đỏ');
    });

    it('12. GET /api/books: Chống SQL Injection trong ô tìm kiếm an toàn', async () => {
      const res = await request(app).get("/api/books?search=' OR 1=1 --");
      expect(res.statusCode).toBe(200);
      // Kết quả không được dump toàn bộ sách do lỗi logic hay gây sập SQL
      expect(res.body.success).toBe(true);
    });

    it('13. GET /api/books: Lọc theo thể loại categoryId', async () => {
      const res = await request(app).get('/api/books?categoryId=1');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.danhSach.length).toBeGreaterThan(0);
      const tatCaDanhMuc1 = res.body.data.danhSach.every(s => s.MaDanhMuc === 1);
      expect(tatCaDanhMuc1).toBe(true);
    });

    it('14. GET /api/books: Lọc theo khoảng giá minPrice & maxPrice', async () => {
      const res = await request(app).get('/api/books?minPrice=50000&maxPrice=100000');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.danhSach.length).toBeGreaterThan(0);
      const dungKhoangGia = res.body.data.danhSach.every(
        s => parseFloat(s.GiaBan) >= 50000 && parseFloat(s.GiaBan) <= 100000
      );
      expect(dungKhoangGia).toBe(true);
    });

    it('15. GET /api/books: minPrice > maxPrice trả về 400', async () => {
      const res = await request(app).get('/api/books?minPrice=100000&maxPrice=50000');
      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('16. GET /api/books: Sắp xếp theo giá tăng dần (price_asc)', async () => {
      const res = await request(app).get('/api/books?sort=price_asc&limit=5');
      expect(res.statusCode).toBe(200);
      const ds = res.body.data.danhSach;
      for (let i = 0; i < ds.length - 1; i++) {
        expect(parseFloat(ds[i].GiaBan)).toBeLessThanOrEqual(parseFloat(ds[i + 1].GiaBan));
      }
    });

    it('17. GET /api/books: Phân trang trả đúng metadata và giới hạn tối đa 50', async () => {
      const res = await request(app).get('/api/books?page=1&limit=5');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.danhSach.length).toBeLessThanOrEqual(5);
      expect(res.body.data.phanTrang).toBeDefined();
      expect(res.body.data.phanTrang.trangHienTai).toBe(1);
      expect(res.body.data.phanTrang.soBanGhiMoiTrang).toBe(5);
      expect(res.body.data.phanTrang.tongSoBanGhi).toBeGreaterThan(0);

      // Thử limit vượt mức tối đa -> ép về tối đa 50
      const resOver = await request(app).get('/api/books?limit=1000');
      expect(resOver.statusCode).toBe(400); // Joi chặn max(50)
    });

    it('18. GET /api/books: Sách bị ẩn (DaAn = 1) không xuất hiện ở danh sách công khai', async () => {
      const res = await request(app).get('/api/books?limit=50');
      expect(res.statusCode).toBe(200);
      // Cuốn MaSach = 8 (Cánh Đồng Bất Tận) có DaAn = 1 trong seed
      const coSachAn = res.body.data.danhSach.some(s => s.MaSach === 8);
      expect(coSachAn).toBe(false);
    });

    it('19. GET /api/books/:id: Xem chi tiết sách công khai kèm danh mục và số sao', async () => {
      const res = await request(app).get('/api/books/1');
      expect(res.statusCode).toBe(200);
      expect(res.body.data.MaSach).toBe(1);
      expect(res.body.data.danhMuc).toBeDefined();
      expect(res.body.data.danhMuc.TenDanhMuc).toBe('Văn Học');
      expect(res.body.data).toHaveProperty('soSaoTrungBinh');
      expect(res.body.data).toHaveProperty('soLuotDanhGia');
    });

    it('20. GET /api/books/:id: Sách bị ẩn trả về 404 cho khách thường, nhưng Admin xem được', async () => {
      // Khách thường xem sách ẩn 8 -> 404
      const resKhach = await request(app).get('/api/books/8');
      expect(resKhach.statusCode).toBe(404);

      // Admin xem sách ẩn 8 kèm Token -> 200
      const resAdmin = await request(app)
        .get('/api/books/8')
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(resAdmin.statusCode).toBe(200);
      expect(resAdmin.body.data.MaSach).toBe(8);
      expect(resAdmin.body.data.DaAn).toBe(true);
    });

    it('21. GET /api/admin/books: Quyền admin/librarian xem được toàn bộ sách kể cả sách ẩn', async () => {
      // Customer gọi -> 403
      const resCust = await request(app)
        .get('/api/admin/books')
        .set('Authorization', `Bearer ${tokenKhach}`);
      expect(resCust.statusCode).toBe(403);

      // Admin gọi -> 200 và thấy sách DaAn = true
      const resAdmin = await request(app)
        .get('/api/admin/books?limit=50')
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(resAdmin.statusCode).toBe(200);
      const coSachAn = resAdmin.body.data.danhSach.some(s => s.DaAn === true);
      expect(coSachAn).toBe(true);
    });

    it('22. POST /api/books: Tạo sách mới với tồn kho > 0 tự động ghi LichSuNhapKho trong transaction', async () => {
      const res = await request(app)
        .post('/api/books')
        .set('Authorization', `Bearer ${tokenThuThu}`)
        .send({
          tenSach: `Sách Mới Test_${Date.now()}`,
          tacGia: 'Tác Giả Kiểm Thử',
          moTa: 'Mô tả sách kiểm thử tự động',
          giaBan: 99000,
          soLuongTon: 15,
          nguongCanhBao: 5,
          maDanhMuc: 1
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.SoLuongTon).toBe(15);
      maSachTest = res.body.data.MaSach;

      // Kiểm tra bảng LichSuNhapKho có ghi nhận đợt nhập ban đầu này không
      const lichSu = await LichSuNhapKho.findOne({ where: { MaSach: maSachTest } });
      expect(lichSu).not.toBeNull();
      expect(lichSu.SoLuongNhap).toBe(15);
      expect(lichSu.GhiChu).toContain('ban đầu');
    });

    it('23. PUT /api/books/:id: Cập nhật thông tin sách (không sửa trực tiếp tồn kho)', async () => {
      const res = await request(app)
        .put(`/api/books/${maSachTest}`)
        .set('Authorization', `Bearer ${tokenThuThu}`)
        .send({
          tenSach: 'Sách Đã Cập Nhật Tên',
          giaBan: 105000
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.TenSach).toBe('Sách Đã Cập Nhật Tên');
      expect(parseFloat(res.body.data.GiaBan)).toBe(105000);
      expect(res.body.data.SoLuongTon).toBe(15); // Tồn kho giữ nguyên
    });

    it('24. DELETE /api/books/:id: Xóa mềm sách (DaAn = 1), sau đó khôi phục lại qua PUT', async () => {
      // 1. Xóa mềm
      const resXoa = await request(app)
        .delete(`/api/books/${maSachTest}`)
        .set('Authorization', `Bearer ${tokenThuThu}`);
      expect(resXoa.statusCode).toBe(200);

      // 2. Khách ngoài truy vấn -> 404
      const resXemKhach = await request(app).get(`/api/books/${maSachTest}`);
      expect(resXemKhach.statusCode).toBe(404);

      // 3. Khôi phục sách
      const resKhoiPhuc = await request(app)
        .put(`/api/books/${maSachTest}`)
        .set('Authorization', `Bearer ${tokenThuThu}`)
        .send({ daAn: false });
      expect(resKhoiPhuc.statusCode).toBe(200);
      expect(resKhoiPhuc.body.data.DaAn).toBe(false);
    });
  });

  // =========================================================================
  // TASK T11: NHẬP KHO & CẢNH BÁO SẮP HẾT HÀNG (/api/books/low-stock, stock-in)
  // =========================================================================
  describe('Task T11: Nhập kho & Cảnh báo sắp hết', () => {
    it('25. GET /api/books/low-stock: Không bị nhầm lẫn với route :id, chỉ admin/librarian được xem', async () => {
      // Customer -> 403
      const resCust = await request(app)
        .get('/api/books/low-stock')
        .set('Authorization', `Bearer ${tokenKhach}`);
      expect(resCust.statusCode).toBe(403);

      // Thủ thư -> 200, danh sách sách có SoLuongTon <= NguongCanhBao
      const resThuThu = await request(app)
        .get('/api/books/low-stock')
        .set('Authorization', `Bearer ${tokenThuThu}`);
      expect(resThuThu.statusCode).toBe(200);
      expect(Array.isArray(resThuThu.body.data)).toBe(true);

      const sapHet = resThuThu.body.data;
      sapHet.forEach(s => {
        expect(s.SoLuongTon).toBeLessThanOrEqual(s.NguongCanhBao);
        expect(s.DaAn).toBe(false);
      });
    });

    it('26. POST /api/books/:id/stock-in: Nhập kho số lượng âm hoặc 0 trả về 400', async () => {
      const res = await request(app)
        .post(`/api/books/${maSachTest}/stock-in`)
        .set('Authorization', `Bearer ${tokenThuThu}`)
        .send({ soLuongNhap: -5 });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('27. POST /api/books/:id/stock-in: Nhập kho hợp lệ tăng tồn kho nguyên tử và ghi lịch sử', async () => {
      const tonTruoc = 15;
      const soNhap = 25;

      const res = await request(app)
        .post(`/api/books/${maSachTest}/stock-in`)
        .set('Authorization', `Bearer ${tokenThuThu}`)
        .send({ soLuongNhap: soNhap, ghiChu: 'Nhập bổ sung đợt 2' });

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.SoLuongTon).toBe(tonTruoc + soNhap);

      // Kiểm tra GET /api/books/:id/stock-in-history
      const resLichSu = await request(app)
        .get(`/api/books/${maSachTest}/stock-in-history`)
        .set('Authorization', `Bearer ${tokenThuThu}`);

      expect(resLichSu.statusCode).toBe(200);
      expect(resLichSu.body.data.length).toBeGreaterThanOrEqual(2); // Đợt ban đầu + Đợt 2
      const lanNhapMoiNhat = resLichSu.body.data[0];
      expect(lanNhapMoiNhat.SoLuongNhap).toBe(soNhap);
      expect(lanNhapMoiNhat.GhiChu).toBe('Nhập bổ sung đợt 2');
      expect(lanNhapMoiNhat.nguoiNhap).toBeDefined();
      expect(lanNhapMoiNhat.nguoiNhap.Email).toBe('thuthu@booknest.vn');
    });

    it('28. POST /api/books/:id/stock-in: Không cho phép nhập kho cho sách đã bị ẩn', async () => {
      // Ẩn cuốn sách test
      await Sach.update({ DaAn: true }, { where: { MaSach: maSachTest } });

      const res = await request(app)
        .post(`/api/books/${maSachTest}/stock-in`)
        .set('Authorization', `Bearer ${tokenThuThu}`)
        .send({ soLuongNhap: 10 });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('đã bị ẩn');

      // Khôi phục lại
      await Sach.update({ DaAn: false }, { where: { MaSach: maSachTest } });
    });
  });
});
