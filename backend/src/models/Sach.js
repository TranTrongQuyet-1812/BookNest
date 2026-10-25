/**
 * Model Sequelize ánh xạ bảng Sach trong cơ sở dữ liệu BookNestDB.
 * Quản lý thông tin sách, tác giả, giá bán, tồn kho và trạng thái ẩn/hiện.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const Sach = sequelize.define('Sach', {
  MaSach: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  TenSach: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  TacGia: {
    type: DataTypes.STRING(150),
    allowNull: false,
    get() {
      const raw = this.getDataValue('TacGia');
      if (!raw || typeof raw !== 'string') return raw;
      return raw.replace(/&nbsp;?/gi, ' ').replace(/nbsp;?/gi, ' ').replace(/\s+/g, ' ').trim();
    }
  },
  MoTa: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  GiaBan: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false
  },
  SoLuongTon: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  NguongCanhBao: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 5
  },
  AnhBia: {
    type: DataTypes.STRING(500),
    allowNull: true
  },
  Tap: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  TenBo: {
    type: DataTypes.CITEXT,
    allowNull: true
  },
  MaDanhMuc: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  DaAn: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
  }
}, {
  tableName: 'Sach',
  freezeTableName: true,
  createdAt: 'NgayTao',
  updatedAt: 'NgayCapNhat'
});

module.exports = Sach;
