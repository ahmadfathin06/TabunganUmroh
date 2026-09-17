import { motion } from 'motion/react';
import { CalendarDays, ChevronRight } from 'lucide-react';
import { formatCurrencyIDR } from '../../utils/formatCurrency';

/**
 * Baris "Rencana Tabungan Aktif" — ringkasan rencana utama, tap untuk
 * melompat ke daftar rencana.
 */
export default function ActivePlanRow({ plan, onClick }) {
  const monthly = Number(plan?.monthlyTarget) > 0 ? Number(plan.monthlyTarget) : 0;

  const title = plan ? 'Rencana Tabungan Aktif' : 'Belum Ada Rencana Aktif';
  const subtitle = plan
    ? monthly > 0
      ? `Bulanan · ${formatCurrencyIDR(monthly)}`
      : plan.package?.name || 'Rencana tabungan'
    : 'Ketuk untuk membuat rencana tabungan';

  return (
    <motion.button
      type="button"
      onClick={onClick}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.99 }}
      className="flex w-full items-center gap-3.5 rounded-2xl border border-emerald-900/5 bg-white p-4 text-left shadow-card transition-shadow hover:shadow-lift md:gap-4 md:p-5"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gold-100 text-gold-700 md:h-12 md:w-12">
        <CalendarDays className="h-5 w-5 md:h-6 md:w-6" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-bold text-ink md:text-base">{title}</span>
        <span className="mt-0.5 block truncate text-xs text-sage md:text-sm">{subtitle}</span>
      </span>

      <ChevronRight className="h-5 w-5 shrink-0 text-sage" />
    </motion.button>
  );
}
