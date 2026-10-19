/**
 * Model Sequelize ánh xạ bảng ThanhToan trong cơ sở dữ liệu BookNestDB.
 * Quản lý phương thức và vòng đời thanh toán của đơn hàng (COD / Chuyển khoản VietQR payOS / Tiền mặt tại quầy).
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const ThanhToan = sequelize.define('ThanhToan', {
  MaThanhToan: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  MaDonHang: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  PhuongThuc: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'COD'
  },
  TrangThai: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'CHO_THANH_TOAN'
  },
  SoTien: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  MaGiaoDichPayos: {
    type: DataTypes.BIGINT,
    allowNull: true,
    unique: true
  },
  MaLienKetPayos: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  DuongDanThanhToan: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  QrCode: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  NgayHetHan: {
    type: DataTypes.DATE,
    allowNull: true
  },
  NgayThanhToan: {
    type: DataTypes.DATE,
    allowNull: true
  },
  MaThamChieuNganHang: {
    type: DataTypes.STRING(100),
    allowNull: true
  }
}, {
  tableName: 'ThanhToan',
  freezeTableName: true,
  createdAt: 'NgayTao',
  updatedAt: 'NgayCapNhat'
});

module.exports = ThanhToan;
