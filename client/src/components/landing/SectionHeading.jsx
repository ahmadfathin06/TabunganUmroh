import { cn } from '../../utils/cn';

export default function SectionHeading({ label, title, subtitle, dark = false, align = 'center', className = '' }) {
  return (
    <div
      className={cn(
        'max-w-2xl',
        align === 'center' ? 'mx-auto text-center' : 'text-left',
        className
      )}
    >
      {label && (
        <p className={cn('text-xs font-bold uppercase tracking-[0.3em]', dark ? 'text-gold-400' : 'text-gold-600')}>
          {label}
        </p>
      )}
      <h2
        className={cn(
          'mt-4 font-serif text-4xl leading-[1.08] tracking-tight md:text-5xl',
          dark ? 'text-white' : 'text-ink'
        )}
      >
        {title}
      </h2>
      {subtitle && (
        <p className={cn('mt-5 text-base leading-relaxed md:text-lg', dark ? 'text-white/65' : 'text-sage')}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
