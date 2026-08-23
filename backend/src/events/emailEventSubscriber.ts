import { appEventBus, AcademyEvent } from './eventBus';
import * as emailService from '../services/email.service';
import { logger } from '../config/logger';
import {
  UserRegisteredPayload,
  UserVerifiedPayload,
  CourseEnrolledPayload,
  CourseStartedPayload,
  AssignmentSubmittedPayload,
  AssignmentGradedPayload,
  QuizCompletedPayload,
  CourseCompletedPayload,
  CertificateIssuedPayload,
  LiveClassReminderPayload,
  LiveClassMissedPayload,
  NewCourseAnnouncementPayload,
  InstructorAnnouncementPayload,
  InactiveStudentReminderPayload,
} from './eventBus';

export const registerEmailEventSubscribers = () => {
  logger.info('[EVENT SUBSCRIBER] Registering email event handlers for AcademyEvent bus...');

  // 1. User Registered
  appEventBus.on(AcademyEvent.USER_REGISTERED, async (payload: UserRegisteredPayload) => {
    try {
      if (payload.verificationToken) {
        await emailService.sendVerificationEmail(payload.email, payload.verificationToken, payload.name);
      } else {
        await emailService.sendWelcomeEmail(payload.email, payload.name);
      }
    } catch (err: any) {
      logger.error(`[EVENT ERROR] USER_REGISTERED email failed for ${payload.email}: ${err.message}`);
    }
  });

  // 2. User Verified
  appEventBus.on(AcademyEvent.USER_VERIFIED, async (payload: UserVerifiedPayload) => {
    try {
      await emailService.sendWelcomeEmail(payload.email, payload.name);
    } catch (err: any) {
      logger.error(`[EVENT ERROR] USER_VERIFIED email failed for ${payload.email}: ${err.message}`);
    }
  });

  // 3. Course Enrolled
  appEventBus.on(AcademyEvent.COURSE_ENROLLED, async (payload: CourseEnrolledPayload) => {
    try {
      await emailService.sendCourseEnrolledEmail(
        payload.email,
        payload.name,
        payload.courseTitle,
        payload.courseSlug,
        payload.instructorName
      );
    } catch (err: any) {
      logger.error(`[EVENT ERROR] COURSE_ENROLLED email failed for ${payload.email}: ${err.message}`);
    }
  });

  // 4. Course Started
  appEventBus.on(AcademyEvent.COURSE_STARTED, async (payload: CourseStartedPayload) => {
    try {
      await emailService.sendCourseStartedEmail(
        payload.email,
        payload.name,
        payload.courseTitle,
        payload.lessonTitle
      );
    } catch (err: any) {
      logger.error(`[EVENT ERROR] COURSE_STARTED email failed for ${payload.email}: ${err.message}`);
    }
  });

  // 5. Assignment Submitted
  appEventBus.on(AcademyEvent.ASSIGNMENT_SUBMITTED, async (payload: AssignmentSubmittedPayload) => {
    try {
      // 1. Send receipt to student
      await emailService.sendAssignmentSubmittedEmail(
        payload.studentEmail,
        payload.studentName,
        payload.assignmentTitle,
        payload.courseTitle,
        payload.submissionAttempts
      );

      // 2. Send notification to instructor if available
      if (payload.instructorEmail) {
        await emailService.sendAssignmentInstructorAlertEmail(
          payload.instructorEmail,
          payload.instructorName || 'Instructor',
          payload.studentName,
          payload.assignmentTitle,
          payload.courseTitle
        );
      }
    } catch (err: any) {
      logger.error(`[EVENT ERROR] ASSIGNMENT_SUBMITTED email failed for ${payload.studentEmail}: ${err.message}`);
    }
  });

  // 6. Assignment Graded
  appEventBus.on(AcademyEvent.ASSIGNMENT_GRADED, async (payload: AssignmentGradedPayload) => {
    try {
      await emailService.sendAssignmentGradedEmail(
        payload.studentEmail,
        payload.studentName,
        payload.assignmentTitle,
        payload.courseTitle,
        payload.status,
        payload.score,
        payload.maxScore,
        payload.feedback
      );
    } catch (err: any) {
      logger.error(`[EVENT ERROR] ASSIGNMENT_GRADED email failed for ${payload.studentEmail}: ${err.message}`);
    }
  });

  // 7. Quiz Completed
  appEventBus.on(AcademyEvent.QUIZ_COMPLETED, async (payload: QuizCompletedPayload) => {
    try {
      await emailService.sendQuizCompletedEmail(
        payload.email,
        payload.name,
        payload.quizTitle,
        payload.courseTitle,
        payload.score,
        payload.passingScore,
        payload.passed,
        payload.attemptNumber,
        payload.maxAttempts
      );
    } catch (err: any) {
      logger.error(`[EVENT ERROR] QUIZ_COMPLETED email failed for ${payload.email}: ${err.message}`);
    }
  });

  // 8. Course Completed
  appEventBus.on(AcademyEvent.COURSE_COMPLETED, async (payload: CourseCompletedPayload) => {
    try {
      await emailService.sendCourseCompletionEmail(payload.email, payload.name, payload.courseTitle);
    } catch (err: any) {
      logger.error(`[EVENT ERROR] COURSE_COMPLETED email failed for ${payload.email}: ${err.message}`);
    }
  });

  // 9. Certificate Issued
  appEventBus.on(AcademyEvent.CERTIFICATE_ISSUED, async (payload: CertificateIssuedPayload) => {
    try {
      await emailService.sendCertificateIssuedEmail(
        payload.email,
        payload.name,
        payload.courseTitle,
        payload.certificateNumber,
        payload.verificationUrl,
        payload.pdfBuffer
      );
    } catch (err: any) {
      logger.error(`[EVENT ERROR] CERTIFICATE_ISSUED email failed for ${payload.email}: ${err.message}`);
    }
  });

  // 10. Live Class 24H Reminder
  appEventBus.on(AcademyEvent.LIVE_CLASS_REMINDER_24H, async (payload: LiveClassReminderPayload) => {
    try {
      await emailService.sendLiveClassReminder24hEmail(
        payload.email,
        payload.name,
        payload.sessionTitle,
        payload.courseTitle,
        payload.startTime,
        payload.sessionId
      );
    } catch (err: any) {
      logger.error(`[EVENT ERROR] LIVE_CLASS_REMINDER_24H email failed for ${payload.email}: ${err.message}`);
    }
  });

  // 11. Live Class Starting Soon
  appEventBus.on(AcademyEvent.LIVE_CLASS_STARTING_SOON, async (payload: LiveClassReminderPayload) => {
    try {
      await emailService.sendLiveClassStartingSoonEmail(
        payload.email,
        payload.name,
        payload.sessionTitle,
        payload.sessionId
      );
    } catch (err: any) {
      logger.error(`[EVENT ERROR] LIVE_CLASS_STARTING_SOON email failed for ${payload.email}: ${err.message}`);
    }
  });

  // 12. Live Class Missed
  appEventBus.on(AcademyEvent.LIVE_CLASS_MISSED, async (payload: LiveClassMissedPayload) => {
    try {
      await emailService.sendLiveClassMissedEmail(
        payload.email,
        payload.name,
        payload.sessionTitle,
        payload.courseTitle,
        payload.sessionId
      );
    } catch (err: any) {
      logger.error(`[EVENT ERROR] LIVE_CLASS_MISSED email failed for ${payload.email}: ${err.message}`);
    }
  });

  // 13. New Course Announcement
  appEventBus.on(AcademyEvent.NEW_COURSE_ANNOUNCEMENT, async (payload: NewCourseAnnouncementPayload) => {
    try {
      if (payload.studentEmails.length > 0) {
        await emailService.sendNewCourseAnnouncementEmail(
          payload.studentEmails,
          payload.courseTitle,
          payload.courseSlug,
          payload.category,
          payload.description,
          payload.instructorName
        );
      }
    } catch (err: any) {
      logger.error(`[EVENT ERROR] NEW_COURSE_ANNOUNCEMENT email failed: ${err.message}`);
    }
  });

  // 14. Instructor Announcement
  appEventBus.on(AcademyEvent.INSTRUCTOR_ANNOUNCEMENT, async (payload: InstructorAnnouncementPayload) => {
    try {
      if (payload.studentEmails.length > 0) {
        await emailService.sendInstructorAnnouncementEmail(
          payload.studentEmails,
          payload.courseTitle,
          payload.instructorName,
          payload.title,
          payload.message
        );
      }
    } catch (err: any) {
      logger.error(`[EVENT ERROR] INSTRUCTOR_ANNOUNCEMENT email failed: ${err.message}`);
    }
  });

  // 15. Inactive Student Reminder
  appEventBus.on(AcademyEvent.INACTIVE_STUDENT_REMINDER, async (payload: InactiveStudentReminderPayload) => {
    try {
      await emailService.sendInactiveStudentReminderEmail(
        payload.email,
        payload.name,
        payload.courseTitle,
        payload.courseId,
        payload.lastActiveDays,
        payload.progressPercentage
      );
    } catch (err: any) {
      logger.error(`[EVENT ERROR] INACTIVE_STUDENT_REMINDER email failed for ${payload.email}: ${err.message}`);
    }
  });
};
