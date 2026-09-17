import rateLimit from 'express-rate-limit';

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const limitMessage = (message) => ({ success: false, message });

/** Prefix endpoint notifikasi — dilewati limiter umum, punya limiter sendiri. */
const NOTIFICATIONS_PREFIX = '/api/notifications';

const isNotificationRequest = (req) =>
  (req.originalUrl || '').split('?')[0].startsWith(NOTIFICATIONS_PREFIX);

/**
 * Limiter umum.
 *
 * Sebelumnya 100 request / 15 menit. Terlalu ketat untuk pemakaian nyata:
 * dashboard memuat beberapa endpoint sekaligus (`/savings/my`, `/packages`,
 * `/bank-accounts`, `/deposits/my`, `/documents/my`) dan user kerap berpindah
 * tab sehingga mudah menyentuh 429.
 *
 * Endpoint notifikasi DILEWATI karena NotificationBell melakukan polling
 * berkala (30 detik) plus pemuatan ulang setiap tab kembali aktif — itu
 * menghabiskan kuota umum tanpa mencerminkan penyalahgunaan. Notifikasi
 * diatur oleh `notificationsLimiter` yang lebih longgar.
 */
export const generalLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 300, // ± 20 request/menit per IP
  standardHeaders: true,
  legacyHeaders: false,
  skip: isNotificationRequest,
  message: limitMessage('Terlalu banyak request, coba lagi nanti'),
});

/**
 * Khusus endpoint notifikasi.
 *
 * Perhitungan: polling tiap 30 detik ≈ 30 request/15 menit per tab, ditambah
 * pemuatan saat tab kembali aktif. Dengan 1500/15 menit (± 100 request/menit)
 * beberapa tab sekaligus tetap aman, tapi tetap ada batas atas untuk mencegah
 * penyalahgunaan.
 */
export const notificationsLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 1500,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Terlalu banyak permintaan notifikasi, coba lagi nanti'),
});

export const authLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 10, // Max 10 percobaan auth (anti brute force login/register)
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Terlalu banyak percobaan, coba lagi dalam 15 menit'),
});

/**
 * Endpoint refresh token sebelumnya tanpa batas sama sekali, padahal ia
 * menerima token dari body request. Batasnya lebih longgar dari login karena
 * client yang sah memanggilnya otomatis saat access token kadaluarsa — dan
 * beberapa request paralel bisa memicu lebih dari satu percobaan refresh.
 */
export const refreshLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Terlalu banyak permintaan refresh token, coba lagi nanti'),
});

/** Endpoint upload (dokumen & bukti transfer) — mencegah spam berkas ke disk. */
export const uploadLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: limitMessage('Terlalu banyak unggahan berkas, coba lagi nanti'),
});

export default {
  generalLimiter,
  notificationsLimiter,
  authLimiter,
  refreshLimiter,
  uploadLimiter,
};
