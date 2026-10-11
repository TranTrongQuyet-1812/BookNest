/**
 * Model Sequelize ánh xạ bảng GioHang trong cơ sở dữ liệu BookNestDB.
 * Bảng trung gian n-n giữa NguoiDung và Sach, sử dụng khóa chính ghép (MaNguoiDung, MaSach).
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const GioHang = sequelize.define('GioHang', {
  MaNguoiDung: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  MaSach: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    allowNull: false
  },
  SoLuong: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'GioHang',
  freezeTableName: true,
  createdAt: 'NgayThem',
  updatedAt: false
});

module.exports = GioHang;
