import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { liveSessionApi, LiveSession, LiveSessionQuestion } from '../services/liveSessionApi';
import {
  Calendar,
  Clock,
  Video,
  Radio,
  Download,
  Users,
  CheckCircle,
  AlertCircle,
  PlayCircle,
  MessageSquare,
  ThumbsUp,
  Pin,
  Send,
  Trash2,
  Lock,
  ExternalLink,
  Copy,
  ChevronLeft,
  CalendarCheck,
  Shield,
  HelpCircle,
} from 'lucide-react';

export const LiveSessionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [session, setSession] = useState<LiveSession | null>(null);
  const [questions, setQuestions] = useState<LiveSessionQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Q&A State
  const [newQuestion, setNewQuestion] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  // Join / Leave State
  const [joining, setJoining] = useState(false);
  const [meetingData, setMeetingData] = useState<any>(null);
  const [hasJoined, setHasJoined] = useState(false);
  const [copiedPasscode, setCopiedPasscode] = useState(false);

  const isInstructorOrAdmin =
    user &&
    (user.role === 'ADMIN' ||
      user.role === 'SUPER_ADMIN' ||
      (session && session.instructorId === user.id));

  useEffect(() => {
    if (id) {
      loadSessionData();
    }
  }, [id, isAuthenticated]);

  const loadSessionData = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const [sessData, qData] = await Promise.all([
        liveSessionApi.getSessionById(id),
        liveSessionApi.getQuestions(id),
      ]);
      setSession(sessData);
      setQuestions(qData);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load live session details.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/live-classes/${id}`);
      return;
    }
    if (!id) return;

    try {
      await liveSessionApi.register(id);
      setSuccessMessage('Successfully registered for this live class!');
      await loadSessionData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register for session.');
    }
  };

  const handleUnregister = async () => {
    if (!id) return;
    if (!window.confirm('Are you sure you want to unregister from this session?')) return;

    try {
      await liveSessionApi.unregister(id);
      setSuccessMessage('Successfully unregistered.');
      await loadSessionData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to unregister.');
    }
  };

  const handleJoin = async () => {
    if (!id) return;
    setJoining(true);
    setError(null);
    try {
      const data = await liveSessionApi.join(id);
      setMeetingData(data);
      setHasJoined(true);
      if (data.meetingUrl) {
        window.open(data.meetingUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to join session.');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!id) return;
    try {
      await liveSessionApi.leave(id);
      setHasJoined(false);
      setMeetingData(null);
      setSuccessMessage('Left virtual classroom. Attendance duration recorded.');
      await loadSessionData();
    } catch (err: any) {}
  };

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate(`/login?redirect=/live-classes/${id}`);
      return;
    }
    if (!id || !newQuestion.trim()) return;

    setSubmittingQuestion(true);
    try {
      const q = await liveSessionApi.askQuestion(id, newQuestion);
      setQuestions([q, ...questions]);
      setNewQuestion('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to post question.');
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleAnswerQuestion = async (questionId: string) => {
    if (!id || !answerText.trim()) return;
    setSubmittingAnswer(true);
    try {
      const updated = await liveSessionApi.answerQuestion(id, questionId, answerText);
      setQuestions(questions.map((q) => (q.id === questionId ? updated : q)));
      setAnsweringQuestionId(null);
      setAnswerText('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to answer question.');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  const handleUpvoteQuestion = async (questionId: string) => {
    if (!isAuthenticated) {
      navigate(`/login?redirect=/live-classes/${id}`);
      return;
    }
    if (!id) return;

    try {
      const updated = await liveSessionApi.upvoteQuestion(id, questionId);
      setQuestions(questions.map((q) => (q.id === questionId ? updated : q)));
    } catch (err: any) {}
  };

  const handlePinQuestion = async (questionId: string) => {
    if (!id) return;
    try {
      const updated = await liveSessionApi.pinQuestion(id, questionId);
      setQuestions(questions.map((q) => (q.id === questionId ? updated : q)));
    } catch (err: any) {}
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!id) return;
    if (!window.confirm('Delete this question?')) return;
    try {
      await liveSessionApi.deleteQuestion(id, questionId);
      setQuestions(questions.filter((q) => q.id !== questionId));
    } catch (err: any) {}
  };

  const copyPasscode = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPasscode(true);
    setTimeout(() => setCopiedPasscode(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#071326] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-[#4FD1C5] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-[#94A3B8]">Loading virtual classroom...</span>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#071326] text-white flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-[#EF4444] mb-3" />
        <h2 className="text-xl font-bold mb-2">Live Session Not Found</h2>
        <p className="text-sm text-[#94A3B8] mb-6">
          This live class session does not exist or has been removed.
        </p>
        <Link
          to="/live-classes"
          className="px-5 py-2.5 rounded-xl bg-[#0284C7] text-white text-sm font-semibold"
        >
          Back to Live Classes
        </Link>
      </div>
    );
  }

  const start = new Date(session.startTime);
  const end = new Date(session.endTime);
  const dateFormatted = start.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const timeFormatted = `${start.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  return (
    <div className="min-h-screen bg-[#071326] text-[#F8FAFC] pb-24">
      {/* Breadcrumb & Navigation */}
      <div className="bg-[#0A192F] border-b border-[#23426A] py-4 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link
            to="/live-classes"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#94A3B8] hover:text-[#4FD1C5] transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Live Classes Catalog
          </Link>

          {isInstructorOrAdmin && (
            <Link
              to="/instructor/live-classes"
              className="text-xs font-semibold text-[#4FD1C5] hover:underline flex items-center gap-1.5"
            >
              <Shield className="w-3.5 h-3.5" />
              Manage Session (Instructor Console)
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Messages */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-[#064E3B]/80 border border-[#10B981] text-[#A7F3D0] flex items-center gap-3 animate-fadeIn">
            <CheckCircle className="w-5 h-5 shrink-0 text-[#10B981]" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#7F1D1D]/80 border border-[#EF4444] text-[#FECACA] flex items-center gap-3 animate-fadeIn">
            <AlertCircle className="w-5 h-5 shrink-0 text-[#EF4444]" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Column */}
          <div className="lg:col-span-8 space-y-8">
            {/* Session Header Card */}
            <div className="bg-[#0D1E36] border border-[#23426A] rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="text-xs font-bold text-[#4FD1C5] bg-[#1A365D] px-3 py-1 rounded-lg">
                  {session.course?.title}
                </span>

                {session.dynamicStatus === 'LIVE' ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#EF4444]/20 border border-[#EF4444] text-[#F87171] text-xs font-extrabold animate-pulse">
                    <Radio className="w-3.5 h-3.5" />
                    LIVE NOW
                  </span>
                ) : session.dynamicStatus === 'COMPLETED' ? (
                  <span className="px-3 py-0.5 rounded-full bg-[#334155] text-[#94A3B8] text-xs font-medium">
                    Completed
                  </span>
                ) : session.dynamicStatus === 'CANCELLED' ? (
                  <span className="px-3 py-0.5 rounded-full bg-[#7F1D1D]/40 text-[#FCA5A5] text-xs font-medium">
                    Cancelled
                  </span>
                ) : (
                  <span className="px-3 py-0.5 rounded-full bg-[#0369A1]/30 text-[#38BDF8] text-xs font-medium">
                    Scheduled Session
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-4">
                {session.title}
              </h1>

              {/* Schedule Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4 border-y border-[#23426A] text-sm text-[#CBD5E1] mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1A365D] flex items-center justify-center text-[#4FD1C5] shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-[#94A3B8]">Date</div>
                    <div className="font-semibold text-white">{dateFormatted}</div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1A365D] flex items-center justify-center text-[#4FD1C5] shrink-0">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs text-[#94A3B8]">Time & Timezone</div>
                    <div className="font-semibold text-white">
                      {timeFormatted} ({session.timezone || 'UTC'})
                    </div>
                  </div>
                </div>
              </div>

              {/* Instructor Details */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-[#1A365D] border border-[#4FD1C5]/30 flex items-center justify-center text-lg font-bold text-[#4FD1C5]">
                  {session.instructor?.name?.charAt(0) || 'K'}
                </div>
                <div>
                  <div className="text-xs text-[#94A3B8]">Instructor</div>
                  <div className="font-bold text-white text-base">
                    {session.instructor?.name}
                  </div>
                  {session.instructor?.bio && (
                    <div className="text-xs text-[#94A3B8] line-clamp-1">
                      {session.instructor?.bio}
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {session.description && (
                <div className="mb-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2">
                    About this Live Class
                  </h3>
                  <p className="text-sm text-[#CBD5E1] whitespace-pre-line leading-relaxed">
                    {session.description}
                  </p>
                </div>
              )}
            </div>

            {/* Live Recording Section (If Completed and Recording Attached) */}
            {session.dynamicStatus === 'COMPLETED' && (
              <div className="bg-[#0D1E36] border border-[#23426A] rounded-2xl p-6 sm:p-8 shadow-xl">
                <div className="flex items-center gap-2 mb-4">
                  <PlayCircle className="w-5 h-5 text-[#4FD1C5]" />
                  <h2 className="text-xl font-bold text-white">Session Recording</h2>
                </div>

                {session.recordingUrl ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-[#071326] border border-[#23426A] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="font-bold text-white">
                          {session.recordingTitle || `${session.title} - Recording`}
                        </div>
                        {session.recordingDurationMinutes && (
                          <div className="text-xs text-[#94A3B8]">
                            Duration: {session.recordingDurationMinutes} minutes
                          </div>
                        )}
                      </div>
                      <a
                        href={session.recordingUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] text-white text-xs font-bold transition-all flex items-center justify-center gap-2 shrink-0 shadow-md"
                      >
                        <PlayCircle className="w-4 h-4" />
                        Watch Full Recording
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 rounded-xl bg-[#071326]/60 border border-[#23426A] text-center">
                    <p className="text-sm text-[#94A3B8]">
                      Recording not available yet. The instructor will upload the recording shortly after processing.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Q&A Section */}
            <div className="bg-[#0D1E36] border border-[#23426A] rounded-2xl p-6 sm:p-8 shadow-xl">
              <div className="flex items-center justify-between gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#4FD1C5]" />
                  <h2 className="text-xl font-bold text-white">Live Session Q&A</h2>
                  <span className="text-xs bg-[#1A365D] text-[#4FD1C5] px-2.5 py-0.5 rounded-full font-bold">
                    {questions.length}
                  </span>
                </div>
              </div>

              {/* Ask Question Form */}
              <form onSubmit={handleAskQuestion} className="mb-8">
                <div className="relative">
                  <textarea
                    rows={3}
                    placeholder={
                      isAuthenticated
                        ? 'Ask a question for Khalil or the live class audience...'
                        : 'Please log in to ask a question in this session...'
                    }
                    disabled={!isAuthenticated || submittingQuestion}
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="w-full p-4 bg-[#071326] border border-[#23426A] rounded-xl text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4FD1C5] transition-colors resize-none disabled:opacity-50"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      type="submit"
                      disabled={!isAuthenticated || !newQuestion.trim() || submittingQuestion}
                      className="px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold transition-colors flex items-center gap-2 disabled:opacity-40"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {submittingQuestion ? 'Posting...' : 'Post Question'}
                    </button>
                  </div>
                </div>
              </form>

              {/* Questions List */}
              {questions.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-[#23426A] rounded-xl">
                  <HelpCircle className="w-8 h-8 text-[#64748B] mx-auto mb-2" />
                  <p className="text-xs text-[#94A3B8]">
                    No questions asked yet. Be the first to ask!
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {questions.map((q) => (
                    <div
                      key={q.id}
                      className={`p-4 rounded-xl border transition-all ${
                        q.isPinned
                          ? 'bg-[#1A365D]/40 border-[#4FD1C5]/60'
                          : 'bg-[#071326] border-[#23426A]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg bg-[#1A365D] text-[#4FD1C5] font-bold text-xs flex items-center justify-center">
                            {q.user?.name?.charAt(0) || 'S'}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white">
                              {q.user?.name}
                            </span>
                            <span className="text-[10px] text-[#64748B] ml-2">
                              {new Date(q.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {q.isPinned && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#4FD1C5]/10 text-[#4FD1C5] text-[10px] font-bold">
                              <Pin className="w-3 h-3" /> Pinned
                            </span>
                          )}

                          {isInstructorOrAdmin && (
                            <>
                              <button
                                onClick={() => handlePinQuestion(q.id)}
                                title={q.isPinned ? 'Unpin question' : 'Pin question'}
                                className="p-1 text-[#94A3B8] hover:text-[#4FD1C5] transition-colors"
                              >
                                <Pin className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteQuestion(q.id)}
                                title="Delete question"
                                className="p-1 text-[#94A3B8] hover:text-[#EF4444] transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Question Text */}
                      <p className="text-sm text-white mb-3 pl-9">{q.question}</p>

                      {/* Instructor Answer */}
                      {q.isAnswered && q.answer && (
                        <div className="ml-9 p-3 rounded-lg bg-[#0D1E36] border border-[#4FD1C5]/30 mb-3">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-[#4FD1C5] mb-1">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Answer from {q.answeredBy || 'Instructor'}
                          </div>
                          <p className="text-xs text-[#CBD5E1] whitespace-pre-line">
                            {q.answer}
                          </p>
                        </div>
                      )}

                      {/* Answer Input for Instructor */}
                      {isInstructorOrAdmin && answeringQuestionId === q.id && (
                        <div className="ml-9 p-3 rounded-lg bg-[#0D1E36] border border-[#23426A] mb-3 space-y-2">
                          <textarea
                            rows={2}
                            placeholder="Write official instructor answer..."
                            value={answerText}
                            onChange={(e) => setAnswerText(e.target.value)}
                            className="w-full p-2.5 bg-[#071326] border border-[#23426A] rounded-lg text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#4FD1C5]"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setAnsweringQuestionId(null);
                                setAnswerText('');
                              }}
                              className="px-3 py-1 rounded-lg bg-[#334155] text-xs text-white"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => handleAnswerQuestion(q.id)}
                              disabled={submittingAnswer || !answerText.trim()}
                              className="px-3 py-1 rounded-lg bg-[#10B981] hover:bg-[#059669] text-xs font-bold text-white disabled:opacity-50"
                            >
                              {submittingAnswer ? 'Saving...' : 'Publish Answer'}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Actions Bar */}
                      <div className="flex items-center justify-between pl-9 pt-1 text-xs">
                        <button
                          onClick={() => handleUpvoteQuestion(q.id)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors ${
                            q.hasUpvoted
                              ? 'bg-[#1A365D] border-[#4FD1C5] text-[#4FD1C5]'
                              : 'bg-[#0D1E36] border-[#23426A] text-[#94A3B8] hover:text-white'
                          }`}
                        >
                          <ThumbsUp className="w-3 h-3" />
                          <span>{q.upvotes}</span>
                        </button>

                        {isInstructorOrAdmin && !q.isAnswered && answeringQuestionId !== q.id && (
                          <button
                            onClick={() => {
                              setAnsweringQuestionId(q.id);
                              setAnswerText('');
                            }}
                            className="text-xs text-[#4FD1C5] hover:underline font-semibold"
                          >
                            Reply / Answer
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            {/* Join / Registration Action Card */}
            <div className="bg-[#0D1E36] border border-[#23426A] rounded-2xl p-6 shadow-xl sticky top-24">
              <h3 className="text-base font-bold text-white mb-4">
                Virtual Room Access
              </h3>

              {/* Dynamic Status / Join Logic */}
              {session.dynamicStatus === 'CANCELLED' ? (
                <div className="p-4 rounded-xl bg-[#7F1D1D]/30 border border-[#EF4444]/40 text-[#FCA5A5] text-xs font-medium text-center">
                  This live class has been cancelled.
                </div>
              ) : session.isRegistered ? (
                <div className="space-y-4">
                  <div className="p-3 rounded-xl bg-[#064E3B]/40 border border-[#10B981]/50 text-[#A7F3D0] text-xs flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#10B981] shrink-0" />
                    <span>You are registered for this session.</span>
                  </div>

                  {/* Join / Active Classroom Actions */}
                  {session.isJoinable ? (
                    <div className="space-y-3">
                      {!hasJoined ? (
                        <button
                          onClick={handleJoin}
                          disabled={joining}
                          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-extrabold text-sm transition-all shadow-lg shadow-[#10B981]/25 flex items-center justify-center gap-2"
                        >
                          <Video className="w-5 h-5 animate-pulse" />
                          {joining ? 'Connecting to Virtual Room...' : 'Enter Live Classroom'}
                        </button>
                      ) : (
                        <div className="p-3 rounded-xl bg-[#064E3B]/30 border border-[#10B981]/40 text-center">
                          <span className="text-xs font-semibold text-[#A7F3D0] flex items-center justify-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                            Connected to Live Classroom (Attendance Active)
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-xl bg-[#071326] border border-[#23426A] text-xs text-[#94A3B8] text-center space-y-1">
                      <div className="font-semibold text-white">Join Button Status</div>
                      <div>
                        Will activate {session.joinBufferMinutes || 15} minutes before class starts.
                      </div>
                    </div>
                  )}

                  {/* Active Join Meeting Details */}
                  {meetingData && (
                    <div className="p-4 rounded-xl bg-[#071326] border border-[#4FD1C5]/40 space-y-3 animate-fadeIn">
                      <div className="text-xs font-bold text-[#4FD1C5] uppercase tracking-wider flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        Meeting Room Credentials
                      </div>

                      {meetingData.meetingUrl ? (
                        <div className="space-y-2">
                          <a
                            href={meetingData.meetingUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] hover:from-[#0369A1] hover:to-[#0284C7] text-white text-xs font-extrabold text-center flex items-center justify-center gap-2 shadow-md shadow-[#0284C7]/20"
                          >
                            <Video className="w-4 h-4" />
                            Launch {session.meetingProvider === 'GOOGLE_MEET' ? 'Google Meet' : session.meetingProvider === 'ZOOM' ? 'Zoom' : 'Live Room'}
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>

                          <div className="p-2.5 rounded-lg bg-[#0D1E36] border border-[#23426A] flex items-center justify-between text-xs gap-2">
                            <span className="text-[#94A3B8] truncate text-[11px] select-all">
                              {meetingData.meetingUrl}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyPasscode(meetingData.meetingUrl)}
                              className="px-2 py-1 rounded bg-[#1A365D] hover:bg-[#23426A] text-[#4FD1C5] text-[10px] font-bold shrink-0 transition-colors"
                            >
                              {copiedPasscode ? 'Copied!' : 'Copy Link'}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-lg bg-[#78350F]/30 border border-[#F59E0B]/40 text-[#FDE68A] text-xs">
                          ⚠️ The instructor has not added the meeting URL yet. Please refresh shortly or check the Q&A below.
                        </div>
                      )}

                      {meetingData.meetingPasscode && (
                        <div className="flex items-center justify-between text-xs p-2 rounded-lg bg-[#0D1E36]">
                          <span className="text-[#94A3B8]">Passcode:</span>
                          <span className="font-mono font-bold text-white">
                            {meetingData.meetingPasscode}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyPasscode(meetingData.meetingPasscode)}
                            className="text-[#4FD1C5] hover:text-white"
                          >
                            {copiedPasscode ? 'Copied!' : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      )}

                      {hasJoined && (
                        <button
                          type="button"
                          onClick={handleLeave}
                          className="w-full py-2.5 rounded-xl bg-[#7F1D1D]/30 text-[#FCA5A5] hover:bg-[#7F1D1D]/60 text-xs font-bold transition-colors border border-[#EF4444]/30"
                        >
                          Leave Virtual Room (Record Attendance)
                        </button>
                      )}
                    </div>
                  )}

                  {/* Calendar Export */}
                  <a
                    href={liveSessionApi.getSessionIcsUrl(session.id)}
                    download={`live-class-${session.id}.ics`}
                    className="w-full py-2.5 rounded-xl bg-[#1A365D] hover:bg-[#23426A] text-[#4FD1C5] border border-[#4FD1C5]/30 text-xs font-semibold transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Add to Calendar (.ics)
                  </a>

                  {session.dynamicStatus === 'SCHEDULED' && (
                    <button
                      onClick={handleUnregister}
                      className="w-full py-2 text-xs text-[#94A3B8] hover:text-[#EF4444] transition-colors text-center"
                    >
                      Unregister from session
                    </button>
                  )}
                </div>
              ) : session.dynamicStatus === 'COMPLETED' ? (
                <div className="space-y-3 text-center">
                  <div className="p-3 rounded-xl bg-[#334155]/40 text-[#94A3B8] text-xs">
                    This live session has ended.
                  </div>
                </div>
              ) : session.isFull ? (
                <div className="p-4 rounded-xl bg-[#7F1D1D]/20 border border-[#EF4444]/40 text-[#FCA5A5] text-xs text-center font-bold">
                  This live class is currently full (50 / 50 seats taken).
                </div>
              ) : (
                <div className="space-y-4">
                  <button
                    onClick={handleRegister}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] hover:from-[#0369A1] hover:to-[#0284C7] text-white font-extrabold text-sm transition-all shadow-lg shadow-[#0284C7]/25 flex items-center justify-center gap-2"
                  >
                    <CalendarCheck className="w-5 h-5" />
                    Register for Live Class
                  </button>

                  <a
                    href={liveSessionApi.getSessionIcsUrl(session.id)}
                    download={`live-class-${session.id}.ics`}
                    className="w-full py-2.5 rounded-xl bg-[#071326] hover:bg-[#1A365D] text-[#94A3B8] hover:text-white border border-[#23426A] text-xs font-medium transition-all flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Export Calendar (.ics)
                  </a>
                </div>
              )}

              {/* Capacity Progress Bar */}
              <div className="mt-6 pt-6 border-t border-[#23426A]">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-[#94A3B8]">
                    {session.registeredCount} / {session.maxParticipants} Registered
                  </span>
                  <span
                    className={`font-semibold ${
                      session.isFull ? 'text-[#EF4444]' : 'text-[#4FD1C5]'
                    }`}
                  >
                    {session.isFull ? 'Full' : `${session.availableSeats} seats left`}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-[#071326] rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      session.isFull ? 'bg-[#EF4444]' : 'bg-[#10B981]'
                    }`}
                    style={{
                      width: `${Math.min(
                        100,
                        (session.registeredCount / session.maxParticipants) * 100
                      )}%`,
                    }}
                  />
                </div>
              </div>

              {/* Provider Info Badge */}
              <div className="mt-4 p-3 rounded-xl bg-[#071326] border border-[#23426A] text-xs text-[#94A3B8] flex items-center justify-between">
                <span>Meeting Platform</span>
                <span className="font-semibold text-white">
                  {session.meetingProvider === 'ZOOM'
                    ? 'Zoom Room'
                    : session.meetingProvider === 'GOOGLE_MEET'
                    ? 'Google Meet'
                    : 'External Virtual Room'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
