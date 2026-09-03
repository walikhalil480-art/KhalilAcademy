import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { Role } from '../types';

interface ProtectedRouteProps {
  allowedRoles?: Role[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useSelector((state: RootState) => state.auth);
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-slate-400 text-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
          <span>Validating session security...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    const returnUrl = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${returnUrl}`} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-slate-950 text-white p-6 text-center">
        <div className="bg-slate-900 dark:bg-[#07182D] border border-slate-800 rounded-3xl p-8 max-w-md shadow-2xl">
          <h2 className="text-2xl font-black text-rose-400 mb-2">403 Forbidden</h2>
          <p className="text-slate-300 text-sm mb-6">You do not have permission to access this administrative section.</p>
          <a href="/dashboard" className="px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs">
            Return to Student Dashboard
          </a>
        </div>
      </div>
    );
  }

  return <Outlet />;
};
