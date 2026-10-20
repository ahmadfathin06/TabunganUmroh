import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

import { startTestServer, registerUser, cleanupUsers, prisma } from '../support/server.js';
import { FIELD_LABELS } from '../../src/middlewares/validate.middleware.js';

/**
 * Perilaku baru: menabung TIDAK terikat pada satu paket.
 * - Plan boleh dibuat tanpa paket sama sekali (target bebas).
 * - Paket hanyalah patokan harga → TIDAK memesan/mengurangi kuota.
 * - Membatalkan plan tidak menyentuh kuota paket.
 */
let ctx;
let user;
let pkg;
let planNoPackageId;
let planWithPackageId;

before(async () => {
  ctx = await startTestServer();
  user = await registerUser(ctx.request);

  pkg = await prisma.umrohPackage.create({
    data: {
      name: `Paket Patokan ${Date.now()}`,
      slug: `paket-patokan-${Date.now()}`,
      price: 35000000,
      departureDate: new Date('2027-03-01'),
      departureCity: 'Jakarta',
      durationDays: 12,
      quota: 40,
      quotaRemaining: 40,
    },
  });
});

after(async () => {
  await ctx.close();
  await cleanupUsers([user.id]);
  await prisma.umrohPackage.delete({ where: { id: pkg.id } }).catch(() => {});
  await prisma.$disconnect().catch(() => {});
});

test('POST /savings tanpa packageId → plan berdiri sendiri, target bebas', async () => {
  const res = await ctx.request('/api/savings', {
    method: 'POST',
    token: user.accessToken,
    body: { targetAmount: 25000000, jamaahName: 'Tanpa Paket', jamaahRelation: 'self' },
  });

  assert.equal(res.status, 201, res.text);
  assert.equal(res.body.data.packageId, null);
  assert.equal(res.body.data.package, null);
  assert.equal(Number(res.body.data.targetAmount), 25000000);
  assert.equal(Number(res.body.data.currentBalance), 0);

  planNoPackageId = res.body.data.id;
  assert.ok(planNoPackageId);
});

test('POST /savings dengan packageId → paket hanya patokan harga, kuota TIDAK dikurangi', async () => {
  const before = await prisma.umrohPackage.findUnique({ where: { id: pkg.id } });

  // Tanpa targetAmount → target jatuh ke harga paket (patokan).
  const res = await ctx.request('/api/savings', {
    method: 'POST',
    token: user.accessToken,
    body: { packageId: pkg.id },
  });

  assert.equal(res.status, 201, res.text);
  assert.equal(res.body.data.packageId, pkg.id);
  assert.equal(Number(res.body.data.targetAmount), Number(pkg.price));

  const afterPkg = await prisma.umrohPackage.findUnique({ where: { id: pkg.id } });
  assert.equal(afterPkg.quotaRemaining, before.quotaRemaining, 'kuota berkurang saat menabung');

  planWithPackageId = res.body.data.id;
  assert.ok(planWithPackageId);
});

test('POST /savings target dikosongkan eksplisit (null) → tetap tanpa target walau pilih paket', async () => {
  const res = await ctx.request('/api/savings', {
    method: 'POST',
    token: user.accessToken,
    body: { packageId: pkg.id, targetAmount: null },
  });

  assert.equal(res.status, 201, res.text);
  assert.equal(res.body.data.packageId, pkg.id);
  assert.equal(res.body.data.targetAmount, null);
});

test('POST /savings tanpa target dan tanpa paket → 201, target masih null (belum tahu)', async () => {
  const res = await ctx.request('/api/savings', {
    method: 'POST',
    token: user.accessToken,
    body: {},
  });

  assert.equal(res.status, 201, res.text);
  assert.equal(res.body.data.packageId, null);
  assert.equal(res.body.data.targetAmount, null);

  // Progress/remaining aman saat target null (tidak NaN, tidak auto-lunas).
  const mine = await ctx.request('/api/savings/my', { token: user.accessToken });
  const created = mine.body.data.find((p) => p.id === res.body.data.id);
  assert.equal(created.progress, 0);
  assert.equal(created.remaining, null);

  // Bereskan langsung supaya tidak menumpuk (saldo 0 → boleh dibatalkan).
  const cancel = await ctx.request(`/api/savings/${res.body.data.id}/cancel`, {
    method: 'PUT',
    token: user.accessToken,
    body: {},
  });
  assert.equal(cancel.status, 200, cancel.text);
});

test('POST /savings dengan packageId fiktif → 404, tidak ada plan yatim', async () => {
  const res = await ctx.request('/api/savings', {
    method: 'POST',
    token: user.accessToken,
    body: { packageId: 'pkg_tidak_ada_123', targetAmount: 1000000 },
  });

  assert.equal(res.status, 404);
  assert.match(res.text, /Paket tidak ditemukan/);

  const orphan = await prisma.savingsPlan.findFirst({
    where: { userId: user.id, packageId: 'pkg_tidak_ada_123' },
  });
  assert.equal(orphan, null);
});

/**
 * Regression: modal "Buat Rencana" dulu mengirim isi form apa adanya tanpa
 * validasi client, jadi nama yang terlalu pendek (atau target melebihi
 * batas) ditolak server dengan 422. Client hanya membaca `message` generik
 * ("Validasi gagal") sehingga user tidak tahu field mana yang salah.
 *
 * Sekarang: 422 harus menyebut field + alasannya dalam bahasa Indonesia.
 */
test('POST /savings dengan data tidak valid -> 422 yang menyebut field & alasannya', async () => {
  const res = await ctx.request('/api/savings', {
    method: 'POST',
    token: user.accessToken,
    body: { targetAmount: 35000000, jamaahName: 'Ab', jamaahRelation: 'self' },
  });

  assert.equal(res.status, 422, res.text);
  assert.equal(res.body.success, false);
  assert.match(res.body.message, /minimal 3 karakter/);

  // Detail per field tersedia untuk ditampilkan inline di form.
  assert.ok(Array.isArray(res.body.errors));
  const nameIssue = res.body.errors.find((e) => e.field === 'jamaahName');
  assert.ok(nameIssue, 'error harus menunjuk field yang salah');
  assert.equal(nameIssue.label, FIELD_LABELS.jamaahName);
  assert.match(nameIssue.message, /minimal 3 karakter/);
});

test('POST /savings dengan target melebihi batas -> 422 dengan pesan jelas', async () => {
  const res = await ctx.request('/api/savings', {
    method: 'POST',
    token: user.accessToken,
    body: { targetAmount: 2000000000, jamaahRelation: 'self' },
  });

  assert.equal(res.status, 422, res.text);
  assert.match(res.body.message, /Target tabungan maksimal/);
});

test('POST /savings nama kosong -> 201 (pakai nama profil), bukan 422', async () => {
  const res = await ctx.request('/api/savings', {
    method: 'POST',
    token: user.accessToken,
    body: { targetAmount: 1000000, jamaahRelation: 'self' },
  });

  assert.equal(res.status, 201, res.text);
  assert.ok(res.body.data.jamaahName, 'nama jamaah harus terisi (dari profil)');

  // Bereskan supaya tidak menumpuk.
  await ctx.request(`/api/savings/${res.body.data.id}/cancel`, {
    method: 'PUT',
    token: user.accessToken,
    body: {},
  });
});

test('PUT /savings/:id/cancel → berhasil tanpa paket & kuota paket tidak berubah', async () => {
  const before = await prisma.umrohPackage.findUnique({ where: { id: pkg.id } });

  // Plan tanpa paket: dulu crash (update paket dengan id null) — sekarang lolos.
  const resNoPkg = await ctx.request(`/api/savings/${planNoPackageId}/cancel`, {
    method: 'PUT',
    token: user.accessToken,
    body: {},
  });
  assert.equal(resNoPkg.status, 200, resNoPkg.text);

  const resPkg = await ctx.request(`/api/savings/${planWithPackageId}/cancel`, {
    method: 'PUT',
    token: user.accessToken,
    body: {},
  });
  assert.equal(resPkg.status, 200, resPkg.text);

  const afterPkg = await prisma.umrohPackage.findUnique({ where: { id: pkg.id } });
  assert.equal(afterPkg.quotaRemaining, before.quotaRemaining, 'kuota berubah saat cancel');
});
