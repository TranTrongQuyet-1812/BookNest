import { useContext } from 'react';
import { ThongBaoContext } from './ThongBaoContext.jsx';

/**
 * Hook tiện ích sử dụng hệ thống thông báo, xác nhận và nhập lý do dùng chung
 * @returns {{
 *   thongBao: {
 *     thanhCong: (msg: string, opt?: object) => string,
 *     loi: (msg: string, opt?: object) => string,
 *     canhBao: (msg: string, opt?: object) => string,
 *     thongTin: (msg: string, opt?: object) => string,
 *     loiTuApi: (err: any, macDinh?: string, opt?: object) => string
 *   },
 *   xacNhan: (options?: {
 *     tieuDe?: string,
 *     noiDung?: string,
 *     nhanXacNhan?: string,
 *     nhanHuy?: string,
 *     nguyHiem?: boolean,
 *     kichThuoc?: 'sm' | 'md' | 'lg'
 *   }) => Promise<boolean>,
 *   nhapLyDo: (options?: {
 *     tieuDe?: string,
 *     noiDung?: string,
 *     giaTriMacDinh?: string,
 *     placeholder?: string,
 *     nhan?: string,
 *     batBuoc?: boolean,
 *     toiDa?: number,
 *     kieuInput?: 'textarea' | 'text',
 *     nhanXacNhan?: string,
 *     nhanHuy?: string,
 *     nguyHiem?: boolean
 *   }) => Promise<string | null>,
 *   loiTuApi: (err: any, macDinh?: string) => string
 * }}
 */
export function useThongBao() {
  const context = useContext(ThongBaoContext);
  if (!context) {
    throw new Error(
      'useThongBao phải được sử dụng bên trong <ThongBaoProvider>. Hãy bọc ThongBaoProvider ở cấp ứng dụng cao nhất.'
    );
  }
  return context;
}

export default useThongBao;
