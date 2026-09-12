import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, LogIn } from 'lucide-react';
import Reveal from './Reveal';
import { GeometricPattern, OrnamentDivider, StarMark } from './Ornament';
import { EASE_OUT_EXPO } from '../../utils/animations';

export default function CTABanner() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-midnight to-night py-28 md:py-40">
      <div className="noise pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay" />
      <GeometricPattern id="cta-tiles" className="absolute inset-0 h-full w-full text-gold-400 opacity-[0.06]" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[34rem] w-[34rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-500/10 blur-[140px]" />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        <Reveal>
          <p className="font-arabic text-3xl leading-snug text-gold-300" dir="rtl">
            وَأَذِّن فِي النَّاسِ بِالْحَجِّ يَأْتُوكَ رِجَالًا وَعَلَىٰ كُلِّ ضَامِرٍ يَأْتِينَ مِنْ كُلِّ فَجٍّ عَمِيقٍ
          </p>
          <p className="mt-3 text-xs uppercase tracking-[0.25em] text-white/40">
            — QS. Al-Hajj : 27 —
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <OrnamentDivider className="mt-10" />
          <h2 className="mt-8 font-serif text-4xl leading-[1.08] tracking-tight text-white md:text-6xl">
            Perjalanan Suci Anda{' '}
            <span className="italic text-gold-300">Dimulai dari Niat</span>
          </h2>
          <p className="mx-auto mt-6 max-w-xl leading-relaxed text-white/65">
            Setiap rupiah yang Anda tabung adalah langkah menuju panggilan-Nya.
            Daftar hari ini, dan biarkan kami menemani langkah Anda sampai di Baitullah.
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/register"
                className="group inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-8 py-4 text-sm font-bold text-night shadow-glow-gold transition-shadow hover:shadow-[0_14px_50px_-8px_rgba(212,162,76,0.7)]"
              >
                Daftar Sekarang — Gratis
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 rounded-full border border-white/25 px-8 py-4 text-sm font-semibold text-white transition-colors hover:border-gold-400/60"
              >
                <LogIn className="h-4 w-4" />
                Sudah punya akun? Masuk
              </Link>
            </motion.div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-white/45">
            {['Travel berizin resmi Kemenag RI', 'Tanpa bunga & biaya admin', 'Verifikasi bank setiap setoran', 'Support 7 hari seminggu'].map((t) => (
              <span key={t} className="inline-flex items-center gap-2">
                <StarMark className="h-3 w-3 text-gold-400/80" />
                {t}
              </span>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
