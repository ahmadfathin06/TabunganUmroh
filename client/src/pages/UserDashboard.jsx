import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { Plus, Loader2 } from 'lucide-react';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

import DepositModal from '../components/DepositModal';
import CreatePlanModal from '../components/CreatePlanModal';
import UploadProofModal from '../components/UploadProofModal';
import DocumentsPanel from '../components/DocumentsPanel';

import DashboardHeader from '../components/dashboard/DashboardHeader';
import BalanceCard from '../components/dashboard/BalanceCard';
import TargetProgressCard from '../components/dashboard/TargetProgressCard';
import QuickActions from '../components/dashboard/QuickActions';
import ActivePlanRow from '../components/dashboard/ActivePlanRow';
import PlanCard from '../components/dashboard/PlanCard';
import DepositHistoryTable from '../components/dashboard/DepositHistoryTable';

const DEFAULT_DEPOSIT_FILTERS = { q: '', from: '', to: '', page: 1 };

function SectionHeading({ title, children }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3 md:mb-5">
      <h2 className="font-serif text-xl text-ink md:text-2xl">{title}</h2>
      {children}
    </div>
  );
}

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

  const plansRef = useRef(null);
  const historyRef = useRef(null);

  const [showDeposit, setShowDeposit] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showUpload, setShowUpload] = useState(null);
  const [confirmCancelId, setConfirmCancelId] = useState(null);

  // base data: plans, packages, bank accounts
  const loadBase = useCallback(async () => {
    try {
      const [plansRes, pkgRes, bankRes] = await Promise.all([
        api.get('/savings/my'),
        api.get('/packages?status=OPEN&limit=100'),
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

  // Rencana utama = rencana aktif dengan keberangkatan paling dekat
  const primaryPlan = useMemo(() => {
    const active = plans.filter((p) => p.status === 'ACTIVE');
    const pool = active.length > 0 ? active : plans;
    return (
      [...pool].sort(
        (a, b) =>
          new Date(a.package?.departureDate || 0) - new Date(b.package?.departureDate || 0)
      )[0] || null
    );
  }, [plans]);

  const pendingCount = useMemo(
    () => depositItems.filter((d) => d.status === 'PENDING').length,
    [depositItems]
  );

  const scrollTo = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <div className="min-h-screen bg-cream pb-24">
      <DashboardHeader name={user?.name} refreshing={plans.length} />

      <div className="relative z-10 mx-auto max-w-6xl px-5 md:px-8">
        {/* ===== Ringkasan (overlap ke hero) ===== */}
        <div className="-mt-16 grid gap-4 md:-mt-20 md:grid-cols-2 lg:gap-6">
          <BalanceCard
            total={stats.totalBalance}
            activeCount={stats.activeCount}
            progress={stats.progress}
          />
          <TargetProgressCard
            progress={stats.progress}
            currentBalance={stats.totalBalance}
            targetAmount={stats.totalTarget}
            remaining={Math.max(stats.totalTarget - stats.totalBalance, 0)}
            plan={primaryPlan}
          />
        </div>

        {/* ===== Aksi cepat ===== */}
        <div className="mt-4 md:mt-6">
          <QuickActions
            onDeposit={() => (plans.length > 0 ? setShowDeposit(true) : setShowCreate(true))}
            onPlan={() => scrollTo(plansRef)}
            onHistory={() => scrollTo(historyRef)}
          />
        </div>

        {/* ===== Rencana aktif ===== */}
        <div className="mt-4 md:mt-6">
          <ActivePlanRow plan={primaryPlan} onClick={() => scrollTo(plansRef)} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-forest" />
          </div>
        ) : (
          <>
            {/* ===== Plans ===== */}
            <section ref={plansRef} className="mt-10 scroll-mt-24 md:mt-14">
              <SectionHeading title="Rencana Tabungan">
                {plans.length > 0 && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-forest transition-colors hover:text-gold-600"
                  >
                    <Plus className="h-4 w-4" /> Rencana Baru
                  </button>
                )}
              </SectionHeading>

              {plans.length === 0 ? (
                <div className="rounded-[2rem] border-2 border-dashed border-emerald-900/12 bg-sand/30 p-10 text-center md:p-14">
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
            <section ref={historyRef} className="mt-10 scroll-mt-24 md:mt-14">
              <SectionHeading title="Histori Setoran">
                {pendingCount > 0 && (
                  <span className="rounded-full bg-gold-100 px-3 py-1 text-[11px] font-bold text-gold-700">
                    {pendingCount} menunggu verifikasi
                  </span>
                )}
              </SectionHeading>
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
            <section className="mt-10 scroll-mt-24 md:mt-14">
              <SectionHeading title="Dokumen" />
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
