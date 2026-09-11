import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import {
  Wallet,
  Target,
  Receipt,
  Plus,
  TrendingUp,
  Upload,
  Loader2,
  Clock,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { formatCurrency } from '../utils/formatCurrency';
import { formatDate, timeAgo } from '../utils/formatDate';
import { DEPOSIT_STATUS, PLAN_STATUS } from '../utils/constants';
import DepositModal from '../components/DepositModal';
import CreatePlanModal from '../components/CreatePlanModal';
import UploadProofModal from '../components/UploadProofModal';
import NotificationBell from '../components/NotificationBell';

const ACCENTS = ['from-emerald-500 to-teal-600', 'from-amber-400 to-orange-500', 'from-sky-400 to-indigo-500', 'from-rose-400 to-pink-500'];

export default function UserDashboard() {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [packages, setPackages] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showDeposit, setShowDeposit] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [plansRes, depositRes, pkgRes, bankRes] = await Promise.all([
        api.get('/savings/my'),
        api.get('/deposits/my'),
        api.get('/packages?status=OPEN'),
        api.get('/bank-accounts'),
      ]);
      setPlans(plansRes.data?.data || []);
      setDeposits(depositRes.data?.data || []);
      setPackages(pkgRes.data?.data || []);
      setBankAccounts(bankRes.data?.data || []);
    } catch (err) {
      toast.error('Gagal memuat data tabungan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const cancelPlan = async (planId) => {
    try {
      await api.put(`/savings/${planId}/cancel`);
      toast.success('Rencana tabungan dibatalkan');
      setConfirmCancelId(null);
      loadData();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membatalkan rencana');
      setConfirmCancelId(null);
    }
  };

  const stats = useMemo(() => {
    const totalBalance = plans.reduce((s, p) => s + Number(p.currentBalance || 0), 0);
    const totalTarget = plans.reduce((s, p) => s + Number(p.targetAmount || 0), 0);
    const activeCount = plans.filter((p) => p.status === 'ACTIVE').length;
    const totalDeposit = deposits
      .filter((d) => d.status === 'APPROVED')
      .reduce((s, d) => s + Number(d.amount || 0), 0);
    const progress = totalTarget > 0 ? Math.round((totalBalance / totalTarget) * 100) : 0;
    return { totalBalance, totalTarget, activeCount, totalDeposit, progress };
  }, [plans, deposits]);

  const h = new Date().getHours();
  const greeting = h < 11 ? 'Selamat Pagi' : h < 15 ? 'Selamat Siang' : h < 18 ? 'Selamat Sore' : 'Selamat Malam';

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ===== Header ===== */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <p className="text-sm text-slate-500">{greeting},</p>
            <h1 className="text-2xl font-bold text-slate-900">
              Assalamu'alaikum, {user?.name?.split(' ')[0]} 👋
            </h1>
            <p className="mt-1 text-sm text-slate-500">Semoga perjalanan suci Anda dimudahkan, ya!</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell refreshKey={deposits.length} />
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition"
            >
              <Plus className="w-4 h-4" /> Buat Rencana
            </button>
            <button
              onClick={() => setShowDeposit(true)}
              disabled={plans.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-emerald-950 text-sm font-bold transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <TrendingUp className="w-4 h-4" /> Setor Sekarang
            </button>
          </div>
        </div>

        {/* ===== Summary ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gradient-to-br from-emerald-700 to-teal-800 rounded-2xl p-5 text-white shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-emerald-100/90 text-sm font-medium">Total Saldo</p>
              <Wallet className="w-5 h-5 text-emerald-200" />
            </div>
            <p className="mt-2 text-2xl font-bold">{formatCurrency(stats.totalBalance)}</p>
            <p className="mt-1 text-xs text-emerald-200">{stats.progress}% dari total target</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-sm font-medium">Rencana Aktif</p>
              <Target className="w-5 h-5 text-sky-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{stats.activeCount}</p>
            <p className="mt-1 text-xs text-slate-400">paket umroh sedang ditabung</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-sm font-medium">Total Setoran Diterima</p>
              <Receipt className="w-5 h-5 text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(stats.totalDeposit)}</p>
            <p className="mt-1 text-xs text-slate-400">dari {deposits.length} transaksi</p>
          </div>
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-slate-500 text-sm font-medium">Total Target</p>
              <Target className="w-5 h-5 text-rose-500" />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(stats.totalTarget)}</p>
            <p className="mt-1 text-xs text-slate-400">untuk {plans.length} rencana</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-700" />
          </div>
        ) : (
          <>
            {/* ===== Rencana ===== */}
            <section className="mb-10">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-slate-900">Rencana Tabungan Umroh</h2>
                {plans.length > 0 && (
                  <button onClick={() => setShowCreate(true)} className="text-sm text-emerald-700 hover:text-emerald-800 font-semibold">
                    + Rencana Baru
                  </button>
                )}
              </div>

              {plans.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-12 text-center">
                  <p className="text-5xl mb-4">🕌</p>
                  <p className="text-lg font-semibold text-slate-700">Belum ada rencana tabungan</p>
                  <p className="mt-1 text-sm text-slate-400 max-w-md mx-auto">
                    Pilih paket umroh dan mulai menabung. Setoran minimal Rp100rb tanpa biaya administrasi.
                  </p>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-sm font-semibold transition"
                  >
                    <Plus className="w-4 h-4" /> Buat Rencana Pertama
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {plans.map((plan, idx) => {
                    const pct = Number(plan.progress || 0);
                    const status = PLAN_STATUS[plan.status] || PLAN_STATUS.ACTIVE;
                    const accent = ACCENTS[idx % ACCENTS.length];
                    return (
                      <div key={plan.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className={`bg-gradient-to-r ${accent} px-5 py-4`}>
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 text-white text-xs font-semibold">
                              {status.label}
                            </span>
                            <span className="text-2xl">🕋</span>
                          </div>
                          <h3 className="mt-2 font-bold text-white">{plan.package?.name || plan.jamaahName}</h3>
                          <p className="text-white/80 text-xs">
                            {plan.jamaahRelation === 'self' ? 'Untuk diri sendiri' : `Untuk ${plan.jamaahName}`} · mulai {formatDate(plan.registeredAt)}
                          </p>
                        </div>

                        <div className="p-5">
                          <div className="flex items-end justify-between mb-2">
                            <div>
                              <p className="text-xs text-slate-400 font-medium">Terkumpul</p>
                              <p className="text-lg font-bold text-slate-900">{formatCurrency(plan.currentBalance)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-400 font-medium">Target</p>
                              <p className="text-sm font-semibold text-slate-600">{formatCurrency(plan.targetAmount)}</p>
                            </div>
                          </div>

                          <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden mb-2">
                            <div className={`h-full bg-gradient-to-r ${accent} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-slate-700">{pct}%</span>
                            <span className="text-slate-400">Sisa {formatCurrency(plan.remaining)}</span>
                          </div>

                          {Number(plan.monthlyTarget) > 0 && (
                            <p className="mt-3 text-xs text-slate-500">
                              Target cicilan: <b>{formatCurrency(plan.monthlyTarget)}</b>/bulan
                            </p>
                          )}

                          {plan.status === 'ACTIVE' && (
                            <div className="mt-4 flex gap-2">
                              <button
                                onClick={() => setShowDeposit(plan.id)}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-50 text-emerald-700 text-sm font-semibold hover:bg-emerald-100 transition"
                              >
                                <Plus className="w-4 h-4" /> Setor
                              </button>
                              <button
                                onClick={() => setShowUpload(plan.id)}
                                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-50 text-amber-700 text-sm font-semibold hover:bg-amber-100 transition"
                              >
                                <Upload className="w-4 h-4" /> Bukti
                              </button>
                              {Number(plan.currentBalance) === 0 &&
                                !deposits.some((d) => d.savingsPlanId === plan.id && d.status === 'PENDING') && (
                                  <button
                                    onClick={() =>
                                      confirmCancelId === plan.id ? cancelPlan(plan.id) : setConfirmCancelId(plan.id)
                                    }
                                    className={`px-3 py-2 rounded-lg text-sm font-semibold transition ${
                                      confirmCancelId === plan.id
                                        ? 'bg-rose-600 text-white hover:bg-rose-700'
                                        : 'bg-slate-50 text-slate-400 hover:bg-rose-50 hover:text-rose-600'
                                    }`}
                                    title="Batalkan rencana (kuota dikembalikan)"
                                  >
                                    {confirmCancelId === plan.id ? 'Batalkan?' : 'Batal'}
                                  </button>
                                )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* ===== Histori ===== */}
            <section>
              <h2 className="text-lg font-bold text-slate-900 mb-4">Histori Setoran</h2>

              {deposits.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-slate-200 p-10 text-center">
                  <p className="text-4xl mb-3">🧾</p>
                  <p className="font-semibold text-slate-600">Belum ada setoran</p>
                  <p className="mt-1 text-sm text-slate-400">Setoran pertama Anda akan muncul di sini.</p>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-50 text-left text-xs uppercase tracking-wider text-slate-400">
                          <th className="px-5 py-3 font-semibold">Tanggal</th>
                          <th className="px-5 py-3 font-semibold">Paket</th>
                          <th className="px-5 py-3 font-semibold">Nominal</th>
                          <th className="px-5 py-3 font-semibold">Kode</th>
                          <th className="px-5 py-3 font-semibold">Status</th>
                          <th className="px-5 py-3 font-semibold">Bukti</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {deposits.slice(0, 10).map((d) => {
                          const st = DEPOSIT_STATUS[d.status] || DEPOSIT_STATUS.PENDING;
                          return (
                            <tr key={d.id} className="hover:bg-slate-50/60">
                              <td className="px-5 py-3.5 text-slate-600 whitespace-nowrap">
                                {formatDate(d.createdAt, true)}
                                <span className="block text-xs text-slate-400">{timeAgo(d.createdAt)}</span>
                              </td>
                              <td className="px-5 py-3.5">
                                <p className="font-medium text-slate-800">{d.savingsPlan?.package?.name || '-'}</p>
                                <p className="text-xs text-slate-400">via {d.bankAccount?.bankName || 'Bank'}</p>
                              </td>
                              <td className="px-5 py-3.5 font-semibold text-slate-900 whitespace-nowrap">
                                {formatCurrency(d.amount)}
                                {d.uniqueCode > 0 && <span className="block text-xs text-slate-400">+ kode {d.uniqueCode}</span>}
                              </td>
                              <td className="px-5 py-3.5 text-slate-500">{d.uniqueCode}</td>
                              <td className="px-5 py-3.5">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${st.badge}`}>
                                  {d.status === 'PENDING' && <Clock className="w-3.5 h-3.5" />}
                                  {d.status === 'APPROVED' && <CheckCircle2 className="w-3.5 h-3.5" />}
                                  {d.status === 'REJECTED' && <XCircle className="w-3.5 h-3.5" />}
                                  {st.label}
                                </span>
                                {d.rejectionReason && <span className="block mt-1 text-xs text-rose-500">{d.rejectionReason}</span>}
                              </td>
                              <td className="px-5 py-3.5">
                                {d.proofImage ? (
                                  <a
                                    href={`http://localhost:5000${d.proofImage}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-800 font-semibold"
                                  >
                                    <Upload className="w-3.5 h-3.5" /> Lihat
                                  </a>
                                ) : d.status === 'PENDING' ? (
                                  <button
                                    onClick={() => setShowUpload(d.savingsPlanId)}
                                    className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-semibold"
                                  >
                                    <Upload className="w-3.5 h-3.5" /> Upload
                                  </button>
                                ) : (
                                  <span className="text-xs text-slate-300">-</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* ===== Modals ===== */}
      {showDeposit !== false && (
        <DepositModal
          plans={plans}
          bankAccounts={bankAccounts}
          presetPlanId={typeof showDeposit === 'string' ? showDeposit : undefined}
          onClose={() => setShowDeposit(false)}
          onSuccess={loadData}
        />
      )}

      {showCreate && (
        <CreatePlanModal
          packages={packages}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            loadData();
          }}
        />
      )}

      {showUpload && (
        <UploadProofModal
          planId={showUpload}
          onClose={() => setShowUpload(null)}
          onSuccess={() => {
            setShowUpload(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}