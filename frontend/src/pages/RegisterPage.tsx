import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { GraduationCap, Lock, Mail, User, ArrowRight, AlertCircle, CheckCircle2, Award } from 'lucide-react';

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
    <div className="min-h-[75vh] flex items-center justify-center px-4 py-12 bg-[#0A1322] font-sans">
      <div className="w-full max-w-md bg-[#132742] border border-[#23426A] rounded-3xl p-8 shadow-2xl space-y-6">
        
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-[#1A365D] border border-[#4FD1C5]/30 text-[#4FD1C5] flex items-center justify-center mx-auto shadow-lg shadow-[#4FD1C5]/10">
            <GraduationCap className="w-7 h-7 text-[#4FD1C5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-[#F8FAFC]">Create Account</h1>
          <p className="text-xs text-[#CBD5E1]">Join Khalil Academy to start learning or teaching</p>
        </div>

        {/* Certificate Legal Name Notice */}
        <div className="p-4 rounded-2xl bg-[#0E1D33] border border-[#23426A] space-y-1.5 shadow-inner">
          <div className="flex items-center gap-2 text-[#F8FAFC] font-bold text-xs">
            <Award className="w-4 h-4 text-[#F59E0B]" />
            <span>Important Certificate Name Policy</span>
          </div>
          <p className="text-[11px] text-[#CBD5E1] leading-relaxed">
            Please enter your <strong>real legal name</strong>. This name will appear on all official certificates of completion issued to you.
          </p>
        </div>

        {success ? (
          <div className="p-6 rounded-2xl bg-[#0E1D33] border border-[#22C55E]/40 text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-full bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/30 flex items-center justify-center mx-auto shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-[#F8FAFC]">Verify Your Email Address</h3>
              <p className="text-xs text-[#CBD5E1] leading-relaxed">
                We sent a verification link to <strong className="text-[#4FD1C5]">{registeredEmail}</strong>. Please open your inbox and click the verification button to activate your account.
              </p>
            </div>
            <div className="pt-2">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold text-xs rounded-xl shadow-md transition"
              >
                <span>Proceed to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            {error && (
              <div className="p-3.5 rounded-xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-xs text-[#EF4444] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#CBD5E1]">Full Legal Name (For Certificates)</label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mohamed Ibrahim"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0E1D33] border border-[#23426A] rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#4FD1C5] transition"
                  />
                  <User className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
                </div>
              </div>

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
                <label className="text-xs font-bold text-[#CBD5E1]">Password (min 8 chars)</label>
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

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#CBD5E1]">Confirm Password</label>
                <div className="relative">
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#0E1D33] border border-[#23426A] rounded-xl py-2.5 pl-10 pr-4 text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#4FD1C5] transition"
                  />
                  <Lock className="w-4 h-4 text-[#94A3B8] absolute left-3.5 top-3" />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1.5 pt-1">
                <label className="text-xs font-bold text-[#CBD5E1]">I want to join as a</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('STUDENT')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      role === 'STUDENT'
                        ? 'bg-[#1A365D] border-[#4FD1C5] text-[#4FD1C5]'
                        : 'bg-[#0E1D33] border-[#23426A] text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    <span>Student</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('INSTRUCTOR')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 ${
                      role === 'INSTRUCTOR'
                        ? 'bg-[#1A365D] border-[#4FD1C5] text-[#4FD1C5]'
                        : 'bg-[#0E1D33] border-[#23426A] text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    <span>Instructor</span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold text-xs shadow-lg shadow-[#4FD1C5]/20 transition disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? 'Creating Account...' : 'Create Account'} <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            <p className="text-center text-xs text-[#94A3B8]">
              Already have an account?{' '}
              <Link to="/login" className="font-extrabold text-[#4FD1C5] hover:underline">
                Sign In
              </Link>
            </p>
          </>
        )}

      </div>
    </div>
  );
};
