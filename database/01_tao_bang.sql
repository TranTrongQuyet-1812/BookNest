-- ====================================================================================
-- DỰ ÁN: BookNest - Website Quản lý & Bán Sách Trực Tuyến
-- TỆP: database/01_tao_bang.sql
-- MỤC TIÊU: Tạo 9 bảng chuẩn 3NF, ràng buộc toàn vẹn, khóa ngoại NO ACTION và 14 index (gồm Covering Indexes)
-- HỆ QUẢN TRỊ: Microsoft SQL Server 2022 Express
-- ====================================================================================

USE BookNestDB;
GO

-- ====================================================================================
-- PHẦN 1: XÓA CÁC BẢNG CŨ THEO THỨ TỰ BẢNG CON TRƯỚC, BẢNG CHA SAU
-- ====================================================================================
IF OBJECT_ID('dbo.LichSuTrangThaiDonHang', 'U') IS NOT NULL DROP TABLE dbo.LichSuTrangThaiDonHang;
IF OBJECT_ID('dbo.LichSuNhapKho', 'U') IS NOT NULL DROP TABLE dbo.LichSuNhapKho;
IF OBJECT_ID('dbo.DanhGia', 'U') IS NOT NULL DROP TABLE dbo.DanhGia;
IF OBJECT_ID('dbo.ChiTietDonHang', 'U') IS NOT NULL DROP TABLE dbo.ChiTietDonHang;
IF OBJECT_ID('dbo.GioHang', 'U') IS NOT NULL DROP TABLE dbo.GioHang;
IF OBJECT_ID('dbo.DonHang', 'U') IS NOT NULL DROP TABLE dbo.DonHang;
IF OBJECT_ID('dbo.Sach', 'U') IS NOT NULL DROP TABLE dbo.Sach;
IF OBJECT_ID('dbo.DanhMuc', 'U') IS NOT NULL DROP TABLE dbo.DanhMuc;
IF OBJECT_ID('dbo.NguoiDung', 'U') IS NOT NULL DROP TABLE dbo.NguoiDung;
GO

-- ====================================================================================
-- PHẦN 2: TẠO 9 BẢNG CHUẨN 3NF
-- ====================================================================================

-- 1. Bảng NguoiDung: Lưu trữ tài khoản khách hàng, thủ thư, nhân viên đơn hàng và quản trị viên
CREATE TABLE dbo.NguoiDung (
    MaNguoiDung INT IDENTITY(1,1) NOT NULL,
    HoTen NVARCHAR(100) NOT NULL,
    Email VARCHAR(255) NOT NULL,
    MatKhauHash VARCHAR(255) NOT NULL,
    SoDienThoai VARCHAR(15) NULL,
    DiaChiMacDinh NVARCHAR(255) NULL,
    VaiTro VARCHAR(20) NOT NULL CONSTRAINT DF_NguoiDung_VaiTro DEFAULT 'customer',
    DangHoatDong BIT NOT NULL CONSTRAINT DF_NguoiDung_DangHoatDong DEFAULT 1,
    NgayTao DATETIME2 NOT NULL CONSTRAINT DF_NguoiDung_NgayTao DEFAULT SYSDATETIME(),
    NgayCapNhat DATETIME2 NOT NULL CONSTRAINT DF_NguoiDung_NgayCapNhat DEFAULT SYSDATETIME(),

    CONSTRAINT PK_NguoiDung PRIMARY KEY CLUSTERED (MaNguoiDung),
    CONSTRAINT UQ_NguoiDung_Email UNIQUE (Email),
    CONSTRAINT CK_NguoiDung_VaiTro CHECK (VaiTro IN ('customer', 'librarian', 'order_staff', 'admin'))
);
GO

-- 2. Bảng DanhMuc: Quản lý thể loại sách
CREATE TABLE dbo.DanhMuc (
    MaDanhMuc INT IDENTITY(1,1) NOT NULL,
    TenDanhMuc NVARCHAR(100) NOT NULL,
    MoTa NVARCHAR(500) NULL,
    NgayTao DATETIME2 NOT NULL CONSTRAINT DF_DanhMuc_NgayTao DEFAULT SYSDATETIME(),
    NgayCapNhat DATETIME2 NOT NULL CONSTRAINT DF_DanhMuc_NgayCapNhat DEFAULT SYSDATETIME(),

    CONSTRAINT PK_DanhMuc PRIMARY KEY CLUSTERED (MaDanhMuc),
    CONSTRAINT UQ_DanhMuc_TenDanhMuc UNIQUE (TenDanhMuc)
);
GO

-- 3. Bảng Sach: Thông tin sách, giá bán, tồn kho và hỗ trợ tìm kiếm tiếng Việt không phân biệt dấu
CREATE TABLE dbo.Sach (
    MaSach INT IDENTITY(1,1) NOT NULL,
    TenSach NVARCHAR(255) COLLATE Vietnamese_CI_AI NOT NULL,
    TacGia NVARCHAR(150) COLLATE Vietnamese_CI_AI NOT NULL,
    MoTa NVARCHAR(MAX) NULL,
    GiaBan DECIMAL(12,2) NOT NULL,
    SoLuongTon INT NOT NULL CONSTRAINT DF_Sach_SoLuongTon DEFAULT 0,
    NguongCanhBao INT NOT NULL CONSTRAINT DF_Sach_NguongCanhBao DEFAULT 5,
    AnhBia VARCHAR(500) NULL,
    MaDanhMuc INT NOT NULL,
    DaAn BIT NOT NULL CONSTRAINT DF_Sach_DaAn DEFAULT 0,
    NgayTao DATETIME2 NOT NULL CONSTRAINT DF_Sach_NgayTao DEFAULT SYSDATETIME(),
    NgayCapNhat DATETIME2 NOT NULL CONSTRAINT DF_Sach_NgayCapNhat DEFAULT SYSDATETIME(),

    CONSTRAINT PK_Sach PRIMARY KEY CLUSTERED (MaSach),
    CONSTRAINT CK_Sach_GiaBan CHECK (GiaBan >= 0),
    CONSTRAINT CK_Sach_SoLuongTon CHECK (SoLuongTon >= 0),
    CONSTRAINT CK_Sach_NguongCanhBao CHECK (NguongCanhBao >= 0),
    CONSTRAINT FK_Sach_DanhMuc FOREIGN KEY (MaDanhMuc) 
        REFERENCES dbo.DanhMuc (MaDanhMuc) 
        ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- 4. Bảng GioHang: Bảng trung gian n-n giữa NguoiDung và Sach cho giỏ hàng khách
CREATE TABLE dbo.GioHang (
    MaNguoiDung INT NOT NULL,
    MaSach INT NOT NULL,
    SoLuong INT NOT NULL,
    NgayThem DATETIME2 NOT NULL CONSTRAINT DF_GioHang_NgayThem DEFAULT SYSDATETIME(),

    CONSTRAINT PK_GioHang PRIMARY KEY CLUSTERED (MaNguoiDung, MaSach),
    CONSTRAINT CK_GioHang_SoLuong CHECK (SoLuong > 0),
    CONSTRAINT FK_GioHang_NguoiDung FOREIGN KEY (MaNguoiDung) 
        REFERENCES dbo.NguoiDung (MaNguoiDung) 
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT FK_GioHang_Sach FOREIGN KEY (MaSach) 
        REFERENCES dbo.Sach (MaSach) 
        ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- 5. Bảng DonHang: Đơn đặt hàng của khách hàng (chỉ lưu trạng thái hiện tại)
CREATE TABLE dbo.DonHang (
    MaDonHang INT IDENTITY(1,1) NOT NULL,
    MaNguoiDung INT NOT NULL,
    TenNguoiNhan NVARCHAR(100) NOT NULL,
    SoDienThoaiNhan VARCHAR(15) NOT NULL,
    DiaChiGiaoHang NVARCHAR(255) NOT NULL,
    GhiChu NVARCHAR(500) NULL,
    TongTien DECIMAL(12,2) NOT NULL,
    TrangThai VARCHAR(20) NOT NULL CONSTRAINT DF_DonHang_TrangThai DEFAULT 'PENDING',
    NgayDat DATETIME2 NOT NULL CONSTRAINT DF_DonHang_NgayDat DEFAULT SYSDATETIME(),
    NgayCapNhat DATETIME2 NOT NULL CONSTRAINT DF_DonHang_NgayCapNhat DEFAULT SYSDATETIME(),

    CONSTRAINT PK_DonHang PRIMARY KEY CLUSTERED (MaDonHang),
    CONSTRAINT CK_DonHang_TongTien CHECK (TongTien >= 0),
    CONSTRAINT CK_DonHang_TrangThai CHECK (TrangThai IN ('PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED')),
    CONSTRAINT FK_DonHang_NguoiDung FOREIGN KEY (MaNguoiDung) 
        REFERENCES dbo.NguoiDung (MaNguoiDung) 
        ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- 6. Bảng ChiTietDonHang: Lưu từng cuốn sách trong đơn hàng cùng đơn giá chốt tại thời điểm mua
CREATE TABLE dbo.ChiTietDonHang (
    MaDonHang INT NOT NULL,
    MaSach INT NOT NULL,
    SoLuong INT NOT NULL,
    DonGia DECIMAL(12,2) NOT NULL,

    CONSTRAINT PK_ChiTietDonHang PRIMARY KEY CLUSTERED (MaDonHang, MaSach),
    CONSTRAINT CK_ChiTietDonHang_SoLuong CHECK (SoLuong > 0),
    CONSTRAINT CK_ChiTietDonHang_DonGia CHECK (DonGia >= 0),
    CONSTRAINT FK_ChiTietDonHang_DonHang FOREIGN KEY (MaDonHang) 
        REFERENCES dbo.DonHang (MaDonHang) 
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT FK_ChiTietDonHang_Sach FOREIGN KEY (MaSach) 
        REFERENCES dbo.Sach (MaSach) 
        ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- 7. Bảng DanhGia: Đánh giá số sao và nhận xét của khách về cuốn sách (1 người đánh giá 1 sách 1 lần)
CREATE TABLE dbo.DanhGia (
    MaDanhGia INT IDENTITY(1,1) NOT NULL,
    MaNguoiDung INT NOT NULL,
    MaSach INT NOT NULL,
    SoSao TINYINT NOT NULL,
    NoiDung NVARCHAR(1000) NULL,
    NgayTao DATETIME2 NOT NULL CONSTRAINT DF_DanhGia_NgayTao DEFAULT SYSDATETIME(),
    NgayCapNhat DATETIME2 NOT NULL CONSTRAINT DF_DanhGia_NgayCapNhat DEFAULT SYSDATETIME(),

    CONSTRAINT PK_DanhGia PRIMARY KEY CLUSTERED (MaDanhGia),
    CONSTRAINT UQ_DanhGia_NguoiDung_Sach UNIQUE (MaNguoiDung, MaSach),
    CONSTRAINT CK_DanhGia_SoSao CHECK (SoSao BETWEEN 1 AND 5),
    CONSTRAINT FK_DanhGia_NguoiDung FOREIGN KEY (MaNguoiDung) 
        REFERENCES dbo.NguoiDung (MaNguoiDung) 
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT FK_DanhGia_Sach FOREIGN KEY (MaSach) 
        REFERENCES dbo.Sach (MaSach) 
        ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- 8. Bảng LichSuNhapKho: Nhật ký ghi nhận các đợt nhập sách của thủ thư/quản trị viên
CREATE TABLE dbo.LichSuNhapKho (
    MaNhapKho INT IDENTITY(1,1) NOT NULL,
    MaSach INT NOT NULL,
    SoLuongNhap INT NOT NULL,
    MaNguoiNhap INT NOT NULL,
    GhiChu NVARCHAR(500) NULL,
    NgayNhap DATETIME2 NOT NULL CONSTRAINT DF_LichSuNhapKho_NgayNhap DEFAULT SYSDATETIME(),

    CONSTRAINT PK_LichSuNhapKho PRIMARY KEY CLUSTERED (MaNhapKho),
    CONSTRAINT CK_LichSuNhapKho_SoLuongNhap CHECK (SoLuongNhap > 0),
    CONSTRAINT FK_LichSuNhapKho_Sach FOREIGN KEY (MaSach) 
        REFERENCES dbo.Sach (MaSach) 
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT FK_LichSuNhapKho_NguoiNhap FOREIGN KEY (MaNguoiNhap) 
        REFERENCES dbo.NguoiDung (MaNguoiDung) 
        ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- 9. Bảng LichSuTrangThaiDonHang: Dòng thời gian lịch sử trạng thái của đơn hàng
CREATE TABLE dbo.LichSuTrangThaiDonHang (
    MaLichSu INT IDENTITY(1,1) NOT NULL,
    MaDonHang INT NOT NULL,
    TrangThaiCu VARCHAR(20) NULL,
    TrangThaiMoi VARCHAR(20) NOT NULL,
    MaNguoiThucHien INT NOT NULL,
    GhiChu NVARCHAR(500) NULL,
    NgayThayDoi DATETIME2 NOT NULL CONSTRAINT DF_LichSuTrangThai_NgayThayDoi DEFAULT SYSDATETIME(),

    CONSTRAINT PK_LichSuTrangThaiDonHang PRIMARY KEY CLUSTERED (MaLichSu),
    CONSTRAINT CK_LichSuTrangThai_TrangThaiCu CHECK (TrangThaiCu IS NULL OR TrangThaiCu IN ('PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED')),
    CONSTRAINT CK_LichSuTrangThai_TrangThaiMoi CHECK (TrangThaiMoi IN ('PENDING', 'CONFIRMED', 'SHIPPING', 'DELIVERED', 'CANCELLED')),
    CONSTRAINT FK_LichSuTrangThai_DonHang FOREIGN KEY (MaDonHang) 
        REFERENCES dbo.DonHang (MaDonHang) 
        ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT FK_LichSuTrangThai_NguoiThucHien FOREIGN KEY (MaNguoiThucHien) 
        REFERENCES dbo.NguoiDung (MaNguoiDung) 
        ON DELETE NO ACTION ON UPDATE NO ACTION
);
GO

-- ====================================================================================
-- PHẦN 3: TẠO 14 CHỈ MỤC (INDEX) TỐI ƯU HÓA TRUY VẤN DỮ LIỆU LỚN
-- ====================================================================================

-- 1. Index lọc sách theo danh mục
CREATE NONCLUSTERED INDEX IX_Sach_MaDanhMuc 
    ON dbo.Sach (MaDanhMuc);
GO

-- 2. Index lọc sách theo khoảng giá và sắp xếp giá
CREATE NONCLUSTERED INDEX IX_Sach_GiaBan 
    ON dbo.Sach (GiaBan);
GO

-- 3. Index tìm kiếm sách theo tên (hỗ trợ prefix search LIKE N'tu_khoa%')
CREATE NONCLUSTERED INDEX IX_Sach_TenSach 
    ON dbo.Sach (TenSach);
GO

-- 4. Index tối ưu danh sách sách trang chủ và quản lý: lọc DaAn = 0 và sắp xếp NgayTao DESC (F12)
CREATE NONCLUSTERED INDEX IX_Sach_DaAn_NgayTao 
    ON dbo.Sach (DaAn, NgayTao DESC);
GO

-- 5. Index khách hàng xem lịch sử đơn hàng của mình (mới nhất xếp trước)
CREATE NONCLUSTERED INDEX IX_DonHang_MaNguoiDung_NgayDat 
    ON dbo.DonHang (MaNguoiDung, NgayDat DESC);
GO

-- 6. Index nhân viên lọc đơn theo trạng thái và ngày đặt; phục vụ thống kê
CREATE NONCLUSTERED INDEX IX_DonHang_TrangThai_NgayDat 
    ON dbo.DonHang (TrangThai, NgayDat DESC);
GO

-- 7. Index danh sách đơn hàng toàn hệ thống sắp xếp theo ngày đặt (F12)
CREATE NONCLUSTERED INDEX IX_DonHang_NgayDat 
    ON dbo.DonHang (NgayDat DESC);
GO

-- 8. Index thống kê top sách bán chạy nhất
CREATE NONCLUSTERED INDEX IX_ChiTietDonHang_MaSach 
    ON dbo.ChiTietDonHang (MaSach);
GO

-- 9. Index tính số sao trung bình và lượt đánh giá phủ (Covering Index INCLUDE SoSao) (F12)
CREATE NONCLUSTERED INDEX IX_DanhGia_MaSach 
    ON dbo.DanhGia (MaSach) 
    INCLUDE (SoSao);
GO

-- 10. Index xem lịch sử nhập kho của từng cuốn sách
CREATE NONCLUSTERED INDEX IX_LichSuNhapKho_MaSach_NgayNhap 
    ON dbo.LichSuNhapKho (MaSach, NgayNhap DESC);
GO

-- 11. Index truy vấn dòng thời gian lịch sử trạng thái của từng đơn hàng
CREATE NONCLUSTERED INDEX IX_LichSuTrangThai_MaDonHang 
    ON dbo.LichSuTrangThaiDonHang (MaDonHang);
GO

-- 12. Index thống kê doanh thu theo ngày giao hàng phủ (Covering Index INCLUDE MaDonHang) (F12)
CREATE NONCLUSTERED INDEX IX_LichSuTrangThai_TrangThaiMoi_NgayThayDoi 
    ON dbo.LichSuTrangThaiDonHang (TrangThaiMoi, NgayThayDoi DESC) 
    INCLUDE (MaDonHang);
GO

-- 13. Index hỗ trợ khóa ngoại Giỏ hàng
CREATE NONCLUSTERED INDEX IX_GioHang_MaSach 
    ON dbo.GioHang (MaSach);
GO

-- 14. Index hỗ trợ khóa ngoại Lịch sử nhập kho và trạng thái đơn hàng (F12)
CREATE NONCLUSTERED INDEX IX_LichSuNhapKho_MaNguoiNhap 
    ON dbo.LichSuNhapKho (MaNguoiNhap);
GO

CREATE NONCLUSTERED INDEX IX_LichSuTrangThai_MaNguoiThucHien 
    ON dbo.LichSuTrangThaiDonHang (MaNguoiThucHien);
GO
