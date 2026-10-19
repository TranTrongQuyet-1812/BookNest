/**
 * Tuyến đường (Routes) quản lý danh mục thể loại sách (/api/categories).
 */
const express = require('express');
const Joi = require('joi');
const danhMucController = require('../controllers/danhMucController');
const batLoiAsync = require('../middlewares/batLoiAsync');
const xacThucToken = require('../middlewares/xacThucToken');
const phanQuyen = require('../middlewares/phanQuyen');
const kiemTraDuLieu = require('../middlewares/kiemTraDuLieu');

const taoKiemTraMaSo = require('../middlewares/kiemTraMaSo');

const router = express.Router();

// Mã trên đường dẫn phải là số nguyên dương hợp lệ, sai thì 400 thay vì 500
router.param('id', taoKiemTraMaSo('danh mục'));

// Schema kiểm tra tạo danh mục
const luatDanhMuc = Joi.object({
  tenDanhMuc: Joi.string().trim().min(2).max(100).required().messages({
    'string.empty': 'Tên danh mục không được để trống',
    'string.min': 'Tên danh mục phải có ít nhất 2 ký tự',
    'string.max': 'Tên danh mục không được vượt quá 100 ký tự',
    'any.required': 'Tên danh mục là bắt buộc'
  }),
  moTa: Joi.string().trim().max(500).allow(null, '').messages({
    'string.max': 'Mô tả không được vượt quá 500 ký tự'
  })
});

/**
 * @swagger
 * /api/categories:
 *   get:
 *     summary: Xem danh sách danh mục thể loại sách kèm số lượng sách
 *     tags: [Danh mục (Categories)]
 *     responses:
 *       200:
 *         description: Danh sách danh mục
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 */
router.get('/', batLoiAsync(danhMucController.xuLyLayDanhSach));

/**
 * @swagger
 * /api/categories/{id}:
 *   get:
 *     summary: Xem chi tiết một danh mục
 *     tags: [Danh mục (Categories)]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã danh mục
 *     responses:
 *       200:
 *         description: Chi tiết danh mục
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       404:
 *         description: Không tìm thấy danh mục
 */
router.get('/:id', batLoiAsync(danhMucController.xuLyLayChiTiet));

/**
 * @swagger
 * /api/categories:
 *   post:
 *     summary: Thêm danh mục thể loại mới (Quản trị viên, Thủ kho, Thủ thư)
 *     tags: [Danh mục (Categories)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenDanhMuc]
 *             properties:
 *               tenDanhMuc:
 *                 type: string
 *                 example: Khoa Học Viễn Tưởng
 *               moTa:
 *                 type: string
 *                 example: Tuyển tập các tác phẩm khám phá vũ trụ và tương lai
 *     responses:
 *       201:
 *         description: Tạo danh mục thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       400:
 *         description: Tên danh mục không hợp lệ
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền thực hiện
 *       409:
 *         description: Tên danh mục đã tồn tại
 */
router.post(
  '/',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho'),
  kiemTraDuLieu(luatDanhMuc),
  batLoiAsync(danhMucController.xuLyTao)
);

/**
 * @swagger
 * /api/categories/{id}:
 *   put:
 *     summary: Cập nhật thông tin danh mục (Quản trị viên, Thủ kho)
 *     tags: [Danh mục (Categories)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã danh mục
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tenDanhMuc]
 *             properties:
 *               tenDanhMuc:
 *                 type: string
 *                 example: Khoa Học - Công Nghệ
 *               moTa:
 *                 type: string
 *                 example: Sách nghiên cứu khoa học và phát triển công nghệ
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
 *         description: Không có quyền thực hiện
 *       404:
 *         description: Không tìm thấy danh mục
 *       409:
 *         description: Tên danh mục đã trùng với danh mục khác
 */
router.put(
  '/:id',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho'),
  kiemTraDuLieu(luatDanhMuc),
  batLoiAsync(danhMucController.xuLyCapNhat)
);

/**
 * @swagger
 * /api/categories/{id}:
 *   delete:
 *     summary: Xóa danh mục khi không có sách gắn kèm (Quản trị viên, Thủ kho)
 *     tags: [Danh mục (Categories)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Mã danh mục
 *     responses:
 *       200:
 *         description: Xóa danh mục thành công
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/PhanHoiThanhCong'
 *       401:
 *         description: Chưa đăng nhập
 *       403:
 *         description: Không có quyền thực hiện
 *       404:
 *         description: Không tìm thấy danh mục
 *       409:
 *         description: Không thể xóa vì vẫn còn sách thuộc danh mục này
 */
router.delete(
  '/:id',
  xacThucToken,
  phanQuyen('quan_tri', 'thu_kho'),
  batLoiAsync(danhMucController.xuLyXoa)
);

module.exports = router;
