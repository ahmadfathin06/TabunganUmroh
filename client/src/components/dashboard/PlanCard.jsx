import { motion } from 'motion/react';
import { Plus, Upload } from 'lucide-react';
import { KaabaIcon } from '../landing/Ornament';
import { PLAN_STATUS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';

const ACCENTS = [
  'from-midnight to-forest',
  'from-forest to-forest-400',
  'from-emerald-950 to-midnight',
  'from-night to-midnight',
];

const BAR_ACCENTS = [
  'from-gold-600 via-gold-400 to-gold-300',
  'from-forest-400 via-gold-400 to-gold-300',
  'from-gold-700 via-gold-500 to-gold-300',
  'from-forest via-gold-400 to-gold-200',
];

/**
 * Savings plan card (premium). All actions are delegated to the parent so the
 * data logic stays in one place.
 */
export default function PlanCard({ plan, index = 0, confirmCancelId, onCancelClick, onDeposit, onUploadProof, hasPendingDeposit }) {
  const pct = Number(plan.progress || 0);
  const status = PLAN_STATUS[plan.status] || PLAN_STATUS.ACTIVE;
  const accent = ACCENTS[index % ACCENTS.length];
  const barAccent = BAR_ACCENTS[index % BAR_ACCENTS.length];

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="overflow-hidden rounded-3xl border border-emerald-900/5 bg-gradient-to-b from-white to-cream shadow-card transition-shadow hover:shadow-lift"
    >
      {/* gradient header */}
      <div className={`relative bg-gradient-to-br ${accent} px-6 py-5`}>
        <div className="noise pointer-events-none absolute inset-0 opacity-[0.07] mix-blend-overlay" />
        <div className="relative flex items-start justify-between">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-white backdrop-blur-sm">
            {status.label}
          </span>
          <KaabaIcon className="h-9 w-9 drop-shadow-[0_2px_8px_rgba(0,0,0,0.25)]" />
        </div>
        <h3 className="relative mt-3 font-serif text-lg leading-snug text-white">
          {plan.package?.name || plan.jamaahName}
        </h3>
        <p className="relative mt-0.5 text-xs text-white/70">
          {plan.jamaahRelation === 'self' ? 'Untuk diri sendiri' : `Untuk ${plan.jamaahName}`} · mulai{' '}
          {formatDate(plan.registeredAt)}
        </p>
      </div>

      {/* body */}
      <div className="p-6">
        <div className="mb-3 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-sage">Terkumpul</p>
            <p className="font-grotesk text-xl font-bold text-ink">{formatCurrency(plan.currentBalance)}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-widest text-sage">Target</p>
            <p className="font-grotesk text-sm font-semibold text-forest">{formatCurrency(plan.targetAmount)}</p>
          </div>
        </div>

        {/* progress bar */}
        <div className="h-2.5 overflow-hidden rounded-full bg-emerald-900/8">
          <motion.div
            className={`h-full rounded-full bg-gradient-to-r ${barAccent}`}
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1, delay: 0.3 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <div className="mt-2 flex items-center justify-between text-xs">
          <span className="font-grotesk font-bold text-forest">{pct}%</span>
          <span className="text-sage">Sisa {formatCurrency(plan.remaining)}</span>
        </div>

        {Number(plan.monthlyTarget) > 0 && (
          <p className="mt-3 text-xs text-sage">
            Target cicilan: <b className="text-ink/80">{formatCurrency(plan.monthlyTarget)}</b>/bulan
          </p>
        )}

        {plan.status === 'ACTIVE' && (
          <div className="mt-5 flex gap-2">
            <button
              onClick={() => onDeposit(plan.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-midnight px-3 py-2.5 text-xs font-bold text-white transition hover:bg-forest"
            >
              <Plus className="h-3.5 w-3.5" /> Setor
            </button>
            <button
              onClick={() => onUploadProof(plan.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-2.5 text-xs font-bold text-gold-700 transition hover:bg-gold-500/20"
            >
              <Upload className="h-3.5 w-3.5" /> Bukti
            </button>
            {Number(plan.currentBalance) === 0 && !hasPendingDeposit && (
              <button
                onClick={() => onCancelClick(plan.id)}
                title="Batalkan rencana (kuota dikembalikan)"
                className={`rounded-full px-3 py-2.5 text-xs font-bold transition ${
                  confirmCancelId === plan.id
                    ? 'bg-terra text-white hover:bg-terra/90'
                    : 'text-sage hover:bg-terra/10 hover:text-terra'
                }`}
              >
                {confirmCancelId === plan.id ? 'Batalkan?' : 'Batal'}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
