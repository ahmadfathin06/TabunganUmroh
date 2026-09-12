import webpush from 'web-push';
import prisma from '../config/database.js';

let vapidConfigured = false;

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
 * Kirim Web Push ke semua device milik seorang user.
 * Dipanggil setelah notifikasi dibuat di database.
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

  await Promise.allSettled(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (err) {
        // 404/410 = subscription sudah tidak valid (user clear data / token ganti)
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
          console.log('🧹 Push subscription dihapus (expired):', sub.id);
        } else {
          console.error('❌ Push gagal:', err?.statusCode || err?.message);
        }
      }
    })
  );
};
