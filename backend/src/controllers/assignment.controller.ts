import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import * as assignmentService from '../services/assignment.service';
import { prisma } from '../config/database';

export const submitAssignment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const submission = await assignmentService.submitAssignment(req.user!.id, req.params.id, {
      submissionText: req.body.submissionText,
      fileUrl: req.body.fileUrl,
    });
    res.json({ success: true, message: 'Assignment submitted successfully.', submission });
  } catch (error) {
    next(error);
  }
};

export const gradeSubmission = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const scoreVal = req.body.score !== undefined && req.body.score !== '' ? parseFloat(req.body.score) : undefined;
    const updated = await assignmentService.gradeAssignmentSubmission(req.user!.id, req.params.id, {
      score: scoreVal !== undefined && !isNaN(scoreVal) ? scoreVal : undefined,
      feedback: req.body.feedback,
      status: req.body.status,
    });
    res.json({ success: true, message: 'Submission evaluated successfully.', submission: updated });
  } catch (error) {
    next(error);
  }
};

export const getCourseSubmissions = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const submissions = await assignmentService.getAssignmentSubmissionsForCourse(
      req.params.courseId,
      req.user!.id,
      req.user!.role
    );
    res.json({ success: true, submissions });
  } catch (error) {
    next(error);
  }
};

export const getAssignment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const assignment = await prisma.assignment.findUnique({
      where: { id: req.params.id },
      include: {
        course: { select: { id: true, title: true, slug: true } },
      },
    });

    if (!assignment) {
      return res.status(404).json({ success: false, message: 'Assignment not found.' });
    }

    let submission = null;
    if (req.user) {
      submission = await prisma.assignmentSubmission.findFirst({
        where: { assignmentId: assignment.id, userId: req.user.id },
        orderBy: { submittedAt: 'desc' },
      });
    }

    res.json({ success: true, assignment, submission });
  } catch (error) {
    next(error);
  }
};

export const updateAssignment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { title, instructions, dueDate, maxScore, passingScore, isRequired } = req.body;
    const data: any = {};
    if (title !== undefined) data.title = title;
    if (instructions !== undefined) data.instructions = instructions;
    if (dueDate !== undefined) data.dueDate = dueDate ? new Date(dueDate) : null;
    if (maxScore !== undefined) data.maxScore = parseFloat(maxScore);
    if (passingScore !== undefined) data.passingScore = parseFloat(passingScore);
    if (isRequired !== undefined) data.isRequired = !!isRequired;

    const assignment = await prisma.assignment.update({
      where: { id: req.params.id },
      data,
    });

    res.json({ success: true, assignment });
  } catch (error) {
    next(error);
  }
};

export const createAssignment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const { title, instructions, dueDate, maxScore, passingScore, isRequired, moduleId, courseId } = req.body;
    const assignment = await prisma.assignment.create({
      data: {
        title,
        instructions,
        dueDate: dueDate ? new Date(dueDate) : null,
        maxScore: maxScore !== undefined ? parseFloat(maxScore) : 100,
        passingScore: passingScore !== undefined ? parseFloat(passingScore) : 70,
        isRequired: isRequired !== undefined ? !!isRequired : true,
        moduleId,
        courseId,
      },
    });
    res.status(201).json({ success: true, assignment });
  } catch (error) {
    next(error);
  }
};
