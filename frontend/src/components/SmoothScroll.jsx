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
    // Khởi tạo Lenis với easing mũ mượt mà
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 1.8,
    });

    lenisRef.current = lenis;
    setGlobalLenis(lenis);
    window.lenis = lenis;

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
    gsap.ticker.lagSmoothing(0);

    return () => {
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
