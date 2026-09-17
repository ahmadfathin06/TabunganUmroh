import { Router } from 'express';
import savingsController from '../controllers/savings.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { createSavingsSchema, cancelSavingsSchema } from '../validations/savings.validation.js';

const router = Router();

router.post('/', authenticate, validate(createSavingsSchema), savingsController.create);
router.get('/my', authenticate, savingsController.getMyPlans);
router.get('/all', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), savingsController.getAllPlans);
router.put('/:id/cancel', authenticate, validate(cancelSavingsSchema), savingsController.cancel);

export default router;