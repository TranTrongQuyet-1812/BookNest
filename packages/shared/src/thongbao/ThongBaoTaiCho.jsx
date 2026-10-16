import React from 'react';
import {
  IconThanhCong,
  IconLoi,
  IconCanhBao,
  IconThongTin,
  IconDong,
} from './icons.jsx';

/**
 * Component Thông Báo Tại Chỗ (ThongBaoTaiCho)
 * Thay thế hoàn toàn các khung thông báo tự vẽ (.alert alert-danger, alert-success...)
 * Tuân thủ Impeccable Design:
 * - Tông màu hài hòa theo hệ màu chủ đạo của BookNest
 * - Tương phản cao, biểu tượng sắc nét, dễ tiếp cận
 */
export function ThongBaoTaiCho({
  loai = 'thongTin', // 'thanhCong' | 'loi' | 'canhBao' | 'thongTin'
  tieuDe = null,
  children,
  onDong = null,
  hanhDong = null,
  className = '',
}) {
  const iconMap = {
    thanhCong: <IconThanhCong size={20} className="bn-alert-icon" />,
    loi: <IconLoi size={20} className="bn-alert-icon" />,
    canhBao: <IconCanhBao size={20} className="bn-alert-icon" />,
    thongTin: <IconThongTin size={20} className="bn-alert-icon" />,
  };

  const iconHienThi = iconMap[loai] || iconMap.thongTin;
  const alertRole = loai === 'loi' ? 'alert' : 'status';

  return (
    <div
      className={`bn-alert bn-alert-${loai} ${className}`.trim()}
      role={alertRole}
    >
      <div className="bn-alert-icon-wrapper" aria-hidden="true">
        {iconHienThi}
      </div>

      <div className="bn-alert-body">
        {tieuDe && <div className="bn-alert-title">{tieuDe}</div>}
        <div className="bn-alert-content">{children}</div>
        {hanhDong && <div className="bn-alert-actions">{hanhDong}</div>}
      </div>

      {onDong && (
        <button
          type="button"
          className="bn-alert-close"
          onClick={onDong}
          aria-label="Đóng thông báo"
        >
          <IconDong size={16} />
        </button>
      )}
    </div>
  );
}

export default ThongBaoTaiCho;
