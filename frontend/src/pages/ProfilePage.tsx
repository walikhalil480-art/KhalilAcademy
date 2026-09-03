import React, { useState, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setUser } from '../store/authSlice';
import { api } from '../services/api';
import { User as UserIcon, Lock, CheckCircle2, Sun, Moon, Laptop, CreditCard, Receipt, Award, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { Link } from 'react-router-dom';
import { LearningCourseItem } from './StudentDashboardPage';

export const ProfilePage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const { theme, setTheme } = useTheme();
  const dispatch = useDispatch();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [updating, setUpdating] = useState(false);

  // Change Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [msg, setMsg] = useState('');

  // Billing & Purchase History
  const [enrolledCourses, setEnrolledCourses] = useState<LearningCourseItem[]>([]);
  const [loadingBilling, setLoadingBilling] = useState(true);

  useEffect(() => {
    const fetchBillingData = async () => {
      try {
        setLoadingBilling(true);
        const res = await api.get('/progress/my-learning');
        if (res.data?.success) {
          setEnrolledCourses(res.data.courses || []);
        }
      } catch (err) {
        console.warn('Unable to load billing history:', err);
      } finally {
        setLoadingBilling(false);
      }
    };
    fetchBillingData();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setMsg('');
    try {
      const res = await api.patch('/users/profile', { name, bio });
      if (res.data.success) {
        dispatch(setUser(res.data.user));
        setMsg('Profile updated successfully.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Profile update failed.');
    } finally {
      setUpdating(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setChangingPass(true);
    setMsg('');
    try {
      const res = await api.post('/users/change-password', { currentPassword, newPassword });
      if (res.data.success) {
        setCurrentPassword('');
        setNewPassword('');
        setMsg('Password changed successfully.');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Password change failed.');
    } finally {
      setChangingPass(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 bg-[#F1F5F7] dark:bg-[#07182D] min-h-screen text-[#0B1F3A] dark:text-white font-sans pb-24 transition-colors">
      
      {/* Header with Updated Title */}
      <div className="border-b border-slate-200 dark:border-[#1E3A56] pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white">
          Account & Billing Settings
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Manage your account profile, billing receipts, security credentials, and interface theme.
        </p>
      </div>

      {msg && (
        <div className="p-4 rounded-2xl bg-teal-50 dark:bg-[#087F78]/20 border border-teal-200 dark:border-teal-700 text-xs text-[#087F78] dark:text-[#14B8A6] flex items-center gap-2 font-bold shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
          <span>{msg}</span>
        </div>
      )}

      {/* 1. Billing & Course Purchase Receipts */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#1E3A56] pb-4">
          <div>
            <h2 className="text-sm font-bold text-[#0B1F3A] dark:text-white uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
              <span>Billing & Course Purchase History</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Receipts and active course access records registered to <strong className="text-[#0B1F3A] dark:text-white">{user.email}</strong>.
            </p>
          </div>
          <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] border border-teal-200 dark:border-teal-700/50 self-start sm:self-auto">
            {enrolledCourses.length} {enrolledCourses.length === 1 ? 'Subscription' : 'Subscriptions'}
          </span>
        </div>

        {loadingBilling ? (
          <div className="py-6 text-center text-xs text-slate-400 animate-pulse">Loading billing and purchase receipts...</div>
        ) : enrolledCourses.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 dark:bg-[#152F4A] rounded-2xl border border-slate-200 dark:border-slate-700 space-y-2">
            <Receipt className="w-8 h-8 text-slate-400 mx-auto" />
            <h4 className="text-xs font-bold text-[#0B1F3A] dark:text-white">No active purchases or invoices found</h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">When you enroll in professional courses, official receipts will be listed here.</p>
            <div className="pt-2">
              <Link
                to="/courses"
                className="px-4 py-2 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl inline-flex items-center gap-1.5 shadow-xs"
              >
                <span>Browse Course Catalog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {enrolledCourses.map((item) => (
              <div
                key={item.enrollmentId}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-[#0B1F3A] dark:text-white">
                      {item.title}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-teal-50 dark:bg-[#087F78]/40 text-[#087F78] dark:text-[#14B8A6] text-[10px] font-mono font-bold">
                      ACTIVE ACCESS
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                    <span>Instructor: {item.instructorName}</span>
                    <span>•</span>
                    <span>Progress: {Math.round(item.progressPercent)}%</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Link
                    to={`/courses/${item.slug}/learn`}
                    className="px-3.5 py-1.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    Open Classroom
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Theme Appearance Selector Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-[#0B1F3A] dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Sun className="w-4 h-4 text-amber-500" /> Interface Appearance
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Choose your preferred theme across the entire platform.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Light Theme */}
          <button
            type="button"
            onClick={() => setTheme('light')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition ${
              theme === 'light'
                ? 'border-[#087F78] bg-teal-50/50 dark:bg-teal-950/20 text-[#087F78] dark:text-[#14B8A6] font-bold ring-2 ring-[#087F78]/20'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#152F4A] text-slate-600 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            <Sun className="w-5 h-5 text-amber-500" />
            <span className="text-xs font-bold">Light Mode</span>
            <span className="text-[10px] text-slate-400 font-mono">Crisp & Clean</span>
          </button>

          {/* Dark Theme */}
          <button
            type="button"
            onClick={() => setTheme('dark')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition ${
              theme === 'dark'
                ? 'border-[#087F78] bg-teal-50/50 dark:bg-teal-950/20 text-[#087F78] dark:text-[#14B8A6] font-bold ring-2 ring-[#087F78]/20'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#152F4A] text-slate-600 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            <Moon className="w-5 h-5 text-blue-400" />
            <span className="text-xs font-bold">Dark Mode</span>
            <span className="text-[10px] text-slate-400 font-mono">Deep Midnight Navy</span>
          </button>

          {/* System Sync */}
          <button
            type="button"
            onClick={() => setTheme('system')}
            className={`p-4 rounded-xl border flex flex-col items-center gap-2 text-center transition ${
              theme === 'system'
                ? 'border-[#087F78] bg-teal-50/50 dark:bg-teal-950/20 text-[#087F78] dark:text-[#14B8A6] font-bold ring-2 ring-[#087F78]/20'
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#152F4A] text-slate-600 dark:text-slate-300 hover:border-slate-300'
            }`}
          >
            <Laptop className="w-5 h-5 text-purple-400" />
            <span className="text-xs font-bold">System Default</span>
            <span className="text-[10px] text-slate-400 font-mono">Match OS Theme</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Profile Info Form */}
        <form onSubmit={handleUpdateProfile} className="p-6 rounded-3xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-[#0B1F3A] dark:text-white uppercase tracking-wider flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" /> Public Profile
          </h2>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Email Address (Read-only)</label>
            <input
              type="text"
              disabled
              value={user.email}
              className="w-full bg-slate-100 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-500 dark:text-slate-400 font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Full Legal Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Professional Bio</label>
            <textarea
              rows={4}
              placeholder="Tell us about your background & goals..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78] resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={updating}
            className="w-full py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            {updating ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>

        {/* Password Security Form */}
        <form onSubmit={handleChangePassword} className="p-6 rounded-3xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] space-y-4 shadow-xs">
          <h2 className="text-sm font-bold text-[#0B1F3A] dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#EF4444]" /> Change Password
          </h2>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">New Password (Min 8 chars)</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78]"
            />
          </div>

          <button
            type="submit"
            disabled={changingPass}
            className="w-full py-2.5 bg-[#102A43] dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
          >
            {changingPass ? 'Updating...' : 'Update Password'}
          </button>
        </form>

      </div>

    </div>
  );
};
