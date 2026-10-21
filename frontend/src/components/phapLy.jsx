import React from 'react';
import { Link } from 'react-router-dom';
import { TRANG_PHAP_LY, EMAIL_HO_TRO } from './phapLyDungChung';
import { ArrowLeft, GraduationCap, TriangleAlert } from 'lucide-react';

// Các thành phần dùng chung cho nhóm trang pháp lý (điều khoản, bảo mật, đổi trả, nguồn dữ liệu)

// Nút quay về + thanh chuyển nhanh giữa các trang pháp lý
export const ThanhDieuHuongPhapLy = ({ dangMo }) => (
  <>
    <div style={{ marginBottom: '1.5rem' }}>
      <Link
        to="/"
        className="hover:underline"
        style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.875rem', textUnderlineOffset: '3px' }}
      >
        <ArrowLeft size={16} /> Quay về Trang chủ
      </Link>
    </div>

    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '0.5rem',
        padding: '0.35rem',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        marginBottom: '2.5rem'
      }}
    >
      {TRANG_PHAP_LY.map((trang) => {
        const dangChon = trang.duongDan === dangMo;
        return (
          <Link
            key={trang.duongDan}
            to={trang.duongDan}
            style={{
              flex: '1 1 150px',
              textAlign: 'center',
              padding: '0.65rem 0.75rem',
              borderRadius: '9px',
              fontSize: '0.875rem',
              fontWeight: dangChon ? 600 : 500,
              backgroundColor: dangChon ? 'var(--bg-card)' : 'transparent',
              color: dangChon ? 'var(--text-main)' : 'var(--text-muted)',
              boxShadow: dangChon ? 'var(--shadow-sm)' : 'none',
              textDecoration: 'none'
            }}
          >
            {trang.nhan}
          </Link>
        );
      })}
    </div>
  </>
);

// Khối tiêu đề đầu trang
export const TieuDeTrangPhapLy = ({ tieuDe, moTa }) => (
  <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
    <h1
      className="font-serif"
      style={{ marginBottom: '0.75rem', fontSize: '2.25rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '-0.02em', lineHeight: 1.25 }}
    >
      {tieuDe}
    </h1>
    <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: '620px', margin: '0 auto' }}>
      {moTa}
    </p>
    <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '0.75rem' }}>
      Phiên bản công bố: Tháng 10/2026 • Dự án học tập, phi thương mại
    </div>
  </header>
);

// Khung cảnh báo nổi bật: dự án sinh viên, không bán hàng thật, đừng chuyển tiền thật
export const KhungDuAnHocTap = ({ style }) => (
  <div
    role="note"
    style={{
      backgroundColor: 'var(--bg-surface)',
      border: '2px solid var(--price)',
      borderRadius: '14px',
      padding: '1.25rem 1.5rem',
      ...style
    }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
      <TriangleAlert size={22} style={{ color: 'var(--price)', flexShrink: 0, marginTop: '2px' }} />
      <div>
        <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
          Đây là dự án sinh viên phục vụ học tập, phi thương mại
        </h2>
        <p style={{ fontSize: '0.875rem', lineHeight: 1.7, color: 'var(--text-muted)', margin: 0 }}>
          BookNest <strong>không bán hàng thật</strong>. Sách và giá chỉ là dữ liệu mẫu, đơn hàng sẽ <strong>không được giao</strong>.
          Vui lòng <strong>không đặt hàng và không chuyển tiền thật</strong>. Nếu lỡ chuyển tiền, hãy liên hệ{' '}
          <a href={`mailto:${EMAIL_HO_TRO}`} style={{ color: 'var(--price)', fontWeight: 600 }}>{EMAIL_HO_TRO}</a>.
        </p>
      </div>
    </div>
  </div>
);

// Khung giới thiệu người phụ trách (cuối trang)
export const KhungLienHePhapLy = ({ tieuDe, moTa }) => (
  <section
    id="lien-he"
    style={{
      backgroundColor: 'var(--bg-surface)',
      padding: '1.5rem',
      borderRadius: '12px',
      border: '1px solid var(--border)',
      marginTop: '2rem'
    }}
  >
    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
      <GraduationCap size={18} style={{ color: 'var(--price)' }} />
      {tieuDe}
    </h3>
    <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>{moTa}</p>
    <div style={{ fontSize: '0.875rem', color: 'var(--text-main)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div><strong>Phụ trách đề tài:</strong> Trần Trọng Quyết (sinh viên Trường Đại Học Lạc Hồng)</div>
      <div>
        <strong>Hòm thư tiếp nhận:</strong>{' '}
        <a href={`mailto:${EMAIL_HO_TRO}`} style={{ color: 'var(--price)', fontWeight: 600 }}>{EMAIL_HO_TRO}</a>
      </div>
    </div>
  </section>
);

// Một mục có tiêu đề và biểu tượng
export const MucPhapLy = ({ id, bieuTuong: BieuTuong, tieuDe, children }) => (
  <section id={id} style={{ scrollMarginTop: '6rem' }}>
    <h2
      className="font-serif"
      style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}
    >
      <BieuTuong size={20} style={{ color: 'var(--accent)' }} />
      {tieuDe}
    </h2>
    {children}
  </section>
);

export const DoanVan = ({ children, style }) => (
  <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem', ...style }}>{children}</p>
);

export const DanhSachGach = ({ children }) => (
  <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-muted)' }} className="space-y-2">
    {children}
  </ul>
);

// Bố cục khung bao ngoài của mọi trang pháp lý
export const KhungTrangPhapLy = ({ children }) => (
  <div className="container" style={{ maxWidth: '840px', margin: '0 auto', padding: '2.5rem 1rem' }}>
    {children}
  </div>
);

export const NoiDungPhapLy = ({ children }) => (
  <article style={{ display: 'flex', flexDirection: 'column', gap: '2rem', color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.8 }}>
    {children}
  </article>
);
