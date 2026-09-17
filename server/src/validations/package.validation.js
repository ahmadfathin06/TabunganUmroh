import { z } from 'zod';

export const createPackageSchema = z.object({
  name: z.string().min(3, 'Nama paket minimal 3 karakter').max(150),
  description: z.string().max(3000).optional(),
  price: z.number().min(1000000, 'Harga minimal Rp 1.000.000'),
  departureDate: z.string().min(1, 'Tanggal berangkat wajib'),
  departureCity: z.string().min(1, 'Kota berangkat wajib').max(100),
  durationDays: z.number().int().min(1, 'Durasi minimal 1 hari').max(365),
  hotelMakkah: z.string().max(150).optional(),
  hotelMadinah: z.string().max(150).optional(),
  airline: z.string().max(150).optional(),
  category: z.enum(['Reguler', 'Premium', 'VIP']).default('Reguler'),
  features: z.array(z.string().max(200)).max(50).optional(),
  isFeatured: z.boolean().optional(),
  quota: z.number().int().min(1, 'Kuota minimal 1').max(100000),
  image: z.string().max(500).optional(),
  includes: z.string().max(3000).optional(),
  excludes: z.string().max(3000).optional(),
}).strict();

/**
 * PUT /packages/:id sebelumnya memakai `req.body` mentah tanpa validasi apa pun
 * (mass assignment). Skema ditulis eksplisit — bukan `.partial()` dari skema
 * create — supaya `category` tidak ikut ter-set ke nilai default saat update.
 */
export const updatePackageSchema = z
  .object({
    name: z.string().min(3).max(150).optional(),
    description: z.string().max(3000).optional(),
    price: z.number().min(1000000).optional(),
    departureDate: z.string().min(1).optional(),
    departureCity: z.string().min(1).max(100).optional(),
    durationDays: z.number().int().min(1).max(365).optional(),
    hotelMakkah: z.string().max(150).optional(),
    hotelMadinah: z.string().max(150).optional(),
    airline: z.string().max(150).optional(),
    category: z.enum(['Reguler', 'Premium', 'VIP']).optional(),
    features: z.array(z.string().max(200)).max(50).optional(),
    isFeatured: z.boolean().optional(),
    quota: z.number().int().min(1).max(100000).optional(),
    quotaRemaining: z.number().int().min(0).max(100000).optional(),
    status: z.enum(['OPEN', 'CLOSED', 'FULL']).optional(),
    image: z.string().max(500).optional(),
    includes: z.string().max(3000).optional(),
    excludes: z.string().max(3000).optional(),
  })
  .strict();
