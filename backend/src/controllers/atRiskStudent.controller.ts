import { Request, Response, NextFunction } from 'express';
import { AtRiskStudentService } from '../services/atRiskStudent.service';
import { z } from 'zod';

const interventionSchema = z.object({
  title: z.string().optional(),
  message: z.string().min(3, 'Message must be at least 3 characters long'),
  linkUrl: z.string().optional(),
});

const dismissSchema = z.object({
  reason: z.string().optional(),
});

export const getSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = (req as any).user;
    const isInstructorOnly = user.role === 'INSTRUCTOR';

    const result = await AtRiskStudentService.getAtRiskSummary({
      page: req.query.page ? parseInt(req.query.page as string, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string, 10) : 20,
      search: req.query.search as string,
      riskLevel: req.query.riskLevel as string,
      riskReason: req.query.riskReason as string,
      status: req.query.status as string,
      courseId: req.query.courseId as string,
      instructorId: isInstructorOnly ? user.id : undefined,
    });

    res.status(200).json({
      success: true,
      stats: result.stats,
      records: result.records,
      pagination: result.pagination,
    });
  } catch (err) {
    next(err);
  }
};

export const getStudentDetails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const details = await AtRiskStudentService.getStudentRiskDetails(studentId);

    res.status(200).json({
      success: true,
      ...details,
    });
  } catch (err) {
    next(err);
  }
};

export const triggerAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await AtRiskStudentService.analyzeAllStudents();
    res.status(200).json({
      success: true,
      message: 'Student risk analysis completed successfully.',
      result,
    });
  } catch (err) {
    next(err);
  }
};

export const analyzeSingleStudent = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const result = await AtRiskStudentService.analyzeStudent(studentId);
    res.status(200).json({
      success: true,
      message: 'Single student analysis completed.',
      result,
    });
  } catch (err) {
    next(err);
  }
};

export const sendIntervention = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { studentId } = req.params;
    const authorId = (req as any).user.id;
    const validated = interventionSchema.parse(req.body);

    const result = await AtRiskStudentService.sendIntervention(studentId, validated, authorId);
    res.status(200).json({
      success: true,
      message: 'Supportive intervention sent to student successfully.',
      result,
    });
  } catch (err) {
    next(err);
  }
};

export const dismissRiskRecord = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const authorId = (req as any).user.id;
    const validated = dismissSchema.parse(req.body);

    const updated = await AtRiskStudentService.dismissRiskRecord(id, validated.reason || '', authorId);
    res.status(200).json({
      success: true,
      message: 'Risk record dismissed.',
      record: updated,
    });
  } catch (err) {
    next(err);
  }
};
