/**
 * Model Sequelize ánh xạ bảng KhachHang trong cơ sở dữ liệu BookNestDB.
 * Quản lý tài khoản khách hàng của Storefront (giỏ hàng, đơn hàng, đánh giá).
 * Khách hàng không có cột vai trò: trong token mang giá trị khach_hang.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const KhachHang = sequelize.define('KhachHang', {
  MaKhachHang: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  HoTen: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  Email: {
    type: DataTypes.CITEXT,
    allowNull: false,
    unique: true
  },
  MatKhauHash: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  SoDienThoai: {
    type: DataTypes.STRING(15),
    allowNull: true
  },
  DiaChiMacDinh: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  DangHoatDong: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'KhachHang',
  freezeTableName: true,
  createdAt: 'NgayTao',
  updatedAt: 'NgayCapNhat'
});

module.exports = KhachHang;
