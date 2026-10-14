import webpush from 'web-push';
import prisma from '../config/database.js';
import { validatePushEndpoint } from '../utils/pushValidator.js';

let vapidConfigured = false;

/**
 * Timeout pengiriman push (ms) — mencegah satu
 * endpoint macet menghabiskan seluruh kuota
 * eksekusi serverless.
 */
export const PUSH_TIMEOUT_MS = 10 * 1000;

/** Batas konkurensi pengiriman push per panggilan. */
export const PUSH_CONCURRENCY = 5;

export const configureVapid = () => {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn('⚠️  VAPID keys tidak diset — Web Push dinonaktifkan.');
    return;
  }
  webpush.setVapidDetails(
    VAPID_SUBJECT || 'mailto:admin@tabunganku.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  );
  vapidConfigured = true;
  console.log('🔔 Web Push: VAPID terkonfigurasi');
};

export const getVapidPublicKey = () => process.env.VAPID_PUBLIC_KEY || null;

/**
 * Kirim satu push dengan timeout.
 */
const sendWithTimeout = (subscription, body) =>
  new Promise((resolve) => {
    let settled = false;
    const done = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    const timer = setTimeout(() => {
      done({ timedOut: true });
    }, PUSH_TIMEOUT_MS);

    webpush
      .sendNotification(subscription, body)
      .then((result) => {
        clearTimeout(timer);
        done({ ok: true, result });
      })
      .catch((err) => {
        clearTimeout(timer);
        done({ ok: false, err });
      });
  });

/**
 * Jalankan task dengan batas konkurensi.
 */
const mapConcurrent = async (items, limit, fn) => {
  const results = [];
  const executing = new Set();
  for (const item of items) {
    const p = fn(item).then((result) => {
      executing.delete(p);
      return result;
    });
    executing.add(p);
    results.push(p);
    if (executing.size >= limit) {
      await Promise.race(executing);
    }
  }
  return Promise.all(results);
};

/**
 * Kirim Web Push ke semua device milik seorang user.
 * Dipanggil setelah notifikasi dibuat di database.
 *
 * Keamanan (P1):
 *   - endpoint divalidasi ulang (defense-in-depth
 *     terhadap subscription yang tersimpan sebelum
 *     validasi diperketat);
 *   - timeout per pengiriman;
 *   - batas konkurensi.
 */
export const sendPushToUser = async (userId, payload) => {
  if (!vapidConfigured) return;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return;

  const body = JSON.stringify({
    title: payload.title || 'Notifikasi baru',
    body: payload.message || '',
    tag: `notif-${payload.id || Date.now()}`,
    url: payload.url || '/',
    ...payload,
  });

  const sendOne = async (sub) => {
    // Defense-in-depth: tolak endpoint yang tidak valid.
    if (!validatePushEndpoint(sub.endpoint).ok) {
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      return;
    }

    const outcome = await sendWithTimeout(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      body
    );

    if (outcome.timedOut) {
      console.error('❌ Push timeout:', sub.id);
      return;
    }
    if (outcome.ok) return;

    const err = outcome.err;
    // 404/410 = subscription sudah tidak valid (user clear data / token ganti)
    if (err?.statusCode === 404 || err?.statusCode === 410) {
      await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
      console.log('🧹 Push subscription dihapus (expired):', sub.id);
    } else {
      console.error('❌ Push gagal:', err?.statusCode || err?.message);
    }
  };

  await mapConcurrent(subs, PUSH_CONCURRENCY, sendOne);
};

export default { configureVapid, getVapidPublicKey, sendPushToUser };
