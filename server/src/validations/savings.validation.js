import { z } from 'zod';

/**
 * Endpoint POST /savings sebelumnya TIDAK divalidasi sama sekali dan membaca
 * `req.body` mentah. Akibatnya payload bisa berisi tipe/ukuran sembarang
 * (mis. `jamaahName` sepanjang 1MB) dan nilai non-numerik ikut masuk query
 * Prisma sampai error 500.
 *
 * PENTING (fix 422 "Validasi gagal" yang tidak informatif):
 * - Semua pesan WAJIB berbahasa Indonesia dan menyebut field yang salah.
 *   Pesan bawaan zod berbahasa Inggris ("String must contain at most 100
 *   character(s)") tidak membantu user — modal "Buat Rencana" menampilkan
 *   pesan ini apa adanya, jadi user tidak tahu field mana yang harus
 *   diperbaiki.
 * - Nama jamaah boleh kosong → dinormalisasi (trim) supaya "   " tidak
 *   lolos sebagai nama yang sah.
 */
export const RELATIONS = ['self', 'suami', 'istri', 'ayah', 'ibu', 'anak', 'other'];

export const SAVINGS_LIMITS = {
  nameMin: 3,
  nameMax: 100,
  amountMax: 1_000_000_000,
};

/**
 * Angka uang dari client boleh berupa string (form) — dikoerce jadi number.
 * Nilai yang bukan angka harus ditolak dengan pesan jelas, bukan
 * "Expected number, received nan".
 */
const amountField = (label, maxMessage) =>
  z.coerce
    .number({ invalid_type_error: `${label} harus berupa angka` })
    .positive(`${label} harus lebih dari 0`)
    .max(SAVINGS_LIMITS.amountMax, maxMessage);

/**
 * String kosong (form kosong) → undefined, supaya field opsional tetap opsional.
 * Nama yang hanya berisi spasi juga dianggap "tidak diisi" → controller memakai
 * nama profil user.
 */
const emptyToUndefined = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

export const createSavingsSchema = z.object({
  // Paket opsional: hanya patokan harga, bukan ikatan rencana tabungan.
  packageId: z.string().min(1, 'Paket tidak valid').max(64, 'Paket tidak valid').optional(),
  // Boleh kosong (null): user yang belum tahu target bisa mengisi nanti.
  targetAmount: amountField('Target tabungan', 'Target tabungan maksimal Rp 1 miliar')
    .nullable()
    .optional(),
  jamaahName: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .min(SAVINGS_LIMITS.nameMin, `Nama jamaah minimal ${SAVINGS_LIMITS.nameMin} karakter`)
      .max(SAVINGS_LIMITS.nameMax, `Nama jamaah maksimal ${SAVINGS_LIMITS.nameMax} karakter`)
      .optional()
  ),
  jamaahRelation: z.enum(RELATIONS).optional(),
  monthlyTarget: amountField('Target cicilan', 'Target cicilan maksimal Rp 1 miliar').optional(),
}).strict();

export const cancelSavingsSchema = z.object({
  reason: z.string().trim().max(500, 'Alasan maksimal 500 karakter').optional(),
}).strict();

export default { createSavingsSchema, cancelSavingsSchema, RELATIONS, SAVINGS_LIMITS };
