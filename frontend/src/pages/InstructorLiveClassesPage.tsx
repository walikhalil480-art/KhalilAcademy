import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { liveSessionApi, LiveSession, LiveSessionAttendance } from '../services/liveSessionApi';
import { api } from '../services/api';
import {
  Video,
  Plus,
  Calendar,
  Clock,
  Users,
  Edit2,
  Trash2,
  Radio,
  PlayCircle,
  CheckCircle,
  AlertCircle,
  X,
  Shield,
  Eye,
  Settings,
  ExternalLink,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

export const InstructorLiveClassesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSession, setEditingSession] = useState<LiveSession | null>(null);
  const [attendanceSession, setAttendanceSession] = useState<LiveSession | null>(null);
  const [attendances, setAttendances] = useState<LiveSessionAttendance[]>([]);
  const [recordingSession, setRecordingSession] = useState<LiveSession | null>(null);

  // Form State
  const [formData, setFormData] = useState<any>({
    title: '',
    description: '',
    courseId: '',
    startTime: '',
    endTime: '',
    timezone: 'UTC',
    maxParticipants: 50,
    meetingProvider: 'EXTERNAL',
    meetingUrl: '',
    meetingId: '',
    meetingPasscode: '',
    attendanceThresholdPercent: 70,
    joinBufferMinutes: 15,
  });
  const [submittingForm, setSubmittingForm] = useState(false);

  // Recording Form State
  const [recordingData, setRecordingData] = useState({
    recordingUrl: '',
    recordingTitle: '',
    durationMinutes: 60,
  });

  const isPrivileged =
    user && (user.role === 'INSTRUCTOR' || user.role === 'ADMIN' || user.role === 'SUPER_ADMIN');

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=/instructor/live-classes');
      return;
    }
    if (!isPrivileged) {
      navigate('/dashboard');
      return;
    }
    loadData();
  }, [isAuthenticated, isPrivileged]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessRes, courseRes] = await Promise.all([
        liveSessionApi.getSessions({ limit: 100 }),
        api.get('/courses?limit=100'),
      ]);
      setSessions(sessRes.sessions || []);
      setCourses(courseRes.data?.courses || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load instructor live sessions.');
    } finally {
      setLoading(false);
    }
  };

  const generateInstantRoomLink = () => {
    const randomId = Math.random().toString(36).substring(2, 7) + Math.random().toString(36).substring(2, 6);
    const roomName = `KhalilAcademy-Live-${randomId}`;
    const generatedUrl = `https://meet.jit.si/${roomName}`;
    setFormData((prev: any) => ({
      ...prev,
      meetingProvider: 'EXTERNAL',
      meetingUrl: generatedUrl,
      meetingId: roomName,
    }));
  };

  const handleOpenCreate = () => {
    setEditingSession(null);
    const randomId = Math.random().toString(36).substring(2, 7) + Math.random().toString(36).substring(2, 6);
    const defaultRoom = `KhalilAcademy-Live-${randomId}`;
    setFormData({
      title: '',
      description: '',
      courseId: courses[0]?.id || '',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      endTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString().slice(0, 16),
      timezone: 'Africa/Nairobi',
      maxParticipants: 50,
      meetingProvider: 'EXTERNAL',
      meetingUrl: `https://meet.jit.si/${defaultRoom}`,
      meetingId: defaultRoom,
      meetingPasscode: '',
      attendanceThresholdPercent: 70,
      joinBufferMinutes: 15,
    });
    setShowCreateModal(true);
  };

  const handleOpenEdit = (sess: LiveSession) => {
    setEditingSession(sess);
    setFormData({
      title: sess.title,
      description: sess.description || '',
      courseId: sess.courseId,
      startTime: new Date(sess.startTime).toISOString().slice(0, 16),
      endTime: new Date(sess.endTime).toISOString().slice(0, 16),
      timezone: sess.timezone || 'Africa/Nairobi',
      maxParticipants: sess.maxParticipants,
      meetingProvider: sess.meetingProvider,
      meetingUrl: sess.meetingUrl || '',
      meetingId: sess.meetingId || '',
      meetingPasscode: sess.meetingPasscode || '',
      attendanceThresholdPercent: sess.attendanceThresholdPercent,
      joinBufferMinutes: sess.joinBufferMinutes,
    });
    setShowCreateModal(true);
  };

  const handleSaveSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingForm(true);
    setError(null);
    try {
      const submissionData = { ...formData };
      if (!submissionData.meetingUrl || !submissionData.meetingUrl.trim()) {
        const randomId = Math.random().toString(36).substring(2, 7) + Math.random().toString(36).substring(2, 6);
        submissionData.meetingUrl = `https://meet.jit.si/KhalilAcademy-Live-${randomId}`;
        submissionData.meetingId = `KhalilAcademy-Live-${randomId}`;
      }

      if (editingSession) {
        await liveSessionApi.updateSession(editingSession.id, submissionData);
        setSuccessMessage('Live session updated successfully.');
      } else {
        await liveSessionApi.createSession(submissionData);
        setSuccessMessage('New live session scheduled successfully.');
      }
      setShowCreateModal(false);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save live session.');
    } finally {
      setSubmittingForm(false);
    }
  };

  const handleCancelSession = async (sess: LiveSession) => {
    if (!window.confirm(`Are you sure you want to cancel "${sess.title}"? Students will be notified.`))
      return;
    try {
      await liveSessionApi.cancelSession(sess.id);
      setSuccessMessage(`Session "${sess.title}" has been cancelled.`);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to cancel session.');
    }
  };

  const handleDeleteSession = async (sess: LiveSession) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${sess.title}"?`)) return;
    try {
      await liveSessionApi.deleteSession(sess.id);
      setSuccessMessage(`Session "${sess.title}" deleted.`);
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete session.');
    }
  };

  const handleOpenAttendance = async (sess: LiveSession) => {
    setAttendanceSession(sess);
    try {
      const atts = await liveSessionApi.getAttendance(sess.id);
      setAttendances(atts);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to load attendance.');
    }
  };

  const handleUpdateAttendanceStatus = async (
    userId: string,
    newStatus: string,
    durationMinutes: number
  ) => {
    if (!attendanceSession) return;
    try {
      await liveSessionApi.updateAttendanceStatus(attendanceSession.id, userId, {
        status: newStatus,
        durationMinutes,
      });
      const updatedAtts = await liveSessionApi.getAttendance(attendanceSession.id);
      setAttendances(updatedAtts);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update attendance.');
    }
  };

  const handleOpenRecording = (sess: LiveSession) => {
    setRecordingSession(sess);
    setRecordingData({
      recordingUrl: sess.recordingUrl || '',
      recordingTitle: sess.recordingTitle || `${sess.title} - Full Recording`,
      durationMinutes: sess.recordingDurationMinutes || 60,
    });
  };

  const handleSaveRecording = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recordingSession) return;
    try {
      await liveSessionApi.attachRecording(recordingSession.id, recordingData);
      setSuccessMessage('Recording attached and registered students notified.');
      setRecordingSession(null);
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to attach recording.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F1F5F7] dark:bg-[#07182D] text-[#0B1F3A] dark:text-white pb-24 font-sans transition-colors">
      {/* Top Banner */}
      <div className="bg-white dark:bg-[#102A43] border-b border-slate-200 dark:border-[#1E3A56] py-10 px-4 sm:px-6 lg:px-8 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-[#087F78] uppercase tracking-wider mb-2 font-mono">
              <Shield className="w-4 h-4" />
              Instructor / Admin Console
            </div>
            <h1 className="text-3xl font-extrabold text-[#0B1F3A] dark:text-white tracking-tight">
              Live Session Management
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-[#A9BACB]">
              Schedule live virtual classes, manage attendee capacity, track student attendance duration, and upload session recordings.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-5 py-3 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-xs transition-all shadow-xs flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Schedule New Live Class
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Feedback Notifications */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-teal-50 border border-teal-200 text-[#087F78] flex items-center gap-3">
            <CheckCircle className="w-5 h-5 shrink-0 text-[#087F78]" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-[#EF4444] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-[#EF4444]" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Sessions Table */}
        <div className="bg-white dark:bg-[#102A43] border border-slate-200/90 dark:border-[#1E3A56] rounded-2xl overflow-hidden shadow-xs">
          <div className="p-5 border-b border-slate-100 dark:border-[#1E3A56] flex items-center justify-between">
            <h2 className="text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
              <Video className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
              <span>Scheduled Live Sessions ({sessions.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-slate-400">Loading live sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center">
              <Video className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white mb-1">No live classes scheduled</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                You haven't scheduled any live sessions yet. Click below to create your first session.
              </p>
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 rounded-xl bg-[#087F78] text-white text-xs font-bold shadow-xs"
              >
                Schedule Session
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
                <thead className="bg-slate-50 dark:bg-[#152F4A] text-slate-500 dark:text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-200 dark:border-slate-700 font-mono">
                  <tr>
                    <th className="py-3.5 px-4 font-bold">Course & Title</th>
                    <th className="py-3.5 px-4 font-bold">Date & Time</th>
                    <th className="py-3.5 px-4 font-bold">Registered</th>
                    <th className="py-3.5 px-4 font-bold">Status</th>
                    <th className="py-3.5 px-4 font-bold">Meeting Provider</th>
                    <th className="py-3.5 px-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-[#1E3A56]">
                  {sessions.map((sess) => {
                    const start = new Date(sess.startTime);
                    return (
                      <tr key={sess.id} className="hover:bg-slate-50 dark:bg-[#152F4A] dark:hover:bg-slate-800/60 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-bold text-[#0B1F3A] dark:text-white text-sm line-clamp-1">{sess.title}</div>
                          <div className="text-[11px] text-[#087F78] dark:text-[#14B8A6] font-semibold">{sess.course?.title}</div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-bold text-[#0B1F3A] dark:text-white">
                            {start.toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                            ({sess.timezone || 'UTC'})
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="font-bold text-[#0B1F3A] dark:text-white font-mono">
                            {sess.registeredCount} / {sess.maxParticipants}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          {sess.dynamicStatus === 'LIVE' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 text-[#EF4444] text-[10px] font-bold">
                              LIVE NOW
                            </span>
                          ) : sess.dynamicStatus === 'COMPLETED' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-bold">
                              Completed
                            </span>
                          ) : sess.dynamicStatus === 'CANCELLED' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-red-50 dark:bg-red-950/30 text-[#EF4444] text-[10px] font-bold">
                              Cancelled
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-[#087F78]/20 text-[#087F78] dark:text-[#14B8A6] border border-teal-200 dark:border-teal-700/50 text-[10px] font-bold">
                              Scheduled
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-teal-50 dark:bg-[#087F78]/20 text-[#087F78] dark:text-[#14B8A6] text-[10px] font-mono font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#087F78] dark:bg-[#14B8A6]" />
                            <span>In-Platform Studio</span>
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/live-classes/${sess.id}`}
                              className="px-3 py-1.5 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white font-bold text-[11px] transition-all flex items-center gap-1.5 shadow-xs"
                            >
                              <Video className="w-3.5 h-3.5" />
                              <span>Go Live</span>
                            </Link>

                            <Link
                              to={`/live-classes/${sess.id}`}
                              title="View Virtual Classroom"
                              className="p-1.5 rounded-lg bg-slate-50 dark:bg-[#152F4A] text-slate-500 dark:text-slate-400 hover:text-[#087F78] dark:hover:text-[#14B8A6] hover:bg-slate-100 dark:hover:bg-[#0B223D] transition-colors border border-slate-200 dark:border-slate-700"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            <button
                              onClick={() => handleOpenAttendance(sess)}
                              title="Manage Attendance Duration"
                              className="p-1.5 rounded-lg bg-teal-50 dark:bg-[#087F78]/20 text-[#087F78] dark:text-[#14B8A6] hover:bg-teal-100 transition-colors border border-teal-200 dark:border-teal-700/50"
                            >
                              <Users className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenRecording(sess)}
                              title="Attach Session Recording"
                              className="p-1.5 rounded-lg bg-teal-50 dark:bg-[#087F78]/20 text-[#087F78] dark:text-[#14B8A6] hover:bg-teal-100 transition-colors border border-teal-200 dark:border-teal-700/50"
                            >
                              <PlayCircle className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenEdit(sess)}
                              title="Edit Session"
                              className="p-1.5 rounded-lg bg-slate-50 dark:bg-[#152F4A] text-slate-500 dark:text-slate-400 hover:text-[#0B1F3A] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#0B223D] transition-colors border border-slate-200 dark:border-slate-700"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {sess.dynamicStatus !== 'CANCELLED' && (
                              <button
                                onClick={() => handleCancelSession(sess)}
                                title="Cancel Session"
                                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-[#EF4444] hover:bg-red-100 transition-colors border border-red-200 dark:border-red-800"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteSession(sess)}
                              title="Delete Session"
                              className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 text-[#EF4444] hover:bg-red-100 transition-colors border border-red-200 dark:border-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CREATE / EDIT SESSION MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] text-[#0B1F3A] dark:text-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl transition-colors">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E3A56] pb-4 mb-6">
              <h3 className="text-lg font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-[#087F78] dark:text-[#14B8A6]" />
                {editingSession ? 'Edit Live Class' : 'Schedule Live Class'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-700 dark:text-[#A9BACB] dark:hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 uppercase tracking-wider">Session Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Live Workshop: Deploying Production Microservices"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78]"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 uppercase tracking-wider">Associated Course *</label>
                <select
                  required
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78]"
                >
                  <option value="">Select Course</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 uppercase tracking-wider">Description</label>
                <textarea
                  rows={3}
                  placeholder="What topics and hands-on exercises will be covered in this live session?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 uppercase tracking-wider">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 uppercase tracking-wider">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 uppercase tracking-wider">Timezone</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78]"
                  >
                    <option value="Africa/Nairobi">EAT (Nairobi / East Africa)</option>
                    <option value="UTC">UTC</option>
                    <option value="Europe/London">GMT / London</option>
                    <option value="America/New_York">EST / New York</option>
                    <option value="America/Los_Angeles">PST / San Francisco</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 uppercase tracking-wider">Max Capacity</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={formData.maxParticipants}
                    onChange={(e) =>
                      setFormData({ ...formData, maxParticipants: parseInt(e.target.value, 10) })
                    }
                    className="w-full p-2.5 bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 rounded-xl text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] focus:border-[#087F78]"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1 uppercase tracking-wider">Virtual Classroom</label>
                  <div className="p-3.5 rounded-xl bg-teal-50/70 dark:bg-[#087F78]/20 border border-teal-200/80 dark:border-teal-700/50 text-[#087F78] dark:text-[#14B8A6] font-bold text-xs flex items-center gap-2">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>In-Platform Live Classroom (Embedded inside Khalil Academy)</span>
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-[#152F4A] border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                <div className="font-bold text-[#0B1F3A] dark:text-white flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-[#087F78] dark:text-[#14B8A6]" />
                  <span>Native Video & Screen Sharing Room</span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  A private, secure virtual classroom with camera, mic, and screen sharing will be created automatically. Students will watch and participate directly inside Khalil Academy without third-party apps.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#1E3A56]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="px-5 py-2 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white font-bold disabled:opacity-50 shadow-xs"
                >
                  {submittingForm ? 'Saving...' : editingSession ? 'Update Session' : 'Schedule Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ATTENDANCE MODAL */}
      {attendanceSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E3A56] pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#087F78]" />
                  Attendance Tracking: {attendanceSession.title}
                </h3>
                <div className="text-xs text-slate-500 dark:text-[#A9BACB] font-mono">
                  Configured Threshold: {attendanceSession.attendanceThresholdPercent}% of class duration
                </div>
              </div>
              <button
                onClick={() => setAttendanceSession(null)}
                className="text-slate-400 hover:text-slate-700 dark:text-[#A9BACB] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {attendances.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">
                No student has joined this virtual classroom yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 dark:text-[#A9BACB]">
                  <thead className="bg-slate-50 dark:bg-[#152F4A] text-slate-500 dark:text-[#A9BACB] uppercase text-[10px] font-mono">
                    <tr>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Joined</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Manual Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#1E3A56]">
                    {attendances.map((att) => (
                      <tr key={att.id}>
                        <td className="py-3 px-3">
                          <div className="font-bold text-[#0B1F3A] dark:text-white">{att.user?.name}</div>
                          <div className="text-[10px] text-slate-400">{att.user?.email}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 dark:text-[#A9BACB]">
                          {new Date(att.joinedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3 text-[#0B1F3A] dark:text-white font-mono font-bold">
                          {att.durationMinutes} mins
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                              att.status === 'PRESENT'
                                ? 'bg-teal-50 text-[#087F78]'
                                : att.status === 'PARTIAL'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-red-50 text-[#EF4444]'
                            }`}
                          >
                            {att.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {['PRESENT', 'PARTIAL', 'ABSENT'].map((st) => (
                              <button
                                key={st}
                                onClick={() =>
                                  handleUpdateAttendanceStatus(att.userId, st, att.durationMinutes)
                                }
                                className={`px-2 py-1 rounded text-[10px] font-bold transition-colors ${
                                  att.status === st
                                    ? 'bg-[#087F78] text-white'
                                    : 'bg-slate-100 dark:bg-[#0B223D] text-slate-600 dark:text-[#A9BACB] hover:text-[#0B1F3A]'
                                }`}
                              >
                                {st}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECORDING ATTACH MODAL */}
      {recordingSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white dark:bg-[#102A43] border border-slate-200 dark:border-[#1E3A56] rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-[#1E3A56] pb-4 mb-4">
              <h3 className="text-base font-bold text-[#0B1F3A] dark:text-white flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-[#087F78]" />
                Attach Recording: {recordingSession.title}
              </h3>
              <button
                onClick={() => setRecordingSession(null)}
                className="text-slate-400 hover:text-slate-700 dark:text-[#A9BACB] p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecording} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 dark:text-[#A9BACB] font-bold mb-1 uppercase tracking-wider">Recording URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={recordingData.recordingUrl}
                  onChange={(e) =>
                    setRecordingData({ ...recordingData, recordingUrl: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-[#A9BACB] font-bold mb-1 uppercase tracking-wider">Recording Title</label>
                <input
                  type="text"
                  value={recordingData.recordingTitle}
                  onChange={(e) =>
                    setRecordingData({ ...recordingData, recordingTitle: e.target.value })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                />
              </div>

              <div>
                <label className="block text-slate-700 dark:text-[#A9BACB] font-bold mb-1 uppercase tracking-wider">Duration (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={recordingData.durationMinutes}
                  onChange={(e) =>
                    setRecordingData({
                      ...recordingData,
                      durationMinutes: parseInt(e.target.value, 10),
                    })
                  }
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 dark:border-[#1E3A56] rounded-xl text-[#0B1F3A] dark:text-white focus:outline-none focus:bg-white dark:focus:bg-[#0B223D] dark:bg-[#102A43] focus:border-[#087F78]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-[#1E3A56]">
                <button
                  type="button"
                  onClick={() => setRecordingSession(null)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-[#0B223D] text-slate-700 dark:text-[#A9BACB] font-bold border border-slate-200 dark:border-[#1E3A56]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#087F78] hover:bg-[#076E6A] text-white font-bold shadow-xs"
                >
                  Attach & Notify Students
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
