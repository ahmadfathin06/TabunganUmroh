import api from '../services/api';

const SW_PATH = '/sw.js';
const BROWSER_SUPPORTED =
  typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;

let vapidPublicKeyCache = null;

const urlBase64ToUint8Array = (base64String) => {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
};

/** Daftarkan service worker (sekali, diam-diam). */
export const registerServiceWorker = async () => {
  if (!BROWSER_SUPPORTED) return null;
  try {
    const reg = await navigator.serviceWorker.register(SW_PATH);
    return reg;
  } catch {
    return null;
  }
};

/** Ambil VAPID public key dari server (cache 1x). */
const getVapidPublicKey = async () => {
  if (vapidPublicKeyCache) return vapidPublicKeyCache;
  const res = await api.get('/notifications/push/public-key');
  vapidPublicKeyCache = res.data?.data?.publicKey || null;
  return vapidPublicKeyCache;
};

/**
 * Aktifkan Web Push: pastikan izin granted, service worker terdaftar,
 * lalu simpan subscription ke server. Return status untuk UI.
 */
export const enablePushNotifications = async () => {
  if (!BROWSER_SUPPORTED) return { ok: false, reason: 'unsupported' };

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return { ok: false, reason: permission };

  try {
    const publicKey = await getVapidPublicKey();
    if (!publicKey) return { ok: false, reason: 'no-key' };

    const reg = (await navigator.serviceWorker.ready) || (await registerServiceWorker());
    if (!reg) return { ok: false, reason: 'sw-failed' };

    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }

    await api.post('/notifications/push/subscribe', sub.toJSON());
    return { ok: true };
  } catch (err) {
    console.error('Push subscribe error:', err);
    return { ok: false, reason: 'error' };
  }
};

/** Matikan Web Push di device ini: unsubscribe dari browser + server. */
export const disablePushNotifications = async () => {
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      await api.post('/notifications/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {});
      await sub.unsubscribe().catch(() => {});
    }
  } catch {
    /* diabaikan */
  }
};

/** Kirim notifikasi tes lewat server (untuk tombol uji). */
export const sendTestPush = async () => {
  const res = await api.post('/notifications/push/test');
  return res.data;
};

export const isPushSupported = () => BROWSER_SUPPORTED;

export default {
  registerServiceWorker,
  enablePushNotifications,
  disablePushNotifications,
  sendTestPush,
  isPushSupported,
};
