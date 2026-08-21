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
  Radio
} from 'lucide-react';

export const Navbar: React.FC = () => {
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
    <header className="sticky top-0 z-50 bg-[#0A1322]/95 backdrop-blur-md border-b border-[#23426A] transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Academy Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#1A365D] border border-[#4FD1C5]/40 flex items-center justify-center shadow-lg shadow-[#1A365D]/40 group-hover:border-[#4FD1C5] group-hover:scale-105 transition-all duration-300">
              <GraduationCap className="w-5 h-5 text-[#4FD1C5]" />
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-lg font-extrabold tracking-tight text-[#F8FAFC] group-hover:text-[#4FD1C5] transition-colors">
                Khalil Academy
              </span>
              <span className="text-[10px] text-[#4FD1C5] font-bold tracking-wider uppercase">
                Professional Academy
              </span>
            </div>
          </Link>

          {/* Search Bar (Desktop) */}
          <div className="hidden md:flex flex-1 max-w-md mx-4">
            <form onSubmit={handleSearchSubmit} className="w-full relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search courses, technologies, certifications..."
                className="w-full bg-[#0E1D33] text-[#F8FAFC] placeholder-[#94A3B8] text-xs rounded-xl pl-9 pr-4 py-2.5 border border-[#23426A] focus:outline-none focus:border-[#4FD1C5] focus:ring-1 focus:ring-[#4FD1C5]/50 transition shadow-inner"
              />
              <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-2.5" />
            </form>
          </div>

          {/* Navigation Links & Actions */}
          <div className="hidden md:flex items-center gap-5">
            <Link
              to="/courses"
              className={`text-xs font-bold px-3.5 py-2 rounded-xl transition ${
                location.pathname === '/courses'
                  ? 'text-[#0A1322] bg-[#4FD1C5] shadow-md shadow-[#4FD1C5]/25 font-extrabold'
                  : 'text-[#CBD5E1] hover:text-[#4FD1C5] hover:bg-[#0E1D33]'
              }`}
            >
              Explore Courses
            </Link>

            <Link
              to="/live-classes"
              className={`text-xs font-bold px-3.5 py-2 rounded-xl transition flex items-center gap-1.5 ${
                location.pathname.startsWith('/live-classes')
                  ? 'text-[#0A1322] bg-[#4FD1C5] shadow-md shadow-[#4FD1C5]/25 font-extrabold'
                  : 'text-[#CBD5E1] hover:text-[#4FD1C5] hover:bg-[#0E1D33]'
              }`}
            >
              <Video className="w-3.5 h-3.5" />
              Live Classes
            </Link>

            {isAuthenticated && user && (
              <Link
                to="/dashboard"
                className={`text-xs font-bold px-3.5 py-2 rounded-xl transition ${
                  location.pathname === '/dashboard'
                    ? 'text-[#0A1322] bg-[#4FD1C5] shadow-md shadow-[#4FD1C5]/25 font-extrabold'
                    : 'text-[#CBD5E1] hover:text-[#4FD1C5] hover:bg-[#0E1D33]'
                }`}
              >
                My Learning
              </Link>
            )}

            {isLoading ? (
              <div className="w-8 h-8 rounded-xl bg-[#0E1D33] animate-pulse border border-[#23426A]" />
            ) : isAuthenticated && user ? (
              <div className="flex items-center gap-3">
                
                {/* Notifications Dropdown */}
                <div className="relative" ref={notificationsRef}>
                  <button
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 rounded-xl text-[#CBD5E1] hover:text-[#4FD1C5] hover:bg-[#0E1D33] border border-transparent hover:border-[#23426A] transition"
                    aria-label="Notifications"
                  >
                    <Bell className="w-4 h-4" />
                    {unreadCount > 0 && (
                      <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#4FD1C5] ring-2 ring-[#0A1322] animate-pulse" />
                    )}
                  </button>

                  {showNotifications && (
                    <div className="absolute right-0 mt-2 w-80 bg-[#132742] border border-[#23426A] rounded-2xl shadow-2xl py-2 z-50 overflow-hidden">
                      <div className="px-4 py-2.5 border-b border-[#23426A] flex justify-between items-center bg-[#0E1D33]">
                        <span className="text-xs font-bold text-[#F8FAFC]">Notifications</span>
                        <span className="text-[10px] text-[#4FD1C5] font-extrabold px-2 py-0.5 rounded-full bg-[#4FD1C5]/10 border border-[#4FD1C5]/30">
                          {unreadCount} unread
                        </span>
                      </div>
                      <div className="max-h-64 overflow-y-auto divide-y divide-[#23426A]/60">
                        {notifications.length > 0 ? (
                          notifications.map((n) => (
                            <div key={n.id} className={`p-3 text-xs hover:bg-[#1A365D] transition ${!n.isRead ? 'bg-[#0E1D33]' : ''}`}>
                              <p className="font-bold text-[#F8FAFC] text-xs">{n.title}</p>
                              <p className="text-[#CBD5E1] text-[11px] mt-0.5 leading-relaxed">{n.message}</p>
                              <span className="text-[10px] text-[#94A3B8] mt-1 block font-mono">
                                {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          ))
                        ) : (
                          <div className="p-6 text-center text-xs text-[#94A3B8]">
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
                    className="flex items-center gap-2.5 p-1 rounded-xl bg-[#0E1D33] border border-[#23426A] hover:border-[#4FD1C5] transition"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#1A365D] border border-[#4FD1C5]/40 text-[#4FD1C5] font-extrabold flex items-center justify-center text-xs shadow-md">
                      {userInitial}
                    </div>
                    <div className="hidden lg:flex flex-col text-left pr-2">
                      <span className="text-xs font-bold text-[#F8FAFC] max-w-[120px] truncate leading-tight">
                        {displayName}
                      </span>
                      <span className="text-[10px] text-[#4FD1C5] font-medium capitalize">
                        {user.role?.toLowerCase()}
                      </span>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] mr-1" />
                  </button>

                  {showUserMenu && (
                    <div className="absolute right-0 mt-2 w-60 bg-[#132742] border border-[#23426A] rounded-2xl shadow-2xl py-2 z-50">
                      <div className="px-4 py-2.5 border-b border-[#23426A] bg-[#0E1D33]">
                        <p className="text-xs font-bold text-[#F8FAFC]">{displayName}</p>
                        <p className="text-[11px] text-[#CBD5E1] truncate">{user.email}</p>
                        <div className="mt-1.5 inline-block px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#4FD1C5]/15 text-[#4FD1C5] border border-[#4FD1C5]/30">
                          {user.role}
                        </div>
                      </div>

                      <div className="py-1 text-xs">
                        <Link
                          to="/dashboard"
                          className="flex items-center gap-2.5 px-4 py-2 text-[#CBD5E1] hover:bg-[#1A365D] hover:text-[#4FD1C5] transition font-medium"
                        >
                          <BookOpen className="w-4 h-4 text-[#4FD1C5]" />
                          <span>Student Dashboard</span>
                        </Link>
                        <Link
                          to="/my-live-classes"
                          className="flex items-center gap-2.5 px-4 py-2 text-[#CBD5E1] hover:bg-[#1A365D] hover:text-[#4FD1C5] transition font-medium"
                        >
                          <Video className="w-4 h-4 text-[#4FD1C5]" />
                          <span>My Live Classes</span>
                        </Link>
                        {(user.role === 'INSTRUCTOR' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                          <>
                            <Link
                              to="/instructor/dashboard"
                              className="flex items-center gap-2.5 px-4 py-2 text-[#CBD5E1] hover:bg-[#1A365D] hover:text-[#4FD1C5] transition font-medium"
                            >
                              <Layers className="w-4 h-4 text-[#4FD1C5]" />
                              <span>Instructor Studio</span>
                            </Link>
                            <Link
                              to="/instructor/live-classes"
                              className="flex items-center gap-2.5 px-4 py-2 text-[#CBD5E1] hover:bg-[#1A365D] hover:text-[#4FD1C5] transition font-medium"
                            >
                              <Radio className="w-4 h-4 text-[#EF4444]" />
                              <span>Live Sessions Manager</span>
                            </Link>
                          </>
                        )}
                        {(user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') && (
                          <Link
                            to="/admin/dashboard"
                            className="flex items-center gap-2.5 px-4 py-2 text-[#CBD5E1] hover:bg-[#1A365D] hover:text-[#4FD1C5] transition font-medium"
                          >
                            <Shield className="w-4 h-4 text-[#4FD1C5]" />
                            <span>Admin Console</span>
                          </Link>
                        )}
                        <Link
                          to="/student/certificates"
                          className="flex items-center gap-2.5 px-4 py-2 text-[#CBD5E1] hover:bg-[#1A365D] hover:text-[#4FD1C5] transition font-medium"
                        >
                          <Award className="w-4 h-4 text-[#F59E0B]" />
                          <span>My Certificates</span>
                        </Link>
                        <Link
                          to="/profile"
                          className="flex items-center gap-2.5 px-4 py-2 text-[#CBD5E1] hover:bg-[#1A365D] hover:text-[#4FD1C5] transition font-medium"
                        >
                          <UserIcon className="w-4 h-4 text-[#94A3B8]" />
                          <span>Profile Settings</span>
                        </Link>
                      </div>

                      <div className="border-t border-[#23426A] pt-1 mt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-[#EF4444] hover:bg-[#EF4444]/10 transition text-left font-semibold"
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
              <div className="flex items-center gap-3">
                <Link
                  to="/login"
                  className="text-xs font-bold text-[#CBD5E1] hover:text-[#4FD1C5] px-3 py-2 transition"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  className="text-xs font-extrabold bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] px-4 py-2 rounded-xl shadow-lg shadow-[#4FD1C5]/20 transition"
                >
                  Get Started
                </Link>
              </div>
            )}
          </div>

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-[#CBD5E1] hover:text-[#4FD1C5] hover:bg-[#0E1D33] transition"
            aria-label="Open Mobile Menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#132742] border-b border-[#23426A] px-4 pt-3 pb-6 space-y-4 shadow-2xl">
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses..."
              className="w-full bg-[#0E1D33] text-[#F8FAFC] placeholder-[#94A3B8] text-xs rounded-xl pl-9 pr-4 py-2.5 border border-[#23426A]"
            />
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-3" />
          </form>

          <div className="space-y-1 text-sm font-bold">
            <Link to="/courses" className="block text-[#CBD5E1] hover:text-[#4FD1C5] py-2 px-3 rounded-lg hover:bg-[#1A365D]">
              Explore Courses
            </Link>
            <Link to="/live-classes" className="block text-[#CBD5E1] hover:text-[#4FD1C5] py-2 px-3 rounded-lg hover:bg-[#1A365D]">
              Live Classes
            </Link>
            {isAuthenticated && (
              <Link to="/my-live-classes" className="block text-[#CBD5E1] hover:text-[#4FD1C5] py-2 px-3 rounded-lg hover:bg-[#1A365D]">
                My Live Classes
              </Link>
            )}
            {isAuthenticated && user ? (
              <>
                <Link to="/dashboard" className="block text-[#CBD5E1] hover:text-[#4FD1C5] py-2 px-3 rounded-lg hover:bg-[#1A365D]">
                  Student Dashboard
                </Link>
                <Link to="/student/certificates" className="block text-[#CBD5E1] hover:text-[#4FD1C5] py-2 px-3 rounded-lg hover:bg-[#1A365D]">
                  My Certificates
                </Link>
                <Link to="/profile" className="block text-[#CBD5E1] hover:text-[#4FD1C5] py-2 px-3 rounded-lg hover:bg-[#1A365D]">
                  Profile Settings
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left text-[#EF4444] font-extrabold py-2 px-3 rounded-lg hover:bg-[#EF4444]/10 transition mt-2"
                >
                  Sign Out ({displayName})
                </button>
              </>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Link to="/login" className="text-center text-sm font-bold text-[#F8FAFC] py-2.5 rounded-xl bg-[#0E1D33] border border-[#23426A]">
                  Sign In
                </Link>
                <Link to="/register" className="text-center text-sm font-extrabold bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] py-2.5 rounded-xl shadow-md">
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
