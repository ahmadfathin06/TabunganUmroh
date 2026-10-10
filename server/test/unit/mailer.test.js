import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isEmailEnabled,
  isEmailAddress,
  extractEmailAddress,
  buildFromAddress,
  getEmailConfigIssues,
  getEmailStatus,
  buildEmailPayload,
  sendWithClient,
  sendEmail,
} from '../../src/config/mailer.js';

const CONFIGURED_ENV = {
  EMAIL_ENABLED: 'true',
  RESEND_API_KEY: 're_abcdef1234567890',
  RESEND_FROM_EMAIL: 'noreply@mail.tabunganku.test',
  RESEND_FROM_NAME: 'Tabunganku Umroh',
  RESEND_REPLY_TO: 'support@mail.tabunganku.test',
};

/** Mock SDK Resend — merekam payload dan mengembalikan { data, error }. */
const makeMockClient = (impl) => {
  const sent = [];
  return {
    sent,
    emails: {
      send: async (payload) => {
        sent.push(payload);
        return impl ? impl(payload) : { data: { id: 'msg_test_1' }, error: null };
      },
    },
  };
};

test('isEmailEnabled hanya true untuk nilai truthy yang didukung', () => {
  for (const value of ['true', 'TRUE', '1', 'yes', 'on', ' true ']) {
    assert.equal(isEmailEnabled({ EMAIL_ENABLED: value }), true, value);
  }
  for (const value of ['false', '0', 'no', '', undefined, 'enabled']) {
    assert.equal(isEmailEnabled({ EMAIL_ENABLED: value }), false, String(value));
  }
});

test('isEmailAddress / extractEmailAddress mendukung format "Nama <email>"', () => {
  assert.equal(isEmailAddress('noreply@x.test'), true);
  assert.equal(isEmailAddress('Tabunganku Umroh <noreply@x.test>'), true);
  assert.equal(isEmailAddress('bukan-email'), false);
  assert.equal(isEmailAddress(''), false);
  assert.equal(extractEmailAddress('Tabunganku <noreply@x.test>'), 'noreply@x.test');
  assert.equal(extractEmailAddress('noreply@x.test'), 'noreply@x.test');
});

test('buildFromAddress membentuk pengirim "Nama <email>"', () => {
  assert.equal(
    buildFromAddress({ RESEND_FROM_EMAIL: 'noreply@x.test', RESEND_FROM_NAME: 'Tabunganku Umroh' }),
    'Tabunganku Umroh <noreply@x.test>'
  );
  // Nama default bila RESEND_FROM_NAME kosong.
  assert.equal(buildFromAddress({ RESEND_FROM_EMAIL: 'noreply@x.test' }), 'Tabunganku Umroh <noreply@x.test>');
  // Nilai yang sudah berformat lengkap dibiarkan apa adanya.
  assert.equal(buildFromAddress({ RESEND_FROM_EMAIL: 'Umroh <a@b.test>' }), 'Umroh <a@b.test>');
  assert.equal(buildFromAddress({}), null);
});

test('getEmailStatus: disabled / enabled / misconfigured', () => {
  assert.equal(getEmailStatus({}), 'disabled');
  assert.equal(getEmailStatus({ EMAIL_ENABLED: 'false' }), 'disabled');
  assert.equal(getEmailStatus(CONFIGURED_ENV), 'enabled');
  assert.equal(getEmailStatus({ EMAIL_ENABLED: 'true' }), 'misconfigured');
  assert.equal(
    getEmailStatus({ EMAIL_ENABLED: 'true', RESEND_API_KEY: 'your_api_key', RESEND_FROM_EMAIL: 'noreply@x.test' }),
    'misconfigured'
  );
});

test('getEmailConfigIssues hanya menyebut NAMA variabel, bukan nilainya', () => {
  const issues = getEmailConfigIssues({ EMAIL_ENABLED: 'true', RESEND_API_KEY: 'rahasia123' });
  assert.deepEqual(issues, ['RESEND_FROM_EMAIL']);
  assert.ok(!issues.join(' ').includes('rahasia123'));
});

test('buildEmailPayload menyusun payload Resend dengan benar', () => {
  const payload = buildEmailPayload(
    { to: 'user@x.test', subject: 'Halo', html: '<p>Halo</p>', text: 'Halo' },
    CONFIGURED_ENV
  );
  assert.equal(payload.from, 'Tabunganku Umroh <noreply@mail.tabunganku.test>');
  assert.equal(payload.to, 'user@x.test');
  assert.equal(payload.subject, 'Halo');
  assert.equal(payload.html, '<p>Halo</p>');
  assert.equal(payload.text, 'Halo');
  // reply_to default dari env.
  assert.equal(payload.reply_to, 'support@mail.tabunganku.test');
  // Attachment bukan bagian dari adapter.
  assert.equal(payload.attachments, undefined);
});

test('buildEmailPayload menghormati replyTo eksplisit dan mengabaikan text kosong', () => {
  const payload = buildEmailPayload(
    { to: 'user@x.test', subject: 'S', html: '<p>x</p>', replyTo: 'lain@x.test' },
    CONFIGURED_ENV
  );
  assert.equal(payload.reply_to, 'lain@x.test');
  assert.equal('text' in payload, false);
});

test('buildEmailPayload tanpa RESEND_REPLY_TO tidak menambah reply_to', () => {
  const payload = buildEmailPayload(
    { to: 'user@x.test', subject: 'S', html: '<p>x</p>' },
    { RESEND_FROM_EMAIL: 'noreply@x.test' }
  );
  assert.equal('reply_to' in payload, false);
});

test('sendWithClient memanggil SDK dengan payload yang benar', async () => {
  const client = makeMockClient();
  const data = await sendWithClient(
    client,
    { to: 'user@x.test', subject: 'Subjek', html: '<p>isi</p>' },
    CONFIGURED_ENV
  );

  assert.deepEqual(data, { id: 'msg_test_1' });
  assert.equal(client.sent.length, 1);
  assert.equal(client.sent[0].to, 'user@x.test');
  assert.equal(client.sent[0].subject, 'Subjek');
  assert.equal(client.sent[0].from, 'Tabunganku Umroh <noreply@mail.tabunganku.test>');
});

test('sendWithClient memetakan error provider menjadi error aman', async () => {
  const client = makeMockClient(() => ({
    data: null,
    error: { name: 'validation_error', statusCode: 422, message: 'API key invalid: re_abcdef1234567890' },
  }));

  await assert.rejects(
    () => sendWithClient(client, { to: 'user@x.test', subject: 'S', html: '<p>x</p>' }, CONFIGURED_ENV),
    (error) => {
      assert.equal(error.name, 'EmailDeliveryError');
      assert.equal(error.provider, 'resend');
      assert.equal(error.providerCode, 'validation_error');
      // Pesan aman: tidak memuat pesan mentah provider maupun API key.
      assert.ok(!error.message.includes('re_abcdef1234567890'));
      assert.ok(!error.message.includes('API key invalid'));
      return true;
    }
  );
});

test('sendEmail mengembalikan { skipped: true } saat EMAIL_ENABLED bukan true', async () => {
  const previous = process.env.EMAIL_ENABLED;
  process.env.EMAIL_ENABLED = 'false';
  try {
    const result = await sendEmail({ to: 'user@x.test', subject: 'S', html: '<p>x</p>' });
    assert.deepEqual(result, { skipped: true });
  } finally {
    if (previous === undefined) delete process.env.EMAIL_ENABLED;
    else process.env.EMAIL_ENABLED = previous;
  }
});

test('sendEmail gagal jelas saat diaktifkan tanpa konfigurasi (tanpa membocorkan nilai)', async () => {
  const previous = {
    EMAIL_ENABLED: process.env.EMAIL_ENABLED,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
    RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL,
  };
  process.env.EMAIL_ENABLED = 'true';
  process.env.RESEND_API_KEY = 'your_api_key';
  process.env.RESEND_FROM_EMAIL = '';

  try {
    await assert.rejects(
      () => sendEmail({ to: 'user@x.test', subject: 'S', html: '<p>x</p>' }),
      (error) => {
        assert.match(error.message, /RESEND_API_KEY/);
        assert.match(error.message, /RESEND_FROM_EMAIL/);
        // Nilai placeholder itu sendiri tidak boleh ikut tercetak.
        assert.ok(!error.message.includes('your_api_key'));
        return true;
      }
    );
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
});
