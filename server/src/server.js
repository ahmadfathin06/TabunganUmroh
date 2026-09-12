import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import prisma from './config/database.js';
import setupReminderCron from './cron/reminder.cron.js';
import setupCleanupCron from './cron/cleanup.cron.js';
import { configureVapid } from './services/push.service.js';
import { initSocket } from './sockets/socket.service.js';
import http from 'http';

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    await prisma.$connect();
    console.log('✅ Database PostgreSQL terkoneksi dengan baik');

    setupReminderCron();
    setupCleanupCron();
    configureVapid();

    const httpServer = http.createServer(app);
    initSocket(httpServer);

    httpServer.listen(PORT, () => {
      console.log(`
    ╔══════════════════════════════════════╗
    ║  Status Backend: Berjalan Sukses     ║
    ║  Port Layanan : ${PORT}                 ║
    ║  Environment  : ${process.env.NODE_ENV}     ║
    ╚══════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('❌ Gagal menjalankan server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

process.on('SIGINT', async () => {
  console.log('\n🛑 Shutdown sistem secara aman...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();