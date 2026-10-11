/**
 * Model Sequelize ánh xạ bảng ChiTietDonHang trong cơ sở dữ liệu BookNestDB.
 * Lưu danh sách sách trong đơn cùng đơn giá đã chốt tại thời điểm mua hàng.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const ChiTietDonHang = sequelize.define('ChiTietDonHang', {
  MaDonHang: {
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
  },
  DonGia: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  }
}, {
  tableName: 'ChiTietDonHang',
  freezeTableName: true,
  timestamps: false
});

module.exports = ChiTietDonHang;
