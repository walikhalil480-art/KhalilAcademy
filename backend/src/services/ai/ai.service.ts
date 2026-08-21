import { prisma } from '../../config/database';
import { AIProvider, AIMessageInput } from './aiProvider';
import { ContextService } from './context.service';
import { AIMessageRole } from '@prisma/client';

export interface ChatRequestOptions {
  userId: string;
  conversationId?: string;
  message: string;
  courseId?: string;
  lessonId?: string;
  actionType?: 'EXPLAIN' | 'SIMPLIFY' | 'SUMMARY' | 'QUIZ' | 'CODE_HELP' | 'STUDY_PLAN' | 'RECOMMENDATION' | 'GENERAL';
  contextMeta?: any;
}

export interface SummaryOptions {
  userId: string;
  lessonId: string;
  summaryType?: 'quick' | 'detailed' | 'key_concepts' | 'terminology' | 'beginner' | 'takeaways';
}

export interface PracticeQuestionOptions {
  userId: string;
  lessonId: string;
  questionType?: 'multiple_choice' | 'true_false' | 'short_answer' | 'scenario' | 'coding' | 'conceptual';
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

export interface EvaluateAnswerOptions {
  userId: string;
  lessonId: string;
  question: string;
  studentAnswer: string;
  questionType?: string;
}

export interface CodeHelpOptions {
  userId: string;
  lessonId?: string;
  code?: string;
  errorMessage?: string;
  language?: string;
  studentGoal?: string;
}

export interface StudyPlanOptions {
  userId: string;
  goal?: string;
  availableHoursPerWeek?: number;
  currentLevel?: string;
}

export class AIService {
  /**
   * Multi-turn chat with conversation history persistence & course-aware grounding
   */
  public static async chat(opts: ChatRequestOptions) {
    const { userId, conversationId, message, courseId, lessonId, actionType = 'GENERAL', contextMeta } = opts;

    // 1. Find or create conversation
    let conv = null;
    if (conversationId) {
      conv = await prisma.aIConversation.findFirst({
        where: { id: conversationId, userId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
            take: 20, // Keep last 20 messages for multi-turn coherence
          },
        },
      });
      if (!conv) {
        throw new Error('Conversation not found or unauthorized.');
      }
    } else {
      // Auto-title conversation using first 40 chars of message
      const autoTitle = message.slice(0, 40) + (message.length > 40 ? '...' : '');
      conv = await prisma.aIConversation.create({
        data: {
          userId,
          courseId: courseId || null,
          lessonId: lessonId || null,
          title: autoTitle || 'Ask Khalil AI Chat',
        },
        include: {
          messages: true,
        },
      });
    }

    // 2. Persist student message in DB
    const userMsgRecord = await prisma.aIMessage.create({
      data: {
        conversationId: conv.id,
        role: AIMessageRole.USER,
        content: message,
        actionType,
        contextMeta: contextMeta ? JSON.stringify(contextMeta) : null,
      },
    });

    // 3. Build Grounding Context
    const activeCourseId = conv.courseId || courseId;
    const activeLessonId = conv.lessonId || lessonId;
    const level = contextMeta?.level || 'Intermediate';
    const { contextText } = await ContextService.buildGroundingContext(userId, activeCourseId || undefined, activeLessonId || undefined);
    const systemPrompt = ContextService.getSystemPrompt(contextText, level);

    // 4. Assemble message history for LLM
    const providerMessages: AIMessageInput[] = [
      { role: 'system', content: systemPrompt },
    ];

    (conv.messages || []).forEach((m) => {
      providerMessages.push({
        role: m.role === AIMessageRole.USER ? 'user' : 'assistant',
        content: m.content,
      });
    });

    // Push latest message
    providerMessages.push({ role: 'user', content: message });

    // 5. Call AI Provider
    const aiResponse = await AIProvider.generateCompletion(providerMessages);

    // 6. Save AI Response in DB
    const assistantMsgRecord = await prisma.aIMessage.create({
      data: {
        conversationId: conv.id,
        role: AIMessageRole.ASSISTANT,
        content: aiResponse.content,
        actionType,
        contextMeta: JSON.stringify({
          provider: aiResponse.provider,
          model: aiResponse.model,
          courseId: activeCourseId,
          lessonId: activeLessonId,
        }),
      },
    });

    // Update conversation updatedAt
    await prisma.aIConversation.update({
      where: { id: conv.id },
      data: { updatedAt: new Date() },
    });

    return {
      conversationId: conv.id,
      userMessage: userMsgRecord,
      assistantMessage: assistantMsgRecord,
      provider: aiResponse.provider,
      model: aiResponse.model,
    };
  }

  /**
   * Generates a structured educational summary for a lesson
   */
  public static async summarizeLesson(opts: SummaryOptions) {
    const { userId, lessonId, summaryType = 'quick' } = opts;
    const { contextText, structured } = await ContextService.buildGroundingContext(userId, undefined, lessonId);

    const typePrompts: Record<string, string> = {
      quick: 'Provide a concise, high-impact bulleted summary of this lesson.',
      detailed: 'Provide a comprehensive, in-depth lesson summary covering every key subtopic, architecture component, and practical implementation details.',
      key_concepts: 'Highlight and explain the most critical core concepts and mental models taught in this lesson.',
      terminology: 'List and clearly define the key technical terminology, keywords, and acronyms introduced in this lesson.',
      beginner: 'Explain this lesson in simple, friendly, beginner terms with real-world analogies.',
      takeaways: 'List actionable key takeaways and best practices that students should remember.',
    };

    const promptInstruction = typePrompts[summaryType] || typePrompts.quick;

    const messages: AIMessageInput[] = [
      { role: 'system', content: ContextService.getSystemPrompt(contextText) },
      {
        role: 'user',
        content: `Please generate a ${summaryType} summary for the lesson "${structured.lessonTitle || 'Current Lesson'}".\n\nRequirement: ${promptInstruction}\n\nStrictly ground your summary in the provided lesson text, transcript, and notes.`,
      },
    ];

    const aiRes = await AIProvider.generateCompletion(messages);
    return {
      lessonId,
      lessonTitle: structured.lessonTitle,
      summaryType,
      summary: aiRes.content,
      provider: aiRes.provider,
    };
  }

  /**
   * Generates interactive practice questions grounded in lesson content
   */
  public static async generatePracticeQuestion(opts: PracticeQuestionOptions) {
    const { userId, lessonId, questionType = 'multiple_choice', difficulty = 'intermediate' } = opts;
    const { contextText, structured } = await ContextService.buildGroundingContext(userId, undefined, lessonId);

    const messages: AIMessageInput[] = [
      { role: 'system', content: ContextService.getSystemPrompt(contextText) },
      {
        role: 'user',
        content: `Generate a single ${difficulty}-level practice question of type "${questionType}" based on the lesson "${structured.lessonTitle || 'Current Lesson'}".
        
IMPORTANT INSTRUCTIONS:
- Test conceptual understanding and practical application rather than trivial verbatim memorization.
- For multiple-choice questions, provide 4 distinct options (A, B, C, D).
- DO NOT reveal the correct answer or the solution yet. The student will attempt to answer first.
- End by inviting the student to provide their answer or code.`,
      },
    ];

    const aiRes = await AIProvider.generateCompletion(messages);
    return {
      lessonId,
      lessonTitle: structured.lessonTitle,
      questionType,
      difficulty,
      questionText: aiRes.content,
    };
  }

  /**
   * Evaluates student's practice response with detailed educational reasoning
   */
  public static async evaluatePracticeAnswer(opts: EvaluateAnswerOptions) {
    const { userId, lessonId, question, studentAnswer, questionType } = opts;
    const { contextText, structured } = await ContextService.buildGroundingContext(userId, undefined, lessonId);

    const messages: AIMessageInput[] = [
      { role: 'system', content: ContextService.getSystemPrompt(contextText) },
      {
        role: 'user',
        content: `A student attempted a practice question for lesson "${structured.lessonTitle || 'Current Lesson'}".

QUESTION:
${question}

STUDENT'S ANSWER:
${studentAnswer}

Please evaluate their answer following these guidelines:
1. State clearly whether the student is Correct, Partially Correct, or Incorrect.
2. Provide constructive feedback explaining *why* the answer is correct or what was missed.
3. If incorrect, explain the underlying misconception without being discouraging, and provide the correct reasoning.
4. Provide a quick follow-up hint or a similar short concept check to reinforce mastery.`,
      },
    ];

    const aiRes = await AIProvider.generateCompletion(messages);
    return {
      lessonId,
      question,
      studentAnswer,
      evaluation: aiRes.content,
    };
  }

  /**
   * Explains code, terminal output, Dockerfiles, YAML manifests, or runtime errors
   */
  public static async explainCodeOrError(opts: CodeHelpOptions) {
    const { userId, lessonId, code, errorMessage, language = 'bash', studentGoal } = opts;
    const { contextText } = await ContextService.buildGroundingContext(userId, undefined, lessonId);

    let prompt = `Help me understand and troubleshoot this technical problem for my lesson:\n\n`;
    if (language) prompt += `**Language / Tool:** ${language}\n`;
    if (studentGoal) prompt += `**What I am trying to achieve:** ${studentGoal}\n`;
    if (code) prompt += `\n**Code / Configuration:**\n\`\`\`${language}\n${code}\n\`\`\`\n`;
    if (errorMessage) prompt += `\n**Error Message / Terminal Output:**\n\`\`\`text\n${errorMessage}\n\`\`\`\n`;

    prompt += `\nPlease provide:
1. Root cause explanation of why this error or issue happens.
2. Step-by-step correction with improved, production-quality code.
3. Explanation of *why* the correction works.
4. Best practices to prevent this issue in the future.`;

    const messages: AIMessageInput[] = [
      { role: 'system', content: ContextService.getSystemPrompt(contextText) },
      { role: 'user', content: prompt },
    ];

    const aiRes = await AIProvider.generateCompletion(messages);
    return {
      code,
      errorMessage,
      language,
      explanation: aiRes.content,
    };
  }

  /**
   * Generates a personalized study plan respecting Khalil Academy's real course offerings
   */
  public static async createStudyPlan(opts: StudyPlanOptions) {
    const { userId, goal = 'Master DevOps & Cloud Engineering', availableHoursPerWeek = 5, currentLevel = 'Beginner' } = opts;
    const { contextText, structured } = await ContextService.buildGroundingContext(userId);

    const prompt = `Please create a structured, personalized Study Plan for student ${structured.studentName || 'Student'}.

STUDENT PARAMETERS:
- Learning Goal: ${goal}
- Study Time Commitment: ${availableHoursPerWeek} hours per week
- Experience Level: ${currentLevel}
- Active Enrolled Courses & Progress: ${JSON.stringify(structured.studentProgress || {})}

REQUIREMENTS:
1. Use ONLY real Khalil Academy courses and curriculum mentioned in the context.
2. Break the plan into clear weekly or milestone phases (e.g. Week 1, Week 2).
3. Include specific lesson topics, hands-on practice, and quiz milestone checkpoints.
4. Keep the pace realistic for ${availableHoursPerWeek} hours/week.
5. Emphasize earning verified completion certificates at each stage.`;

    const messages: AIMessageInput[] = [
      { role: 'system', content: ContextService.getSystemPrompt(contextText) },
      { role: 'user', content: prompt },
    ];

    const aiRes = await AIProvider.generateCompletion(messages);
    return {
      goal,
      availableHoursPerWeek,
      studyPlan: aiRes.content,
    };
  }

  /**
   * Generates personalized learning recommendations based on student activity
   */
  public static async getRecommendations(userId: string, courseId?: string) {
    const { contextText, structured } = await ContextService.buildGroundingContext(userId, courseId);

    const prompt = `Based on the student's progress and quiz scores in Khalil Academy, provide 3 to 4 personalized, high-value learning recommendations:
1. Next immediate lesson or module to study.
2. Specific weak concepts to review (especially where quiz score was under 70%).
3. Recommended practical exercises or project tasks.
4. Next recommended course to take upon completing the current one.

Format clearly with icons and concise action items.`;

    const messages: AIMessageInput[] = [
      { role: 'system', content: ContextService.getSystemPrompt(contextText) },
      { role: 'user', content: prompt },
    ];

    const aiRes = await AIProvider.generateCompletion(messages);
    return {
      studentName: structured.studentName,
      recommendations: aiRes.content,
    };
  }

  /**
   * Get all conversations for a student
   */
  public static async getConversations(userId: string, courseId?: string) {
    const where: any = { userId };
    if (courseId) where.courseId = courseId;

    return prisma.aIConversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        _count: { select: { messages: true } },
        course: { select: { id: true, title: true, slug: true } },
        lesson: { select: { id: true, title: true } },
      },
    });
  }

  /**
   * Get single conversation with full message history (enforcing user ownership)
   */
  public static async getConversationById(userId: string, conversationId: string) {
    const conv = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
      include: {
        messages: { orderBy: { createdAt: 'asc' } },
        course: { select: { id: true, title: true, slug: true } },
        lesson: { select: { id: true, title: true } },
      },
    });

    if (!conv) {
      throw new Error('Conversation not found or unauthorized.');
    }
    return conv;
  }

  /**
   * Delete a conversation
   */
  public static async deleteConversation(userId: string, conversationId: string) {
    const conv = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conv) {
      throw new Error('Conversation not found or unauthorized.');
    }

    await prisma.aIConversation.delete({
      where: { id: conversationId },
    });
    return { success: true };
  }

  /**
   * Clear all messages in a conversation
   */
  public static async clearConversationMessages(userId: string, conversationId: string) {
    const conv = await prisma.aIConversation.findFirst({
      where: { id: conversationId, userId },
    });
    if (!conv) {
      throw new Error('Conversation not found or unauthorized.');
    }

    await prisma.aIMessage.deleteMany({
      where: { conversationId },
    });
    return { success: true };
  }
}
