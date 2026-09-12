import { motion } from 'motion/react';
import { GeometricPattern } from './landing/Ornament';

/**
 * Full-screen loader with an 8-pointed star breathing animation —
 * shown while lazy route chunks are downloading.
 */
export default function PageLoader() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-midnight">
      <GeometricPattern id="loader-tiles" className="absolute inset-0 h-full w-full text-gold-400 opacity-[0.05]" />
      <div className="relative flex flex-col items-center gap-8">
        {/* rotating 8-pointed star */}
        <div className="relative h-20 w-20">
          <motion.svg
            viewBox="0 0 100 100"
            className="absolute inset-0 h-full w-full text-gold-400"
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
          >
            <g fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="25" y="25" width="50" height="50" />
              <rect x="25" y="25" width="50" height="50" transform="rotate(45 50 50)" />
            </g>
          </motion.svg>
          <motion.span
            className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-400 shadow-[0_0_18px_4px_rgba(212,162,76,0.6)]"
            animate={{ scale: [1, 1.5, 1], opacity: [1, 0.6, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          />
        </div>
        <p className="font-arabic text-xl text-gold-300/90" dir="rtl">
          بِسْمِ اللَّهِ
        </p>
      </div>
    </div>
  );
}
