/**
 * Guard endpoint cron.
 *
 * Vercel Cron memanggil endpoint ini dengan header `x-vercel-cron` (tidak
 * bisa dipalsukan dari luar — Vercel menambahkannya hanya pada pemanggilan
 * terjadwal internal). Sebagai lapisan kedua, opsional bisa diset
 * CRON_SECRET dan Vercel akan mengirim `Authorization: Bearer <CRON_SECRET>`.
 *
 * Selain Vercel Cron, hanya ADMIN/SUPER_ADMIN yang boleh memicu manual
 * (dipakai untuk tombol "jalankan reminder sekarang" oleh admin).
 */
export const cronGuard = (req, res, next) => {
  const isVercelCron = req.get('x-vercel-cron') === '1';
  const secret = process.env.CRON_SECRET;
  const authHeader = req.get('authorization') || '';
  const hasValidSecret = Boolean(secret) && authHeader === `Bearer ${secret}`;
  const isAdmin = req.user?.role === 'ADMIN' || req.user?.role === 'SUPER_ADMIN';

  if (isVercelCron || hasValidSecret || isAdmin) return next();

  return res.status(401).json({ success: false, message: 'Akses cron ditolak' });
};

/**
 * Handler GET /api/cron/reminder — dipicu Vercel Cron bulanan.
 * Schedule di vercel.json: "0 2 25 * *" (tanggal 25 pukul 02:00 UTC = 09:00 WIB).
 */
export const runReminder = async (req, res) => {
  try {
    const { runMonthlyReminder } = await import('../cron/reminder.cron.js');
    const result = await runMonthlyReminder();
    return res.json({ success: true, message: 'Reminder bulanan selesai', data: result });
  } catch (error) {
    console.error('❌ Cron reminder endpoint error:', error);
    return res.status(500).json({ success: false, message: 'Cron reminder gagal' });
  }
};

/**
 * Handler GET /api/cron/cleanup — dipicu Vercel Cron harian.
 * Schedule di vercel.json: "0 20 * * *" (20:00 UTC = 03:00 WIB).
 */
export const runCleanup = async (req, res) => {
  try {
    const { runDailyCleanup } = await import('../cron/cleanup.cron.js');
    const result = await runDailyCleanup();
    return res.json({ success: true, message: 'Cleanup selesai', data: result });
  } catch (error) {
    console.error('❌ Cron cleanup endpoint error:', error);
    return res.status(500).json({ success: false, message: 'Cron cleanup gagal' });
  }
};

export default { cronGuard, runReminder, runCleanup };
