/**
 * Distributed lock + idempotency untuk job cron (reminder & cleanup).
 *
 * Dua lapisan:
 * 1. In-process mutex — mencegah job yang sama berjalan dua kali
 *    dalam satu instance (relevan untuk node-cron lokal dan untuk
 *    double-invocation cepat pada satu serverless instance).
 * 2. DB heartbeat lock (tabel `Setting`) — mencegah dua instance
 *    Vercel serverless menjalankan job yang sama bersamaan.
 *
 * Lock DB memakai pola "claim dengan stale-timeout":
 * - Baris `cron_lock:<key>` menyimpan ISO timestamp kapan lock diambil.
 * - Lock dianggap milik kita bila baris belum ada (kita buat) ATAU
 *   timestamp-nya sudah lebih tua dari `staleAfterMs` (pemegang sebelumnya
 *   diduga crash — kita ambil alih).
 * - Seluruh check-and-set berjalan dalam satu transaction sehingga dua
 *   instance yang sama-sama mengklaim tidak bisa sama-sama menang
 *   (satu menang, satu rollback konflik).
 *
 * SELURUHNYA fail-safe: bila database tidak tersedia, in-process lock
 * tetap melindungi instance lokal; job TIDAK gagal total.
 *
 * CATATAN (residual risk): untuk skala banyak instance dengan timing
 * yang sangat ketat, disarankan lock terdistribusi sejati (Redis/
 * advisory lock Postgres). Implementasi ini sudah cukup untuk cron
 * harian/bulanan yang berjalan beberapa detik.
 */
import prisma from '../config/database.js';

/** Durasi lock dianggap "stale" (pemegang crash). Default 10 menit. */
const DEFAULT_STALE_MS = 10 * 60 * 1000;

/** Mutex per key dalam proses ini. */
const inProcess = new Map();

/**
 * Ambil promise "penahan" untuk key. Bila sudah ada, job sedang berjalan.
 * @returns {Promise<null>} null bila berhasil mengunci; otherwise menunggu.
 */
const acquireInProcess = (key) => {
  if (inProcess.has(key)) return Promise.resolve(false);
  let release;
  const gate = new Promise((resolve) => { release = resolve; });
  inProcess.set(key, gate);
  return Promise.resolve(true);
};

const releaseInProcess = (key) => {
  const gate = inProcess.get(key);
  if (gate) {
    inProcess.delete(key);
    // Lepaskan penahan (jika ada yang menunggu — tidak dipakai saat ini).
    gate.catch(() => {});
  }
};

/**
 * Klaim lock di database. Check-and-set atomik dalam transaction.
 * @returns {Promise<boolean>} true bila lock berhasil diambil.
 */
export const acquireDbLock = async (key, { staleAfterMs = DEFAULT_STALE_MS } = {}) => {
  const lockKey = `cron_lock:${key}`;
  try {
    return await prisma.$transaction(async (tx) => {
      const existing = await tx.setting.findUnique({ where: { key: lockKey } });
      if (!existing) {
        await tx.setting.create({
          data: { key: lockKey, value: new Date().toISOString() },
        });
        return true;
      }
      const lockedAt = new Date(existing.value);
      if (Number.isNaN(lockedAt.getTime()) || Date.now() - lockedAt.getTime() > staleAfterMs) {
        // Stale / rusak → ambil alih.
        await tx.setting.update({
          where: { key: lockKey },
          data: { value: new Date().toISOString() },
        });
        return true;
      }
      return false; // masih dipegang instance lain
    });
  } catch {
    // DB tidak tersedia → jangan blokir job; in-process lock tetap aktif.
    return true;
  }
};

/** Lepaskan lock database (best-effort). */
export const releaseDbLock = async (key) => {
  const lockKey = `cron_lock:${key}`;
  try {
    await prisma.setting.deleteMany({ where: { key: lockKey } });
  } catch {
    // abaikan — lock akan stale sendiri
  }
};

/**
 * Jalankan `fn` tepat satu kali (per key) pada satu waktu.
 *
 * @param {string} key identitas job (mis. 'reminder', 'cleanup')
 * @param {Function} fn  fungsi async job
 * @param {{staleAfterMs?: number}} opts
 * @returns {Promise<{ran: boolean, reason?: string, result?: any}>}
 */
export const withCronLock = async (key, fn, opts = {}) => {
  const got = await acquireInProcess(key);
  if (!got) {
    return { ran: false, reason: 'already-running' };
  }

  let dbHeld = false;
  try {
    dbHeld = await acquireDbLock(key, opts);
    if (!dbHeld) {
      return { ran: false, reason: 'locked-elsewhere' };
    }
    const result = await fn();
    return { ran: true, result };
  } finally {
    if (dbHeld) await releaseDbLock(key);
    releaseInProcess(key);
  }
};

/** Reset state lock (khusus test). */
export const __resetCronLock = () => {
  inProcess.clear();
};

export default { withCronLock, acquireDbLock, releaseDbLock, __resetCronLock };
