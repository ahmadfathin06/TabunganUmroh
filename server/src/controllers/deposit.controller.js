import prisma from '../config/database.js';
import ApiResponse from '../utils/apiResponse.js';
import generateUniqueCode from '../utils/generateUniqueCode.js';
import { getPagination } from '../utils/paginationHelper.js';
import { notify } from '../services/notification.service.js';
import { streamStoredFile, destroyStoredFile } from '../utils/fileStorage.js';
import {
  findExisting,
  save,
  normalizeKey,
  hashPayload,
} from '../services/idempotency.service.js';
import { auditLog } from '../services/audit.service.js';

const RACE_CODE = 'DEPOSIT_RACE';

/**
 * Konversi number ke string Decimal aman (2 tempat desimal).
 * Prisma menyimpan `Decimal` — aritmetika floating point
 * (parseFloat) dapat menghasilkan saldo melenceng. Semua
 * operasi uang dihitung dalam CENTS (integer) lalu
 * dikonversi ke string desimal.
 */
const toDecimal = (value) => {
  const cents = Math.round(Number(value) * 100);
  if (!Number.isFinite(cents)) throw new Error('Jumlah tidak valid');
  return (cents / 100).toFixed(2);
};

const depositController = {
  create: async (req, res) => {
    try {
      const { savingsPlanId, amount, bankAccountId } = req.validatedData;
      const idemKey = normalizeKey(req.get('idempotency-key'));

      // Idempotency: replay bila kunci sama sudah pernah diproses.
      const payloadHash = hashPayload({ savingsPlanId, amount, bankAccountId });
      if (idemKey) {
        const existing = await findExisting({
          userId: req.user.id,
          scope: 'deposit.create',
          key: idemKey,
          payloadHash,
        });
        if (existing.replay) {
          return ApiResponse.success(res, existing.replay.response, 'Setoran sudah dibuat (idempoten)');
        }
        if (existing.conflict) {
          return ApiResponse.error(res, 'Kunci idempotensi sudah dipakai dengan payload berbeda', 409);
        }
      }

      const savingsPlan = await prisma.savingsPlan.findFirst({
        where: { id: savingsPlanId, userId: req.user.id, status: 'ACTIVE' },
      });
      if (!savingsPlan) return ApiResponse.error(res, 'Rencana tabungan tidak ditemukan', 404);

      // Batas nominal (Rp 10.000 – Rp 100.000.000 per setoran).
      const amountNum = Number(amount);
      if (!Number.isFinite(amountNum) || amountNum < 10000 || amountNum > 100000000) {
        return ApiResponse.error(res, 'Nominal setoran di luar batas (Rp 10.000 – Rp 100.000.000)', 400);
      }

      const uniqueCode = await generateUniqueCode();
      // Hitung dalam cents (integer) — bebas floating point.
      const amountCents = Math.round(amountNum * 100);
      const totalCents = amountCents + uniqueCode * 100;
      const amountStr = (amountCents / 100).toFixed(2);
      const totalStr = (totalCents / 100).toFixed(2);

      const deposit = await prisma.deposit.create({
        data: {
          savingsPlanId,
          amount: amountStr,
          uniqueCode,
          totalTransfer: totalStr,
          bankAccountId,
          status: 'PENDING',
          paymentMethod: 'TRANSFER',
        },
        include: {
          bankAccount: {
            select: { bankName: true, accountNumber: true, accountHolder: true, isActive: true },
          },
        },
      });

      // Rekening harus tetap aktif pada saat pembuatan.
      if (!deposit.bankAccount || !deposit.bankAccount.isActive) {
        await prisma.deposit.delete({ where: { id: deposit.id } }).catch(() => {});
        return ApiResponse.error(res, 'Rekening tujuan tidak aktif', 400);
      }

      const response = {
        deposit,
        transferInfo: {
          bank: deposit.bankAccount.bankName,
          accountNumber: deposit.bankAccount.accountNumber,
          accountHolder: deposit.bankAccount.accountHolder,
          amount: Number(amountStr),
          uniqueCode,
          totalTransfer: Number(totalStr),
        },
      };

      if (idemKey) {
        await save({
          userId: req.user.id,
          scope: 'deposit.create',
          key: idemKey,
          payloadHash,
          response,
        }).catch(() => {});
      }

      return ApiResponse.created(res, response, 'Setoran berhasil dibuat. Silakan transfer dan upload bukti.');
    } catch (error) {
      console.error('Create deposit error:', error?.message || error);
      return ApiResponse.error(res, 'Gagal membuat setoran');
    }
  },

  uploadProof: async (req, res) => {
    try {
      const { id } = req.params;
      // Preflight (middleware) sudah memastikan deposit ada,
      // milik user, dan PENDING — sebelum Cloudinary dipanggil.
      if (!req.file) return ApiResponse.error(res, 'File bukti wajib diupload', 400);

      const proofImage = `/uploads/${req.file.filename}`;
      const oldProof = req.preflight?.oldProofImage;

      // UPDATE KONDISIONAL: hanya berhasil bila masih PENDING.
      // Dua request paralel tidak dapat saling menimpa.
      const updated = await prisma.deposit.updateMany({
        where: { id, status: 'PENDING' },
        data: { proofImage },
      });

      if (updated.count === 0) {
        // Kalah race (status berubah) — hapus asset yang baru
        // dibuat agar tidak menjadi orphan.
        await destroyStoredFile(proofImage).catch(() => {});
        return ApiResponse.error(res, 'Setoran sudah diverifikasi — bukti tidak dapat diganti', 409);
      }

      // Bersihkan bukti lama (best-effort) — cegah orphan asset.
      if (oldProof && oldProof !== proofImage) {
        destroyStoredFile(oldProof).catch(() => {});
      }

      return ApiResponse.success(res, { proofImage }, 'Bukti transfer berhasil diupload');
    } catch (error) {
      // Database gagal setelah Cloudinary sukses → rollback asset.
      if (req.file?.filename) {
        await destroyStoredFile(`/uploads/${req.file.filename}`).catch(() => {});
      }
      console.error('Upload proof error:', error?.message || error);
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
      console.error('Get deposit proof error:', error?.message || error);
      return ApiResponse.error(res, 'Gagal mengambil bukti transfer');
    }
  },

  getMyDeposits: async (req, res) => {
    try {
      const { status, q, from, to, page, limit } = req.query;
      const { skip, take, page: p, limit: l } = getPagination(page, limit);

      const where = { savingsPlan: { userId: req.user.id } };
      if (status) where.status = String(status).toUpperCase();

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
      console.error('getMyDeposits error:', error?.message || error);
      return ApiResponse.error(res, 'Gagal mengambil data setoran');
    }
  },

  verify: async (req, res) => {
    const { id } = req.params;
    const { action, rejectionReason } = req.validatedData;
    const adminId = req.user.id;
    const idemKey = normalizeKey(req.get('idempotency-key'));

    try {
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

      // ---- Idempotency: replay bila kunci sama sudah diproses ----
      const payloadHash = hashPayload({ id, action, rejectionReason: rejectionReason || null });
      if (idemKey) {
        const existing = await findExisting({
          userId: adminId,
          scope: 'deposit.verify',
          key: idemKey,
          payloadHash,
        });
        if (existing.replay) {
          return ApiResponse.success(res, existing.replay.response, 'Setoran sudah diverifikasi (idempoten)');
        }
        if (existing.conflict) {
          return ApiResponse.error(res, 'Kunci idempotensi sudah dipakai dengan payload berbeda', 409);
        }
      }

      // ---- Aturan bisnis: approve wajib bukti transfer ----
      if (action === 'approve' && !deposit.proofImage) {
        return ApiResponse.error(res, 'Bukti transfer belum diupload — tidak dapat di-approve', 400);
      }

      // ---- Sudah final → idempotent (sama) atau 409 (berbeda) ----
      if (deposit.status !== 'PENDING') {
        const finalizedSame =
          (action === 'approve' && deposit.status === 'APPROVED') ||
          (action === 'reject' && deposit.status === 'REJECTED');
        if (finalizedSame) {
          return ApiResponse.success(res, null, `Setoran sudah ${action === 'approve' ? 'di-approve' : 'ditolak'} sebelumnya`);
        }
        return ApiResponse.error(res, 'Setoran sudah diverifikasi', 409);
      }

      if (action === 'approve') {
        const result = await approveInTransaction(deposit, adminId);
        const response = {
          depositId: deposit.id,
          isLunas: result.isLunas,
          newBalance: result.newBalance,
        };

        auditLog(req, 'admin', 'deposit.approve', {
          depositId: deposit.id,
          userId: deposit.savingsPlan.user.id,
          amount: String(deposit.amount),
          isLunas: result.isLunas,
        });

        const notification = await prisma.notification.findUnique({
          where: { id: result.notificationId },
        });
        notify(deposit.savingsPlan.user.id, notification).catch(() => {});

        if (idemKey) {
          await save({
            userId: adminId,
            scope: 'deposit.verify',
            key: idemKey,
            payloadHash,
            response,
          }).catch(() => {});
        }

        return ApiResponse.success(res, response, 'Setoran berhasil di-approve');
      }

      // action === 'reject'
      const reason = (rejectionReason || '').trim();
      if (!reason) return ApiResponse.error(res, 'Alasan penolakan wajib diisi', 400);

      const result = await rejectInTransaction(deposit, adminId, reason);
      const response = { depositId: deposit.id, rejected: true };

      auditLog(req, 'admin', 'deposit.reject', {
        depositId: deposit.id,
        userId: deposit.savingsPlan.user.id,
        reason: reason.slice(0, 100),
      });

      const notification = await prisma.notification.findUnique({
        where: { id: result.notificationId },
      });
      notify(deposit.savingsPlan.user.id, notification).catch(() => {});

      if (idemKey) {
        await save({
          userId: adminId,
          scope: 'deposit.verify',
          key: idemKey,
          payloadHash,
          response,
        }).catch(() => {});
      }

      return ApiResponse.success(res, response, 'Setoran ditolak');
    } catch (error) {
      // Kalah race (approve/reject paralel) → 409 idempotent, BUKAN saldo ganda.
      if (error?.code === RACE_CODE) {
        return ApiResponse.error(res, 'Setoran sudah diverifikasi admin lain', 409);
      }
      console.error('Verify error:', error?.message || error);
      return ApiResponse.error(res, 'Gagal memverifikasi setoran');
    }
  },
};

/**
 * Approval ATOMIK dalam satu transaction.
 *
 * Klaim status pakai UPDATE KONDISIONAL (`status = PENDING`):
 * hanya request yang benar-benar mengubah 1 row yang boleh
 * menambah saldo. Request yang kalah race (updateMany.count = 0)
 * melempar RACE → 409, saldo TIDAK berubah.
 */
const approveInTransaction = (deposit, adminId) =>
  prisma.$transaction(async (tx) => {
    const claimed = await tx.deposit.updateMany({
      where: { id: deposit.id, status: 'PENDING' },
      data: { status: 'APPROVED', verifiedById: adminId, verifiedAt: new Date() },
    });
    if (claimed.count === 0) {
      const error = new Error('Lost race: deposit sudah final');
      error.code = RACE_CODE;
      throw error;
    }

    const updatedSavings = await tx.savingsPlan.update({
      where: { id: deposit.savingsPlanId },
      data: { currentBalance: { increment: deposit.amount } },
    });

    const newBalance = Number(updatedSavings.currentBalance);
    const target = Number(updatedSavings.targetAmount);
    let isLunas = false;

    if (newBalance >= target) {
      await tx.savingsPlan.update({
        where: { id: deposit.savingsPlanId },
        data: { status: 'PAID_OFF', paidOffAt: new Date() },
      });
      isLunas = true;
    }        // Plan boleh tanpa paket (paket hanya patokan harga) → fallback ke nama jamaah.
        const lunasLabel = deposit.savingsPlan.package
          ? `Tabungan untuk paket "${deposit.savingsPlan.package.name}"`
          : `Tabungan "${deposit.savingsPlan.jamaahName}"`;
        const notification = await tx.notification.create({
          data: {
            userId: deposit.savingsPlan.user.id,
            title: isLunas ? 'Tabungan LUNAS! 🎉' : 'Setoran Diverifikasi ✅',
            message: isLunas
              ? `Alhamdulillah! ${lunasLabel} sudah LUNAS.`
          : `Setoran Rp ${Number(deposit.amount).toLocaleString('id-ID')} telah berhasil dikonfirmasi.`,
        type: isLunas ? 'PAID_OFF' : 'DEPOSIT_APPROVED',
      },
    });

    return { isLunas, newBalance, notificationId: notification.id };
  });

/** Rejection ATOMIK dalam satu transaction (kondisional PENDING). */
const rejectInTransaction = (deposit, adminId, reason) =>
  prisma.$transaction(async (tx) => {
    const claimed = await tx.deposit.updateMany({
      where: { id: deposit.id, status: 'PENDING' },
      data: {
        status: 'REJECTED',
        verifiedById: adminId,
        verifiedAt: new Date(),
        rejectionReason: reason,
      },
    });
    if (claimed.count === 0) {
      const error = new Error('Lost race: deposit sudah final');
      error.code = RACE_CODE;
      throw error;
    }

    const notification = await tx.notification.create({
      data: {
        userId: deposit.savingsPlan.user.id,
        title: 'Setoran Ditolak ❌',
        message: `Setoran Anda ditolak. Alasan: ${reason}`,
        type: 'DEPOSIT_REJECTED',
      },
    });

    return { notificationId: notification.id };
  });

export default depositController;
