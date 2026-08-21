export type AIMessageRole = 'USER' | 'ASSISTANT' | 'SYSTEM';

export type AIActionType =
  | 'EXPLAIN'
  | 'SIMPLIFY'
  | 'SUMMARY'
  | 'QUIZ'
  | 'CODE_HELP'
  | 'STUDY_PLAN'
  | 'RECOMMENDATION'
  | 'GENERAL';

export interface AIMessage {
  id: string;
  conversationId: string;
  role: AIMessageRole;
  content: string;
  actionType?: AIActionType | null;
  contextMeta?: string | null;
  createdAt: string;
}

export interface AIConversation {
  id: string;
  userId: string;
  courseId?: string | null;
  lessonId?: string | null;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages?: AIMessage[];
  _count?: {
    messages: number;
  };
  course?: {
    id: string;
    title: string;
    slug: string;
  };
  lesson?: {
    id: string;
    title: string;
  };
}

export interface LessonSummaryResponse {
  success: boolean;
  lessonId: string;
  lessonTitle?: string;
  summaryType: string;
  summary: string;
  provider: string;
}

export interface PracticeQuestionResponse {
  success: boolean;
  lessonId: string;
  lessonTitle?: string;
  questionType: string;
  difficulty: string;
  questionText: string;
}

export interface EvaluateAnswerResponse {
  success: boolean;
  lessonId: string;
  question: string;
  studentAnswer: string;
  evaluation: string;
}

export interface CodeHelpResponse {
  success: boolean;
  code?: string;
  errorMessage?: string;
  language?: string;
  explanation: string;
}

export interface StudyPlanResponse {
  success: boolean;
  goal?: string;
  availableHoursPerWeek?: number;
  studyPlan: string;
}

export interface RecommendationsResponse {
  success: boolean;
  studentName?: string;
  recommendations: string;
}
