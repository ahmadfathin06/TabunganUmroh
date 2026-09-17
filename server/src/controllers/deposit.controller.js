import prisma from '../config/database.js';
import ApiResponse from '../utils/apiResponse.js';
import generateUniqueCode from '../utils/generateUniqueCode.js';
import { getPagination } from '../utils/paginationHelper.js';
import { notify } from '../services/notification.service.js';
import { streamStoredFile } from '../utils/fileStorage.js';

const depositController = {
  create: async (req, res) => {
    try {
      const { savingsPlanId, amount, bankAccountId } = req.validatedData;

      const savingsPlan = await prisma.savingsPlan.findFirst({
        where: { id: savingsPlanId, userId: req.user.id, status: 'ACTIVE' },
      });
      if (!savingsPlan) return ApiResponse.error(res, 'Rencana tabungan tidak ditemukan', 404);

      const bankAccount = await prisma.bankAccount.findFirst({
        where: { id: bankAccountId, isActive: true },
      });
      if (!bankAccount) return ApiResponse.error(res, 'Rekening tujuan tidak valid', 400);

      const uniqueCode = await generateUniqueCode();
      const totalTransfer = parseFloat(amount) + uniqueCode;

      const deposit = await prisma.deposit.create({
        data: {
          savingsPlanId,
          amount: parseFloat(amount),
          uniqueCode,
          totalTransfer,
          bankAccountId,
          status: 'PENDING',
          paymentMethod: 'TRANSFER',
        },
        include: {
          bankAccount: {
            select: { bankName: true, accountNumber: true, accountHolder: true },
          },
        },
      });

      return ApiResponse.created(res, {
        deposit,
        transferInfo: {
          bank: deposit.bankAccount.bankName,
          accountNumber: deposit.bankAccount.accountNumber,
          accountHolder: deposit.bankAccount.accountHolder,
          amount: parseFloat(amount),
          uniqueCode,
          totalTransfer,
        },
      }, 'Setoran berhasil dibuat. Silakan transfer dan upload bukti.');
    } catch (error) {
      console.error('Create deposit error:', error);
      return ApiResponse.error(res, 'Gagal membuat setoran');
    }
  },

  uploadProof: async (req, res) => {
    try {
      const { id } = req.params;
      const deposit = await prisma.deposit.findFirst({
        where: {
          id,
          savingsPlan: { userId: req.user.id },
          status: 'PENDING',
        },
      });
      if (!deposit) return ApiResponse.error(res, 'Setoran tidak ditemukan', 404);
      if (!req.file) return ApiResponse.error(res, 'File bukti wajib diupload', 400);

      const proofImage = `/uploads/${req.file.filename}`;
      const updated = await prisma.deposit.update({
        where: { id },
        data: { proofImage },
      });

      return ApiResponse.success(res, updated, 'Bukti transfer berhasil diupload');
    } catch (error) {
      console.error('Upload proof error:', error);
      return ApiResponse.error(res, 'Gagal upload bukti');
    }
  },

  /**
   * GET /api/deposits/:id/proof — ambil bukti transfer.
   * Hanya pemilik setoran atau admin.
   */
  getProof: async (req, res) => {
    try {
      const deposit = await prisma.deposit.findUnique({
        where: { id: req.params.id },
        include: { savingsPlan: { select: { userId: true } } },
      });
      if (!deposit) return ApiResponse.error(res, 'Setoran tidak ditemukan', 404);

      const isOwner = deposit.savingsPlan?.userId === req.user.id;
      const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';
      if (!isOwner && !isAdmin) return ApiResponse.error(res, 'Akses ditolak', 403);

      if (!deposit.proofImage) {
        return ApiResponse.error(res, 'Bukti transfer belum diupload', 404);
      }

      return streamStoredFile(deposit.proofImage, res);
    } catch (error) {
      console.error('Get deposit proof error:', error);
      return ApiResponse.error(res, 'Gagal mengambil bukti transfer');
    }
  },

  getMyDeposits: async (req, res) => {
    try {
      const { status, q, from, to, page, limit } = req.query;
      const { skip, take, page: p, limit: l } = getPagination(page, limit);

      const where = { savingsPlan: { userId: req.user.id } };
      if (status) where.status = status.toUpperCase();

      // Date-range filter (inclusive): from 00:00 to 23:59.999 local server time
      if (from || to) {
        where.createdAt = {};
        if (from) {
          const d = new Date(from);
          if (!Number.isNaN(d.getTime())) where.createdAt.gte = d;
        }
        if (to) {
          const d = new Date(`${to}T23:59:59.999`);
          if (!Number.isNaN(d.getTime())) where.createdAt.lte = d;
        }
        if (Object.keys(where.createdAt).length === 0) delete where.createdAt;
      }

      // Text search across package name, bank name and unique code
      if (q && q.trim()) {
        const term = q.trim();
        where.OR = [
          { savingsPlan: { package: { name: { contains: term, mode: 'insensitive' } } } },
          { bankAccount: { bankName: { contains: term, mode: 'insensitive' } } },
          { uniqueCode: /^\d+$/.test(term) ? parseInt(term, 10) : undefined },
        ].filter((cond) => cond.uniqueCode !== undefined || cond.savingsPlan || cond.bankAccount);
      }

      const [deposits, total, agg] = await Promise.all([
        prisma.deposit.findMany({
          where,
          include: {
            savingsPlan: {
              select: { jamaahName: true, package: { select: { name: true } } },
            },
            bankAccount: { select: { bankName: true } },
          },
          orderBy: { createdAt: 'desc' },
          skip, take,
        }),
        prisma.deposit.count({ where }),
        prisma.deposit.aggregate({
          where,
          _sum: { amount: true },
          _count: true,
        }),
      ]);

      return res.status(200).json({
        success: true,
        message: 'Success',
        data: deposits,
        summary: {
          totalAmount: agg._sum.amount || 0,
          count: agg._count || 0,
        },
        pagination: {
          currentPage: p,
          totalPages: Math.ceil(total / l),
          totalItems: total,
          itemsPerPage: l,
        },
      });
    } catch (error) {
      console.error('getMyDeposits error:', error);
      return ApiResponse.error(res, 'Gagal mengambil data setoran');
    }
  },

  verify: async (req, res) => {
    try {
      const { id } = req.params;
      const { action, rejectionReason } = req.validatedData;

      const deposit = await prisma.deposit.findUnique({
        where: { id },
        include: {
          savingsPlan: {
            include: {
              user: { select: { id: true, name: true, phone: true } },
              package: { select: { name: true } },
            },
          },
        },
      });

      if (!deposit) return ApiResponse.error(res, 'Setoran tidak ditemukan', 404);
      if (deposit.status !== 'PENDING') return ApiResponse.error(res, 'Sudah diverifikasi', 400);

      if (action === 'approve') {
        const result = await prisma.$transaction(async (tx) => {
          const updatedDeposit = await tx.deposit.update({
            where: { id },
            data: { status: 'APPROVED', verifiedById: req.user.id, verifiedAt: new Date() },
          });

          const updatedSavings = await tx.savingsPlan.update({
            where: { id: deposit.savingsPlanId },
            data: { currentBalance: { increment: parseFloat(deposit.amount) } },
          });

          const newBalance = parseFloat(updatedSavings.currentBalance);
          const target = parseFloat(updatedSavings.targetAmount);
          let isLunas = false;

          if (newBalance >= target) {
            await tx.savingsPlan.update({
              where: { id: deposit.savingsPlanId },
              data: { status: 'PAID_OFF', paidOffAt: new Date() },
            });
            isLunas = true;
          }

          const notification = await tx.notification.create({
            data: {
              userId: deposit.savingsPlan.user.id,
              title: isLunas ? 'Tabungan LUNAS! 🎉' : 'Setoran Diverifikasi ✅',
              message: isLunas 
                ? `Alhamdulillah! Tabungan untuk paket "${deposit.savingsPlan.package.name}" sudah LUNAS.`
                : `Setoran Rp ${parseFloat(deposit.amount).toLocaleString('id-ID')} telah berhasil dikonfirmasi.`,
              type: isLunas ? 'PAID_OFF' : 'DEPOSIT_APPROVED',
            },
          });

          return { updatedDeposit, newBalance, isLunas, notification };
        });

        // Fire-and-forget realtime + Web Push ke semua device user
        notify(deposit.savingsPlan.user.id, result.notification).catch(() => {});

        return ApiResponse.success(res, result, 'Setoran berhasil di-approve');
      }

      if (action === 'reject') {
        if (!rejectionReason) return ApiResponse.error(res, 'Alasan penolakan wajib diisi', 400);

        await prisma.deposit.update({
          where: { id },
          data: { status: 'REJECTED', verifiedById: req.user.id, verifiedAt: new Date(), rejectionReason },
        });

        const notification = await prisma.notification.create({
          data: {
            userId: deposit.savingsPlan.user.id,
            title: 'Setoran Ditolak ❌',
            message: `Setoran Anda ditolak. Alasan: ${rejectionReason}`,
            type: 'DEPOSIT_REJECTED',
          },
        });

        notify(deposit.savingsPlan.user.id, notification).catch(() => {});

        return ApiResponse.success(res, null, 'Setoran ditolak');
      }
    } catch (error) {
      console.error('Verify error:', error);
      return ApiResponse.error(res, 'Gagal memverifikasi setoran');
    }
  },
};

export default depositController;