import { EventEmitter } from 'events';
import { logger } from '../config/logger';

export enum AcademyEvent {
  USER_REGISTERED = 'USER_REGISTERED',
  USER_VERIFIED = 'USER_VERIFIED',
  COURSE_ENROLLED = 'COURSE_ENROLLED',
  COURSE_STARTED = 'COURSE_STARTED',
  ASSIGNMENT_SUBMITTED = 'ASSIGNMENT_SUBMITTED',
  ASSIGNMENT_GRADED = 'ASSIGNMENT_GRADED',
  QUIZ_COMPLETED = 'QUIZ_COMPLETED',
  COURSE_COMPLETED = 'COURSE_COMPLETED',
  CERTIFICATE_ISSUED = 'CERTIFICATE_ISSUED',
  CERTIFICATE_REVOKED = 'CERTIFICATE_REVOKED',
  CERTIFICATE_SUSPENDED = 'CERTIFICATE_SUSPENDED',
  CERTIFICATE_RESTORED = 'CERTIFICATE_RESTORED',
  CERTIFICATE_REPLACED = 'CERTIFICATE_REPLACED',
  LIVE_CLASS_REMINDER_24H = 'LIVE_CLASS_REMINDER_24H',
  LIVE_CLASS_STARTING_SOON = 'LIVE_CLASS_STARTING_SOON',
  LIVE_CLASS_MISSED = 'LIVE_CLASS_MISSED',
  NEW_COURSE_ANNOUNCEMENT = 'NEW_COURSE_ANNOUNCEMENT',
  INSTRUCTOR_ANNOUNCEMENT = 'INSTRUCTOR_ANNOUNCEMENT',
  INACTIVE_STUDENT_REMINDER = 'INACTIVE_STUDENT_REMINDER',
}

// -------------------------------------------------------------
// Event Payload Interfaces
// -------------------------------------------------------------

export interface UserRegisteredPayload {
  userId: string;
  email: string;
  name: string;
  verificationToken?: string;
}

export interface UserVerifiedPayload {
  userId: string;
  email: string;
  name: string;
}

export interface CourseEnrolledPayload {
  userId: string;
  email: string;
  name: string;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  instructorName?: string;
}

export interface CourseStartedPayload {
  userId: string;
  email: string;
  name: string;
  courseId: string;
  courseTitle: string;
  lessonTitle: string;
}

export interface AssignmentSubmittedPayload {
  userId: string;
  studentEmail: string;
  studentName: string;
  instructorEmail?: string;
  instructorName?: string;
  assignmentId: string;
  assignmentTitle: string;
  courseId: string;
  courseTitle: string;
  submissionAttempts: number;
}

export interface AssignmentGradedPayload {
  userId: string;
  studentEmail: string;
  studentName: string;
  assignmentId: string;
  assignmentTitle: string;
  courseId: string;
  courseTitle: string;
  score?: number;
  maxScore?: number;
  status: 'PASSED' | 'NEEDS_REVISION' | 'FAILED';
  feedback?: string;
}

export interface QuizCompletedPayload {
  userId: string;
  email: string;
  name: string;
  quizId: string;
  quizTitle: string;
  courseId: string;
  courseTitle: string;
  score: number;
  passingScore: number;
  passed: boolean;
  attemptNumber: number;
  maxAttempts: number;
}

export interface CourseCompletedPayload {
  userId: string;
  email: string;
  name: string;
  courseId: string;
  courseTitle: string;
  completedAt: Date;
}

export interface CertificateIssuedPayload {
  userId: string;
  email: string;
  name: string;
  courseId: string;
  courseTitle: string;
  certificateNumber: string;
  verificationUrl: string;
  pdfBuffer?: Buffer;
}

export interface LiveClassReminderPayload {
  userId: string;
  email: string;
  name: string;
  sessionId: string;
  sessionTitle: string;
  courseTitle: string;
  startTime: Date;
  meetingUrl?: string;
}

export interface LiveClassMissedPayload {
  userId: string;
  email: string;
  name: string;
  sessionId: string;
  sessionTitle: string;
  courseTitle: string;
  recordingUrl?: string;
}

export interface NewCourseAnnouncementPayload {
  studentEmails: string[];
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  category: string;
  description: string;
  instructorName: string;
}

export interface InstructorAnnouncementPayload {
  studentEmails: string[];
  courseId: string;
  courseTitle: string;
  instructorName: string;
  title: string;
  message: string;
}

export interface InactiveStudentReminderPayload {
  userId: string;
  email: string;
  name: string;
  courseId: string;
  courseTitle: string;
  lastActiveDays: number;
  progressPercentage: number;
}

export interface CertificateRevokedPayload {
  certificateId: string;
  certificateNumber: string;
  userId: string;
  studentEmail: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  reason: string;
  revocationCategory?: string;
  recertificationScope: string;
  revokedAt: Date;
}

export interface CertificateSuspendedPayload {
  certificateId: string;
  certificateNumber: string;
  userId: string;
  studentEmail: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  reason: string;
  suspendedAt: Date;
}

export interface CertificateRestoredPayload {
  certificateId: string;
  certificateNumber: string;
  userId: string;
  studentEmail: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
  restoredAt: Date;
}

export interface CertificateReplacedPayload {
  oldCertificateNumber: string;
  newCertificateNumber: string;
  userId: string;
  studentEmail: string;
  studentName: string;
  courseId: string;
  courseTitle: string;
}

// -------------------------------------------------------------
// App Event Bus Singleton
// -------------------------------------------------------------

class AppEventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  public emitEvent<T>(event: AcademyEvent, payload: T): boolean {
    logger.info(`[EVENT EMITTED] ${event}`, { event, payloadSummary: typeof payload === 'object' ? Object.keys(payload as any) : undefined });
    return this.emit(event, payload);
  }
}

export const appEventBus = new AppEventBus();
