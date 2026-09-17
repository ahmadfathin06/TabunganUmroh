import { z } from 'zod';

/**
 * Endpoint POST /savings sebelumnya TIDAK divalidasi sama sekali dan membaca
 * `req.body` mentah. Akibatnya payload bisa berisi tipe/ukuran sembarang
 * (mis. `jamaahName` sepanjang 1MB) dan nilai non-numerik ikut masuk query
 * Prisma sampai error 500.
 */
export const RELATIONS = ['self', 'suami', 'istri', 'ayah', 'ibu', 'anak', 'other'];

export const createSavingsSchema = z.object({
  packageId: z.string().min(1, 'Paket wajib dipilih').max(64),
  jamaahName: z.string().min(3, 'Nama jamaah minimal 3 karakter').max(100).optional(),
  jamaahRelation: z.enum(RELATIONS).optional(),
  monthlyTarget: z.coerce
    .number()
    .positive('Target cicilan harus lebih dari 0')
    .max(1_000_000_000, 'Target cicilan terlalu besar')
    .optional(),
}).strict();

export const cancelSavingsSchema = z.object({
  reason: z.string().max(500, 'Alasan maksimal 500 karakter').optional(),
}).strict();

export default { createSavingsSchema, cancelSavingsSchema, RELATIONS };
