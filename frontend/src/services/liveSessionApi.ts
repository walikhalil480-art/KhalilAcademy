import { api } from './api';

export interface LiveSession {
  id: string;
  title: string;
  description?: string;
  courseId: string;
  instructorId: string;
  startTime: string;
  endTime: string;
  timezone: string;
  maxParticipants: number;
  meetingProvider: 'ZOOM' | 'GOOGLE_MEET' | 'EXTERNAL';
  meetingUrl?: string;
  meetingId?: string;
  meetingPasscode?: string;
  status: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  dynamicStatus: 'SCHEDULED' | 'LIVE' | 'COMPLETED' | 'CANCELLED';
  attendanceThresholdPercent: number;
  joinBufferMinutes: number;
  recordingUrl?: string;
  recordingTitle?: string;
  recordingDurationMinutes?: number;
  recordingUploadedAt?: string;
  registeredCount: number;
  availableSeats: number;
  isFull: boolean;
  isRegistered: boolean;
  isJoinable: boolean;
  hasRecording?: boolean;
  course: {
    id: string;
    title: string;
    slug: string;
    thumbnail?: string;
    isFree?: boolean;
    price?: number;
  };
  instructor: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
    email?: string;
  };
  userAttendance?: {
    status: 'REGISTERED' | 'PRESENT' | 'PARTIAL' | 'ABSENT';
    durationMinutes: number;
    joinedAt: string;
  };
}

export interface LiveSessionQuestion {
  id: string;
  sessionId: string;
  userId: string;
  question: string;
  answer?: string;
  answeredBy?: string;
  answeredAt?: string;
  isAnswered: boolean;
  isPinned: boolean;
  upvotes: number;
  hasUpvoted?: boolean;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface LiveSessionAttendance {
  id: string;
  sessionId: string;
  userId: string;
  joinedAt: string;
  leftAt?: string;
  durationMinutes: number;
  status: 'REGISTERED' | 'PRESENT' | 'PARTIAL' | 'ABSENT';
  markedBy?: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export const liveSessionApi = {
  // Discovery & Catalog
  getSessions: async (params?: {
    courseId?: string;
    instructorId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const res = await api.get('/live-sessions', { params });
    return res.data;
  },

  // Single Session
  getSessionById: async (id: string) => {
    const res = await api.get(`/live-sessions/${id}`);
    return res.data.session as LiveSession;
  },

  // Student's My Live Classes
  getMySessions: async () => {
    const res = await api.get('/live-sessions/my');
    return res.data;
  },

  // Registration
  register: async (id: string) => {
    const res = await api.post(`/live-sessions/${id}/register`);
    return res.data;
  },

  unregister: async (id: string) => {
    const res = await api.delete(`/live-sessions/${id}/register`);
    return res.data;
  },

  // Join & Leave
  join: async (id: string) => {
    const res = await api.post(`/live-sessions/${id}/join`);
    return res.data;
  },

  leave: async (id: string) => {
    const res = await api.post(`/live-sessions/${id}/leave`);
    return res.data;
  },

  // Instructor / Admin Management
  createSession: async (data: any) => {
    const res = await api.post('/live-sessions', data);
    return res.data.session;
  },

  updateSession: async (id: string, data: any) => {
    const res = await api.patch(`/live-sessions/${id}`, data);
    return res.data.session;
  },

  cancelSession: async (id: string) => {
    const res = await api.post(`/live-sessions/${id}/cancel`);
    return res.data;
  },

  deleteSession: async (id: string) => {
    const res = await api.delete(`/live-sessions/${id}`);
    return res.data;
  },

  getParticipants: async (id: string) => {
    const res = await api.get(`/live-sessions/${id}/participants`);
    return res.data.participants;
  },

  getAttendance: async (id: string) => {
    const res = await api.get(`/live-sessions/${id}/attendance`);
    return res.data.attendances as LiveSessionAttendance[];
  },

  updateAttendanceStatus: async (
    id: string,
    userId: string,
    data: { status: string; durationMinutes?: number }
  ) => {
    const res = await api.patch(`/live-sessions/${id}/attendance/${userId}`, data);
    return res.data.attendance;
  },

  attachRecording: async (
    id: string,
    data: { recordingUrl: string; recordingTitle?: string; durationMinutes?: number }
  ) => {
    const res = await api.post(`/live-sessions/${id}/recording`, data);
    return res.data;
  },

  // Q&A
  getQuestions: async (id: string) => {
    const res = await api.get(`/live-sessions/${id}/questions`);
    return res.data.questions as LiveSessionQuestion[];
  },

  askQuestion: async (id: string, question: string) => {
    const res = await api.post(`/live-sessions/${id}/questions`, { question });
    return res.data.question as LiveSessionQuestion;
  },

  answerQuestion: async (id: string, questionId: string, answer: string) => {
    const res = await api.post(`/live-sessions/${id}/questions/${questionId}/answer`, { answer });
    return res.data.question as LiveSessionQuestion;
  },

  upvoteQuestion: async (id: string, questionId: string) => {
    const res = await api.post(`/live-sessions/${id}/questions/${questionId}/upvote`);
    return res.data.question as LiveSessionQuestion;
  },

  pinQuestion: async (id: string, questionId: string) => {
    const res = await api.patch(`/live-sessions/${id}/questions/${questionId}/pin`);
    return res.data.question as LiveSessionQuestion;
  },

  deleteQuestion: async (id: string, questionId: string) => {
    const res = await api.delete(`/live-sessions/${id}/questions/${questionId}`);
    return res.data;
  },

  // ICS Calendar Download URLs
  getSessionIcsUrl: (id: string) => `${api.defaults.baseURL || '/api'}/live-sessions/${id}/calendar.ics`,
  getUserIcsUrl: () => `${api.defaults.baseURL || '/api'}/live-sessions/calendar.ics`,
};
