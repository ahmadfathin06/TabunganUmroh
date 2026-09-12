import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BadgeCheck, Landmark, ShieldCheck, FileCheck2 } from 'lucide-react';
import SectionHeading from './SectionHeading';
import Reveal from './Reveal';
import { OrnamentDivider } from './Ornament';
import { EASE_OUT_EXPO } from '../../utils/animations';
import { cn } from '../../utils/cn';

/* ---------------- Animated bank logos marquee ---------------- */
function BankMarquee() {
  const banks = ['Bank Syariah Indonesia', 'Bank Mandiri', 'BCA', 'BNI', 'BRI', 'Bank Muamalat', 'CIMB Niaga', 'Mandiri Taspen'];
  const row = [...banks, ...banks];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-emerald-900/10 bg-white/70 py-5 [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
      <div className="flex w-max animate-marquee items-center gap-10 px-6">
        {row.map((b, i) => (
          <span key={`${b}-${i}`} className="flex items-center gap-2 whitespace-nowrap text-sm font-semibold text-sage">
            <Landmark className="h-4 w-4 text-forest/60" />
            {b}
          </span>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Live deposit notification demo ---------------- */
function NotificationDemo() {
  const items = [
    { name: 'Transfer diterima', detail: 'BCA •••• 4821 · kode unik 731', amount: '+Rp 2.500.000' },
    { name: 'Verifikasi admin', detail: 'Setoran dikonfirmasi otomatis', amount: '✓ Disetujui' },
    { name: 'Progress tabungan', detail: '62% dari target Rp 35 jt', amount: '12 bulan lagi' },
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((v) => (v + 1) % items.length), 2600);
    return () => clearInterval(t);
  }, [items.length]);

  return (
    <div className="relative h-40">
      <AnimatePresence mode="popLayout">
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 26, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -22, scale: 0.97 }}
          transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
          className="absolute inset-x-0 flex items-center gap-3.5 rounded-2xl border border-emerald-900/10 bg-white p-4 shadow-lift"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-forest/10">
            <BadgeCheck className="h-5 w-5 text-forest" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-ink">{items[idx].name}</p>
            <p className="truncate text-xs text-sage">{items[idx].detail}</p>
          </div>
          <span className="shrink-0 font-grotesk text-sm font-bold text-forest">{items[idx].amount}</span>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ---------------- Digital certificate reveal ---------------- */
function CertificateReveal() {
  return (
    <motion.div
      initial={{ rotateX: 18, opacity: 0.4 }}
      whileInView={{ rotateX: 0, opacity: 1 }}
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 1, ease: EASE_OUT_EXPO }}
      style={{ transformPerspective: 900 }}
      className="relative overflow-hidden rounded-2xl border border-gold-500/30 bg-gradient-to-b from-white to-[#FAF8F5] p-6 shadow-lift"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-gold-600">Sertifikat Digital</p>
          <p className="mt-1.5 font-serif text-xl text-ink">Lunas · Paket Reguler 9 Hari</p>
          <p className="mt-1 text-xs text-sage">No. SERT-2026-001247 · Diterbitkan 12 Agustus 2026</p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold-500/15">
          <FileCheck2 className="h-6 w-6 text-gold-600" />
        </span>
      </div>
      <div className="mt-4 flex items-center gap-2 rounded-xl bg-forest/5 px-3.5 py-2.5">
        <ShieldCheck className="h-4 w-4 shrink-0 text-forest" />
        <p className="text-xs font-medium text-forest/90">Terverifikasi blockchain & berlaku sebagai bukti kepemilikan paket.</p>
      </div>
      <motion.span
        className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-gold-400/20 blur-2xl"
        animate={{ opacity: [0.4, 0.9, 0.4] }}
        transition={{ duration: 4, repeat: Infinity }}
      />
    </motion.div>
  );
}

/* ---------------- Feature list ---------------- */
const FEATURES = [
  {
    icon: Landmark,
    title: 'Rekening Resmi Terverifikasi',
    desc: 'Setiap setoran masuk ke rekening perusahaan terdaftar dan bekerja sama dengan bank-bank besar Indonesia. Kode unik 3 digit memastikan dana Anda tercatat tepat sampai ke rupiah terakhir.',
    visual: <BankMarquee />,
    visualExtra: (
      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        {[
          ['7+', 'Bank Mitra'],
          ['100%', 'Setoran Tercatat'],
          ['0', 'Biaya Admin'],
        ].map(([v, l]) => (
          <div key={l} className="rounded-xl border border-emerald-900/5 bg-white/70 p-3">
            <p className="font-grotesk text-lg font-bold text-forest">{v}</p>
            <p className="text-[10px] uppercase tracking-widest text-sage">{l}</p>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: BadgeCheck,
    title: 'Verifikasi Real-time Transparan',
    desc: 'Unggah bukti transfer, admin memverifikasi dengan cepat, dan saldo Anda diperbarui saat itu juga. Setiap rupiah punya jejak digital yang bisa Anda pantau kapan saja.',
    visual: <NotificationDemo />,
    visualExtra: (
      <p className="mt-4 text-center text-xs text-sage">
        Rata-rata verifikasi <b className="text-forest">dalam 1 jam</b> pada hari kerja.
      </p>
    ),
  },
  {
    icon: FileCheck2,
    title: 'Sertifikat Lunas Digital',
    desc: 'Setelah tabungan lunas, Anda menerima sertifikat digital resmi sebagai bukti kepemilikan paket — rapi, aman, dan selalu bisa diakses dari dashboard Anda.',
    visual: <CertificateReveal />,
  },
];

export default function TrustSection() {
  return (
    <section className="relative py-24 md:py-40">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <SectionHeading
            label="Mengapa Kami"
            title="Ditanggung Seperti Amanah"
            subtitle="Bukan sekadar aplikasi tabungan. Kami menjaga setiap rupiah Anda dengan standar kehati-hatian tertinggi."
          />
          <OrnamentDivider className="mt-8" />
        </Reveal>

        <div className="mt-20 space-y-24 md:space-y-32">
          {FEATURES.map((f, i) => {
            const flipped = i % 2 === 1;
            return (
              <div key={f.title} className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
                {/* Visual side */}
                <Reveal className={cn(flipped && 'md:order-2')} y={50}>
                  <div className="relative rounded-3xl border border-emerald-900/5 bg-gradient-to-b from-sand/60 to-cream p-6 shadow-card md:p-8">
                    {f.visual}
                    {f.visualExtra}
                  </div>
                </Reveal>

                {/* Text side */}
                <Reveal className={cn(flipped && 'md:order-1')} y={50} delay={0.1}>
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest/8 text-forest">
                    <f.icon className="h-6 w-6" />
                  </span>
                  <h3 className="mt-6 font-serif text-3xl tracking-tight text-ink md:text-4xl">{f.title}</h3>
                  <p className="mt-4 max-w-md leading-relaxed text-sage">{f.desc}</p>
                  <p className="mt-6 font-grotesk text-xs font-bold uppercase tracking-[0.3em] text-gold-600">
                    0{i + 1} — Keunggulan
                  </p>
                </Reveal>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
