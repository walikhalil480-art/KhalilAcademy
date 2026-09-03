import { api } from './api';
import {
  AIConversation,
  AIMessage,
  LessonSummaryResponse,
  PracticeQuestionResponse,
  EvaluateAnswerResponse,
  CodeHelpResponse,
  StudyPlanResponse,
  RecommendationsResponse,
  AIActionType,
} from '../types/ai';

export const aiService = {
  /**
   * Send a message to Ask Khalil AI
   */
  async sendMessage(params: {
    message: string;
    conversationId?: string;
    courseId?: string;
    lessonId?: string;
    actionType?: AIActionType;
    contextMeta?: any;
  }): Promise<{
    success: boolean;
    conversationId: string;
    userMessage: AIMessage;
    assistantMessage: AIMessage;
    provider: string;
    model: string;
  }> {
    const res = await api.post('/ai/chat', params);
    return res.data;
  },

  /**
   * Summarize a lesson
   */
  async summarizeLesson(params: {
    lessonId: string;
    summaryType?: 'quick' | 'detailed' | 'key_concepts' | 'terminology' | 'beginner' | 'takeaways';
  }): Promise<LessonSummaryResponse> {
    const res = await api.post('/ai/summarize', params);
    return res.data;
  },

  /**
   * Generate interactive practice questions
   */
  async generatePractice(params: {
    lessonId: string;
    questionType?: 'multiple_choice' | 'true_false' | 'short_answer' | 'scenario' | 'coding' | 'conceptual';
    difficulty?: 'beginner' | 'intermediate' | 'advanced';
  }): Promise<PracticeQuestionResponse> {
    const res = await api.post('/ai/practice/generate', params);
    return res.data;
  },

  /**
   * Evaluate student's practice response
   */
  async evaluatePractice(params: {
    lessonId: string;
    question: string;
    studentAnswer: string;
    questionType?: string;
  }): Promise<EvaluateAnswerResponse> {
    const res = await api.post('/ai/practice/evaluate', params);
    return res.data;
  },

  /**
   * Explain code, errors, YAML, or Dockerfiles
   */
  async explainCode(params: {
    lessonId?: string;
    code?: string;
    errorMessage?: string;
    language?: string;
    studentGoal?: string;
  }): Promise<CodeHelpResponse> {
    const res = await api.post('/ai/code-help', params);
    return res.data;
  },

  /**
   * Create personalized study plan
   */
  async createStudyPlan(params: {
    goal?: string;
    availableHoursPerWeek?: number;
    currentLevel?: string;
  }): Promise<StudyPlanResponse> {
    const res = await api.post('/ai/study-plan', params);
    return res.data;
  },

  /**
   * Get personalized recommendations
   */
  async getRecommendations(courseId?: string): Promise<RecommendationsResponse> {
    const res = await api.get('/ai/recommendations', {
      params: courseId ? { courseId } : undefined,
    });
    return res.data;
  },

  /**
   * Fetch conversations list
   */
  async getConversations(courseId?: string): Promise<{ success: boolean; conversations: AIConversation[] }> {
    const res = await api.get('/ai/conversations', {
      params: courseId ? { courseId } : undefined,
    });
    return res.data;
  },

  /**
   * Fetch a single conversation with messages
   */
  async getConversation(id: string): Promise<{ success: boolean; conversation: AIConversation }> {
    const res = await api.get(`/ai/conversations/${id}`);
    return res.data;
  },

  /**
   * Delete conversation
   */
  async deleteConversation(id: string): Promise<{ success: boolean }> {
    const res = await api.delete(`/ai/conversations/${id}`);
    return res.data;
  },

  /**
   * Clear messages in conversation
   */
  async clearConversation(id: string): Promise<{ success: boolean }> {
    const res = await api.post(`/ai/conversations/${id}/clear`);
    return res.data;
  },
};
