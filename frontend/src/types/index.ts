export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type ContentType = 'VIDEO' | 'TEXT' | 'PDF' | 'LINK';
export type VideoSource = 'YOUTUBE' | 'UPLOAD';
export type SubmissionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'GRADED'
  | 'PASSED'
  | 'NEEDS_REVISION'
  | 'RETURNED';
export type EnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type OrderStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED' | 'REFUNDED';
export type PaymentProvider = 'MPESA' | 'PAYPAL' | 'CARD' | 'MOCK_PAYMENT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: UserStatus;
  emailVerified: boolean;
  avatar?: string;
  bio?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  _count?: { courses: number };
}

export interface LessonResource {
  id: string;
  title: string;
  fileUrl: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  contentType: ContentType;
  videoSource: VideoSource;
  youtubeVideoId?: string;
  videoUrl?: string;
  storageKey?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  textContent?: string;
  notes?: string;
  transcript?: string;
  resourceUrl?: string;
  isPreview: boolean;
  isLocked?: boolean;
  isRequired?: boolean;
  durationMinutes: number;
  order: number;
  isPublished: boolean;
  progress?: {
    isCompleted: boolean;
    lastWatchedPosition: number;
    watchTime?: number;
    progressPercentage?: number;
    status?: string;
  };
  resources?: LessonResource[];
}

export interface QuizOption {
  id: string;
  optionText: string;
  isCorrect?: boolean;
  explanation?: string;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  points: number;
  order: number;
  options: QuizOption[];
}

export interface Quiz {
  id: string;
  title: string;
  description?: string;
  passingScore: number;
  timeLimitMinutes: number;
  maxAttempts: number;
  isRequired?: boolean;
  isFinalAssessment?: boolean;
  questions?: QuizQuestion[];
  userAttemptsCount?: number;
  remainingAttempts?: number;
  hasPassed?: boolean;
}

export interface Assignment {
  id: string;
  title: string;
  instructions: string;
  dueDate?: string;
  maxScore: number;
  passingScore?: number;
  isRequired?: boolean;
  allowedFileTypes?: string[];
  maxFileSizeBytes?: number;
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  userId: string;
  submissionText?: string;
  fileUrl?: string;
  status: SubmissionStatus;
  score?: number;
  feedback?: string;
  submissionAttempts?: number;
  submittedAt: string;
  gradedAt?: string;
  assignment?: Assignment;
  user?: { id: string; name: string; email: string };
}

export interface Module {
  id: string;
  title: string;
  description?: string;
  order: number;
  lessons: Lesson[];
  quizzes?: Quiz[];
  assignments?: Assignment[];
}

export interface Course {
  id: string;
  title: string;
  slug: string;
  description: string;
  thumbnail?: string;
  instructorId: string;
  instructor?: {
    id: string;
    name: string;
    avatar?: string;
    bio?: string;
    role?: string;
    courseCount?: number;
    studentCount?: number;
    averageRating?: number;
  };
  category?: Category;
  level: Level;
  isFree: boolean;
  price: number;
  discountPrice?: number;
  currency: string;
  durationHours: number;
  learningObjectives: string[];
  requirements: string[];
  targetAudience: string[];
  status: CourseStatus;
  certificateEnabled?: boolean;
  requireAllLessons?: boolean;
  requireQuizzes?: boolean;
  quizPassingScore?: number;
  requireAssignments?: boolean;
  assignmentPassingScore?: number;
  requireFinalAssessment?: boolean;
  finalAssessmentPassingScore?: number;
  finalAssessmentQuizId?: string | null;
  minimumProgressPercentage?: number;
  modules?: Module[];
  averageRating?: number;
  reviewCount?: number;
  studentCount?: number;
  lessonCount?: number;
  totalDurationMinutes?: number;
  enrollmentCount?: number;
  moduleCount?: number;
  isEnrolled?: boolean;
  stats?: {
    lessonCount: number;
    totalDurationMinutes: number;
    studentCount: number;
    averageRating: number;
    reviewCount: number;
  };
  _count?: { enrollments?: number; modules?: number; quizzes?: number; assignments?: number };
  createdAt?: string;
}

export interface CourseEligibilityResult {
  eligible: boolean;
  courseId: string;
  courseTitle: string;
  courseSlug: string;
  certificateEnabled: boolean;
  learningProgressPercentage: number;
  certificationProgressPercentage: number;
  requirements: {
    lessons: {
      required: boolean;
      satisfied: boolean;
      completed: number;
      total: number;
      requiredCompleted: number;
      requiredTotal: number;
    };
    quizzes: {
      required: boolean;
      satisfied: boolean;
      passed: number;
      total: number;
      requiredPassed: number;
      requiredTotal: number;
      items: Array<{
        id: string;
        title: string;
        isRequired: boolean;
        passingScore: number;
        passed: boolean;
        bestScore: number | null;
        attemptsCount: number;
        remainingAttempts: number;
      }>;
    };
    assignments: {
      required: boolean;
      satisfied: boolean;
      passed: number;
      total: number;
      requiredPassed: number;
      requiredTotal: number;
      items: Array<{
        id: string;
        title: string;
        isRequired: boolean;
        passingScore: number;
        status: string;
        score: number | null;
        maxScore: number;
        feedback: string | null;
        passed: boolean;
      }>;
    };
    finalAssessment: {
      required: boolean;
      satisfied: boolean;
      quizId: string | null;
      quizTitle: string | null;
      passingScore: number;
      passed: boolean;
      bestScore: number | null;
      attemptsCount: number;
      remainingAttempts: number;
    };
    minimumProgress: {
      required: number;
      current: number;
      satisfied: boolean;
    };
  };
  missingRequirements: string[];
  pendingAssignmentId?: string | null;
  pendingAssignmentTitle?: string | null;
  pendingQuizId?: string | null;
  pendingQuizTitle?: string | null;
  certificate: {
    id: string;
    certificateNumber: string;
    issueDate: string;
    verificationUrl: string;
  } | null;
}

export interface AcademyStats {
  activeStudents: number;
  publishedCourses: number;
  lessonsCompleted: number;
  averageRating: number;
  ratingCount: number;
  totalLearningMinutes: number;
  totalLearningHours: number;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: EnrollmentStatus;
  completedAt?: string;
  progressPercentage: number;
  course: Course;
  createdAt: string;
}

export type CertificateStatus = 'ACTIVE' | 'SUSPENDED' | 'REVOKED' | 'REPLACED' | 'DELETED';
export type CertificateAuditAction =
  | 'ISSUED'
  | 'SUSPENDED'
  | 'RESTORED'
  | 'REVOKED'
  | 'RE_CERTIFICATION_CREATED'
  | 'RE_CERTIFICATION_COMPLETED'
  | 'REPLACED'
  | 'DELETED';

export type RecertificationScope =
  | 'FULL_COURSE'
  | 'SELECTED_LESSONS'
  | 'SELECTED_ASSESSMENTS'
  | 'FINAL_ASSIGNMENT'
  | 'CUSTOM';

export type RevocationReasonCategory =
  | 'REQUIREMENTS_BYPASSED'
  | 'FINAL_ASSIGNMENT_IMPROPER'
  | 'ACADEMIC_MISCONDUCT'
  | 'SYSTEM_ERROR'
  | 'ASSESSMENT_INVALIDATED'
  | 'OTHER';

export interface CertificateAuditLog {
  id: string;
  certificateId: string;
  action: CertificateAuditAction;
  performedBy: string;
  performerName?: string | null;
  performerRole?: string | null;
  reason: string;
  previousStatus?: CertificateStatus | null;
  newStatus?: CertificateStatus | null;
  metadata?: any;
  createdAt: string;
}

export interface RecertificationRequirement {
  id: string;
  certificateId: string;
  courseId: string;
  userId: string;
  scope: RecertificationScope;
  requiredLessonIds: string[];
  requiredQuizIds: string[];
  requiredAssignmentIds: string[];
  requireFinalAssignment: boolean;
  notes?: string | null;
  isCompleted: boolean;
  completedAt?: string | null;
  newCertificateId?: string | null;
  createdAt: string;
}

export interface Certificate {
  id: string;
  certificateNumber: string;
  userId?: string;
  studentEmail?: string;
  courseId?: string;
  studentName: string;
  courseTitle: string;
  instructorName?: string;
  issueDate: string;
  status: CertificateStatus;
  isRevoked?: boolean;
  revokedAt?: string | null;
  revokedBy?: string | null;
  revocationReason?: string | null;
  revocationCategory?: RevocationReasonCategory | null;
  suspendedAt?: string | null;
  suspendedBy?: string | null;
  suspensionReason?: string | null;
  replacedByCertificateId?: string | null;
  replacedByCertificateNumber?: string | null;
  previousCertificateId?: string | null;
  verificationUrl?: string;
  qrCodeUrl?: string;
  course?: Course;
  recertificationRequirement?: RecertificationRequirement | null;
  activeRecertificationRequirement?: RecertificationRequirement | null;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  linkUrl?: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  ipAddress?: string;
  details?: string;
  createdAt: string;
  user?: User;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  courseId: string;
  originalPrice: number;
  discountAmount: number;
  finalPrice: number;
  couponCode?: string;
  status: OrderStatus;
  createdAt: string;
  course?: Course;
}
