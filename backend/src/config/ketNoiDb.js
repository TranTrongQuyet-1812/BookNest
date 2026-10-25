/**
 * Quản lý khởi tạo đối tượng Sequelize kết nối tới PostgreSQL.
 * Máy dev nối bằng DB_HOST, DB_PORT...; Heroku cấp sẵn DATABASE_URL và bắt buộc SSL.
 */
const { Sequelize } = require('sequelize');
const cauHinh = require('./cauHinh');

// Driver pg trả NUMERIC (DECIMAL) dưới dạng chuỗi. Giá tiền của dự án là số VND (12 chữ số, 2 lẻ, rất xa giới hạn
// chính xác của số thực) nên đọc thẳng ra số, giống hành vi của bản SQL Server; nếu không, giao diện nhận "85000.00".
Sequelize.postgres.DECIMAL.parse = (giaTri) => parseFloat(giaTri);

const tuyChonChung = {
  dialect: 'postgres',
  // Heroku Postgres dùng chứng chỉ do Heroku ký nên không xác minh được chuỗi chứng chỉ; vẫn mã hóa đường truyền
  dialectOptions: cauHinh.csdl.dungSsl
    ? { ssl: { require: true, rejectUnauthorized: false } }
    : {},
  // Tắt in câu lệnh SQL thô để tránh tràn màn hình và bảo mật thông tin
  logging: false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};

// Khởi tạo đối tượng Sequelize kết nối PostgreSQL (múi giờ phiên mặc định là UTC)
const sequelize = cauHinh.csdl.url
  ? new Sequelize(cauHinh.csdl.url, tuyChonChung)
  : new Sequelize(
    cauHinh.csdl.tenCsdl,
    cauHinh.csdl.nguoiDung,
    cauHinh.csdl.matKhau,
    {
      ...tuyChonChung,
      host: cauHinh.csdl.mayChu,
      port: cauHinh.csdl.cong
    }
  );

// Hàm kiểm tra trạng thái kết nối CSDL khi khởi động máy chủ
async function kiemTraKetNoiDb() {
  try {
    await sequelize.authenticate();
    console.log('[BookNest DB] Kết nối cơ sở dữ liệu PostgreSQL thành công!');
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
