import { prisma } from '../config/database';
import { AppError } from '../middlewares/errorHandler';
import { EnrollmentStatus, SubmissionStatus } from '@prisma/client';
import { env } from '../config/env';

export const getCourseAnalytics = async (courseId: string, userId: string, userRole: string) => {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      id: true,
      title: true,
      slug: true,
      thumbnail: true,
      instructorId: true,
      status: true,
      price: true,
      isFree: true,
      requireAssignments: true,
      assignmentPassingScore: true,
      requireQuizzes: true,
      quizPassingScore: true,
      instructor: {
        select: { id: true, name: true, email: true },
      },
      modules: {
        orderBy: { order: 'asc' },
        select: {
          id: true,
          title: true,
          order: true,
          lessons: {
            where: { isPublished: true },
            orderBy: { order: 'asc' },
            select: { id: true, title: true, durationMinutes: true, order: true },
          },
          quizzes: {
            select: { id: true, title: true, passingScore: true, maxAttempts: true, isFinalAssessment: true },
          },
          assignments: {
            select: { id: true, title: true, maxScore: true, passingScore: true, dueDate: true },
          },
        },
      },
    },
  });

  if (!course) {
    throw new AppError('Course not found.', 404);
  }

  const isInstructor = course.instructorId === userId;
  const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

  if (!isInstructor && !isAdmin) {
    throw new AppError('Access denied. Only the course instructor and platform administrators can view course analytics and student results.', 403);
  }

  // 1. Fetch published lessons, quizzes, and assignments in this course
  const allLessons = course.modules.flatMap((m) => m.lessons);
  const allQuizzes = course.modules.flatMap((m) => m.quizzes);
  const allAssignments = course.modules.flatMap((m) => m.assignments);

  const totalLessonsCount = allLessons.length;
  const totalQuizzesCount = allQuizzes.length;
  const totalAssignmentsCount = allAssignments.length;

  const quizIds = allQuizzes.map((q) => q.id);
  const assignmentIds = allAssignments.map((a) => a.id);

  // 2. Fetch Enrollments
  const enrollments = await prisma.enrollment.findMany({
    where: {
      courseId,
      status: { in: [EnrollmentStatus.ACTIVE, EnrollmentStatus.COMPLETED] },
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, avatar: true, createdAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const enrolledUserIds = enrollments.map((e) => e.userId);

  // 3. Fetch Lesson Progress for all enrolled students
  const lessonProgresses = enrolledUserIds.length > 0
    ? await prisma.lessonProgress.findMany({
        where: {
          userId: { in: enrolledUserIds },
          lesson: { module: { courseId } },
        },
        select: {
          userId: true,
          lessonId: true,
          isCompleted: true,
          watchTime: true,
          lastWatchedPosition: true,
          updatedAt: true,
        },
      })
    : [];

  // 4. Fetch Quiz Attempts for this course
  const quizAttempts = quizIds.length > 0
    ? await prisma.quizAttempt.findMany({
        where: { quizId: { in: quizIds } },
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
          quiz: { select: { id: true, title: true, passingScore: true, isFinalAssessment: true } },
          answers: {
            include: {
              question: { select: { questionText: true, points: true } },
              selectedOption: { select: { optionText: true, isCorrect: true } },
            },
          },
        },
        orderBy: { completedAt: 'desc' },
      })
    : [];

  // 5. Fetch Assignment Submissions for this course
  const assignmentSubmissions = assignmentIds.length > 0
    ? await prisma.assignmentSubmission.findMany({
        where: { assignmentId: { in: assignmentIds } },
        include: {
          user: { select: { id: true, name: true, email: true, avatar: true } },
          assignment: { select: { id: true, title: true, maxScore: true, passingScore: true, dueDate: true } },
          gradedBy: { select: { id: true, name: true } },
        },
        orderBy: { submittedAt: 'desc' },
      })
    : [];

  // 6. Fetch Certificates issued for this course
  const certificates = await prisma.certificate.findMany({
    where: { courseId, isRevoked: false },
    select: {
      id: true,
      userId: true,
      certificateNumber: true,
      issueDate: true,
    },
  });

  const certificateMap = new Map<string, any>();
  certificates.forEach((c) => certificateMap.set(c.userId, {
    ...c,
    verificationUrl: `${env.APP_URL}/verify/${c.certificateNumber}`,
    downloadUrl: `/api/certificates/${c.certificateNumber}/download`,
  }));

  // 7. Aggregate Course Level Performance Metrics
  const totalEnrolled = enrollments.length;
  const completedStudents = enrollments.filter(
    (e) => e.status === EnrollmentStatus.COMPLETED || e.progressPercentage >= 100
  ).length;

  const courseCompletionRate = totalEnrolled > 0
    ? parseFloat(((completedStudents / totalEnrolled) * 100).toFixed(1))
    : 0.0;

  // Average Quiz Score
  const totalQuizScoreSum = quizAttempts.reduce((sum, a) => sum + a.percentage, 0);
  const averageQuizScore = quizAttempts.length > 0
    ? parseFloat((totalQuizScoreSum / quizAttempts.length).toFixed(1))
    : 0.0;

  // Assignment Metrics
  const gradedSubmissions = assignmentSubmissions.filter((s) => s.score !== null && s.score !== undefined);
  const passedSubmissions = assignmentSubmissions.filter((s) => s.status === SubmissionStatus.PASSED);
  const pendingSubmissions = assignmentSubmissions.filter((s) => s.status === SubmissionStatus.SUBMITTED);

  const averageAssignmentScore = gradedSubmissions.length > 0
    ? parseFloat(
        (
          gradedSubmissions.reduce((sum, s) => {
            const max = s.assignment.maxScore || 100;
            return sum + (max > 0 ? (s.score! / max) * 100 : 100);
          }, 0) / gradedSubmissions.length
        ).toFixed(1)
      )
    : 0.0;

  const assignmentPassRate = assignmentSubmissions.length > 0
    ? parseFloat(((passedSubmissions.length / assignmentSubmissions.length) * 100).toFixed(1))
    : 0.0;

  // 8. Build Detailed Student-by-Student Performance Rows
  const studentPerformance = enrollments.map((enr) => {
    const studentId = enr.userId;
    const studentUser = enr.user;

    // Student Lesson Progress
    const studentProgressList = lessonProgresses.filter((p) => p.userId === studentId);
    const completedLessonsCount = studentProgressList.filter((p) => p.isCompleted).length;

    // Student Quiz Performance
    const studentQuizAttempts = quizAttempts.filter((a) => a.userId === studentId);
    const studentQuizAverage = studentQuizAttempts.length > 0
      ? parseFloat(
          (studentQuizAttempts.reduce((sum, a) => sum + a.percentage, 0) / studentQuizAttempts.length).toFixed(1)
        )
      : null;

    const quizBreakdown = allQuizzes.map((q) => {
      const attempts = studentQuizAttempts.filter((a) => a.quizId === q.id);
      const bestScore = attempts.length > 0 ? Math.max(...attempts.map((a) => a.percentage)) : null;
      const latestAttempt = attempts.length > 0 ? attempts[0] : null;
      const hasPassed = attempts.some((a) => a.passed);

      return {
        quizId: q.id,
        title: q.title,
        isFinalAssessment: q.isFinalAssessment,
        passingScore: q.passingScore,
        attemptsCount: attempts.length,
        maxAttempts: q.maxAttempts,
        bestScore,
        lastScore: latestAttempt ? latestAttempt.percentage : null,
        passed: hasPassed,
        latestAttemptAt: latestAttempt ? latestAttempt.completedAt : null,
      };
    });

    // Student Assignment Submissions
    const studentSubmissions = assignmentSubmissions.filter((s) => s.userId === studentId);
    const assignmentBreakdown = allAssignments.map((a) => {
      const submission = studentSubmissions.find((s) => s.assignmentId === a.id);
      const scorePct = submission && submission.score !== null && a.maxScore > 0
        ? parseFloat(((submission.score / a.maxScore) * 100).toFixed(1))
        : null;

      return {
        assignmentId: a.id,
        title: a.title,
        maxScore: a.maxScore,
        passingScore: a.passingScore,
        submissionId: submission ? submission.id : null,
        status: submission ? submission.status : 'NOT_SUBMITTED',
        score: submission ? submission.score : null,
        scorePercentage: scorePct,
        feedback: submission ? submission.feedback : null,
        submissionText: submission ? submission.submissionText : null,
        fileUrl: submission ? submission.fileUrl : null,
        submittedAt: submission ? submission.submittedAt : null,
        gradedAt: submission ? submission.gradedAt : null,
        gradedBy: submission?.gradedBy ? submission.gradedBy.name : null,
      };
    });

    // Last Active Timestamp
    const dates: Date[] = [enr.createdAt];
    studentProgressList.forEach((p) => { if (p.updatedAt) dates.push(p.updatedAt); });
    studentQuizAttempts.forEach((q) => { if (q.completedAt) dates.push(q.completedAt); });
    studentSubmissions.forEach((s) => { if (s.submittedAt) dates.push(s.submittedAt); });
    const lastActive = new Date(Math.max(...dates.map((d) => new Date(d).getTime())));

    // Certificate
    const cert = certificateMap.get(studentId) || null;

    return {
      studentId,
      name: studentUser.name,
      email: studentUser.email,
      avatar: studentUser.avatar,
      enrolledAt: enr.createdAt,
      status: enr.status,
      progressPercentage: enr.progressPercentage,
      completedLessonsCount,
      totalLessonsCount,
      averageQuizScore: studentQuizAverage,
      quizzes: quizBreakdown,
      assignments: assignmentBreakdown,
      certificate: cert
        ? {
            isIssued: true,
            certificateNumber: cert.certificateNumber,
            issuedAt: cert.issueDate,
            downloadUrl: cert.downloadUrl,
            verificationUrl: cert.verificationUrl,
          }
        : { isIssued: false },
      lastActive,
    };
  });

  return {
    course: {
      id: course.id,
      title: course.title,
      slug: course.slug,
      thumbnail: course.thumbnail,
      status: course.status,
      price: course.price,
      isFree: course.isFree,
      instructor: course.instructor,
      requireAssignments: course.requireAssignments,
      assignmentPassingScore: course.assignmentPassingScore,
      requireQuizzes: course.requireQuizzes,
      quizPassingScore: course.quizPassingScore,
    },
    stats: {
      totalEnrolled,
      completedStudents,
      completionRate: courseCompletionRate,
      totalLessonsCount,
      totalQuizzesCount,
      totalAssignmentsCount,
      averageQuizScore,
      totalQuizAttempts: quizAttempts.length,
      averageAssignmentScore,
      totalAssignmentSubmissions: assignmentSubmissions.length,
      assignmentPassRate,
      pendingGradingCount: pendingSubmissions.length,
      certificatesIssuedCount: certificates.length,
    },
    students: studentPerformance,
    submissions: assignmentSubmissions.map((s) => ({
      id: s.id,
      assignmentId: s.assignmentId,
      assignmentTitle: s.assignment.title,
      maxScore: s.assignment.maxScore,
      passingScore: s.assignment.passingScore,
      dueDate: s.assignment.dueDate,
      studentId: s.userId,
      studentName: s.user.name,
      studentEmail: s.user.email,
      studentAvatar: s.user.avatar,
      submissionText: s.submissionText,
      fileUrl: s.fileUrl,
      status: s.status,
      score: s.score,
      feedback: s.feedback,
      submissionAttempts: s.submissionAttempts,
      submittedAt: s.submittedAt,
      gradedAt: s.gradedAt,
      gradedBy: s.gradedBy ? s.gradedBy.name : null,
    })),
    quizAttempts: quizAttempts.map((a) => ({
      id: a.id,
      quizId: a.quizId,
      quizTitle: a.quiz.title,
      isFinalAssessment: a.quiz.isFinalAssessment,
      passingScore: a.quiz.passingScore,
      studentId: a.userId,
      studentName: a.user.name,
      studentEmail: a.user.email,
      studentAvatar: a.user.avatar,
      score: a.score,
      maxScore: a.maxScore,
      percentage: a.percentage,
      passed: a.passed,
      completedAt: a.completedAt,
      answers: a.answers.map((ans) => ({
        id: ans.id,
        questionText: ans.question.questionText,
        points: ans.question.points,
        selectedOptionText: ans.selectedOption?.optionText || 'No option selected',
        isCorrect: ans.isCorrect,
      })),
    })),
  };
};
