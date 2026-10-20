import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@booknest/shared/api';
import { ChevronRight } from 'lucide-react';

// Khối "Cần xử lý" theo vai trò (T40): mỗi mục là một lối tắt tới màn hình xử lý.
// Làm mới theo trang chủ qua lanTaiNgoai, nên khối này không có nút làm mới riêng.
export const KhoiViecCanLam = ({ className = '', lanTaiNgoai = 0 }) => {
  const navigate = useNavigate();
  const [duLieuSummary, setDuLieuSummary] = useState(null);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState('');
  const [lanThu, setLanThu] = useState(0);

  useEffect(() => {
    let daHuy = false;
    api.get('/admin/summary')
      .then((res) => {
        if (!daHuy && res.data?.data) {
          setDuLieuSummary(res.data.data);
          setLoi('');
        }
      })
      .catch((err) => {
        if (!daHuy) {
          console.error('Lỗi lấy summary công việc:', err);
          setLoi('Không tải được danh sách việc cần xử lý.');
        }
      })
      .finally(() => {
        if (!daHuy) {
          setDangTai(false);
        }
      });

    return () => {
      daHuy = true;
    };
  }, [lanTaiNgoai, lanThu]);

  const thuLai = () => {
    setDangTai(true);
    setLanThu((n) => n + 1);
  };

  const danhSach = duLieuSummary?.dieuHuongNhanh || [];
  const tongSoViec = danhSach.reduce((acc, cur) => acc + (cur.soLuong || 0), 0);

  return (
    <section className={`admindash-panel ${className}`} style={{ marginBottom: '1rem' }}>
      <div className="admindash-panel-head">
        <h2 className="admindash-panel-title">Cần xử lý</h2>
        {duLieuSummary && (
          <span className="admindash-panel-note tabular-nums">
            {tongSoViec > 0 ? `${tongSoViec} đầu việc đang tồn` : 'Không có việc tồn'}
          </span>
        )}
      </div>

      {dangTai && !duLieuSummary ? (
        <div className="admindash-strip" aria-busy="true">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="admindash-strip-item">
              <div className="admindash-skeleton" style={{ width: '110px', height: '13px' }} />
              <div className="admindash-skeleton" style={{ width: '48px', height: '28px', marginTop: '4px' }} />
            </div>
          ))}
        </div>
      ) : loi && !duLieuSummary ? (
        <div className="admindash-empty">
          {loi}{' '}
          <button type="button" className="btn btn-outline btn-sm" onClick={thuLai} style={{ marginLeft: '0.5rem' }}>
            Thử lại
          </button>
        </div>
      ) : danhSach.length === 0 ? (
        <div className="admindash-empty">Mọi việc đã được xử lý xong.</div>
      ) : (
        <div className="admindash-strip">
          {danhSach.map((item, idx) => {
            const soLuong = Number(item.soLuong) || 0;
            const lop = soLuong === 0 ? 'is-zero' : item.mauSac === 'danger' ? 'is-danger' : '';
            const noiDung = (
              <>
                <span className="admindash-strip-label">{item.tieuDe}</span>
                <span className={`admindash-strip-value ${lop}`}>
                  {soLuong}
                  {item.duongDan && <ChevronRight size={16} className="admindash-strip-go" />}
                </span>
              </>
            );

            // Có đường dẫn thì là nút bấm thật (phím Tab, Enter hoạt động sẵn); không thì chỉ là ô hiển thị
            return item.duongDan ? (
              <button
                key={idx}
                type="button"
                className="admindash-strip-item"
                onClick={() => navigate(item.duongDan)}
              >
                {noiDung}
              </button>
            ) : (
              <div key={idx} className="admindash-strip-item">{noiDung}</div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default KhoiViecCanLam;
