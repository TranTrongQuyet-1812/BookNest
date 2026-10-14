/**
 * Client SDK payOS dùng chung cho các service thanh toán.
 * Là null nếu chưa đủ ba khóa trong .env hoặc khởi tạo lỗi (các nơi dùng phải kiểm tra null).
 */
const { PayOS } = require('@payos/node');
const cauHinh = require('../config/cauHinh');

let payOSClient = null;
if (cauHinh.payos.daCauHinh) {
  try {
    payOSClient = new PayOS({
      clientId: cauHinh.payos.clientId,
      apiKey: cauHinh.payos.apiKey,
      checksumKey: cauHinh.payos.checksumKey
    });
  } catch (err) {
    console.warn('[payOS] Không thể khởi tạo SDK payOS:', err.message);
  }
}

module.exports = payOSClient;
