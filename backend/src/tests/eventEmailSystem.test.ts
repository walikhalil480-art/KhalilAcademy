import { appEventBus, AcademyEvent } from '../events/eventBus';
import { registerEmailEventSubscribers } from '../events/emailEventSubscriber';
import * as emailService from '../services/email.service';

describe('Event-Driven Email System (14 Lifecycle Events)', () => {
  beforeAll(() => {
    registerEmailEventSubscribers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('1. USER_REGISTERED event triggers email verification', async () => {
    const spy = jest.spyOn(emailService, 'sendVerificationEmail').mockResolvedValue(true);

    const payload = {
      userId: 'user-1',
      email: 'student@khalilacademy.com',
      name: 'Ahmed Student',
      verificationToken: 'token-abc-123',
    };

    appEventBus.emitEvent(AcademyEvent.USER_REGISTERED, payload);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(spy).toHaveBeenCalledWith('student@khalilacademy.com', 'token-abc-123', 'Ahmed Student');
  });

  test('2. USER_VERIFIED event triggers welcome email', async () => {
    const spy = jest.spyOn(emailService, 'sendWelcomeEmail').mockResolvedValue(true);

    const payload = {
      userId: 'user-1',
      email: 'student@khalilacademy.com',
      name: 'Ahmed Student',
    };

    appEventBus.emitEvent(AcademyEvent.USER_VERIFIED, payload);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(spy).toHaveBeenCalledWith('student@khalilacademy.com', 'Ahmed Student');
  });

  test('3. COURSE_ENROLLED event triggers enrollment confirmation', async () => {
    const spy = jest.spyOn(emailService, 'sendCourseEnrolledEmail').mockResolvedValue(true);

    const payload = {
      userId: 'user-1',
      email: 'student@khalilacademy.com',
      name: 'Ahmed Student',
      courseId: 'course-1',
      courseTitle: 'AWS Solutions Architect Masterclass',
      courseSlug: 'aws-solutions-architect',
      instructorName: 'Khalil Instructor',
    };

    appEventBus.emitEvent(AcademyEvent.COURSE_ENROLLED, payload);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(spy).toHaveBeenCalledWith(
      'student@khalilacademy.com',
      'Ahmed Student',
      'AWS Solutions Architect Masterclass',
      'aws-solutions-architect',
      'Khalil Instructor'
    );
  });

  test('4. COURSE_STARTED event triggers milestone cheers', async () => {
    const spy = jest.spyOn(emailService, 'sendCourseStartedEmail').mockResolvedValue(true);

    const payload = {
      userId: 'user-1',
      email: 'student@khalilacademy.com',
      name: 'Ahmed Student',
      courseId: 'course-1',
      courseTitle: 'AWS Solutions Architect Masterclass',
      lessonTitle: 'Introduction to Cloud Computing',
    };

    appEventBus.emitEvent(AcademyEvent.COURSE_STARTED, payload);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(spy).toHaveBeenCalledWith(
      'student@khalilacademy.com',
      'Ahmed Student',
      'AWS Solutions Architect Masterclass',
      'Introduction to Cloud Computing'
    );
  });

  test('5. ASSIGNMENT_SUBMITTED event triggers student receipt and instructor notification', async () => {
    const studentSpy = jest.spyOn(emailService, 'sendAssignmentSubmittedEmail').mockResolvedValue(true);
    const instructorSpy = jest.spyOn(emailService, 'sendAssignmentInstructorAlertEmail').mockResolvedValue(true);

    const payload = {
      userId: 'user-1',
      studentEmail: 'student@khalilacademy.com',
      studentName: 'Ahmed Student',
      instructorEmail: 'instructor@khalilacademy.com',
      instructorName: 'Lead Instructor',
      assignmentId: 'assign-1',
      assignmentTitle: 'Deploy VPC Architecture',
      courseId: 'course-1',
      courseTitle: 'AWS Solutions Architect Masterclass',
      submissionAttempts: 1,
    };

    appEventBus.emitEvent(AcademyEvent.ASSIGNMENT_SUBMITTED, payload);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(studentSpy).toHaveBeenCalledWith(
      'student@khalilacademy.com',
      'Ahmed Student',
      'Deploy VPC Architecture',
      'AWS Solutions Architect Masterclass',
      1
    );
    expect(instructorSpy).toHaveBeenCalledWith(
      'instructor@khalilacademy.com',
      'Lead Instructor',
      'Ahmed Student',
      'Deploy VPC Architecture',
      'AWS Solutions Architect Masterclass'
    );
  });

  test('6. ASSIGNMENT_GRADED event triggers evaluation result with score and feedback', async () => {
    const spy = jest.spyOn(emailService, 'sendAssignmentGradedEmail').mockResolvedValue(true);

    const payload = {
      userId: 'user-1',
      studentEmail: 'student@khalilacademy.com',
      studentName: 'Ahmed Student',
      assignmentId: 'assign-1',
      assignmentTitle: 'Deploy VPC Architecture',
      courseId: 'course-1',
      courseTitle: 'AWS Solutions Architect Masterclass',
      score: 95,
      maxScore: 100,
      status: 'PASSED' as const,
      feedback: 'Excellent infrastructure topology and clean CIDR notation.',
    };

    appEventBus.emitEvent(AcademyEvent.ASSIGNMENT_GRADED, payload);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(spy).toHaveBeenCalledWith(
      'student@khalilacademy.com',
      'Ahmed Student',
      'Deploy VPC Architecture',
      'AWS Solutions Architect Masterclass',
      'PASSED',
      95,
      100,
      'Excellent infrastructure topology and clean CIDR notation.'
    );
  });

  test('7. QUIZ_COMPLETED event triggers assessment evaluation', async () => {
    const spy = jest.spyOn(emailService, 'sendQuizCompletedEmail').mockResolvedValue(true);

    const payload = {
      userId: 'user-1',
      email: 'student@khalilacademy.com',
      name: 'Ahmed Student',
      quizId: 'quiz-1',
      quizTitle: 'Cloud Fundamentals Assessment',
      courseId: 'course-1',
      courseTitle: 'AWS Solutions Architect Masterclass',
      score: 100,
      passingScore: 80,
      passed: true,
      attemptNumber: 1,
      maxAttempts: 3,
    };

    appEventBus.emitEvent(AcademyEvent.QUIZ_COMPLETED, payload);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(spy).toHaveBeenCalledWith(
      'student@khalilacademy.com',
      'Ahmed Student',
      'Cloud Fundamentals Assessment',
      'AWS Solutions Architect Masterclass',
      100,
      80,
      true,
      1,
      3
    );
  });

  test('8. COURSE_COMPLETED event triggers congratulations & next courses CTA', async () => {
    const spy = jest.spyOn(emailService, 'sendCourseCompletionEmail').mockResolvedValue(true);

    const payload = {
      userId: 'user-1',
      email: 'student@khalilacademy.com',
      name: 'Ahmed Student',
      courseId: 'course-1',
      courseTitle: 'AWS Solutions Architect Masterclass',
      completedAt: new Date(),
    };

    appEventBus.emitEvent(AcademyEvent.COURSE_COMPLETED, payload);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(spy).toHaveBeenCalledWith(
      'student@khalilacademy.com',
      'Ahmed Student',
      'AWS Solutions Architect Masterclass'
    );
  });

  test('9. CERTIFICATE_ISSUED event triggers email with PDF attachment', async () => {
    const spy = jest.spyOn(emailService, 'sendCertificateIssuedEmail').mockResolvedValue(true);
    const fakePdfBuffer = Buffer.from('FAKE_PDF_CONTENT');

    const payload = {
      userId: 'user-1',
      email: 'student@khalilacademy.com',
      name: 'Ahmed Student',
      courseId: 'course-1',
      courseTitle: 'AWS Solutions Architect Masterclass',
      certificateNumber: 'KHA-2026-999888',
      verificationUrl: 'http://localhost:5173/certificates/KHA-2026-999888',
      pdfBuffer: fakePdfBuffer,
    };

    appEventBus.emitEvent(AcademyEvent.CERTIFICATE_ISSUED, payload);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(spy).toHaveBeenCalledWith(
      'student@khalilacademy.com',
      'Ahmed Student',
      'AWS Solutions Architect Masterclass',
      'KHA-2026-999888',
      'http://localhost:5173/certificates/KHA-2026-999888',
      fakePdfBuffer
    );
  });

  test('10. LIVE_CLASS_REMINDER_24H event triggers 24-hour advance notice', async () => {
    const spy = jest.spyOn(emailService, 'sendLiveClassReminder24hEmail').mockResolvedValue(true);
    const sessionDate = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const payload = {
      userId: 'user-1',
      email: 'student@khalilacademy.com',
      name: 'Ahmed Student',
      sessionId: 'session-1',
      sessionTitle: 'Kubernetes Deep Dive Live Workshop',
      courseTitle: 'DevOps & Containers',
      startTime: sessionDate,
    };

    appEventBus.emitEvent(AcademyEvent.LIVE_CLASS_REMINDER_24H, payload);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(spy).toHaveBeenCalledWith(
      'student@khalilacademy.com',
      'Ahmed Student',
      'Kubernetes Deep Dive Live Workshop',
      'DevOps & Containers',
      sessionDate,
      'session-1'
    );
  });

  test('11. LIVE_CLASS_STARTING_SOON event triggers 15-minute countdown alert', async () => {
    const spy = jest.spyOn(emailService, 'sendLiveClassStartingSoonEmail').mockResolvedValue(true);
    const sessionDate = new Date(Date.now() + 15 * 60 * 1000);

    const payload = {
      userId: 'user-1',
      email: 'student@khalilacademy.com',
      name: 'Ahmed Student',
      sessionId: 'session-1',
      sessionTitle: 'Kubernetes Deep Dive Live Workshop',
      courseTitle: 'DevOps & Containers',
      startTime: sessionDate,
    };

    appEventBus.emitEvent(AcademyEvent.LIVE_CLASS_STARTING_SOON, payload);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(spy).toHaveBeenCalledWith(
      'student@khalilacademy.com',
      'Ahmed Student',
      'Kubernetes Deep Dive Live Workshop',
      'session-1'
    );
  });

  test('12. LIVE_CLASS_MISSED event triggers missed session recording email', async () => {
    const spy = jest.spyOn(emailService, 'sendLiveClassMissedEmail').mockResolvedValue(true);

    const payload = {
      userId: 'user-1',
      email: 'student@khalilacademy.com',
      name: 'Ahmed Student',
      sessionId: 'session-1',
      sessionTitle: 'Kubernetes Deep Dive Live Workshop',
      courseTitle: 'DevOps & Containers',
      recordingUrl: 'http://localhost:5000/uploads/recordings/session-1.mp4',
    };

    appEventBus.emitEvent(AcademyEvent.LIVE_CLASS_MISSED, payload);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(spy).toHaveBeenCalledWith(
      'student@khalilacademy.com',
      'Ahmed Student',
      'Kubernetes Deep Dive Live Workshop',
      'DevOps & Containers',
      'session-1'
    );
  });

  test('13. NEW_COURSE_ANNOUNCEMENT event triggers broadcast to students', async () => {
    const spy = jest.spyOn(emailService, 'sendNewCourseAnnouncementEmail').mockResolvedValue(true);

    const payload = {
      studentEmails: ['student1@khalilacademy.com', 'student2@khalilacademy.com'],
      courseId: 'course-new-1',
      courseTitle: 'Full-Stack Next.js 15 & AI Engineering',
      courseSlug: 'fullstack-nextjs-ai',
      category: 'Software Engineering',
      description: 'Master fullstack AI development with Next.js 15, LangChain and PostgreSQL.',
      instructorName: 'Khalil Lead Instructor',
    };

    appEventBus.emitEvent(AcademyEvent.NEW_COURSE_ANNOUNCEMENT, payload);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(spy).toHaveBeenCalledWith(
      ['student1@khalilacademy.com', 'student2@khalilacademy.com'],
      'Full-Stack Next.js 15 & AI Engineering',
      'fullstack-nextjs-ai',
      'Software Engineering',
      'Master fullstack AI development with Next.js 15, LangChain and PostgreSQL.',
      'Khalil Lead Instructor'
    );
  });

  test('14. INSTRUCTOR_ANNOUNCEMENT event triggers course broadcast', async () => {
    const spy = jest.spyOn(emailService, 'sendInstructorAnnouncementEmail').mockResolvedValue(true);

    const payload = {
      studentEmails: ['student1@khalilacademy.com'],
      courseId: 'course-1',
      courseTitle: 'AWS Solutions Architect Masterclass',
      instructorName: 'Khalil Instructor',
      title: 'Updated Hands-on Lab Environment',
      message: 'We have upgraded all AWS sandbox accounts with new IAM credentials for Module 3.',
    };

    appEventBus.emitEvent(AcademyEvent.INSTRUCTOR_ANNOUNCEMENT, payload);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(spy).toHaveBeenCalledWith(
      ['student1@khalilacademy.com'],
      'AWS Solutions Architect Masterclass',
      'Khalil Instructor',
      'Updated Hands-on Lab Environment',
      'We have upgraded all AWS sandbox accounts with new IAM credentials for Module 3.'
    );
  });

  test('15. INACTIVE_STUDENT_REMINDER event triggers re-engagement nudge', async () => {
    const spy = jest.spyOn(emailService, 'sendInactiveStudentReminderEmail').mockResolvedValue(true);

    const payload = {
      userId: 'user-1',
      email: 'student@khalilacademy.com',
      name: 'Ahmed Student',
      courseId: 'course-1',
      courseTitle: 'AWS Solutions Architect Masterclass',
      lastActiveDays: 8,
      progressPercentage: 45,
    };

    appEventBus.emitEvent(AcademyEvent.INACTIVE_STUDENT_REMINDER, payload);
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(spy).toHaveBeenCalledWith(
      'student@khalilacademy.com',
      'Ahmed Student',
      'AWS Solutions Architect Masterclass',
      'course-1',
      8,
      45
    );
  });
});
