import { Router } from 'express';
import documentController from '../controllers/document.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { verifyDocumentSchema } from '../validations/document.validation.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';

const router = Router();

router.use(authenticate);

// User
router.get('/my', documentController.getMine);
router.post('/', uploadSingle('document'), documentController.upload);

// Admin
router.get('/', authorize('ADMIN', 'SUPER_ADMIN'), documentController.getAll);
router.put(
  '/:id/verify',
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(verifyDocumentSchema),
  documentController.verify
);

export default router;
