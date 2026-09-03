import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { Quiz } from '../types';
import { HelpCircle, Clock, CheckCircle2, XCircle, ArrowLeft, ShieldAlert, Lock, Award, AlertTriangle } from 'lucide-react';

export const QuizPlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [resultModal, setResultModal] = useState<any>(null);

  // Anti-cheating & Tab Switching State
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState<number>(0);
  const [showCheatingWarningModal, setShowCheatingWarningModal] = useState<boolean>(false);
  const [isCheatingLocked, setIsCheatingLocked] = useState<boolean>(false);
  const isWindowAwayRef = useRef<boolean>(false);
  const lastBlurTimeRef = useRef<number>(0);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const res = await api.get(`/quizzes/${id}`);
        if (res.data.success) {
          setQuiz(res.data.quiz);

          const serverLocked = res.data.quiz?.isCheatingLocked === true;
          const isUnlocked = res.data.quiz?.isCheatingLocked === false || !!res.data.quiz?.hasActiveRecertification || res.data.quiz?.isUnlocked === true;

          const localLocked = localStorage.getItem(`cheating_locked_quiz_${id}`) === 'true';
          const localWarnings = parseInt(localStorage.getItem(`cheating_warnings_quiz_${id}`) || '0', 10);

          if (isUnlocked) {
            // Instructor/Admin reset attempts or re-certification unlocked the quiz!
            setIsCheatingLocked(false);
            setTabSwitchWarnings(0);
            localStorage.removeItem(`cheating_locked_quiz_${id}`);
            localStorage.removeItem(`cheating_warnings_quiz_${id}`);
          } else if (serverLocked) {
            setIsCheatingLocked(true);
            setTabSwitchWarnings(3);
            localStorage.setItem(`cheating_locked_quiz_${id}`, 'true');
            localStorage.setItem(`cheating_warnings_quiz_${id}`, '3');
          } else if (localLocked || localWarnings >= 3) {
            setIsCheatingLocked(true);
            setTabSwitchWarnings(3);
          } else if (localWarnings > 0) {
            setTabSwitchWarnings(localWarnings);
          }
        }
      } catch (err: any) {
        alert(err.response?.data?.message || 'Quiz error.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuiz();
  }, [id]);

  const handleViolation = () => {
    if (isCheatingLocked || (quiz as any)?.hasPassed || resultModal) return;

    setTabSwitchWarnings((prev) => {
      const next = Math.min(3, prev + 1);
      localStorage.setItem(`cheating_warnings_quiz_${id}`, next.toString());
      setShowCheatingWarningModal(true);

      if (next >= 3) {
        setIsCheatingLocked(true);
        localStorage.setItem(`cheating_locked_quiz_${id}`, 'true');
        api.post(`/quizzes/${id}/disqualify`).catch((err) => {
          console.error('Failed to report quiz cheating disqualification:', err);
        });
      }
      return next;
    });
  };

  // Anti-cheating: Tab Switching & Focus Loss Monitoring
  useEffect(() => {
    if (loading || isCheatingLocked || (quiz as any)?.hasPassed || resultModal) {
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
  }, [loading, isCheatingLocked, quiz, resultModal, id]);

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (isCheatingLocked || tabSwitchWarnings >= 3) return;
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmitQuiz = async () => {
    if (!quiz) return;
    if (isCheatingLocked || tabSwitchWarnings >= 3) {
      alert('Access revoked: You cannot submit this assessment due to academic integrity violations.');
      return;
    }
    setSubmitting(true);

    const payload = {
      answers: Object.entries(answers).map(([questionId, selectedOptionId]) => ({
        questionId,
        selectedOptionId,
      })),
    };

    try {
      const res = await api.post(`/quizzes/${quiz.id}/attempt`, payload);
      if (res.data.success) {
        setResultModal(res.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || !quiz) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white transition-colors">
        <div className="w-8 h-8 border-4 border-[#087F78] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const userAttemptsCount = (quiz as any).userAttemptsCount || 0;
  const maxAttempts = quiz.maxAttempts || 3;
  const isMaxAttemptsReached = userAttemptsCount >= maxAttempts && !(quiz as any).hasPassed;

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
                    All tab switches and window departures are recorded with timestamps. Complete your assessment legally to receive course credit.
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
                      If you switch tabs, leave this window, or lose focus <strong>ONE MORE TIME (3rd violation)</strong>, your assessment will be <strong>IMMEDIATELY TERMINATED</strong>. You will permanently lose access to this quiz and will not be able to get credit or pass unless completed legally.
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
                      You can no longer access or submit this quiz because you did not finish it legally without unauthorized tab switches. This violation has been documented in your academic profile.
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

      {/* Quiz Top Header */}
      <div className="bg-white dark:bg-[#102A43] p-6 rounded-2xl border border-slate-200/90 dark:border-[#1E3A56] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xs">
        <div>
          <button onClick={() => navigate(-1)} className="text-xs text-slate-500 dark:text-slate-400 hover:text-[#087F78] dark:hover:text-[#14B8A6] flex items-center gap-1 mb-2 font-semibold">
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Course
          </button>
          <h1 className="text-xl font-extrabold text-[#0B1F3A] dark:text-white flex items-center gap-2">
            <HelpCircle className="w-5 h-5 text-[#087F78] dark:text-[#14B8A6]" /> {quiz.title}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{quiz.description || 'Knowledge assessment quiz • 80% passing grade required.'}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap text-xs font-bold text-slate-600 dark:text-slate-300">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 dark:bg-[#152F4A] rounded-xl border border-slate-200 dark:border-slate-700">
            <Clock className="w-4 h-4 text-amber-500" /> {quiz.timeLimitMinutes} mins limit
          </div>
          <div className="px-3 py-1.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 font-mono font-bold">
            Passing: 80%+ Required
          </div>
          <div className="px-3 py-1.5 bg-teal-50 dark:bg-[#087F78]/30 rounded-xl border border-teal-200 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] font-mono font-bold">
            Attempts: {userAttemptsCount} of {maxAttempts}
          </div>
        </div>
      </div>

      {/* Course Re-Certification Notice */}
      {(quiz as any)?.hasActiveRecertification && (
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-3 shadow-xs">
          <Award className="w-5 h-5 text-indigo-600 shrink-0" />
          <div>
            <span className="font-extrabold text-indigo-800 dark:text-indigo-300 block">
              Course Re-Certification Active
            </span>
            <p className="text-slate-600 dark:text-slate-300 mt-0.5">
              Previous attempts and anti-cheating lockouts have been reset so you can complete this quiz legitimately. Please remain on this tab throughout the assessment.
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
              : 'Anti-Cheating Proctor Active • Tab switching is monitored'}
          </span>
        </div>
        <span className="text-[11px] font-mono">
          Tab switches: {Math.min(3, tabSwitchWarnings)}/3
        </span>
      </div>

      {/* Integrity Disqualification Screen vs Max Attempts Lock vs Questions Stack */}
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
              Quiz Locked: 3 Tab Switch Violations Recorded
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-lg mx-auto leading-relaxed">
            You have been permanently locked out of this quiz for repeatedly switching browser tabs (3/3 violations). In order to maintain official certification integrity, you cannot receive credit unless completed legally.
          </p>
          <div className="max-w-md mx-auto p-3.5 rounded-xl bg-white dark:bg-[#102A43] border border-red-200 dark:border-red-900 text-[11px] text-slate-600 dark:text-slate-300 text-left space-y-1">
            <strong className="text-red-600 dark:text-red-400 block font-bold text-[10px] uppercase tracking-wider">
              Legal Completion Policy:
            </strong>
            <p className="leading-relaxed">
              Your access to this quiz has been revoked. If you experienced an unexpected technical malfunction, please contact your instructor to review session logs and request an attempt reset.
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
      ) : isMaxAttemptsReached ? (
        <div className="p-8 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-red-100 dark:bg-red-900/50 text-[#EF4444] mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white">Maximum Attempts ({maxAttempts}/{maxAttempts}) Reached</h3>
          <p className="text-xs text-slate-600 dark:text-slate-300 max-w-md mx-auto">
            You have used all {maxAttempts} allowed attempts for this assessment. Please contact your instructor to request an attempt reset.
          </p>
        </div>
      ) : (
        <>
          {/* Questions Stack */}
          <div
            onCopy={(e) => e.preventDefault()}
            onContextMenu={(e) => e.preventDefault()}
            className="space-y-6 select-none"
          >
            {quiz.questions?.map((q, idx) => (
              <div key={q.id} className="p-6 rounded-2xl bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] space-y-4 shadow-xs">
                <h3 className="text-sm font-bold text-[#0B1F3A] dark:text-white flex items-start gap-2">
                  <span className="text-[#087F78] dark:text-[#14B8A6] font-extrabold">Q{idx + 1}.</span>
                  <span>{q.questionText}</span>
                </h3>

                <div className="space-y-2.5 pt-1">
                  {q.options?.map((opt) => {
                    const isSelected = answers[q.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleSelectOption(q.id, opt.id)}
                        className={`w-full p-3.5 rounded-xl text-left text-xs flex items-center justify-between border transition ${
                          isSelected
                            ? 'bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] border-[#087F78] font-bold shadow-xs'
                            : 'bg-slate-50 dark:bg-[#152F4A] text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-[#087F78]/50'
                        }`}
                      >
                        <span>{opt.optionText}</span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-[#087F78] bg-[#087F78]' : 'border-slate-300 dark:border-slate-600'}`}>
                          {isSelected && <div className="w-1.5 h-1.5 bg-white dark:bg-[#102A43] rounded-full" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Submit Button */}
          <div className="pt-4 flex justify-end">
            <button
              onClick={handleSubmitQuiz}
              disabled={submitting || Object.keys(answers).length === 0}
              className="px-8 py-3 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs shadow-xs transition disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? 'Grading Assessment...' : 'Submit Assessment (Attempt ' + (userAttemptsCount + 1) + ' of ' + maxAttempts + ')'}
            </button>
          </div>
        </>
      )}

      {/* Results Modal */}
      {resultModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl p-8 max-w-xl w-full space-y-6 shadow-2xl overflow-y-auto max-h-[90vh] text-[#0B1F3A] dark:text-white">
            
            <div className="text-center space-y-3">
              {resultModal.passed ? (
                <div className="w-16 h-16 rounded-full bg-teal-50 dark:bg-[#087F78]/30 text-[#087F78] dark:text-[#14B8A6] border border-teal-200 dark:border-teal-700/50 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-red-50 dark:bg-red-950/40 text-[#EF4444] border border-red-200 dark:border-red-800 flex items-center justify-center mx-auto">
                  <XCircle className="w-10 h-10" />
                </div>
              )}

              <h2 className="text-2xl font-extrabold text-[#0B1F3A] dark:text-white">
                {resultModal.passed ? '🎉 Assessment Passed!' : 'Assessment Attempt Failed'}
              </h2>

              <div className="inline-block px-4 py-1.5 rounded-full text-xs font-bold bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                Score: <span className="text-[#087F78] dark:text-[#14B8A6] font-extrabold">{resultModal.percentage}%</span> (Passing: {resultModal.passingScore || 80}%)
              </div>

              {resultModal.passed && (
                <p className="text-xs text-teal-600 dark:text-teal-400 font-semibold">
                  You scored 80% or above! Your official course certificate is now unlocked and available for download.
                </p>
              )}
            </div>

            {/* Answer Explanations Review */}
            <div className="space-y-4 max-h-60 overflow-y-auto border-t border-slate-100 dark:border-[#1E3A56] pt-4">
              <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Answer Rationale Feedback</h4>
              {resultModal.results?.map((r: any, idx: number) => (
                <div key={idx} className={`p-3 rounded-xl text-xs space-y-1 ${r.isCorrect ? 'bg-teal-50 dark:bg-[#087F78]/20 border border-teal-200 dark:border-teal-800 text-[#087F78] dark:text-[#14B8A6]' : 'bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-[#EF4444]'}`}>
                  <div className="font-bold text-[#0B1F3A] dark:text-white">{r.questionText}</div>
                  <div className="text-slate-500 dark:text-slate-400">Selected: {r.selectedOptionText}</div>
                  {!r.isCorrect && <div className="text-[#087F78] dark:text-[#14B8A6] font-bold">Correct Answer: {r.correctOptionText}</div>}
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 italic pt-1">{r.explanation}</div>
                </div>
              ))}
            </div>

            <div className="flex flex-col gap-2.5">
              {resultModal.passed && (
                <button
                  onClick={() => navigate('/student/certificates')}
                  className="w-full py-3 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs transition shadow-xs flex items-center justify-center gap-2"
                >
                  <Award className="w-4 h-4" />
                  <span>View & Download My Certificate</span>
                </button>
              )}
              <button
                onClick={() => navigate(-1)}
                className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#0B223D] hover:bg-slate-200 dark:hover:bg-[#1E3A56] text-slate-700 dark:text-slate-200 font-bold text-xs transition"
              >
                Close & Return to Course
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
