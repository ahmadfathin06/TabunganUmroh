import { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { openProtectedFile } from '../utils/openProtectedFile';
import {
  Users,
  Target,
  CheckCircle2,
  Clock,
  Wallet,
  Check,
  X,
  Loader2,
  XCircle,
  Eye,
  Megaphone,
  Send,
} from 'lucide-react';
import PackagesPanel from '../components/admin/PackagesPanel';
import DocumentsVerifyPanel from '../components/admin/DocumentsVerifyPanel';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, timeAgo } from '../utils/formatDate';
import { PLAN_STATUS } from '../utils/constants';

const TABS = {
  VERIFY: 'VERIFY',
  USERS: 'USERS',
  PLANS: 'PLANS',
  PACKAGES: 'PACKAGES',
  BROADCAST: 'BROADCAST',
  DOCS: 'DOCS',
};

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const [tab, setTab] = useState(TABS.VERIFY);
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);
  const [users, setUsers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadStats = useCallback(async () => {
    try {
      const res = await api.get('/admin/dashboard');
      setStats(res.data?.data);
    } catch (err) {
      // biarkan data statistik kosong jika gagal
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, pendingRes, usersRes, plansRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/deposits/pending'),
        api.get('/admin/users'),
        api.get('/savings/all'),
      ]);
      setStats(statsRes.data?.data);
      setPending(pendingRes.data?.data || []);
      setUsers(usersRes.data?.data || []);
      setPlans(plansRes.data?.data || []);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal memuat data admin');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const refresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const verifyDeposit = async (depositId, action, reason) => {
    try {
      await api.put(`/deposits/${depositId}/verify`, {
        action,
        ...(action === 'reject' && reason ? { rejectionReason: reason } : {}),
      });
      toast.success(action === 'approve' ? 'Setoran di-approve ✅' : 'Setoran ditolak');
      // Remove dari daftar pending
      setPending((prev) => prev.filter((d) => d.id !== depositId));
      refresh();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal verifikasi setoran');
    }
  };

  const statCards = stats
    ? [
        { label: 'Total Jamaah', value: stats.totalUsers, icon: Users, cls: 'bg-emerald-50 text-emerald-700', accent: 'from-emerald-600 to-teal-700' },
        { label: 'Rencana Aktif', value: stats.activePlans, icon: Target, cls: 'bg-sky-50 text-sky-600', accent: 'from-sky-500 to-indigo-600' },
        { label: 'Tabungan Lunas', value: stats.paidOffPlans, icon: CheckCircle2, cls: 'bg-teal-50 text-teal-600', accent: 'from-teal-500 to-emerald-600' },
        { label: 'Menunggu Verifikasi', value: stats.pendingDeposits, icon: Clock, cls: 'bg-amber-50 text-amber-600', accent: 'from-amber-400 to-orange-500' },
        { label: 'Dana Terkumpul', value: formatCurrency(stats.totalCollected), icon: Wallet, cls: 'bg-rose-50 text-rose-600', accent: 'from-rose-500 to-pink-600' },
      ]
    : [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ===== Header ===== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Panel Admin 🛡️</h1>
            <p className="mt-1 text-sm text-slate-500">
              Selamat bekerja, <b>{user?.name}</b>. Pantau setoran &amp; jamaah di sini.
            </p>
          </div>
          <button
            onClick={refresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition disabled:opacity-60"
          >
            <Loader2 className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} /> Muat Ulang
          </button>
        </div>

        {/* ===== Statistik ===== */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {statCards.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.cls} mb-3`}>
                <c.icon className="w-5 h-5" />
              </div>
              <p className="text-lg font-bold text-slate-900 truncate">{c.value}</p>
              <p className="text-xs text-slate-400">{c.label}</p>
            </motion.div>
          ))}
          {!stats && (
            <div className="col-span-full text-center text-sm text-slate-400 py-4">Memuat statistik...</div>
          )}
        </div>

        {/* ===== Tabs ===== */}
        <div className="flex gap-2 mb-6">
          {[
            { key: TABS.VERIFY, label: `Verifikasi Setoran (${pending.length})` },
            { key: TABS.PLANS, label: `Semua Tabungan (${plans.length})` },
            { key: TABS.USERS, label: `Jamaah (${users.length})` },
            { key: TABS.PACKAGES, label: 'Paket Umroh' },
            { key: TABS.DOCS, label: 'Verifikasi Dokumen' },
            { key: TABS.BROADCAST, label: 'Pengumuman' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition ${
                tab === t.key
                  ? 'bg-emerald-700 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            >
              {tab === TABS.VERIFY ? (
                <VerifyPanel pending={pending} onVerify={verifyDeposit} />
              ) : tab === TABS.PLANS ? (
                <PlansPanel plans={plans} />
              ) : tab === TABS.PACKAGES ? (
                <PackagesPanel />
              ) : tab === TABS.DOCS ? (
                <DocumentsVerifyPanel />
              ) : tab === TABS.BROADCAST ? (
                <BroadcastPanel users={users} />
              ) : (
                <UsersPanel users={users} />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

/* ============ VERIFIKASI ============ */
function VerifyPanel({ pending, onVerify }) {
  const [rejectFor, setRejectFor] = useState(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const confirmApprove = async (deposit) => {
    setBusy(true);
    await onVerify(deposit.id, 'approve');
    setBusy(false);
  };

  const confirmReject = async () => {
    if (!reason.trim()) {
      toast.error('Alasan penolakan wajib diisi');
      return;
    }
    setBusy(true);
    await onVerify(rejectFor, 'reject', reason.trim());
    setBusy(false);
    setRejectFor(null);
    setReason('');
  };

  if (pending.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-14 text-center">
        <p className="text-5xl mb-4">✅</p>
        <p className="text-lg font-semibold text-slate-700">Tidak ada setoran menunggu verifikasi</p>
        <p className="mt-1 text-sm text-slate-400">Semua setoran sudah ditangani.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {pending.map((d) => (
        <div key={d.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 bg-amber-50 border-b border-amber-100">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700">
              <Clock className="w-4 h-4" /> MENUNGGU VERIFIKASI
            </span>
            <span className="text-xs text-amber-600">{timeAgo(d.createdAt)}</span>
          </div>

          <div className="p-5">
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="text-xl font-extrabold text-slate-900">{formatCurrency(d.amount)}</p>
              {d.uniqueCode > 0 && (
                <span className="text-xs text-slate-400">kode unik: {d.uniqueCode}</span>
              )}
              {d.totalTransfer > 0 && (
                <span className="text-xs font-semibold text-emerald-600">
                  total transfer: {formatCurrency(d.totalTransfer)}
                </span>
              )}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div>
                <p className="text-xs text-slate-400">Jamaah</p>
                <p className="font-semibold text-slate-800">{d.savingsPlan?.user?.name || '-'}</p>
                <p className="text-xs text-slate-400">{d.savingsPlan?.user?.phone}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Paket</p>
                <p className="font-semibold text-slate-800">{d.savingsPlan?.package?.name || '-'}</p>
                <p className="text-xs text-slate-400">{formatDate(d.createdAt, true)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Bank Tujuan</p>
                <p className="font-semibold text-slate-800">{d.bankAccount?.bankName || '-'}</p>
              </div>
              <div>
                <p className="text-xs text-slate-400">Metode</p>
                <p className="font-semibold text-slate-800">{d.paymentMethod || 'Transfer'}</p>
              </div>
            </div>

            {d.proofImage ? (
              <button
                type="button"
                onClick={() => openProtectedFile(`/deposits/${d.id}/proof`)}
                className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold hover:bg-slate-200 transition"
              >
                <Eye className="w-4 h-4" /> Lihat Bukti Transfer
              </button>
            ) : (
              <p className="mt-4 text-xs text-amber-600">Belum ada bukti transfer diupload.</p>
            )}

            {rejectFor === d.id ? (
              <div className="mt-4 rounded-xl border border-slate-200 p-3.5 space-y-2.5">
                <label className="block text-sm font-semibold text-slate-700" htmlFor="rejReason">
                  Alasan Penolakan
                </label>
                <textarea
                  id="rejReason"
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Contoh: nominal transfer tidak sesuai"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 resize-none"
                />
                <div className="flex gap-2">
                  <button
                    onClick={confirmReject}
                    disabled={busy}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition disabled:opacity-60"
                  >
                    {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />} Konfirmasi Tolak
                  </button>
                  <button
                    onClick={() => setRejectFor(null)}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-semibold hover:bg-slate-50 transition"
                  >
                    Batal
                  </button>
                </div>
              </div>
            ) : (
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => confirmApprove(d)}
                  disabled={busy}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition disabled:opacity-60"
                >
                  <Check className="w-4 h-4" /> Approve
                </button>
                <button
                  onClick={() => {
                    setRejectFor(d.id);
                    setReason('');
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-white border border-rose-200 text-rose-600 text-sm font-semibold hover:bg-rose-50 transition"
                >
                  <X className="w-4 h-4" /> Tolak
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============ SEMUA TABUNGAN ============ */
function PlansPanel({ plans }) {
  const [q, setQ] = useState('');
  const filtered = plans.filter(
    (p) =>
      (p.user?.name || '').toLowerCase().includes(q.toLowerCase()) ||
      (p.package?.name || '').toLowerCase().includes(q.toLowerCase()) ||
      (p.user?.email || '').toLowerCase().includes(q.toLowerCase())
  );

  if (plans.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-14 text-center">
        <p className="text-5xl mb-4">🎯</p>
        <p className="text-lg font-semibold text-slate-700">Belum ada rencana tabungan</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <input
          type="search"
          placeholder="Cari jamaah / paket / email..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full max-w-sm px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
        <p className="mt-2 text-xs text-slate-400">{filtered.length} dari {plans.length} rencana tabungan</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3 font-semibold">Jamaah</th>
              <th className="px-5 py-3 font-semibold">Paket</th>
              <th className="px-5 py-3 font-semibold">Terkumpul</th>
              <th className="px-5 py-3 font-semibold">Progres</th>
              <th className="px-5 py-3 font-semibold">Dibuat</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((p) => {
              const balance = Number(p.currentBalance || 0);
              const target = Number(p.targetAmount || 0) || Number(p.package?.price || 0);
              const pct = target > 0 ? Math.min(Math.round((balance / target) * 100), 100) : 0;
              const st = PLAN_STATUS[p.status] || PLAN_STATUS.ACTIVE;
              return (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5">
                    <p className="font-semibold text-slate-800">{p.user?.name || '-'}</p>
                    <p className="text-xs text-slate-400">{p.user?.email}</p>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{p.package?.name || '-'}</td>
                  <td className="px-5 py-3.5 font-semibold text-slate-900 whitespace-nowrap">
                    {formatCurrency(balance)}
                    <span className="block text-xs text-slate-400 font-normal">target {formatCurrency(target)}</span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-600"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold text-slate-600">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{formatDate(p.registeredAt)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${st.badge}`}>
                      {st.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ JAMAAH ============ */
function UsersPanel({ users }) {
  const [q, setQ] = useState('');
  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(q.toLowerCase()) ||
      u.email.toLowerCase().includes(q.toLowerCase()) ||
      (u.phone || '').includes(q)
  );

  if (users.length === 0) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-14 text-center">
        <p className="text-5xl mb-4">👥</p>
        <p className="text-lg font-semibold text-slate-700">Belum ada jamaah terdaftar</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100">
        <input
          type="search"
          placeholder="Cari nama / email / no. HP..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full max-w-sm px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
        <p className="mt-2 text-xs text-slate-400">{filtered.length} dari {users.length} jamaah</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-400">
              <th className="px-5 py-3 font-semibold">Nama</th>
              <th className="px-5 py-3 font-semibold">Kontak</th>
              <th className="px-5 py-3 font-semibold">Terdaftar</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                      {u.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800">{u.name}</p>
                      <p className="text-xs text-slate-400">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5 text-slate-600">{u.phone}</td>
                <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap">{formatDate(u.createdAt)}</td>
                <td className="px-5 py-3.5">
                  {u.isActive ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
                      <XCircle className="w-3.5 h-3.5" /> Nonaktif
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ============ PENGUMUMAN (BROADCAST) ============ */
function BroadcastPanel({ users }) {
  const [target, setTarget] = useState('ALL');
  const [userId, setUserId] = useState('');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.error('Judul dan isi pengumuman wajib diisi');
      return;
    }
    if (target === 'USER' && !userId) {
      toast.error('Pilih jamaah tujuan terlebih dahulu');
      return;
    }
    setBusy(true);
    try {
      const res = await api.post('/admin/notifications/broadcast', {
        target,
        ...(target === 'USER' && { userId }),
        title: title.trim(),
        message: message.trim(),
      });
      toast.success(res.data?.message || 'Pengumuman terkirim 📢');
      setTitle('');
      setMessage('');
      setUserId('');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal mengirim pengumuman');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 bg-emerald-50/70 border-b border-emerald-100">
          <p className="inline-flex items-center gap-2 font-bold text-sm text-emerald-800">
            <Megaphone className="w-4 h-4" /> Kirim Pengumuman
          </p>
          <p className="mt-1 text-xs text-emerald-700/80">              Notifikasi masuk ke bel Notifikasi jamaah, diterima real-time, plus Web Push bila diaktifkan.
          </p>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {/* Target */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Tujuan</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTarget('ALL')}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition ${
                  target === 'ALL'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Semua Jamaah
              </button>
              <button
                type="button"
                onClick={() => setTarget('USER')}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold border transition ${
                  target === 'USER'
                    ? 'bg-emerald-700 text-white border-emerald-700'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                Jamaah Tertentu
              </button>
            </div>
          </div>
r
          {/* Pilih user (kondisional) */}
          {target === 'USER' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Jamaah</label>
              <select
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
              >
                <option value="">— Pilih jamaah —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.phone || u.email})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Judul */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Judul</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              placeholder="Contoh: Info Keberangkatan Batch Maret"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {/* Isi */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Isi Pengumuman</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              maxLength={500}
              placeholder="Tulis isi pengumuman di sini..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 resize-none"
            />
            <p className="mt-1 text-right text-[11px] text-slate-400">{message.length}/500</p>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-700 text-white text-sm font-bold hover:bg-emerald-800 transition disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {busy ? 'Mengirim...' : target === 'ALL' ? 'Kirim ke Semua Jamaah' : 'Kirim ke Jamaah Terpilih'}
          </button>
        </form>
      </div>
    </div>
  );
}