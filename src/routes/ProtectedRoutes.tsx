// src/Route/ProtectedRoutes.tsx
import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import type { UserRole } from '../store/slices/authSlice';
import { useAppSelector } from '../store/hook';

interface ProtectedRoutesProps {
  allowedRoles?: UserRole[];
}

export const ProtectedRoutes: React.FC<ProtectedRoutesProps> = ({ allowedRoles }) => {
  const location = useLocation();
  const { accessToken, user, isInitializing } = useAppSelector((state) => state.auth);

  // 1. Still attempting silent refresh — hold rendering until resolved
  if (isInitializing) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: '#f5f0e8' }}>
        <div className="flex flex-col items-center gap-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: '#c9a84c', borderTopColor: 'transparent' }}
          />
          <p className="text-sm" style={{ color: '#5c5144' }}>Restoring session…</p>
        </div>
      </div>
    );
  }

  // 2. Boot complete but no session — redirect to login
  if (!accessToken || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3. Authenticated but insufficient role clearance
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 4. Authorized — render outlet
  return <Outlet />;
};

export default ProtectedRoutes;