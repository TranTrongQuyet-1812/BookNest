import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { AdditiveBlending, CanvasTexture } from 'three';
import { useMoHinhCoXuong } from '../hooks/useMoHinhCoXuong';

export const DUONG_DAN_DOM_DOM = '/models/dom_dom.glb';

const TEN_VAT_LIEU_SANG = 'Bung_PhatSang';
// Vị trí đuôi phát sáng trong hệ của mô hình (glTF: x, y lên, z về phía camera); xấp xỉ, lúc đậu đuôi vểnh nên lệch nhẹ
const VI_TRI_DUOI = [0, 0.09, -0.25];

// Quầng sáng dùng chung cho mọi con: một texture hình tròn mờ dần, tạo một lần
let textureQuang = null;
function layTextureQuang() {
  if (textureQuang) return textureQuang;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const dai = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  dai.addColorStop(0, 'rgba(255,255,255,1)');
  dai.addColorStop(0.25, 'rgba(255,255,255,0.45)');
  dai.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = dai;
  ctx.fillRect(0, 0, 128, 128);
  textureQuang = new CanvasTexture(canvas);
  return textureQuang;
}

/**
 * Đom đóm (Darkmode): đuôi phát sáng nhấp nháy theo nhịp riêng của từng con.
 * Độ sáng không nướng trong clip mà đổi bằng code: emissiveIntensity của vật liệu `Bung_PhatSang` (mỗi con một bản clone)
 * và độ mờ của quầng sáng (sprite cộng sáng) ở đuôi.
 * trangThai: 'bay' (lơ lửng) | 'dau' (đậu, mai khép).
 * nhipChop: tốc độ chớp (radian/giây); pha: lệch pha chớp và lệch clip (0..1); doSang: nhân độ sáng (0 = tắt).
 */
export default function DomDom({ trangThai = 'bay', pha = 0, tiLe = 1, nhipChop = 2.2, doSang = 1, ref, ...conLai }) {
  const { model, vatLieu, chuyenClip } = useMoHinhCoXuong(DUONG_DAN_DOM_DOM, trangThai, pha);
  const quang = useRef(null);

  const vatLieuSang = useMemo(() => vatLieu.find((vl) => vl.name === TEN_VAT_LIEU_SANG), [vatLieu]);
  const texture = useMemo(() => layTextureQuang(), []);

  useEffect(() => {
    chuyenClip(trangThai);
  }, [trangThai, chuyenClip]);

  useFrame(({ clock }) => {
    // Sóng sin bình phương: sáng bừng rồi dịu hẳn, không chớp đều như đèn nháy
    const nhip = 0.5 + 0.5 * Math.sin(clock.elapsedTime * nhipChop + pha * Math.PI * 2);
    const manh = nhip * nhip;
    // Three.js cần đổi cường độ vật liệu ngay trong vòng vẽ để ánh sáng chớp mượt theo từng con.
    // oxlint-disable-next-line react/immutability
    if (vatLieuSang) vatLieuSang.emissiveIntensity = (0.35 + 1.9 * manh) * doSang;
    if (quang.current) quang.current.material.opacity = Math.min(1, 0.25 + 0.55 * manh) * doSang;
  });

  return (
    <group ref={ref} scale={tiLe} {...conLai}>
      <primitive object={model} />
      <sprite ref={quang} position={VI_TRI_DUOI} scale={[0.7, 0.7, 0.7]}>
        <spriteMaterial map={texture} color="#C9FF3D" blending={AdditiveBlending} depthWrite={false} transparent />
      </sprite>
    </group>
  );
}
