import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import api from '../services/api';
import { timeAgo } from '../utils/formatDate';

const ICONS = {
  DEPOSIT_CREATED: '💰',
  DEPOSIT_APPROVED: '✅',
  DEPOSIT_REJECTED: '❌',
  REFERRAL_BONUS: '🎁',
  REMINDER: '⏰',
  SYSTEM: '🔔',
};

export default function NotificationBell({ refreshKey = 0 }) {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState({ notifications: [], unread: 0 });
  const [loading, setLoading] = useState(false);
  const ref = useRef(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/notifications/my');
      setData(res.data?.data || { notifications: [], unread: 0 });
    } catch (err) {
      if (!silent) toast.error('Gagal memuat notifikasi');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(true);
  }, [load, refreshKey]);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const markAll = async () => {
    try {
      await api.put('/notifications/read-all');
      setData((prev) => ({ ...prev, unread: 0, notifications: prev.notifications.map((n) => ({ ...n, isRead: true })) }));
      toast.success('Semua notifikasi dibaca');
    } catch (err) {
      toast.error('Gagal menandai notifikasi');
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
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
            {data.unread > 0 && (
              <button
                onClick={markAll}
                className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Tandai semua dibaca
              </button>
            )}
          </div>

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
          </div>
        </div>
      )}
    </div>
  );
}