import { Router } from 'express';
import * as moduleController from '../controllers/module.controller';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/rbac';

const router = Router();

router.post('/', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), moduleController.createModule);
router.put('/reorder', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), moduleController.reorderModules);
router.patch('/:id', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), moduleController.updateModule);
router.delete('/:id', authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'), moduleController.deleteModule);

export default router;
