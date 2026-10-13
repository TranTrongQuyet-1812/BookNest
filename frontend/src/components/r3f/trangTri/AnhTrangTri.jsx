import { useCheDoGiaoDien } from '../hooks/useCheDoGiaoDien';

/**
 * Một ảnh SVG trang trí, tự chọn bản NGÀY hoặc ĐÊM theo giao diện.
 * Các file SVG nằm ở public/hinh-trang-tri/ngay/ và public/hinh-trang-tri/dem/ (xem HUONG_DAN.md), CÙNG TÊN ở hai thư mục
 * (mây, cỏ, đèn lồng có cả hai bản; nắng chỉ có ngày; trăng, sao chỉ có đêm).
 * - ten: tên file không đuôi, ví dụ 'may_1', 'co_hoa_chan_hero', 'trang'.
 * - chiHienKhi: 'ngay' | 'dem' | undefined. Đặt 'dem' cho trăng/sao để ban ngày không tải file.
 * Dùng <img> nên không thể đổi màu bằng CSS, vì vậy mới có hai bản màu riêng; muốn GSAP điều khiển từng phần (tia nắng,
 * ngọn cỏ) thì chèn SVG trực tiếp vào JSX thay vì dùng thành phần này.
 */
export default function AnhTrangTri({ ten, chiHienKhi, className, style, ...conLai }) {
  const cheDo = useCheDoGiaoDien();
  const thuMuc = cheDo === 'dark' ? 'dem' : 'ngay';

  if (chiHienKhi && chiHienKhi !== thuMuc) return null;

  return (
    <img
      src={`/hinh-trang-tri/${thuMuc}/${ten}.svg`}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={className}
      style={{ pointerEvents: 'none', userSelect: 'none', ...style }}
      {...conLai}
    />
  );
}
