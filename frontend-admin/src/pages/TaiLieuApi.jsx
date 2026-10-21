import React, { useEffect, useRef, useState } from 'react';
import SwaggerUI from 'swagger-ui-dist/swagger-ui-es-bundle.js';
import 'swagger-ui-dist/swagger-ui.css';
import api from '@booknest/shared/api';
import { ThongBaoTaiCho, loiTuApi } from '@booknest/shared/thongbao';

// Trang "Tài liệu API" (Swagger) trong khu quản trị, chỉ quản trị viên vào được.
// Đặc tả lấy từ /api/admin/api-docs.json (máy chủ kiểm quyền), không dùng /api-docs công khai.
export default function TaiLieuApi() {
  const vungHienThi = useRef(null);
  const [dangTai, setDangTai] = useState(true);
  const [loi, setLoi] = useState('');

  useEffect(() => {
    let daHuy = false;
    const vung = vungHienThi.current;

    const taiVaVe = async () => {
      try {
        const res = await api.get('/admin/api-docs.json');
        if (daHuy || !vung) return;
        SwaggerUI({
          spec: res.data,
          domNode: vung,
          docExpansion: 'none',
          deepLinking: false,
          // "Try it out" gửi kèm token của chính quản trị viên đang đăng nhập, khỏi phải dán tay vào ô Authorize
          requestInterceptor: (yeuCau) => {
            try {
              const token = localStorage.getItem('booknest_token');
              if (token) yeuCau.headers.Authorization = `Bearer ${token}`;
            } catch {
              // Trình duyệt chặn đọc storage: gửi không kèm token
            }
            return yeuCau;
          }
        });
        setLoi('');
      } catch (err) {
        if (!daHuy) setLoi(loiTuApi(err, 'Không tải được tài liệu API.'));
      } finally {
        if (!daHuy) setDangTai(false);
      }
    };

    taiVaVe();
    return () => {
      daHuy = true;
      if (vung) vung.innerHTML = '';
    };
  }, []);

  return (
    <div>
      <div className="admindash-page-head">
        <div>
          <h1 className="admindash-page-title">Tài liệu API (Swagger)</h1>
          <p className="admindash-page-desc">
            Danh sách toàn bộ API của BookNest. Nút "Try it out" gọi thật vào hệ thống bằng tài khoản quản trị đang đăng nhập, nên các thao tác ghi sẽ thay đổi dữ liệu thật.
          </p>
        </div>
      </div>

      {loi && <ThongBaoTaiCho loai="loi">{loi}</ThongBaoTaiCho>}
      {dangTai && !loi && (
        <p style={{ color: 'var(--adm-text-muted)', fontSize: '0.9rem' }}>Đang tải tài liệu API…</p>
      )}

      {/* Giao diện Swagger tự có nền sáng nên đặt trong khung trắng để đọc rõ cả khi khu quản trị ở chế độ tối */}
      <div
        className="admindash-panel"
        style={{ backgroundColor: '#ffffff', colorScheme: 'light', padding: '0.5rem 1rem', display: loi ? 'none' : 'block' }}
      >
        <div ref={vungHienThi} />
      </div>
    </div>
  );
}
