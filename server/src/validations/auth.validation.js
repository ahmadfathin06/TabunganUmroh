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
}).strict().refine((data) => data.password === data.confirmPassword, {
  message: 'Konfirmasi password tidak cocok',
  path: ['confirmPassword'],
});

// Login bisa memakai email ATAU nomor WhatsApp/HP. `email` tetap diterima
// supaya klien lama yang belum mengirim `identifier` tidak langsung rusak.
export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Email atau No. HP wajib diisi').max(100).optional(),
  email: z.string().trim().min(1).max(100).optional(),
  password: z.string().min(1, 'Password wajib diisi'),
}).strict().refine((data) => Boolean(data.identifier || data.email), {
  message: 'Email atau No. HP wajib diisi',
  path: ['identifier'],
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token wajib diisi'),
}).strict();

export const updateProfileSchema = z.object({
  name: z.string().min(3, 'Nama minimal 3 karakter').max(100).optional(),
  phone: z.string().min(10, 'No. HP minimal 10 angka').max(15).regex(/^[0-9]+$/, 'Hanya angka').optional(),
  hasPassport: z.boolean().optional(),
  passportNumber: z.string().min(5, 'No. paspor minimal 5 karakter').max(30).optional(),
}).strict();