import { Router } from 'express';
import prisma from '../config/database.js';
import { buildHealthReport } from '../utils/health.js';
import authRoutes from './auth.routes.js';
import packageRoutes from './package.routes.js';
import savingsRoutes from './savings.routes.js';
import depositRoutes from './deposit.routes.js';
import adminRoutes from './admin.routes.js';
import bankAccountRoutes from './bankAccount.routes.js';
import documentRoutes from './document.routes.js';
import notificationRoutes from './notification.routes.js';
import { cronGuard, runReminder, runCleanup } from './cron.routes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/packages', packageRoutes);
router.use('/savings', savingsRoutes);
router.use('/deposits', depositRoutes);
router.use('/admin', adminRoutes);
router.use('/bank-accounts', bankAccountRoutes);
router.use('/documents', documentRoutes);
router.use('/notifications', notificationRoutes);

// Endpoint Vercel Cron (guard: header x-vercel-cron / CRON_SECRET / admin).
router.get('/cron/reminder', cronGuard, runReminder);
router.get('/cron/cleanup', cronGuard, runCleanup);

/**
 * GET /api/health — health check ringan.
 *
 * Memeriksa: proses hidup, koneksi database (`SELECT 1`), dan STATUS konfigurasi
 * Cloudinary/email. Tidak pernah mengirim email, upload, atau membocorkan
 * kredensial/detail error internal (endpoint ini publik).
 */
router.get('/health', async (req, res) => {
  const { healthy, dbError, report } = await buildHealthReport(prisma);

  // Detail error hanya di log server, bukan di respons publik.
  if (dbError) {
    console.error('❌ Health check: database tidak dapat diakses:', dbError?.message || dbError);
  }

  res.status(healthy ? 200 : 503).json(report);
});

export default router;
