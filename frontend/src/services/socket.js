/**
 * Dịch vụ kết nối WebSocket thời gian thực (Socket.IO client) cho BookNest (T43).
 * Singleton pattern: Kết nối một lần duy nhất, tự động kết nối lại, quản lý phòng theo dõi đơn hàng.
 */
import { io } from 'socket.io-client';

let socketInstance = null;

/**
 * Khởi tạo hoặc lấy đối tượng Socket.IO hiện có
 */
export function laySocket() {
  if (!socketInstance) {
    // Nếu có biến môi trường VITE_SOCKET_URL thì dùng, không thì tự động dùng origin hiện tại (thông qua proxy Vite)
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    socketInstance = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    socketInstance.on('connect', () => {
      // console.log('[Socket.IO] Đã kết nối thành công:', socketInstance.id);
    });

    socketInstance.on('disconnect', () => {
      // console.log('[Socket.IO] Mất kết nối, đang thử kết nối lại...');
    });
  }

  return socketInstance;
}

/**
 * Tham gia phòng theo dõi trạng thái thanh toán của một đơn hàng
 */
export function thamGiaDonHang(maTraCuu) {
  if (!maTraCuu) return;
  const socket = laySocket();
  if (socket.connected) {
    socket.emit('tham_gia_don_hang', maTraCuu);
  } else {
    socket.once('connect', () => {
      socket.emit('tham_gia_don_hang', maTraCuu);
    });
  }
}

/**
 * Rời phòng theo dõi đơn hàng khi đóng màn hình
 */
export function roiDonHang(maTraCuu) {
  if (!maTraCuu || !socketInstance) return;
  socketInstance.emit('roi_don_hang', maTraCuu);
}

/**
 * Tham gia phòng realtime dành cho nhân viên quản trị (yêu cầu JWT token nhân viên)
 */
export function thamGiaNhanVien(token) {
  const socket = laySocket();
  const tokenGui = token || localStorage.getItem('booknest_token');
  if (socket.connected) {
    socket.emit('tham_gia_nhan_vien', { token: tokenGui });
  } else {
    socket.once('connect', () => {
      socket.emit('tham_gia_nhan_vien', { token: tokenGui });
    });
  }
}

/**
 * Rời phòng nhân viên khi thoát trang quản lý
 */
export function roiNhanVien() {
  if (socketInstance) {
    socketInstance.emit('roi_nhan_vien');
  }
}

/**
 * Tham gia phòng realtime dành cho khách hàng đã đăng nhập để nhận thông báo đơn hàng
 */
export function thamGiaKhachHang(token) {
  const socket = laySocket();
  const tokenGui = token || localStorage.getItem('booknest_token');
  if (!tokenGui) return;
  if (socket.connected) {
    socket.emit('tham_gia_khach_hang', { token: tokenGui });
  } else {
    socket.once('connect', () => {
      socket.emit('tham_gia_khach_hang', { token: tokenGui });
    });
  }
}

/**
 * Rời phòng khách hàng
 */
export function roiKhachHang(token) {
  if (!socketInstance) return;
  const tokenGui = token || localStorage.getItem('booknest_token');
  socketInstance.emit('roi_khach_hang', { token: tokenGui });
}

/**
 * Đóng kết nối socket khi đăng xuất hoặc rời khỏi ứng dụng
 */
export function dongSocket() {
  if (socketInstance) {
    socketInstance.disconnect();
    socketInstance = null;
  }
}

export default {
  laySocket,
  thamGiaDonHang,
  roiDonHang,
  thamGiaKhachHang,
  roiKhachHang,
  thamGiaNhanVien,
  roiNhanVien,
  dongSocket
};
