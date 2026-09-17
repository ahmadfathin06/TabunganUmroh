import { motion } from 'motion/react';
import NotificationBell from '../NotificationBell';
import { GeometricPattern } from '../landing/Ornament';

/**
 * Dashboard hero header.
 *
 * Navbar situs tetap tampil di semua ukuran layar, jadi hero-nya hanya memuat
 * judul halaman + sapaan (logo brand tidak diulang di sini).
 */
export default function DashboardHeader({ name, refreshing }) {
  const initial = name?.charAt(0)?.toUpperCase() || 'U';

  return (
    <header
      id="dashboard-hero"
      className="relative isolate overflow-hidden rounded-b-[2rem] bg-gradient-to-br from-midnight via-forest to-night text-white md:rounded-b-[2.5rem]"
    >
      <div className="noise pointer-events-none absolute inset-0 opacity-[0.06] mix-blend-overlay" />
      <GeometricPattern
        id="dashboard-header-pattern"
        className="pointer-events-none absolute inset-0 h-full w-full text-white/[0.06]"
      />
      <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-gold-500/20 blur-[90px]" />

      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto max-w-6xl px-5 pb-24 pt-24 md:px-8 md:pb-28 md:pt-28"
      >
        <p className="text-[11px] font-bold uppercase tracking-[0.3em] text-gold-300">
          Tabungan Umroh
        </p>

        <div className="mt-5 flex items-center gap-4 md:mt-6">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-gold-400/60 bg-white/10 font-serif text-xl font-semibold text-gold-200 backdrop-blur-sm md:h-16 md:w-16 md:text-2xl">
            {initial}
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-xs text-white/60 md:text-sm">Assalamu&apos;alaikum,</p>
            <h1 className="truncate font-serif text-xl tracking-tight md:text-3xl">
              {name || 'Jamaah'}
            </h1>
          </div>

          {/* Restyled for the dark hero without touching NotificationBell itself */}
          <div className="shrink-0 [&>button]:h-11 [&>button]:w-11 [&>button]:rounded-full [&>button]:border-white/20 [&>button]:bg-white/10 [&>button]:text-white [&>button]:backdrop-blur-sm [&>button:hover]:border-white/30 [&>button:hover]:bg-white/20 [&>button:hover]:text-white">
            <NotificationBell refreshKey={refreshing} />
          </div>
        </div>
      </motion.div>
    </header>
  );
}
