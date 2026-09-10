const { z } = require('zod');

const registerSchema = z.object({
  name: z
    .string()
    .min(3, 'Nama minimal 3 karakter')
    .max(100, 'Nama maksimal 100 karakter'),
  email: z
    .string()
    .email('Format email tidak valid'),
  password: z
    .string()
    .min(8, 'Password minimal 8 karakter')
    .regex(/[A-Z]/, 'Password harus mengandung huruf besar')
    .regex(/[0-9]/, 'Password harus mengandung angka'),
  confirmPassword: z
    .string(),
  phone: z
    .string()
    .min(10, 'No. HP minimal 10 digit')
    .max(15, 'No. HP maksimal 15 digit')
    .regex(/^[0-9]+$/, 'No. HP hanya boleh angka'),
  ktpNumber: z
    .string()
    .length(16, 'No. KTP harus 16 digit')
    .optional(),
  address: z
    .string()
    .min(10, 'Alamat minimal 10 karakter')
    .optional(),
  hasPassport: z
    .boolean()
    .optional()
    .default(false),
  referralCode: z
    .string()
    .optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Konfirmasi password tidak cocok',
  path: ['confirmPassword'],
});

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

module.exports = { registerSchema, loginSchema };