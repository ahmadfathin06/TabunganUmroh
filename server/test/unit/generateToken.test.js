import test from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';

import { generateAccessToken, generateRefreshToken } from '../../src/utils/generateToken.js';

const ACCESS_SECRET = 'ci_access_secret_0123456789abcdefghijklmnop';
const REFRESH_SECRET = 'ci_refresh_secret_0123456789abcdefghijklmn';

/** Simulasikan lingkungan tanpa file .env (kondisi CI / Vercel). */
const withoutExpiryEnv = (fn) => {
  const savedAccess = process.env.JWT_ACCESS_EXPIRES;
  const savedRefresh = process.env.JWT_REFRESH_EXPIRES;
  delete process.env.JWT_ACCESS_EXPIRES;
  delete process.env.JWT_REFRESH_EXPIRES;
  try {
    return fn();
  } finally {
    if (savedAccess === undefined) delete process.env.JWT_ACCESS_EXPIRES;
    else process.env.JWT_ACCESS_EXPIRES = savedAccess;
    if (savedRefresh === undefined) delete process.env.JWT_REFRESH_EXPIRES;
    else process.env.JWT_REFRESH_EXPIRES = savedRefresh;
  }
};

test('token tetap terbit saat JWT_*_EXPIRES tidak diset (fallback 15m / 7d)', () => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
  process.env.JWT_REFRESH_SECRET = REFRESH_SECRET;

  withoutExpiryEnv(() => {
    const access = generateAccessToken('user-1', 'USER');
    const refresh = generateRefreshToken('user-1');

    const accessPayload = jwt.verify(access, ACCESS_SECRET);
    const refreshPayload = jwt.verify(refresh, REFRESH_SECRET);

    assert.equal(accessPayload.userId, 'user-1');
    assert.equal(accessPayload.role, 'USER');
    assert.equal(refreshPayload.userId, 'user-1');

    // exp - iat = masa berlaku dalam detik
    assert.equal(accessPayload.exp - accessPayload.iat, 15 * 60);
    assert.equal(refreshPayload.exp - refreshPayload.iat, 7 * 24 * 60 * 60);
  });
});

test('env JWT_*_EXPIRES yang diset tetap dipakai, bukan default', () => {
  process.env.JWT_ACCESS_SECRET = ACCESS_SECRET;
  process.env.JWT_REFRESH_SECRET = REFRESH_SECRET;
  const savedAccess = process.env.JWT_ACCESS_EXPIRES;
  const savedRefresh = process.env.JWT_REFRESH_EXPIRES;

  try {
    process.env.JWT_ACCESS_EXPIRES = '10m';
    process.env.JWT_REFRESH_EXPIRES = '2d';

    const accessPayload = jwt.verify(generateAccessToken('user-2', 'ADMIN'), ACCESS_SECRET);
    const refreshPayload = jwt.verify(generateRefreshToken('user-2'), REFRESH_SECRET);

    assert.equal(accessPayload.exp - accessPayload.iat, 10 * 60);
    assert.equal(refreshPayload.exp - refreshPayload.iat, 2 * 24 * 60 * 60);
    assert.equal(accessPayload.role, 'ADMIN');
  } finally {
    if (savedAccess === undefined) delete process.env.JWT_ACCESS_EXPIRES;
    else process.env.JWT_ACCESS_EXPIRES = savedAccess;
    if (savedRefresh === undefined) delete process.env.JWT_REFRESH_EXPIRES;
    else process.env.JWT_REFRESH_EXPIRES = savedRefresh;
  }
});
