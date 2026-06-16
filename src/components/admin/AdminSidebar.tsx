// src/components/AdminSidebar.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  isExternal?: boolean;
  hasSeparatorBefore?: boolean; // Added flag for separation
  hasSeparatorAfter?: boolean;  // Added flag for separation
}

interface NavSection {
  title: string;
  items: NavItem[];
}

interface SidebarLinkProps {
  item: NavItem;
  onClose?: () => void;
}

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const navigationConfig: NavSection[] = [
  {
    title: 'Main',
    items: [
      {
        to: '/admin/dashboard',
        label: 'Dashboard',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
          </svg>
        ),
      },
      {
        to: '/admin/land',
        label: 'Land Records',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ),
        hasSeparatorBefore: true, // Separates from Staff Criminal above
        hasSeparatorAfter: true,  // Separates from Reports below
      },
    ],
  },
  {
    title: 'Other',
    items: [
    
      
      {
        to: '/admin/reports',
        label: 'Reports',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },

      {
        to: '/admin/users',
        label: 'Users',
        icon: (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
    ],
  },
];

const SidebarLink: React.FC<SidebarLinkProps> = ({ item, onClose }) => {
  const { to, label, icon, badge, isExternal } = item;
  const baseStyles = "flex items-center justify-between rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200";

  if (isExternal) {
    return (
      <a
        href={to}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClose}
        className={`${baseStyles} text-stone-600 hover:bg-stone-100 hover:text-stone-900 group`}
      >
        <div className="flex items-center gap-3">
          <span className="text-stone-400 group-hover:text-stone-600 transition-colors">{icon}</span>
          <span>{label}</span>
        </div>
        <svg className="h-3 w-3 text-stone-400 group-hover:text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    );
  }

  return (
    <NavLink
      to={to}
      end
      onClick={onClose}
      className={({ isActive }) =>
        `${baseStyles} ${
          isActive
            ? 'bg-[#1E4620] text-white shadow-md'
            : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
        }`
      }
    >
      {({ isActive }) => (
        <>
          <div className="flex items-center gap-3">
            <span className={isActive ? 'text-white' : 'text-stone-400 group-hover:text-stone-600 transition-colors'}>
              {icon}
            </span>
            <span>{label}</span>
          </div>
          {badge !== undefined && badge > 0 && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
              isActive 
                ? 'bg-white/20 text-white' 
                : 'bg-stone-100 text-stone-600'
            }`}>
              {badge}
            </span>
          )}
        </>
      )}
    </NavLink>
  );
};

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  return (
    <>
      {/* Mobile Dark Overlay Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40 bg-stone-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Navigation Drawer */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-stone-200 bg-white shadow-sm transition-transform duration-300 ease-in-out lg:translate-x-0 ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        {/* Branding Section */}
        <div className="flex h-16 lg:h-20 items-center justify-between border-b border-stone-100 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#1E4620] to-[#2d6a2f] text-[#C29B38] shadow-sm">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
              </svg>
            </div>
            <div>
              <h2 className="text-xs font-bold tracking-tight text-stone-900">JLMS</h2>
              <p className="text-[10px] font-semibold tracking-wider text-stone-500 uppercase">Office of the Chief Registrar</p>
            </div>
          </div>

          {/* Close Sidebar button explicitly for small devices */}
          <button 
            onClick={onClose}
            className="rounded p-1 text-stone-500 hover:bg-stone-100 lg:hidden"
            aria-label="Close sidebar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Dynamic Navigation Groups */}
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-6">
          {navigationConfig.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-3 text-[10px] font-bold tracking-widest text-stone-400 uppercase">
                {group.title}
              </p>
              <div className="flex flex-col gap-1">
                {group.items.map((item) => (
                  <React.Fragment key={item.to}>
                    {item.hasSeparatorBefore && (
                      <hr className="my-1.5 mx-2 border-stone-100" />
                    )}
                    <SidebarLink item={item} onClose={onClose} />
                    {item.hasSeparatorAfter && (
                      <hr className="my-1.5 mx-2 border-stone-100" />
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer Section */}
        <div className="border-t border-stone-100 p-4">
          <div className="flex items-center gap-3 rounded-lg bg-stone-50 px-3 py-2">
            <div className="h-8 w-8 rounded-full bg-[#1E4620] flex items-center justify-center text-white text-xs font-bold">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-stone-900 truncate">Admin User</p>
              <p className="text-[10px] text-stone-500 truncate">admin@judiciary.go.ke</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;