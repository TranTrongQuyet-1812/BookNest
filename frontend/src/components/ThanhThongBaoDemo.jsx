import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { TriangleAlert, X } from 'lucide-react';

// Thanh cảnh báo trên đầu mọi trang khách: đây là website học tập, không bán hàng thật.
// Khách đóng được trong phiên hiện tại (sessionStorage); mở lại trang mới trong phiên khác thì hiện lại.
const KHOA_DA_DONG = 'booknest_thanh_demo_da_dong';

const docDaDong = () => {
  try {
    return sessionStorage.getItem(KHOA_DA_DONG) === '1';
  } catch {
    return false;
  }
};

export const ThanhThongBaoDemo = () => {
  const [daDong, setDaDong] = useState(docDaDong);

  if (daDong) return null;

  const dong = () => {
    try {
      sessionStorage.setItem(KHOA_DA_DONG, '1');
    } catch {
      // Trình duyệt chặn lưu trữ: chỉ đóng trong lần hiển thị này
    }
    setDaDong(true);
  };

  return (
    <div
      role="note"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.6rem',
        padding: '0.45rem 2.5rem 0.45rem 1rem',
        position: 'relative',
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '2px solid var(--price)',
        color: 'var(--text-main)',
        fontSize: '0.8rem',
        lineHeight: 1.5,
        textAlign: 'center'
      }}
    >
      <TriangleAlert size={16} style={{ color: 'var(--price)', flexShrink: 0 }} />
      <span>
        <strong>Website học tập của sinh viên, không bán hàng thật.</strong> Vui lòng không đặt hàng và không chuyển tiền thật.{' '}
        <Link to="/dieu-khoan" style={{ color: 'var(--price)', fontWeight: 600, textDecoration: 'underline' }}>Tìm hiểu thêm</Link>
      </span>
      <button
        type="button"
        onClick={dong}
        aria-label="Đóng thông báo"
        style={{
          position: 'absolute',
          right: '0.6rem',
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-muted)',
          padding: '4px',
          display: 'flex'
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default ThanhThongBaoDemo;
