import { useEffect, useRef } from 'react';
import Lenis from 'lenis';
import 'lenis/dist/lenis.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { setGlobalLenis } from '../utils/lenis';

// Đăng ký plugin ScrollTrigger với GSAP
gsap.registerPlugin(ScrollTrigger);

/**
 * Component bọc quản lý Smooth Scroll bằng Lenis và đồng bộ GSAP ScrollTrigger
 */
export const SmoothScroll = ({ children }) => {
  const lenisRef = useRef(null);

  useEffect(() => {
    const kiemTraGiamChuyenDong = () => {
      return (
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        document.documentElement.getAttribute('data-giam-chuyen-dong') === 'true'
      );
    };

    const giamChuyenDong = kiemTraGiamChuyenDong();

    // Khởi tạo Lenis với easing mũ mượt mà (Tự động nhẹ tải khi bật giảm chuyển động)
    const lenis = new Lenis({
      duration: giamChuyenDong ? 0.1 : 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: !giamChuyenDong,
      wheelMultiplier: 1,
      touchMultiplier: 1.8,
    });

    lenisRef.current = lenis;
    setGlobalLenis(lenis);
    window.lenis = lenis;

    // Lắng nghe thay đổi chế độ giảm chuyển động từ app để điều chỉnh tức thì
    const observer = new MutationObserver(() => {
      const daGiam = kiemTraGiamChuyenDong();
      if (lenisRef.current) {
        lenisRef.current.options.smoothWheel = !daGiam;
      }
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-giam-chuyen-dong'] });

    // Đồng bộ vị trí cuộn của Lenis với ScrollTrigger
    const handleScroll = () => {
      ScrollTrigger.update();
    };
    lenis.on('scroll', handleScroll);

    // Dùng ticker của GSAP để điều phối nhịp render khung hình của Lenis
    const updateTicker = (time) => {
      lenis.raf(time * 1000);
    };

    gsap.ticker.add(updateTicker);
    // lagSmoothing(500, 33) cho phép GSAP làm mượt khi CPU máy trường bị trễ frame, triệt tiêu giật khựng
    gsap.ticker.lagSmoothing(500, 33);

    return () => {
      observer.disconnect();
      gsap.ticker.remove(updateTicker);
      lenis.off('scroll', handleScroll);
      lenis.destroy();
      lenisRef.current = null;
      setGlobalLenis(null);
      delete window.lenis;
    };
  }, []);



  return children;
};

export default SmoothScroll;
