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
    const updated = await assignmentService.gradeAssignmentSubmission(req.user!.id, req.params.id, {
      score: parseFloat(req.body.score),
      feedback: req.body.feedback,
      status: req.body.status,
    });
    res.json({ success: true, message: 'Submission graded successfully.', submission: updated });
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

export const createAssignment = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const assignment = await prisma.assignment.create({
      data: req.body,
    });
    res.status(201).json({ success: true, assignment });
  } catch (error) {
    next(error);
  }
};
