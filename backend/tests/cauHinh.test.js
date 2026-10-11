/**
 * Kiểm thử module cấu hình cauHinh.js.
 */
describe('Kiểm thử cấu hình hệ thống', () => {
  it('Phải đọc đúng các biến cấu hình từ môi trường', () => {
    const cauHinh = require('../src/config/cauHinh');
    expect(cauHinh.cong).toBe(5000);
    expect(cauHinh.csdl.tenCsdl).toBe('BookNestDB');
    expect(cauHinh.csdl.nguoiDung).toBe('booknest_user');
    expect(cauHinh.jwt.biMat).toBeDefined();
  });
});
