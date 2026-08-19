import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setUser } from '../store/authSlice';
import { api } from '../services/api';
import { User as UserIcon, Lock, Save, CheckCircle2, Shield } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user } = useSelector((state: RootState) => state.auth);
  const dispatch = useDispatch();

  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [updating, setUpdating] = useState(false);

  // Change Password
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changingPass, setChangingPass] = useState(false);
  const [msg, setMsg] = useState('');

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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 bg-[#0A1322] min-h-screen text-[#F8FAFC] font-sans">
      
      <div className="border-b border-[#23426A] pb-4">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">Account Profile & Security</h1>
        <p className="text-xs text-[#CBD5E1]">Manage your credentials, bio, and security settings.</p>
      </div>

      {msg && (
        <div className="p-4 rounded-2xl bg-[#22C55E]/15 border border-[#22C55E]/30 text-xs text-[#22C55E] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
          <span>{msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Profile Info Form */}
        <form onSubmit={handleUpdateProfile} className="p-6 rounded-2xl bg-[#132742] border border-[#23426A] space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-[#4FD1C5]" /> Public Profile
          </h2>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#CBD5E1]">Email Address (Read-only)</label>
            <input
              type="text"
              disabled
              value={user.email}
              className="w-full bg-[#0E1D33]/60 border border-[#23426A] rounded-xl p-2.5 text-xs text-[#94A3B8]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#CBD5E1]">Full Legal Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#0E1D33] border border-[#23426A] rounded-xl p-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#4FD1C5]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#CBD5E1]">Professional Bio</label>
            <textarea
              rows={4}
              placeholder="Tell us about your background & goals..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-[#0E1D33] border border-[#23426A] rounded-xl p-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#4FD1C5] resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={updating}
            className="w-full py-2.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-extrabold text-xs rounded-xl shadow-lg shadow-[#4FD1C5]/20 transition"
          >
            {updating ? 'Saving...' : 'Save Profile Changes'}
          </button>
        </form>

        {/* Password Security Form */}
        <form onSubmit={handleChangePassword} className="p-6 rounded-2xl bg-[#132742] border border-[#23426A] space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-[#F8FAFC] uppercase tracking-wider flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#EF4444]" /> Change Password
          </h2>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#CBD5E1]">Current Password</label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full bg-[#0E1D33] border border-[#23426A] rounded-xl p-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#4FD1C5]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-[#CBD5E1]">New Password (Min 8 chars)</label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full bg-[#0E1D33] border border-[#23426A] rounded-xl p-2.5 text-xs text-[#F8FAFC] focus:outline-none focus:border-[#4FD1C5]"
            />
          </div>

          <button
            type="submit"
            disabled={changingPass}
            className="w-full py-2.5 bg-[#EF4444] hover:bg-[#DC2626] text-white font-extrabold text-xs rounded-xl shadow-lg transition"
          >
            {changingPass ? 'Updating...' : 'Update Password'}
          </button>
        </form>

      </div>

    </div>
  );
};
