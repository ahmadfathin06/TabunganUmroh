import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

import { startTestServer, prisma } from '../support/server.js';

let ctx;

before(async () => {
  ctx = await startTestServer();
});

after(async () => {
  await ctx.close();
  await prisma.$disconnect().catch(() => {});
});

test('GET /api/health → 200, database OK, status konfigurasi aman', async () => {
  const res = await ctx.request('/api/health');

  assert.equal(res.status, 200);
  assert.equal(res.body.status, 'OK');
  assert.equal(res.body.database, 'OK');
  assert.ok(['configured', 'disabled'].includes(res.body.cloudinary));
  assert.ok(['enabled', 'disabled', 'misconfigured'].includes(res.body.email));
  assert.equal(typeof res.body.timestamp, 'string');
  assert.ok(!Number.isNaN(Date.parse(res.body.timestamp)));
  assert.equal(typeof res.body.uptime, 'number');
});

test('health check tidak membocorkan kredensial', async () => {
  const res = await ctx.request('/api/health');
  const serialized = JSON.stringify(res.body);

  assert.ok(!/CLOUDINARY_|RESEND_API_KEY|postgresql:\/\/|JWT_/i.test(serialized));
});

test('health check tidak melakukan upload atau mengirim email', async () => {
  // Hanya membaca status konfigurasi — respons email tidak berubah menjadi
  // 'enabled' hanya karena endpoint ini dipanggil.
  const first = await ctx.request('/api/health');
  const second = await ctx.request('/api/health');
  assert.equal(first.body.email, second.body.email);
  assert.equal(first.body.cloudinary, second.body.cloudinary);
});
