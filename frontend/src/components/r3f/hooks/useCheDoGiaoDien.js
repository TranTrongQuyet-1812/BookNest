import { useEffect, useState } from 'react';

const docCheDo = () => (document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light');

/**
 * Trả về 'light' hoặc 'dark', tự cập nhật khi AuthContext đổi thuộc tính data-theme trên <html>.
 * Dùng MutationObserver để không phải kéo context vào các thành phần trang trí.
 */
export function useCheDoGiaoDien() {
  const [cheDo, setCheDo] = useState(docCheDo);

  useEffect(() => {
    const quanSat = new MutationObserver(() => setCheDo(docCheDo()));
    quanSat.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => quanSat.disconnect();
  }, []);

  return cheDo;
}
