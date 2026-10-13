/**
 * Model Sequelize ánh xạ bảng CauHinhHeThong trong cơ sở dữ liệu BookNestDB.
 * Quản lý các công tắc cấu hình hệ thống (ví dụ: THANH_TOAN_QR_BAT, HAN_THANH_TOAN_QR_PHUT).
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const CauHinhHeThong = sequelize.define('CauHinhHeThong', {
  Khoa: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false
  },
  GiaTri: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  MoTa: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  MaNhanVienCapNhat: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: 'CauHinhHeThong',
  freezeTableName: true,
  createdAt: false,
  updatedAt: 'NgayCapNhat'
});

module.exports = CauHinhHeThong;
