import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

import { startTestServer, registerUser, cleanupUsers, prisma } from '../support/server.js';

/**
 * Login harus bisa memakai EMAIL atau NOMOR HP/WA.
 * Nomor boleh diketik dalam format 08xxx, 628xxx, maupun +62 8xxx.
 */
let ctx;
const created = [];
const phone = `08${String(Date.now()).slice(-10)}`;
let user;

before(async () => {
  ctx = await startTestServer();
  user = await registerUser(ctx.request, { phone });
  created.push(user.id);
});

after(async () => {
  await ctx.close();
  await cleanupUsers(created);
  await prisma.$disconnect().catch(() => {});
});

const login = (body) => ctx.request('/api/auth/login', { method: 'POST', body });

test('login dengan email berhasil', async () => {
  const res = await login({ email: user.email, password: user.password });
  assert.equal(res.status, 200, res.text);
  assert.equal(res.body.data.user.email, user.email);
});

test('login dengan identifier email (huruf besar) berhasil', async () => {
  const res = await login({ identifier: user.email.toUpperCase(), password: user.password });
  assert.equal(res.status, 200, res.text);
  assert.equal(res.body.data.user.email, user.email);
});

test('login dengan nomor HP format 08xxx berhasil', async () => {
  const res = await login({ identifier: phone, password: user.password });
  assert.equal(res.status, 200, res.text);
  assert.equal(res.body.data.user.phone, phone);
});

test('login dengan nomor HP format 628xxx berhasil', async () => {
  const res = await login({ identifier: `62${phone.slice(1)}`, password: user.password });
  assert.equal(res.status, 200, res.text);
  assert.equal(res.body.data.user.phone, phone);
});

test('login dengan nomor HP format +62 berspasi berhasil', async () => {
  const local = `62${phone.slice(1)}`;
  const formatted = `+${local.slice(0, 2)} ${local.slice(2, 5)}-${local.slice(5, 9)}-${local.slice(9)}`;
  const res = await login({ identifier: formatted, password: user.password });
  assert.equal(res.status, 200, res.text);
  assert.equal(res.body.data.user.phone, phone);
});

test('password salah ditolak 401', async () => {
  const res = await login({ identifier: phone, password: 'SalahBanget123' });
  assert.equal(res.status, 401, res.text);
});

test('identifier tidak dikenal ditolak 401', async () => {
  const res = await login({ identifier: '089900001111', password: user.password });
  assert.equal(res.status, 401, res.text);
});

test('tanpa email/no. HP ditolak 422', async () => {
  const res = await login({ password: user.password });
  assert.equal(res.status, 422, res.text);
});
