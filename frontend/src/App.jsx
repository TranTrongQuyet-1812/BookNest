import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProtectedRoute, RoleGuard } from './components/Guards';

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
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
    </div>
  );
};

// Component điều hướng thông minh khi vào /admin
const AdminIndexRedirect = () => {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.vaiTro === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (user.vaiTro === 'librarian') return <Navigate to="/admin/books" replace />;
  if (user.vaiTro === 'order_staff') return <Navigate to="/admin/orders" replace />;
  return <Navigate to="/unauthorized" replace />;
};

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* ==================== CÁC ROUTE STOREFRONT ==================== */}
          <Route path="/" element={<StorefrontLayout><TrangChu /></StorefrontLayout>} />
          <Route path="/books" element={<StorefrontLayout><TrangChu /></StorefrontLayout>} />
          <Route path="/books/:id" element={<StorefrontLayout><ChiTietSach /></StorefrontLayout>} />
          <Route path="/login" element={<StorefrontLayout><DangNhap /></StorefrontLayout>} />
          <Route path="/register" element={<StorefrontLayout><DangKy /></StorefrontLayout>} />
          <Route path="/unauthorized" element={<StorefrontLayout><KhongCoQuyen /></StorefrontLayout>} />

          {/* Các Route Yêu Cầu Khách Hàng Đăng Nhập */}
          <Route path="/cart" element={
            <ProtectedRoute>
              <StorefrontLayout><GioHang /></StorefrontLayout>
            </ProtectedRoute>
          } />
          <Route path="/checkout" element={
            <ProtectedRoute>
              <StorefrontLayout><ThanhToan /></StorefrontLayout>
            </ProtectedRoute>
          } />
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

          {/* ==================== CÁC ROUTE BACK-OFFICE QUẢN TRỊ ==================== */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <RoleGuard allowedRoles={['admin', 'librarian', 'order_staff']}>
                <AdminLayout />
              </RoleGuard>
            </ProtectedRoute>
          }>
            <Route index element={<AdminIndexRedirect />} />
            
            {/* Dashboard Thống kê: Chỉ Admin */}
            <Route path="dashboard" element={
              <RoleGuard allowedRoles={['admin']}>
                <DashboardThongKe />
              </RoleGuard>
            } />

            {/* Quản lý Sách: Thủ thư & Admin */}
            <Route path="books" element={
              <RoleGuard allowedRoles={['librarian', 'admin']}>
                <QuanLySach />
              </RoleGuard>
            } />

            {/* Nhập kho: Thủ thư & Admin */}
            <Route path="inventory" element={
              <RoleGuard allowedRoles={['librarian', 'admin']}>
                <NhapKho />
              </RoleGuard>
            } />

            {/* Xử lý Đơn hàng: Nhân viên đơn hàng & Admin */}
            <Route path="orders" element={
              <RoleGuard allowedRoles={['order_staff', 'admin']}>
                <QuanLyDonHang />
              </RoleGuard>
            } />

            {/* Quản lý Nhân sự: Chỉ Admin */}
            <Route path="users" element={
              <RoleGuard allowedRoles={['admin']}>
                <QuanLyNhanSu />
              </RoleGuard>
            } />
          </Route>

          {/* Bắt các đường dẫn không tồn tại */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
