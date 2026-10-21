import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// Hằng số và hook dùng chung cho nhóm trang pháp lý (tách khỏi phapLy.jsx để tệp đó chỉ xuất component)
export const TRANG_PHAP_LY = [
  { duongDan: '/dieu-khoan', nhan: 'Điều Khoản' },
  { duongDan: '/chinh-sach-bao-mat', nhan: 'Bảo Mật & Cookie' },
  { duongDan: '/chinh-sach-hoan-tien', nhan: 'Đổi Trả & Hoàn Tiền' },
  { duongDan: '/nguon-du-lieu', nhan: 'Nguồn Dữ Liệu' }
];

// Khi vào trang: cuộn tới mục có anchor (#cookie, #xoa-du-lieu...) hoặc lên đầu trang
export const useCuonToiMucNeo = () => {
  const location = useLocation();
  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.replace('#', ''));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location]);
};

export const EMAIL_HO_TRO = 'tiemsach@booknest.lhutech.click';
