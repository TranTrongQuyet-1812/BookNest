import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('booknest_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use((response) => response, (error) => {
  if (error.response?.status === 401) {
    // Chỉ khi request có gửi token mới là "phiên hết hạn"; khách chưa đăng nhập gọi API cần quyền thì không phải.
    // Xét theo request (không theo localStorage) để nhiều request 401 song song cùng được xếp đúng loại.
    const daCoToken = Boolean(error.config?.headers?.Authorization);
    localStorage.removeItem('booknest_token');
    localStorage.removeItem('booknest_user');
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
      window.dispatchEvent(new CustomEvent('booknest_unauthorized', { detail: { daCoToken } }));
      // Đánh dấu để toast "hết hạn phiên" là thông báo duy nhất, nơi gọi không hiện thêm toast lỗi trùng
      if (daCoToken) error.daBaoHetPhien = true;
    }
  }
  return Promise.reject(error);
});

export default api;
