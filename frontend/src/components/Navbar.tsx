import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { logout } from '../store/authSlice';
import { api } from '../services/api';
import { getDisplayName, getUserInitial } from '../utils/user';
import { 
  GraduationCap, 
  Search, 
  Bell, 
  User as UserIcon, 
  LogOut, 
  BookOpen, 
  Shield, 
  Menu, 
  X,
  Award,
  ChevronDown,
  Layers,
  Sparkles,
  Video,
  Radio,
  Sun,
  Moon,
  Trophy
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const Navbar: React.FC = () => {
  const { theme, resolvedTheme, toggleTheme } = useTheme();
  const { user, isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const { items: notifications, unreadCount } = useSelector((state: RootState) => state.notifications);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const userMenuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Close dropdown menus on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setShowUserMenu(false);
    setShowNotifications(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setShowUserMenu(false);
    try {
      await api.post('/auth/logout');
    } catch (e) {}
    dispatch(logout());
    navigate('/login');
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/courses?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const displayName = getDisplayName(user);
  const userInitial = getUserInitial(user);

  return (
    <header className="sticky top-0 z-50 bg-white/98 dark:bg-[#07182D]/97 backdrop-blur-md border-b border-[#D9E3E8] dark:border-[#1E3A56] shadow-sm transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Academy Brand Logo */}
          <Link to="/" className="flex items-center gap-2 group shrink-0">
            {/* Light Mode Logo */}
            <img
              src="/logo-transparent.png"
              alt="Khalil Academy"
              className="h-10 sm:h-11 w-auto object-contain transition-transform group-hover:scale-105 dark:hidden"
              onError={(e) => {
                e.currentTarget.src = '/logo.png';
              }}
            />
            {/* Dark Mode Logo */}
            <img
              src="/logo-dark-mode.png"
              alt="Khalil Academy"
              className="h-10 sm:h-11 w-auto object-contain transition-transform group-hover:scale-105 hidden dark:block"
              onError={(e) => {
                e.currentTarget.src = '/logo.png';
              }}
            />
          </Link>

          {/* Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <form onSubmit={handleSearchSubmit} className="w-full relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses, skills, or mentors..."
                className="w-full bg-slate-50 dark:bg-[#152F4A] text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-full pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-[#087F78] focus:bg-white dark:focus:bg-[#102A43] focus:ring-2 focus:ring-[#087F78]/20 transition shadow-inner"
              />
              <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-2.5" />
            </form>
          </div>

          {/* Navigation Links & Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/courses"
              className={`text-xs font-bold px-3.5 py-2 rounded-xl transition ${
                location.pathname === '/courses'
                  ? 'text-white bg-[#087F78] shadow-xs font-extrabold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] hover:bg-slate-100 dark:bg-[#0B223D]/80 dark:hover:bg-slate-800'
              }`}
            >
              Explore Courses
            </Link>

            <Link
              to="/live-classes"
              className={`text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                location.pathname.startsWith('/live-classes')
                  ? 'text-white bg-[#087F78] shadow-xs font-extrabold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] hover:bg-slate-100 dark:bg-[#0B223D]/80 dark:hover:bg-slate-800'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              Live Classes
            </Link>

            <Link
              to="/leaderboard"
              className={`text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                location.pathname === '/leaderboard'
                  ? 'text-white bg-[#087F78] shadow-xs font-extrabold'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] hover:bg-slate-100 dark:bg-[#0B223D]/80 dark:hover:bg-slate-800'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              Leaderboard
            </Link>

            {isAuthenticated && user && (
              <Link
                to="/dashboard"
                className={`text-xs font-bold px-3.5 py-2 rounded-xl transition ${
                  location.pathname === '/dashboard' || location.pathname === '/my-learning'
                    ? 'text-white bg-[#087F78] shadow-xs font-extrabold'
                    : 'text-slate-600 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] hover:bg-slate-100 dark:bg-[#0B223D]/80 dark:hover:bg-slate-800'
                }`}
              >
                My Learning
              </Link>
            )}

            {/* Dark Mode Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] hover:bg-slate-100 dark:bg-[#0B223D] dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:border-[#1E3A56] dark:hover:border-slate-700 transition"
              title={`Switch to ${resolvedTheme === 'dark' ? 'Light' : 'Dark'} mode`}
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600 dark:text-[#A9BACB]" />
              )}
            </button>

            {isLoading ? (
              <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-700 animate-pulse border border-slate-300 dark:border-slate-600" />
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-2.5">
                
                {/* Notifications Dropdown */}
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] hover:bg-slate-100 dark:bg-[#0B223D] dark:hover:bg-slate-800 border border-transparent hover:border-slate-200 dark:border-[#1E3A56] dark:hover:border-slate-700 transition"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#087F78] ring-2 ring-white dark:ring-slate-900 animate-pulse" />
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-2xl shadow-xl py-2 z-50 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-[#1E3A56] flex justify-between items-center bg-slate-50 dark:bg-[#152F4A]">
                        <span className="text-xs font-bold text-[#0B1F3A] dark:text-white">Notifications</span>
                        <span className="text-[10px] text-[#087F78] dark:text-[#14B8A6] font-extrabold px-2 py-0.5 rounded-full bg-teal-50 dark:bg-[#087F78]/30 border border-[#087F78]/20 dark:border-teal-700/50">
                          {unreadCount} unread
                        </span>
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-[#1E3A56]">
                        {notifications.length > 0 ? (
                          notifications.map((n) => (
                            <div key={n.id} className={`p-3 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/60 transition ${!n.isRead ? 'bg-teal-50/40 dark:bg-teal-950/30' : ''}`}>
                              <p className="font-bold text-[#0B1F3A] dark:text-white text-xs">{n.title}</p>
                              <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5 leading-relaxed">{n.message}</p>
                              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block font-mono">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-6 text-center text-xs text-slate-400 dark:text-slate-500">
                            No new notifications
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* User Dropdown */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 hover:border-[#087F78] dark:hover:border-[#14B8A6] transition"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#087F78] text-white font-extrabold flex items-center justify-center text-xs shadow-xs">
                      {userInitial}
                    </div>
                    <div className="hidden lg:flex flex-col text-left pr-2">
                      <span className="text-xs font-bold text-[#0B1F3A] dark:text-white max-w-[120px] truncate leading-tight">
                        {displayName}
                      </span>
                      <span className="text-[10px] text-[#087F78] dark:text-[#14B8A6] font-semibold capitalize">
                        {user.role?.toLowerCase()}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 dark:text-slate-400 mr-1" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-2xl shadow-xl py-2 z-50">
                      <div className="px-4 py-2.5 border-b border-slate-100 dark:border-[#1E3A56] bg-slate-50 dark:bg-[#152F4A]">
                        <p className="text-xs font-bold text-[#0B1F3A] dark:text-white">{displayName}</p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{user.email}</p>
                        <div className="mt-1.5 inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] border border-[#087F78]/30 dark:border-teal-700/50">
                          {user.role}
                        </div>
                      </div>

                      <div className="py-1 text-xs">
                        <Link
                          to="/dashboard"
                          className="flex items-center gap-2.5 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-800 dark:bg-[#0B223D] hover:text-[#087F78] dark:hover:text-[#14B8A6] transition font-medium"
                        >
                          <BookOpen className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
                          <span>Student Dashboard</span>
                        </Link>
                        <Link
                          to="/my-live-classes"
                          className="flex items-center gap-2.5 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-800 dark:bg-[#0B223D] hover:text-[#087F78] dark:hover:text-[#14B8A6] transition font-medium"
                        >
                          <Video className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
                          <span>My Live Classes</span>
                        </Link>
                        {(user.role === 'INSTRUCTOR' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                          <>
                            <Link
                              to="/instructor/dashboard"
                              className="flex items-center gap-2.5 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-800 dark:bg-[#0B223D] hover:text-[#087F78] dark:hover:text-[#14B8A6] transition font-medium"
                            >
                              <Layers className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
                              <span>Instructor Studio</span>
                            </Link>
                            <Link
                              to="/instructor/live-classes"
                              className="flex items-center gap-2.5 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-800 dark:bg-[#0B223D] hover:text-[#087F78] dark:hover:text-[#14B8A6] transition font-medium"
                            >
                              <Radio className="w-4 h-4 text-[#EF4444]" />
                              <span>Live Sessions Manager</span>
                            </Link>
                          </>
                        )}
                        {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                          <Link
                            to="/admin/dashboard"
                            className="flex items-center gap-2.5 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-800 dark:bg-[#0B223D] hover:text-[#087F78] dark:hover:text-[#14B8A6] transition font-medium"
                          >
                            <Shield className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
                            <span>Admin Console</span>
                          </Link>
                        )}
                        <Link
                          to="/student/certificates"
                          className="flex items-center gap-2.5 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-800 dark:bg-[#0B223D] hover:text-[#087F78] dark:hover:text-[#14B8A6] transition font-medium"
                        >
                          <Award className="w-4 h-4 text-[#F59E0B]" />
                          <span>My Certificates</span>
                        </Link>
                        <Link
                          to="/leaderboard"
                          className="flex items-center gap-2.5 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-800 dark:bg-[#0B223D] hover:text-[#087F78] dark:hover:text-[#14B8A6] transition font-medium"
                        >
                          <Trophy className="w-4 h-4 text-amber-500" />
                          <span>Leaderboard & Podium</span>
                        </Link>
                        <Link
                          to="/profile"
                          className="flex items-center gap-2.5 px-4 py-2 text-slate-700 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-slate-800 dark:bg-[#0B223D] hover:text-[#087F78] dark:hover:text-[#14B8A6] transition font-medium"
                        >
                          <UserIcon className="w-4 h-4 text-slate-400" />
                          <span>Profile Settings</span>
                        </Link>
                      </div>

                      <div className="border-t border-slate-100 dark:border-[#1E3A56] pt-1 mt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#EF4444] hover:bg-red-50 dark:hover:bg-red-950/40 transition text-left font-semibold"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Sign Out</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  to="/login"
                  className="text-xs font-bold text-slate-700 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] px-3.5 py-2 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-extrabold bg-[#087F78] hover:bg-[#076E6A] text-white px-4 py-2 rounded-xl shadow-xs transition"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Search & Menu Actions */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] hover:bg-slate-100 dark:bg-[#0B223D] dark:hover:bg-slate-800 transition"
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600 dark:text-[#A9BACB]" />
              )}
            </button>
            <Link
              to="/courses"
              className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] hover:bg-slate-100 dark:bg-[#0B223D] dark:hover:bg-slate-800 transition"
              aria-label="Search Courses"
            >
              <Search className="w-5 h-5" />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-700 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] hover:bg-slate-100 dark:bg-[#0B223D] dark:hover:bg-slate-800 transition"
              aria-label="Open Mobile Menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white dark:bg-[#0B223D] border-b border-slate-200 dark:border-[#1E3A56] px-4 pt-3 pb-6 space-y-4 shadow-xl">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses..."
              className="w-full bg-slate-50 dark:bg-[#152F4A] text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 text-xs rounded-xl pl-9 pr-4 py-2.5 border border-slate-200 dark:border-slate-700 focus:outline-none focus:border-[#087F78]"
            />
            <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-3" />
          </form>

          <div className="space-y-1 text-sm font-bold">
            <Link to="/courses" className="block text-slate-700 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] py-2 px-3 rounded-lg hover:bg-slate-50 dark:bg-[#152F4A] dark:hover:bg-slate-800">
              Explore Courses
            </Link>
            <Link to="/live-classes" className="block text-slate-700 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] py-2 px-3 rounded-lg hover:bg-slate-50 dark:bg-[#152F4A] dark:hover:bg-slate-800">
              Live Classes
            </Link>
            <Link to="/leaderboard" className="block text-slate-700 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] py-2 px-3 rounded-lg hover:bg-slate-50 dark:bg-[#152F4A] dark:hover:bg-slate-800">
              Leaderboard & Podium
            </Link>
            {isAuthenticated && (
              <Link to="/my-live-classes" className="block text-slate-700 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] py-2 px-3 rounded-lg hover:bg-slate-50 dark:bg-[#152F4A] dark:hover:bg-slate-800">
                My Live Classes
              </Link>
            )}
            {isAuthenticated && user ? (
              <>
                <Link to="/dashboard" className="block text-slate-700 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] py-2 px-3 rounded-lg hover:bg-slate-50 dark:bg-[#152F4A] dark:hover:bg-slate-800">
                  Student Dashboard
                </Link>
                <Link to="/leaderboard" className="block text-slate-700 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] py-2 px-3 rounded-lg hover:bg-slate-50 dark:bg-[#152F4A] dark:hover:bg-slate-800">
                  Academy Leaderboard
                </Link>
                <Link to="/student/certificates" className="block text-slate-700 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] py-2 px-3 rounded-lg hover:bg-slate-50 dark:bg-[#152F4A] dark:hover:bg-slate-800">
                  My Certificates
                </Link>
                <Link to="/profile" className="block text-slate-700 dark:text-slate-300 hover:text-[#087F78] dark:hover:text-[#14B8A6] py-2 px-3 rounded-lg hover:bg-slate-50 dark:bg-[#152F4A] dark:hover:bg-slate-800">
                  Profile Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left text-[#EF4444] font-extrabold py-2 px-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition mt-2"
                >
                  Sign Out ({displayName})
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Link to="/login" className="text-center text-sm font-bold text-[#0B1F3A] dark:text-white py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  Sign In
                </Link>
                <Link to="/register" className="text-center text-sm font-extrabold bg-[#087F78] hover:bg-[#076E6A] text-white py-2.5 rounded-xl shadow-xs">
                  Get Started Free
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
