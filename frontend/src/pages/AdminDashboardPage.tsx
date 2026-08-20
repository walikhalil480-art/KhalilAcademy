import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { api } from '../services/api';
import { User, AuditLog } from '../types';
import { Shield, Users, DollarSign, Award, BookOpen, Key, Activity, Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Trash2 } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);
  
  const [data, setData] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'audit'>('overview');

  // Reset Password Modal State
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('NewPass123!');
  const [resetting, setResetting] = useState(false);

  // Delete User Modal State
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  const fetchAdminData = async () => {
    try {
      const [dRes, uRes, aRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/users'),
        api.get('/admin/audit-logs'),
      ]);
      if (dRes.data.success) setData(dRes.data);
      if (uRes.data.success) setUsers(uRes.data.users || []);
      if (aRes.data.success) setAuditLogs(aRes.data.logs || []);
    } catch (err) {
      console.error('Failed to load admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateRoleOrStatus = async (targetUserId: string, role?: string, status?: string) => {
    try {
      const res = await api.patch(`/admin/users/${targetUserId}`, { role, status });
      if (res.data.success) {
        fetchAdminData();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Update failed.');
    }
  };

  const handleResetUserPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetModalUser) return;
    setResetting(true);
    try {
      const res = await api.post(`/admin/users/${resetModalUser.id}/reset-password`, {
        newPassword,
      });

      if (res.data.success) {
        setResetModalUser(null);
        alert(`Password for ${resetModalUser.email} has been reset.`);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Password reset failed.');
    } finally {
      setResetting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      setDeletingUser(true);
      await api.delete(`/admin/users/${userToDelete.id}`);
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
      fetchAdminData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete user.');
    } finally {
      setDeletingUser(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 bg-[#0A1322] text-[#F8FAFC]">
        <div className="w-10 h-10 border-4 border-[#4FD1C5] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-semibold text-[#CBD5E1]">Loading platform operations...</p>
      </div>
    );
  }

  const metrics = data?.metrics || {};

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 bg-[#0A1322] min-h-screen text-[#F8FAFC]">
      
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[#23426A] pb-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-extrabold bg-[#1A365D] text-[#4FD1C5] border border-[#4FD1C5]/30 uppercase tracking-wider">
            <Shield className="w-3.5 h-3.5" />
            <span>Super Administrator Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC] tracking-tight">Platform Operations</h1>
          <p className="text-xs sm:text-sm text-[#CBD5E1]">
            Monitor academy activity, manage users, track courses, and oversee platform performance.
          </p>
        </div>

        {/* Modern Segmented Tab Control */}
        <div className="flex items-center gap-1.5 bg-[#0E1D33] p-1.5 rounded-2xl border border-[#23426A] self-start md:self-auto shadow-inner">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'overview'
                ? 'bg-[#4FD1C5] text-[#0A1322] font-extrabold shadow-md shadow-[#4FD1C5]/20'
                : 'text-[#CBD5E1] hover:text-white'
            }`}
          >
            Metrics Overview
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'users'
                ? 'bg-[#4FD1C5] text-[#0A1322] font-extrabold shadow-md shadow-[#4FD1C5]/20'
                : 'text-[#CBD5E1] hover:text-white'
            }`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'audit'
                ? 'bg-[#4FD1C5] text-[#0A1322] font-extrabold shadow-md shadow-[#4FD1C5]/20'
                : 'text-[#CBD5E1] hover:text-white'
            }`}
          >
            Audit Logs
          </button>
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* 4 Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-6 rounded-2xl bg-[#132742] border border-[#23426A] hover:border-[#4FD1C5]/60 transition space-y-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-[#1A365D] border border-[#4FD1C5]/30 text-[#4FD1C5] flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">{metrics.totalUsers || 0}</div>
                <div className="text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wider mt-0.5">Total Registered Users</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#132742] border border-[#23426A] hover:border-[#22C55E]/60 transition space-y-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-[#22C55E]/15 border border-[#22C55E]/30 text-[#22C55E] flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#22C55E]">{metrics.totalRevenue || 0} KSH</div>
                <div className="text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wider mt-0.5">Total Gross Revenue</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#132742] border border-[#23426A] hover:border-[#4FD1C5]/60 transition space-y-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-[#1A365D] border border-[#4FD1C5]/30 text-[#4FD1C5] flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">
                  {metrics.publishedCourses || 0} <span className="text-sm font-normal text-[#94A3B8]">/ {metrics.totalCourses || 0}</span>
                </div>
                <div className="text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wider mt-0.5">Courses Published</div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-[#132742] border border-[#23426A] hover:border-[#F59E0B]/60 transition space-y-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#F59E0B] flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#F8FAFC]">{metrics.certificatesIssued || 0}</div>
                <div className="text-[11px] text-[#94A3B8] font-semibold uppercase tracking-wider mt-0.5">Certificates Issued</div>
              </div>
            </div>
          </div>

          {/* Auditable Academy Public Statistics Breakdown */}
          <div className="p-6 sm:p-7 rounded-2xl bg-[#0E1D33] border border-[#23426A] space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#23426A] pb-4">
              <div>
                <h3 className="text-base font-extrabold text-[#F8FAFC] flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#4FD1C5]" />
                  <span>Public Statistics & Database Audit</span>
                </h3>
                <p className="text-xs text-[#94A3B8] mt-0.5">
                  Real-time database metrics that drive the public homepage and course discovery pages.
                </p>
              </div>
              <span className="text-[10px] font-mono px-3 py-1 bg-[#132742] text-[#4FD1C5] border border-[#23426A] rounded-full self-start sm:self-auto">
                100% Database-Driven
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-[#132742] border border-[#23426A] rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Active Students</span>
                <span className="text-xl font-extrabold text-[#F8FAFC] block">{metrics.totalStudents || 0}</span>
                <span className="text-[10px] text-[#CBD5E1]">Role: STUDENT</span>
              </div>

              <div className="p-4 bg-[#132742] border border-[#23426A] rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Published Courses</span>
                <span className="text-xl font-extrabold text-[#F8FAFC] block">{metrics.publishedCourses || 0}</span>
                <span className="text-[10px] text-[#CBD5E1]">Status: PUBLISHED</span>
              </div>

              <div className="p-4 bg-[#132742] border border-[#23426A] rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Completed Courses</span>
                <span className="text-xl font-extrabold text-[#22C55E] block">{metrics.completedCourses || 0}</span>
                <span className="text-[10px] text-[#CBD5E1]">Enrollment status: COMPLETED</span>
              </div>

              <div className="p-4 bg-[#132742] border border-[#23426A] rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block">Total Enrollments</span>
                <span className="text-xl font-extrabold text-[#F8FAFC] block">{metrics.totalEnrollments || 0}</span>
                <span className="text-[10px] text-[#CBD5E1]">Active & completed</span>
              </div>
            </div>
          </div>

          {/* Recent Registrations & Recent Payments */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Recent Registrations */}
            <div className="p-6 rounded-2xl bg-[#132742] border border-[#23426A] space-y-4 shadow-xl">
              <div>
                <h3 className="text-sm font-bold text-[#F8FAFC] tracking-wide">Recent Registrations</h3>
                <p className="text-xs text-[#94A3B8]">Latest students and users joining Khalil Academy.</p>
              </div>
              
              <div className="space-y-2.5 divide-y divide-[#23426A]">
                {data?.recentUsers && data.recentUsers.length > 0 ? (
                  data.recentUsers.map((u: User) => (
                    <div key={u.id} className="pt-2.5 flex justify-between items-center text-xs">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#1A365D] text-[#4FD1C5] font-extrabold flex items-center justify-center text-xs">
                          {u.name?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <span className="font-bold text-[#F8FAFC] block">{u.name}</span>
                          <span className="text-[11px] text-[#94A3B8] block">{u.email}</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-[#0E1D33] border border-[#23426A] text-[#4FD1C5]">
                        {u.role}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#94A3B8] italic pt-2">No recent registrations.</p>
                )}
              </div>
            </div>

            {/* Recent Payments */}
            <div className="p-6 rounded-2xl bg-[#132742] border border-[#23426A] space-y-4 shadow-xl">
              <div>
                <h3 className="text-sm font-bold text-[#F8FAFC] tracking-wide">Recent Payments</h3>
                <p className="text-xs text-[#94A3B8]">Latest confirmed course purchases and transactions.</p>
              </div>

              <div className="space-y-2.5 divide-y divide-[#23426A]">
                {data?.recentPayments && data.recentPayments.length > 0 ? (
                  data.recentPayments.map((p: any) => (
                    <div key={p.id} className="pt-2.5 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-[#F8FAFC] block">{p.course?.title || 'Course Enrollment'}</span>
                        <span className="text-[11px] text-[#94A3B8] block">{p.user?.email}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-[#22C55E] text-sm block">{p.finalPrice || p.amount || 0} KSH</span>
                        <span className="text-[10px] text-[#22C55E] uppercase font-bold">Confirmed</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#94A3B8] italic pt-2">No confirmed payments yet.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Tab 2: User Management */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-[#F8FAFC]">Platform User Directory</h2>
              <p className="text-xs text-[#94A3B8]">Manage user role privileges, account suspension, and password resets.</p>
            </div>
            <span className="text-xs text-[#CBD5E1] font-medium font-mono">{users.length} Users Total</span>
          </div>

          <div className="bg-[#132742] border border-[#23426A] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-[#CBD5E1]">
                <thead className="bg-[#0E1D33] border-b border-[#23426A] text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Name & Email</th>
                    <th className="p-4">Role Privileges</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#23426A]">
                  {users.map((u) => {
                    const isSuperAdminAccount = u.role === 'SUPER_ADMIN';
                    const isCurrentSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
                    const cannotModify = isSuperAdminAccount && !isCurrentSuperAdmin;

                    return (
                      <tr key={u.id} className="hover:bg-[#1A365D]/60 transition">
                        <td className="p-4">
                          <div className="font-bold text-[#F8FAFC]">{u.name}</div>
                          <div className="text-[11px] text-[#94A3B8]">{u.email}</div>
                        </td>
                        <td className="p-4">
                          <select
                            disabled={cannotModify}
                            value={u.role}
                            onChange={(e) => handleUpdateRoleOrStatus(u.id, e.target.value as any, undefined)}
                            className="bg-[#0E1D33] border border-[#23426A] text-xs rounded-xl px-3 py-1.5 text-[#F8FAFC] focus:outline-none focus:border-[#4FD1C5] disabled:opacity-50 font-medium"
                          >
                            <option value="STUDENT">STUDENT</option>
                            <option value="INSTRUCTOR">INSTRUCTOR</option>
                            <option value="ADMIN">ADMIN</option>
                            {isCurrentSuperAdmin && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
                          </select>
                        </td>
                        <td className="p-4">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                            u.status === 'ACTIVE'
                              ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                              : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                          }`}>
                            {u.status}
                          </span>
                        </td>
                        <td className="p-4 flex items-center gap-2">
                          <button
                            disabled={cannotModify}
                            onClick={() => handleUpdateRoleOrStatus(u.id, undefined, u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE')}
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                              u.status === 'ACTIVE'
                                ? 'bg-[#EF4444]/15 text-[#EF4444] border-[#EF4444]/30 hover:bg-[#EF4444]/25'
                                : 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/30 hover:bg-[#22C55E]/25'
                            } disabled:opacity-50`}
                          >
                            {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            disabled={cannotModify}
                            onClick={() => setResetModalUser(u)}
                            className="p-2 rounded-xl bg-[#0E1D33] border border-[#23426A] text-[#CBD5E1] hover:text-white hover:border-[#4FD1C5] disabled:opacity-50 transition"
                            title="Reset Password"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={cannotModify || u.id === currentUser?.id}
                            onClick={() => setUserToDelete(u)}
                            className="p-2 rounded-xl bg-[#0E1D33] border border-[#23426A] hover:bg-[#EF4444]/20 hover:border-[#EF4444]/40 text-[#CBD5E1] hover:text-[#EF4444] disabled:opacity-30 transition"
                            title="Delete User"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-[#F8FAFC]">Security Audit Logs</h2>
              <p className="text-xs text-[#94A3B8]">Immutable record of administrative changes and system events.</p>
            </div>
            <span className="text-xs text-[#CBD5E1] font-medium font-mono">{auditLogs.length} Events</span>
          </div>

          <div className="bg-[#132742] border border-[#23426A] rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-[#CBD5E1]">
                <thead className="bg-[#0E1D33] border-b border-[#23426A] text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider">
                  <tr>
                    <th className="p-4">Action</th>
                    <th className="p-4">Entity</th>
                    <th className="p-4">Actor</th>
                    <th className="p-4">IP Address</th>
                    <th className="p-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#23426A]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#1A365D]/60 transition">
                      <td className="p-4 font-bold text-[#4FD1C5] font-mono">{log.action}</td>
                      <td className="p-4 text-[#F8FAFC] font-medium">{log.entity}</td>
                      <td className="p-4 text-[#CBD5E1]">{log.user?.email || 'System'}</td>
                      <td className="p-4 font-mono text-[11px] text-[#94A3B8]">{log.ipAddress || '127.0.0.1'}</td>
                      <td className="p-4 text-[11px] text-[#94A3B8]">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-[#0A1322]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#132742] border border-[#23426A] rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div>
              <h2 className="text-lg font-extrabold text-[#F8FAFC]">Reset User Password</h2>
              <p className="text-xs text-[#CBD5E1] mt-1">Target Account: <strong className="text-white">{resetModalUser.email}</strong></p>
            </div>

            <form onSubmit={handleResetUserPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#CBD5E1]">New Temporary Password</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-[#0E1D33] border border-[#23426A] rounded-xl p-2.5 text-xs text-[#F8FAFC] font-mono focus:outline-none focus:border-[#4FD1C5]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2.5 bg-[#0E1D33] border border-[#23426A] text-xs font-bold text-[#CBD5E1] hover:text-white rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-6 py-2.5 bg-[#EF4444] hover:bg-[#DC2626] text-xs font-extrabold text-white rounded-xl shadow-lg transition"
                >
                  {resetting ? 'Resetting...' : 'Confirm Reset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Delete User Confirmation */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 bg-[#0A1322]/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#132742] border border-[#23426A] rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-[#F8FAFC]">Delete User Account?</h2>
              <p className="text-xs text-[#CBD5E1] leading-relaxed">
                Are you sure you want to permanently delete user <strong className="text-[#F8FAFC]">"{userToDelete.name}"</strong> (<span className="text-[#4FD1C5]">{userToDelete.email}</span>)?
              </p>
              <p className="text-[11px] text-[#EF4444] font-medium pt-1">
                ⚠️ All enrollments, certificate records, submissions, and course progresses for this user will be removed. This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-[#23426A]">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={deletingUser}
                className="px-4 py-2.5 bg-[#0E1D33] hover:bg-[#1A365D] border border-[#23426A] text-xs font-bold text-[#CBD5E1] hover:text-white rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deletingUser}
                className="px-6 py-2.5 bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-50 text-xs font-extrabold text-white rounded-xl shadow-lg shadow-[#EF4444]/25 transition"
              >
                {deletingUser ? 'Deleting...' : 'Delete User'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
