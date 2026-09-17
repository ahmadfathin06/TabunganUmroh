/* Service Worker — Web Push Tabunganku Umroh */

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'Notifikasi baru', body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Tabunganku Umroh';
  const options = {
    body: payload.body || payload.message || '',
    icon: '/icons/icon.svg',
    badge: '/icons/icon.svg',
    tag: payload.tag || `notif-${payload.id || Date.now()}`,
    renotify: true,
    data: { url: payload.url || '/' },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  /**
   * Validasi URL: hanya navigasi ke path lokal (same-origin).
   * Jika server push mengirim URL absolut lintas origin, diabaikan
   * dan fallback ke '/' agar tidak membuka domain asing.
   */
  const raw = event.notification.data?.url || '/';
  let target = '/';
  try {
    // Path absolut seperti '/dashboard' akan lolos。
    // URL absolut 'https://evil.com' akan ditolak (origin berbeda)。
    const parsed = new URL(raw, self.location.origin);
    if (parsed.origin === self.location.origin) {
      target = parsed.pathname + parsed.search + parsed.hash;
    }
  } catch {
    target = '/';
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    })
  );
});

// Aktivasi: ambil alih kontrol semua halaman segera
self.addEventListener('install', (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});
