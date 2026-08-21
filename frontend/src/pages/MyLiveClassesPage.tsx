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
    <div className="min-h-screen bg-[#071326] text-[#F8FAFC] pb-24">
      {/* Page Header */}
      <div className="bg-gradient-to-b from-[#0A192F] to-[#071326] border-b border-[#23426A] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#4FD1C5] uppercase tracking-wider mb-2">
              <CalendarCheck className="w-4 h-4" />
              Student Live Schedule
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              My Live Classes
            </h1>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Manage your registered live interactive sessions, export calendar invites, and join live rooms.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <a
              href={liveSessionApi.getUserIcsUrl()}
              download="my-live-classes.ics"
              className="px-4 py-2.5 rounded-xl bg-[#1A365D] hover:bg-[#23426A] text-[#4FD1C5] border border-[#4FD1C5]/30 font-medium text-xs transition-all flex items-center gap-2 shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export All to Calendar (.ics)
            </a>
            <Link
              to="/live-classes"
              className="px-4 py-2.5 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-medium text-xs transition-all flex items-center gap-1.5 shadow-sm"
            >
              Discover More Classes
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#7F1D1D]/80 border border-[#EF4444] text-[#FECACA] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-[#EF4444]" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-b border-[#23426A] pb-4 mb-8 overflow-x-auto">
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
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === tab.id
                  ? 'bg-[#1A365D] text-[#4FD1C5] border border-[#4FD1C5]/40 shadow-sm'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#0D1E36]'
              }`}
            >
              {tab.isLive && tab.count > 0 && (
                <span className="w-2 h-2 rounded-full bg-[#EF4444] animate-ping" />
              )}
              {tab.label}
              <span
                className={`px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.id
                    ? 'bg-[#071326] text-[#4FD1C5]'
                    : 'bg-[#1E293B] text-[#64748B]'
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
                className="h-36 rounded-2xl bg-[#0D1E36]/50 border border-[#23426A] animate-pulse"
              />
            ))}
          </div>
        ) : currentList.length === 0 ? (
          <div className="text-center py-16 px-4 bg-[#0D1E36]/30 border border-[#23426A] rounded-2xl">
            <Calendar className="w-10 h-10 text-[#64748B] mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">
              No {activeTab} live classes
            </h3>
            <p className="text-xs text-[#94A3B8] mb-4">
              {activeTab === 'upcoming'
                ? "You haven't registered for any upcoming live classes yet."
                : `No sessions found in the ${activeTab} category.`}
            </p>
            <Link
              to="/live-classes"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white text-xs font-semibold transition-colors"
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
                  className="bg-[#0D1E36] border border-[#23426A] hover:border-[#4FD1C5]/40 rounded-2xl p-5 sm:p-6 transition-all duration-300 shadow-md flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className="text-[11px] font-semibold text-[#4FD1C5] bg-[#1A365D] px-2.5 py-0.5 rounded-md">
                        {session.course?.title}
                      </span>

                      {session.dynamicStatus === 'LIVE' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#EF4444]/20 border border-[#EF4444] text-[#F87171] text-xs font-bold animate-pulse">
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

                    <Link
                      to={`/live-classes/${session.id}`}
                      className="text-lg sm:text-xl font-bold text-white hover:text-[#4FD1C5] transition-colors line-clamp-1 mb-2"
                    >
                      {session.title}
                    </Link>

                    <div className="flex flex-wrap items-center gap-y-2 gap-x-5 text-xs text-[#CBD5E1]">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-[#4FD1C5]" />
                        <span>{dateStr}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#4FD1C5]" />
                        <span>
                          {timeStr} ({session.timezone || 'UTC'})
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[#94A3B8]">
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
                      className="p-2.5 rounded-xl bg-[#071326] hover:bg-[#1A365D] text-[#94A3B8] hover:text-[#4FD1C5] border border-[#23426A] transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </a>

                    {/* Join / View Recording / Details */}
                    {session.dynamicStatus === 'CANCELLED' ? (
                      <span className="text-xs text-[#94A3B8]">Session Cancelled</span>
                    ) : session.isJoinable ? (
                      <Link
                        to={`/live-classes/${session.id}`}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#10B981] to-[#059669] hover:from-[#059669] hover:to-[#047857] text-white text-xs font-bold transition-all shadow-md shadow-[#10B981]/20 flex items-center gap-2"
                      >
                        <Video className="w-4 h-4" />
                        Join Virtual Room
                      </Link>
                    ) : session.dynamicStatus === 'COMPLETED' ? (
                      <Link
                        to={`/live-classes/${session.id}`}
                        className="px-4 py-2.5 rounded-xl bg-[#1A365D] hover:bg-[#23426A] text-white text-xs font-semibold transition-all flex items-center gap-2"
                      >
                        {session.recordingUrl ? (
                          <>
                            <PlayCircle className="w-4 h-4 text-[#4FD1C5]" />
                            Watch Recording
                          </>
                        ) : (
                          'View Session Details'
                        )}
                      </Link>
                    ) : (
                      <Link
                        to={`/live-classes/${session.id}`}
                        className="px-4 py-2.5 rounded-xl bg-[#1A365D] hover:bg-[#23426A] text-[#4FD1C5] border border-[#4FD1C5]/30 text-xs font-semibold transition-all"
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
                        className="p-2.5 rounded-xl bg-[#7F1D1D]/20 hover:bg-[#7F1D1D]/50 text-[#FCA5A5] border border-[#EF4444]/30 transition-colors disabled:opacity-40"
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
