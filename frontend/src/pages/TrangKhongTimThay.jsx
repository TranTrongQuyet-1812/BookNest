import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BookX, Home, ArrowLeft } from 'lucide-react';

export const TrangKhongTimThay = () => {
  const navigate = useNavigate();

  return (
    <div className="container py-16 flex justify-center items-center" style={{ minHeight: '65vh' }}>
      <div className="card" style={{ maxWidth: '520px', textAlign: 'center', padding: '3rem 2rem' }}>
        <div style={{
          display: 'inline-flex',
          padding: '20px',
          backgroundColor: 'var(--primary-subtle, rgba(200, 140, 80, 0.1))',
          color: 'var(--primary)',
          borderRadius: '50%',
          marginBottom: '1.25rem'
        }}>
          <BookX size={48} />
        </div>
        <h1 className="font-serif" style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text-main)' }}>
          Trang Sách Bị Thất Lạc (404)
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.975rem', lineHeight: 1.6, marginBottom: '2rem' }}>
          Có vẻ như trang sách bạn đang tìm kiếm không tồn tại, đã bị gỡ bỏ hoặc đã được chuyển đến một ngăn kệ khác tại BookNest.
        </p>

        <div className="flex justify-center gap-3">
          <Link to="/" className="btn btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Home size={18} />
            Về Trang Chủ
          </Link>
          <button 
            type="button" 
            onClick={() => navigate(-1)} 
            className="btn btn-outline"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            <ArrowLeft size={18} />
            Quay Lại
          </button>
        </div>
      </div>
    </div>
  );
};

export default TrangKhongTimThay;
