/**
 * Guard endpoint cron.
 *
 * KEAMANAN (P0 — diperbaiki):
 * Sebelumnya header `x-vercel-cron: 1` diperlakukan sebagai
 * autentikasi utama. Header request publik dapat DIPALSUKAN oleh
 * siapa saja, sehingga endpoint cron (yang menjalankan reminder
 * bulanan + cleanup asset) bisa dipicu tanpa otorisasi.
 *
 * Sekarang:
 * - Production WAJIB memiliki CRON_SECRET (fail-fast bila kosong).
 * - Request cron harus membawa `Authorization: Bearer <CRON_SECRET>`
 *   yang dibandingkan secara waktu-konstan (timing-safe).
 * - Header `x-vercel-cron` hanya menjadi INFORMASI TAMBAHAN,
 *   bukan authorization utama.
 * - Request tanpa/ salah secret → 401. Nilai secret TIDAK pernah
 *   dikembalikan ke client.
 *
 * Trigger manual oleh admin dipisah ke route tersendiri
 * (POST /api/cron/:job/manual) yang memerlukan authenticate +
 * authorize('ADMIN','SUPER_ADMIN') + rate limit khusus admin.
 *
 * Konfigurasi Vercel: set CRON_SECRET di Project Settings →
 * Environment Variables, lalu tambahkan header Authorization pada
 * cron. Lihat DEPLOY.md.
 */
import crypto from 'crypto';
import ApiResponse from '../utils/apiResponse.js';
import { withCronLock } from '../utils/cronLock.js';

/** Bandingkan token dengan waktu-konstan (anti timing attack). */
const secretMatches = (provided, secret) => {
  const a = Buffer.from(String(provided ?? ''), 'utf8');
  const b = Buffer.from(String(secret ?? ''), 'utf8');
  if (a.length === 0 || b.length === 0) return false;
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

/**
 * Ambil CRON_SECRET. Di production, ketiadaan secret adalah
 * kesalahan konfigurasi kritis (gagalkan start bila diminta
 * fail-fast). Di development, diizinkan kosong dengan peringatan.
 */
const getCronSecret = () => process.env.CRON_SECRET;

/**
 * Guard untuk endpoint cron terjadwal (dipanggil Vercel Cron).
 * Hanya menerima request dengan Bearer <CRON_SECRET>.
 */
export const cronGuard = (req, res, next) => {
  const secret = getCronSecret();
  const authHeader = req.get('authorization') || '';
  const provided = authHeader.startsWith('Bearer ')
    ? authHeader.slice('Bearer '.length).trim()
    : '';

  const authorized = Boolean(secret) && secretMatches(provided, secret);

  // x-vercel-cron dicatat sebagai konteks saja — BUKAN authorization.
  const vercelCron = req.get('x-vercel-cron');

  if (!authorized) {
    // Jangan bocorkan apakah secret diset atau tidak.
    return ApiResponse.error(res, 'Akses cron ditolak', 401);
  }

  // Konteks opsional untuk audit/log (bukan otorisasi).
  req.cronContext = { vercelCron: vercelCron === '1' };
  return next();
};

/**
 * Wrapper job cron dengan distributed lock agar tidak berjalan
 * dua kali bersamaan (idempotency lintas instance).
 */
const runJob = (jobName, jobFn) => async (req, res) => {
  try {
    const { ran, reason, result } = await withCronLock(jobName, jobFn);
    if (!ran) {
      return ApiResponse.success(
        res,
        { ran: false, reason },
        `Job ${jobName} dilewati (sedang berjalan di instance lain)`
      );
    }
    return ApiResponse.success(res, { ran: true, result }, `Job ${jobName} selesai`);
  } catch (error) {
    console.error(`❌ Cron ${jobName} endpoint error:`, error?.message || error);
    return ApiResponse.error(res, `Cron ${jobName} gagal`, 500);
  }
};

/** Handler GET /api/cron/reminder — dipicu Vercel Cron bulanan. */
export const runReminder = runJob('reminder', async () => {
  const { runMonthlyReminder } = await import('../cron/reminder.cron.js');
  return runMonthlyReminder();
});

/** Handler GET /api/cron/cleanup — dipicu Vercel Cron harian. */
export const runCleanup = runJob('cleanup', async () => {
  const { runDailyCleanup } = await import('../cron/cleanup.cron.js');
  return runDailyCleanup();
});

export default { cronGuard, runReminder, runCleanup };
