import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { Lock, Mail, User, ArrowRight, AlertCircle, CheckCircle2, Award } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'STUDENT' | 'INSTRUCTOR'>('STUDENT');

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      setError('Please enter your real full name.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    try {
      const res = await api.post('/auth/register', {
        name: trimmedName,
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
        role,
      });

      if (res.data.success) {
        setRegisteredEmail(email.trim().toLowerCase());
        setSuccess(true);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
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
            <h1 className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white">Create Account</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">Join Khalil Academy to start learning or teaching</p>
          </div>
        </div>

        {/* Certificate Legal Name Notice */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 space-y-1 shadow-inner">
          <div className="flex items-center gap-2 text-[#0B1F3A] dark:text-white font-bold text-xs">
            <Award className="w-4 h-4 text-[#F59E0B]" />
            <span>Important Certificate Name Policy</span>
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
            Please enter your <strong>real legal name</strong>. This name will appear on all official certificates of completion issued to you.
          </p>
        </div>

        {success ? (
          <div className="p-6 rounded-2xl bg-teal-50/50 dark:bg-[#087F78]/20 border border-teal-200 dark:border-teal-700 text-center space-y-4 shadow-xs">
            <div className="w-12 h-12 rounded-full bg-[#087F78] text-white flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white">Verify Your Email Address</h3>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                We sent a verification link to <strong className="text-[#087F78] dark:text-[#14B8A6]">{registeredEmail}</strong>. Please open your inbox and click the verification button to activate your account.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-xs text-[#EF4444] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Legal Name (For Certificates)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mohamed Ibrahim"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78] focus:ring-1 focus:ring-[#087F78]/20 transition"
                  />
                  <User className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>

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
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Password (min 8 chars)</label>
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

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Confirm Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78] focus:ring-1 focus:ring-[#087F78]/20 transition"
                  />
                  <Lock className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3.5 top-3" />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">I want to join as a</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('STUDENT')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      role === 'STUDENT'
                        ? 'bg-teal-50 dark:bg-[#087F78]/30 border-[#087F78] text-[#087F78] dark:text-[#14B8A6]'
                        : 'bg-slate-50 dark:bg-[#152F4A] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white'
                    }`}
                  >
                    <span>Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('INSTRUCTOR')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      role === 'INSTRUCTOR'
                        ? 'bg-teal-50 dark:bg-[#087F78]/30 border-[#087F78] text-[#087F78] dark:text-[#14B8A6]'
                        : 'bg-slate-50 dark:bg-[#152F4A] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white'
                    }`}
                  >
                    <span>Instructor</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs shadow-xs transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'Creating Account...' : 'Create Account'} <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-center text-xs text-slate-500 dark:text-slate-400">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-[#087F78] dark:text-[#14B8A6] hover:underline">
                Sign In
              </Link>
            </p>
          </>
        )}

      </div>
    </div>
  );
};
