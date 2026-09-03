import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Assignment, AssignmentSubmission } from '../types';
import { FileCode, Upload, CheckCircle2, ArrowLeft, Clock, AlertTriangle, ShieldAlert, Award, Lock } from 'lucide-react';

export const AssignmentSubmitPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [submission, setSubmission] = useState<AssignmentSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Anti-cheating & Tab Switching State
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState<number>(0);
  const [showCheatingWarningModal, setShowCheatingWarningModal] = useState<boolean>(false);
  const [isCheatingLocked, setIsCheatingLocked] = useState<boolean>(false);
  const [hasActiveRecertification, setHasActiveRecertification] = useState<boolean>(false);
  const isWindowAwayRef = useRef<boolean>(false);
  const lastBlurTimeRef = useRef<number>(0);

  useEffect(() => {
    const fetchAssignmentData = async () => {
      try {
        const res = await api.get(`/assignments/${id}`);
        if (res.data.success) {
          setAssignment(res.data.assignment);
          setHasActiveRecertification(!!res.data.hasActiveRecertification);
          if (res.data.submission) {
            setSubmission(res.data.submission);
            setSubmissionText(res.data.submission.submissionText || '');
            setFileUrl(res.data.submission.fileUrl || '');
          }

          // Check server lock or local lock
          const serverLocked = !!res.data.isCheatingLocked;
          const isUnlocked = res.data.isCheatingLocked === false || !!res.data.hasActiveRecertification;

          const localLocked = localStorage.getItem(`cheating_locked_assignment_${id}`) === 'true';
          const localWarnings = parseInt(localStorage.getItem(`cheating_warnings_assignment_${id}`) || '0', 10);

          if (isUnlocked) {
            // Instructor/admin reset or course re-certification unlocked the assignment
            setIsCheatingLocked(false);
            setTabSwitchWarnings(0);
            localStorage.removeItem(`cheating_locked_assignment_${id}`);
            localStorage.removeItem(`cheating_warnings_assignment_${id}`);
          } else if (serverLocked) {
            setIsCheatingLocked(true);
            setTabSwitchWarnings(3);
            localStorage.setItem(`cheating_locked_assignment_${id}`, 'true');
            localStorage.setItem(`cheating_warnings_assignment_${id}`, '3');
          } else if (localLocked || localWarnings >= 3) {
            setIsCheatingLocked(true);
            setTabSwitchWarnings(3);
          } else if (localWarnings > 0) {
            setTabSwitchWarnings(localWarnings);
          }
        }
      } catch (err: any) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchAssignmentData();
  }, [id]);

  const handleViolation = () => {
    if (isCheatingLocked || submission?.status === 'PASSED') return;

    setTabSwitchWarnings((prev) => {
      const next = Math.min(3, prev + 1);
      localStorage.setItem(`cheating_warnings_assignment_${id}`, next.toString());
      setShowCheatingWarningModal(true);

      if (next >= 3) {
        setIsCheatingLocked(true);
        localStorage.setItem(`cheating_locked_assignment_${id}`, 'true');
        api.post(`/assignments/${id}/disqualify`).catch((err) => {
          console.error('Failed to report cheating disqualification:', err);
        });
      }
      return next;
    });
  };

  // Anti-cheating: Tab Switching & Focus Loss Monitoring
  useEffect(() => {
    if (loading || isCheatingLocked || submission?.status === 'PASSED' || submission?.status === 'SUBMITTED' || submission?.status === 'UNDER_REVIEW') {
      return;
    }

    const onFocusLost = () => {
      const now = Date.now();
      if (now - lastBlurTimeRef.current < 1500) return;
      if (isWindowAwayRef.current) return;

      isWindowAwayRef.current = true;
      lastBlurTimeRef.current = now;
      handleViolation();
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        onFocusLost();
      } else {
        setTimeout(() => {
          isWindowAwayRef.current = false;
        }, 500);
      }
    };

    const handleWindowBlur = () => {
      onFocusLost();
    };

    const handleWindowFocus = () => {
      setTimeout(() => {
        isWindowAwayRef.current = false;
      }, 500);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [loading, isCheatingLocked, submission, id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCheatingLocked || tabSwitchWarnings >= 3) {
      alert('Access revoked: You cannot submit this assignment due to academic integrity violations.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post(`/assignments/${id}/submit`, {
        submissionText,
        fileUrl,
      });

      if (res.data.success) {
        setSubmission(res.data.submission);
        alert('Assignment submitted successfully!');
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !assignment) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white transition-colors">
        <div className="w-8 h-8 border-4 border-[#087F78] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isMaxAttemptsExhausted = !!(submission && (submission.submissionAttempts ?? 0) >= 3 && submission.status !== 'PASSED');
  const attemptsCount = submission?.submissionAttempts || 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 bg-[#F1F5F7] dark:bg-[#07182D] min-h-screen text-[#0B1F3A] dark:text-white font-sans pb-24 transition-colors select-none">
      
      {/* Anti-Cheating Violation Warning Modal */}
      {showCheatingWarningModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className={`bg-white dark:bg-[#102A43] border rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl space-y-5 text-[#0B1F3A] dark:text-white animate-in fade-in zoom-in-95 ${
            tabSwitchWarnings >= 3 || isCheatingLocked
              ? 'border-red-500 dark:border-red-700'
              : tabSwitchWarnings === 2
              ? 'border-red-400 dark:border-red-600'
              : 'border-amber-300 dark:border-amber-700/60'
          }`}>
            
            {/* Warning Level 1 of 3 */}
            {tabSwitchWarnings === 1 && !isCheatingLocked && (
              <>
                <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400 mx-auto flex items-center justify-center">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase font-mono tracking-widest px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700">
                    Anti-Cheating Monitor • Warning 1 of 3
                  </span>
                  <h3 className="text-xl font-black text-[#0B1F3A] dark:text-white">
                    ⚠️ Tab Switch Detected — First Warning!
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                    Leaving or switching browser tabs during course assessments is strictly prohibited and monitored in real time. Please keep this assessment window in focus.
                  </p>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300">
                    You have <span className="underline">2 warnings remaining</span>. Continued violations will result in permanent disqualification and access revocation.
                  </p>
                </div>
                <div className="p-3 bg-amber-50/70 dark:bg-[#152F4A] rounded-xl border border-amber-200/80 dark:border-[#1E3A56] text-[11px] text-slate-600 dark:text-slate-300 space-y-1 text-left">
                  <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Academic Integrity Notice:</span>
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">
                    All tab switches and window departures are recorded with timestamps. Complete your assignment legally to receive course credit.
                  </p>
                </div>
                <button
                  onClick={() => setShowCheatingWarningModal(false)}
                  className="w-full py-3 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  I Understand & Agree — Return to Assessment
                </button>
              </>
            )}

            {/* Warning Level 2 of 3 (Final Warning) */}
            {tabSwitchWarnings === 2 && !isCheatingLocked && (
              <>
                <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-red-950/50 border border-red-300 dark:border-red-800 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center animate-pulse">
                  <ShieldAlert className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase font-mono tracking-widest px-3 py-1 rounded-full bg-red-100 dark:bg-red-900/60 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700">
                    🚨 Critical Warning • 2 of 3 (Final Notice)
                  </span>
                  <h3 className="text-xl font-black text-red-600 dark:text-red-400">
                    Final Warning: 1 Tab Switch Remaining!
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed font-medium">
                    ATTENTION! This is your <strong className="text-red-600 dark:text-red-400">SECOND and FINAL warning</strong>. You have left this assessment window 2 times.
                  </p>
                  <div className="p-3 bg-red-50 dark:bg-red-950/40 rounded-xl border border-red-200 dark:border-red-800 text-[11px] text-red-800 dark:text-red-300 text-left space-y-1">
                    <div className="flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>STRICT CONSEQUENCE ON 3RD TAB SWITCH:</span>
                    </div>
                    <p className="text-[10px] leading-relaxed">
                      If you switch tabs, leave this window, or lose focus <strong>ONE MORE TIME (3rd violation)</strong>, your assessment will be <strong>IMMEDIATELY TERMINATED</strong>. You will permanently lose access to this assignment and will not be able to get credit or pass unless completed legally.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCheatingWarningModal(false)}
                  className="w-full py-3 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-md transition"
                >
                  I Understand (Final Warning) — Stay on Page
                </button>
              </>
            )}

            {/* Warning Level 3 / Disqualified Lockout */}
            {(tabSwitchWarnings >= 3 || isCheatingLocked) && (
              <>
                <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-950/80 border-2 border-red-500 dark:border-red-700 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center">
                  <Lock className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <span className="text-[10px] font-extrabold uppercase font-mono tracking-widest px-3 py-1 rounded-full bg-red-600 text-white font-bold">
                    Anti-Cheating Enforcement • Access Revoked (3 of 3)
                  </span>
                  <h3 className="text-xl font-black text-red-600 dark:text-red-400">
                    🚫 Assessment Terminated — Access Revoked!
                  </h3>
                  <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">
                    You have exceeded the maximum allowed limit of 3 tab switches. In accordance with academic integrity policies, your assessment session has been terminated and your access has been permanently revoked.
                  </p>
                  <div className="p-3 bg-red-50 dark:bg-red-950/50 rounded-xl border border-red-300 dark:border-red-800 text-[11px] text-red-800 dark:text-red-300 text-left space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>Disqualification Notice:</span>
                    </div>
                    <p className="text-[10px] leading-relaxed">
                      You can no longer access or submit this assignment because you did not finish it legally without unauthorized tab switches. This violation has been documented in your academic profile.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate(-1)}
                  className="w-full py-3 bg-[#0B1F3A] hover:bg-[#152F4A] text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Course</span>
                </button>
              </>
            )}

          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-[#102A43] p-6 rounded-2xl border border-slate-200/90 dark:border-[#1E3A56] space-y-4 shadow-xs">
        <button onClick={() => navigate(-1)} className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#087F78] dark:hover:text-[#14B8A6] flex items-center gap-1 font-semibold">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Course
        </button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-[#1E3A56] pb-4">
          <div>
            <h1 className="text-xl font-extrabold text-[#0B1F3A] dark:text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-[#087F78] dark:text-[#14B8A6]" /> {assignment.title}
            </h1>
            <p className="text-xs text-slate-500 dark:text-[#A9BACB] mt-1">
              Course Final Assessment • 80% passing grade required to unlock official certificate.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-3 py-1 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-400 font-bold font-mono">
              Passing: 80%+ Required
            </span>
            <span className="px-3 py-1 bg-teal-50 dark:bg-[#087F78]/30 rounded-xl border border-teal-200 dark:border-teal-700/50 text-xs text-[#087F78] dark:text-[#14B8A6] font-bold font-mono">
              Attempt: {attemptsCount} of 3
            </span>
          </div>
        </div>

        {/* Course Re-Certification Notice */}
        {hasActiveRecertification && (
          <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-3 shadow-xs">
            <Award className="w-5 h-5 text-indigo-600 shrink-0" />
            <div>
              <span className="font-extrabold text-indigo-800 dark:text-indigo-300 block">
                Course Re-Certification Active
              </span>
              <p className="text-slate-600 dark:text-slate-300 mt-0.5">
                Previous attempts and anti-cheating lockouts have been reset so you can submit your coursework legitimately for re-certification.
              </p>
            </div>
          </div>
        )}

        {/* Anti-Cheating Active Notification Banner */}
        <div className={`flex items-center justify-between p-3 rounded-xl text-xs ${
          isCheatingLocked || tabSwitchWarnings >= 3
            ? 'bg-red-100 dark:bg-red-950/60 border border-red-300 dark:border-red-800 text-red-700 dark:text-red-400 font-bold'
            : tabSwitchWarnings === 2
            ? 'bg-amber-100 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300 font-bold'
            : 'bg-[#E6F7F5] dark:bg-[#0B223D] border border-[#087F78]/20 dark:border-[#1E3A56] text-[#087F78] dark:text-[#14B8A6] font-bold'
        }`}>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              {isCheatingLocked || tabSwitchWarnings >= 3
                ? 'Anti-Cheating Proctor: ACCESS PERMANENTLY REVOKED'
                : tabSwitchWarnings === 2
                ? 'Anti-Cheating Proctor: FINAL WARNING (1 REMAINING)'
                : 'Anti-Cheating Proctor Active'}
            </span>
          </div>
          <span className="text-[11px] font-mono">
            Tab switches: {Math.min(3, tabSwitchWarnings)}/3
          </span>
        </div>

        <div
          onCopy={(e) => e.preventDefault()}
          onContextMenu={(e) => e.preventDefault()}
          className="p-4 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-2 select-none"
        >
          <span className="font-bold text-[#0B1F3A] dark:text-white block uppercase tracking-wider text-[10px]">Instructions</span>
          <p className="whitespace-pre-wrap leading-relaxed">{assignment.instructions}</p>
        </div>
      </div>

      {/* Workflow Status Banners */}
      {submission && (
        <div className="space-y-4">
          {submission.status === 'PASSED' && (
            <div className="p-6 rounded-2xl bg-teal-50 dark:bg-[#087F78]/20 border border-teal-200 dark:border-teal-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#087F78] dark:text-[#14B8A6] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" /> Passed & Approved (≥ 80%)
                </span>
                <span className="text-sm font-extrabold text-[#0B1F3A] dark:text-white">
                  {submission.score !== undefined && submission.score !== null
                    ? `Score: ${submission.score} / ${assignment.maxScore}`
                    : 'Approved'}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                🎉 Congratulations! Your submission meets all course requirements and your Official Verified Certificate is ready.
              </p>
              <button
                onClick={() => navigate('/student/certificates')}
                className="mt-2 px-5 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white text-xs font-bold rounded-xl shadow-xs transition inline-flex items-center gap-2"
              >
                <Award className="w-4 h-4" />
                <span>View & Download My Certificate</span>
              </button>
            </div>
          )}

          {submission.status === 'NEEDS_REVISION' && (
            <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-[#EF4444] uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4" /> Revision Requested
                </span>
                <span className="text-xs font-mono font-bold text-[#0B1F3A] dark:text-white">
                  Attempt #{submission.submissionAttempts || 1} of 3
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Your instructor reviewed this assignment and requested updates. Score must reach 80% or above to qualify for certification.
              </p>
              {submission.feedback && (
                <div className="p-3.5 rounded-xl bg-white dark:bg-[#102A43] text-xs text-slate-600 dark:text-slate-300 border border-red-200 dark:border-red-800">
                  <strong className="text-[#EF4444] block mb-1 text-[11px] uppercase tracking-wider font-bold">
                    Instructor Feedback:
                  </strong>
                  <p className="leading-relaxed whitespace-pre-wrap">{submission.feedback}</p>
                </div>
              )}
            </div>
          )}

          {(submission.status === 'SUBMITTED' || submission.status === 'UNDER_REVIEW') && (
            <div className="p-6 rounded-2xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
                  <Clock className="w-4 h-4" /> Submitted & Under Review (Attempt {attemptsCount} of 3)
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                  Submitted on {new Date(submission.submittedAt).toLocaleDateString()}
                </span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300">
                Your work has been submitted to the instructor for evaluation. You will receive a notification once grading is complete.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Integrity Disqualification Screen vs Max Attempts vs Submission Form */}
      {isCheatingLocked || tabSwitchWarnings >= 3 ? (
        <div className="p-8 rounded-3xl bg-red-50/90 dark:bg-red-950/40 border-2 border-red-300 dark:border-red-800 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 mx-auto flex items-center justify-center shadow-inner">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider px-3 py-1 rounded-full bg-red-200/70 dark:bg-red-900/80 text-red-800 dark:text-red-300">
              Academic Integrity Disqualification
            </span>
            <h3 className="text-lg font-black text-[#0B1F3A] dark:text-white pt-2">
              Assignment Locked: 3 Tab Switch Violations Recorded
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
            You have been permanently locked out of this assignment for repeatedly switching browser tabs (3/3 violations). In order to maintain official certification integrity, you cannot receive credit unless this assessment is completed legally under proctoring rules.
          </p>
          <div className="max-w-md mx-auto p-3.5 rounded-xl bg-white dark:bg-[#102A43] border border-red-200 dark:border-red-900 text-[11px] text-slate-600 dark:text-slate-300 text-left space-y-1">
            <strong className="text-red-600 dark:text-red-400 block font-bold text-[10px] uppercase tracking-wider">
              Legal Completion Policy:
            </strong>
            <p className="leading-relaxed">
              Your access to this assignment has been revoked. If you believe this occurred due to an unexpected technical malfunction, please contact your instructor to review session logs and request an attempt reset.
            </p>
          </div>
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-2.5 bg-[#0B1F3A] hover:bg-[#152F4A] dark:bg-[#1E3A56] dark:hover:bg-[#284B6E] text-white font-bold text-xs rounded-xl shadow-xs transition inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Course</span>
          </button>
        </div>
      ) : isMaxAttemptsExhausted ? (
        <div className="p-6 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/50 text-[#EF4444] mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-white">Maximum Attempts (3/3) Reached</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            You have used all 3 allowed attempts for this course assignment without achieving the 80% passing score. Please reach out to your course instructor to request an attempt reset.
          </p>
        </div>
      ) : (
        /* Submission Form */
        <form onSubmit={handleSubmit} className="p-6 rounded-2xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] space-y-5 shadow-xs">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-white uppercase tracking-wider">
              {submission ? 'Update / Resubmit Your Work' : 'Your Work Submission'}
            </h3>
            <span className="text-[11px] text-slate-400 dark:text-slate-500 font-mono">
              Attempt {attemptsCount + 1 > 3 ? 3 : attemptsCount + 1} of 3
            </span>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Written Explanation / Technical Solution</label>
            <textarea
              rows={5}
              placeholder="Describe your technical solution, architecture blueprint, or repository details..."
              value={submissionText}
              onChange={(e) => setSubmissionText(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-[#0B223D] focus:outline-none focus:border-[#087F78] transition-colors"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">Artifact / Project File URL (GitHub / PDF / Storage)</label>
            <input
              type="url"
              placeholder="https://github.com/your-username/your-repo-artifact"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              className="w-full bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:bg-white dark:focus:bg-[#0B223D] focus:outline-none focus:border-[#087F78] transition-colors"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-2"
            >
              <Upload className="w-4 h-4" /> {submitting ? 'Submitting Work...' : submission ? 'Resubmit Assignment (Attempt ' + (attemptsCount + 1) + '/3)' : 'Submit Assignment (Attempt 1/3)'}
            </button>
          </div>
        </form>
      )}

    </div>
  );
};
