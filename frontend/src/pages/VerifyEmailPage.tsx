import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { GraduationCap, CheckCircle2, AlertCircle, RefreshCw, ArrowRight, Mail } from 'lucide-react';

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
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-[#0A1322] font-sans">
      <div className="w-full max-w-md bg-[#132742] border border-[#23426A] rounded-3xl p-8 shadow-2xl space-y-6">
        
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#1A365D] border border-[#4FD1C5]/30 text-[#4FD1C5] flex items-center justify-center mx-auto shadow-lg shadow-[#4FD1C5]/10">
            <GraduationCap className="w-7 h-7 text-[#4FD1C5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#F8FAFC]">Email Verification</h1>
          <p className="text-xs text-[#CBD5E1]">Khalil Academy Account Security</p>
        </div>

        {/* 1. Loading State */}
        {loading && (
          <div className="p-8 text-center space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#4FD1C5] border-t-transparent mx-auto"></div>
            <p className="text-xs font-semibold text-[#CBD5E1]">Verifying your email address...</p>
          </div>
        )}

        {/* 2. Success State */}
        {!loading && success && (
          <div className="p-6 rounded-2xl bg-[#0E1D33] border border-[#22C55E]/40 text-center space-y-4 shadow-xl">
            <div className="w-14 h-14 rounded-full bg-[#22C55E]/20 text-[#22C55E] flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-lg font-extrabold text-[#F8FAFC]">Email Verified Successfully!</h2>
              <p className="text-xs text-[#CBD5E1] leading-relaxed">
                Your email address has been verified. Your account is now fully active.
              </p>
            </div>
            <Link
              to="/login"
              className="w-full inline-block py-3 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold text-xs rounded-xl shadow-lg shadow-[#4FD1C5]/20 transition text-center"
            >
              Continue to Sign In
            </Link>
          </div>
        )}

        {/* 3. Error / Expired State with Resend Form */}
        {!loading && error && (
          <div className="space-y-5">
            <div className="p-4 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-[#EF4444] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-[#EF4444]">Verification Failed</h3>
                <p className="text-[11px] text-[#CBD5E1] leading-relaxed">{error}</p>
              </div>
            </div>

            {/* Resend Form */}
            <div className="p-5 rounded-2xl bg-[#0E1D33] border border-[#23426A] space-y-3">
              <h4 className="text-xs font-bold text-[#F8FAFC]">Request a New Verification Link</h4>
              <form onSubmit={handleResend} className="space-y-3">
                <div className="relative">
                  <input
                    type="email"
                    required
                    placeholder="Enter your registered email"
                    value={emailToResend}
                    onChange={(e) => setEmailToResend(e.target.value)}
                    className="w-full bg-[#0A1322] border border-[#23426A] rounded-xl py-2 pl-9 pr-3 text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#4FD1C5]"
                  />
                  <Mail className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-2.5" />
                </div>

                <button
                  type="submit"
                  disabled={resending}
                  className="w-full py-2 bg-[#4FD1C5] hover:bg-[#38B2AC] disabled:opacity-50 text-[#0A1322] font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${resending ? 'animate-spin' : ''}`} />
                  <span>{resending ? 'Sending...' : 'Resend Verification Link'}</span>
                </button>
              </form>

              {resendMessage && (
                <p className="text-[11px] text-[#22C55E] font-bold text-center pt-1">{resendMessage}</p>
              )}
            </div>

            <p className="text-center text-xs text-[#94A3B8]">
              Return to{' '}
              <Link to="/login" className="font-extrabold text-[#4FD1C5] hover:underline">
                Sign In
              </Link>
            </p>
          </div>
        )}

      </div>
    </div>
  );
};
