import test from 'node:test';
import assert from 'node:assert/strict';

import { buildHealthReport } from '../../src/utils/health.js';

const okDb = { $queryRaw: async () => [{ '?column?': 1 }] };
const failingDb = {
  $queryRaw: async () => {
    throw new Error('connect ECONNREFUSED 10.0.0.5:5432 database "tabunganku" secret=super-secret');
  },
};

const REPORT_KEYS = ['status', 'database', 'cloudinary', 'email', 'timestamp', 'uptime'];

test('database sehat → status OK dan HTTP 200', async () => {
  const { healthy, dbError, report } = await buildHealthReport(okDb, {
    now: () => new Date('2026-10-10T00:00:00.000Z'),
    uptime: () => 42,
  });

  assert.equal(healthy, true);
  assert.equal(dbError, null);
  assert.equal(report.status, 'OK');
  assert.equal(report.database, 'OK');
  assert.equal(report.timestamp, '2026-10-10T00:00:00.000Z');
  assert.equal(report.uptime, 42);
  assert.deepEqual(Object.keys(report), REPORT_KEYS);
});

test('database gagal → status DEGRADED dan TIDAK membocorkan detail error', async () => {
  const { healthy, dbError, report } = await buildHealthReport(failingDb);

  assert.equal(healthy, false);
  assert.ok(dbError instanceof Error, 'detail error tetap dikembalikan untuk log server');
  assert.equal(report.status, 'DEGRADED');
  assert.equal(report.database, 'ERROR');

  // Pesan mentah (host, nama DB, secret) tidak boleh masuk ke laporan publik.
  const serialized = JSON.stringify(report);
  assert.ok(!serialized.includes('ECONNREFUSED'));
  assert.ok(!serialized.includes('super-secret'));
  assert.ok(!serialized.includes('10.0.0.5'));
});

test('laporan memuat status konfigurasi cloudinary & email berupa string aman', async () => {
  const { report } = await buildHealthReport(okDb);

  assert.ok(['configured', 'disabled'].includes(report.cloudinary));
  assert.ok(['enabled', 'disabled', 'misconfigured'].includes(report.email));
  // Hanya status — bukan nilai kredensial.
  assert.ok(Object.keys(report).every((key) => !/(CLOUD_NAME|API_KEY|API_SECRET|RESEND)/i.test(key)));
});
