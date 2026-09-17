import { motion } from 'motion/react';
import { formatCurrencyIDR } from '../../utils/formatCurrency';

/**
 * Kartu emas "Total Tabungan Anda" — konten utama dashboard, overlap ke hero.
 */
export default function BalanceCard({ total, activeCount, progress }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative flex flex-col justify-center overflow-hidden rounded-3xl bg-gradient-to-br from-gold-200 via-gold-300 to-gold-500 p-5 text-center text-night shadow-glow-gold md:p-6"
    >
      <div className="pointer-events-none absolute -left-10 -top-12 h-32 w-32 rounded-full bg-white/30 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-14 -right-8 h-36 w-36 rounded-full bg-gold-700/20 blur-2xl" />

      <p className="relative text-[10px] font-bold uppercase tracking-[0.22em] text-night/60 md:text-[11px]">
        Total Tabungan Anda
      </p>
      <p className="relative mt-1.5 font-grotesk text-[26px] font-bold leading-none tracking-tight sm:text-3xl md:text-4xl">
        {formatCurrencyIDR(total)}
      </p>
      <p className="relative mt-2.5 text-[11px] font-semibold text-night/60 md:text-xs">
        {activeCount > 0
          ? `${activeCount} rencana aktif · ${progress}% dari target`
          : 'Belum ada rencana tabungan'}
      </p>
    </motion.section>
  );
}
