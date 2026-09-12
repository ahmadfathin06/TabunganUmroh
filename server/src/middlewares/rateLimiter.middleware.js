import rateLimit from 'express-rate-limit';

export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // Max 100 request per IP
  message: { success: false, message: 'Terlalu banyak request, coba lagi nanti' },
});

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Max 10 percobaan auth
  message: { success: false, message: 'Terlalu banyak percobaan, coba lagi dalam 15 menit' },
});