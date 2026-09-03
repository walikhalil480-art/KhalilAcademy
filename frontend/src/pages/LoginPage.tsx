import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import { api } from '../services/api';
import { Lock, Mail, ArrowRight, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isUnverified, setIsUnverified] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsUnverified(false);
    setResendSuccess('');
    setLoading(true);

    try {
      const res = await api.post('/auth/login', {
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.data.success) {
        dispatch(
          setCredentials({
            user: res.data.user,
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken,
          })
        );

        if (redirectTarget) {
          navigate(redirectTarget);
          return;
        }

        if (res.data.user.role === 'ADMIN' || res.data.user.role === 'SUPER_ADMIN') {
          navigate('/admin/dashboard');
        } else if (res.data.user.role === 'INSTRUCTOR') {
          navigate('/instructor/dashboard');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (err: any) {
      const errCode = err.response?.data?.code;
      const errMsg = err.response?.data?.message || 'Login failed. Please verify your credentials.';

      if (err.response?.status === 403 && (errCode === 'EMAIL_NOT_VERIFIED' || errMsg.toLowerCase().includes('verify your email'))) {
        setIsUnverified(true);
        setError(errMsg);
      } else {
        setError(errMsg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email) {
      setError('Please enter your registered email address.');
      return;
    }

    try {
      setResending(true);
      setResendSuccess('');
      const res = await api.post('/auth/resend-verification', {
        email: email.trim().toLowerCase(),
      });
      setResendSuccess(res.data.message || 'A fresh verification link has been sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white font-sans transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-3xl p-8 shadow-xs space-y-6">
        
        <div className="text-center space-y-3">
          <div className="relative flex items-center justify-center">
            <img
              src="/logo-transparent.png"
              alt="Khalil Academy"
              className="w-24 h-auto mx-auto object-contain drop-shadow-sm dark:hidden"
              onError={(e) => {
                e.currentTarget.src = '/logo.png';
              }}
            />
            <img
              src="/logo-dark-mode.png"
              alt="Khalil Academy"
              className="w-24 h-auto mx-auto object-contain drop-shadow-md hidden dark:block"
              onError={(e) => {
                e.currentTarget.src = '/logo.png';
              }}
            />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white">Welcome Back</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Sign in to your Khalil Academy learning account</p>
          </div>
        </div>

        {/* Unverified Email Warning with Resend Action */}
        {isUnverified && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/60 space-y-3 shadow-inner">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[#0B1F3A] dark:text-white">Email Verification Required</h4>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                  Your email address has not been verified yet. Please check your inbox and click the verification link before logging in.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending}
              className="w-full py-2 bg-white dark:bg-[#152F4A] hover:bg-slate-50 dark:hover:bg-slate-800 text-[#0B1F3A] dark:text-white border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              <span>{resending ? 'Sending link...' : 'Resend Verification Email'}</span>
            </button>

            {resendSuccess && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#10B981] font-bold pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{resendSuccess}</span>
              </div>
            )}
          </div>
        )}

        {error && !isUnverified && (
          <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-[#EF4444] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78] focus:ring-1 focus:ring-[#087F78]/20 transition"
              />
              <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Password</label>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78] focus:ring-1 focus:ring-[#087F78]/20 transition"
              />
              <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 dark:text-slate-400">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-[#087F78] dark:text-[#14B8A6] hover:underline">
            Sign Up Free
          </Link>
        </p>

      </div>
    </div>
  );
};
