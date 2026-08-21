import { api } from './api';

export type StudentRiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type StudentRiskStatus = 'ACTIVE' | 'RESOLVED' | 'DISMISSED';
export type StudentRiskReason =
  | 'INACTIVE_10_DAYS'
  | 'COURSE_PROGRESS_STALLED'
  | 'QUIZ_FAILED_3_TIMES'
  | 'ASSIGNMENT_OVERDUE'
  | 'LOW_RECENT_PERFORMANCE'
  | 'MULTIPLE_RISK_FACTORS';

export interface StudentRiskRecord {
  id: string;
  userId: string;
  courseId?: string | null;
  quizId?: string | null;
  assignmentId?: string | null;
  riskLevel: StudentRiskLevel;
  riskReason: StudentRiskReason;
  title: string;
  details: string;
  metricValue?: number | null;
  status: StudentRiskStatus;
  detectedAt: string;
  resolvedAt?: string | null;
  resolutionReason?: string | null;
  lastNotifiedAt?: string | null;
  notificationCount: number;
  recommendedAction?: string | null;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    createdAt: string;
  };
  course?: {
    id: string;
    title: string;
    slug: string;
  } | null;
  quiz?: {
    id: string;
    title: string;
  } | null;
  assignment?: {
    id: string;
    title: string;
    dueDate?: string | null;
  } | null;
}

export interface StudentRiskStats {
  totalAtRisk: number;
  highRisk: number;
  mediumRisk: number;
  lowRisk: number;
  recovered: number;
  reasonBreakdown: {
    reason: StudentRiskReason;
    count: number;
  }[];
}

export interface AtRiskSummaryResponse {
  success: boolean;
  stats: StudentRiskStats;
  records: StudentRiskRecord[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface StudentRiskDetailsResponse {
  success: boolean;
  student: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
    registeredAt: string;
    lastActivity: string;
    inactivityDays: number;
    currentRiskLevel: StudentRiskLevel | null;
    enrollments: {
      courseId: string;
      courseTitle: string;
      progressPercentage: number;
      status: string;
      enrolledAt: string;
      lastActivityAt: string;
    }[];
  };
  activeRisks: StudentRiskRecord[];
  resolvedRisks: StudentRiskRecord[];
  dismissedRisks: StudentRiskRecord[];
  recentAssessments: {
    quizzes: any[];
    assignments: any[];
  };
}

export const atRiskApi = {
  getSummary: async (params: {
    page?: number;
    limit?: number;
    search?: string;
    riskLevel?: string;
    riskReason?: string;
    status?: string;
    courseId?: string;
  }): Promise<AtRiskSummaryResponse> => {
    const res = await api.get('/at-risk-students', { params });
    return res.data;
  },

  getStudentDetails: async (studentId: string): Promise<StudentRiskDetailsResponse> => {
    const res = await api.get(`/at-risk-students/${studentId}`);
    return res.data;
  },

  triggerAnalysis: async (): Promise<any> => {
    const res = await api.post('/at-risk-students/analyze');
    return res.data;
  },

  sendIntervention: async (
    studentId: string,
    data: { title?: string; message: string; linkUrl?: string }
  ): Promise<any> => {
    const res = await api.post(`/at-risk-students/${studentId}/intervene`, data);
    return res.data;
  },

  dismissRiskRecord: async (recordId: string, reason?: string): Promise<any> => {
    const res = await api.patch(`/at-risk-students/records/${recordId}/dismiss`, { reason });
    return res.data;
  },
};
