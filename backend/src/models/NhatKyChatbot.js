/**
 * Model Sequelize ánh xạ bảng NhatKyChatbot trong cơ sở dữ liệu BookNestDB.
 * Quản lý lịch sử tiêu thụ token, công cụ đã gọi và trạng thái thực thi của AI Chatbot.
 * TUYỆT ĐỐI KHÔNG lưu trữ nội dung hội thoại nhạy cảm của khách hàng.
 */
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/ketNoiDb');

const NhatKyChatbot = sequelize.define('NhatKyChatbot', {
  MaNhatKy: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  MaKhachHang: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  KhoaPhien: {
    type: DataTypes.STRING(64),
    allowNull: true
  },
  SoToken: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  TenCongCu: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  KetQua: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'THANH_CONG',
    validate: {
      isIn: [['THANH_CONG', 'LOI', 'BI_TU_CHOI', 'QUA_GIOI_HAN']]
    }
  },
  GhiChu: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  NgayGhi: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'NhatKyChatbot',
  freezeTableName: true,
  timestamps: false
});

module.exports = NhatKyChatbot;
