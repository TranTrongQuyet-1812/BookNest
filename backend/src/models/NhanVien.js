/**
 * Model Sequelize ánh xạ bảng NhanVien trong cơ sở dữ liệu BookNestDB.
 * Quản lý tài khoản nhân sự Back-Office với 3 vai trò: quan_tri, thu_kho, thu_thu.
 * Khách hàng nằm ở bảng riêng KhachHang, hai bảng không dùng chung đăng nhập.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const NhanVien = sequelize.define('NhanVien', {
  MaNhanVien: {
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
  VaiTro: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  DangHoatDong: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'NhanVien',
  freezeTableName: true,
  createdAt: 'NgayTao',
  updatedAt: 'NgayCapNhat'
});

module.exports = NhanVien;
