/**
 * Module quản lý kết nối WebSocket thời gian thực (Socket.IO) cho BookNest (T43).
 * Thiết kế theo kiến trúc tách biệt: Service nghiệp vụ chỉ gọi hàm phát sự kiện, không đụng trực tiếp tới socket.
 */
const { Server } = require('socket.io');
const cauHinh = require('../config/cauHinh');
const { chuanHoaMaTraCuu } = require('../utils/maTraCuu');

let io = null;

/**
 * Khởi tạo Socket.IO server gắn vào cùng HTTP server của Express
 */
function khoiTaoSocket(httpServer) {
  // Tập hợp danh sách domain được phép kết nối WebSocket
  const danhSachOrigins = [
    ...(cauHinh.corsStorefront || []),
    ...(cauHinh.corsBackOffice || []),
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174'
  ];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Cho phép các yêu cầu không có origin (như mobile app/curl) hoặc nằm trong danh sách
        if (!origin || danhSachOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(null, true); // Chế độ phát triển cho phép linh hoạt
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    // Khách hàng hoặc giao diện tham gia phòng theo dõi đơn hàng. Phòng đặt tên theo MÃ TRA CỨU (khó đoán),
    // chỉ ai biết mã mới nghe được; mã sai định dạng bị bỏ qua
    socket.on('tham_gia_don_hang', (maTraCuu) => {
      const ma = chuanHoaMaTraCuu(maTraCuu);
      if (ma) socket.join(`don_hang:${ma}`);
    });

    // Rời phòng theo dõi đơn hàng
    socket.on('roi_don_hang', (maTraCuu) => {
      const ma = chuanHoaMaTraCuu(maTraCuu);
      if (ma) socket.leave(`don_hang:${ma}`);
    });

    // Nhân viên tham gia phòng quản trị
    socket.on('tham_gia_nhan_vien', () => {
      socket.join('nhan_vien');
    });

    socket.on('disconnect', () => {
      // Tự động dọn dẹp khi ngắt kết nối
    });
  });

  return io;
}

/**
 * Lấy đối tượng Socket.IO hiện tại
 */
function layIo() {
  return io;
}

/**
 * Phát sự kiện thời gian thực đến toàn bộ hoặc một phòng cụ thể
 */
function phatSuKien(tenSuKien, duLieu = {}, phong = null) {
  if (!io) {
    console.warn('[Socket.IO] Chưa khởi tạo máy chủ socket, bỏ qua phát sự kiện:', tenSuKien);
    return;
  }

  if (phong) {
    io.to(phong).emit(tenSuKien, duLieu);
  } else {
    io.emit(tenSuKien, duLieu);
  }
}

/**
 * Phát sự kiện thanh toán thành công tức thì tới phòng đơn hàng.
 * Phòng của khách chỉ nhận mã tra cứu (không có MaDonHang tăng dần); phòng nhân viên nhận cả hai để cập nhật danh sách.
 */
function phatThanhToanThanhCong(duLieu) {
  const { maDonHang, maTraCuu, soTien, maGiaoDichPayos } = duLieu;
  if (maTraCuu) {
    phatSuKien(
      'thanhToan:daThanhToan',
      {
        maTraCuu,
        trangThai: 'DA_THANH_TOAN',
        soTien,
        maGiaoDichPayos,
        thoiGian: new Date().toISOString()
      },
      `don_hang:${maTraCuu}`
    );
  }

  // Đồng thời báo cho phòng nhân viên để cập nhật danh sách đơn
  phatSuKien('donHang:capNhatTrangThai', {
    maDonHang,
    maTraCuu,
    trangThaiDonHang: 'DA_XAC_NHAN',
    trangThaiThanhToan: 'DA_THANH_TOAN'
  }, 'nhan_vien');
}

/**
 * Báo đơn chuyển khoản đã bị hủy do hết hạn: trang của khách (phòng theo mã tra cứu) đóng khung QR,
 * phòng nhân viên cập nhật danh sách đơn.
 */
function phatDonHetHan({ maDonHang, maTraCuu }) {
  if (maTraCuu) {
    phatSuKien('thanhToan:hetHan', { maTraCuu, thoiGian: new Date().toISOString() }, `don_hang:${maTraCuu}`);
  }
  phatSuKien('donHang:capNhatTrangThai', { maDonHang, maTraCuu, trangThaiDonHang: 'DA_HUY', trangThaiThanhToan: 'HET_HAN' }, 'nhan_vien');
}

module.exports = {
  khoiTaoSocket,
  layIo,
  phatSuKien,
  phatThanhToanThanhCong,
  phatDonHetHan
};
