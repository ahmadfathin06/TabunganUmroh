import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';
import AnimatedNumber from './AnimatedNumber';
import SectionHeading from './SectionHeading';
import { formatCurrency, formatCurrencyShort } from '../../utils/formatCurrency';
import { EASE_OUT_EXPO } from '../../utils/animations';

const GOLD_RANGE = { accentColor: '#d4a24c' };

function Slider({ label, min, max, step, value, onChange, format, minLabel, maxLabel }) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-ink/80">{label}</label>
        <span className="font-grotesk text-sm font-bold text-forest">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="gold-range mt-3"
        style={{ '--fill': `${pct}%`, ...GOLD_RANGE }}
      />
      <div className="mt-1.5 flex justify-between text-[11px] text-sage">
        <span>{minLabel}</span>
        <span>{maxLabel}</span>
      </div>
    </div>
  );
}

export default function SimulationCalculator() {
  const [price, setPrice] = useState(35000000);
  const [monthly, setMonthly] = useState(1000000);
  const resultRef = useRef(null);

  const months = monthly > 0 ? Math.max(1, Math.ceil(price / monthly)) : 0;
  const years = Math.floor(months / 12);
  const restMonths = months % 12;

  // progress of bar chart rows (max 12 visible months, capped)
  const rows = useMemo(() => Math.min(12, months || 1), [months]);
  const rowFill = Math.max(0.08, Math.min(1, 12 / (months || 1)));

  // kaaba proximity micro-interaction: 0 (far) → 1 (arrived)
  const closeness = Math.max(0.06, Math.min(1, 12 / (months || 999)));

  const durationText =
    months > 0
      ? `${years > 0 ? `${years} tahun ` : ''}${restMonths > 0 || years === 0 ? `${restMonths || months} bulan` : ''}`.trim()
      : '-';

  return (
    <section className="relative overflow-hidden bg-night py-24 md:py-40">
      <div className="noise pointer-events-none absolute inset-0 opacity-[0.05] mix-blend-overlay" />
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 rounded-full bg-gold-500/10 blur-[130px]" />
      <div className="pointer-events-none absolute -left-24 bottom-0 h-80 w-80 rounded-full bg-forest/40 blur-[110px]" />

      <div className="relative mx-auto max-w-6xl px-6">
        <SectionHeading
          dark
          label="Simulasi Tabungan"
          title="Hitung Langkah Anda Menuju Baitullah"
          subtitle="Geser, lihat, dan rasakan kedekatan Anda dengan Ka'bah meningkat setiap bulannya."
        />

        {/* warm cream card overlay */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.8, ease: EASE_OUT_EXPO }}
          className="mt-14 grid gap-10 rounded-[2rem] bg-gradient-to-b from-white to-[#FAF8F5] p-8 shadow-deep md:p-12 lg:grid-cols-2 lg:gap-14"
        >
          {/* -------- Left: sliders -------- */}
          <div className="space-y-9">
            <Slider
              label="Harga Paket Umroh"
              min={10000000}
              max={100000000}
              step={2500000}
              value={price}
              onChange={setPrice}
              format={formatCurrency}
              minLabel="Rp 10 jt"
              maxLabel="Rp 100 jt"
            />
            <Slider
              label="Tabungan per Bulan"
              min={100000}
              max={5000000}
              step={50000}
              value={monthly}
              onChange={setMonthly}
              format={formatCurrency}
              minLabel="Rp 100 rb"
              maxLabel="Rp 5 jt"
            />

            <div className="flex flex-wrap gap-2">
              {[500000, 1000000, 2000000, 3000000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setMonthly(amt)}
                  className={`rounded-full border px-4 py-1.5 text-xs font-bold transition-all duration-300 ${
                    monthly === amt
                      ? 'border-gold-500 bg-gold-500/15 text-gold-700'
                      : 'border-emerald-900/10 bg-white text-sage hover:border-gold-400 hover:text-forest'
                  }`}
                >
                  {formatCurrencyShort(amt)}/bln
                </button>
              ))}
            </div>

            {/* months progress bars */}
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-sage">Peta Perjalanan Dana</p>
              <div className="mt-3 space-y-1.5">
                {Array.from({ length: rows }).map((_, i) => (
                  <motion.div
                    key={i}
                    className="h-2.5 rounded-full bg-gradient-to-r from-gold-600/80 via-gold-400 to-gold-200"
                    initial={{ scaleX: 0, originX: 0 }}
                    whileInView={{ scaleX: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5, delay: i * 0.05, ease: EASE_OUT_EXPO }}
                    style={{ opacity: 0.25 + (i / rows) * 0.75 * rowFill + rowFill * 0.15 }}
                  />
                ))}
              </div>
              <p className="mt-2 text-[11px] text-sage">
                {months > 12 ? `${rows} dari ${months} bulan ditampilkan` : `${months} bulan menuju lunas`}
              </p>
            </div>
          </div>

          {/* -------- Right: animated result -------- */}
          <div ref={resultRef} className="flex flex-col justify-center rounded-3xl bg-midnight p-8 text-white md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-gold-400">Estimasi Lunas</p>
            <p className="mt-3 font-serif text-4xl leading-tight md:text-5xl">
              <AnimatedNumber key={years} value={years} plain duration={0.6} />
              {years > 0 && <span className="text-2xl text-white/70"> thn </span>}
              <AnimatedNumber key={restMonths + (years || 0) * 13} value={restMonths || months} plain duration={0.6} />
              <span className="text-2xl text-white/70"> bln</span>
            </p>

            {/* Kaaba approaching micro-interaction */}
            <div className="relative mt-8 h-24 overflow-hidden rounded-2xl border border-white/10 bg-night/70">
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_75%_50%,rgba(212,162,76,0.12),transparent_60%)]" />
              {/* path */}
              <div className="absolute left-6 right-6 top-1/2 h-px -translate-y-1/2 bg-gradient-to-r from-white/5 via-white/20 to-gold-400/50" />
              {/* walker */}
              <motion.span
                className="absolute top-1/2 -translate-y-1/2"
                animate={{ left: `${6 + closeness * 74}%` }}
                transition={{ type: 'spring', stiffness: 90, damping: 18 }}
              >
                <span className="block h-2.5 w-2.5 rounded-full bg-gold-300 shadow-[0_0_12px_2px_rgba(219,179,103,0.7)]" />
              </motion.span>
              {/* kaaba */}
              <motion.div
                className="absolute right-5 top-1/2 -translate-y-1/2"
                animate={{ scale: 0.8 + closeness * 0.55 }}
                transition={{ type: 'spring', stiffness: 90, damping: 18 }}
              >
                <svg viewBox="0 0 40 44" className="h-12 w-11 drop-shadow-[0_0_16px_rgba(212,162,76,0.45)]" aria-hidden="true">
                  <rect x="6" y="4" width="28" height="36" rx="2" fill="#10100e" />
                  <rect x="6" y="11" width="28" height="3.5" fill="#d4a24c" />
                  <rect x="16" y="22" width="8" height="18" rx="1" fill="#d9b36a" />
                </svg>
              </motion.div>
              <p className="absolute bottom-2 left-4 text-[10px] uppercase tracking-widest text-white/40">
                {closeness >= 1 ? 'Insya Allah tahun ini!' : `± ${months} bulan lagi`}
              </p>
            </div>

            <p className="mt-6 text-sm leading-relaxed text-white/65">
              Dengan menabung <b className="text-gold-300">{formatCurrency(monthly)}</b> per bulan, target{' '}
              <b className="text-white">{formatCurrency(price)}</b> insya Allah tercapai dalam{' '}
              <b className="text-white">{durationText}</b>. Tanpa bunga, tanpa biaya admin.
            </p>

            <Link
              to="/register"
              className="group mt-8 inline-flex items-center justify-center gap-2.5 rounded-full bg-gradient-to-r from-gold-400 to-gold-600 px-7 py-3.5 text-sm font-bold text-night shadow-glow-gold transition-shadow hover:shadow-[0_14px_50px_-8px_rgba(212,162,76,0.7)]"
            >
              Mulai Rencana Ini
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
