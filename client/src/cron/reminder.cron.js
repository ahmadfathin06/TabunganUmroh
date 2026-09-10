const cron = require('node-cron');
const prisma = require('../config/database');

// Jalankan setiap tanggal 25, jam 09:00
// Reminder ke user yang belum setor bulan ini
const setupReminderCron = () => {
  cron.schedule('0 9 25 * *', async () => {
    console.log('⏰ Running monthly deposit reminder...');

    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      // Cari semua savings plan yang aktif
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

      // Filter yang belum setor bulan ini
      const usersToRemind = activePlans.filter(
        (plan) => plan.deposits.length === 0
      );

      console.log(`📢 Mengirim reminder ke ${usersToRemind.length} jamaah`);

      for (const plan of usersToRemind) {
        // Notifikasi in-app
        await prisma.notification.create({
          data: {
            userId: plan.user.id,
            title: 'Reminder Setoran Bulanan 🔔',
            message: `Assalamualaikum ${plan.user.name}, Anda belum melakukan setoran bulan ini untuk paket "${plan.package.name}". Yuk segera setor agar target tabungan tercapai!`,
            type: 'REMINDER',
          },
        });

        // TODO: Kirim WA via Fonnte API
        // await sendWhatsApp(plan.user.phone, message);
      }

      console.log('✅ Reminder selesai dikirim');
    } catch (error) {
      console.error('❌ Reminder cron error:', error);
    }
  });

  console.log('📅 Cron reminder terjadwal: setiap tanggal 25, jam 09:00');
};

module.exports = setupReminderCron;