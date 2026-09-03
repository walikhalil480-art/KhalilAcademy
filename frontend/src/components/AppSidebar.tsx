import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { 
  GraduationCap, 
  LayoutDashboard, 
  BookOpen, 
  Award, 
  CreditCard, 
  Settings,
  User as UserIcon,
  Sun,
  Moon
} from 'lucide-react';
import { resolveMediaUrl } from '../utils/media';
import { useTheme } from '../context/ThemeContext';

interface AppSidebarProps {
  activeItem?: 'dashboard' | 'courses' | 'certificates' | 'billing' | 'settings';
}

export const AppSidebar: React.FC<AppSidebarProps> = ({ activeItem }) => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { resolvedTheme, toggleTheme } = useTheme();
  const location = useLocation();

  const currentPath = location.pathname;

  const isCoursesActive = activeItem === 'courses' || currentPath.startsWith('/courses');
  const isDashboardActive = activeItem === 'dashboard' || currentPath === '/dashboard' || currentPath === '/my-learning';
  const isCertificatesActive = activeItem === 'certificates' || currentPath.startsWith('/certificates') || currentPath.startsWith('/student/certificates');
  const isBillingActive = activeItem === 'billing' || currentPath === '/profile' || currentPath.startsWith('/checkout');
  const isSettingsActive = activeItem === 'settings' || currentPath === '/profile';

  return (
    <aside className="w-full lg:w-60 shrink-0 bg-white dark:bg-[#102A43] border-r border-slate-200/90 dark:border-[#1E3A56] flex flex-col justify-between p-4 lg:min-h-screen transition-colors">
      <div className="space-y-4">
        {/* User Profile Card */}
        <div className="p-2.5 rounded-xl border border-slate-200/90 dark:border-[#1E3A56] bg-slate-50/60 dark:bg-[#152F4A] flex items-center gap-3 shadow-xs">
          <div className="w-9 h-9 rounded-lg bg-slate-200 dark:bg-slate-700 overflow-hidden shrink-0 flex items-center justify-center text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-300/60 dark:border-slate-600">
            {user?.avatar ? (
              <img src={resolveMediaUrl(user.avatar)} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-xs font-bold text-[#0B1F3A] dark:text-white truncate">
              {user?.name || (isAuthenticated ? 'Student Account' : 'Khalil Student')}
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-mono truncate">
              {user?.role === 'INSTRUCTOR' ? 'Instructor Studio' : user?.role === 'ADMIN' ? 'Admin Portal' : 'Professional Track'}
            </p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="space-y-1 text-xs font-medium">
          {/* Dashboard */}
          <Link
            to="/dashboard"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
              isDashboardActive
                ? 'bg-[#14B8A6] text-[#0B223D] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white hover:bg-slate-100 dark:bg-[#0B223D] dark:hover:bg-slate-800'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Dashboard</span>
          </Link>

          {/* All Courses */}
          <Link
            to="/courses"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
              isCoursesActive
                ? 'bg-[#14B8A6] text-[#0B223D] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white hover:bg-slate-100 dark:bg-[#0B223D] dark:hover:bg-slate-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>All Courses</span>
          </Link>

          {/* Certificates */}
          <Link
            to="/certificates"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
              isCertificatesActive
                ? 'bg-[#14B8A6] text-[#0B223D] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white hover:bg-slate-100 dark:bg-[#0B223D] dark:hover:bg-slate-800'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Certificates</span>
          </Link>

          {/* Billing */}
          <Link
            to="/profile"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
              isBillingActive
                ? 'bg-[#14B8A6] text-[#0B223D] font-bold shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white hover:bg-slate-100 dark:bg-[#0B223D] dark:hover:bg-slate-800'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Billing</span>
          </Link>
        </nav>
      </div>

      {/* Settings & Theme Switcher at Bottom */}
      <div className="pt-4 border-t border-slate-100 dark:border-[#1E3A56] space-y-1">
        {/* Dark Mode Quick Toggle */}
        <button
          onClick={toggleTheme}
          className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white hover:bg-slate-100 dark:bg-[#0B223D] dark:hover:bg-slate-800 transition"
        >
          <div className="flex items-center gap-3">
            {resolvedTheme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            )}
            <span>{resolvedTheme === 'dark' ? 'Light Theme' : 'Dark Theme'}</span>
          </div>
          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
            {resolvedTheme.toUpperCase()}
          </span>
        </button>

        {/* Settings */}
        <Link
          to="/profile"
          className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition ${
            isSettingsActive
              ? 'bg-[#14B8A6] text-[#0B223D] font-bold shadow-xs'
              : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white hover:bg-slate-100 dark:bg-[#0B223D] dark:hover:bg-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings</span>
        </Link>
      </div>
    </aside>
  );
};
