import React from 'react';
import { Link } from 'react-router-dom';
import {
  Clock,
  Banknote,
  PackageCheck,
  TriangleAlert
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

export const ChinhSachHoanTien = () => {
  useCuonToiMucNeo();

  return (
    <KhungTrangPhapLy>
      <ThanhDieuHuongPhapLy dangMo="/chinh-sach-hoan-tien" />

      <TieuDeTrangPhapLy
        tieuDe="Đổi Trả & Hoàn Tiền"
        moTa="Quy định về đổi trả, hạn thanh toán chuyển khoản và cách nhận lại tiền nếu bạn lỡ chuyển khoản."
      />

      <NoiDungPhapLy>
        <MucPhapLy id="luu-y-quan-trong" bieuTuong={TriangleAlert} tieuDe="1. Đọc Trước Khi Chuyển Tiền">
          <DanhSachGach>
            <li>BookNest là dự án học tập, <strong>không có việc giao sách thật</strong>. Chuyển khoản qua QR là chuyển tiền thật qua ngân hàng, nhưng không đổi lại được sách.</li>
            <li>Vì vậy, <strong>đừng chuyển tiền</strong>. Muốn thử luồng mua hàng, hãy chọn thanh toán khi nhận hàng (COD), không thu tiền.</li>
            <li>Nếu đã lỡ chuyển, bạn vẫn được hoàn lại đúng số tiền đã chuyển theo mục 4 bên dưới.</li>
          </DanhSachGach>
        </MucPhapLy>

        <MucPhapLy id="han-thanh-toan" bieuTuong={Clock} tieuDe="2. Hạn Thanh Toán Chuyển Khoản QR">
          <DanhSachGach>
            <li>Mã QR có hiệu lực <strong>15 phút</strong> kể từ lúc đặt đơn. Trong lúc chờ, sách được giữ trong kho cho đơn của bạn.</li>
            <li>Quá 15 phút mà chưa nhận được tiền, hệ thống <strong>tự hủy đơn</strong> và trả sách về kho. Bạn có thể đặt lại đơn mới.</li>
            <li>Trước khi hết hạn, bạn có thể đổi đơn đó sang thanh toán khi nhận hàng (COD) ngay trên trang đơn hàng hoặc ở khung thanh toán.</li>
          </DanhSachGach>
        </MucPhapLy>

        <MucPhapLy id="doi-tra" bieuTuong={PackageCheck} tieuDe="3. Đổi Trả Sách (Quy Trình Mẫu)">
          <DoanVan>Đây là quy định thiết kế cho hệ thống. Vì không có giao hàng thật nên mục này chỉ để minh họa quy trình.</DoanVan>
          <DanhSachGach>
            <li><strong>Thời hạn:</strong> 7 ngày kể từ ngày nhận sách thành công (đơn ở trạng thái <em>Đã giao</em>).</li>
            <li><strong>Trường hợp được đổi:</strong> sách lỗi in ấn từ nhà xuất bản (thiếu trang, lặp trang, ngược chữ, mờ mực); gãy gáy hoặc rách do vận chuyển; đóng gói nhầm tựa sách.</li>
            <li><strong>Hình thức:</strong> đổi cuốn mới nguyên vẹn, phí vận chuyển hai chiều do cửa hàng chịu; nếu tựa sách hết hàng thì hoàn tiền.</li>
          </DanhSachGach>
        </MucPhapLy>

        <MucPhapLy id="hoan-tien" bieuTuong={Banknote} tieuDe="4. Hoàn Tiền Khi Bạn Đã Chuyển Khoản">
          <DoanVan>Hệ thống tự ghi nhận trạng thái <strong>"Cần hoàn tiền"</strong> trong các trường hợp:</DoanVan>
          <DanhSachGach>
            <li>Bạn chuyển khoản sau khi đơn đã bị hủy hoặc đã quá hạn 15 phút.</li>
            <li>Bạn hủy đơn sau khi chuyển khoản thành công.</li>
            <li>Số tiền chuyển không khớp số tiền của đơn.</li>
          </DanhSachGach>
          <DoanVan style={{ marginTop: '0.75rem' }}><strong>Cách nhận lại tiền:</strong></DoanVan>
          <DanhSachGach>
            <li>
              Gửi email tới <a href={`mailto:${EMAIL_HO_TRO}`} style={{ color: 'var(--price)', fontWeight: 600 }}>{EMAIL_HO_TRO}</a> với tiêu đề <strong>"Hoàn tiền"</strong>, kèm <strong>mã đơn</strong> (dạng BN-XXXXXX), thời điểm chuyển, số tiền và ảnh chụp giao dịch.
            </li>
            <li>Người phụ trách đối chiếu giao dịch với hệ thống thanh toán rồi <strong>chuyển trả đúng số tiền bạn đã chuyển</strong> về tài khoản ngân hàng đã chuyển đi. Việc hoàn tiền làm <strong>thủ công</strong>, không tự động tức thì.</li>
            <li>Thời gian xử lý dự kiến trong vòng <strong>7 ngày làm việc</strong> kể từ khi nhận đủ thông tin. Phí của ngân hàng (nếu có) do ngân hàng quy định.</li>
          </DanhSachGach>
          <DoanVan style={{ marginTop: '0.75rem' }}>
            Cam kết hoàn tiền này là của người phụ trách dự án học tập, không phải hợp đồng thương mại.
            Điều khoản chung xem tại <Link to="/dieu-khoan" style={{ color: 'var(--price)' }}>trang Điều khoản sử dụng</Link>.
          </DoanVan>
        </MucPhapLy>

        <KhungLienHePhapLy
          tieuDe="Kênh Nhận Yêu Cầu Hoàn Tiền"
          moTa="Gửi yêu cầu kèm mã đơn và ảnh chụp giao dịch tới:"
        />
      </NoiDungPhapLy>
    </KhungTrangPhapLy>
  );
};

export default ChinhSachHoanTien;
