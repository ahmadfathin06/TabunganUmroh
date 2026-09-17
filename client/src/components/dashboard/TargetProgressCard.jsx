import { motion } from 'motion/react';
import { KaabaIcon } from '../landing/Ornament';
import { formatCurrencyIDR, formatCurrencyShort } from '../../utils/formatCurrency';

const RING_SIZE = 120;
const RING_STROKE = 10;

/** Cincin progres melingkar dengan ikon Ka'bah + persentase di tengahnya. */
function ProgressRing({ value }) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const radius = (RING_SIZE - RING_STROKE) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative h-24 w-24 shrink-0 md:h-28 md:w-28">
      <svg viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} className="h-full w-full -rotate-90">
        <defs>
          <linearGradient id="dashboard-ring-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#e2c388" />
            <stop offset="55%" stopColor="#d4a24c" />
            <stop offset="100%" stopColor="#b18338" />
          </linearGradient>
        </defs>
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={RING_STROKE}
          className="text-emerald-900/10"
        />
        <motion.circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={radius}
          fill="none"
          stroke="url(#dashboard-ring-gradient)"
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - (pct / 100) * circumference }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <KaabaIcon className="h-6 w-6 md:h-7 md:w-7" />
        <span className="mt-1 font-grotesk text-base font-bold leading-none text-forest md:text-lg">
          {pct}%
        </span>
      </div>
    </div>
  );
}

const monthYear = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
};

/**
 * Kartu target keberangkatan: cincin progres + paket terdekat + sisa target.
 */
export default function TargetProgressCard({ progress, currentBalance, targetAmount, remaining, plan }) {
  const departure = monthYear(plan?.package?.departureDate);

  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.06, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center gap-4 rounded-3xl border border-emerald-900/5 bg-white p-5 text-center shadow-card sm:flex-row sm:items-center sm:gap-5 sm:text-left md:p-6"
    >
      <ProgressRing value={progress} />

      <div className="min-w-0 flex-1">
        {plan ? (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sage">
              Target Keberangkatan
            </p>
            <p className="mt-1 font-serif text-lg leading-snug text-ink md:text-xl">
              {departure || 'Belum dijadwalkan'}
            </p>
            {plan.package?.name && (
              <p className="mt-0.5 truncate text-xs text-sage">({plan.package.name})</p>
            )}

            <div className="mt-3 h-2 overflow-hidden rounded-full bg-emerald-900/8">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-gold-600 via-gold-400 to-gold-300"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, Number(progress) || 0)}%` }}
                transition={{ duration: 1, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>

            <div className="mt-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[11px] sm:justify-between md:text-xs">
              <span className="text-sage">
                Progress:{' '}
                <b className="font-grotesk text-ink/80">
                  {formatCurrencyShort(currentBalance)} / {formatCurrencyShort(targetAmount)}
                </b>
              </span>
              <span className="text-sage">
                Sisa Target: <b className="font-grotesk text-forest">{formatCurrencyIDR(remaining)}</b>
              </span>
            </div>
          </>
        ) : (
          <>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sage">
              Target Keberangkatan
            </p>
            <p className="mt-1 font-serif text-lg text-ink">Belum ada rencana</p>
            <p className="mt-1 text-xs leading-relaxed text-sage">
              Buat rencana tabungan pertama untuk mulai mengumpulkan dana umrah Anda.
            </p>
          </>
        )}
      </div>
    </motion.section>
  );
}
