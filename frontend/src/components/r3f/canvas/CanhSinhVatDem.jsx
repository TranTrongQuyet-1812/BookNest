import { Suspense, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import gsap from 'gsap';
import { useCheDoGiaoDien } from '../hooks/useCheDoGiaoDien';
import { useGiamChuyenDong } from '../../../utils/chuyenDong';

/**
 * Chạy vòng vẽ của R3F theo gsap.ticker (cùng nhịp với Lenis và ScrollTrigger) thay vì requestAnimationFrame riêng.
 * Chỉ dùng khi <Canvas frameloop="never">. R3F nhận timestamp tính bằng GIÂY, còn gsap.ticker đưa thời gian từ lúc
 * tải trang nên trừ đi mốc đầu để đồng hồ R3F bắt đầu từ 0.
 */
function NhipGsap() {
  const advance = useThree((s) => s.advance);
  useEffect(() => {
    let moc = null;
    const buoc = (giay) => {
      if (document.hidden) return;
      if (moc === null) moc = giay;
      advance(giay - moc);
    };
    gsap.ticker.add(buoc);
    return () => gsap.ticker.remove(buoc);
  }, [advance]);
  return null;
}

function AnhSang() {
  // Ba tầng giống đàn sinh vật hiện có để con vật rõ trên nền tối
  return (
    <>
      <hemisphereLight args={['#FFF8EC', '#6E5D67', 2.2]} />
      <directionalLight color="#FFEACC" intensity={2.4} position={[3, 4, 8]} />
      <directionalLight color="#FFFFFF" intensity={1.2} position={[0, 0, 10]} />
    </>
  );
}

/**
 * Lớp canvas R3F phủ kín màn hình, trong suốt, KHÔNG chặn chuột (pointer-events: none) nhưng vẫn biết vị trí chuột
 * nhờ eventSource = body. Chỉ hiện ở Darkmode (ban ngày trả về null, không tốn GPU).
 * Cách dùng: <CanhSinhVatDem><DanDomDom /><Doi position={[1, 1, 0]} /></CanhSinhVatDem>
 * - theoNhipGsap: true thì vẽ theo gsap.ticker (khuyên dùng khi đã có Lenis + ScrollTrigger).
 * - tamDung: true thì dừng vẽ (ví dụ khi tab ẩn hoặc người dùng bật "giảm chuyển động").
 */
export default function CanhSinhVatDem({ children, theoNhipGsap = true, tamDung = false, hienThi = true, zIndex = 5 }) {
  const cheDo = useCheDoGiaoDien();
  const [giamChuyenDong] = useGiamChuyenDong();
  const dungCanh = tamDung || !hienThi || giamChuyenDong;
  if (cheDo !== 'dark') return null;

  return (
    <Canvas
      aria-hidden="true"
      camera={{ position: [0, 0, 10], fov: 35, near: 0.1, far: 100 }}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
      frameloop={dungCanh || theoNhipGsap ? 'never' : 'always'}
      eventSource={document.body}
      eventPrefix="client"
      style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex, display: hienThi ? 'block' : 'none' }}
    >
      <AnhSang />
      <Suspense fallback={null}>{children}</Suspense>
      {theoNhipGsap && !dungCanh && <NhipGsap />}
    </Canvas>
  );
}
