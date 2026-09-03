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
    <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white pb-24 transition-colors">
      {/* Hero Header */}
      <div className="bg-white dark:bg-[#0B223D] border-b border-slate-200 dark:border-[#1E3A56] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 dark:bg-[#087F78]/30 border border-[#087F78]/20 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] text-xs font-bold font-mono uppercase tracking-wider mb-3">
                <Radio className="w-3.5 h-3.5 animate-pulse text-[#EF4444]" />
                Interactive Virtual Classroom
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#0B1F3A] dark:text-white">
                Live Classes & Workshops
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl leading-relaxed">
                Attend interactive live sessions with Khalil and industry experts. Ask live questions, debug real-world architectures, and accelerate your engineering mastery.
              </p>
            </div>

            {isAuthenticated && (
              <div className="flex items-center gap-3 shrink-0">
                <Link
                  to="/my-live-classes"
                  className="px-4 py-2.5 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs transition-all flex items-center gap-2 shadow-xs"
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
          <div className="mb-6 p-4 rounded-xl bg-teal-50 dark:bg-[#087F78]/20 border border-teal-200 dark:border-teal-700 text-[#087F78] dark:text-[#14B8A6] flex items-center gap-3 animate-fadeIn font-bold text-xs">
            <CheckCircle className="w-5 h-5 shrink-0 text-[#087F78] dark:text-[#14B8A6]" />
            <span>{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-[#EF4444] flex items-center gap-3 animate-fadeIn text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-[#EF4444]" />
            <span>{error}</span>
          </div>
        )}

        {/* Filter Controls Bar */}
        <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl p-4 sm:p-5 mb-8 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            {/* Search Input */}
            <div className="sm:col-span-6 relative">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
              <input
                type="text"
                placeholder="Search live classes, topics, or courses..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-[#0B1F3A] dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78] transition-colors"
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
                className="w-full px-3 py-2.5 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78] transition-colors"
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
            <div className="sm:col-span-3 flex items-center bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl p-1">
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
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all text-center ${
                    statusFilter === tab.val
                      ? 'bg-[#087F78] text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-[#0B1F3A] dark:hover:text-white'
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
                className="h-80 rounded-2xl bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] animate-pulse shadow-xs"
              />
            ))}
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-2xl shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4 text-[#087F78]">
              <Video className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-[#0B1F3A] dark:text-white mb-1">No live classes found</h3>
            <p className="text-xs text-slate-500 dark:text-[#A9BACB] max-w-md mx-auto">
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
                  className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] hover:border-[#087F78]/50 dark:hover:border-[#14B8A6]/50 rounded-2xl p-5 flex flex-col justify-between transition-all duration-200 group shadow-xs hover:shadow-md"
                >
                  <div>
                    {/* Header: Course badge & Status */}
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#087F78] dark:text-[#14B8A6] bg-teal-50 dark:bg-[#087F78]/30 px-2.5 py-1 rounded-md line-clamp-1">
                        {session.course.title}
                      </span>

                      {session.dynamicStatus === 'LIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[#EF4444] text-[11px] font-bold animate-pulse">
                          <Radio className="w-3 h-3" />
                          LIVE NOW
                        </span>
                      ) : session.dynamicStatus === 'COMPLETED' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-xs font-medium">
                          Completed
                        </span>
                      ) : session.dynamicStatus === 'CANCELLED' ? (
                        <span className="px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 text-[#EF4444] text-xs font-medium">
                          Cancelled
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-xs font-bold font-mono">
                          Scheduled
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <Link
                      to={`/live-classes/${session.id}`}
                      className="text-base font-bold text-[#0B1F3A] dark:text-white group-hover:text-[#087F78] dark:group-hover:text-[#14B8A6] transition-colors line-clamp-2 mb-2"
                    >
                      {session.title}
                    </Link>

                    {/* Description */}
                    {session.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                        {session.description}
                      </p>
                    )}

                    {/* Schedule info */}
                    <div className="space-y-2 mb-4 py-3 border-y border-slate-100 dark:border-[#1E3A56] text-xs text-slate-600 dark:text-slate-400 font-medium">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-[#087F78] dark:text-[#14B8A6] shrink-0" />
                        <span className="font-bold text-[#0B1F3A] dark:text-white">{timeDetails.date}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5 text-[#087F78] dark:text-[#14B8A6] shrink-0" />
                        <span>
                          {timeDetails.time} ({timeDetails.timezone})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-3.5 h-3.5 text-[#087F78] dark:text-[#14B8A6] shrink-0" />
                        <span>Instructor: {session.instructor.name}</span>
                      </div>
                    </div>

                    {/* Capacity Indicator */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="text-slate-500 dark:text-[#A9BACB]">
                          {session.registeredCount} / {session.maxParticipants} Registered
                        </span>
                        <span
                          className={`font-bold ${
                            session.isFull ? 'text-[#EF4444]' : 'text-[#087F78]'
                          }`}
                        >
                          {session.isFull
                            ? 'Full'
                            : `${session.availableSeats} seat${
                                session.availableSeats !== 1 ? 's' : ''
                              } left`}
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-[#0B223D] rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all duration-500 rounded-full ${
                            session.isFull
                              ? 'bg-[#EF4444]'
                              : capacityPercent > 80
                              ? 'bg-[#F59E0B]'
                              : 'bg-[#087F78]'
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
                        className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#0B223D] text-slate-400 text-xs font-bold cursor-not-allowed"
                      >
                        Session Cancelled
                      </button>
                    ) : session.isRegistered ? (
                      <div className="flex items-center gap-2">
                        {session.isJoinable ? (
                          <Link
                            to={`/live-classes/${session.id}`}
                            className="flex-1 py-2.5 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white text-xs font-bold text-center transition-all shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <Video className="w-4 h-4" />
                            Join Live Class
                          </Link>
                        ) : (
                          <Link
                            to={`/live-classes/${session.id}`}
                            className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-[#0B223D] hover:bg-slate-200 dark:hover:bg-[#1E3A56] dark:bg-[#0B223D] text-[#0B1F3A] dark:text-white border border-slate-200 dark:border-[#1E3A56] text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle className="w-4 h-4 text-[#10B981]" />
                            Registered (View Details)
                          </Link>
                        )}
                      </div>
                    ) : session.dynamicStatus === 'COMPLETED' ? (
                      <Link
                        to={`/live-classes/${session.id}`}
                        className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#0B223D] hover:bg-slate-200 dark:hover:bg-[#1E3A56] dark:bg-[#0B223D] text-[#0B1F3A] dark:text-white text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 border border-slate-200 dark:border-[#1E3A56]"
                      >
                        {session.hasRecording ? (
                          <>
                            <PlayCircle className="w-4 h-4 text-[#087F78]" />
                            Watch Recording
                          </>
                        ) : (
                          'View Session Details'
                        )}
                      </Link>
                    ) : session.isFull ? (
                      <button
                        disabled
                        className="w-full py-2.5 rounded-xl bg-slate-100 dark:bg-[#0B223D] text-slate-400 text-xs font-bold cursor-not-allowed"
                      >
                        Session Full
                      </button>
                    ) : (
                      <button
                        onClick={() => handleRegister(session)}
                        disabled={registeringId === session.id}
                        className="w-full py-2.5 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
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
              className="px-4 py-2 rounded-xl bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] text-xs font-bold text-slate-600 dark:text-[#A9BACB] hover:text-[#0B1F3A] disabled:opacity-40 transition-colors shadow-xs"
            >
              Previous
            </button>
            <span className="text-xs font-mono text-slate-500 dark:text-[#A9BACB]">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="px-4 py-2 rounded-xl bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] text-xs font-bold text-slate-600 dark:text-[#A9BACB] hover:text-[#0B1F3A] disabled:opacity-40 transition-colors shadow-xs"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
