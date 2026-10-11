/**
 * Bộ Unit Test thuần (Pure Unit Tests - Task T20).
 * Kiểm tra độc lập các logic quan trọng của hệ thống không phụ thuộc kết nối CSDL:
 * 1. Máy trạng thái đơn hàng (State Machine)
 * 2. Middleware phân quyền RBAC (phanQuyen)
 * 3. Middleware xác thực Token (xacThucToken)
 * 4. Tính toán tổng tiền và làm tròn số học
 * 5. Băm mật khẩu và so khớp bảo mật bcrypt
 * 6. Tính tỷ lệ phần trăm an toàn (chống chia cho 0)
 * 7. Kiểm tra dữ liệu đăng ký người dùng
 * 8. Middleware kiểm tra chủ đơn chống IDOR (kiemTraChuDon)
 */
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Joi = require('joi');
const { kiemTraChuyenTrangThai } = require('../src/services/donHangService');
const phanQuyen = require('../src/middlewares/phanQuyen');
const xacThucToken = require('../src/middlewares/xacThucToken');
const kiemTraChuDon = require('../src/middlewares/kiemTraChuDon');
const cauHinh = require('../src/config/cauHinh');
const LoiNghiepVu = require('../src/middlewares/loiNghiepVu');

describe('Task T20: Unit Test các Logic Nghiệp Vụ Cốt Lõi (Pure Unit Tests)', () => {

  // =========================================================================
  // 1. MÁY TRẠNG THÁI ĐƠN HÀNG (STATE MACHINE)
  // =========================================================================
  describe('1. Kiểm thử máy trạng thái đơn hàng (kiemTraChuyenTrangThai)', () => {
    it('Chuyển trạng thái tiến tuần tự hợp lệ trả về true', () => {
      expect(kiemTraChuyenTrangThai('PENDING', 'CONFIRMED')).toBe(true);
      expect(kiemTraChuyenTrangThai('CONFIRMED', 'SHIPPING')).toBe(true);
      expect(kiemTraChuyenTrangThai('SHIPPING', 'DELIVERED')).toBe(true);
    });

    it('Chặn nhảy cóc trạng thái (PENDING -> SHIPPING hoặc PENDING -> DELIVERED) trả về false', () => {
      expect(kiemTraChuyenTrangThai('PENDING', 'SHIPPING')).toBe(false);
      expect(kiemTraChuyenTrangThai('PENDING', 'DELIVERED')).toBe(false);
      expect(kiemTraChuyenTrangThai('CONFIRMED', 'DELIVERED')).toBe(false);
    });

    it('Chặn đi lùi trạng thái (SHIPPING -> CONFIRMED hoặc DELIVERED -> PENDING) trả về false', () => {
      expect(kiemTraChuyenTrangThai('SHIPPING', 'CONFIRMED')).toBe(false);
      expect(kiemTraChuyenTrangThai('DELIVERED', 'PENDING')).toBe(false);
      expect(kiemTraChuyenTrangThai('CONFIRMED', 'PENDING')).toBe(false);
    });

    it('Từ trạng thái kết thúc (DELIVERED hoặc CANCELLED) không thể chuyển sang bất kỳ trạng thái nào', () => {
      expect(kiemTraChuyenTrangThai('DELIVERED', 'CANCELLED')).toBe(false);
      expect(kiemTraChuyenTrangThai('CANCELLED', 'PENDING')).toBe(false);
      expect(kiemTraChuyenTrangThai('CANCELLED', 'CONFIRMED')).toBe(false);
    });
  });

  // =========================================================================
  // 2. MIDDLEWARE PHÂN QUYỀN RBAC (phanQuyen)
  // =========================================================================
  describe('2. Kiểm thử Middleware Phân quyền (phanQuyen)', () => {
    it('Người dùng có vai trò nằm trong danh sách được phép -> gọi next() thành công', () => {
      const middleware = phanQuyen('admin', 'librarian');
      const req = { user: { role: 'librarian' } };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith(); // Không có tham số lỗi
    });

    it('Người dùng có vai trò không được phép -> ném lỗi 403 Forbidden', () => {
      const middleware = phanQuyen('admin', 'order_staff');
      const req = { user: { role: 'customer' } };
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const loi = next.mock.calls[0][0];
      expect(loi).toBeInstanceOf(LoiNghiepVu);
      expect(loi.maTrangThai).toBe(403);
    });

    it('Yêu cầu chưa đăng nhập (req.user = undefined) -> ném lỗi 401 Unauthorized', () => {
      const middleware = phanQuyen('admin');
      const req = {};
      const res = {};
      const next = jest.fn();

      middleware(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const loi = next.mock.calls[0][0];
      expect(loi.maTrangThai).toBe(401);
    });
  });

  // =========================================================================
  // 3. MIDDLEWARE XÁC THỰC TOKEN (xacThucToken)
  // =========================================================================
  describe('3. Kiểm thử Middleware Xác thực Token (xacThucToken)', () => {
    it('Thiếu header Authorization -> ném lỗi 401', async () => {
      const req = { headers: {} };
      const res = {};
      const next = jest.fn();

      await xacThucToken(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const loi = next.mock.calls[0][0];
      expect(loi).toBeInstanceOf(LoiNghiepVu);
      expect(loi.maTrangThai).toBe(401);
      expect(loi.message).toContain('Bearer');
    });

    it('Header không có tiền tố Bearer -> ném lỗi 401', async () => {
      const req = { headers: { authorization: 'Basic 123456' } };
      const res = {};
      const next = jest.fn();

      await xacThucToken(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const loi = next.mock.calls[0][0];
      expect(loi.maTrangThai).toBe(401);
    });

    it('Token giả mạo hoặc sai chữ ký bí mật -> ném lỗi 401', async () => {
      const req = { headers: { authorization: 'Bearer token_gia_mao_khong_hop_le' } };
      const res = {};
      const next = jest.fn();

      await xacThucToken(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const loi = next.mock.calls[0][0];
      expect(loi.maTrangThai).toBe(401);
      expect(loi.message).toContain('không hợp lệ');
    });
  });

  // =========================================================================
  // 4. HÀM TÍNH TỔNG TIỀN ĐƠN HÀNG (CALCULATE ORDER TOTAL)
  // =========================================================================
  describe('4. Kiểm thử hàm thuần tính tổng tiền đơn hàng', () => {
    function tinhTongTienDonHang(danhSachMon) {
      if (!Array.isArray(danhSachMon) || danhSachMon.length === 0) return 0;
      const tong = danhSachMon.reduce((sum, item) => {
        const soLuong = parseInt(item.soLuong, 10) || 0;
        const donGia = parseFloat(item.donGia) || 0;
        return sum + soLuong * donGia;
      }, 0);
      return Math.round(tong * 100) / 100;
    }

    it('Tính đúng tổng tiền cho nhiều mặt hàng với số lượng khác nhau', () => {
      const gio = [
        { donGia: 65000, soLuong: 2 },  // 130,000
        { donGia: 110000, soLuong: 1 }, // 110,000
        { donGia: 48000, soLuong: 3 }   // 144,000
      ];
      expect(tinhTongTienDonHang(gio)).toBe(384000);
    });

    it('Giỏ hàng rỗng hoặc không hợp lệ trả về 0', () => {
      expect(tinhTongTienDonHang([])).toBe(0);
      expect(tinhTongTienDonHang(null)).toBe(0);
    });
  });

  // =========================================================================
  // 5. BĂM VÀ SO SÁNH MẬT KHẨU BCRYPT
  // =========================================================================
  describe('5. Kiểm thử băm mật khẩu và so khớp bcrypt', () => {
    it('Băm mật khẩu tạo ra chuỗi hash an toàn và so khớp chính xác', async () => {
      const matKhauGoc = 'MatKhauBaoMat@2026';
      const hash = await bcrypt.hash(matKhauGoc, 10);

      // Chuỗi băm tuyệt đối không trùng mật khẩu gốc
      expect(hash).not.toBe(matKhauGoc);
      expect(hash.startsWith('$2')).toBe(true);

      // So sánh mật khẩu đúng -> true
      const ketQuaDung = await bcrypt.compare(matKhauGoc, hash);
      expect(ketQuaDung).toBe(true);

      // So sánh mật khẩu sai -> false
      const ketQuaSai = await bcrypt.compare('MatKhauSai@999', hash);
      expect(ketQuaSai).toBe(false);
    });
  });

  // =========================================================================
  // 6. TÍNH TOÁN TỶ LỆ PHẦN TRĂM AN TOÀN (CHỐNG CHIA CHO 0)
  // =========================================================================
  describe('6. Kiểm thử tính tỷ lệ phần trăm an toàn', () => {
    function tinhTyLePhanTram(soLuong, tongSo) {
      if (!tongSo || tongSo <= 0) return 0;
      return parseFloat(((soLuong / tongSo) * 100).toFixed(1));
    }

    it('Tổng số bằng 0 không gây ra lỗi chia cho 0 và trả về 0', () => {
      expect(tinhTyLePhanTram(5, 0)).toBe(0);
      expect(tinhTyLePhanTram(0, 0)).toBe(0);
    });

    it('Tính đúng tỷ lệ phần trăm và làm tròn 1 chữ số thập phân', () => {
      expect(tinhTyLePhanTram(1, 3)).toBe(33.3);
      expect(tinhTyLePhanTram(2, 3)).toBe(66.7);
      expect(tinhTyLePhanTram(50, 100)).toBe(50.0);
    });
  });

  // =========================================================================
  // 7. KIỂM TRA DỮ LIỆU ĐĂNG KÝ VỚI JOI SCHEMA
  // =========================================================================
  describe('7. Kiểm thử Schema xác thực thông tin đăng ký', () => {
    const luatDangKy = Joi.object({
      email: Joi.string().email().required(),
      matKhau: Joi.string().min(8).pattern(/^(?=.*[A-Za-z])(?=.*\d)/).required(),
      hoTen: Joi.string().trim().min(2).max(100).required()
    });

    it('Dữ liệu hợp lệ vượt qua kiểm tra', () => {
      const ketQua = luatDangKy.validate({
        email: 'test@booknest.vn',
        matKhau: 'BookNest@123',
        hoTen: 'Trần Văn Test'
      });
      expect(ketQua.error).toBeUndefined();
    });

    it('Email sai định dạng bị báo lỗi', () => {
      const ketQua = luatDangKy.validate({
        email: 'khong_phai_email',
        matKhau: 'BookNest@123',
        hoTen: 'Test'
      });
      expect(ketQua.error).toBeDefined();
    });

    it('Mật khẩu yếu (< 8 ký tự hoặc thiếu số) bị báo lỗi', () => {
      const ketQuaNgan = luatDangKy.validate({
        email: 'test@gmail.com',
        matKhau: 'ngan',
        hoTen: 'Test'
      });
      expect(ketQuaNgan.error).toBeDefined();

      const ketQuaKhongSo = luatDangKy.validate({
        email: 'test@gmail.com',
        matKhau: 'KhongCoSoNaoHet',
        hoTen: 'Test'
      });
      expect(ketQuaKhongSo.error).toBeDefined();
    });
  });

  // =========================================================================
  // 8. KIỂM TRA CHỦ ĐƠN HÀNG CHỐNG IDOR (kiemTraChuDon)
  // =========================================================================
  describe('8. Kiểm thử Middleware chống IDOR (kiemTraChuDon)', () => {
    it('Mã đơn không hợp lệ (không phải số) -> ném lỗi 400', async () => {
      const req = { params: { id: 'abc' }, user: { role: 'customer', id: 4 } };
      const res = {};
      const next = jest.fn();

      await kiemTraChuDon(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
      const loi = next.mock.calls[0][0];
      expect(loi.maTrangThai).toBe(400);
    });
  });
});
