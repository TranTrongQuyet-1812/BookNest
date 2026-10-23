import React from 'react';
import {
  Database,
  Target,
  Copyright,
  Tag,
  Flag
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

const lienKetNgoai = { color: 'var(--price)', fontWeight: 600 };

export const NguonDuLieu = () => {
  useCuonToiMucNeo();

  return (
    <KhungTrangPhapLy>
      <ThanhDieuHuongPhapLy dangMo="/nguon-du-lieu" />

      <TieuDeTrangPhapLy
        tieuDe="Nguồn Dữ Liệu & Bản Quyền"
        moTa="Thông tin về sách trên website lấy từ đâu, dùng vào việc gì và cách chủ sở hữu yêu cầu gỡ nội dung."
      />

      <NoiDungPhapLy>
        <MucPhapLy id="nguon" bieuTuong={Database} tieuDe="1. Dữ Liệu Sách Lấy Từ Đâu">
          <DoanVan>
            Thông tin sách trong hệ thống (tên sách, tác giả, thể loại, mô tả và ảnh bìa) được <strong>thu thập tự động (cào dữ liệu) từ các website công khai</strong> của hai nhà xuất bản:
          </DoanVan>
          <DanhSachGach>
            <li><strong>Nhà xuất bản Kim Đồng</strong>: <a href="https://nxbkimdong.com.vn" target="_blank" rel="noopener noreferrer" style={lienKetNgoai}>nxbkimdong.com.vn</a></li>
            <li><strong>Nhã Nam</strong>: <a href="https://nhanam.vn" target="_blank" rel="noopener noreferrer" style={lienKetNgoai}>nhanam.vn</a></li>
          </DanhSachGach>
          <DoanVan style={{ marginTop: '0.75rem' }}>
            Sau khi thu thập, dữ liệu được làm sạch và nạp vào cơ sở dữ liệu của BookNest; ảnh bìa được nén và lưu trên dịch vụ lưu ảnh để hiển thị nhanh.
          </DoanVan>
        </MucPhapLy>

        <MucPhapLy id="muc-dich" bieuTuong={Target} tieuDe="2. Dùng Để Làm Gì">
          <DanhSachGach>
            <li>Chỉ làm <strong>dữ liệu mẫu</strong> để minh họa một website bán sách trong đồ án học tập.</li>
            <li>Không bán lại, không thu phí, không chạy quảng cáo và không dùng cho mục đích thương mại.</li>
            <li>BookNest <strong>không liên kết, hợp tác hay được ủy quyền</strong> bởi Kim Đồng, Nhã Nam hoặc bất kỳ tác giả nào.</li>
          </DanhSachGach>
        </MucPhapLy>

        <MucPhapLy id="ban-quyen" bieuTuong={Copyright} tieuDe="3. Bản Quyền">
          <DanhSachGach>
            <li>Tên sách, nội dung mô tả và ảnh bìa thuộc quyền của tác giả, nhà xuất bản và các bên liên quan. BookNest không sở hữu các nội dung này.</li>
            <li>Mọi tài sản trí tuệ của bên thứ ba trên website chỉ được trình bày với mục đích học tập.</li>
          </DanhSachGach>
        </MucPhapLy>

        <MucPhapLy id="gia-ton-kho" bieuTuong={Tag} tieuDe="4. Giá Bán & Tồn Kho">
          <DoanVan>
            Giá bán, mức giảm giá, số lượng tồn và các đơn hàng trong hệ thống là <strong>dữ liệu mẫu hoặc dữ liệu giả lập</strong>. Chúng không phản ánh giá hay tình trạng hàng của nhà xuất bản hay bất kỳ nhà sách nào.
            Muốn biết giá và mua sách thật, vui lòng truy cập trực tiếp website của nhà xuất bản ở mục 1.
          </DoanVan>
        </MucPhapLy>

        <MucPhapLy id="yeu-cau-go" bieuTuong={Flag} tieuDe="5. Yêu Cầu Gỡ Nội Dung">
          <DoanVan>
            Nếu bạn là chủ sở hữu hoặc đại diện hợp pháp của một nội dung và không muốn nội dung đó xuất hiện trên BookNest:
          </DoanVan>
          <DanhSachGach>
            <li>
              Gửi email tới <a href={`mailto:${EMAIL_HO_TRO}`} style={lienKetNgoai}>{EMAIL_HO_TRO}</a>, nêu tên sách hoặc đường dẫn trang cần gỡ.
            </li>
            <li>Chúng tôi sẽ <strong>gỡ nội dung đó trong vòng 24 giờ làm việc</strong> kể từ khi nhận được yêu cầu, không cần tranh luận, rồi trả lời xác nhận cho bạn.</li>
            <li>Nếu cần, chúng tôi sẵn sàng gỡ toàn bộ dữ liệu của một nhà xuất bản khỏi hệ thống.</li>
          </DanhSachGach>
        </MucPhapLy>

        <KhungLienHePhapLy
          tieuDe="Liên Hệ Về Bản Quyền"
          moTa="Yêu cầu gỡ nội dung hoặc thắc mắc về nguồn dữ liệu, xin gửi về:"
        />
      </NoiDungPhapLy>
    </KhungTrangPhapLy>
  );
};

export default NguonDuLieu;
