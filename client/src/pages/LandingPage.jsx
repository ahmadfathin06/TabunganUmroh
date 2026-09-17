import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useScroll, useSpring } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import api from '../services/api';
import HeroSection from '../components/landing/HeroSection';
import PackageCard from '../components/landing/PackageCard';
import SimulationCalculator from '../components/landing/SimulationCalculator';
import TrustSection from '../components/landing/TrustSection';
import TestimonialCarousel from '../components/landing/TestimonialCarousel';
import FAQAccordion from '../components/landing/FAQAccordion';
import CTABanner from '../components/landing/CTABanner';
import SectionHeading from '../components/landing/SectionHeading';
import Reveal from '../components/landing/Reveal';
import { OrnamentDivider } from '../components/landing/Ornament';

/* ---------------- Thin gold scroll progress bar ---------------- */
function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 26, mass: 0.4 });
  return (
    <motion.div
      style={{ scaleX }}
      className="fixed inset-x-0 top-0 z-[80] h-[3px] origin-left bg-gradient-to-r from-gold-600 via-gold-400 to-gold-300"
      aria-hidden="true"
    />
  );
}

/* ---------------- 4-step journey ---------------- */
const STEPS = [
  { step: '01', title: 'Daftar Akun', desc: 'Isi data diri singkat, selesai dalam 2 menit.' },
  { step: '02', title: 'Pilih Paket', desc: 'Pilih paket umroh sesuai budget & kebutuhan Anda.' },
  { step: '03', title: 'Tabung Rutin', desc: 'Setor via transfer bank dengan kode unik pribadi.' },
  { step: '04', title: 'Berangkat', desc: 'Saldo lunas, visa & tiket kami urus sampai berangkat.' },
];

function StepsSection() {
  return (
    <section id="tentang" className="relative py-24 md:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionHeading
            label="Cara Kerja"
            title="Empat Langkah Menuju Tanah Suci"
            subtitle="Proses yang sederhana namun tertata — dari niat hingga keberangkatan."
          />
        </Reveal>

        <div className="relative mt-16 grid gap-8 md:grid-cols-4 md:gap-6">
          {/* connecting line (desktop) */}
          <span className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-gold-500/40 to-transparent md:block" />
          {STEPS.map((s, i) => (
            <Reveal key={s.step} delay={i * 0.12}>
              <div className="group relative text-center md:text-left">
                <span className="relative z-10 inline-flex h-14 w-14 items-center justify-center rounded-full border border-gold-500/40 bg-cream font-grotesk text-sm font-bold text-gold-600 shadow-card transition-all duration-500 group-hover:bg-gold-500 group-hover:text-night">
                  {s.step}
                </span>
                <h3 className="mt-5 font-serif text-xl text-ink">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-sage">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------------- Packages section ---------------- */
function PackagesSection({ packages, loading }) {
  // featured = API `isFeatured` flag; fallback to the middle card when 3+ packages
  const flagged = packages.findIndex((p) => p.isFeatured);
  const featuredIdx = flagged >= 0 ? flagged : packages.length >= 3 ? 1 : -1;

  return (
    <section id="paket" className="relative bg-white py-24 md:py-36">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionHeading
            label="Pilihan Paket"
            title="Paket yang Sesuai untuk Anda"
            subtitle="Setiap paket dirancang dengan akomodasi terbaik, jadwal jelas, dan skema tabungan yang ringan."
          />
          <OrnamentDivider className="mt-8" />
        </Reveal>

        {loading ? (
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[480px] animate-pulse rounded-3xl border border-emerald-900/5 bg-cream" />
            ))}
          </div>
        ) : packages.length === 0 ? (
          <div className="mt-16 rounded-3xl border-2 border-dashed border-emerald-900/10 bg-cream p-16 text-center">
            <p className="font-serif text-2xl text-ink">Belum ada paket tersedia</p>
            <p className="mt-2 text-sm text-sage">Silakan cek lagi nanti — kami sedang menyiapkan keberangkatan berikutnya.</p>
          </div>
        ) : (
          <div className="mt-16 grid items-stretch gap-8 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {packages.slice(0, 6).map((pkg, i) => (
              <PackageCard key={pkg.id} pkg={pkg} index={i} featured={i === featuredIdx} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ============================ PAGE ============================ */
export default function LandingPage() {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  // Smooth-scroll to #hash once the page has rendered (e.g. arriving from /login)
  useEffect(() => {
    if (!window.location.hash) return undefined;
    const id = window.location.hash.slice(1);
    const t = setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 350);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        // limit eksplisit: default server 10, padahal penanda `isFeatured`
        // bisa berada di luar 10 paket pertama sehingga kartu "Paling Populer"
        // tidak pernah ketemu.
        const res = await api.get('/packages?status=OPEN&limit=100');
        if (active) setPackages(res.data?.data || []);
      } catch (err) {
        console.error('Gagal memuat paket:', err);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-cream">
      <ScrollProgress />
      <HeroSection />

      {/* quick CTA strip */}
      <section className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <Reveal>
          <div className="flex flex-col items-center justify-between gap-8 rounded-[2rem] border border-emerald-900/8 bg-gradient-to-r from-sand/80 via-cream to-sand/60 p-8 text-center shadow-card md:flex-row md:p-10 md:text-left">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-gold-600">Simpanan Aman & Tanpa Riba</p>
              <h3 className="mt-3 max-w-md font-serif text-2xl leading-snug text-ink md:text-3xl">
                Mulai dari Rp 100 ribu, insya Allah sampai ke Baitullah.
              </h3>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="shrink-0">
              <Link
                to="/register"
                className="group inline-flex items-center gap-2.5 rounded-full bg-midnight px-7 py-4 text-sm font-bold text-white transition-colors hover:bg-forest"
              >
                Buka Tabungan
                <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </Link>
            </motion.div>
          </div>
        </Reveal>
      </section>

      <PackagesSection packages={packages} loading={loading} />
      <StepsSection />
      <SimulationCalculator />
      <TrustSection />
      <TestimonialCarousel />
      <FAQAccordion />
      <CTABanner />

      {/* Sticky bottom CTA (mobile) — duduk tepat di atas tab bar bawah */}
      <motion.div
        initial={{ y: 90 }}
        animate={{ y: 0 }}
        transition={{ delay: 1.6, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        style={{ bottom: 'calc(var(--bottom-nav-height) + env(safe-area-inset-bottom))' }}
        className="fixed inset-x-0 z-[60] border-t border-white/10 bg-midnight/95 px-4 py-3 backdrop-blur-xl md:hidden"
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">Mulai dari Rp 100rb/bulan</p>
            <p className="truncate text-[10px] text-white/55">Gratis biaya administrasi</p>
          </div>
          <Link
            to="/register"
            className="shrink-0 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-5 py-2.5 text-xs font-bold text-night"
          >
            Mulai Menabung
          </Link>
        </div>
      </motion.div>
      {/* spacer so tab bar + mobile CTA don't cover footer content */}
      <div className="h-[calc(var(--bottom-nav-height)+76px)] bg-night md:hidden" />
    </div>
  );
}
