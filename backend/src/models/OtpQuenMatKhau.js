/**
 * Model Sequelize ánh xạ bảng OtpQuenMatKhau trong cơ sở dữ liệu BookNestDB.
 * Quản lý mã xác thực OTP quên mật khẩu lưu bằng băm HMAC-SHA256 (R12 - DATABASE_SCHEMA mục 3.12).
 * TUYỆT ĐỐI KHÔNG lưu mã OTP dạng văn bản thuần trong CSDL.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const OtpQuenMatKhau = sequelize.define('OtpQuenMatKhau', {
  MaOtp: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  MaKhachHang: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  MaOtpBam: {
    type: DataTypes.CHAR(64),
    allowNull: false
  },
  TaoLuc: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  HetHanLuc: {
    type: DataTypes.DATE,
    allowNull: false
  },
  SoLanThu: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  DaDung: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'OtpQuenMatKhau',
  freezeTableName: true,
  timestamps: false
});

module.exports = OtpQuenMatKhau;
