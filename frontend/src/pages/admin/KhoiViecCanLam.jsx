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
  ShoppingBag,
  CheckCircle2
} from 'lucide-react';

const mauSacStyle = {
  warning: {
    bg: '#FFFBEB',
    border: '#FDE68A',
    text: '#B45309',
    badgeBg: '#FEF3C7',
    icon: Clock
  },
  danger: {
    bg: '#FEF2F2',
    border: '#FECACA',
    text: '#B91C1C',
    badgeBg: '#FEE2E2',
    icon: AlertCircle
  },
  primary: {
    bg: '#EFF6FF',
    border: '#BFDBFE',
    text: '#1D4ED8',
    badgeBg: '#DBEAFE',
    icon: Package
  },
  success: {
    bg: '#F0FDF4',
    border: '#BBF7D0',
    text: '#15803D',
    badgeBg: '#DCFCE7',
    icon: CheckCircle2
  },
  info: {
    bg: '#F0F9FF',
    border: '#BAE6FD',
    text: '#0369A1',
    badgeBg: '#E0F2FE',
    icon: Sparkles
  }
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
      <div className={`card mb-6 ${className}`} style={{ padding: '1rem 1.25rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--adm-text-muted)', fontSize: '0.85rem' }}>
          <RotateCw size={15} className="animate-spin" />
          <span>Đang kiểm tra đầu việc cần xử lý...</span>
        </div>
      </div>
    );
  }

  if (loi && !duLieuSummary) {
    return null; // Không chặn giao diện nếu lỗi mạng
  }

  const danhSach = duLieuSummary?.dieuHuongNhanh || [];
  const thongDiep = duLieuSummary?.thongDiep || 'Danh sách công việc cần xử lý';
  const tongSoViec = danhSach.reduce((acc, cur) => acc + (cur.soLuong || 0), 0);

  return (
    <div 
      className={`card mb-6 ${className}`}
      style={{
        padding: '1.25rem 1.5rem',
        borderLeft: '4px solid var(--adm-primary, #2563EB)',
        backgroundColor: 'var(--adm-card-bg, #FFFFFF)',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)'
      }}
    >
      {/* Tiêu đề & Nút làm mới */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            color: 'var(--adm-primary, #2563EB)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ClipboardCheck size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h2 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--adm-text-main, #0F172A)' }}>
                Việc Cần Làm
              </h2>
              {tongSoViec > 0 ? (
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.15rem 0.55rem',
                  borderRadius: '999px',
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
                  borderRadius: '999px',
                  backgroundColor: '#F0FDF4',
                  color: '#16A34A',
                  border: '1px solid #BBF7D0'
                }}>
                  Đã hoàn tất
                </span>
              )}
            </div>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'var(--adm-text-muted, #64748B)' }}>
              {thongDiep}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLamMoi}
          disabled={dangTai}
          title="Làm mới số liệu việc cần làm"
          className="btn btn-outline btn-sm"
          style={{
            fontSize: '0.775rem',
            padding: '0.35rem 0.65rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}
        >
          <RotateCw size={13} className={dangTai ? 'animate-spin' : ''} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Lưới các thẻ điều hướng việc cần làm */}
      {danhSach.length === 0 ? (
        <div style={{ padding: '0.75rem', color: 'var(--adm-text-muted)', fontSize: '0.85rem' }}>
          Không có đầu việc nào cần xử lý.
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: '0.85rem'
        }}>
          {danhSach.map((item, idx) => {
            const configMau = mauSacStyle[item.mauSac] || mauSacStyle.primary;
            const IconComponent = configMau.icon || ShoppingBag;
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
                  padding: '0.85rem 1rem',
                  borderRadius: '8px',
                  backgroundColor: configMau.bg,
                  border: `1px solid ${configMau.border}`,
                  cursor: item.duongDan ? 'pointer' : 'default',
                  transition: 'transform 0.12s ease, box-shadow 0.12s ease',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '0.5rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'none';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{
                    fontSize: '0.78rem',
                    fontWeight: 600,
                    color: configMau.text,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                    marginBottom: '0.3rem'
                  }}>
                    <IconComponent size={14} style={{ flexShrink: 0 }} />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.tieuDe}
                    </span>
                  </div>
                  <div style={{
                    fontSize: '1.35rem',
                    fontWeight: 800,
                    lineHeight: 1,
                    color: coViec ? configMau.text : 'var(--adm-text-muted, #64748B)'
                  }}>
                    {item.soLuong ?? 0}
                  </div>
                </div>

                {item.duongDan && (
                  <div style={{
                    color: configMau.text,
                    opacity: 0.8,
                    display: 'flex',
                    alignItems: 'center'
                  }}>
                    <ArrowRight size={16} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default KhoiViecCanLam;
