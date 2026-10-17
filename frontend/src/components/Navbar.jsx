import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useCartStore from '../stores/cartStore';
import api from '../services/api';
import LogoBookNest from './LogoBookNest';
import { Search, ShoppingCart, User, LogOut, ChevronDown, Sun, Moon, AudioWaveform } from 'lucide-react';
import { useGiamChuyenDong } from '../utils/chuyenDong';

export const Navbar = () => {
  const { user, daDangNhap, dangXuat, theme, toggleTheme } = useAuth();
  const { tongSoLuong, layGioHang, xoaTrangState } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [danhMucList, setDanhMucList] = useState([]);
  const [moDropdown, setMoDropdown] = useState(false);
  const [tuKhoa, setTuKhoa] = useState('');
  const [giamChuyenDong, datGiamChuyenDong] = useGiamChuyenDong();
  const dropdownRef = useRef(null);

  // Tải danh mục cho menu dropdown
  useEffect(() => {
    let daHuy = false;
    const taiDanhMuc = async () => {
      try {
        const res = await api.get('/categories');
        if (!daHuy) setDanhMucList(res.data.data || []);
      } catch (err) {
        console.error('Lỗi tải danh mục navbar:', err);
      }
    };
    taiDanhMuc();
    return () => { daHuy = true; };
  }, []);

  // Đóng dropdown khi click ra ngoài
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setMoDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Lấy giỏ hàng qua Zustand Store (Hỗ trợ cả Khách vãng lai lẫn Khách hàng)
  useEffect(() => {
    const laNhanSu = user && ['quan_tri', 'thu_kho', 'thu_thu'].includes(user.role);
    if (!laNhanSu) {
      layGioHang();
    }
  }, [user, layGioHang]);

  const handleDangXuat = () => {
    xoaTrangState();
    dangXuat();
    navigate('/login');
  };

  const handleTimKiem = (e) => {
    e.preventDefault();
    if (tuKhoa.trim()) {
      navigate(`/?search=${encodeURIComponent(tuKhoa.trim())}`);
    }
  };

  const laNhanSu = user && ['quan_tri', 'thu_kho', 'thu_thu'].includes(user.role);

  // Hiệu ứng giọt mực loang chuyển theme (Chuẩn nguyên bản Portfolio Profile)
  const dangChuyenThemeRef = useRef(false);

  const handleToggleTheme = (e) => {
    // Chống spam click khi giọt mực đang trong chu trình loang thấm
    if (dangChuyenThemeRef.current) return;
    dangChuyenThemeRef.current = true;

    const btn = e.currentTarget;
    const rect = btn?.getBoundingClientRect();
    const cx = rect ? rect.left + rect.width / 2 : window.innerWidth - 80;
    const cy = rect ? rect.top + rect.height / 2 : 30;
    const targetDark = theme !== 'dark';

    // 1. Kích hoạt hiệu ứng giọt mực thấm loang hữu cơ trên Three.js WebGL Canvas
    window.dispatchEvent(
      new CustomEvent('ink-bleed-trigger', {
        detail: { cx, cy, targetDark }
      })
    );

    // 2. Kích hoạt Sóng Thấm Mực Đồng Bộ Tuyệt Đối (Thuật toán Thích Ứng Khối Lớn & Header)
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const maxDist = Math.hypot(
      Math.max(cx, vw - cx),
      Math.max(cy, vh - cy)
    );

    const query = [
      'header .container > div:first-child',
      'header form',
      'header .container > div:last-child',
      'article',
      'section > div',
      '.grid > div',
      '[class*="rounded"]',
      'button',
      'input',
      'h1, h2, h3, h4, p',
      'a'
    ].join(', ');

    const rawElements = Array.from(document.querySelectorAll(query));
    const visibleElements = rawElements.filter((el) => {
      const tag = el.tagName;
      if (tag === 'HEADER' || tag === 'MAIN' || tag === 'SECTION' || tag === 'FOOTER' || el.id === 'root') {
        return false;
      }
      if (el.classList.contains('pointer-events-none') || el.classList.contains('container')) {
        return false;
      }
      if (el.style.display === 'grid' || el.classList.contains('grid')) {
        return false;
      }
      const r = el.getBoundingClientRect();
      return (
        r.bottom >= -20 &&
        r.top <= vh + 20 &&
        r.right >= -20 &&
        r.left <= vw + 20 &&
        r.width > 0 &&
        r.height > 0
      );
    });

    const topLevelUnits = visibleElements.filter((el) => {
      return !visibleElements.some((other) => other !== el && other.contains(el));
    });

    const stagedElements = [];
    for (const el of topLevelUnits) {
      const r = el.getBoundingClientRect();
      const closestX = Math.max(r.left, Math.min(cx, r.right));
      const closestY = Math.max(r.top, Math.min(cy, r.bottom));

      // Với khối lớn (rộng hoặc cao > 400px như Khung Đăng nhập, Đăng ký, Chi tiết sách):
      // Dịch điểm đón mực về phía trọng tâm khối (60% theo chiều ngang, 45% theo chiều dọc)
      // để khối lớn ngấm màu khi mũi sóng mực Three.js lan tới nửa thân, không bị đổi màu quá sớm
      let targetX = closestX;
      let targetY = closestY;
      if (r.width > 400) {
        const midX = r.left + r.width / 2;
        targetX = closestX + (midX - closestX) * 0.60;
      }
      if (r.height > 400) {
        const midY = r.top + r.height / 2;
        targetY = closestY + (midY - closestY) * 0.45;
      }

      const dist = Math.hypot(targetX - cx, targetY - cy);
      const normDist = Math.min(1.0, dist / Math.max(maxDist, 1));
      const delay = Math.round(40 + Math.pow(normDist, 0.72) * 820);
      el.classList.add('card-theme-wave');
      el.style.setProperty('--wave-delay', `${delay}ms`);
      stagedElements.push(el);
    }

    // 3. Đổi class .dark và state theme ở frame kế tiếp để CSS transition bắt đầu đồng bộ
    requestAnimationFrame(() => {
      toggleTheme();
    });

    // 4. Mở khóa và dọn sạch class sau chu trình 1350ms
    setTimeout(() => {
      stagedElements.forEach((el) => {
        el.classList.remove('card-theme-wave');
        el.style.removeProperty('--wave-delay');
      });
      dangChuyenThemeRef.current = false;
    }, 1350);
  };

  return (
    <header 
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'var(--navbar-bg)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        boxShadow: '0 2px 8px rgba(76, 69, 65, 0.03)',
        borderBottom: '1px solid var(--border)',
        transition: 'background-color 650ms cubic-bezier(0.33, 1, 0.68, 1) 200ms, border-color 650ms cubic-bezier(0.33, 1, 0.68, 1) 200ms'
      }}
    >
      {/* Khối nội dung Navbar */}
      <div 
        className="container" 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 1rem',
          gap: '1.25rem'
        }}
      >
        {/* Khối Logo & Tên thương hiệu & Dropdown Danh Mục */}
        <div className="navbar-brand-group" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <Link 
            to="/" 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.65rem',
              textDecoration: 'none'
            }} 
            title="BookNest - Tổ ấm của những trang sách"
          >
            <LogoBookNest height={38} />
            <span className="font-fleur navbar-brand-text" style={{
              fontSize: '2.1rem',
              color: 'var(--text-main)',
              lineHeight: 1,
              letterSpacing: '0.01em',
              userSelect: 'none'
            }}>
              BookNest
            </span>
          </Link>

          {/* Nút Danh Mục Sách & Dropdown */}
          <div ref={dropdownRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setMoDropdown(!moDropdown)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem',
                backgroundColor: 'transparent',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                padding: '0.45rem 0.85rem',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'background-color 0.15s ease, border-color 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                e.currentTarget.style.borderColor = 'var(--text-main)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <span>Danh mục</span>
              <ChevronDown size={14} style={{
                transform: moDropdown ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s ease',
                color: 'var(--text-muted)'
              }} />
            </button>

            {moDropdown && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                left: 0,
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: '12px',
                boxShadow: 'var(--shadow-md)',
                width: '230px',
                zIndex: 60,
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease'
              }}>
                <div style={{ padding: '0.35rem 0' }}>
                  {danhMucList.map((dm) => (
                    <Link
                      key={dm.MaDanhMuc}
                      to={`/?categoryId=${dm.MaDanhMuc}`}
                      onClick={() => setMoDropdown(false)}
                      style={{
                        display: 'block',
                        padding: '0.6rem 1rem',
                        fontSize: '0.88rem',
                        color: 'var(--text-main)',
                        fontWeight: 500,
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {dm.TenDanhMuc}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Thanh Tìm Kiếm Trung Tâm Tối Giản */}
        <form onSubmit={handleTimKiem} className="navbar-search-form" style={{
          flex: 1,
          minWidth: '160px',
          maxWidth: '440px',
          display: 'flex',
          alignItems: 'center',
          position: 'relative'
        }}>
          <input
            type="text"
            value={tuKhoa}
            onChange={(e) => setTuKhoa(e.target.value)}
            placeholder="Tìm tên sách, tác giả..."
            style={{
              width: '100%',
              padding: '0.45rem 2.5rem 0.45rem 0.95rem',
              borderRadius: '999px',
              border: '1px solid var(--border)',
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-main)',
              fontSize: '0.88rem',
              outline: 'none',
              transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--primary)';
              e.currentTarget.style.boxShadow = '0 0 0 2px var(--primary-light)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
          <button
            type="submit"
            style={{
              position: 'absolute',
              right: '8px',
              backgroundColor: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '4px'
            }}
            title="Tìm kiếm"
          >
            <Search size={16} />
          </button>
        </form>

        {/* Khối Tiện Ích Phải: Giỏ Hàng & Người Dùng */}
        <div className="navbar-actions-group" style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          {laNhanSu && (
            <Link
              to="/admin"
              style={{
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--primary-dark)',
                padding: '0.45rem 0.75rem',
                border: '1px solid var(--border)',
                borderRadius: '8px',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              Quản trị
            </Link>
          )}

          {(!user || user.role === 'khach_hang') && (
            <Link
              to="/cart"
              className="navbar-cart-button"
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                padding: '0.45rem 0.85rem',
                borderRadius: '8px',
                border: '1px solid var(--border)',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
                fontWeight: 500,
                transition: 'background-color 0.15s ease, border-color 0.15s ease'
              }}
              title="Giỏ hàng của bạn"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
                e.currentTarget.style.borderColor = 'var(--text-main)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
                e.currentTarget.style.borderColor = 'var(--border)';
              }}
            >
              <ShoppingCart size={16} />
              <span className="navbar-label-cart">Giỏ hàng</span>
              {tongSoLuong > 0 && (
                <span style={{
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-text)',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  borderRadius: '999px',
                  padding: '1px 7px',
                  minWidth: '18px',
                  textAlign: 'center',
                  marginLeft: '2px'
                }}>
                  {tongSoLuong}
                </span>
              )}
            </Link>
          )}

          {/* Nút Toggle Chuyển Đổi Dark / Light Mode (Tích hợp hiệu ứng giọt mực loang) */}
          <button
            onClick={handleToggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              border: '1px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--text-main)',
              cursor: 'pointer',
              transition: 'background-color 0.2s ease, border-color 0.2s ease',
              flexShrink: 0
            }}
            title={theme === 'dark' ? 'Chuyển sang Chế độ Sáng' : 'Chuyển sang Chế độ Tối'}
            aria-label="Chuyển đổi giao diện Sáng / Tối"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
              e.currentTarget.style.borderColor = 'var(--border-focus)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'var(--border)';
            }}
          >
            {theme === 'dark' ? (
              <Sun size={17} style={{ color: 'var(--primary)' }} />
            ) : (
              <Moon size={17} style={{ color: 'var(--text-main)' }} />
            )}
          </button>

          <button
            type="button"
            onClick={() => datGiamChuyenDong(!giamChuyenDong)}
            className="navbar-motion-toggle"
            title={giamChuyenDong ? 'Bật lại chuyển động trong khu vườn' : 'Giảm chuyển động trong khu vườn'}
            aria-label={giamChuyenDong ? 'Bật lại chuyển động' : 'Giảm chuyển động'}
            aria-pressed={giamChuyenDong}
          >
            <AudioWaveform size={17} />
          </button>

          {daDangNhap ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link
                to="/profile"
                className="navbar-user-link"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <User size={15} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <span className="navbar-user-name" style={{
                  maxWidth: '120px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  display: 'inline-block',
                  verticalAlign: 'middle'
                }}>{user.fullName}</span>
              </Link>
              <Link
                to="/orders"
                className="navbar-orders-link"
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  color: 'var(--text-main)',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  transition: 'background-color 0.15s ease'
                }}
                title="Đơn hàng của tôi"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Đơn hàng
              </Link>
              <button
                onClick={handleDangXuat}
                style={{
                  padding: '0.45rem 0.65rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border)',
                  backgroundColor: 'transparent',
                  color: 'var(--danger)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.15s ease'
                }}
                title="Đăng xuất"
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--danger-light)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Link
                to="/login"
                state={!['/login', '/register'].includes(location.pathname) ? { from: location } : undefined}
                style={{
                  padding: '0.45rem 0.85rem',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 500,
                  color: 'var(--text-main)',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                state={!['/login', '/register'].includes(location.pathname) ? { from: location } : undefined}
                style={{
                  padding: '0.45rem 0.95rem',
                  borderRadius: '8px',
                  fontSize: '0.88rem',
                  fontWeight: 600,
                  backgroundColor: 'var(--primary)',
                  color: 'var(--primary-text)',
                  boxShadow: '0 1px 3px rgba(76, 69, 65, 0.08)',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
