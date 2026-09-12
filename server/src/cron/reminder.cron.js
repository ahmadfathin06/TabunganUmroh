import cron from 'node-cron';
import prisma from '../config/database.js';
import { notify } from '../services/notification.service.js';

const setupReminderCron = () => {
  // Berjalan otomatis setiap tanggal 25 jam 09:00 pagi
  cron.schedule('0 9 25 * *', async () => {
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
    } catch (error) {
      console.error('❌ Cron error:', error);
    }
  });

  console.log('📅 Cron reminder: Aktif setiap tanggal 25 pukul 09:00 WIB');
};

export default setupReminderCron;