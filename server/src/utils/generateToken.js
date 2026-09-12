import jwt from 'jsonwebtoken';
import crypto from 'crypto';

export const generateAccessToken = (userId, role) => {
  return jwt.sign(
    { userId, role, jti: crypto.randomUUID() },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES }
  );
};

export const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId: String(userId), jti: crypto.randomUUID() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES }
  );
};

export const generateReferralCode = (name) => {
  const cleanName = name.replace(/\s+/g, '').toUpperCase().slice(0, 4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${cleanName}${random}`;
};