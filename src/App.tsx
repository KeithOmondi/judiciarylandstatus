// src/App.tsx
import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from './store/store';
import { refreshAccessToken } from './store/slices/authSlice';
import AppRoutes from './routes/AppRoutes';

const AppInner: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const isInitializing = useSelector((state: RootState) => state.auth.isInitializing);

  useEffect(() => {
    // On every hard refresh, attempt to restore the session via httpOnly cookie.
    // The slice sets isInitializing = false in both fulfilled and rejected cases.
    dispatch(refreshAccessToken());
  }, [dispatch]);

  if (isInitializing) {
    // Prevent ProtectedRoutes from rendering and redirecting while we wait
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f5f0e8]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#c9a84c] border-t-transparent animate-spin" />
          <p className="text-sm text-[#5c5144]">Restoring session…</p>
        </div>
      </div>
    );
  }

  return <AppRoutes />;
};

const App: React.FC = () => (
  <Router>
    <AppInner />
  </Router>
);

export default App;