import { Resend } from 'resend';
import { isRealCredential } from '../utils/credentials.js';

/**
 * Adapter email berbasis **Resend** (menggantikan Nodemailer/SMTP).
 *
 * Nama export `sendEmail` dipertahankan supaya caller lama (bila ada) tidak
 * perlu diubah. Email bersifat OPSIONAL: bila `EMAIL_ENABLED` bukan `true`,
 * server tetap bisa start tanpa konfigurasi apa pun.
 *
 * Referensi:
 *   - https://resend.com/docs/send-with-nodejs
 *   - https://resend.com/docs/api-reference/emails/send-email
 *
 * CATATAN KEAMANAN: `RESEND_API_KEY` TIDAK pernah dicetak/dilog dan tidak
 * pernah dikirim ke client. Error dari provider dipetakan menjadi error aman
 * sebelum dipropagasikan.
 */

const TRUTHY = new Set(['true', '1', 'yes', 'on']);
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const BRACKETED_EMAIL = /<([^<>\s]+@[^<>\s]+)>/;

/** @returns {boolean} true bila email diaktifkan lewat `EMAIL_ENABLED`. */
export const isEmailEnabled = (env = process.env) =>
  TRUTHY.has(String(env.EMAIL_ENABLED ?? '').trim().toLowerCase());

/**
 * Ambil alamat email polos dari nilai yang mungkin berbentuk
 * `"Nama Pengirim <noreply@domain.com>"`.
 * @returns {string|null}
 */
export const extractEmailAddress = (value) => {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const match = raw.match(BRACKETED_EMAIL);
  return match ? match[1] : raw;
};

/** @returns {boolean} true bila nilai berisi alamat email yang valid. */
export const isEmailAddress = (value) => {
  const address = extractEmailAddress(value);
  return Boolean(address) && EMAIL_PATTERN.test(address);
};

/**
 * Field pengirim lengkap untuk Resend (`Nama <email>`).
 * @returns {string|null}
 */
export const buildFromAddress = (env = process.env) => {
  const raw = String(env.RESEND_FROM_EMAIL ?? '').trim();
  if (!raw) return null;
  // Sudah berformat "Nama <email>" → pakai apa adanya.
  if (raw.includes('<') && raw.includes('>')) return raw;
  const address = extractEmailAddress(raw);
  if (!address) return null;
  const name = String(env.RESEND_FROM_NAME ?? '').trim() || 'Tabunganku Umroh';
  return `${name} <${address}>`;
};

/**
 * Kekurangan konfigurasi email — HANYA nama variabel, tanpa nilainya.
 * @returns {string[]}
 */
export const getEmailConfigIssues = (env = process.env) => {
  const issues = [];
  if (!isRealCredential(env.RESEND_API_KEY)) issues.push('RESEND_API_KEY');
  if (!isEmailAddress(env.RESEND_FROM_EMAIL)) issues.push('RESEND_FROM_EMAIL');
  return issues;
};

/**
 * Status aman untuk health check / startup.
 * @returns {'disabled'|'enabled'|'misconfigured'}
 */
export const getEmailStatus = (env = process.env) => {
  if (!isEmailEnabled(env)) return 'disabled';
  return getEmailConfigIssues(env).length === 0 ? 'enabled' : 'misconfigured';
};

let client = null;
let clientApiKey = null;

/** Klien Resend dibuat lazy agar impor modul tidak butuh API key. */
const getClient = () => {
  const apiKey = String(process.env.RESEND_API_KEY ?? '').trim();
  if (!apiKey) return null;
  if (!client || clientApiKey !== apiKey) {
    client = new Resend(apiKey);
    clientApiKey = apiKey;
  }
  return client;
};

/** Error aman (tanpa detail provider/credential) untuk dilempar ke caller. */
const toSafeError = (error) => {
  const safe = new Error('Gagal mengirim email melalui Resend');
  safe.name = 'EmailDeliveryError';
  safe.provider = 'resend';
  // Kode/enum aman saja — BUKAN pesan mentah yang bisa memuat detail internal.
  safe.providerCode = error?.name || (error?.statusCode != null ? String(error.statusCode) : 'unknown');
  return safe;
};

/**
 * Kirim satu email melalui Resend.
 *
 * @param {{to: string|string[], subject: string, html: string, text?: string, replyTo?: string}} mail
 * @returns {Promise<{id?: string}|{skipped: true}>}
 * @throws {Error} bila email diaktifkan tetapi konfigurasi tidak lengkap,
 *   atau bila Resend menolak pengiriman (error sudah dipetakan aman).
 */
/**
 * Susun payload Resend dari input pemanggil (from/to/subject/html/reply_to).
 * Dipisah agar bisa diuji tanpa memanggil jaringan.
 *
 * @returns {object} payload siap kirim
 */
export const buildEmailPayload = ({ to, subject, html, text, replyTo } = {}, env = process.env) => {
  const from = buildFromAddress(env);
  if (!from) throw new Error('Resend belum dikonfigurasi: RESEND_FROM_EMAIL wajib diisi.');

  const replyToAddress = replyTo || String(env.RESEND_REPLY_TO ?? '').trim() || undefined;

  return {
    from,
    to,
    subject,
    html,
    ...(text ? { text } : {}),
    ...(replyToAddress ? { reply_to: replyToAddress } : {}),
  };
};

/**
 * Inti pengiriman dengan klien Resend yang di-inject.
 *
 * Memetakan error provider menjadi error aman (tanpa pesan mentah) supaya
 * detail internal tidak pernah bocor ke client API.
 *
 * @param {{emails: {send: Function}}} client klien Resend (atau mock)
 * @returns {Promise<{id?: string}>}
 */
export const sendWithClient = async (client, mail, env = process.env) => {
  const payload = buildEmailPayload(mail, env);
  const { data, error } = await client.emails.send(payload);

  if (error) {
    // Detail mentah hanya dicatat di server (tanpa credential), tidak dikirim
    // ke client.
    console.error('Resend email error:', error?.message || error?.name || 'unknown error');
    throw toSafeError(error);
  }

  console.log('Email terkirim melalui Resend:', data?.id || 'accepted');
  return data;
};

/**
 * Kirim satu email melalui Resend.
 *
 * @param {{to: string|string[], subject: string, html: string, text?: string, replyTo?: string}} mail
 * @returns {Promise<{id?: string}|{skipped: true}>}
 * @throws {Error} bila email diaktifkan tetapi konfigurasi tidak lengkap,
 *   atau bila Resend menolak pengiriman (error sudah dipetakan aman).
 */
export const sendEmail = async (mail = {}) => {
  if (!isEmailEnabled()) {
    console.warn('Email dinonaktifkan karena EMAIL_ENABLED bukan true.');
    return { skipped: true };
  }

  const issues = getEmailConfigIssues();
  if (issues.length > 0) {
    throw new Error(
      `Resend belum dikonfigurasi dengan lengkap: ${issues.join(', ')} wajib diisi saat EMAIL_ENABLED=true.`
    );
  }

  const resend = getClient();
  if (!resend) {
    throw new Error('Resend belum dikonfigurasi: RESEND_API_KEY dan RESEND_FROM_EMAIL wajib diisi.');
  }

  return sendWithClient(resend, mail);
};

/**
 * Pola fire-and-forget untuk email non-kritis (notifikasi): kegagalan TIDAK
 * boleh menggagalkan transaksi utama, tetapi tetap dicatat dengan aman.
 */
export const sendEmailInBackground = (mail) => {
  Promise.resolve()
    .then(() => sendEmail(mail))
    .catch((error) => {
      console.error('Email background gagal:', error?.message || 'unknown error');
    });
};

export default {
  sendEmail,
  sendEmailInBackground,
  sendWithClient,
  buildEmailPayload,
  getEmailStatus,
  isEmailEnabled,
};
