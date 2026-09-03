import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  X,
  Users,
  TrendingUp,
  Award,
  FileCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  RotateCcw,
  Sparkles,
  HelpCircle,
  BarChart3,
  BookOpen,
  Unlock,
} from 'lucide-react';
import { resolveMediaUrl } from '../utils/media';
import { CertificatesManagementTab } from './admin/CertificatesManagementTab';

interface CourseAnalyticsModalProps {
  courseId: string;
  courseTitle: string;
  onClose: () => void;
}

export const CourseAnalyticsModal: React.FC<CourseAnalyticsModalProps> = ({
  courseId,
  courseTitle,
  onClose,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'students' | 'assignments' | 'quizzes' | 'certificates'>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [expandedQuizAttemptId, setExpandedQuizAttemptId] = useState<string | null>(null);

  // Assignment Fast Grading State
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [gradeScore, setGradeScore] = useState<string>('');
  const [gradeFeedback, setGradeFeedback] = useState<string>('');
  const [gradeStatus, setGradeStatus] = useState<string>('PASSED');
  const [submittingGrade, setSubmittingGrade] = useState(false);

  // Reset Attempts State
  const [resettingAttempts, setResettingAttempts] = useState(false);

  useEffect(() => {
    fetchAnalytics();
  }, [courseId]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.get(`/courses/${courseId}/analytics`);
      setData(res.data);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load course analytics.');
    } finally {
      setLoading(false);
    }
  };

  const handleGradeSubmission = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    try {
      setSubmittingGrade(true);
      await api.post(`/assignments/submissions/${selectedSubmission.id}/grade`, {
        score: gradeScore ? parseFloat(gradeScore) : undefined,
        feedback: gradeFeedback,
        status: gradeStatus,
      });

      alert('Assignment evaluated successfully! Student has been notified.');
      setSelectedSubmission(null);
      await fetchAnalytics();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to grade submission.');
    } finally {
      setSubmittingGrade(false);
    }
  };

  const handleResetQuizAttempts = async (quizId: string, userId?: string) => {
    const confirmMsg = userId
      ? 'Reset all attempts for this student on this assessment?'
      : 'Reset attempts for ALL students on this assessment?';
    if (!window.confirm(confirmMsg)) return;

    try {
      setResettingAttempts(true);
      await api.post(`/quizzes/${quizId}/reset-attempts`, { userId });
      alert('Quiz attempts have been reset.');
      await fetchAnalytics();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reset attempts.');
    } finally {
      setResettingAttempts(false);
    }
  };

  const handleResetAssignmentAttempts = async (assignmentId: string, userId: string, studentName: string) => {
    if (!window.confirm(`Unlock and reset assignment attempts for ${studentName}? This will clear anti-cheating lockouts and allow the student to retake the assignment.`)) {
      return;
    }

    try {
      setResettingAttempts(true);
      await api.post(`/assignments/${assignmentId}/reset-attempts`, { userId });
      alert(`Assignment unlocked successfully! ${studentName} can now access and submit the assignment again.`);
      await fetchAnalytics();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to reset assignment attempts.');
    } finally {
      setResettingAttempts(false);
    }
  };

  const openGradingModal = (sub: any) => {
    setSelectedSubmission(sub);
    setGradeScore(sub.score !== null && sub.score !== undefined ? String(sub.score) : String(sub.maxScore || 100));
    setGradeFeedback(sub.feedback || '');
    setGradeStatus(sub.status === 'PASSED' ? 'PASSED' : sub.status === 'NEEDS_REVISION' ? 'NEEDS_REVISION' : 'PASSED');
  };

  const filteredStudents = (data?.students || []).filter((s: any) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-[#040C18]/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn">
      <div className="bg-[#08152A] border border-[#23426A] w-full max-w-6xl rounded-3xl shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="p-5 sm:p-6 border-b border-[#23426A] flex items-center justify-between bg-[#0B1E38]/90">
          <div className="flex items-center space-x-3 min-w-0 pr-4">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#0284c7] to-[#0ea5e9] flex items-center justify-center flex-shrink-0 shadow-md shadow-[#0284c7]/20 text-white">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-black text-[#38BDF8] uppercase tracking-wider block">
                Instructor & Admin Studio
              </span>
              <h3 className="text-base sm:text-lg font-black text-[#F8FAFC] truncate">
                {courseTitle} — Performance Analytics
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#152F4A] rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-[#38BDF8] border-t-transparent"></div>
              <p className="text-xs text-[#94A3B8] font-bold">Aggregating course completion rates and student records...</p>
            </div>
          ) : error ? (
            <div className="bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-2xl p-6 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-[#EF4444] mx-auto" />
              <h4 className="text-sm font-extrabold text-[#F8FAFC]">Access Error</h4>
              <p className="text-xs text-[#CBD5E1]">{error}</p>
            </div>
          ) : data ? (
            <>
              {/* Top KPI Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                {/* Total Enrolled */}
                <div className="bg-[#0D223F] border border-[#23426A] p-4 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-[#94A3B8]">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Enrolled</span>
                    <Users className="w-4 h-4 text-[#38BDF8]" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#F8FAFC]">
                    {data.stats.totalEnrolled}
                  </div>
                  <span className="text-[10px] text-[#94A3B8] block">Active students</span>
                </div>

                {/* Course Completion Rate */}
                <div className="bg-[#0D223F] border border-[#23426A] p-4 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-[#94A3B8]">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Completion Rate</span>
                    <TrendingUp className="w-4 h-4 text-[#22C55E]" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#22C55E]">
                    {data.stats.completionRate}%
                  </div>
                  <div className="w-full bg-[#1A365D] h-1.5 rounded-full overflow-hidden mt-1">
                    <div
                      className="bg-[#22C55E] h-full transition-all"
                      style={{ width: `${Math.min(100, data.stats.completionRate)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#94A3B8] block">
                    {data.stats.completedStudents} of {data.stats.totalEnrolled} completed
                  </span>
                </div>

                {/* Average Quiz Score */}
                <div className="bg-[#0D223F] border border-[#23426A] p-4 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-[#94A3B8]">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Avg Quiz Score</span>
                    <HelpCircle className="w-4 h-4 text-[#F59E0B]" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#F59E0B]">
                    {data.stats.averageQuizScore > 0 ? `${data.stats.averageQuizScore}%` : 'N/A'}
                  </div>
                  <span className="text-[10px] text-[#94A3B8] block">
                    {data.stats.totalQuizAttempts} attempts logged
                  </span>
                </div>

                {/* Assignment Submissions */}
                <div className="bg-[#0D223F] border border-[#23426A] p-4 rounded-2xl space-y-1">
                  <div className="flex items-center justify-between text-[#94A3B8]">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Assignments</span>
                    <FileCheck className="w-4 h-4 text-[#818CF8]" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#818CF8]">
                    {data.stats.totalAssignmentSubmissions}
                  </div>
                  <span className="text-[10px] text-[#94A3B8] block">
                    {data.stats.pendingGradingCount > 0 ? (
                      <span className="text-[#F59E0B] font-bold">⚠️ {data.stats.pendingGradingCount} pending review</span>
                    ) : (
                      'All graded'
                    )}
                  </span>
                </div>

                {/* Certificates Issued */}
                <div className="bg-[#0D223F] border border-[#23426A] p-4 rounded-2xl space-y-1 col-span-2 lg:col-span-1">
                  <div className="flex items-center justify-between text-[#94A3B8]">
                    <span className="text-[11px] font-bold uppercase tracking-wider">Certificates</span>
                    <Award className="w-4 h-4 text-[#EAB308]" />
                  </div>
                  <div className="text-xl sm:text-2xl font-black text-[#EAB308]">
                    {data.stats.certificatesIssuedCount}
                  </div>
                  <span className="text-[10px] text-[#94A3B8] block">Official verified credentials</span>
                </div>
              </div>

              {/* Navigation Tabs & Search */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-[#23426A] pb-3">
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setActiveTab('students')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      activeTab === 'students'
                        ? 'bg-[#38BDF8] text-[#08152A] shadow-md shadow-[#38BDF8]/20 font-black'
                        : 'bg-[#0D223F] text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    👥 Students & Results ({data.students?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('assignments')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                      activeTab === 'assignments'
                        ? 'bg-[#38BDF8] text-[#08152A] shadow-md shadow-[#38BDF8]/20 font-black'
                        : 'bg-[#0D223F] text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    <span>📝 Assignments ({data.submissions?.length || 0})</span>
                    {data.stats.pendingGradingCount > 0 && (
                      <span className="bg-[#F59E0B] text-[#08152A] text-[9px] px-1.5 py-0.2 rounded-full font-black">
                        {data.stats.pendingGradingCount}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('quizzes')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                      activeTab === 'quizzes'
                        ? 'bg-[#38BDF8] text-[#08152A] shadow-md shadow-[#38BDF8]/20 font-black'
                        : 'bg-[#0D223F] text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    🎯 Quiz Attempts ({data.quizAttempts?.length || 0})
                  </button>
                  <button
                    onClick={() => setActiveTab('certificates')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                      activeTab === 'certificates'
                        ? 'bg-[#38BDF8] text-[#08152A] shadow-md shadow-[#38BDF8]/20 font-black'
                        : 'bg-[#0D223F] text-[#94A3B8] hover:text-[#F8FAFC]'
                    }`}
                  >
                    <span>🎓 Certificates ({data.stats?.certificatesIssuedCount || 0})</span>
                  </button>
                </div>

                {activeTab === 'students' && (
                  <div className="relative w-full sm:w-64">
                    <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search student name or email..."
                      className="w-full pl-9 pr-3 py-1.5 bg-[#0D223F] border border-[#23426A] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#38BDF8]"
                    />
                  </div>
                )}
              </div>

              {/* Tab 1: Detailed Students Progress & Results */}
              {activeTab === 'students' && (
                <div className="space-y-3">
                  {filteredStudents.length === 0 ? (
                    <div className="p-8 text-center bg-[#0D223F] border border-[#23426A] rounded-2xl text-xs text-[#94A3B8]">
                      No students found matching your query.
                    </div>
                  ) : (
                    <div className="bg-[#0D223F] border border-[#23426A] rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-[#CBD5E1]">
                          <thead className="bg-[#0B1E38] text-[10px] font-black text-[#94A3B8] uppercase border-b border-[#23426A]">
                            <tr>
                              <th className="p-3.5">Student</th>
                              <th className="p-3.5">Course Progress</th>
                              <th className="p-3.5">Lessons Watched</th>
                              <th className="p-3.5">Avg Quiz</th>
                              <th className="p-3.5">Assignment Status</th>
                              <th className="p-3.5">Certificate</th>
                              <th className="p-3.5 text-right">Details</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#23426A]/50">
                            {filteredStudents.map((s: any) => {
                              const isExpanded = expandedStudentId === s.studentId;
                              return (
                                <React.Fragment key={s.studentId}>
                                  <tr className="hover:bg-[#152F4A]/50 transition">
                                    {/* Student Name & Avatar */}
                                    <td className="p-3.5 font-bold text-[#F8FAFC]">
                                      <div className="flex items-center space-x-2.5">
                                        <div className="w-7 h-7 rounded-full bg-[#1A365D] border border-[#23426A] flex items-center justify-center text-[11px] font-black text-[#38BDF8]">
                                          {s.avatar ? (
                                            <img
                                              src={resolveMediaUrl(s.avatar)}
                                              alt={s.name}
                                              className="w-full h-full rounded-full object-cover"
                                            />
                                          ) : (
                                            s.name[0]
                                          )}
                                        </div>
                                        <div className="min-w-0">
                                          <span className="block truncate">{s.name}</span>
                                          <span className="text-[10px] text-[#94A3B8] font-mono block truncate">
                                            {s.email}
                                          </span>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Progress % */}
                                    <td className="p-3.5">
                                      <div className="space-y-1 w-28">
                                        <div className="flex items-center justify-between text-[10px]">
                                          <span className="font-bold text-[#F8FAFC]">
                                            {Math.round(s.progressPercentage)}%
                                          </span>
                                          {s.progressPercentage >= 100 && (
                                            <CheckCircle2 className="w-3 h-3 text-[#22C55E]" />
                                          )}
                                        </div>
                                        <div className="w-full bg-[#1A365D] h-1.5 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full transition-all ${
                                              s.progressPercentage >= 100 ? 'bg-[#22C55E]' : 'bg-[#38BDF8]'
                                            }`}
                                            style={{ width: `${Math.min(100, s.progressPercentage)}%` }}
                                          />
                                        </div>
                                      </div>
                                    </td>

                                    {/* Lessons Watched */}
                                    <td className="p-3.5 font-mono text-[11px]">
                                      {s.completedLessonsCount} / {s.totalLessonsCount}
                                    </td>

                                    {/* Avg Quiz */}
                                    <td className="p-3.5">
                                      {s.averageQuizScore !== null ? (
                                        <span
                                          className={`px-2 py-0.5 rounded-md font-bold text-[11px] ${
                                            s.averageQuizScore >= 80
                                              ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30'
                                              : 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30'
                                          }`}
                                        >
                                          {s.averageQuizScore}%
                                        </span>
                                      ) : (
                                        <span className="text-[#94A3B8] text-[10px]">No attempts</span>
                                      )}
                                    </td>

                                    {/* Assignment Status */}
                                    <td className="p-3.5">
                                      {s.assignments.length === 0 ? (
                                        <span className="text-[#94A3B8] text-[10px]">None required</span>
                                      ) : (
                                        <div className="space-y-1">
                                          {s.assignments.map((a: any) => (
                                            <div key={a.assignmentId} className="flex items-center space-x-1 text-[10px]">
                                              <span
                                                className={`px-1.5 py-0.5 rounded font-extrabold ${
                                                  a.status === 'PASSED'
                                                    ? 'bg-[#22C55E]/10 text-[#22C55E]'
                                                    : a.status === 'NEEDS_REVISION'
                                                    ? 'bg-[#EF4444]/10 text-[#EF4444]'
                                                    : a.status === 'SUBMITTED'
                                                    ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
                                                    : 'bg-[#1A365D] text-[#94A3B8]'
                                                }`}
                                              >
                                                {a.status === 'PASSED' ? `Passed (${a.score}/${a.maxScore})` : a.status}
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </td>

                                    {/* Certificate */}
                                    <td className="p-3.5">
                                      {s.certificate?.isIssued ? (
                                        <a
                                          href={s.certificate.verificationUrl}
                                          target="_blank"
                                          rel="noreferrer"
                                          className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-md bg-[#EAB308]/10 text-[#EAB308] border border-[#EAB308]/30 font-bold hover:bg-[#EAB308]/20 transition"
                                        >
                                          <Award className="w-3 h-3" />
                                          <span>Verified</span>
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </a>
                                      ) : (
                                        <span className="text-[#94A3B8] text-[10px]">Not earned</span>
                                      )}
                                    </td>

                                    {/* Expand Button */}
                                    <td className="p-3.5 text-right">
                                      <button
                                        onClick={() => setExpandedStudentId(isExpanded ? null : s.studentId)}
                                        className="p-1.5 hover:bg-[#1A365D] rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] transition"
                                      >
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                      </button>
                                    </td>
                                  </tr>

                                  {/* Expanded Row Breakdown */}
                                  {isExpanded && (
                                    <tr className="bg-[#09182D]">
                                      <td colSpan={7} className="p-4 border-t border-[#23426A]/40 space-y-3">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                          {/* Quiz History */}
                                          <div className="bg-[#0D223F] p-3.5 rounded-xl border border-[#23426A]/60 space-y-2">
                                            <h5 className="text-[11px] font-black text-[#38BDF8] uppercase tracking-wider flex items-center justify-between">
                                              <span>Quiz & Assessment Records</span>
                                            </h5>
                                            {s.quizzes.length === 0 ? (
                                              <p className="text-[10px] text-[#94A3B8]">No quizzes configured in this course.</p>
                                            ) : (
                                              <div className="space-y-1.5">
                                                {s.quizzes.map((q: any) => (
                                                  <div
                                                    key={q.quizId}
                                                    className="flex items-center justify-between text-xs p-2 bg-[#08152A] rounded-lg border border-[#23426A]/40"
                                                  >
                                                    <div>
                                                      <span className="font-bold text-[#F8FAFC] block">{q.title}</span>
                                                      <span className="text-[10px] text-[#94A3B8]">
                                                        {q.attemptsCount} / {q.maxAttempts} attempts • Pass threshold: {q.passingScore}%
                                                      </span>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                      {q.bestScore !== null ? (
                                                        <span
                                                          className={`font-black text-xs ${
                                                            q.passed ? 'text-[#22C55E]' : 'text-[#EF4444]'
                                                          }`}
                                                        >
                                                          Best: {q.bestScore}%
                                                        </span>
                                                      ) : (
                                                        <span className="text-[10px] text-[#94A3B8]">Unattempted</span>
                                                      )}
                                                      {q.attemptsCount > 0 && (
                                                        <button
                                                          onClick={() => handleResetQuizAttempts(q.quizId, s.studentId)}
                                                          disabled={resettingAttempts}
                                                          title="Reset student attempts"
                                                          className="p-1 hover:bg-[#1A365D] rounded text-[#94A3B8] hover:text-[#38BDF8]"
                                                        >
                                                          <RotateCcw className="w-3 h-3" />
                                                        </button>
                                                      )}
                                                    </div>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>

                                          {/* Assignment History */}
                                          <div className="bg-[#0D223F] p-3.5 rounded-xl border border-[#23426A]/60 space-y-2">
                                            <h5 className="text-[11px] font-black text-[#818CF8] uppercase tracking-wider">
                                              Assignment Submissions & Feedback
                                            </h5>
                                            {s.assignments.length === 0 ? (
                                              <p className="text-[10px] text-[#94A3B8]">No assignments in this course.</p>
                                            ) : (
                                              <div className="space-y-1.5">
                                                {s.assignments.map((a: any) => (
                                                  <div
                                                    key={a.assignmentId}
                                                    className="p-2 bg-[#08152A] rounded-lg border border-[#23426A]/40 text-xs space-y-1"
                                                  >
                                                    <div className="flex items-center justify-between">
                                                      <span className="font-bold text-[#F8FAFC]">{a.title}</span>
                                                      <span
                                                        className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                                                          a.status === 'PASSED'
                                                            ? 'bg-[#22C55E]/10 text-[#22C55E]'
                                                            : a.status === 'NEEDS_REVISION'
                                                            ? 'bg-[#EF4444]/10 text-[#EF4444]'
                                                            : a.status === 'SUBMITTED'
                                                            ? 'bg-[#F59E0B]/10 text-[#F59E0B]'
                                                            : 'bg-[#1A365D] text-[#94A3B8]'
                                                        }`}
                                                      >
                                                        {a.status === 'PASSED' ? `Score: ${a.score}/${a.maxScore}` : a.status}
                                                      </span>
                                                    </div>
                                                    {a.feedback && (
                                                      <p className="text-[11px] text-[#CBD5E1] bg-[#0D223F] p-1.5 rounded">
                                                        💬 <strong>Instructor Note:</strong> {a.feedback}
                                                      </p>
                                                    )}
                                                    {a.submissionId && (
                                                      <button
                                                        onClick={() => openGradingModal(a)}
                                                        className="text-[10px] font-bold text-[#38BDF8] hover:underline block pt-0.5"
                                                      >
                                                        Edit Score / Provide Feedback →
                                                      </button>
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </td>
                                    </tr>
                                  )}
                                </React.Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Assignment Submissions & Fast Grading */}
              {activeTab === 'assignments' && (
                <div className="space-y-3">
                  {data.submissions.length === 0 ? (
                    <div className="p-8 text-center bg-[#0D223F] border border-[#23426A] rounded-2xl text-xs text-[#94A3B8]">
                      No assignment submissions recorded for this course yet.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.submissions.map((sub: any) => (
                        <div
                          key={sub.id}
                          className="bg-[#0D223F] border border-[#23426A] p-4 rounded-2xl space-y-3 hover:border-[#38BDF8]/40 transition"
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-0.5">
                              <span className="text-[10px] font-extrabold text-[#38BDF8] uppercase tracking-wider">
                                {sub.assignmentTitle}
                              </span>
                              <h4 className="text-xs font-black text-[#F8FAFC]">{sub.studentName}</h4>
                              <span className="text-[10px] text-[#94A3B8] font-mono">{sub.studentEmail}</span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                sub.status === 'PASSED'
                                  ? 'bg-[#22C55E]/10 text-[#22C55E] border border-[#22C55E]/30'
                                  : sub.status === 'NEEDS_REVISION'
                                  ? 'bg-[#EF4444]/10 text-[#EF4444] border border-[#EF4444]/30'
                                  : 'bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/30'
                              }`}
                            >
                              {sub.status === 'PASSED' ? `Passed (${sub.score}/${sub.maxScore})` : sub.status}
                            </span>
                          </div>

                          {/* Submission Content / File */}
                          {sub.submissionText && (
                            <div className="bg-[#08152A] p-2.5 rounded-xl border border-[#23426A]/40 text-xs text-[#CBD5E1] max-h-24 overflow-y-auto whitespace-pre-wrap">
                              {sub.submissionText}
                            </div>
                          )}

                          {sub.fileUrl && (
                            <a
                              href={resolveMediaUrl(sub.fileUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1.5 text-xs text-[#38BDF8] hover:underline font-bold"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>View Attached Assignment File</span>
                            </a>
                          )}

                          {sub.feedback && (
                            <div className="text-[11px] text-[#CBD5E1] bg-[#08152A] p-2 rounded-xl border border-[#23426A]/40">
                              <span className="text-[#94A3B8] font-bold block mb-0.5">Instructor Feedback:</span>
                              {sub.feedback}
                            </div>
                          )}

                          <div className="pt-2 border-t border-[#23426A]/60 flex items-center justify-between flex-wrap gap-2">
                            <span className="text-[10px] text-[#94A3B8]">
                              Submitted {new Date(sub.submittedAt).toLocaleDateString()}
                            </span>
                            <div className="flex items-center gap-2">
                              {(sub.submissionAttempts >= 3 || sub.feedback?.includes('anti-cheating') || sub.status === 'RETURNED') && (
                                <button
                                  onClick={() => handleResetAssignmentAttempts(sub.assignmentId, sub.studentId, sub.studentName)}
                                  disabled={resettingAttempts}
                                  className="px-2.5 py-1.5 bg-[#22C55E]/15 hover:bg-[#22C55E]/25 text-[#22C55E] border border-[#22C55E]/30 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-xs"
                                  title="Clear anti-cheating lockout and reset attempts so student can retake"
                                >
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Unlock & Reset</span>
                                </button>
                              )}
                              <button
                                onClick={() => openGradingModal(sub)}
                                className="px-3 py-1.5 bg-[#38BDF8] text-[#08152A] hover:bg-[#0284c7] hover:text-white rounded-xl text-xs font-extrabold shadow-md shadow-[#38BDF8]/10 transition"
                              >
                                Grade / Edit Score
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Quiz Attempts Breakdown */}
              {activeTab === 'quizzes' && (
                <div className="space-y-3">
                  {data.quizAttempts.length === 0 ? (
                    <div className="p-8 text-center bg-[#0D223F] border border-[#23426A] rounded-2xl text-xs text-[#94A3B8]">
                      No quiz attempts recorded for this course yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {data.quizAttempts.map((attempt: any) => {
                        const isExpanded = expandedQuizAttemptId === attempt.id;
                        return (
                          <div
                            key={attempt.id}
                            className="bg-[#0D223F] border border-[#23426A] rounded-2xl p-4 space-y-3"
                          >
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-bold text-[#38BDF8] uppercase tracking-wider block">
                                  {attempt.quizTitle} {attempt.isFinalAssessment && '(Final Exam)'}
                                </span>
                                <h4 className="text-xs font-black text-[#F8FAFC]">
                                  {attempt.studentName} ({attempt.studentEmail})
                                </h4>
                              </div>
                              <div className="flex items-center space-x-3">
                                <div className="text-right">
                                  <span
                                    className={`text-sm font-black block ${
                                      attempt.passed ? 'text-[#22C55E]' : 'text-[#EF4444]'
                                    }`}
                                  >
                                    {attempt.percentage}%
                                  </span>
                                  <span className="text-[10px] text-[#94A3B8]">
                                    {attempt.score}/{attempt.maxScore} pts • {attempt.passed ? 'PASSED' : 'FAILED'}
                                  </span>
                                </div>
                                <button
                                  onClick={() => handleResetQuizAttempts(attempt.quizId, attempt.userId)}
                                  disabled={resettingAttempts}
                                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-[#F59E0B] border border-amber-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 transition shadow-xs"
                                  title="Clear anti-cheating lockout and reset attempts so student can retake quiz"
                                >
                                  <Unlock className="w-3 h-3" />
                                  <span>Reset Attempts</span>
                                </button>
                                <button
                                  onClick={() => setExpandedQuizAttemptId(isExpanded ? null : attempt.id)}
                                  className="p-2 hover:bg-[#1A365D] rounded-xl text-[#94A3B8] hover:text-[#F8FAFC] transition"
                                >
                                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                </button>
                              </div>
                            </div>

                            {/* Answers inspection */}
                            {isExpanded && (
                              <div className="pt-3 border-t border-[#23426A]/60 space-y-2">
                                <h5 className="text-[11px] font-bold text-[#CBD5E1] uppercase">Submitted Answers:</h5>
                                <div className="space-y-1.5">
                                  {attempt.answers.map((ans: any, aIdx: number) => (
                                    <div
                                      key={ans.id}
                                      className={`p-2.5 rounded-xl border text-xs flex items-start space-x-2 ${
                                        ans.isCorrect
                                          ? 'bg-[#22C55E]/5 border-[#22C55E]/20 text-[#CBD5E1]'
                                          : 'bg-[#EF4444]/5 border-[#EF4444]/20 text-[#CBD5E1]'
                                      }`}
                                    >
                                      <span className="font-bold text-[#F8FAFC] flex-shrink-0">Q{aIdx + 1}:</span>
                                      <div className="min-w-0 flex-1 space-y-0.5">
                                        <p className="font-medium text-[#F8FAFC]">{ans.questionText}</p>
                                        <p className="text-[11px]">
                                          Selected: <span className="font-bold">{ans.selectedOptionText}</span>{' '}
                                          {ans.isCorrect ? '✅' : '❌'}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 4: Course Certificates & Governance */}
              {activeTab === 'certificates' && (
                <div className="pt-2">
                  <CertificatesManagementTab courseId={courseId} isInstructorView={true} />
                </div>
              )}
            </>
          ) : null}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#23426A] bg-[#0B1E38] flex items-center justify-between">
          <span className="text-[11px] text-[#94A3B8]">
            🔒 Confidential Course Performance Record • Khalil Academy Executive Studio
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-[#0E1D33] hover:bg-[#1A365D] text-[#CBD5E1] font-bold rounded-xl text-xs transition"
          >
            Close
          </button>
        </div>
      </div>

      {/* Quick Grading Submodal */}
      {selectedSubmission && (
        <div className="fixed inset-0 z-60 bg-[#000000]/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#08152A] border border-[#23426A] w-full max-w-lg rounded-3xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#23426A] pb-3">
              <div>
                <span className="text-[10px] font-extrabold text-[#38BDF8] uppercase tracking-wider block">
                  Grade Assignment
                </span>
                <h4 className="text-sm font-black text-[#F8FAFC]">
                  {selectedSubmission.studentName} — {selectedSubmission.assignmentTitle || selectedSubmission.title}
                </h4>
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
                className="p-1.5 text-[#94A3B8] hover:text-[#F8FAFC] rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGradeSubmission} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#CBD5E1] uppercase mb-1">
                    Score (Max: {selectedSubmission.maxScore || 100})
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max={selectedSubmission.maxScore || 100}
                    value={gradeScore}
                    onChange={(e) => setGradeScore(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-[#0D223F] border border-[#23426A] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#CBD5E1] uppercase mb-1">
                    Evaluation Status
                  </label>
                  <select
                    value={gradeStatus}
                    onChange={(e) => setGradeStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0D223F] border border-[#23426A] rounded-xl text-xs text-[#F8FAFC] focus:outline-none focus:border-[#38BDF8]"
                  >
                    <option value="PASSED">PASSED (Approved)</option>
                    <option value="NEEDS_REVISION">NEEDS_REVISION (Request Updates)</option>
                    <option value="GRADED">GRADED (Scored)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#CBD5E1] uppercase mb-1">
                  Instructor Feedback & Guidance
                </label>
                <textarea
                  rows={3}
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  placeholder="Provide constructive feedback, praise strengths, and specify corrections..."
                  className="w-full p-3 bg-[#0D223F] border border-[#23426A] rounded-xl text-xs text-[#F8FAFC] placeholder-[#94A3B8] focus:outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-[#23426A]">
                <button
                  type="button"
                  onClick={() => setSelectedSubmission(null)}
                  className="px-4 py-2 bg-[#0E1D33] text-[#CBD5E1] font-bold rounded-xl text-xs hover:bg-[#1A365D] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingGrade}
                  className="px-5 py-2 bg-[#38BDF8] text-[#08152A] hover:bg-[#0284c7] hover:text-white font-extrabold rounded-xl text-xs shadow-lg shadow-[#38BDF8]/20 transition disabled:opacity-50"
                >
                  {submittingGrade ? 'Saving Grade...' : 'Save & Notify Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
