import React, {
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from 'react';
import ThongBaoContext from './ThongBaoContext';
import HopThoai from './HopThoai';
import { loiTuApi } from './loiTuApi';
import {
  IconThanhCong,
  IconLoi,
  IconCanhBao,
  IconThongTin,
  IconDong,
} from './icons';
import './thongbao.css';

// Thời gian mặc định cho từng loại toast (ms)
const THOI_GIAN_TOAST = {
  thanhCong: 4000,
  thongTin: 5000,
  canhBao: 6000,
  loi: 8000,
};

/**
 * ToastItem đơn lẻ hỗ trợ:
 * - Tạm dừng đếm ngược khi hover chuột HOẶC khi focus bàn phím
 * - Dọn dẹp timer an toàn khi unmount (tránh rò rỉ bộ nhớ)
 * - Hiệu ứng thoát mượt mà
 */
function ToastItem({ toast, onDong }) {
  const [dangThoat, setDangThoat] = useState(false);
  const timerRef = useRef(null);
  const exitTimerRef = useRef(null);
  const startTimeRef = useRef(Date.now());
  const remainingRef = useRef(toast.thoiGian);

  const dong = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setDangThoat(true);
    exitTimerRef.current = setTimeout(() => {
      onDong(toast.id);
    }, 220); // Khớp với animation bn-toast-exit 0.22s
  }, [onDong, toast.id]);

  const batDauTimer = useCallback((thoiGian) => {
    if (thoiGian <= 0) return;
    startTimeRef.current = Date.now();
    remainingRef.current = thoiGian;
    timerRef.current = setTimeout(() => {
      dong();
    }, thoiGian);
  }, [dong]);

  useEffect(() => {
    batDauTimer(toast.thoiGian);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (exitTimerRef.current) clearTimeout(exitTimerRef.current);
    };
  }, [batDauTimer, toast.thoiGian]);

  // Tạm dừng khi rê chuột hoặc focus bàn phím
  const handleTamDung = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      const daChay = Date.now() - startTimeRef.current;
      remainingRef.current = Math.max(0, remainingRef.current - daChay);
    }
  };

  // Tiếp tục khi chuột rời hoặc blur bàn phím
  const handleTiepTuc = () => {
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
      tabIndex={0}
      onMouseEnter={handleTamDung}
      onMouseLeave={handleTiepTuc}
      onFocus={handleTamDung}
      onBlur={handleTiepTuc}
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
 * Provider quản lý thông báo, hộp thoại và hàng đợi tương tác cho toàn ứng dụng BookNest.
 */
export function ThongBaoProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const lichSuNoiDung = useRef(new Map());

  // Hàng đợi hộp thoại: đảm bảo không bao giờ ghi đè resolve hoặc mở chồng chéo
  const hangDoiHopThoai = useRef([]);
  const [hopHienTai, setHopHienTai] = useState(null);

  // 1. Thao tác Toast
  const xoaToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const themToast = useCallback((loai, noiDung, options = {}) => {
    if (!noiDung) return;
    const chuoiNoiDung = typeof noiDung === 'string' ? noiDung.trim() : String(noiDung);
    const bayGio = Date.now();

    // Dọn dẹp các mục cũ hơn 5 giây để tránh Map phình to
    for (const [noiDungCu, tg] of lichSuNoiDung.current.entries()) {
      if (bayGio - tg > 5000) {
        lichSuNoiDung.current.delete(noiDungCu);
      }
    }

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

  // Điều phối đóng hộp thoại hiện tại và kích hoạt hộp thoại tiếp theo trong hàng đợi
  const dongHopHienTai = useCallback((ketQua) => {
    setHopHienTai((hienTai) => {
      if (hienTai && typeof hienTai.resolve === 'function') {
        hienTai.resolve(ketQua);
      }

      // Lấy hộp thoại tiếp theo nếu có
      if (hangDoiHopThoai.current.length > 0) {
        const keTiep = hangDoiHopThoai.current.shift();
        return keTiep;
      }
      return null;
    });
  }, []);

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
        const hopMoi = {
          id: `dlg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          loai: 'xacNhan',
          tieuDe,
          noiDung,
          nhanXacNhan,
          nhanHuy,
          nguyHiem,
          kichThuoc,
          resolve,
        };

        setHopHienTai((hienTai) => {
          if (!hienTai) {
            return hopMoi;
          }
          // Đang có hộp thoại khác mở -> Đẩy vào hàng đợi
          hangDoiHopThoai.current.push(hopMoi);
          return hienTai;
        });
      });
    },
    []
  );

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
        const hopMoi = {
          id: `dlg_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          loai: 'nhapLyDo',
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
        };

        setHopHienTai((hienTai) => {
          if (!hienTai) {
            return hopMoi;
          }
          // Đang có hộp thoại khác mở -> Đẩy vào hàng đợi
          hangDoiHopThoai.current.push(hopMoi);
          return hienTai;
        });
      });
    },
    []
  );

  // Xử lý xác nhận trong nhapLyDo
  const xuLyXacNhanNhapLyDo = () => {
    if (!hopHienTai || hopHienTai.loai !== 'nhapLyDo') return;

    const chuoiTrim = (hopHienTai.giaTri || '').trim();
    if (hopHienTai.batBuoc && !chuoiTrim) {
      setHopHienTai((prev) => ({
        ...prev,
        loiInline: `Vui lòng nhập ${prev.nhan ? prev.nhan.toLowerCase() : 'thông tin'}.`,
      }));
      return;
    }

    dongHopHienTai(chuoiTrim);
  };

  // 4. Bắt sự kiện hết hạn phiên đăng nhập từ axios interceptor
  useEffect(() => {
    const handleUnauthorized = () => {
      themToast(
        'canhBao',
        'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tiếp tục.',
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
      {hopHienTai && hopHienTai.loai === 'xacNhan' && (
        <HopThoai
          mo={true}
          onDong={() => dongHopHienTai(false)}
          tieuDe={hopHienTai.tieuDe}
          kichThuoc={hopHienTai.kichThuoc || 'md'}
          footer={
            <>
              <button
                type="button"
                className="bn-btn bn-btn-secondary"
                onClick={() => dongHopHienTai(false)}
              >
                {hopHienTai.nhanHuy}
              </button>
              <button
                type="button"
                className={`bn-btn ${
                  hopHienTai.nguyHiem ? 'bn-btn-danger' : 'bn-btn-primary'
                }`}
                onClick={() => dongHopHienTai(true)}
                autoFocus
              >
                {hopHienTai.nhanXacNhan}
              </button>
            </>
          }
        >
          <p style={{ margin: 0 }}>{hopHienTai.noiDung}</p>
        </HopThoai>
      )}

      {/* HỘP THOẠI NHẬP LÝ DO (nhapLyDo) */}
      {hopHienTai && hopHienTai.loai === 'nhapLyDo' && (
        <HopThoai
          mo={true}
          onDong={() => dongHopHienTai(null)}
          tieuDe={hopHienTai.tieuDe}
          kichThuoc="md"
          footer={
            <>
              <button
                type="button"
                className="bn-btn bn-btn-secondary"
                onClick={() => dongHopHienTai(null)}
              >
                {hopHienTai.nhanHuy}
              </button>
              <button
                type="button"
                className={`bn-btn ${
                  hopHienTai.nguyHiem ? 'bn-btn-danger' : 'bn-btn-primary'
                }`}
                onClick={xuLyXacNhanNhapLyDo}
              >
                {hopHienTai.nhanXacNhan}
              </button>
            </>
          }
        >
          {hopHienTai.noiDung && (
            <p style={{ margin: '0 0 1rem 0' }}>{hopHienTai.noiDung}</p>
          )}

          <div className="bn-dialog-input-group">
            {hopHienTai.kieuInput === 'textarea' ? (
              <textarea
                className="bn-dialog-input bn-dialog-textarea"
                placeholder={hopHienTai.placeholder}
                value={hopHienTai.giaTri || ''}
                maxLength={hopHienTai.toiDa}
                rows={3}
                autoFocus
                onChange={(e) =>
                  setHopHienTai((prev) =>
                    prev ? { ...prev, giaTri: e.target.value, loiInline: '' } : null
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    xuLyXacNhanNhapLyDo();
                  }
                }}
              />
            ) : (
              <input
                type="text"
                className="bn-dialog-input"
                placeholder={hopHienTai.placeholder}
                value={hopHienTai.giaTri || ''}
                maxLength={hopHienTai.toiDa}
                autoFocus
                onChange={(e) =>
                  setHopHienTai((prev) =>
                    prev ? { ...prev, giaTri: e.target.value, loiInline: '' } : null
                  )
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    xuLyXacNhanNhapLyDo();
                  }
                }}
              />
            )}

            <div className="bn-dialog-input-footer">
              <span className="bn-dialog-input-error">
                {hopHienTai.loiInline || ''}
              </span>
              {hopHienTai.toiDa && (
                <span className="bn-dialog-input-counter">
                  {(hopHienTai.giaTri || '').length} / {hopHienTai.toiDa}
                </span>
              )}
            </div>
          </div>
        </HopThoai>
      )}
    </ThongBaoContext.Provider>
  );
}

export default ThongBaoProvider;
