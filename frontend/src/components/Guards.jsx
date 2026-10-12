import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Component bảo vệ các tuyến đường yêu cầu người dùng phải đăng nhập trước khi truy cập.
 * Nếu chưa đăng nhập, tự động chuyển hướng đến trang đăng nhập của khu đó (mặc định /login, khu nhân viên là /admin/login)
 * và lưu lại đường dẫn trước đó.
 */
export const ProtectedRoute = ({ children, trangDangNhap = '/login' }) => {
  const { daDangNhap, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex justify-center items-center" style={{ minHeight: '60vh' }}>
        <p className="font-serif" style={{ color: 'var(--text-muted)' }}>Đang tải dữ liệu BookNest...</p>
      </div>
    );
  }

  if (!daDangNhap) {
    return <Navigate to={trangDangNhap} state={{ from: location }} replace />;
  }

  return children;
};

/**
 * Component kiểm tra vai trò người dùng (RBAC) trên giao diện.
 * Ngăn chặn người dùng truy cập vào trang quản trị ngoài phạm vi quyền hạn được cấp.
 */
export const RoleGuard = ({ allowedRoles, children }) => {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};
