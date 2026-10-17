import React from 'react';

/**
 * NhanGiamGia - Nhãn giảm giá nổi bật góc ảnh bìa hoặc cạnh giá (GG08)
 * 
 * @param {object} props
 * @param {number|null|undefined} props.phanTram - Mức giảm giá (1 - 60)
 * @param {'goc-anh'|'inline'} [props.viTri='goc-anh'] - Vị trí hiển thị
 * @param {'nho'|'vua'|'lon'} [props.kichThuoc='vua'] - Kích thước nhãn
 * @param {string} [props.className=''] - Class bổ sung
 */
export const NhanGiamGia = ({
  phanTram,
  viTri = 'goc-anh',
  kichThuoc = 'vua',
  className = '',
  style = {}
}) => {
  const pt = parseInt(phanTram, 10);
  if (isNaN(pt) || pt <= 0) return null;

  const fontSizes = {
    nho: '0.68rem',
    vua: '0.78rem',
    lon: '0.92rem'
  };

  const paddings = {
    nho: '2px 6px',
    vua: '3px 8px',
    lon: '4px 12px'
  };

  const viTriStyles = viTri === 'goc-anh' ? {
    position: 'absolute',
    top: '8px',
    left: '8px',
    zIndex: 3
  } : {
    display: 'inline-flex',
    verticalAlign: 'middle'
  };

  return (
    <span
      className={`nhan-giam-gia ${className}`}
      style={{
        ...viTriStyles,
        background: 'linear-gradient(135deg, #EF4444 0%, #EA580C 100%)',
        color: '#FFFFFF',
        fontWeight: 700,
        fontSize: fontSizes[kichThuoc] || fontSizes.vua,
        padding: paddings[kichThuoc] || paddings.vua,
        borderRadius: '6px',
        lineHeight: 1.2,
        letterSpacing: '0.02em',
        boxShadow: '0 2px 6px rgba(239, 68, 68, 0.45)',
        textTransform: 'uppercase',
        pointerEvents: 'none',
        userSelect: 'none',
        ...style
      }}
      aria-label={`Giảm giá ${pt} phần trăm`}
    >
      -{pt}%
    </span>
  );
};

export default NhanGiamGia;
