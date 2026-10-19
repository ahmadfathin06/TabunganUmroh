import jwt from 'jsonwebtoken';
import crypto from 'crypto';

// Kadaluarsa dari env, dengan fallback sama seperti server/.env.example.
// Bila env-nya kosong, `expiresIn: undefined` membuat jwt.sign melempar
// "expiresIn should be a number of seconds..." → register/login 500
// (persis kegagalan CI yang tidak punya file .env).
const ACCESS_EXPIRES = () => process.env.JWT_ACCESS_EXPIRES || '15m';
const REFRESH_EXPIRES = () => process.env.JWT_REFRESH_EXPIRES || '7d';

export const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { userId, role, jti: crypto.randomUUID() },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_EXPIRES() }
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId: String(userId), jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_EXPIRES() }
  );
};

export const generateReferralCode = (name) => {
  const cleanName = (name || 'UMROH').replace(/\s+/g, '').toUpperCase().slice(0, 4) || 'UMROH';
  // 8 karakter acak: peluang tabrakan dengan user lain sangat kecil. Kode ini
  // unik di DB (kolom referral_code @unique) — random pendek dulu menyebabkan
  // P2002 duplicate → registrasi gagal 500.
  const random = crypto.randomBytes(4).toString('hex').toUpperCase();
  return `${cleanName}${random}`;
};