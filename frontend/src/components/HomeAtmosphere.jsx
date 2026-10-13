import { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useCheDoGiaoDien } from './r3f/hooks/useCheDoGiaoDien';
import { useGiamChuyenDong } from '../utils/chuyenDong';
import { khiRemMo } from '../utils/nhipMoTrang';

gsap.registerPlugin(useGSAP, ScrollTrigger);

const SO_HAT = 28;

function taoHat(w, h, ngauNhien = Math.random) {
  return {
    x: ngauNhien() * w,
    y: ngauNhien() * h,
    vx: (ngauNhien() - 0.42) * 10,
    vy: -4 - ngauNhien() * 12,
    banKinh: 1 + ngauNhien() * 2.1,
    doMo: 0.25 + ngauNhien() * 0.6,
    pha: ngauNhien() * Math.PI * 2,
    tocDo: 0.5 + ngauNhien() * 1.1
  };
}

function HinhTrangTri({ ten, lop, alt = '' }) {
  return (
    <img
      className={`home-art ${lop}`}
      src={`/hinh-trang-tri/${ten}`}
      alt={alt}
      aria-hidden="true"
      draggable="false"
    />
  );
}

export default function HomeAtmosphere({ heroRef }) {
  const rootRef = useRef(null);
  const canvasRef = useRef(null);
  const cheDo = useCheDoGiaoDien();
  const [giamChuyenDong] = useGiamChuyenDong();
  // Chỉ vào cảnh một lần mỗi lần dựng trang; đổi sáng/tối (effect chạy lại) thì không trượt vào lần nữa
  const daVaoCanhRef = useRef(false);

  useGSAP(() => {
    const root = rootRef.current;
    // Effect của component con chạy TRƯỚC khi React gắn ref cho thẻ section cha, nên heroRef.current còn rỗng ở lần
    // chạy đầu. Nếu thoát ở đây thì effect không bao giờ chạy lại (heroRef là object không đổi) và trang mở lên
    // sẽ không có intro, mây trôi, parallax. Lớp này nằm ngay trong section hero nên lấy luôn thẻ cha.
    const hero = heroRef.current || root?.parentElement;
    if (!root || !hero) return undefined;

    const giam = giamChuyenDong;
    const cacVongLap = [];

    if (!giam) {
      cacVongLap.push(
        gsap.to('.home-cloud--mot', { x: 38, y: -8, duration: 58, repeat: -1, yoyo: true, ease: 'sine.inOut' }),
        gsap.to('.home-cloud--hai', { x: -26, y: 10, duration: 73, repeat: -1, yoyo: true, ease: 'sine.inOut' }),
        gsap.to('.home-sun-moon', { scale: 1.045, duration: 7, repeat: -1, yoyo: true, ease: 'sine.inOut' }),
        gsap.to('.home-branch', { rotation: 1.4, duration: 5.5, repeat: -1, yoyo: true, transformOrigin: '10% 0%', ease: 'sine.inOut' })
      );
      const denLongMot = root.querySelector('.home-lantern--mot');
      const denLongHai = root.querySelector('.home-lantern--hai');
      if (denLongMot) cacVongLap.push(gsap.to(denLongMot, { rotation: 3, duration: 3.8, repeat: -1, yoyo: true, transformOrigin: '50% 0%', ease: 'sine.inOut' }));
      if (denLongHai) cacVongLap.push(gsap.to(denLongHai, { rotation: -2.4, duration: 4.6, repeat: -1, yoyo: true, transformOrigin: '50% 0%', ease: 'sine.inOut' }));
    }

    // Vào cảnh khi rèm PageLoader bắt đầu trượt lên: cỏ trồi lên, cành rủ xuống, mặt trời/trăng và đèn lồng trượt ra,
    // mây trôi vào từ hai bên. Dùng xPercent/yPercent để không đụng x/y/rotation/scale của các vòng lặp và ScrollTrigger.
    let huyChoRem = () => {};
    if (!giam && !daVaoCanhRef.current) {
      const denLong = root.querySelectorAll('.home-lantern');
      // Rèm easing power4.inOut nên 0,2 giây đầu mới hé khoảng 7% màn hình; bắt đầu trễ chừng đó để phần nhanh nhất
      // của chuyển động rơi vào lúc trang đã lộ ra, không bị rèm che mất
      const TRE = 0.2;
      const tlVaoCanh = gsap.timeline({ paused: true, defaults: { ease: 'power3.out' } })
        .from('.home-branch', { yPercent: -105, opacity: 0, duration: 1.6 }, TRE)
        .from('.home-sun-moon', { xPercent: 35, yPercent: -40, opacity: 0, duration: 1.8 }, TRE + 0.1)
        .from('.home-grass', { yPercent: 45, opacity: 0, duration: 1.5 }, TRE + 0.15)
        .from('.home-cloud--mot', { xPercent: -150, opacity: 0, duration: 2.4, ease: 'power2.out' }, TRE + 0.2)
        .from('.home-cloud--hai', { xPercent: 170, opacity: 0, duration: 2.6, ease: 'power2.out' }, TRE + 0.3)
        .from('.home-cloud--ba', { xPercent: -130, opacity: 0, duration: 2.5, ease: 'power2.out' }, TRE + 0.4)
        .from('.home-pollen', { opacity: 0, duration: 1.6, ease: 'none' }, TRE + 0.8);
      if (denLong.length) tlVaoCanh.from(denLong, { yPercent: -170, duration: 1.4, ease: 'elastic.out(1, 0.55)', stagger: 0.18 }, TRE + 0.5);
      huyChoRem = khiRemMo(() => {
        daVaoCanhRef.current = true;
        tlVaoCanh.play();
      });
    }

    const vungSang = root.querySelector('.home-pointer-glow');
    gsap.set(vungSang, { xPercent: -50, yPercent: -50 });
    const tweenSang = gsap.quickTo(vungSang, 'x', { duration: 0.65, ease: 'power3.out' });
    const tweenCao = gsap.quickTo(vungSang, 'y', { duration: 0.65, ease: 'power3.out' });
    const khiDiChuyen = (event) => {
      if (giam) return;
      const bounds = root.getBoundingClientRect();
      tweenSang(event.clientX - bounds.left);
      tweenCao(event.clientY - bounds.top);
    };
    window.addEventListener('pointermove', khiDiChuyen, { passive: true });

    const boTheoDoiCuon = !giam && ScrollTrigger.create({
      trigger: hero,
      start: 'top top',
      end: 'bottom top',
      scrub: 0.8,
      animation: gsap.timeline()
        .to('.home-cloud--xa', { y: 70, opacity: 0.3, ease: 'none' }, 0)
        .to('.home-branch', { y: 42, ease: 'none' }, 0)
        .to('.home-grass', { y: -22, ease: 'none' }, 0)
        .to('.home-light-field', { y: 40, ease: 'none' }, 0)
        .to(hero.querySelector('.home-hero-content'), { y: -34, opacity: 0.66, ease: 'none' }, 0)
    });

    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    let rong = 1;
    let cao = 1;
    let tiLe = 1;
    let dangTrongMan = true;
    let daVe = false;
    let hat = [];

    const doiKichThuoc = () => {
      rong = root.clientWidth;
      cao = root.clientHeight;
      tiLe = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(rong * tiLe);
      canvas.height = Math.round(cao * tiLe);
      canvas.style.width = `${rong}px`;
      canvas.style.height = `${cao}px`;
      context.setTransform(tiLe, 0, 0, tiLe, 0, 0);
      const soHat = window.innerWidth < 700 ? 12 : SO_HAT;
      hat = Array.from({ length: soHat }, () => taoHat(rong, cao));
      daVe = false;
    };
    doiKichThuoc();

    const tick = (_time, deltaMs) => {
      if (document.hidden || !dangTrongMan || giam || !context) return;
      const delta = Math.min(deltaMs / 1000, 0.04);
      context.clearRect(0, 0, rong, cao);
      hat.forEach((motHat) => {
        motHat.x += motHat.vx * delta;
        motHat.y += motHat.vy * delta;
        motHat.pha += delta * motHat.tocDo;
        if (motHat.y < -8) { motHat.y = cao + 4; motHat.x = Math.random() * rong; }
        if (motHat.x < -8) motHat.x = rong + 4;
        if (motHat.x > rong + 8) motHat.x = -4;
        const chop = 0.68 + Math.sin(motHat.pha) * 0.22;
        const mauHat = cheDo === 'dark' ? '242, 196, 106' : '191, 144, 73';
        context.beginPath();
        context.fillStyle = `rgba(${mauHat}, ${motHat.doMo * chop})`;
        context.shadowColor = `rgba(${mauHat}, ${motHat.doMo * 0.65})`;
        context.shadowBlur = cheDo === 'dark' ? 9 : 4;
        context.arc(motHat.x, motHat.y, motHat.banKinh, 0, Math.PI * 2);
        context.fill();
      });
      context.shadowBlur = 0;
      daVe = true;
    };

    const khiBam = (event) => {
      if (!dangTrongMan || giam) return;
      const bounds = root.getBoundingClientRect();
      if (event.clientY < bounds.top || event.clientY > bounds.bottom) return;
      const x = event.clientX - bounds.left;
      const y = event.clientY - bounds.top;
      for (let i = 0; i < 7; i += 1) {
        const motHat = taoHat(rong, cao);
        motHat.x = x;
        motHat.y = y;
        motHat.vx = (Math.random() - 0.5) * 72;
        motHat.vy = -20 - Math.random() * 58;
        motHat.banKinh = 1.4 + Math.random() * 2.2;
        motHat.doMo = 0.8;
        hat.push(motHat);
      }
      if (hat.length > 52) hat.splice(SO_HAT, hat.length - 52);
    };

    const theoDoi = new IntersectionObserver(([entry]) => {
      dangTrongMan = entry.isIntersecting;
      cacVongLap.forEach((animation) => animation.paused(!dangTrongMan));
    });
    theoDoi.observe(root);
    const hen = window.setTimeout(() => gsap.ticker.add(tick), 0);
    window.addEventListener('resize', doiKichThuoc, { passive: true });
    window.addEventListener('pointerdown', khiBam, { passive: true });

    return () => {
      huyChoRem();
      window.clearTimeout(hen);
      gsap.ticker.remove(tick);
      cacVongLap.forEach((animation) => animation.kill());
      boTheoDoiCuon?.kill();
      theoDoi.disconnect();
      window.removeEventListener('resize', doiKichThuoc);
      window.removeEventListener('pointermove', khiDiChuyen);
      window.removeEventListener('pointerdown', khiBam);
      if (context && daVe) context.clearRect(0, 0, rong, cao);
    };
  }, { scope: rootRef, dependencies: [cheDo, giamChuyenDong, heroRef] });

  const ngay = cheDo !== 'dark';

  return (
    <div ref={rootRef} className={`home-atmosphere ${ngay ? 'is-day' : 'is-night'} ${giamChuyenDong ? 'motion-quiet' : ''}`} aria-hidden="true">
      <div className="home-sky home-cloud--xa" />
      <div className="home-light-field" />
      <HinhTrangTri ten={ngay ? 'ngay/nang.svg' : 'dem/trang.svg'} lop="home-art home-sun-moon" />
      <HinhTrangTri ten={ngay ? 'ngay/may_1.svg' : 'dem/may_1.svg'} lop="home-art home-cloud home-cloud--mot" />
      <HinhTrangTri ten={ngay ? 'ngay/may_2.svg' : 'dem/may_2.svg'} lop="home-art home-cloud home-cloud--hai" />
      <HinhTrangTri ten={ngay ? 'ngay/may_3.svg' : 'dem/may_3.svg'} lop="home-art home-cloud home-cloud--ba" />
      <HinhTrangTri ten={ngay ? 'ngay/canh_hoa.svg' : 'dem/canh_hoa.svg'} lop="home-art home-branch" />
      {!ngay && <>
        <HinhTrangTri ten="dem/sao_cham.svg" lop="home-art home-stars home-stars--one" />
        <HinhTrangTri ten="dem/sao_lap_lanh.svg" lop="home-art home-stars home-stars--two" />
        <HinhTrangTri ten="dem/sao_nam_canh.svg" lop="home-art home-stars home-stars--three" />
        <HinhTrangTri ten="dem/den_long.svg" lop="home-art home-lantern home-lantern--mot" />
        <HinhTrangTri ten="dem/den_long.svg" lop="home-art home-lantern home-lantern--hai" />
      </>}
      <div className="home-pointer-glow" />
      <canvas ref={canvasRef} className="home-pollen" />
      <HinhTrangTri ten={ngay ? 'ngay/co_hoa_chan_hero.svg' : 'dem/co_hoa_chan_hero.svg'} lop="home-art home-grass" />
      <div className="home-paper-edge" />
    </div>
  );
}
