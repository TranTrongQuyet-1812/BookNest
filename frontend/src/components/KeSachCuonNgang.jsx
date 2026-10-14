import React, { useRef, useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { lamSachChuoi } from '../utils/text';

gsap.registerPlugin(useGSAP, ScrollTrigger);

/**
 * KeSachCuonNgang - Component hiển thị kệ sách dàn hàng ngang tối giản
 * Có 2 nút bấm Trái / Phải để cuộn trượt mượt mà (Smooth scroll) bằng GSAP
 * Tích hợp ScrollTrigger để kích hoạt hiệu ứng xuất hiện nhịp nhàng
 */
export const KeSachCuonNgang = ({
  tieuDe,
  linkXemThem,
  danhSachSach = [],
  onThemVaoGio,
  extraAction
}) => {
  const location = useLocation();
  const shelfRef = useRef(null);
  const titleRef = useRef(null);
  const scrollRef = useRef(null);
  const [coTheCuonTrai, setCoTheCuonTrai] = useState(false);
  const [coTheCuonPhai, setCoTheCuonPhai] = useState(true);

  // Hiệu ứng GSAP ScrollTrigger xuất hiện khi cuộn tới kệ sách
  useGSAP(() => {
    if (!shelfRef.current) return;

    gsap.from(titleRef.current, {
      scrollTrigger: {
        trigger: shelfRef.current,
        start: 'top 88%',
        once: true
      },
      opacity: 0,
      y: 20,
      duration: 0.75,
      ease: 'power3.out'
    });

    gsap.from(scrollRef.current, {
      scrollTrigger: {
        trigger: shelfRef.current,
        start: 'top 85%',
        once: true
      },
      opacity: 0,
      y: 25,
      duration: 0.8,
      delay: 0.1,
      ease: 'power3.out'
    });
  }, { scope: shelfRef, dependencies: [danhSachSach] });

  // Kiểm tra vị trí cuộn để ẩn/hiện nút điều hướng
  const kiemTraCuon = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCoTheCuonTrai(scrollLeft > 10);
    setCoTheCuonPhai(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    kiemTraCuon();
    const el = scrollRef.current;
    if (el) {
      el.addEventListener('scroll', kiemTraCuon);
      return () => el.removeEventListener('scroll', kiemTraCuon);
    }
  }, [danhSachSach]);

  // Cuộn sang trái hoặc phải mượt mà bằng GSAP tween
  const cuon = (huong) => {
    if (!scrollRef.current) return;
    const buocCuon = 560;
    const scrollHienTai = scrollRef.current.scrollLeft;
    const mucTieu = scrollHienTai + (huong === 'trai' ? -buocCuon : buocCuon);

    gsap.to(scrollRef.current, {
      scrollLeft: mucTieu,
      duration: 0.6,
      ease: 'power2.out',
      onUpdate: kiemTraCuon,
      onComplete: kiemTraCuon
    });
  };

  if (!danhSachSach || danhSachSach.length === 0) return null;

  return (
    <section ref={shelfRef} style={{ marginBottom: '3.5rem' }}>
      {/* Thanh tiêu đề kệ sách - Căn giữa, to, font thư pháp Bonheur Royale */}
      <div style={{
        position: 'relative',
        textAlign: 'center',
        marginBottom: '1.25rem',
        paddingBottom: '0.6rem',
        borderBottom: '1px solid var(--border)'
      }}>
        <h2 ref={titleRef} className="font-bonheur" data-diem-dau="tieu-de-ke" style={{
          fontSize: '2.85rem',
          color: 'var(--text-main)',
          lineHeight: 1.15,
          letterSpacing: '0.01em',
          margin: 0
        }}>
          {tieuDe}
        </h2>

        {/* Nút Xem thêm & Thao tác phụ (nằm góc phải tinh tế) */}
        <div style={{
          position: 'absolute',
          right: 0,
          bottom: '0.65rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          {extraAction}
          {linkXemThem && (
            <Link
              to={linkXemThem}
              style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--text-muted)',
                transition: 'color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-main)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              Xem thêm &rarr;
            </Link>
          )}
        </div>
      </div>

      {/* Khung dải sách với 2 nút mũi tên nổi ở 2 bên mép */}
      <div data-diem-dau="ke-sach" style={{ position: 'relative' }}>
        {/* Nút Mũi Tên Trái (Luôn hiện diện ở mép trái hàng sách, rõ nét khi không hover) */}
        <button
          onClick={() => cuon('trai')}
          disabled={!coTheCuonTrai}
          aria-label="Cuộn sang trái"
          style={{
            position: 'absolute',
            left: '-20px',
            top: '46%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            border: coTheCuonTrai ? '2px solid var(--text-main)' : '1.5px solid var(--border)',
            backgroundColor: coTheCuonTrai ? 'var(--bg-card)' : 'var(--bg-surface)',
            color: coTheCuonTrai ? 'var(--text-main)' : 'var(--text-sub)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: coTheCuonTrai ? 'pointer' : 'not-allowed',
            opacity: coTheCuonTrai ? 1 : 0.35,
            boxShadow: coTheCuonTrai ? '0 4px 14px rgba(76, 69, 65, 0.25)' : 'none',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={(e) => {
            if (coTheCuonTrai) {
              e.currentTarget.style.backgroundColor = 'var(--primary)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.12)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(76, 69, 65, 0.35)';
            }
          }}
          onMouseLeave={(e) => {
            if (coTheCuonTrai) {
              e.currentTarget.style.backgroundColor = 'var(--bg-card)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(76, 69, 65, 0.25)';
            }
          }}
        >
          <ChevronLeft size={24} strokeWidth={2.5} />
        </button>

        {/* Nút Mũi Tên Phải (Luôn hiện diện ở mép phải hàng sách, rõ nét khi không hover) */}
        <button
          onClick={() => cuon('phai')}
          disabled={!coTheCuonPhai}
          aria-label="Cuộn sang phải"
          style={{
            position: 'absolute',
            right: '-20px',
            top: '46%',
            transform: 'translateY(-50%)',
            zIndex: 10,
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            border: coTheCuonPhai ? '2px solid var(--text-main)' : '1.5px solid var(--border)',
            backgroundColor: coTheCuonPhai ? 'var(--bg-card)' : 'var(--bg-surface)',
            color: coTheCuonPhai ? 'var(--text-main)' : 'var(--text-sub)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: coTheCuonPhai ? 'pointer' : 'not-allowed',
            opacity: coTheCuonPhai ? 1 : 0.35,
            boxShadow: coTheCuonPhai ? '0 4px 14px rgba(76, 69, 65, 0.25)' : 'none',
            transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
          onMouseEnter={(e) => {
            if (coTheCuonPhai) {
              e.currentTarget.style.backgroundColor = 'var(--primary)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1.12)';
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(76, 69, 65, 0.35)';
            }
          }}
          onMouseLeave={(e) => {
            if (coTheCuonPhai) {
              e.currentTarget.style.backgroundColor = 'var(--bg-card)';
              e.currentTarget.style.transform = 'translateY(-50%) scale(1)';
              e.currentTarget.style.boxShadow = '0 4px 14px rgba(76, 69, 65, 0.25)';
            }
          }}
        >
          <ChevronRight size={24} strokeWidth={2.5} />
        </button>

      {/* Dải sách dàn ngang cuộn mượt mà */}
      <div
        ref={scrollRef}
        className="no-scrollbar"
        style={{
          display: 'flex',
          gap: '1rem',
          overflowX: 'auto',
          scrollBehavior: 'smooth',
          paddingBottom: '0.5rem',
          paddingTop: '0.2rem'
        }}
      >
        {danhSachSach.map((sach) => {
          const giaBan = Number(sach.GiaBan || 0);
          const coTap = sach.Tap !== null && sach.Tap !== undefined;

          return (
            <div
              key={sach.MaSach}
              style={{
                flex: '0 0 190px',
                width: '190px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: '0.65rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                boxShadow: 'var(--shadow-sm)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
              }}
            >
              {/* Ảnh bìa sách & Tag số tập */}
              <Link 
                to={`/books/${sach.MaSach}`} 
                state={{ from: location.pathname + location.search }}
                style={{ display: 'block', position: 'relative' }}
              >
                <div style={{
                  width: '100%',
                  aspectRatio: '3 / 4',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  <img
                    src={sach.AnhBia}
                    alt={sach.TenSach}
                    loading="lazy"
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                  {coTap && (
                    <span style={{
                      position: 'absolute',
                      top: '6px',
                      right: '6px',
                      backgroundColor: 'var(--primary)',
                      color: 'var(--primary-text)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backdropFilter: 'blur(2px)'
                    }}>
                      Tập {sach.Tap}
                    </span>
                  )}
                </div>

                {/* Tiêu đề & tác giả */}
                <h3 style={{
                  fontSize: '0.9rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  marginTop: '0.6rem',
                  marginBottom: '0.2rem',
                  lineHeight: '1.3',
                  height: '2.6em',
                  overflow: 'hidden',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }} title={sach.TenSach}>
                  {sach.TenSach}
                </h3>
                <p style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)',
                  marginBottom: '0.5rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {lamSachChuoi(sach.TacGia)}
                </p>
              </Link>

              {/* Giá bán & Nút mua nhanh */}
              <div>
                <div style={{
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  color: 'var(--price)',
                  marginBottom: '0.5rem'
                }}>
                  {giaBan.toLocaleString('vi-VN')} đ
                </div>

                <button
                  onClick={() => onThemVaoGio(sach.MaSach, sach.TenSach)}
                  style={{
                    width: '100%',
                    padding: '0.45rem 0',
                    fontSize: '0.8rem',
                    fontWeight: 600,
                    backgroundColor: 'var(--primary)',
                    color: 'var(--primary-text)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    cursor: 'pointer',
                    transition: 'opacity 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                >
                  Thêm vào giỏ
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  </section>
  );
};

export default KeSachCuonNgang;
