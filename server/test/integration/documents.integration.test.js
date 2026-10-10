import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';

import {
  startTestServer,
  registerUser,
  uploadMultipart,
  pngBytes,
  cleanupUsers,
  prisma,
} from '../support/server.js';

let ctx;
let owner;
let stranger;
let admin;
const createdIds = [];
let uploadedDocId;
let uploadedFileName;

const uploadDocument = (opts) =>
  uploadMultipart(ctx.baseUrl, '/api/documents', { field: 'document', ...opts });

before(async () => {
  ctx = await startTestServer();

  owner = await registerUser(ctx.request);
  stranger = await registerUser(ctx.request);
  admin = await registerUser(ctx.request);
  createdIds.push(owner.id, stranger.id, admin.id);

  // Jadikan admin sebagai ADMIN sungguhan (role dibaca dari DB saat request).
  await prisma.user.update({ where: { id: admin.id }, data: { role: 'ADMIN' } });
});

after(async () => {
  await cleanupUsers(createdIds);
  await ctx.close();
  await prisma.$disconnect().catch(() => {});
});

test('upload tanpa berkas → 400 (validasi controller)', async () => {
  const res = await uploadDocument({ token: owner.accessToken, type: 'KTP' });
  assert.equal(res.status, 400);
  assert.match(res.body.message, /wajib diupload/i);
});

test('berkas lebih dari 2MB → 400 (batas multer)', async () => {
  const oversize = Buffer.alloc(2.5 * 1024 * 1024, 1);
  const res = await uploadDocument({
    token: owner.accessToken,
    type: 'KTP',
    buffer: oversize,
    filename: 'big.png',
    contentType: 'image/png',
  });

  assert.equal(res.status, 400);
  assert.match(res.body.message, /2MB|melebihi/i);
});

test('MIME tidak didukung → 400', async () => {
  const res = await uploadDocument({
    token: owner.accessToken,
    type: 'KTP',
    buffer: Buffer.from('<script>alert(1)</script>'),
    filename: 'evil.html',
    contentType: 'text/html',
  });

  assert.equal(res.status, 400);
  assert.match(res.body.message, /tidak diizinkan/i);
});

test('upload tanpa autentikasi → 401', async () => {
  const res = await uploadDocument({
    type: 'KTP',
    buffer: pngBytes(),
    filename: 'ktp.png',
    contentType: 'image/png',
  });
  assert.equal(res.status, 401);
});

test('MIME didukung namun nama berkas menipu → ekstensi ditentukan server', async () => {
  const res = await uploadDocument({
    token: owner.accessToken,
    type: 'OTHER',
    buffer: pngBytes(),
    filename: 'payload.html',
    contentType: 'image/png',
  });

  assert.equal(res.status, 201);
  assert.match(res.body.data.fileUrl, /^\/uploads\/document-[0-9a-f-]{36}\.png$/);
  assert.ok(!res.body.data.fileUrl.includes('.html'));
  // Nama asli tetap dicatat untuk tampilan, tanpa memengaruhi path.
  assert.equal(res.body.data.fileName, 'payload.html');
});

test('upload PNG valid → 201 dan nama berkas tanpa prefix cloudinary', async () => {
  const res = await uploadDocument({
    token: owner.accessToken,
    type: 'KTP',
    buffer: pngBytes(),
    filename: 'ktp-saya.png',
    contentType: 'image/png',
  });

  assert.equal(res.status, 201);
  const doc = res.body.data;
  assert.match(doc.fileUrl, /^\/uploads\/document-[0-9a-f-]{36}\.png$/);
  assert.ok(!doc.fileUrl.includes('tuu-'), 'nama berkas tidak boleh memuat prefix Cloudinary');
  assert.equal(doc.status, 'PENDING');
  assert.equal(doc.type, 'KTP');

  uploadedDocId = doc.id;
  uploadedFileName = doc.fileUrl.replace('/uploads/', '');
});

test('pemilik dapat mengunduh berkasnya sendiri', async () => {
  const res = await ctx.request(`/api/documents/${uploadedDocId}/file`, { token: owner.accessToken });

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /image\/png/);
  assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
  assert.match(res.headers.get('content-security-policy'), /sandbox/);
});

test('user lain ditolak (403)', async () => {
  const res = await ctx.request(`/api/documents/${uploadedDocId}/file`, { token: stranger.accessToken });
  assert.equal(res.status, 403);
});

test('admin diperbolehkan mengunduh (200)', async () => {
  const res = await ctx.request(`/api/documents/${uploadedDocId}/file`, { token: admin.accessToken });
  assert.equal(res.status, 200);
});

test('tanpa token → 401', async () => {
  const res = await ctx.request(`/api/documents/${uploadedDocId}/file`);
  assert.equal(res.status, 401);
});

test('dokumen tidak ada → 404', async () => {
  const res = await ctx.request('/api/documents/does-not-exist/file', { token: owner.accessToken });
  assert.equal(res.status, 404);
});

test('berkas privat TIDAK dapat diakses lewat static /uploads (404)', async () => {
  const res = await ctx.request(`/uploads/${uploadedFileName}`);
  assert.equal(res.status, 404);

  // Path traversal ke root repo juga tidak boleh berhasil.
  const traversal = await ctx.request('/uploads/..%2f..%2f.env');
  assert.ok(traversal.status === 404 || traversal.status === 400, `status tak terduga: ${traversal.status}`);
});
