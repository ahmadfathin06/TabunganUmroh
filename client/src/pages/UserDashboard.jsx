import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { motion } from 'motion/react';
import { Wallet, Target, Receipt, Plus, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';
import { formatCurrency } from '../utils/formatCurrency';

import DepositModal from '../components/DepositModal';
import CreatePlanModal from '../components/CreatePlanModal';
import UploadProofModal from '../components/UploadProofModal';
import DashboardHeader from '../components/dashboard/DashboardHeader';
import PlanCard from '../components/dashboard/PlanCard';
import DepositHistoryTable from '../components/dashboard/DepositHistoryTable';
import DocumentsPanel from '../components/DocumentsPanel';

/* Premium stat card */
function StatCard({ label, value, sub, icon: Icon, featured = false, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-3xl p-6 ${
        featured
          ? 'bg-gradient-to-br from-midnight to-forest text-white shadow-lift'
          : 'border border-emerald-900/5 bg-gradient-to-b from-white to-cream shadow-card'
      }`}
    >
      <div className="flex items-center justify-between">
        <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${featured ? 'text-gold-300' : 'text-sage'}`}>
          {label}
        </p>
        <Icon className={`h-4 w-4 ${featured ? 'text-gold-300' : 'text-forest'}`} />
      </div>
      <p className={`mt-3 font-grotesk text-2xl font-bold tracking-tight ${featured ? 'text-white' : 'text-ink'}`}>
        {value}
      </p>
      <p className={`mt-1 text-xs ${featured ? 'text-white/55' : 'text-sage'}`}>{sub}</p>
    </motion.div>
  );
}

const DEFAULT_DEPOSIT_FILTERS = { q: '', from: '', to: '', page: 1 };

export default function UserDashboard() {
  const { user } = useAuthStore();
  const [plans, setPlans] = useState([]);
  const [packages, setPackages] = useState([]);
  const [bankAccounts, setBankAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // server-driven deposit history
  const [depositItems, setDepositItems] = useState([]);
  const [depositSummary, setDepositSummary] = useState(null);
  const [depositPagination, setDepositPagination] = useState(null);
  const [depositFilters, setDepositFilters] = useState(DEFAULT_DEPOSIT_FILTERS);
  const [depositLoading, setDepositLoading] = useState(true);
  const filterDebounce = useRef(null);

  const [showDeposit, setShowDeposit] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);

  // base data: plans, packages, bank accounts
  const loadBase = useCallback(async () => {
    try {
      const [plansRes, pkgRes, bankRes] = await Promise.all([
        api.get('/savings/my'),
        api.get('/packages?status=OPEN'),
        api.get('/bank-accounts'),
      ]);
      setPlans(plansRes.data?.data || []);
      setPackages(pkgRes.data?.data || []);
      setBankAccounts(bankRes.data?.data || []);
    } catch (err) {
      toast.error('Gagal memuat data tabungan');
    }
  }, []);

  // deposit history with server-side filters (debounced)
  const loadDeposits = useCallback(async (filters) => {
    setDepositLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.q.trim()) params.set('q', filters.q.trim());
      if (filters.from) params.set('from', filters.from);
      if (filters.to) params.set('to', filters.to);
      if (filters.page > 1) params.set('page', String(filters.page));
      params.set('limit', '5');

      const res = await api.get(`/deposits/my?${params.toString()}`);
      setDepositItems(res.data?.data || []);
      setDepositSummary(res.data?.summary || null);
      setDepositPagination(res.data?.pagination || null);
    } catch (err) {
      toast.error('Gagal memuat histori setoran');
    } finally {
      setDepositLoading(false);
    }
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([loadBase(), loadDeposits(DEFAULT_DEPOSIT_FILTERS)]);
      setLoading(false);
    })();
  }, [loadBase, loadDeposits]);

  // debounce filter changes (text search mainly)
  useEffect(() => {
    if (depositFilters === DEFAULT_DEPOSIT_FILTERS) return undefined;
    clearTimeout(filterDebounce.current);
    filterDebounce.current = setTimeout(() => {
      loadDeposits(depositFilters);
    }, 350);
    return () => clearTimeout(filterDebounce.current);
  }, [depositFilters, loadDeposits]);

  const refreshAll = useCallback(() => {
    loadBase();
    loadDeposits(depositFilters);
  }, [loadBase, loadDeposits, depositFilters]);

  const cancelPlan = async (planId) => {
    try {
      await api.put(`/savings/${planId}/cancel`);
      toast.success('Rencana tabungan dibatalkan');
      setConfirmCancelId(null);
      refreshAll();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal membatalkan rencana');
      setConfirmCancelId(null);
    }
  };

  const stats = useMemo(() => {
    const totalBalance = plans.reduce((s, p) => s + Number(p.currentBalance || 0), 0);
    const totalTarget = plans.reduce((s, p) => s + Number(p.targetAmount || 0), 0);
    const activeCount = plans.filter((p) => p.status === 'ACTIVE').length;
    const progress = totalTarget > 0 ? Math.round((totalBalance / totalTarget) * 100) : 0;
    return { totalBalance, totalTarget, activeCount, progress };
  }, [plans]);

  const h = new Date().getHours();
  const greeting = h < 11 ? 'Selamat Pagi' : h < 15 ? 'Selamat Siang' : h < 18 ? 'Selamat Sore' : 'Selamat Malam';

  return (
    <div className="min-h-screen bg-cream pb-20">
      <div className="mx-auto max-w-6xl px-6 py-8">
        <DashboardHeader
          greeting={greeting}
          name={user?.name?.split(' ')[0]}
          onCreatePlan={() => setShowCreate(true)}
          onDeposit={() => setShowDeposit(true)}
          canDeposit={plans.length > 0}
          refreshing={plans.length}
        />

        {/* ===== Summary ===== */}
        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            featured
            label="Total Saldo"
            value={formatCurrency(stats.totalBalance)}
            sub={`${stats.progress}% dari total target`}
            icon={Wallet}
            delay={0}
          />
          <StatCard label="Rencana Aktif" value={stats.activeCount} sub="paket sedang ditabung" icon={Target} delay={0.06} />
          <StatCard
            label="Total Target"
            value={formatCurrency(stats.totalTarget)}
            sub={`untuk ${plans.length} rencana`}
            icon={Target}
            delay={0.12}
          />
          <StatCard
            label="Status Setoran"
            value={depositItems.filter((d) => d.status === 'PENDING').length}
            sub="menunggu verifikasi (halaman ini)"
            icon={Receipt}
            delay={0.18}
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-forest" />
          </div>
        ) : (
          <>
            {/* ===== Plans ===== */}
            <section className="mb-12">
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-serif text-2xl text-ink">Rencana Tabungan</h2>
                {plans.length > 0 && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-forest transition-colors hover:text-gold-600"
                  >
                    <Plus className="h-4 w-4" /> Rencana Baru
                  </button>
                )}
              </div>

              {plans.length === 0 ? (
                <div className="rounded-[2rem] border-2 border-dashed border-emerald-900/12 bg-sand/30 p-14 text-center">
                  <p className="font-serif text-2xl text-ink">Belum ada rencana tabungan</p>
                  <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-sage">
                    Pilih paket umroh dan mulai menabung. Setoran minimal Rp100rb tanpa biaya administrasi.
                  </p>
                  <button
                    onClick={() => setShowCreate(true)}
                    className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-6 py-3 text-sm font-bold text-night shadow-glow-gold"
                  >
                    <Plus className="h-4 w-4" /> Buat Rencana Pertama
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
                  {plans.map((plan, idx) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      index={idx}
                      confirmCancelId={confirmCancelId}
                      onCancelClick={(id) => (confirmCancelId === id ? cancelPlan(id) : setConfirmCancelId(id))}
                      onDeposit={(id) => setShowDeposit(id)}
                      onUploadProof={(id) => setShowUpload(id)}
                      hasPendingDeposit={depositItems.some((d) => d.savingsPlanId === plan.id && d.status === 'PENDING')}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* ===== Deposit history (server-driven) ===== */}
            <section className="mb-12">
              <h2 className="mb-5 font-serif text-2xl text-ink">Histori Setoran</h2>
              <DepositHistoryTable
                items={depositItems}
                summary={depositSummary}
                pagination={depositPagination}
                loading={depositLoading}
                filters={depositFilters}
                onFiltersChange={setDepositFilters}
                onUploadProof={(planId) => setShowUpload(planId)}
              />
            </section>

            {/* ===== Documents ===== */}
            <section>
              <h2 className="mb-5 font-serif text-2xl text-ink">Dokumen</h2>
              <DocumentsPanel />
            </section>
          </>
        )}
      </div>

      {/* ===== Modals (logic unchanged) ===== */}
      {showDeposit !== false && (
        <DepositModal
          plans={plans}
          bankAccounts={bankAccounts}
          presetPlanId={typeof showDeposit === 'string' ? showDeposit : undefined}
          onClose={() => setShowDeposit(false)}
          onSuccess={refreshAll}
        />
      )}

      {showCreate && (
        <CreatePlanModal
          packages={packages}
          onClose={() => setShowCreate(false)}
          onSuccess={() => {
            setShowCreate(false);
            refreshAll();
          }}
        />
      )}

      {showUpload && (
        <UploadProofModal
          planId={showUpload}
          onClose={() => setShowUpload(null)}
          onSuccess={() => {
            setShowUpload(null);
            refreshAll();
          }}
        />
      )}
    </div>
  );
}
