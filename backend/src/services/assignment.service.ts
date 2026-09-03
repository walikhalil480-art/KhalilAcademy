import { prisma } from '../config/database';
import { SubmissionStatus, StudentRiskLevel, StudentRiskReason, StudentRiskStatus } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import { createNotification } from './notification.service';
import { checkAndProcessCourseCompletion } from './certificate.service';
import { appEventBus, AcademyEvent } from '../events/eventBus';

export const submitAssignment = async (
  userId: string,
  assignmentId: string,
  data: { submissionText?: string; fileUrl?: string }
) => {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: true },
  });

  if (!assignment) throw new AppError('Assignment not found.', 404);

  const activeRecertReq = await prisma.recertificationRequirement.findFirst({
    where: {
      userId,
      courseId: assignment.courseId,
      isCompleted: false,
    },
  });

  const existing = await prisma.assignmentSubmission.findFirst({
    where: { assignmentId, userId },
  });

  // If student is re-certifying and existing submission was prior to revocation, ignore old attempts
  const isPostRecertSubmission = existing && activeRecertReq && existing.submittedAt < activeRecertReq.createdAt;

  if (existing && !isPostRecertSubmission && existing.submissionAttempts >= 3 && existing.status !== SubmissionStatus.PASSED) {
    throw new AppError(
      'You have reached the maximum allowed attempts (3) for this assignment. Please consult your instructor.',
      400
    );
  }

  // If not in active re-certification, check active anti-cheating disqualification risk
  if (!activeRecertReq) {
    const risk = await prisma.studentRiskRecord.findFirst({
      where: {
        userId,
        assignmentId,
        status: StudentRiskStatus.ACTIVE,
        title: { contains: 'Anti-Cheating' },
      },
    });
    if (risk) {
      throw new AppError('Your submission cannot be accepted because you have been disqualified for academic dishonesty.', 403);
    }
  }

  let submission;
  if (existing) {
    submission = await prisma.assignmentSubmission.update({
      where: { id: existing.id },
      data: {
        submissionText: data.submissionText,
        fileUrl: data.fileUrl,
        status: SubmissionStatus.SUBMITTED,
        submittedAt: new Date(),
        feedback: null,
        submissionAttempts: isPostRecertSubmission ? 1 : { increment: 1 },
      },
    });
  } else {
    submission = await prisma.assignmentSubmission.create({
      data: {
        assignmentId,
        userId,
        submissionText: data.submissionText,
        fileUrl: data.fileUrl,
        status: SubmissionStatus.SUBMITTED,
        submissionAttempts: 1,
      },
    });
  }

  // Fetch student and instructor info to emit event
  const student = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
  const instructor = assignment.course.instructorId
    ? await prisma.user.findUnique({ where: { id: assignment.course.instructorId }, select: { name: true, email: true } })
    : null;

  if (student) {
    appEventBus.emitEvent(AcademyEvent.ASSIGNMENT_SUBMITTED, {
      userId,
      studentEmail: student.email,
      studentName: student.name,
      instructorEmail: instructor?.email,
      instructorName: instructor?.name,
      assignmentId,
      assignmentTitle: assignment.title,
      courseId: assignment.courseId,
      courseTitle: assignment.course.title,
      submissionAttempts: submission.submissionAttempts,
    });
  }

  return submission;
};

export const gradeAssignmentSubmission = async (
  instructorUserId: string,
  submissionId: string,
  data: { score?: number; feedback?: string; status?: SubmissionStatus }
) => {
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: { include: { course: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!submission) throw new AppError('Submission not found.', 404);

  // Authoritative passing requirement: 80% or above
  const passingScore = submission.assignment.passingScore || 80.0;
  let gradedStatus = data.status || SubmissionStatus.GRADED;

  if (data.score !== undefined && !data.status) {
    const percentage = submission.assignment.maxScore > 0 ? (data.score / submission.assignment.maxScore) * 100 : 100;
    gradedStatus = percentage >= 80.0 ? SubmissionStatus.PASSED : SubmissionStatus.GRADED;
  }

  const updated = await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      score: data.score !== undefined ? data.score : submission.score,
      feedback: data.feedback !== undefined ? data.feedback : submission.feedback,
      status: gradedStatus,
      gradedAt: new Date(),
      gradedByUserId: instructorUserId,
    },
  });

  // Notify student based on status
  let notifTitle = `Assignment Evaluated: ${submission.assignment.title}`;
  let notifMessage = `Your submission for "${submission.assignment.title}" was evaluated.`;
  let notifType: any = 'ASSIGNMENT_GRADED';

  if (gradedStatus === SubmissionStatus.PASSED) {
    notifTitle = `🎉 Assignment Passed: ${submission.assignment.title}`;
    notifMessage = `Congratulations! Your submission for "${submission.assignment.title}" has been approved and passed.`;
  } else if (gradedStatus === SubmissionStatus.NEEDS_REVISION) {
    notifTitle = `⚠️ Revision Requested: ${submission.assignment.title}`;
    notifMessage = `Your instructor requested revisions on "${submission.assignment.title}": ${data.feedback || 'Please check feedback and resubmit.'}`;
    notifType = 'ASSIGNMENT_NEEDS_REVISION';
  } else if (data.score !== undefined) {
    notifMessage = `Your submission for "${submission.assignment.title}" in "${submission.assignment.course.title}" was scored ${data.score}/${submission.assignment.maxScore}.`;
  }

  await createNotification({
    userId: submission.userId,
    title: notifTitle,
    message: notifMessage,
    type: notifType,
    linkUrl: `/courses/${submission.assignment.course.slug}/learn`,
  });

  // Emit event to trigger assignment graded email
  appEventBus.emitEvent(AcademyEvent.ASSIGNMENT_GRADED, {
    userId: submission.userId,
    studentEmail: submission.user.email,
    studentName: submission.user.name,
    assignmentId: submission.assignment.id,
    assignmentTitle: submission.assignment.title,
    courseId: submission.assignment.course.id,
    courseTitle: submission.assignment.course.title,
    score: data.score !== undefined ? data.score : submission.score || undefined,
    maxScore: submission.assignment.maxScore,
    status: gradedStatus as any,
    feedback: data.feedback || undefined,
  });

  // Trigger course completion evaluation
  await checkAndProcessCourseCompletion(submission.userId, submission.assignment.courseId);

  return updated;
};

export const getAssignmentSubmissionsForCourse = async (courseId: string, instructorUserId: string, userRole: string) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AppError('Course not found.', 404);

  if (userRole === 'INSTRUCTOR' && course.instructorId !== instructorUserId) {
    throw new AppError('You can only view submissions for your own courses.', 403);
  }

  return prisma.assignmentSubmission.findMany({
    where: { assignment: { courseId } },
    include: {
      user: { select: { id: true, name: true, email: true, avatar: true } },
      assignment: { select: { id: true, title: true, maxScore: true, dueDate: true } },
    },
    orderBy: { submittedAt: 'desc' },
  });
};

export const disqualifyForCheating = async (userId: string, assignmentId: string) => {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: true },
  });

  if (!assignment) throw new AppError('Assignment not found.', 404);

  const existing = await prisma.assignmentSubmission.findFirst({
    where: { assignmentId, userId },
  });

  // If already passed, cannot be disqualified retroactively
  if (existing && existing.status === SubmissionStatus.PASSED) {
    return { submission: existing, isCheatingLocked: false };
  }

  let submission;
  const disqualificationFeedback = 'Disqualified: Multiple tab-switch anti-cheating violations detected (3/3). Access permanently revoked.';
  if (existing) {
    submission = await prisma.assignmentSubmission.update({
      where: { id: existing.id },
      data: {
        score: 0,
        submissionAttempts: 3,
        status: SubmissionStatus.RETURNED,
        feedback: disqualificationFeedback,
      },
    });
  } else {
    submission = await prisma.assignmentSubmission.create({
      data: {
        assignmentId,
        userId,
        score: 0,
        submissionAttempts: 3,
        status: SubmissionStatus.RETURNED,
        feedback: disqualificationFeedback,
        submissionText: '[DISQUALIFIED DUE TO 3 TAB-SWITCH PROCTOR VIOLATIONS]',
      },
    });
  }

  // Create student risk record for instructor tracking
  try {
    const existingRisk = await prisma.studentRiskRecord.findFirst({
      where: {
        userId,
        assignmentId,
        title: { contains: 'Anti-Cheating' },
        status: StudentRiskStatus.ACTIVE,
      },
    });

    if (!existingRisk) {
      await prisma.studentRiskRecord.create({
        data: {
          userId,
          courseId: assignment.courseId,
          assignmentId,
          riskLevel: StudentRiskLevel.HIGH,
          riskReason: StudentRiskReason.MULTIPLE_RISK_FACTORS,
          title: 'Anti-Cheating Disqualification: Tab Switching (3/3)',
          details: `Student was disqualified and locked out after 3 repeated tab-switching / focus loss violations on assignment: "${assignment.title}".`,
          status: StudentRiskStatus.ACTIVE,
          recommendedAction: 'Review proctoring logs and conduct an academic integrity interview with the student before resetting attempts.',
        },
      });
    }
  } catch (err) {
    console.error('Failed to create student risk record for cheating:', err);
  }

  // Create student notification
  try {
    await createNotification({
      userId,
      title: `🚫 Assignment Disqualified: ${assignment.title}`,
      message: `Your access to "${assignment.title}" has been permanently revoked due to exceeding 3 allowed tab switches during the assessment.`,
      type: 'ASSIGNMENT_GRADED' as any,
      linkUrl: `/courses/${assignment.course.slug}/learn`,
    });
  } catch (err) {
    console.error('Failed to create cheating notification:', err);
  }

  return { submission, isCheatingLocked: true };
};

export const resetAssignmentAttemptsForStudent = async (
  assignmentId: string,
  targetUserId: string,
  instructorUserId: string,
  userRole: string
) => {
  const assignment = await prisma.assignment.findUnique({
    where: { id: assignmentId },
    include: { course: true },
  });

  if (!assignment) throw new AppError('Assignment not found.', 404);

  if (userRole === 'INSTRUCTOR' && assignment.course.instructorId !== instructorUserId) {
    throw new AppError('You can only reset attempts for your own courses.', 403);
  }

  // Delete previous submissions to give a clean state with 0 attempts
  await prisma.assignmentSubmission.deleteMany({
    where: { assignmentId, userId: targetUserId },
  });

  // Resolve active anti-cheating risk records for this student and assignment
  await prisma.studentRiskRecord.updateMany({
    where: {
      assignmentId,
      userId: targetUserId,
      status: StudentRiskStatus.ACTIVE,
    },
    data: {
      status: StudentRiskStatus.RESOLVED,
      resolvedAt: new Date(),
      resolutionReason: 'Instructor or administrator authorized access reset and cleared anti-cheating lockout.',
    },
  });

  // Send unlocked notification to the student
  try {
    await createNotification({
      userId: targetUserId,
      title: `🔓 Assignment Unlocked: ${assignment.title}`,
      message: `Your instructor has reset your attempts and unlocked "${assignment.title}". Please keep the assessment window in focus and complete it legally.`,
      type: 'ASSIGNMENT_GRADED' as any,
      linkUrl: `/assignments/${assignment.id}`,
    });
  } catch (err) {
    console.error('Failed to create unlock notification:', err);
  }

  return { success: true, message: 'Assignment attempts reset and student unlocked successfully.' };
};


