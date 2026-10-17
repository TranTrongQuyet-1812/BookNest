/**
 * Model Sequelize ánh xạ bảng ChuongTrinhGiamGiaDoiTuong (GG02)
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const ChuongTrinhGiamGiaDoiTuong = sequelize.define('ChuongTrinhGiamGiaDoiTuong', {
  MaDoiTuong: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  MaChuongTrinh: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  MaSach: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  MaDanhMuc: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'ChuongTrinhGiamGiaDoiTuong',
  timestamps: false
});

module.exports = ChuongTrinhGiamGiaDoiTuong;
