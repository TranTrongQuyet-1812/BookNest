import React, { createContext, useContext, useState, useEffect } from 'react';
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

  const [loading, setLoading] = useState(true);

  // Quản lý theme Light / Dark: Mặc định Light (trắng ngà giấy sách)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('booknest_theme') || 'light';
  });

  useEffect(() => {
    // Áp dụng class theme lên thẻ HTML gốc
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('booknest_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Lắng nghe sự kiện 401 Unauthorized từ api interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      setUser(null);
      setToken(null);
    };

    window.addEventListener('booknest_unauthorized', handleUnauthorized);
    setLoading(false);

    return () => {
      window.removeEventListener('booknest_unauthorized', handleUnauthorized);
    };
  }, []);

  // Hàm đăng nhập
  const dangNhap = async (email, matKhau) => {
    const res = await api.post('/auth/login', { email, matKhau });
    const userPayload = res.data.duLieu || res.data.data;
    const { token: jwtToken, user: nguoiDungTho } = userPayload;

    const nguoiDung = {
      ...nguoiDungTho,
      vaiTro: nguoiDungTho.vaiTro || nguoiDungTho.role,
      role: nguoiDungTho.role || nguoiDungTho.vaiTro,
      hoTen: nguoiDungTho.hoTen || nguoiDungTho.fullName,
      fullName: nguoiDungTho.fullName || nguoiDungTho.hoTen,
      maNguoiDung: nguoiDungTho.maNguoiDung || nguoiDungTho.id
    };

    localStorage.setItem('booknest_token', jwtToken);
    localStorage.setItem('booknest_user', JSON.stringify(nguoiDung));

    setToken(jwtToken);
    setUser(nguoiDung);
    return nguoiDung;
  };

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

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth phải được sử dụng bên trong AuthProvider');
  }
  return context;
};
