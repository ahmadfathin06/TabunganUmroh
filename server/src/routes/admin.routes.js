import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/role.middleware.js';
import validate from '../middlewares/validate.middleware.js';
import { broadcastSchema } from '../validations/admin.validation.js';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/dashboard', adminController.dashboard);
router.get('/users', adminController.getUsers);
router.get('/deposits/pending', adminController.getPendingDeposits);
router.post('/notifications/broadcast', validate(broadcastSchema), adminController.broadcast);

export default router;