// src/components/UserHeader.tsx
import React from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hook';
import { logoutUser } from '../../store/slices/authSlice';

interface UserHeaderProps {
  onMenuToggle: () => void;
}

export const UserHeader: React.FC<UserHeaderProps> = ({ onMenuToggle }) => {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logoutUser());
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-stone-200 bg-white px-4 lg:px-8 shadow-sm">
      {/* Mobile Hamburger */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuToggle}
          className="rounded p-1.5 text-stone-600 hover:bg-stone-100 lg:hidden"
          aria-label="Open Navigation Drawer"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] lg:text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/10">
          <span className="hidden sm:inline">User Session</span>
          <span className="sm:hidden">User</span>
        </span>
      </div>

      {/* User Information Controls */}
      <div className="flex items-center gap-3 lg:gap-6">
        <div className="flex items-center gap-2 lg:gap-3 border-r border-stone-200 pr-3 lg:pr-6 text-right">
          <div>
            <p className="text-xs lg:text-sm font-semibold text-stone-900 max-w-[120px] sm:max-w-xs truncate">
              {user?.full_name || 'User'}
            </p>
            <p className="text-[10px] lg:text-xs font-medium text-stone-500">
              ID: <span className="font-mono">{user?.pj_number || 'N/A'}</span>
            </p>
          </div>
          <div className="flex h-8 w-8 lg:h-9 lg:w-9 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs lg:text-sm font-bold text-blue-700 ring-1 ring-blue-200">
            {user?.full_name ? user.full_name.split(' ').map(n => n[0]).join('') : 'U'}
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogout}
          className="rounded p-1.5 text-stone-400 transition-colors hover:bg-stone-50 hover:text-red-600"
          title="Terminate Session"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>
    </header>
  );
};

export default UserHeader;