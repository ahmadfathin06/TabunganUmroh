import prisma from '../config/database.js';
import ApiResponse from '../utils/apiResponse.js';

const savingsController = {
  create: async (req, res) => {
    try {
      const { packageId, jamaahName, jamaahRelation, monthlyTarget } = req.body;

      const pkg = await prisma.umrohPackage.findUnique({ where: { id: packageId } });
      if (!pkg) return ApiResponse.error(res, 'Paket tidak ditemukan', 404);
      if (pkg.status !== 'OPEN') return ApiResponse.error(res, 'Paket sudah ditutup', 400);
      if (pkg.quotaRemaining <= 0) return ApiResponse.error(res, 'Kuota paket sudah penuh', 400);

      const existingPlan = await prisma.savingsPlan.findFirst({
        where: { userId: req.user.id, packageId, status: 'ACTIVE' },
      });
      if (existingPlan) return ApiResponse.error(res, 'Anda sudah menabung di paket ini', 409);

      const plan = await prisma.$transaction(async (tx) => {
        const newPlan = await tx.savingsPlan.create({
          data: {
            userId: req.user.id,
            packageId,
            jamaahName: jamaahName || req.user.name,
            jamaahRelation: jamaahRelation || 'self',
            targetAmount: pkg.price,
            monthlyTarget: monthlyTarget ? parseFloat(monthlyTarget) : null,
          },
          include: { package: true },
        });

        await tx.umrohPackage.update({
          where: { id: packageId },
          data: { quotaRemaining: { decrement: 1 } },
        });

        return newPlan;
      });

      return ApiResponse.created(res, plan, 'Rencana tabungan berhasil dibuat');
    } catch (error) {
      console.error('Create savings error:', error);
      return ApiResponse.error(res, 'Gagal membuat rencana tabungan');
    }
  },

  cancel: async (req, res) => {
    try {
      const { id } = req.params;

      const plan = await prisma.savingsPlan.findFirst({
        where: { id, userId: req.user.id },
      });
      if (!plan) return ApiResponse.error(res, 'Rencana tabungan tidak ditemukan', 404);
      if (plan.status !== 'ACTIVE') return ApiResponse.error(res, 'Rencana sudah tidak aktif', 400);
      if (parseFloat(plan.currentBalance) > 0) {
        return ApiResponse.error(res, 'Masih ada saldo pada rencana ini. Hubungi admin.', 400);
      }

      const pending = await prisma.deposit.count({
        where: { savingsPlanId: id, status: 'PENDING' },
      });
      if (pending > 0) {
        return ApiResponse.error(res, 'Masih ada setoran yang belum diverifikasi', 400);
      }

      await prisma.$transaction(async (tx) => {
        await tx.savingsPlan.update({
          where: { id },
          data: {
            status: 'CANCELLED',
            cancelledAt: new Date(),
            cancellationReason: req.body.reason || null,
          },
        });

        await tx.umrohPackage.update({
          where: { id: plan.packageId },
          data: { quotaRemaining: { increment: 1 } },
        });
      });

      return ApiResponse.success(res, null, 'Rencana tabungan berhasil dibatalkan');
    } catch (error) {
      console.error('Cancel savings error:', error);
      return ApiResponse.error(res, 'Gagal membatalkan rencana tabungan');
    }
  },

  getMyPlans: async (req, res) => {
    try {
      const plans = await prisma.savingsPlan.findMany({
        where: { userId: req.user.id },
        include: {
          package: {
            select: {
              name: true, departureDate: true, departureCity: true,
              durationDays: true, airline: true, image: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const formatted = plans.map((plan) => ({
        ...plan,
        targetAmount: parseFloat(plan.targetAmount),
        currentBalance: parseFloat(plan.currentBalance),
        progress: Math.min(
          Math.round((parseFloat(plan.currentBalance) / parseFloat(plan.targetAmount)) * 100),
          100
        ),
        remaining: Math.max(
          parseFloat(plan.targetAmount) - parseFloat(plan.currentBalance), 0
        ),
      }));

      return ApiResponse.success(res, formatted);
    } catch (error) {
      return ApiResponse.error(res, 'Gagal mengambil data tabungan');
    }
  },

  getAllPlans: async (req, res) => {
    try {
      const { status } = req.query;
      const where = {};
      if (status) where.status = status.toUpperCase();

      const plans = await prisma.savingsPlan.findMany({
        where,
        include: {
          user: { select: { name: true, email: true, phone: true } },
          package: { select: { name: true, price: true } },
        },
        orderBy: { createdAt: 'desc' },
      });

      return ApiResponse.success(res, plans);
    } catch (error) {
      return ApiResponse.error(res, 'Gagal mengambil data seluruh tabungan');
    }
  },
};

export default savingsController;