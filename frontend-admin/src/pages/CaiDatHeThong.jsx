import React, { useEffect, useState } from 'react';
import api from '@booknest/shared/api';
import { useThongBao, ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';

// Mô tả hậu quả từng công tắc để Quản trị viên hiểu rõ trước khi tắt (hiện chỉ có công tắc thanh toán QR)
const MO_TA_CONG_TAC = {
  THANH_TOAN_QR_BAT: [
    'Khi TẮT: cửa hàng không tạo thêm mã QR nào, khách chỉ còn chọn thanh toán khi nhận hàng (COD).',
    'Trang thanh toán của khách đang mở sẽ ẩn lựa chọn QR ngay, không cần tải lại. Máy chủ vẫn từ chối dù ai đó cố gửi yêu cầu QR bằng cách khác.',
    'Đơn đã chuyển khoản dở dang vẫn được ghi nhận khi tiền về (webhook không bị tắt), không bỏ rơi khách đã chuyển.'
  ]
};

const dinhDangNgay = (giaTri) => (giaTri ? new Date(giaTri).toLocaleString('vi-VN') : null);

export default function CaiDatHeThong() {
  const [danhSach, setDanhSach] = useState([]);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState('');
  const [dangDoi, setDangDoi] = useState(false);
  const [khoaChoXacNhanTat, setKhoaChoXacNhanTat] = useState(null);
  const { thongBao: tb } = useThongBao();

  const taiDanhSach = async () => {
    setDangTai(true);
    try {
      const res = await api.get('/admin/settings');
      setDanhSach(res.data.data);
      setLoi('');
    } catch (err) {
      setLoi(loiTuApi(err, 'Không tải được cài đặt hệ thống.'));
    } finally {
      setDangTai(false);
    }
  };

  useEffect(() => { taiDanhSach(); }, []);

  const datCongTac = async (congTac, bat) => {
    setDangDoi(true);
    try {
      const res = await api.put(`/admin/settings/${congTac.khoa}`, { bat });
      setDanhSach((cu) => cu.map((c) => (c.khoa === congTac.khoa ? res.data.data : c)));
      setKhoaChoXacNhanTat(null);
      setLoi('');
      tb.thanhCong(`${congTac.ten}: đã ${bat ? 'BẬT' : 'TẮT'}.`);
    } catch (err) {
      setLoi(loiTuApi(err, 'Không đổi được công tắc. Vui lòng thử lại.'));
    } finally {
      setDangDoi(false);
    }
  };

  // Bật thì làm ngay; tắt thì hỏi lại một lần vì khách sẽ mất lựa chọn QR
  const bamCongTac = (congTac) => {
    if (congTac.bat) setKhoaChoXacNhanTat(congTac.khoa);
    else datCongTac(congTac, true);
  };

  return (
    <div className="bo-page">
      <div className="bo-page-heading">
        <div>
          <h1>Cài đặt hệ thống</h1>
          <p>Công tắc khẩn cấp của cửa hàng. Mọi lần đổi đều được ghi vào Lịch sử thay đổi.</p>
        </div>
        <button className="bo-secondary-button" onClick={taiDanhSach}>Làm mới</button>
      </div>

      {loi && <ThongBaoTaiCho loai="loi" onDong={() => setLoi('')}>{loi}</ThongBaoTaiCho>}

      {dangTai ? <div className="bo-empty">Đang tải cài đặt…</div> : danhSach.map((congTac) => (
        <section key={congTac.khoa} className="bo-panel cai-dat-the">
          <div className="cai-dat-chinh">
            <div>
              <h2>{congTac.ten}</h2>
              <span className={`cai-dat-nhan ${congTac.bat ? 'bat' : 'tat'}`}>{congTac.bat ? 'Đang BẬT' : 'Đang TẮT'}</span>
              {congTac.bat && !congTac.daDuDieuKien && (
                <p className="cai-dat-canh-bao">Đã bật nhưng chưa đủ khóa payOS trong tệp .env của máy chủ, nên thực tế khách vẫn chưa dùng được QR.</p>
              )}
              <ul>{(MO_TA_CONG_TAC[congTac.khoa] || []).map((dong) => <li key={dong}>{dong}</li>)}</ul>
              <small>
                {congTac.ngayCapNhat
                  ? `Đổi lần cuối: ${congTac.nhanVienCapNhat || 'nhân viên không còn hoạt động'}, ${dinhDangNgay(congTac.ngayCapNhat)}`
                  : 'Chưa có lần đổi nào được ghi nhận.'}
              </small>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={congTac.bat}
            aria-label={`${congTac.bat ? 'Tắt' : 'Bật'} ${congTac.ten}`}
            className={`cai-dat-cong-tac ${congTac.bat ? 'bat' : ''}`}
            disabled={dangDoi}
            onClick={() => bamCongTac(congTac)}
          >
            <span className="cai-dat-nut" />
          </button>

          {khoaChoXacNhanTat === congTac.khoa && (
            <div className="cai-dat-xac-nhan" role="alertdialog" aria-label="Xác nhận tắt công tắc">
              <strong>Tắt {congTac.ten}?</strong>
              <span>Khách sẽ không còn thấy lựa chọn chuyển khoản QR cho tới khi bật lại.</span>
              <div>
                <button className="bo-secondary-button" disabled={dangDoi} onClick={() => setKhoaChoXacNhanTat(null)}>Giữ nguyên</button>
                <button className="bo-danger-button" disabled={dangDoi} onClick={() => datCongTac(congTac, false)}>{dangDoi ? 'Đang tắt…' : 'Xác nhận tắt'}</button>
              </div>
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
