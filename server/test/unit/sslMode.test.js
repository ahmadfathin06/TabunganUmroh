import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeSslMode } from '../../src/utils/sslMode.js';

test('sslmode deprecated diganti ke verify-full (posisi parameter mana pun)', () => {
  assert.equal(
    normalizeSslMode('postgres://user:pass@host/db?sslmode=require'),
    'postgres://user:pass@host/db?sslmode=verify-full'
  );
  assert.equal(
    normalizeSslMode(
      'postgres://user:pass@host/db?sslmode=require&pgbouncer=true&connection_limit=5'
    ),
    'postgres://user:pass@host/db?sslmode=verify-full&pgbouncer=true&connection_limit=5'
  );
  assert.equal(
    normalizeSslMode('postgres://user:pass@host/db?pgbouncer=true&sslmode=require'),
    'postgres://user:pass@host/db?pgbouncer=true&sslmode=verify-full'
  );
  assert.equal(
    normalizeSslMode('postgres://user:pass@host/db?pgbouncer=true&sslmode=prefer'),
    'postgres://user:pass@host/db?pgbouncer=true&sslmode=verify-full'
  );
  assert.equal(
    normalizeSslMode('postgres://user:pass@host/db?sslmode=verify-ca&sslrootcert=ca.pem'),
    'postgres://user:pass@host/db?sslmode=verify-full&sslrootcert=ca.pem'
  );
});

test('mode yang sudah aman / tanpa sslmode tidak diubah', () => {
  assert.equal(
    normalizeSslMode('postgres://user:pass@host/db?sslmode=verify-full'),
    'postgres://user:pass@host/db?sslmode=verify-full'
  );
  assert.equal(
    normalizeSslMode('postgres://user:pass@host/db?pgbouncer=true&connection_limit=5'),
    'postgres://user:pass@host/db?pgbouncer=true&connection_limit=5'
  );
  assert.equal(
    normalizeSslMode('postgres://user:pass@localhost:5432/tabunganku'),
    'postgres://user:pass@localhost:5432/tabunganku'
  );
});

test('input non-string / kosong diteruskan apa adanya', () => {
  assert.equal(normalizeSslMode(undefined), undefined);
  assert.equal(normalizeSslMode(null), null);
  assert.equal(normalizeSslMode(''), '');
});
