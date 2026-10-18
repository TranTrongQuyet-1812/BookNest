import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, Minus, Trash2, ShoppingBag, ReceiptText, Printer, RotateCw, UserRound, ArrowLeft } from 'lucide-react';
import api from '@booknest/shared/api';
import { ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';

const dinhDangTien = (gia) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(Number(gia || 0));

export default function BanHangQuay() {
  const [tuKhoa, setTuKhoa] = useState('');
  const [sachTimDuoc, setSachTimDuoc] = useState([]);
  const [gioHang, setGioHang] = useState([]);
  const [dangTim, setDangTim] = useState(false);
  const [dangBan, setDangBan] = useState(false);
  const [tab, setTab] = useState('ban');
  const [khach, setKhach] = useState({ ten: '', dienThoai: '', ma: '' });
  const [loi, setLoi] = useState('');
  const [donVuaBan, setDonVuaBan] = useState(null);
  const [lichSu, setLichSu] = useState([]);
  const [dangTaiLichSu, setDangTaiLichSu] = useState(false);

  useEffect(() => {
    const timer = setTimeout(async () => {
      setDangTim(true);
      try {
        const res = await api.get('/admin/books', { params: { search: tuKhoa, page: 1, limit: 12, sort: 'newest' } });
        setSachTimDuoc(res.data.data.danhSach.filter(sach => !sach.DaAn));
      } catch {
        setSachTimDuoc([]);
      } finally { setDangTim(false); }
    }, 250);
    return () => clearTimeout(timer);
  }, [tuKhoa]);

  useEffect(() => {
    if (tab !== 'lich-su') return;
    setDangTaiLichSu(true);
    api.get('/admin/counter-orders', { params: { page: 1, limit: 30 } })
      .then(res => setLichSu(res.data.data.danhSach))
      .catch(err => setLoi(loiTuApi(err, 'Không tải được lịch sử bán hàng')))
      .finally(() => setDangTaiLichSu(false));
  }, [tab, donVuaBan]);

  const layDonGiaBan = (mon) => {
    const phanTram = Number(mon.PhanTramGiam || 0);
    if (phanTram > 0 && mon.GiaSauGiam !== undefined && mon.GiaSauGiam !== null) {
      return Number(mon.GiaSauGiam);
    }
    return Number(mon.GiaBan || 0);
  };

  const tongTien = useMemo(() => gioHang.reduce((tong, mon) => tong + layDonGiaBan(mon) * mon.soLuong, 0), [gioHang]);

  const themSach = (sach) => {
    setLoi('');
    setGioHang(danhSach => {
      const coSan = danhSach.find(mon => mon.MaSach === sach.MaSach);
      if (coSan) return danhSach.map(mon => mon.MaSach === sach.MaSach && mon.soLuong < sach.SoLuongTon ? { ...mon, soLuong: mon.soLuong + 1 } : mon);
      return sach.SoLuongTon > 0 ? [...danhSach, { ...sach, soLuong: 1 }] : danhSach;
    });
  };

  const doiSoLuong = (maSach, soLuongMoi) => {
    setGioHang(danhSach => danhSach.map(mon => mon.MaSach === maSach ? { ...mon, soLuong: Math.min(mon.SoLuongTon, Math.max(1, soLuongMoi || 1)) } : mon));
  };

  const hoanTatBan = async () => {
    if (!gioHang.length) return setLoi('Hãy thêm sách vào hóa đơn trước khi hoàn tất.');
    setDangBan(true);
    setLoi('');
    try {
      const payload = {
        cacMon: gioHang.map(mon => ({ maSach: mon.MaSach, soLuong: mon.soLuong })),
        tenKhach: khach.ten.trim() || undefined,
        soDienThoaiKhach: khach.dienThoai.trim() || undefined,
        maKhachHang: khach.ma ? Number(khach.ma) : undefined
      };
      const res = await api.post('/admin/counter-orders', payload);
      setDonVuaBan(res.data.data);
      setGioHang([]);
      setKhach({ ten: '', dienThoai: '', ma: '' });
    } catch (err) {
      setLoi(loiTuApi(err, 'Chưa thể hoàn tất bán hàng. Vui lòng thử lại.'));
    } finally { setDangBan(false); }
  };

  const moChiTiet = async (maDonHang) => {
    try {
      const res = await api.get(`/admin/counter-orders/${maDonHang}`);
      setDonVuaBan(res.data.data);
    } catch (err) { setLoi(loiTuApi(err, 'Không tải được hóa đơn.')); }
  };

  return (
    <div className="bo-page counter-page">
      <div className="bo-page-heading">
        <div><span className="bo-eyebrow">ĐIỂM BÁN BOOKNEST</span><h1>Bán hàng tại quầy</h1><p>Tìm sách, lên hóa đơn và cập nhật tồn kho trong một giao dịch.</p></div>
        <div className="bo-tabs" role="tablist">
          <button className={tab === 'ban' ? 'active' : ''} onClick={() => setTab('ban')}><ShoppingBag size={16}/> Bán hàng</button>
          <button className={tab === 'lich-su' ? 'active' : ''} onClick={() => setTab('lich-su')}><ReceiptText size={16}/> Lịch sử bán</button>
        </div>
      </div>

      {loi && <ThongBaoTaiCho loai="loi" onDong={() => setLoi('')}>{loi}</ThongBaoTaiCho>}
      {tab === 'ban' && (
        <div className="counter-grid">
          <section className="bo-panel counter-catalog">
            <div className="bo-panel-title"><div><h2>Chọn sách</h2><p>Tìm theo tên sách hoặc tác giả</p></div><span className="bo-soft-badge">{sachTimDuoc.length} kết quả</span></div>
            <label className="bo-search"><Search size={18}/><input value={tuKhoa} onChange={e => setTuKhoa(e.target.value)} placeholder="Ví dụ: Dế mèn phiêu lưu ký"/><kbd>⌕</kbd></label>
            <div className="counter-results">
              {dangTim ? <div className="bo-empty">Đang tìm sách…</div> : sachTimDuoc.length === 0 ? <div className="bo-empty">Không tìm thấy sách còn bán.</div> : sachTimDuoc.map(sach => {
                const coGiam = Number(sach.PhanTramGiam || 0) > 0;
                const donGia = layDonGiaBan(sach);
                return (
                  <article className="counter-book" key={sach.MaSach}>
                    <img src={sach.AnhBia || '/placeholder-book.png'} alt="" loading="lazy"/>
                    <div className="counter-book-info">
                      <strong>{sach.TenSach}</strong>
                      <span>{sach.TacGia}</span>
                      <div className="counter-book-price">
                        <b>{dinhDangTien(donGia)}</b>
                        {coGiam && (
                          <>
                            <span className="counter-book-old">{dinhDangTien(sach.GiaBan)}</span>
                            <span className="counter-book-badge">-{sach.PhanTramGiam}%</span>
                          </>
                        )}
                      </div>
                      <small>Còn {sach.SoLuongTon}</small>
                    </div>
                    <button className="bo-icon-button" onClick={() => themSach(sach)} disabled={!sach.SoLuongTon} aria-label={`Thêm ${sach.TenSach}`}><Plus size={18}/></button>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="bo-panel counter-checkout">
            <div className="bo-panel-title"><div><h2>Hóa đơn mới</h2><p>{gioHang.length} đầu sách · {gioHang.reduce((sum, mon) => sum + mon.soLuong, 0)} cuốn</p></div><span className="counter-order-mark">BN · QUẦY</span></div>
            <div className="counter-lines">
              {!gioHang.length ? <div className="bo-empty counter-empty"><ShoppingBag size={28}/><span>Chọn sách để bắt đầu hóa đơn</span></div> : gioHang.map(mon => {
                const coGiam = Number(mon.PhanTramGiam || 0) > 0;
                const donGia = layDonGiaBan(mon);
                return (
                  <div className="counter-line" key={mon.MaSach}>
                    <div className="counter-line-main">
                      <strong>{mon.TenSach}</strong>
                      <small>
                        {dinhDangTien(donGia)} / cuốn
                        {coGiam && (
                          <>
                            <span className="counter-line-old">{dinhDangTien(mon.GiaBan)}</span>
                            <span className="counter-line-badge">-{mon.PhanTramGiam}%</span>
                          </>
                        )}
                      </small>
                    </div>
                    <div className="counter-quantity"><button onClick={() => doiSoLuong(mon.MaSach, mon.soLuong - 1)} aria-label="Giảm"><Minus size={13}/></button><input aria-label="Số lượng" type="number" min="1" max={mon.SoLuongTon} value={mon.soLuong} onChange={e => doiSoLuong(mon.MaSach, Number(e.target.value))}/><button disabled={mon.soLuong >= mon.SoLuongTon} onClick={() => doiSoLuong(mon.MaSach, mon.soLuong + 1)} aria-label="Tăng"><Plus size={13}/></button></div>
                    <strong className="counter-line-total">{dinhDangTien(donGia * mon.soLuong)}</strong>
                    <button className="bo-quiet-button" onClick={() => setGioHang(list => list.filter(s => s.MaSach !== mon.MaSach))} aria-label="Xóa khỏi hóa đơn"><Trash2 size={15}/></button>
                  </div>
                );
              })}
            </div>
            <div className="counter-customer-title"><UserRound size={16}/><span>Thông tin khách (không bắt buộc)</span></div>
            <div className="counter-customer-fields">
              <input value={khach.ten} onChange={e => setKhach({ ...khach, ten: e.target.value })} placeholder="Tên khách"/>
              <input value={khach.dienThoai} onChange={e => setKhach({ ...khach, dienThoai: e.target.value })} placeholder="Số điện thoại" inputMode="tel"/>
              <input value={khach.ma} onChange={e => setKhach({ ...khach, ma: e.target.value.replace(/\D/g, '') })} placeholder="Mã hồ sơ khách (nếu có)" inputMode="numeric"/>
            </div>
            <div className="counter-total"><span>Tổng thanh toán</span><strong>{dinhDangTien(tongTien)}</strong></div>
            <button className="bo-primary-button counter-submit" disabled={!gioHang.length || dangBan} onClick={hoanTatBan}>
              {dangBan ? <><RotateCw className="bo-spin" size={17}/> Đang xử lý…</> : <>Hoàn tất bán <span>·</span> {dinhDangTien(tongTien)}</>}
            </button>
            <small className="counter-footnote">Xác nhận sẽ trừ kho và lưu hóa đơn ngay.</small>
          </section>
        </div>
      )}

      {tab === 'lich-su' && (
        <section className="bo-panel counter-history">
          <div className="bo-panel-title"><div><h2>Đơn bán tại quầy</h2><p>Hiển thị hóa đơn do tài khoản hiện tại lập.</p></div><button className="bo-secondary-button" onClick={() => setTab('ban')}><ArrowLeft size={15}/> Quay lại bán hàng</button></div>
          {dangTaiLichSu ? <div className="bo-empty">Đang tải lịch sử…</div> : (
            <div className="bo-table-wrap"><table className="bo-table"><thead><tr><th>Mã đơn</th><th>Thời gian</th><th>Khách</th><th>Số đầu sách</th><th>Tổng tiền</th><th></th></tr></thead><tbody>
              {lichSu.map(don => <tr key={don.MaDonHang}><td><strong>#{don.MaDonHang}</strong><span className="bo-status">Đã hoàn tất</span></td><td>{new Date(don.NgayDat).toLocaleString('vi-VN')}</td><td>{don.TenNguoiNhan || don.khachHang?.HoTen || 'Khách lẻ'}</td><td>{don.chiTietDonHang?.length || 0}</td><td><strong>{dinhDangTien(don.TongTien)}</strong></td><td><button className="bo-secondary-button" onClick={() => moChiTiet(don.MaDonHang)}>Xem hóa đơn</button></td></tr>)}
              {!lichSu.length && <tr><td colSpan="6" className="bo-empty">Chưa có hóa đơn nào.</td></tr>}
            </tbody></table></div>
          )}
        </section>
      )}

      {donVuaBan && <div className="bo-modal-backdrop" role="presentation" onClick={() => setDonVuaBan(null)}>
        <section className="bo-receipt" role="dialog" aria-modal="true" aria-label="Hóa đơn bán tại quầy" onClick={e => e.stopPropagation()}>
          <div className="receipt-actions no-print"><button className="bo-quiet-button" onClick={() => setDonVuaBan(null)}>Đóng</button><button className="bo-primary-button" onClick={() => window.print()}><Printer size={16}/> In hóa đơn</button></div>
          <div className="receipt-brand"><span className="receipt-logo">B</span><div><strong>BookNest</strong><small>TỪNG TRANG SÁCH, MỘT THẾ GIỚI</small></div></div>
          <div className="receipt-heading"><span>HÓA ĐƠN BÁN LẺ</span><strong>#{donVuaBan.MaDonHang}</strong><small>{new Date(donVuaBan.NgayDat).toLocaleString('vi-VN')}</small></div>
          <div className="receipt-customer">Khách hàng: <strong>{donVuaBan.TenNguoiNhan || donVuaBan.khachHang?.HoTen || 'Khách lẻ'}</strong></div>
          <div className="receipt-items">{donVuaBan.chiTietDonHang?.map(ct => <div key={ct.MaSach}><span>{ct.sach?.TenSach} × {ct.SoLuong}</span><strong>{dinhDangTien(ct.DonGia * ct.SoLuong)}</strong></div>)}</div>
          <div className="receipt-grand-total"><span>Tổng thanh toán</span><strong>{dinhDangTien(donVuaBan.TongTien)}</strong></div>
          <p className="receipt-thanks">Cảm ơn bạn đã ghé BookNest.</p>
        </section>
      </div>}
    </div>
  );
}
