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

  const handleOpenCreate = () => {
    setEditingSession(null);
    setFormData({
      title: '',
      description: '',
      courseId: courses[0]?.id || '',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      endTime: new Date(Date.now() + 26 * 60 * 60 * 1000).toISOString().slice(0, 16),
      timezone: 'UTC',
      maxParticipants: 50,
      meetingProvider: 'EXTERNAL',
      meetingUrl: '',
      meetingId: '',
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
      timezone: sess.timezone || 'UTC',
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
      if (editingSession) {
        await liveSessionApi.updateSession(editingSession.id, formData);
        setSuccessMessage('Live session updated successfully.');
      } else {
        await liveSessionApi.createSession(formData);
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
    <div className="min-h-screen bg-[#071326] text-[#F8FAFC] pb-24">
      {/* Top Banner */}
      <div className="bg-gradient-to-b from-[#0A192F] to-[#071326] border-b border-[#23426A] py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-[#4FD1C5] uppercase tracking-wider mb-2">
              <Shield className="w-4 h-4" />
              Instructor / Admin Console
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">
              Live Session Management
            </h1>
            <p className="mt-1 text-sm text-[#94A3B8]">
              Schedule live virtual classes, manage attendee capacity, track student attendance duration, and upload session recordings.
            </p>
          </div>

          <button
            onClick={handleOpenCreate}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#0284C7] to-[#0EA5E9] hover:from-[#0369A1] hover:to-[#0284C7] text-white font-bold text-xs transition-all shadow-lg shadow-[#0284C7]/20 flex items-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            Schedule New Live Class
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* Feedback Notifications */}
        {successMessage && (
          <div className="mb-6 p-4 rounded-xl bg-[#064E3B]/80 border border-[#10B981] text-[#A7F3D0] flex items-center gap-3">
            <CheckCircle className="w-5 h-5 shrink-0 text-[#10B981]" />
            <span className="text-sm font-medium">{successMessage}</span>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#7F1D1D]/80 border border-[#EF4444] text-[#FECACA] flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-[#EF4444]" />
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* Sessions Table */}
        <div className="bg-[#0D1E36] border border-[#23426A] rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-[#23426A] flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Video className="w-4 h-4 text-[#4FD1C5]" />
              Scheduled Live Sessions ({sessions.length})
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-[#94A3B8]">Loading live sessions...</div>
          ) : sessions.length === 0 ? (
            <div className="p-12 text-center">
              <Video className="w-10 h-10 text-[#64748B] mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-1">No live classes scheduled</h3>
              <p className="text-xs text-[#94A3B8] mb-4">
                You haven't scheduled any live sessions yet. Click below to create your first session.
              </p>
              <button
                onClick={handleOpenCreate}
                className="px-4 py-2 rounded-xl bg-[#0284C7] text-white text-xs font-bold"
              >
                Schedule Session
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#CBD5E1]">
                <thead className="bg-[#071326] text-[#94A3B8] uppercase text-[10px] tracking-wider border-b border-[#23426A]">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Course & Title</th>
                    <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                    <th className="py-3.5 px-4 font-semibold">Registered</th>
                    <th className="py-3.5 px-4 font-semibold">Status</th>
                    <th className="py-3.5 px-4 font-semibold">Meeting Provider</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#23426A]/50">
                  {sessions.map((sess) => {
                    const start = new Date(sess.startTime);
                    return (
                      <tr key={sess.id} className="hover:bg-[#1A365D]/30 transition-colors">
                        <td className="py-4 px-4">
                          <div className="font-bold text-white text-sm line-clamp-1">{sess.title}</div>
                          <div className="text-[11px] text-[#4FD1C5]">{sess.course?.title}</div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-medium text-white">
                            {start.toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </div>
                          <div className="text-[11px] text-[#94A3B8]">
                            {start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                            ({sess.timezone || 'UTC'})
                          </div>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="font-bold text-white">
                            {sess.registeredCount} / {sess.maxParticipants}
                          </span>
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          {sess.dynamicStatus === 'LIVE' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#EF4444]/20 border border-[#EF4444] text-[#F87171] text-[10px] font-bold">
                              LIVE NOW
                            </span>
                          ) : sess.dynamicStatus === 'COMPLETED' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#334155] text-[#94A3B8] text-[10px] font-medium">
                              Completed
                            </span>
                          ) : sess.dynamicStatus === 'CANCELLED' ? (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#7F1D1D]/40 text-[#FCA5A5] text-[10px] font-medium">
                              Cancelled
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full bg-[#0369A1]/30 text-[#38BDF8] text-[10px] font-medium">
                              Scheduled
                            </span>
                          )}
                        </td>
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span className="text-[#CBD5E1]">
                            {sess.meetingProvider === 'ZOOM'
                              ? 'Zoom'
                              : sess.meetingProvider === 'GOOGLE_MEET'
                              ? 'Google Meet'
                              : 'External Link'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/live-classes/${sess.id}`}
                              title="View Virtual Classroom"
                              className="p-1.5 rounded-lg bg-[#071326] text-[#94A3B8] hover:text-[#4FD1C5] transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>

                            <button
                              onClick={() => handleOpenAttendance(sess)}
                              title="Manage Attendance Duration"
                              className="p-1.5 rounded-lg bg-[#1A365D] text-[#4FD1C5] hover:bg-[#23426A] transition-colors"
                            >
                              <Users className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenRecording(sess)}
                              title="Attach Session Recording"
                              className="p-1.5 rounded-lg bg-[#064E3B]/50 text-[#10B981] hover:bg-[#064E3B] transition-colors"
                            >
                              <PlayCircle className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => handleOpenEdit(sess)}
                              title="Edit Session"
                              className="p-1.5 rounded-lg bg-[#071326] text-[#94A3B8] hover:text-white transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {sess.dynamicStatus !== 'CANCELLED' && (
                              <button
                                onClick={() => handleCancelSession(sess)}
                                title="Cancel Session"
                                className="p-1.5 rounded-lg bg-[#7F1D1D]/30 text-[#FCA5A5] hover:bg-[#7F1D1D] transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleDeleteSession(sess)}
                              title="Delete Session"
                              className="p-1.5 rounded-lg bg-[#7F1D1D]/20 text-[#EF4444] hover:bg-[#7F1D1D]/60 transition-colors"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0D1E36] border border-[#23426A] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#23426A] pb-4 mb-6">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Video className="w-5 h-5 text-[#4FD1C5]" />
                {editingSession ? 'Edit Live Class' : 'Schedule Live Class'}
              </h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-[#94A3B8] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSession} className="space-y-4 text-xs">
              <div>
                <label className="block text-white font-semibold mb-1">Session Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AWS Live Workshop: Deploying Production Microservices"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full p-2.5 bg-[#071326] border border-[#23426A] rounded-xl text-white focus:outline-none focus:border-[#4FD1C5]"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-1">Associated Course *</label>
                <select
                  required
                  value={formData.courseId}
                  onChange={(e) => setFormData({ ...formData, courseId: e.target.value })}
                  className="w-full p-2.5 bg-[#071326] border border-[#23426A] rounded-xl text-white focus:outline-none focus:border-[#4FD1C5]"
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
                <label className="block text-white font-semibold mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="What topics and hands-on exercises will be covered in this live session?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-2.5 bg-[#071326] border border-[#23426A] rounded-xl text-white focus:outline-none focus:border-[#4FD1C5] resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-semibold mb-1">Start Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full p-2.5 bg-[#071326] border border-[#23426A] rounded-xl text-white focus:outline-none focus:border-[#4FD1C5]"
                  />
                </div>

                <div>
                  <label className="block text-white font-semibold mb-1">End Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full p-2.5 bg-[#071326] border border-[#23426A] rounded-xl text-white focus:outline-none focus:border-[#4FD1C5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-white font-semibold mb-1">Timezone</label>
                  <select
                    value={formData.timezone}
                    onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
                    className="w-full p-2.5 bg-[#071326] border border-[#23426A] rounded-xl text-white focus:outline-none focus:border-[#4FD1C5]"
                  >
                    <option value="UTC">UTC</option>
                    <option value="Africa/Nairobi">EAT (Nairobi / East Africa)</option>
                    <option value="Europe/London">GMT / London</option>
                    <option value="America/New_York">EST / New York</option>
                    <option value="America/Los_Angeles">PST / San Francisco</option>
                  </select>
                </div>

                <div>
                  <label className="block text-white font-semibold mb-1">Max Capacity</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={formData.maxParticipants}
                    onChange={(e) =>
                      setFormData({ ...formData, maxParticipants: parseInt(e.target.value, 10) })
                    }
                    className="w-full p-2.5 bg-[#071326] border border-[#23426A] rounded-xl text-white focus:outline-none focus:border-[#4FD1C5]"
                  />
                </div>

                <div>
                  <label className="block text-white font-semibold mb-1">Meeting Provider</label>
                  <select
                    value={formData.meetingProvider}
                    onChange={(e) => setFormData({ ...formData, meetingProvider: e.target.value })}
                    className="w-full p-2.5 bg-[#071326] border border-[#23426A] rounded-xl text-white focus:outline-none focus:border-[#4FD1C5]"
                  >
                    <option value="EXTERNAL">External Virtual Link</option>
                    <option value="ZOOM">Zoom</option>
                    <option value="GOOGLE_MEET">Google Meet</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-white font-semibold mb-1">
                  Meeting URL (Google Meet / Zoom / Classroom Link) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://meet.google.com/xyz or https://zoom.us/j/..."
                  value={formData.meetingUrl}
                  onChange={(e) => {
                    let val = e.target.value.trim();
                    if (val && !val.startsWith('http://') && !val.startsWith('https://')) {
                      val = `https://${val}`;
                    }
                    setFormData({ ...formData, meetingUrl: val });
                  }}
                  className="w-full p-2.5 bg-[#071326] border border-[#23426A] focus:border-[#4FD1C5] rounded-xl text-white focus:outline-none font-mono text-xs"
                />
                <span className="text-[10px] text-[#4FD1C5] mt-1 block">
                  🔒 Securely encrypted: Students can only access this URL 15 minutes before session start.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-white font-semibold mb-1">Meeting ID (Optional)</label>
                  <input
                    type="text"
                    value={formData.meetingId}
                    onChange={(e) => setFormData({ ...formData, meetingId: e.target.value })}
                    className="w-full p-2.5 bg-[#071326] border border-[#23426A] rounded-xl text-white focus:outline-none focus:border-[#4FD1C5]"
                  />
                </div>

                <div>
                  <label className="block text-white font-semibold mb-1">Passcode (Optional)</label>
                  <input
                    type="text"
                    value={formData.meetingPasscode}
                    onChange={(e) => setFormData({ ...formData, meetingPasscode: e.target.value })}
                    className="w-full p-2.5 bg-[#071326] border border-[#23426A] rounded-xl text-white focus:outline-none focus:border-[#4FD1C5]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#23426A]">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-[#334155] text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingForm}
                  className="px-5 py-2 rounded-xl bg-[#0284C7] hover:bg-[#0369A1] text-white font-bold disabled:opacity-50"
                >
                  {submittingForm ? 'Saving...' : editingSession ? 'Update Session' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ATTENDANCE MODAL */}
      {attendanceSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0D1E36] border border-[#23426A] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#23426A] pb-4 mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#4FD1C5]" />
                  Attendance Tracking: {attendanceSession.title}
                </h3>
                <div className="text-xs text-[#94A3B8]">
                  Configured Threshold: {attendanceSession.attendanceThresholdPercent}% of class duration
                </div>
              </div>
              <button
                onClick={() => setAttendanceSession(null)}
                className="text-[#94A3B8] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {attendances.length === 0 ? (
              <div className="p-8 text-center text-xs text-[#94A3B8]">
                No student has joined this virtual classroom yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#071326] text-[#94A3B8] uppercase text-[10px]">
                    <tr>
                      <th className="py-2.5 px-3">Student</th>
                      <th className="py-2.5 px-3">Joined</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3 text-right">Manual Override</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#23426A]/50">
                    {attendances.map((att) => (
                      <tr key={att.id}>
                        <td className="py-3 px-3">
                          <div className="font-bold text-white">{att.user?.name}</div>
                          <div className="text-[10px] text-[#64748B]">{att.user?.email}</div>
                        </td>
                        <td className="py-3 px-3 text-[#CBD5E1]">
                          {new Date(att.joinedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-3 text-white font-mono">
                          {att.durationMinutes} mins
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              att.status === 'PRESENT'
                                ? 'bg-[#064E3B] text-[#A7F3D0]'
                                : att.status === 'PARTIAL'
                                ? 'bg-[#78350F] text-[#FDE68A]'
                                : 'bg-[#7F1D1D] text-[#FECACA]'
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
                                className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                                  att.status === st
                                    ? 'bg-[#4FD1C5] text-[#071326]'
                                    : 'bg-[#071326] text-[#94A3B8] hover:text-white'
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0D1E36] border border-[#23426A] rounded-2xl max-w-lg w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#23426A] pb-4 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <PlayCircle className="w-5 h-5 text-[#4FD1C5]" />
                Attach Recording: {recordingSession.title}
              </h3>
              <button
                onClick={() => setRecordingSession(null)}
                className="text-[#94A3B8] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRecording} className="space-y-4 text-xs">
              <div>
                <label className="block text-white font-semibold mb-1">Recording URL *</label>
                <input
                  type="url"
                  required
                  placeholder="https://..."
                  value={recordingData.recordingUrl}
                  onChange={(e) =>
                    setRecordingData({ ...recordingData, recordingUrl: e.target.value })
                  }
                  className="w-full p-2.5 bg-[#071326] border border-[#23426A] rounded-xl text-white focus:outline-none focus:border-[#4FD1C5]"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-1">Recording Title</label>
                <input
                  type="text"
                  value={recordingData.recordingTitle}
                  onChange={(e) =>
                    setRecordingData({ ...recordingData, recordingTitle: e.target.value })
                  }
                  className="w-full p-2.5 bg-[#071326] border border-[#23426A] rounded-xl text-white focus:outline-none focus:border-[#4FD1C5]"
                />
              </div>

              <div>
                <label className="block text-white font-semibold mb-1">Duration (Minutes)</label>
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
                  className="w-full p-2.5 bg-[#071326] border border-[#23426A] rounded-xl text-white focus:outline-none focus:border-[#4FD1C5]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-[#23426A]">
                <button
                  type="button"
                  onClick={() => setRecordingSession(null)}
                  className="px-4 py-2 rounded-xl bg-[#334155] text-white font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#10B981] hover:bg-[#059669] text-white font-bold"
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
