import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { liveSessionApi } from '../services/liveSessionApi';
import {
  Calendar,
  Clock,
  Video,
  Radio,
  Download,
  PlayCircle,
  AlertCircle,
  CheckCircle2,
  Trash2,
  CalendarCheck,
  ChevronRight,
} from 'lucide-react';

export const MyLiveClassesPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [activeTab, setActiveTab] = useState<'upcoming' | 'today' | 'live' | 'completed' | 'cancelled'>('upcoming');
  const [data, setData] = useState<any>({
    all: [],
    upcoming: [],
    today: [],
    live: [],
    completed: [],
    cancelled: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/my-live-classes');
      return;
    }
    fetchMySessions();
  }, [isAuthenticated]);

  const fetchMySessions = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await liveSessionApi.getMySessions();
      setData(res);
      // If there are live sessions, default to live tab
      if (res.live && res.live.length > 0) {
        setActiveTab('live');
      } else if (res.today && res.today.length > 0) {
        setActiveTab('today');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load your live classes.');
    } finally {
      setLoading(false);
    }
  };

  const handleUnregister = async (sessionId: string, title: string) => {
    if (!window.confirm(`Are you sure you want to unregister from "${title}"?`)) return;

    setActionLoadingId(sessionId);
    try {
      await liveSessionApi.unregister(sessionId);
      await fetchMySessions();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to unregister from session.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const currentList = data[activeTab] || [];

  return (
    <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white pb-24 transition-colors">
      {/* Page Header */}
      <div className="bg-white dark:bg-[#0B223D] border-b border-slate-200 dark:border-[#1E3A56] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#087F78] dark:text-[#14B8A6] font-mono uppercase tracking-wider mb-2">
              <CalendarCheck className="w-4 h-4" />
              Student Live Schedule
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F3A] dark:text-white tracking-tight">
              My Live Classes
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Manage your registered live interactive sessions, export calendar invites, and join live rooms.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href={liveSessionApi.getUserIcsUrl()}
              download="my-live-classes.ics"
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-bold text-xs transition-all flex items-center gap-2 shadow-xs"
            >
              <Download className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
              Export All to Calendar (.ics)
            </a>
            <Link
              to="/live-classes"
              className="px-4 py-2.5 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs"
            >
              Discover More Classes
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-[#EF4444] flex items-center gap-3 text-xs">
            <AlertCircle className="w-5 h-5 shrink-0 text-[#EF4444]" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-slate-200 dark:border-[#1E3A56] pb-4 mb-8 overflow-x-auto">
          {[
            { id: 'upcoming', label: 'Upcoming', count: data.upcoming?.length || 0 },
            { id: 'today', label: 'Today', count: data.today?.length || 0 },
            { id: 'live', label: 'Live Now', count: data.live?.length || 0, isLive: true },
            { id: 'completed', label: 'Completed', count: data.completed?.length || 0 },
            { id: 'cancelled', label: 'Cancelled', count: data.cancelled?.length || 0 },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#087F78] text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-300 hover:text-[#0B1F3A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-slate-700'
              }`}
            >
              {tab.isLive && tab.count > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-ping" />
              )}
              {tab.label}
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                  activeTab === tab.id
                    ? 'bg-white dark:bg-[#102A43]/20 dark:bg-[#07182D]/20 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Tab Content List */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-36 rounded-2xl bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] animate-pulse shadow-xs"
              />
            ))}
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-16 px-4 bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-2xl shadow-xs">
            <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white mb-1">
              No {activeTab} live classes
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#A9BACB] mb-4">
              {activeTab === 'upcoming'
                ? "You haven't registered for any upcoming live classes yet."
                : `No sessions found in the ${activeTab} category.`}
            </p>
            <Link
              to="/live-classes"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white text-xs font-bold transition-colors shadow-xs"
            >
              Browse Upcoming Live Classes
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {currentList.map((session: any) => {
              const start = new Date(session.startTime);
              const end = new Date(session.endTime);
              const dateStr = start.toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });
              const timeStr = `${start.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })} – ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

              return (
                <div
                  key={session.id}
                  className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] hover:border-[#087F78]/40 dark:hover:border-[#14B8A6]/40 rounded-2xl p-5 sm:p-6 transition-all duration-200 shadow-xs hover:shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#087F78] dark:text-[#14B8A6] bg-teal-50 dark:bg-[#087F78]/30 px-2.5 py-0.5 rounded-md">
                        {session.course?.title}
                      </span>

                      {session.dynamicStatus === 'LIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[#EF4444] text-[11px] font-bold animate-pulse">
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

                    <Link
                      to={`/live-classes/${session.id}`}
                      className="text-lg font-bold text-[#0B1F3A] dark:text-white hover:text-[#087F78] dark:hover:text-[#14B8A6] transition-colors line-clamp-1 mb-2"
                    >
                      {session.title}
                    </Link>

                    <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#087F78] dark:text-[#14B8A6]" />
                        <span className="font-bold text-[#0B1F3A] dark:text-white">{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#087F78] dark:text-[#14B8A6]" />
                        <span>
                          {timeStr} ({session.timezone || 'UTC'})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                        <span>Instructor: {session.instructor?.name}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Right Side */}
                  <div className="flex flex-wrap items-center gap-3 shrink-0">
                    {/* Calendar ICS Export */}
                    <a
                      href={liveSessionApi.getSessionIcsUrl(session.id)}
                      download={`live-class-${session.id}.ics`}
                      title="Add to Calendar (.ics)"
                      className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-colors shadow-xs"
                    >
                      <Download className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
                    </a>

                    {/* Join / View Recording / Details */}
                    {session.dynamicStatus === 'CANCELLED' ? (
                      <span className="text-xs text-slate-400">Session Cancelled</span>
                    ) : session.isJoinable ? (
                      <Link
                        to={`/live-classes/${session.id}`}
                        className="px-5 py-2.5 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white text-xs font-bold transition-all shadow-xs flex items-center gap-2"
                      >
                        <Video className="w-4 h-4" />
                        Join Virtual Room
                      </Link>
                    ) : session.dynamicStatus === 'COMPLETED' ? (
                      <Link
                        to={`/live-classes/${session.id}`}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#0B1F3A] dark:text-white text-xs font-bold transition-all flex items-center gap-2 border border-slate-200 dark:border-slate-700 shadow-xs"
                      >
                        {session.recordingUrl ? (
                          <>
                            <PlayCircle className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
                            Watch Recording
                          </>
                        ) : (
                          'View Session Details'
                        )}
                      </Link>
                    ) : (
                      <Link
                        to={`/live-classes/${session.id}`}
                        className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-[#087F78] dark:text-[#14B8A6] border border-slate-200 dark:border-slate-700 text-xs font-bold transition-all shadow-xs"
                      >
                        Session Hub & Q&A
                      </Link>
                    )}

                    {/* Unregister button for upcoming sessions */}
                    {session.dynamicStatus === 'SCHEDULED' && (
                      <button
                        onClick={() => handleUnregister(session.id, session.title)}
                        disabled={actionLoadingId === session.id}
                        title="Unregister from this session"
                        className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/60 text-[#EF4444] border border-red-200 dark:border-red-800 transition-colors disabled:opacity-40"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
