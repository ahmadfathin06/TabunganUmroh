import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronDown } from 'lucide-react';
import SectionHeading from './SectionHeading';
import Reveal from './Reveal';
import { StarMark } from './Ornament';
import { EASE_OUT_EXPO } from '../../utils/animations';
import { cn } from '../../utils/cn';

const FAQS = [
  {
    q: 'Berapa minimal setoran tabungan umroh?',
    a: 'Minimal setoran Rp 100.000 per transaksi. Anda bebas menentukan nominal dan frekuensinya — mingguan, bulanan, atau kapan pun ada rezeki berlebih.',
  },
  {
    q: 'Apakah ada biaya administrasi atau bunga?',
    a: 'Tidak ada. Dana jamaah dikelola secara transparan tanpa bunga (bebas riba). Yang Anda bayar hanya harga paket yang diumumkan di awal.',
  },
  {
    q: 'Bagaimana cara membayar setoran?',
    a: 'Setiap setoran Anda akan menerima rekening bank tujuan + kode unik 3 digit. Transfer sejumlah nominal + kode unik, lalu unggah bukti transfer dari dashboard. Admin memverifikasi dalam hitungan menit.',
  },
  {
    q: 'Apakah tabungan bisa dicairkan sebelum lunas?',
    a: 'Bisa, melalui prosedur pembatalan yang tertulis di perjanjian. Sebagian biaya pemrosesan mungkin dikenakan sesuai ketentuan, dan sisa dana dikembalikan penuh.',
  },
  {
    q: 'Bagaimana jika kuota paket sudah penuh?',
    a: 'Paket akan ditandai "Penuh". Anda dapat memilih paket keberangkatan lain, atau masuk ke daftar tunggu untuk mengikuti jamaah yang mengundurkan diri.',
  },
  {
    q: 'Apakah travel umrohnya resmi?',
    a: 'Ya. Kami bekerja sama dengan travel umroh berizin resmi Kemenag RI, dengan rekening perusahaan terverifikasi dan sertifikat lunas digital untuk setiap jamaah.',
  },
];

function Item({ faq, open, onToggle, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.6, delay: index * 0.06, ease: EASE_OUT_EXPO }}
      className={cn(
        'overflow-hidden rounded-2xl border bg-white/80 backdrop-blur-sm transition-colors duration-300',
        open ? 'border-gold-500/40 shadow-card' : 'border-emerald-900/8 hover:border-gold-500/30'
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-6 px-6 py-5 text-left md:px-8 md:py-6"
        aria-expanded={open}
      >
        <span className="flex items-center gap-4">
          <StarMark className={cn('h-4 w-4 shrink-0 transition-transform duration-500', open ? 'rotate-90 scale-110 text-gold-500' : 'text-gold-400/50')} />
          <span className="font-serif text-lg text-ink md:text-xl">{faq.q}</span>
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.35, ease: EASE_OUT_EXPO }}
          className={cn(
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-300',
            open ? 'bg-gold-500 text-night' : 'bg-emerald-900/5 text-sage'
          )}
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
          >
            <p className="px-6 pb-6 pl-[3.75rem] leading-relaxed text-sage md:px-8 md:pl-[4.25rem]">
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function FAQAccordion() {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section id="faq" className="relative bg-gradient-to-b from-cream to-sand/50 py-24 md:py-40">
      <div className="mx-auto max-w-3xl px-6">
        <Reveal>
          <SectionHeading
            label="FAQ"
            title="Pertanyaan yang Sering Diajukan"
            subtitle="Masih ragu? Temukan jawabannya di sini, atau hubungi tim kami kapan saja."
          />
        </Reveal>

        <div className="mt-14 space-y-4">
          {FAQS.map((faq, i) => (
            <Item
              key={faq.q}
              faq={faq}
              index={i}
              open={openIndex === i}
              onToggle={() => setOpenIndex(openIndex === i ? -1 : i)}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
