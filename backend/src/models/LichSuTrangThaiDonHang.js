/**
 * Model Sequelize ánh xạ bảng LichSuTrangThaiDonHang trong cơ sở dữ liệu BookNestDB.
 * Dòng thời gian ghi nhận các lần chuyển đổi trạng thái của đơn hàng và người thực hiện.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const LichSuTrangThaiDonHang = sequelize.define('LichSuTrangThaiDonHang', {
  MaLichSu: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  MaDonHang: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  TrangThaiCu: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  TrangThaiMoi: {
    type: DataTypes.STRING(20),
    allowNull: false
  },
  MaNguoiThucHien: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  GhiChu: {
    type: DataTypes.STRING(500),
    allowNull: true
  }
}, {
  tableName: 'LichSuTrangThaiDonHang',
  freezeTableName: true,
  createdAt: 'NgayThayDoi',
  updatedAt: false
});

module.exports = LichSuTrangThaiDonHang;
