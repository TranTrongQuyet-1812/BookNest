import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import useCartStore from '../stores/cartStore';
import StarRating from '../components/StarRating';
import KeSachCuonNgang from '../components/KeSachCuonNgang';
import { giaiMaHtmlEntities } from '../utils/text';

/**
 * ChiTietSach - Trang Chi Tiết Tác Phẩm (Book Detail Page)
 * Phong cách Minimalist tối giản (Craft Floor theo Impeccable & UI-UX Pro Max)
 * Tôn vinh vẻ đẹp bìa sách, giải mã chuẩn tiếng Việt, hạn chế icon rườm rà
 */
export const ChiTietSach = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { daDangNhap } = useAuth();
  const { themVaoGio } = useCartStore();

  // Xử lý quay lại đúng trang và bộ lọc trước đó (ví dụ ?categoryId=7&page=2)
  const handleQuayLai = () => {
    if (location.state?.from) {
      navigate(location.state.from);
      return;
    }
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  };

  const [sach, setSach] = useState(null);
  const [sachCungTheLoai, setSachCungTheLoai] = useState([]);
  const [danhGiaList, setDanhGiaList] = useState([]);
  const [thongKeSao, setThongKeSao] = useState({ saoTrungBinh: 5, tongDanhGia: 0 });
  const [soLuong, setSoLuong] = useState(1);
  const [dangTai, setDangTai] = useState(true);
  const [thongBao, setThongBao] = useState('');
  const [loi, setLoi] = useState('');

  // Form gửi nhận xét (Verified Buyer)
  const [soSaoDanhGia, setSoSaoDanhGia] = useState(5);
  const [nhanXet, setNhanXet] = useState('');
  const [dangGuiDanhGia, setDangGuiDanhGia] = useState(false);
  const [loiDanhGia, setLoiDanhGia] = useState('');
  const [thanhCongDanhGia, setThanhCongDanhGia] = useState('');

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    let daHuy = false;

    const napDuLieu = async () => {
      try {
        const [resSach, resDanhGia] = await Promise.all([
          api.get(`/books/${id}`),
          api.get(`/books/${id}/reviews`)
        ]);

        if (daHuy) return;

        const sachData = resSach.data.data;
        setSach(sachData);

        const dgData = resDanhGia.data.data;
        setDanhGiaList(dgData?.danhSach || (Array.isArray(dgData) ? dgData : []));
        if (dgData?.thongKe) {
          setThongKeSao(dgData.thongKe);
        } else if (resDanhGia.data.thongKe) {
          setThongKeSao(resDanhGia.data.thongKe);
        }

        // Tải gợi ý cùng thể loại nếu có
        if (sachData?.MaDanhMuc) {
          const resGoiY = await api.get('/books', {
            params: { categoryId: sachData.MaDanhMuc, limit: 10 }
          });
          if (daHuy) return;
          const listGoiY = resGoiY.data.data?.danhSach || [];
          setSachCungTheLoai(listGoiY.filter(item => item.MaSach !== sachData.MaSach));
        }
      } catch (err) {
        if (!daHuy) setLoi(err.response?.data?.message || 'Không thể tải thông tin cuốn sách này');
      } finally {
        if (!daHuy) setDangTai(false);
      }
    };

    napDuLieu();
    return () => {
      daHuy = true;
    };
  }, [id]);

  // Thêm sách vào giỏ hàng qua Zustand Store (Hỗ trợ cả Khách vãng lai & Khách hàng)
  const handleThemGioHang = async () => {
    setThongBao('');
    setLoi('');
    const ketQua = await themVaoGio(sach?.MaSach, soLuong, sach);
    if (ketQua.thanhCong) {
      setThongBao(`Đã thêm ${soLuong} cuốn "${sach?.TenSach}" vào giỏ hàng`);
      setTimeout(() => setThongBao(''), 3000);
    } else {
      setLoi(ketQua.thongDiep || 'Lỗi khi thêm sách vào giỏ hàng');
    }
  };

  // Mua ngay (Thêm vào giỏ và chuyển thẳng sang Trang thanh toán)
  const handleMuaNgay = async () => {
    const ma = sach?.MaSach || sach?.maSach || Number(id);
    const ketQua = await themVaoGio(ma, soLuong, sach);
    if (ketQua.thanhCong) {
      navigate('/checkout');
    } else {
      setLoi(ketQua.thongDiep || 'Không thể thực hiện mua ngay lúc này');
    }
  };

  // Gửi đánh giá sách (Verified Buyer)
  const handleGuiDanhGia = async (e) => {
    e.preventDefault();
    setLoiDanhGia('');
    setThanhCongDanhGia('');
    setDangGuiDanhGia(true);

    try {
      await api.post(`/books/${id}/reviews`, {
        soSao: soSaoDanhGia,
        noiDung: nhanXet.trim() || undefined
      });
      setThanhCongDanhGia('Cảm ơn bạn đã gửi đánh giá! Nhận xét đã được ghi nhận.');
      setNhanXet('');
      const resDanhGia = await api.get(`/books/${id}/reviews`);
      const dgData = resDanhGia.data.data;
      setDanhGiaList(dgData?.danhSach || (Array.isArray(dgData) ? dgData : []));
      if (dgData?.thongKe) {
        setThongKeSao(dgData.thongKe);
      } else if (resDanhGia.data.thongKe) {
        setThongKeSao(resDanhGia.data.thongKe);
      }
    } catch (err) {
      setLoiDanhGia(err.response?.data?.message || 'Bạn chỉ có thể đánh giá sau khi đã mua và nhận đơn hàng thành công');
    } finally {
      setDangGuiDanhGia(false);
    }
  };

  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);
  };

  // Khung xương Skeleton tối giản - Giữ nguyên kích thước và cấu trúc 2 cột của trang sách
  if (dangTai) {
    return (
      <div className="container" style={{ padding: '2rem 1rem 4rem', maxWidth: '1180px', margin: '0 auto', minHeight: '80vh' }}>
        <div style={{ marginBottom: '1.75rem', height: '22px', width: '140px', backgroundColor: 'rgba(76, 69, 65, 0.08)', borderRadius: '4px' }} />
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(280px, 380px) 1fr',
          gap: '3.5rem',
          alignItems: 'start'
        }}>
          {/* Cột bìa sách skeleton */}
          <div style={{
            width: '100%',
            aspectRatio: '3 / 4',
            backgroundColor: 'rgba(76, 69, 65, 0.05)',
            borderRadius: '8px',
            border: '1px solid var(--border)'
          }} />
          {/* Cột thông tin skeleton */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ height: '36px', width: '75%', backgroundColor: 'rgba(76, 69, 65, 0.08)', borderRadius: '6px' }} />
            <div style={{ height: '20px', width: '40%', backgroundColor: 'rgba(76, 69, 65, 0.05)', borderRadius: '4px' }} />
            <div style={{ height: '42px', width: '30%', backgroundColor: 'rgba(76, 69, 65, 0.08)', borderRadius: '6px', marginTop: '1rem' }} />
            <div style={{ height: '110px', width: '100%', backgroundColor: 'rgba(76, 69, 65, 0.04)', borderRadius: '6px' }} />
            <div style={{ height: '48px', width: '220px', backgroundColor: 'rgba(76, 69, 65, 0.08)', borderRadius: '8px', marginTop: '1rem' }} />
          </div>
        </div>
      </div>
    );
  }

  if (loi && !sach) {
    return (
      <div className="container" style={{ padding: '5rem 1rem', textAlign: 'center' }}>
        <div style={{
          maxWidth: '520px',
          margin: '0 auto 1.5rem',
          padding: '1.25rem',
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--danger-light)',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--danger)'
        }}>
          {loi}
        </div>
        <button 
          type="button" 
          onClick={handleQuayLai} 
          style={{ 
            color: 'var(--text-main)', 
            fontWeight: 600, 
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '0.95rem'
          }}
        >
          &larr; {location.state?.from ? 'Quay lại danh sách' : 'Trở về trang trước'}
        </button>
      </div>
    );
  }

  const anhBia = sach.AnhBia;
  const tieuDe = sach.TenSach;
  const tacGia = sach.TacGia;
  const giaBan = sach.GiaBan;
  const soLuongTon = sach.SoLuongTon ?? 0;
  const moTaSachSachSe = giaiMaHtmlEntities(sach.MoTa);
  const tenDanhMuc = sach.danhMuc?.TenDanhMuc || 'Tủ Sách Chung';

  return (
    <div className="container" style={{ padding: '2rem 1rem 4rem', maxWidth: '1180px', margin: '0 auto' }}>
      {/* Thanh điều hướng quay về tinh giản */}
      <div style={{ marginBottom: '1.75rem' }}>
        <button
          type="button"
          onClick={handleQuayLai}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontSize: '0.9rem',
            color: 'var(--text-main)',
            fontWeight: 600,
            padding: '0.4rem 0.9rem',
            borderRadius: '6px',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.color = 'var(--primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.color = 'var(--text-main)';
          }}
        >
          <span>&larr;</span>
          <span>{location.state?.from ? 'Quay lại danh sách' : 'Trở về trang trước'}</span>
        </button>
      </div>

      {/* Thông Báo Thêm Giỏ Hàng Toast Nhẹ */}
      {thongBao && (
        <div style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-main)',
          border: '1px solid var(--border)',
          padding: '0.85rem 1.4rem',
          borderRadius: 'var(--radius-sm)',
          boxShadow: 'var(--shadow-lg)',
          fontSize: '0.9rem',
          fontWeight: 600,
          zIndex: 99
        }}>
          {thongBao}
        </div>
      )}

      {/* KHỐI NỘI DUNG CHÍNH (2 CỘT TỶ LỆ VÀNG 4.5 : 7.5 TRONG CARD SANG TRỌNG) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '3.5rem',
        alignItems: 'start',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '20px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        padding: '2.5rem',
        marginBottom: '2.5rem'
      }}>
        {/* CỘT TRÁI: Bìa Sách Trưng Bày Tinh Tế */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div style={{
            width: '100%',
            maxWidth: '340px',
            aspectRatio: '3 / 4',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-md)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative'
          }}>
            {anhBia ? (
              <img
                src={anhBia}
                alt={tieuDe}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            ) : (
              <div style={{ color: 'var(--text-sub)', fontSize: '0.9rem', fontStyle: 'italic' }}>
                Chưa có ảnh bìa
              </div>
            )}

            {/* Tag Tập Sách nếu có */}
            {sach.Tap !== null && sach.Tap !== undefined && (
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                backgroundColor: 'var(--primary)',
                color: 'var(--primary-text)',
                fontSize: '0.78rem',
                fontWeight: 700,
                padding: '3px 9px',
                borderRadius: '4px',
                letterSpacing: '0.04em'
              }}>
                Tập {sach.Tap}
              </div>
            )}
          </div>
        </div>

        {/* CỘT PHẢI: Thông Tin Tác Phẩm & Hành Động Đặt Mua */}
        <div>
          {/* Tag Thể loại & Tình trạng sách */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
            <Link
              to={`/?categoryId=${sach.MaDanhMuc}`}
              style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: 'var(--text-main)',
                backgroundColor: 'var(--bg-surface)',
                padding: '3px 10px',
                borderRadius: '4px',
                border: '1px solid var(--border)',
                transition: 'border-color 0.15s ease'
              }}
            >
              {tenDanhMuc}
            </Link>

            {sach.DaAn && (
              <span style={{ fontSize: '0.78rem', color: 'var(--danger)', fontWeight: 600 }}>
                (Tác phẩm đang ẩn)
              </span>
            )}
          </div>

          {/* Tên Sách - Font rõ nét chuẩn Inter */}
          <h1 style={{
            fontSize: 'clamp(1.6rem, 2.8vw, 2.2rem)',
            fontWeight: 700,
            color: 'var(--text-main)',
            lineHeight: 1.3,
            marginBottom: '0.6rem',
            letterSpacing: '-0.01em'
          }}>
            {tieuDe}
          </h1>

          {/* Tác giả */}
          <p style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
            Tác giả:{' '}
            <Link
              to={`/?search=${encodeURIComponent(tacGia)}`}
              style={{ color: 'var(--text-main)', fontWeight: 600, textDecoration: 'underline' }}
            >
              {tacGia}
            </Link>
          </p>

          {/* Điểm đánh giá sao & số lượt nhận xét */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.75rem',
            paddingBottom: '1.25rem',
            marginBottom: '1.5rem',
            borderBottom: '1px solid var(--border)'
          }}>
            <StarRating rating={Math.round(thongKeSao.saoTrungBinh || 5)} size={17} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>
              {thongKeSao.saoTrungBinh || '5.0'} / 5
            </span>
            <span style={{ color: 'var(--text-sub)', fontSize: '0.86rem' }}>
              • {thongKeSao.tongDanhGia} nhận xét từ bạn đọc
            </span>
          </div>

          {/* Giá Bán */}
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: '1.25rem',
            marginBottom: '1.75rem',
            flexWrap: 'wrap'
          }}>
            <span style={{ fontSize: '2.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
              {dinhDangTien(giaBan)}
            </span>

            {soLuongTon <= 0 && (
              <span style={{
                fontSize: '0.88rem',
                fontWeight: 600,
                color: 'var(--danger)'
              }}>
                ○ Tạm hết hàng
              </span>
            )}
          </div>

          {/* Khối Đặt Mua & Chọn Số Lượng */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            padding: '1.25rem 1.5rem',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
              {/* Bộ đếm số lượng Counter */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Số lượng:
                </span>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  overflow: 'hidden'
                }}>
                  <button
                    type="button"
                    disabled={soLuong <= 1 || soLuongTon <= 0}
                    onClick={() => setSoLuong(prev => Math.max(1, prev - 1))}
                    style={{
                      width: '34px',
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: soLuong > 1 ? 'pointer' : 'not-allowed',
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'var(--text-main)'
                    }}
                  >
                    &minus;
                  </button>
                  <span style={{
                    width: '42px',
                    textAlign: 'center',
                    fontSize: '0.92rem',
                    fontWeight: 700,
                    color: 'var(--text-main)'
                  }}>
                    {soLuong}
                  </span>
                  <button
                    type="button"
                    disabled={soLuong >= soLuongTon || soLuongTon <= 0}
                    onClick={() => setSoLuong(prev => Math.min(soLuongTon, prev + 1))}
                    style={{
                      width: '34px',
                      height: '34px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'transparent',
                      border: 'none',
                      cursor: soLuong < soLuongTon ? 'pointer' : 'not-allowed',
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'var(--text-main)'
                    }}
                  >
                    &#43;
                  </button>
                </div>
              </div>

              {/* Nút Thêm vào giỏ & Mua ngay */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, minWidth: '240px' }}>
                <button
                  onClick={handleThemGioHang}
                  disabled={soLuongTon <= 0}
                  style={{
                    flex: 1,
                    padding: '0.8rem 1.25rem',
                    backgroundColor: 'var(--primary)',
                    color: 'var(--primary-text)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    border: 'none',
                    cursor: soLuongTon > 0 ? 'pointer' : 'not-allowed',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (soLuongTon > 0) e.currentTarget.style.backgroundColor = 'var(--primary-hover)';
                  }}
                  onMouseLeave={(e) => {
                    if (soLuongTon > 0) e.currentTarget.style.backgroundColor = 'var(--primary)';
                  }}
                >
                  Thêm vào giỏ hàng
                </button>

                <button
                  onClick={handleMuaNgay}
                  disabled={soLuongTon <= 0}
                  style={{
                    padding: '0.8rem 1.35rem',
                    backgroundColor: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    border: '1.5px solid var(--border-focus)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 700,
                    fontSize: '0.92rem',
                    cursor: soLuongTon > 0 ? 'pointer' : 'not-allowed',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.18s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (soLuongTon > 0) {
                      e.currentTarget.style.backgroundColor = 'var(--primary)';
                      e.currentTarget.style.borderColor = 'var(--primary)';
                      e.currentTarget.style.color = 'var(--primary-text)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (soLuongTon > 0) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-card)';
                      e.currentTarget.style.borderColor = 'var(--border-focus)';
                      e.currentTarget.style.color = 'var(--text-main)';
                    }
                  }}
                >
                  Mua ngay
                </button>
              </div>
            </div>
          </div>

          {/* Khối Giới Thiệu / Tóm Tắt Tác Phẩm */}
          <div>
            <h3 style={{
              fontSize: '1rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              marginBottom: '0.75rem'
            }}>
              Giới thiệu tác phẩm
            </h3>
            <div style={{
              fontSize: '0.96rem',
              color: 'var(--text-main)',
              lineHeight: 1.85,
              whiteSpace: 'pre-line'
            }}>
              {moTaSachSachSe || 'Tác phẩm hiện đang được cập nhật phần tóm tắt chi tiết.'}
            </div>
          </div>
        </div>
      </div>

      {/* KHU VỰC ĐÁNH GIÁ & NHẬN XÉT CỦA BẠN ĐỌC (TRONG CARD GỌN GÀNG) */}
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '20px',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow-sm)',
        padding: '2.5rem',
        marginBottom: '2.5rem'
      }}>
        <div style={{
          paddingBottom: '1rem',
          marginBottom: '2rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div>
            <h2 className="font-bonheur" style={{ fontSize: '2.4rem', color: 'var(--text-main)', margin: 0, lineHeight: 1 }}>
              Cảm Nhận Từ Bạn Đọc
            </h2>
            <p style={{ fontSize: '0.86rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              Chỉ độc giả đã nhận hàng thành công mới có thể gửi nhận xét (Chính sách Verified Buyer)
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <StarRating rating={Math.round(thongKeSao.saoTrungBinh || 5)} size={16} />
            <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>{thongKeSao.saoTrungBinh || '5.0'} / 5</span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem' }}>
          {/* CỘT FORM GỬI ĐÁNH GIÁ */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
              Chia sẻ cảm nghĩ của bạn
            </h3>

            {loiDanhGia && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--danger-light)',
                color: 'var(--danger)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}>
                {loiDanhGia}
              </div>
            )}

            {thanhCongDanhGia && (
              <div style={{
                padding: '0.75rem 1rem',
                backgroundColor: 'var(--primary-light)',
                color: 'var(--primary-dark)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.85rem',
                marginBottom: '1rem'
              }}>
                {thanhCongDanhGia}
              </div>
            )}

            {daDangNhap ? (
              <form onSubmit={handleGuiDanhGia}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    Mức độ yêu thích:
                  </label>
                  <StarRating
                    rating={soSaoDanhGia}
                    interactive={true}
                    onRatingChange={(sao) => setSoSaoDanhGia(sao)}
                    size={24}
                  />
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                    Lời bình cảm nhận:
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Hãy chia sẻ những rung cảm hoặc ấn tượng sâu sắc của bạn về tác phẩm này..."
                    value={nhanXet}
                    onChange={(e) => setNhanXet(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-app)',
                      fontSize: '0.9rem',
                      color: 'var(--text-main)',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  type="submit"
                  disabled={dangGuiDanhGia}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: 'var(--primary)',
                    color: 'var(--primary-text)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    border: 'none',
                    cursor: dangGuiDanhGia ? 'not-allowed' : 'pointer'
                  }}
                >
                  {dangGuiDanhGia ? 'Đang gửi...' : 'Gửi Nhận Xét'}
                </button>
              </form>
            ) : (
              <div style={{
                padding: '1.25rem',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-sm)',
                textAlign: 'center'
              }}>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                  Bạn cần đăng nhập để viết nhận xét về tác phẩm
                </p>
                <Link
                  to="/login"
                  state={{ from: location.pathname + location.search }}
                  style={{
                    display: 'inline-block',
                    padding: '0.5rem 1.25rem',
                    backgroundColor: 'var(--primary)',
                    color: 'var(--primary-text)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    border: 'none',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--primary-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--primary)'}
                >
                  Đăng nhập ngay
                </Link>
              </div>
            )}
          </div>

          {/* CỘT DANH SÁCH NHẬN XÉT CỦA BẠN ĐỌC */}
          <div>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '1rem', color: 'var(--text-main)' }}>
              Nhận xét đã đăng ({danhGiaList.length})
            </h3>

            {danhGiaList.length === 0 ? (
              <p style={{ color: 'var(--text-sub)', fontSize: '0.9rem', fontStyle: 'italic', padding: '1rem 0' }}>
                Chưa có nhận xét nào cho cuốn sách này. Hãy là độc giả đầu tiên chia sẻ cảm nghĩ sau khi đọc nhé!
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                {danhGiaList.map((dg) => {
                  const maDg = dg.MaDanhGia;
                  const nguoiDungTen = dg.khachHang?.HoTen ?? 'Bạn đọc yêu sách';
                  const ngayDg = dg.NgayCapNhat;
                  const soSao = dg.SoSao ?? 5;
                  const noiDung = dg.NoiDung;

                  return (
                    <div
                      key={maDg}
                      style={{
                        paddingBottom: '1rem',
                        borderBottom: '1px solid var(--border)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.92rem', color: 'var(--text-main)' }}>
                          {nguoiDungTen}
                        </span>
                        <span style={{ fontSize: '0.78rem', color: 'var(--text-sub)' }}>
                          {ngayDg ? new Date(ngayDg).toLocaleDateString('vi-VN') : ''}
                        </span>
                      </div>

                      <div style={{ marginBottom: '0.4rem' }}>
                        <StarRating rating={soSao} size={14} />
                      </div>

                      <p style={{
                        fontSize: '0.9rem',
                        color: 'var(--text-muted)',
                        lineHeight: 1.6,
                        margin: 0
                      }}>
                        {noiDung || 'Độc giả không để lại lời bình.'}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SÁCH CÙNG THỂ LOẠI (GỢI Ý CUỘN NGANG BẰNG KỆ SÁCH) */}
      {sachCungTheLoai.length > 0 && (
        <div>
          <KeSachCuonNgang
            tieuDe={`Cùng Thể Loại: ${tenDanhMuc}`}
            linkXemThem={`/?categoryId=${sach.MaDanhMuc}`}
            danhSachSach={sachCungTheLoai}
          />
        </div>
      )}
    </div>
  );
};

export default ChiTietSach;
