import { Router } from 'express';
import adminController from '../controllers/admin.controller.js';
import authenticate from '../middlewares/auth.middleware.js';
import authorize from '../middlewares/role.middleware.js';

const router = Router();

router.use(authenticate, authorize('ADMIN', 'SUPER_ADMIN'));

router.get('/dashboard', adminController.dashboard);
router.get('/users', adminController.getUsers);
router.get('/deposits/pending', adminController.getPendingDeposits);
router.post('/notifications/broadcast', adminController.broadcast);

export default router;