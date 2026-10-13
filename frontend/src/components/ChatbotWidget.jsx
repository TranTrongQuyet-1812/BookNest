import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MessageSquare, 
  X, 
  Send, 
  Sparkles, 
  RefreshCw, 
  BookOpen, 
  ShoppingBag, 
  ArrowRight,
  Minimize2
} from 'lucide-react';
import api from '../services/api';
import useCartStore from '../stores/cartStore';

const KEY_CHAT_SESSION = 'booknest_chat_history';

const CAU_HOI_GOI_Y = [
  'Gợi ý sách văn học kinh điển',
  'Sách kỹ năng sống hay nhất',
  'Chính sách freeship và đổi trả',
  'Tra cứu đơn hàng'
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
      // Bỏ qua lỗi parse
    }
    return [
      {
        id: 'msg_chao',
        role: 'assistant',
        content: 'Xin chào! Tôi là BookNest AI 📚. Tôi có thể giúp bạn tìm sách theo sở thích, kiểm tra tồn kho, gợi ý sách theo cảm xúc hoặc tra cứu đơn hàng. Hôm nay bạn muốn khám phá cuốn sách nào?',
        thoiGian: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        duLieuKemTheo: null
      }
    ];
  });

  const tinNhanCuoiRef = useRef(null);
  const inputRef = useRef(null);

  // Tự động lưu lịch sử vào sessionStorage
  useEffect(() => {
    try {
      sessionStorage.setItem(KEY_CHAT_SESSION, JSON.stringify(danhSachTinNhan));
    } catch {
      // bỏ qua
    }
  }, [danhSachTinNhan]);

  // Tự động cuộn xuống tin nhắn mới nhất
  useEffect(() => {
    if (moChat) {
      tinNhanCuoiRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [danhSachTinNhan, moChat, dangGui]);

  // Focus vào ô nhập khi mở chat
  useEffect(() => {
    if (moChat) {
      setThongBaoBadge(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [moChat]);

  // Xóa lịch sử làm mới hội thoại
  const handleLamMoi = () => {
    const tinMoi = [
      {
        id: 'msg_' + Date.now(),
        role: 'assistant',
        content: 'Tôi đã làm mới cuộc trò chuyện. Hãy cho tôi biết nhu cầu đọc sách hoặc câu hỏi của bạn nhé!',
        thoiGian: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        duLieuKemTheo: null
      }
    ];
    setDanhSachTinNhan(tinMoi);
    sessionStorage.removeItem(KEY_CHAT_SESSION);
  };

  // Gửi tin nhắn đến server
  const handleGuiTinNhan = async (noiDung = null) => {
    const textCanGui = String(noiDung || tinNhanMoi).trim();
    if (!textCanGui || dangGui) return;

    const tinNhanUser = {
      id: 'msg_user_' + Date.now(),
      role: 'user',
      content: textCanGui,
      thoiGian: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    // Cập nhật UI ngay lập tức
    const lichSuCapNhat = [...danhSachTinNhan, tinNhanUser];
    setDanhSachTinNhan(lichSuCapNhat);
    setTinNhanMoi('');
    setDangGui(true);

    try {
      // Lọc các tin nhắn dạng text hợp lệ để gửi cho server AI
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
        content: err.response?.data?.message || 'Xin lỗi bạn, kết nối đến BookNest AI đang bị gián đoạn. Bạn vui lòng thử lại sau ít phút nhé.',
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

  // Thêm sách vào giỏ từ thẻ sách
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

  // Mở trang thanh toán từ bản nháp do AI soạn
  const handleMoThanhToan = (thongTinThanhToan) => {
    if (!thongTinThanhToan) return;
    try {
      // 1. Đảm bảo các sách trong bản nháp đã được nạp vào giỏ
      if (Array.isArray(thongTinThanhToan.danhSachMon)) {
        thongTinThanhToan.danhSachMon.forEach(mon => {
          themVaoGio(mon.maSach, mon.soLuong || 1, {
            TenSach: mon.tenSach,
            GiaBan: mon.giaBan,
            HinhAnh: mon.hinhAnh
          });
        });
      }

      // 2. Lưu thông tin nhận hàng vào sessionStorage để trang Checkout tự động điền sẵn
      if (thongTinThanhToan.thongTinNhanHang) {
        sessionStorage.setItem('booknest_checkout_draft', JSON.stringify(thongTinThanhToan.thongTinNhanHang));
      }

      // 3. Thu nhỏ chat và chuyển trang
      setMoChat(false);
      navigate('/checkout');
    } catch (err) {
      console.error('Lỗi chuyển trang thanh toán:', err);
    }
  };

  return (
    <>
      {/* ================= NÚT FLOATING NỔI (FAB) ================= */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center">
        {/* Bong bóng chào mời nhỏ khi chưa mở chat */}
        {!moChat && thongBaoBadge && (
          <div 
            onClick={() => setMoChat(true)}
            className="hidden sm:flex items-center gap-2 mr-3 px-3 py-1.5 rounded-full bg-white/95 dark:bg-stone-800/95 text-stone-800 dark:text-stone-100 text-xs font-medium shadow-lg border border-amber-200/80 dark:border-stone-700 cursor-pointer hover:scale-105 transition-all duration-200"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Tư vấn sách cùng BookNest AI</span>
          </div>
        )}

        <button
          onClick={() => setMoChat(!moChat)}
          aria-label={moChat ? 'Đóng trợ lý AI' : 'Mở trợ lý AI BookNest'}
          className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-amber-700 via-amber-600 to-amber-500 text-white shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all duration-300 group border-2 border-amber-200/40"
        >
          {moChat ? (
            <X className="w-6 h-6 transition-transform group-hover:rotate-90 duration-300" />
          ) : (
            <>
              <MessageSquare className="w-6 h-6 transition-transform group-hover:scale-110 duration-300" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full flex items-center justify-center">
                <Sparkles className="w-2.5 h-2.5 text-white" />
              </span>
            </>
          )}
        </button>
      </div>

      {/* ================= KHUNG CỬA SỔ TRÒ CHUYỆN ================= */}
      {moChat && (
        <div 
          className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-32px)] sm:w-[420px] h-[580px] max-h-[82vh] rounded-2xl bg-amber-50/95 dark:bg-stone-900/95 backdrop-blur-md border border-amber-200/80 dark:border-stone-700 shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-300 font-sans"
        >
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-amber-800 via-amber-700 to-amber-800 text-white flex items-center justify-between border-b border-amber-900/40 shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-amber-600/90 border border-amber-400/40 flex items-center justify-center shadow-inner">
                <Sparkles className="w-4 h-4 text-amber-200" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm tracking-wide">BookNest AI</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
                <p className="text-[11px] text-amber-200/90">Trợ lý tư vấn & hỗ trợ khách hàng</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleLamMoi}
                title="Làm mới cuộc trò chuyện"
                className="p-1.5 rounded-lg hover:bg-white/10 text-amber-200 hover:text-white transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setMoChat(false)}
                title="Thu nhỏ"
                className="p-1.5 rounded-lg hover:bg-white/10 text-amber-200 hover:text-white transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Body tin nhắn */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-sm scroll-smooth">
            {danhSachTinNhan.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                {/* Bong bóng tin nhắn */}
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 shadow-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-amber-700 text-white rounded-br-xs'
                      : msg.laLoi
                      ? 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800 rounded-bl-xs'
                      : 'bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 border border-amber-100 dark:border-stone-700 rounded-bl-xs'
                  }`}
                >
                  <p className="whitespace-pre-wrap text-[13px]">{msg.content}</p>
                </div>

                {/* Thẻ Sách Gợi Ý Tương Tác (nếu có từ tool tim_sach) */}
                {msg.duLieuKemTheo?.danhSachSach && msg.duLieuKemTheo.danhSachSach.length > 0 && (
                  <div className="w-full mt-2 space-y-2">
                    <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400 flex items-center gap-1">
                      <BookOpen className="w-3 h-3 text-amber-600" /> Sách gợi ý từ kho:
                    </p>
                    <div className="space-y-1.5">
                      {msg.duLieuKemTheo.danhSachSach.map((sach) => (
                        <div
                          key={sach.maSach}
                          className="p-2.5 rounded-xl bg-white dark:bg-stone-800 border border-amber-200/80 dark:border-stone-700 flex items-center justify-between gap-2 shadow-xs hover:border-amber-400 transition-all"
                        >
                          <div className="flex items-center gap-2.5 overflow-hidden">
                            {sach.hinhAnh ? (
                              <img
                                src={sach.hinhAnh}
                                alt={sach.tenSach}
                                className="w-10 h-14 object-cover rounded-md border border-stone-200 dark:border-stone-700 shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-14 bg-amber-100 dark:bg-stone-700 rounded-md flex items-center justify-center shrink-0">
                                <BookOpen className="w-5 h-5 text-amber-600" />
                              </div>
                            )}
                            <div className="min-w-0">
                              <h4 className="font-semibold text-xs text-stone-900 dark:text-stone-100 truncate">
                                {sach.tenSach}
                              </h4>
                              <p className="text-[11px] text-stone-500 dark:text-stone-400 truncate">
                                {sach.tacGia || 'Nhiều tác giả'}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                                  {Number(sach.giaBan || 0).toLocaleString('vi-VN')}đ
                                </span>
                                {sach.conHang ? (
                                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                                    Còn hàng
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-stone-400">Hết hàng</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setMoChat(false);
                                navigate(`/books/${sach.maSach}`);
                              }}
                              className="px-2 py-1 text-[11px] font-medium rounded-lg bg-amber-50 dark:bg-stone-700 text-amber-800 dark:text-amber-200 hover:bg-amber-100 transition-colors"
                            >
                              Xem
                            </button>
                            <button
                              disabled={!sach.conHang}
                              onClick={() => handleThemVaoGio(sach)}
                              className={`px-2 py-1 text-[11px] font-medium rounded-lg transition-colors flex items-center justify-center gap-1 ${
                                daThemGio[sach.maSach]
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-amber-600 text-white hover:bg-amber-700'
                              } disabled:opacity-40 disabled:cursor-not-allowed`}
                            >
                              {daThemGio[sach.maSach] ? 'Đã thêm' : '+ Giỏ'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Thẻ Bản Nháp Thanh Toán (nếu có từ tool soan_thong_tin_thanh_toan) */}
                {msg.duLieuKemTheo?.thongTinThanhToan && (
                  <div className="w-full mt-2 p-3 rounded-xl bg-amber-100/70 dark:bg-stone-800/90 border border-amber-300 dark:border-amber-700/60 shadow-xs">
                    <div className="flex items-center justify-between pb-2 border-b border-amber-200 dark:border-stone-700">
                      <span className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-700" /> Bản nháp thanh toán
                      </span>
                      <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                        {msg.duLieuKemTheo.thongTinThanhToan.mienPhiShip ? 'Freeship 0đ' : '+25k Ship'}
                      </span>
                    </div>

                    <div className="py-2 space-y-1 text-xs">
                      <div className="flex justify-between text-stone-600 dark:text-stone-300">
                        <span>Số lượng sách:</span>
                        <span className="font-medium">
                          {msg.duLieuKemTheo.thongTinThanhToan.danhSachMon?.length || 1} tựa sách
                        </span>
                      </div>
                      <div className="flex justify-between text-stone-800 dark:text-stone-100 font-bold">
                        <span>Tổng tiền dự kiến:</span>
                        <span className="text-amber-700 dark:text-amber-400">
                          {Number(msg.duLieuKemTheo.thongTinThanhToan.tongTien || 0).toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleMoThanhToan(msg.duLieuKemTheo.thongTinThanhToan)}
                      className="w-full mt-1 py-2 px-3 rounded-lg bg-amber-700 hover:bg-amber-800 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all"
                    >
                      Mở trang thanh toán điền sẵn <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {/* Thẻ Tra Cứu Đơn Hàng (nếu có từ tool tra_cuu_don_hang) */}
                {msg.duLieuKemTheo?.thongTinDonHang && (
                  <div className="w-full mt-2 p-3 rounded-xl bg-white dark:bg-stone-800 border border-amber-200 dark:border-stone-700 shadow-xs">
                    {msg.duLieuKemTheo.thongTinDonHang.maTraCuu ? (
                      <div>
                        <div className="flex items-center justify-between pb-1.5 border-b border-stone-100 dark:border-stone-700">
                          <span className="font-mono font-bold text-xs text-amber-800 dark:text-amber-300">
                            {msg.duLieuKemTheo.thongTinDonHang.maTraCuu}
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 font-medium">
                            {msg.duLieuKemTheo.thongTinDonHang.trangThai}
                          </span>
                        </div>
                        <div className="pt-2 text-xs space-y-1 text-stone-600 dark:text-stone-300">
                          <p>Tổng tiền: <strong className="text-stone-900 dark:text-stone-100">{Number(msg.duLieuKemTheo.thongTinDonHang.tongTien || 0).toLocaleString('vi-VN')}đ</strong></p>
                          <p>Thanh toán: {msg.duLieuKemTheo.thongTinDonHang.phuongThucThanhToan}</p>
                        </div>
                      </div>
                    ) : Array.isArray(msg.duLieuKemTheo.thongTinDonHang) ? (
                      <div className="space-y-1.5">
                        <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">Đơn hàng gần đây của bạn:</p>
                        {msg.duLieuKemTheo.thongTinDonHang.map(d => (
                          <div key={d.maTraCuu} className="flex justify-between items-center text-xs p-1.5 rounded-md bg-stone-50 dark:bg-stone-700/50">
                            <span className="font-mono font-bold text-amber-700">{d.maTraCuu}</span>
                            <span className="text-stone-600 dark:text-stone-300">{d.trangThai}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}

                <span className="text-[10px] text-stone-400 mt-1 px-1">{msg.thoiGian}</span>
              </div>
            ))}

            {/* Hiệu ứng đang gõ (Typing indicator) */}
            {dangGui && (
              <div className="flex items-center gap-1.5 p-3 rounded-2xl bg-white dark:bg-stone-800 border border-amber-100 dark:border-stone-700 w-fit shadow-xs animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-bounce [animation-delay:0.4s]" />
                <span className="text-[11px] text-stone-500 ml-1">Đang tra cứu kho sách...</span>
              </div>
            )}

            <div ref={tinNhanCuoiRef} />
          </div>

          {/* Gợi ý câu hỏi nhanh (Chips) */}
          <div className="px-3 py-1.5 bg-amber-100/50 dark:bg-stone-800/50 border-t border-amber-200/50 dark:border-stone-700/50 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            {CAU_HOI_GOI_Y.map((cauHoi, idx) => (
              <button
                key={idx}
                disabled={dangGui}
                onClick={() => handleGuiTinNhan(cauHoi)}
                className="whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] bg-white dark:bg-stone-700 text-stone-700 dark:text-stone-200 border border-amber-200/80 dark:border-stone-600 hover:bg-amber-50 dark:hover:bg-stone-600 transition-colors shrink-0 disabled:opacity-50"
              >
                {cauHoi}
              </button>
            ))}
          </div>

          {/* Footer Input */}
          <div className="p-3 bg-white dark:bg-stone-900 border-t border-amber-200/80 dark:border-stone-700 shrink-0">
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={tinNhanMoi}
                disabled={dangGui}
                onChange={(e) => setTinNhanMoi(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Hỏi về sách, tồn kho, đơn hàng..."
                maxLength={500}
                className="flex-1 px-3.5 py-2 text-xs rounded-xl bg-amber-50/70 dark:bg-stone-800 text-stone-900 dark:text-stone-100 border border-amber-200 dark:border-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-600/50 disabled:opacity-60"
              />
              <button
                onClick={() => handleGuiTinNhan()}
                disabled={dangGui || !tinNhanMoi.trim()}
                className="p-2 rounded-xl bg-amber-700 hover:bg-amber-800 active:scale-95 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-sm"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] text-stone-400 text-center mt-1.5">
              BookNest AI có thể mắc lỗi. Vui lòng kiểm tra lại thông tin trước khi thanh toán.
            </p>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatbotWidget;
