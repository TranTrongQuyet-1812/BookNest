import React from 'react';

// Khung xương chờ tải: dựng đúng hình dạng nội dung sắp hiện (bảng, hàng, ô chỉ số) để trang không nhảy khi dữ liệu về.
// Độ rộng các thanh lệch nhau như dữ liệu thật; trình đọc màn hình chỉ nghe một câu "Đang tải" thay vì đọc từng ô.
const DO_RONG = ['72%', '48%', '84%', '60%', '76%', '54%', '66%'];
const doRong = (hang, cot) => DO_RONG[(hang * 3 + cot) % DO_RONG.length];

export function ThongBaoDangTai({ nhan = 'Đang tải dữ liệu' }) {
  return <span className="admindash-sr-only" role="status">{nhan}…</span>;
}

// Các hàng xương nằm trong <tbody> có sẵn: dùng khi tiêu đề bảng vẫn hiện trong lúc tải
export function HangBangXuong({ soCot, soHang = 6, canPhai = [], kieuO }) {
  return Array.from({ length: soHang }, (_, hang) => (
    <tr key={hang} aria-hidden="true">
      {Array.from({ length: soCot }, (_, cot) => {
        const phai = canPhai.includes(cot);
        return (
          <td key={cot} style={{ ...kieuO, textAlign: phai ? 'right' : undefined }}>
            <div
              className="admindash-skeleton admindash-skeleton-line"
              style={{ width: doRong(hang, cot), marginLeft: phai ? 'auto' : undefined }}
            />
          </td>
        );
      })}
    </tr>
  ));
}

// Cả bảng xương, giữ tiêu đề cột thật, dùng khi trang chưa dựng bảng trong lúc tải
export function BangXuong({
  tieuDe,
  soHang = 6,
  canPhai = [],
  lopBang = 'admindash-table',
  lopBoc = 'admindash-table-wrap',
  nhan
}) {
  return (
    <div className={lopBoc} aria-busy="true">
      <ThongBaoDangTai nhan={nhan} />
      <table className={lopBang}>
        <thead>
          <tr>
            {tieuDe.map((t, i) => (
              <th key={i} style={canPhai.includes(i) ? { textAlign: 'right' } : undefined}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <HangBangXuong soCot={tieuDe.length} soHang={soHang} canPhai={canPhai} />
        </tbody>
      </table>
    </div>
  );
}

// Dải chỉ số xương (nhiều ô nhãn + số), cùng kích thước dải chỉ số thật
export function DaiChiSoXuong({ soO = 3, lopDai = '' }) {
  return (
    <section className="admindash-panel" style={{ marginBottom: '1rem' }} aria-busy="true">
      <ThongBaoDangTai nhan="Đang tải chỉ số" />
      <div className={`admindash-strip ${lopDai}`.trim()}>
        {Array.from({ length: soO }, (_, i) => (
          <div key={i} className="admindash-strip-item" aria-hidden="true">
            <div className="admindash-skeleton admindash-skeleton-line" style={{ width: '110px' }} />
            <div className="admindash-skeleton" style={{ width: '70px', height: '28px', marginTop: '4px' }} />
          </div>
        ))}
      </div>
    </section>
  );
}

// Khối xương tổng quát, dùng cho thẻ hoặc vùng chưa có hình dạng cố định
export function KhoiXuong({ cao = 96, nhan }) {
  return (
    <div aria-busy="true">
      <ThongBaoDangTai nhan={nhan} />
      <div className="admindash-skeleton" style={{ width: '100%', height: `${cao}px` }} aria-hidden="true" />
    </div>
  );
}

export default BangXuong;
