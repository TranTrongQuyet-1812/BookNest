/**
 * Model Sequelize ánh xạ bảng DanhMuc trong cơ sở dữ liệu BookNestDB.
 * Quản lý danh mục thể loại sách.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const DanhMuc = sequelize.define('DanhMuc', {
  MaDanhMuc: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  TenDanhMuc: {
    type: DataTypes.CITEXT,
    allowNull: false,
    unique: true
  },
  MoTa: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  tableName: 'DanhMuc',
  freezeTableName: true,
  createdAt: 'NgayTao',
  updatedAt: 'NgayCapNhat'
});

module.exports = DanhMuc;
