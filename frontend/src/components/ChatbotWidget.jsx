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
  Search
} from 'lucide-react';
import api from '../services/api';
import useCartStore from '../stores/cartStore';
import { useAuth } from '../context/AuthContext';
import { loiTuApi } from '@booknest/shared/thongbao';

const KEY_CHAT_SESSION = 'booknest_chat_history';

// 4 câu hỏi gợi ý nhanh kèm icon chuyên biệt
const CAU_HOI_GOI_Y = [
  { text: 'Gợi ý sách văn học kinh điển', icon: Sparkles },
  { text: 'Sách kỹ năng sống bán chạy', icon: BookOpen },
  { text: 'Chính sách freeship & đổi trả', icon: Truck },
  { text: 'Tra cứu tình trạng đơn hàng', icon: Search }
];

/**
 * Chuẩn hóa nội dung phản hồi (bóc tách nếu tin nhắn bị bọc JSON type: text)
 */
const chuanHoaNoiDungAI = (noiDung) => {
  if (!noiDung) return '';
  if (typeof noiDung !== 'string') {
    if (Array.isArray(noiDung)) {
      return noiDung
        .map(item => item?.text || (typeof item === 'string' ? item : ''))
        .filter(Boolean)
        .join('\n')
        .trim();
    }
    if (typeof noiDung === 'object' && noiDung.text) {
      return String(noiDung.text).trim();
    }
    return String(noiDung);
  }

  const trimmed = noiDung.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        const textParts = parsed
          .map(item => item?.text || (typeof item === 'string' ? item : ''))
          .filter(Boolean);
        if (textParts.length > 0) return textParts.join('\n').trim();
      } else if (parsed && typeof parsed === 'object') {
        if (parsed.text) return String(parsed.text).trim();
        if (parsed.content) return chuanHoaNoiDungAI(parsed.content);
        if (parsed.message) return chuanHoaNoiDungAI(parsed.message);
        if (parsed.name || parsed.parameters) return '';
      }
    } catch {
      // Giữ nguyên chuỗi
    }
  }

  return trimmed;
};

export const ChatbotWidget = () => {
  const navigate = useNavigate();
  const { themVaoGio } = useCartStore();
  const { theme } = useAuth();
  const laDark = theme === 'dark';

  const [moChat, setMoChat] = useState(false);
  const [tinNhanMoi, setTinNhanMoi] = useState('');
  const [dangGui, setDangGui] = useState(false);
  const [trangThaiDangXuLy, setTrangThaiDangXuLy] = useState('BookNest AI đang soạn câu trả lời...');
  const [daThemGio, setDaThemGio] = useState({});

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
        content: 'Xin chào bạn đọc! Tôi là BookNest AI 📚 (vận hành bởi mô hình đám mây NVIDIA NIM).\nTôi có thể giúp bạn tìm sách theo thể loại, kiểm tra tồn kho thật, hỗ trợ soạn đơn hoặc tra cứu mã đơn hàng BN-XXXXXX.\n\n💡 Lưu ý: Dữ liệu trò chuyện được xử lý qua AI đám mây, vui lòng không chia sẻ mật khẩu hoặc thông tin thẻ ngân hàng.\n\nHôm nay bạn muốn tìm cuốn sách nào?',
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

    // Xác định thông điệp trạng thái phù hợp ngữ cảnh câu hỏi
    const textLower = textCanGui.toLowerCase();
    let thongBao = 'BookNest AI đang soạn câu trả lời...';
    if (/(\bđơn\b|\bbn-|\btra cứu\b|\bvận chuyển\b|\bkiểm tra đơn\b)/i.test(textLower)) {
      thongBao = 'BookNest AI đang kiểm tra thông tin đơn hàng...';
    } else if (/(\btìm\b|\btựa sách\b|\bcuốn sách\b|\btác giả\b|\bkho sách\b|\bgiá\b|\btồn kho\b|\bthể loại\b)/i.test(textLower)) {
      thongBao = 'BookNest AI đang tra cứu kho sách...';
    } else if (/(\bthanh toán\b|\bmua\b|\bđặt sách\b|\bgiỏ hàng\b)/i.test(textLower)) {
      thongBao = 'BookNest AI đang soạn thông tin thanh toán...';
    } else {
      thongBao = 'BookNest AI đang suy nghĩ câu trả lời...';
    }
    setTrangThaiDangXuLy(thongBao);

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
      const payloadMessages = lichSuCapNhat
        .map(m => ({
          role: m.role,
          content: m.content
        }))
        .slice(-8);

      const res = await api.post('/chat', {
        messages: payloadMessages,
        tinNhan: textCanGui
      });

      const duLieuPhanHoi = res.data?.data;
      const tinNhanAI = {
        id: 'msg_ai_' + Date.now(),
        role: 'assistant',
        content: chuanHoaNoiDungAI(duLieuPhanHoi?.traLoi) || 'Dạ, tôi đã nhận được thông tin từ bạn!',
        thoiGian: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        duLieuKemTheo: duLieuPhanHoi?.duLieuKemTheo || null
      };

      setDanhSachTinNhan([...lichSuCapNhat, tinNhanAI]);

      // Nếu AI trả về hành động thêm giỏ hàng (dành cho User đã đăng nhập)
      if (duLieuPhanHoi?.duLieuKemTheo?.themVaoGioHang) {
        const item = duLieuPhanHoi.duLieuKemTheo.themVaoGioHang;
        try {
          await themVaoGio(item.maSach, item.soLuong || 1, {
            TenSach: item.tenSach,
            GiaBan: item.giaBan,
            HinhAnh: item.hinhAnh
          });
          if (item.chuyenTrangGioHang) {
            setTimeout(() => {
              setMoChat(false);
              navigate('/cart');
            }, 800);
          }
        } catch (e) {
          console.error('Lỗi tự động thêm giỏ từ AI:', e);
        }
      }
    } catch (err) {
      console.error('Lỗi gửi tin nhắn AI:', err);
      const tinNhanLoi = {
        id: 'msg_err_' + Date.now(),
        role: 'assistant',
        content: loiTuApi(err, 'Kết nối đến BookNest AI tạm thời bị gián đoạn. Bạn vui lòng thử lại sau ít phút nhé.'),
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

  // Shadow theo theme
  const shadowFab = laDark
    ? '0 8px 26px rgba(97, 45, 83, 0.55), 0 2px 8px rgba(0, 0, 0, 0.4)'
    : '0 8px 24px rgba(217, 119, 6, 0.38), 0 2px 6px rgba(76, 69, 65, 0.12)';

  const mauIconChip = laDark ? '#F2C46A' : '#7C2D12';
  const bgChip = laDark ? '#3A3238' : '#FFFFFF';
  const borderChip = laDark ? '#63535F' : '#E8DCC4';

  return (
    <>
      {/* ================= NÚT FLOATING NỔI (FAB DUY NHẤT) ================= */}
      <div 
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center'
        }}
      >
        <button
          onClick={() => setMoChat(!moChat)}
          aria-label={moChat ? 'Đóng trợ lý AI' : 'Mở trợ lý AI BookNest'}
          style={{
            position: 'relative',
            width: '58px',
            height: '58px',
            borderRadius: '50%',
            color: '#FFFFFF',
            border: laDark ? '2px solid rgba(243, 244, 244, 0.45)' : '2px solid rgba(255, 255, 255, 0.75)',
            boxShadow: shadowFab,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden',
            outline: 'none',
            // Đồng bộ độ trễ vết mực loang 800ms và chuyển màu chậm êm đềm 1600ms
            transition: 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms, border-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          {/* Layer 1: Light Gradient (Vàng Hổ Phách) */}
          <span 
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, #F6C15C 0%, #D97706 100%)',
              opacity: laDark ? 0 : 1,
              transition: 'opacity 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms',
              pointerEvents: 'none'
            }}
          />

          {/* Layer 2: Dark Gradient (Đỏ Rượu Vang & Tím Mận Đêm) */}
          <span 
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(135deg, #9E4463 0%, #612D53 100%)',
              opacity: laDark ? 1 : 0,
              transition: 'opacity 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms',
              pointerEvents: 'none'
            }}
          />

          {/* Nội dung icon nổi sắc nét ở tầng trên */}
          <span style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {moChat ? (
              <X style={{ width: '25px', height: '25px', strokeWidth: 2.3 }} />
            ) : (
              <MessageSquare style={{ width: '25px', height: '25px', strokeWidth: 2.1 }} />
            )}
          </span>
        </button>
      </div>

      {/* ================= KHUNG CỬA SỔ TRÒ CHUYỆN ================= */}
      {moChat && (
        <div 
          data-lenis-prevent
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
            boxShadow: laDark 
              ? '0 20px 50px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(243, 244, 244, 0.12)' 
              : '0 18px 48px rgba(76, 69, 65, 0.2), 0 4px 12px rgba(76, 69, 65, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            overscrollBehavior: 'contain',
            fontFamily: 'var(--font-sans)',
            animation: 'fadeIn 0.22s cubic-bezier(0.16, 1, 0.3, 1)',
            // Chuyển màu êm đềm đồng bộ sóng mực
            transition: 'background-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms, border-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms, box-shadow 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms'
          }}
        >
          {/* Header Cửa Sổ */}
          <div 
            style={{
              position: 'relative',
              padding: '12px 16px',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid rgba(0, 0, 0, 0.15)',
              overflow: 'hidden'
            }}
          >
            {/* Header Layer Light */}
            <span 
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, #4C4541 0%, #352F2D 100%)',
                opacity: laDark ? 0 : 1,
                transition: 'opacity 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms',
                pointerEvents: 'none'
              }}
            />

            {/* Header Layer Dark */}
            <span 
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(135deg, #612D53 0%, #3A1E32 100%)',
                opacity: laDark ? 1 : 0,
                transition: 'opacity 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms',
                pointerEvents: 'none'
              }}
            />

            <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div 
                style={{
                  position: 'relative',
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  overflow: 'hidden',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'inset 0 1px 2px rgba(255, 255, 255, 0.4)'
                }}
              >
                <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #F6C15C, #D97706)', opacity: laDark ? 0 : 1, transition: 'opacity 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms' }} />
                <span style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #9E4463, #612D53)', opacity: laDark ? 1 : 0, transition: 'opacity 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms' }} />
                <Sparkles style={{ position: 'relative', zIndex: 2, width: '18px', height: '18px', color: '#FFFFFF', strokeWidth: 2 }} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <h3 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, letterSpacing: '-0.01em', color: '#FFFFFF' }}>BookNest AI</h3>
                  <span style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#10B981', boxShadow: '0 0 6px #10B981' }} />
                </div>
                <p style={{ margin: 0, fontSize: '0.72rem', color: '#FDF4E1', opacity: 0.85 }}>Trợ lý tư vấn & hỗ trợ bạn đọc (NVIDIA NIM)</p>
              </div>
            </div>

            {/* Các nút hành động Header */}
            <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <button
                onClick={handleLamMoi}
                title="Làm mới cuộc trò chuyện"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#FFFFFF',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'; }}
              >
                <RotateCcw style={{ width: '15px', height: '15px', strokeWidth: 2.2, color: '#FFFFFF' }} />
              </button>
              <button
                onClick={() => setMoChat(false)}
                title="Thu nhỏ"
                style={{
                  background: 'rgba(255, 255, 255, 0.15)',
                  border: '1px solid rgba(255, 255, 255, 0.25)',
                  color: '#FFFFFF',
                  padding: '6px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.3)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.15)'; }}
              >
                <Minus style={{ width: '15px', height: '15px', strokeWidth: 2.5, color: '#FFFFFF' }} />
              </button>
            </div>
          </div>

          {/* Thông báo minh bạch về AI điện toán đám mây (NVIDIA NIM) */}
          <div style={{
            padding: '6px 12px',
            backgroundColor: laDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(180, 83, 9, 0.05)',
            borderBottom: '1px solid var(--border)',
            fontSize: '0.68rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ fontSize: '0.75rem' }}>💡</span>
            <span>Hội thoại xử lý qua AI đám mây (NVIDIA NIM). Vui lòng không chia sẻ dữ liệu thẻ ngân hàng hay mật khẩu.</span>
          </div>

          {/* Body Tin Nhắn (Scrollable) */}
          <div 
            data-lenis-prevent
            className="chat-scrollbar"
            style={{
              flex: 1,
              overflowY: 'auto',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              backgroundColor: 'var(--bg-app, #FCF0DA)',
              overscrollBehavior: 'contain',
              transition: 'background-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms'
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
                    backgroundColor: msg.role === 'user' 
                      ? (laDark ? '#853953' : 'var(--primary-dark, #4C4541)') 
                      : 'var(--bg-card, #FFFFFF)',
                    color: msg.role === 'user' ? '#FFFFFF' : 'var(--text-main, #4C4541)',
                    border: msg.role === 'user' ? 'none' : '1px solid var(--border, #E8DCC4)',
                    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.06)',
                    fontSize: '0.86rem',
                    lineHeight: 1.55,
                    whiteSpace: 'pre-wrap',
                    transition: 'background-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms, color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms, border-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms'
                  }}
                >
                  {chuanHoaNoiDungAI(msg.content)}
                </div>

                {/* Thẻ Sách Gợi Ý Tương Tác */}
                {msg.duLieuKemTheo?.danhSachSach && msg.duLieuKemTheo.danhSachSach.length > 0 && (
                  <div style={{ width: '100%', marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ margin: '2px 0', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <BookOpen style={{ width: '13px', height: '13px', color: 'var(--price, #B45309)', strokeWidth: 2 }} /> 
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
                          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                          transition: 'background-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms, border-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms'
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
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                              }}
                            />
                          ) : (
                            <div style={{ width: '42px', height: '58px', backgroundColor: 'var(--bg-surface)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <BookOpen style={{ width: '18px', height: '18px', color: 'var(--primary)', strokeWidth: 2 }} />
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
                              padding: '5px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              borderRadius: '6px',
                              backgroundColor: 'var(--bg-surface)',
                              color: 'var(--text-main)',
                              border: '1px solid var(--border)',
                              cursor: 'pointer'
                            }}
                          >
                            <ExternalLink style={{ width: '12px', height: '12px', strokeWidth: 2.2, color: 'var(--text-main)' }} /> Xem
                          </button>
                          <button
                            disabled={!sach.conHang}
                            onClick={() => handleThemVaoGio(sach)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '4px',
                              padding: '5px 8px',
                              fontSize: '0.72rem',
                              fontWeight: 600,
                              borderRadius: '6px',
                              backgroundColor: daThemGio[sach.maSach] 
                                ? '#10B981' 
                                : (laDark ? '#853953' : 'var(--primary, #F2C46A)'),
                              color: daThemGio[sach.maSach] 
                                ? '#FFFFFF' 
                                : (laDark ? '#FFFFFF' : 'var(--primary-text, #4C4541)'),
                              border: 'none',
                              cursor: sach.conHang ? 'pointer' : 'not-allowed',
                              opacity: sach.conHang ? 1 : 0.5,
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {daThemGio[sach.maSach] ? (
                              <>
                                <Check style={{ width: '12px', height: '12px', strokeWidth: 2.5 }} /> Đã thêm
                              </>
                            ) : (
                              <>
                                <ShoppingBag style={{ width: '12px', height: '12px', strokeWidth: 2.2 }} /> + Giỏ
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Thẻ Xác Nhận Đã Thêm Vào Giỏ Hàng (Dành cho User) */}
                {msg.duLieuKemTheo?.themVaoGioHang && (
                  <div
                    style={{
                      width: '100%',
                      marginTop: '6px',
                      padding: '10px 12px',
                      borderRadius: '12px',
                      backgroundColor: laDark ? '#483E46' : 'var(--primary-light, #FDF4E1)',
                      border: laDark ? '1px solid #853953' : '1px solid var(--primary, #F2C46A)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px',
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                      transition: 'background-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms, border-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Check style={{ width: '16px', height: '16px', color: '#FFFFFF', strokeWidth: 2.5 }} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          Đã thêm: {msg.duLieuKemTheo.themVaoGioHang.tenSach}
                        </p>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Số lượng: {msg.duLieuKemTheo.themVaoGioHang.soLuong} cuốn • {Number(msg.duLieuKemTheo.themVaoGioHang.giaBan || 0).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setMoChat(false);
                        navigate('/cart');
                      }}
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.74rem',
                        fontWeight: 600,
                        borderRadius: '6px',
                        backgroundColor: laDark ? '#853953' : 'var(--primary-dark, #4C4541)',
                        color: '#FFFFFF',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        flexShrink: 0,
                        transition: 'background-color 0.15s ease'
                      }}
                    >
                      Xem giỏ <ArrowRight style={{ width: '13px', height: '13px', strokeWidth: 2.2 }} />
                    </button>
                  </div>
                )}

                {/* Thẻ Bản Nháp Thanh Toán */}
                {msg.duLieuKemTheo?.thongTinThanhToan && (
                  <div 
                    style={{
                      width: '100%',
                      marginTop: '6px',
                      padding: '12px',
                      borderRadius: '12px',
                      backgroundColor: laDark ? '#4A2837' : 'var(--primary-light, #FDF4E1)',
                      border: laDark ? '1px dashed #853953' : '1px dashed var(--primary, #F2C46A)',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                      transition: 'background-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms, border-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '8px', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <ShoppingBag style={{ width: '15px', height: '15px', color: laDark ? '#F2C46A' : '#B45309', strokeWidth: 2.2 }} /> Bản nháp thanh toán
                      </span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 600, color: msg.duLieuKemTheo.thongTinThanhToan.mienPhiShip ? '#10B981' : 'var(--price)' }}>
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
                        backgroundColor: laDark ? '#853953' : 'var(--primary-dark, #4C4541)',
                        color: '#FFFFFF',
                        fontWeight: 600,
                        fontSize: '0.8rem',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        transition: 'background-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms'
                      }}
                    >
                      Mở trang thanh toán điền sẵn <ArrowRight style={{ width: '14px', height: '14px', strokeWidth: 2.2 }} />
                    </button>
                  </div>
                )}

                {/* Thẻ Tra Cứu Đơn Hàng */}
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
                      boxShadow: '0 2px 6px rgba(0, 0, 0, 0.05)',
                      transition: 'background-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms, border-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms'
                    }}
                  >
                    {msg.duLieuKemTheo.thongTinDonHang.maTraCuu ? (
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '6px', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--price, #B45309)', fontSize: '0.88rem' }}>
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

            {/* Hiệu ứng đang xử lý (Typing indicator) */}
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
                  color: 'var(--text-muted)',
                  boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
                  transition: 'background-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms'
                }}
              >
                <Sparkles style={{ width: '14px', height: '14px', color: laDark ? '#F2C46A' : '#D97706', strokeWidth: 2.2 }} />
                <span>{trangThaiDangXuLy}</span>
              </div>
            )}

            <div ref={tinNhanCuoiRef} />
          </div>

          {/* Gợi Ý Nhanh (Quick Chips): TƯƠNG PHẢN RỰC RỠ & CUỘN CON LĂN CHUỘT NGANG */}
          <div 
            data-lenis-prevent
            className="no-scrollbar"
            onWheel={(e) => {
              if (e.deltaY !== 0) {
                e.currentTarget.scrollLeft += e.deltaY;
              }
            }}
            style={{
              padding: '8px 12px',
              backgroundColor: 'var(--bg-surface, #F5E8CD)',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              gap: '6px',
              overflowX: 'auto',
              whiteSpace: 'nowrap',
              overscrollBehavior: 'contain',
              transition: 'background-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms, border-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms'
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
                    gap: '6px',
                    padding: '5px 11px',
                    borderRadius: '16px',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    backgroundColor: bgChip,
                    color: 'var(--text-main, #4C4541)',
                    border: `1px solid ${borderChip}`,
                    cursor: 'pointer',
                    flexShrink: 0,
                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = laDark ? '#483E46' : 'var(--primary-light, #FDF4E1)';
                    e.currentTarget.style.borderColor = laDark ? '#853953' : 'var(--primary, #F2C46A)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = bgChip;
                    e.currentTarget.style.borderColor = borderChip;
                  }}
                >
                  <IconComponent style={{ width: '13px', height: '13px', color: mauIconChip, strokeWidth: 2.2 }} />
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
              gap: '4px',
              transition: 'background-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms, border-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms'
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
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease, background-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms, color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = laDark ? '#853953' : 'var(--primary, #D97706)';
                  e.currentTarget.style.boxShadow = laDark 
                    ? '0 0 0 2px rgba(133, 57, 83, 0.35)' 
                    : '0 0 0 2px rgba(217, 119, 6, 0.2)';
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
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: laDark 
                    ? '#853953' 
                    : 'var(--primary-dark, #4C4541)',
                  color: '#FFFFFF',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: (!dangGui && tinNhanMoi.trim()) ? 'pointer' : 'not-allowed',
                  opacity: (!dangGui && tinNhanMoi.trim()) ? 1 : 0.4,
                  boxShadow: laDark ? '0 2px 8px rgba(133, 57, 83, 0.4)' : '0 2px 6px rgba(76, 69, 65, 0.2)',
                  transition: 'transform 0.15s ease, background-color 1600ms cubic-bezier(0.4, 0, 0.2, 1) 800ms'
                }}
                onMouseEnter={(e) => {
                  if (!dangGui && tinNhanMoi.trim()) e.currentTarget.style.transform = 'scale(1.08)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                }}
              >
                <Send style={{ width: '16px', height: '16px', strokeWidth: 2.3, color: '#FFFFFF' }} />
              </button>
            </div>
            <p style={{ margin: '2px 0 0 0', fontSize: '0.65rem', color: 'var(--text-sub)', textAlign: 'center' }}>
              BookNest AI chỉ tư vấn & soạn nháp. Bạn luôn kiểm tra lại ở bước thanh toán.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
