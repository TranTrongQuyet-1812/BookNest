import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HangBangXuong } from './KhungXuong.jsx';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useThongBao, ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';
import PhanTrang from '../../components/PhanTrang';
import NhanGiamGia from '../../components/NhanGiamGia';
import {
  Search,
  Play,
  Pause,
  Edit,
  Eye,
  X
} from 'lucide-react';

/**
 * Hàm thuần tính giá sau giảm cho phần xem trước Client
 */
function tinhGiaSauGiamClient(giaNiemYet, phanTram) {
  const giaGoc = Number(giaNiemYet) || 0;
  const pt = Number(phanTram) || 0;
  if (giaGoc <= 0 || pt <= 0) return giaGoc;
  const ptHopLe = Math.min(60, Math.max(0, pt));
  return Math.floor((giaGoc * (100 - ptHopLe)) / 100 / 100) * 100;
}

function dinhDangTien(soTien) {
  return new Intl.NumberFormat('vi-VN').format(soTien || 0) + 'đ';
}

function dinhDangNgayGio(chuoiNgay) {
  if (!chuoiNgay) return '—';
  const d = new Date(chuoiNgay);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function toDatetimeLocalString(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const QuanLyGiamGia = () => {
  const { user } = useAuth();
  const { thongBao: tb, xacNhan } = useThongBao();
  const laQuanTri = user?.role === 'quan_tri';

  const [searchParams, setSearchParams] = useSearchParams();
  const trang = parseInt(searchParams.get('page') || '1', 10);
  const tuKhoaDaLoc = searchParams.get('search') || '';
  const trangThaiDaLoc = searchParams.get('status') || '';

  const [timKiem, setTimKiem] = useState(tuKhoaDaLoc);
  const [danhSach, setDanhSach] = useState([]);
  const [phanTrang, setPhanTrang] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [loiTai, setLoiTai] = useState('');

  // Modal State
  const [hienModal, setHienModal] = useState(false);
  const [modalCheDo, setModalCheDo] = useState('tao'); // 'tao' | 'sua' | 'xem'
  const [chuongTrinhDangChon, setChuongTrinhDangChon] = useState(null);
  const [dangLuu, setDangLuu] = useState(false);
  const [loiModal, setLoiModal] = useState('');

  // Form State
  const [tenChuongTrinh, setTenChuongTrinh] = useState('');
  const [phanTramGiam, setPhanTramGiam] = useState(20);
  const [ngayBatDau, setNgayBatDau] = useState('');
  const [ngayKetThuc, setNgayKetThuc] = useState('');
  const [kieuApDung, setKieuApDung] = useState('sach'); // 'sach' | 'danh_muc'

  // Danh mục thể loại và Sách đã chọn
  const [danhMucList, setDanhMucList] = useState([]);
  const [danhSachMaDanhMuc, setDanhSachMaDanhMuc] = useState([]);
  const [danhSachSachChon, setDanhSachSachChon] = useState([]);

  // Tìm kiếm sách để thêm vào chương trình
  const [tuKhoaTimSach, setTuKhoaTimSach] = useState('');
  const [ketQuaTimSach, setKetQuaTimSach] = useState([]);
  const [dangTimSach, setDangTimSach] = useState(false);

  // 1. Tải danh mục một lần khi mount
  useEffect(() => {
    let conHieuLuc = true;
    api.get('/categories')
      .then((res) => {
        if (conHieuLuc && res.data?.data) {
          setDanhMucList(res.data.data);
        }
      })
      .catch(() => {});
    return () => { conHieuLuc = false; };
  }, []);

  // 2. Tải danh sách chương trình giảm giá
  const napDanhSach = useCallback(async () => {
    setDangTai(true);
    setLoiTai('');
    try {
      const params = {
        page: trang,
        limit: 10,
        search: tuKhoaDaLoc || undefined,
        trangThai: trangThaiDaLoc || undefined
      };
      const res = await api.get('/admin/discounts', { params });
      if (res.data?.success) {
        setDanhSach(res.data.data.danhSach || []);
        setPhanTrang(res.data.data.phanTrang || null);
      }
    } catch (err) {
      setLoiTai(loiTuApi(err, 'Không thể tải danh sách chương trình giảm giá'));
    } finally {
      setDangTai(false);
    }
  }, [trang, tuKhoaDaLoc, trangThaiDaLoc]);

  useEffect(() => {
    napDanhSach();
  }, [napDanhSach]);

  // Tìm kiếm danh sách chương trình
  const handleTimKiemSubmit = (e) => {
    e.preventDefault();
    const params = new URLSearchParams(searchParams);
    if (timKiem.trim()) {
      params.set('search', timKiem.trim());
    } else {
      params.delete('search');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleDoiTrangThaiLoc = (e) => {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams);
    if (val) {
      params.set('status', val);
    } else {
      params.delete('status');
    }
    params.set('page', '1');
    setSearchParams(params);
  };

  const handleDoiTrang = (trangMoi) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(trangMoi));
    setSearchParams(params);
  };

  // 3. Mở Modal Tạo mới
  const moModalTao = () => {
    const now = new Date();
    const motTuanSau = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    setTenChuongTrinh('');
    setPhanTramGiam(20);
    setNgayBatDau(toDatetimeLocalString(now));
    setNgayKetThuc(toDatetimeLocalString(motTuanSau));
    setKieuApDung('sach');
    setDanhSachMaDanhMuc([]);
    setDanhSachSachChon([]);
    setTuKhoaTimSach('');
    setKetQuaTimSach([]);
    setLoiModal('');
    setModalCheDo('tao');
    setChuongTrinhDangChon(null);
    setHienModal(true);
  };

  // 4. Mở Modal Sửa hoặc Xem chi tiết
  const moModalSua = async (ct, cheDo = 'sua') => {
    setDangTai(true);
    setLoiModal('');
    try {
      const res = await api.get(`/admin/discounts/${ct.MaChuongTrinh}`);
      const chiTiet = res.data?.data;
      if (!chiTiet) throw new Error('Không lấy được thông tin chi tiết');

      setChuongTrinhDangChon(chiTiet);
      setTenChuongTrinh(chiTiet.TenChuongTrinh || '');
      setPhanTramGiam(chiTiet.PhanTramGiam || 20);
      setNgayBatDau(toDatetimeLocalString(chiTiet.NgayBatDau));
      setNgayKetThuc(toDatetimeLocalString(chiTiet.NgayKetThuc));

      // Phân loại đối tượng
      const dsDoiTuong = chiTiet.danhSachDoiTuong || [];
      const dsSach = dsDoiTuong.filter(dt => dt.MaSach && dt.sach).map(dt => ({
        maSach: dt.sach.MaSach,
        tenSach: dt.sach.TenSach,
        giaBan: dt.sach.GiaBan,
        anhBia: dt.sach.AnhBia,
        soLuongTon: dt.sach.SoLuongTon
      }));
      const dsDm = dsDoiTuong.filter(dt => dt.MaDanhMuc).map(dt => dt.MaDanhMuc);

      if (dsDm.length > 0 && dsSach.length === 0) {
        setKieuApDung('danh_muc');
      } else {
        setKieuApDung('sach');
      }

      setDanhSachSachChon(dsSach);
      setDanhSachMaDanhMuc(dsDm);
      setTuKhoaTimSach('');
      setKetQuaTimSach([]);
      setModalCheDo(cheDo);
      setHienModal(true);
    } catch (err) {
      tb.loi(loiTuApi(err, 'Không thể tải chi tiết chương trình'));
    } finally {
      setDangTai(false);
    }
  };

  // 5. Tìm kiếm sách khi gõ trong modal
  useEffect(() => {
    if (!hienModal || kieuApDung !== 'sach') return;
    const tuKhoa = tuKhoaTimSach.trim();
    if (tuKhoa.length < 2) {
      setKetQuaTimSach([]);
      return;
    }

    const timer = setTimeout(async () => {
      setDangTimSach(true);
      try {
        const res = await api.get('/admin/books', {
          params: { search: tuKhoa, limit: 12 }
        });
        if (res.data?.data?.danhSach) {
          setKetQuaTimSach(res.data.data.danhSach);
        }
      } catch {
        setKetQuaTimSach([]);
      } finally {
        setDangTimSach(false);
      }
    }, 280);

    return () => clearTimeout(timer);
  }, [tuKhoaTimSach, hienModal, kieuApDung]);

  const themSachVaoChuongTrinh = (sach) => {
    if (danhSachSachChon.some(s => s.maSach === sach.MaSach)) return;
    setDanhSachSachChon(prev => [
      ...prev,
      {
        maSach: sach.MaSach,
        tenSach: sach.TenSach,
        giaBan: sach.GiaBan,
        anhBia: sach.AnhBia,
        soLuongTon: sach.SoLuongTon
      }
    ]);
  };

  const xoaSachKhoiChuongTrinh = (maSach) => {
    setDanhSachSachChon(prev => prev.filter(s => s.maSach !== maSach));
  };

  const toggleChonDanhMuc = (maDm) => {
    setDanhSachMaDanhMuc(prev => 
      prev.includes(maDm) ? prev.filter(id => id !== maDm) : [...prev, maDm]
    );
  };

  // 6. Lưu chương trình
  const handleLuuChuongTrinh = async (e) => {
    e.preventDefault();
    setLoiModal('');

    if (!tenChuongTrinh.trim()) {
      setLoiModal('Vui lòng nhập tên chương trình giảm giá');
      return;
    }

    const pt = parseInt(phanTramGiam, 10);
    if (isNaN(pt) || pt < 1 || pt > 60) {
      setLoiModal('Mức giảm giá phải từ 1% đến 60%');
      return;
    }

    if (!ngayBatDau || !ngayKetThuc) {
      setLoiModal('Vui lòng chọn thời gian bắt đầu và kết thúc');
      return;
    }

    const dBatDau = new Date(ngayBatDau);
    const dKetThuc = new Date(ngayKetThuc);
    if (dKetThuc < dBatDau) {
      setLoiModal('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu');
      return;
    }

    let dsMaSach = [];
    let dsMaDm = [];
    if (kieuApDung === 'sach') {
      if (danhSachSachChon.length === 0) {
        setLoiModal('Vui lòng chọn ít nhất một cuốn sách áp dụng giảm giá');
        return;
      }
      dsMaSach = danhSachSachChon.map(s => s.maSach);
    } else {
      if (danhSachMaDanhMuc.length === 0) {
        setLoiModal('Vui lòng chọn ít nhất một thể loại áp dụng giảm giá');
        return;
      }
      dsMaDm = danhSachMaDanhMuc;
    }

    const payload = {
      tenChuongTrinh: tenChuongTrinh.trim(),
      phanTramGiam: pt,
      ngayBatDau: dBatDau.toISOString(),
      ngayKetThuc: dKetThuc.toISOString(),
      danhSachMaSach: dsMaSach,
      danhSachMaDanhMuc: dsMaDm
    };

    setDangLuu(true);
    try {
      if (modalCheDo === 'tao') {
        await api.post('/admin/discounts', payload);
        tb.thanhCong('Tạo chương trình giảm giá mới thành công!');
      } else {
        await api.put(`/admin/discounts/${chuongTrinhDangChon.MaChuongTrinh}`, payload);
        tb.thanhCong('Cập nhật chương trình giảm giá thành công!');
      }
      setHienModal(false);
      napDanhSach();
    } catch (err) {
      setLoiModal(loiTuApi(err, 'Không thể lưu chương trình giảm giá'));
    } finally {
      setDangLuu(false);
    }
  };

  // 7. Toggle Bật / Tạm dừng
  const handleToggle = async (ct) => {
    const hanhDong = ct.DangHoatDong ? 'tạm dừng' : 'kích hoạt lại';
    const dongY = await xacNhan({
      tieuDe: `${hanhDong.toUpperCase()} CHƯƠNG TRÌNH`,
      noiDung: `Bạn có chắc chắn muốn ${hanhDong} chương trình "${ct.TenChuongTrinh}" không?`,
      nhanNutXacNhan: ct.DangHoatDong ? 'Tạm dừng ngay' : 'Kích hoạt ngay'
    });

    if (!dongY) return;

    try {
      const res = await api.patch(`/admin/discounts/${ct.MaChuongTrinh}/toggle`);
      tb.thanhCong(res.data?.message || 'Cập nhật trạng thái thành công');
      napDanhSach();
    } catch (err) {
      tb.loi(loiTuApi(err, 'Không thể thay đổi trạng thái chương trình'));
    }
  };

  // Sách mẫu để hiển thị trong khối Xem trước
  const sachXemTruoc = useMemo(() => {
    if (danhSachSachChon.length > 0) return danhSachSachChon[0];
    return {
      tenSach: 'Ví dụ: Đất Rừng Phương Nam',
      giaBan: 85000,
      anhBia: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=300'
    };
  }, [danhSachSachChon]);

  const giaXemTruoc = tinhGiaSauGiamClient(sachXemTruoc.giaBan, phanTramGiam);

  return (
    <div className="quan-ly-giam-gia-page" style={{ paddingBottom: '2rem' }}>
      {/* Tiêu đề trang và nút tạo chương trình */}
      <div className="admindash-page-head">
        <div>
          <h1 className="admindash-page-title">Quản lý giảm giá sách</h1>
          <p className="admindash-page-desc">
            Thiết lập mức giảm theo % cho từng cuốn sách hoặc toàn bộ thể loại.
          </p>
        </div>

        {laQuanTri && (
          <button type="button" onClick={moModalTao} className="btn btn-primary">
            Tạo chương trình mới
          </button>
        )}
      </div>

      {/* Thanh Công Cụ & Lọc */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        padding: '1rem',
        border: '1px solid var(--adm-border)',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <form onSubmit={handleTimKiemSubmit} style={{ display: 'flex', gap: '0.5rem', flex: '1 1 300px', maxWidth: '480px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-sub)' }} />
            <input
              type="text"
              placeholder="Tìm theo tên chương trình..."
              value={timKiem}
              onChange={(e) => setTimKiem(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.75rem 0.5rem 2.2rem',
                borderRadius: '6px',
                border: '1px solid var(--adm-border-strong)',
                fontSize: '0.86rem',
                outline: 'none'
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              padding: '0.5rem 0.9rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'var(--adm-text-main)',
              color: '#FFFFFF',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Tìm
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.84rem', color: 'var(--adm-text-muted)', fontWeight: 600 }}>Trạng thái:</span>
          <select
            value={trangThaiDaLoc}
            onChange={handleDoiTrangThaiLoc}
            style={{
              padding: '0.5rem 0.75rem',
              borderRadius: '6px',
              border: '1px solid var(--adm-border-strong)',
              fontSize: '0.86rem',
              backgroundColor: '#FFFFFF',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            <option value="">Tất cả trạng thái</option>
            <option value="DANG_CHAY">Đang chạy</option>
            <option value="SAP_DIEN_RA">Sắp diễn ra</option>
            <option value="DA_HET_HAN">Đã hết hạn</option>
            <option value="TAM_DUNG">Tạm dừng</option>
          </select>
        </div>
      </div>

      {loiTai && (
        <div style={{ marginBottom: '1rem' }}>
          <ThongBaoTaiCho thongDiep={loiTai} loai="loi" onThuLai={napDanhSach} />
        </div>
      )}

      {/* Bảng Danh Sách Chương Trình Giảm Giá */}
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '10px',
        border: '1px solid var(--adm-border)',
        overflow: 'hidden'
      }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="bo-table" style={{ width: '100%', minWidth: '820px', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: 'var(--adm-surface-2)', borderBottom: '1px solid var(--adm-border)', fontSize: '0.78rem', color: 'var(--adm-text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ padding: '0.85rem 1rem' }}>Chương trình</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Mức giảm</th>
                <th style={{ padding: '0.85rem 1rem' }}>Thời gian hiệu lực</th>
                <th style={{ padding: '0.85rem 1rem' }}>Áp dụng cho</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'center' }}>Trạng thái</th>
                <th style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {dangTai ? (
                <HangBangXuong soCot={6} soHang={5} canPhai={[5]} kieuO={{ padding: '0.9rem 1rem' }} />
              ) : danhSach.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                    <div style={{ color: 'var(--adm-text-sub)', fontSize: '0.92rem' }}>
                      {tuKhoaDaLoc || trangThaiDaLoc ? 'Không tìm thấy chương trình giảm giá nào khớp bộ lọc' : 'Chưa có chương trình giảm giá nào được tạo'}
                    </div>
                  </td>
                </tr>
              ) : (
                danhSach.map((ct) => {
                  const badgeMap = {
                    DANG_CHAY: { nhan: 'Đang chạy', bg: 'var(--adm-success-subtle)', color: 'var(--adm-success)', border: 'var(--adm-success-subtle)' },
                    SAP_DIEN_RA: { nhan: 'Sắp diễn ra', bg: 'var(--adm-info-subtle)', color: 'var(--adm-info)', border: 'var(--adm-info-subtle)' },
                    DA_HET_HAN: { nhan: 'Đã hết hạn', bg: 'var(--adm-primary-subtle)', color: 'var(--adm-text-muted)', border: 'var(--adm-border-strong)' },
                    TAM_DUNG: { nhan: 'Tạm dừng', bg: 'var(--adm-warning-subtle)', color: 'var(--adm-warning)', border: 'var(--adm-warning-subtle)' }
                  };
                  const tt = badgeMap[ct.trangThai] || badgeMap.TAM_DUNG;

                  return (
                    <tr 
                      key={ct.MaChuongTrinh}
                      style={{ borderBottom: '1px solid var(--adm-primary-subtle)', transition: 'background-color 0.15s ease' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--adm-surface-2)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '0.9rem 1rem' }}>
                        <div style={{ fontWeight: 600, color: 'var(--adm-text-main)', fontSize: '0.9rem' }}>
                          {ct.TenChuongTrinh}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--adm-text-sub)', marginTop: '2px' }}>
                          Tạo bởi: {ct.nhanVienTao?.HoTen || 'Quản trị viên'}
                        </div>
                      </td>

                      <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: 'var(--adm-accent-subtle)',
                          color: 'var(--adm-accent-hover)',
                          fontWeight: 600,
                          fontSize: '0.88rem',
                          padding: '3px 10px',
                          borderRadius: '6px',
                          border: '1px solid var(--adm-accent-subtle)'
                        }}>
                          -{ct.PhanTramGiam}%
                        </span>
                      </td>

                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.82rem', color: 'var(--adm-text-main)' }}>
                        <div>Từ: <span style={{ fontWeight: 600 }}>{dinhDangNgayGio(ct.NgayBatDau)}</span></div>
                        <div style={{ marginTop: '2px' }}>Đến: <span style={{ fontWeight: 600 }}>{dinhDangNgayGio(ct.NgayKetThuc)}</span></div>
                      </td>

                      <td style={{ padding: '0.9rem 1rem', fontSize: '0.84rem', color: 'var(--adm-text-muted)' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          backgroundColor: 'var(--adm-primary-subtle)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontWeight: 500
                        }}>
                          {ct.soLuongDoiTuong} đối tượng
                        </span>
                      </td>

                      <td style={{ padding: '0.9rem 1rem', textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-block',
                          backgroundColor: tt.bg,
                          color: tt.color,
                          border: `1px solid ${tt.border}`,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          padding: '3px 9px',
                          borderRadius: '20px'
                        }}>
                          {tt.nhan}
                        </span>
                      </td>

                      <td style={{ padding: '0.9rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                          {laQuanTri ? (
                            <>
                              <button
                                type="button"
                                title="Chỉnh sửa chương trình"
                                onClick={() => moModalSua(ct, 'sua')}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: '1px solid var(--adm-border-strong)',
                                  backgroundColor: '#FFFFFF',
                                  color: 'var(--adm-text-main)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                <Edit size={14} />
                              </button>

                              <button
                                type="button"
                                title={ct.DangHoatDong ? 'Tạm dừng chương trình' : 'Bật lại chương trình'}
                                onClick={() => handleToggle(ct)}
                                style={{
                                  padding: '5px 8px',
                                  borderRadius: '6px',
                                  border: `1px solid ${ct.DangHoatDong ? 'var(--adm-warning-subtle)' : 'var(--adm-success-subtle)'}`,
                                  backgroundColor: ct.DangHoatDong ? 'var(--adm-warning-subtle)' : 'var(--adm-success-subtle)',
                                  color: ct.DangHoatDong ? 'var(--adm-warning)' : 'var(--adm-success)',
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center'
                                }}
                              >
                                {ct.DangHoatDong ? <Pause size={14} /> : <Play size={14} />}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              title="Xem chi tiết"
                              onClick={() => moModalSua(ct, 'xem')}
                              style={{
                                padding: '5px 8px',
                                borderRadius: '6px',
                                border: '1px solid var(--adm-border-strong)',
                                backgroundColor: '#FFFFFF',
                                color: 'var(--adm-text-main)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center'
                              }}
                            >
                              <Eye size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {phanTrang && phanTrang.tongSoTrang > 1 && (
          <div style={{ padding: '1rem', borderTop: '1px solid var(--adm-border)' }}>
            <PhanTrang
              trangHienTai={phanTrang.trangHienTai}
              tongSoTrang={phanTrang.tongSoTrang}
              onDoiTrang={handleDoiTrang}
            />
          </div>
        )}
      </div>

      {/* ================= MODAL TẠO / SỬA / XEM CHI TIẾT ================= */}
      {hienModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.65)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            maxWidth: '740px',
            width: '100%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '1.1rem 1.4rem',
              borderBottom: '1px solid var(--adm-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--adm-surface-2)'
            }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--adm-text-main)' }}>
                {modalCheDo === 'tao' ? 'Tạo chương trình giảm giá mới' : (modalCheDo === 'sua' ? 'Chỉnh sửa chương trình giảm giá' : 'Chi tiết chương trình')}
              </h3>
              <button
                type="button"
                onClick={() => setHienModal(false)}
                style={{
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--adm-text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '6px'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleLuuChuongTrinh} style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1 }}>
              <div style={{ padding: '1.25rem 1.4rem', overflowY: 'auto', flex: 1 }}>
                {loiModal && (
                  <div style={{ marginBottom: '1rem' }}>
                    <ThongBaoTaiCho thongDiep={loiModal} loai="loi" />
                  </div>
                )}

                {/* Tên chương trình */}
                <div style={{ marginBottom: '1.1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--adm-text-main)', marginBottom: '0.35rem' }}>
                    Tên chương trình giảm giá <span style={{ color: 'var(--adm-danger)' }}>*</span>
                  </label>
                  <input
                    type="text"
                    disabled={modalCheDo === 'xem'}
                    maxLength={150}
                    placeholder="Ví dụ: Tri ân bạn đọc mùa tựu trường, giảm giá sách văn học..."
                    value={tenChuongTrinh}
                    onChange={(e) => setTenChuongTrinh(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.55rem 0.8rem',
                      borderRadius: '6px',
                      border: '1px solid var(--adm-border-strong)',
                      fontSize: '0.88rem',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Mức giảm giá & Xem trước badge */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 140px',
                  gap: '1rem',
                  marginBottom: '1.1rem',
                  alignItems: 'center'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--adm-text-main)', marginBottom: '0.35rem' }}>
                      Mức giảm giá (%): <span style={{ color: 'var(--adm-accent-hover)', fontWeight: 600 }}>{phanTramGiam}%</span> (Tối đa 60%)
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                      <input
                        type="range"
                        disabled={modalCheDo === 'xem'}
                        min={1}
                        max={60}
                        value={phanTramGiam}
                        onChange={(e) => setPhanTramGiam(parseInt(e.target.value, 10))}
                        style={{ flex: 1, cursor: modalCheDo === 'xem' ? 'not-allowed' : 'pointer' }}
                      />
                      <input
                        type="number"
                        disabled={modalCheDo === 'xem'}
                        min={1}
                        max={60}
                        value={phanTramGiam}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10);
                          if (!isNaN(v)) setPhanTramGiam(Math.max(1, Math.min(60, v)));
                        }}
                        style={{
                          width: '64px',
                          padding: '0.4rem 0.5rem',
                          borderRadius: '6px',
                          border: '1px solid var(--adm-border-strong)',
                          textAlign: 'center',
                          fontSize: '0.88rem',
                          fontWeight: 600
                        }}
                      />
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: 'var(--adm-surface-2)',
                    border: '1px dashed var(--adm-border-strong)',
                    borderRadius: '8px',
                    padding: '0.6rem',
                    textAlign: 'center'
                  }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--adm-text-muted)', marginBottom: '4px' }}>Nhãn hiển thị</div>
                    <NhanGiamGia phanTram={phanTramGiam} viTri="inline" kichThuoc="vua" />
                  </div>
                </div>

                {/* Thời gian hiệu lực */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                  gap: '1rem',
                  marginBottom: '1.25rem'
                }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--adm-text-main)', marginBottom: '0.35rem' }}>
                      Ngày bắt đầu <span style={{ color: 'var(--adm-danger)' }}>*</span>
                    </label>
                    <input
                      type="datetime-local"
                      disabled={modalCheDo === 'xem'}
                      value={ngayBatDau}
                      onChange={(e) => setNgayBatDau(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid var(--adm-border-strong)',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--adm-text-main)', marginBottom: '0.35rem' }}>
                      Kết thúc lúc <span style={{ color: 'var(--adm-danger)' }}>*</span>
                    </label>
                    <input
                      type="datetime-local"
                      disabled={modalCheDo === 'xem'}
                      value={ngayKetThuc}
                      onChange={(e) => setNgayKetThuc(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '6px',
                        border: '1px solid var(--adm-border-strong)',
                        fontSize: '0.85rem',
                        outline: 'none'
                      }}
                    />
                  </div>
                </div>

                {/* Chọn phạm vi áp dụng */}
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.84rem', fontWeight: 600, color: 'var(--adm-text-main)', marginBottom: '0.5rem' }}>
                    Phạm vi áp dụng giảm giá <span style={{ color: 'var(--adm-danger)' }}>*</span>
                  </label>
                  <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <button
                      type="button"
                      disabled={modalCheDo === 'xem'}
                      onClick={() => setKieuApDung('sach')}
                      style={{
                        flex: 1,
                        padding: '0.6rem 0.8rem',
                        borderRadius: '6px',
                        border: `1.5px solid ${kieuApDung === 'sach' ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                        backgroundColor: kieuApDung === 'sach' ? 'var(--adm-accent-subtle)' : '#FFFFFF',
                        color: kieuApDung === 'sach' ? 'var(--adm-accent-hover)' : 'var(--adm-text-muted)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: modalCheDo === 'xem' ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      Từng cuốn sách cụ thể ({danhSachSachChon.length})
                    </button>

                    <button
                      type="button"
                      disabled={modalCheDo === 'xem'}
                      onClick={() => setKieuApDung('danh_muc')}
                      style={{
                        flex: 1,
                        padding: '0.6rem 0.8rem',
                        borderRadius: '6px',
                        border: `1.5px solid ${kieuApDung === 'danh_muc' ? 'var(--adm-accent)' : 'var(--adm-border)'}`,
                        backgroundColor: kieuApDung === 'danh_muc' ? 'var(--adm-accent-subtle)' : '#FFFFFF',
                        color: kieuApDung === 'danh_muc' ? 'var(--adm-accent-hover)' : 'var(--adm-text-muted)',
                        fontWeight: 600,
                        fontSize: '0.85rem',
                        cursor: modalCheDo === 'xem' ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.4rem'
                      }}
                    >
                      Theo thể loại / Danh mục ({danhSachMaDanhMuc.length})
                    </button>
                  </div>

                  {/* KHỐI 1: CHỌN SÁCH CỤ THỂ */}
                  {kieuApDung === 'sach' && (
                    <div style={{ backgroundColor: 'var(--adm-surface-2)', padding: '0.9rem', borderRadius: '8px', border: '1px solid var(--adm-border)' }}>
                      {modalCheDo !== 'xem' && (
                        <div style={{ position: 'relative', marginBottom: '0.75rem' }}>
                          <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--adm-text-sub)' }} />
                          <input
                            type="text"
                            placeholder="Gõ tên cuốn sách cần giảm giá để chọn..."
                            value={tuKhoaTimSach}
                            onChange={(e) => setTuKhoaTimSach(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '0.5rem 0.75rem 0.5rem 2.1rem',
                              borderRadius: '6px',
                              border: '1px solid var(--adm-border-strong)',
                              fontSize: '0.85rem',
                              backgroundColor: '#FFFFFF',
                              outline: 'none'
                            }}
                          />
                          {dangTimSach && (
                            <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--adm-text-muted)' }}>
                              Đang tìm...
                            </span>
                          )}
                          {/* Gợi ý tìm kiếm sách */}
                          {ketQuaTimSach.length > 0 && (
                            <div style={{
                              position: 'absolute',
                              top: '100%',
                              left: 0,
                              right: 0,
                              backgroundColor: '#FFFFFF',
                              borderRadius: '8px',
                              border: '1px solid var(--adm-border-strong)',
                              boxShadow: '0 8px 16px rgba(0, 0, 0, 0.1)',
                              maxHeight: '220px',
                              overflowY: 'auto',
                              zIndex: 20,
                              marginTop: '4px'
                            }}>
                              {ketQuaTimSach.map(s => {
                                const daChon = danhSachSachChon.some(item => item.maSach === s.MaSach);
                                return (
                                  <div
                                    key={s.MaSach}
                                    onClick={() => !daChon && themSachVaoChuongTrinh(s)}
                                    style={{
                                      padding: '0.55rem 0.8rem',
                                      borderBottom: '1px solid var(--adm-primary-subtle)',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                      cursor: daChon ? 'not-allowed' : 'pointer',
                                      backgroundColor: daChon ? 'var(--adm-surface-2)' : '#FFFFFF',
                                      opacity: daChon ? 0.6 : 1
                                    }}
                                  >
                                    <div>
                                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--adm-text-main)' }}>{s.TenSach}</div>
                                      <div style={{ fontSize: '0.74rem', color: 'var(--adm-text-muted)' }}>Giá gốc: {dinhDangTien(s.GiaBan)} · Tồn: {s.SoLuongTon}</div>
                                    </div>
                                    {daChon ? (
                                      <span style={{ fontSize: '0.75rem', color: 'var(--adm-success)', fontWeight: 600 }}>Đã chọn</span>
                                    ) : (
                                      <button type="button" style={{ border: 'none', backgroundColor: 'var(--adm-primary)', color: '#FFF', fontSize: '0.72rem', padding: '3px 8px', borderRadius: '4px', cursor: 'pointer' }}>+ Chọn</button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Danh sách sách đã chọn */}
                      {danhSachSachChon.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--adm-text-sub)', fontSize: '0.82rem' }}>
                          Chưa có cuốn sách nào được chọn trong chương trình này.
                        </div>
                      ) : (
                        <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {danhSachSachChon.map((s) => {
                            const giaSau = tinhGiaSauGiamClient(s.giaBan, phanTramGiam);
                            return (
                              <div
                                key={s.maSach}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  backgroundColor: '#FFFFFF',
                                  padding: '0.45rem 0.75rem',
                                  borderRadius: '6px',
                                  border: '1px solid var(--adm-border)',
                                  fontSize: '0.84rem'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
                                  <div style={{ fontWeight: 600, color: 'var(--adm-text-main)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                                    {s.tenSach}
                                  </div>
                                  <div style={{ fontSize: '0.76rem', color: 'var(--adm-text-muted)' }}>
                                    <span style={{ textDecoration: 'line-through' }}>{dinhDangTien(s.giaBan)}</span>
                                    {' → '}
                                    <span style={{ color: 'var(--adm-accent-hover)', fontWeight: 600 }}>{dinhDangTien(giaSau)}</span>
                                  </div>
                                </div>
                                {modalCheDo !== 'xem' && (
                                  <button
                                    type="button"
                                    onClick={() => xoaSachKhoiChuongTrinh(s.maSach)}
                                    title="Xóa khỏi chương trình"
                                    style={{
                                      border: 'none',
                                      backgroundColor: 'transparent',
                                      color: 'var(--adm-text-sub)',
                                      cursor: 'pointer',
                                      padding: '2px'
                                    }}
                                  >
                                    <X size={15} />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  {/* KHỐI 2: CHỌN THEO THỂ LOẠI */}
                  {kieuApDung === 'danh_muc' && (
                    <div style={{
                      backgroundColor: 'var(--adm-surface-2)',
                      padding: '0.9rem',
                      borderRadius: '8px',
                      border: '1px solid var(--adm-border)',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.5rem' }}>
                        {danhMucList.map(dm => {
                          const daChon = danhSachMaDanhMuc.includes(dm.MaDanhMuc);
                          return (
                            <label
                              key={dm.MaDanhMuc}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.5rem',
                                backgroundColor: daChon ? 'var(--adm-accent-subtle)' : '#FFFFFF',
                                border: `1px solid ${daChon ? 'var(--adm-accent-subtle)' : 'var(--adm-border-strong)'}`,
                                padding: '0.45rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.84rem',
                                cursor: modalCheDo === 'xem' ? 'default' : 'pointer'
                              }}
                            >
                              <input
                                type="checkbox"
                                disabled={modalCheDo === 'xem'}
                                checked={daChon}
                                onChange={() => toggleChonDanhMuc(dm.MaDanhMuc)}
                              />
                              <span style={{ fontWeight: daChon ? 600 : 400, color: daChon ? 'var(--adm-accent-hover)' : 'var(--adm-text-main)' }}>
                                {dm.TenDanhMuc}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Khối Xem Trước Thẻ Sách Demo */}
                <div style={{
                  backgroundColor: 'var(--adm-warning-subtle)',
                  border: '1px solid var(--adm-warning-subtle)',
                  borderRadius: '8px',
                  padding: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <div style={{ position: 'relative', width: '56px', height: '80px', borderRadius: '4px', overflow: 'hidden', flexShrink: 0, backgroundColor: 'var(--adm-border-strong)' }}>
                    <img 
                      src={sachXemTruoc.anhBia || 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=200'} 
                      alt="" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                    <NhanGiamGia phanTram={phanTramGiam} viTri="goc-anh" kichThuoc="nho" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--adm-text-muted)', fontWeight: 500 }}>
                      Xem trước hiển thị ở Storefront:
                    </div>
                    <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--adm-text-main)', marginTop: '2px' }}>
                      {sachXemTruoc.tenSach}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', marginTop: '3px' }}>
                      <span style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--adm-accent-hover)' }}>
                        {dinhDangTien(giaXemTruoc)}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: 'var(--adm-text-sub)', textDecoration: 'line-through' }}>
                        {dinhDangTien(sachXemTruoc.giaBan)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div style={{
                padding: '0.9rem 1.4rem',
                borderTop: '1px solid var(--adm-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'flex-end',
                gap: '0.75rem',
                backgroundColor: 'var(--adm-surface-2)'
              }}>
                <button
                  type="button"
                  onClick={() => setHienModal(false)}
                  style={{
                    padding: '0.55rem 1rem',
                    borderRadius: '6px',
                    border: '1px solid var(--adm-border-strong)',
                    backgroundColor: '#FFFFFF',
                    color: 'var(--adm-text-muted)',
                    fontSize: '0.86rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  {modalCheDo === 'xem' ? 'Đóng' : 'Hủy bỏ'}
                </button>

                {modalCheDo !== 'xem' && (
                  <button
                    type="submit"
                    disabled={dangLuu}
                    style={{
                      padding: '0.55rem 1.25rem',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: 'var(--adm-primary)',
                      color: '#FFFFFF',
                      fontSize: '0.86rem',
                      fontWeight: 600,
                      cursor: dangLuu ? 'not-allowed' : 'pointer',
                      opacity: dangLuu ? 0.7 : 1,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.4rem'
                    }}
                  >
                    {dangLuu ? 'Đang lưu...' : (modalCheDo === 'tao' ? 'Tạo chương trình' : 'Cập nhật')}
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuanLyGiamGia;
