/**
 * Tuyến đường (Routes) quản lý sách và kho (/api/books).
 */
const express = require('express');
const Joi = require('joi');
const sachController = require('../controllers/sachController');
const danhGiaController = require('../controllers/danhGiaController');
const batLoiAsync = require('../middlewares/batLoiAsync');
const xacThucToken = require('../middlewares/xacThucToken');
const { xacThucTuyChon } = require('../middlewares/xacThucToken');
const phanQuyen = require('../middlewares/phanQuyen');
const kiemTraDuLieu = require('../middlewares/kiemTraDuLieu');

const router = express.Router();

// Schema lọc danh sách sách
const luatTruyVanSach = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  search: Joi.string().trim().allow(''),
  categoryId: Joi.number().integer().positive(),
  minPrice: Joi.number().min(0),
  maxPrice: Joi.number().min(0),
  sort: Joi.string().valid('price_asc', 'price_desc', 'newest').default('newest')
}).custom((value, helpers) => {
  if (value.minPrice !== undefined && value.maxPrice !== undefined && value.minPrice > value.maxPrice) {
    return helpers.message('Giá tối thiểu (minPrice) không được lớn hơn giá tối đa (maxPrice)');
  }
  return value;
});

// Schema thêm sách mới
const luatTaoSach = Joi.object({
  tenSach: Joi.string().trim().min(2).max(255).required().messages({
    'string.empty': 'Tên sách không được để trống',
    'string.min': 'Tên sách phải có ít nhất 2 ký tự',
    'string.max': 'Tên sách không được vượt quá 255 ký tự',
    'any.required': 'Tên sách là bắt buộc'
  }),
  tacGia: Joi.string().trim().min(2).max(150).required().messages({
    'string.empty': 'Tác giả không được để trống',
    'string.min': 'Tác giả phải có ít nhất 2 ký tự',
    'string.max': 'Tác giả không được vượt quá 150 ký tự',
    'any.required': 'Tác giả là bắt buộc'
  }),
  moTa: Joi.string().allow(null, ''),
  giaBan: Joi.number().min(0).required().messages({
    'number.min': 'Giá bán không được âm',
    'any.required': 'Giá bán là bắt buộc'
  }),
  soLuongTon: Joi.number().integer().min(0).default(0).messages({
    'number.min': 'Số lượng tồn không được âm'
  }),
  nguongCanhBao: Joi.number().integer().min(0).default(5).messages({
    'number.min': 'Ngưỡng cảnh báo không được âm'
  }),
  anhBia: Joi.string().trim().max(500).allow(null, ''),
  maDanhMuc: Joi.number().integer().positive().required().messages({
    'any.required': 'Mã danh mục là bắt buộc'
  })
});

// Schema cập nhật sách
const luatCapNhatSach = Joi.object({
  tenSach: Joi.string().trim().min(2).max(255),
  tacGia: Joi.string().trim().min(2).max(150),
  moTa: Joi.string().allow(null, ''),
  giaBan: Joi.number().min(0),
  nguongCanhBao: Joi.number().integer().min(0),
  anhBia: Joi.string().trim().max(500).allow(null, ''),
  maDanhMuc: Joi.number().integer().positive(),
  daAn: Joi.boolean()
});

// Schema nhập kho
const luatNhapKho = Joi.object({
  soLuongNhap: Joi.number().integer().positive().max(100000).required().messages({
    'number.positive': 'Số lượng nhập phải là số nguyên dương',
    'any.required': 'Số lượng nhập là bắt buộc'
  }),
  ghiChu: Joi.string().trim().max(500).allow(null, '')
});

const luatTruyVanSapHetHang = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20)
});

const luatDieuChinhKho = Joi.object({
  soLuongThayDoi: Joi.number().integer().min(-100000).max(100000).invalid(0).required(),
  loaiDieuChinh: Joi.string().valid('KIEM_KE', 'HU_HONG', 'THAT_LAC', 'KHAC').required(),
  lyDo: Joi.string().trim().min(3).max(500).required()
}).custom((value, helpers) => {
  if (value.soLuongThayDoi > 0 && !['KIEM_KE', 'KHAC'].includes(value.loaiDieuChinh)) {
    return helpers.message('Chỉ kiểm kê hoặc lý do khác mới được phép tăng tồn kho');
  }
  return value;
});

/**
 * @swagger
 * /api/books:
 *   get:
 *     summary: Xem danh sách sách (tìm kiếm tiếng Việt không dấu, lọc giá, thể loại, phân trang)
 *     tags: [Sách & Kho (Books)]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Trang hiện tại
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Số sách mỗi trang
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Từ khóa tìm kiếm theo tên sách hoặc tác giả
 *       - in: query
 *         name: categoryId
 *         schema:
 *           type: integer
 *         description: Lọc theo mã danh mục
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Giá bán thấp nhất
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Giá bán cao nhất
 *       - in: query
 *         name: sort
 *         schema:
 *           type: string
 *           enum: [price_asc, price_desc, newest]
 *           default: newest
 *         description: Tiêu chí sắp xếp
 *     responses:
 *       200:
 *         description: Danh sách sách và thông tin phân trang
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 */
router.get('/', kiemTraDuLieu(luatTruyVanSach, 'query'), batLoiAsync(sachController.xuLyLayDanhSach));

/**
 * @swagger
 * /api/books/low-stock:
 *   get:
 *     summary: Xem danh sách sách sắp hết hàng (tồn kho <= ngưỡng cảnh báo) (Quản trị viên, Thủ kho, Thủ thư)
 *     tags: [Sách & Kho (Books)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách sách có nguy cơ đứt hàng
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
  '/low-stock',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho'),
  kiemTraDuLieu(luatTruyVanSapHetHang, 'query'),
  batLoiAsync(sachController.xuLySapHetHang)
);

router.post(
  '/:id/stock-adjustment',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho'),
  kiemTraDuLieu(luatDieuChinhKho),
  batLoiAsync(sachController.xuLyDieuChinhTonKho)
);

router.get(
  '/inventory/adjustments',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho'),
  kiemTraDuLieu(luatTruyVanSapHetHang, 'query'),
  batLoiAsync(sachController.xuLyLayLichSuDieuChinhKho)
);

/**
 * @swagger
 * /api/books/inventory/history:
 *   get:
 *     summary: Xem toàn bộ lịch sử các đợt nhập kho gần đây trong hệ thống (Quản trị viên, Thủ kho, Thủ thư)
 *     tags: [Sách & Kho (Books)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Danh sách các đợt nhập kho gần đây
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 */
router.get(
  '/inventory/history',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho'),
  batLoiAsync(sachController.xuLyTatCaLichSuNhapKho)
);

/**
 * @swagger
 * /api/books/{id}:
 *   get:
 *     summary: Xem chi tiết cuốn sách kèm số sao đánh giá trung bình
 *     tags: [Sách & Kho (Books)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã sách
 *     responses:
 *       200:
 *         description: Thông tin chi tiết cuốn sách
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       404:
 *         description: Không tìm thấy sách
 */
router.get('/:id', xacThucTuyChon, batLoiAsync(sachController.xuLyLayChiTiet));

/**
 * @swagger
 * /api/books:
 *   post:
 *     summary: Thêm sách mới vào kho (Quản trị viên, Thủ kho)
 *     tags: [Sách & Kho (Books)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenSach, tacGia, giaBan, maDanhMuc]
 *             properties:
 *               tenSach:
 *                 type: string
 *                 example: Lập trình Node.js nâng cao
 *               tacGia:
 *                 type: string
 *                 example: Nhiều tác giả
 *               moTa:
 *                 type: string
 *                 example: Sách chuyên sâu về kiến trúc Node.js
 *               giaBan:
 *                 type: number
 *                 example: 150000
 *               soLuongTon:
 *                 type: integer
 *                 example: 50
 *               nguongCanhBao:
 *                 type: integer
 *                 example: 10
 *               anhBia:
 *                 type: string
 *                 example: https://images.unsplash.com/...
 *               maDanhMuc:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       201:
 *         description: Thêm sách thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 */
router.post(
  '/',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho'),
  kiemTraDuLieu(luatTaoSach),
  batLoiAsync(sachController.xuLyTao)
);

/**
 * @swagger
 * /api/books/{id}:
 *   put:
 *     summary: Cập nhật thông tin cuốn sách (Quản trị viên, Thủ kho)
 *     tags: [Sách & Kho (Books)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã sách
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tenSach:
 *                 type: string
 *               tacGia:
 *                 type: string
 *               moTa:
 *                 type: string
 *               giaBan:
 *                 type: number
 *               nguongCanhBao:
 *                 type: integer
 *               anhBia:
 *                 type: string
 *               maDanhMuc:
 *                 type: integer
 *               daAn:
 *                 type: boolean
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy sách
 */
router.put(
  '/:id',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho'),
  kiemTraDuLieu(luatCapNhatSach),
  batLoiAsync(sachController.xuLyCapNhat)
);

/**
 * @swagger
 * /api/books/{id}:
 *   delete:
 *     summary: Xóa mềm (ẩn) cuốn sách khỏi danh mục kinh doanh (Quản trị viên, Thủ kho)
 *     tags: [Sách & Kho (Books)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã sách
 *     responses:
 *       200:
 *         description: Ẩn sách thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy sách
 */
router.delete(
  '/:id',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho'),
  batLoiAsync(sachController.xuLyXoa)
);

/**
 * @swagger
 * /api/books/{id}/stock-in:
 *   post:
 *     summary: Nhập thêm số lượng tồn kho cho sách (Quản trị viên, Thủ kho)
 *     tags: [Sách & Kho (Books)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã sách
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [soLuongNhap]
 *             properties:
 *               soLuongNhap:
 *                 type: integer
 *                 example: 20
 *               ghiChu:
 *                 type: string
 *                 example: Nhập bổ sung đợt tái bản mới
 *     responses:
 *       200:
 *         description: Nhập kho thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Dữ liệu không hợp lệ hoặc sách đã bị ẩn
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy sách
 */
router.post(
  '/:id/stock-in',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho'),
  kiemTraDuLieu(luatNhapKho),
  batLoiAsync(sachController.xuLyNhapKho)
);

/**
 * @swagger
 * /api/books/{id}/stock-in-history:
 *   get:
 *     summary: Xem lịch sử các lần nhập kho của cuốn sách (Quản trị viên, Thủ kho)
 *     tags: [Sách & Kho (Books)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã sách
 *     responses:
 *       200:
 *         description: Danh sách các lần nhập kho
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 *       404:
 *         description: Không tìm thấy sách
 */
router.get(
  '/:id/stock-in-history',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho'),
  batLoiAsync(sachController.xuLyLichSuNhapKho)
);

// 5. Tuyến đường đánh giá sách (T16)
const luatDanhGia = Joi.object({
  soSao: Joi.number().integer().min(1).max(5).required().messages({
    'number.min': 'Số sao đánh giá phải từ 1 đến 5 sao',
    'number.max': 'Số sao đánh giá phải từ 1 đến 5 sao',
    'any.required': 'Số sao là bắt buộc'
  }),
  noiDung: Joi.string().trim().max(1000).allow(null, '').messages({
    'string.max': 'Nội dung đánh giá không được vượt quá 1000 ký tự'
  })
});

/**
 * @swagger
 * /api/books/{id}/reviews:
 *   get:
 *     summary: Xem danh sách đánh giá và số sao trung bình của một cuốn sách
 *     tags: [Đánh giá sách (Reviews)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã sách
 *     responses:
 *       200:
 *         description: Danh sách đánh giá của bạn đọc
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       404:
 *         description: Không tìm thấy cuốn sách
 */
router.get('/:id/reviews', batLoiAsync(danhGiaController.xuLyLayDanhSachDanhGia));

/**
 * @swagger
 * /api/books/{id}/reviews:
 *   post:
 *     summary: Đánh giá sách (Chỉ dành cho khách hàng đã mua và nhận đơn thành công - Verified Buyer)
 *     tags: [Đánh giá sách (Reviews)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã sách
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [soSao]
 *             properties:
 *               soSao:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *                 example: 5
 *               noiDung:
 *                 type: string
 *                 example: Sách in đẹp, nội dung sâu sắc và rất đáng đọc!
 *     responses:
 *       200:
 *         description: Đánh giá sách thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Số sao không hợp lệ (phải từ 1 đến 5 sao)
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Chưa mua sách này hoặc đơn hàng chưa giao thành công (DA_GIAO)
 *       404:
 *         description: Không tìm thấy sách
 */
router.post(
  '/:id/reviews',
  xacThucToken,
  phanQuyen('khach_hang'),
  kiemTraDuLieu(luatDanhGia),
  batLoiAsync(danhGiaController.xuLyTaoHoacCapNhatDanhGia)
);

module.exports = router;
