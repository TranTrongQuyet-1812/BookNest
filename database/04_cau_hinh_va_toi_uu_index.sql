-- ====================================================================================
-- DỰ ÁN: BookNest - Website Quản lý & Bán Sách Trực Tuyến
-- TỆP: database/04_cau_hinh_va_toi_uu_index.sql
-- MỤC TIÊU: 
--   1. Cấu hình hiệu năng & tính nhất quán (READ_COMMITTED_SNAPSHOT ON, AUTO_CLOSE OFF)
--   2. Bổ sung các chỉ mục (Covering Indexes) tối ưu cho truy vấn dữ liệu lớn (F11, F12)
--   3. Hướng dẫn thiết lập tài khoản phân quyền tối thiểu (Least Privilege Principle)
-- HỆ QUẢN TRỊ: Microsoft SQL Server 2022 Express
-- ====================================================================================

USE BookNestDB;
GO

-- ====================================================================================
-- PHẦN 1: CẤU HÌNH DATABASE (F11)
-- ====================================================================================

-- 1. Bật READ_COMMITTED_SNAPSHOT (RCSI)
-- Ý nghĩa: Cho phép các câu truy vấn SELECT (đọc) đọc dữ liệu từ snapshot phiên bản dòng (version store)
-- mà không bị block bởi các Transaction ghi (UPDATE kho, INSERT đơn hàng), đồng thời giao dịch ghi
-- cũng không block người duyệt sách. Giảm thiểu 100% tình trạng nghẽn trang chủ khi đông người đặt hàng.
IF (SELECT is_read_committed_snapshot_on FROM sys.databases WHERE name = 'BookNestDB') = 0
BEGIN
    PRINT N'==> Đang bật READ_COMMITTED_SNAPSHOT cho BookNestDB...';
    ALTER DATABASE BookNestDB SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE;
    PRINT N'==> Đã bật thành công READ_COMMITTED_SNAPSHOT.';
END
ELSE
BEGIN
    PRINT N'==> READ_COMMITTED_SNAPSHOT đã được bật sẵn.';
END
GO

-- 2. Tắt AUTO_CLOSE
-- Ý nghĩa: SQL Server Express mặc định bật AUTO_CLOSE làm giải phóng tài nguyên và đóng CSDL 
-- khi hết kết nối, gây ra độ trễ vài giây (cold start) cho request kế tiếp. Tắt AUTO_CLOSE giúp DB luôn sẵn sàng.
IF (SELECT is_auto_close_on FROM sys.databases WHERE name = 'BookNestDB') = 1
BEGIN
    PRINT N'==> Đang tắt AUTO_CLOSE cho BookNestDB...';
    ALTER DATABASE BookNestDB SET AUTO_CLOSE OFF;
    PRINT N'==> Đã tắt thành công AUTO_CLOSE.';
END
ELSE
BEGIN
    PRINT N'==> AUTO_CLOSE đã tắt sẵn.';
END
GO

-- ====================================================================================
-- PHẦN 2: CHỈ MỤC TỐI ƯU HÓA TRUY VẤN DỮ LIỆU LỚN (F12)
-- ====================================================================================

-- 1. Tối ưu trang chủ & danh mục sách mặc định: WHERE DaAn = 0 ORDER BY NgayTao DESC
-- Giúp SQL Server quét Index Seek trực tiếp các sách đang kinh doanh, không cần sắp xếp Sort toàn bảng.
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_Sach_DaAn_NgayTao' AND object_id = OBJECT_ID('dbo.Sach'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_Sach_DaAn_NgayTao 
        ON dbo.Sach (DaAn, NgayTao DESC);
    PRINT N'==> Đã tạo chỉ mục IX_Sach_DaAn_NgayTao.';
END
GO

-- 2. Tối ưu tính Sao Trung Bình và Số Lượt Đánh Giá (Covering Index)
-- Thêm INCLUDE (SoSao) để câu lệnh SELECT AVG(CAST(SoSao AS FLOAT)) tính trực tiếp từ Index lá,
-- không cần tra ngược (Key Lookup) vào bảng chính DanhGia.
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DanhGia_MaSach' AND object_id = OBJECT_ID('dbo.DanhGia'))
BEGIN
    DROP INDEX IX_DanhGia_MaSach ON dbo.DanhGia;
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DanhGia_MaSach_Include_SoSao' AND object_id = OBJECT_ID('dbo.DanhGia'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_DanhGia_MaSach_Include_SoSao 
        ON dbo.DanhGia (MaSach) 
        INCLUDE (SoSao);
    PRINT N'==> Đã tạo chỉ mục phủ IX_DanhGia_MaSach_Include_SoSao.';
END
GO

-- 3. Tối ưu danh sách đơn hàng cho nhân viên không lọc trạng thái: ORDER BY NgayDat DESC
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_DonHang_NgayDat' AND object_id = OBJECT_ID('dbo.DonHang'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_DonHang_NgayDat 
        ON dbo.DonHang (NgayDat DESC);
    PRINT N'==> Đã tạo chỉ mục IX_DonHang_NgayDat.';
END
GO

-- 4. Tối ưu thống kê doanh thu theo ngày giao hàng thành công (DELIVERED)
-- Thêm INCLUDE (MaDonHang) để JOIN nhanh sang bảng DonHang mà không phát sinh Bookmark Lookup.
IF EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LichSuTrangThai_TrangThaiMoi_NgayThayDoi' AND object_id = OBJECT_ID('dbo.LichSuTrangThaiDonHang'))
BEGIN
    DROP INDEX IX_LichSuTrangThai_TrangThaiMoi_NgayThayDoi ON dbo.LichSuTrangThaiDonHang;
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LichSuTrangThai_TrangThaiMoi_NgayThayDoi_Include_MaDonHang' AND object_id = OBJECT_ID('dbo.LichSuTrangThaiDonHang'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_LichSuTrangThai_TrangThaiMoi_NgayThayDoi_Include_MaDonHang 
        ON dbo.LichSuTrangThaiDonHang (TrangThaiMoi, NgayThayDoi DESC) 
        INCLUDE (MaDonHang);
    PRINT N'==> Đã tạo chỉ mục phủ IX_LichSuTrangThai_TrangThaiMoi_NgayThayDoi_Include_MaDonHang.';
END
GO

-- 5. Bổ sung các chỉ mục cho Khóa ngoại (Foreign Key) còn thiếu
-- Giúp tăng tốc xóa/kiểm tra ràng buộc quan hệ toàn vẹn dữ liệu
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_GioHang_MaSach' AND object_id = OBJECT_ID('dbo.GioHang'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_GioHang_MaSach 
        ON dbo.GioHang (MaSach);
    PRINT N'==> Đã tạo chỉ mục khóa ngoại IX_GioHang_MaSach.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LichSuNhapKho_MaNguoiNhap' AND object_id = OBJECT_ID('dbo.LichSuNhapKho'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_LichSuNhapKho_MaNguoiNhap 
        ON dbo.LichSuNhapKho (MaNguoiNhap);
    PRINT N'==> Đã tạo chỉ mục khóa ngoại IX_LichSuNhapKho_MaNguoiNhap.';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_LichSuTrangThai_MaNguoiThucHien' AND object_id = OBJECT_ID('dbo.LichSuTrangThaiDonHang'))
BEGIN
    CREATE NONCLUSTERED INDEX IX_LichSuTrangThai_MaNguoiThucHien 
        ON dbo.LichSuTrangThaiDonHang (MaNguoiThucHien);
    PRINT N'==> Đã tạo chỉ mục khóa ngoại IX_LichSuTrangThai_MaNguoiThucHien.';
END
GO

-- ====================================================================================
-- PHẦN 3: HƯỚNG DẪN TẠO TÀI KHOẢN PHÂN QUYỀN TỐI THIỂU (LEAST PRIVILEGE)
-- ====================================================================================
/*
-- Khuyến nghị môi trường Production: Tách tài khoản ứng dụng khỏi vai trò db_owner / sa
-- Tài khoản ứng dụng (BookNestAppUser) chỉ cần quyền Đọc và Ghi dữ liệu, không có quyền DDL Drop bảng:

USE master;
GO
IF NOT EXISTS (SELECT * FROM sys.server_principals WHERE name = 'BookNestAppUser')
BEGIN
    CREATE LOGIN BookNestAppUser WITH PASSWORD = 'MatKhauUngDungBaoMat123!', CHECK_POLICY = ON;
END
GO

USE BookNestDB;
GO
IF NOT EXISTS (SELECT * FROM sys.database_principals WHERE name = 'BookNestAppUser')
BEGIN
    CREATE USER BookNestAppUser FOR LOGIN BookNestAppUser;
    ALTER ROLE db_datareader ADD MEMBER BookNestAppUser;
    ALTER ROLE db_datawriter ADD MEMBER BookNestAppUser;
END
GO
*/

PRINT N'====================================================================================';
PRINT N'==> HOÀN TẤT CẤU HÌNH VÀ TỐI ƯU HÓA CHỈ MỤC CSDL BOOKNESTDB THÀNH CÔNG!';
PRINT N'====================================================================================';
GO
