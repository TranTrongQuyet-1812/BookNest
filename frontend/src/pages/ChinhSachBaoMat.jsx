import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  ShieldCheck, 
  Lock, 
  KeyRound, 
  EyeOff, 
  FileCheck, 
  ArrowLeft,
  GraduationCap
} from 'lucide-react';

export const ChinhSachBaoMat = () => {
  const location = useLocation();

  useEffect(() => {
    // Cuộn lên đầu trang hoặc tới anchor khi vào trang
    if (location.hash) {
      const el = document.getElementById(location.hash.replace('#', ''));
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [location]);

  return (
    <div className="container py-10" style={{ maxWidth: '840px', margin: '0 auto' }}>
      {/* Nút quay lại */}
      <div className="mb-6">
        <Link 
          to="/"
          className="inline-flex items-center gap-2 hover:underline"
          style={{ 
            color: 'var(--text-muted)', 
            fontSize: '0.875rem',
            textUnderlineOffset: '3px'
          }}
        >
          <ArrowLeft size={16} /> Quay về Trang chủ
        </Link>
      </div>

      {/* Thanh chuyển đổi nhanh giữa 2 trang chính sách */}
      <div 
        style={{
          display: 'flex',
          gap: '0.5rem',
          padding: '0.35rem',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          marginBottom: '2.5rem'
        }}
      >
        <Link
          to="/dieu-khoan"
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '0.65rem 1rem',
            borderRadius: '9px',
            fontSize: '0.9rem',
            fontWeight: 500,
            color: 'var(--text-muted)',
            textDecoration: 'none',
            transition: 'color 0.2s'
          }}
          className="hover:text-main"
        >
          Điều Khoản Dịch Vụ
        </Link>
        <Link
          to="/chinh-sach-bao-mat"
          style={{
            flex: 1,
            textAlign: 'center',
            padding: '0.65rem 1rem',
            borderRadius: '9px',
            fontSize: '0.9rem',
            fontWeight: 600,
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-main)',
            boxShadow: 'var(--shadow-sm)',
            textDecoration: 'none'
          }}
        >
          Chính Sách Bảo Mật
        </Link>
      </div>

      {/* Header trang nhã */}
      <header className="mb-10 text-center">
        <h1 
          className="font-serif mb-3" 
          style={{ 
            fontSize: '2.25rem', 
            fontWeight: 700, 
            color: 'var(--text-main)',
            letterSpacing: '-0.02em',
            lineHeight: 1.25
          }}
        >
          Chính Sách Bảo Mật Thông Tin
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: '620px', margin: '0 auto' }}>
          Cam kết bảo vệ dữ liệu cá nhân của Bạn đọc theo tinh thần Nghị định 13/2023/NĐ-CP của Chính phủ.
        </p>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '0.75rem' }}>
          Phiên bản công bố: Tháng 10/2026 • Áp dụng trên toàn hệ thống BookNest
        </div>
      </header>

      {/* Khung Cam kết An Toàn Dữ Liệu */}
      <div 
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          padding: '1.5rem 1.75rem',
          marginBottom: '2.5rem'
        }}
      >
        <div className="flex items-start gap-3">
          <ShieldCheck size={22} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Tôn Chỉ Tôn Trọng Quyền Riêng Tư
            </h2>
            <p style={{ fontSize: '0.875rem', lineHeight: '1.7', color: 'var(--text-muted)', margin: 0 }}>
              Tiệm sách BookNest coi trọng sự an tâm của bạn đọc như chính hương thơm nguyên vẹn của từng trang sách mới. Mọi thông tin cá nhân bạn cung cấp đều được mã hóa, bảo vệ nghiêm ngặt và chỉ sử dụng cho mục đích duy nhất là đóng gói và giao sách tận tay bạn.
            </p>
          </div>
        </div>
      </div>

      {/* Nội dung chi tiết các điều khoản bảo mật */}
      <article className="space-y-8" style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.8 }}>
        
        {/* Mục 1 */}
        <section id="thu-thap-du-lieu">
          <h2 
            className="font-serif flex items-center gap-2 mb-3"
            style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}
          >
            <FileCheck size={20} style={{ color: 'var(--accent)' }} />
            1. Dữ Liệu Chúng Tôi Thu Thập
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Chúng tôi chỉ thu thập các trường thông tin tối thiểu cần thiết để phục vụ quy trình mua sách:
          </p>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-muted)' }} className="space-y-2">
            <li><strong>Thông tin đặt và giao hàng:</strong> Họ tên người nhận, số điện thoại, địa chỉ nhận hàng và địa chỉ email nhận thông báo.</li>
            <li><strong>Thông tin tài khoản thành viên:</strong> Tên người dùng, email đăng nhập và mật khẩu (được mã hóa một chiều ngay khi lưu).</li>
            <li><strong>Dữ liệu cục bộ trình duyệt:</strong> Giỏ hàng của khách vãng lai được lưu trữ an toàn trong bộ nhớ máy của bạn (<code style={{ backgroundColor: 'var(--bg-surface)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>localStorage</code>), chúng tôi không theo dõi hành vi cá nhân bên ngoài trang web.</li>
            <li>
              <strong>Điều chúng tôi KHÔNG BAO GIỜ thu thập:</strong> BookNest không bao giờ yêu cầu hay lưu trữ thông tin thẻ ngân hàng, số thẻ tín dụng, mã PIN hay mã xác thực OTP của bạn. Mọi giao dịch chuyển khoản VietQR đều được thực hiện bảo mật qua ứng dụng ngân hàng của bạn và cổng thanh toán đối tác payOS.
            </li>
          </ul>
        </section>

        {/* Mục 2 */}
        <section id="muc-dich-su-dung">
          <h2 
            className="font-serif flex items-center gap-2 mb-3"
            style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}
          >
            <EyeOff size={20} style={{ color: 'var(--accent)' }} />
            2. Mục Đích Sử Dụng & Cam Kết Không Chia Sẻ
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Toàn bộ thông tin cá nhân của bạn đọc chỉ được sử dụng cho các mục đích:
          </p>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-muted)' }} className="space-y-2">
            <li>Khởi tạo đơn hàng, in phiếu gửi sách và điều phối giao nhận.</li>
            <li>Gửi email tự động cập nhật tiến trình đơn hàng (đơn đã duyệt, mã tra cứu, thông báo giao hàng).</li>
            <li>Hỗ trợ đổi trả hoặc xử lý hoàn tiền thử nghiệm khi có yêu cầu từ bạn.</li>
            <li>
              <strong>Cam kết danh dự:</strong> BookNest <strong>tuyệt đối không bán, không cho thuê, không chia sẻ</strong> dữ liệu của bạn cho bất kỳ bên thứ ba nào vì mục đích quảng cáo hoặc gửi tin nhắn rác (spam).
            </li>
          </ul>
        </section>

        {/* Mục 3 */}
        <section id="bien-phap-ky-thuat">
          <h2 
            className="font-serif flex items-center gap-2 mb-3"
            style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}
          >
            <Lock size={20} style={{ color: 'var(--accent)' }} />
            3. Các Biện Pháp Kỹ Thuật Bảo Vệ Dữ Liệu
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Hệ thống áp dụng các tiêu chuẩn an toàn thông tin hiện đại trong kiến trúc phần mềm:
          </p>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-muted)' }} className="space-y-2">
            <li><strong>Mã hóa mật khẩu bcrypt:</strong> Mật khẩu tài khoản được băm (hash) một chiều với độ muối (salt) cao. Ngay cả quản trị viên hệ thống cũng không thể đọc được mật khẩu gốc của bạn.</li>
            <li><strong>Xác thực phiên qua JWT:</strong> Mã định danh JSON Web Token có thời hạn hiệu lực, kiểm tra quyền truy cập chặt chẽ ở từng thao tác.</li>
            <li><strong>Chống rò rỉ mã đơn hàng (IDOR Defense):</strong> Đơn hàng công khai được định danh bằng <em>Mã tra cứu ngẫu nhiên khó đoán</em> (<code style={{ backgroundColor: 'var(--bg-surface)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>BN-XXXXXX</code>) thay vì số thứ tự tăng dần thông thường, ngăn chặn việc người lạ dò tìm hoặc xem trộm đơn hàng của bạn.</li>
            <li><strong>Tường lửa giới hạn tần suất (Rate Limiting):</strong> Trang bị bộ lọc giới hạn số lần gọi API tra cứu đơn và tạo thanh toán để chống lại các cuộc tấn công dò quét tự động.</li>
          </ul>
        </section>

        {/* Mục 4 */}
        <section id="quyen-cua-ban">
          <h2 
            className="font-serif flex items-center gap-2 mb-3"
            style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}
          >
            <KeyRound size={20} style={{ color: 'var(--accent)' }} />
            4. Quyền Của Bạn Đối Với Dữ Liệu Cá Nhân
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Bạn đọc luôn nắm toàn quyền kiểm soát thông tin cá nhân của mình tại BookNest:
          </p>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-muted)' }} className="space-y-2">
            <li><strong>Quyền tra cứu & chỉnh sửa:</strong> Bạn có thể kiểm tra lịch sử mua hàng và cập nhật thông tin nhận hàng trong trang cá nhân bất kỳ lúc nào.</li>
            <li><strong>Quyền yêu cầu xóa thông tin:</strong> Bạn có quyền yêu cầu vô hiệu hóa hoặc xóa vĩnh viễn tài khoản và các dữ liệu liên quan bằng cách gửi yêu cầu về hòm thư hỗ trợ của chúng tôi.</li>
          </ul>
        </section>

        {/* Mục 5: Thông tin liên hệ */}
        <section id="lien-he" style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          marginTop: '2rem'
        }}>
          <h3 className="flex items-center gap-2" style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            <GraduationCap size={18} style={{ color: 'var(--price)' }} />
            Thông Tin Phụ Trách Dữ Liệu & Bản Quyền
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Mọi yêu cầu hoặc thắc mắc liên quan đến quyền riêng tư và dữ liệu cá nhân, xin vui lòng gửi về:
          </p>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-main)' }} className="space-y-1">
            <div><strong>Phụ trách đề tài:</strong> Trần Trọng Quyết (Sinh viên Trường Đại Học Lạc Hồng)</div>
            <div><strong>Hòm thư tiếp nhận:</strong> <span style={{ color: 'var(--price)', fontWeight: 600 }}>tiemsach@booknest.vn</span></div>
            <div><strong>Cam kết:</strong> Tiếp nhận và phản hồi xử lý trong vòng 24–48 giờ làm việc.</div>
          </div>
        </section>
      </article>
    </div>
  );
};

export default ChinhSachBaoMat;
