import prisma from '../config/database.js';
import ApiResponse from '../utils/apiResponse.js';

const savingsController = {
  create: async (req, res) => {
    try {
      // Selalu pakai hasil validasi zod, bukan body mentah (mass assignment).
      const { packageId, jamaahName, jamaahRelation, monthlyTarget } = req.validatedData;

      const pkg = await prisma.umrohPackage.findUnique({ where: { id: packageId } });
      if (!pkg) return ApiResponse.error(res, 'Paket tidak ditemukan', 404);
      if (pkg.status !== 'OPEN') return ApiResponse.error(res, 'Paket sudah ditutup', 400);

      const existingPlan = await prisma.savingsPlan.findFirst({
        where: { userId: req.user.id, packageId, status: 'ACTIVE' },
      });
      if (existingPlan) return ApiResponse.error(res, 'Anda sudah menabung di paket ini', 409);

      /**
       * Kuota DIAMANKAN LEBIH DULU dengan DECREMENT ATOMIK
       * di dalam transaction yang sama dengan pembuatan plan.
       *
       * SEBELUMNYA: baca `quotaRemaining` lalu decrement tanpa
       * syarat → TOCTOU. N request paralel sama-sama lolos
       * pengecekan `<= 0` dan semuanya membuat plan → kuota
       * oversell / negatif.
       *
       * SEKARANG: `updateMany` dengan syarat `quotaRemaining > 0`
       * di dalam transaction. Hanya request yang benar-benar
       * mengubah 1 row (count = 1) yang lanjut membuat plan.
       * Bila count = 0 → paket penuh (rollback otomatis).
       * Bila pembuatan plan gagal (mis. duplikat) → transaction
       * rollback → kuota dikembalikan. Kuota TIDAK PERNAH
       * negatif dan TIDAK pernah bocor.
       */
      const plan = await prisma.$transaction(async (tx) => {
        const claimed = await tx.umrohPackage.updateMany({
          where: { id: packageId, status: 'OPEN', quotaRemaining: { gt: 0 } },
          data: { quotaRemaining: { decrement: 1 } },
        });
        if (claimed.count === 0) {
          const error = new Error('Kuota paket sudah penuh');
          error.code = 'QUOTA_FULL';
          throw error;
        }

        return tx.savingsPlan.create({
          data: {
            userId: req.user.id,
            packageId,
            jamaahName: jamaahName || req.user.name,
            jamaahRelation: jamaahRelation || 'self',
            targetAmount: pkg.price,
            monthlyTarget: monthlyTarget ? Number(monthlyTarget).toFixed(2) : null,
          },
          include: { package: true },
        });
      });

      return ApiResponse.created(res, plan, 'Rencana tabungan berhasil dibuat');
    } catch (error) {
      // Paket penuh (atomic claim gagal) → 409.
      if (error?.code === 'QUOTA_FULL') {
        return ApiResponse.error(res, 'Kuota paket sudah penuh', 409);
      }
      // Duplicate active plan (kondisi unik) → 409, kuota dikembalikan
      // otomatis oleh rollback transaction.
      if (error?.code === 'P2002') {
        return ApiResponse.error(res, 'Anda sudah menabung di paket ini', 409);
      }
      console.error('Create savings error:', error?.message || error);
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
            cancellationReason: req.validatedData?.reason || null,
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