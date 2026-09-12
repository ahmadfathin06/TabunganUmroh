import { z } from 'zod';

export const createPackageSchema = z.object({
  name: z.string().min(3, 'Nama paket minimal 3 karakter'),
  description: z.string().optional(),
  price: z.number().min(1000000, 'Harga minimal Rp 1.000.000'),
  departureDate: z.string().min(1, 'Tanggal berangkat wajib'),
  departureCity: z.string().min(1, 'Kota berangkat wajib'),
  durationDays: z.number().min(1, 'Durasi minimal 1 hari'),
  hotelMakkah: z.string().optional(),
  hotelMadinah: z.string().optional(),
  airline: z.string().optional(),
  category: z.enum(['Reguler', 'Premium', 'VIP']).default('Reguler'),
  features: z.array(z.string()).optional(),
  isFeatured: z.boolean().optional(),
  quota: z.number().min(1, 'Kuota minimal 1'),
});