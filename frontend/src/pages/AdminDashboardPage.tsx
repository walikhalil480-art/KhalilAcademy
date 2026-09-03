import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { api } from '../services/api';
import { User, AuditLog } from '../types';
import {
  atRiskApi,
  StudentRiskRecord,
  StudentRiskStats,
  StudentRiskDetailsResponse,
  StudentRiskLevel,
  StudentRiskReason,
  StudentRiskStatus,
} from '../services/atRiskApi';
import {
  Shield,
  Users,
  DollarSign,
  Award,
  BookOpen,
  Key,
  Activity,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Trash2,
  Search,
  RefreshCw,
  Send,
  ExternalLink,
  Clock,
  HelpCircle,
  X,
  Radio,
  CheckCircle,
  AlertCircle,
  MessageSquare,
} from 'lucide-react';

import { CertificatesManagementTab } from '../components/admin/CertificatesManagementTab';

export const AdminDashboardPage: React.FC = () => {
  const { user: currentUser } = useSelector((state: RootState) => state.auth);

  const [data, setData] = useState<any>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'audit' | 'at-risk' | 'certificates'>('overview');

  // Reset Password Modal State
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('NewPass123!');
  const [resetting, setResetting] = useState(false);

  // Delete User Modal State
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  // -------------------------------------------------------------
  // At-Risk Students State
  // -------------------------------------------------------------
  const [atRiskData, setAtRiskData] = useState<{
    stats: StudentRiskStats;
    records: StudentRiskRecord[];
    pagination: any;
  } | null>(null);
  const [atRiskLoading, setAtRiskLoading] = useState(false);
  const [atRiskScanning, setAtRiskScanning] = useState(false);
  const [atRiskSearch, setAtRiskSearch] = useState('');
  const [atRiskLevelFilter, setAtRiskLevelFilter] = useState('ALL');
  const [atRiskReasonFilter, setAtRiskReasonFilter] = useState('ALL');
  const [atRiskStatusFilter, setAtRiskStatusFilter] = useState('ACTIVE');
  const [atRiskPage, setAtRiskPage] = useState(1);

  // Student Intervention Drawer/Modal State
  const [selectedStudentDetails, setSelectedStudentDetails] = useState<StudentRiskDetailsResponse | null>(null);
  const [loadingStudentDetails, setLoadingStudentDetails] = useState(false);
  const [interventionMessage, setInterventionMessage] = useState('');
  const [interventionTitle, setInterventionTitle] = useState('');
  const [sendingIntervention, setSendingIntervention] = useState(false);
  const [interventionSuccess, setInterventionSuccess] = useState<string | null>(null);

  // Dismiss Modal State
  const [dismissRecordId, setDismissRecordId] = useState<string | null>(null);
  const [dismissReason, setDismissReason] = useState('');
  const [dismissing, setDismissing] = useState(false);

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

  const fetchAtRiskData = async () => {
    setAtRiskLoading(true);
    try {
      const res = await atRiskApi.getSummary({
        page: atRiskPage,
        limit: 20,
        search: atRiskSearch || undefined,
        riskLevel: atRiskLevelFilter !== 'ALL' ? atRiskLevelFilter : undefined,
        riskReason: atRiskReasonFilter !== 'ALL' ? atRiskReasonFilter : undefined,
        status: atRiskStatusFilter,
      });
      if (res.success) {
        setAtRiskData(res);
      }
    } catch (err) {
      console.error('Failed to load at-risk student data:', err);
    } finally {
      setAtRiskLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    fetchAtRiskData();
  }, []);

  useEffect(() => {
    if (activeTab === 'at-risk') {
      fetchAtRiskData();
    }
  }, [activeTab, atRiskSearch, atRiskLevelFilter, atRiskReasonFilter, atRiskStatusFilter, atRiskPage]);

  const handleTriggerScan = async () => {
    setAtRiskScanning(true);
    try {
      await atRiskApi.triggerAnalysis();
      await fetchAtRiskData();
      alert('At-Risk student detection scan completed successfully.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to complete risk scan.');
    } finally {
      setAtRiskScanning(false);
    }
  };

  const handleOpenStudentDetails = async (studentId: string) => {
    setLoadingStudentDetails(true);
    setInterventionSuccess(null);
    setInterventionMessage('');
    setInterventionTitle('');
    try {
      const details = await atRiskApi.getStudentDetails(studentId);
      setSelectedStudentDetails(details);
      // Pre-fill template
      if (details.activeRisks && details.activeRisks.length > 0) {
        const primary = details.activeRisks[0];
        if (primary.riskReason === 'INACTIVE_10_DAYS') {
          setInterventionTitle(`Checking in on your learning journey! 🌟`);
          setInterventionMessage(
            `Hi ${details.student.name.split(' ')[0]},\n\nWe noticed you haven't visited Khalil Academy recently. Your next lessons are ready whenever you are. Please let us know if you need any assistance or guidance!`
          );
        } else if (primary.riskReason === 'COURSE_PROGRESS_STALLED') {
          setInterventionTitle(`Keep up the momentum in ${primary.course?.title || 'your course'}! 🚀`);
          setInterventionMessage(
            `Hi ${details.student.name.split(' ')[0]},\n\nYou're making solid progress in ${primary.course?.title || 'your course'}. Take 15 minutes today to complete your next lesson!`
          );
        } else if (primary.riskReason === 'QUIZ_FAILED_3_TIMES') {
          setInterventionTitle(`Quiz Support & Study Tips 📚`);
          setInterventionMessage(
            `Hi ${details.student.name.split(' ')[0]},\n\nQuizzes can be challenging! Feel free to review the lesson notes or ask questions in the community. You've got this!`
          );
        } else if (primary.riskReason === 'ASSIGNMENT_OVERDUE') {
          setInterventionTitle(`Assignment Deadline Reminder 📝`);
          setInterventionMessage(
            `Hi ${details.student.name.split(' ')[0]},\n\nDon't forget to submit your assignment for ${primary.course?.title || 'your course'} so we can provide personalized instructor feedback.`
          );
        } else {
          setInterventionTitle(`How can we help you succeed? 💡`);
          setInterventionMessage(
            `Hi ${details.student.name.split(' ')[0]},\n\nWe're here to help you master your engineering goals. Please reach out if there's any topic you'd like us to explain further.`
          );
        }
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load student details.');
    } finally {
      setLoadingStudentDetails(false);
    }
  };

  const handleSendIntervention = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentDetails || !interventionMessage.trim()) return;
    setSendingIntervention(true);
    setInterventionSuccess(null);
    try {
      await atRiskApi.sendIntervention(selectedStudentDetails.student.id, {
        title: interventionTitle.trim() || undefined,
        message: interventionMessage.trim(),
        linkUrl: '/dashboard',
      });
      setInterventionSuccess('Supportive intervention message and email sent successfully!');
      await fetchAtRiskData();
      // Reload student modal data
      const updated = await atRiskApi.getStudentDetails(selectedStudentDetails.student.id);
      setSelectedStudentDetails(updated);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to send intervention.');
    } finally {
      setSendingIntervention(false);
    }
  };

  const handleDismissRecord = async () => {
    if (!dismissRecordId) return;
    setDismissing(true);
    try {
      await atRiskApi.dismissRiskRecord(dismissRecordId, dismissReason);
      setDismissRecordId(null);
      setDismissReason('');
      await fetchAtRiskData();
      if (selectedStudentDetails) {
        const updated = await atRiskApi.getStudentDetails(selectedStudentDetails.student.id);
        setSelectedStudentDetails(updated);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to dismiss risk record.');
    } finally {
      setDismissing(false);
    }
  };

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
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-4 bg-[#F1F5F7] text-[#0B1F3A] dark:text-white">
        <div className="w-10 h-10 border-4 border-[#087F78] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs font-bold text-slate-500 dark:text-[#A9BACB]">Loading platform operations...</p>
      </div>
    );
  }

  const metrics = data?.metrics || {};
  const atRiskStats = atRiskData?.stats;

  return (
    <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white p-4 sm:p-8 lg:p-10 font-sans pb-24 transition-colors">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-[#1E3A56] mb-8">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] border border-teal-200 dark:border-teal-700/50 uppercase tracking-wider font-mono">
            <Shield className="w-3.5 h-3.5" />
            <span>Super Administrator Console</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white tracking-tight">
            Platform Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Monitor academy activity, detect at-risk students, manage user accounts, and oversee learning health.
          </p>
        </div>

        {/* Modern Segmented Tab Control */}
        <div className="flex items-center gap-1.5 bg-white dark:bg-[#102A43] p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 self-start md:self-auto shadow-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'overview'
                ? 'bg-[#087F78] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white'
            }`}
          >
            Metrics Overview
          </button>
          <button
            onClick={() => setActiveTab('at-risk')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'at-risk'
                ? 'bg-[#087F78] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${activeTab === 'at-risk' ? 'text-white' : 'text-[#EF4444]'}`} />
            <span>At-Risk Students</span>
            {atRiskStats && atRiskStats.highRisk > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-[#EF4444] text-white text-[10px] font-bold">
                {atRiskStats.highRisk}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'users'
                ? 'bg-[#087F78] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white'
            }`}
          >
            User Management
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shrink-0 ${
              activeTab === 'audit'
                ? 'bg-[#087F78] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white'
            }`}
          >
            Audit Logs
          </button>
          <button
            onClick={() => setActiveTab('certificates')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              activeTab === 'certificates'
                ? 'bg-[#087F78] text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white'
            }`}
          >
            <Award className={`w-3.5 h-3.5 ${activeTab === 'certificates' ? 'text-white' : 'text-[#F59E0B]'}`} />
            <span>Certificates</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* 4 Statistics Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            <div className="p-6 rounded-2xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] hover:border-[#087F78]/40 transition space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-[#087F78]/30 border border-teal-200 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] flex items-center justify-center shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono font-bold bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] px-2 py-0.5 rounded-full border border-teal-200/60 dark:border-teal-700/50">
                  {metrics.totalStudents || 0} Students
                </span>
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white font-mono">
                  {metrics.totalUsers || 0}
                </div>
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Total Registered Users
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] hover:border-[#087F78]/40 transition space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-[#087F78]/30 border border-teal-200 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] flex items-center justify-center shadow-xs">
                <DollarSign className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#087F78] dark:text-[#14B8A6] font-mono">
                  {metrics.totalRevenue || 0} KSH
                </div>
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Total Gross Revenue
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] hover:border-[#087F78]/40 transition space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-[#087F78]/30 border border-teal-200 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] flex items-center justify-center shadow-xs">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white font-mono">
                  {metrics.publishedCourses || 0}{' '}
                  <span className="text-sm font-normal text-slate-400">/ {metrics.totalCourses || 0}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Courses Published
                </div>
              </div>
            </div>

            <div className="p-6 rounded-2xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] hover:border-amber-500/40 transition space-y-3 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/50 text-amber-500 flex items-center justify-center shadow-xs">
                <Award className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white font-mono">
                  {metrics.certificatesIssued || 0}
                </div>
                <div className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Certificates Issued
                </div>
              </div>
            </div>
          </div>

          {/* At-Risk Callout Widget in Overview */}
          {atRiskStats && atRiskStats.totalAtRisk > 0 && (
            <div className="p-5 rounded-2xl bg-white dark:bg-[#102A43] border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-[#EF4444] flex items-center justify-center shrink-0 shadow-xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                    <span>{atRiskStats.totalAtRisk} Students Flagged as At-Risk</span>
                    <span className="px-2 py-0.5 rounded-md bg-red-50 text-[#EF4444] text-[10px] font-bold">
                      {atRiskStats.highRisk} High Priority
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-[#A9BACB]">
                    Inactivity, stalled course progression, repeated quiz failures, and overdue assignments detected.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveTab('at-risk')}
                className="px-4 py-2 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 shrink-0"
              >
                Review & Intervene
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Auditable Academy Public Statistics Breakdown */}
          <div className="p-6 sm:p-7 rounded-2xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] space-y-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 dark:border-[#1E3A56] pb-4">
              <div>
                <h3 className="text-base font-extrabold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
                  <span>Public Statistics & Database Audit</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Real-time database metrics that drive the public homepage and course discovery pages.
                </p>
              </div>
              <span className="text-[10px] font-mono font-bold px-3 py-1 bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] border border-teal-200 dark:border-teal-700/50 rounded-full self-start sm:self-auto">
                100% Database-Driven
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Active Students
                </span>
                <span className="text-xl font-extrabold text-[#0B1F3A] dark:text-white font-mono block">
                  {metrics.totalStudents || 0}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Role: STUDENT</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Published Courses
                </span>
                <span className="text-xl font-extrabold text-[#0B1F3A] dark:text-white font-mono block">
                  {metrics.publishedCourses || 0}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Status: PUBLISHED</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Completed Courses
                </span>
                <span className="text-xl font-extrabold text-[#087F78] dark:text-[#14B8A6] font-mono block">
                  {metrics.completedCourses || 0}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Enrollment status: COMPLETED</span>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                  Total Enrollments
                </span>
                <span className="text-xl font-extrabold text-[#0B1F3A] dark:text-white font-mono block">
                  {metrics.totalEnrollments || 0}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">Active & completed</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: AT-RISK STUDENTS DETECTION & INTERVENTION */}
      {activeTab === 'at-risk' && (
        <div className="space-y-6">
          {/* Top Control Bar & Run Scan Trigger */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-extrabold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#EF4444]" />
                At-Risk Student Detection & Learning Health
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Automated multi-factor risk detection: Inactivity (10+ days), Stalled progress, 3+ Quiz failures, Overdue assignments, and Low scores.
              </p>
            </div>

            <button
              onClick={handleTriggerScan}
              disabled={atRiskScanning}
              className="px-4 py-2.5 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2 self-start sm:self-auto disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${atRiskScanning ? 'animate-spin' : ''}`} />
              {atRiskScanning ? 'Analyzing Students...' : 'Run Risk Analysis Scan'}
            </button>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">
                Total At-Risk
              </span>
              <span className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white font-mono block">
                {atRiskStats?.totalAtRisk || 0}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">Active flags</span>
            </div>

            <div className="p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 space-y-1 shadow-xs">
              <span className="text-[10px] font-bold text-[#EF4444] uppercase tracking-wider block flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#EF4444]" /> High Risk
              </span>
              <span className="text-2xl font-extrabold text-[#EF4444] font-mono block">
                {atRiskStats?.highRisk || 0}
              </span>
              <span className="text-[10px] text-red-600 dark:text-red-400">Immediate attention</span>
            </div>

            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-700/60 space-y-1 shadow-xs">
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider block flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Medium Risk
              </span>
              <span className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 font-mono block">
                {atRiskStats?.mediumRisk || 0}
              </span>
              <span className="text-[10px] text-amber-600 dark:text-amber-400">Single major blocker</span>
            </div>

            <div className="p-4 rounded-2xl bg-teal-50 dark:bg-[#087F78]/30 border border-teal-200 dark:border-teal-700/50 space-y-1 shadow-xs">
              <span className="text-[10px] font-bold text-[#087F78] dark:text-[#14B8A6] uppercase tracking-wider block flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#087F78]" /> Low Risk
              </span>
              <span className="text-2xl font-extrabold text-[#087F78] dark:text-[#14B8A6] font-mono block">
                {atRiskStats?.lowRisk || 0}
              </span>
              <span className="text-[10px] text-teal-700 dark:text-teal-400">Early warning</span>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] space-y-1 col-span-2 sm:col-span-1 shadow-xs">
              <span className="text-[10px] font-bold text-[#087F78] dark:text-[#14B8A6] uppercase tracking-wider block flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#087F78] dark:text-[#14B8A6]" /> Recovered
              </span>
              <span className="text-2xl font-extrabold text-[#087F78] dark:text-[#14B8A6] font-mono block">
                {atRiskStats?.recovered || 0}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Last 30 days</span>
            </div>
          </div>

          {/* Search & Filter Controls Bar */}
          <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-4 space-y-3 shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              {/* Search */}
              <div className="sm:col-span-4 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
                <input
                  type="text"
                  placeholder="Search student by name or email..."
                  value={atRiskSearch}
                  onChange={(e) => {
                    setAtRiskSearch(e.target.value);
                    setAtRiskPage(1);
                  }}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78]"
                />
              </div>

              {/* Risk Level Filter */}
              <div className="sm:col-span-3">
                <select
                  value={atRiskLevelFilter}
                  onChange={(e) => {
                    setAtRiskLevelFilter(e.target.value);
                    setAtRiskPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78]"
                >
                  <option value="ALL">All Risk Levels</option>
                  <option value="HIGH">🔴 High Risk Only</option>
                  <option value="MEDIUM">🟠 Medium Risk Only</option>
                  <option value="LOW">🟡 Low Risk Only</option>
                </select>
              </div>

              {/* Reason Filter */}
              <div className="sm:col-span-3">
                <select
                  value={atRiskReasonFilter}
                  onChange={(e) => {
                    setAtRiskReasonFilter(e.target.value);
                    setAtRiskPage(1);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78]"
                >
                  <option value="ALL">All Risk Reasons</option>
                  <option value="INACTIVE_10_DAYS">Inactivity (10+ Days)</option>
                  <option value="COURSE_PROGRESS_STALLED">Course Progress Stalled</option>
                  <option value="QUIZ_FAILED_3_TIMES">Quiz Failures (3+ Attempts)</option>
                  <option value="ASSIGNMENT_OVERDUE">Assignment Overdue</option>
                  <option value="LOW_RECENT_PERFORMANCE">Low Recent Scores (&lt;50%)</option>
                </select>
              </div>

              {/* Status Tabs */}
              <div className="sm:col-span-2 flex items-center bg-slate-100 dark:bg-[#0B223D] border border-slate-200 dark:border-[#1E3A56] rounded-xl p-1">
                {[
                  { id: 'ACTIVE', label: 'Active' },
                  { id: 'RESOLVED', label: 'Recovered' },
                  { id: 'ALL', label: 'All' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      setAtRiskStatusFilter(st.id);
                      setAtRiskPage(1);
                    }}
                    className={`flex-1 py-1 text-[11px] font-bold rounded-lg transition-all text-center ${
                      atRiskStatusFilter === st.id
                        ? 'bg-[#087F78] text-white shadow-xs'
                        : 'text-slate-600 dark:text-[#A9BACB] hover:text-[#0B1F3A]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* At-Risk Table */}
          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl overflow-hidden shadow-xs">
            {atRiskLoading ? (
              <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-3 border-[#087F78] border-t-transparent rounded-full animate-spin" />
                <span>Loading at-risk analytics...</span>
              </div>
            ) : !atRiskData?.records || atRiskData.records.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200 text-[#087F78] flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <CheckCircle className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white mb-1">
                  🎉 No students are currently at risk!
                </h3>
                <p className="text-xs text-slate-500 dark:text-[#A9BACB] max-w-md mx-auto">
                  All monitored students are actively logging in, advancing through course lessons, and maintaining positive assessment performance.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs text-slate-600 dark:text-[#A9BACB]">
                  <thead className="bg-slate-50 dark:bg-[#152F4A] border-b border-slate-200 dark:border-[#1E3A56] text-[10px] font-bold text-slate-500 dark:text-[#A9BACB] uppercase tracking-wider font-mono">
                    <tr>
                      <th className="p-3.5">Student</th>
                      <th className="p-3.5">Risk Level</th>
                      <th className="p-3.5">Risk Reason & Diagnostics</th>
                      <th className="p-3.5">Related Course</th>
                      <th className="p-3.5">Detected Date</th>
                      <th className="p-3.5">Status</th>
                      <th className="p-3.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1E3A56]">
                    {atRiskData.records.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-50 dark:hover:bg-[#152F4A] dark:bg-[#152F4A] transition-colors">
                        <td className="p-3.5">
                          <div className="font-bold text-[#0B1F3A] dark:text-white text-sm">{rec.user.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-[#A9BACB]">{rec.user.email}</div>
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          {rec.riskLevel === 'HIGH' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-50 border border-red-200 text-[#EF4444] text-[10px] font-bold">
                              🔴 HIGH
                            </span>
                          ) : rec.riskLevel === 'MEDIUM' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                              🟠 MEDIUM
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[#087F78] text-[10px] font-bold">
                              🟡 LOW
                            </span>
                          )}
                        </td>

                        <td className="p-3.5 max-w-sm">
                          <div className="font-bold text-[#0B1F3A] dark:text-white line-clamp-1">{rec.title}</div>
                          <div className="text-[11px] text-slate-500 dark:text-[#A9BACB] line-clamp-2 mt-0.5">
                            {rec.details}
                          </div>
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          {rec.course ? (
                            <span className="text-[11px] text-[#087F78] font-bold">
                              {rec.course.title}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-400">Platform-wide</span>
                          )}
                        </td>

                        <td className="p-3.5 whitespace-nowrap text-[11px] text-slate-500 dark:text-[#A9BACB]">
                          {new Date(rec.detectedAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </td>

                        <td className="p-3.5 whitespace-nowrap">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              rec.status === 'ACTIVE'
                                ? 'bg-red-50 text-[#EF4444] border border-red-200'
                                : rec.status === 'RESOLVED'
                                ? 'bg-teal-50 text-[#087F78] border border-teal-200'
                                : 'bg-slate-100 dark:bg-[#0B223D] text-slate-600 dark:text-[#A9BACB]'
                            }`}
                          >
                            {rec.status}
                          </span>
                        </td>

                        <td className="p-3.5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => handleOpenStudentDetails(rec.user.id)}
                              className="px-3 py-1.5 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white text-[11px] font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              Intervene
                            </button>

                            {rec.status === 'ACTIVE' && (
                              <button
                                onClick={() => setDismissRecordId(rec.id)}
                                title="Dismiss Risk Alert"
                                className="p-1.5 rounded-lg bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-[#1E3A56] text-slate-500 dark:text-[#A9BACB] hover:text-[#0B1F3A] hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D] transition-colors shadow-xs"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
      {/* Tab 3: User Management */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-[#0B1F3A] dark:text-white">Platform User Directory</h2>
              <p className="text-xs text-slate-500 dark:text-[#A9BACB]">
                Manage user role privileges, account suspension, and password resets.
              </p>
            </div>
            <span className="text-xs text-slate-500 dark:text-[#A9BACB] font-bold font-mono">
              {users.length} Users Total
            </span>
          </div>

          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-slate-600 dark:text-[#A9BACB]">
                <thead className="bg-slate-50 dark:bg-[#152F4A] border-b border-slate-200 dark:border-[#1E3A56] text-[11px] font-bold text-slate-500 dark:text-[#A9BACB] uppercase tracking-wider font-mono">
                  <tr>
                    <th className="p-4">Name & Email</th>
                    <th className="p-4">Role Privileges</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E3A56]">
                  {users.map((u) => {
                    const isSuperAdminAccount = u.role === 'SUPER_ADMIN';
                    const isCurrentSuperAdmin = currentUser?.role === 'SUPER_ADMIN';
                    const cannotModify = isSuperAdminAccount && !isCurrentSuperAdmin;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-[#152F4A] dark:bg-[#152F4A] transition">
                        <td className="p-4">
                          <div className="font-bold text-[#0B1F3A] dark:text-white">{u.name}</div>
                          <div className="text-[11px] text-slate-500 dark:text-[#A9BACB]">{u.email}</div>
                        </td>
                        <td className="p-4">
                          <select
                            disabled={cannotModify}
                            value={u.role}
                            onChange={(e) =>
                              handleUpdateRoleOrStatus(u.id, e.target.value as any, undefined)
                            }
                            className="bg-slate-50 border border-slate-200 dark:border-[#1E3A56] text-xs rounded-xl px-3 py-1.5 text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78] disabled:opacity-50 font-bold"
                          >
                            <option value="STUDENT">STUDENT</option>
                            <option value="INSTRUCTOR">INSTRUCTOR</option>
                            <option value="ADMIN">ADMIN</option>
                            {isCurrentSuperAdmin && (
                              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                            )}
                          </select>
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              u.status === 'ACTIVE'
                                ? 'bg-teal-50 text-[#087F78] border border-teal-200'
                                : 'bg-red-50 text-[#EF4444] border border-red-200'
                            }`}
                          >
                            {u.status}
                          </span>
                        </td>
                        <td className="p-4 flex items-center gap-2">
                          <button
                            disabled={cannotModify}
                            onClick={() =>
                              handleUpdateRoleOrStatus(
                                u.id,
                                undefined,
                                u.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE'
                              )
                            }
                            className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition ${
                              u.status === 'ACTIVE'
                                ? 'bg-red-50 text-[#EF4444] border-red-200 hover:bg-red-100'
                                : 'bg-teal-50 text-[#087F78] border-teal-200 hover:bg-teal-100'
                            } disabled:opacity-50`}
                          >
                            {u.status === 'ACTIVE' ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            disabled={cannotModify}
                            onClick={() => setResetModalUser(u)}
                            className="p-2 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-[#1E3A56] text-slate-600 dark:text-[#A9BACB] hover:text-[#087F78] hover:bg-slate-100 dark:hover:bg-[#0B223D] dark:bg-[#0B223D] hover:border-[#087F78] disabled:opacity-50 transition shadow-xs"
                            title="Reset Password"
                          >
                            <Key className="w-3.5 h-3.5" />
                          </button>
                          <button
                            disabled={cannotModify || u.id === currentUser?.id}
                            onClick={() => setUserToDelete(u)}
                            className="p-2 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-[#1E3A56] hover:bg-red-50 hover:border-red-200 text-slate-600 dark:text-[#A9BACB] hover:text-[#EF4444] disabled:opacity-30 transition shadow-xs"
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

      {/* Tab 4: Audit Logs */}
      {activeTab === 'audit' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-[#0B1F3A] dark:text-white">Security Audit Logs</h2>
              <p className="text-xs text-slate-500 dark:text-[#A9BACB]">
                Immutable record of administrative changes and system events.
              </p>
            </div>
            <span className="text-xs text-slate-500 dark:text-[#A9BACB] font-bold font-mono">
              {auditLogs.length} Events
            </span>
          </div>

          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56]/90 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs text-slate-600 dark:text-[#A9BACB]">
                <thead className="bg-slate-50 dark:bg-[#152F4A] border-b border-slate-200 dark:border-[#1E3A56] text-[11px] font-bold text-slate-500 dark:text-[#A9BACB] uppercase tracking-wider font-mono">
                  <tr>
                    <th className="p-4">Action</th>
                    <th className="p-4">Entity</th>
                    <th className="p-4">Actor</th>
                    <th className="p-4">IP Address</th>
                    <th className="p-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E3A56]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-[#152F4A] dark:bg-[#152F4A] transition">
                      <td className="p-4 font-bold text-[#087F78] font-mono">{log.action}</td>
                      <td className="p-4 text-[#0B1F3A] dark:text-white font-bold">{log.entity}</td>
                      <td className="p-4 text-slate-500 dark:text-[#A9BACB]">{log.user?.email || 'System'}</td>
                      <td className="p-4 font-mono text-[11px] text-slate-400">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="p-4 text-[11px] text-slate-400">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 5: Certificates Registry & Governance */}
      {activeTab === 'certificates' && (
        <CertificatesManagementTab />
      )}

      {/* STUDENT INTERVENTION & RISK PROFILE MODAL / DRAWER */}
      {selectedStudentDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl space-y-6">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 dark:border-[#1E3A56] pb-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-teal-50 border border-teal-200 text-[#087F78] font-extrabold flex items-center justify-center text-base shadow-xs">
                  {selectedStudentDetails.student.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                    <span>{selectedStudentDetails.student.name}</span>
                    {selectedStudentDetails.student.currentRiskLevel === 'HIGH' ? (
                      <span className="px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-[#EF4444] text-[10px] font-bold">
                        🔴 HIGH RISK
                      </span>
                    ) : selectedStudentDetails.student.currentRiskLevel === 'MEDIUM' ? (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-[10px] font-bold">
                        🟠 MEDIUM RISK
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-[#087F78] text-[10px] font-bold">
                        🟡 LOW RISK
                      </span>
                    )}
                  </h3>
                  <div className="text-xs text-slate-500 dark:text-[#A9BACB]">
                    {selectedStudentDetails.student.email} • Inactive for{' '}
                    <strong className="text-[#0B1F3A] dark:text-white">
                      {selectedStudentDetails.student.inactivityDays} days
                    </strong>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedStudentDetails(null)}
                className="text-slate-400 hover:text-[#0B1F3A] dark:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {interventionSuccess && (
              <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-[#087F78] text-xs font-bold flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-[#087F78] shrink-0" />
                <span>{interventionSuccess}</span>
              </div>
            )}

            {/* Diagnostic Signals Breakdown */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#087F78] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <AlertTriangle className="w-4 h-4 text-[#EF4444]" />
                Active Risk Factors ({selectedStudentDetails.activeRisks.length})
              </h4>

              {selectedStudentDetails.activeRisks.length === 0 ? (
                <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 text-xs text-[#087F78]">
                  No active risk blockers currently detected for this student.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {selectedStudentDetails.activeRisks.map((risk) => (
                    <div
                      key={risk.id}
                      className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-[#1E3A56] space-y-1 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#0B1F3A] dark:text-white">{risk.title}</span>
                        <span className="text-[10px] text-slate-400">
                          Detected {new Date(risk.detectedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-[#A9BACB] text-[11px] leading-relaxed">{risk.details}</p>
                      {risk.recommendedAction && (
                        <div className="text-[10px] text-[#087F78] font-bold pt-1 flex items-center gap-1">
                          <span>💡 Recommendation:</span> {risk.recommendedAction}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Course Enrollments & Progress */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase tracking-wider flex items-center gap-1.5 font-mono">
                <BookOpen className="w-4 h-4 text-[#087F78]" />
                Enrolled Courses & Progression
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedStudentDetails.student.enrollments.map((enr) => (
                  <div
                    key={enr.courseId}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-[#1E3A56] space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#0B1F3A] dark:text-white line-clamp-1">{enr.courseTitle}</span>
                      <span className="text-[11px] font-extrabold text-[#087F78] font-mono">
                        {Math.round(enr.progressPercentage)}%
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-200 dark:bg-[#0B223D] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#087F78] rounded-full"
                        style={{ width: `${enr.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Supportive Message Intervention Composer */}
            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-[#152F4A] border border-teal-200 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                  <Send className="w-4 h-4 text-[#087F78]" />
                  Send Supportive Educational Intervention
                </h4>
                <p className="text-xs text-slate-500 dark:text-[#A9BACB] mt-0.5">
                  Sends an in-app encouragement notification and email directly to the student.
                </p>
              </div>

              <form onSubmit={handleSendIntervention} className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#0B1F3A] dark:text-white font-bold mb-1">Subject / Title</label>
                  <input
                    type="text"
                    required
                    value={interventionTitle}
                    onChange={(e) => setInterventionTitle(e.target.value)}
                    className="w-full p-2.5 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-xl text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:border-[#087F78]"
                  />
                </div>

                <div>
                  <label className="block text-[#0B1F3A] dark:text-white font-bold mb-1">
                    Supportive Message
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={interventionMessage}
                    onChange={(e) => setInterventionMessage(e.target.value)}
                    className="w-full p-3 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-xl text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:border-[#087F78] resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={sendingIntervention || !interventionMessage.trim()}
                    className="px-5 py-2.5 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs transition-all shadow-xs flex items-center gap-2 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    {sendingIntervention ? 'Sending Message...' : 'Send Supportive Intervention'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DISMISS RISK CONFIRMATION */}
      {dismissRecordId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl text-xs">
            <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              Dismiss Risk Alert
            </h3>
            <p className="text-slate-600 dark:text-[#A9BACB]">
              Are you sure you want to dismiss this risk flag? Please provide a reason for the record.
            </p>

            <textarea
              rows={3}
              placeholder="e.g. Student contacted via phone and resolved blocker..."
              value={dismissReason}
              onChange={(e) => setDismissReason(e.target.value)}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-[#A9BACB] focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78] resize-none"
            />

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setDismissRecordId(null);
                  setDismissReason('');
                }}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#0B223D] hover:bg-slate-200 dark:hover:bg-[#1E3A56] dark:bg-[#0B223D] border border-slate-200 dark:border-[#1E3A56] text-slate-700 dark:text-[#A9BACB] font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDismissRecord}
                disabled={dismissing}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold disabled:opacity-50 shadow-xs"
              >
                {dismissing ? 'Dismissing...' : 'Confirm Dismiss'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {resetModalUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl p-8 max-w-md w-full space-y-6 shadow-2xl">
            <div>
              <h2 className="text-lg font-extrabold text-[#0B1F3A] dark:text-white">Reset User Password</h2>
              <p className="text-xs text-slate-500 dark:text-[#A9BACB] mt-1">
                Target Account: <strong className="text-[#0B1F3A] dark:text-white">{resetModalUser.email}</strong>
              </p>
            </div>

            <form onSubmit={handleResetUserPassword} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-[#A9BACB] uppercase">New Temporary Password</label>
                <input
                  type="text"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl p-2.5 text-xs text-[#0B1F3A] dark:text-white font-mono focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setResetModalUser(null)}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-[#0B223D] hover:bg-slate-200 dark:hover:bg-[#1E3A56] dark:bg-[#0B223D] border border-slate-200 dark:border-[#1E3A56] text-xs font-bold text-slate-700 dark:text-[#A9BACB] rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetting}
                  className="px-6 py-2.5 bg-[#EF4444] hover:bg-[#DC2626] text-xs font-bold text-white rounded-xl shadow-xs transition"
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-[#EF4444] flex items-center justify-center shadow-xs">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h2 className="text-lg font-extrabold text-[#0B1F3A] dark:text-white">Delete User Account?</h2>
              <p className="text-xs text-slate-600 dark:text-[#A9BACB] leading-relaxed">
                Are you sure you want to permanently delete user{' '}
                <strong className="text-[#0B1F3A] dark:text-white">"{userToDelete.name}"</strong> (
                <span className="text-[#087F78] font-semibold">{userToDelete.email}</span>)?
              </p>
              <p className="text-[11px] text-[#EF4444] font-semibold pt-1">
                ⚠️ All enrollments, certificate records, submissions, and course progresses for this user will be removed. This action cannot be undone.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-[#1E3A56]">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                disabled={deletingUser}
                className="px-4 py-2.5 bg-slate-100 dark:bg-[#0B223D] hover:bg-slate-200 dark:hover:bg-[#1E3A56] dark:bg-[#0B223D] border border-slate-200 dark:border-[#1E3A56] text-xs font-bold text-slate-700 dark:text-[#A9BACB] rounded-xl transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={deletingUser}
                className="px-6 py-2.5 bg-[#EF4444] hover:bg-[#DC2626] disabled:opacity-50 text-xs font-bold text-white rounded-xl shadow-xs transition"
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

export default AdminDashboardPage;
