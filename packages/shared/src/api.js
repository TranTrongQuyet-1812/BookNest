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
    localStorage.removeItem('booknest_token');
    localStorage.removeItem('booknest_user');
    if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
      window.dispatchEvent(new CustomEvent('booknest_unauthorized'));
    }
  }
  return Promise.reject(error);
});

export default api;
