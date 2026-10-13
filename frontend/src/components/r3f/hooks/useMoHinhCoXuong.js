import { useCallback, useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader } from '@react-three/fiber';
import { AnimationMixer } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as nhanBanCoXuong } from 'three/addons/utils/SkeletonUtils.js';

/**
 * Nạp một mô hình .glb có xương và clip (bay / dau), nhân bản riêng cho từng con, và cho phép đổi clip mượt.
 * - useLoader tự cache theo đường dẫn, nên 14 con cùng loài chỉ tải file một lần (cần bọc <Suspense>).
 * - Mỗi con có bộ vật liệu RIÊNG (clone) để đổi độ sáng/màu một con mà không ảnh hưởng con khác.
 * - `pha` (0..1) lệch thời điểm bắt đầu clip, để cả đàn không vỗ cánh đồng loạt.
 * Trả về { model, vatLieu, chuyenClip }.
 */
export function useMoHinhCoXuong(duongDan, clipDau = 'bay', pha = 0) {
  const gltf = useLoader(GLTFLoader, duongDan);

  const { model, vatLieu } = useMemo(() => {
    const ban = nhanBanCoXuong(gltf.scene);
    const bang = new Map();
    ban.traverse((con) => {
      if (!con.isMesh) return;
      const doi = (vl) => {
        if (!bang.has(vl)) bang.set(vl, vl.clone());
        return bang.get(vl);
      };
      con.material = Array.isArray(con.material) ? con.material.map(doi) : doi(con.material);
    });
    return { model: ban, vatLieu: [...bang.values()] };
  }, [gltf]);

  const { mixer, hanhDong } = useMemo(() => {
    const boPhat = new AnimationMixer(model);
    const cacHanhDong = {};
    gltf.animations.forEach((clip) => { cacHanhDong[clip.name] = boPhat.clipAction(clip); });
    return { mixer: boPhat, hanhDong: cacHanhDong };
  }, [gltf, model]);

  const hienTai = useRef(null);

  // Chuyển clip bằng cách làm mờ chéo (crossfade), tránh giật khi đổi từ bay sang đậu
  const chuyenClip = useCallback((ten, giay = 0.35) => {
    const moi = hanhDong[ten];
    if (!moi || hienTai.current === moi) return;
    moi.reset().play();
    if (hienTai.current) hienTai.current.crossFadeTo(moi, giay, false);
    hienTai.current = moi;
  }, [hanhDong]);

  useEffect(() => {
    chuyenClip(clipDau, 0);
    const clip = hienTai.current?.getClip();
    if (clip) hienTai.current.time = pha * clip.duration;
    return () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      hienTai.current = null;
    };
    // Chỉ chạy lúc dựng và lúc dọn: đổi clip về sau đi qua chuyenClip
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mixer, model]);

  // Trả GPU: dọn vật liệu riêng khi con này biến mất
  useEffect(() => () => vatLieu.forEach((vl) => vl.dispose()), [vatLieu]);

  useFrame((_, dt) => mixer.update(Math.min(dt, 0.05)));

  return { model, vatLieu, chuyenClip };
}
