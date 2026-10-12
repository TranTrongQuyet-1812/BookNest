import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useRef } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const luuUser = localStorage.getItem('booknest_user');
      return luuUser ? JSON.parse(luuUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem('booknest_token') || null;
  });

  const [loading] = useState(false);

  // Quản lý chủ đề giao diện (Theme Dark / Light)
  const [theme, setTheme] = useState(() => {
    try {
      const luuTheme = localStorage.getItem('booknest_theme');
      if (luuTheme === 'dark' || luuTheme === 'light') return luuTheme;
    } catch {
      // ignore
    }
    return 'light';
  });

  const daKhoiTaoThemeRef = useRef(false);

  // Áp dụng class .dark và data-theme lên <html> khi theme thay đổi
  // Dùng useLayoutEffect (không phải useEffect) để khi Navbar bọc toggleTheme trong flushSync, class .dark đổi
  // ngay trong cùng khung hình với lúc mực bắt đầu loang, nếu không giao diện đổi lệch mốc so với giấy WebGL
  useLayoutEffect(() => {
    const isDark = theme === 'dark';
    if (isDark) {
      document.documentElement.classList.add('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    try {
      localStorage.setItem('booknest_theme', theme);
    } catch {
      // ignore
    }

    // Chỉ phát sự kiện chuyển màu động khi người dùng chủ động toggle (không phát khi mount)
    if (daKhoiTaoThemeRef.current) {
      window.dispatchEvent(new CustomEvent('booknest-theme-change', {
        detail: { isDark }
      }));
    } else {
      daKhoiTaoThemeRef.current = true;
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  // Lắng nghe sự kiện 401 Unauthorized từ api interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('booknest_unauthorized', handleUnauthorized);

    return () => {
      window.removeEventListener('booknest_unauthorized', handleUnauthorized);
    };
  }, []);

  // Đăng nhập ở một cổng: khách hàng dùng /auth/login, nhân viên dùng /admin/auth/login
  const dangNhapTaiCong = async (duongDan, email, matKhau) => {
    const res = await api.post(duongDan, { email, matKhau });
    const { token: jwtToken, user: nguoiDung } = res.data.data;

    localStorage.setItem('booknest_token', jwtToken);
    localStorage.setItem('booknest_user', JSON.stringify(nguoiDung));

    setToken(jwtToken);
    setUser(nguoiDung);
    return nguoiDung;
  };

  const dangNhap = (email, matKhau) => dangNhapTaiCong('/auth/login', email, matKhau);
  const dangNhapNhanVien = (email, matKhau) => dangNhapTaiCong('/admin/auth/login', email, matKhau);

  // Hàm đăng ký
  const dangKy = async (duLieu) => {
    const res = await api.post('/auth/register', duLieu);
    return res.data;
  };

  // Hàm đăng xuất
  const dangXuat = () => {
    localStorage.removeItem('booknest_token');
    localStorage.removeItem('booknest_user');
    setUser(null);
    setToken(null);
  };

  // Cập nhật thông tin người dùng trong bộ nhớ tạm
  const capNhatUser = (thongTinMoi) => {
    const nguoiDungCapNhat = { ...user, ...thongTinMoi };
    localStorage.setItem('booknest_user', JSON.stringify(nguoiDungCapNhat));
    setUser(nguoiDungCapNhat);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        theme,
        toggleTheme,
        dangNhap,
        dangNhapNhanVien,
        dangKy,
        dangXuat,
        capNhatUser,
        daDangNhap: Boolean(token && user)
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
};
