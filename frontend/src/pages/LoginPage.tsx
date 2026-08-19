import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setCredentials } from '../store/authSlice';
import { api } from '../services/api';
import { GraduationCap, Lock, Mail, ArrowRight, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';

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

        // Priority 1: Redirect query parameter
        if (redirectTarget) {
          navigate(redirectTarget);
          return;
        }

        // Priority 2: Role-based default dashboard
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
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-[#0A1322] font-sans">
      <div className="w-full max-w-md bg-[#132742] border border-[#23426A] rounded-3xl p-8 shadow-2xl space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#1A365D] border border-[#4FD1C5]/30 text-[#4FD1C5] flex items-center justify-center mx-auto shadow-lg shadow-[#4FD1C5]/10">
            <GraduationCap className="w-7 h-7 text-[#4FD1C5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#F8FAFC]">Welcome Back</h1>
          <p className="text-xs text-[#CBD5E1]">Sign in to your Khalil Academy learning account</p>
        </div>

        {/* Unverified Email Warning with Resend Action */}
        {isUnverified && (
          <div className="p-4 rounded-2xl bg-[#F59E0B]/10 border border-[#F59E0B]/30 space-y-3 shadow-inner">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-[#F8FAFC]">Email Verification Required</h4>
                <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
                  Your email address has not been verified yet. Please check your inbox and click the verification link before logging in.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleResendVerification}
              disabled={resending}
              className="w-full py-2 bg-[#0E1D33] hover:bg-[#1A365D] text-[#F8FAFC] border border-[#23426A] rounded-xl text-xs font-bold transition flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
              <span>{resending ? 'Sending link...' : 'Resend Verification Email'}</span>
            </button>

            {resendSuccess && (
              <div className="flex items-center gap-1.5 text-[11px] text-[#22C55E] font-bold pt-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>{resendSuccess}</span>
              </div>
            )}
          </div>
        )}

        {error && !isUnverified && (
          <div className="p-3.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-[#CBD5E1]">Email Address</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0E1D33] border border-[#23426A] rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#4FD1C5] transition"
              />
              <Mail className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-[#CBD5E1]">Password</label>
            </div>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0E1D33] border border-[#23426A] rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#4FD1C5] transition"
              />
              <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold text-xs shadow-lg shadow-[#4FD1C5]/20 transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Authenticating...' : 'Sign In'} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="text-center text-xs text-[#94A3B8]">
          Don't have an account?{' '}
          <Link to="/register" className="font-extrabold text-[#4FD1C5] hover:underline">
            Sign Up Free
          </Link>
        </p>

      </div>
    </div>
  );
};
