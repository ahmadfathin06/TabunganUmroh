import { z } from 'zod';
import { parseAmountInput } from '../utils/money';

/**
 * Skema validasi form "Buat Rencana Tabungan" (sisi client).
 *
 * Aturannya DICERMINI dari server (server/src/validations/savings.validation.js)
 * supaya request yang tidak valid tertangkap SEBELUM dikirim. Sebelumnya
 * modal ini tidak memvalidasi apa pun: user bisa mengirim nama 1 karakter
 * atau target 2 miliar, server membalas 422, dan user hanya melihat toast
 * generik "Validasi gagal" tanpa tahu field mana yang bermasalah.
 */
export const SAVINGS_LIMITS = {
  nameMin: 3,
  nameMax: 100,
  amountMax: 1_000_000_000,
};

export const RELATIONS = ['self', 'suami', 'istri', 'ayah', 'ibu', 'anak', 'other'];

/** String kosong (form kosong) → undefined, supaya field opsional tetap opsional. */
const emptyToUndefined = (value) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
};

/**
 * Nominal uang: boleh dikosongkan, menerima pemisah ribuan gaya Indonesia,
 * dan menolak nilai di luar batas server.
 */
const amountField = (label, maxMessage) =>
  z.preprocess(
    (value) => {
      if (typeof value !== 'string') return value;
      const trimmed = value.trim();
      if (!trimmed) return undefined;
      const parsed = parseAmountInput(trimmed);
      // NaN → biarkan string apa adanya supaya zod menolaknya dengan pesan
      // "harus berupa angka" (bukan lolos diam-diam menjadi null).
      return Number.isNaN(parsed) ? trimmed : parsed;
    },
    z.coerce
      .number({ invalid_type_error: `${label} harus berupa angka` })
      .positive(`${label} harus lebih dari 0`)
      .max(SAVINGS_LIMITS.amountMax, maxMessage)
      .optional()
  );

export const createPlanSchema = z.object({
  packageId: z.preprocess(emptyToUndefined, z.string().optional()),
  targetAmount: amountField('Target tabungan', 'Target tabungan maksimal Rp 1 miliar'),
  jamaahName: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .min(SAVINGS_LIMITS.nameMin, `Nama jamaah minimal ${SAVINGS_LIMITS.nameMin} karakter`)
      .max(SAVINGS_LIMITS.nameMax, `Nama jamaah maksimal ${SAVINGS_LIMITS.nameMax} karakter`)
      .optional()
  ),
  jamaahRelation: z.enum(RELATIONS),
  monthlyTarget: amountField('Target cicilan', 'Target cicilan maksimal Rp 1 miliar'),
});

export default createPlanSchema;
