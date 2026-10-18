/**
 * Dịch vụ kết nối WebSocket thời gian thực (Socket.IO client) cho BookNest (T43, T46, O1).
 * Singleton pattern: Kết nối một lần duy nhất, tự động kết nối lại và tự động vào lại phòng khi nối lại mạng.
 */
import { io } from 'socket.io-client';

let socketInstance = null;
const cacPhongDonHang = new Set();
let tokenNhanVienHienTai = null;
let tokenKhachHangHienTai = null;

/**
 * Khởi tạo hoặc lấy đối tượng Socket.IO hiện có
 */
export function laySocket() {
  if (!socketInstance) {
    const socketUrl = import.meta.env.VITE_SOCKET_URL || window.location.origin;

    socketInstance = io(socketUrl, {
      path: '/socket.io',
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    // Tự động gia nhập lại tất cả các phòng khi socket kết nối hoặc kết nối lại (O1)
    socketInstance.on('connect', () => {
      if (tokenNhanVienHienTai) {
        socketInstance.emit('tham_gia_nhan_vien', { token: tokenNhanVienHienTai });
      }
      if (tokenKhachHangHienTai) {
        socketInstance.emit('tham_gia_khach_hang', { token: tokenKhachHangHienTai });
      }
      for (const maTraCuu of cacPhongDonHang) {
        socketInstance.emit('tham_gia_don_hang', maTraCuu);
      }
    });
  }

  return socketInstance;
}

/**
 * Tham gia phòng theo dõi trạng thái thanh toán của một đơn hàng
 */
export function thamGiaDonHang(maTraCuu) {
  if (!maTraCuu) return;
  cacPhongDonHang.add(maTraCuu);
  const socket = laySocket();
  if (socket.connected) {
    socket.emit('tham_gia_don_hang', maTraCuu);
  }
}

/**
 * Rời phòng theo dõi đơn hàng khi đóng màn hình
 */
export function roiDonHang(maTraCuu) {
  if (!maTraCuu) return;
  cacPhongDonHang.delete(maTraCuu);
  if (socketInstance?.connected) {
    socketInstance.emit('roi_don_hang', maTraCuu);
  }
}

/**
 * Tham gia phòng realtime dành cho nhân viên quản trị (yêu cầu JWT token nhân viên)
 */
export function thamGiaNhanVien(token) {
  const tokenGui = token || localStorage.getItem('booknest_token');
  tokenNhanVienHienTai = tokenGui;
  const socket = laySocket();
  if (socket.connected && tokenGui) {
    socket.emit('tham_gia_nhan_vien', { token: tokenGui });
  }
}

/**
 * Rời phòng nhân viên khi thoát trang quản lý
 */
export function roiNhanVien() {
  tokenNhanVienHienTai = null;
  if (socketInstance?.connected) {
    socketInstance.emit('roi_nhan_vien');
  }
}

/**
 * Tham gia phòng realtime dành cho khách hàng đã đăng nhập để nhận thông báo đơn hàng
 */
export function thamGiaKhachHang(token) {
  const tokenGui = token || localStorage.getItem('booknest_token');
  tokenKhachHangHienTai = tokenGui;
  const socket = laySocket();
  if (socket.connected && tokenGui) {
    socket.emit('tham_gia_khach_hang', { token: tokenGui });
  }
}

/**
 * Rời phòng khách hàng
 */
export function roiKhachHang(token) {
  const tokenGui = token || tokenKhachHangHienTai || localStorage.getItem('booknest_token');
  tokenKhachHangHienTai = null;
  if (socketInstance?.connected) {
    socketInstance.emit('roi_khach_hang', { token: tokenGui });
  }
}

/**
 * Đóng kết nối socket khi đăng xuất hoặc rời khỏi ứng dụng
 */
export function dongSocket() {
  if (socketInstance) {
    tokenNhanVienHienTai = null;
    tokenKhachHangHienTai = null;
    cacPhongDonHang.clear();
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
