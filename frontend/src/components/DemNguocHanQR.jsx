import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

function tinhThoiGianConLai(ngayHetHan) {
  if (!ngayHetHan) return null;
  const hetHanMs = new Date(ngayHetHan).getTime();
  const conLaiMs = hetHanMs - Date.now();
  if (conLaiMs <= 0) return 0;
  return Math.floor(conLaiMs / 1000);
}

export const DemNguocHanQR = ({ ngayHetHan }) => {
  const [giayConLai, setGiayConLai] = useState(() => tinhThoiGianConLai(ngayHetHan));

  useEffect(() => {
    const dem = () => {
      const conLai = tinhThoiGianConLai(ngayHetHan);
      setGiayConLai(conLai);
    };

    const timer = setInterval(dem, 1000);
    return () => clearInterval(timer);
  }, [ngayHetHan]);

  if (giayConLai === null) return null;

  if (giayConLai <= 0) {
    return (
      <span style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '3px',
        color: '#DC2626',
        fontSize: '0.78rem',
        fontWeight: 600
      }}>
        <Clock size={12} /> Hết hạn thanh toán
      </span>
    );
  }

  const phut = Math.floor(giayConLai / 60);
  const giay = giayConLai % 60;
  const chuoiHienThi = phut > 0 
    ? `còn ${phut} phút ${giay > 0 ? `${giay}s` : ''}` 
    : `còn ${giay}s`;

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '3px',
      color: '#D97706',
      fontSize: '0.78rem',
      fontWeight: 600
    }}>
      <Clock size={12} /> {chuoiHienThi} để thanh toán
    </span>
  );
};

export default DemNguocHanQR;
