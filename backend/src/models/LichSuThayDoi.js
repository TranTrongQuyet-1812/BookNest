/** Nhật ký thay đổi trường dữ liệu để quản trị viên tra soát. */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const LichSuThayDoi = sequelize.define('LichSuThayDoi', {
  MaLichSuThayDoi: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true, allowNull: false },
  LoaiDoiTuong: { type: DataTypes.STRING(30), allowNull: false },
  MaDoiTuong: { type: DataTypes.INTEGER, allowNull: false },
  TruongDuLieu: { type: DataTypes.STRING(50), allowNull: false },
  GiaTriCu: { type: DataTypes.TEXT, allowNull: true },
  GiaTriMoi: { type: DataTypes.TEXT, allowNull: true },
  MaNhanVienThayDoi: { type: DataTypes.INTEGER, allowNull: false },
  NgayThayDoi: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
}, {
  tableName: 'LichSuThayDoi',
  freezeTableName: true,
  timestamps: false
});

module.exports = LichSuThayDoi;
