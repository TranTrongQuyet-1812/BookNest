import { useEffect } from 'react';
import { useMoHinhCoXuong } from '../hooks/useMoHinhCoXuong';

export const DUONG_DAN_DOI = '/models/doi.glb';

/**
 * Con dơi (Darkmode). Mô hình quay mặt về +Z (về phía camera), gốc tọa độ ở chân.
 * trangThai:
 *  - 'bay': vỗ cánh sải rộng.
 *  - 'dau': TREO NGƯỢC — chân bám tại gốc tọa độ, thân thõng xuống dưới (y âm), nên đặt `position` vào MẶT DƯỚI
 *           chỗ muốn treo (cạnh dưới card, mép trên khung...), đừng đặt lên mặt trên như chim.
 * Các prop còn lại (position, rotation...) đi thẳng vào <group>.
 */
export default function Doi({ trangThai = 'bay', pha = 0, tiLe = 1, ref, ...conLai }) {
  const { model, chuyenClip } = useMoHinhCoXuong(DUONG_DAN_DOI, trangThai, pha);

  useEffect(() => {
    chuyenClip(trangThai);
  }, [trangThai, chuyenClip]);

  return (
    <group ref={ref} scale={tiLe} {...conLai}>
      <primitive object={model} />
    </group>
  );
}
