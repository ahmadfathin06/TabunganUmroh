import { motion } from 'motion/react';
import { Plus, TrendingUp } from 'lucide-react';
import NotificationBell from '../NotificationBell';

export default function DashboardHeader({ greeting, name, onCreatePlan, onDeposit, canDeposit, onRefresh, refreshing }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="relative mb-8 overflow-hidden rounded-[2rem] bg-gradient-to-br from-midnight via-forest to-night p-8 text-white shadow-deep md:p-10"
    >
      <div className="noise pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay" />
      <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full bg-gold-500/15 blur-[100px]" />

      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold-300">{greeting}</p>
          <h1 className="mt-2 font-serif text-3xl tracking-tight md:text-4xl">
            Assalamu&apos;alaikum, {name}
          </h1>
          <p className="mt-2 max-w-md text-sm text-white/60">
            Semoga perjalanan suci Anda dimudahkan. Teruskan setoran terbaik Anda hari ini.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <NotificationBell refreshKey={refreshing} />
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onCreatePlan}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold backdrop-blur-sm transition hover:bg-white/20"
          >
            <Plus className="h-4 w-4" /> Buat Rencana
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onDeposit}
            disabled={!canDeposit}
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-5 py-2.5 text-sm font-bold text-night shadow-glow-gold transition disabled:cursor-not-allowed disabled:opacity-50"
          >
            <TrendingUp className="h-4 w-4" /> Setor Sekarang
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}
