import axios from 'axios';

/**
 * Cấu hình Axios Client dùng chung cho toàn bộ ứng dụng BookNest Frontend.
 * Tự động gắn Bearer Token vào header Authorization cho mọi request.
 * Tự động bắt lỗi 401 Unauthorized để dọn dẹp phiên và điều hướng về trang đăng nhập.
 */
const api = axios.create({
  baseURL: '/api',
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Interceptor cho Request: Thêm Bearer Token nếu người dùng đã đăng nhập
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('booknest_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor cho Response: Xử lý lỗi tập trung, phát hiện token hết hạn (401)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response && error.response.status === 401) {
      // Token hết hạn hoặc không hợp lệ -> Xóa bộ nhớ và phát tín hiệu đăng xuất
      localStorage.removeItem('booknest_token');
      localStorage.removeItem('booknest_user');
      
      // Chỉ tự chuyển hướng nếu không phải đang ở trang đăng nhập hoặc đăng ký
      if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
        window.dispatchEvent(new CustomEvent('booknest_unauthorized'));
      }
    }
    return Promise.reject(error);
  }
);

export default api;
