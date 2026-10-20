import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@booknest/shared/api';
import { 
  ClipboardCheck, 
  RotateCw, 
  ArrowRight, 
  AlertCircle,
  Package,
  Clock,
  Sparkles,
  ShoppingBag
} from 'lucide-react';

const iconTheoLoai = {
  warning: Clock,
  danger: AlertCircle,
  primary: Package,
  success: ClipboardCheck,
  info: Sparkles
};

export const KhoiViecCanLam = ({ className = '' }) => {
  const navigate = useNavigate();
  const [duLieuSummary, setDuLieuSummary] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState('');
  const [lanTai, setLanTai] = useState(0);

  useEffect(() => {
    let daHuy = false;
    api.get('/admin/summary')
      .then((res) => {
        if (!daHuy && res.data?.data) {
          setDuLieuSummary(res.data.data);
        }
      })
      .catch((err) => {
        if (!daHuy) {
          console.error('Lỗi lấy summary công việc:', err);
          setLoi('Không thể tải tổng hợp việc cần làm');
        }
      })
      .finally(() => {
        if (!daHuy) {
          setDangTai(false);
        }
      });

    return () => {
      daHuy = true;
    };
  }, [lanTai]);

  const handleLamMoi = () => {
    setDangTai(true);
    setLoi('');
    setLanTai((cu) => cu + 1);
  };

  if (dangTai && !duLieuSummary) {
    return (
      <div className={`card mb-6 ${className}`} style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', color: 'var(--adm-text-muted)', fontSize: '0.85rem' }}>
          <RotateCw size={15} className="animate-spin" />
          <span>Đang đồng bộ danh mục nhiệm vụ vận hành...</span>
        </div>
      </div>
    );
  }

  if (loi && !duLieuSummary) {
    return null;
  }

  const danhSach = duLieuSummary?.dieuHuongNhanh || [];
  const thongDiep = duLieuSummary?.thongDiep || 'Danh sách công việc đang chờ giải quyết';
  const tongSoViec = danhSach.reduce((acc, cur) => acc + (cur.soLuong || 0), 0);

  return (
    <div 
      className={`card mb-6 ${className}`}
      style={{
        padding: '1.25rem 1.5rem',
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        border: '1px solid var(--adm-border, #E2E8F0)',
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.04)'
      }}
    >
      {/* Header tinh gọn theo phong cách Operational Command */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.15rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
            <h2 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: '#0F172A', letterSpacing: '-0.015em' }}>
              Nhiệm Vụ Vận Hành Cần Xử Lý
            </h2>
            {tongSoViec > 0 ? (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '0.15rem 0.55rem',
                borderRadius: '6px',
                backgroundColor: '#FEF2F2',
                color: '#DC2626',
                border: '1px solid #FECACA'
              }}>
                {tongSoViec} đầu việc tồn
              </span>
            ) : (
              <span style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: '0.15rem 0.55rem',
                borderRadius: '6px',
                backgroundColor: '#F0FDF4',
                color: '#16A34A',
                border: '1px solid #BBF7D0'
              }}>
                Đã xử lý xong
              </span>
            )}
          </div>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: '#64748B' }}>
            {thongDiep}
          </p>
        </div>

        <button
          type="button"
          onClick={handleLamMoi}
          disabled={dangTai}
          title="Đồng bộ lại đầu việc"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#64748B',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px',
            fontSize: '0.75rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            transition: 'color 0.15s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.color = '#0F172A'}
          onMouseLeave={(e) => e.currentTarget.style.color = '#64748B'}
        >
          <RotateCw size={12} className={dangTai ? 'animate-spin' : ''} />
          <span>Đồng bộ</span>
        </button>
      </div>

      {/* Lưới 4 thẻ nhiệm vụ tinh xảo, nền trắng hairline, không ô màu thô */}
      {danhSach.length === 0 ? (
        <div style={{ padding: '0.75rem', color: 'var(--adm-text-muted)', fontSize: '0.85rem' }}>
          Tất cả nhiệm vụ đã được xử lý xong.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.85rem'
        }}>
          {danhSach.map((item, idx) => {
            const IconComponent = iconTheoLoai[item.mauSac] || ShoppingBag;
            const coViec = Number(item.soLuong) > 0;

            return (
              <div
                key={idx}
                onClick={() => {
                  if (item.duongDan) navigate(item.duongDan);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if ((e.key === 'Enter' || e.key === ' ') && item.duongDan) {
                    navigate(item.duongDan);
                  }
                }}
                style={{
                  padding: '1rem 1.15rem',
                  borderRadius: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E2E8F0',
                  cursor: item.duongDan ? 'pointer' : 'default',
                  transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.18s ease, background-color 0.18s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  gap: '0.75rem',
                  boxShadow: '0 1px 2px rgba(15, 23, 42, 0.03)'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px -2px rgba(15, 23, 42, 0.08)';
                  e.currentTarget.style.borderColor = '#CBD5E1';
                  e.currentTarget.style.backgroundColor = '#F8FAFC';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = '0 1px 2px rgba(15, 23, 42, 0.03)';
                  e.currentTarget.style.borderColor = '#E2E8F0';
                  e.currentTarget.style.backgroundColor = '#FFFFFF';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    color: '#475569',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.45rem'
                  }}>
                    <IconComponent size={15} style={{ color: coViec ? (item.mauSac === 'danger' ? '#DC2626' : '#2563EB') : '#94A3B8', flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.tieuDe}
                    </span>
                  </div>

                  {coViec && (
                    <span style={{
                      width: '7px',
                      height: '7px',
                      borderRadius: '50%',
                      backgroundColor: item.mauSac === 'danger' ? '#EF4444' : '#3B82F6',
                      flexShrink: 0
                    }} />
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
                  <div style={{
                    fontSize: '1.75rem',
                    fontWeight: 800,
                    lineHeight: 1,
                    letterSpacing: '-0.03em',
                    fontVariantNumeric: 'tabular-nums',
                    color: coViec ? '#0F172A' : '#94A3B8'
                  }}>
                    {item.soLuong ?? 0}
                  </div>

                  {item.duongDan && (
                    <div style={{
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      color: '#2563EB',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}>
                      <span>Xử lý</span>
                      <ArrowRight size={13} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KhoiViecCanLam;
