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
  });

  if (!assignment) throw new AppError('Assignment not found.', 404);

  // Upsert submission
  const submission = await prisma.assignmentSubmission.upsert({
    where: {
      id: (await prisma.assignmentSubmission.findFirst({ where: { assignmentId, userId } }))?.id || 'non-existent-id',
    },
    update: {
      submissionText: data.submissionText,
      fileUrl: data.fileUrl,
      status: SubmissionStatus.SUBMITTED,
      submittedAt: new Date(),
    },
    create: {
      assignmentId,
      userId,
      submissionText: data.submissionText,
      fileUrl: data.fileUrl,
      status: SubmissionStatus.SUBMITTED,
    },
  });

  return submission;
};

export const gradeAssignmentSubmission = async (
  instructorUserId: string,
  submissionId: string,
  data: { score: number; feedback?: string; status?: SubmissionStatus }
) => {
  const submission = await prisma.assignmentSubmission.findUnique({
    where: { id: submissionId },
    include: {
      assignment: { include: { course: true } },
      user: { select: { id: true, name: true, email: true } },
    },
  });

  if (!submission) throw new AppError('Submission not found.', 404);

  const gradedStatus = data.status || SubmissionStatus.GRADED;

  const updated = await prisma.assignmentSubmission.update({
    where: { id: submissionId },
    data: {
      score: data.score,
      feedback: data.feedback,
      status: gradedStatus,
      gradedAt: new Date(),
      gradedByUserId: instructorUserId,
    },
  });

  // Notify student
  await createNotification({
    userId: submission.userId,
    title: `Assignment Graded: ${submission.assignment.title}`,
    message: `Your submission for "${submission.assignment.title}" in course "${submission.assignment.course.title}" was graded. Score: ${data.score}/${submission.assignment.maxScore}.`,
    type: 'ASSIGNMENT_GRADED',
    linkUrl: `/courses/${submission.assignment.course.slug}/learn`,
  });

  // Trigger course completion check
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
