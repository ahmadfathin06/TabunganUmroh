import prisma from '../config/database.js';
import ApiResponse from '../utils/apiResponse.js';
import { createNotification, createNotificationForAll } from '../services/notification.service.js';

const adminController = {
  dashboard: async (req, res) => {
    try {
      const [
        totalUsers,
        activePlans,
        paidOffPlans,
        pendingDeposits,
        totalCollected,
      ] = await Promise.all([
        prisma.user.count({ where: { role: 'USER', isActive: true } }),
        prisma.savingsPlan.count({ where: { status: 'ACTIVE' } }),
        prisma.savingsPlan.count({ where: { status: 'PAID_OFF' } }),
        prisma.deposit.count({ where: { status: 'PENDING' } }),
        prisma.deposit.aggregate({
          where: { status: 'APPROVED' },
          _sum: { amount: true },
        }),
      ]);

      return ApiResponse.success(res, {
        totalUsers,
        activePlans,
        paidOffPlans,
        pendingDeposits,
        totalCollected: parseFloat(totalCollected._sum.amount || 0),
      });
    } catch (error) {
      console.error('Dashboard stats error:', error);
      return ApiResponse.error(res, 'Gagal mengambil data dashboard');
    }
  },

  getUsers: async (req, res) => {
    try {
      const users = await prisma.user.findMany({
        where: { role: 'USER' },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
      });
      return ApiResponse.success(res, users);
    } catch (error) {
      return ApiResponse.error(res, 'Gagal mengambil data jamaah');
    }
  },

  getPendingDeposits: async (req, res) => {
    try {
      const deposits = await prisma.deposit.findMany({
        where: { status: 'PENDING' },
        include: {
          savingsPlan: {
            include: {
              user: { select: { name: true, phone: true } },
              package: { select: { name: true } },
            },
          },
          bankAccount: { select: { bankName: true } },
        },
        orderBy: { createdAt: 'asc' },
      });
      return ApiResponse.success(res, deposits);
    } catch (error) {
      return ApiResponse.error(res, 'Gagal mengambil setoran pending');
    }
  },

  // ============ BROADCAST PENGUMUMAN ============

  /**
   * POST /api/admin/notifications/broadcast
   * Body: { target: 'ALL' | 'USER', userId?, title, message }
   */
  broadcast: async (req, res) => {
    try {
      const { target, userId, title, message } = req.validatedData;

      if (target === 'USER') {
        if (!userId) return ApiResponse.error(res, 'User tujuan wajib dipilih', 400);

        const user = await prisma.user.findFirst({
          where: { id: userId, role: 'USER' },
          select: { id: true, name: true },
        });
        if (!user) return ApiResponse.error(res, 'User tidak ditemukan', 404);

        await createNotification(user.id, {
          title: title.trim(),
          message: message.trim(),
          type: 'ANNOUNCEMENT',
        });
r
        return ApiResponse.created(res, { sent: 1 }, `Pengumuman terkirim ke ${user.name}`);
      }

      const sent = await createNotificationForAll({
        title: title.trim(),
        message: message.trim(),
        type: 'ANNOUNCEMENT',
      });

      return ApiResponse.created(res, { sent }, `Pengumuman terkirim ke ${sent} jamaah`);
    } catch (error) {
      console.error('Broadcast error:', error);
      return ApiResponse.error(res, 'Gagal mengirim pengumuman');
    }
  },
};

export default adminController;