/**
 * Kiểm thử toàn diện module Xác thực (Authentication) và Phân quyền RBAC (T07 & T08).
 */
const request = require('supertest');
const express = require('express');
const app = require('../src/app');
const { sequelize, NguoiDung } = require('../src/models');
const xacThucToken = require('../src/middlewares/xacThucToken');
const phanQuyen = require('../src/middlewares/phanQuyen');
const { phanHoiThanhCong } = require('../src/middlewares/phanHoi');

describe('Kiểm thử Xác thực (T07) & Phân quyền RBAC (T08)', () => {
  afterAll(async () => {
    // Dọn dẹp tài khoản test đã tạo để tránh làm bẩn CSDL
    if (emailMoi) {
      await NguoiDung.destroy({ where: { Email: emailMoi } });
    }
    await sequelize.close();
  });

  const emailMoi = `khach_test_${Date.now()}@gmail.com`;
  const matKhauMoi = 'MatKhau@123';
  let tokenKhachMoi = '';
  let tokenAdmin = '';

  // -------------------------------------------------------------
  // PHẦN 1: ĐĂNG KÝ (POST /api/auth/register)
  // -------------------------------------------------------------
  it('1. Đăng ký tài khoản mới thành công (vai trò luôn là customer, không lộ MatKhauHash)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: emailMoi,
        matKhau: matKhauMoi,
        hoTen: 'Người Dùng Test',
        vaiTro: 'admin', // Cố tình gửi role admin để thử mass-assignment
        soDienThoai: '0988776655'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(emailMoi);
    expect(res.body.data.role).toBe('customer'); // Phải bị ép thành customer
    expect(res.body.data.MatKhauHash).toBeUndefined(); // Tuyệt đối không trả chuỗi băm
  });

  it('2. Đăng ký trùng email phải trả về mã 409 Conflict', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: emailMoi,
        matKhau: matKhauMoi,
        hoTen: 'Người Dùng Trùng'
      });

    expect(res.statusCode).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it('3. Đăng ký với mật khẩu yếu (< 8 ký tự hoặc không có số) trả về 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test_weak@gmail.com',
        matKhau: 'yeu',
        hoTen: 'Test'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  // -------------------------------------------------------------
  // PHẦN 2: ĐĂNG NHẬP (POST /api/auth/login)
  // -------------------------------------------------------------
  it('4. Đăng nhập đúng cấp JWT và thông tin người dùng', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: emailMoi,
        matKhau: matKhauMoi
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe(emailMoi);
    tokenKhachMoi = res.body.data.token;
  });

  it('5. Đăng nhập tài khoản admin mẫu (admin@booknest.vn / BookNest@123)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@booknest.vn',
        matKhau: 'BookNest@123'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.role).toBe('admin');
    tokenAdmin = res.body.data.token;
  });

  it('6. Đăng nhập sai mật khẩu trả về 401 với thông điệp chung', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: emailMoi,
        matKhau: 'MatKhauSai@999'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Email hoặc mật khẩu không chính xác');
  });

  it('7. Đăng nhập tài khoản bị khóa (bikhoa@gmail.com) phải bị chặn 403', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'bikhoa@gmail.com',
        matKhau: 'BookNest@123'
      });

    expect(res.statusCode).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('bị khóa');
  });

  // -------------------------------------------------------------
  // PHẦN 3: HỒ SƠ & ĐỔI MẬT KHẨU (GET & PUT /api/users)
  // -------------------------------------------------------------
  it('8. Xem hồ sơ cá nhân khi không gửi token trả về 401', async () => {
    const res = await request(app).get('/api/users/profile');
    expect(res.statusCode).toBe(401);
  });

  it('9. Xem hồ sơ cá nhân với token hợp lệ trả về thông tin', async () => {
    const res = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${tokenKhachMoi}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.Email).toBe(emailMoi);
    expect(res.body.data.MatKhauHash).toBeUndefined();
  });

  it('10. Cập nhật hồ sơ cá nhân thành công', async () => {
    const res = await request(app)
      .put('/api/users/profile')
      .set('Authorization', `Bearer ${tokenKhachMoi}`)
      .send({
        hoTen: 'Tên Đã Cập Nhật',
        soDienThoai: '0912345678',
        diaChiMacDinh: 'TP. Biên Hòa, Đồng Nai'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.HoTen).toBe('Tên Đã Cập Nhật');
    expect(res.body.data.SoDienThoai).toBe('0912345678');
  });

  it('11. Đổi mật khẩu thành công và đăng nhập lại bằng mật khẩu mới', async () => {
    const matKhauMoiToanh = 'MatKhauMoi@999';

    // Đổi mật khẩu
    const resDoi = await request(app)
      .put('/api/users/change-password')
      .set('Authorization', `Bearer ${tokenKhachMoi}`)
      .send({
        matKhauCu: matKhauMoi,
        matKhauMoi: matKhauMoiToanh
      });

    expect(resDoi.statusCode).toBe(200);

    // Đăng nhập lại bằng mật khẩu mới
    const resDangNhap = await request(app)
      .post('/api/auth/login')
      .send({
        email: emailMoi,
        matKhau: matKhauMoiToanh
      });

    expect(resDangNhap.statusCode).toBe(200);
    expect(resDangNhap.body.data.token).toBeDefined();
  });

  // -------------------------------------------------------------
  // PHẦN 4: PHÂN QUYỀN RBAC (T08)
  // -------------------------------------------------------------
  it('12. Phân quyền RBAC: Customer gọi route Admin bị chặn 403; Admin gọi thành công 200', async () => {
    const testApp = express();
    testApp.use(express.json());
    testApp.get('/api/admin/chi-danh-cho-admin', xacThucToken, phanQuyen('admin'), (req, res) => {
      return phanHoiThanhCong(res, { thongDiep: 'Chào Admin' });
    });
    testApp.use(require('../src/middlewares/xuLyLoi'));

    // 1. Customer gọi -> 403 Forbidden
    const resCust = await request(testApp)
      .get('/api/admin/chi-danh-cho-admin')
      .set('Authorization', `Bearer ${tokenKhachMoi}`);
    expect(resCust.statusCode).toBe(403);

    // 2. Admin gọi -> 200 OK
    const resAdmin = await request(testApp)
      .get('/api/admin/chi-danh-cho-admin')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(resAdmin.statusCode).toBe(200);
  });
});
