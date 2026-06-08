// src/components/AdminLayout.tsx
import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import AdminHeader from './AdmiHeader';

export const AdminLayout: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-stone-50 font-sans antialiased">
      {/* Navigation Drawer Panel */}
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Container View Blocks */}
      <div className="flex flex-col min-h-screen lg:pl-64">
        {/* Sticky Header Block */}
        <AdminHeader onMenuToggle={() => setSidebarOpen(true)} />
        
        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {/* Context sub-views inject dynamically right here */}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;