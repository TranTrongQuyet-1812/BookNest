/**
 * Kiểm thử toàn bộ bộ middleware chung: phản hồi chuẩn, validation Joi, 404 và xử lý lỗi tập trung.
 */
const request = require('supertest');
const express = require('express');
const Joi = require('joi');
const { phanHoiThanhCong } = require('../src/middlewares/phanHoi');
const LoiNghiepVu = require('../src/middlewares/loiNghiepVu');
const batLoiAsync = require('../src/middlewares/batLoiAsync');
const kiemTraDuLieu = require('../src/middlewares/kiemTraDuLieu');
const xuLy404 = require('../src/middlewares/xuLy404');
const xuLyLoi = require('../src/middlewares/xuLyLoi');

function taoAppThuNghiem() {
  const app = express();
  app.use(express.json());

  // Tuyến đường thành công
  app.get('/test/thanh-cong', (req, res) => {
    return phanHoiThanhCong(res, { duLieu: { id: 10 }, thongDiep: 'Lấy dữ liệu thành công' });
  });

  // Tuyến đường kiểm tra validation Joi
  const luatMau = Joi.object({
    email: Joi.string().email().required().messages({
      'string.email': 'Email không đúng định dạng',
      'any.required': 'Email là bắt buộc'
    }),
    tuoi: Joi.number().min(18).required().messages({
      'number.min': 'Tuổi phải từ 18 trở lên'
    })
  });
  app.post('/test/validation', kiemTraDuLieu(luatMau), (req, res) => {
    return phanHoiThanhCong(res, { duLieu: req.body });
  });

  // Tuyến đường ném lỗi nghiệp vụ có kiểm soát
  app.get('/test/loi-nghiep-vu', batLoiAsync(async () => {
    throw LoiNghiepVu.khongTimThay('Không tìm thấy cuốn sách này');
  }));

  // Tuyến đường ném lỗi không lường trước (500)
  app.get('/test/loi-he-thong', batLoiAsync(async () => {
    throw new Error('Lỗi truy cập bộ nhớ bí mật!');
  }));

  app.use(xuLy404);
  app.use(xuLyLoi);
  return app;
}

describe('Kiểm thử bộ Middleware chung', () => {
  const app = taoAppThuNghiem();

  it('1. Trả về phản hồi thành công chuẩn { success: true, message, data }', async () => {
    const res = await request(app).get('/test/thanh-cong');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toBe('Lấy dữ liệu thành công');
    expect(res.body.data.id).toBe(10);
  });

  it('2. Gọi route không tồn tại trả về 404 chuẩn', async () => {
    const res = await request(app).get('/test/khong-he-ton-tai');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Không tìm thấy');
  });

  it('3. Gửi dữ liệu sai validation trả về 400 kèm danh sách errors chi tiết', async () => {
    const res = await request(app)
      .post('/test/validation')
      .send({ email: 'sai-dinh-dang', tuoi: 15 });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(Array.isArray(res.body.errors)).toBe(true);
    expect(res.body.errors.length).toBe(2);
    expect(res.body.errors.some(e => e.truong === 'email')).toBe(true);
    expect(res.body.errors.some(e => e.truong === 'tuoi')).toBe(true);
  });

  it('4. Ném lỗi nghiệp vụ trả về đúng mã trạng thái HTTP (404)', async () => {
    const res = await request(app).get('/test/loi-nghiep-vu');
    expect(res.statusCode).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Không tìm thấy cuốn sách này');
  });

  it('5. Ném lỗi hệ thống trả về 500 và tuyệt đối KHÔNG lộ stack trace', async () => {
    const res = await request(app).get('/test/loi-he-thong');
    expect(res.statusCode).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Đã xảy ra lỗi máy chủ nội bộ. Vui lòng liên hệ quản trị viên hoặc thử lại sau');
    expect(res.body.stack).toBeUndefined();
    expect(JSON.stringify(res.body)).not.toContain('Lỗi truy cập bộ nhớ bí mật!');
  });
});
