import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { liveSessionApi, LiveSession, LiveSessionQuestion } from '../services/liveSessionApi';
import { NativeClassroomStage } from '../components/live/NativeClassroomStage';
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
  ChevronLeft,
  CalendarCheck,
  Shield,
  HelpCircle,
  Square,
  Sparkles,
  FileText,
  MessageCircle,
  BookOpen,
  Film,
  Upload,
  Play,
  ExternalLink,
} from 'lucide-react';

export const LiveSessionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [session, setSession] = useState<LiveSession | null>(null);
  const [questions, setQuestions] = useState<LiveSessionQuestion[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Classroom Player / Stage State
  const [hasJoined, setHasJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<'qa' | 'chat' | 'attendees' | 'resources'>('qa');

  // Recording Publishing State (for completed sessions)
  const [recordingUrlInput, setRecordingUrlInput] = useState('');
  const [recordingTitleInput, setRecordingTitleInput] = useState('');
  const [publishingRecording, setPublishingRecording] = useState(false);

  // Session Duration Timer
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Live In-Class Chat Messages State
  const [chatMessages, setChatMessages] = useState<Array<{ id: string; sender: string; text: string; time: string; isHost?: boolean }>>([
    { id: '1', sender: 'Khalil Academy System', text: 'Welcome to the live virtual classroom! Ask questions or chat with peers here.', time: 'Just now', isHost: true }
  ]);
  const [chatInput, setChatInput] = useState('');

  // Q&A State
  const [newQuestion, setNewQuestion] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);
  const [answeringQuestionId, setAnsweringQuestionId] = useState<string | null>(null);
  const [answerText, setAnswerText] = useState('');
  const [submittingAnswer, setSubmittingAnswer] = useState(false);

  // End Session Confirmation Modal State
  const [showEndModal, setShowEndModal] = useState(false);
  const [endingSession, setEndingSession] = useState(false);

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

  // Elapsed Timer ticker for live session
  useEffect(() => {
    if (session?.dynamicStatus === 'LIVE' || hasJoined) {
      const interval = setInterval(() => {
        setElapsedSeconds((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [session?.dynamicStatus, hasJoined]);

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

      if (sessData.recordingTitle) {
        setRecordingTitleInput(sessData.recordingTitle);
      } else {
        setRecordingTitleInput(`${sessData.title} — Full Class Recording`);
      }

      if (sessData.recordingUrl) {
        setRecordingUrlInput(sessData.recordingUrl);
      }

      if (isInstructorOrAdmin) {
        try {
          const parts = await liveSessionApi.getParticipants(id);
          setParticipants(parts || []);
        } catch (e) {}
      }

      // Auto-join if session is live and user is registered or host
      if (sessData.isJoinable && (sessData.isRegistered || isInstructorOrAdmin)) {
        setHasJoined(true);
      }
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

  // Join Classroom Inside Khalil Academy Screen
  const handleJoin = async () => {
    if (!id) return;
    setJoining(true);
    setError(null);
    try {
      await liveSessionApi.join(id);
      setHasJoined(true);
      setSuccessMessage(`Connected to live classroom as ${user?.name}. Your attendance is recording.`);
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
      setSuccessMessage('Left virtual classroom. Attendance duration recorded.');
      await loadSessionData();
    } catch (err: any) {}
  };

  // Instructor/Admin: End Live Class Platform-wide
  const handleConfirmEndSession = async () => {
    if (!id) return;
    setEndingSession(true);
    try {
      const updated = await liveSessionApi.endSession(id);
      setSession(updated);
      setHasJoined(false);
      setShowEndModal(false);
      setSuccessMessage('Live class concluded successfully. Attendance has been finalized.');
      await loadSessionData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to end live class.');
    } finally {
      setEndingSession(false);
    }
  };

  // Instructor/Admin: Attach / Publish Class Video Recording
  const handlePublishRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !recordingUrlInput.trim()) return;

    setPublishingRecording(true);
    setError(null);
    try {
      const updated = await liveSessionApi.attachRecording(id, {
        recordingUrl: recordingUrlInput.trim(),
        recordingTitle: recordingTitleInput.trim() || `${session?.title} - Full Recording`,
      });
      setSession(updated.session || { ...session, recordingUrl: recordingUrlInput.trim() });
      setSuccessMessage('Session recording published successfully! The video is now playing for students.');
      await loadSessionData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to attach video recording.');
    } finally {
      setPublishingRecording(false);
    }
  };

  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    const newMsg = {
      id: Date.now().toString(),
      sender: user?.name || 'Student',
      text: chatInput.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isHost: !!isInstructorOrAdmin,
    };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput('');
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

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const hrs = Math.floor(mins / 60);
    const displayMins = mins % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${displayMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${displayMins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Helper: Render Video Recording Frame (Supports YouTube, Vimeo, and Direct Video Files)
  const renderRecordingPlayer = (url: string) => {
    const trimmed = url.trim();

    // 1. YouTube Video
    const ytMatch = trimmed.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|live\/)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch && ytMatch[1]) {
      return (
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0`}
          title="Session Video Recording"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="w-full h-full min-h-[440px] sm:min-h-[520px] rounded-2xl border-0"
        />
      );
    }

    // 2. Vimeo Video
    const vimeoMatch = trimmed.match(/vimeo\.com\/(?:channels\/(?:\w+\/)?|groups\/([^\/]*)\/videos\/|album\/(\d+)\/video\/|)(\d+)(?:$|\/|\?)/);
    if (vimeoMatch && vimeoMatch[3]) {
      return (
        <iframe
          src={`https://player.vimeo.com/video/${vimeoMatch[3]}?autoplay=1`}
          title="Session Video Recording"
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          className="w-full h-full min-h-[440px] sm:min-h-[520px] rounded-2xl border-0"
        />
      );
    }

    // 3. Direct HTML5 Video Player (MP4, WebM, HLS)
    return (
      <video
        controls
        autoPlay
        playsInline
        src={trimmed}
        className="w-full h-full min-h-[440px] sm:min-h-[520px] rounded-2xl bg-black object-contain shadow-2xl"
      >
        Your browser does not support the video tag.
      </video>
    );
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

  const isClassLive = session.dynamicStatus === 'LIVE';
  const isClassCompleted = session.dynamicStatus === 'COMPLETED';

  return (
    <div className="min-h-screen bg-[#071326] text-[#F8FAFC] flex flex-col">
      {/* Top Header & Classroom Navigation */}
      <header className="bg-[#0A192F] border-b border-[#23426A] py-3.5 px-4 sm:px-6 lg:px-8 shrink-0">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              to="/live-classes"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#94A3B8] hover:text-[#4FD1C5] transition-colors p-1.5 rounded-lg bg-[#071326] border border-[#23426A]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </Link>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-extrabold text-[#4FD1C5] uppercase tracking-wider">
                  {session.course?.title}
                </span>
                <span>•</span>
                {isClassLive ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#EF4444]/20 border border-[#EF4444] text-[#F87171] text-[10px] font-extrabold animate-pulse">
                    <Radio className="w-3 h-3" />
                    LIVE CLASSROOM
                  </span>
                ) : isClassCompleted ? (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30 text-[10px] font-bold">
                    ✓ Class Completed & Recorded
                  </span>
                ) : (
                  <span className="px-2.5 py-0.5 rounded-full bg-[#0369A1]/30 text-[#38BDF8] text-[10px] font-bold">
                    Scheduled
                  </span>
                )}
              </div>
              <h1 className="text-base sm:text-lg font-extrabold text-white truncate max-w-md sm:max-w-xl">
                {session.title}
              </h1>
            </div>
          </div>

          {/* Action Bar (End Class for Instructor, Timer, Attendance badge) */}
          <div className="flex items-center gap-3">
            {isClassLive && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#071326] border border-[#23426A] text-xs text-[#CBD5E1]">
                <Clock className="w-3.5 h-3.5 text-[#4FD1C5]" />
                <span className="font-mono font-bold text-white">{formatTimer(elapsedSeconds)}</span>
              </div>
            )}

            {/* Instructor / Admin "End Live Class" Button */}
            {isInstructorOrAdmin && !isClassCompleted && session.dynamicStatus !== 'CANCELLED' && (
              <button
                type="button"
                onClick={() => setShowEndModal(true)}
                className="px-3.5 py-2 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white font-extrabold text-xs transition-all shadow-md shadow-[#EF4444]/20 flex items-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>End Live Class</span>
              </button>
            )}

            {isInstructorOrAdmin && (
              <Link
                to="/instructor/live-classes"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A365D] hover:bg-[#23426A] text-[#4FD1C5] text-xs font-bold transition-colors"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Instructor Console</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Notifications */}
      {successMessage && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4">
          <div className="p-3.5 rounded-xl bg-[#064E3B]/80 border border-[#10B981] text-[#A7F3D0] flex items-center justify-between gap-3 text-xs font-semibold animate-fadeIn">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-[#10B981] shrink-0" />
              <span>{successMessage}</span>
            </div>
            <button onClick={() => setSuccessMessage(null)} className="text-[#A7F3D0] hover:text-white">✕</button>
          </div>
        </div>
      )}

      {error && (
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 mt-4">
          <div className="p-3.5 rounded-xl bg-[#7F1D1D]/80 border border-[#EF4444] text-[#FECACA] flex items-center justify-between gap-3 text-xs font-semibold animate-fadeIn">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-[#FECACA] hover:text-white">✕</button>
          </div>
        </div>
      )}

      {/* Main Classroom Layout */}
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 flex-1 flex flex-col gap-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1">
          
          {/* Main Stage: Native WebRTC Video Player OR Session HD Recording */}
          <div className="lg:col-span-8 flex flex-col space-y-4">
            
            {isClassCompleted ? (
              /* Class Concluded Stage with Video Player & Recording Publisher */
              <div className="w-full bg-[#0D1E36] border border-[#23426A] rounded-3xl overflow-hidden shadow-2xl flex flex-col min-h-[480px]">
                
                {/* Header Bar */}
                <div className="bg-[#0A192F] border-b border-[#23426A] px-4 py-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-[#4FD1C5]" />
                    <span className="font-bold text-white">Class Recording & Summary</span>
                  </div>
                  {session.recordingUrl && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#10B981]/20 text-[#10B981] text-[10px] font-bold">
                      ✓ HD Video Available
                    </span>
                  )}
                </div>

                {/* Video Stage Content */}
                <div className="w-full flex-1 bg-[#050C17] flex items-center justify-center p-2 relative min-h-[440px] sm:min-h-[500px]">
                  {session.recordingUrl ? (
                    /* High Definition Video Player */
                    <div className="w-full h-full flex flex-col justify-center animate-fadeIn">
                      {renderRecordingPlayer(session.recordingUrl)}
                    </div>
                  ) : isInstructorOrAdmin ? (
                    /* Instructor Inline Video Publisher Card */
                    <div className="p-6 sm:p-8 max-w-lg w-full text-center space-y-5 animate-fadeIn">
                      <div className="w-16 h-16 rounded-3xl bg-[#1A365D] border border-[#4FD1C5]/30 flex items-center justify-center text-[#4FD1C5] mx-auto shadow-xl">
                        <Upload className="w-8 h-8" />
                      </div>

                      <div>
                        <h3 className="text-xl font-extrabold text-white">Publish Class Video Recording</h3>
                        <p className="text-xs text-[#94A3B8] mt-1">
                          Paste your recording link below (MP4, YouTube, Vimeo, or S3 video URL) so students can watch the recording immediately.
                        </p>
                      </div>

                      <form onSubmit={handlePublishRecording} className="space-y-3 text-left">
                        <div>
                          <label className="text-[11px] font-bold text-[#CBD5E1] block mb-1">
                            Video Recording URL *
                          </label>
                          <input
                            type="url"
                            placeholder="e.g. https://www.youtube.com/watch?v=... or https://.../class-recording.mp4"
                            required
                            value={recordingUrlInput}
                            onChange={(e) => setRecordingUrlInput(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-[#071326] border border-[#23426A] rounded-xl text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#4FD1C5]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] font-bold text-[#CBD5E1] block mb-1">
                            Recording Title
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. Docker & DevOps Masterclass — Live Session Recording"
                            value={recordingTitleInput}
                            onChange={(e) => setRecordingTitleInput(e.target.value)}
                            className="w-full px-3.5 py-2.5 bg-[#071326] border border-[#23426A] rounded-xl text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#4FD1C5]"
                          />
                        </div>

                        {/* Quick Presets / Samples */}
                        <div className="flex items-center gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              setRecordingUrlInput('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4');
                              setRecordingTitleInput(`${session.title} — Official Video Recording`);
                            }}
                            className="text-[10px] text-[#4FD1C5] hover:underline font-bold"
                          >
                            + Insert Demo MP4 Video
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={publishingRecording || !recordingUrlInput.trim()}
                          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] hover:from-[#0369A1] hover:to-[#0284C7] text-white font-extrabold text-xs transition shadow-lg shadow-[#0284C7]/20 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          <Play className="w-4 h-4 fill-current" />
                          <span>{publishingRecording ? 'Publishing Recording...' : 'Save & Publish Video Now'}</span>
                        </button>
                      </form>
                    </div>
                  ) : (
                    /* Student Waiting Screen with Quick Demo */
                    <div className="p-8 text-center max-w-md space-y-4 animate-fadeIn">
                      <div className="w-16 h-16 rounded-3xl bg-[#1A365D] border border-[#4FD1C5]/30 flex items-center justify-center text-[#4FD1C5] mx-auto shadow-xl">
                        <PlayCircle className="w-8 h-8" />
                      </div>
                      <div>
                        <h3 className="text-lg font-extrabold text-white">This Live Class Has Concluded</h3>
                        <p className="text-xs text-[#94A3B8] mt-1">
                          The instructor is processing the recording video. As soon as it's published, you can watch it right on this screen!
                        </p>
                      </div>
                      <div className="p-3.5 rounded-2xl bg-[#071326] border border-[#23426A] text-xs text-[#CBD5E1] flex items-center justify-between">
                        <span>Your Attendance:</span>
                        <span className="font-bold text-[#10B981]">✓ Recorded & Validated</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : session.dynamicStatus === 'CANCELLED' ? (
              /* Cancelled Stage */
              <div className="w-full bg-[#0D1E36] border border-[#23426A] rounded-3xl p-8 text-center space-y-3 min-h-[440px] flex flex-col items-center justify-center">
                <AlertCircle className="w-12 h-12 text-[#EF4444] mx-auto" />
                <h3 className="text-lg font-bold text-white">Session Cancelled</h3>
                <p className="text-xs text-[#94A3B8]">
                  This session was cancelled by the instructor. Please check back for rescheduled dates.
                </p>
              </div>
            ) : hasJoined || isInstructorOrAdmin ? (
              /* 100% Native WebRTC Classroom Video Stage (Zero 3rd-party links) */
              <NativeClassroomStage
                sessionId={session.id}
                sessionTitle={session.title}
                user={user}
                isInstructor={Boolean(isInstructorOrAdmin)}
                onEndSession={() => setShowEndModal(true)}
                onLeaveSession={handleLeave}
              />
            ) : (
              /* Pre-Join / Lobby Stage */
              <div className="w-full bg-[#0D1E36] border border-[#23426A] rounded-3xl p-8 text-center space-y-5 animate-fadeIn min-h-[440px] flex flex-col items-center justify-center">
                <div className="w-16 h-16 rounded-3xl bg-[#1A365D] border border-[#4FD1C5]/30 flex items-center justify-center text-[#4FD1C5] mx-auto">
                  <Video className="w-8 h-8" />
                </div>

                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1A365D] text-[#4FD1C5] text-xs font-extrabold mb-2">
                    {isClassLive ? '🔴 Session Live Now' : 'Virtual Classroom Lobby'}
                  </div>
                  <h2 className="text-2xl font-extrabold text-white">{session.title}</h2>
                  <p className="text-xs text-[#94A3B8] mt-1">
                    Instructor: <strong>{session.instructor?.name}</strong> • {dateFormatted} ({timeFormatted})
                  </p>
                </div>

                {session.isRegistered || isInstructorOrAdmin ? (
                  <div className="space-y-3 max-w-sm w-full">
                    <button
                      type="button"
                      onClick={handleJoin}
                      disabled={joining}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white font-extrabold text-sm transition-all shadow-xl shadow-[#10B981]/25 flex items-center justify-center gap-2"
                    >
                      <Video className="w-5 h-5 animate-pulse" />
                      <span>{joining ? 'Connecting to Room...' : 'Enter Live Classroom'}</span>
                    </button>
                    <p className="text-[11px] text-[#94A3B8]">
                      Joining as <strong>{user?.name || 'Student'}</strong> with real-time video, audio, and attendance recording.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-w-sm w-full">
                    <button
                      type="button"
                      onClick={handleRegister}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] hover:from-[#0369A1] hover:to-[#0284C7] text-white font-extrabold text-sm transition-all shadow-xl shadow-[#0284C7]/25 flex items-center justify-center gap-2"
                    >
                      <CalendarCheck className="w-5 h-5" />
                      <span>Register for Live Class</span>
                    </button>
                    <p className="text-[11px] text-[#94A3B8]">
                      Free enrollment for registered students. Secure your seat now!
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Session Overview & Curriculum Notes Below Screen */}
            <div className="bg-[#0D1E36] border border-[#23426A] rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-extrabold text-white flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-[#4FD1C5]" />
                  <span>Session Description & Learning Agenda</span>
                </h3>
                <span className="text-xs text-[#94A3B8]">{session.maxParticipants - session.registeredCount} seats left</span>
              </div>

              {session.description ? (
                <p className="text-xs sm:text-sm text-[#CBD5E1] whitespace-pre-line leading-relaxed">
                  {session.description}
                </p>
              ) : (
                <p className="text-xs text-[#94A3B8]">
                  Join instructor {session.instructor?.name} for this live interactive session covering practical skills and real-world implementations.
                </p>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#23426A] text-xs">
                <div className="p-3 rounded-2xl bg-[#071326] border border-[#23426A]">
                  <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Classroom Mode</span>
                  <span className="font-extrabold text-white mt-0.5 block">Native HD Video Room</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#071326] border border-[#23426A]">
                  <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Attendance Required</span>
                  <span className="font-extrabold text-white mt-0.5 block">{session.attendanceThresholdPercent || 70}% of class</span>
                </div>
                <div className="p-3 rounded-2xl bg-[#071326] border border-[#23426A]">
                  <span className="text-[#94A3B8] block text-[10px] uppercase font-bold">Enrolled Students</span>
                  <span className="font-extrabold text-white mt-0.5 block">{session.registeredCount} / {session.maxParticipants}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar: Multi-Tab Classroom Side Panel */}
          <div className="lg:col-span-4 flex flex-col space-y-4">
            <div className="bg-[#0D1E36] border border-[#23426A] rounded-3xl p-5 shadow-xl flex-1 flex flex-col">
              
              {/* Tab Navigation */}
              <div className="grid grid-cols-4 gap-1 p-1 bg-[#071326] rounded-2xl border border-[#23426A] mb-4">
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab('qa')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    activeSidebarTab === 'qa'
                      ? 'bg-[#4FD1C5] text-[#0A1322] shadow'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>Q&A ({questions.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab('chat')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    activeSidebarTab === 'chat'
                      ? 'bg-[#4FD1C5] text-[#0A1322] shadow'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Chat</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab('attendees')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    activeSidebarTab === 'attendees'
                      ? 'bg-[#4FD1C5] text-[#0A1322] shadow'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <Users className="w-3.5 h-3.5" />
                  <span>Roster</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSidebarTab('resources')}
                  className={`py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 ${
                    activeSidebarTab === 'resources'
                      ? 'bg-[#4FD1C5] text-[#0A1322] shadow'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Notes</span>
                </button>
              </div>

              {/* Tab 1: Live Q&A */}
              {activeSidebarTab === 'qa' && (
                <div className="flex-1 flex flex-col space-y-4">
                  {/* Ask Question Form */}
                  <form onSubmit={handleAskQuestion} className="space-y-2">
                    <textarea
                      rows={2}
                      placeholder={
                        isAuthenticated
                          ? 'Ask a question for Khalil or the audience...'
                          : 'Log in to ask questions in this live session...'
                      }
                      disabled={!isAuthenticated || submittingQuestion}
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      className="w-full p-3 bg-[#071326] border border-[#23426A] rounded-2xl text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#4FD1C5] resize-none"
                    />
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={!isAuthenticated || !newQuestion.trim() || submittingQuestion}
                        className="px-3.5 py-1.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-bold transition flex items-center gap-1.5 disabled:opacity-40"
                      >
                        <Send className="w-3 h-3" />
                        <span>{submittingQuestion ? 'Posting...' : 'Ask Question'}</span>
                      </button>
                    </div>
                  </form>

                  {/* Question Feed */}
                  <div className="flex-1 overflow-y-auto max-h-[460px] space-y-3 pr-1">
                    {questions.length === 0 ? (
                      <div className="text-center py-8 text-xs text-[#94A3B8]">
                        <HelpCircle className="w-6 h-6 mx-auto text-[#64748B] mb-1.5" />
                        No questions yet. Be the first to ask!
                      </div>
                    ) : (
                      questions.map((q) => (
                        <div
                          key={q.id}
                          className={`p-3.5 rounded-2xl border text-xs space-y-2 ${
                            q.isPinned ? 'bg-[#1A365D]/40 border-[#4FD1C5]/60' : 'bg-[#071326] border-[#23426A]'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-lg bg-[#1A365D] text-[#4FD1C5] font-bold text-[10px] flex items-center justify-center">
                                {q.user?.name?.charAt(0) || 'S'}
                              </div>
                              <span className="font-bold text-white text-[11px]">{q.user?.name}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {q.isPinned && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-[#4FD1C5] bg-[#4FD1C5]/10 px-1.5 py-0.5 rounded">
                                  <Pin className="w-2.5 h-2.5" /> Pinned
                                </span>
                              )}
                              {isInstructorOrAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handlePinQuestion(q.id)}
                                  className="text-[#94A3B8] hover:text-[#4FD1C5]"
                                >
                                  <Pin className="w-3 h-3" />
                                </button>
                              )}
                              {isInstructorOrAdmin && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteQuestion(q.id)}
                                  className="text-[#94A3B8] hover:text-[#EF4444]"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          <p className="text-white text-xs leading-relaxed">{q.question}</p>

                          {q.isAnswered && q.answer && (
                            <div className="p-2.5 rounded-xl bg-[#0D1E36] border border-[#4FD1C5]/30 text-[11px] space-y-1">
                              <div className="font-bold text-[#4FD1C5] flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" />
                                <span>Answer from Instructor:</span>
                              </div>
                              <p className="text-[#CBD5E1]">{q.answer}</p>
                            </div>
                          )}

                          {isInstructorOrAdmin && answeringQuestionId === q.id && (
                            <div className="p-2.5 rounded-xl bg-[#0D1E36] border border-[#23426A] space-y-2">
                              <textarea
                                rows={2}
                                placeholder="Type answer for student..."
                                value={answerText}
                                onChange={(e) => setAnswerText(e.target.value)}
                                className="w-full p-2 bg-[#071326] border border-[#23426A] rounded-lg text-xs text-white"
                              />
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => setAnsweringQuestionId(null)}
                                  className="px-2 py-1 bg-[#334155] rounded text-[10px]"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleAnswerQuestion(q.id)}
                                  disabled={submittingAnswer || !answerText.trim()}
                                  className="px-2 py-1 bg-[#10B981] rounded text-[10px] font-bold text-white"
                                >
                                  Publish
                                </button>
                              </div>
                            </div>
                          )}

                          <div className="flex items-center justify-between pt-1">
                            <button
                              type="button"
                              onClick={() => handleUpvoteQuestion(q.id)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] ${
                                q.hasUpvoted ? 'bg-[#1A365D] border-[#4FD1C5] text-[#4FD1C5]' : 'bg-[#0D1E36] border-[#23426A] text-[#94A3B8]'
                              }`}
                            >
                              <ThumbsUp className="w-2.5 h-2.5" />
                              <span>{q.upvotes}</span>
                            </button>

                            {isInstructorOrAdmin && !q.isAnswered && answeringQuestionId !== q.id && (
                              <button
                                type="button"
                                onClick={() => {
                                  setAnsweringQuestionId(q.id);
                                  setAnswerText('');
                                }}
                                className="text-[10px] text-[#4FD1C5] font-bold hover:underline"
                              >
                                Answer Question
                              </button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: Live In-Class Chat */}
              {activeSidebarTab === 'chat' && (
                <div className="flex-1 flex flex-col justify-between space-y-3">
                  <div className="flex-1 overflow-y-auto max-h-[460px] space-y-2.5 pr-1">
                    {chatMessages.map((msg) => (
                      <div key={msg.id} className="p-3 rounded-2xl bg-[#071326] border border-[#23426A] text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`font-bold ${msg.isHost ? 'text-[#4FD1C5]' : 'text-white'}`}>
                            {msg.sender} {msg.isHost && '★ (Host)'}
                          </span>
                          <span className="text-[10px] text-[#64748B]">{msg.time}</span>
                        </div>
                        <p className="text-[#CBD5E1] text-[11px] leading-relaxed">{msg.text}</p>
                      </div>
                    ))}
                  </div>

                  <form onSubmit={handleSendChatMessage} className="flex gap-2 pt-2 border-t border-[#23426A]">
                    <input
                      type="text"
                      placeholder="Type a message to the class..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-[#071326] border border-[#23426A] rounded-xl text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#4FD1C5]"
                    />
                    <button
                      type="submit"
                      disabled={!chatInput.trim()}
                      className="px-3 py-2 bg-[#4FD1C5] hover:bg-[#38B2AC] text-[#0A1322] rounded-xl font-bold text-xs transition disabled:opacity-40"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>
                </div>
              )}

              {/* Tab 3: Attendees Roster */}
              {activeSidebarTab === 'attendees' && (
                <div className="flex-1 flex flex-col space-y-3">
                  <div className="flex items-center justify-between text-xs text-[#94A3B8] pb-2 border-b border-[#23426A]">
                    <span>Registered Attendees</span>
                    <span className="font-extrabold text-white">{session.registeredCount} Students</span>
                  </div>

                  <div className="flex-1 overflow-y-auto max-h-[460px] space-y-2">
                    {/* Host */}
                    <div className="p-3 rounded-2xl bg-[#1A365D]/30 border border-[#4FD1C5]/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#1A365D] border border-[#4FD1C5] flex items-center justify-center text-xs font-extrabold text-[#4FD1C5]">
                          {session.instructor?.name?.charAt(0) || 'K'}
                        </div>
                        <div>
                          <span className="font-bold text-white block">{session.instructor?.name}</span>
                          <span className="text-[10px] text-[#4FD1C5] font-bold uppercase">Class Host & Instructor</span>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-[#10B981]/20 text-[#10B981] text-[10px] font-bold">HOST</span>
                    </div>

                    {participants.map((p, idx) => (
                      <div key={idx} className="p-2.5 rounded-xl bg-[#071326] border border-[#23426A] flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-[#0E1D33] text-white flex items-center justify-center text-[10px] font-bold">
                            {p.user?.name?.charAt(0) || 'S'}
                          </div>
                          <span className="text-white text-xs">{p.user?.name}</span>
                        </div>
                        <span className="text-[10px] text-[#94A3B8]">Enrolled</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Class Notes & Resources */}
              {activeSidebarTab === 'resources' && (
                <div className="flex-1 flex flex-col space-y-4 text-xs">
                  <div className="p-4 rounded-2xl bg-[#071326] border border-[#23426A] space-y-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5 text-[#4FD1C5]" />
                      <span>Calendar Integration</span>
                    </span>
                    <p className="text-[11px] text-[#94A3B8]">
                      Sync this session directly with your Google Calendar, Apple iCal, or Outlook.
                    </p>
                    <a
                      href={liveSessionApi.getSessionIcsUrl(session.id)}
                      download={`live-class-${session.id}.ics`}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#1A365D] hover:bg-[#23426A] text-[#4FD1C5] font-bold text-xs transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .ics File</span>
                    </a>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#071326] border border-[#23426A] space-y-2">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5 text-[#4FD1C5]" />
                      <span>Related Course Curriculum</span>
                    </span>
                    <p className="text-[11px] text-[#94A3B8]">
                      Master prerequisites and course modules for {session.course?.title}.
                    </p>
                    <Link
                      to={`/courses/${session.course?.slug}`}
                      className="text-xs text-[#4FD1C5] font-bold hover:underline block"
                    >
                      View Course Outline →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation Modal: End Live Class */}
      {showEndModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0D1E36] border border-[#EF4444]/40 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-4 animate-scaleUp">
            <div className="w-12 h-12 rounded-2xl bg-[#EF4444]/20 border border-[#EF4444] text-[#EF4444] flex items-center justify-center mx-auto">
              <Square className="w-6 h-6 fill-current" />
            </div>

            <div className="text-center">
              <h3 className="text-lg font-extrabold text-white">End Live Class Session?</h3>
              <p className="text-xs text-[#94A3B8] mt-1.5">
                Ending the class will conclude the session for all enrolled students, record final attendance durations, and update the status to <strong>Completed</strong>.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEndModal(false)}
                className="px-5 py-2.5 rounded-xl bg-[#1E293B] hover:bg-[#334155] text-[#CBD5E1] text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmEndSession}
                disabled={endingSession}
                className="px-6 py-2.5 rounded-xl bg-[#EF4444] hover:bg-[#DC2626] text-white text-xs font-extrabold transition shadow-lg shadow-[#EF4444]/30"
              >
                {endingSession ? 'Concluding...' : 'Yes, End Class Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
