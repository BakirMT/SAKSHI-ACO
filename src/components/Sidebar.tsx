'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, ClipboardList, Users, ChevronLeft, ChevronRight, LogOut, } from 'lucide-react';
import AppLogo from './ui/AppLogo';
import { useAuth } from '@/lib/authContext';
import Icon from '@/components/ui/AppIcon';
import { supabase } from '@/lib/supabase';


interface SidebarProps {
  collapsed: boolean;
  onToggleCollapse: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const NAV_ITEMS = [
  { key: 'nav-dashboard', href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, badge: null },
  { key: 'nav-data-entry', href: '/data-entry', label: 'Data Entry', icon: ClipboardList, badge: null },
];

const ADMIN_NAV_ITEMS = [
  { key: 'nav-students', href: '/students', label: 'Students', icon: Users },
];

export default function Sidebar({ collapsed, onToggleCollapse, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser, isAdmin, logout } = useAuth();
  const [studentCount, setStudentCount] = React.useState<number>(0);

  React.useEffect(() => {
    if (!isAdmin) {
      setStudentCount(0);
      return;
    }

    async function fetchStudentCount() {
      const { count, error } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true });
      if (error) return;
      setStudentCount(count ?? 0);
    }

    fetchStudentCount();

    const channel = supabase
      .channel('sidebar-student-count')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'students' }, fetchStudentCount)
      .subscribe();

    // Re-sync count even if realtime misses an event.
    const intervalId = window.setInterval(fetchStudentCount, 5000);
    const onFocus = () => fetchStudentCount();
    window.addEventListener('focus', onFocus);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(intervalId);
      window.removeEventListener('focus', onFocus);
    };
  }, [isAdmin, pathname]);

  const handleLogout = () => {
    logout();
    router.push('/sign-up-login');
  };

  const sidebarWidth = collapsed ? 'w-16' : 'w-60';

  return (
    <aside
      className={`
        ${sidebarWidth}
        transition-all duration-300 ease-in-out
        bg-white border-r border-slate-200
        flex flex-col flex-shrink-0 h-full z-30
        fixed lg:relative
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}
    >
      {/* Logo */}
      <div className={`flex items-center gap-2.5 px-4 py-4 border-b border-slate-100 ${collapsed ? 'justify-center' : ''}`}>
        <AppLogo size={32} />
        {!collapsed && (
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-slate-800 text-sm leading-tight truncate">AccountTracker</span>
            <span className="text-xs text-slate-400 truncate">School Finance</span>
          </div>
        )}
        {/* Mobile close */}
        <button
          onClick={onMobileClose}
          className="ml-auto lg:hidden p-1 rounded hover:bg-slate-100"
          aria-label="Close sidebar"
        >
          <ChevronLeft className="w-4 h-4 text-slate-500" />
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {!collapsed && (
          <p className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest">Main</p>
        )}
        {NAV_ITEMS.map(item => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive'} ${collapsed ? 'justify-center px-0' : ''}`}
              title={collapsed ? item.label : undefined}
              onClick={onMobileClose}
            >
              <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
              {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
              {!collapsed && item.badge && (
                <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">{item.badge}</span>
              )}
            </Link>
          );
        })}

        {isAdmin && (
          <>
            {!collapsed && (
              <p className="px-3 pt-4 pb-1.5 text-xs font-semibold text-slate-400 uppercase tracking-widest">Admin</p>
            )}
            {ADMIN_NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              const badge = item.key === 'nav-students' ? String(studentCount) : null;
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`sidebar-nav-item ${isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item-inactive'} ${collapsed ? 'justify-center px-0' : ''}`}
                  title={collapsed ? item.label : undefined}
                  onClick={onMobileClose}
                >
                  <Icon className="w-4.5 h-4.5 flex-shrink-0" size={18} />
                  {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                  {!collapsed && badge && (
                    <span className="bg-amber-100 text-amber-700 text-xs font-semibold px-1.5 py-0.5 rounded-full">{badge}</span>
                  )}
                </Link>
              );
            })}
          </>
        )}
      </nav>

      {/* Bottom user section */}
      <div className="border-t border-slate-100 p-2 space-y-0.5">
        {!collapsed && currentUser && (
          <div className="px-3 py-2 mb-1">
            <p className="text-xs font-semibold text-slate-700 truncate">{currentUser.name}</p>
            <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
            <span className={`mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${currentUser.role === 'admin' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'}`}>
              {currentUser.role === 'admin' ? 'Admin' : 'Student'}
            </span>
          </div>
        )}
        <button
          onClick={handleLogout}
          className={`sidebar-nav-item sidebar-nav-item-inactive w-full ${collapsed ? 'justify-center px-0' : ''}`}
          title={collapsed ? 'Sign Out' : undefined}
        >
          <LogOut size={16} className="text-red-500 flex-shrink-0" />
          {!collapsed && <span className="text-red-500 text-sm">Sign Out</span>}
        </button>
      </div>

      {/* Collapse toggle (desktop only) */}
      <button
        onClick={onToggleCollapse}
        className="hidden lg:flex absolute -right-3 top-20 w-6 h-6 bg-white border border-slate-200 rounded-full items-center justify-center shadow-sm hover:bg-blue-50 hover:border-blue-300 transition-colors z-10"
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed
          ? <ChevronRight className="w-3 h-3 text-slate-500" />
          : <ChevronLeft className="w-3 h-3 text-slate-500" />
        }
      </button>
    </aside>
  );
}