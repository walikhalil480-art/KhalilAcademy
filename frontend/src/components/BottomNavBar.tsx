import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Home, Compass, BookOpen, User } from 'lucide-react';

export const BottomNavBar: React.FC = () => {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  // Hide bottom bar in learning player full-screen view if needed
  const isLearningPlayer = location.pathname.includes('/learn');
  if (isLearningPlayer) return null;

  const navItems = [
    {
      label: 'Home',
      to: '/',
      icon: Home,
      exact: true,
      isActive: location.pathname === '/',
    },
    {
      label: 'Courses',
      to: '/courses',
      icon: Compass,
      isActive: location.pathname.startsWith('/courses') && !location.pathname.includes('/learn'),
    },
    {
      label: 'My Learning',
      to: isAuthenticated ? '/dashboard' : '/login?redirect=/dashboard',
      icon: BookOpen,
      isActive: location.pathname === '/dashboard' || location.pathname === '/my-learning' || location.pathname.startsWith('/student/'),
    },
    {
      label: 'Profile',
      to: isAuthenticated ? '/profile' : '/login',
      icon: User,
      isActive: location.pathname === '/profile' || location.pathname === '/login' || location.pathname === '/register',
    },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/98 dark:bg-[#07182D]/97 backdrop-blur-lg border-t border-[#D9E3E8] dark:border-[#1E3A56] shadow-lg px-2 py-1.5 transition-colors">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.isActive;

          return (
            <NavLink
              key={item.label}
              to={item.to}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 ${
                active
                  ? 'text-[#087F78] dark:text-[#14B8A6]'
                  : 'text-slate-500 dark:text-slate-400 hover:text-[#087F78] dark:hover:text-[#14B8A6]'
              }`}
            >
              <div className={`p-1 rounded-lg transition-transform ${active ? 'scale-110' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`text-[10px] tracking-tight font-medium ${active ? 'font-bold text-[#087F78] dark:text-[#14B8A6]' : ''}`}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
