import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isRealCredential,
  hasCloudinaryCredentials,
  cloudinaryStatus,
  missingCloudinaryKeys,
  CLOUDINARY_ENV_KEYS,
} from '../../src/utils/credentials.js';

const REAL_ENV = {
  CLOUDINARY_CLOUD_NAME: 'dabc123xy',
  CLOUDINARY_API_KEY: '123456789012345',
  CLOUDINARY_API_SECRET: 'aBcDeFgHiJkLmNoPqRsTuVwXyZ012345',
};

test('isRealCredential menolak nilai kosong', () => {
  assert.equal(isRealCredential(''), false);
  assert.equal(isRealCredential('   '), false);
  assert.equal(isRealCredential(undefined), false);
  assert.equal(isRealCredential(null), false);
});

test('isRealCredential menolak nilai placeholder dari .env.example', () => {
  const placeholders = [
    'your_cloud_name',
    'your_api_key',
    'your_api_secret',
    'YOUR_CLOUD_NAME',
    'contoh_key',
    'example_secret',
    'change_me',
    'change-me',
    'changeme',
    'placeholder',
    'dummy',
    'xxxx',
  ];
  for (const value of placeholders) {
    assert.equal(isRealCredential(value), false, `seharusnya ditolak: ${value}`);
  }
});

test('isRealCredential menerima nilai asli', () => {
  assert.equal(isRealCredential('dabc123xy'), true);
  assert.equal(isRealCredential('  1234567890  '), true);
  assert.equal(isRealCredential('aBcDeFgHiJkLmNoP'), true);
});

test('hasCloudinaryCredentials butuh ketiga nilai asli', () => {
  assert.equal(hasCloudinaryCredentials(REAL_ENV), true);

  for (const key of CLOUDINARY_ENV_KEYS) {
    const partial = { ...REAL_ENV, [key]: '' };
    assert.equal(hasCloudinaryCredentials(partial), false, `kosong ${key} harus gagal`);

    const placeholder = { ...REAL_ENV, [key]: 'your_value' };
    assert.equal(hasCloudinaryCredentials(placeholder), false, `placeholder ${key} harus gagal`);
  }

  assert.equal(hasCloudinaryCredentials({}), false);
});

test('cloudinaryStatus hanya mengembalikan status, bukan nilai kredensial', () => {
  assert.equal(cloudinaryStatus(REAL_ENV), 'configured');
  assert.equal(cloudinaryStatus({}), 'disabled');
});

test('missingCloudinaryKeys hanya menyebut NAMA variabel', () => {
  const missing = missingCloudinaryKeys({ CLOUDINARY_CLOUD_NAME: 'dabc123xy' });
  assert.deepEqual(missing, ['CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET']);

  const missingAll = missingCloudinaryKeys({});
  assert.deepEqual(missingAll, CLOUDINARY_ENV_KEYS);

  // Tidak boleh memuat nilai apa pun.
  assert.ok(missingAll.every((entry) => /^[A-Z_]+$/.test(entry)));
});
