import React, { useEffect, useRef } from 'react';
import { IconDong } from './icons.jsx';

/**
 * Component Hộp thoại Modal nền chung BookNest (HopThoai)
 * Tuân thủ Impeccable Design:
 * - Backdrop mờ kính nhẹ (backdrop-filter: blur)
 * - Khóa cuộn trang nền khi mở
 * - Focus Trap & phím tắt: Esc để đóng, Auto-focus phần tử đầu tiên
 * - ARIA accessibility: role="dialog", aria-modal="true"
 */
export function HopThoai({
  mo = false,
  onDong,
  tieuDe,
  children,
  footer,
  chanClickNgoai = false,
  kichThuoc = 'md', // 'sm' | 'md' | 'lg'
  icon = null,
  hienNutDong = true,
}) {
  const cardRef = useRef(null);
  const previousActiveElement = useRef(null);
  const onDongRef = useRef(onDong);

  // Luôn cập nhật ref cho onDong để không làm kích hoạt lại effect khi cha re-render
  useEffect(() => {
    onDongRef.current = onDong;
  });

  // Khóa cuộn trang nền và quản lý focus
  useEffect(() => {
    if (!mo) return;

    previousActiveElement.current = document.activeElement;
    const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    document.body.style.overflow = 'hidden';
    if (scrollBarWidth > 0) {
      document.body.style.paddingRight = `${scrollBarWidth}px`;
    }

    // Auto-focus phần tử: Ưu tiên [autofocus], ô input/textarea, hoặc nút hành động chính
    const timer = setTimeout(() => {
      if (!cardRef.current) return;

      const autoFocusEl = cardRef.current.querySelector(
        '[autofocus], input:not([type="hidden"]):not(:disabled), textarea:not(:disabled)'
      );
      if (autoFocusEl) {
        autoFocusEl.focus();
        return;
      }

      // Nếu không có ô nhập thì ưu tiên nút chính (Primary / Danger) trong footer
      const primaryBtn = cardRef.current.querySelector(
        '.bn-dialog-footer button.bn-btn-primary, .bn-dialog-footer button.bn-btn-danger'
      );
      if (primaryBtn) {
        primaryBtn.focus();
        return;
      }

      const focusable = cardRef.current.querySelectorAll(
        'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
      );
      if (focusable.length > 0) {
        focusable[0].focus();
      } else {
        cardRef.current.focus();
      }
    }, 50);

    // Xử lý phím Esc và Focus Trap
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        // Esc luôn đóng được; chanClickNgoai chỉ chặn bấm nền ngoài (tránh mất chữ đang gõ)
        if (onDongRef.current) {
          e.preventDefault();
          onDongRef.current();
        }
        return;
      }

      if (e.key === 'Tab' && cardRef.current) {
        const focusable = cardRef.current.querySelectorAll(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;

        const firstElement = focusable[0];
        const lastElement = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
          }
        } else {
          if (document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
      window.removeEventListener('keydown', handleKeyDown);
      if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
        previousActiveElement.current.focus();
      }
    };
  }, [mo]);

  if (!mo) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !chanClickNgoai && onDongRef.current) {
      onDongRef.current();
    }
  };

  const maxWidthClass =
    kichThuoc === 'sm' ? '400px' : kichThuoc === 'lg' ? '640px' : '480px';

  return (
    <div
      className="bn-dialog-backdrop"
      onClick={handleBackdropClick}
      role="presentation"
    >
      <div
        ref={cardRef}
        className="bn-dialog-card"
        style={{ maxWidth: maxWidthClass }}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tieuDe ? 'bn-dialog-title' : undefined}
        tabIndex={-1}
      >
        {(tieuDe || hienNutDong) && (
          <div className="bn-dialog-header">
            {icon && <div className="bn-dialog-icon">{icon}</div>}
            {tieuDe && (
              <h3 id="bn-dialog-title" className="bn-dialog-title">
                {tieuDe}
              </h3>
            )}
            {hienNutDong && onDong && (
              <button
                type="button"
                className="bn-toast-close"
                onClick={onDong}
                aria-label="Đóng hộp thoại"
                style={{ marginLeft: 'auto' }}
              >
                <IconDong size={18} />
              </button>
            )}
          </div>
        )}

        <div className="bn-dialog-body">{children}</div>

        {footer && <div className="bn-dialog-footer">{footer}</div>}
      </div>
    </div>
  );
}

export default HopThoai;
