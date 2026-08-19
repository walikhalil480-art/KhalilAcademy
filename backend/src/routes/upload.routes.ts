import { Router } from 'express';
import multer from 'multer';
import * as uploadController from '../controllers/upload.controller';
import { authenticate } from '../middlewares/auth';
import { authorize } from '../middlewares/rbac';

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 250 * 1024 * 1024 } }); // 250 MB memory limit

const router = Router();

router.use(authenticate, authorize('INSTRUCTOR', 'ADMIN', 'SUPER_ADMIN'));

router.post('/video', upload.single('file'), uploadController.uploadVideo);
router.post('/thumbnail', upload.single('file'), uploadController.uploadThumbnail);
router.post('/resource', upload.single('file'), uploadController.uploadResource);

export default router;
