/**
 * Module quản lý kết nối WebSocket thời gian thực (Socket.IO) cho BookNest (T43).
 * Thiết kế theo kiến trúc tách biệt: Service nghiệp vụ chỉ gọi hàm phát sự kiện, không đụng trực tiếp tới socket.
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const cauHinh = require('../config/cauHinh');
const { chuanHoaMaTraCuu } = require('../utils/maTraCuu');
const { xacMinhToken } = require('../middlewares/xacThucToken');

let io = null;

// Client gửi token dạng chuỗi hoặc { token }
function layToken(duLieuXacThuc) {
  return typeof duLieuXacThuc === 'string' ? duLieuXacThuc : duLieuXacThuc?.token;
}

// Khóa nhận diện tài khoản gắn vào socket để thu hồi kết nối khi cần
function khoaTaiKhoan(aud, ma) {
  return `${aud}:${ma}`;
}

const VAI_TRO_NHAN_SU = ['quan_tri', 'thu_kho', 'thu_thu'];

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
    'http://localhost:5174',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174'
  ];

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Cho phép các yêu cầu không có origin (như curl / mobile app / server-to-server)
        if (!origin) return callback(null, true);

        // Kiểm tra xem origin có nằm trong whitelist hoặc là localhost / dev LAN hợp lệ không
        const hopLe = danhSachOrigins.includes(origin) ||
          /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);

        if (hopLe) {
          return callback(null, true);
        }
        return callback(new Error(`CORS WebSocket bị chặn cho origin: ${origin}`));
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

    // Khách hàng tham gia phòng cá nhân: token phải còn hiệu lực với CSDL (tài khoản còn hoạt động, mật khẩu chưa đổi)
    socket.on('tham_gia_khach_hang', async (duLieuXacThuc) => {
      try {
        const token = layToken(duLieuXacThuc);
        if (!token) return;
        const nguoiDung = await xacMinhToken(token);
        if (nguoiDung.aud === 'khach_hang') {
          socket.data.taiKhoan = khoaTaiKhoan(nguoiDung.aud, nguoiDung.id);
          socket.join(`khach_hang:${nguoiDung.id}`);
        }
      } catch (err) {
        console.warn('[Socket] Bỏ qua lỗi token phòng khách:', err.message);
      }
    });

    socket.on('roi_khach_hang', (duLieuXacThuc) => {
      try {
        const token = layToken(duLieuXacThuc);
        if (!token) return;
        const biMat = cauHinh.jwt?.biMat || cauHinh.jwtBiMat;
        const giaiMa = jwt.verify(token, biMat);
        if (giaiMa.id) socket.leave(`khach_hang:${giaiMa.id}`);
      } catch (err) {
        console.warn('[Socket] Bỏ qua lỗi token rời phòng khách:', err.message);
      }
    });

    // Nhân viên tham gia phòng quản trị: vai trò lấy từ CSDL (không tin claim trong token), tài khoản bị khóa hay đã đổi mật khẩu thì bị từ chối
    socket.on('tham_gia_nhan_vien', async (duLieuXacThuc) => {
      const baoLoi = (thongDiep) => {
        socket.emit('loi_xac_thuc', { thongDiep });
        socket.emit('loi_auth_socket', { thongDiep });
      };

      const token = layToken(duLieuXacThuc);
      if (!token) {
        baoLoi('Thiếu mã xác thực (token) nhân viên');
        return;
      }

      try {
        const nguoiDung = await xacMinhToken(token);
        if (nguoiDung.aud !== 'nhan_vien' || !VAI_TRO_NHAN_SU.includes(nguoiDung.role)) {
          baoLoi('Quyền truy cập phòng quản trị bị từ chối');
          return;
        }

        socket.data.taiKhoan = khoaTaiKhoan(nguoiDung.aud, nguoiDung.id);
        socket.join('nhan_vien');
        const hoTen = nguoiDung.fullName || 'Nhân viên BookNest';
        socket.emit('tham_gia_nhan_vien_thanh_cong', { role: nguoiDung.role, hoTen });
        socket.emit('da_tham_gia_nhan_vien', { thanhCong: true, vaiTro: nguoiDung.role, hoTen });
      } catch (err) {
        console.warn('[Socket] Lỗi xác thực token nhân viên:', err.message);
        baoLoi('Mã xác thực nhân viên không hợp lệ hoặc đã hết hạn');
      }
    });

    // Rời phòng quản trị
    socket.on('roi_nhan_vien', () => {
      socket.leave('nhan_vien');
    });

    socket.on('disconnect', () => {
      // Tự động dọn dẹp khi ngắt kết nối
    });
  });

  return io;
}

/**
 * Ngắt mọi kết nối socket của một tài khoản (khi khóa tài khoản, đổi vai trò, đặt lại mật khẩu) để không nhận thêm sự kiện.
 * Client sẽ tự kết nối lại và thử vào phòng bằng token cũ, nhưng bước xác minh với CSDL sẽ từ chối.
 */
async function thuHoiKetNoiTaiKhoan(aud, ma) {
  if (!io) return;
  try {
    const khoa = khoaTaiKhoan(aud, ma);
    const cacSocket = await io.fetchSockets();
    cacSocket.filter((sk) => sk.data.taiKhoan === khoa).forEach((sk) => sk.disconnect(true));
  } catch (err) {
    console.warn('[Socket] Không thu hồi được kết nối của tài khoản:', err.message);
  }
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
  const { maDonHang, maTraCuu, soTien, maGiaoDichPayos, trangThaiDonHang = 'CHO_DUYET' } = duLieu;
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

  // Đồng thời báo cho phòng nhân viên để cập nhật danh sách đơn (lấy đúng trạng thái thật của đơn)
  phatSuKien('donHang:capNhatTrangThai', {
    maDonHang,
    maTraCuu,
    trangThaiDonHang,
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
  thuHoiKetNoiTaiKhoan,
  layIo,
  phatSuKien,
  phatThanhToanThanhCong,
  phatDonHetHan
};
