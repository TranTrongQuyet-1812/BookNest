/**
 * Model Sequelize ánh xạ bảng LichSuNhapKho trong cơ sở dữ liệu BookNestDB.
 * Nhật ký ghi nhận các đợt nhập sách của thủ thư hoặc quản trị viên.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const LichSuNhapKho = sequelize.define('LichSuNhapKho', {
  MaNhapKho: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  MaSach: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  SoLuongNhap: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  MaNguoiNhap: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  GhiChu: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  tableName: 'LichSuNhapKho',
  freezeTableName: true,
  createdAt: 'NgayNhap',
  updatedAt: false
});

module.exports = LichSuNhapKho;
