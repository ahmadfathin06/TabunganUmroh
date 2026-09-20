/**
 * Entry point Vercel (serverless function).
 *
 * Vercel memanggil default export sebagai request handler — Express app
 * memang berupa fungsi (req, res), jadi bisa langsung diekspor.
 *
 * Yang TIDAK dilakukan di sini (berbeda dari src/server.js untuk lokal):
 * - app.listen()           → tidak relevan di serverless
 * - initSocket()           → WebSocket tidak didukung serverless; client
 *                            otomatis fallback ke polling notifikasi
 * - setupReminderCron(),
 *   setupCleanupCron()     → dipicu Vercel Cron via GET /api/cron/*
 * - configureVapid()       → dipanggil lazy di push.service saat kirim push
 */
import app from '../server/src/app.js';

export default app;
