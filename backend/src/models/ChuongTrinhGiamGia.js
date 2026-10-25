/**
 * Model Sequelize ánh xạ bảng ChuongTrinhGiamGia (GG02)
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const ChuongTrinhGiamGia = sequelize.define('ChuongTrinhGiamGia', {
  MaChuongTrinh: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  TenChuongTrinh: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  PhanTramGiam: {
    type: DataTypes.SMALLINT,
    allowNull: false,
    validate: {
      min: 1,
      max: 60
    }
  },
  NgayBatDau: {
    type: DataTypes.DATE,
    allowNull: false
  },
  NgayKetThuc: {
    type: DataTypes.DATE,
    allowNull: false
  },
  DangHoatDong: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  MaNhanVienTao: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {
  tableName: 'ChuongTrinhGiamGia',
  timestamps: true,
  createdAt: 'NgayTao',
  updatedAt: 'NgayCapNhat'
});

module.exports = ChuongTrinhGiamGia;
