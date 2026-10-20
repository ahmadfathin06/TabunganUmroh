import test from 'node:test';
import assert from 'node:assert/strict';

import { createSavingsSchema, SAVINGS_LIMITS } from '../../src/validations/savings.validation.js';
import { summarizeValidationErrors } from '../../src/middlewares/validate.middleware.js';

/**
 * Regression test untuk bug "POST /api/savings → 422 Validasi gagal" yang
 * tidak informatif: modal "Buat Rencana" mengirim apa adanya isi form, dan
 * user hanya melihat pesan generik tanpa tahu field mana yang salah.
 *
 * Aturan: setiap penolakan harus punya pesan Bahasa Indonesia yang menyebut
 * field bermasalah, dan tidak boleh ada pesan default berbahasa Inggris.
 */
const parse = (payload) => createSavingsSchema.safeParse(payload);
const messages = (result) => result.error.errors.map((e) => e.message);
const fields = (result) => result.error.errors.map((e) => e.path.join('.'));

test('nama < 3 karakter → ditolak dengan pesan Indonesia', () => {
  const result = parse({ targetAmount: 35000000, jamaahName: 'Ab', jamaahRelation: 'self' });

  assert.equal(result.success, false);
  assert.deepEqual(fields(result), ['jamaahName']);
  assert.equal(messages(result)[0], 'Nama jamaah minimal 3 karakter');
});

test('nama > 100 karakter → ditolak dengan pesan Indonesia (bukan bawaan zod)', () => {
  const result = parse({ jamaahName: 'a'.repeat(101) });

  assert.equal(result.success, false);
  assert.equal(messages(result)[0], `Nama jamaah maksimal ${SAVINGS_LIMITS.nameMax} karakter`);
  assert.ok(!messages(result)[0].includes('String must contain'));
});

test('nama berisi spasi saja → dianggap tidak diisi (pakai nama profil)', () => {
  const result = parse({ jamaahName: '    ' });

  assert.equal(result.success, true);
  assert.equal(result.data.jamaahName, undefined);
});

test('nama kosong → diterima (pakai nama profil user)', () => {
  assert.equal(parse({}).success, true);
  assert.equal(parse({ jamaahName: '' }).success, true);
  assert.equal(parse({ jamaahName: '   ' }).success, true);
});

test('target di luar batas → ditolak dengan pesan Indonesia', () => {
  const tooBig = parse({ targetAmount: SAVINGS_LIMITS.amountMax + 1 });
  assert.equal(tooBig.success, false);
  assert.equal(messages(tooBig)[0], 'Target tabungan maksimal Rp 1 miliar');

  const zero = parse({ targetAmount: 0 });
  assert.equal(zero.success, false);
  assert.equal(messages(zero)[0], 'Target tabungan harus lebih dari 0');
});

test('target bukan angka → ditolak dengan pesan jelas (bukan "received nan")', () => {
  const result = parse({ targetAmount: 'abc' });

  assert.equal(result.success, false);
  assert.equal(messages(result)[0], 'Target tabungan harus berupa angka');
  assert.ok(!messages(result)[0].includes('nan'));
});

test('target null / tidak dikirim → tetap valid (user belum tahu target)', () => {
  assert.equal(parse({ targetAmount: null }).success, true);
  assert.equal(parse({}).success, true);
});

test('target berupa string angka (dari form) → dikoerce jadi number', () => {
  const result = parse({ targetAmount: '35000000' });

  assert.equal(result.success, true);
  assert.equal(result.data.targetAmount, 35000000);
});

test('field asing → ditolak (schema tetap strict)', () => {
  const result = parse({ targetAmount: 1000, catatan: 'halo' });

  assert.equal(result.success, false);
  assert.equal(result.error.errors[0].code, 'unrecognized_keys');
});

test('ringkasan 422 menyebut field + alasan, tidak generik', () => {
  const result = parse({ jamaahName: 'Ab' });
  const errors = result.error.errors.map((e) => ({
    field: e.path.join('.'),
    label: e.path.join('.') === 'jamaahName' ? 'Nama jamaah' : null,
    message: e.message,
  }));

  const summary = summarizeValidationErrors(errors);
  assert.match(summary, /Nama jamaah/);
  assert.match(summary, /minimal 3 karakter/);
  assert.ok(!summary.startsWith('Validasi gagal — Validasi gagal'));
});

test('ringkasan 422 tanpa error → pesan cadangan', () => {
  assert.equal(summarizeValidationErrors([]), 'Validasi gagal');
});
