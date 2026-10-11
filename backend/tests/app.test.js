/**
 * Kiểm thử khởi động và tuyến đường Health Check cho BookNest API.
 */
const request = require('supertest');
const app = require('../src/app');

describe('Kiểm thử khởi động máy chủ BookNest', () => {
  it('GET / phải trả về trạng thái 200 và thông báo hoạt động ổn định', async () => {
    const phanHoi = await request(app).get('/');
    expect(phanHoi.statusCode).toBe(200);
    expect(phanHoi.body.success).toBe(true);
    expect(phanHoi.body.message).toBe('BookNest API đang hoạt động ổn định');
  });

  it('GET /api/suc-khoe phải trả về trạng thái 200 và thông tin hệ thống', async () => {
    const phanHoi = await request(app).get('/api/suc-khoe');
    expect(phanHoi.statusCode).toBe(200);
    expect(phanHoi.body.success).toBe(true);
    expect(phanHoi.body.data.phienBan).toBe('1.0.0');
  });

  it('GET /api/duong-dan-khong-ton-tai phải trả về mã 404 chuẩn', async () => {
    const phanHoi = await request(app).get('/api/duong-dan-khong-ton-tai');
    expect(phanHoi.statusCode).toBe(404);
    expect(phanHoi.body.success).toBe(false);
  });
});
