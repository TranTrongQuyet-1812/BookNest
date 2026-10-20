import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigationType, matchPath } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThongBaoProvider } from '@booknest/shared/thongbao';
import { ProtectedRoute } from './components/Guards';
import SmoothScroll from './components/SmoothScroll';
import PageLoader from './components/PageLoader';
import PaperBackgroundCanvas from './components/canvas/PaperBackgroundCanvas';

// Components Chung
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ChatbotWidget from './components/ChatbotWidget';
import useCartStore from './stores/cartStore';

// Pages Storefront (TrangChu giữ static import để tải tức thì, các trang phụ dùng React.lazy)
import TrangChu from './pages/TrangChu';

// Tải trang theo yêu cầu nhưng cho phép tải trước: lúc rảnh app tải sẵn mã các trang, nên bấm vào là có ngay,
// không phải ngồi chờ rèm (xem taiTruocTatCaTrang). Biến chọn cách dựng được khóa lúc gắn vào để trang đang mở
// không bị dựng lại khi mã tải xong.
function lazyTaiTruoc(loader) {
  let thanhPhanDaTai = null;
  const nap = () => loader().then((module) => {
    thanhPhanDaTai = module.default;
    return module;
  });
  const Lazy = React.lazy(nap);
  const Boc = (props) => {
    const [Chon] = React.useState(() => thanhPhanDaTai || Lazy);
    return <Chon {...props} />;
  };
  Boc.taiTruoc = nap;
  Boc.daTai = () => thanhPhanDaTai !== null;
  return Boc;
}

const ChiTietSach = lazyTaiTruoc(() => import('./pages/ChiTietSach'));
const GioHang = lazyTaiTruoc(() => import('./pages/GioHang'));
const ThanhToan = lazyTaiTruoc(() => import('./pages/ThanhToan'));
const DonHangCuaToi = lazyTaiTruoc(() => import('./pages/DonHangCuaToi'));
const ChiTietDonHang = lazyTaiTruoc(() => import('./pages/ChiTietDonHang'));
const HoSo = lazyTaiTruoc(() => import('./pages/HoSo'));
const DangNhap = lazyTaiTruoc(() => import('./pages/DangNhap'));
const DangKy = lazyTaiTruoc(() => import('./pages/DangKy'));
const KhongCoQuyen = lazyTaiTruoc(() => import('./pages/KhongCoQuyen'));
const QuenMatKhau = lazyTaiTruoc(() => import('./pages/QuenMatKhau'));
const DieuKhoanDichVu = lazyTaiTruoc(() => import('./pages/DieuKhoanDichVu'));
const ChinhSachBaoMat = lazyTaiTruoc(() => import('./pages/ChinhSachBaoMat'));
const TrangKhongTimThay = lazyTaiTruoc(() => import('./pages/TrangKhongTimThay'));

// Bảng đường dẫn -> trang, dùng để biết trang đích đã tải mã chưa và để tải trước
const BANG_TRANG = [
  ['/books/:id', ChiTietSach],
  ['/login', DangNhap],
  ['/register', DangKy],
  ['/forgot-password', QuenMatKhau],
  ['/unauthorized', KhongCoQuyen],
  ['/cart', GioHang],
  ['/checkout', ThanhToan],
  ['/dieu-khoan', DieuKhoanDichVu],
  ['/chinh-sach-bao-mat', ChinhSachBaoMat],
  ['/orders', DonHangCuaToi],
  ['/orders/:id', ChiTietDonHang],
  ['/profile', HoSo]
];

const phanDuongDan = (duongDan) => duongDan.split('?')[0];
const trangCuaDuongDan = (duongDan) => {
  const thuc = phanDuongDan(duongDan);
  const khop = BANG_TRANG.find(([mau]) => matchPath(mau, thuc));
  return khop ? khop[1] : TrangKhongTimThay;
};
const laTrangChu = (duongDan) => ['/', '/books'].includes(phanDuongDan(duongDan));

function taiTruocTatCaTrang() {
  BANG_TRANG.forEach(([, trang]) => trang.taiTruoc().catch(() => {}));
  TrangKhongTimThay.taiTruoc().catch(() => {});
}

// Trang "cảnh" luôn có rèm khi bước vào: Trang chủ, Đăng nhập, Đăng ký, Chi tiết sách.
// Trang chức năng (giỏ hàng, thanh toán, đơn hàng, hồ sơ, điều khoản) đổi tức thì để luồng mua hàng không bị chậm.
const coRemKhiVao = (duongDan) => {
  const thuc = phanDuongDan(duongDan);
  return laTrangChu(thuc) || ['/login', '/register'].includes(thuc) || Boolean(matchPath('/books/:id', thuc));
};

// Có cần chạy rèm khi chuyển trang không:
// - lọc/tìm ngay trong Trang chủ: không (vẫn là cùng một trang);
// - vào trang "cảnh": có (Trang chủ còn vì hero và sinh vật chờ rèm mở);
// - trang chức năng: chỉ khi mã trang chưa tải xong (rèm giữ tới khi tải xong), còn lại đổi tức thì kèm mờ nhẹ.
const canChayRem = (duongDanDich, duongDanNguon) => {
  if (laTrangChu(duongDanDich) && laTrangChu(duongDanNguon)) return false;
  if (coRemKhiVao(duongDanDich)) return true;
  return !trangCuaDuongDan(duongDanDich).daTai();
};

const chuanBiTrang = (duongDan) => (laTrangChu(duongDan) ? Promise.resolve() : trangCuaDuongDan(duongDan).taiTruoc());

// Layout chung cho Storefront (có Navbar & Footer luôn hiển thị, Suspense chỉ bọc nội dung động)
const StorefrontLayout = ({ children }) => {
  // Trong Routes, useLocation trả về địa chỉ đang HIỂN THỊ (đã đóng băng), nên key này chỉ đổi lúc trang thật sự được thay
  const { pathname } = useLocation();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <React.Suspense fallback={null}>
          <div key={pathname} className="trang-hien-dan">
            {children}
          </div>
        </React.Suspense>
      </main>
      <Footer />
    </div>
  );
};

function ChuyenSangBackOffice() {
  const location = useLocation();
  React.useEffect(() => {
    const diaChi = import.meta.env.VITE_BACKOFFICE_URL || 'http://localhost:5174';
    window.location.replace(`${diaChi}${location.pathname}${location.search}${location.hash}`);
  }, [location]);
  return null;
}

// Component điều phối tuyến đường kết hợp hiệu ứng chuyển trang đóng băng (Freeze Route) cho Storefront
const AppContent = () => {
  const location = useLocation();
  const loaiDieuHuong = useNavigationType();
  // REPLACE là chuyển hướng tự động của hệ thống (ProtectedRoute, RoleGuard, sau khi đặt hàng), không phải người dùng bấm liên kết
  const laChuyenHuong = loaiDieuHuong === 'REPLACE';
  const laKhuAdmin = location.pathname.startsWith('/admin');
  const [displayLocation, setDisplayLocation] = useState(location);
  const kichHoatLangNgheCrossTab = useCartStore((s) => s.kichHoatLangNgheCrossTab);

  // Kích hoạt đồng bộ giỏ hàng đa tab (Cross-Tab Synchronization)
  React.useEffect(() => {
    const huyLangNghe = kichHoatLangNgheCrossTab();
    return () => {
      if (huyLangNghe) huyLangNghe();
    };
  }, [kichHoatLangNgheCrossTab]);

  // Sau khi vào web một lúc, tải sẵn mã mọi trang lúc trình duyệt rảnh để các lần bấm sau đổi trang tức thì
  React.useEffect(() => {
    const dat = window.requestIdleCallback || ((fn) => setTimeout(fn, 1));
    const hen = setTimeout(() => dat(taiTruocTatCaTrang), 2500);
    return () => clearTimeout(hen);
  }, []);

  // Khi rèm đã che kín 100% màn hình, mới hoán đổi sang trang mới cho Storefront!
  const handleCurtainCovered = useCallback(() => {
    setDisplayLocation(location);
  }, [location]);

  // Nếu là khu vực Admindash hoặc chuyển hướng tự động (redirect từ ProtectedRoute, RoleGuard), lập tức đồng bộ route để tránh vòng lặp re-render.
  // Người dùng bấm liên kết (kể cả liên kết có kèm state.from hoặc tới /login) vẫn đi qua rèm: trang cũ ở yên tới khi rèm che kín mới đổi.
  React.useEffect(() => {
    if (laKhuAdmin || laChuyenHuong) {
      setDisplayLocation(location);
    }
  }, [location, laKhuAdmin, laChuyenHuong]);

  return (
    <>
      {/* Nền giấy 3D Canvas chỉ dành cho Storefront; Admindash dùng nền phẳng hiệu năng cao */}
      {!laKhuAdmin && <PaperBackgroundCanvas />}

      {/* Rèm che chuyển trang điện ảnh chỉ dùng cho Storefront; Admindash chuyển trang tức thì theo chuẩn B2B Operate */}
      {!laKhuAdmin && (
        <PageLoader 
          location={location} 
          onCurtainCovered={handleCurtainCovered} 
          canRem={canChayRem}
          chuanBiTrang={chuanBiTrang}
          laChuyenHuong={laChuyenHuong}
        />
      )}

      <Routes location={laKhuAdmin ? location : displayLocation}>
        {/* ==================== CÁC ROUTE STOREFRONT ==================== */}
        <Route path="/" element={<StorefrontLayout><TrangChu /></StorefrontLayout>} />
        <Route path="/books" element={<StorefrontLayout><TrangChu /></StorefrontLayout>} />
        <Route path="/books/:id" element={<StorefrontLayout><ChiTietSach /></StorefrontLayout>} />
        <Route path="/login" element={<StorefrontLayout><DangNhap /></StorefrontLayout>} />
        <Route path="/register" element={<StorefrontLayout><DangKy /></StorefrontLayout>} />
        <Route path="/forgot-password" element={<StorefrontLayout><QuenMatKhau /></StorefrontLayout>} />
        <Route path="/quen-mat-khau" element={<Navigate to="/forgot-password" replace />} />
        <Route path="/unauthorized" element={<StorefrontLayout><KhongCoQuyen /></StorefrontLayout>} />

        {/* Tuyến đường Giỏ Hàng và Thanh Toán: Công khai cho cả Khách vãng lai (Guest) và Khách hàng */}
        <Route path="/cart" element={<StorefrontLayout><GioHang /></StorefrontLayout>} />
        <Route path="/checkout" element={<StorefrontLayout><ThanhToan /></StorefrontLayout>} />

        {/* Các Tuyến Đường Chính Sách & Pháp Lý */}
        <Route path="/dieu-khoan" element={<StorefrontLayout><DieuKhoanDichVu /></StorefrontLayout>} />
        <Route path="/chinh-sach-bao-mat" element={<StorefrontLayout><ChinhSachBaoMat /></StorefrontLayout>} />
        <Route path="/chinh-sach" element={<Navigate to="/dieu-khoan" replace />} />

        {/* Các Route Yêu Cầu Đăng Nhập */}
        <Route path="/orders" element={
          <ProtectedRoute>
            <StorefrontLayout><DonHangCuaToi /></StorefrontLayout>
          </ProtectedRoute>
        } />
        <Route path="/orders/:id" element={
          <ProtectedRoute>
            <StorefrontLayout><ChiTietDonHang /></StorefrontLayout>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <StorefrontLayout><HoSo /></StorefrontLayout>
          </ProtectedRoute>
        } />

        {/* Back-Office được phục vụ từ frontend riêng, không dùng chung router Storefront. */}
        <Route path="/admin/*" element={<ChuyenSangBackOffice />} />

        {/* Trang thông báo lỗi 404 không tìm thấy trang */}
        <Route path="/404" element={<StorefrontLayout><TrangKhongTimThay /></StorefrontLayout>} />
        <Route path="*" element={<StorefrontLayout><TrangKhongTimThay /></StorefrontLayout>} />
      </Routes>

      {/* Trợ lý AI Chatbot nổi toàn Storefront (không hiển thị trong khu BackOffice) */}
      {!laKhuAdmin && <ChatbotWidget />}
    </>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <ThongBaoProvider>
        <BrowserRouter>
          <SmoothScroll>
            <AppContent />
          </SmoothScroll>
        </BrowserRouter>
      </ThongBaoProvider>
    </AuthProvider>
  );
};

export default App;
