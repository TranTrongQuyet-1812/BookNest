import React, { useRef, useState, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'lucide-react';

/**
 * Component TaiAnhBia - Chọn, xem trước và quản lý ảnh bìa sách (AT07)
 * Giao diện tối giản, trực quan, hỗ trợ xem trước ảnh bìa và kiểm soát dung lượng <= 5MB.
 */
const TaiAnhBia = ({
  anhHienTai,
  fileMoi,
  onThayDoiFile,
  disabled = false
}) => {
  const inputRef = useRef(null);
  const [urlXemTruoc, setUrlXemTruoc] = useState('');
  const [thongBaoLoi, setThongBaoLoi] = useState('');

  // Thu hồi ObjectURL khi đổi file hoặc unmount để tránh rò rỉ bộ nhớ trình duyệt
  useEffect(() => {
    if (!fileMoi) {
      if (urlXemTruoc) {
        URL.revokeObjectURL(urlXemTruoc);
        setUrlXemTruoc('');
      }
      return;
    }

    const objectUrl = URL.createObjectURL(fileMoi);
    setUrlXemTruoc(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [fileMoi]);

  const handleChonFile = (e) => {
    setThongBaoLoi('');
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];

    // 1. Kiểm tra định dạng file
    const loaiHopLe = ['image/jpeg', 'image/png', 'image/webp'];
    if (!loaiHopLe.includes(file.type.toLowerCase())) {
      setThongBaoLoi('Định dạng file không hỗ trợ. Vui lòng chọn file ảnh JPG, PNG hoặc WebP.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    // 2. Kiểm tra dung lượng file (tối đa 5MB)
    const dungLuongToiDa = 5 * 1024 * 1024;
    if (file.size > dungLuongToiDa) {
      setThongBaoLoi('Dung lượng ảnh vượt quá giới hạn 5MB. Vui lòng chọn ảnh nhỏ hơn.');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    onThayDoiFile(file);
  };

  const handleBoAnh = () => {
    setThongBaoLoi('');
    if (inputRef.current) inputRef.current.value = '';
    onThayDoiFile(null);
  };

  const anhDangHienThi = urlXemTruoc || anhHienTai;

  return (
    <div className="form-group" style={{ marginBottom: '1rem' }}>
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>Ảnh bìa sách</span>
        <span style={{ fontSize: '0.75rem', color: 'var(--adm-text-muted)', fontWeight: 400 }}>
          Hỗ trợ JPG, PNG, WebP (tối đa 5MB)
        </span>
      </label>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        onChange={handleChonFile}
        disabled={disabled}
      />

      <div style={{
        display: 'flex',
        gap: '1rem',
        alignItems: 'center',
        padding: '0.85rem',
        backgroundColor: 'var(--adm-bg-surface, #F9FAFB)',
        border: '1px solid var(--adm-border, #E5E7EB)',
        borderRadius: '8px'
      }}>
        {/* Khung xem trước ảnh */}
        <div style={{
          width: '72px',
          height: '96px',
          backgroundColor: '#E5E7EB',
          borderRadius: '6px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          border: '1px solid rgba(0,0,0,0.08)',
          position: 'relative'
        }}>
          {anhDangHienThi ? (
            <img
              src={anhDangHienThi}
              alt="Ảnh bìa xem trước"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <ImageIcon size={28} style={{ color: 'var(--adm-text-muted, #9CA3AF)' }} />
          )}
        </div>

        {/* Khu vực thao tác và thông tin */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {!disabled && (
              <>
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={() => inputRef.current?.click()}
                  style={{ fontSize: '0.82rem', padding: '0.35rem 0.75rem' }}
                >
                  <Upload size={14} />
                  {anhDangHienThi ? 'Đổi ảnh khác' : 'Chọn ảnh bìa'}
                </button>

                {(fileMoi || anhHienTai) && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleBoAnh}
                    style={{
                      fontSize: '0.82rem',
                      padding: '0.35rem 0.65rem',
                      color: 'var(--adm-danger, #EF4444)',
                      borderColor: 'rgba(239, 68, 68, 0.3)'
                    }}
                    title="Gỡ ảnh này"
                  >
                    <X size={14} /> Bỏ ảnh
                  </button>
                )}
              </>
            )}

            {fileMoi && (
              <span style={{ fontSize: '0.78rem', color: 'var(--adm-success, #10B981)', fontWeight: 600 }}>
                ✓ Đã chọn file mới ({Math.round(fileMoi.size / 1024)} KB)
              </span>
            )}
          </div>

          <p style={{
            margin: '0.35rem 0 0',
            fontSize: '0.75rem',
            color: 'var(--adm-text-muted, #6B7280)',
            lineHeight: 1.4
          }}>
            {fileMoi
              ? 'Ảnh sẽ được tối ưu và cập nhật tự động khi bạn bấm Lưu.'
              : anhHienTai
                ? 'Đang sử dụng ảnh bìa hiện tại của tác phẩm.'
                : 'Chưa có ảnh bìa. Bấm Chọn ảnh bìa để tải file từ máy tính.'}
          </p>

          {thongBaoLoi && (
            <p style={{
              margin: '0.35rem 0 0',
              fontSize: '0.75rem',
              color: 'var(--adm-danger, #EF4444)',
              fontWeight: 500
            }}>
              {thongBaoLoi}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TaiAnhBia;
