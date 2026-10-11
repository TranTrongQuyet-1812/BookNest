/**
 * Model Sequelize ánh xạ bảng NguoiDung trong cơ sở dữ liệu BookNestDB.
 * Quản lý thông tin tài khoản khách hàng, thủ thư, nhân viên đơn hàng và quản trị viên.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const NguoiDung = sequelize.define('NguoiDung', {
  MaNguoiDung: {
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
    type: DataTypes.STRING(255),
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
  VaiTro: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'customer'
  },
  DangHoatDong: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  }
}, {
  tableName: 'NguoiDung',
  freezeTableName: true,
  createdAt: 'NgayTao',
  updatedAt: 'NgayCapNhat'
});

module.exports = NguoiDung;
