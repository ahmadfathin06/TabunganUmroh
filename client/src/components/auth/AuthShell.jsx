import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { GeometricPattern, MosqueSilhouette, StarMark } from '../landing/Ornament';
import { EASE_OUT_EXPO } from '../../utils/animations';
import { cn } from '../../utils/cn';

/* Gold-accented Kaaba logo lockup */
export function LogoLockup({ dark = false }) {
  return (
    <Link to="/" className="inline-flex items-center gap-2.5">
      <svg viewBox="0 0 64 64" className="h-9 w-9" aria-hidden="true">
        <rect x="12" y="10" width="40" height="44" rx="4" fill="#0A3D2E" />
        <rect x="12" y="19" width="40" height="4.5" fill="#D4A24C" />
        <rect x="27" y="33" width="10" height="21" rx="1" fill="#D4A24C" />
      </svg>
      <span className={cn('font-serif text-xl font-semibold tracking-tight', dark ? 'text-white' : 'text-ink')}>
        Tabunganku <span className="text-gold-500">Umroh</span>
      </span>
    </Link>
  );
}

/* Premium input/textarea/select styling with error state */
export const authInputClass = (hasError) =>
  `w-full rounded-xl border bg-white px-4 py-2.5 text-sm text-ink outline-none transition placeholder:text-sage/60 focus:ring-2 ${
    hasError
      ? 'border-terra/60 focus:border-terra focus:ring-terra/15'
      : 'border-emerald-900/12 focus:border-gold-500 focus:ring-gold-300/30'
  }`;

export const authLabelClass = 'mb-1.5 block text-xs font-bold uppercase tracking-wider text-sage';

/**
 * Split-screen premium auth layout:
 * left = dark emerald brand panel (desktop only), right = form on cream.
 */
export default function AuthShell({ title, subtitle, children, footer }) {
  return (
    <div className="grid min-h-screen bg-cream lg:grid-cols-[1.05fr_1fr]">
      {/* ---------- Brand panel (desktop) ---------- */}
      <div className="relative hidden overflow-hidden bg-gradient-to-b from-midnight via-forest to-night lg:block">
        <div className="noise pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay" />
        <GeometricPattern id="auth-tiles" className="absolute inset-0 h-full w-full text-white opacity-[0.05]" />
        <MosqueSilhouette className="pointer-events-none absolute -bottom-4 left-1/2 h-64 w-auto -translate-x-1/2 text-black opacity-20 blur-[2px]" />
        <div className="pointer-events-none absolute -right-24 top-16 h-96 w-96 rounded-full bg-gold-500/10 blur-[130px]" />

        <div className="relative flex h-full flex-col justify-between p-12">
          <LogoLockup dark />

          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.2, ease: EASE_OUT_EXPO }}
              className="font-arabic text-3xl leading-snug text-gold-300"
              dir="rtl"
            >
              وَلِلَّهِ عَلَى النَّاسِ حِجُّ الْبَيْتِ
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35, ease: EASE_OUT_EXPO }}
              className="mt-6 max-w-md font-serif text-4xl leading-[1.15] text-white"
            >
              Sekali menabung, <span className="italic text-gold-300">selamanya berubah.</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.5, ease: EASE_OUT_EXPO }}
              className="mt-4 max-w-sm text-sm leading-relaxed text-white/60"
            >
              Bergabunglah dengan 1.247+ jamaah yang mewujudkan niat suci mereka
              lewat tabungan tanpa riba, transparan, dan terverifikasi.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.7 }}
              className="mt-8 flex flex-wrap gap-x-6 gap-y-2"
            >
              {['Travel berizin resmi', 'Tanpa bunga & biaya admin', 'Verifikasi bank'].map((t) => (
                <span key={t} className="inline-flex items-center gap-2 text-xs text-white/50">
                  <StarMark className="h-3 w-3 text-gold-400/80" />
                  {t}
                </span>
              ))}
            </motion.div>
          </div>

          <p className="text-[11px] uppercase tracking-[0.3em] text-white/30">
            Tabunganku Umroh — Sejak 2018
          </p>
        </div>
      </div>

      {/* ---------- Form side ---------- */}
      <div className="relative flex min-h-screen flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        {/* mobile logo */}
        <div className="mb-10 flex justify-center lg:hidden">
          <LogoLockup />
        </div>

        <div className="mx-auto w-full max-w-md">
          <h1 className="font-serif text-3xl tracking-tight text-ink md:text-4xl">{title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-sage">{subtitle}</p>

          <div className="mt-8">{children}</div>

          {footer && <div className="mt-8 text-center text-sm text-sage">{footer}</div>}
        </div>
      </div>
    </div>
  );
}
