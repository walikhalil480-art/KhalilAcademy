import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { liveSessionApi, LiveSession } from '../services/liveSessionApi';
import { api } from '../services/api';
import {
  Video,
  Calendar,
  Clock,
  Users,
  Search,
  BookOpen,
  Sparkles,
  CheckCircle,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Radio,
  PlayCircle,
  CalendarCheck,
} from 'lucide-react';

export const LiveClassesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [registeringId, setRegisteringId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedCourse, setSelectedCourse] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    fetchSessions();
  }, [search, statusFilter, selectedCourse, page]);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses?limit=100');
      if (res.data?.courses) {
        setCourses(res.data.courses);
      }
    } catch (e) {}
  };

  const fetchSessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const params: any = { page, limit: 9 };
      if (search.trim()) params.search = search.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (selectedCourse) params.courseId = selectedCourse;

      const data = await liveSessionApi.getSessions(params);
      setSessions(data.sessions || []);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load live sessions.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (session: LiveSession) => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/live-classes');
      return;
    }

    setRegisteringId(session.id);
    setError(null);
    setSuccessMessage(null);
    try {
      await liveSessionApi.register(session.id);
      setSuccessMessage(`Successfully registered for "${session.title}"!`);
      // Refresh session state
      await fetchSessions();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register for session.');
    } finally {
      setRegisteringId(null);
    }
  };

  const formatSessionTime = (startTime: string, endTime: string, tz: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);

    const dateStr = start.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });

    const startTimeStr = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTimeStr = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return {
      date: dateStr,
      time: `${startTimeStr} – ${endTimeStr}`,
      timezone: tz || 'UTC',
    };
  };

  return (
    <div className="min-h-screen bg-[#071326] text-[#F8FAFC] pb-24">
      {/* Hero Header */}
      <div className="bg-gradient-to-b from-[#0A192F] to-[#071326] border-b border-[#23426A] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1A365D] border border-[#4FD1C5]/40 text-[#4FD1C5] text-xs font-semibold uppercase tracking-wider mb-4">
                <Radio className="w-3.5 h-3.5 animate-pulse text-[#EF4444]" />
                Interactive Virtual Classroom
              </div>
              <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
                Live Classes & Workshops
              </h1>
              <p className="mt-2 text-base text-[#94A3B8] max-w-2xl">
                Attend interactive live sessions with Khalil and industry experts. Ask live questions, debug real-world architectures, and accelerate your engineering mastery.
              </p>
            </div>

            {isAuthenticated && (
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to="/my-live-classes"
                  className="px-4 py-2.5 rounded-xl bg-[#1A365D] hover:bg-[#23426A] text-[#4FD1C5] border border-[#4FD1C5]/30 font-medium text-sm transition-all flex items-center gap-2 shadow-sm"
                >
                  <CalendarCheck className="w-4 h-4" />
                  My Registered Classes
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Global Notifications */}
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

        {/* Filter Controls Bar */}
        <div className="bg-[#0D1E36] border border-[#23426A] rounded-2xl p-4 sm:p-5 mb-8 shadow-lg">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748B]" />
              <input
                type="text"
                placeholder="Search live classes, topics, or courses..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-[#071326] border border-[#23426A] rounded-xl text-sm text-white placeholder-[#64748B] focus:outline-none focus:border-[#4FD1C5] transition-colors"
              />
            </div>

            {/* Course Filter */}
            <div className="sm:col-span-3">
              <select
                value={selectedCourse}
                onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-2.5 bg-[#071326] border border-[#23426A] rounded-xl text-sm text-white focus:outline-none focus:border-[#4FD1C5] transition-colors"
              >
                <option value="">All Courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Tabs */}
            <div className="sm:col-span-3 flex items-center bg-[#071326] border border-[#23426A] rounded-xl p-1">
              {[
                { label: 'All', val: 'ALL' },
                { label: 'Scheduled', val: 'SCHEDULED' },
                { label: 'Live Now', val: 'LIVE' },
                { label: 'Past', val: 'COMPLETED' },
              ].map((tab) => (
                <button
                  key={tab.val}
                  onClick={() => {
                    setStatusFilter(tab.val);
                    setPage(1);
                  }}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all text-center ${
                    statusFilter === tab.val
                      ? 'bg-[#1A365D] text-[#4FD1C5] shadow-sm'
                      : 'text-[#94A3B8] hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sessions Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div
                key={n}
                className="h-80 rounded-2xl bg-[#0D1E36]/50 border border-[#23426A] animate-pulse"
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 px-4 bg-[#0D1E36]/40 border border-[#23426A] rounded-2xl">
            <div className="w-16 h-16 rounded-2xl bg-[#1A365D]/60 flex items-center justify-center mx-auto mb-4 text-[#4FD1C5]">
              <Video className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">No live classes found</h3>
            <p className="text-sm text-[#94A3B8] max-w-md mx-auto">
              There are currently no live classes matching your filter criteria. Check back soon or try clearing your filters.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {sessions.map((session) => {
              const timeDetails = formatSessionTime(
                session.startTime,
                session.endTime,
                session.timezone
              );
              const capacityPercent = Math.min(
                100,
                Math.round((session.registeredCount / session.maxParticipants) * 100)
              );

              return (
                <div
                  key={session.id}
                  className="bg-[#0D1E36] border border-[#23426A] hover:border-[#4FD1C5]/50 rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 group shadow-lg"
                >
                  <div>
                    {/* Header: Course badge & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[11px] font-semibold tracking-wide text-[#4FD1C5] bg-[#1A365D] px-2.5 py-1 rounded-md line-clamp-1">
                        {session.course.title}
                      </span>

                      {session.dynamicStatus === 'LIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EF4444]/20 border border-[#EF4444] text-[#F87171] text-xs font-bold animate-pulse">
                          <Radio className="w-3 h-3" />
                          LIVE NOW
                        </span>
                      ) : session.dynamicStatus === 'COMPLETED' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#334155] text-[#94A3B8] text-xs font-medium">
                          Completed
                        </span>
                      ) : session.dynamicStatus === 'CANCELLED' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#7F1D1D]/40 text-[#FCA5A5] text-xs font-medium">
                          Cancelled
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-[#0369A1]/30 text-[#38BDF8] text-xs font-medium">
                          Scheduled
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <Link
                      to={`/live-classes/${session.id}`}
                      className="text-lg font-bold text-white group-hover:text-[#4FD1C5] transition-colors line-clamp-2 mb-2"
                    >
                      {session.title}
                    </Link>

                    {/* Description */}
                    {session.description && (
                      <p className="text-xs text-[#94A3B8] line-clamp-2 mb-4">
                        {session.description}
                      </p>
                    )}

                    {/* Schedule info */}
                    <div className="space-y-2 mb-4 py-3 border-y border-[#23426A]/60 text-xs text-[#CBD5E1]">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#4FD1C5] shrink-0" />
                        <span className="font-semibold">{timeDetails.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#4FD1C5] shrink-0" />
                        <span>
                          {timeDetails.time} ({timeDetails.timezone})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-[#4FD1C5] shrink-0" />
                        <span>Instructor: {session.instructor.name}</span>
                      </div>
                    </div>

                    {/* Capacity Indicator */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-[#94A3B8]">
                          {session.registeredCount} / {session.maxParticipants} Registered
                        </span>
                        <span
                          className={`font-semibold ${
                            session.isFull ? 'text-[#EF4444]' : 'text-[#4FD1C5]'
                          }`}
                        >
                          {session.isFull
                            ? 'Full'
                            : `${session.availableSeats} seat${
                                session.availableSeats !== 1 ? 's' : ''
                              } left`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-[#071326] rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            session.isFull
                              ? 'bg-[#EF4444]'
                              : capacityPercent > 80
                              ? 'bg-[#F59E0B]'
                              : 'bg-[#10B981]'
                          }`}
                          style={{ width: `${capacityPercent}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2">
                    {session.dynamicStatus === 'CANCELLED' ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl bg-[#1E293B] text-[#64748B] text-xs font-semibold cursor-not-allowed"
                      >
                        Session Cancelled
                      </button>
                    ) : session.isRegistered ? (
                      <div className="flex items-center gap-2">
                        {session.isJoinable ? (
                          <Link
                            to={`/live-classes/${session.id}`}
                            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white text-xs font-bold text-center transition-all shadow-md shadow-[#10B981]/20 flex items-center justify-center gap-1.5"
                          >
                            <Video className="w-4 h-4" />
                            Join Live Class
                          </Link>
                        ) : (
                          <Link
                            to={`/live-classes/${session.id}`}
                            className="flex-1 py-2.5 rounded-xl bg-[#1A365D] hover:bg-[#23426A] text-[#4FD1C5] border border-[#4FD1C5]/30 text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle className="w-4 h-4 text-[#10B981]" />
                            Registered (View Details)
                          </Link>
                        )}
                      </div>
                    ) : session.dynamicStatus === 'COMPLETED' ? (
                      <Link
                        to={`/live-classes/${session.id}`}
                        className="w-full py-2.5 rounded-xl bg-[#1A365D] hover:bg-[#23426A] text-white text-xs font-semibold text-center transition-all flex items-center justify-center gap-1.5"
                      >
                        {session.hasRecording ? (
                          <>
                            <PlayCircle className="w-4 h-4 text-[#4FD1C5]" />
                            Watch Recording
                          </>
                        ) : (
                          'View Session Details'
                        )}
                      </Link>
                    ) : session.isFull ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl bg-[#334155]/60 text-[#94A3B8] text-xs font-semibold cursor-not-allowed"
                      >
                        Session Full
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRegister(session)}
                        disabled={registeringId === session.id}
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] hover:from-[#0369A1] hover:to-[#0284C7] text-white text-xs font-bold transition-all shadow-md shadow-[#0284C7]/20 flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        {registeringId === session.id ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Registering...
                          </span>
                        ) : (
                          <>
                            <CalendarCheck className="w-4 h-4" />
                            Register for Session
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-12">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 rounded-xl bg-[#0D1E36] border border-[#23426A] text-sm text-[#94A3B8] hover:text-white disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-[#94A3B8]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl bg-[#0D1E36] border border-[#23426A] text-sm text-[#94A3B8] hover:text-white disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
