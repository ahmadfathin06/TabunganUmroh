import crypto from 'crypto';

/**
 * Refresh token disimpan di database dalam bentuk hash SHA-256, bukan
 * plaintext. Kalau isi database bocor, token yang ada tidak bisa langsung
 * dipakai untuk membajak sesi user.
 */
export const hashToken = (token) =>
  crypto.createHash('sha256').update(String(token)).digest('hex');

/**
 * Perbandingan waktu-konstan (mencegah timing attack saat membandingkan
 * hash token). Panjang berbeda langsung dianggap tidak cocok.
 */
export const safeCompare = (a, b) => {
  const bufA = Buffer.from(String(a ?? ''), 'utf8');
  const bufB = Buffer.from(String(b ?? ''), 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
};

export default { hashToken, safeCompare };
