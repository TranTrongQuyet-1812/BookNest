/** Nhật ký các lần điều chỉnh tồn kho khác với nhập hàng thông thường. */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const LichSuDieuChinhKho = sequelize.define('LichSuDieuChinhKho', {
  MaDieuChinhKho: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  MaSach: { type: DataTypes.INTEGER, allowNull: false },
  SoLuongThayDoi: { type: DataTypes.INTEGER, allowNull: false },
  TonTruoc: { type: DataTypes.INTEGER, allowNull: false },
  TonSau: { type: DataTypes.INTEGER, allowNull: false },
  LoaiDieuChinh: { type: DataTypes.STRING(20), allowNull: false },
  GhiChu: { type: DataTypes.STRING(500), allowNull: true },
  MaNhanVienDieuChinh: { type: DataTypes.INTEGER, allowNull: false },
  NgayDieuChinh: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'LichSuDieuChinhKho',
  freezeTableName: true,
  timestamps: false
});

module.exports = LichSuDieuChinhKho;
