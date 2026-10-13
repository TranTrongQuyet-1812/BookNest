/**
 * Model Sequelize ánh xạ bảng NhatKyWebhookPayos trong cơ sở dữ liệu BookNestDB.
 * Lưu trữ nguyên văn toàn bộ webhook từ payOS để phục vụ kiểm toán và đối soát bảo mật.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const NhatKyWebhookPayos = sequelize.define('NhatKyWebhookPayos', {
  MaNhatKy: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  MaGiaoDichPayos: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  NoiDungTho: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  ChuKyHopLe: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  KetQuaXuLy: {
    type: DataTypes.STRING(50),
    allowNull: false
  }
}, {
  tableName: 'NhatKyWebhookPayos',
  freezeTableName: true,
  createdAt: 'NgayNhan',
  updatedAt: false
});

module.exports = NhatKyWebhookPayos;
