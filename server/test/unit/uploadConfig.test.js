import test from 'node:test';
import assert from 'node:assert/strict';

import { MIME_EXTENSION, MAX_FILE_SIZE_BYTES } from '../../src/middlewares/upload.middleware.js';

const ALLOWED_MIME = [
  'image/jpeg',
  'image/jpg',
  'image/pjpeg',
  'image/png',
  'application/pdf',
];

test('MIME whitelist hanya berisi JPG/PNG/PDF', () => {
  assert.deepEqual(Object.keys(MIME_EXTENSION).sort(), [...ALLOWED_MIME].sort());
  assert.deepEqual([...new Set(Object.values(MIME_EXTENSION))].sort(), ['jpg', 'pdf', 'png']);
});

test('MIME berbahaya tidak ada di whitelist', () => {
  for (const bad of [
    'text/html',
    'application/javascript',
    'text/javascript',
    'image/svg+xml',
    'application/x-msdownload',
    'application/octet-stream',
  ]) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(MIME_EXTENSION, bad),
      false,
      `tidak boleh diizinkan: ${bad}`
    );
  }
});

test('batas ukuran berkas 2MB', () => {
  assert.equal(MAX_FILE_SIZE_BYTES, 2 * 1024 * 1024);
  assert.equal(MAX_FILE_SIZE_BYTES, 2097152);
});
