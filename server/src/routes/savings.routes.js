import { Router } from 'express';
import savingsController from '../controllers/savings.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/role.middleware.js';

const router = Router();

router.post('/', authenticate, savingsController.create);
router.get('/my', authenticate, savingsController.getMyPlans);
router.get('/all', authenticate, authorize('ADMIN', 'SUPER_ADMIN'), savingsController.getAllPlans);
router.put('/:id/cancel', authenticate, savingsController.cancel);

export default router;