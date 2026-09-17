import { Router } from 'express';
import depositController from '../controllers/deposit.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { createDepositSchema, verifyDepositSchema } from '../validations/deposit.validation.js';
import { uploadSingle } from '../middlewares/upload.middleware.js';
import { uploadLimiter } from '../middlewares/rateLimiter.middleware.js';

const router = Router();

router.post('/', authenticate, validate(createDepositSchema), depositController.create);
router.post('/:id/upload-proof', authenticate, uploadLimiter, uploadSingle('proof'), depositController.uploadProof);
router.get('/my', authenticate, depositController.getMyDeposits);

// Bukti transfer bersifat privat (berisi data rekening) — bukan static asset.
router.get('/:id/proof', authenticate, depositController.getProof);
router.put('/:id/verify', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), validate(verifyDepositSchema), depositController.verify);

export default router;