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
  // Người thực hiện là khách hoặc nhân viên (đúng một trong hai); cả hai NULL = khách vãng lai tự đặt
  MaKhachHangThucHien: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  MaNhanVienThucHien: {
    type: DataTypes.INTEGER,
    allowNull: true
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
