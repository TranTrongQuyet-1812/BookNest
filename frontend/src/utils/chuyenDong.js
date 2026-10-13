import { useEffect, useState } from 'react';

const KHOA_GIAM_CHUYEN_DONG = 'booknest-giam-chuyen-dong';
const SU_KIEN_GIAM_CHUYEN_DONG = 'booknest-motion-change';

export const docGiamChuyenDong = () => (
  typeof localStorage !== 'undefined' && localStorage.getItem(KHOA_GIAM_CHUYEN_DONG) === 'true'
);

export function datGiamChuyenDong(giam) {
  localStorage.setItem(KHOA_GIAM_CHUYEN_DONG, String(giam));
  document.documentElement.toggleAttribute('data-giam-chuyen-dong', giam);
  window.dispatchEvent(new CustomEvent(SU_KIEN_GIAM_CHUYEN_DONG, { detail: { giam } }));
}

export function useGiamChuyenDong() {
  const [giam, setGiam] = useState(docGiamChuyenDong);

  useEffect(() => {
    const capNhat = (event) => setGiam(event.detail.giam);
    document.documentElement.toggleAttribute('data-giam-chuyen-dong', giam);
    window.addEventListener(SU_KIEN_GIAM_CHUYEN_DONG, capNhat);
    return () => window.removeEventListener(SU_KIEN_GIAM_CHUYEN_DONG, capNhat);
  }, [giam]);

  return [giam, datGiamChuyenDong];
}
