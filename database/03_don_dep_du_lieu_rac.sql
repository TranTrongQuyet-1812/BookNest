-- ====================================================================================
-- DỰ ÁN: BookNest - Website Quản lý & Bán Sách Trực Tuyến
-- TỆP: database/03_don_dep_du_lieu_rac.sql
-- MỤC TIÊU: Kịch bản dọn dữ liệu rác phát sinh do test tự động (F09 - P0), chỉ xóa theo email/tên chính xác
-- LƯU Ý BẢO VỆ:
--   1. Luôn sao lưu CSDL trước khi chạy (xem BƯỚC 1 bên dưới).
--   2. Kiểm tra danh sách rác ở BƯỚC 2 trước khi thực thi lệnh xóa.
--   3. Toàn bộ thao tác xóa được bọc trong TRANSACTION an toàn (BƯỚC 3).
-- ====================================================================================

USE BookNestDB;
GO

-- ====================================================================================
-- BƯỚC 1: HƯỚNG DẪN SAO LƯU CƠ SỞ DỮ LIỆU (BACKUP DATABASE)
-- Chạy lệnh sau trong SSMS hoặc sqlcmd (đảm bảo thư mục D:\SQLServer\Backup tồn tại):
-- ====================================================================================
/*
BACKUP DATABASE BookNestDB 
TO DISK = N'D:\SQLServer\Backup\BookNestDB_truoc_don_rac.bak' 
WITH INIT, NAME = N'Sao lưu toàn phần BookNestDB trước khi dọn rác';
GO
*/

-- ====================================================================================
-- BƯỚC 2: NHẬN DIỆN DỮ LIỆU RÁC (CHỈ ĐỌC - SELECT KIỂM TRA TRƯỚC KHI XÓA)
-- ====================================================================================
PRINT N'--- BƯỚC 2: KIỂM TRA CÁC DÒNG DỮ LIỆU RÁC TRONG HỆ THỐNG ---';

-- 1. Các tài khoản test tự động phát sinh (chỉ nhận diện qua email: 'khach_test_...@gmail.com' hoặc 'test@gmail.com')
SELECT 
    MaNguoiDung, HoTen, Email, VaiTro, DangHoatDong, NgayTao
FROM dbo.NguoiDung
WHERE Email LIKE 'khach_test_%@gmail.com'
   OR Email = 'test@gmail.com';

-- 2. Sách rác thử nghiệm (nhận diện đúng theo tên 'Sach Test', không dùng LIKE để khỏi xóa nhầm sách thật)
SELECT MaSach, TenSach, TacGia, GiaBan, SoLuongTon
FROM dbo.Sach
WHERE TenSach IN (N'Sach Test', N'Sách Test');

-- 3. Danh mục rác thử nghiệm (nhận diện đúng theo tên)
SELECT MaDanhMuc, TenDanhMuc, MoTa
FROM dbo.DanhMuc
WHERE TenDanhMuc IN (N'Kinh Te Test', N'Kinh Tế Test');
GO

-- ====================================================================================
-- BƯỚC 3: DỌN DẸP DỮ LIỆU RÁC TRONG MỘT TRANSACTION AN TOÀN
-- Bảng con trước, bảng cha sau (do toàn bộ khóa ngoại là NO ACTION)
-- ====================================================================================
BEGIN TRANSACTION;

BEGIN TRY
    PRINT N'--- BƯỚC 3: BẮT ĐẦU DỌN DẸP TRONG TRANSACTION ---';

    -- Danh sách ID người dùng rác cần dọn
    DECLARE @DanhSachNguoiDungRac TABLE (MaNguoiDung INT);
    INSERT INTO @DanhSachNguoiDungRac (MaNguoiDung)
    SELECT MaNguoiDung 
    FROM dbo.NguoiDung
    WHERE Email LIKE 'khach_test_%@gmail.com' 
       OR Email = 'test@gmail.com';

    -- Danh sách mã đơn hàng do tài khoản rác tạo
    DECLARE @DanhSachDonHangRac TABLE (MaDonHang INT);
    INSERT INTO @DanhSachDonHangRac (MaDonHang)
    SELECT MaDonHang
    FROM dbo.DonHang
    WHERE MaNguoiDung IN (SELECT MaNguoiDung FROM @DanhSachNguoiDungRac);

    -- 1. Xóa lịch sử trạng thái của các đơn hàng rác
    DELETE FROM dbo.LichSuTrangThaiDonHang
    WHERE MaDonHang IN (SELECT MaDonHang FROM @DanhSachDonHangRac)
       OR MaNguoiThucHien IN (SELECT MaNguoiDung FROM @DanhSachNguoiDungRac);

    -- 2. Xóa chi tiết đơn hàng của các đơn hàng rác
    DELETE FROM dbo.ChiTietDonHang
    WHERE MaDonHang IN (SELECT MaDonHang FROM @DanhSachDonHangRac);

    -- 3. Xóa đơn hàng của các tài khoản rác
    DELETE FROM dbo.DonHang
    WHERE MaDonHang IN (SELECT MaDonHang FROM @DanhSachDonHangRac);

    -- 4. Xóa giỏ hàng của các tài khoản rác
    DELETE FROM dbo.GioHang
    WHERE MaNguoiDung IN (SELECT MaNguoiDung FROM @DanhSachNguoiDungRac);

    -- 5. Xóa đánh giá do các tài khoản rác viết
    DELETE FROM dbo.DanhGia
    WHERE MaNguoiDung IN (SELECT MaNguoiDung FROM @DanhSachNguoiDungRac);

    -- 6. Xóa lịch sử nhập kho của sách test
    DELETE FROM dbo.LichSuNhapKho
    WHERE MaSach IN (SELECT MaSach FROM dbo.Sach WHERE TenSach IN (N'Sach Test', N'Sách Test'));

    -- 7. Xóa sách test
    DELETE FROM dbo.Sach
    WHERE TenSach IN (N'Sach Test', N'Sách Test');

    -- 8. Xóa danh mục test
    DELETE FROM dbo.DanhMuc
    WHERE TenDanhMuc IN (N'Kinh Te Test', N'Kinh Tế Test');

    -- 9. Cuối cùng, xóa các tài khoản rác trong bảng NguoiDung
    DELETE FROM dbo.NguoiDung
    WHERE MaNguoiDung IN (SELECT MaNguoiDung FROM @DanhSachNguoiDungRac);

    -- Lưu ý: script này KHÔNG sửa lại tồn kho đã bị test làm lệch.
    -- Muốn CSDL sạch hoàn toàn cho buổi demo/chấm đồ án: chạy lại 01_tao_bang.sql và 02_du_lieu_mau.sql.

    PRINT N'Dọn dẹp dữ liệu rác thành công!';
    COMMIT TRANSACTION;
    PRINT N'Giao dịch dọn dẹp đã được COMMIT an toàn.';
END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    PRINT N'Đã xảy ra lỗi trong quá trình dọn dẹp! Toàn bộ thay đổi đã được ROLLBACK.';
    THROW;
END CATCH;
GO

-- ====================================================================================
-- BƯỚC 4: ĐỐI CHIẾU VÀ XÁC NHẬN SỐ LIỆU SAU KHI DỌN
-- ====================================================================================
PRINT N'--- BƯỚC 4: KIỂM CHỨNG LẠI DỮ LIỆU SAU KHI DỌN ---';

SELECT COUNT(*) AS SoTaiKhoanChuan FROM dbo.NguoiDung; -- Kì vọng: 8 tài khoản
SELECT COUNT(*) AS SoDanhMucChuan FROM dbo.DanhMuc;    -- Kì vọng: 8 danh mục
GO
