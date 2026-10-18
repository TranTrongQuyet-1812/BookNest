/**
 * giamGiaRoutes.js - Tuyến đường API quản lý chương trình giảm giá (/api/admin/discounts) (GG03)
 */
const express = require('express');
const Joi = require('joi');
const giamGiaController = require('../controllers/giamGiaController');
const batLoiAsync = require('../middlewares/batLoiAsync');
const xacThucToken = require('../middlewares/xacThucToken');
const phanQuyen = require('../middlewares/phanQuyen');
const kiemTraDuLieu = require('../middlewares/kiemTraDuLieu');

const router = express.Router();

const luatTruyVanDanhSach = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(10),
  search: Joi.string().trim().allow(''),
  trangThai: Joi.string().valid('DANG_CHAY', 'SAP_DIEN_RA', 'DA_HET_HAN', 'TAM_DUNG').allow('')
});

const luatTaoChuongTrinh = Joi.object({
  tenChuongTrinh: Joi.string().trim().min(1).max(150).required().messages({
    'string.empty': 'Tên chương trình không được để trống',
    'string.max': 'Tên chương trình tối đa 150 ký tự',
    'any.required': 'Tên chương trình là bắt buộc'
  }),
  phanTramGiam: Joi.number().integer().min(1).max(60).required().messages({
    'number.base': 'Phần trăm giảm phải là số',
    'number.min': 'Mức giảm tối thiểu là 1%',
    'number.max': 'Mức giảm tối đa là 60%',
    'any.required': 'Phần trăm giảm giá là bắt buộc'
  }),
  ngayBatDau: Joi.date().iso().required().messages({
    'date.base': 'Ngày bắt đầu không hợp lệ',
    'any.required': 'Ngày bắt đầu là bắt buộc'
  }),
  ngayKetThuc: Joi.date().iso().min(Joi.ref('ngayBatDau')).required().messages({
    'date.base': 'Ngày kết thúc không hợp lệ',
    'date.min': 'Ngày kết thúc phải sau hoặc bằng ngày bắt đầu',
    'any.required': 'Ngày kết thúc là bắt buộc'
  }),
  danhSachMaSach: Joi.array().items(Joi.number().integer().positive()).unique().messages({
    'array.unique': 'Danh sách mã sách không được chứa phần tử trùng lặp'
  }).default([]),
  danhSachMaDanhMuc: Joi.array().items(Joi.number().integer().positive()).unique().messages({
    'array.unique': 'Danh sách thể loại không được chứa phần tử trùng lặp'
  }).default([])
}).custom((value, helpers) => {
  const coSach = value.danhSachMaSach && value.danhSachMaSach.length > 0;
  const coDm = value.danhSachMaDanhMuc && value.danhSachMaDanhMuc.length > 0;
  if (!coSach && !coDm) {
    return helpers.message('Vui lòng chọn ít nhất một cuốn sách hoặc thể loại áp dụng giảm giá');
  }
  return value;
});

const luatCapNhatChuongTrinh = Joi.object({
  tenChuongTrinh: Joi.string().trim().min(1).max(150),
  phanTramGiam: Joi.number().integer().min(1).max(60),
  ngayBatDau: Joi.date().iso(),
  ngayKetThuc: Joi.date().iso(),
  danhSachMaSach: Joi.array().items(Joi.number().integer().positive()).unique().messages({
    'array.unique': 'Danh sách mã sách không được chứa phần tử trùng lặp'
  }),
  danhSachMaDanhMuc: Joi.array().items(Joi.number().integer().positive()).unique().messages({
    'array.unique': 'Danh sách thể loại không được chứa phần tử trùng lặp'
  })
});

/**
 * @swagger
 * /api/admin/discounts:
 *   get:
 *     summary: Xem danh sách chương trình giảm giá (Quản trị viên, Thủ kho)
 *     tags: [Giảm Giá (Discounts)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *       - in: query
 *         name: trangThai
 *         schema:
 *           type: string
 *           enum: [DANG_CHAY, SAP_DIEN_RA, DA_HET_HAN, TAM_DUNG]
 *     responses:
 *       200:
 *         description: Danh sách chương trình giảm giá
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền truy cập
 *   post:
 *     summary: Tạo chương trình giảm giá mới (Chỉ Quản trị viên)
 *     tags: [Giảm Giá (Discounts)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tenChuongTrinh
 *               - phanTramGiam
 *               - ngayBatDau
 *               - ngayKetThuc
 *             properties:
 *               tenChuongTrinh:
 *                 type: string
 *               phanTramGiam:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 60
 *               ngayBatDau:
 *                 type: string
 *                 format: date-time
 *               ngayKetThuc:
 *                 type: string
 *                 format: date-time
 *               danhSachMaSach:
 *                 type: array
 *                 items:
 *                   type: integer
 *               danhSachMaDanhMuc:
 *                 type: array
 *                 items:
 *                   type: integer
 *     responses:
 *       201:
 *         description: Tạo chương trình thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền
 */
router.get(
  '/',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho'),
  kiemTraDuLieu(luatTruyVanDanhSach, 'query'),
  batLoiAsync(giamGiaController.xuLyLayDanhSach)
);

router.post(
  '/',
  xacThucToken,
  phanQuyen('quan_tri'),
  kiemTraDuLieu(luatTaoChuongTrinh, 'body'),
  batLoiAsync(giamGiaController.xuLyTao)
);

/**
 * @swagger
 * /api/admin/discounts/{id}:
 *   get:
 *     summary: Xem chi tiết chương trình giảm giá (Quản trị viên, Thủ kho)
 *     tags: [Giảm Giá (Discounts)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thông tin chi tiết kèm danh sách sách/thể loại áp dụng
 *       404:
 *         description: Không tìm thấy
 *   put:
 *     summary: Cập nhật chương trình giảm giá (Chỉ Quản trị viên)
 *     tags: [Giảm Giá (Discounts)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Cập nhật thành công
 *       400:
 *         description: Dữ liệu không hợp lệ
 *       403:
 *         description: Không có quyền
 */
router.get(
  '/:id',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho'),
  batLoiAsync(giamGiaController.xuLyLayChiTiet)
);

router.put(
  '/:id',
  xacThucToken,
  phanQuyen('quan_tri'),
  kiemTraDuLieu(luatCapNhatChuongTrinh, 'body'),
  batLoiAsync(giamGiaController.xuLyCapNhat)
);

/**
 * @swagger
 * /api/admin/discounts/{id}/toggle:
 *   patch:
 *     summary: Bật hoặc Tạm dừng chương trình giảm giá (Chỉ Quản trị viên)
 *     tags: [Giảm Giá (Discounts)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Thay đổi trạng thái thành công
 *       403:
 *         description: Không có quyền
 */
router.patch(
  '/:id/toggle',
  xacThucToken,
  phanQuyen('quan_tri'),
  batLoiAsync(giamGiaController.xuLyToggle)
);

module.exports = router;
