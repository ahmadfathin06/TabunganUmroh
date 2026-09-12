import { motion } from 'motion/react';
import { EASE_OUT_EXPO } from '../../utils/animations';

/**
 * Fade + slide-up reveal when scrolled into view.
 * Default motion spec: { opacity: 0, y: 60 } → visible, duration 0.8.
 */
export default function Reveal({
  children,
  delay = 0,
  y = 60,
  once = true,
  className = '',
  as = 'div',
}) {
  const MotionTag = motion[as] || motion.div;
  return (
    <MotionTag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once, margin: '-80px' }}
      transition={{ duration: 0.8, delay, ease: EASE_OUT_EXPO }}
    >
      {children}
    </MotionTag>
  );
}
