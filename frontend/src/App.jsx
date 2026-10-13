import React, { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute, RoleGuard } from './components/Guards';
import SmoothScroll from './components/SmoothScroll';
import PageLoader from './components/PageLoader';
import PaperBackgroundCanvas from './components/canvas/PaperBackgroundCanvas';

// Components Chung
import Navbar from './components/Navbar';
import Footer from './components/Footer';

// Pages Storefront
import TrangChu from './pages/TrangChu';
import ChiTietSach from './pages/ChiTietSach';
import GioHang from './pages/GioHang';
import ThanhToan from './pages/ThanhToan';
import DonHangCuaToi from './pages/DonHangCuaToi';
import ChiTietDonHang from './pages/ChiTietDonHang';
import HoSo from './pages/HoSo';
import DangNhap from './pages/DangNhap';
import DangKy from './pages/DangKy';
import KhongCoQuyen from './pages/KhongCoQuyen';

// Pages Back-Office Quản Trị
import AdminLayout from './pages/admin/AdminLayout';
import DashboardThongKe from './pages/admin/DashboardThongKe';
import QuanLySach from './pages/admin/QuanLySach';
import NhapKho from './pages/admin/NhapKho';
import QuanLyDonHang from './pages/admin/QuanLyDonHang';
import QuanLyNhanSu from './pages/admin/QuanLyNhanSu';

// Layout chung cho Storefront (có Navbar & Footer)
const StorefrontLayout = ({ children }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
};

// Component điều hướng thông minh khi vào /admin (nhớ tab gần nhất nếu có quyền)
const AdminIndexRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/admin/login" replace />;

  const lastPath = (() => {
    try {
      return localStorage.getItem('booknest_last_admin_path');
    } catch {
      return null;
    }
  })();

  if (lastPath && lastPath.startsWith('/admin')) {
    const cleanPath = lastPath.split('?')[0];
    const quyenMap = {
      '/admin/dashboard': ['quan_tri'],
      '/admin/books': ['quan_tri', 'thu_kho', 'thu_thu'],
      '/admin/inventory': ['quan_tri', 'thu_kho'],
      '/admin/orders': ['quan_tri', 'thu_thu'],
      '/admin/users': ['quan_tri']
    };
    const allowedRoles = quyenMap[cleanPath];
    if (allowedRoles && allowedRoles.includes(user.role)) {
      return <Navigate to={lastPath} replace />;
    }
  }

  // Fallback mặc định theo vai trò nếu chưa có lịch sử hoặc không đủ quyền
  if (user.role === 'quan_tri') return <Navigate to="/admin/dashboard" replace />;
  if (user.role === 'thu_kho') return <Navigate to="/admin/inventory" replace />;
  if (user.role === 'thu_thu') return <Navigate to="/admin/orders" replace />;
  return <Navigate to="/unauthorized" replace />;
};

// Component điều phối tuyến đường kết hợp hiệu ứng chuyển trang đóng băng (Freeze Route) cho Storefront
const AppContent = () => {
  const location = useLocation();
  const laKhuAdmin = location.pathname.startsWith('/admin');
  const [displayLocation, setDisplayLocation] = useState(location);

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
        <Route path="/admin/login" element={<StorefrontLayout><DangNhap choNhanVien /></StorefrontLayout>} />
        <Route path="/register" element={<StorefrontLayout><DangKy /></StorefrontLayout>} />
        <Route path="/unauthorized" element={<StorefrontLayout><KhongCoQuyen /></StorefrontLayout>} />

        {/* Tuyến đường Giỏ Hàng và Thanh Toán: Công khai cho cả Khách vãng lai (Guest) và Khách hàng */}
        <Route path="/cart" element={<StorefrontLayout><GioHang /></StorefrontLayout>} />
        <Route path="/checkout" element={<StorefrontLayout><ThanhToan /></StorefrontLayout>} />

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

        {/* ==================== CÁC ROUTE ADMINDASH QUẢN TRỊ ==================== */}
        <Route path="/admin" element={
          <ProtectedRoute trangDangNhap="/admin/login">
            <RoleGuard allowedRoles={['quan_tri', 'thu_kho', 'thu_thu']}>
              <AdminLayout />
            </RoleGuard>
          </ProtectedRoute>
        }>
          <Route index element={<AdminIndexRedirect />} />
          
          {/* Dashboard Thống kê: Chỉ Quản trị viên */}
          <Route path="dashboard" element={
            <RoleGuard allowedRoles={['quan_tri']}>
              <DashboardThongKe />
            </RoleGuard>
          } />

          {/* Quản lý Sách: Thủ kho, Thủ thư & Quản trị viên (Thủ thư chỉ xem tra cứu) */}
          <Route path="books" element={
            <RoleGuard allowedRoles={['quan_tri', 'thu_kho', 'thu_thu']}>
              <QuanLySach />
            </RoleGuard>
          } />

          {/* Nhập kho: Chỉ Thủ kho & Quản trị viên */}
          <Route path="inventory" element={
            <RoleGuard allowedRoles={['quan_tri', 'thu_kho']}>
              <NhapKho />
            </RoleGuard>
          } />

          {/* Xử lý Đơn hàng: Thủ thư & Quản trị viên */}
          <Route path="orders" element={
            <RoleGuard allowedRoles={['quan_tri', 'thu_thu']}>
              <QuanLyDonHang />
            </RoleGuard>
          } />

          {/* Quản lý Nhân sự: Chỉ Quản trị viên */}
          <Route path="users" element={
            <RoleGuard allowedRoles={['quan_tri']}>
              <QuanLyNhanSu />
            </RoleGuard>
          } />
        </Route>

        {/* Bắt các đường dẫn không tồn tại */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
};

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <SmoothScroll>
          <AppContent />
        </SmoothScroll>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
