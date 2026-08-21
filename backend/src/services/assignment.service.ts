import { prisma } from '../config/database';
import { SubmissionStatus } from '@prisma/client';
import { AppError } from '../middlewares/errorHandler';
import { createNotification } from './notification.service';
import { checkAndProcessCourseCompletion } from './certificate.service';

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

  const existing = await prisma.assignmentSubmission.findFirst({
    where: { assignmentId, userId },
  });

  let submission;
  if (existing) {
    submission = await prisma.assignmentSubmission.update({
      where: { id: existing.id },
      data: {
        submissionText: data.submissionText,
        fileUrl: data.fileUrl,
        status: SubmissionStatus.SUBMITTED,
        submittedAt: new Date(),
        submissionAttempts: { increment: 1 },
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

  const passingScore = submission.assignment.passingScore || 70.0;
  let gradedStatus = data.status || SubmissionStatus.GRADED;

  if (data.score !== undefined && !data.status) {
    const percentage = submission.assignment.maxScore > 0 ? (data.score / submission.assignment.maxScore) * 100 : 100;
    gradedStatus = percentage >= passingScore ? SubmissionStatus.PASSED : SubmissionStatus.GRADED;
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
