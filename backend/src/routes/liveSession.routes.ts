import { Router } from 'express';
import { authenticate, authenticateOptional } from '../middlewares/auth';
import { authorize } from '../middlewares/rbac';
import * as liveCtrl from '../controllers/liveSession.controller';
import { Role } from '@prisma/client';

const router = Router();

// Student Discovery & Personal Live Sessions
router.get('/', authenticateOptional, liveCtrl.getSessions);
router.get('/my', authenticate, liveCtrl.getMySessions);
router.get('/calendar.ics', authenticate, liveCtrl.exportUserIcs);
router.get('/:id', authenticateOptional, liveCtrl.getSessionById);
router.get('/:id/calendar.ics', liveCtrl.exportSessionIcs);

// Student Registration & Attendance Actions
router.post('/:id/register', authenticate, liveCtrl.registerForSession);
router.delete('/:id/register', authenticate, liveCtrl.unregisterFromSession);
router.post('/:id/join', authenticate, liveCtrl.joinSession);
router.post('/:id/leave', authenticate, liveCtrl.leaveSession);

// Live Session Q&A Feed
router.get('/:id/questions', authenticateOptional, liveCtrl.getQuestions);
router.post('/:id/questions', authenticate, liveCtrl.askQuestion);
router.post('/:id/questions/:questionId/upvote', authenticate, liveCtrl.upvoteQuestion);
router.delete('/:id/questions/:questionId', authenticate, liveCtrl.deleteQuestion);

// Instructor / Admin Management Routes
router.post(
  '/',
  authenticate,
  authorize(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  liveCtrl.createSession
);

router.patch(
  '/:id',
  authenticate,
  authorize(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  liveCtrl.updateSession
);

router.post(
  '/:id/cancel',
  authenticate,
  authorize(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  liveCtrl.cancelSession
);

router.delete(
  '/:id',
  authenticate,
  authorize(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  liveCtrl.deleteSession
);

router.get(
  '/:id/participants',
  authenticate,
  authorize(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  liveCtrl.getParticipants
);

router.get(
  '/:id/attendance',
  authenticate,
  authorize(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  liveCtrl.getAttendance
);

router.patch(
  '/:id/attendance/:userId',
  authenticate,
  authorize(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  liveCtrl.updateAttendance
);

router.post(
  '/:id/questions/:questionId/answer',
  authenticate,
  authorize(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  liveCtrl.answerQuestion
);

router.patch(
  '/:id/questions/:questionId/pin',
  authenticate,
  authorize(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  liveCtrl.pinQuestion
);

router.post(
  '/:id/recording',
  authenticate,
  authorize(Role.INSTRUCTOR, Role.ADMIN, Role.SUPER_ADMIN),
  liveCtrl.attachRecording
);

export default router;
