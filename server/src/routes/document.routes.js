import { Router } from 'express';
import documentController from '../controllers/document.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { uploadDocumentSchema, verifyDocumentSchema } from '../validations/document.validation.js';
import { parseUpload, persistUpload } from '../middlewares/upload.middleware.js';
import { uploadLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

router.use(authenticate);

// User
router.get('/my', documentController.getMine);

/**
 * POST /api/documents
 *
 * Urutan middleware (P0 — validasi field sebelum storage):
 *   authenticate → rate limit → parse (multer + magic bytes)
 *   → validate (field `type` multipart divalidasi ZOD)
 *   → persist (baru Cloudinary/disk) → controller.
 *
 * Type invalid ditolak SEBELUM Cloudinary dipanggil.
 */
router.post(
  '/',
  uploadLimiter,
  ...parseUpload('document'),
  validate(uploadDocumentSchema),
  ...persistUpload(),
  documentController.upload
);

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
