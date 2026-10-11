import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Thanh phân trang dùng chung cho mọi danh sách.
 * Nhận đối tượng phanTrang do backend trả về: { trangHienTai, tongSoTrang, tongSoBanGhi }.
 * Chỉ hiện khi có từ 2 trang trở lên.
 */
export const PhanTrang = ({ phanTrang, onChuyenTrang, donVi = 'mục' }) => {
  if (!phanTrang || phanTrang.tongSoTrang <= 1) return null;

  const { trangHienTai, tongSoTrang, tongSoBanGhi } = phanTrang;

  const chuyenTrang = (trangMoi) => {
    onChuyenTrang(trangMoi);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="flex justify-center items-center gap-2 mt-8">
      <button
        disabled={trangHienTai <= 1}
        onClick={() => chuyenTrang(trangHienTai - 1)}
        className="btn btn-outline btn-sm"
      >
        <ChevronLeft size={16} /> Trước
      </button>
      <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)', margin: '0 8px' }}>
        Trang {trangHienTai} / {tongSoTrang} (Tổng {tongSoBanGhi} {donVi})
      </span>
      <button
        disabled={trangHienTai >= tongSoTrang}
        onClick={() => chuyenTrang(trangHienTai + 1)}
        className="btn btn-outline btn-sm"
      >
        Sau <ChevronRight size={16} />
      </button>
    </div>
  );
};

export default PhanTrang;
