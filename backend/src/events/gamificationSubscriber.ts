import { appEventBus } from './eventBus';
import { recordUserActivity } from '../services/gamification.service';
import { logger } from '../config/logger';

export const registerGamificationSubscribers = () => {
  logger.info('[GAMIFICATION SUBSCRIBER] Registering event listeners for AcademyEvent bus...');

  // 1. Lesson Completed / Course Started
  appEventBus.on('COURSE_STARTED', async (payload: any) => {
    if (payload.userId) {
      await recordUserActivity(payload.userId, 'LESSON_COMPLETED', {
        courseId: payload.courseId,
        lessonId: payload.lessonId,
      });
    }
  });

  // 2. Quiz Passed
  appEventBus.on('QUIZ_COMPLETED', async (payload: any) => {
    if (payload.userId && payload.passed) {
      await recordUserActivity(payload.userId, 'QUIZ_PASSED', {
        quizId: payload.quizId,
        quizScore: payload.score,
        quizMaxScore: payload.maxScore,
      });
    }
  });

  // 3. Assignment Submitted
  appEventBus.on('ASSIGNMENT_SUBMITTED', async (payload: any) => {
    if (payload.userId) {
      await recordUserActivity(payload.userId, 'ASSIGNMENT_SUBMITTED', {
        assignmentId: payload.assignmentId,
      });
    }
  });

  // 4. Assignment Passed / Graded
  appEventBus.on('ASSIGNMENT_GRADED', async (payload: any) => {
    if (payload.userId && payload.status === 'PASSED') {
      await recordUserActivity(payload.userId, 'ASSIGNMENT_PASSED', {
        assignmentId: payload.assignmentId,
        assignmentScore: payload.score,
      });
    }
  });

  // 5. Course Completed
  appEventBus.on('COURSE_COMPLETED', async (payload: any) => {
    if (payload.userId) {
      await recordUserActivity(payload.userId, 'COURSE_COMPLETED', {
        courseId: payload.courseId,
      });
    }
  });

  // 6. Certificate Issued
  appEventBus.on('CERTIFICATE_ISSUED', async (payload: any) => {
    if (payload.userId) {
      await recordUserActivity(payload.userId, 'CERTIFICATE_ISSUED', {
        courseId: payload.courseId,
        certificateNumber: payload.certificateNumber,
      });
    }
  });
};
