/**
 * Model Sequelize ánh xạ bảng DonHang trong cơ sở dữ liệu BookNestDB.
 * Quản lý đơn đặt hàng của khách hàng (lưu trạng thái hiện tại của đơn).
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const DonHang = sequelize.define('DonHang', {
  MaDonHang: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  MaNguoiDung: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  TenNguoiNhan: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  SoDienThoaiNhan: {
    type: DataTypes.STRING(15),
    allowNull: false
  },
  DiaChiGiaoHang: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  GhiChu: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  TongTien: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  TrangThai: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'PENDING'
  }
}, {
  tableName: 'DonHang',
  freezeTableName: true,
  createdAt: 'NgayDat',
  updatedAt: 'NgayCapNhat'
});

module.exports = DonHang;
