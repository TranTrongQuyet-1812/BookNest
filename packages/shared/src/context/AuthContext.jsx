import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useRef } from 'react';
import api from '../api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('booknest_user')) || null; } catch { return null; }
  });
  const [token, setToken] = useState(() => localStorage.getItem('booknest_token') || null);
  const [theme, setTheme] = useState(() => {
    try {
      const value = localStorage.getItem('booknest_theme');
      return value === 'dark' || value === 'light' ? value : 'light';
    } catch { return 'light'; }
  });
  const daKhoiTaoThemeRef = useRef(false);

  useLayoutEffect(() => {
    const isDark = theme === 'dark';
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('booknest_theme', theme); } catch { /* Trình duyệt có thể chặn lưu cục bộ. */ }
    if (daKhoiTaoThemeRef.current) {
      window.dispatchEvent(new CustomEvent('booknest-theme-change', { detail: { isDark } }));
    } else daKhoiTaoThemeRef.current = true;
  }, [theme]);

  useEffect(() => {
    const handleUnauthorized = () => { setUser(null); setToken(null); };
    window.addEventListener('booknest_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('booknest_unauthorized', handleUnauthorized);
  }, []);

  const dangNhapTaiCong = async (duongDan, email, matKhau) => {
    const res = await api.post(duongDan, { email, matKhau });
    const { token: jwtToken, user: nguoiDung } = res.data.data;
    localStorage.setItem('booknest_token', jwtToken);
    localStorage.setItem('booknest_user', JSON.stringify(nguoiDung));
    setToken(jwtToken);
    setUser(nguoiDung);
    return nguoiDung;
  };

  const dangXuat = () => {
    localStorage.removeItem('booknest_token');
    localStorage.removeItem('booknest_user');
    setUser(null);
    setToken(null);
  };
  const capNhatUser = (thongTinMoi) => {
    const nguoiDungCapNhat = { ...user, ...thongTinMoi };
    localStorage.setItem('booknest_user', JSON.stringify(nguoiDungCapNhat));
    setUser(nguoiDungCapNhat);
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading: false, theme, toggleTheme: () => setTheme(prev => prev === 'light' ? 'dark' : 'light'),
      dangNhap: (email, matKhau) => dangNhapTaiCong('/auth/login', email, matKhau),
      dangNhapNhanVien: (email, matKhau) => dangNhapTaiCong('/admin/auth/login', email, matKhau),
      dangKy: async (duLieu) => (await api.post('/auth/register', duLieu)).data,
      dangXuat, capNhatUser, daDangNhap: Boolean(token && user)
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  return context;
};
