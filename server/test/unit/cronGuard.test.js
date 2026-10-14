/**
 * Unit test — cronGuard (cron.routes.js)
 *
 * Verifikasi:
 *   - tanpa header → 401
 *   - header x-vercel-cron saja tanpa Bearer → 401
 *   - Bearer secret salah → 401
 *   - Bearer secret benar → lanjut (next dipanggil)
 *   - CRON_SECRET tidak diset → semua request ditolak
 *   - nilai secret tidak pernah dikembalikan dalam respons
 */
import test from 'node:test';
import assert from 'node:assert/strict';

import { cronGuard } from '../../src/routes/cron.routes.js';

/** Buat req tiruan. */
const makeReq = (headers = {}) => ({
  get: (name) => headers[name.toLowerCase()] || headers[name] || undefined,
  headers,
});

/** Buat res tiruan yang menangkap status dan body JSON. */
const makeRes = () => {
  const captured = { status: null, body: null };
  return {
    captured,
    status(code) {
      captured.status = code;
      return this;
    },
    json(body) {
      captured.body = body;
      return this;
    },
  };
};

const SECRET = 'super-secret-cron-token-32chars!!';

const withSecret = (fn) => {
  const prev = process.env.CRON_SECRET;
  process.env.CRON_SECRET = SECRET;
  try {
    return fn();
  } finally {
    if (prev === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = prev;
  }
};

const withoutSecret = (fn) => {
  const prev = process.env.CRON_SECRET;
  delete process.env.CRON_SECRET;
  try {
    return fn();
  } finally {
    if (prev !== undefined) process.env.CRON_SECRET = prev;
  }
};

test('cronGuard: tanpa header sama sekali → 401', () => {
  withSecret(() => {
    const req = makeReq({});
    const res = makeRes();
    let nextCalled = false;
    cronGuard(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.captured.status, 401);
    // secret tidak pernah muncul dalam respons
    assert.ok(!JSON.stringify(res.captured.body).includes(SECRET));
  });
});

test('cronGuard: x-vercel-cron: 1 tanpa Bearer → 401 (header publik tidak cukup)', () => {
  withSecret(() => {
    const req = makeReq({ 'x-vercel-cron': '1' });
    const res = makeRes();
    let nextCalled = false;
    cronGuard(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.captured.status, 401);
  });
});

test('cronGuard: Bearer secret SALAH → 401', () => {
  withSecret(() => {
    const req = makeReq({ authorization: 'Bearer wrong-secret-value' });
    const res = makeRes();
    let nextCalled = false;
    cronGuard(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.captured.status, 401);
  });
});

test('cronGuard: Bearer secret BENAR → next dipanggil', () => {
  withSecret(() => {
    const req = makeReq({ authorization: `Bearer ${SECRET}` });
    const res = makeRes();
    let nextCalled = false;
    cronGuard(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(res.captured.status, null, 'tidak boleh ada status error');
  });
});

test('cronGuard: Bearer benar + x-vercel-cron → lulus (konteks kronologis dicatat)', () => {
  withSecret(() => {
    const req = makeReq({
      authorization: `Bearer ${SECRET}`,
      'x-vercel-cron': '1',
    });
    const res = makeRes();
    let nextCalled = false;
    cronGuard(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, true);
    assert.equal(req.cronContext?.vercelCron, true);
  });
});

test('cronGuard: CRON_SECRET tidak diset → semua request ditolak', () => {
  withoutSecret(() => {
    const req = makeReq({ authorization: `Bearer ${SECRET}` });
    const res = makeRes();
    let nextCalled = false;
    cronGuard(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.captured.status, 401);
  });
});

test('cronGuard: Authorization kosong string → 401', () => {
  withSecret(() => {
    const req = makeReq({ authorization: '' });
    const res = makeRes();
    let nextCalled = false;
    cronGuard(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.captured.status, 401);
  });
});

test('cronGuard: Bearer tanpa nilai → 401', () => {
  withSecret(() => {
    const req = makeReq({ authorization: 'Bearer ' });
    const res = makeRes();
    let nextCalled = false;
    cronGuard(req, res, () => { nextCalled = true; });
    assert.equal(nextCalled, false);
    assert.equal(res.captured.status, 401);
  });
});
