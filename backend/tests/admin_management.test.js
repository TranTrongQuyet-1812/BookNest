/**
 * Bộ kiểm thử tự động toàn diện cho Giai đoạn GĐ6: Quản Trị (T17 & T18).
 * Kiểm tra các tính năng: Quản lý nhân sự, khóa/mở khóa tài khoản (T17),
 * và Thống kê báo cáo doanh thu chuẩn xác (T18).
 */
const request = require('supertest');
const app = require('../src/app');
const { sequelize, NguoiDung } = require('../src/models');

describe('Kiểm thử Giai đoạn GĐ6: Quản Trị (T17 & T18)', () => {
  let tokenAdmin = '';
  let tokenThuThu = '';
  let tokenNhanVien = '';
  let tokenKhach = '';

  let maNhanVienTest = null;
  const emailNhanVienTest = `thuthu_test_${Date.now()}@booknest.vn`;
  const matKhauNhanVien = 'MatKhau@123';

  beforeAll(async () => {
    // Đăng nhập các vai trò
    const resAdmin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@booknest.vn', matKhau: 'BookNest@123' });
    tokenAdmin = resAdmin.body.data.token;

    const resThuThu = await request(app)
      .post('/api/auth/login')
      .send({ email: 'thuthu@booknest.vn', matKhau: 'BookNest@123' });
    tokenThuThu = resThuThu.body.data.token;

    const resNhanVien = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nhanvien@booknest.vn', matKhau: 'BookNest@123' });
    tokenNhanVien = resNhanVien.body.data.token;

    const resKhach = await request(app)
      .post('/api/auth/login')
      .send({ email: 'khach1@gmail.com', matKhau: 'BookNest@123' });
    tokenKhach = resKhach.body.data.token;
  });

  afterAll(async () => {
    // Dọn dẹp tài khoản test nếu có
    if (maNhanVienTest) {
      await NguoiDung.destroy({ where: { MaNguoiDung: maNhanVienTest } });
    }
    await sequelize.close();
  });

  // =========================================================================
  // TASK T17: QUẢN LÝ TÀI KHOẢN NHÂN SỰ (/api/admin/users)
  // =========================================================================
  describe('Task T17: Quản lý nhân sự & khóa tài khoản', () => {
    it('1. GET /api/admin/users: Chỉ Admin được xem; Khách và nhân viên bị chặn 403', async () => {
      const resKhach = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${tokenKhach}`);
      expect(resKhach.statusCode).toBe(403);

      const resStaff = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${tokenNhanVien}`);
      expect(resStaff.statusCode).toBe(403);

      const resAdmin = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${tokenAdmin}`);
      expect(resAdmin.statusCode).toBe(200);
      expect(Array.isArray(resAdmin.body.data.danhSach)).toBe(true);

      // Tuyệt đối không để lộ mật khẩu băm MatKhauHash
      const nguoiDau = resAdmin.body.data.danhSach[0];
      expect(nguoiDau.MatKhauHash).toBeUndefined();
    });

    it('2. POST /api/admin/users: Tạo tài khoản nhân viên vai trò librarian thành công', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          email: emailNhanVienTest,
          matKhau: matKhauNhanVien,
          hoTen: 'Nhân Viên Thủ Thư Test',
          vaiTro: 'librarian',
          soDienThoai: '0908889999'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.Email).toBe(emailNhanVienTest);
      expect(res.body.data.VaiTro).toBe('librarian');
      expect(res.body.data.MatKhauHash).toBeUndefined();
      maNhanVienTest = res.body.data.MaNguoiDung;
    });

    it('3. Đăng nhập bằng tài khoản nhân viên mới tạo thành công', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: emailNhanVienTest,
          matKhau: matKhauNhanVien
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.role).toBe('librarian');
    });

    it('4. POST /api/admin/users: Cố tình tạo tài khoản với role admin hoặc customer bị chặn 400', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          email: 'admin_gia@booknest.vn',
          matKhau: 'MatKhau@123',
          hoTen: 'Admin Giả Mạo',
          vaiTro: 'admin'
        });

      expect(res.statusCode).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('5. POST /api/admin/users: Tạo tài khoản trùng email trả về 409 Conflict', async () => {
      const res = await request(app)
        .post('/api/admin/users')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({
          email: emailNhanVienTest,
          matKhau: 'MatKhau@123',
          hoTen: 'Người Trùng',
          vaiTro: 'librarian'
        });

      expect(res.statusCode).toBe(409);
      expect(res.body.message).toContain('đã được sử dụng');
    });

    it('6. PUT /api/admin/users/:id/status: Admin tự khóa chính mình bị chặn 400', async () => {
      // Mã của admin@booknest.vn là 1
      const res = await request(app)
        .put('/api/admin/users/1/status')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ dangHoatDong: false });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain('không thể tự khóa tài khoản của chính mình');
    });

    it('7. PUT /api/admin/users/:id/status: Khóa tài khoản nhân viên test và chặn yêu cầu tiếp theo', async () => {
      // 1. Khóa tài khoản
      const resKhoa = await request(app)
        .put(`/api/admin/users/${maNhanVienTest}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ dangHoatDong: false });

      expect(resKhoa.statusCode).toBe(200);
      expect(resKhoa.body.data.DangHoatDong).toBe(false);

      // 2. Đăng nhập thử bằng tài khoản vừa bị khóa -> bị chặn 403
      const resDangNhap = await request(app)
        .post('/api/auth/login')
        .send({
          email: emailNhanVienTest,
          matKhau: matKhauNhanVien
        });

      expect(resDangNhap.statusCode).toBe(403);
      expect(resDangNhap.body.message).toContain('bị khóa');

      // 3. Mở khóa lại
      const resMoKhoa = await request(app)
        .put(`/api/admin/users/${maNhanVienTest}/status`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ dangHoatDong: true });
      expect(resMoKhoa.statusCode).toBe(200);
      expect(resMoKhoa.body.data.DangHoatDong).toBe(true);
    });
  });

  // =========================================================================
  // TASK T18: THỐNG KÊ DOANH THU & BÁO CÁO (/api/admin/stats)
  // =========================================================================
  describe('Task T18: Thống kê doanh thu & Báo cáo', () => {
    it('8. Khách hàng và nhân viên thường gọi route thống kê bị chặn 403', async () => {
      const resCust = await request(app)
        .get('/api/admin/stats/overview')
        .set('Authorization', `Bearer ${tokenKhach}`);
      expect(resCust.statusCode).toBe(403);

      const resStaff = await request(app)
        .get('/api/admin/stats/overview')
        .set('Authorization', `Bearer ${tokenNhanVien}`);
      expect(resStaff.statusCode).toBe(403);
    });

    it('9. GET /api/admin/stats/overview: Trả đúng tổng doanh thu, số đơn thành công, tổng sách đã bán', async () => {
      const res = await request(app)
        .get('/api/admin/stats/overview')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toHaveProperty('tongDoanhThu');
      expect(res.body.data).toHaveProperty('soDonThanhCong');
      expect(res.body.data).toHaveProperty('tongSachDaBan');

      // Trên dữ liệu seed có ít nhất 1 đơn DELIVERED (Đơn 4 có tổng tiền 295,000)
      expect(res.body.data.tongDoanhThu).toBeGreaterThanOrEqual(295000);
      expect(res.body.data.soDonThanhCong).toBeGreaterThanOrEqual(1);
      expect(res.body.data.tongSachDaBan).toBeGreaterThanOrEqual(2);
    });

    it('10. GET /api/admin/stats/top-books: Trả danh sách top sách bán chạy gom nhóm đúng', async () => {
      const res = await request(app)
        .get('/api/admin/stats/top-books?limit=5')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeLessThanOrEqual(5);

      if (res.body.data.length > 0) {
        const sachDau = res.body.data[0];
        expect(sachDau).toHaveProperty('maSach');
        expect(sachDau).toHaveProperty('tenSach');
        expect(sachDau).toHaveProperty('daBan');
        expect(sachDau).toHaveProperty('doanhThu');
      }
    });

    it('11. GET /api/admin/stats/order-rates: Trả tỷ lệ các trạng thái đơn hàng và tỷ lệ hoàn thành', async () => {
      const res = await request(app)
        .get('/api/admin/stats/order-rates')
        .set('Authorization', `Bearer ${tokenAdmin}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveProperty('tongSoDon');
      expect(res.body.data).toHaveProperty('tyLeHoanThanh');
      expect(res.body.data).toHaveProperty('tyLeHuy');
      expect(Array.isArray(res.body.data.chiTiet)).toBe(true);

      expect(res.body.data.tongSoDon).toBeGreaterThan(0);
      expect(res.body.data.tyLeHoanThanh).toBeGreaterThan(0);
    });
  });
});
