import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

import { startTestServer, registerUser, cleanupUsers, prisma } from '../support/server.js';

/**
 * Hapus jamaah & tabungan (admin).
 *
 * - Jamaah dihapus BESERTA datanya (rencana, setoran, dokumen, notifikasi).
 * - Rencana tabungan dihapus bersama setorannya; rencana ber saldo butuh
 *   konfirmasi eksplisit (?force=true).
 */
let ctx;
let admin;
let adminToken;
let member;
let memberToken;
const created = [];

const promoteToAdmin = (id) =>
  prisma.user.update({ where: { id }, data: { role: 'ADMIN' } });

const newMember = async () => {
  const u = await registerUser(ctx.request);
  created.push(u.id);
  return u;
};

const createPlan = (userId, balance = 0) =>
  prisma.savingsPlan.create({
    data: {
      userId,
      jamaahName: 'Test Jamaah',
      currentBalance: balance,
    },
  });

before(async () => {
  ctx = await startTestServer();
  admin = await registerUser(ctx.request);
  created.push(admin.id);
  await promoteToAdmin(admin.id);
  const login = await ctx.request('/api/auth/login', {
    method: 'POST',
    body: { email: admin.email, password: admin.password },
  });
  adminToken = login.body?.data?.tokens?.accessToken;

  member = await newMember();
  memberToken = member.accessToken;
});

after(async () => {
  await ctx.close();
  await cleanupUsers(created);
  await prisma.$disconnect().catch(() => {});
});

test('DELETE /admin/users/:id -> jamaah dihapus beserta datanya', async () => {
  const victim = await newMember();
  const plan = await createPlan(victim.id);

  const res = await ctx.request(`/api/admin/users/${victim.id}`, {
    method: 'DELETE',
    token: adminToken,
  });

  assert.equal(res.status, 200, res.text);

  const gone = await prisma.user.findUnique({ where: { id: victim.id } });
  assert.equal(gone, null, 'user masih ada');

  const planGone = await prisma.savingsPlan.findUnique({ where: { id: plan.id } });
  assert.equal(planGone, null, 'rencana tidak ikut terhapus');
});

test('DELETE /admin/users/:id -> ditolak untuk akun admin', async () => {
  const res = await ctx.request(`/api/admin/users/${admin.id}`, {
    method: 'DELETE',
    token: adminToken,
  });

  assert.equal(res.status, 400, res.text);

  const still = await prisma.user.findUnique({ where: { id: admin.id } });
  assert.ok(still, 'akun admin tidak boleh terhapus');
});

test('DELETE /admin/users/:id -> user biasa tidak boleh menghapus orang lain', async () => {
  const victim = await newMember();

  const res = await ctx.request(`/api/admin/users/${victim.id}`, {
    method: 'DELETE',
    token: memberToken,
  });

  assert.equal(res.status, 403, res.text);

  const still = await prisma.user.findUnique({ where: { id: victim.id } });
  assert.ok(still, 'jamaah tidak boleh terhapus oleh user biasa');
});

test('DELETE /admin/plans/:id -> hapus rencana tabungan', async () => {
  const owner = await newMember();
  const plan = await createPlan(owner.id);

  const res = await ctx.request(`/api/admin/plans/${plan.id}`, {
    method: 'DELETE',
    token: adminToken,
  });

  assert.equal(res.status, 200, res.text);

  const gone = await prisma.savingsPlan.findUnique({ where: { id: plan.id } });
  assert.equal(gone, null);
});

test('DELETE /admin/plans/:id dengan saldo -> butuh konfirmasi (force)', async () => {
  const owner = await newMember();
  const plan = await createPlan(owner.id, 500000);

  const blocked = await ctx.request(`/api/admin/plans/${plan.id}`, {
    method: 'DELETE',
    token: adminToken,
  });

  assert.equal(blocked.status, 400, blocked.text);
  assert.ok(blocked.body.errors?.some((e) => e.field === 'force'));

  const still = await prisma.savingsPlan.findUnique({ where: { id: plan.id } });
  assert.ok(still, 'rencana ber saldo tidak boleh hilang diam-diam');

  const forced = await ctx.request(`/api/admin/plans/${plan.id}?force=true`, {
    method: 'DELETE',
    token: adminToken,
  });

  assert.equal(forced.status, 200, forced.text);

  const gone = await prisma.savingsPlan.findUnique({ where: { id: plan.id } });
  assert.equal(gone, null);
});

test('DELETE /admin/plans/:id -> 404 untuk rencana yang tidak ada', async () => {
  const res = await ctx.request('/api/admin/plans/tidak_ada_123', {
    method: 'DELETE',
    token: adminToken,
  });

  assert.equal(res.status, 404, res.text);
});
