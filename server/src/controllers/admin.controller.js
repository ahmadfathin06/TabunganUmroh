import prisma from '../config/database.js';
import ApiResponse from '../utils/apiResponse.js';
import { createNotification, createNotificationForAll } from '../services/notification.service.js';
import { auditLog } from '../services/audit.service.js';
import { destroyStoredFile } from '../utils/fileStorage.js';

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

  // ============ HAPUS JAMAAH & TABUNGAN ============

  /**
   * DELETE /api/admin/users/:id
   *
   * Hapus beserta seluruh datanya (rencana tabungan, setoran, dokumen,
   * notifikasi, push subscription). Cascade di database akan menghapus baris
   * tabelnya, TAPI berkas privat (KTP/paspor/bukti transfer) menjadi orphan
   * di Cloudinary/disk — jadi nama berkasnya dikumpulkan DULU lalu dihapus
   * setelah baris DB hilang.
   *
   * Pengaman:
   * - hanya akun role USER (jamaah) — akun admin tidak boleh dihapus dari
   *   sini supaya admin tidak mengunci dirinya sendiri di luar sistem;
   * - tidak boleh menghapus akun sendiri.
   */
  deleteUser: async (req, res) => {
    try {
      const { id } = req.params;

      const target = await prisma.user.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          role: true,
          referralCode: true,
          _count: { select: { savingsPlans: true, documents: true } },
        },
      });
      if (!target) return ApiResponse.error(res, 'Jamaah tidak ditemukan', 404);

      if (target.role !== 'USER') {
        return ApiResponse.error(res, 'Hanya akun clientele (jamaah) yang dapat dihapus', 400);
      }
      if (req.user?.id === id) {
        return ApiResponse.error(res, 'Tidak dapat menghapus akun sendiri', 400);
      }

      // Berkas privat dikumpulkan sebelum cascade menghapus record-nya.
      const [documents, deposits] = await Promise.all([
        prisma.document.findMany({ where: { userId: id }, select: { fileUrl: true } }),
        prisma.deposit.findMany({
          where: { savingsPlan: { userId: id } },
          select: { proofImage: true },
        }),
      ]);

      const deleted = await prisma.$transaction(async (tx) => {
        // Relasi TANPA onDelete: Cascade harus dibersihkan manual, kalau tidak
        // delete user gagal karena pelanggaran foreign key.
        await tx.chat.deleteMany({ where: { OR: [{ senderId: id }, { receiverId: id }] } });
        await tx.referralReward.deleteMany({
          where: { OR: [{ userId: id }, { referredUserId: id }] },
        });
        // Setoran yang diverifikasi oleh user ini (seharusnya admin) → null.
        await tx.deposit.updateMany({ where: { verifiedById: id }, data: { verifiedById: null } });
        // Wakil yang dirujuk oleh kode referral jamaahnya → putuskan relasi.
        if (target.referralCode) {
          await tx.user.updateMany({
            where: { referredBy: target.referralCode },
            data: { referredBy: null },
          });
        }

        // Cascade: savingsPlans (+deposits), documents, notifications,
        // pushSubscriptions.
        return tx.user.delete({ where: { id } });
      });

      // Bersihkan berkas orphan (best-effort, tidak pernah melempar).
      const files = [
        ...documents.map((d) => d.fileUrl),
        ...deposits.map((d) => d.proofImage),
      ].filter(Boolean);
      await Promise.all(files.map((file) => destroyStoredFile(file).catch(() => {})));

      auditLog(req, 'admin', 'user.delete', {
        targetUserId: id,
        plans: target._count.savingsPlans,
        documents: target._count.documents,
        files: files.length,
      });

      return ApiResponse.success(
        res,
        {
          id: deleted.id,
          plans: target._count.savingsPlans,
          documents: target._count.documents,
        },
        `Jamaah ${target.name} beserta seluruh datanya berhasil dihapus`
      );
    } catch (error) {
      console.error('Delete user error:', error?.message || error);
      return ApiResponse.error(res, 'Gagal menghapus jamaah');
    }
  },

  /**
   * DELETE /api/admin/plans/:id
   *
   * Hapus satu rencana tabungan (beserta setorannya). Setoran di dalam
   * rencana ikut terhapus karena cascade — termasuk berkas bukti transfernya.
   *
   * Pengaman: rencana yang masih punya saldo TIDAK boleh hilang diam-diam.
   * Server menolak dengan 400 + penanda `force` sampai client mengirim
   * `?force=true` (user sudah mengonfirmasi di UI).
   */
  deletePlan: async (req, res) => {
    try {
      const { id } = req.params;
      const force = req.query.force === 'true' || req.body?.force === true;

      const plan = await prisma.savingsPlan.findUnique({
        where: { id },
        select: {
          id: true,
          currentBalance: true,
          status: true,
          user: { select: { id: true } },
          package: { select: { name: true } },
          _count: { select: { deposits: true } },
        },
      });
      if (!plan) return ApiResponse.error(res, 'Rencana tabungan tidak ditemukan', 404);

      const balance = Number(plan.currentBalance || 0);
      if (balance > 0 && !force) {
        return ApiResponse.error(
          res,
          'Rencana ini masih punya saldo. Konfirmasi hapus dengan saldo ikut terhapus.',
          400,
          [{ field: 'force', message: 'Saldo rencana masih ada', balance }]
        );
      }

      const deposits = await prisma.deposit.findMany({
        where: { savingsPlanId: id },
        select: { proofImage: true },
      });

      // Cascade: seluruh setoran pada rencana ini ikut terhapus.
      await prisma.savingsPlan.delete({ where: { id } });

      const files = deposits.map((d) => d.proofImage).filter(Boolean);
      await Promise.all(files.map((file) => destroyStoredFile(file).catch(() => {})));

      auditLog(req, 'admin', 'savingsPlan.delete', {
        planId: id,
        userId: plan.user.id,
        balance,
        deposits: plan._count.deposits,
        forced: force,
      });

      return ApiResponse.success(
        res,
        { id, balance, deposits: plan._count.deposits },
        'Rencana tabungan berhasil dihapus'
      );
    } catch (error) {
      console.error('Delete plan error:', error?.message || error);
      return ApiResponse.error(res, 'Gagal menghapus rencana tabungan');
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

        auditLog(req, 'admin', 'admin.broadcast', { target, userId, sent: 1 });

        return ApiResponse.created(res, { sent: 1 }, `Pengumuman terkirim ke ${user.name}`);
      }

      const sent = await createNotificationForAll({
        title: title.trim(),
        message: message.trim(),
        type: 'ANNOUNCEMENT',
      });

      auditLog(req, 'admin', 'admin.broadcast', { target, sent });

      return ApiResponse.created(res, { sent }, `Pengumuman terkirim ke ${sent} jamaah`);
    } catch (error) {
      console.error('Broadcast error:', error);
      return ApiResponse.error(res, 'Gagal mengirim pengumuman');
    }
  },
};

export default adminController;