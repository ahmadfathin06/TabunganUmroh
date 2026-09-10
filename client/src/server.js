const app = require('./app');
const prisma = require('./config/database');
const setupReminderCron = require('./cron/reminder.cron');

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');

    // Setup cron jobs
    setupReminderCron();

    // Start server
    app.listen(PORT, () => {
      console.log(`
    ╔══════════════════════════════════════╗
    ║  🕌 Tabungan Umroh API Server       ║
    ║  📡 Port: ${PORT}                       ║
    ║  🌍 Env: ${process.env.NODE_ENV}            ║
    ║  ✅ Status: Running                  ║
    ╚══════════════════════════════════════╝
      `);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 SIGTERM received. Shutting down...');
  await prisma.$disconnect();
  process.exit(0);
});

startServer();