import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import LogoBookNest from './LogoBookNest';
import { baoRemMo, baoRemDong } from '../utils/nhipMoTrang';

// Các câu danh ngôn ngắn ngẫu nhiên xuất hiện khi chuyển trang
const CAU_DANH_NGON = [
  'Tổ ấm của những trang sách, chốn bình yên của tâm hồn.',
  'Mở một trang sách, là mở ra một chân trời mới.',
  'Hương thơm trang giấy và sự tĩnh lặng dịu êm.',
  'Mỗi cuốn sách là một người bạn kiên nhẫn đợi ta.',
  'Thư thả đọc một vài trang sách bên tách cà phê ấm.'
];

/**
 * PageLoader - Màn lụa chuyển trang điện ảnh (Curtain Reveal Transition)
 * Cơ chế Freeze Route:
 * 1. Khi đổi route, rèm kéo lên che kín 100% màn hình TRƯỚC.
 * 2. Gọi onCurtainCovered để swap trang mới ngầm bên dưới rèm và reset scroll.
 * 3. Rèm trượt vút lên trên trời hé lộ trang mới mượt mà, triệt tiêu 100% chớp trang.
 */
export const PageLoader = ({ location: targetLocation, onCurtainCovered }) => {
  const manCheRef = useRef(null);
  const noiDungRef = useRef(null);
  const thanhTienTrinhRef = useRef(null);
  const quoteTextRef = useRef(null);

  const daKhoiTaoRef = useRef(false);
  const tlHienTaiRef = useRef(null);

  // Lưu callback vào ref để tránh re-render kích hoạt hủy timeline GSAP
  const onCurtainCoveredRef = useRef(onCurtainCovered);
  useEffect(() => {
    onCurtainCoveredRef.current = onCurtainCovered;
  }, [onCurtainCovered]);

  const currentPath = targetLocation ? `${targetLocation.pathname}${targetLocation.search}` : '/';
  const viTriCuRef = useRef(currentPath);

  // 1. Kịch bản chạy lần đầu tiên khi truy cập website (Initial Mount)
  useEffect(() => {
    const manChe = manCheRef.current;
    const noiDung = noiDungRef.current;
    const thanhTienTrinh = thanhTienTrinhRef.current;
    if (!manChe || !noiDung || !thanhTienTrinh) return;

    // Đặt trạng thái ban đầu che phủ toàn màn hình
    gsap.set(manChe, {
      yPercent: 0,
      visibility: 'visible',
      pointerEvents: 'auto'
    });
    gsap.set(noiDung, { opacity: 0, y: 15 });
    gsap.set(thanhTienTrinh, { scaleX: 0, transformOrigin: 'left center' });

    if (quoteTextRef.current) {
      quoteTextRef.current.textContent = `"${CAU_DANH_NGON[0]}"`;
    }

    const tl = gsap.timeline({
      onComplete: () => {
        daKhoiTaoRef.current = true;
        gsap.set(manChe, { visibility: 'hidden', pointerEvents: 'none' });
      }
    });
    tlHienTaiRef.current = tl;

    // Nội dung hiện lên nhẹ nhàng
    tl.to(noiDung, {
      opacity: 1,
      y: 0,
      duration: 0.35,
      ease: 'power2.out'
    })
    // Thanh chỉ vàng chạy từ 0 đến 100%
    .to(thanhTienTrinh, {
      scaleX: 1,
      duration: 0.45,
      ease: 'power1.inOut'
    })
    // Chờ 0.05s
    .to({}, { duration: 0.05 })
    // Nội dung mờ nhẹ đi
    .to(noiDung, {
      opacity: 0,
      y: -10,
      duration: 0.25,
      ease: 'power2.in'
    }, '-=0.05')
    // Tấm màn trượt vút lên trên trời hé lộ trang web
    .to(manChe, {
      yPercent: -100,
      duration: 0.65,
      ease: 'power4.inOut',
      onStart: baoRemMo // hero và đàn sinh vật vào cảnh đúng lúc rèm bắt đầu hé trang
    }, '-=0.1');

    return () => {
      tl.kill();
    };
  }, []);

  const dangChuyenCanhRef = useRef(false);

  // 2. Kịch bản chạy mỗi khi người dùng chuyển trang khác (Route Change Transition)
  useEffect(() => {
    // Nếu chưa khởi tạo xong lần đầu hoặc route không thay đổi thì bỏ qua
    if (!daKhoiTaoRef.current) return;
    if (viTriCuRef.current === currentPath) return;

    viTriCuRef.current = currentPath;
    dangChuyenCanhRef.current = true;

    const manChe = manCheRef.current;
    const noiDung = noiDungRef.current;
    const thanhTienTrinh = thanhTienTrinhRef.current;
    if (!manChe || !noiDung || !thanhTienTrinh) return;

    // Cập nhật câu danh ngôn ngẫu nhiên trực tiếp vào DOM (không qua state để tránh re-render)
    if (quoteTextRef.current) {
      const cauNgauNhien = CAU_DANH_NGON[Math.floor(Math.random() * CAU_DANH_NGON.length)];
      quoteTextRef.current.textContent = `"${cauNgauNhien}"`;
    }

    // Nếu đang có timeline cũ chạy thì dọn dẹp trước
    if (tlHienTaiRef.current) {
      tlHienTaiRef.current.kill();
    }

    const tl = gsap.timeline();
    tlHienTaiRef.current = tl;

    // Chuẩn bị: Đặt rèm ở dưới đáy màn hình
    baoRemDong(); // trang cũ sắp bị che, cảnh của trang mới phải chờ rèm mở lại
    gsap.set(manChe, {
      yPercent: 100,
      visibility: 'visible',
      pointerEvents: 'auto'
    });
    gsap.set(noiDung, { opacity: 0, y: 10 });
    gsap.set(thanhTienTrinh, { scaleX: 0, transformOrigin: 'left center' });

    // BƯỚC 1: Rèm trượt nhanh và êm từ đáy lên che kín 100% màn hình
    tl.to(manChe, {
      yPercent: 0,
      duration: 0.28,
      ease: 'power3.inOut',
      onComplete: () => {
        // Rèm đã che kín 100% -> Kích hoạt hoán đổi trang mới ngầm bên dưới!
        if (onCurtainCoveredRef.current) {
          onCurtainCoveredRef.current();
        }
        if (window.lenis) {
          window.lenis.scrollTo(0, { immediate: true });
        }
        window.scrollTo(0, 0);
      }
    })
    // BƯỚC 2: Logo & Chữ hiện lên trang nhã
    .to(noiDung, {
      opacity: 1,
      y: 0,
      duration: 0.24,
      ease: 'power2.out'
    }, '-=0.04')
    // BƯỚC 3: Thanh chỉ vàng lướt qua (giữ rèm đủ lâu để API backend nạp xong ngầm hoàn toàn)
    .to(thanhTienTrinh, {
      scaleX: 1,
      duration: 0.42,
      ease: 'power2.inOut'
    }, '-=0.08')
    // BƯỚC 4: Chữ mờ đi
    .to(noiDung, {
      opacity: 0,
      y: -8,
      duration: 0.2,
      ease: 'power2.in'
    })
    // BƯỚC 5: Rèm trượt vút lên trên trời hé lộ trang mới đã có đầy đủ dữ liệu
    .to(manChe, {
      yPercent: -100,
      duration: 0.6,
      ease: 'power4.inOut',
      onStart: baoRemMo,
      onComplete: () => {
        dangChuyenCanhRef.current = false;
        gsap.set(manChe, { visibility: 'hidden', pointerEvents: 'none' });
      }
    }, '-=0.06');

    return () => {
      tl.kill();
    };
  }, [currentPath]); // CHỈ phụ thuộc vào currentPath, không phụ thuộc function callback!

  return (
    <div
      ref={manCheRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        backgroundColor: 'var(--bg-surface)', // Đồng bộ 100% theo theme (Light: #F5E8CD, Dark: #423940)
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-lg)',
        willChange: 'transform'
      }}
    >
      {/* Khối Nội Dung Ở Tâm Màn Hình */}
      <div
        ref={noiDungRef}
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '2rem',
          maxWidth: '480px'
        }}
      >
        {/* Logo & Tên BookNest */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '0.75rem' }}>
          <LogoBookNest height={54} />
          <span
            className="font-fleur"
            style={{
              fontSize: '3.2rem',
              color: 'var(--text-main)',
              lineHeight: 1,
              userSelect: 'none'
            }}
          >
            BookNest
          </span>
        </div>

        {/* Câu tản văn thi vị */}
        <p
          ref={quoteTextRef}
          style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1rem',
            fontStyle: 'italic',
            color: 'var(--text-muted)',
            lineHeight: 1.6,
            marginBottom: '1.5rem',
            minHeight: '2.5rem'
          }}
        >
          "{CAU_DANH_NGON[0]}"
        </p>

        {/* Thanh Chỉ Vàng (Golden Progress Thread) */}
        <div
          style={{
            width: '140px',
            height: '2px',
            backgroundColor: 'var(--border)',
            borderRadius: '999px',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          <div
            ref={thanhTienTrinhRef}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: 'var(--primary)',
              borderRadius: '999px'
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
