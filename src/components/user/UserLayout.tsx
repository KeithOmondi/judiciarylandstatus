// src/components/UserLayout.tsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import UserSidebar from './UserSidebar';
import UserHeader from './UserHeader';

export const UserLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50 font-sans antialiased">
      {/* Navigation Drawer Panel */}
      <UserSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Container View Blocks */}
      <div className="flex flex-col min-h-screen lg:pl-64">
        {/* Sticky Header Block */}
        <UserHeader onMenuToggle={() => setSidebarOpen(true)} />
        
        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default UserLayout;