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
    if (trangMoi < 1 || trangMoi > tongSoTrang || trangMoi === trangHienTai) return;
    onChuyenTrang(trangMoi);
  };

  // Tính danh sách các số trang cần hiển thị kèm dấu ba chấm (...)
  const layDanhSachTrang = () => {
    if (tongSoTrang <= 7) {
      return Array.from({ length: tongSoTrang }, (_, i) => i + 1);
    }
    const pages = [1];
    let start = Math.max(2, trangHienTai - 1);
    let end = Math.min(tongSoTrang - 1, trangHienTai + 1);

    if (trangHienTai <= 3) {
      end = 4;
    } else if (trangHienTai >= tongSoTrang - 2) {
      start = tongSoTrang - 3;
    }

    if (start > 2) pages.push('...');
    for (let i = start; i <= end; i++) pages.push(i);
    if (end < tongSoTrang - 1) pages.push('...');
    pages.push(tongSoTrang);

    return pages;
  };

  const danhSachTrang = layDanhSachTrang();

  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mt-8">
      <div className="flex items-center gap-1.5">
        {/* Nút lùi trang */}
        <button
          disabled={trangHienTai <= 1}
          onClick={() => chuyenTrang(trangHienTai - 1)}
          className="btn btn-outline btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.35rem 0.65rem',
            fontSize: '0.85rem',
            opacity: trangHienTai <= 1 ? 0.45 : 1,
            cursor: trangHienTai <= 1 ? 'not-allowed' : 'pointer'
          }}
          title="Trang trước"
        >
          <ChevronLeft size={16} /> <span>Trước</span>
        </button>

        {/* Các nút bấm số trang */}
        {danhSachTrang.map((p, idx) => {
          if (p === '...') {
            return (
              <span
                key={`ellipsis-${idx}`}
                style={{
                  padding: '0 0.35rem',
                  color: 'var(--text-muted)',
                  fontSize: '0.85rem',
                  userSelect: 'none'
                }}
              >
                …
              </span>
            );
          }

          const laTrangHienTai = p === trangHienTai;

          return (
            <button
              key={p}
              onClick={() => chuyenTrang(p)}
              className="tabular-nums"
              style={{
                minWidth: '32px',
                height: '32px',
                padding: '0 0.45rem',
                borderRadius: '6px',
                fontSize: '0.85rem',
                fontWeight: laTrangHienTai ? 700 : 500,
                backgroundColor: laTrangHienTai ? 'var(--primary)' : 'var(--bg-card)',
                color: laTrangHienTai ? 'var(--primary-text, #FFFFFF)' : 'var(--text-main)',
                border: laTrangHienTai ? '1px solid var(--primary)' : '1px solid var(--border)',
                boxShadow: laTrangHienTai ? '0 1px 3px rgba(0, 0, 0, 0.1)' : 'none',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              aria-current={laTrangHienTai ? 'page' : undefined}
            >
              {p}
            </button>
          );
        })}

        {/* Nút tiến trang */}
        <button
          disabled={trangHienTai >= tongSoTrang}
          onClick={() => chuyenTrang(trangHienTai + 1)}
          className="btn btn-outline btn-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.35rem 0.65rem',
            fontSize: '0.85rem',
            opacity: trangHienTai >= tongSoTrang ? 0.45 : 1,
            cursor: trangHienTai >= tongSoTrang ? 'not-allowed' : 'pointer'
          }}
          title="Trang tiếp theo"
        >
          <span>Sau</span> <ChevronRight size={16} />
        </button>
      </div>

      {/* Thông tin số lượng bản ghi */}
      <span className="tabular-nums" style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
        (Trang {trangHienTai}/{tongSoTrang} • {tongSoBanGhi} {donVi})
      </span>
    </div>
  );
};

export default PhanTrang;
