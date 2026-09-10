const prisma = require('../config/database');
const ApiResponse = require('../utils/apiResponse');
const generateUniqueCode = require('../utils/generateUniqueCode');

const depositController = {
  // ============ USER: Buat Setoran Baru ============
  create: async (req, res) => {
    try {
      const { savingsPlanId, amount, bankAccountId } = req.body;

      // Validasi savings plan milik user ini
      const savingsPlan = await prisma.savingsPlan.findFirst({
        where: {
          id: savingsPlanId,
          userId: req.user.id,
          status: 'ACTIVE',
        },
      });

      if (!savingsPlan) {
        return ApiResponse.error(res, 'Rencana tabungan tidak ditemukan', 404);
      }

      // Validasi bank account
      const bankAccount = await prisma.bankAccount.findFirst({
        where: { id: bankAccountId, isActive: true },
      });

      if (!bankAccount) {
        return ApiResponse.error(res, 'Rekening tujuan tidak valid', 400);
      }

      // Generate unique code
      const uniqueCode = generateUniqueCode();
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
            select: {
              bankName: true,
              accountNumber: true,
              accountHolder: true,
            },
          },
        },
      });

      // Notifikasi ke semua admin
      const admins = await prisma.user.findMany({
        where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } },
      });

      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: 'Setoran Baru Masuk 💰',
          message: `${req.user.name} mengajukan setoran sebesar Rp ${totalTransfer.toLocaleString('id-ID')}`,
          type: 'DEPOSIT_APPROVED',
        })),
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
          message: `Silakan transfer tepat Rp ${totalTransfer.toLocaleString('id-ID')} ke rekening di atas, lalu upload bukti transfer.`,
        },
      }, 'Setoran berhasil dibuat');

    } catch (error) {
      console.error('Create deposit error:', error);
      return ApiResponse.error(res, 'Gagal membuat setoran');
    }
  },

  // ============ USER: Upload Bukti Transfer ============
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

      if (!deposit) {
        return ApiResponse.error(res, 'Setoran tidak ditemukan', 404);
      }

      if (!req.file) {
        return ApiResponse.error(res, 'File bukti transfer wajib diupload', 400);
      }

      // URL file (dari Cloudinary atau local)
      const proofImage = req.file.path || req.file.location;

      const updated = await prisma.deposit.update({
        where: { id },
        data: { proofImage },
      });

      return ApiResponse.success(res, updated, 'Bukti transfer berhasil diupload');

    } catch (error) {
      console.error('Upload proof error:', error);
      return ApiResponse.error(res, 'Gagal upload bukti transfer');
    }
  },

  // ============ USER: Histori Setoran ============
  getMyDeposits: async (req, res) => {
    try {
      const { status, page = 1, limit = 10 } = req.query;
      const skip = (parseInt(page) - 1) * parseInt(limit);

      const where = {
        savingsPlan: { userId: req.user.id },
      };
      if (status) where.status = status.toUpperCase();

      const [deposits, total] = await Promise.all([
        prisma.deposit.findMany({
          where,
          include: {
            savingsPlan: {
              select: {
                jamaahName: true,
                package: { select: { name: true } },
              },
            },
            bankAccount: {
              select: { bankName: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: parseInt(limit),
        }),
        prisma.deposit.count({ where }),
      ]);

      return ApiResponse.paginated(res, deposits, {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
      });

    } catch (error) {
      console.error('Get deposits error:', error);
      return ApiResponse.error(res, 'Gagal mengambil data setoran');
    }
  },

  // ============ ADMIN: Verifikasi Setoran ============
  verify: async (req, res) => {
    try {
      const { id } = req.params;
      const { action, rejectionReason } = req.body; // action: "approve" | "reject"

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

      if (!deposit) {
        return ApiResponse.error(res, 'Setoran tidak ditemukan', 404);
      }

      if (deposit.status !== 'PENDING') {
        return ApiResponse.error(res, 'Setoran sudah diverifikasi', 400);
      }

      if (action === 'approve') {
        // ===== APPROVE: Update dalam TRANSACTION =====
        const result = await prisma.$transaction(async (tx) => {
          // 1. Update deposit status
          const updatedDeposit = await tx.deposit.update({
            where: { id },
            data: {
              status: 'APPROVED',
              verifiedById: req.user.id,
              verifiedAt: new Date(),
            },
          });

          // 2. Update saldo tabungan
          const updatedSavings = await tx.savingsPlan.update({
            where: { id: deposit.savingsPlanId },
            data: {
              currentBalance: {
                increment: parseFloat(deposit.amount),
              },
            },
          });

          // 3. Cek apakah sudah lunas
          const newBalance = parseFloat(updatedSavings.currentBalance);
          const target = parseFloat(updatedSavings.targetAmount);

          if (newBalance >= target) {
            await tx.savingsPlan.update({
              where: { id: deposit.savingsPlanId },
              data: {
                status: 'PAID_OFF',
                paidOffAt: new Date(),
              },
            });

            // Notif lunas
            await tx.notification.create({
              data: {
                userId: deposit.savingsPlan.user.id,
                title: 'Tabungan LUNAS! 🎉🕌',
                message: `Alhamdulillah! Tabungan umroh paket "${deposit.savingsPlan.package.name}" sudah LUNAS. Tim kami akan segera menghubungi Anda.`,
                type: 'PAID_OFF',
              },
            });
          }

          // 4. Notifikasi setoran approved
          await tx.notification.create({
            data: {
              userId: deposit.savingsPlan.user.id,
              title: 'Setoran Diverifikasi ✅',
              message: `Setoran Rp ${parseFloat(deposit.amount).toLocaleString('id-ID')} telah dikonfirmasi. Saldo terkini: Rp ${newBalance.toLocaleString('id-ID')}`,
              type: 'DEPOSIT_APPROVED',
            },
          });

          return { updatedDeposit, updatedSavings, isLunas: newBalance >= target };
        });

        return ApiResponse.success(res, result, 'Setoran berhasil di-approve');

      } else if (action === 'reject') {
        // ===== REJECT =====
        if (!rejectionReason) {
          return ApiResponse.error(res, 'Alasan penolakan wajib diisi', 400);
        }

        const updatedDeposit = await prisma.deposit.update({
          where: { id },
          data: {
            status: 'REJECTED',
            verifiedById: req.user.id,
            verifiedAt: new Date(),
            rejectionReason,
          },
        });

        // Notifikasi ditolak
        await prisma.notification.create({
          data: {
            userId: deposit.savingsPlan.user.id,
            title: 'Setoran Ditolak ❌',
            message: `Setoran Rp ${parseFloat(deposit.amount).toLocaleString('id-ID')} ditolak. Alasan: ${rejectionReason}. Silakan upload ulang bukti transfer yang benar.`,
            type: 'DEPOSIT_REJECTED',
          },
        });

        return ApiResponse.success(res, updatedDeposit, 'Setoran ditolak');

      } else {
        return ApiResponse.error(res, 'Action harus "approve" atau "reject"', 400);
      }

    } catch (error) {
      console.error('Verify deposit error:', error);
      return ApiResponse.error(res, 'Gagal verifikasi setoran');
    }
  },
};

module.exports = depositController;