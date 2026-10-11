/**
 * Quản lý khởi tạo đối tượng Sequelize kết nối tới Microsoft SQL Server 2022.
 * Thiết lập dialectOptions để hỗ trợ chứng chỉ tự ký của môi trường dev cục bộ.
 */
const { Sequelize } = require('sequelize');
const cauHinh = require('./cauHinh');

// Khởi tạo đối tượng Sequelize kết nối Microsoft SQL Server
const sequelize = new Sequelize(
  cauHinh.csdl.tenCsdl,
  cauHinh.csdl.nguoiDung,
  cauHinh.csdl.matKhau,
  {
    host: cauHinh.csdl.mayChu,
    port: cauHinh.csdl.cong,
    dialect: 'mssql',
    dialectOptions: {
      options: {
        // trustServerCertificate bật ở dev vì SQL Server cục bộ dùng chứng chỉ tự ký
        trustServerCertificate: true,
        encrypt: false,
        enableArithAbort: true
      }
    },
    // Tắt in câu lệnh SQL thô để tránh tràn màn hình và bảo mật thông tin
    logging: false,
    pool: {
      max: 10,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Hàm kiểm tra trạng thái kết nối CSDL khi khởi động máy chủ
async function kiemTraKetNoiDb() {
  try {
    await sequelize.authenticate();
    console.log('[BookNest DB] Kết nối cơ sở dữ liệu Microsoft SQL Server thành công!');
    return true;
  } catch (loi) {
    console.error('[BookNest DB] Lỗi không thể kết nối cơ sở dữ liệu:', loi.message);
    throw loi;
  }
}

module.exports = {
  sequelize,
  kiemTraKetNoiDb
};
