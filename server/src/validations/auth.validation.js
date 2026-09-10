import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter').max(100),
  email: z.string().email('Format email tidak valid'),
  password: z.string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Harus mengandung huruf besar')
    .regex(/[0-9]/, 'Harus mengandung angka'),
  confirmPassword: z.string(),
  phone: z.string().min(10).max(15).regex(/^[0-9]+$/, 'Hanya angka'),
  ktpNumber: z.string().length(16, 'No. KTP harus 16 digit').optional(),
  address: z.string().min(10).optional(),
  hasPassport: z.boolean().optional().default(false),
  referralCode: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Konfirmasi password tidak cocok',
  path: ['confirmPassword'],
});

export const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});