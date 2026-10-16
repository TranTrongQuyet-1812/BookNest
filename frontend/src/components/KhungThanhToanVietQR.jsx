import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import api from '../services/api';
import { 
  QrCode, 
  Copy, 
  Check, 
  Clock, 
  RefreshCw, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  X,
  ExternalLink,
  Download,
  Wifi
} from 'lucide-react';
import { laySocket, thamGiaDonHang, roiDonHang } from '../services/socket';

/**
 * Component Modal / Khung hiển thị thanh toán VietQR (payOS)
 * Tự xây dựng 100% giao diện thương hiệu BookNest, chỉ nạp dữ liệu QR từ payOS/VietQR.
 */
export const KhungThanhToanVietQR = ({
  duLieuQR,
  onThanhToanThanhCong,
  onDong,
  onDongHetHan,
  onDoiSangCOD
}) => {
  const [daSaoChep, setDaSaoChep] = useState('');
  const [dangKiemTra, setDangKiemTra] = useState(false);
  const [thanhToanThanhCong, setThanhToanThanhCong] = useState(false);
  const [daHetHan, setDaHetHan] = useState(false);
  const [thongBao, setThongBao] = useState('');
  
  // Thời gian đếm ngược 10 phút (600 giây) hoặc tính từ ngayHetHan
  const tinhGiayConLai = () => {
    if (duLieuQR?.ngayHetHan) {
      const msConLai = new Date(duLieuQR.ngayHetHan).getTime() - Date.now();
      return Math.max(0, Math.floor(msConLai / 1000));
    }
    return 600;
  };

  const [giayConLai, setGiayConLai] = useState(tinhGiayConLai);
  const pollingRef = useRef(null);
  const timerRef = useRef(null);

  // Đóng khung: nếu đã hết hạn (đơn đã bị hủy) thì báo cho trang cha xử lý riêng, không coi như khách chỉ đóng khung QR
  const dongKhung = () => {
    if (daHetHan && onDongHetHan) onDongHetHan();
    else onDong();
  };

  // Xử lý sao chép văn bản vào clipboard
  const handleSaoChep = async (text, loai) => {
    try {
      await navigator.clipboard.writeText(String(text));
      setDaSaoChep(loai);
      setTimeout(() => setDaSaoChep(''), 2000);
    } catch (err) {
      console.warn('Không thể sao chép tự động:', err);
    }
  };

  // Định dạng số tiền VNĐ
  const dinhDangTien = (soTien) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(soTien || 0);
  };

  // Định dạng đồng hồ mm:ss
  const dinhDangDongHo = (tongGiay) => {
    const phut = Math.floor(tongGiay / 60);
    const giay = tongGiay % 60;
    return `${phut.toString().padStart(2, '0')}:${giay.toString().padStart(2, '0')}`;
  };

  // Hàm kiểm tra trạng thái thanh toán từ backend
  const kiemTraTrangThai = async (chuDong = false) => {
    if (!duLieuQR?.maTraCuu || thanhToanThanhCong) return;
    if (chuDong) setDangKiemTra(true);

    try {
      const res = await api.get(`/payments/order/${duLieuQR.maTraCuu}`);
      const tt = res.data?.data;

      // API trả trường trangThai (trạng thái của khoản thanh toán); trước đây so sánh nhầm tên trường nên thăm dò dự phòng không bao giờ nhận ra
      if (tt && tt.trangThai === 'DA_THANH_TOAN') {
        setThanhToanThanhCong(true);
        clearInterval(pollingRef.current);
        clearInterval(timerRef.current);
        if (onThanhToanThanhCong) {
          setTimeout(() => {
            onThanhToanThanhCong(tt);
          }, 2500);
        }
      } else if (chuDong) {
        setThongBao('Hệ thống chưa nhận được tiền. Nếu vừa chuyển, vui lòng đợi 3 - 5 giây để ngân hàng gửi xác nhận nhé!');
        setTimeout(() => setThongBao(''), 5000);
      }
    } catch (err) {
      console.warn('Lỗi kiểm tra trạng thái thanh toán:', err);
    } finally {
      if (chuDong) setDangKiemTra(false);
    }
  };

  // Khởi động đồng hồ đếm ngược, Socket.IO Realtime và Polling dự phòng mỗi 3 giây
  useEffect(() => {
    const maTraCuu = duLieuQR?.maTraCuu;
    if (!maTraCuu) return;

    // 1. Tham gia phòng theo dõi đơn hàng qua WebSocket
    thamGiaDonHang(maTraCuu);
    const socket = laySocket();

    const xuLyThanhToanRealtime = (duLieu) => {
      if (String(duLieu?.maTraCuu) === String(maTraCuu)) {
        setThanhToanThanhCong(true);
        if (timerRef.current) clearInterval(timerRef.current);
        if (pollingRef.current) clearInterval(pollingRef.current);
        if (onThanhToanThanhCong) {
          setTimeout(() => {
            onThanhToanThanhCong(duLieu);
          }, 2000);
        }
      }
    };

    socket.on('thanhToan:daThanhToan', xuLyThanhToanRealtime);

    // Máy chủ báo đơn đã bị hủy do hết hạn (ví dụ đồng hồ máy khách chạy chậm): chuyển sang màn hết hạn ngay
    const xuLyHetHanRealtime = (duLieu) => {
      if (String(duLieu?.maTraCuu) !== String(maTraCuu)) return;
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
      setDaHetHan(true);
    };
    socket.on('thanhToan:hetHan', xuLyHetHanRealtime);

    // 2. Đồng hồ đếm ngược
    timerRef.current = setInterval(() => {
      setGiayConLai((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (pollingRef.current) clearInterval(pollingRef.current);
          setDaHetHan(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // 3. Polling dự phòng mỗi 3 giây (nếu WebSocket rớt mạng)
    pollingRef.current = setInterval(() => {
      kiemTraTrangThai(false);
    }, 3000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (pollingRef.current) clearInterval(pollingRef.current);
      roiDonHang(maTraCuu);
      socket.off('thanhToan:daThanhToan', xuLyThanhToanRealtime);
      socket.off('thanhToan:hetHan', xuLyHetHanRealtime);
    };
  }, [duLieuQR?.maTraCuu]);

  // Vừa hết hạn thì hỏi máy chủ một lần: việc hỏi này khiến máy chủ hủy đơn quá hạn ngay (không phải chờ lượt quét định kỳ)
  useEffect(() => {
    if (daHetHan) kiemTraTrangThai(false);
  }, [daHetHan]);

  const [qrDataUrl, setQrDataUrl] = useState('');

  // Sinh mã QR nội bộ trực tiếp trên client bằng QRCode (chống rò rỉ dữ liệu sang api.qrserver.com bên thứ ba)
  useEffect(() => {
    let daHuy = false;
    const sinhMaQR = async () => {
      if (!duLieuQR) return;
      if (duLieuQR.qrCode?.startsWith('http') || duLieuQR.qrCode?.startsWith('data:')) {
        setQrDataUrl(duLieuQR.qrCode);
        return;
      }
      if (duLieuQR.qrCode) {
        try {
          const url = await QRCode.toDataURL(duLieuQR.qrCode, {
            width: 300,
            margin: 2,
            errorCorrectionLevel: 'M',
            color: { dark: '#000000', light: '#ffffff' }
          });
          if (!daHuy) setQrDataUrl(url);
          return;
        } catch (err) {
          console.warn('Lỗi sinh mã QR canvas nội bộ:', err);
        }
      }
      if (duLieuQR.accountNumber) {
        const urlVietQR = `https://img.vietqr.io/image/${duLieuQR?.bin || '970422'}-${duLieuQR.accountNumber}-compact2.png?amount=${duLieuQR?.soTien || 0}&addInfo=${encodeURIComponent(duLieuQR?.noiDungChuyenKhoan || String(duLieuQR?.maTraCuu || '').replace(/-/g, ''))}&accountName=${encodeURIComponent(duLieuQR?.accountName || 'BOOKNEST')}`;
        if (!daHuy) setQrDataUrl(urlVietQR);
      }
    };
    sinhMaQR();
    return () => { daHuy = true; };
  }, [duLieuQR]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(26, 20, 16, 0.72)',
      backdropFilter: 'blur(5px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem',
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card, #ffffff)',
        color: 'var(--text-main, #2c2523)',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '680px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.25)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        position: 'relative'
      }}>
        {/* Header Modal */}
        <div style={{
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-surface)'
        }}>
          <div className="flex items-center gap-2.5">
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              backgroundColor: 'var(--primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <QrCode size={20} />
            </div>
            <div>
              <h3 className="font-serif" style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0 }}>
                Thanh Toán Chuyển Khoản VietQR
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                Đơn hàng {duLieuQR?.maTraCuu} • Xác nhận tự động qua cổng payOS
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={dongKhung}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-muted)',
              padding: '6px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Đóng cửa sổ"
          >
            <X size={20} />
          </button>
        </div>

        {/* Nội dung chính Modal */}
        <div style={{ padding: '1.5rem' }}>
          {thanhToanThanhCong ? (
            /* Màn hình Thanh toán Thành công */
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem' }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: 'rgba(40, 167, 69, 0.12)',
                color: '#28a745',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1.25rem',
                animation: 'scaleIn 0.3s ease-out'
              }}>
                <CheckCircle2 size={44} />
              </div>
              <h4 className="font-serif" style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                Thanh Toán Thành Công!
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', maxWidth: '420px', margin: '0 auto 1.5rem' }}>
                Hệ thống BookNest đã nhận được số tiền <strong>{dinhDangTien(duLieuQR?.soTien)}</strong> cho đơn hàng {duLieuQR?.maTraCuu}.
              </p>
              <div style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.85rem',
                color: 'var(--accent)',
                backgroundColor: 'var(--bg-surface)',
                padding: '0.5rem 1rem',
                borderRadius: '20px'
              }}>
                <RefreshCw size={14} className="animate-spin" />
                Đang chuyển hướng sang trang chi tiết đơn hàng...
              </div>
            </div>
          ) : daHetHan ? (
            /* Màn hình Hết Hạn */
            <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
              <AlertCircle size={48} style={{ color: 'var(--danger, #dc3545)', margin: '0 auto 1rem' }} />
              <h4 className="font-serif" style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '0.5rem' }}>
                Mã Thanh Toán Đã Hết Hạn
              </h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Đã quá thời gian thanh toán chuyển khoản nên đơn hàng đã bị hủy. Nếu vẫn muốn mua, bạn vui lòng đặt lại đơn mới nhé.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  type="button"
                  onClick={dongKhung}
                  className="btn btn-outline"
                  style={{ padding: '0.65rem 1.25rem', borderRadius: '6px' }}
                >
                  Đóng
                </button>
              </div>
            </div>
          ) : (
            /* Màn hình Quét QR và Thông tin Chuyển khoản */
            <div>
              {/* Thanh thông báo đếm ngược & trạng thái realtime */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.65rem 1rem',
                backgroundColor: 'var(--bg-surface)',
                borderRadius: '8px',
                marginBottom: '1.25rem',
                border: '1px solid var(--border)'
              }}>
                <div className="flex items-center gap-2" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  <div style={{
                    width: '9px',
                    height: '9px',
                    borderRadius: '50%',
                    backgroundColor: '#28a745',
                    animation: 'pulse 1.5s infinite'
                  }} />
                  <span>Đang chờ chuyển khoản...</span>
                </div>

                <div className="flex items-center gap-1.5" style={{
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  color: giayConLai < 120 ? 'var(--danger, #dc3545)' : 'var(--accent)'
                }}>
                  <Clock size={15} />
                  <span>Hết hạn sau: {dinhDangDongHo(giayConLai)}</span>
                </div>
              </div>

              {/* Bố cục 2 Cột: Bên Trái là Mã QR, Bên Phải là Thông Tin Chi Tiết */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(220px, 1fr) 1.3fr',
                gap: '1.25rem',
                alignItems: 'start'
              }}>
                {/* Khung Mã QR */}
                <div style={{
                  textAlign: 'center',
                  backgroundColor: '#ffffff',
                  padding: '1rem',
                  borderRadius: '12px',
                  border: '1px solid var(--border)',
                  boxShadow: '0 4px 14px rgba(0, 0, 0, 0.05)'
                }}>
                  <div style={{
                    width: '100%',
                    maxWidth: '220px',
                    margin: '0 auto',
                    borderRadius: '8px',
                    overflow: 'hidden'
                  }}>
                    <img
                      src={qrDataUrl}
                      alt={`Mã QR Thanh toán đơn hàng ${duLieuQR?.maTraCuu}`}
                      style={{
                        width: '100%',
                        height: 'auto',
                        display: 'block'
                      }}
                    />
                  </div>
                  <p style={{
                    fontSize: '0.78rem',
                    color: '#666',
                    marginTop: '0.65rem',
                    marginBottom: 0
                  }}>
                    Mở app <strong>Ngân hàng</strong> hoặc <strong>MoMo</strong> để quét mã VietQR
                  </p>
                </div>

                {/* Danh sách thông tin chuyển khoản với nút Copy */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {/* Số tiền */}
                  <div style={{
                    padding: '0.75rem 0.9rem',
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                      Số tiền cần thanh toán
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary)' }}>
                        {dinhDangTien(duLieuQR?.soTien)}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSaoChep(duLieuQR?.soTien, 'TIEN')}
                        className="btn btn-outline"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                      >
                        {daSaoChep === 'TIEN' ? <Check size={13} style={{ color: '#28a745' }} /> : <Copy size={13} />}
                        {daSaoChep === 'TIEN' ? 'Đã chép' : 'Chép'}
                      </button>
                    </div>
                  </div>

                  {/* Nội dung chuyển khoản (Rất quan trọng) */}
                  <div style={{
                    padding: '0.75rem 0.9rem',
                    backgroundColor: 'rgba(139, 69, 19, 0.05)',
                    borderRadius: '8px',
                    border: '1px dashed var(--primary)'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginBottom: '2px' }}>
                      Nội dung chuyển khoản (Bắt buộc giữ nguyên)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                        {duLieuQR?.noiDungChuyenKhoan || String(duLieuQR?.maTraCuu || '').replace(/-/g, '')}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleSaoChep(duLieuQR?.noiDungChuyenKhoan || String(duLieuQR?.maTraCuu || '').replace(/-/g, ''), 'NOIDUNG')}
                        className="btn btn-primary"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                      >
                        {daSaoChep === 'NOIDUNG' ? <Check size={13} /> : <Copy size={13} />}
                        {daSaoChep === 'NOIDUNG' ? 'Đã chép' : 'Chép'}
                      </button>
                    </div>
                  </div>

                  {/* Số tài khoản & Ngân hàng */}
                  <div style={{
                    padding: '0.75rem 0.9rem',
                    backgroundColor: 'var(--bg-surface)',
                    borderRadius: '8px',
                    border: '1px solid var(--border)'
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '2px' }}>
                      Tài khoản nhận tiền (VietQR / payOS)
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                        {duLieuQR?.accountNumber || 'Đang cập nhật'}
                      </span>
                      {duLieuQR?.accountNumber && (
                        <button
                          type="button"
                          onClick={() => handleSaoChep(duLieuQR?.accountNumber, 'STK')}
                          className="btn btn-outline"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', borderRadius: '4px' }}
                        >
                          {daSaoChep === 'STK' ? <Check size={13} style={{ color: '#28a745' }} /> : <Copy size={13} />}
                          {daSaoChep === 'STK' ? 'Đã chép' : 'Chép'}
                        </button>
                      )}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                      Chủ tài khoản: <strong>{duLieuQR?.accountName || 'BOOKNEST'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Thông báo nếu có */}
              {thongBao && (
                <div style={{
                  marginTop: '1rem',
                  padding: '0.65rem 0.9rem',
                  backgroundColor: 'rgba(255, 193, 7, 0.12)',
                  border: '1px solid rgba(255, 193, 7, 0.4)',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  color: 'var(--text-main)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertCircle size={16} style={{ color: '#d39e00', flexShrink: 0 }} />
                  <span>{thongBao}</span>
                </div>
              )}

              {/* Nút hành động phía dưới */}
              <div style={{
                marginTop: '1.25rem',
                paddingTop: '1rem',
                borderTop: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '8px'
              }}>
                {onDoiSangCOD ? (
                  <button
                    type="button"
                    onClick={onDoiSangCOD}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.85rem',
                      cursor: 'pointer',
                      textDecoration: 'underline'
                    }}
                  >
                    Đổi sang thanh toán khi nhận hàng (COD)
                  </button>
                ) : <div />}

                <button
                  type="button"
                  disabled={dangKiemTra}
                  onClick={() => kiemTraTrangThai(true)}
                  className="btn btn-primary"
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '6px',
                    fontSize: '0.875rem',
                    fontWeight: 600
                  }}
                >
                  {dangKiemTra ? (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw size={14} className="animate-spin" /> Đang kiểm tra...
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw size={14} /> Tôi đã chuyển khoản
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KhungThanhToanVietQR;
