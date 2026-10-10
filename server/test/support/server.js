/**
 * Harness integration test.
 *
 * Menjalankan Express app SUNGGUHAN (bukan tiruan) di port acak, sehingga
 * middleware, route, controller, dan error handler yang diuji identik dengan
 * yang dipakai di produksi. Memerlukan DATABASE_URL yang bisa diakses.
 *
 * Berkas ini SENGAJA berada di `test/support/` (bukan `test/unit/` atau
 * `test/integration/`) supaya tidak ikut dieksekusi sebagai berkas test.
 */
import http from 'http';
import fs from 'fs/promises';
import path from 'path';

import app from '../../src/app.js';
import prisma from '../../src/config/database.js';
import { UPLOADS_DIR } from '../../src/utils/fileStorage.js';

// 1x1 PNG transparan yang valid.
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

export const pngBytes = () => Buffer.from(PNG_BYTES);

let sequence = 0;
const nextToken = () => `${Date.now().toString(36)}-${(sequence += 1).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const parseBody = (text) => {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

export const startTestServer = async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}`;

  const raw = (urlPath, init) => fetch(`${baseUrl}${urlPath}`, init);

  const request = async (urlPath, { method = 'GET', token, body, headers = {} } = {}) => {
    const finalHeaders = { ...headers };
    if (token) finalHeaders.Authorization = `Bearer ${token}`;
    let payload;
    if (body !== undefined) {
      finalHeaders['Content-Type'] = 'application/json';
      payload = JSON.stringify(body);
    }
    const res = await raw(urlPath, { method, headers: finalHeaders, body: payload });
    const text = await res.text();
    return { status: res.status, headers: res.headers, body: parseBody(text), text };
  };

  const close = () => new Promise((resolve) => server.close(resolve));

  return { baseUrl, raw, request, close };
};

/** Daftarkan user baru lewat endpoint sungguhan; kembalikan id + access token. */
export const registerUser = async (request, overrides = {}) => {
  const token = nextToken();
  const password = overrides.password || 'TestPass123';
  const payload = {
    name: `Test User ${token}`,
    email: `test-${token}@example.test`,
    password,
    confirmPassword: password,
    phone: `08${String(Math.floor(Math.random() * 1e10)).padStart(10, '0')}`,
    ...overrides,
  };

  const res = await request('/api/auth/register', { method: 'POST', body: payload });
  if (res.status !== 201) {
    throw new Error(`register gagal (${res.status}): ${res.text}`);
  }

  return {
    id: res.body.data.user.id,
    accessToken: res.body.data.tokens.accessToken,
    email: payload.email,
    password,
  };
};

/** Upload multipart (field file + field teks opsional). */
export const uploadMultipart = async (baseUrl, urlPath, { token, field, type, buffer, filename, contentType }) => {
  const form = new FormData();
  if (type !== undefined) form.append('type', type);
  if (buffer) form.append(field, new Blob([buffer], { type: contentType }), filename);

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${baseUrl}${urlPath}`, { method: 'POST', headers, body: form });
  const text = await res.text();
  return { status: res.status, body: parseBody(text), text };
};

/**
 * Hapus user test beserta berkas fisik yang dihasilkannya.
 * (Dokumen/setoran terhapus otomatis lewat onDelete: Cascade.)
 */
export const cleanupUsers = async (ids) => {
  const uniqueIds = [...new Set(ids)].filter(Boolean);
  if (uniqueIds.length === 0) return;

  const [documents, deposits] = await Promise.all([
    prisma.document.findMany({ where: { userId: { in: uniqueIds } }, select: { fileUrl: true } }),
    prisma.deposit.findMany({
      where: { savingsPlan: { userId: { in: uniqueIds } } },
      select: { proofImage: true },
    }),
  ]);

  await prisma.user.deleteMany({ where: { id: { in: uniqueIds } } });

  const files = [...documents.map((d) => d.fileUrl), ...deposits.map((d) => d.proofImage)].filter(Boolean);
  for (const file of files) {
    await fs.unlink(path.join(UPLOADS_DIR, path.basename(file))).catch(() => {});
  }
};

export { prisma };
