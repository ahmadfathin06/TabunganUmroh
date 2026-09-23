/**
 * Entry point Vercel (serverless function).
 *
 * Menjalankan hasil `npm run build:api --prefix server` (esbuild bundle) yang
 * mengubah seluruh server (termasuk Prisma client hasil generate yang berupa
 * TypeScript) menjadi satu file plain-JS ESM di server/.build/server.mjs.
 *
 * Bundling ini penting: Vercel menjalankan kode dengan Node.js bawaan yang
 * TIDAK selalu menangani import file `.ts` (type stripping) di dalam fungsi —
 * Prisma 7 menghasilkan client dalam .ts yang Wajib dikompilasi lebih dulu
 * (misal dengan esbuild) agar tidak crash dengan FUNCTION_INVOCATION_FAILED.
 *
 * Yang TIDAK dilakukan di sini (berbeda dari src/server.js untuk lokal):
 * - app.listen()           → tidak relevan di serverless
 * - initSocket()           → WebSocket tidak didukung serverless; client
 *                            otomatis fallback ke polling notifikasi
 * - setupReminderCron(),
 *   setupCleanupCron()     → dipicu Vercel Cron via GET /api/cron/*
 * - configureVapid()       → dipanggil lazy di push.service saat kirim push
 */
import app from '../server/.build/server.mjs';

export default app;
