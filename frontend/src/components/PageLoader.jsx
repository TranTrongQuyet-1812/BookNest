import React, { useEffect, useRef } from 'react';
import gsap from 'gsap';
import LogoBookNest from './LogoBookNest';
import { baoRemMo, baoRemDong } from '../utils/nhipMoTrang';

// Các câu danh ngôn ngắn ngẫu nhiên xuất hiện khi chuyển trang
const CAU_DANH_NGON = [
  'Thế giới sách & điểm hẹn tri thức, chốn bình yên của tâm hồn.',
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
// canRem(duongDanDich, duongDanNguon): có cần chạy rèm cho lần chuyển này không (trang đã sẵn sàng thì đổi tức thì).
// chuanBiTrang(duongDanDich): Promise báo trang đích đã tải xong mã, rèm chỉ kéo lên khi trang đã sẵn sàng.
// laChuyenHuong: lần đổi địa chỉ này là chuyển hướng tự động của hệ thống, App đã đổi trang ngay nên không chạy lại rèm.
export const PageLoader = ({ location: targetLocation, onCurtainCovered, canRem, chuanBiTrang, laChuyenHuong }) => {
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

  const canRemRef = useRef(canRem);
  const chuanBiTrangRef = useRef(chuanBiTrang);
  const laChuyenHuongRef = useRef(laChuyenHuong);
  useEffect(() => {
    canRemRef.current = canRem;
    chuanBiTrangRef.current = chuanBiTrang;
    laChuyenHuongRef.current = laChuyenHuong;
  }, [canRem, chuanBiTrang, laChuyenHuong]);

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

    const duongDanNguon = viTriCuRef.current;
    viTriCuRef.current = currentPath;

    // Chuyển hướng tự động (ví dụ chưa đăng nhập bị đẩy sang /login): không khởi động lại rèm, rèm đang chạy cứ chạy tiếp
    if (laChuyenHuongRef.current) return;

    // Trang đích đã sẵn sàng thì không cần rèm: đổi trang tức thì (hiệu ứng mờ nhẹ do StorefrontLayout lo).
    // Không gọi baoRemDong nên các cảnh bên dưới (hero, sinh vật) biết rèm đang mở và vào cảnh ngay.
    if (canRemRef.current && !canRemRef.current(currentPath, duongDanNguon)) {
      // Nếu rèm của lần bấm trước còn đang chạy thì dừng và trả rèm về trạng thái ẩn, tránh rèm kẹt phủ kín
      if (tlHienTaiRef.current) tlHienTaiRef.current.kill();
      if (manCheRef.current) {
        gsap.set(manCheRef.current, { yPercent: -100, visibility: "hidden", pointerEvents: "none" });
      }
      dangChuyenCanhRef.current = false;
      if (onCurtainCoveredRef.current) onCurtainCoveredRef.current();
      if (window.lenis) window.lenis.scrollTo(0, { immediate: true });
      window.scrollTo(0, 0);
      return;
    }

    dangChuyenCanhRef.current = true;

    const manChe = manCheRef.current;
    const noiDung = noiDungRef.current;
    const thanhTienTrinh = thanhTienTrinhRef.current;
    if (!manChe || !noiDung || !thanhTienTrinh) return;

    // Bắt đầu tải mã trang đích song song với lúc rèm kéo lên, để lúc rèm hạ trang đã có sẵn
    const trangSanSang = chuanBiTrangRef.current ? chuanBiTrangRef.current(currentPath) : Promise.resolve();

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
      duration: 0.22,
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
      duration: 0.14,
      ease: 'power2.out'
    }, '-=0.04')
    // BƯỚC 3: Thanh chỉ vàng lướt qua
    .to(thanhTienTrinh, {
      scaleX: 1,
      duration: 0.22,
      ease: 'power2.inOut'
    }, '-=0.1')
    // BƯỚC 4: Chữ mờ đi
    .to(noiDung, {
      opacity: 0,
      y: -6,
      duration: 0.14,
      ease: 'power2.in'
    })
    // Giữ rèm cho tới khi mã trang đích tải xong (tối đa 4 giây), nhờ vậy rèm ngắn hơn mà không lộ trang trống
    .call(() => {
      tl.pause();
      Promise.race([trangSanSang, new Promise((resolve) => setTimeout(resolve, 4000))])
        .catch(() => {})
        .finally(() => tl.resume());
    })
    // BƯỚC 5: Rèm trượt vút lên trên trời hé lộ trang mới đã có đầy đủ dữ liệu
    .to(manChe, {
      yPercent: -100,
      duration: 0.38,
      ease: 'power4.inOut',
      onStart: baoRemMo,
      onComplete: () => {
        dangChuyenCanhRef.current = false;
        gsap.set(manChe, { visibility: 'hidden', pointerEvents: 'none' });
      }
    }, '>');

    // Không kill timeline khi dọn effect: nếu địa chỉ đổi thêm giữa lúc rèm đang chạy (chuyển hướng tự động) thì rèm phải chạy tiếp,
    // kill ở đây sẽ làm rèm kẹt phủ kín màn hình. Lần chạy mới tự kill timeline cũ ở đầu effect.
  }, [currentPath]); // CHỈ phụ thuộc vào currentPath, không phụ thuộc function callback!

  // Gỡ PageLoader (đóng trang) thì dừng timeline đang chạy
  useEffect(() => () => {
    if (tlHienTaiRef.current) tlHienTaiRef.current.kill();
  }, []);

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
