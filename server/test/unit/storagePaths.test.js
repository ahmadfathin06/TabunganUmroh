import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CLOUDINARY_PREFIX,
  publicIdForStoredName,
  storedNameFromPublicId,
  resolveStoredFile,
} from '../../src/utils/fileStorage.js';

test('publicIdForStoredName memakai prefix tunggal (tidak ada tuu-tuu-)', () => {
  const publicId = publicIdForStoredName('proof-7f3c1a2b-4d5e-6f70-8192-a3b4c5d6e7f8.png');
  assert.equal(publicId, 'tuu-proof-7f3c1a2b-4d5e-6f70-8192-a3b4c5d6e7f8');
  assert.ok(!publicId.startsWith(`${CLOUDINARY_PREFIX}${CLOUDINARY_PREFIX}`));
  assert.equal(publicId.split(CLOUDINARY_PREFIX).length - 1, 1, 'prefix hanya muncul satu kali');
});

test('publicIdForStoredName menghapus ekstensi apa pun', () => {
  assert.equal(publicIdForStoredName('document-abc.pdf'), 'tuu-document-abc');
  assert.equal(publicIdForStoredName('document-abc.jpg'), 'tuu-document-abc');
  assert.equal(publicIdForStoredName('document-abc.PNG'), 'tuu-document-abc');
});

test('pemetaan nama <-> public_id bolak-balik konsisten', () => {
  const names = ['proof-123.png', 'document-xyz.pdf', 'photo-9a8b.jpeg'];
  for (const name of names) {
    const publicId = publicIdForStoredName(name);
    const back = storedNameFromPublicId(publicId);
    assert.equal(back, name.replace(/\.[^.]+$/, ''));
  }
});

test('nilai DB (dengan prefix /uploads/) diproses menjadi nama berkas yang aman', () => {
  // Bentuk yang benar-benar disimpan controller.
  assert.equal(publicIdForStoredName('/uploads/proof-abc.png'), 'tuu-proof-abc');
});

test('path traversal tidak pernah menunjuk keluar folder uploads', () => {
  // resolveStoredFile hanya mengembalikan basename, jadi hasilnya tidak pernah
  // memuat separator maupun '..'.
  assert.equal(resolveStoredFile('../../.env'), '.env');
  assert.equal(resolveStoredFile('/etc/passwd'), 'passwd');
  assert.equal(resolveStoredFile('a/b/c.png'), 'c.png');
  assert.equal(resolveStoredFile(''), null);
  assert.equal(resolveStoredFile('   '), null);
  assert.equal(resolveStoredFile('nama file dengan spasi.png'), null);

  for (const evil of ['../../.env', '/etc/passwd', 'a/b/c.png']) {
    const publicId = publicIdForStoredName(evil);
    assert.ok(publicId === null || !publicId.includes('..'), `tidak aman: ${evil} → ${publicId}`);
  }
});

test('storedNameFromPublicId menangani input tidak valid', () => {
  assert.equal(storedNameFromPublicId(''), null);
  assert.equal(storedNameFromPublicId(null), null);
  assert.equal(storedNameFromPublicId(undefined), null);
  assert.equal(storedNameFromPublicId(123), null);
  // Tanpa prefix → dikembalikan apa adanya.
  assert.equal(storedNameFromPublicId('proof-abc'), 'proof-abc');
});
