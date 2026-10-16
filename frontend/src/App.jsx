import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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

const ChiTietSach = React.lazy(() => import('./pages/ChiTietSach'));
const GioHang = React.lazy(() => import('./pages/GioHang'));
const ThanhToan = React.lazy(() => import('./pages/ThanhToan'));
const DonHangCuaToi = React.lazy(() => import('./pages/DonHangCuaToi'));
const ChiTietDonHang = React.lazy(() => import('./pages/ChiTietDonHang'));
const HoSo = React.lazy(() => import('./pages/HoSo'));
const DangNhap = React.lazy(() => import('./pages/DangNhap'));
const DangKy = React.lazy(() => import('./pages/DangKy'));
const KhongCoQuyen = React.lazy(() => import('./pages/KhongCoQuyen'));
const QuenMatKhau = React.lazy(() => import('./pages/QuenMatKhau'));
const DieuKhoanDichVu = React.lazy(() => import('./pages/DieuKhoanDichVu'));
const ChinhSachBaoMat = React.lazy(() => import('./pages/ChinhSachBaoMat'));

// Layout chung cho Storefront (có Navbar & Footer luôn hiển thị, Suspense chỉ bọc nội dung động)
const StorefrontLayout = ({ children }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <Navbar />
      <main style={{ flex: 1 }}>
        <React.Suspense fallback={null}>
          {children}
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

  // Khi rèm đã che kín 100% màn hình, mới hoán đổi sang trang mới cho Storefront!
  const handleCurtainCovered = useCallback(() => {
    setDisplayLocation(location);
  }, [location]);

  // Nếu là khu vực Admindash, lập tức đồng bộ route không chờ animation
  React.useEffect(() => {
    if (laKhuAdmin) {
      setDisplayLocation(location);
    }
  }, [location, laKhuAdmin]);

  return (
    <>
      {/* Nền giấy 3D Canvas chỉ dành cho Storefront; Admindash dùng nền phẳng hiệu năng cao */}
      {!laKhuAdmin && <PaperBackgroundCanvas />}

      {/* Rèm che chuyển trang điện ảnh chỉ dùng cho Storefront; Admindash chuyển trang tức thì theo chuẩn B2B Operate */}
      {!laKhuAdmin && (
        <PageLoader 
          location={location} 
          onCurtainCovered={handleCurtainCovered} 
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

        {/* Bắt các đường dẫn không tồn tại */}
        <Route path="*" element={<Navigate to="/" replace />} />
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
