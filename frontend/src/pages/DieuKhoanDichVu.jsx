import React, { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  BookOpen, 
  Truck, 
  RotateCcw, 
  CreditCard, 
  CheckCircle2, 
  ArrowLeft,
  GraduationCap
} from 'lucide-react';

export const DieuKhoanDichVu = () => {
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
            fontWeight: 600,
            backgroundColor: 'var(--bg-card)',
            color: 'var(--text-main)',
            boxShadow: 'var(--shadow-sm)',
            textDecoration: 'none'
          }}
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
            fontWeight: 500,
            color: 'var(--text-muted)',
            textDecoration: 'none',
            transition: 'color 0.2s'
          }}
          className="hover:text-main"
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
          Điều Khoản Dịch Vụ
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.7, maxWidth: '620px', margin: '0 auto' }}>
          Quy tắc mua bán, giao nhận và cam kết vận hành minh bạch giữa Tiệm sách BookNest và Bạn đọc thân quý.
        </p>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-sub)', marginTop: '0.75rem' }}>
          Phiên bản công bố: Tháng 10/2026 • Áp dụng trên toàn hệ thống BookNest
        </div>
      </header>

      {/* Khung Thông báo Đồ án sinh viên & Bản quyền (Disclaimer) */}
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
          <GraduationCap size={22} style={{ color: 'var(--price)', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
              Tuyên Bố Mục Đích Đồ Án & Phi Thương Mại
            </h2>
            <p style={{ fontSize: '0.875rem', lineHeight: '1.7', color: 'var(--text-muted)', margin: 0 }}>
              Website <strong>BookNest</strong> là đề tài đồ án môn học chuyên ngành Công nghệ phần mềm do sinh viên <strong>Trần Trọng Quyết</strong> (Trường Đại Học Lạc Hồng) phát triển. Nền tảng được triển khai lên môi trường mạng nhằm mục đích nghiên cứu, học tập và kiểm thử kỹ thuật. 
              Toàn bộ tên tác phẩm, hình ảnh bìa sách và thông tin xuất bản thuộc bản quyền của các Tác giả và Nhà xuất bản tương ứng; BookNest không sở hữu bản quyền các ấn phẩm này và không nhằm mục đích thương mại hóa trái phép.
            </p>
          </div>
        </div>
      </div>

      {/* Nội dung các điều khoản chi tiết */}
      <article className="space-y-8" style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.8 }}>
        
        {/* Mục 1 */}
        <section id="tai-khoan">
          <h2 
            className="font-serif flex items-center gap-2 mb-3"
            style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}
          >
            <CheckCircle2 size={20} style={{ color: 'var(--accent)' }} />
            1. Tài Khoản & Quyền Lợi Bạn Đọc
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            BookNest chào đón bạn đọc mua sắm dưới cả hai hình thức: <strong>Khách vãng lai (Guest)</strong> và <strong>Thành viên có tài khoản</strong>.
          </p>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-muted)' }} className="space-y-2">
            <li>Bạn đọc có trách nhiệm tự bảo mật thông tin đăng nhập của mình và không chia sẻ mật khẩu cho người khác.</li>
            <li>Nghiêm cấm các hành vi: sử dụng bot spam đặt đơn ảo, tấn công từ chối dịch vụ (DDoS), hoặc cố ý dò quét mã đơn hàng của người khác. Hệ thống có cơ chế giới hạn tần suất (Rate Limit) và sẽ tự động chặn các địa chỉ IP có dấu hiệu bất thường.</li>
          </ul>
        </section>

        {/* Mục 2 */}
        <section id="dat-huy-don">
          <h2 
            className="font-serif flex items-center gap-2 mb-3"
            style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}
          >
            <BookOpen size={20} style={{ color: 'var(--accent)' }} />
            2. Quy Trình Đặt Hàng & Hủy Đơn
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Khi bạn hoàn tất thao tác bấm nút <em>"Xác nhận đặt hàng"</em>:
          </p>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-muted)' }} className="space-y-2">
            <li>Đơn hàng sẽ được ghi nhận vào hệ thống với mã tra cứu ngẫu nhiên (ví dụ: <code style={{ backgroundColor: 'var(--bg-surface)', padding: '0.1rem 0.35rem', borderRadius: '4px' }}>BN-XXXXXX</code>) và chuyển sang trạng thái <strong>Chờ duyệt</strong>.</li>
            <li><strong>Quyền tự hủy đơn:</strong> Khi đơn hàng còn ở trạng thái <em>Chờ duyệt</em>, bạn hoàn toàn có thể tự bấm nút hủy đơn trực tiếp trong trang chi tiết đơn hàng mà không cần chờ duyệt.</li>
            <li>Khi đơn hàng đã chuyển sang trạng thái <em>Đã duyệt</em> hoặc <em>Đã lấy hàng</em>, nếu có nhu cầu thay đổi, bạn vui lòng liên hệ trực tiếp với tiệm để được hỗ trợ điều phối.</li>
          </ul>
        </section>

        {/* Mục 3 */}
        <section id="van-chuyen">
          <h2 
            className="font-serif flex items-center gap-2 mb-3"
            style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}
          >
            <Truck size={20} style={{ color: 'var(--accent)' }} />
            3. Chính Sách Giao Nhận & Đồng Kiểm
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Nhằm mang lại trải nghiệm nhẹ nhàng nhất cho bạn đọc, BookNest áp dụng chính sách vận chuyển sau:
          </p>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-muted)' }} className="space-y-2">
            <li><strong>Miễn phí vận chuyển toàn quốc (Freeship 100%):</strong> Áp dụng cho mọi đơn hàng thử nghiệm tại tất cả các tỉnh thành trên cả nước.</li>
            <li><strong>Thời gian giao hàng dự kiến:</strong> Từ 1–2 ngày làm việc đối với khu vực nội thành, và từ 3–5 ngày làm việc đối với các tỉnh/thành khác.</li>
            <li><strong>Đóng gói cẩn trọng:</strong> Mỗi cuốn sách đều được bọc màng bóng khí chống sốc và chèn góc để giữ trọn vẹn mép bìa và gáy sách.</li>
            <li><strong>Quyền đồng kiểm:</strong> Bạn đọc có quyền mở gói hàng kiểm tra ngoại quan (đúng tựa sách, đủ số lượng, sách không rách nát) cùng nhân viên bưu tá trước khi nhận hàng.</li>
          </ul>
        </section>

        {/* Mục 4 */}
        <section id="doi-tra">
          <h2 
            className="font-serif flex items-center gap-2 mb-3"
            style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}
          >
            <RotateCcw size={20} style={{ color: 'var(--accent)' }} />
            4. Chính Sách Đổi Trả & Hoàn Tiền
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            BookNest cam kết đồng hành cùng bạn đọc nếu ấn bản đến tay bạn có bất kỳ tì vết nào:
          </p>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-muted)' }} className="space-y-2">
            <li><strong>Thời hạn hỗ trợ:</strong> Trong vòng <strong>7 ngày</strong> kể từ ngày bạn nhận sách thành công.</li>
            <li><strong>Các trường hợp được đổi mới:</strong> Sách bị lỗi in ấn từ nhà xuất bản (thiếu trang, lặp trang, ngược chữ, mờ mực); sách bị gãy gáy hoặc rách nát do vận chuyển; hoặc tiệm đóng gói nhầm tựa sách.</li>
            <li><strong>Hình thức xử lý:</strong> Tiệm sẽ gửi đổi ngay cuốn sách mới nguyên vẹn (tiệm chịu 100% chi phí vận chuyển 2 chiều) hoặc hoàn tiền 100% nếu tựa sách đó tạm thời hết hàng trong kho.</li>
          </ul>
        </section>

        {/* Mục 5 */}
        <section id="thanh-toan">
          <h2 
            className="font-serif flex items-center gap-2 mb-3"
            style={{ fontSize: '1.35rem', fontWeight: 700, color: 'var(--text-main)' }}
          >
            <CreditCard size={20} style={{ color: 'var(--accent)' }} />
            5. Phương Thức Thanh Toán & Cam Kết Hoàn Tiền
          </h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Hệ thống hỗ trợ 2 phương thức thanh toán an toàn:
          </p>
          <ul style={{ listStyle: 'disc', paddingLeft: '1.5rem', color: 'var(--text-muted)' }} className="space-y-2">
            <li><strong>Thanh toán khi nhận hàng (COD):</strong> Bạn kiểm tra sách và thanh toán tiền mặt trực tiếp cho nhân viên giao hàng.</li>
            <li><strong>Chuyển khoản VietQR tức thì (payOS):</strong> Quét mã QR qua ứng dụng ngân hàng, hệ thống tự động xác nhận trong vài giây với thời hạn hiệu lực 10 phút.</li>
            <li>
              <strong>Quy trình hoàn tiền PayOS:</strong> Hệ thống thanh toán VietQR payOS là luồng chuyển khoản một chiều an toàn. Trong trường hợp bạn đọc chuyển tiền thử nghiệm, có nhu cầu hủy đơn sau khi chuyển khoản thành công, hoặc chuyển khoản khi đơn đã quá hạn hủy, hệ thống sẽ tự động ghi nhận trạng thái <strong>Cần hoàn tiền</strong>. Đội ngũ nhân viên BookNest sẽ chủ động liên hệ trực tiếp với bạn đọc để đối soát thông tin và chuyển khoản hoàn trả 100% số tiền về tài khoản ngân hàng.
            </li>
          </ul>
        </section>

        {/* Mục 6 */}
        <section id="lien-he" style={{
          backgroundColor: 'var(--bg-surface)',
          padding: '1.5rem',
          borderRadius: '12px',
          border: '1px solid var(--border)',
          marginTop: '2rem'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
            Kênh Tiếp Nhận Hỗ Trợ
          </h3>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            Mọi thắc mắc, yêu cầu hỗ trợ đơn hàng hoặc đề nghị hoàn tiền thử nghiệm, xin vui lòng liên hệ:
          </p>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-main)' }} className="space-y-1">
            <div><strong>Tác giả đề tài:</strong> Trần Trọng Quyết (Sinh viên Trường Đại Học Lạc Hồng)</div>
            <div><strong>Email tiếp nhận:</strong> <span style={{ color: 'var(--price)', fontWeight: 600 }}>tiemsach@booknest.vn</span></div>
            <div><strong>Phạm vi:</strong> Đồ án tốt nghiệp / Môn học Công nghệ phần mềm</div>
          </div>
        </section>
      </article>
    </div>
  );
};

export default DieuKhoanDichVu;
