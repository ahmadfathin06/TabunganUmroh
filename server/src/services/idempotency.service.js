/**
 * Layanan kunci idempotensi (P0/P1 — aksi sensitif).
 *
 * Aksi seperti "buat setoran" dan "verifikasi setoran" harus
 * idempotent: retry request yang sama (timeout jaringan, double
 * klik, retry otomatis) TIDAK boleh menggandakan efek
 * (saldo bertambah dua kali, notifikasi ganda).
 *
 * Cara kerja:
 *   1. Caller mengirim header `Idempotency-Key: <uuid>`.
 *   2. `findExisting()` mencari rekam (userId + scope + key) yang
 *      belum kedaluwarsa. Bila ditemukan dan payload-nya sama
 *      (hash), respons yang tersimpan dikembalikan (REPLAY).
 *   3. Bila tidak ada, aksi dijalankan dan `save()` menyimpan
 *      respons untuk replay berikutnya.
 *
 * Keamanan:
 *   - Payload di-hash (SHA-256) sebelum disimpan — isi request
 *     (password, data pribadi) tidak pernah disimpan plaintext.
 *   - Respons disimpan sebagai JSON string; caller bertanggung
 *     jawab hanya menyimpan respons yang aman.
 *   - Rekam kedaluwarsa otomatis (default 24 jam) dan dibersihkan
 *     oleh cron cleanup.
 */
import crypto from 'crypto';
import prisma from '../config/database.js';

/** Durasi kunci idempotensi berlaku (default 24 jam). */
export const DEFAULT_TTL_MS = 24 * 60 * 60 * 1000;

const KEY_PATTERN = /^[A-Za-z0-9._-]{8,128}$/;

/** @returns {string|null} kunci ternormalisasi, atau null bila tidak valid. */
export const normalizeKey = (value) => {
  const raw = String(value ?? '').trim();
  return KEY_PATTERN.test(raw) ? raw : null;
};

/** Hash payload request (SHA-256) — isi tidak pernah disimpan. */
export const hashPayload = (payload) =>
  crypto.createHash('sha256').update(JSON.stringify(payload ?? null)).digest('hex');

const toRow = (row) => ({
  id: row.id,
  payload: row.payload,
  response: row.response ? JSON.parse(row.response) : null,
  createdAt: row.createdAt,
  expiresAt: row.expiresAt,
});

/**
 * Cari rekam idempotensi yang belum kedaluwarsa.
 * @returns {Promise<{replay: object}|{fresh: true}|{conflict: true}>}
 *   - `{replay}` : kunci ada & payload sama → kembalikan respons tersimpan.
 *   - `{fresh}`  : tidak ada kunci → aman menjalankan aksi.
 *   - `{conflict}`: kunci ada tapi payload berbeda → reject (409).
 */
export const findExisting = async ({ userId, scope, key, payloadHash }) => {
  const now = new Date();
  const row = await prisma.idempotencyKey.findUnique({
    where: { userId_scope_key: { userId, scope, key } },
  });

  if (!row) return { fresh: true };
  if (new Date(row.expiresAt).getTime() <= now.getTime()) {
    // Kedaluwarsa → anggap fresh (akan ditimpa saat save).
    return { fresh: true };
  }
  if (row.payload && row.payload !== payloadHash) {
    return { conflict: true };
  }
  return { replay: toRow(row) };
};

/**
 * Simpan (atau timpa) rekam idempotensi setelah aksi berhasil.
 * Upsert agar aman bila dua instance sama-sama menyimpan.
 */
export const save = async ({ userId, scope, key, payloadHash, response, ttlMs = DEFAULT_TTL_MS }) => {
  const now = new Date();
  await prisma.idempotencyKey.upsert({
    where: { userId_scope_key: { userId, scope, key } },
    create: {
      userId,
      scope,
      key,
      payload: payloadHash,
      response: JSON.stringify(response ?? null),
      createdAt: now,
      expiresAt: new Date(now.getTime() + ttlMs),
    },
    update: {
      payload: payloadHash,
      response: JSON.stringify(response ?? null),
      expiresAt: new Date(now.getTime() + ttlMs),
    },
  });
};

/**
 * Hapus rekam idempotensi kedaluwarsa (dipanggil cron cleanup).
 * @returns {Promise<number>} jumlah yang dihapus
 */
export const purgeExpired = () =>
  prisma.idempotencyKey.deleteMany({
    where: { expiresAt: { lte: new Date() } },
  });

export default { findExisting, save, purgeExpired, normalizeKey, hashPayload };
