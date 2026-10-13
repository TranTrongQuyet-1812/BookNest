import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  RotateCcw, 
  BookOpen, 
  ShoppingBag, 
  ArrowRight, 
  Minus,
  ExternalLink,
  Check,
  Truck,
  Search,
  CheckCircle2
} from 'lucide-react';
import api from '../services/api';
import useCartStore from '../stores/cartStore';

const KEY_CHAT_SESSION = 'booknest_chat_history';

// 4 câu hỏi gợi ý nhanh kèm icon chuyên biệt chuẩn phong cách hiệu sách
const CAU_HOI_GOI_Y = [
  { text: 'Gợi ý sách văn học kinh điển', icon: Sparkles },
  { text: 'Sách kỹ năng sống bán chạy', icon: BookOpen },
  { text: 'Chính sách freeship & đổi trả', icon: Truck },
  { text: 'Tra cứu tình trạng đơn hàng', icon: Search }
];

export const ChatbotWidget = () => {
  const navigate = useNavigate();
  const { themVaoGio } = useCartStore();

  const [moChat, setMoChat] = useState(false);
  const [tinNhanMoi, setTinNhanMoi] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [daThemGio, setDaThemGio] = useState({});
  const [thongBaoBadge, setThongBaoBadge] = useState(true);

  // Danh sách tin nhắn trong phiên trò chuyện
  const [danhSachTinNhan, setDanhSachTinNhan] = useState(() => {
    try {
      const luuTru = sessionStorage.getItem(KEY_CHAT_SESSION);
      if (luuTru) return JSON.parse(luuTru);
    } catch {
      // bỏ qua
    }
    return [
      {
        id: 'msg_chao',
        role: 'assistant',
        content: 'Xin chào bạn đọc! Tôi là BookNest AI 📚.\nTôi có thể giúp bạn tìm sách theo thể loại, kiểm tra tồn kho thật, hỗ trợ soạn đơn thanh toán hoặc tra cứu mã đơn hàng BN-XXXXXX.\n\nHôm nay bạn muốn tìm cuốn sách nào?',
        thoiGian: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        duLieuKemTheo: null
      }
    ];
  });

  const tinNhanCuoiRef = useRef(null);
  const inputRef = useRef(null);

  // Lưu hội thoại vào sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY_CHAT_SESSION, JSON.stringify(danhSachTinNhan));
    } catch {
      // bỏ qua
    }
  }, [danhSachTinNhan]);

  // Cuộn tự động
  useEffect(() => {
    if (moChat) {
      tinNhanCuoiRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [danhSachTinNhan, moChat, dangGui]);

  // Focus ô nhập khi mở
  useEffect(() => {
    if (moChat) {
      setThongBaoBadge(false);
      setTimeout(() => inputRef.current?.focus(), 250);
    }
  }, [moChat]);

  // Làm mới cuộc trò chuyện
  const handleLamMoi = () => {
    const tinMoi = [
      {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        content: 'Tôi đã làm mới cuộc trò chuyện. Bạn muốn tìm sách hoặc kiểm tra thông tin gì cùng BookNest AI?',
        thoiGian: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        duLieuKemTheo: null
      }
    ];
    setDanhSachTinNhan(tinMoi);
    sessionStorage.removeItem(KEY_CHAT_SESSION);
  };

  // Gửi tin nhắn
  const handleGuiTinNhan = async (noiDung = null) => {
    const textCanGui = String(noiDung || tinNhanMoi).trim();
    if (!textCanGui || dangGui) return;

    const tinNhanUser = {
      id: 'msg_user_' + Date.now(),
      role: 'user',
      content: textCanGui,
      thoiGian: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    const lichSuCapNhat = [...danhSachTinNhan, tinNhanUser];
    setDanhSachTinNhan(lichSuCapNhat);
    setTinNhanMoi('');
    setDangGui(true);

    try {
      const payloadMessages = lichSuCapNhat.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await api.post('/chat', {
        messages: payloadMessages,
        tinNhan: textCanGui
      });

      const duLieuPhanHoi = res.data?.data;
      const tinNhanAI = {
        id: 'msg_ai_' + Date.now(),
        role: 'assistant',
        content: duLieuPhanHoi?.traLoi || 'Dạ, tôi đã nhận được thông tin từ bạn!',
        thoiGian: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        duLieuKemTheo: duLieuPhanHoi?.duLieuKemTheo || null
      };

      setDanhSachTinNhan([...lichSuCapNhat, tinNhanAI]);
    } catch (err) {
      console.error('Lỗi gửi tin nhắn AI:', err);
      const tinNhanLoi = {
        id: 'msg_err_' + Date.now(),
        role: 'assistant',
        content: err.response?.data?.message || 'Kết nối đến BookNest AI tạm thời bị gián đoạn. Bạn vui lòng thử lại sau ít phút nhé.',
        thoiGian: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        laLoi: true
      };
      setDanhSachTinNhan([...lichSuCapNhat, tinNhanLoi]);
    } finally {
      setDangGui(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleGuiTinNhan();
    }
  };

  // Thêm sách vào giỏ hàng
  const handleThemVaoGio = async (sach) => {
    try {
      await themVaoGio(sach.maSach, 1, {
        TenSach: sach.tenSach,
        GiaBan: sach.giaBan,
        HinhAnh: sach.hinhAnh
      });
      setDaThemGio(prev => ({ ...prev, [sach.maSach]: true }));
      setTimeout(() => {
        setDaThemGio(prev => ({ ...prev, [sach.maSach]: false }));
      }, 2500);
    } catch (err) {
      console.error('Lỗi thêm giỏ từ chat:', err);
    }
  };

  // Chuyển trang thanh toán điền sẵn
  const handleMoThanhToan = (thongTinThanhToan) => {
    if (!thongTinThanhToan) return;
    try {
      if (Array.isArray(thongTinThanhToan.danhSachMon)) {
        thongTinThanhToan.danhSachMon.forEach(mon => {
          themVaoGio(mon.maSach, mon.soLuong || 1, {
            TenSach: mon.tenSach,
            GiaBan: mon.giaBan,
            HinhAnh: mon.hinhAnh
          });
        });
      }

      if (thongTinThanhToan.thongTinNhanHang) {
        sessionStorage.setItem('booknest_checkout_draft', JSON.stringify(thongTinThanhToan.thongTinNhanHang));
      }

      setMoChat(false);
      navigate('/checkout');
    } catch (err) {
      console.error('Lỗi chuyển trang thanh toán:', err);
    }
  };

  return (
    <>
      {/* ================= NÚT FLOATING NỔI (FAB) ================= */}
      <div 
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        {/* Bong bóng chào mời thanh nhã */}
        {!moChat && thongBaoBadge && (
          <div 
            onClick={() => setMoChat(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '9999px',
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              color: 'var(--text-main, #4C4541)',
              fontSize: '0.82rem',
              fontWeight: 600,
              boxShadow: '0 4px 16px rgba(76, 69, 65, 0.12)',
              border: '1px solid var(--border, #E8DCC4)',
              cursor: 'pointer',
              userSelect: 'none',
              transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
          >
            <span 
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: '#10B981',
                boxShadow: '0 0 6px rgba(16, 185, 129, 0.8)'
              }} 
            />
            <span style={{ letterSpacing: '0.01em' }}>Tư vấn cùng BookNest AI</span>
          </div>
        )}

        {/* Nút tròn kích hoạt chính */}
        <button
          onClick={() => setMoChat(!moChat)}
          aria-label={moChat ? 'Đóng trợ lý AI' : 'Mở trợ lý AI BookNest'}
          style={{
            position: 'relative',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #F6C15C 0%, #D97706 100%)',
            color: '#FFFFFF',
            border: '2px solid rgba(255, 255, 255, 0.7)',
            boxShadow: '0 8px 24px rgba(217, 119, 6, 0.35), 0 2px 6px rgba(76, 69, 65, 0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.25s ease',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(217, 119, 6, 0.48)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(217, 119, 6, 0.35)';
          }}
        >
          {moChat ? (
            <X style={{ width: '24px', height: '24px', strokeWidth: 2.2 }} />
          ) : (
            <>
              <MessageSquare style={{ width: '24px', height: '24px', strokeWidth: 1.9 }} />
              <span 
                style={{
                  position: 'absolute',
                  top: '-3px',
                  right: '-3px',
                  width: '18px',
                  height: '18px',
                  backgroundColor: '#10B981',
                  border: '2px solid #FFFFFF',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Sparkles style={{ width: '10px', height: '10px', color: '#FFFFFF', strokeWidth: 2.2 }} />
              </span>
            </>
          )}
        </button>
      </div>

      {/* ================= KHUNG CỬA SỔ TRÒ CHUYỆN ================= */}
      {moChat && (
        <div 
          style={{
            position: 'fixed',
            bottom: '94px',
            right: '24px',
            zIndex: 9999,
            width: '400px',
            maxWidth: 'calc(100vw - 32px)',
            height: '580px',
            maxHeight: 'calc(100vh - 120px)',
            borderRadius: '16px',
            backgroundColor: 'var(--bg-card, #FFFFFF)',
            border: '1px solid var(--border, #E8DCC4)',
            boxShadow: '0 18px 48px rgba(76, 69, 65, 0.2), 0 4px 12px rgba(76, 69, 65, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            fontFamily: 'var(--font-sans)',
            animation: 'fadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)'
          }}
        >
          {/* Header Cửa Sổ */}
          <div 
            style={{
              padding: '12px 16px',
              background: 'linear-gradient(135deg, #4C4541 0%, #352F2D 100%)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(0, 0, 0, 0.12)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #F6C15C, #D97706)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.4)'
                }}
              >
                <Sparkles style={{ width: '18px', height: '18px', color: '#FFFFFF', strokeWidth: 2 }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, letterSpacing: '-0.01em' }}>BookNest AI</h3>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                </div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#FDF4E1', opacity: 0.82 }}>Trợ lý tư vấn & hỗ trợ bạn đọc</p>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
              <button
                onClick={handleLamMoi}
                title="Làm mới cuộc trò chuyện"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FDF4E1',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.85,
                  transition: 'opacity 0.15s, background-color 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <RotateCcw style={{ width: '15px', height: '15px', strokeWidth: 1.9 }} />
              </button>
              <button
                onClick={() => setMoChat(false)}
                title="Thu nhỏ"
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#FDF4E1',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.85,
                  transition: 'opacity 0.15s, background-color 0.15s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Minus style={{ width: '16px', height: '16px', strokeWidth: 2.2 }} />
              </button>
            </div>
          </div>

          {/* Body Tin Nhắn (Scrollable) */}
          <div 
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: 'var(--bg-app, #FCF0DA)'
            }}
          >
            {danhSachTinNhan.map((msg) => (
              <div
                key={msg.id}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start'
                }}
              >
                {/* Bong bóng tin nhắn */}
                <div
                  style={{
                    maxWidth: '85%',
                    padding: '10px 14px',
                    borderRadius: msg.role === 'user' ? '14px 14px 2px 14px' : '14px 14px 14px 2px',
                    backgroundColor: msg.role === 'user' ? 'var(--primary-dark, #4C4541)' : 'var(--bg-card, #FFFFFF)',
                    color: msg.role === 'user' ? '#FFFFFF' : 'var(--text-main, #4C4541)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border, #E8DCC4)',
                    boxShadow: '0 1px 3px rgba(76, 69, 65, 0.05)',
                    fontSize: '0.86rem',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {msg.content}
                </div>

                {/* Thẻ Sách Gợi Ý Tương Tác (từ tool tim_sach) */}
                {msg.duLieuKemTheo?.danhSachSach && msg.duLieuKemTheo.danhSachSach.length > 0 && (
                  <div style={{ width: '100%', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ margin: '2px 0', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <BookOpen style={{ width: '13px', height: '13px', color: 'var(--price, #B45309)', strokeWidth: 1.9 }} /> 
                      Tác phẩm tìm thấy trong kho sách:
                    </p>
                    {msg.duLieuKemTheo.danhSachSach.map((sach) => (
                      <div
                        key={sach.maSach}
                        style={{
                          padding: '10px',
                          borderRadius: '12px',
                          backgroundColor: 'var(--bg-card, #FFFFFF)',
                          border: '1px solid var(--border, #E8DCC4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '10px',
                          boxShadow: '0 2px 6px rgba(76, 69, 65, 0.04)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
                          {sach.hinhAnh ? (
                            <img
                              src={sach.hinhAnh}
                              alt={sach.tenSach}
                              style={{ 
                                width: '42px', 
                                height: '58px', 
                                objectFit: 'cover', 
                                borderRadius: '4px', 
                                border: '1px solid var(--border)',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.08)'
                              }}
                            />
                          ) : (
                            <div style={{ width: '42px', height: '58px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <BookOpen style={{ width: '18px', height: '18px', color: 'var(--primary)', strokeWidth: 1.8 }} />
                            </div>
                          )}
                          <div style={{ minWidth: 0 }}>
                            <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '175px' }}>
                              {sach.tenSach}
                            </h4>
                            <p style={{ margin: '2px 0', fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '175px' }}>
                              {sach.tacGia || 'Nhiều tác giả'}
                            </p>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--price, #B45309)' }}>
                                {Number(sach.giaBan || 0).toLocaleString('vi-VN')}đ
                              </span>
                              {sach.conHang ? (
                                <span style={{ fontSize: '0.68rem', color: '#10B981', fontWeight: 600 }}>• Còn hàng</span>
                              ) : (
                                <span style={{ fontSize: '0.68rem', color: 'var(--text-sub)' }}>• Hết hàng</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flexShrink: 0 }}>
                          <button
                            onClick={() => {
                              setMoChat(false);
                              navigate(`/books/${sach.maSach}`);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              borderRadius: '6px',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-main)',
                              border: '1px solid var(--border)',
                              cursor: 'pointer'
                            }}
                          >
                            <ExternalLink style={{ width: '11px', height: '11px', strokeWidth: 2 }} /> Xem
                          </button>
                          <button
                            disabled={!sach.conHang}
                            onClick={() => handleThemVaoGio(sach)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              padding: '4px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              borderRadius: '6px',
                              backgroundColor: daThemGio[sach.maSach] ? '#10B981' : 'var(--primary, #F2C46A)',
                              color: daThemGio[sach.maSach] ? '#FFFFFF' : 'var(--primary-text, #4C4541)',
                              border: 'none',
                              cursor: sach.conHang ? 'pointer' : 'not-allowed',
                              opacity: sach.conHang ? 1 : 0.5,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {daThemGio[sach.maSach] ? (
                              <>
                                <Check style={{ width: '11px', height: '11px', strokeWidth: 2.5 }} /> Đã thêm
                              </>
                            ) : (
                              <>
                                <ShoppingBag style={{ width: '11px', height: '11px', strokeWidth: 2 }} /> + Giỏ
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Thẻ Bản Nháp Thanh Toán (từ tool soan_thong_tin_thanh_toan) */}
                {msg.duLieuKemTheo?.thongTinThanhToan && (
                  <div 
                    style={{
                      width: '100%',
                      marginTop: '6px',
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--primary-light, #FDF4E1)',
                      border: '1px dashed var(--primary, #F2C46A)',
                      boxShadow: '0 2px 8px rgba(217, 119, 6, 0.08)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid rgba(232, 220, 196, 0.8)' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShoppingBag style={{ width: '14px', height: '14px', color: '#B45309', strokeWidth: 2 }} /> Bản nháp thanh toán
                      </span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 600, color: msg.duLieuKemTheo.thongTinThanhToan.mienPhiShip ? '#10B981' : '#B45309' }}>
                        {msg.duLieuKemTheo.thongTinThanhToan.mienPhiShip ? 'Freeship 0đ' : '+25k Phí ship'}
                      </span>
                    </div>

                    <div style={{ padding: '8px 0', fontSize: '0.8rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                        <span>Tựa sách chọn:</span>
                        <span>{msg.duLieuKemTheo.thongTinThanhToan.danhSachMon?.length || 1} tác phẩm</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--text-main)' }}>
                        <span>Tổng tiền dự kiến:</span>
                        <span style={{ color: 'var(--price, #B45309)' }}>
                          {Number(msg.duLieuKemTheo.thongTinThanhToan.tongTien || 0).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleMoThanhToan(msg.duLieuKemTheo.thongTinThanhToan)}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        backgroundColor: 'var(--primary-dark, #4C4541)',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background-color 0.15s ease'
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#38322F'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'var(--primary-dark, #4C4541)'; }}
                    >
                      Mở trang thanh toán điền sẵn <ArrowRight style={{ width: '14px', height: '14px', strokeWidth: 2 }} />
                    </button>
                  </div>
                )}

                {/* Thẻ Tra Cứu Đơn Hàng (từ tool tra_cuu_don_hang) */}
                {msg.duLieuKemTheo?.thongTinDonHang && (
                  <div 
                    style={{
                      width: '100%',
                      marginTop: '6px',
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-card, #FFFFFF)',
                      border: '1px solid var(--border, #E8DCC4)',
                      fontSize: '0.8rem',
                      boxShadow: '0 2px 6px rgba(76, 69, 65, 0.04)'
                    }}
                  >
                    {msg.duLieuKemTheo.thongTinDonHang.maTraCuu ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--price, #B45309)', fontSize: '0.85rem' }}>
                            {msg.duLieuKemTheo.thongTinDonHang.maTraCuu}
                          </span>
                          <span style={{ padding: '2px 8px', borderRadius: '12px', backgroundColor: 'var(--bg-surface)', fontWeight: 600, fontSize: '0.72rem', color: 'var(--text-main)' }}>
                            {msg.duLieuKemTheo.thongTinDonHang.trangThai}
                          </span>
                        </div>
                        <div style={{ paddingTop: '6px', display: 'flex', flexDirection: 'column', gap: '3px', color: 'var(--text-muted)' }}>
                          <p style={{ margin: 0 }}>Tổng đơn: <strong style={{ color: 'var(--text-main)' }}>{Number(msg.duLieuKemTheo.thongTinDonHang.tongTien || 0).toLocaleString('vi-VN')}đ</strong></p>
                          <p style={{ margin: 0 }}>Thanh toán: {msg.duLieuKemTheo.thongTinDonHang.phuongThucThanhToan}</p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                <span style={{ fontSize: '0.68rem', color: 'var(--text-sub)', marginTop: '4px', padding: '0 4px' }}>
                  {msg.thoiGian}
                </span>
              </div>
            ))}

            {/* Hiệu ứng đang tra cứu (Typing indicator) */}
            {dangGui && (
              <div 
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '14px 14px 14px 2px',
                  backgroundColor: 'var(--bg-card, #FFFFFF)',
                  border: '1px solid var(--border, #E8DCC4)',
                  width: 'fit-content',
                  fontSize: '0.78rem',
                  color: 'var(--text-muted)'
                }}
              >
                <Sparkles style={{ width: '13px', height: '13px', color: 'var(--primary, #D97706)', strokeWidth: 2 }} />
                <span>BookNest AI đang tra cứu kho sách...</span>
              </div>
            )}

            <div ref={tinNhanCuoiRef} />
          </div>

          {/* Gợi Ý Nhanh (Quick Chips) với Icon Đồng Bộ */}
          <div 
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--bg-surface, #F5E8CD)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap'
            }}
          >
            {CAU_HOI_GOI_Y.map((item, idx) => {
              const IconComponent = item.icon;
              return (
                <button
                  key={idx}
                  disabled={dangGui}
                  onClick={() => handleGuiTinNhan(item.text)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '5px 10px',
                    borderRadius: '16px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    backgroundColor: 'var(--bg-card, #FFFFFF)',
                    color: 'var(--text-main, #4C4541)',
                    border: '1px solid var(--border, #E8DCC4)',
                    cursor: 'pointer',
                    flexShrink: 0,
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--primary-light, #FDF4E1)';
                    e.currentTarget.style.borderColor = 'var(--primary, #F2C46A)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-card, #FFFFFF)';
                    e.currentTarget.style.borderColor = 'var(--border, #E8DCC4)';
                  }}
                >
                  <IconComponent style={{ width: '12px', height: '12px', color: 'var(--primary, #D97706)', strokeWidth: 2 }} />
                  <span>{item.text}</span>
                </button>
              );
            })}
          </div>

          {/* Footer Input */}
          <div 
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--bg-card, #FFFFFF)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '4px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                ref={inputRef}
                type="text"
                value={tinNhanMoi}
                disabled={dangGui}
                onChange={(e) => setTinNhanMoi(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Hỏi về sách, tồn kho, đơn hàng..."
                maxLength={500}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  fontSize: '0.82rem',
                  borderRadius: '22px',
                  backgroundColor: 'var(--bg-app, #FCF0DA)',
                  color: 'var(--text-main, #4C4541)',
                  border: '1px solid var(--border, #E8DCC4)',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary, #D97706)';
                  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(217, 119, 6, 0.15)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border, #E8DCC4)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                onClick={() => handleGuiTinNhan()}
                disabled={dangGui || !tinNhanMoi.trim()}
                title="Gửi tin nhắn"
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--primary-dark, #4C4541)',
                  color: '#FFFFFF',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (!dangGui && tinNhanMoi.trim()) ? 'pointer' : 'not-allowed',
                  opacity: (!dangGui && tinNhanMoi.trim()) ? 1 : 0.4,
                  transition: 'transform 0.15s ease, background-color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!dangGui && tinNhanMoi.trim()) e.currentTarget.style.transform = 'scale(1.05)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Send style={{ width: '14px', height: '14px', strokeWidth: 2 }} />
              </button>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.65rem', color: 'var(--text-sub)', textAlign: 'center' }}>
              BookNest AI chỉ tư vấn & soạn nháp. Khách hàng kiểm tra lại thông tin trước khi thanh toán.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
