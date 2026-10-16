import React, { createContext, useContext, useState, useEffect, useLayoutEffect, useRef } from 'react';
import api from '../api.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // Chỉ lưu thông tin user trong bộ nhớ RAM của React (State), TUYỆT ĐỐI KHÔNG LƯU VÀO LOCALSTORAGE
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('booknest_token') || null);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('booknest_token')));
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

  // Luôn nạp dữ liệu người dùng trực tiếp từ CSDL thông qua token, không lưu plain text ở Client
  useEffect(() => {
    let daHuy = false;

    // Xóa ngay tàn dư booknest_user nếu còn lưu trong localStorage từ phiên bản cũ
    try {
      localStorage.removeItem('booknest_user');
    } catch (e) {}

    const napThongTinUserTuDb = async () => {
      const currentToken = localStorage.getItem('booknest_token');
      if (!currentToken) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const res = await api.get('/users/profile');
        if (!daHuy) {
          const profile = res.data?.data || res.data;
          setUser(profile);
        }
      } catch (err) {
        const maLoi = err.response?.status;
        // Chỉ xóa token khi thực sự lỗi xác thực hoặc tài khoản bị khóa trong DB (401/403)
        // Mất mạng, timeout hoặc máy chủ tạm thời không phản hồi tuyệt đối không xóa token của người dùng
        if (!daHuy && (maLoi === 401 || maLoi === 403)) {
          localStorage.removeItem('booknest_token');
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!daHuy) {
          setLoading(false);
        }
      }
    };

    napThongTinUserTuDb();

    return () => {
      daHuy = true;
    };
  }, [token]);

  useEffect(() => {
    const handleUnauthorized = () => { 
      setUser(null); 
      setToken(null); 
      try { localStorage.removeItem('booknest_user'); } catch (e) {}
    };
    window.addEventListener('booknest_unauthorized', handleUnauthorized);
    return () => window.removeEventListener('booknest_unauthorized', handleUnauthorized);
  }, []);

  const dangNhapTaiCong = async (duongDan, email, matKhau) => {
    const res = await api.post(duongDan, { email, matKhau });
    const { token: jwtToken, user: nguoiDung } = res.data.data;
    
    // CHỈ LƯU DUY NHẤT TOKEN VÀO LOCALSTORAGE, KHÔNG LƯU THÔNG TIN USER
    localStorage.setItem('booknest_token', jwtToken);
    try { localStorage.removeItem('booknest_user'); } catch (e) {}
    
    setToken(jwtToken);
    setUser(nguoiDung);
    return nguoiDung;
  };

  const dangXuat = () => {
    localStorage.removeItem('booknest_token');
    try { localStorage.removeItem('booknest_user'); } catch (e) {}
    setUser(null);
    setToken(null);
  };

  const capNhatUser = (thongTinMoi) => {
    setUser(prev => ({ ...prev, ...thongTinMoi }));
  };

  const capNhatToken = (tokenMoi) => {
    if (!tokenMoi) return;
    localStorage.setItem('booknest_token', tokenMoi);
    setToken(tokenMoi);
  };

  return (
    <AuthContext.Provider value={{
      user, token, loading, theme, toggleTheme: () => setTheme(prev => prev === 'light' ? 'dark' : 'light'),
      dangNhap: (email, matKhau) => dangNhapTaiCong('/auth/login', email, matKhau),
      dangNhapNhanVien: (email, matKhau) => dangNhapTaiCong('/admin/auth/login', email, matKhau),
      dangKy: async (duLieu) => (await api.post('/auth/register', duLieu)).data,
      dangXuat, capNhatUser, capNhatToken, daDangNhap: Boolean(token && user)
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
