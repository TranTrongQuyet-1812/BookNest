import React from 'react';
import {
  KeyRound,
  EyeOff,
  FileCheck,
  Cookie,
  Share2,
  Lock,
  Trash2
} from 'lucide-react';
import {
  ThanhDieuHuongPhapLy,
  TieuDeTrangPhapLy,
  KhungLienHePhapLy,
  MucPhapLy,
  DoanVan,
  DanhSachGach,
  KhungTrangPhapLy,
  NoiDungPhapLy
} from '../components/phapLy';
import { useCuonToiMucNeo, EMAIL_HO_TRO } from '../components/phapLyDungChung';

const maStyle = { backgroundColor: 'var(--bg-surface)', padding: '0.1rem 0.35rem', borderRadius: '4px' };

// Các mục lưu cục bộ trên trình duyệt (không phải cookie theo dõi)
const MUC_LUU_CUC_BO = [
  { ten: 'booknest_token', mucDich: 'Giữ phiên đăng nhập của thành viên', thoiGian: 'Đến khi đăng xuất hoặc hết hạn phiên' },
  { ten: 'booknest_guest_cart', mucDich: 'Giỏ hàng của khách vãng lai', thoiGian: 'Đến khi đặt hàng hoặc bạn xóa dữ liệu trình duyệt' },
  { ten: 'booknest_checkout_draft', mucDich: 'Chuyển thông tin nhận hàng bạn đã nhắn Trợ lý sang trang thanh toán', thoiGian: 'Đến khi đóng thẻ trình duyệt (lưu kiểu sessionStorage)' },
  { ten: 'booknest_theme', mucDich: 'Nhớ giao diện sáng hoặc tối', thoiGian: 'Đến khi bạn xóa dữ liệu trình duyệt' }
];

export const ChinhSachBaoMat = () => {
  useCuonToiMucNeo();

  return (
    <KhungTrangPhapLy>
      <ThanhDieuHuongPhapLy dangMo="/chinh-sach-bao-mat" />

      <TieuDeTrangPhapLy
        tieuDe="Chính Sách Bảo Mật & Cookie"
        moTa="Chúng tôi thu thập gì, dùng để làm gì, chia sẻ với ai và bạn yêu cầu xóa dữ liệu của mình như thế nào, theo tinh thần Nghị định 13/2023/NĐ-CP."
      />

      <NoiDungPhapLy>
        <MucPhapLy id="thu-thap-du-lieu" bieuTuong={FileCheck} tieuDe="1. Dữ Liệu Chúng Tôi Thu Thập">
          <DoanVan>Chỉ các thông tin cần cho việc mô phỏng quy trình mua sách:</DoanVan>
          <DanhSachGach>
            <li><strong>Thông tin đặt hàng:</strong> họ tên người nhận, số điện thoại, địa chỉ nhận hàng và email nhận thông báo.</li>
            <li><strong>Tài khoản thành viên:</strong> tên, email đăng nhập và mật khẩu (chỉ lưu dạng đã băm một chiều, không ai đọc lại được mật khẩu gốc).</li>
            <li><strong>Đánh giá sách:</strong> số sao, nội dung và họ tên trong tài khoản được hiển thị công khai ở trang cuốn sách; email, số điện thoại, địa chỉ không hiển thị.</li>
            <li><strong>Trò chuyện với Trợ lý AI:</strong> nội dung tin nhắn bạn gửi cho Trợ lý được lưu ở dạng số liệu kỹ thuật (số lượt, lượng token dùng) để kiểm soát chất lượng; nội dung tin nhắn được gửi tới một dịch vụ AI bên thứ ba để tạo câu trả lời. Đừng nhập thông tin nhạy cảm vào khung trò chuyện.</li>
            <li><strong>Dữ liệu kỹ thuật:</strong> địa chỉ IP và nhật ký truy cập của máy chủ, dùng để chống lạm dụng và xử lý sự cố.</li>
            <li>
              <strong>Chúng tôi không thu thập:</strong> số thẻ ngân hàng, mã PIN, mã OTP ngân hàng hay mật khẩu ngân hàng. Việc chuyển khoản VietQR diễn ra trong ứng dụng ngân hàng của bạn và cổng thanh toán payOS.
            </li>
          </DanhSachGach>
        </MucPhapLy>

        <MucPhapLy id="muc-dich-su-dung" bieuTuong={EyeOff} tieuDe="2. Mục Đích Sử Dụng">
          <DoanVan>Dữ liệu chỉ dùng cho mục đích của một dự án học tập:</DoanVan>
          <DanhSachGach>
            <li>Tạo đơn hàng mẫu, hiển thị trạng thái đơn và minh họa quy trình xử lý đơn.</li>
            <li>Gửi email cập nhật đơn hàng (nếu chức năng gửi email đang bật).</li>
            <li>Xử lý yêu cầu hỗ trợ hoặc hoàn tiền chuyển khoản nhầm khi bạn liên hệ.</li>
            <li>Bảo vệ hệ thống khỏi truy cập bất thường.</li>
            <li>Chúng tôi <strong>không bán, không cho thuê</strong> dữ liệu và không dùng để quảng cáo hay gửi tin nhắn rác.</li>
          </DanhSachGach>
        </MucPhapLy>

        <MucPhapLy id="cookie" bieuTuong={Cookie} tieuDe="3. Cookie & Lưu Trữ Trên Trình Duyệt">
          <DoanVan>
            BookNest <strong>không dùng cookie quảng cáo hay cookie theo dõi hành vi</strong>. Website lưu một vài mục nhỏ ngay trong trình duyệt của bạn (<code style={maStyle}>localStorage</code> và <code style={maStyle}>sessionStorage</code>) để hoạt động:
          </DoanVan>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', color: 'var(--text-main)' }}>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>Tên</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>Dùng để</th>
                  <th style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>Lưu đến khi</th>
                </tr>
              </thead>
              <tbody style={{ color: 'var(--text-muted)' }}>
                {MUC_LUU_CUC_BO.map((muc) => (
                  <tr key={muc.ten}>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}><code style={maStyle}>{muc.ten}</code></td>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>{muc.mucDich}</td>
                    <td style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>{muc.thoiGian}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DoanVan style={{ marginTop: '0.75rem' }}>
            Dịch vụ mạng Cloudflare đứng trước website có thể đặt cookie kỹ thuật phục vụ bảo mật (chống bot, chống tấn công). Các cookie này không dùng để quảng cáo. Bạn có thể xóa mọi dữ liệu trên trong phần cài đặt của trình duyệt; việc này chỉ khiến bạn phải đăng nhập lại và mất giỏ hàng chưa đặt.
          </DoanVan>
        </MucPhapLy>

        <MucPhapLy id="ben-thu-ba" bieuTuong={Share2} tieuDe="4. Bên Thứ Ba Tham Gia Xử Lý Dữ Liệu">
          <DoanVan>Để website chạy được, dữ liệu có thể đi qua các dịch vụ sau. Chúng tôi chỉ dùng cho đúng mục đích bên dưới:</DoanVan>
          <DanhSachGach>
            <li><strong>payOS:</strong> tạo mã QR và xác nhận chuyển khoản (nhận số tiền, mã đơn, thông tin giao dịch ngân hàng).</li>
            <li><strong>Dịch vụ gửi email:</strong> gửi email xác nhận, mã OTP đặt lại mật khẩu và cập nhật đơn.</li>
            <li><strong>Dịch vụ AI bên thứ ba:</strong> nhận nội dung tin nhắn bạn gửi cho Trợ lý để tạo câu trả lời.</li>
            <li><strong>Cloudinary:</strong> lưu ảnh bìa sách (không chứa dữ liệu của khách hàng).</li>
            <li><strong>Amazon Web Services và Cloudflare:</strong> máy chủ đặt tại Singapore và lớp mạng bảo vệ truy cập.</li>
            <li>Chúng tôi chỉ cung cấp dữ liệu cho cơ quan có thẩm quyền khi pháp luật yêu cầu.</li>
          </DanhSachGach>
        </MucPhapLy>

        <MucPhapLy id="luu-tru-bao-mat" bieuTuong={Lock} tieuDe="5. Thời Gian Lưu & Biện Pháp Bảo Vệ">
          <DanhSachGach>
            <li>Dữ liệu được lưu trong cơ sở dữ liệu SQL Server đặt trên máy chủ, chỉ phục vụ nội bộ ứng dụng; kết nối của bạn tới website được mã hóa bằng HTTPS.</li>
            <li>Mật khẩu được băm một chiều; khu quản trị nằm ở tên miền riêng và có lớp xác thực bổ sung.</li>
            <li><strong>Thời gian lưu:</strong> máy chủ chỉ chạy trong thời gian học tập và báo cáo đồ án. Sau đó toàn bộ dữ liệu, kể cả dữ liệu cá nhân, sẽ bị xóa cùng máy chủ.</li>
            <li>Không có hệ thống nào an toàn tuyệt đối. Đây là dự án học tập, vì vậy xin đừng nhập thông tin cá nhân thật mà bạn không muốn chia sẻ.</li>
          </DanhSachGach>
        </MucPhapLy>

        <MucPhapLy id="quyen-cua-ban" bieuTuong={KeyRound} tieuDe="6. Quyền Của Bạn Đối Với Dữ Liệu Cá Nhân">
          <DanhSachGach>
            <li><strong>Xem và chỉnh sửa:</strong> thành viên xem lịch sử đơn và sửa thông tin trong trang cá nhân.</li>
            <li><strong>Rút lại sự đồng ý, phản đối xử lý và khiếu nại:</strong> bạn có thể ngừng sử dụng website bất cứ lúc nào và gửi khiếu nại tới hòm thư bên dưới.</li>
          </DanhSachGach>
        </MucPhapLy>

        <MucPhapLy id="xoa-du-lieu" bieuTuong={Trash2} tieuDe="7. Yêu Cầu Xóa Dữ Liệu">
          <DoanVan>
            Bạn có quyền yêu cầu xóa dữ liệu cá nhân của mình (tài khoản, họ tên, số điện thoại, địa chỉ, email, đánh giá). Cách thực hiện:
          </DoanVan>
          <DanhSachGach>
            <li>Gửi email tới <a href={`mailto:${EMAIL_HO_TRO}`} style={{ color: 'var(--price)', fontWeight: 600 }}>{EMAIL_HO_TRO}</a> với tiêu đề <strong>"Yêu cầu xóa dữ liệu"</strong>, ghi rõ email hoặc số điện thoại đã dùng và mã đơn (nếu có) để chúng tôi tìm đúng dữ liệu.</li>
            <li>Người phụ trách xử lý thủ công trực tiếp trên cơ sở dữ liệu, thường trong vòng 7 ngày, rồi trả lời xác nhận cho bạn.</li>
            <li>Dữ liệu đã xóa không khôi phục được. Thông tin đơn hàng mẫu (không còn gắn với bạn) có thể được giữ lại để phục vụ báo cáo đồ án.</li>
          </DanhSachGach>
        </MucPhapLy>

        <KhungLienHePhapLy
          tieuDe="Người Phụ Trách Dữ Liệu"
          moTa="Mọi yêu cầu liên quan quyền riêng tư và dữ liệu cá nhân, xin gửi về:"
        />
      </NoiDungPhapLy>
    </KhungTrangPhapLy>
  );
};

export default ChinhSachBaoMat;
