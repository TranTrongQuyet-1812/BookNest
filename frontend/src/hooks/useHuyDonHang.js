import { useState } from 'react';
import api from '../services/api';
import { useThongBao } from '@booknest/shared/thongbao';

/**
 * Hook gộp chung logic hủy đơn hàng phía khách hàng
 * Dùng chung giữa ChiTietDonHang và DonHangCuaToi
 */
export function useHuyDonHang() {
  const [dangHuy, setDangHuy] = useState(false);
  const { thongBao: tb, nhapLyDo } = useThongBao();

  const thucHienHuyDon = async (maDonHang, onSuccess) => {
    const lyDo = await nhapLyDo({
      tieuDe: `Hủy đơn hàng #${maDonHang}`,
      noiDung: 'Đơn hàng sẽ bị hủy và số lượng sách sẽ được hoàn trả lại vào kho.',
      nhan: 'Lý do hủy đơn',
      placeholder: 'Nhập lý do hủy đơn hàng (tùy chọn)...',
      batBuoc: false,
      nguyHiem: true,
      nhanXacNhan: 'Xác nhận hủy đơn',
    });

    if (lyDo === null) return false;

    setDangHuy(true);
    try {
      await api.put(`/orders/${maDonHang}/cancel`, {
        lyDo: lyDo || 'Khách hàng yêu cầu hủy đơn qua giao diện',
      });
      tb.thanhCong('Đã hủy đơn hàng thành công. Số lượng sách đã được hoàn trả lại vào kho.');
      if (typeof onSuccess === 'function') {
        await onSuccess();
      }
      return true;
    } catch (err) {
      tb.loiTuApi(err, 'Không thể hủy đơn hàng này');
      return false;
    } finally {
      setDangHuy(false);
    }
  };

  return { thucHienHuyDon, dangHuy };
}

export default useHuyDonHang;
