import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ThongBaoContext } from './ThongBaoContext.jsx';
import { HopThoai } from './HopThoai.jsx';
import { loiTuApi } from './loiTuApi.js';
import {
  IconThanhCong,
  IconLoi,
  IconCanhBao,
  IconThongTin,
  IconDong,
} from './icons.jsx';
import './thongbao.css';

// Thời gian hiển thị mặc định theo từng loại toast (ms)
const THOI_GIAN_TOAST = {
  thanhCong: 4000,
  thongTin: 5000,
  canhBao: 6000,
  loi: 8000,
};

/**
 * Từng Toast Item với khả năng pause khi hover và progress bar
 */
function ToastItem({ toast, onDong }) {
  const [dangThoat, setDangThoat] = useState(false);
  const timerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const remainingRef = useRef(toast.thoiGian);

  const batDauTimer = useCallback((thoiGian) => {
    if (thoiGian <= 0) return;
    startTimeRef.current = Date.now();
    remainingRef.current = thoiGian;
    timerRef.current = setTimeout(() => {
      dong();
    }, thoiGian);
  }, []);

  const dong = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDangThoat(true);
    setTimeout(() => {
      onDong(toast.id);
    }, 220); // Khớp với animation bn-toast-exit 0.22s
  }, [onDong, toast.id]);

  useEffect(() => {
    batDauTimer(toast.thoiGian);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [batDauTimer, toast.thoiGian]);

  const handleMouseEnter = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      const daChay = Date.now() - startTimeRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - daChay);
    }
  };

  const handleMouseLeave = () => {
    if (remainingRef.current > 0) {
      batDauTimer(remainingRef.current);
    } else {
      dong();
    }
  };

  const iconMap = {
    thanhCong: <IconThanhCong size={20} className="bn-toast-icon" />,
    loi: <IconLoi size={20} className="bn-toast-icon" />,
    canhBao: <IconCanhBao size={20} className="bn-toast-icon" />,
    thongTin: <IconThongTin size={20} className="bn-toast-icon" />,
  };

  const roleAttr = toast.loai === 'loi' ? 'alert' : 'status';

  return (
    <div
      className={`bn-toast-item bn-toast-${toast.loai} ${
        dangThoat ? 'bn-toast-leaving' : ''
      }`}
      role={roleAttr}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="bn-toast-icon-wrapper" aria-hidden="true">
        {iconMap[toast.loai] || iconMap.thongTin}
      </div>

      <div className="bn-toast-content">
        {toast.tieuDe && <div className="bn-toast-title">{toast.tieuDe}</div>}
        <div className="bn-toast-message">{toast.noiDung}</div>
      </div>

      <button
        type="button"
        className="bn-toast-close"
        onClick={dong}
        aria-label="Đóng thông báo"
      >
        <IconDong size={16} />
      </button>

      {/* Progress bar thời gian */}
      <div
        className="bn-toast-progress"
        style={{
          animationDuration: `${toast.thoiGian}ms`,
        }}
      />
    </div>
  );
}

/**
 * Provider Quản lý Thông báo, Toast và Hộp thoại dùng chung toàn hệ thống
 */
export function ThongBaoProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const lichSuNoiDung = useRef(new Map()); // Debounce gộp trùng nội dung 1.5s

  // State Hộp thoại Xác nhận (xacNhan)
  const [xacNhanState, setXacNhanState] = useState({
    mo: false,
    tieuDe: 'Xác nhận thao tác',
    noiDung: '',
    nhanXacNhan: 'Xác nhận',
    nhanHuy: 'Hủy bỏ',
    nguyHiem: false,
    kichThuoc: 'md',
    resolve: null,
  });

  // State Hộp thoại Nhập Lý Do (nhapLyDo)
  const [nhapLyDoState, setNhapLyDoState] = useState({
    mo: false,
    tieuDe: 'Nhập thông tin',
    noiDung: '',
    giaTri: '',
    placeholder: 'Nhập lý do tại đây...',
    nhan: 'Lý do',
    batBuoc: true,
    toiDa: 500,
    kieuInput: 'textarea', // 'textarea' | 'text'
    nhanXacNhan: 'Đồng ý',
    nhanHuy: 'Hủy bỏ',
    nguyHiem: false,
    loiInline: '',
    resolve: null,
  });

  // 1. Thao tác Toast
  const xoaToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const themToast = useCallback((loai, noiDung, options = {}) => {
    if (!noiDung) return;
    const chuoiNoiDung = typeof noiDung === 'string' ? noiDung.trim() : String(noiDung);
    const bayGio = Date.now();

    // Chống spam thông điệp trùng nhau trong 1.5 giây
    const lanCuoi = lichSuNoiDung.current.get(chuoiNoiDung) || 0;
    if (bayGio - lanCuoi < 1500) {
      return;
    }
    lichSuNoiDung.current.set(chuoiNoiDung, bayGio);

    const id = `toast_${bayGio}_${Math.random().toString(36).slice(2, 7)}`;
    const thoiGian = options.thoiGian || THOI_GIAN_TOAST[loai] || 5000;

    const toastMoi = {
      id,
      loai,
      noiDung: chuoiNoiDung,
      tieuDe: options.tieuDe || null,
      thoiGian,
    };

    setToasts((prev) => {
      // Giới hạn tối đa 3 toast cùng lúc. Nếu có 3 toast, đẩy toast cũ nhất ra
      const danhSach = prev.length >= 3 ? prev.slice(prev.length - 2) : prev;
      return [...danhSach, toastMoi];
    });

    return id;
  }, []);

  // Các phương thức tắt mở toast
  const thongBao = useMemo(() => {
    return {
      thanhCong: (msg, opt) => themToast('thanhCong', msg, opt),
      loi: (msg, opt) => themToast('loi', msg, opt),
      canhBao: (msg, opt) => themToast('canhBao', msg, opt),
      thongTin: (msg, opt) => themToast('thongTin', msg, opt),
      /**
       * Tự động trích xuất lỗi API an toàn và hiển thị Toast lỗi
       */
      loiTuApi: (err, macDinh, opt) => {
        const thongDiep = loiTuApi(err, macDinh);
        themToast('loi', thongDiep, opt);
        return thongDiep;
      },
    };
  }, [themToast]);

  // 2. Hộp thoại Xác nhận (xacNhan) trả về Promise<boolean>
  const xacNhan = useCallback(
    ({
      tieuDe = 'Xác nhận thao tác',
      noiDung = 'Bạn có chắc chắn muốn thực hiện thao tác này?',
      nhanXacNhan = 'Xác nhận',
      nhanHuy = 'Hủy bỏ',
      nguyHiem = false,
      kichThuoc = 'md',
    } = {}) => {
      return new Promise((resolve) => {
        setXacNhanState({
          mo: true,
          tieuDe,
          noiDung,
          nhanXacNhan,
          nhanHuy,
          nguyHiem,
          kichThuoc,
          resolve,
        });
      });
    },
    []
  );

  const dongXacNhan = (ketQua) => {
    if (xacNhanState.resolve) {
      xacNhanState.resolve(Boolean(ketQua));
    }
    setXacNhanState((prev) => ({ ...prev, mo: false, resolve: null }));
  };

  // 3. Hộp thoại Nhập Lý Do (nhapLyDo) trả về Promise<string | null>
  const nhapLyDo = useCallback(
    ({
      tieuDe = 'Nhập thông tin',
      noiDung = '',
      giaTriMacDinh = '',
      placeholder = 'Nhập lý do tại đây...',
      nhan = 'Lý do',
      batBuoc = true,
      toiDa = 500,
      kieuInput = 'textarea',
      nhanXacNhan = 'Đồng ý',
      nhanHuy = 'Hủy bỏ',
      nguyHiem = false,
    } = {}) => {
      return new Promise((resolve) => {
        setNhapLyDoState({
          mo: true,
          tieuDe,
          noiDung,
          giaTri: giaTriMacDinh || '',
          placeholder,
          nhan,
          batBuoc,
          toiDa,
          kieuInput,
          nhanXacNhan,
          nhanHuy,
          nguyHiem,
          loiInline: '',
          resolve,
        });
      });
    },
    []
  );

  const dongNhapLyDo = (chapNhan) => {
    if (!chapNhan) {
      if (nhapLyDoState.resolve) {
        nhapLyDoState.resolve(null);
      }
      setNhapLyDoState((prev) => ({ ...prev, mo: false, resolve: null, loiInline: '' }));
      return;
    }

    const chuoiTrim = (nhapLyDoState.giaTri || '').trim();
    if (nhapLyDoState.batBuoc && !chuoiTrim) {
      setNhapLyDoState((prev) => ({
        ...prev,
        loiInline: `Vui lòng nhập ${prev.nhan ? prev.nhan.toLowerCase() : 'thông tin'}.`,
      }));
      return;
    }

    if (nhapLyDoState.resolve) {
      nhapLyDoState.resolve(chuoiTrim);
    }
    setNhapLyDoState((prev) => ({ ...prev, mo: false, resolve: null, loiInline: '' }));
  };

  // 4. Bắt sự kiện hết hạn phiên đăng nhập từ axios interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      themToast(
        'canhBao',
        'Phiên đăng nhập của bạn đã hết hạn hoặc không có quyền truy cập. Vui lòng đăng nhập lại.',
        { tieuDe: 'Hết hạn phiên' }
      );
    };

    window.addEventListener('booknest_unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('booknest_unauthorized', handleUnauthorized);
    };
  }, [themToast]);

  const contextValue = useMemo(
    () => ({
      thongBao,
      xacNhan,
      nhapLyDo,
      loiTuApi,
    }),
    [thongBao, xacNhan, nhapLyDo]
  );

  return (
    <ThongBaoContext.Provider value={contextValue}>
      {children}

      {/* KHUNG HIỂN THỊ TOASTS */}
      <div className="bn-toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDong={xoaToast} />
        ))}
      </div>

      {/* HỘP THOẠI XÁC NHẬN (xacNhan) */}
      <HopThoai
        mo={xacNhanState.mo}
        onDong={() => dongXacNhan(false)}
        tieuDe={xacNhanState.tieuDe}
        kichThuoc={xacNhanState.kichThuoc}
        footer={
          <>
            <button
              type="button"
              className="bn-btn bn-btn-secondary"
              onClick={() => dongXacNhan(false)}
            >
              {xacNhanState.nhanHuy}
            </button>
            <button
              type="button"
              className={`bn-btn ${
                xacNhanState.nguyHiem ? 'bn-btn-danger' : 'bn-btn-primary'
              }`}
              onClick={() => dongXacNhan(true)}
              autoFocus
            >
              {xacNhanState.nhanXacNhan}
            </button>
          </>
        }
      >
        <p style={{ margin: 0 }}>{xacNhanState.noiDung}</p>
      </HopThoai>

      {/* HỘP THOẠI NHẬP LÝ DO (nhapLyDo) */}
      <HopThoai
        mo={nhapLyDoState.mo}
        onDong={() => dongNhapLyDo(false)}
        tieuDe={nhapLyDoState.tieuDe}
        kichThuoc="md"
        footer={
          <>
            <button
              type="button"
              className="bn-btn bn-btn-secondary"
              onClick={() => dongNhapLyDo(false)}
            >
              {nhapLyDoState.nhanHuy}
            </button>
            <button
              type="button"
              className={`bn-btn ${
                nhapLyDoState.nguyHiem ? 'bn-btn-danger' : 'bn-btn-primary'
              }`}
              onClick={() => dongNhapLyDo(true)}
            >
              {nhapLyDoState.nhanXacNhan}
            </button>
          </>
        }
      >
        {nhapLyDoState.noiDung && (
          <p style={{ margin: '0 0 1rem 0' }}>{nhapLyDoState.noiDung}</p>
        )}

        <div className="bn-dialog-input-group">
          {nhapLyDoState.kieuInput === 'textarea' ? (
            <textarea
              className="bn-dialog-input bn-dialog-textarea"
              placeholder={nhapLyDoState.placeholder}
              value={nhapLyDoState.giaTri}
              maxLength={nhapLyDoState.toiDa}
              rows={3}
              autoFocus
              onChange={(e) =>
                setNhapLyDoState((prev) => ({
                  ...prev,
                  giaTri: e.target.value,
                  loiInline: '',
                }))
              }
              onKeyDown={(e) => {
                // Nhấn Ctrl+Enter hoặc Cmd+Enter để submit form textarea
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  dongNhapLyDo(true);
                }
              }}
            />
          ) : (
            <input
              type="text"
              className="bn-dialog-input"
              placeholder={nhapLyDoState.placeholder}
              value={nhapLyDoState.giaTri}
              maxLength={nhapLyDoState.toiDa}
              autoFocus
              onChange={(e) =>
                setNhapLyDoState((prev) => ({
                  ...prev,
                  giaTri: e.target.value,
                  loiInline: '',
                }))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  dongNhapLyDo(true);
                }
              }}
            />
          )}

          <div className="bn-dialog-input-footer">
            <span className="bn-dialog-input-error">
              {nhapLyDoState.loiInline || ''}
            </span>
            {nhapLyDoState.toiDa && (
              <span className="bn-dialog-input-counter">
                {(nhapLyDoState.giaTri || '').length} / {nhapLyDoState.toiDa}
              </span>
            )}
          </div>
        </div>
      </HopThoai>
    </ThongBaoContext.Provider>
  );
}

export default ThongBaoProvider;
