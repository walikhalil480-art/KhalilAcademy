import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { GraduationCap, CheckCircle2, AlertCircle, RefreshCw, Mail } from 'lucide-react';

export const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resend form state
  const [emailToResend, setEmailToResend] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setLoading(false);
      setError('No verification token was provided in the link.');
      return;
    }

    const performVerification = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await api.post(`/auth/verify-email?token=${token}`);
        if (res.data.success) {
          setSuccess(true);
        }
      } catch (err: any) {
        setError(err.response?.data?.message || 'This verification link is invalid or has already expired.');
      } finally {
        setLoading(false);
      }
    };

    performVerification();
  }, [token]);

  const handleResend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailToResend.trim()) return;

    try {
      setResending(true);
      setResendMessage('');
      const res = await api.post('/auth/resend-verification', {
        email: emailToResend.trim().toLowerCase(),
      });
      setResendMessage(res.data.message || 'If an account exists, a new verification link has been sent.');
    } catch (err: any) {
      setResendMessage(err.response?.data?.message || 'Failed to resend verification email.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white font-sans transition-colors">
      <div className="w-full max-w-md bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-3xl p-8 shadow-xs space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-teal-50 dark:bg-[#087F78]/30 border border-[#087F78]/20 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] flex items-center justify-center mx-auto shadow-xs">
            <GraduationCap className="w-7 h-7 text-[#087F78] dark:text-[#14B8A6]" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white">Email Verification</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Khalil Academy Account Security</p>
        </div>

        {/* 1. Loading State */}
        {loading && (
          <div className="p-8 text-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#087F78] border-t-transparent mx-auto"></div>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Verifying your email address...</p>
          </div>
        )}

        {/* 2. Success State */}
        {!loading && success && (
          <div className="p-6 rounded-2xl bg-teal-50 dark:bg-[#087F78]/20 border border-teal-200 dark:border-teal-800 text-center space-y-4 shadow-xs">
            <div className="w-14 h-14 rounded-full bg-teal-100 dark:bg-[#087F78]/40 text-[#087F78] dark:text-[#14B8A6] flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-extrabold text-[#0B1F3A] dark:text-white">Email Verified Successfully!</h2>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Your email address has been verified. Your account is now fully active.
              </p>
            </div>
            <Link
              to="/login"
              className="w-full inline-block py-3 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition text-center"
            >
              Continue to Sign In
            </Link>
          </div>
        )}

        {/* 3. Error / Expired State */}
        {!loading && error && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 space-y-2">
              <div className="flex items-center gap-2 text-xs font-bold text-[#EF4444]">
                <AlertCircle className="w-4 h-4" />
                <span>Verification Link Expired or Invalid</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{error}</p>
            </div>

            {/* Request a New Link Form */}
            <form onSubmit={handleResend} className="space-y-3 pt-2 border-t border-slate-100 dark:border-[#1E3A56]">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Request a new verification email
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="Enter your registered email"
                  value={emailToResend}
                  onChange={(e) => setEmailToResend(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78] focus:outline-none"
                />
                <Mail className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
              </div>
              <button
                type="submit"
                disabled={resending}
                className="w-full py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                <span>{resending ? 'Sending...' : 'Send New Link'}</span>
              </button>
            </form>

            {resendMessage && (
              <p className="text-center text-xs text-[#087F78] dark:text-[#14B8A6] font-bold">{resendMessage}</p>
            )}

            <div className="text-center pt-2">
              <Link to="/login" className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#087F78] dark:hover:text-[#14B8A6] font-medium">
                Return to Sign In
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
