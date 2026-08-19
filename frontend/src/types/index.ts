export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'INSTRUCTOR' | 'STUDENT';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type CourseStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type Level = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type ContentType = 'VIDEO' | 'TEXT' | 'PDF' | 'LINK';
export type VideoSource = 'YOUTUBE' | 'UPLOAD';
export type SubmissionStatus = 'DRAFT' | 'SUBMITTED' | 'GRADED' | 'RETURNED';
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

export interface Certificate {
  id: string;
  certificateNumber: string;
  userId?: string;
  courseId?: string;
  studentName: string;
  courseTitle: string;
  instructorName?: string;
  issueDate: string;
  isRevoked?: boolean;
  revocationReason?: string;
  verificationUrl?: string;
  qrCodeUrl?: string;
  course?: Course;
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
