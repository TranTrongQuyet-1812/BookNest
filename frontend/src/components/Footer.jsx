import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import LogoBookNest from './LogoBookNest';
import api from '../services/api';

export const Footer = () => {
  const [danhMucList, setDanhMucList] = useState([]);
  const [loiDanhMuc, setLoiDanhMuc] = useState(false);

  // Nạp danh mục động từ API thật (lấy 4 danh mục có nhiều sách nhất)
  useEffect(() => {
    let daHuy = false;
    const taiDanhMuc = async () => {
      try {
        const res = await api.get('/categories');
        const ds = (res.data?.data || [])
          .filter(dm => (dm.soLuongSach || 0) > 0)
          .sort((a, b) => (b.soLuongSach || 0) - (a.soLuongSach || 0))
          .slice(0, 4);
        if (!daHuy) {
          setDanhMucList(ds);
          setLoiDanhMuc(false);
        }
      } catch (err) {
        console.error('[Footer] Không thể tải danh mục sách:', err);
        if (!daHuy) {
          setLoiDanhMuc(true);
          setDanhMucList([]);
        }
      }
    };
    taiDanhMuc();
    return () => { daHuy = true; };
  }, []);

  return (
    <footer style={{
      backgroundColor: 'transparent',
      borderTop: '1px solid var(--border)',
      marginTop: 'auto',
      padding: '3.5rem 0 2rem 0',
      color: 'var(--text-muted)',
      transition: 'border-color 480ms cubic-bezier(0.33, 1, 0.68, 1), color 480ms cubic-bezier(0.33, 1, 0.68, 1)'
    }}>
      <div className="container">
        {/* Lưới 4 cột thông tin trang nhã */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          {/* Cột 1: Câu chuyện thương hiệu & Đồ án */}
          <div>
            <div className="flex items-center gap-3 mb-3">
              <LogoBookNest height={36} />
              <span className="font-fleur" style={{ 
                fontSize: '2.1rem', 
                fontWeight: 700, 
                color: 'var(--text-main)',
                lineHeight: 1
              }}>
                BookNest
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: '1.7', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
              Một góc nhỏ bình yên dành cho những ai trân quý hương thơm của giấy và những câu chuyện kể. Mỗi cuốn sách trao đi là một lời chúc an lành gửi đến tâm hồn bạn.
            </p>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', lineHeight: '1.5' }}>
              Đề tài đồ án môn học • SV Trần Trọng Quyết (ĐH Lạc Hồng)
            </div>
          </div>

          {/* Cột 2: Tủ sách tuyển chọn */}
          <div>
            <h4 className="font-serif" style={{ 
              fontWeight: 700, 
              color: 'var(--text-main)', 
              marginBottom: '1rem', 
              fontSize: '1rem',
              letterSpacing: '0.02em'
            }}>
              Tủ Sách Tuyển Chọn
            </h4>
            {loiDanhMuc ? (
              <p style={{ fontSize: '0.875rem', color: 'var(--text-sub)' }}>
                Đang cập nhật tủ sách...
              </p>
            ) : danhMucList.length > 0 ? (
              <ul style={{ 
                listStyle: 'none', 
                fontSize: '0.875rem', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: '0.55rem' 
              }}>
                {danhMucList.map((dm) => (
                  <li key={dm.MaDanhMuc}>
                    <Link
                      to={`/?categoryId=${dm.MaDanhMuc}`}
                      style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }}
                      className="hover:underline"
                    >
                      {dm.TenDanhMuc}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          {/* Cột 3: Cùng bạn đọc & Chính sách */}
          <div>
            <h4 className="font-serif" style={{ 
              fontWeight: 700, 
              color: 'var(--text-main)', 
              marginBottom: '1rem', 
              fontSize: '1rem',
              letterSpacing: '0.02em'
            }}>
              Chính Sách & Hỗ Trợ
            </h4>
            <ul style={{ 
              listStyle: 'none', 
              fontSize: '0.875rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.55rem' 
            }}>
              <li>
                <Link to="/dieu-khoan#van-chuyen" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }} className="hover:underline">
                  Giao nhận & Freeship 100%
                </Link>
              </li>
              <li>
                <Link to="/dieu-khoan#doi-tra" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }} className="hover:underline">
                  Đổi trả trong 7 ngày
                </Link>
              </li>
              <li>
                <Link to="/dieu-khoan" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }} className="hover:underline">
                  Điều khoản dịch vụ
                </Link>
              </li>
              <li>
                <Link to="/chinh-sach-bao-mat" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }} className="hover:underline">
                  Chính sách bảo mật
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 4: Ghé thăm & Trò chuyện */}
          <div>
            <h4 className="font-serif" style={{ 
              fontWeight: 700, 
              color: 'var(--text-main)', 
              marginBottom: '1rem', 
              fontSize: '1rem',
              letterSpacing: '0.02em'
            }}>
              Ghé Thăm BookNest
            </h4>
            <p style={{ fontSize: '0.875rem', lineHeight: '1.7', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              Nơi góc phố dịu mát, dành cho những buổi chiều thư thả bên tách cà phê và trang sách mở.
            </p>
            <div style={{ fontSize: '0.85rem', color: 'var(--text-main)', lineHeight: '1.6' }}>
              <div>Thư gửi: <span style={{ color: 'var(--text-muted)' }}>tiemsach@booknest.vn</span></div>
              <div>Phụ trách: <span style={{ color: 'var(--text-muted)' }}>Trần Trọng Quyết</span></div>
            </div>
          </div>
        </div>

        {/* Dòng bản quyền & Lời kết mộc mạc */}
        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '1.5rem',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          fontSize: '0.825rem',
          color: 'var(--text-muted)'
        }}>
          <div className="flex items-center gap-2 flex-wrap">
            <span>© 2026 BookNest. Giữ gìn tình yêu với từng trang sách.</span>
            <span style={{ color: 'var(--border)' }}>•</span>
            <Link to="/dieu-khoan" style={{ color: 'var(--text-muted)', textDecoration: 'none' }} className="hover:underline">
              Điều khoản dịch vụ
            </Link>
            <span style={{ color: 'var(--border)' }}>•</span>
            <Link to="/chinh-sach-bao-mat" style={{ color: 'var(--text-muted)', textDecoration: 'none' }} className="hover:underline">
              Chính sách bảo mật
            </Link>
          </div>
          <div style={{ color: 'var(--text-sub)' }}>
            Dự án học tập phi thương mại • Bản quyền tác phẩm thuộc về Tác giả & NXB
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
