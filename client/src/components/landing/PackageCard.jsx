import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowRight, CalendarDays, Plane, Star, Users } from 'lucide-react';
import { PACKAGE_STATUS } from '../../utils/constants';
import { formatCurrency } from '../../utils/formatCurrency';
import { formatDate } from '../../utils/formatDate';
import { cn } from '../../utils/cn';

/**
 * Premium package card. `featured` style is driven by the API package marked
 * isFeatured, falling back to the middle card handled by the parent.
 */
export default function PackageCard({ pkg, featured = false, index = 0 }) {
  const price = Number(pkg.price || 0);
  const status = PACKAGE_STATUS[pkg.status] || PACKAGE_STATUS.OPEN;
  const isOpen = pkg.status === 'OPEN';
  const monthly = Math.round(price / 12);

  return (
    <motion.div
      initial={{ opacity: 0, y: 48 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -8 }}
      className={cn(
        'group relative h-full overflow-hidden rounded-3xl border transition-shadow duration-500',
        featured
          ? 'border-gold-500/40 bg-gradient-to-b from-emerald-950 to-midnight text-white shadow-deep'
          : 'border-emerald-900/5 bg-gradient-to-b from-white to-cream shadow-card hover:shadow-lift'
      )}
    >
      {/* gold top border on hover */}
      <span
        className={cn(
          'absolute inset-x-0 top-0 h-1 origin-left bg-gradient-to-r from-gold-600 via-gold-400 to-gold-600 transition-transform duration-500',
          featured ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'
        )}
      />

      {/* Popular ribbon */}
      {featured && (
        <div className="absolute right-5 top-5 z-10 rounded-full bg-gold-500 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-night shadow-glow-gold">
          Paling Populer
        </div>
      )}

      <div className="p-7 md:p-8">
        {/* category badge */}
        <span
          className={cn(
            'inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest',
            featured ? 'bg-gold-500/15 text-gold-300' : 'bg-forest/5 text-forest'
          )}
        >
          {pkg.category || 'Reguler'}
        </span>

        <h3 className={cn('mt-4 font-serif text-2xl tracking-tight', featured ? 'text-white' : 'text-ink')}>
          {pkg.name}
        </h3>

        {/* big price with counter */}
        <div className="mt-5">
          <p className={cn('font-grotesk text-4xl font-bold tracking-tight', featured ? 'text-gold-300' : 'text-forest')}>
            {formatCurrency(price)}
          </p>
          <p className={cn('mt-1 text-xs', featured ? 'text-white/50' : 'text-sage')}>
            atau ± {formatCurrency(monthly)}/bulan · 12 bulan
          </p>
        </div>

        {/* ornament divider */}
        <div className="mt-6 flex items-center gap-3" aria-hidden="true">
          <span className={cn('h-px flex-1', featured ? 'bg-white/10' : 'bg-emerald-900/10')} />
          <span className={cn('text-[9px]', featured ? 'text-gold-400' : 'text-gold-500')}>◆</span>
          <span className={cn('h-px flex-1', featured ? 'bg-white/10' : 'bg-emerald-900/10')} />
        </div>

        {/* meta info */}
        <div className={cn('mt-5 space-y-2 text-sm', featured ? 'text-white/70' : 'text-sage')}>
          <p className="flex items-center gap-2.5">
            <CalendarDays className={cn('h-4 w-4 shrink-0', featured ? 'text-gold-400' : 'text-gold-600')} />
            Berangkat {formatDate(pkg.departureDate)} · {pkg.durationDays} hari
          </p>
          <p className="flex items-center gap-2.5">
            <Plane className={cn('h-4 w-4 shrink-0', featured ? 'text-gold-400' : 'text-gold-600')} />
            {pkg.airline || 'Maskapai terpercaya'} · {pkg.departureCity || 'Jakarta'}
          </p>
          <p className="flex items-center gap-2.5">
            <Users className={cn('h-4 w-4 shrink-0', featured ? 'text-gold-400' : 'text-gold-600')} />
            Sisa kuota {pkg.quotaRemaining ?? '-'} jamaah
          </p>
        </div>

        {/* features with gold checks */}
        <ul className="mt-6 space-y-2.5">
          {(pkg.features?.length
            ? pkg.features
            : [
                `Hotel ${pkg.durationDays >= 12 ? 'bintang 5 dekat Masjid' : 'bintang 3–4 nyaman'}`,
                'Visa, tiket & handling bandara',
                'Pendamping mutawif berbahasa Indonesia',
                'Manasik haji & umroh sebelum berangkat',
              ]
          ).map((f) => (
            <li key={f} className={cn('flex items-start gap-2.5 text-sm', featured ? 'text-white/80' : 'text-ink/80')}>
              <svg viewBox="0 0 20 20" className={cn('mt-0.5 h-4 w-4 shrink-0', featured ? 'text-gold-400' : 'text-gold-600')} fill="currentColor" aria-hidden="true">
                <path d="M10 0c.7 4.1 2.2 5.6 6.3 6.3-4.1.7-5.6 2.2-6.3 6.3-.7-4.1-2.2-5.6-6.3-6.3C7.8 5.6 9.3 4.1 10 0z" />
                <circle cx="15.5" cy="15.5" r="2.2" />
              </svg>
              {f}
            </li>
          ))}
        </ul>

        {/* hotel stars */}
        <div className={cn('mt-5 flex items-start gap-2 text-xs', featured ? 'text-white/60' : 'text-sage')}>
          <Star className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-gold-400 text-gold-400" />
          <span>
            {[pkg.hotelMakkah, pkg.hotelMadinah].filter(Boolean).join(' · ') || 'Hotel pilihan dekat Masjid'}
          </span>
        </div>

        {/* CTA */}
        <motion.div whileHover={isOpen ? { scale: 1.02 } : undefined} whileTap={isOpen ? { scale: 0.98 } : undefined} className="mt-7">
          <Link
            to={isOpen ? '/register' : '#'}
            aria-disabled={!isOpen}
            className={cn(
              'group/btn flex w-full items-center justify-center gap-2 rounded-full px-5 py-3.5 text-sm font-bold transition-all duration-300',
              featured && isOpen
                ? 'bg-gold-500 text-night hover:shadow-glow-gold'
                : isOpen
                  ? 'bg-midnight text-white hover:bg-forest'
                  : 'cursor-not-allowed bg-emerald-900/5 text-sage'
            )}
          >
            {isOpen ? 'Pilih Paket Ini' : status.label}
            {isOpen && (
              <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover/btn:translate-x-1.5" />
            )}
          </Link>
        </motion.div>
      </div>
    </motion.div>
  );
}
