/**
 * Module quản lý kết nối WebSocket thời gian thực (Socket.IO) cho BookNest (T43).
 * Thiết kế theo kiến trúc tách biệt: Service nghiệp vụ chỉ gọi hàm phát sự kiện, không đụng trực tiếp tới socket.
 */
const { Server } = require('socket.io');
const cauHinh = require('../config/cauHinh');

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
    // Khách hàng hoặc giao diện tham gia phòng theo dõi đơn hàng
    socket.on('tham_gia_don_hang', (maDonHang) => {
      if (maDonHang) {
        const phong = `don_hang:${maDonHang}`;
        socket.join(phong);
      }
    });

    // Rời phòng theo dõi đơn hàng
    socket.on('roi_don_hang', (maDonHang) => {
      if (maDonHang) {
        const phong = `don_hang:${maDonHang}`;
        socket.leave(phong);
      }
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
 * Phát sự kiện thanh toán thành công tức thì tới phòng đơn hàng
 */
function phatThanhToanThanhCong(duLieu) {
  const { maDonHang, soTien, maGiaoDichPayos } = duLieu;
  phatSuKien(
    'thanhToan:daThanhToan',
    {
      maDonHang,
      trangThai: 'DA_THANH_TOAN',
      soTien,
      maGiaoDichPayos,
      thoiGian: new Date().toISOString()
    },
    `don_hang:${maDonHang}`
  );

  // Đồng thời báo cho phòng nhân viên để cập nhật danh sách đơn
  phatSuKien('donHang:capNhatTrangThai', {
    maDonHang,
    trangThaiDonHang: 'DA_XAC_NHAN',
    trangThaiThanhToan: 'DA_THANH_TOAN'
  }, 'nhan_vien');
}

module.exports = {
  khoiTaoSocket,
  layIo,
  phatSuKien,
  phatThanhToanThanhCong
};
