import prisma from '../config/database.js';
import ApiResponse from '../utils/apiResponse.js';

const savingsController = {
  create: async (req, res) => {
    try {
      // Selalu pakai hasil validasi zod, bukan body mentah (mass assignment).
      const { packageId, targetAmount, jamaahName, jamaahRelation, monthlyTarget } = req.validatedData;

      // Paket hanya PATOKAN HARGA: tidak wajib, tidak memesan kuota, dan tidak
      // mengikat rencana — plan boleh dibuat tanpa paket sama sekali.
      let pkg = null;
      if (packageId) {
        pkg = await prisma.umrohPackage.findUnique({ where: { id: packageId } });
        if (!pkg) return ApiResponse.error(res, 'Paket tidak ditemukan', 404);
      }

      // Target bebas dari user; kalau kosong, harga paket jadi patokan.
      const target = targetAmount != null ? Number(targetAmount) : pkg ? Number(pkg.price) : null;
      if (!target || target <= 0) {
        return ApiResponse.error(res, 'Target tabungan wajib diisi', 400);
      }

      /**
       * TIDAK ada klaim kuota di sini: menabung = menabung, bukan memesan
       * kursi. Kuota keberangkatan diatur admin (paket murni patokan harga),
       * sehingga plan bisa berdiri sendiri tanpa paket dan tanpa rollback.
       */
      const plan = await prisma.savingsPlan.create({
        data: {
          userId: req.user.id,
          packageId: pkg ? pkg.id : null,
          jamaahName: jamaahName || req.user.name,
          jamaahRelation: jamaahRelation || 'self',
          targetAmount: Number(target).toFixed(2),
          monthlyTarget: monthlyTarget ? Number(monthlyTarget).toFixed(2) : null,
        },
        include: { package: true },
      });

      return ApiResponse.created(res, plan, 'Rencana tabungan berhasil dibuat');
    } catch (error) {
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

      // Kuota tidak dikembalikan karena menabung tidak pernah memesan kuota.
      await prisma.savingsPlan.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancellationReason: req.validatedData?.reason || null,
        },
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