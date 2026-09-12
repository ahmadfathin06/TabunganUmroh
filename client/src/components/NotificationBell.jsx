import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Bell, BellOff, BellRing, Loader2, SendHorizonal } from 'lucide-react';
import api from '../services/api';
import { getSocket } from '../services/socketService';
import { timeAgo } from '../utils/formatDate';
import {
  registerServiceWorker,
  enablePushNotifications,
  disablePushNotifications,
  sendTestPush,
  isPushSupported,
} from '../services/pushService';

const BROWSER_NOTIF_SUPPORTED = typeof window !== 'undefined' && 'Notification' in window;
const POLL_INTERVAL_MS = 30000;

const ICONS = {
  DEPOSIT_CREATED: '💰',
  DEPOSIT_APPROVED: '✅',
  DEPOSIT_REJECTED: '❌',
  REFERRAL_BONUS: '🎁',
  REMINDER: '⏰',
  ANNOUNCEMENT: '📢',
  DOCUMENT_VERIFIED: '📄',
  CHAT_MESSAGE: '💬',
  PAID_OFF: '🎉',
  SYSTEM: '🔔',
};

const PAGE_SIZE = 20;

export default function NotificationBell({ refreshKey = 0 }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pagination, setPagination] = useState(null);
  const [permission, setPermission] = useState(
    BROWSER_NOTIF_SUPPORTED ? Notification.permission : 'unsupported'
  );
  const [pushBusy, setPushBusy] = useState(false);
  const pushSupported = isPushSupported();
  const ref = useRef(null);
  const lastSeenRef = useRef(null);

  // Muat halaman pertama (dipakai initial load, polling, dan refresh manual)
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get(`/notifications/my?page=1&limit=${PAGE_SIZE}`);
      const payload = res.data?.data || {};
      setData({ notifications: payload.notifications || [], unread: payload.unread || 0 });
      setPagination(res.data?.pagination || null);
    } catch (err) {
      if (!silent) toast.error('Gagal memuat notifikasi');
    } finally {
      setLoading(false);
    }
  }, []);

  // Muat halaman berikutnya dan gabungkan ke daftar (dedup by id)
  const loadMore = useCallback(async () => {
    const nextPage = (pagination?.currentPage || 1) + 1;
    if (loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await api.get(`/notifications/my?page=${nextPage}&limit=${PAGE_SIZE}`);
      const payload = res.data?.data || {};
      setData((prev) => {
        const seen = new Set(prev.notifications.map((n) => n.id));
        const fresh = (payload.notifications || []).filter((n) => !seen.has(n.id));
        return { ...prev, notifications: [...prev.notifications, ...fresh] };
      });
      setPagination(res.data?.pagination || null);
    } catch {
      toast.error('Gagal memuat notifikasi');
    } finally {
      setLoadingMore(false);
    }
  }, [pagination, loadingMore]);

  const hasMore = pagination ? pagination.currentPage < pagination.totalPages : false;

  useEffect(() => {
    load(true);
  }, [load, refreshKey]);

  // Daftarkan service worker di background saat komponen mount
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Polling berkala + refresh saat tab kembali aktif
  useEffect(() => {
    const id = setInterval(() => load(true), POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === 'visible') load(true);
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [load]);

  // Ref untuk membaca status open terbaru di dalam socket listener (tanpa re-subscribe)
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Realtime: notifikasi baru masuk via socket.io tanpa nunggu polling
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return undefined;

    const onNewNotification = (notification) => {
      setData((prev) => {
        // Hindari duplikat kalau polling keburu menang
        if (prev.notifications.some((n) => n.id === notification.id)) return prev;
        const unread = openRef.current ? 0 : prev.unread + 1;
        return {
          notifications: [notification, ...prev.notifications].slice(0, 50),
          unread,
        };
      });
      // Dropdown sedang terbuka → tandai langsung dibaca di server
      if (openRef.current) {
        api.put('/notifications/read-all').catch(() => {});
      }
      // Kalau izin notifikasi browser sudah granted, native notification sudah tampil —
      // toast hanya untuk kasus izin belum/blokir agar tetap ada feedback in-app.
      if (!BROWSER_NOTIF_SUPPORTED || Notification.permission !== 'granted') {
        toast.success(notification.title || 'Notifikasi baru');
      }
    };

    socket.on('notification:new', onNewNotification);
    return () => socket.off('notification:new', onNewNotification);
  }, []);

  // Aktifkan Web Push: minta izin + subscribe lewat service worker + simpan ke server
  const requestPermission = async () => {
    if (!BROWSER_NOTIF_SUPPORTED) return;
    setPushBusy(true);
    try {
      const result = await enablePushNotifications();
      if (result.ok) {
        setPermission('granted');
        toast.success('Notifikasi browser aktif');
      } else if (result.reason === 'denied') {
        setPermission('denied');
        toast.error('Izin notifikasi diblokir. Aktifkan lewat pengaturan browser.');
      } else {
        toast.error('Gagal mengaktifkan notifikasi browser');
      }
    } finally {
      setPushBusy(false);
    }
  };

  const turnOffPush = async () => {
    setPushBusy(true);
    try {
      await disablePushNotifications();
      toast.success('Notifikasi browser dimatikan untuk device ini');
    } finally {
      setPushBusy(false);
    }
  };

  const testPush = async () => {
    setPushBusy(true);
    try {
      await sendTestPush();
      toast.success('Tes push dikirim — cek notifikasi Anda');
    } catch {
      toast.error('Gagal mengirim tes push');
    } finally {
      setPushBusy(false);
    }
  };

  // Tampilkan native browser notification untuk notifikasi yang benar-benar baru
  useEffect(() => {
    const list = data.notifications || [];
    if (list.length === 0) return;

    const stampOf = (n) => {
      const num = Number(n.id);
      if (!Number.isNaN(num) && num !== 0) return num;
      const t = Date.parse(n.createdAt);
      return Number.isNaN(t) ? 0 : t;
    };

    const maxStamp = Math.max(...list.map(stampOf));
    if (lastSeenRef.current === null) {
      lastSeenRef.current = maxStamp; // load pertama: baseline saja, tanpa popup
      return;
    }
    if (maxStamp <= lastSeenRef.current) return;

    const fresh = list.filter((n) => stampOf(n) > lastSeenRef.current);
    lastSeenRef.current = maxStamp;

    if (!BROWSER_NOTIF_SUPPORTED || Notification.permission !== 'granted') return;
    fresh.slice(0, 3).forEach((n) => {
      try {
        const notif = new Notification(n.title || 'Notifikasi baru', {
          body: n.message || '',
          tag: `notif-${n.id}`,
        });
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      } catch {
        /* diabaikan */
      }
    });
  }, [data.notifications]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAll = async (silent = false) => {
    try {
      await api.put('/notifications/read-all');
      setData((prev) => ({ ...prev, unread: 0, notifications: prev.notifications.map((n) => ({ ...n, isRead: true })) }));
      if (!silent) toast.success('Semua notifikasi dibaca');
    } catch (err) {
      if (!silent) toast.error('Gagal menandai notifikasi');
    }
  };

  // Auto mark-read: saat dropdown dibuka, semua yang belum dibaca langsung
  // ditandai dibaca di server (badge hilang, daftar tetap terlihat).
  const handleToggle = () => {
    const opening = !open;
    setOpen(opening);
    if (opening && data.unread > 0) {
      markAll(true);
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className="relative inline-flex items-center justify-center w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-emerald-700 hover:border-emerald-200 transition"
        aria-label="Notifikasi"
      >
        <Bell className="w-5 h-5" />
        {data.unread > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold">
            {data.unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50">
            <p className="font-bold text-sm text-slate-900">Notifikasi</p>
          </div>

          {permission === 'default' && pushSupported && (
            <button
              onClick={requestPermission}
              disabled={pushBusy}
              className="flex w-full items-center gap-2.5 px-4 py-3 text-left bg-emerald-50 hover:bg-emerald-100 border-b border-emerald-100 transition disabled:opacity-60"
            >
              {pushBusy ? (
                <Loader2 className="w-4 h-4 text-emerald-700 flex-shrink-0 animate-spin" />
              ) : (
                <BellRing className="w-4 h-4 text-emerald-700 flex-shrink-0" />
              )}
              <span className="text-xs text-emerald-800 leading-snug">
                <span className="font-bold">Aktifkan notifikasi browser</span> — dapatkan pemberitahuan meski tab tidak dibuka.
              </span>
            </button>
          )}

          {permission === 'granted' && pushSupported && (
            <div className="flex items-center justify-between gap-2 px-4 py-2.5 bg-emerald-50/60 border-b border-emerald-100">
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                <BellRing className="w-3.5 h-3.5" /> Push aktif di device ini
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={testPush}
                  disabled={pushBusy}
                  title="Kirim notifikasi tes"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-60"
                >
                  <SendHorizonal className="w-3.5 h-3.5" /> Tes
                </button>
                <button
                  onClick={turnOffPush}
                  disabled={pushBusy}
                  title="Matikan notifikasi di device ini"
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold text-slate-500 hover:bg-slate-100 disabled:opacity-60"
                >
                  <BellOff className="w-3.5 h-3.5" /> Matikan
                </button>
              </div>
            </div>
          )}

          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
              </div>
            ) : data.notifications.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-400">Belum ada notifikasi</p>
            ) : (
              <ul className="divide-y divide-slate-50">
                {data.notifications.map((n) => (
                  <li
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 text-sm ${n.isRead ? 'bg-white' : 'bg-emerald-50/60'}`}
                  >
                    <span className="text-lg leading-none mt-0.5">{ICONS[n.type] || ICONS.SYSTEM}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-800 font-medium leading-snug">{n.title}</p>
                      <p className="text-xs text-slate-500 leading-snug mt-0.5">{n.message}</p>
                      <p className="text-[11px] text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                    {!n.isRead && <span className="mt-1.5 w-2 h-2 rounded-full bg-emerald-500 flex-shrink-0" />}
                  </li>
                ))}
              </ul>
            )}

            {hasMore && (
              <button
                onClick={loadMore}
                disabled={loadingMore}
                className="w-full py-3 text-xs font-bold text-emerald-700 hover:bg-emerald-50 border-t border-slate-100 transition disabled:opacity-60"
              >
                {loadingMore ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : (
                  `Muat lebih banyak (${data.notifications.length}/${pagination.totalItems})`
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}