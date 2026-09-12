import { useEffect, useRef, useState } from 'react';
import { animate, useInView } from 'motion/react';
import { EASE_OUT_EXPO } from '../../utils/animations';

/**
 * Animated number that counts up when scrolled into view.
 * Re-animates smoothly (from current value) if `value` changes later,
 * e.g. when the simulation calculator sliders move.
 */
export default function AnimatedNumber({
  value,
  decimals = 0,
  prefix = '',
  suffix = '',
  duration = 1.6,
  plain = false, // skip thousand separators (needed for years like 2018)
  className = '',
}) {
  const ref = useRef(null);
  const currentRef = useRef(0);
  const firstRef = useRef(true);
  const inView = useInView(ref, { once: false, margin: '-60px' });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const from = currentRef.current;
    const isFirst = firstRef.current;
    firstRef.current = false;
    const dur = from === value ? 0 : isFirst ? duration : Math.min(duration, 0.6);
    const controls = animate(from, value, {
      duration: dur,
      ease: EASE_OUT_EXPO,
      onUpdate: (v) => {
        currentRef.current = v;
        setDisplay(v);
      },
    });
    return () => controls.stop();
  }, [inView, value, duration]);

  const formatted = plain
    ? String(Math.round(display))
    : display.toLocaleString('id-ID', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

  return (
    <span ref={ref} className={className}>
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
