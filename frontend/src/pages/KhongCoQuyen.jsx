import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const KhongCoQuyen = () => {
  const { user } = useAuth();

  return (
    <div className="container py-12 flex justify-center items-center" style={{ minHeight: '60vh' }}>
      <div className="card" style={{ maxWidth: '480px', textAlign: 'center', padding: '2.5rem 1.5rem' }}>
        <div style={{
          display: 'inline-flex',
          padding: '16px',
          backgroundColor: 'var(--danger-light)',
          color: 'var(--danger)',
          borderRadius: '50%',
          marginBottom: '1rem'
        }}>
          <ShieldAlert size={40} />
        </div>
        <h2 className="font-serif" style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.5rem' }}>
          Từ Chối Quyền Truy Cập (403)
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', marginBottom: '1.5rem' }}>
          Tài khoản của bạn ({user?.email || 'Khách'}) mang vai trò <strong>{user?.role || 'Chưa xác thực'}</strong>, không có thẩm quyền truy cập vào phân hệ này.
        </p>

        <div className="flex justify-center gap-3">
          <Link to="/" className="btn btn-primary">
            <Home size={16} />
            Về Trang Chủ
          </Link>
          <button onClick={() => window.history.back()} className="btn btn-outline">
            <ArrowLeft size={16} />
            Quay Lại
          </button>
        </div>
      </div>
    </div>
  );
};

export default KhongCoQuyen;
