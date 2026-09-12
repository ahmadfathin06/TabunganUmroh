import { useRef } from 'react';
import { motion } from 'motion/react';
import { BadgeCheck, ChevronLeft, ChevronRight, Quote, Star } from 'lucide-react';
import SectionHeading from './SectionHeading';
import Reveal from './Reveal';
import { KaabaIcon } from './Ornament';

const TESTIMONIALS = [
  {
    name: 'Hj. Siti Rahmawati',
    city: 'Bandung',
    initials: 'SR',
    quote:
      'Tiga tahun menabung tanpa terasa. Waktu disuruh upload bukti transfer, kurang dari satu jam saldo sudah terverifikasi. Tahun lalu akhirnya saya dan suami berangkat, alhamdulillah.',
    year: 'Berangkat 2025',
  },
  {
    name: 'Bpk. Ahmad Fauzi',
    city: 'Surabaya',
    initials: 'AF',
    quote:
      'Awalnya ragu, tapi setelah lihat rekening resmi dan laporan bulanannya, saya yakin. Cicilan Rp 2 juta per bulan, dua tahun lunas. Tanpa potongan sepeser pun.',
    year: 'Berangkat 2025',
  },
  {
    name: 'Nurul Hidayah',
    city: 'Jakarta',
    initials: 'NH',
    quote:
      'Sebagai anak muda, saya bisa mulai dari Rp 500 ribu per bulan lewat HP. Dashboard-nya jelas: sudah berapa persen, kira-kira kapan lunas. Rasanya seperti punya target hidup sendiri.',
    year: 'Berangkat 2026',
  },
  {
    name: 'Keluarga H. Mahmud',
    city: 'Medan',
    initials: 'HM',
    quote:
      'Kami daftar paket berempat. Pihak travel bantu urus visa sampai manasik. Di Arafah kemarin, rasanya semua proses menabung selama ini benar-benar sepadan.',
    year: 'Berangkat 2024',
  },
  {
    name: 'Ust. Abdul Qadir',
    city: 'Yogyakarta',
    initials: 'AQ',
    quote:
      'Saya sering rekomendasikan ke jamaah karena sistemnya bebas riba dan transparan. Dana terkelola jelas, harga paket jelas, tidak ada biaya siluman.',
    year: 'Berangkat 2025',
  },
];

function Card({ t, i }) {
  return (
    <motion.figure
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="flex w-[320px] shrink-0 flex-col rounded-3xl border border-emerald-900/5 bg-gradient-to-b from-white to-[#FAF8F5] p-7 shadow-card sm:w-[380px]"
    >
      <Quote className="h-7 w-7 text-gold-400" />
      <blockquote className="mt-4 flex-1 font-serif text-lg italic leading-relaxed text-ink/85">
        “{t.quote}”
      </blockquote>

      <div className="mt-5 flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, s) => (
          <Star key={s} className="h-4 w-4 fill-gold-500 text-gold-500" />
        ))}
      </div>

      <figcaption className="mt-5 flex items-center gap-3.5 border-t border-emerald-900/5 pt-5">
        <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gold-400/70 bg-forest/10 font-serif text-sm font-bold text-forest">
          {t.initials}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-ink">{t.name}</p>
          <p className="text-xs text-sage">
            {t.city} · {t.year}
          </p>
        </div>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-forest/8 px-2.5 py-1 text-[10px] font-bold text-forest">
          <BadgeCheck className="h-3.5 w-3.5" /> Terverifikasi
        </span>
      </figcaption>
    </motion.figure>
  );
}

export default function TestimonialCarousel() {
  const trackRef = useRef(null);
  const scroll = (dir) => {
    trackRef.current?.scrollBy({ left: dir * 400, behavior: 'smooth' });
  };

  return (
    <section className="overflow-hidden bg-sand/40 py-24 md:py-40">
      <div className="mx-auto max-w-6xl px-6">
        <Reveal>
          <div className="flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <SectionHeading
              align="left"
              label="Kata Mereka"
              title="Cerita dari Jamaah Kami"
              subtitle="Ribuan keluarga telah memulai perjalanan suci bersama kami. Ini sebagian kisah mereka."
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => scroll(-1)}
                aria-label="Geser ke kiri"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-900/10 bg-white text-ink shadow-card transition hover:border-gold-400 hover:text-gold-600"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scroll(1)}
                aria-label="Geser ke kanan"
                className="flex h-11 w-11 items-center justify-center rounded-full border border-emerald-900/10 bg-white text-ink shadow-card transition hover:border-gold-400 hover:text-gold-600"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </Reveal>
      </div>

      {/* horizontal scroll strip, full-bleed to the right */}
      <div className="mt-14">
        <div
          ref={trackRef}
          className="no-scrollbar flex snap-x snap-mandatory gap-6 overflow-x-auto scroll-smooth px-6 pb-4 md:px-[max(1.5rem,calc((100vw-72rem)/2))]"
        >
          {TESTIMONIALS.map((t, i) => (
            <div key={t.name} className="snap-start">
              <Card t={t} i={i} />
            </div>
          ))}

          {/* final CTA-ish card */}
          <div className="flex w-[320px] shrink-0 snap-start flex-col items-center justify-center gap-4 rounded-3xl bg-gradient-to-b from-emerald-950 to-midnight p-8 text-center shadow-lift sm:w-[380px]">
            <KaabaIcon className="h-12 w-12 drop-shadow-[0_0_18px_rgba(212,162,76,0.4)]" />
            <p className="font-serif text-2xl text-white">Cerita Anda berikutnya</p>
            <p className="text-sm text-white/60">Mulai menabung hari ini, tulis kisah Anda di Baitullah.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
