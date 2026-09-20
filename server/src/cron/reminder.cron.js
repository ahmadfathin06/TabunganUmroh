import cron from 'node-cron';
import prisma from '../config/database.js';
import { notify } from '../services/notification.service.js';

/**
 * Reminder setoran bulanan.
 *
 * Di lokal tetap dijadwalkan via node-cron (tanggal 25, 09:00). Di Vercel,
 * fungsi ini dipanggil Vercel Cron lewat GET /api/cron/reminder (lihat
 * routes/cron.routes.js + vercel.json) karena scheduler bawaan tidak reliable
 * di lingkungan serverless.
 */
export const runMonthlyReminder = async () => {
  console.log('⏰ Menjalankan auto-reminder setoran bulanan...');
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const activePlans = await prisma.savingsPlan.findMany({
      where: { status: 'ACTIVE' },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        package: { select: { name: true } },
        deposits: {
          where: {
            createdAt: { gte: startOfMonth },
            status: { in: ['PENDING', 'APPROVED'] },
          },
        },
      },
    });

    const toRemind = activePlans.filter((p) => p.deposits.length === 0);

    for (const plan of toRemind) {
      const notification = await prisma.notification.create({
        data: {
          userId: plan.user.id,
          title: 'Reminder Setoran 🔔',
          message: `Assalamualaikum, Anda belum melakukan setoran bulan ini untuk "${plan.package.name}". Silakan melakukan transfer segera agar target keberangkatan tetap terjaga!`,
          type: 'REMINDER',
        },
      });
      notify(plan.user.id, notification).catch(() => {});
    }

    console.log(`✅ Reminder dikirim ke ${toRemind.length} jamaah.`);
    return { reminded: toRemind.length };
  } catch (error) {
    console.error('❌ Cron error:', error);
    throw error;
  }
};

const setupReminderCron = () => {
  // Berjalan otomatis setiap tanggal 25 jam 09:00 pagi (hanya relevan saat
  // server long-running; di Vercel dipicu Vercel Cron).
  cron.schedule('0 9 25 * *', () => {
    runMonthlyReminder().catch(() => {});
  });

  console.log('📅 Cron reminder: Aktif setiap tanggal 25 pukul 09:00 WIB');
};

export default setupReminderCron;
