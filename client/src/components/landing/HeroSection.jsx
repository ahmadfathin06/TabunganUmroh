import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import { ArrowRight, BadgeCheck, Landmark, Star, Wallet } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';
import { GeometricPattern, KaabaIcon, MosqueSilhouette } from './Ornament';
import { EASE_OUT_EXPO, SPRING_SOFT } from '../../utils/animations';

/* ---------------- Golden drifting particles (dzikir beads) ---------------- */
function GoldenParticles({ count = 22 }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        size: 2 + Math.random() * 4.5,
        duration: 14 + Math.random() * 18,
        delay: -Math.random() * 24,
        drift: (Math.random() - 0.5) * 90,
        opacity: 0.25 + Math.random() * 0.5,
      })),
    [count]
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-gold-400"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            boxShadow: '0 0 8px 1px rgba(219,179,103,0.8)',
          }}
          initial={{ y: '105vh', x: 0 }}
          animate={{ y: '-10vh', x: p.drift }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
        />
      ))}
    </div>
  );
}

/* ---------------- Custom gold cursor (hero only) ---------------- */
function GoldCursor() {
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const sx = useSpring(x, { stiffness: 400, damping: 35 });
  const sy = useSpring(y, { stiffness: 400, damping: 35 });
  const [active, setActive] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [inHero, setInHero] = useState(true);

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return undefined;
    setEnabled(true);
    const move = (e) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const t = e.target;
      setActive(!!t?.closest?.('a, button, input, [role="button"]'));
    };
    // Only show the custom cursor while the hero is on screen
    const onScroll = () => setInHero(window.scrollY < 600);
    onScroll();
    window.addEventListener('mousemove', move);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('scroll', onScroll);
    };
  }, [x, y]);

  if (!enabled) return null;
  return (
    <motion.div
      className="pointer-events-none fixed z-[70] hidden md:block"
      style={{ x: sx, y: sy, top: 0, left: 0 }}
      animate={{ opacity: inHero ? 1 : 0 }}
      transition={{ duration: 0.25 }}
      aria-hidden="true"
    >
      <motion.span
        className="block -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold-400/70"
        animate={{
          width: active ? 40 : 10,
          height: active ? 40 : 10,
          backgroundColor: active ? 'rgba(219,179,103,0.08)' : 'rgba(219,179,103,0.9)',
        }}
        transition={{ duration: 0.2 }}
      />
    </motion.div>
  );
}

/* ---------------- Floating savings dashboard mockup ---------------- */
function ProgressPreviewCard() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [9, -9]), SPRING_SOFT);
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-11, 11]), SPRING_SOFT);
  const glowX = useTransform(mx, [-0.5, 0.5], ['20%', '80%']);

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
  };

  const deps = [
    { name: 'Hotel Makkah', stars: 5, dist: '150 m' },
    { name: 'Hotel Madinah', stars: 4, dist: '300 m' },
  ];

  return (
    <motion.div
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ perspective: 1200 }}
      className="relative mx-auto w-full max-w-md"
    >
      <motion.div
        style={{ rotateX: rx, rotateY: ry, transformStyle: 'preserve-3d' }}
        className="relative rounded-3xl border border-white/15 bg-gradient-to-b from-white/15 to-white/5 p-6 shadow-deep backdrop-blur-2xl md:p-7"
      >
        {/* sheen that follows the pointer */}
        <motion.span
          className="pointer-events-none absolute inset-0 rounded-3xl"
          style={{
            background: useTransform(
              glowX,
              (v) => `radial-gradient(480px circle at ${v} 30%, rgba(219,179,103,0.14), transparent 60%)`
            ),
          }}
        />
        <div style={{ transform: 'translateZ(40px)' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-gold-300">Target Saya</p>
              <p className="mt-1 font-serif text-xl text-white">Paket Reguler 9 Hari</p>
            </div>
            <KaabaIcon className="h-11 w-11 drop-shadow-[0_0_18px_rgba(212,162,76,0.45)]" />
          </div>

          <div className="mt-5 rounded-2xl border border-white/10 bg-night/40 p-4">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-widest text-white/50">Terkumpul</p>
                <p className="font-grotesk text-2xl font-bold text-white">
                  Rp <AnimatedNumber value={21.4} decimals={1} /> jt
                </p>
              </div>
              <span className="rounded-full bg-gold-500/15 px-2.5 py-1 text-xs font-bold text-gold-300">54%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-gold-600 via-gold-400 to-gold-300"
                initial={{ width: '0%' }}
                animate={{ width: '54%' }}
                transition={{ duration: 1.8, delay: 0.5, ease: EASE_OUT_EXPO }}
              />
            </div>
            <div className="mt-2 flex justify-between text-[11px] text-white/45">
              <span>Rp 21,4 jt terhimpun</span>
              <span>Target Rp 39,5 jt</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            {deps.map((d) => (
              <div key={d.name} className="rounded-xl border border-white/10 bg-white/5 p-3">
                <p className="text-xs font-semibold text-white/85">{d.name}</p>
                <div className="mt-1 flex items-center gap-0.5">
                  {Array.from({ length: d.stars }).map((_, i) => (
                    <Star key={i} className="h-3 w-3 fill-gold-400 text-gold-400" />
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-white/50">{d.dist} dari Masjid</p>
              </div>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-gold-500/25 bg-gold-500/10 px-3.5 py-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold-500/20">
                <Wallet className="h-4 w-4 text-gold-300" />
              </span>
              <div>
                <p className="text-xs font-semibold text-white">Setoran diterima</p>
                <p className="text-[11px] text-white/55">Transfer BCA · hari ini</p>
              </div>
            </div>
            <p className="font-grotesk text-sm font-bold text-gold-300">+Rp 1.000.000</p>
          </div>
        </div>
      </motion.div>

      {/* floating verified badge */}
      <motion.div
        className="absolute -right-4 -top-5 flex items-center gap-2 rounded-2xl border border-white/15 bg-midnight/90 px-3.5 py-2.5 shadow-lift backdrop-blur-xl"
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: 'easeInOut' }}
        style={{ transform: 'translateZ(70px)' }}
      >
        <BadgeCheck className="h-4 w-4 text-gold-400" />
        <span className="text-xs font-semibold text-white">Rekening Terverifikasi</span>
      </motion.div>
    </motion.div>
  );
}

/* ---------------- Staggered word-reveal headline ---------------- */
function WordReveal({ text, delay = 0, className = '' }) {
  const words = text.split(' ');
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={`${w}-${i}`} className="inline-block overflow-hidden pb-1 align-bottom">
          <motion.span
            className="inline-block"
            initial={{ y: '110%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.9, delay: delay + i * 0.09, ease: EASE_OUT_EXPO }}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

/* ============================ HERO ============================ */
const STATS = [
  { value: 1247, suffix: '+', label: 'Jamaah Terdaftar' },
  { value: 15.8, prefix: 'Rp ', suffix: ' M', decimals: 1, label: 'Dana Terhimpun' },
  { value: 98, suffix: '%', label: 'Kepuasan Jamaah' },
  { value: 2018, plain: true, label: 'Berdiri Sejak' },
];

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-midnight via-forest to-night">
      {/* grain + geometric ghost pattern */}
      <div className="noise pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay" />
      <GeometricPattern id="hero-tiles" className="absolute inset-0 h-full w-full text-white opacity-[0.05]" />
      <MosqueSilhouette className="pointer-events-none absolute -bottom-6 right-0 h-56 w-auto text-black opacity-20 blur-[2px] md:h-72" />
      <div className="pointer-events-none absolute -left-40 top-10 h-[30rem] w-[30rem] rounded-full bg-gold-500/10 blur-[120px]" />
      <GoldenParticles />
      <GoldCursor />

      <div className="relative mx-auto max-w-6xl px-6 pt-28 md:pt-36 lg:pt-40">
        <div className="grid items-center gap-14 lg:grid-cols-[1.35fr_1fr] lg:gap-10">
          {/* ---------- Left column ---------- */}
          <div className="text-center lg:text-left">
            <h1 className="font-serif text-5xl leading-[1.04] tracking-tight text-white sm:text-6xl md:text-7xl xl:text-8xl">
              <WordReveal text="Wujudkan Niat Umroh" delay={0.15} />
              <br />
              <WordReveal text="dengan Tabungan" delay={0.45} />{' '}
              <span className="inline-block overflow-hidden pb-2 align-bottom italic">
                <motion.span
                  className="inline-block bg-gradient-to-r from-gold-300 via-gold-400 to-gold-300 bg-clip-text text-transparent italic"
                  initial={{ y: '110%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.9, delay: 0.7, ease: EASE_OUT_EXPO }}
                >
                  Terencana
                </motion.span>
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9, ease: EASE_OUT_EXPO }}
              className="mx-auto mt-6 max-w-lg text-base leading-relaxed text-white/70 md:text-lg lg:mx-0"
            >
              Tabung sedikit demi sedikit tanpa terbebani. Cicilan ringan, transparan, dan
              gratis biaya administrasi.
            </motion.p>

            {/* Bismillah arabic accent */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.2, delay: 1.05 }}
              className="mt-6 font-arabic text-2xl text-gold-300/90"
              dir="rtl"
            >
              بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.1, ease: EASE_OUT_EXPO }}
              className="mt-9 flex flex-col items-center gap-3.5 sm:flex-row sm:justify-center lg:justify-start"
            >
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Link
                  to="/register"
                  className="group inline-flex items-center gap-2.5 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-7 py-4 text-sm font-bold text-night shadow-glow-gold transition-shadow hover:shadow-[0_14px_50px_-8px_rgba(212,162,76,0.7)]"
                >
                  Mulai Menabung Sekarang
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </Link>
              </motion.div>
              <motion.a
                href="#paket"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative overflow-hidden rounded-full border border-white/25 px-7 py-4 text-sm font-semibold text-white transition-colors hover:border-gold-400/60"
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/15 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                Lihat Pilihan Paket
              </motion.a>
            </motion.div>
          </div>

          {/* ---------- Right column ---------- */}
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 1, delay: 0.5, ease: EASE_OUT_EXPO }}
            className="pb-8 lg:pb-0"
          >
            <ProgressPreviewCard />
          </motion.div>
        </div>

        {/* ---------- Trust indicators ---------- */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
          className="relative mt-16 grid grid-cols-2 gap-6 border-t border-white/10 py-10 md:grid-cols-4 md:py-12"
        >
          {STATS.map((s) => (
            <div key={s.label} className="text-center md:text-left">
              <p className="font-grotesk text-3xl font-bold text-white md:text-4xl">
                <AnimatedNumber
                  value={s.value}
                  decimals={s.decimals || 0}
                  prefix={s.prefix || ''}
                  suffix={s.suffix || ''}
                  plain={s.plain}
                />
              </p>
              <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/50">
                {s.label}
              </p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* bottom curve into cream */}
      <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="relative block h-14 w-full text-cream md:h-20" aria-hidden="true">
        <path d="M0 80V40C240 8 480 0 720 8s480 30 720 16v56z" fill="currentColor" />
      </svg>
    </section>
  );
}
