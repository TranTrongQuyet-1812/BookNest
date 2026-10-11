import React from 'react';
import { BookOpen, Heart, Shield, Code } from 'lucide-react';

export const Footer = () => {
  return (
    <footer style={{
      backgroundColor: 'var(--bg-surface)',
      borderTop: '1px solid var(--border)',
      marginTop: 'auto',
      padding: '2.5rem 0 1.5rem 0',
      color: 'var(--text-muted)'
    }}>
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={20} style={{ color: 'var(--primary)' }} />
              <span className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-main)' }}>
                BookNest
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', lineHeight: '1.6' }}>
              Hệ thống quản lý và kinh doanh sách trực quan, xây dựng trên nền tảng SERN Stack (SQL Server, Express, React, Node.js).
            </p>
          </div>

          <div>
            <h4 style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              Kiến Trúc & Bảo Mật
            </h4>
            <ul style={{ listStyle: 'none', fontSize: '0.875rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li>• Chuẩn CSDL 3NF (Vietnamese_CI_AI)</li>
              <li>• Xác thực JWT Stateless & Phân quyền RBAC 4 vai trò</li>
              <li>• Kiểm thử tự động Jest 100% xanh</li>
              <li>• Ngăn chặn IDOR & Concurrency Safe Transactions</li>
            </ul>
          </div>

          <div>
            <h4 style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.75rem', fontSize: '0.95rem' }}>
              Tài Khoản Demo Hệ Thống
            </h4>
            <div style={{ fontSize: '0.825rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div><strong>Admin:</strong> admin@booknest.vn | <code>BookNest@123</code></div>
              <div><strong>Thủ thư:</strong> thuthu@booknest.vn | <code>BookNest@123</code></div>
              <div><strong>NV Đơn:</strong> nhanvien@booknest.vn | <code>BookNest@123</code></div>
              <div><strong>Khách:</strong> khachhang@booknest.vn | <code>BookNest@123</code></div>
            </div>
          </div>
        </div>

        <div style={{
          borderTop: '1px solid var(--border)',
          paddingTop: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.825rem'
        }}>
          <div>© 2026 BookNest. Bản quyền thuộc về Trần Trọng Quyết (LHU).</div>
          <div className="flex items-center gap-2">
            <span>SERN Architecture</span>
            <span>•</span>
            <span>Express 5 & SQL Server 2022</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
