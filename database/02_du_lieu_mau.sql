-- ====================================================================================
-- DỰ ÁN: BookNest - Website Quản lý & Bán Sách Trực Tuyến
-- TỆP: database/02_du_lieu_mau.sql
-- MỤC TIÊU: Dữ liệu mẫu chuẩn cho toàn bộ 9 bảng, phục vụ chấm điểm và demo
-- TÀI KHOẢN DEMO (Mật khẩu chung: BookNest@123):
--   1. Quản trị viên: admin@booknest.vn (admin)
--   2. Thủ thư:       thuthu@booknest.vn (librarian)
--   3. Nhân viên đơn: nhanvien@booknest.vn (order_staff)
--   4. Khách hàng:    khach1@gmail.com, khach2@gmail.com, khach3@gmail.com, khach4@gmail.com
--   5. Khóa đăng nhập: bikhoa@gmail.com (DangHoatDong = 0)
-- ====================================================================================

USE BookNestDB;
GO

-- ====================================================================================
-- PHẦN 1: DỌN DẸP DỮ LIỆU CŨ TRƯỚC KHI NẠP MỚI
-- ====================================================================================
DELETE FROM dbo.LichSuTrangThaiDonHang;
DELETE FROM dbo.LichSuNhapKho;
DELETE FROM dbo.DanhGia;
DELETE FROM dbo.ChiTietDonHang;
DELETE FROM dbo.GioHang;
DELETE FROM dbo.DonHang;
DELETE FROM dbo.Sach;
DELETE FROM dbo.DanhMuc;
DELETE FROM dbo.NguoiDung;
GO

-- ====================================================================================
-- PHẦN 2: CHÈN DỮ LIỆU BẢNG NGUOIDUNG (8 TÀI KHOẢN)
-- Chuỗi băm bcrypt của mật khẩu 'BookNest@123':
-- $2b$10$CPNHjcOvImeMu6OCFFAV/.VNlnKPd7jS8g5mtwpJbJn1RRcRaG66W
-- ====================================================================================
SET IDENTITY_INSERT dbo.NguoiDung ON;
GO

INSERT INTO dbo.NguoiDung (MaNguoiDung, HoTen, Email, MatKhauHash, SoDienThoai, DiaChiMacDinh, VaiTro, DangHoatDong)
VALUES 
(1, N'Trần Quản Trị', 'admin@booknest.vn', '$2b$10$CPNHjcOvImeMu6OCFFAV/.VNlnKPd7jS8g5mtwpJbJn1RRcRaG66W', '0901111222', N'Tầng 5, Tòa nhà BookNest, TP. Biên Hòa, Đồng Nai', 'admin', 1),
(2, N'Lê Thủ Thư', 'thuthu@booknest.vn', '$2b$10$CPNHjcOvImeMu6OCFFAV/.VNlnKPd7jS8g5mtwpJbJn1RRcRaG66W', '0902222333', N'Kho vận BookNest, TP. Biên Hòa, Đồng Nai', 'librarian', 1),
(3, N'Nguyễn Đơn Hàng', 'nhanvien@booknest.vn', '$2b$10$CPNHjcOvImeMu6OCFFAV/.VNlnKPd7jS8g5mtwpJbJn1RRcRaG66W', '0903333444', N'Bộ phận Điều phối Đơn, BookNest', 'order_staff', 1),
(4, N'Hoàng Khách Hàng', 'khach1@gmail.com', '$2b$10$CPNHjcOvImeMu6OCFFAV/.VNlnKPd7jS8g5mtwpJbJn1RRcRaG66W', '0914444555', N'123 Đường 30/4, P. Trung Dũng, TP. Biên Hòa', 'customer', 1),
(5, N'Phạm Thu Thảo', 'khach2@gmail.com', '$2b$10$CPNHjcOvImeMu6OCFFAV/.VNlnKPd7jS8g5mtwpJbJn1RRcRaG66W', '0915555666', N'45 Võ Thị Sáu, P. Quyết Thắng, TP. Biên Hòa', 'customer', 1),
(6, N'Vũ Minh Tuấn', 'khach3@gmail.com', '$2b$10$CPNHjcOvImeMu6OCFFAV/.VNlnKPd7jS8g5mtwpJbJn1RRcRaG66W', '0916666777', N'78 Nguyễn Ái Quốc, P. Tân Phong, TP. Biên Hòa', 'customer', 1),
(7, N'Đỗ Thị Mai', 'khach4@gmail.com', '$2b$10$CPNHjcOvImeMu6OCFFAV/.VNlnKPd7jS8g5mtwpJbJn1RRcRaG66W', '0917777888', N'10 Huỳnh Văn Nghệ, P. Bửu Long, TP. Biên Hòa', 'customer', 1),
(8, N'Tài Khoản Bị Khóa', 'bikhoa@gmail.com', '$2b$10$CPNHjcOvImeMu6OCFFAV/.VNlnKPd7jS8g5mtwpJbJn1RRcRaG66W', '0918888999', N'Đã vi phạm chính sách BookNest', 'customer', 0);
GO

SET IDENTITY_INSERT dbo.NguoiDung OFF;
GO

-- ====================================================================================
-- PHẦN 3: CHÈN DỮ LIỆU BẢNG DANHMUC (8 THỂ LOẠI THẬT)
-- ====================================================================================
SET IDENTITY_INSERT dbo.DanhMuc ON;
GO

INSERT INTO dbo.DanhMuc (MaDanhMuc, TenDanhMuc, MoTa)
VALUES 
(1, N'Văn Học', N'Tác phẩm văn học trong nước và quốc tế, tiểu thuyết kinh điển, truyện ngắn'),
(2, N'Kinh Tế', N'Sách kinh doanh, khởi nghiệp, tài chính đầu tư, quản trị doanh nghiệp'),
(3, N'Thiếu Nhi', N'Truyện tranh, cổ tích, sách giáo dục nhân cách cho thiếu nhi và học sinh'),
(4, N'Kỹ Năng Sống', N'Phát triển bản thân, kỹ năng giao tiếp, quản lý thời gian và tư duy tích cực'),
(5, N'Khoa Học Công Nghệ', N'Lập trình, trí tuệ nhân tạo, thiên văn học, vật lý và khoa học tự nhiên'),
(6, N'Lịch Sử - Xã Hội', N'Lịch sử Việt Nam và thế giới, văn hóa, chính trị và xã hội học'),
(7, N'Tâm Lý Học', N'Tâm lý học hành vi, cảm xúc, trị liệu và khoa học nhận thức'),
(8, N'Ngoại Ngữ', N'Giáo trình học tiếng Anh, IELTS, TOEIC, tiếng Nhật, tiếng Trung và từ điển');
GO

SET IDENTITY_INSERT dbo.DanhMuc OFF;
GO

-- ====================================================================================
-- PHẦN 4: CHÈN DỮ LIỆU BẢNG SACH (34 CUỐN SÁCH THẬT ĐA DẠNG)
-- ====================================================================================
SET IDENTITY_INSERT dbo.Sach ON;
GO

INSERT INTO dbo.Sach (MaSach, TenSach, TacGia, MoTa, GiaBan, SoLuongTon, NguongCanhBao, AnhBia, MaDanhMuc, DaAn)
VALUES 
-- Danh mục 1: Văn Học (MaDanhMuc = 1)
(1, N'Số Đỏ', N'Vũ Trọng Phụng', N'Kiệt tác trào phúng đỉnh cao của văn học Việt Nam phản ánh xã hội tư sản thành thị những năm 1930.', 65000, 45, 5, 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=600', 1, 0),
(2, N'Dế Mèn Phiêu Lưu Ký', N'Tô Hoài', N'Tác phẩm thiếu nhi kinh điển của nhà văn Tô Hoài, câu chuyện về tình bạn và tinh thần hiệp nghĩa.', 50000, 80, 5, 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=600', 1, 0),
(3, N'Chí Phèo', N'Nam Cao', N'Tập truyện ngắn kinh điển khắc họa số phận người nông dân nghèo trong xã hội cũ của Nam Cao.', 45000, 35, 5, 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=600', 1, 0),
(4, N'Rừng Xà Nu', N'Nguyễn Trung Thành', N'Thiên anh hùng ca về tinh thần quật khởi của đồng bào Tây Nguyên trong cuộc kháng chiến vệ quốc.', 48000, 20, 5, 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=600', 1, 0),
(5, N'Mắt Biếc', N'Nguyễn Nhật Ánh', N'Câu chuyện tình đầu da diết, trong trẻo nhưng đầy tiếc nuối của Ngạn dành cho Hà Lan.', 110000, 50, 5, 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&q=80&w=600', 1, 0),
(6, N'Tôi Thấy Hoa Vàng Trên Cỏ Xanh', N'Nguyễn Nhật Ánh', N'Bức tranh tuổi thơ nông thôn nghèo nhưng ấm áp tình anh em và bạn bè (Sách sắp hết hàng).', 125000, 3, 5, 'https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&q=80&w=600', 1, 0),
(7, N'Nỗi Buồn Chiến Tranh', N'Bảo Ninh', N'Tiểu thuyết đoạt nhiều giải thưởng quốc tế, tái hiện chiến tranh qua góc nhìn nhân văn chân thực (Hết hàng).', 95000, 0, 5, 'https://images.unsplash.com/photo-1524578271613-d550eacf6090?auto=format&fit=crop&q=80&w=600', 1, 0),
(8, N'Cánh Đồng Bất Tận', N'Nguyễn Ngọc Tư', N'Tác phẩm truyện vừa giàu chất thơ và nỗi đau thân phận người dân miền sông nước (Đã ẩn).', 85000, 15, 5, 'https://images.unsplash.com/photo-1495640388908-05fa85288e61?auto=format&fit=crop&q=80&w=600', 1, 1),

-- Danh mục 2: Kinh Tế (MaDanhMuc = 2)
(9, N'Nhà Đầu Tư Thông Minh', N'Benjamin Graham', N'Cẩm nang kinh điển về đầu tư giá trị được Warren Buffett khuyên đọc cho mọi nhà đầu tư tài chính.', 185000, 40, 5, 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&q=80&w=600', 2, 0),
(10, N'Dạy Con Làm Giàu - Tập 1', N'Robert T. Kiyosaki', N'Để không có tiền vẫn tạo ra tiền - bài học tài chính kinh điển cha giàu cha nghèo.', 95000, 60, 5, 'https://images.unsplash.com/photo-1553729459-efe14ef6055d?auto=format&fit=crop&q=80&w=600', 2, 0),
(11, N'Chiến Lược Đại Dương Xanh', N'W. Chan Kim & Renée Mauborgne', N'Phương pháp tạo lập khoảng trống thị trường không có cạnh tranh và làm cho cạnh tranh trở nên vô nghĩa.', 160000, 25, 5, 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=600', 2, 0),
(12, N'Kinh Tế Học Hài Hước', N'Steven D. Levitt & Stephen J. Dubner', N'Khám phá thế giới qua lăng kính kinh tế học độc đáo, lý giải những hiện tượng đời sống bất ngờ.', 135000, 30, 5, 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=600', 2, 0),
(13, N'Khởi Nghiệp Tinh Gọn', N'Eric Ries', N'Mô hình Lean Startup giúp doanh nhân xây dựng sản phẩm và thích ứng nhanh với thị trường (Sắp hết hàng).', 145000, 2, 5, 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=600', 2, 0),

-- Danh mục 3: Thiếu Nhi (MaDanhMuc = 3)
(14, N'Hoàng Tử Bé', N'Antoine de Saint-Exupéry', N'Kiệt tác văn học Pháp dành cho cả trẻ em và người lớn, triết lý về tình bạn và tình yêu.', 75000, 70, 5, 'https://images.unsplash.com/photo-1532012164546-f432f2e37b73?auto=format&fit=crop&q=80&w=600', 3, 0),
(15, N'Chuyện Con Mèo Dạy Hải Âu Bay', N'Luis Sepúlveda', N'Câu chuyện cảm động về lời hứa danh dự của chú mèo mập Zorba và lòng dũng cảm của chú hải âu nhỏ.', 60000, 55, 5, 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&q=80&w=600', 3, 0),
(16, N'Kính Vạn Hoa - Tập 1', N'Nguyễn Nhật Ánh', N'Những câu chuyện học trò vui nhộn của bộ ba Quý ròm, Tiểu Long và nhỏ Hạnh.', 80000, 40, 5, 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&q=80&w=600', 3, 0),
(17, N'Totto-chan Bên Cửa Sổ', N'Kuroyanagi Tetsuko', N'Tự truyện về ngôi trường Tomoe mơ ước với thầy hiệu Kobayashi và phương pháp giáo dục tự do.', 98000, 35, 5, 'https://images.unsplash.com/photo-1491841550275-ad7854e35ca6?auto=format&fit=crop&q=80&w=600', 3, 0),

-- Danh mục 4: Kỹ Năng Sống (MaDanhMuc = 4)
(18, N'Đắc Nhân Tâm', N'Dale Carnegie', N'Cuốn sách nghệ thuật thu phục lòng người bán chạy nhất mọi thời đại của Dale Carnegie.', 86000, 90, 5, 'https://images.unsplash.com/photo-1499750310107-5fef28a66643?auto=format&fit=crop&q=80&w=600', 4, 0),
(19, N'Quẳng Gánh Lo Đi Và Vui Sống', N'Dale Carnegie', N'Bí quyết vượt qua nỗi lo âu, xây dựng tâm thế tích cực và tận hưởng trọn vẹn từng ngày.', 82000, 50, 5, 'https://images.unsplash.com/photo-1471107340929-a87cd0f5b5f3?auto=format&fit=crop&q=80&w=600', 4, 0),
(20, N'Hạt Giống Tâm Hồn - Tập 1', N'First News', N'Tuyển tập những câu chuyện truyền cảm hứng, thắp sáng niềm tin và nghị lực sống.', 65000, 45, 5, 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=600', 4, 0),
(21, N'Tuổi Trẻ Đáng Giá Bao Nhiêu', N'Rosie Nguyễn', N'Hành trang rèn luyện thói quen tự học, đọc sách, đi du lịch trải nghiệm cho giới trẻ.', 90000, 65, 5, 'https://images.unsplash.com/photo-1513475382585-d06e58bcb0e0?auto=format&fit=crop&q=80&w=600', 4, 0),
(22, N'Lối Sống Tối Giản Của Người Nhật', N'Sasaki Fumio', N'Buông bỏ vật chất thừa thãi để tìm thấy hạnh phúc thực sự trong cuộc sống (Hết hàng).', 89000, 0, 5, 'https://images.unsplash.com/photo-1506880018603-83d5b814b5a6?auto=format&fit=crop&q=80&w=600', 4, 0),

-- Danh mục 5: Khoa Học Công Nghệ (MaDanhMuc = 5)
(23, N'Lược Sử Thời Gian', N'Stephen Hawking', N'Tác phẩm phổ biến khoa học kinh điển về vũ trụ học, vụ nổ Big Bang và hố đen của Stephen Hawking.', 120000, 35, 5, 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=600', 5, 0),
(24, N'Vũ Trụ Trong Vỏ Hạt Dẻ', N'Stephen Hawking', N'Khám phá cơ học lượng tử, lý thuyết dây và bản chất của không - thời gian.', 135000, 20, 5, 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&q=80&w=600', 5, 0),
(25, N'Clean Code - Nghệ Thuật Viết Code Sạch', N'Robert C. Martin', N'Cẩm nang nền tảng không thể thiếu cho mọi lập trình viên phần mềm chuyên nghiệp.', 280000, 18, 5, 'https://images.unsplash.com/photo-1515879218367-8466d910aaa4?auto=format&fit=crop&q=80&w=600', 5, 0),
(26, N'Trí Tuệ Nhân Tạo Trong Kỷ Nguyên Mới', N'Kai-Fu Lee', N'Góc nhìn sâu sắc về tương lai của AI, tự động hóa và thị trường lao động toàn cầu (Sắp hết hàng).', 175000, 4, 5, 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?auto=format&fit=crop&q=80&w=600', 5, 0),
(27, N'Hệ Điều Hành Hiện Đại', N'Andrew S. Tanenbaum', N'Giáo trình đại học chuyên sâu về quản lý tiến trình, bộ nhớ và hệ thống tệp (Đã ẩn).', 320000, 12, 5, 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=600', 5, 1),

-- Danh mục 6: Lịch Sử - Xã Hội (MaDanhMuc = 6)
(28, N'Sapiens - Lược Sử Loài Người', N'Yuval Noah Harari', N'Cuốn sách lịch sử gây chấn động toàn cầu, lý giải cách loài người Homo Sapiens thống trị hành tinh.', 220000, 40, 5, 'https://images.unsplash.com/photo-1461360370896-922624d12aa1?auto=format&fit=crop&q=80&w=600', 6, 0),
(29, N'Homo Deus - Lược Sử Tương Lai', N'Yuval Noah Harari', N'Dự phóng tương lai nhân loại trong kỷ nguyên trí tuệ nhân tạo và công nghệ sinh học.', 230000, 30, 5, 'https://images.unsplash.com/photo-1507842229440-6644f1a070eb?auto=format&fit=crop&q=80&w=600', 6, 0),
(30, N'Đại Việt Sử Ký Toàn Thư', N'Ngô Sĩ Liên', N'Bộ quốc sử kinh điển ghi chép lịch sử Việt Nam từ thời Hồng Bàng đến triều Hậu Lê.', 350000, 15, 5, 'https://images.unsplash.com/photo-1473186578172-c141e6798cf4?auto=format&fit=crop&q=80&w=600', 6, 0),
(31, N'Việt Nam Sử Lược', N'Trần Trọng Kim', N'Tập sách sử viết bằng chữ quốc ngữ đầu tiên tổng hợp toàn bộ lịch sử nước nhà một cách hệ thống.', 150000, 22, 5, 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&q=80&w=600', 6, 0),

-- Danh mục 7: Tâm Lý Học (MaDanhMuc = 7)
(32, N'Tâm Lý Học Đám Đông', N'Gustave Le Bon', N'Tác phẩm phân tích sâu sắc các đặc điểm tâm lý, hành vi và sự cuồng nộ của đám đông xã hội.', 95000, 40, 5, 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=600', 7, 0),
(33, N'Tư Duy Nhanh Và Chậm', N'Daniel Kahneman', N'Kiệt tác của giáo sư đoạt giải Nobel Kinh tế phân tích 2 hệ thống tư duy dẫn dắt quyết định con người.', 210000, 28, 5, 'https://images.unsplash.com/photo-1501504905252-473c47e087f8?auto=format&fit=crop&q=80&w=600', 7, 0),
(34, N'Sức Mạnh Của Thói Quen', N'Charles Duhigg', N'Khám phá vòng lặp thói quen gợi ý - hành động - phần thưởng và bí quyết thay đổi bản thân.', 125000, 35, 5, 'https://images.unsplash.com/photo-1499209974431-9dddcece7f88?auto=format&fit=crop&q=80&w=600', 7, 0),

-- Danh mục 8: Ngoại Ngữ (MaDanhMuc = 8)
(35, N'English Grammar in Use', N'Raymond Murphy', N'Giáo trình ngữ pháp tiếng Anh trung cấp chuẩn quốc tế kinh điển của Đại học Cambridge.', 195000, 50, 5, 'https://images.unsplash.com/photo-1456513080510-7bf3a84b82f8?auto=format&fit=crop&q=80&w=600', 8, 0),
(36, N'Hacking IELTS Writing', N'Academic Edition', N'Bí quyết cải thiện band điểm Writing Task 1 và Task 2 với các bài văn mẫu điểm cao.', 165000, 30, 5, 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=600', 8, 0);
GO

SET IDENTITY_INSERT dbo.Sach OFF;
GO

-- ====================================================================================
-- PHẦN 5: CHÈN DỮ LIỆU BẢNG GIOHANG (GIỎ HÀNG KHÁCH HÀNG)
-- ====================================================================================
INSERT INTO dbo.GioHang (MaNguoiDung, MaSach, SoLuong)
VALUES 
(4, 18, 2), -- Khách 1 để 2 cuốn Đắc Nhân Tâm
(4, 9, 1),  -- Khách 1 để 1 cuốn Nhà Đầu Tư Thông Minh
(5, 14, 1); -- Khách 2 để 1 cuốn Hoàng Tử Bé
GO

-- ====================================================================================
-- PHẦN 6: CHÈN DỮ LIỆU BẢNG DONHANG & CHITIETDONHANG (ĐỦ 5 TRẠNG THÁI)
-- ====================================================================================
SET IDENTITY_INSERT dbo.DonHang ON;
GO

-- Đơn 1: PENDING
INSERT INTO dbo.DonHang (MaDonHang, MaNguoiDung, TenNguoiNhan, SoDienThoaiNhan, DiaChiGiaoHang, GhiChu, TongTien, TrangThai, NgayDat)
VALUES 
(1, 4, N'Hoàng Khách Hàng', '0914444555', N'123 Đường 30/4, P. Trung Dũng, TP. Biên Hòa', N'Giao giờ hành chính giúp tôi', 151000.00, 'PENDING', DATEADD(MINUTE, -120, SYSDATETIME()));

-- Đơn 2: CONFIRMED
INSERT INTO dbo.DonHang (MaDonHang, MaNguoiDung, TenNguoiNhan, SoDienThoaiNhan, DiaChiGiaoHang, GhiChu, TongTien, TrangThai, NgayDat)
VALUES 
(2, 5, N'Phạm Thu Thảo', '0915555666', N'45 Võ Thị Sáu, P. Quyết Thắng, TP. Biên Hòa', N'Gói quà cẩn thận giúp em', 200000.00, 'CONFIRMED', DATEADD(HOUR, -5, SYSDATETIME()));

-- Đơn 3: SHIPPING
INSERT INTO dbo.DonHang (MaDonHang, MaNguoiDung, TenNguoiNhan, SoDienThoaiNhan, DiaChiGiaoHang, GhiChu, TongTien, TrangThai, NgayDat)
VALUES 
(3, 6, N'Vũ Minh Tuấn', '0916666777', N'78 Nguyễn Ái Quốc, P. Tân Phong, TP. Biên Hòa', N'Giao trước thứ 7 nhé shop', 220000.00, 'SHIPPING', DATEADD(DAY, -1, SYSDATETIME()));

-- Đơn 4: DELIVERED
INSERT INTO dbo.DonHang (MaDonHang, MaNguoiDung, TenNguoiNhan, SoDienThoaiNhan, DiaChiGiaoHang, GhiChu, TongTien, TrangThai, NgayDat)
VALUES 
(4, 4, N'Hoàng Khách Hàng', '0914444555', N'123 Đường 30/4, P. Trung Dũng, TP. Biên Hòa', N'Đã thanh toán trước', 295000.00, 'DELIVERED', DATEADD(DAY, -3, SYSDATETIME()));

-- Đơn 5: CANCELLED
INSERT INTO dbo.DonHang (MaDonHang, MaNguoiDung, TenNguoiNhan, SoDienThoaiNhan, DiaChiGiaoHang, GhiChu, TongTien, TrangThai, NgayDat)
VALUES 
(5, 7, N'Đỗ Thị Mai', '0917777888', N'10 Huỳnh Văn Nghệ, P. Bửu Long, TP. Biên Hòa', N'Cần gấp trong ngày', 280000.00, 'CANCELLED', DATEADD(DAY, -2, SYSDATETIME()));

-- Đơn 6: DELIVERED (Lịch sử mua thành công của Khách 5 để đánh giá Sách 14)
INSERT INTO dbo.DonHang (MaDonHang, MaNguoiDung, TenNguoiNhan, SoDienThoaiNhan, DiaChiGiaoHang, GhiChu, TongTien, TrangThai, NgayDat)
VALUES 
(6, 5, N'Phạm Thu Thảo', '0915555666', N'45 Võ Thị Sáu, P. Quyết Thắng, TP. Biên Hòa', N'Giao giờ hành chính', 75000.00, 'DELIVERED', DATEADD(DAY, -10, SYSDATETIME()));

-- Đơn 7: DELIVERED (Lịch sử mua thành công của Khách 6 để đánh giá Sách 28)
INSERT INTO dbo.DonHang (MaDonHang, MaNguoiDung, TenNguoiNhan, SoDienThoaiNhan, DiaChiGiaoHang, GhiChu, TongTien, TrangThai, NgayDat)
VALUES 
(7, 6, N'Vũ Minh Tuấn', '0916666777', N'78 Nguyễn Ái Quốc, P. Tân Phong, TP. Biên Hòa', N'Giao buổi chiều', 220000.00, 'DELIVERED', DATEADD(DAY, -7, SYSDATETIME()));

-- Đơn 8: DELIVERED (Lịch sử mua thành công của Khách 7 để đánh giá Sách 18)
INSERT INTO dbo.DonHang (MaDonHang, MaNguoiDung, TenNguoiNhan, SoDienThoaiNhan, DiaChiGiaoHang, GhiChu, TongTien, TrangThai, NgayDat)
VALUES 
(8, 7, N'Đỗ Thị Mai', '0917777888', N'10 Huỳnh Văn Nghệ, P. Bửu Long, TP. Biên Hòa', N'Giao tận nơi', 86000.00, 'DELIVERED', DATEADD(DAY, -5, SYSDATETIME()));
GO

SET IDENTITY_INSERT dbo.DonHang OFF;
GO

-- Chi tiết đơn hàng:
INSERT INTO dbo.ChiTietDonHang (MaDonHang, MaSach, SoLuong, DonGia)
VALUES 
-- Đơn 1: 86,000 + 65,000 = 151,000
(1, 18, 1, 86000.00),
(1, 1, 1, 65000.00),
-- Đơn 2: 75,000 * 2 + 50,000 = 200,000
(2, 14, 2, 75000.00),
(2, 2, 1, 50000.00),
-- Đơn 3: 220,000 = 220,000
(3, 28, 1, 220000.00),
-- Đơn 4: 185,000 + 110,000 = 295,000
(4, 9, 1, 185000.00),
(4, 5, 1, 110000.00),
-- Đơn 5: 280,000 = 280,000
(5, 25, 1, 280000.00),
-- Đơn 6: 75,000 = 75,000
(6, 14, 1, 75000.00),
-- Đơn 7: 220,000 = 220,000
(7, 28, 1, 220000.00),
-- Đơn 8: 86,000 = 86,000
(8, 18, 1, 86000.00);
GO

-- ====================================================================================
-- PHẦN 7: CHÈN DỮ LIỆU BẢNG LICHSUTRANGTHAIDONHANG
-- ====================================================================================
SET IDENTITY_INSERT dbo.LichSuTrangThaiDonHang ON;
GO

INSERT INTO dbo.LichSuTrangThaiDonHang (MaLichSu, MaDonHang, TrangThaiCu, TrangThaiMoi, MaNguoiThucHien, GhiChu, NgayThayDoi)
VALUES 
-- Đơn 1: PENDING
(1, 1, NULL, 'PENDING', 4, N'Khách hàng đặt đơn trực tuyến tại BookNest Storefront', DATEADD(MINUTE, -120, SYSDATETIME())),

-- Đơn 2: PENDING -> CONFIRMED
(2, 2, NULL, 'PENDING', 5, N'Khách hàng tạo đơn hàng', DATEADD(HOUR, -5, SYSDATETIME())),
(3, 2, 'PENDING', 'CONFIRMED', 3, N'Nhân viên đơn hàng xác nhận đủ tồn kho và duyệt đơn', DATEADD(HOUR, -4, SYSDATETIME())),

-- Đơn 3: PENDING -> CONFIRMED -> SHIPPING
(4, 3, NULL, 'PENDING', 6, N'Khách hàng tạo đơn hàng', DATEADD(DAY, -1, SYSDATETIME())),
(5, 3, 'PENDING', 'CONFIRMED', 3, N'Nhân viên duyệt đơn và đóng gói sách', DATEADD(HOUR, -20, SYSDATETIME())),
(6, 3, 'CONFIRMED', 'SHIPPING', 3, N'Đã bàn giao đơn hàng cho đơn vị vận chuyển Viettel Post', DATEADD(HOUR, -16, SYSDATETIME())),

-- Đơn 4: PENDING -> CONFIRMED -> SHIPPING -> DELIVERED
(7, 4, NULL, 'PENDING', 4, N'Khách hàng tạo đơn hàng', DATEADD(DAY, -3, SYSDATETIME())),
(8, 4, 'PENDING', 'CONFIRMED', 3, N'Nhân viên duyệt đơn hàng', DATEADD(HOUR, -68, SYSDATETIME())),
(9, 4, 'CONFIRMED', 'SHIPPING', 3, N'Đã giao bưu tá vận chuyển', DATEADD(HOUR, -60, SYSDATETIME())),
(10, 4, 'SHIPPING', 'DELIVERED', 3, N'Giao hàng thành công, khách đã ký nhận và thanh toán', DATEADD(DAY, -2, SYSDATETIME())),

-- Đơn 5: PENDING -> CANCELLED
(11, 5, NULL, 'PENDING', 7, N'Khách hàng tạo đơn hàng', DATEADD(DAY, -2, SYSDATETIME())),
(12, 5, 'PENDING', 'CANCELLED', 7, N'Khách đổi ý muốn mua sách phiên bản tiếng Anh thay thế', DATEADD(HOUR, -40, SYSDATETIME())),

-- Đơn 6: PENDING -> CONFIRMED -> SHIPPING -> DELIVERED (Tuần tự chuẩn State Machine)
(13, 6, NULL, 'PENDING', 5, N'Khách hàng tạo đơn hàng', DATEADD(DAY, -10, SYSDATETIME())),
(14, 6, 'PENDING', 'CONFIRMED', 3, N'Nhân viên đơn hàng xác nhận đủ sách', DATEADD(HOUR, -238, SYSDATETIME())),
(15, 6, 'CONFIRMED', 'SHIPPING', 3, N'Đã giao bưu tá Viettel Post', DATEADD(DAY, -9, SYSDATETIME())),
(16, 6, 'SHIPPING', 'DELIVERED', 3, N'Giao hàng thành công, khách đã ký nhận', DATEADD(DAY, -8, SYSDATETIME())),

-- Đơn 7: PENDING -> CONFIRMED -> SHIPPING -> DELIVERED (Tuần tự chuẩn State Machine)
(17, 7, NULL, 'PENDING', 6, N'Khách hàng tạo đơn hàng', DATEADD(DAY, -7, SYSDATETIME())),
(18, 7, 'PENDING', 'CONFIRMED', 3, N'Nhân viên đơn hàng xác nhận đủ sách', DATEADD(HOUR, -166, SYSDATETIME())),
(19, 7, 'CONFIRMED', 'SHIPPING', 3, N'Đã giao bưu tá Viettel Post', DATEADD(DAY, -6, SYSDATETIME())),
(20, 7, 'SHIPPING', 'DELIVERED', 3, N'Giao hàng thành công, khách đã ký nhận', DATEADD(DAY, -5, SYSDATETIME())),

-- Đơn 8: PENDING -> CONFIRMED -> SHIPPING -> DELIVERED (Tuần tự chuẩn State Machine)
(21, 8, NULL, 'PENDING', 7, N'Khách hàng tạo đơn hàng', DATEADD(DAY, -5, SYSDATETIME())),
(22, 8, 'PENDING', 'CONFIRMED', 3, N'Nhân viên đơn hàng xác nhận đủ sách', DATEADD(HOUR, -118, SYSDATETIME())),
(23, 8, 'CONFIRMED', 'SHIPPING', 3, N'Đã giao bưu tá Viettel Post', DATEADD(DAY, -4, SYSDATETIME())),
(24, 8, 'SHIPPING', 'DELIVERED', 3, N'Giao hàng thành công, khách đã ký nhận', DATEADD(DAY, -3, SYSDATETIME()));
GO

SET IDENTITY_INSERT dbo.LichSuTrangThaiDonHang OFF;
GO

-- ====================================================================================
-- PHẦN 8: CHÈN DỮ LIỆU BẢNG LICHSUNHAPKHO (ĐẦY ĐỦ 36 ĐẦU SÁCH KHỚP SỔ SÁCH TỒN KHO)
-- ====================================================================================
SET IDENTITY_INSERT dbo.LichSuNhapKho ON;
GO

INSERT INTO dbo.LichSuNhapKho (MaNhapKho, MaSach, SoLuongNhap, MaNguoiNhap, GhiChu, NgayNhap)
VALUES 
(1, 1, 46, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (Nhà Xuất Bản Văn Học)', DATEADD(DAY, -30, SYSDATETIME())),
(2, 2, 81, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Kim Đồng)', DATEADD(DAY, -30, SYSDATETIME())),
(3, 3, 35, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Văn Học)', DATEADD(DAY, -30, SYSDATETIME())),
(4, 4, 20, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Quân Đội Nhân Dân)', DATEADD(DAY, -30, SYSDATETIME())),
(5, 5, 51, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Trẻ)', DATEADD(DAY, -30, SYSDATETIME())),
(6, 6, 3, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Trẻ)', DATEADD(DAY, -30, SYSDATETIME())),
(7, 7, 0, 2, N'Ghi nhận đầu sách (Tạm hết hàng)', DATEADD(DAY, -30, SYSDATETIME())),
(8, 8, 15, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Trẻ)', DATEADD(DAY, -30, SYSDATETIME())),
(9, 9, 41, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Trẻ)', DATEADD(DAY, -30, SYSDATETIME())),
(10, 10, 60, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Trẻ)', DATEADD(DAY, -30, SYSDATETIME())),
(11, 11, 25, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Lao Động - Xã Hội)', DATEADD(DAY, -30, SYSDATETIME())),
(12, 12, 30, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Thế Giới)', DATEADD(DAY, -30, SYSDATETIME())),
(13, 13, 2, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Tổng Hợp TP.HCM)', DATEADD(DAY, -30, SYSDATETIME())),
(14, 14, 73, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Kim Đồng)', DATEADD(DAY, -30, SYSDATETIME())),
(15, 15, 55, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Hội Nhà Văn)', DATEADD(DAY, -30, SYSDATETIME())),
(16, 16, 40, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Trẻ)', DATEADD(DAY, -30, SYSDATETIME())),
(17, 17, 35, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Hội Nhà Văn)', DATEADD(DAY, -30, SYSDATETIME())),
(18, 18, 92, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (First News)', DATEADD(DAY, -30, SYSDATETIME())),
(19, 19, 50, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (First News)', DATEADD(DAY, -30, SYSDATETIME())),
(20, 20, 45, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (First News)', DATEADD(DAY, -30, SYSDATETIME())),
(21, 21, 65, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Hội Nhà Văn)', DATEADD(DAY, -30, SYSDATETIME())),
(22, 22, 0, 2, N'Ghi nhận đầu sách (Tạm hết hàng)', DATEADD(DAY, -30, SYSDATETIME())),
(23, 23, 35, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Trẻ)', DATEADD(DAY, -30, SYSDATETIME())),
(24, 24, 20, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Trẻ)', DATEADD(DAY, -30, SYSDATETIME())),
(25, 25, 18, 1, N'Quản trị viên nhập kho ban đầu (Alpha Books)', DATEADD(DAY, -30, SYSDATETIME())),
(26, 26, 4, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Thế Giới)', DATEADD(DAY, -30, SYSDATETIME())),
(27, 27, 12, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Bách Khoa Hà Nội)', DATEADD(DAY, -30, SYSDATETIME())),
(28, 28, 42, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Tri Thức)', DATEADD(DAY, -30, SYSDATETIME())),
(29, 29, 30, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Tri Thức)', DATEADD(DAY, -30, SYSDATETIME())),
(30, 30, 15, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Khoa Học Xã Hội)', DATEADD(DAY, -30, SYSDATETIME())),
(31, 31, 22, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Văn Hóa Thông Tin)', DATEADD(DAY, -30, SYSDATETIME())),
(32, 32, 40, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Thế Giới)', DATEADD(DAY, -30, SYSDATETIME())),
(33, 33, 28, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Thế Giới)', DATEADD(DAY, -30, SYSDATETIME())),
(34, 34, 35, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Lao Động)', DATEADD(DAY, -30, SYSDATETIME())),
(35, 35, 50, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (Cambridge University Press)', DATEADD(DAY, -30, SYSDATETIME())),
(36, 36, 30, 2, N'Nhập kho ban đầu khi khởi tạo hệ thống (NXB Dân Trí)', DATEADD(DAY, -30, SYSDATETIME()));
GO

SET IDENTITY_INSERT dbo.LichSuNhapKho OFF;
GO

-- ====================================================================================
-- PHẦN 9: CHÈN DỮ LIỆU BẢNG DANHGIA
-- ====================================================================================
SET IDENTITY_INSERT dbo.DanhGia ON;
GO

INSERT INTO dbo.DanhGia (MaDanhGia, MaNguoiDung, MaSach, SoSao, NoiDung, NgayTao)
VALUES 
(1, 4, 9, 5, N'Sách đóng gói rất kỹ càng, giấy trắng ngà đọc rất êm mắt, nội dung kinh điển đáng đọc!', DATEADD(DAY, -2, SYSDATETIME())),
(2, 4, 5, 4, N'Truyện của Nguyễn Nhật Ánh luôn mang lại cảm xúc trong trẻo, giao hàng nhanh chóng.', DATEADD(DAY, -1, SYSDATETIME())),
(3, 5, 14, 5, N'Hình minh họa rất đẹp, dịch thuật mượt mà, con gái mình rất thích cuốn này.', DATEADD(HOUR, -12, SYSDATETIME())),
(4, 6, 28, 5, N'Một góc nhìn mở mang tầm mắt về lịch sử loài người. Rất khuyên đọc!', DATEADD(HOUR, -6, SYSDATETIME())),
(5, 7, 18, 3, N'Nội dung hay nhưng bìa sách bị hơi cong một góc nhỏ do quá trình vận chuyển.', DATEADD(HOUR, -2, SYSDATETIME()));
GO

SET IDENTITY_INSERT dbo.DanhGia OFF;
GO
