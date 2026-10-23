import React from 'react';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Truck,
  CreditCard,
  CheckCircle2,
  GraduationCap,
  Scale,
  Library
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
import { useCuonToiMucNeo } from '../components/phapLyDungChung';

const maDonStyle = { backgroundColor: 'var(--bg-surface)', padding: '0.1rem 0.35rem', borderRadius: '4px' };

export const DieuKhoanDichVu = () => {
  useCuonToiMucNeo();

  return (
    <KhungTrangPhapLy>
      <ThanhDieuHuongPhapLy dangMo="/dieu-khoan" />

      <TieuDeTrangPhapLy
        tieuDe="Điều Khoản Sử Dụng"
        moTa="Quy tắc sử dụng website BookNest, một đề tài học tập: bạn được làm gì, hệ thống vận hành ra sao và giới hạn trách nhiệm ở đâu."
      />

      <NoiDungPhapLy>
        <MucPhapLy id="muc-dich" bieuTuong={GraduationCap} tieuDe="1. Mục Đích & Phạm Vi">
          <DoanVan>
            Website <strong>BookNest</strong> là đề tài đồ án môn học Công nghệ phần mềm do sinh viên <strong>Trần Trọng Quyết</strong> (Trường Đại Học Lạc Hồng) phát triển, được đưa lên mạng để nghiên cứu, học tập và kiểm thử kỹ thuật.
          </DoanVan>
          <DanhSachGach>
            <li>BookNest <strong>không phải cửa hàng thật</strong>: không có tư cách pháp nhân, không đăng ký kinh doanh và không có kho sách. Sách và giá hiển thị là dữ liệu mẫu.</li>
            <li>Đơn hàng được tạo trên website chỉ để minh họa quy trình mua bán và <strong>sẽ không được giao</strong>.</li>
            <li>Bằng việc sử dụng website, bạn xác nhận đã đọc và hiểu các điều khoản này. Nếu không đồng ý, vui lòng ngừng sử dụng.</li>
          </DanhSachGach>
        </MucPhapLy>

        <MucPhapLy id="tai-khoan" bieuTuong={CheckCircle2} tieuDe="2. Tài Khoản & Hành Vi Bị Cấm">
          <DoanVan>
            Bạn có thể dùng website dưới hình thức <strong>khách vãng lai</strong> hoặc <strong>thành viên có tài khoản</strong>.
          </DoanVan>
          <DanhSachGach>
            <li>Bạn tự bảo mật thông tin đăng nhập và không chia sẻ mật khẩu cho người khác.</li>
            <li>Không dùng bot để tạo đơn ảo hàng loạt, tấn công từ chối dịch vụ, dò quét mã đơn hàng của người khác hoặc cố truy cập trái phép vào hệ thống. Hệ thống giới hạn tần suất truy cập và có thể chặn địa chỉ IP có dấu hiệu bất thường.</li>
            <li>Không đăng nội dung vi phạm pháp luật, xúc phạm người khác hoặc chứa thông tin cá nhân của người thứ ba trong phần đánh giá sách. Nội dung như vậy có thể bị gỡ mà không cần báo trước.</li>
          </DanhSachGach>
        </MucPhapLy>

        <MucPhapLy id="dat-huy-don" bieuTuong={BookOpen} tieuDe="3. Quy Trình Đặt Hàng & Hủy Đơn (Mô Phỏng)">
          <DoanVan>Khi bạn bấm <em>"Xác nhận đặt hàng"</em>:</DoanVan>
          <DanhSachGach>
            <li>Đơn được ghi nhận với mã tra cứu ngẫu nhiên (ví dụ <code style={maDonStyle}>BN-XXXXXX</code>) và ở trạng thái <strong>Chờ duyệt</strong>.</li>
            <li>Khi đơn còn <em>Chờ duyệt</em>, bạn tự hủy được ngay trong trang chi tiết đơn.</li>
            <li>Khi đơn đã <em>Đã duyệt</em> hoặc <em>Đã lấy hàng</em>, nếu cần thay đổi hãy liên hệ người phụ trách qua email ở cuối trang.</li>
            <li>Đơn chọn chuyển khoản QR mà chưa thanh toán sẽ tự hủy sau 15 phút và sách được trả lại kho (xem <Link to="/chinh-sach-hoan-tien" style={{ color: 'var(--price)' }}>Đổi trả & hoàn tiền</Link>).</li>
          </DanhSachGach>
        </MucPhapLy>

        <MucPhapLy id="van-chuyen" bieuTuong={Truck} tieuDe="4. Giao Nhận (Quy Trình Mẫu)">
          <DoanVan>
            Đây là quy trình được thiết kế cho hệ thống. Vì BookNest là dự án học tập nên <strong>không có việc giao sách thật</strong>.
          </DoanVan>
          <DanhSachGach>
            <li><strong>Phí vận chuyển:</strong> hệ thống thiết kế miễn phí vận chuyển cho mọi đơn.</li>
            <li><strong>Thời gian giao dự kiến trong thiết kế:</strong> 1–2 ngày làm việc nội thành, 3–5 ngày làm việc các tỉnh thành khác.</li>
            <li><strong>Kiểm hàng khi nhận:</strong> thiết kế cho phép khách mở gói kiểm tra ngoại quan cùng nhân viên giao hàng trước khi nhận.</li>
          </DanhSachGach>
        </MucPhapLy>

        <MucPhapLy id="thanh-toan" bieuTuong={CreditCard} tieuDe="5. Thanh Toán">
          <DoanVan>Hệ thống có hai phương thức:</DoanVan>
          <DanhSachGach>
            <li><strong>Thanh toán khi nhận hàng (COD):</strong> không thu tiền trước. Vì không có giao hàng thật nên bạn sẽ không phải trả khoản nào.</li>
            <li>
              <strong>Chuyển khoản VietQR qua payOS:</strong> mã QR có hiệu lực 15 phút. Đây là luồng chuyển tiền thật qua ngân hàng,
              {' '}<strong>vui lòng không chuyển tiền</strong> vì đơn sẽ không được giao. Nếu đã chuyển, xem cách xử lý và hoàn tiền tại{' '}
              <Link to="/chinh-sach-hoan-tien" style={{ color: 'var(--price)' }}>trang Đổi trả & hoàn tiền</Link>.
            </li>
          </DanhSachGach>
        </MucPhapLy>

        <MucPhapLy id="so-huu-tri-tue" bieuTuong={Library} tieuDe="6. Sở Hữu Trí Tuệ & Nguồn Dữ Liệu">
          <DoanVan>
            Tên sách, tên tác giả, mô tả và ảnh bìa thuộc quyền của tác giả và nhà xuất bản tương ứng. BookNest không sở hữu các nội dung này.
            Dữ liệu được lấy từ đâu và cách yêu cầu gỡ nội dung được nêu tại{' '}
            <Link to="/nguon-du-lieu" style={{ color: 'var(--price)' }}>trang Nguồn dữ liệu & bản quyền</Link>.
          </DoanVan>
        </MucPhapLy>

        <MucPhapLy id="gioi-han-trach-nhiem" bieuTuong={Scale} tieuDe="7. Giới Hạn Trách Nhiệm & Luật Áp Dụng">
          <DanhSachGach>
            <li>Website được cung cấp <strong>"nguyên trạng"</strong>, có thể gián đoạn, thay đổi hoặc bị xóa toàn bộ dữ liệu bất cứ lúc nào, đặc biệt sau đợt báo cáo đồ án.</li>
            <li>Người phụ trách không chịu trách nhiệm cho thiệt hại phát sinh từ việc bạn đặt hàng, chuyển tiền hoặc nhập thông tin cá nhân vào một website học tập. Riêng khoản tiền chuyển nhầm, người phụ trách sẽ hoàn lại như mô tả tại trang đổi trả và hoàn tiền.</li>
            <li>Điều khoản có thể thay đổi; phiên bản mới có hiệu lực khi đăng tại trang này. Điều khoản được hiểu theo pháp luật Việt Nam.</li>
          </DanhSachGach>
        </MucPhapLy>

        <KhungLienHePhapLy
          tieuDe="Kênh Tiếp Nhận Hỗ Trợ"
          moTa="Mọi thắc mắc về đơn hàng, chuyển khoản nhầm hoặc điều khoản, xin liên hệ:"
        />
      </NoiDungPhapLy>
    </KhungTrangPhapLy>
  );
};

export default DieuKhoanDichVu;
