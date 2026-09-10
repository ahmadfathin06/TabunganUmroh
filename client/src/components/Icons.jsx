const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

const Svg = ({ children, ...rest }) => (
  <svg viewBox="0 0 24 24" {...base} {...rest}>
    {children}
  </svg>
)

export const IcHome = (p) => (
  <Svg {...p}>
    <path d="M3 9.5 12 3l9 6.5" />
    <path d="M5 8.68V19a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V8.68" />
  </Svg>
)

export const IcWallet = (p) => (
  <Svg {...p}>
    <path d="M19 5c-1.5 0-2.8 1.4-3 2-3.5-1.5-11-1.5-13 3-2 4.5.5 8 3 9 1.8.75 4 .8 6 .5 1 .8 1 2 1 2h2v-2.5c1.5-.5 3-1.5 3.5-3H21v-4h-1.5c-.3-1.8-1.5-3-2.5-3.5" />
    <circle cx="15.5" cy="11.5" r="1" />
  </Svg>
)

export const IcTag = (p) => (
  <Svg {...p}>
    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.41a2 2 0 0 1 0 2.83z" />
    <line x1="7" y1="7" x2="7.01" y2="7" />
  </Svg>
)

export const IcUser = (p) => (
  <Svg {...p}>
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </Svg>
)

export const IcBell = (p) => (
  <Svg {...p}>
    <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.7 21a2 2 0 0 1-3.4 0" />
  </Svg>
)

export const IcSearch = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </Svg>
)

export const IcEdit = (p) => (
  <Svg {...p}>
    <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
  </Svg>
)

export const IcPlus = (p) => (
  <Svg {...p}>
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </Svg>
)

export const IcClock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </Svg>
)

export const IcBox = (p) => (
  <Svg {...p}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
    <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
    <line x1="12" y1="22.08" x2="12" y2="12" />
  </Svg>
)
