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
  dongSocket
};
