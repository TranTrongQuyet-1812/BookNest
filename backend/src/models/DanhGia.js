/**
 * Model Sequelize ánh xạ bảng DanhGia trong cơ sở dữ liệu BookNestDB.
 * Quản lý số sao (1-5 sao) và nhận xét của khách hàng đối với sách.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const DanhGia = sequelize.define('DanhGia', {
  MaDanhGia: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  MaNguoiDung: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  MaSach: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  SoSao: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  NoiDung: {
    type: DataTypes.STRING(1000),
    allowNull: true
  }
}, {
  tableName: 'DanhGia',
  freezeTableName: true,
  createdAt: 'NgayTao',
  updatedAt: 'NgayCapNhat'
});

module.exports = DanhGia;
