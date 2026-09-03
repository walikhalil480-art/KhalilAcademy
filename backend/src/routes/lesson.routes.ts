import { Router } from 'express';
import * as lessonController from '../controllers/lesson.controller';
import { authenticate, authenticateOptional } from '../middlewares/auth';
import { authorize } from '../middlewares/rbac';

const router = Router();

router.get('/:id', authenticateOptional, lessonController.getLesson);
router.post('/', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), lessonController.createLesson);
router.put('/reorder', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), lessonController.reorderLessons);
router.patch('/:id', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), lessonController.updateLesson);
router.delete('/:id', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), lessonController.deleteLesson);
router.post('/:id/resources', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), lessonController.addLessonResource);
router.delete('/resources/:resourceId', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), lessonController.deleteLessonResource);

export default router;
