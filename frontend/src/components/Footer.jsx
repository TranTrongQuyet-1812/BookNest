import React from 'react';
import { Link } from 'react-router-dom';
import LogoBookNest from './LogoBookNest';

export const Footer = () => {
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
          {/* Cột 1: Câu chuyện thương hiệu */}
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
            <ul style={{ 
              listStyle: 'none', 
              fontSize: '0.875rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.55rem' 
            }}>
              <li>
                <Link to="/?categoryId=1" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }} className="hover:underline">
                  Văn Học & Tản Văn
                </Link>
              </li>
              <li>
                <Link to="/?categoryId=2" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }} className="hover:underline">
                  Kinh Tế & Kỹ Năng
                </Link>
              </li>
              <li>
                <Link to="/?categoryId=4" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }} className="hover:underline">
                  Thiếu Nhi & Tranh Truyện
                </Link>
              </li>
              <li>
                <Link to="/?categoryId=8" style={{ color: 'var(--text-muted)', transition: 'color 0.2s' }} className="hover:underline">
                  Khoa Học & Tri Thức
                </Link>
              </li>
            </ul>
          </div>

          {/* Cột 3: Đồng hành cùng bạn đọc */}
          <div>
            <h4 className="font-serif" style={{ 
              fontWeight: 700, 
              color: 'var(--text-main)', 
              marginBottom: '1rem', 
              fontSize: '1rem',
              letterSpacing: '0.02em'
            }}>
              Cùng Bạn Đọc
            </h4>
            <ul style={{ 
              listStyle: 'none', 
              fontSize: '0.875rem', 
              display: 'flex', 
              flexDirection: 'column', 
              gap: '0.55rem' 
            }}>
              <li>
                <span style={{ color: 'var(--text-muted)' }}>Gói ghém sách cẩn trọng</span>
              </li>
              <li>
                <span style={{ color: 'var(--text-muted)' }}>Đổi trả nếu sách có tì vết</span>
              </li>
              <li>
                <span style={{ color: 'var(--text-muted)' }}>Cảm nhận của bạn đọc mua thật</span>
              </li>
              <li>
                <span style={{ color: 'var(--text-muted)' }}>Mở cửa đón đọc: 08:00 – 21:00</span>
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
              <div>Đường dây ấm: <span style={{ color: 'var(--text-muted)' }}>0900 123 456</span></div>
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
          <div>
            © 2026 BookNest. Giữ gìn tình yêu với từng trang sách.
          </div>
          <div>
            Được dựng nên từ niềm say mê sách và sự yên ả của tâm hồn.
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
