import { Router } from 'express';
import authRoutes from './auth.routes.js';
import packageRoutes from './package.routes.js';
import savingsRoutes from './savings.routes.js';
import depositRoutes from './deposit.routes.js';
import adminRoutes from './admin.routes.js';
import bankAccountRoutes from './bankAccount.routes.js';
import documentRoutes from './document.routes.js';
import notificationRoutes from './notification.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/packages', packageRoutes);
router.use('/savings', savingsRoutes);
router.use('/deposits', depositRoutes);
router.use('/admin', adminRoutes);
router.use('/bank-accounts', bankAccountRoutes);
router.use('/documents', documentRoutes);
router.use('/notifications', notificationRoutes);

router.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;