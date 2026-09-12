// Shared motion presets — cinematic but subtle.
// Ease curve from the design spec: fast start, long soft settle.
export const EASE_OUT_EXPO = [0.22, 1, 0.36, 1];

export const SPRING_SOFT = { type: 'spring', stiffness: 120, damping: 20 };
export const SPRING_SNAPPY = { type: 'spring', stiffness: 300, damping: 24 };

// Fade + slide up on scroll (sections)
export const fadeUp = {
  hidden: { opacity: 0, y: 60 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_OUT_EXPO } },
};

// Staggered children for cards / lists
export const staggerContainer = (staggerChildren = 0.15, delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren, delayChildren } },
});

export const staggerItem = {
  hidden: { opacity: 0, y: 40 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE_OUT_EXPO } },
};

// Button micro-interaction: scale up on hover, press down on tap
export const buttonTap = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.98 },
};
