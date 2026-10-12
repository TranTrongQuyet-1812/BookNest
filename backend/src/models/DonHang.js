/**
 * Model Sequelize ánh xạ bảng DonHang trong cơ sở dữ liệu BookNestDB.
 * Quản lý đơn đặt hàng của khách hàng (lưu trạng thái hiện tại của đơn).
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const DonHang = sequelize.define('DonHang', {
  MaDonHang: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  // NULL = đơn của khách vãng lai (không có tài khoản, thông tin giao hàng nằm ngay trên đơn)
  MaKhachHang: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  TenNguoiNhan: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  SoDienThoaiNhan: {
    type: DataTypes.STRING(15),
    allowNull: false
  },
  // Email nhận thông báo trạng thái đơn (API bắt buộc, DB cho NULL vì đơn cũ chưa có)
  EmailNhan: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  DiaChiGiaoHang: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  GhiChu: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  TongTien: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  TrangThai: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'CHO_DUYET'
  }
}, {
  tableName: 'DonHang',
  freezeTableName: true,
  createdAt: 'NgayDat',
  updatedAt: 'NgayCapNhat'
});

module.exports = DonHang;
