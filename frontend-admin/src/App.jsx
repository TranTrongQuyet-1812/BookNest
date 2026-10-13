import React from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '@booknest/shared/auth';
import DangNhap from '../../frontend/src/pages/DangNhap.jsx';
import AdminLayout from '../../frontend/src/pages/admin/AdminLayout.jsx';
import DashboardThongKe from '../../frontend/src/pages/admin/DashboardThongKe.jsx';
import QuanLySach from '../../frontend/src/pages/admin/QuanLySach.jsx';
import NhapKho from '../../frontend/src/pages/admin/NhapKho.jsx';
import QuanLyDonHang from '../../frontend/src/pages/admin/QuanLyDonHang.jsx';
import QuanLyNhanSu from '../../frontend/src/pages/admin/QuanLyNhanSu.jsx';
import BanHangQuay from './pages/BanHangQuay.jsx';
import LichSuThayDoi from './pages/LichSuThayDoi.jsx';

function BaoVeNhanVien({ children, vaiTro }) {
  const { user, daDangNhap, loading } = useAuth();
  const location = useLocation();
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontFamily: 'sans-serif', color: '#64748B' }}>
        Đang nạp dữ liệu nhân viên BookNest...
      </div>
    );
  }
  if (!daDangNhap) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  if (!user?.aud || user.aud !== 'nhan_vien') return <Navigate to="/admin/login" replace />;
  if (vaiTro && !vaiTro.includes(user.role)) return <Navigate to="/admin" replace />;
  return children;
}

function AdminIndexRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user?.role === 'quan_tri') return <Navigate to="/admin/dashboard" replace />;
  if (user?.role === 'thu_kho') return <Navigate to="/admin/inventory" replace />;
  if (user?.role === 'thu_thu') return <Navigate to="/admin/counter-sales" replace />;
  return <Navigate to="/admin/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<DangNhap choNhanVien />} />
        <Route path="/admin" element={
          <BaoVeNhanVien vaiTro={['quan_tri', 'thu_kho', 'thu_thu']}><AdminLayout /></BaoVeNhanVien>
        }>
          <Route index element={<AdminIndexRedirect />} />
          <Route path="dashboard" element={<BaoVeNhanVien vaiTro={['quan_tri']}><DashboardThongKe /></BaoVeNhanVien>} />
          <Route path="books" element={<BaoVeNhanVien vaiTro={['quan_tri', 'thu_kho', 'thu_thu']}><QuanLySach /></BaoVeNhanVien>} />
          <Route path="inventory" element={<BaoVeNhanVien vaiTro={['quan_tri', 'thu_kho']}><NhapKho /></BaoVeNhanVien>} />
          <Route path="orders" element={<BaoVeNhanVien vaiTro={['quan_tri', 'thu_thu']}><QuanLyDonHang /></BaoVeNhanVien>} />
          <Route path="counter-sales" element={<BaoVeNhanVien vaiTro={['quan_tri', 'thu_thu']}><BanHangQuay /></BaoVeNhanVien>} />
          <Route path="change-history" element={<BaoVeNhanVien vaiTro={['quan_tri']}><LichSuThayDoi /></BaoVeNhanVien>} />
          <Route path="users" element={<BaoVeNhanVien vaiTro={['quan_tri']}><QuanLyNhanSu /></BaoVeNhanVien>} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
