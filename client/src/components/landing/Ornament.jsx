/**
 * Reusable Islamic ornament primitives (pure SVG, no stock images).
 */

export function KaabaIcon({ className = 'h-10 w-10' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect x="12" y="10" width="40" height="44" rx="3" fill="#121815" />
      <rect x="12" y="10" width="40" height="44" rx="3" fill="none" stroke="#0b100e" strokeWidth="1.5" />
      <rect x="12" y="19" width="40" height="4.5" fill="#d4a24c" />
      <rect x="27" y="33" width="10" height="21" rx="1" fill="#d9b36a" />
    </svg>
  );
}

export function StarMark({ className = 'h-4 w-4 text-gold-500' }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2c.9 5.2 2.8 7.1 8 8-5.2.9-7.1 2.8-8 8-.9-5.2-2.8-7.1-8-8 5.2-.9 7.1-2.8 8-8z" />
    </svg>
  );
}

export function OrnamentDivider({ className = '' }) {
  return (
    <div className={`flex items-center justify-center gap-3 text-gold-500 ${className}`} aria-hidden="true">
      <span className="h-px w-16 bg-gradient-to-r from-transparent to-gold-500/60" />
      <StarMark className="h-3.5 w-3.5" />
      <span className="h-px w-16 bg-gradient-to-l from-transparent to-gold-500/60" />
    </div>
  );
}

/** Faint 8-pointed star / Moroccan tile ghost pattern. Color via `text-*`. */
export function GeometricPattern({ id, className = '' }) {
  return (
    <svg className={className} aria-hidden="true">
      <defs>
        <pattern id={id} width="72" height="72" patternUnits="userSpaceOnUse">
          <g fill="none" stroke="currentColor" strokeWidth="1">
            <rect x="22" y="22" width="28" height="28" />
            <rect x="22" y="22" width="28" height="28" transform="rotate(45 36 36)" />
            <circle cx="36" cy="36" r="3.5" />
            <path d="M36 0v10M36 62v10M0 36h10M62 36h10" />
          </g>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

/** Blurred skyline silhouette used at low opacity on dark sections. */
export function MosqueSilhouette({ className = '' }) {
  return (
    <svg viewBox="0 0 400 170" fill="currentColor" className={className} aria-hidden="true">
      {/* central dome */}
      <path d="M200 26c-4 14-32 24-32 48h64c0-24-28-34-32-48z" />
      <rect x="118" y="74" width="164" height="96" rx="4" />
      {/* minarets */}
      <rect x="94" y="40" width="11" height="130" rx="5" />
      <circle cx="99.5" cy="33" r="8" />
      <rect x="295" y="40" width="11" height="130" rx="5" />
      <circle cx="300.5" cy="33" r="8" />
      {/* side wings */}
      <rect x="40" y="104" width="86" height="66" rx="3" />
      <rect x="274" y="104" width="86" height="66" rx="3" />
    </svg>
  );
}
