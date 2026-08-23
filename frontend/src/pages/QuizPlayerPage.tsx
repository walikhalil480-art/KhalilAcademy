import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../services/api';
import {
  HelpCircle,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  Award,
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  Flag,
  ChevronLeft,
  ChevronRight,
  Send,
  RotateCcw,
  BookOpen,
  Lock,
  Sparkles,
  Info,
  Maximize2,
  FileCheck,
  Check,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface QuizOption {
  id: string;
  optionText: string;
}

interface QuizQuestion {
  id: string;
  questionText: string;
  points: number;
  order: number;
  options: QuizOption[];
}

interface QuizAttempt {
  id: string;
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  completedAt: string;
}

interface QuizData {
  id: string;
  title: string;
  description?: string;
  passingScore: number;
  timeLimitMinutes: number;
  maxAttempts: number;
  isRequired: boolean;
  isFinalAssessment: boolean;
  courseId: string;
  questions: QuizQuestion[];
  userAttemptsCount: number;
  remainingAttempts: number;
  hasPassed: boolean;
  attempts: QuizAttempt[];
  allLessonsCompleted?: boolean;
  totalLessonsCount?: number;
  completedLessonsCount?: number;
}

export const QuizPlayerPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Exam Workflow State: 'intro' | 'active' | 'results'
  const [examState, setExamState] = useState<'intro' | 'active' | 'results'>('intro');

  // Exam Active State
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [resultData, setResultData] = useState<any>(null);

  // Timer State (40 minutes = 2400 seconds)
  const [secondsRemaining, setSecondsRemaining] = useState<number>(2400);

  // Anti-Cheat Violation Monitoring State
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState(0);
  const [showSecurityAlert, setShowSecurityAlert] = useState(false);
  const [securityAlertMessage, setSecurityAlertMessage] = useState('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchQuiz();
  }, [id]);

  const fetchQuiz = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/quizzes/${id}`);
      if (res.data.success) {
        const q: QuizData = res.data.quiz;
        setQuiz(q);
        setSecondsRemaining(q.timeLimitMinutes * 60);

        // If user already completed attempts and has not started a new session, show results if passed
        if (q.hasPassed && q.attempts && q.attempts.length > 0 && examState === 'intro') {
          // Keep on intro so they can view details or retake if attempts remain
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load assessment.');
    } finally {
      setLoading(false);
    }
  };

  // Anti-Cheat: Visibility Change & Window Blur Detector
  useEffect(() => {
    if (examState !== 'active') return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        handleSecurityViolation('Tab switch detected! Leaving the assessment tab is strictly monitored.');
      }
    };

    const handleWindowBlur = () => {
      handleSecurityViolation('Window focus lost! Please stay on the examination screen.');
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent Ctrl+C, Ctrl+V, Ctrl+U, F12, PrintScreen
      if (
        (e.ctrlKey && (e.key === 'c' || e.key === 'v' || e.key === 'u' || e.key === 'a')) ||
        e.key === 'F12' ||
        e.key === 'PrintScreen'
      ) {
        e.preventDefault();
        handleSecurityViolation('Keyboard shortcuts and copy/paste actions are disabled in lockdown mode.');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [examState]);

  const handleSecurityViolation = (msg: string) => {
    setTabSwitchWarnings((prev) => {
      const nextCount = prev + 1;
      setSecurityAlertMessage(`${msg} (Violation Warning ${nextCount}/3)`);
      setShowSecurityAlert(true);
      return nextCount;
    });
  };

  // Timer Countdown Ticker
  useEffect(() => {
    if (examState === 'active' && secondsRemaining > 0) {
      timerRef.current = setInterval(() => {
        setSecondsRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleAutoSubmitOnTimeExpiry();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [examState, secondsRemaining]);

  const handleStartExam = () => {
    if (!quiz) return;
    if (quiz.remainingAttempts <= 0 && !quiz.hasPassed) {
      alert('You have exhausted all allowed attempts for this assessment.');
      return;
    }
    setAnswers({});
    setFlaggedQuestions({});
    setCurrentQuestionIndex(0);
    setTabSwitchWarnings(0);
    setShowSecurityAlert(false);
    setSecondsRemaining(quiz.timeLimitMinutes * 60);
    setExamState('active');

    // Request fullscreen if supported
    try {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (e) {}
  };

  const handleSelectOption = (questionId: string, optionId: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleToggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => ({ ...prev, [questionId]: !prev[questionId] }));
  };

  const handleAutoSubmitOnTimeExpiry = () => {
    alert('⏱️ Time limit has expired! Your answers are being submitted automatically.');
    handleSubmitExam();
  };

  const handleSubmitExam = async () => {
    if (!quiz) return;
    if (timerRef.current) clearInterval(timerRef.current);

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
        setResultData(res.data);
        setExamState('results');
        if (res.data.percentage >= quiz.passingScore || res.data.passed) {
          confetti({
            particleCount: 150,
            spread: 100,
            origin: { y: 0.6 },
            colors: ['#4FD1C5', '#10B981', '#38BDF8', '#F59E0B'],
          });
        }
        await fetchQuiz();
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to submit assessment.');
    } finally {
      setSubmitting(false);
    }
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading || !quiz) {
    return (
      <div className="min-h-screen bg-[#071326] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#4FD1C5] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#94A3B8]">Loading assessment environment...</span>
        </div>
      </div>
    );
  }

  // Enforce Course Lesson Prerequisite Lock
  if (quiz.isFinalAssessment && quiz.allLessonsCompleted === false) {
    const comp = quiz.completedLessonsCount || 0;
    const tot = quiz.totalLessonsCount || 0;
    const pct = tot > 0 ? Math.round((comp / tot) * 100) : 0;

    return (
      <div className="min-h-screen bg-[#071326] text-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <div className="max-w-md w-full bg-[#0D1E36] border border-[#23426A] rounded-3xl p-8 text-center space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-[#EF4444]/15 border border-[#EF4444]/30 text-[#EF4444] mx-auto flex items-center justify-center">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full text-[10px] font-extrabold uppercase bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30">
              Prerequisite Required
            </span>
            <h2 className="text-xl font-black text-white">Assessment Locked</h2>
            <p className="text-xs text-[#CBD5E1] leading-relaxed">
              You must complete all lessons in this course before you can take the final certification assessment.
            </p>
          </div>
          <div className="p-4 rounded-2xl bg-[#071326] border border-[#23426A] space-y-2 text-left">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-[#94A3B8]">Course Lessons Completed</span>
              <span className="text-[#4FD1C5]">{comp} / {tot} ({pct}%)</span>
            </div>
            <div className="w-full bg-[#0D1E36] h-2 rounded-full overflow-hidden border border-[#23426A]">
              <div className="bg-[#4FD1C5] h-full rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="w-full py-3.5 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] font-black text-xs rounded-xl shadow-lg shadow-[#4FD1C5]/20 transition flex items-center justify-center gap-2 uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Course & Complete Lessons</span>
          </button>
        </div>
      </div>
    );
  }

  const questions = quiz.questions || [];
  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / Math.max(1, questions.length)) * 100);

  // -------------------------------------------------------------
  // 1. INTRO / PRE-EXAM LAUNCHPAD
  // -------------------------------------------------------------
  if (examState === 'intro') {
    const latestAttempt = quiz.attempts && quiz.attempts.length > 0 ? quiz.attempts[0] : null;

    return (
      <div className="min-h-screen bg-[#071326] text-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
          
          {/* Header Bar */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="inline-flex items-center gap-2 text-xs font-bold text-[#94A3B8] hover:text-[#4FD1C5] transition px-3 py-1.5 rounded-xl bg-[#0D1E36] border border-[#23426A]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Course</span>
            </button>
            <span className="px-3 py-1 rounded-full bg-[#1A365D] border border-[#4FD1C5]/40 text-[#4FD1C5] text-xs font-extrabold uppercase tracking-wider">
              {quiz.isFinalAssessment ? 'Official Certification Exam' : 'Course Assessment'}
            </span>
          </div>

          {/* Assessment Title Banner */}
          <div className="bg-[#0D1E36] border border-[#23426A] rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-bold text-[#38BDF8] bg-[#0369A1]/20 px-3 py-1 rounded-full border border-[#0284C7]/30 mb-3">
                <Sparkles className="w-3.5 h-3.5 text-[#38BDF8]" />
                Final Course Completion Milestone
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
                {quiz.title}
              </h1>
              <p className="text-xs sm:text-sm text-[#CBD5E1] mt-2.5 leading-relaxed">
                {quiz.description ||
                  'This assessment verifies your mastery of the curriculum. Achieving a minimum grade of 80% is mandatory to unlock and issue your official Khalil Academy verified certificate.'}
              </p>
            </div>

            {/* Assessment Key Parameters Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-[#071326] border border-[#23426A]">
                <span className="text-[10px] text-[#94A3B8] uppercase font-extrabold block">Time Limit</span>
                <span className="text-base font-extrabold text-white mt-1 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-[#F59E0B]" />
                  {quiz.timeLimitMinutes} Mins
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#071326] border border-[#23426A]">
                <span className="text-[10px] text-[#94A3B8] uppercase font-extrabold block">Passing Grade</span>
                <span className="text-base font-extrabold text-[#10B981] mt-1 flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-[#10B981]" />
                  {quiz.passingScore}% Min
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#071326] border border-[#23426A]">
                <span className="text-[10px] text-[#94A3B8] uppercase font-extrabold block">Total Questions</span>
                <span className="text-base font-extrabold text-white mt-1 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-[#4FD1C5]" />
                  {questions.length} Questions
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-[#071326] border border-[#23426A]">
                <span className="text-[10px] text-[#94A3B8] uppercase font-extrabold block">Attempts Allowed</span>
                <span className="text-base font-extrabold text-white mt-1 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-[#38BDF8]" />
                  {quiz.userAttemptsCount} / {quiz.maxAttempts} Used
                </span>
              </div>
            </div>

            {/* Previous Attempt Summary if Available */}
            {latestAttempt && (
              <div className={`p-5 rounded-2xl border ${
                latestAttempt.passed
                  ? 'bg-[#064E3B]/40 border-[#10B981]/50 text-[#A7F3D0]'
                  : 'bg-[#7F1D1D]/30 border-[#EF4444]/50 text-[#FECACA]'
              } space-y-2`}>
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="flex items-center gap-2">
                    {latestAttempt.passed ? <CheckCircle2 className="w-4 h-4 text-[#10B981]" /> : <XCircle className="w-4 h-4 text-[#EF4444]" />}
                    Previous Attempt: {latestAttempt.percentage}% ({latestAttempt.passed ? 'PASSED' : 'DID NOT PASS'})
                  </span>
                  <span>{new Date(latestAttempt.completedAt).toLocaleDateString()}</span>
                </div>
                {latestAttempt.passed ? (
                  <p className="text-xs text-[#A7F3D0]">
                    ✓ You have successfully passed this assessment! Your certificate requirement is complete.
                  </p>
                ) : (
                  <p className="text-xs text-[#FECACA]">
                    You need at least 80% to earn your certificate. You have {quiz.remainingAttempts} attempt(s) remaining.
                  </p>
                )}
              </div>
            )}

            {/* Anti-Cheating Lockdown Rules Banner */}
            <div className="p-5 rounded-2xl bg-[#071326] border border-[#23426A] space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-[#F59E0B]">
                <ShieldAlert className="w-4 h-4 text-[#F59E0B]" />
                <span>Anti-Cheating & Exam Security Policy</span>
              </div>
              <ul className="text-xs text-[#94A3B8] space-y-1.5 pl-5 list-disc">
                <li><strong>No Tab Switching:</strong> Switching browser tabs or minimizing the examination window triggers security violations.</li>
                <li><strong>Copy & Paste Disabled:</strong> Right-clicking, copying questions, and external tool shortcuts are locked during the exam.</li>
                <li><strong>Strict 40-Minute Countdown:</strong> Answers are automatically recorded and submitted when the clock reaches 00:00.</li>
                <li><strong>Maximum 3 Attempts:</strong> If you do not reach 80% within 3 attempts, you must review the course materials.</li>
              </ul>
            </div>

            {/* Launch CTA Button */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-[#94A3B8]">
                {quiz.remainingAttempts > 0 ? (
                  <span>Ready? Click below to enter full-screen lockdown examination.</span>
                ) : quiz.hasPassed ? (
                  <span className="text-[#10B981] font-bold">Assessment Complete. Certificate Unlocked!</span>
                ) : (
                  <span className="text-[#EF4444] font-bold">Maximum attempts reached (3/3).</span>
                )}
              </div>

              {quiz.hasPassed ? (
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  {quiz.remainingAttempts > 0 && (
                    <button
                      type="button"
                      onClick={handleStartExam}
                      className="px-5 py-3 rounded-2xl bg-[#1E293B] hover:bg-[#334155] text-white font-bold text-xs transition"
                    >
                      Retake for Better Score
                    </button>
                  )}
                  <Link
                    to="/student/certificates"
                    className="flex-1 sm:flex-none px-6 py-3.5 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-extrabold text-xs transition shadow-lg shadow-[#10B981]/25 flex items-center justify-center gap-2"
                  >
                    <Award className="w-4 h-4" />
                    <span>View Your Certificate →</span>
                  </Link>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleStartExam}
                  disabled={quiz.remainingAttempts <= 0}
                  className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] hover:from-[#0369A1] hover:to-[#0284C7] text-white font-extrabold text-sm transition shadow-xl shadow-[#0284C7]/25 flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <Lock className="w-4 h-4" />
                  <span>Start 40-Minute Assessment (Attempt {quiz.userAttemptsCount + 1} of {quiz.maxAttempts})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. ACTIVE EXAM VIEWPORT (LOCKDOWN & ANTI-CHEAT MODE)
  // -------------------------------------------------------------
  if (examState === 'active') {
    const isUnder5Mins = secondsRemaining < 300;
    const isUnder10Mins = secondsRemaining < 600;

    return (
      <div
        className="min-h-screen bg-[#071326] text-[#F8FAFC] flex flex-col font-sans select-none"
        onContextMenu={(e) => e.preventDefault()}
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onPaste={(e) => e.preventDefault()}
      >
        {/* Top Lockdown Header */}
        <header className="sticky top-0 z-40 bg-[#0A192F] border-b border-[#23426A] py-3 px-4 sm:px-6 lg:px-8 shadow-xl">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            
            {/* Title & Question Indicator */}
            <div className="flex items-center gap-3">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
              <div>
                <h2 className="text-xs sm:text-sm font-extrabold text-white truncate max-w-xs sm:max-w-md">
                  {quiz.title}
                </h2>
                <div className="text-[10px] text-[#94A3B8]">
                  Question {currentQuestionIndex + 1} of {questions.length} • {answeredCount} Answered ({progressPercent}%)
                </div>
              </div>
            </div>

            {/* Countdown Clock */}
            <div className="flex items-center gap-3">
              <div
                className={`px-4 py-2 rounded-2xl border flex items-center gap-2 font-mono font-extrabold text-sm transition-all shadow-md ${
                  isUnder5Mins
                    ? 'bg-[#EF4444]/20 border-[#EF4444] text-[#F87171] animate-pulse'
                    : isUnder10Mins
                    ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#FDE68A]'
                    : 'bg-[#0D1E36] border-[#23426A] text-[#4FD1C5]'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>{formatTime(secondsRemaining)}</span>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmitExam}
                disabled={submitting}
                className="px-4 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs transition shadow-md shadow-[#10B981]/20 flex items-center gap-1.5"
              >
                <FileCheck className="w-4 h-4" />
                <span className="hidden sm:inline">{submitting ? 'Grading...' : 'Submit Exam'}</span>
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-[#071326] h-1.5 mt-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#4FD1C5] to-[#10B981] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </header>

        {/* Security Violation Alert Banner */}
        {showSecurityAlert && (
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-3">
            <div className="p-3.5 rounded-2xl bg-[#7F1D1D] border border-[#EF4444] text-[#FECACA] flex items-center justify-between text-xs font-bold animate-shake shadow-lg">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#EF4444] shrink-0" />
                <span>{securityAlertMessage}</span>
              </div>
              <button onClick={() => setShowSecurityAlert(false)} className="text-[#FECACA] hover:text-white">✕</button>
            </div>
          </div>
        )}

        {/* Main Examination Layout */}
        <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Center Column: Question Card */}
          <div className="lg:col-span-8 space-y-4">
            {currentQuestion && (
              <div className="bg-[#0D1E36] border border-[#23426A] rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
                
                {/* Question Header Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-[#23426A]">
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1 rounded-xl bg-[#1A365D] text-[#4FD1C5] text-xs font-extrabold">
                      Question {currentQuestionIndex + 1}
                    </span>
                    <span className="text-[11px] text-[#94A3B8] font-bold">({currentQuestion.points} Point)</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleToggleFlag(currentQuestion.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition ${
                      flaggedQuestions[currentQuestion.id]
                        ? 'bg-[#F59E0B]/20 border-[#F59E0B] text-[#FDE68A]'
                        : 'bg-[#071326] border-[#23426A] text-[#94A3B8] hover:text-white'
                    }`}
                  >
                    <Flag className="w-3.5 h-3.5" />
                    <span>{flaggedQuestions[currentQuestion.id] ? 'Flagged for Review' : 'Flag Question'}</span>
                  </button>
                </div>

                {/* Question Text */}
                <div className="text-base sm:text-lg font-bold text-white leading-relaxed">
                  {currentQuestion.questionText}
                </div>

                {/* Multiple Choice Options List */}
                <div className="space-y-3 pt-2">
                  {currentQuestion.options?.map((option, oIdx) => {
                    const isSelected = answers[currentQuestion.id] === option.id;
                    const optionLetter = String.fromCharCode(65 + oIdx);

                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => handleSelectOption(currentQuestion.id, option.id)}
                        className={`w-full p-4 rounded-2xl border text-left text-xs sm:text-sm font-medium transition-all flex items-center gap-3.5 ${
                          isSelected
                            ? 'bg-[#1A365D] border-[#4FD1C5] text-white shadow-lg shadow-[#4FD1C5]/10 scale-[1.01]'
                            : 'bg-[#071326] border-[#23426A] text-[#CBD5E1] hover:border-[#38BDF8] hover:bg-[#0E1D33]'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-xl font-bold text-xs flex items-center justify-center shrink-0 transition ${
                            isSelected
                              ? 'bg-[#4FD1C5] text-[#0A1322]'
                              : 'bg-[#0D1E36] border border-[#23426A] text-[#94A3B8]'
                          }`}
                        >
                          {isSelected ? <Check className="w-4 h-4 stroke-[3]" /> : optionLetter}
                        </div>
                        <span className="flex-1 leading-relaxed">{option.optionText}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Question Navigation Controls */}
                <div className="flex items-center justify-between pt-6 border-t border-[#23426A]">
                  <button
                    type="button"
                    onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentQuestionIndex === 0}
                    className="px-4 py-2.5 rounded-xl bg-[#071326] border border-[#23426A] text-white text-xs font-bold hover:bg-[#1A365D] disabled:opacity-30 transition flex items-center gap-1.5"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  <div className="text-xs text-[#94A3B8] font-bold">
                    {currentQuestionIndex + 1} / {questions.length}
                  </div>

                  {currentQuestionIndex < questions.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setCurrentQuestionIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                      className="px-5 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-[#0284C7]/20"
                    >
                      <span>Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSubmitExam}
                      disabled={submitting}
                      className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white text-xs font-extrabold transition flex items-center gap-1.5 shadow-lg shadow-[#10B981]/25"
                    >
                      <FileCheck className="w-4 h-4" />
                      <span>{submitting ? 'Submitting...' : 'Complete & Grade'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: 15-Question Navigator Matrix */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-[#0D1E36] border border-[#23426A] rounded-3xl p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between text-xs pb-3 border-b border-[#23426A]">
                <span className="font-extrabold text-white">Questions Matrix</span>
                <span className="text-[#4FD1C5] font-bold">{answeredCount} / {questions.length} Done</span>
              </div>

              {/* 15 Question Buttons Grid */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isAnswered = !!answers[q.id];
                  const isFlagged = !!flaggedQuestions[q.id];
                  const isCurrent = idx === currentQuestionIndex;

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentQuestionIndex(idx)}
                      className={`h-11 rounded-xl text-xs font-extrabold relative transition-all flex items-center justify-center ${
                        isCurrent
                          ? 'ring-2 ring-[#38BDF8] ring-offset-2 ring-offset-[#0D1E36] scale-105'
                          : ''
                      } ${
                        isAnswered
                          ? 'bg-[#10B981]/20 border border-[#10B981] text-[#A7F3D0]'
                          : isFlagged
                          ? 'bg-[#F59E0B]/20 border border-[#F59E0B] text-[#FDE68A]'
                          : 'bg-[#071326] border border-[#23426A] text-[#94A3B8] hover:text-white'
                      }`}
                    >
                      <span>{idx + 1}</span>
                      {isFlagged && (
                        <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#F59E0B]" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Matrix Legend */}
              <div className="pt-3 border-t border-[#23426A] grid grid-cols-3 gap-2 text-[10px] text-[#94A3B8]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-[#10B981]" />
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-[#F59E0B]" />
                  <span>Flagged</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded bg-[#23426A]" />
                  <span>Unanswered</span>
                </div>
              </div>

              {/* Quick Submit Block */}
              <div className="pt-3 border-t border-[#23426A]">
                <button
                  type="button"
                  onClick={handleSubmitExam}
                  disabled={submitting}
                  className="w-full py-3 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-extrabold text-xs transition shadow-lg shadow-[#10B981]/25 flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{submitting ? 'Grading Answers...' : 'Submit Assessment'}</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. POST-EXAM RESULTS SCREEN (GRADED SCORE & QUESTION REVIEW)
  // -------------------------------------------------------------
  const attempt = resultData || (quiz.attempts && quiz.attempts[0]);
  const isPassed = attempt?.passed || (attempt?.percentage >= quiz.passingScore);

  return (
    <div className="min-h-screen bg-[#071326] text-[#F8FAFC] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 animate-fadeIn">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between">
          <Link
            to={`/courses/${quiz.courseId}`}
            className="inline-flex items-center gap-2 text-xs font-bold text-[#94A3B8] hover:text-[#4FD1C5] transition px-3 py-1.5 rounded-xl bg-[#0D1E36] border border-[#23426A]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Course Outline</span>
          </Link>
          <span className="text-xs font-bold text-[#94A3B8]">Assessment Result</span>
        </div>

        {/* Results Card */}
        <div className="bg-[#0D1E36] border border-[#23426A] rounded-3xl p-8 sm:p-10 shadow-2xl text-center space-y-6">
          <div
            className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto shadow-2xl ${
              isPassed
                ? 'bg-[#064E3B] border-2 border-[#10B981] text-[#10B981]'
                : 'bg-[#7F1D1D] border-2 border-[#EF4444] text-[#EF4444]'
            }`}
          >
            {isPassed ? <Award className="w-10 h-10 animate-bounce" /> : <XCircle className="w-10 h-10" />}
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold mb-2 uppercase tracking-wider">
              {isPassed ? (
                <span className="bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/40 px-3 py-1 rounded-full">
                  ✓ Passed Verification Requirement
                </span>
              ) : (
                <span className="bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 px-3 py-1 rounded-full">
                  Did Not Meet 80% Passing Score
                </span>
              )}
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white">
              {attempt?.percentage}% Score
            </h1>
            <p className="text-xs text-[#94A3B8] mt-1.5">
              Score: <strong>{attempt?.score}</strong> / {attempt?.maxScore} points • Passing threshold: <strong>{quiz.passingScore}%</strong>
            </p>
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {isPassed ? (
              <Link
                to="/student/certificates"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-extrabold text-sm transition shadow-xl shadow-[#10B981]/25 flex items-center justify-center gap-2"
              >
                <Award className="w-5 h-5" />
                <span>🎉 Claim & View Your Certificate</span>
              </Link>
            ) : quiz.remainingAttempts > 0 ? (
              <button
                type="button"
                onClick={handleStartExam}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] hover:from-[#0369A1] hover:to-[#0284C7] text-white font-extrabold text-sm transition shadow-xl shadow-[#0284C7]/25 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-5 h-5" />
                <span>Retake Assessment ({quiz.remainingAttempts} attempts left)</span>
              </button>
            ) : (
              <div className="p-4 rounded-2xl bg-[#071326] border border-[#23426A] text-xs text-[#CBD5E1]">
                You have used all 3 attempts. Please reach out to your instructor or review the lesson videos to request an attempt reset.
              </div>
            )}
          </div>
        </div>

        {/* Detailed Question Explanations & Review Feed */}
        {resultData?.questionResults && (
          <div className="space-y-4 pt-4">
            <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-[#4FD1C5]" />
              <span>Assessment Detailed Answer Review</span>
            </h3>

            <div className="space-y-4">
              {resultData.questionResults.map((qRes: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-6 rounded-3xl border space-y-3 ${
                    qRes.isCorrect
                      ? 'bg-[#0D1E36] border-[#10B981]/40'
                      : 'bg-[#0D1E36] border-[#EF4444]/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-white">Question {idx + 1}</span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-extrabold text-[10px] ${
                        qRes.isCorrect ? 'bg-[#10B981]/20 text-[#10B981]' : 'bg-[#EF4444]/20 text-[#EF4444]'
                      }`}
                    >
                      {qRes.isCorrect ? '✓ Correct' : '✕ Incorrect'}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-white leading-relaxed">{qRes.questionText}</p>

                  <div className="space-y-1.5 text-xs pt-1">
                    <div className="p-2.5 rounded-xl bg-[#071326] border border-[#23426A]">
                      <span className="text-[#94A3B8]">Your Answer: </span>
                      <strong className={qRes.isCorrect ? 'text-[#10B981]' : 'text-[#EF4444]'}>
                        {qRes.selectedOptionText}
                      </strong>
                    </div>

                    {!qRes.isCorrect && qRes.correctOptionText && (
                      <div className="p-2.5 rounded-xl bg-[#064E3B]/40 border border-[#10B981]/40 text-[#A7F3D0]">
                        <span className="text-[#A7F3D0]">Correct Answer: </span>
                        <strong>{qRes.correctOptionText}</strong>
                      </div>
                    )}

                    {qRes.explanation && (
                      <div className="p-3 rounded-xl bg-[#1A365D]/30 border border-[#23426A] text-[11px] text-[#CBD5E1]">
                        <strong className="text-[#4FD1C5]">Explanation: </strong>
                        {qRes.explanation}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
