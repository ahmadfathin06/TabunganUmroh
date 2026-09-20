import { Router } from 'express';
import documentController from '../controllers/document.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { uploadDocumentSchema, verifyDocumentSchema } from '../validations/document.validation.js';
import { handleUpload } from '../middlewares/upload.middleware.js';
import { uploadLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

router.use(authenticate);

// User
router.get('/my', documentController.getMine);
router.post('/', uploadLimiter, ...handleUpload('document'), validate(uploadDocumentSchema), documentController.upload);

// Berkas privat (KTP/paspor) — hanya pemilik atau admin, bukan static asset.
router.get('/:id/file', documentController.getFile);

// Admin
router.get('/', authorize('ADMIN', 'SUPER_ADMIN'), documentController.getAll);
router.put(
  '/:id/verify',
  authorize('ADMIN', 'SUPER_ADMIN'),
  validate(verifyDocumentSchema),
  documentController.verify
);

export default router;
