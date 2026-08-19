import { Router } from 'express';
import * as categoryController from '../controllers/category.controller';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/rbac';

const router = Router();

router.get('/', categoryController.listCategories);
router.post('/', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), categoryController.createCategory);
router.patch('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), categoryController.updateCategory);
router.delete('/:id', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), categoryController.deleteCategory);

export default router;
